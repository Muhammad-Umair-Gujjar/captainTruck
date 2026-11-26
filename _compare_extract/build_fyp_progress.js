const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFileSync } = require("child_process");

const TEMPLATE = "d:\\FYP\\FYP Progress Report.docx";
const OUT_DIR = "d:\\FYP\\progress_reports";
const FYP_DIR = "d:\\FYP";
const DATE = "18/11/2026";

const TITLE =
  "Captain Truck: A Comprehensive Real-Time Logistics and Dispatch Platform";
const SUPERVISOR = "Mr. Touqeer Ul Ameen";

/**
 * Content shaped like the Numan Arif reference PDF:
 * Overall %, individual %, "Work completed by …", numbered sections + bullets,
 * shared Chapter 1/2 docs, optional extra lead tasks, What remains.
 */
const members = [
  {
    file: "FYP_Progress_Report_Muhammad_Umair.docx",
    name: "Muhammad Umair",
    roll: "23011598-062",
    pct: 8,
    blocks: [
      { type: "plain", text: "Overall FYP progress: 20%" },
      {
        type: "plain",
        text: "Muhammad Umair's contribution toward overall progress: 8%",
      },
      { type: "plain", text: "Work completed by Muhammad Umair" },
      { type: "blank" },
      { type: "heading", text: "1. Project coordination (Team Lead)" },
      {
        type: "bullet",
        text: "Coordinated requirements/scope finalization and locked stack with the group (NestJS, PostgreSQL/Neon, Socket.IO, React Admin, Flutter clients)",
      },
      {
        type: "bullet",
        text: "Kept module ownership clear (API / Flutter apps / Admin panel) and tracked the 20% milestone",
      },
      { type: "blank" },
      { type: "heading", text: "2. NestJS API & architecture" },
      {
        type: "bullet",
        text: "Defined system architecture and Prisma/Neon data-model design (users, truck types, dispatches, trips, payments)",
      },
      {
        type: "bullet",
        text: "Scaffolded NestJS backend, phase plan, and JWT + refresh-token auth design (customer / driver / admin)",
      },
      {
        type: "bullet",
        text: "Started truck types / base rates and dispatch-request API groundwork; drafted shared REST API contracts",
      },
      { type: "blank" },
      { type: "heading", text: "3. Shared documentation (all members)" },
      {
        type: "bullet",
        text: "Contributed to Chapter 1 (Project Feasibility Report) — completed",
      },
      {
        type: "bullet",
        text: "Contributed to Chapter 2 (Software Requirement Specification — OO Approach) — completed",
      },
      { type: "blank" },
      { type: "heading", text: "4. Extra Team Lead tasks" },
      {
        type: "bullet",
        text: "Established Git workflow, coding standards, and supervisor coordination notes",
      },
      {
        type: "bullet",
        text: "Documented risk mitigations (OSRM/Nominatim latency, Neon free-tier sleep) and Oracle deploy planning",
      },
      {
        type: "bullet",
        text: "Prepared API contract alignment so Flutter and Admin clients integrate against one backend",
      },
      { type: "blank" },
      { type: "heading", text: "What remains" },
      {
        type: "bullet",
        text: "Complete dispatch approve/reject/assign APIs and trip lifecycle with Socket.IO GPS",
      },
      {
        type: "bullet",
        text: "Cash-on-Pickup + Stripe Test Mode and commission ledger",
      },
      {
        type: "bullet",
        text: "FCM push, security hardening, Oracle deploy, and continued shared documentation",
      },
      { type: "blank" },
      { type: "blank" },
      { type: "blank" },
      { type: "blank" },
    ],
  },
  {
    file: "FYP_Progress_Report_Muhammad_Ali.docx",
    name: "Muhammad Ali",
    roll: "23011598-063",
    pct: 6,
    blocks: [
      { type: "plain", text: "Overall FYP progress: 20%" },
      {
        type: "plain",
        text: "Muhammad Ali's contribution toward overall progress: 6%",
      },
      { type: "plain", text: "Work completed by Muhammad Ali" },
      { type: "blank" },
      {
        type: "heading",
        text: "1. UI/UX wireframes (Customer & Driver)",
      },
      {
        type: "bullet",
        text: "Prepared wireframes for Customer and Driver Android apps (request flow, trip views, navigation)",
      },
      {
        type: "bullet",
        text: "Aligned screen flow with admin-mediated dispatch and route-selection UX",
      },
      { type: "blank" },
      {
        type: "heading",
        text: "2. Flutter Customer & Driver app shells",
      },
      {
        type: "bullet",
        text: "Created Flutter project shells with shared theme, routing, and early auth screens",
      },
      {
        type: "bullet",
        text: "Built early Customer request-flow screens and Driver home / assigned-trip placeholders",
      },
      { type: "blank" },
      {
        type: "heading",
        text: "3. Maps & on-device AI planning",
      },
      {
        type: "bullet",
        text: "Set up OSM / flutter_map approach for map display and 2–3 route-option UX (OSRM-aligned)",
      },
      {
        type: "bullet",
        text: "Started planning for on-device TFLite trip-cost prediction input/output on the Customer side",
      },
      { type: "blank" },
      { type: "heading", text: "4. Shared documentation (all members)" },
      {
        type: "bullet",
        text: "Contributed to Chapter 1 (Project Feasibility Report) — completed",
      },
      {
        type: "bullet",
        text: "Contributed to Chapter 2 (SRS — OO Approach), especially Customer/Driver use cases — completed",
      },
      { type: "blank" },
      { type: "heading", text: "What remains" },
      {
        type: "bullet",
        text: "Full Customer request + route selection flow wired to live NestJS APIs",
      },
      {
        type: "bullet",
        text: "Driver assigned-trip management, OSM navigation, and on-route chat",
      },
      {
        type: "bullet",
        text: "TFLite cost model integration, Smart Reply, and continued shared documentation",
      },
      { type: "blank" },
      { type: "blank" },
      { type: "blank" },
      { type: "blank" },
    ],
  },
  {
    file: "FYP_Progress_Report_Muhammad_Shahzaib.docx",
    name: "Muhammad Shahzaib",
    roll: "23011598-109",
    pct: 6,
    blocks: [
      { type: "plain", text: "Overall FYP progress: 20%" },
      {
        type: "plain",
        text: "Muhammad Shahzaib's contribution toward overall progress: 6%",
      },
      { type: "plain", text: "Work completed by Muhammad Shahzaib" },
      { type: "blank" },
      {
        type: "heading",
        text: "1. Admin panel planning & scaffold",
      },
      {
        type: "bullet",
        text: "Reviewed architecture/schema with team lead for Admin-related entities",
      },
      {
        type: "bullet",
        text: "Prepared Admin wireframes (login, dispatch list, approve/reject/assign)",
      },
      {
        type: "bullet",
        text: "Scaffolded React + Vite + Tailwind Admin project with early login and protected-route layout",
      },
      { type: "blank" },
      {
        type: "heading",
        text: "2. Admin UI & testing outline",
      },
      {
        type: "bullet",
        text: "Drafted dispatch review UI placeholders aligned with API contracts",
      },
      {
        type: "bullet",
        text: "Planned Leaflet/OSM live-map approach for Admin trip monitoring; drafted smoke/e2e outline",
      },
      { type: "blank" },
      {
        type: "heading",
        text: "3. Shared documentation (primary owner)",
      },
      {
        type: "bullet",
        text: "Completed Chapter 1 — Project Feasibility Report (feasibility, WBS, team assignment, tools)",
      },
      {
        type: "bullet",
        text: "Completed Chapter 2 — Software Requirement Specification for Object Oriented Approach (actors, use cases, FR/NFR)",
      },
      { type: "blank" },
      { type: "heading", text: "What remains" },
      {
        type: "bullet",
        text: "Complete Admin approve/reject/assign flows against live APIs",
      },
      {
        type: "bullet",
        text: "Live map monitoring, users/truck-types/rates screens, and commission views",
      },
      {
        type: "bullet",
        text: "Continued shared documentation (design / final report) with the full team",
      },
      { type: "blank" },
      { type: "blank" },
      { type: "blank" },
      { type: "blank" },
    ],
  },
];

