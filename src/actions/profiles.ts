"use server";

import { createClient } from "@/lib/supabase/server";
import { profileSchema } from "@/lib/validations";
import { revalidatePath } from "next/cache";
import { ALLOWED_RESUME_TYPES, MAX_RESUME_SIZE } from "@/lib/constants";
import { unwrapRelation } from "@/lib/utils";
import type { ProfileInput } from "@/lib/validations";

async function getAuthUserId() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return { supabase, userId: user.id };
}

async function checkProfileLimit(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data: user } = await supabase
    .from("users")
    .select("profiles_used")
    .eq("id", userId)
    .single();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan:plans(profile_limit)")
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  const limit = unwrapRelation(subscription?.plan)?.profile_limit ?? 1;
  if (limit !== -1 && (user?.profiles_used ?? 0) >= limit) {
    throw new Error("Profile limit reached. Upgrade your plan.");
  }
}

export async function createProfile(data: ProfileInput, resumeFile?: FormData) {
  const { supabase, userId } = await getAuthUserId();

  const parsed = profileSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    await checkProfileLimit(supabase, userId);
  } catch (e) {
    return { error: (e as Error).message };
  }

  let resumeUrl: string | null = null;
  let resumeFilename: string | null = null;

  if (resumeFile) {
    const file = resumeFile.get("resume") as File;
    if (file && file.size > 0) {
      if (file.size > MAX_RESUME_SIZE) {
        return { error: "Resume must be under 10MB" };
      }
      if (!ALLOWED_RESUME_TYPES.includes(file.type)) {
        return { error: "Only PDF and DOCX files are allowed" };
      }

      const ext = file.name.split(".").pop();
      const path = `${userId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(path, file);

      if (uploadError) {
        return { error: uploadError.message };
      }

      const { data: urlData } = supabase.storage.from("resumes").getPublicUrl(path);
      resumeUrl = urlData.publicUrl;
      resumeFilename = file.name;
    }
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .insert({
      user_id: userId,
      name: parsed.data.name,
      email: parsed.data.email,
      bio: parsed.data.bio || null,
      skills: parsed.data.skills,
      github_url: parsed.data.githubUrl || null,
      linkedin_url: parsed.data.linkedinUrl || null,
      availability: parsed.data.availability || null,
      salary_min: parsed.data.salaryMin || null,
      salary_max: parsed.data.salaryMax || null,
      cover_letter_template: parsed.data.coverLetterTemplate || null,
      resume_url: resumeUrl,
      resume_filename: resumeFilename,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  const { data: currentUser } = await supabase
    .from("users")
    .select("profiles_used")
    .eq("id", userId)
    .single();

  await supabase
    .from("users")
    .update({ profiles_used: (currentUser?.profiles_used ?? 0) + 1 })
    .eq("id", userId);

  revalidatePath("/dashboard/profiles");
  return { success: true, data: profile };
}

export async function updateProfile(id: string, data: ProfileInput, resumeFile?: FormData) {
  const { supabase, userId } = await getAuthUserId();

  const parsed = profileSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const updates: Record<string, unknown> = {
    name: parsed.data.name,
    email: parsed.data.email,
    bio: parsed.data.bio || null,
    skills: parsed.data.skills,
    github_url: parsed.data.githubUrl || null,
    linkedin_url: parsed.data.linkedinUrl || null,
    availability: parsed.data.availability || null,
    salary_min: parsed.data.salaryMin || null,
    salary_max: parsed.data.salaryMax || null,
    cover_letter_template: parsed.data.coverLetterTemplate || null,
  };

  if (resumeFile) {
    const file = resumeFile.get("resume") as File;
    if (file && file.size > 0) {
      if (file.size > MAX_RESUME_SIZE) {
        return { error: "Resume must be under 10MB" };
      }
      if (!ALLOWED_RESUME_TYPES.includes(file.type)) {
        return { error: "Only PDF and DOCX files are allowed" };
      }

      const ext = file.name.split(".").pop();
      const path = `${userId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(path, file);

      if (uploadError) {
        return { error: uploadError.message };
      }

      const { data: urlData } = supabase.storage.from("resumes").getPublicUrl(path);
      updates.resume_url = urlData.publicUrl;
      updates.resume_filename = file.name;
    }
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/profiles");
  return { success: true, data: profile };
}

export async function deleteProfile(id: string) {
  const { supabase, userId } = await getAuthUserId();

  const { error } = await supabase
    .from("profiles")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    return { error: error.message };
  }

  const { data: user } = await supabase
    .from("users")
    .select("profiles_used")
    .eq("id", userId)
    .single();

  if (user && user.profiles_used > 0) {
    await supabase
      .from("users")
      .update({ profiles_used: user.profiles_used - 1 })
      .eq("id", userId);
  }

  revalidatePath("/dashboard/profiles");
  return { success: true };
}

export async function getProfiles() {
  const { supabase, userId } = await getAuthUserId();

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}
