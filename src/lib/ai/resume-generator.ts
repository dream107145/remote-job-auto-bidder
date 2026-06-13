import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

export interface ResumeProfile {
  name: string;
  email: string;
  bio: string | null;
  skills: string[];
  github_url: string | null;
  linkedin_url: string | null;
  availability: string | null;
  salary_min: number | null;
  salary_max: number | null;
}

export interface GeneratedResume {
  summary: string;
  experience: { title: string; company: string; period: string; bullets: string[] }[];
  skills: string[];
  education: { degree: string; school: string; year: string }[];
}

const prompt = PromptTemplate.fromTemplate(`
Generate a professional developer resume in JSON format for the following candidate.

Name: {name}
Email: {email}
Bio: {bio}
Skills: {skills}
GitHub: {github}
LinkedIn: {linkedin}
Availability: {availability}
Salary Range: {salaryRange}

Return ONLY valid JSON with this structure:
{{
  "summary": "2-3 sentence professional summary",
  "experience": [
    {{
      "title": "Job Title",
      "company": "Company Name",
      "period": "2020 - Present",
      "bullets": ["achievement 1", "achievement 2", "achievement 3"]
    }}
  ],
  "skills": ["skill1", "skill2"],
  "education": [
    {{
      "degree": "Degree Name",
      "school": "University Name",
      "year": "2020"
    }}
  ]
}}

Create 2-3 realistic experience entries based on their skills and bio. Make it professional and ATS-friendly.
`);

export async function generateResumeContent(profile: ResumeProfile): Promise<GeneratedResume> {
  const model = new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0.7,
    openAIApiKey: process.env.OPENAI_API_KEY,
  });

  const chain = prompt.pipe(model).pipe(new StringOutputParser());

  const salaryRange =
    profile.salary_min && profile.salary_max
      ? `$${profile.salary_min} - $${profile.salary_max}`
      : profile.salary_min
        ? `$${profile.salary_min}+`
        : "Not specified";

  const result = await chain.invoke({
    name: profile.name,
    email: profile.email,
    bio: profile.bio || "Experienced software developer",
    skills: profile.skills.join(", "),
    github: profile.github_url || "N/A",
    linkedin: profile.linkedin_url || "N/A",
    availability: profile.availability || "Full-time remote",
    salaryRange,
  });

  const cleaned = result.replace(/```json\n?|\n?```/g, "").trim();
  return JSON.parse(cleaned) as GeneratedResume;
}
