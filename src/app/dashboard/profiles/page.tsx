"use client";

import { useState, useTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { DashboardHeader } from "@/components/layout/dashboard-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoader, Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { profileSchema, type ProfileInput } from "@/lib/validations";
import { createProfile, updateProfile, deleteProfile } from "@/actions/profiles";
import { generateResumeDownload } from "@/actions/resume";
import { Plus, Pencil, Trash2, FileText, X, Sparkles, Download } from "lucide-react";
import type { Profile } from "@/types";

async function fetchProfiles(): Promise<Profile[]> {
  const res = await fetch("/api/profiles");
  if (!res.ok) throw new Error("Failed to fetch profiles");
  const json = await res.json();
  return json.data;
}

function ProfileForm({
  profile,
  onSuccess,
}: {
  profile?: Profile;
  onSuccess: () => void;
}) {
  const [skillInput, setSkillInput] = useState("");
  const [isPending, startTransition] = useTransition();

  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: profile?.name || "",
      email: profile?.email || "",
      bio: profile?.bio || "",
      skills: profile?.skills || [],
      githubUrl: profile?.github_url || "",
      linkedinUrl: profile?.linkedin_url || "",
      availability: profile?.availability || "",
      salaryMin: profile?.salary_min || undefined,
      salaryMax: profile?.salary_max || undefined,
      coverLetterTemplate: profile?.cover_letter_template || "",
    },
  });

  const skills = form.watch("skills");

  function addSkill() {
    const trimmed = skillInput.trim();
    if (trimmed && !skills.includes(trimmed)) {
      form.setValue("skills", [...skills, trimmed]);
      setSkillInput("");
    }
  }

  function removeSkill(skill: string) {
    form.setValue(
      "skills",
      skills.filter((s) => s !== skill)
    );
  }

  function onSubmit(data: ProfileInput) {
    startTransition(async () => {
      const formData = new FormData();
      const fileInput = document.getElementById("resume") as HTMLInputElement;
      if (fileInput?.files?.[0]) {
        formData.append("resume", fileInput.files[0]);
      }

      const result = profile
        ? await updateProfile(profile.id, data, formData)
        : await createProfile(data, formData);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(profile ? "Profile updated" : "Profile created");
        onSuccess();
      }
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" {...form.register("name")} />
          {form.formState.errors.name && (
            <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...form.register("email")} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea id="bio" {...form.register("bio")} rows={3} />
      </div>

      <div className="space-y-2">
        <Label>Skills</Label>
        <div className="flex gap-2">
          <Input
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            placeholder="Add a skill"
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
          />
          <Button type="button" variant="outline" onClick={addSkill}>
            Add
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {skills.map((skill) => (
            <Badge key={skill} variant="secondary" className="gap-1">
              {skill}
              <X className="h-3 w-3 cursor-pointer" onClick={() => removeSkill(skill)} />
            </Badge>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="githubUrl">GitHub URL</Label>
          <Input id="githubUrl" {...form.register("githubUrl")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
          <Input id="linkedinUrl" {...form.register("linkedinUrl")} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="availability">Availability</Label>
          <Input id="availability" placeholder="Full-time" {...form.register("availability")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="salaryMin">Min Salary ($)</Label>
          <Input
            id="salaryMin"
            type="number"
            min={0}
            placeholder="80000"
            {...form.register("salaryMin", {
              setValueAs: (v) => (v === "" || v == null ? undefined : Number(v)),
            })}
          />
          {form.formState.errors.salaryMin && (
            <p className="text-sm text-destructive">{form.formState.errors.salaryMin.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="salaryMax">Max Salary ($)</Label>
          <Input
            id="salaryMax"
            type="number"
            min={0}
            placeholder="150000"
            {...form.register("salaryMax", {
              setValueAs: (v) => (v === "" || v == null ? undefined : Number(v)),
            })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="coverLetterTemplate">Cover Letter Template</Label>
        <Textarea id="coverLetterTemplate" {...form.register("coverLetterTemplate")} rows={4} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="resume">Resume (PDF/DOCX, max 10MB)</Label>
        <Input id="resume" type="file" accept=".pdf,.docx" />
        {profile?.resume_filename && (
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" /> Current: {profile.resume_filename}
          </p>
        )}
      </div>

      <DialogFooter>
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Spinner size="sm" className="mr-2" /> Saving...
            </>
          ) : profile ? (
            "Update Profile"
          ) : (
            "Create Profile"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

export default function ProfilesPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | undefined>();
  const [isPending, startTransition] = useTransition();

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["profiles"],
    queryFn: fetchProfiles,
  });

  function handleSuccess() {
    setDialogOpen(false);
    setEditingProfile(undefined);
    queryClient.invalidateQueries({ queryKey: ["profiles"] });
  }

  function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this profile?")) return;
    startTransition(async () => {
      const result = await deleteProfile(id);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Profile deleted");
        queryClient.invalidateQueries({ queryKey: ["profiles"] });
      }
    });
  }

  function handleGenerateResume(profileId: string, format: "pdf" | "docx") {
    startTransition(async () => {
      toast.loading("Generating AI resume...", { id: "resume-gen" });
      const result = await generateResumeDownload(profileId, format);
      toast.dismiss("resume-gen");

      if (result.error) {
        toast.error(result.error);
        return;
      }

      if (result.base64 && result.filename && result.mimeType) {
        const bytes = Uint8Array.from(atob(result.base64), (c) => c.charCodeAt(0));
        const blob = new Blob([bytes], { type: result.mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = result.filename;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`Resume downloaded as ${format.toUpperCase()}`);
      }
    });
  }

  return (
    <div>
      <DashboardHeader title="Profiles">
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingProfile(undefined);
        }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" /> New Profile
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingProfile ? "Edit Profile" : "Create Profile"}</DialogTitle>
              <DialogDescription>
                Set up a developer profile for auto-bidding
              </DialogDescription>
            </DialogHeader>
            <ProfileForm profile={editingProfile} onSuccess={handleSuccess} />
          </DialogContent>
        </Dialog>
      </DashboardHeader>

      <div className="p-6">
        {isLoading ? (
          <PageLoader label="Loading profiles..." />
        ) : profiles?.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No profiles yet. Create your first profile to get started.</p>
              <Button className="mt-4" onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Create Profile
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {profiles?.map((profile) => (
              <Card key={profile.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{profile.name}</CardTitle>
                      <CardDescription>{profile.email}</CardDescription>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingProfile(profile);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(profile.id)}
                        disabled={isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {profile.bio && (
                    <p className="mb-3 text-sm text-muted-foreground line-clamp-2">{profile.bio}</p>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {profile.skills.slice(0, 5).map((skill) => (
                      <Badge key={skill} variant="secondary" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                    {profile.skills.length > 5 && (
                      <Badge variant="outline" className="text-xs">
                        +{profile.skills.length - 5}
                      </Badge>
                    )}
                  </div>
                  {profile.resume_filename && (
                    <p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                      <FileText className="h-3 w-3" /> {profile.resume_filename}
                    </p>
                  )}
                  {(profile.salary_min || profile.salary_max) && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Salary: ${profile.salary_min?.toLocaleString() ?? "?"} – $
                      {profile.salary_max?.toLocaleString() ?? "?"}
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      disabled={isPending}
                      onClick={() => handleGenerateResume(profile.id, "pdf")}
                    >
                      <Sparkles className="h-3 w-3" />
                      <Download className="h-3 w-3" /> PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      disabled={isPending}
                      onClick={() => handleGenerateResume(profile.id, "docx")}
                    >
                      <Sparkles className="h-3 w-3" />
                      <Download className="h-3 w-3" /> DOCX
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
