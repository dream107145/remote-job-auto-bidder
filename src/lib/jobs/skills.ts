const COMMON_SKILLS = [
  "JavaScript", "TypeScript", "Python", "React", "Node.js", "Go", "Rust",
  "Java", "Ruby", "PHP", "Swift", "Kotlin", "AWS", "Docker", "Kubernetes",
  "PostgreSQL", "MongoDB", "GraphQL", "Next.js", "Vue", "Angular", "Django",
  "Flask", "Rails", "Laravel", "Terraform", "CI/CD", "Git", "C#", "C++",
  ".NET", "SQL", "Redis", "Elasticsearch", "Microservices", "REST", "API",
];

export function extractSkills(text: string): string[] {
  const lower = text.toLowerCase();
  return COMMON_SKILLS.filter((skill) => lower.includes(skill.toLowerCase()));
}
