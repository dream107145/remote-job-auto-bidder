"use server";

import { createClient } from "@/lib/supabase/server";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import { revalidatePath } from "next/cache";

async function getAuthUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return { supabase, userId: user.id };
}

export async function getIndeedSettings() {
  const { supabase, userId } = await getAuthUser();

  const { data, error } = await supabase
    .from("users")
    .select("indeed_email, indeed_auto_apply, indeed_password_encrypted")
    .eq("id", userId)
    .single();

  if (error) return { error: error.message };

  return {
    success: true,
    data: {
      email: data.indeed_email || "",
      autoApply: data.indeed_auto_apply ?? false,
      hasPassword: !!data.indeed_password_encrypted,
    },
  };
}

export async function saveIndeedSettings(formData: FormData) {
  const { supabase, userId } = await getAuthUser();

  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const autoApply = formData.get("autoApply") === "on";

  if (!email) {
    return { error: "Indeed email is required" };
  }

  const updates: Record<string, unknown> = {
    indeed_email: email,
    indeed_auto_apply: autoApply,
  };

  if (password) {
    try {
      updates.indeed_password_encrypted = encryptSecret(password);
    } catch {
      return { error: "Encryption is not configured on the server" };
    }
  }

  const { error } = await supabase.from("users").update(updates).eq("id", userId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/settings");
  return { success: true, message: "Indeed settings saved" };
}

export async function getIndeedCredentials(userId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("users")
    .select("indeed_email, indeed_password_encrypted, indeed_auto_apply")
    .eq("id", userId)
    .single();

  if (!data?.indeed_email || !data.indeed_password_encrypted || !data.indeed_auto_apply) {
    return null;
  }

  try {
    return {
      email: data.indeed_email,
      password: decryptSecret(data.indeed_password_encrypted),
      autoApply: data.indeed_auto_apply,
    };
  } catch {
    return null;
  }
}
