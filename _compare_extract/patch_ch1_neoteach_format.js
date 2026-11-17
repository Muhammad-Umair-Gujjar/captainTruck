/**
 * Patch build_chapter1_docx.js structure into 3-section NeoTeach page format,
 * then rebuild the .docx.
 *
 * Section 1 — Title: no header, no page number
 * Section 2 — Front matter: no header; footer NeoTeach; lower-roman pages
 * Section 3 — Chapter 1+: no header; footer NeoTeach; Arabic pages from 1
 */
const fs = require("fs");
const path = require("path");

const srcPath = path.join(__dirname, "build_chapter1_docx.js");
let src = fs.readFileSync(srcPath, "utf8").replace(/\r\n/g, "\n");

// Ensure imports include NumberFormat + PositionalTab
if (!src.includes("NumberFormat")) {
  src = src.replace(
    "PageNumber, ShadingType, ImageRun, PageBreak, VerticalAlign,",
    "PageNumber, ShadingType, ImageRun, PageBreak, VerticalAlign,\n  NumberFormat, PositionalTab, PositionalTabAlignment, PositionalTabLeader, PositionalTabRelativeTo,"
  );
}

// Replace cover→TOC block with title/front matter split markers
const oldFrontStart = "const children = [];";
const oldFrontEnd = `// ========== CHAPTER 1 BODY ==========
children.push(hChapter("Chapter 1: Project Feasibility Report"));`;