function esc(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function pPr(opts = {}) {
  const sz = opts.sz || "24";
  const bold = opts.bold ? "<w:b />" : "";
  const italic = opts.italic ? "<w:i />" : "";
  return `<w:pPr><w:spacing w:after="60" w:line="276" w:lineRule="auto" /><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman" />${bold}${italic}<w:sz w:val="${sz}" /><w:szCs w:val="${sz}" /></w:rPr></w:pPr>`;
}

function run(text, opts = {}) {
  const sz = opts.sz || "24";
  const bold = opts.bold ? "<w:b />" : "";
  const italic = opts.italic ? "<w:i />" : "";
  return `<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman" />${bold}${italic}<w:sz w:val="${sz}" /><w:szCs w:val="${sz}" /></w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;
}

function para(text, opts = {}) {
  return `<w:p>${pPr(opts)}${text ? run(text, opts) : ""}</w:p>`;
}

function bulletPara(text) {
  // Match reference: "•   text" in Times New Roman ~11-12pt (sz 22-24)
  return para(`•   ${text}`, { sz: "22", bold: false });
}

function headingPara(text) {
  return para(text, { sz: "24", bold: true });
}

function plainPara(text) {
  return para(text, { sz: "24", bold: false });
}

function setParagraphText(paraXml, text, opts = {}) {
  const pPrMatch = paraXml.match(/<w:pPr>[\s\S]*?<\/w:pPr>/);
  const existingPPr = pPrMatch ? pPrMatch[0] : "";
  const open = paraXml.match(/^<w:p\b[^>]*>/)[0];
  const sz = opts.sz || "24";
  const bold = opts.bold ? "<w:b />" : "";
  const r = `<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman" />${bold}<w:sz w:val="${sz}" /><w:szCs w:val="${sz}" /></w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;
  return `${open}${existingPPr}${r}</w:p>`;
}

function appendRun(paraXml, text, opts = {}) {
  const sz = opts.sz || "24";
  const bold = opts.bold ? "<w:b />" : "";
  const r = `<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman" />${bold}<w:sz w:val="${sz}" /><w:szCs w:val="${sz}" /></w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;
  return paraXml.replace(/<\/w:p>$/, `${r}</w:p>`);
}

function blocksToParas(blocks) {
  const out = [];
  for (const b of blocks) {
    if (b.type === "blank") out.push(para("", { sz: "24" }));
    else if (b.type === "heading") out.push(headingPara(b.text));
    else if (b.type === "bullet") out.push(bulletPara(b.text));
    else out.push(plainPara(b.text));
  }
  return out;
}

function editDocumentXml(xml, member) {
  const paraRe = /<w:p\b[^>]*>[\s\S]*?<\/w:p>/g;
  const paras = xml.match(paraRe);
  if (!paras || paras.length < 36) {
    throw new Error("bad para count " + (paras && paras.length));
  }

  // Title + supervisor (template labels kept)
  paras[4] = setParagraphText(paras[4], TITLE, { bold: true, sz: "24" });
  paras[5] = appendRun(paras[5], `  ${SUPERVISOR}`, { bold: true, sz: "24" });

  // Build progress body like Numan reference
  const progressParas = blocksToParas(member.blocks);

  // Indices 7..19 are blank progress slots (13). Replace + insert extras before remarks (20).
  const before = paras.slice(0, 7);
  const after = paras.slice(20); // Supervisor's Remarks onward

  // Student's signature block like reference: single member name — roll
  // after[0] = Supervisor's Remarks
  // Find Std lines in after: originally paras 32 and 35
  // after index: 32-20=12 is Std.1/2, 35-20=15 is Std.3
  const rebuiltAfter = after.slice();
  // Keep "Student's Signature (For online submission...)" label
  // Replace Std.1/Std.2 line with member signature style from reference
  if (rebuiltAfter[12]) {
    rebuiltAfter[12] = setParagraphText(
      rebuiltAfter[12],
      `${member.name}  —  ${member.roll}`,
      { sz: "24" },
    );
  }
  // Clear Std.3 placeholder line (one-member report, like reference)
  if (rebuiltAfter[15]) {
    rebuiltAfter[15] = setParagraphText(rebuiltAfter[15], "", { sz: "24" });
  }

  // Also tweak the "Student's Signature..." label line if present (after[10])
  // Leave template wording; reference uses "Student's Signature."

  const all = before.concat(progressParas, rebuiltAfter);
  let idx = 0;
  // Replace ONLY existing paragraph count first — if we inserted extras, need different strategy
  // Safer: splice XML between Current Progress para and Supervisor's Remarks para by string markers
  return rebuildXmlByMarkers(xml, progressParas, member);
}

function rebuildXmlByMarkers(xml, progressParasXml, member) {
  // Fill title / supervisor on matched paragraphs first via simple replace of empty title para after Project Title
  const paraRe = /<w:p\b[^>]*>[\s\S]*?<\/w:p>/g;
  const paras = xml.match(paraRe);
  paras[4] = setParagraphText(paras[4], TITLE, { bold: true, sz: "24" });
  paras[5] = appendRun(paras[5], `  ${SUPERVISOR}`, { bold: true, sz: "24" });

  // Signature lines
  paras[32] = setParagraphText(
    paras[32],
    `${member.name}  —  ${member.roll}`,
    { sz: "24" },
  );
  paras[35] = setParagraphText(paras[35], "", { sz: "24" });

  // Replace paras 7..19 with our progress content (may be longer — insert)
  const head = paras.slice(0, 7);
  const tail = paras.slice(20);
  // Adjust signature indices in tail: paras 32 and 35 already edited in `paras`, so use those
  const newList = head.concat(progressParasXml, tail.map((_, i) => paras[20 + i]));

  let i = 0;
  let out = xml.replace(paraRe, () => {
    if (i < newList.length) return newList[i++];
    return ""; // drop any leftover if mismatch
  });
  // If we inserted more paras than original, the replace consumed only original count.
  // Append remaining newList items before sectPr / body end.
  if (i < newList.length) {
    const leftover = newList.slice(i).join("");
    out = out.replace(/<\/w:body>/, `${leftover}</w:body>`);
  }
  return out;
}

function fillHeaderDate(headerXml, date) {
  // Append date after "Date:"
  if (headerXml.includes(">Date:</w:t>")) {
    return headerXml.replace(
      ">Date:</w:t>",
      `>Date:</w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">   ${esc(date)}</w:t>`,
    );
  }
  // template has Date: inside a preserve text with spaces
  return headerXml.replace(
    /Date:<\/w:t>/,
    `Date:   ${esc(date)}</w:t>`,
  );
}

