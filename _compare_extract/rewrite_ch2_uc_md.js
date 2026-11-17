/**
 * Rewrite Chapter2.md §2.2.12 use-case blocks to NeoTeach table layout.
 */
const fs = require("fs");
const path = "D:/vally/captain_truck/docs/Chapter2.md";
const md = fs.readFileSync(path, "utf8");

const start = md.indexOf("## 2.2.12 Usecase Description");
const end = md.indexOf("## Chapter 2 summary");
if (start < 0 || end < 0) throw new Error("markers not found");

const before = md.slice(0, start);
const after = md.slice(end);
const section = md.slice(start, end);
const parts = section.split(/\n### Table (2\.2\.12\.\d+):\s*/);

function strip(s) {
  return String(s || "")
    .replace(/\*\*/g, "")
    .trim();
}

function bullets(t) {
  return String(t || "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^[-*]/.test(l) || /^A\d/.test(l))
    .map((l) => l.replace(/^[-*]\s*/, "").trim());
}

function parseFields(body) {
  const fields = {};
  const ft = body.match(/\| Field \| Value \|[\s\S]*?(?=\n\*\*Pre-Condition)/);
  if (!ft) return fields;
  for (const line of ft[0].split("\n")) {
    if (!line.startsWith("|")) continue;
    if (/Field\s*\|\s*Value/.test(line) || /^\|\s*-+/.test(line)) continue;
    const cells = line
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((c) => strip(c));
    if (cells.length >= 2 && cells[0]) fields[cells[0].replace(/:$/, "")] = cells[1];
  }
  return fields;
}

function extractFlowMarkdown(body) {
  const m = body.match(/\*\*Basic Flow[\s\S]*?(?=\*\*Alternative Flow)/);
  if (!m) return "**Basic Flow:**\n\n";
  // Keep headings + tables as authored (supports Stripe/Cash variants)
  return m[0].trim() + "\n";
}

let out =
  "## 2.2.12 Usecase Description\n\n" +
  "Detailed use cases follow the NeoTeach OO template exactly: use-case title, table caption, " +
  "metadata row pairs (Use-case Name / Use-case ID, Actor / Created By, Date, Description), " +
  "then Pre-Condition, Basic Flow (User | System), Alternative Flow, and Post-Condition. " +
  "**Customer** self-registers; **Driver** accounts are admin-created; **Administrator** owns catalog, " +
  "approval, willingness inquiry, assignment and ledger. Where a proposal behaviour is required but not " +
  "yet fully coded, the use case still specifies the required behaviour for implementation and testing.\n\n" +
  "---\n";

for (let i = 1; i < parts.length; i += 2) {
  const id = parts[i];
  const body = parts[i + 1] || "";
  const title = body.split("\n")[0].trim();
  const fields = parseFields(body);
  const pre = (body.match(/\*\*Pre-Condition:\*\*([\s\S]*?)\*\*Basic Flow/) || [])[1] || "";
  const alt = (body.match(/\*\*Alternative Flow:\*\*([\s\S]*?)\*\*Post-Condition/) || [])[1] || "";
  const post =
    (body.match(/\*\*Post-Condition:\*\*([\s\S]*?)(?=\n---|\n### |\n## |$)/) || [])[1] || "";

  // Keep ### Table id heading so the Word builder can parse; NeoTeach title sits under it.
  out += `\n### Table ${id}: ${title}\n\n`;
  out += `${title} Use-case\n\n`;
  out += `**Table ${id}: ${title}**\n\n`;
  out += `| Use-case Name: | ${fields["Use-case Name"] || ""} | Use-case ID: | ${fields["Use-case ID"] || ""} |\n`;
  out += `|---------------|------|--------------|------|\n`;
  out += `| Actor: | ${fields["Actor"] || ""} | Created By: | ${fields["Created By"] || ""} |\n`;
  out += `| Date: | ${fields["Date"] || ""} | | |\n`;
  out += `| Description: | ${fields["Description"] || ""} | | |\n\n`;

  out += "**Pre-Condition:**\n";
  for (const b of bullets(pre)) out += `- ${b}\n`;
  out += "\n";

  out += extractFlowMarkdown(body) + "\n";

  out += "**Alternative Flow:**\n";
  for (const b of bullets(alt)) out += `- ${b}\n`;
  out += "\n";

  out += "**Post-Condition:**\n";
  for (const b of bullets(post)) out += `- ${b}\n`;
  out += "\n---\n";
}

fs.writeFileSync(path, before + out + "\n" + after);
console.log("Updated", path, "use cases:", (parts.length - 1) / 2);