const newFront = `const titleChildren = [];
const frontChildren = [];
const children = []; // chapter body (section 3)

function tocLine(label, page, opts = {}) {
  return new Paragraph({
    spacing: { after: 60, before: opts.before ?? 0, line: 276 },
    indent: opts.indent ? { left: opts.indent } : undefined,
    children: [
      run(label, { size: opts.size ?? 22, bold: !!opts.bold }),
      new TextRun({
        children: [
          new PositionalTab({
            alignment: PositionalTabAlignment.RIGHT,
            relativeTo: PositionalTabRelativeTo.MARGIN,
            leader: PositionalTabLeader.DOT,
          }),
        ],
        font: FONT,
        size: opts.size ?? 22,
      }),
      run(String(page), { size: opts.size ?? 22 }),
    ],
  });
}

function neoFooter(fmt) {
  // NeoTeach footer: Department / © University of Gujrat / page number
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 0 },
        children: [run("Department of Software Engineering", { size: 18 })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 40 },
        children: [run("\u00A9 University of Gujrat", { size: 18 })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            children: [PageNumber.CURRENT],
            font: FONT,
            size: 20,
          }),
        ],
      }),
    ],
  });
}

// ========== COVER (Section 1 — no page number) ==========
titleChildren.push(
  spacer(200),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
    children: [run("Department of Software Engineering", { bold: true, size: 28 })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 280 },
    children: [run("University of Gujrat", { bold: true, size: 26 })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 120 },
    children: [run("CAPTAIN TRUCK", { bold: true, size: 44 })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 320 },
    children: [run("Real-Time Logistics and Dispatch Platform", { italics: true, size: 24 })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 60 },
    children: [run("Session: BSSE-2023-2027", { size: 24 })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 240 },
    children: [run("Project Advisor: Mr. Touqeer Ul Ameen", { size: 24 })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 120 },
    children: [run("Submitted By", { bold: true, size: 24 })],
  }),
  table(
    ["Student Name", "Roll No."],
    [
      ["Muhammad Umair", "23011598-062"],
      ["Muhammad Ali", "23011598-063"],
      ["Muhammad Shahzaib", "23011598-109"],
    ],
    [Math.floor(CONTENT_W * 0.55), Math.ceil(CONTENT_W * 0.45)]
  )
);

// ========== FRONT MATTER (Section 2 — Roman) ==========
frontChildren.push(
  hChapter("STATEMENT OF SUBMISSION"),
  p("This is certified that Muhammad Umair Roll No. 23011598-062, Muhammad Ali Roll No. 23011598-063 and Muhammad Shahzaib Roll No. 23011598-109 has successfully completed the final year project named as Captain Truck at the Department of Software Engineering, University of Gujrat, to fulfill the requirement of the degree of Bachelor’s in Software Engineering."),
  spacer(400),
  new Paragraph({
    spacing: { after: 40 },
    children: [run("______________________                    _____________________", { size: 22 })],
  }),
  new Paragraph({
    spacing: { after: 200 },
    children: [run("Project Supervisor                              Project Coordination Office", { size: 20 })],
  }),
  new Paragraph({
    spacing: { after: 200 },
    children: [run("                                                          Faculty of C&IT -UOG", { size: 20 })],
  }),
  new Paragraph({
    spacing: { after: 40 },
    children: [run("______________________", { size: 22 })],
  }),
  new Paragraph({
    spacing: { after: 200 },
    children: [run("Head of the Department", { size: 20 })],
  }),
  new Paragraph({ children: [new PageBreak()] })
);

frontChildren.push(
  hChapter("Acknowledgement"),
  p("We truly acknowledge the cooperation and help made by Mr. Touqeer Ul Ameen, Department of Software Engineering, University of Gujrat. He has been a constant source of guidance throughout the course of this project. We would also like to thank our project advisor for his help and guidance throughout this project. We are also thankful to our friends and families whose silent support led us to complete our project."),
  p("Date: 17th November 2026."),
  new Paragraph({ children: [new PageBreak()] })
);

frontChildren.push(
  hChapter("Abstract"),
  p("Truck-based logistics in Pakistan often depends on fragmented coordination among customers, drivers and administrators through calls, messages and paper records. Captain Truck is a comprehensive real-time logistics and dispatch platform that connects a Flutter Customer Android app, a Flutter Driver Android app and a React Admin dashboard to a NestJS API and PostgreSQL database. The platform supports OpenStreetMap-based route comparison, on-device AI-assisted fare estimation with customer proposals within an administrator-configured band, admin-mediated driver willingness and assignment, Socket.IO GPS tracking with offline-aware driver maps, in-app chat with media upload, FCM notifications, Cash-on-Pickup and Stripe Test Mode payments, and an auditable commission ledger. Built on free-tier infrastructure suitable for an FYP, Captain Truck aims to deliver a controlled end-to-end dispatch workflow from booking through trip completion and financial reconciliation."),
  new Paragraph({ children: [new PageBreak()] })
);

// NeoTeach-style TOC (dot leaders). Page numbers for Ch1 body are Arabic; front-matter refs use Roman.
frontChildren.push(
  hChapter("TABLE OF CONTENTS"),
  tocLine("ACKNOWLEDGEMENT", "iii", { bold: true }),
  tocLine("ABSTRACT", "iv", { bold: true, before: 40 }),
  tocLine("CHAPTER 1: PROJECT FEASIBILITY REPORT", "1", { bold: true, before: 120 }),
  tocLine("1.1. INTRODUCTION", "2"),
  tocLine("1.2. PROJECT/PRODUCT FEASIBILITY REPORT", "2"),
  tocLine("1.2.1. Technical Feasibility", "3", { indent: 360 }),
  tocLine("1.2.2. Operational Feasibility", "3", { indent: 360 }),
  tocLine("1.2.3. Economic Feasibility", "4", { indent: 360 }),
  tocLine("1.2.4. Schedule Feasibility", "4", { indent: 360 }),
  tocLine("1.2.5. Specification Feasibility", "5", { indent: 360 }),
  tocLine("1.2.6. Information Feasibility", "5", { indent: 360 }),
  tocLine("1.2.7. Motivational Feasibility", "5", { indent: 360 }),
  tocLine("1.2.8. Legal & Ethical Feasibility", "5", { indent: 360 }),
  tocLine("1.3. PROJECT/PRODUCT SCOPE", "6"),
  tocLine("1.4. PROJECT/PRODUCT COSTING", "6"),
  tocLine("1.4.1. Project Cost Estimation by Function Point Analysis", "6", { indent: 360 }),
  tocLine("1.4.2. Project Cost Estimation by using COCOMO II (Constructive Cost Model)", "8", { indent: 360 }),
  tocLine("1.4.3. Activity Based Costing", "9", { indent: 360 }),
  tocLine("1.4.4. LOC-Oriented Estimation Models", "9", { indent: 360 }),
  tocLine("1.4.5. Function Point-Oriented Estimation Models", "10", { indent: 360 }),
  tocLine("1.4.6. Comparative Analysis of Estimation Results", "10", { indent: 360 }),
  tocLine("1.5. TASK DEPENDENCY TABLE", "10"),
  tocLine("1.6. CPM - CRITICAL PATH METHOD", "11"),
  tocLine("1.7. GANTT CHART", "14"),
  tocLine("1.8. INTRODUCTION TO TEAM MEMBERS AND THEIR SKILL SET", "15"),
  tocLine("1.9. TASK AND MEMBER ASSIGNMENT TABLE", "15"),
  tocLine("1.10. TOOLS AND TECHNOLOGY WITH REASONING", "16"),
  tocLine("1.11. VISION DOCUMENT", "16"),
  tocLine("1.12. RISK LIST", "17"),
  tocLine("1.13. PRODUCT FEATURES/ PRODUCT DECOMPOSITION", "17"),
  tocLine("CHAPTER 2: SOFTWARE REQUIREMENT SPECIFICATION (FOR OBJECT ORIENTED APPROACH)", "—", { bold: true, before: 120 }),
  tocLine("2.1 INTRODUCTION:", "—"),
  tocLine("2.1.1 Systems Specifications", "—", { indent: 360 }),
  tocLine("2.1.2. Identifying External Entities", "—", { indent: 360 }),
  tocLine("2.1.3. Context Level Data Flow Diagram:", "—", { indent: 360 }),
  tocLine('2.1.4. Capture "shall" Statements:', "—", { indent: 360 }),
  tocLine("2.1.5. Allocate Requirements:", "—", { indent: 360 }),
  tocLine("2.1.6. Prioritize Requirements:", "—", { indent: 360 }),
  tocLine("2.1.7. Requirements Trace-ability Matrix:", "—", { indent: 360 }),
  tocLine("2.2.10. High Level Usecase Diagram:", "—"),
  tocLine("2.2.11. Analysis Level Usecase Diagram:", "—"),
  tocLine("2.2.12. Usecase Description", "—"),
  tocLine("CHAPTER 3: DESIGN DOCUMENT (FOR OBJECT ORIENTED APPROACH)", "—", { bold: true, before: 120 }),
  tocLine("3.1. INTRODUCTION:", "—"),
  tocLine("3.2. DOMAIN MODEL", "—"),
  tocLine("3.3. SYSTEM SEQUENCE DIAGRAM", "—"),
  tocLine("3.4. SEQUENCE DIAGRAM", "—"),
  tocLine("3.5. COLLABORATION DIAGRAM", "—"),
  tocLine("3.6. OPERATION CONTRACTS", "—"),
  tocLine("3.7. DESIGN CLASS DIAGRAM", "—"),
  tocLine("3.8. STATE CHART DIAGRAM", "—"),
  tocLine("3.9. DATA MODEL", "—"),
  tocLine("CHAPTER 4: USER INTERFACE DESIGN", "—", { bold: true, before: 120 }),
  tocLine("4.1. INTRODUCTION", "—"),
  tocLine("4.2. SITE MAPS", "—"),
  tocLine("4.2.1. Customer Site Map", "—", { indent: 360 }),
  tocLine("4.2.2. Driver Site Map", "—", { indent: 360 }),
  tocLine("4.2.3. Admin Site Map", "—", { indent: 360 }),
  tocLine("4.2.4. Site Map Diagram of Captain Truck", "—", { indent: 360 }),
  tocLine("4.3. STORY BOARDS", "—"),
  tocLine("4.4. NAVIGATIONAL MAPS:", "—"),
  tocLine("4.4.1. Login & Registration Flow", "—", { indent: 360 }),
  tocLine("4.4.2. Customer Navigation Flow", "—", { indent: 360 }),
  tocLine("4.4.3. Driver Navigation Flow", "—", { indent: 360 }),
  tocLine("4.4.4. Admin Navigation Flow", "—", { indent: 360 }),
  tocLine("4.4.5: Navigational Map Diagram", "—", { indent: 360 }),
  tocLine("4.5 TRACE-ABILITY MATRIX", "—"),
  tocLine("CHAPTER 5: SOFTWARE TESTING", "—", { bold: true, before: 120 }),
  tocLine("5.1 INTRODUCTION:", "—"),
  tocLine("5.2. TEST PLAN", "—"),
  tocLine("5.3. TEST DESIGN SPECIFICATION", "—"),
  tocLine("5.4. TEST CASE SPECIFICATION", "—"),
  tocLine("5.5. TEST PROCEDURE SPECIFICATION", "—"),
  tocLine("5.6. TEST ITEM TRANSMITTAL REPORT", "—"),
  tocLine("5.7. TEST LOG", "—"),
  tocLine("5.8. TEST INCIDENT REPORT", "—"),
  tocLine("5.9. TEST SUMMARY REPORT", "—"),
  tocLine("CHAPTER 6: USER TECHNICAL MANUAL", "—", { bold: true, before: 120 }),
  tocLine("6.1 GENERAL INFORMATION", "—"),
  tocLine("6.1.1 System Overview", "—", { indent: 360 }),
  tocLine("6.2. SYSTEM SUMMARY", "—"),
  tocLine("6.3. LOGGING ON", "—"),
  tocLine("6.3.1 System Menu", "—", { indent: 360 }),
  tocLine("6.3.2 Changing User ID and Password", "—", { indent: 360 }),
  tocLine("6.3.3 Exit System", "—", { indent: 360 }),
  tocLine("6.4. USING THE SYSTEM", "—"),
  tocLine("6.4.1 Special Instructions for Error Correction", "—", { indent: 360 }),
  tocLine("6.4.2 Caveats and Exceptions", "—", { indent: 360 })
);

// ========== CHAPTER 1 BODY ==========
children.push(hChapter("Chapter 1: Project Feasibility Report"));`;