function buildWithDotNet(member) {
  const outPath = path.join(OUT_DIR, member.file);
  const ps1 = path.join(OUT_DIR, `_build_${member.pct}_${member.roll}.ps1`);
  const editedXmlPath = path.join(OUT_DIR, `_document_${member.roll}.xml`);
  const editedHdrPath = path.join(OUT_DIR, `_header_${member.roll}.xml`);

  const extractDir = fs.mkdtempSync(path.join(os.tmpdir(), "fypex_"));
  execFileSync("tar", ["-xf", TEMPLATE, "-C", extractDir]);
  const docPath = path.join(extractDir, "word", "document.xml");
  const hdrPath = path.join(extractDir, "word", "header1.xml");
  const xml = fs.readFileSync(docPath, "utf8");
  const hdr = fs.readFileSync(hdrPath, "utf8");

  const progressParas = blocksToParas(member.blocks);
  const edited = rebuildXmlByMarkers(xml, progressParas, member);
  const editedHdr = fillHeaderDate(hdr, DATE);

  fs.writeFileSync(editedXmlPath, edited, "utf8");
  fs.writeFileSync(editedHdrPath, editedHdr, "utf8");
  fs.rmSync(extractDir, { recursive: true, force: true });

  const ps = `
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$template = '${TEMPLATE.replace(/\\/g, "\\\\")}'
$outPath = '${outPath.replace(/\\/g, "\\\\")}'
$editedXml = '${editedXmlPath.replace(/\\/g, "\\\\")}'
$editedHdr = '${editedHdrPath.replace(/\\/g, "\\\\")}'
$work = Join-Path $env:TEMP ('fypzip_' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $work | Out-Null
$u = Join-Path $work 'u'
[System.IO.Compression.ZipFile]::ExtractToDirectory($template, $u)
Copy-Item -LiteralPath $editedXml -Destination (Join-Path $u 'word\\document.xml') -Force
Copy-Item -LiteralPath $editedHdr -Destination (Join-Path $u 'word\\header1.xml') -Force
if (Test-Path -LiteralPath $outPath) { Remove-Item -LiteralPath $outPath -Force }
$zip = [System.IO.Compression.ZipFile]::Open($outPath, 'Create')
function Add-Dir($dir, $prefix) {
  foreach ($item in Get-ChildItem -LiteralPath $dir -Force) {
    $name = if ($prefix) { "$prefix/$($item.Name)" } else { $item.Name }
    if ($item.PSIsContainer) { Add-Dir $item.FullName $name }
    else {
      [void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $item.FullName, $name.Replace('\\','/'), [System.IO.Compression.CompressionLevel]::Optimal)
    }
  }
}
$ct = Join-Path $u '[Content_Types].xml'
[void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $ct, '[Content_Types].xml', [System.IO.Compression.CompressionLevel]::Optimal)
foreach ($item in Get-ChildItem -LiteralPath $u -Force) {
  if ($item.Name -eq '[Content_Types].xml') { continue }
  if ($item.PSIsContainer) { Add-Dir $item.FullName $item.Name }
  else {
    [void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $item.FullName, $item.Name, [System.IO.Compression.CompressionLevel]::Optimal)
  }
}
$zip.Dispose()
Remove-Item -LiteralPath $work -Recurse -Force
Write-Host "BUILT $outPath size=$((Get-Item -LiteralPath $outPath).Length)"
`;

  fs.writeFileSync(ps1, ps, "utf8");
  execFileSync(
    "powershell",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", ps1],
    { stdio: "inherit" },
  );
  fs.unlinkSync(ps1);
  fs.unlinkSync(editedXmlPath);
  fs.unlinkSync(editedHdrPath);

  fs.copyFileSync(outPath, path.join(FYP_DIR, member.file));
  console.log("OK", member.file, member.pct + "%");
}

fs.mkdirSync(OUT_DIR, { recursive: true });
let sum = 0;
for (const m of members) {
  buildWithDotNet(m);
  sum += m.pct;
}
console.log("TOTAL", sum + "%");
