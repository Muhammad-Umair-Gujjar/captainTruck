/**
 * Rewrite Chapter2.md §2.2.12 so each use case is ONE NeoTeach-style table
 * (Name, ID, Actor, Created By, Date, Description, Pre-Condition, Basic Flow,
 * Alternative Flow, Post-Condition) — matching the sample SRS image.
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
    .filter((l) => /^[-*•]/.test(l) || /^A\d/.test(l))
    .map((l) => l.replace(/^[-*•]\s*/, "").trim());
}

function parseFields(body) {
  const fields = {};
  // Legacy Field|Value
  const ft = body.match(/\| Field \| Value \|[\s\S]*?(?=\n\*\*Pre-Condition|\n\| Pre-Condition)/);
  if (ft) {
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
  }
  // NeoTeach paired or single-table rows
  const neo = body.match(
    /\| Use-case Name:[\s\S]*?(?=\n\*\*Pre-Condition|\n\| Pre-Condition:)/i
  );
  if (neo) {
    for (const line of neo[0].split("\n")) {
      if (!line.startsWith("|")) continue;
      if (/^\|\s*-+/.test(line)) continue;
      const cells = line
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((c) => strip(c));
      for (let i = 0; i < cells.length - 1; i++) {
        const lab = cells[i].replace(/:$/, "");
        if (
          [
            "Use-case Name",
            "Use-case ID",
            "Actor",
            "Created By",
            "Date",
            "Description",
          ].includes(lab)
        ) {
          fields[lab] = cells[i + 1];
        }
      }
    }
  }
  // Already single-table: read label|value rows
  for (const key of [
    "Use-case Name",
    "Use-case ID",
    "Actor",
    "Created By",
    "Date",
    "Description",
  ]) {
    if (fields[key]) continue;
    const re = new RegExp(
      "\\|\\s*" + key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ":?\\s*\\|\\s*([^|]+)\\|"
    );
    const m = body.match(re);
    if (m) fields[key] = strip(m[1]);
  }
  return fields;
}

function extractFlowMarkdown(body) {
  // Prefer markdown User|System tables under Basic Flow
  const m = body.match(/\*\*Basic Flow[\s\S]*?(?=\*\*Alternative Flow|\| Alternative Flow)/);
  if (m) {
    const tables = [];
    const chunk = m[0];
    const re = /(?:\*\*Basic Flow([^*]*)\*\*\s*)?\| User \| System \|[\s\S]*?(?=\n\*\*|\n\| Alternative|\n\| Post-|\n---|$)/gi;
    let hit;
    let found = false;
    while ((hit = re.exec(chunk))) {
      found = true;
      const label = strip(hit[1] || "").replace(/[():]/g, "").trim();
      const table = hit[0].replace(/\*\*Basic Flow[^*]*\*\*\s*/i, "").trim();
      if (label) tables.push(`_(${label})_\n\n${table}`);
      else tables.push(table);
    }
    if (found) return tables.join("\n\n");
  }
  // Single-table cell may already embed a flow markdown table after Basic Flow row
  const cell = body.match(
    /\| Basic Flow:?\s*\|([\s\S]*?)\|\s*Alternative Flow/i
  );
  if (cell) return strip(cell[1]).replace(/\|$/,"") ;
  return "| User | System |\n|------|--------|\n| | |";
}

function cellLines(items) {
  if (!items.length) return " ";
  return items.map((b) => `• ${b}`).join("<br>");
}

let out =
  "## 2.2.12 Usecase Description\n\n" +
  "Detailed use cases follow the NeoTeach OO template: each use case is presented as **one single table** " +
  "(Use-case Name, Use-case ID, Actor, Created By, Date, Description, Pre-Condition, Basic Flow with nested User|System steps, " +
  "Alternative Flow, Post-Condition). **Customer** self-registers; **Driver** accounts are admin-created; " +
  "**Administrator** owns catalog, approval, willingness inquiry, assignment and ledger.\n\n---\n";

