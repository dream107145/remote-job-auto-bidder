"use server";

import { createClient } from "@/lib/supabase/server";
import { generateResumeContent } from "@/lib/ai/resume-generator";
import { generateDocx, generatePdf } from "@/lib/resume/export";

async function getAuthUserId() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return { supabase, userId: user.id };
}

export async function generateResumeDownload(profileId: string, format: "pdf" | "docx") {
  const { supabase, userId } = await getAuthUserId();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", profileId)
    .eq("user_id", userId)
    .single();

  if (error || !profile) {
    return { error: "Profile not found" };
  }

  try {
    const resume = await generateResumeContent(profile);
    const buffer =
      format === "pdf"
        ? await generatePdf(resume, profile)
        : await generateDocx(resume, profile);

    const base64 = buffer.toString("base64");
    const filename = `${profile.name.replace(/\s+/g, "_")}_Resume.${format}`;
    const mimeType =
      format === "pdf"
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    return { success: true, base64, filename, mimeType };
  } catch (err) {
    return { error: (err as Error).message || "Failed to generate resume" };
  }
}
