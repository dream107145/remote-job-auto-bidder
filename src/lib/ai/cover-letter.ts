import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

interface CoverLetterParams {
  profile: {
    name: string;
    bio: string | null;
    skills: string[];
    cover_letter_template: string | null;
    github_url: string | null;
    linkedin_url: string | null;
  };
  jobTitle: string;
  company: string;
  jobDescription: string;
}

const prompt = PromptTemplate.fromTemplate(`
You are a professional cover letter writer. Write a compelling, personalized cover letter for the following job application.

Applicant Name: {name}
Applicant Bio: {bio}
Applicant Skills: {skills}
GitHub: {github}
LinkedIn: {linkedin}
Template (use as style guide): {template}

Job Title: {jobTitle}
Company: {company}
Job Description: {jobDescription}

Write a professional cover letter (300-500 words) that:
1. Highlights relevant skills matching the job requirements
2. Shows genuine interest in the company and role
3. Includes specific examples where possible
4. Has a professional but personable tone
5. Ends with a clear call to action

Cover Letter:
`);

export async function generateCoverLetter(params: CoverLetterParams): Promise<string> {
  const model = new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0.7,
    openAIApiKey: process.env.OPENAI_API_KEY,
  });

  const chain = prompt.pipe(model).pipe(new StringOutputParser());

  const result = await chain.invoke({
    name: params.profile.name,
    bio: params.profile.bio || "Experienced developer",
    skills: params.profile.skills.join(", "),
    github: params.profile.github_url || "N/A",
    linkedin: params.profile.linkedin_url || "N/A",
    template: params.profile.cover_letter_template || "Professional and concise",
    jobTitle: params.jobTitle,
    company: params.company,
    jobDescription: params.jobDescription.slice(0, 2000),
  });

  return result;
}

export async function calculateMatchScore(
  profileSkills: string[],
  jobSkills: string[],
  jobDescription: string
): Promise<number> {
  if (!profileSkills.length) return 0;

  const normalizedProfile = profileSkills.map((s) => s.toLowerCase());
  const normalizedJob = jobSkills.map((s) => s.toLowerCase());

  const directMatches = normalizedProfile.filter((s) => normalizedJob.includes(s)).length;
  const descMatches = normalizedProfile.filter((s) =>
    jobDescription.toLowerCase().includes(s)
  ).length;

  const totalMatches = directMatches + descMatches * 0.5;
  const maxPossible = Math.max(normalizedProfile.length, 1);

  return Math.min(Math.round((totalMatches / maxPossible) * 100), 100);
}