for (let i = 1; i < parts.length; i += 2) {
  const id = parts[i];
  const body = parts[i + 1] || "";
  let title = body.split("\n")[0].trim();
  title = title
    .replace(/\s+Use-case$/i, "")
    .replace(/^Use Case:\s*/i, "")
    .replace(/\*\*/g, "")
    .trim();
  if (/^Table /i.test(title)) {
    // first line was table heading leftover; try next meaningful line
    const lines = body.split("\n").map((l) => l.trim()).filter(Boolean);
    title = (lines.find((l) => /Use-case$/i.test(l) || /^[A-Z]/.test(l) && !l.startsWith("|") && !l.startsWith("**")) || title)
      .replace(/\s+Use-case$/i, "")
      .replace(/^Use Case:\s*/i, "")
      .replace(/\*\*Table[^:]+:\s*/i, "")
      .replace(/\*\*/g, "")
      .trim();
  }
  // Prefer title from ### Table id: Title split — the split already gave us id; title is first line after split in original which was "Customer Registration" etc.
  // parts[i+1] starts with title from "### Table id: TITLE\n"
  const titleFromHeading = (parts[i + 1] || "").split("\n")[0].trim();
  if (titleFromHeading && !titleFromHeading.startsWith("|") && !titleFromHeading.startsWith("**")) {
    title = titleFromHeading
      .replace(/\s+Use-case$/i, "")
      .replace(/^Use Case:\s*/i, "")
      .trim();
  }

  const fields = parseFields(body);

  let pre = bullets((body.match(/\*\*Pre-Condition:\*\*([\s\S]*?)\*\*Basic Flow/) || [])[1] || "");
  let alt = bullets((body.match(/\*\*Alternative Flow:\*\*([\s\S]*?)\*\*Post-Condition/) || [])[1] || "");
  let post = bullets(
    (body.match(/\*\*Post-Condition:\*\*([\s\S]*?)(?=\n---|\n### |\n## |$)/) || [])[1] || ""
  );

  // Single-table fallback extraction
  if (!pre.length) {
    const m = body.match(/\| Pre-Condition:?\s*\|([^|]*)\|/i);
    if (m) pre = m[1].split(/•|<br\s*\/?>/i).map(strip).filter(Boolean);
  }
  if (!alt.length) {
    const m = body.match(/\| Alternative Flow:?\s*\|([^|]*)\|/i);
    if (m) alt = m[1].split(/•|<br\s*\/?>/i).map(strip).filter(Boolean);
  }
  if (!post.length) {
    const m = body.match(/\| Post-Condition:?\s*\|([^|]*)\|/i);
    if (m) post = m[1].split(/•|<br\s*\/?>/i).map(strip).filter(Boolean);
  }

  const flowMd = extractFlowMarkdown(body);

  out += `\n### Table ${id}: ${title}\n\n`;
  out += `Use Case: ${title}\n\n`;
  out += `**Table ${id}: ${title} User Description**\n\n`;
  out += `| Field | Details |\n`;
  out += `|-------|---------|`;
  out += `\n| Use-case Name: | ${fields["Use-case Name"] || ""} |`;
  out += `\n| Use-case ID: | ${fields["Use-case ID"] || ""} |`;
  out += `\n| Actor: | ${fields["Actor"] || ""} |`;
  out += `\n| Created By: | ${fields["Created By"] || ""} |`;
  out += `\n| Date: | ${fields["Date"] || ""} |`;
  out += `\n| Description: | ${fields["Description"] || ""} |`;
  out += `\n| Pre-Condition: | ${cellLines(pre)} |`;
  out += `\n| Basic Flow: | See User \\| System steps below |`;
  out += `\n| Alternative Flow: | ${cellLines(alt)} |`;
  out += `\n| Post-Condition: | ${cellLines(post)} |\n\n`;
  out += `**Basic Flow (User \\| System):**\n\n${flowMd}\n\n`;
  out += `---\n`;
}

fs.writeFileSync(path, before + out + "\n" + after);
console.log("Updated", path, "use cases:", (parts.length - 1) / 2);
