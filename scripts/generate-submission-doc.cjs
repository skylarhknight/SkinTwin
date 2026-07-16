/**
 * Generates SkinTwin_Devpost_Submission.docx for hackathon project page / write-up.
 * Run: node scripts/generate-submission-doc.cjs
 */

const fs = require("fs");
const path = require("path");
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  ExternalHyperlink,
} = require("docx");

async function main() {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            heading: HeadingLevel.TITLE,
            children: [
              new TextRun({
                text: "SkinTwin",
                bold: true,
                size: 56,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "Perfect Corp × Startup World Cup — Silicon Valley Hackathon",
                italics: true,
                size: 22,
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 120, after: 120 },
            children: [
              new TextRun({
                text: "Short write-up (for Devpost project description)",
                bold: true,
                size: 28,
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: "SkinTwin is an immersive skincare web app that turns daily selfies into a measurable skin profile, connects habits and products to trends over time, and uses Perfect Corp’s AI Skin Simulation to show illustrative future outcomes. A personalized recommendation layer ranks skincare picks against each user’s scores and profile—so the journey reads as real consumer and retail value: scan → understand → shop with rationale → see your future self—all tied to one login.",
                size: 22,
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 120, after: 120 },
            children: [
              new TextRun({
                text: "Elevator pitch (~30 seconds)",
                bold: true,
                size: 28,
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: "SkinTwin is the skincare twin you wish you had: daily selfies become a scored skin profile using Perfect Corp AI Skin Analysis and Facial Color Tones; habits and your shelf plug into trends and insights; AI Skin Simulation shows your face years ahead under different routines; then we rank real products to your metrics so shopping isn’t guesswork. One login—scan, personalize, simulate, and save.",
                size: 22,
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 120, after: 120 },
            children: [
              new TextRun({
                text: "Project page (full story — paste or trim for Devpost)",
                bold: true,
                size: 28,
              }),
            ],
          }),
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 80, after: 80 },
            children: [new TextRun({ text: "Tagline", bold: true })],
          }),
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: "AI skin scores, personalized picks, and your future face—in one signed-in journey powered by Perfect Corp.",
                size: 22,
              }),
            ],
          }),
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 80, after: 80 },
            children: [new TextRun({ text: "What we built", bold: true })],
          }),
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: "SkinTwin delivers a complete feedback loop for skincare: capture a face photo, receive AI-derived scores and undertone, log daily habits and products, view trends from saved scans, explore pattern-based insights, generate AM/PM routines, simulate illustrative aging scenarios, and browse product recommendations ranked with explicit “why this matches you” rationale. Authentication and persistence ensure each user’s images and history stay scoped to their account.",
                size: 22,
              }),
            ],
          }),
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 80, after: 80 },
            children: [new TextRun({ text: "Perfect Corp APIs integrated", bold: true })],
          }),
          new Paragraph({
            spacing: { after: 80 },
            bullet: { level: 0 },
            children: [
              new TextRun({ text: "AI Skin Analysis ", bold: true, size: 22 }),
              new TextRun({
                text: "— core dimensional scores and concern ranking from each scan.",
                size: 22,
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 80 },
            bullet: { level: 0 },
            children: [
              new TextRun({ text: "AI Facial Color Tones ", bold: true, size: 22 }),
              new TextRun({
                text: "— undertone and tone-related signals for personalization.",
                size: 22,
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 120 },
            bullet: { level: 0 },
            children: [
              new TextRun({ text: "AI Skin Simulation ", bold: true, size: 22 }),
              new TextRun({
                text: "— illustrative future-face visualization across lifestyle scenarios.",
                size: 22,
              }),
            ],
          }),
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 80, after: 80 },
            children: [new TextRun({ text: "Consumer & retail value", bold: true })],
          }),
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: "Shoppers need guidance tied to their actual skin state—not generic routines. SkinTwin links analysis to personalized product rationale and long-term visualization, matching how brands and retailers want to engage users online: educate, recommend with transparency, and drive consideration through an immersive, repeatable journey.",
                size: 22,
              }),
            ],
          }),
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 80, after: 80 },
            children: [new TextRun({ text: "How we built it", bold: true })],
          }),
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: "Next.js (App Router), TypeScript, Tailwind CSS, Recharts; Supabase for authentication and persistent user data; Perfect Corp APIs integrated server-side with timeouts and resilient response handling. Includes optional demo seeding so reviewers can experience the full application flow without a camera.",
                size: 22,
              }),
            ],
          }),
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 80, after: 80 },
            children: [new TextRun({ text: "Submission checklist (Devpost)", bold: true })],
          }),
          new Paragraph({
            spacing: { after: 80 },
            bullet: { level: 0 },
            children: [
              new TextRun({
                text: "Project title, tagline, and this description on your Devpost project page.",
                size: 22,
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 80 },
            bullet: { level: 0 },
            children: [
              new TextRun({
                text: "Screenshots: landing, dashboard, scan results, recommendations/shop, future simulation (slider), optional Skin Card.",
                size: 22,
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 80 },
            bullet: { level: 0 },
            children: [
              new TextRun({
                text: "Demo video (1–3 minutes): end-to-end walkthrough showing login, scan, recommendations, and simulation.",
                size: 22,
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 120 },
            bullet: { level: 0 },
            children: [
              new TextRun({
                text: "Links: live demo URL (if deployed) and source repository.",
                size: 22,
              }),
            ],
          }),
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 80, after: 80 },
            children: [new TextRun({ text: "Disclaimer", bold: true })],
          }),
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: "SkinTwin provides wellness and skincare guidance only. It does not diagnose, treat, or prevent medical conditions. For persistent or severe skin concerns, consult a licensed dermatologist.",
                size: 22,
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 200, after: 80 },
            children: [
              new TextRun({
                text: "Hackathon reference: ",
                size: 20,
                color: "666666",
              }),
              new ExternalHyperlink({
                children: [
                  new TextRun({
                    text: "perfectcorphackathon.devpost.com",
                    style: "Hyperlink",
                    size: 20,
                  }),
                ],
                link: "https://perfectcorphackathon.devpost.com/",
              }),
            ],
          }),
        ],
      },
    ],
  });

  const outDir = path.join(__dirname, "..", "docs");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "SkinTwin_Devpost_Submission.docx");
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outPath, buffer);
  console.log("Wrote:", outPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
