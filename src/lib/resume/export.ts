import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
} from "docx";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { GeneratedResume, ResumeProfile } from "@/lib/ai/resume-generator";

function buildSections(resume: GeneratedResume, profile: ResumeProfile) {
  const lines: { type: "title" | "heading" | "subheading" | "body" | "bullet"; text: string }[] = [
    { type: "title", text: profile.name },
    { type: "body", text: profile.email },
  ];

  if (profile.github_url) lines.push({ type: "body", text: profile.github_url });
  if (profile.linkedin_url) lines.push({ type: "body", text: profile.linkedin_url });

  lines.push({ type: "heading", text: "Professional Summary" });
  lines.push({ type: "body", text: resume.summary });

  lines.push({ type: "heading", text: "Experience" });
  for (const exp of resume.experience) {
    lines.push({ type: "subheading", text: `${exp.title} — ${exp.company}` });
    lines.push({ type: "body", text: exp.period });
    for (const bullet of exp.bullets) {
      lines.push({ type: "bullet", text: bullet });
    }
  }

  lines.push({ type: "heading", text: "Skills" });
  lines.push({ type: "body", text: resume.skills.join(" • ") });

  lines.push({ type: "heading", text: "Education" });
  for (const edu of resume.education) {
    lines.push({ type: "subheading", text: `${edu.degree}, ${edu.school}` });
    lines.push({ type: "body", text: edu.year });
  }

  return lines;
}

export async function generateDocx(
  resume: GeneratedResume,
  profile: ResumeProfile
): Promise<Buffer> {
  const sections = buildSections(resume, profile);
  const children: Paragraph[] = [];

  for (const line of sections) {
    if (line.type === "title") {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          heading: HeadingLevel.TITLE,
          children: [new TextRun({ text: line.text, bold: true, size: 48 })],
        })
      );
    } else if (line.type === "heading") {
      children.push(
        new Paragraph({
          spacing: { before: 300, after: 120 },
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun({ text: line.text, bold: true, size: 28 })],
        })
      );
    } else if (line.type === "subheading") {
      children.push(
        new Paragraph({
          spacing: { before: 200 },
          children: [new TextRun({ text: line.text, bold: true, size: 24 })],
        })
      );
    } else if (line.type === "bullet") {
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          children: [new TextRun({ text: line.text, size: 22 })],
        })
      );
    } else {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: line.text, size: 22 })],
        })
      );
    }
  }

  const doc = new Document({ sections: [{ children }] });
  return Buffer.from(await Packer.toBuffer(doc));
}

export async function generatePdf(
  resume: GeneratedResume,
  profile: ResumeProfile
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([612, 792]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = 750;
  const margin = 50;
  const lineHeight = 16;

  function addText(text: string, size: number, bold = false, indent = 0) {
    const maxWidth = 512 - indent;
    const words = text.split(" ");
    let line = "";

    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      const width = (bold ? fontBold : font).widthOfTextAtSize(test, size);
      if (width > maxWidth && line) {
        if (y < 60) {
          page = pdfDoc.addPage([612, 792]);
          y = 750;
        }
        page.drawText(line, {
          x: margin + indent,
          y,
          size,
          font: bold ? fontBold : font,
          color: rgb(0.1, 0.1, 0.1),
        });
        y -= lineHeight;
        line = word;
      } else {
        line = test;
      }
    }

    if (line) {
      if (y < 60) {
        page = pdfDoc.addPage([612, 792]);
        y = 750;
      }
      page.drawText(line, {
        x: margin + indent,
        y,
        size,
        font: bold ? fontBold : font,
        color: rgb(0.1, 0.1, 0.1),
      });
      y -= lineHeight;
    }
  }

  const sections = buildSections(resume, profile);

  for (const line of sections) {
    if (line.type === "title") {
      y -= 8;
      addText(line.text, 22, true);
      y -= 4;
    } else if (line.type === "heading") {
      y -= 12;
      addText(line.text, 14, true);
    } else if (line.type === "subheading") {
      y -= 6;
      addText(line.text, 11, true);
    } else if (line.type === "bullet") {
      addText(`• ${line.text}`, 10, false, 12);
    } else {
      addText(line.text, 10);
    }
  }

  return Buffer.from(await pdfDoc.save());
}