const startIdx = src.indexOf(oldFrontStart);
const endIdx = src.indexOf(oldFrontEnd);
if (startIdx < 0 || endIdx < 0) {
  console.error("Could not find front-matter markers", { startIdx, endIdx });
  process.exit(1);
}
src = src.slice(0, startIdx) + newFront + src.slice(endIdx + oldFrontEnd.length);

// Replace Document construction (sections/headers/footers)
const docStart = src.indexOf("const doc = new Document({");
if (docStart < 0) {
  console.error("Could not find Document constructor");
  process.exit(1);
}
const afterDoc = src.slice(docStart);
const packerIdx = afterDoc.indexOf("Packer.toBuffer");
if (packerIdx < 0) {
  console.error("Could not find Packer.toBuffer");
  process.exit(1);
}

const newDoc = `const pageProps = {
  size: { width: PAGE_W, height: 16838 },
  margin: { top: MARGIN, right: MARGIN, bottom: 1200, left: MARGIN },
};

const doc = new Document({
  styles: {
    default: {
      document: {
        styles: [
          {
            id: "Normal",
            run: { font: FONT, size: 24 },
          },
        ],
      },
    },
    paragraphStyles: [
      {
        id: "Heading1",
        name: "Heading 1",
        basedOn: "Normal",
        next: "Normal",
        quickStyle: true,
        paragraph: { spacing: { before: 240, after: 200 }, outlineLevel: 0, keepNext: true },
        run: { font: FONT, size: 32, bold: true },
      },
      {
        id: "Heading2",
        name: "Heading 2",
        basedOn: "Normal",
        next: "Normal",
        quickStyle: true,
        paragraph: { spacing: { before: 280, after: 140 }, outlineLevel: 1, keepNext: true },
        run: { font: FONT, size: 26, bold: true },
      },
      {
        id: "Heading3",
        name: "Heading 3",
        basedOn: "Normal",
        next: "Normal",
        quickStyle: true,
        paragraph: { spacing: { before: 220, after: 120 }, outlineLevel: 2, keepNext: true },
        run: { font: FONT, size: 24, bold: true },
      },
    ],
  },
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [
          {
            level: 0,
            format: "bullet",
            text: "•",
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          },
        ],
      },
    ],
  },
  sections: [
    // ---- TITLE PAGE: no header, no page number ----
    {
      properties: {
        page: {
          ...pageProps,
          pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL },
        },
      },
      headers: {
        default: new Header({ children: [new Paragraph({ children: [] })] }),
      },
      footers: {
        default: new Footer({ children: [new Paragraph({ children: [] })] }),
      },
      children: titleChildren,
    },
    // ---- FRONT MATTER: NeoTeach footer + Roman numerals ----
    {
      properties: {
        page: {
          ...pageProps,
          pageNumbers: { start: 1, formatType: NumberFormat.LOWER_ROMAN },
        },
      },
      headers: {
        default: new Header({ children: [new Paragraph({ children: [] })] }),
      },
      footers: {
        default: neoFooter("roman"),
      },
      children: frontChildren,
    },
    // ---- CHAPTER 1: NeoTeach footer + Arabic from 1 ----
    {
      properties: {
        page: {
          ...pageProps,
          pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL },
        },
      },
      headers: {
        default: new Header({ children: [new Paragraph({ children: [] })] }),
      },
      footers: {
        default: neoFooter("arabic"),
      },
      children,
    },
  ],
});

`;

src = src.slice(0, docStart) + newDoc + afterDoc.slice(packerIdx);

const outPath = path.join(__dirname, "build_chapter1_docx_neoteach.js");
fs.writeFileSync(outPath, src);
console.log("Wrote patched builder", outPath);
