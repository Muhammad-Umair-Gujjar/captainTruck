/**
 * Captain Truck — Chapter 1 Feasibility Report (NeoTeach-style formatting)
 * Output: D:\BSSE\Captain_Truck_Chapter1_Feasibility_Report.docx
 */
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, BorderStyle, WidthType, AlignmentType, Header, Footer,
  PageNumber, ShadingType, ImageRun, PageBreak, VerticalAlign,
  NumberFormat, PositionalTab, PositionalTabAlignment, PositionalTabLeader, PositionalTabRelativeTo,
} = require("docx");

const FIG = path.join("D:", "vally", "captain_truck", "docs", "figures");
const OUT = "D:\\BSSE\\Captain_Truck_Chapter1_Feasibility_Report.docx";

const PAGE_W = 11906;
const MARGIN = 1008; // 0.7"
const CONTENT_W = PAGE_W - MARGIN * 2;
const FONT = "Times New Roman";

const thin = { style: BorderStyle.SINGLE, size: 8, color: "000000" };
const borders = { top: thin, bottom: thin, left: thin, right: thin };
const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

function run(text, o = {}) {
  return new TextRun({
    text: text ?? "",
    font: FONT,
    size: o.size ?? 24, // 12pt
    bold: !!o.bold,
    italics: !!o.italics,
    color: o.color,
  });
}

function p(text, o = {}) {
  const parts = Array.isArray(text) ? text : [run(String(text ?? ""), o)];
  return new Paragraph({
    spacing: { after: o.after ?? 160, before: o.before ?? 0, line: o.line ?? 276 },
    alignment: o.align ?? AlignmentType.JUSTIFIED,
    indent: o.indent,
    children: parts,
  });
}

function rich(segments, o = {}) {
  return new Paragraph({
    spacing: { after: o.after ?? 160, before: o.before ?? 0, line: 276 },
    alignment: o.align ?? AlignmentType.JUSTIFIED,
    children: segments.map((s) =>
      typeof s === "string" ? run(s) : run(s.text, s)
    ),
  });
}

function hChapter(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 0, after: 280 },
    alignment: AlignmentType.CENTER,
    children: [run(text, { bold: true, size: 32 })],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 140 },
    alignment: AlignmentType.LEFT,
    children: [run(text, { bold: true, size: 26 })],
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 220, after: 120 },
    alignment: AlignmentType.LEFT,
    children: [run(text, { bold: true, size: 24 })],
  });
}

function caption(text) {
  return new Paragraph({
    spacing: { before: 120, after: 200 },
    alignment: AlignmentType.CENTER,
    children: [run(text, { bold: true, size: 22, italics: true })],
  });
}

function spacer(after = 120) {
  return new Paragraph({ spacing: { after }, children: [] });
}

function bullet(text) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { after: 80, line: 276 },
    alignment: AlignmentType.JUSTIFIED,
    children: [run(text, { size: 24 })],
  });
}

function cell(text, width, o = {}) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: o.header ? { type: ShadingType.CLEAR, fill: "D9D9D9" } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 40, bottom: 40, left: 60, right: 60 },
    children: [
      new Paragraph({
        spacing: { after: 0, before: 0, line: 240 },
        alignment: o.align ?? AlignmentType.LEFT,
        children: [run(String(text ?? ""), { size: o.size ?? 18, bold: !!o.header || !!o.bold })],
      }),
    ],
  });
}

function table(headers, rows, colWidths) {
  const w = colWidths || headers.map(() => Math.floor(CONTENT_W / headers.length));
  const sum = w.reduce((a, b) => a + b, 0);
  if (sum !== CONTENT_W) w[w.length - 1] += CONTENT_W - sum;
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: w,
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map((h, i) => cell(h, w[i], { header: true, align: AlignmentType.CENTER })),
      }),
      ...rows.map(
        (r) =>
          new TableRow({
            children: r.map((c, i) =>
              cell(c, w[i], typeof c === "object" && c !== null && c.__cell ? c : {})
            ),
          })
      ),
    ],
  });
}

function simpleTable(rows, colWidths) {
  const w = colWidths;
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: w,
    rows: rows.map(
      (r, ri) =>
        new TableRow({
          children: r.map((c, i) =>
            cell(c, w[i], { header: ri === 0, bold: ri === 0 || i === 0 })
          ),
        })
    ),
  });
}

function image(file, widthPx, captionText) {
  const buf = fs.readFileSync(path.join(FIG, file));
  const width = Math.min(widthPx, 620);
  const aspect = 0.55;
  const children = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 160, after: 80 },
      children: [
        new ImageRun({
          type: "png",
          data: buf,
          transformation: { width, height: Math.round(width * (file.includes("Gantt") ? 0.72 : file.includes("1_3") ? 0.75 : 0.38)) },
          altText: { title: captionText, description: captionText, name: file },
        }),
      ],
    }),
    caption(captionText),
  ];
  return children;
}

function formula(text) {
  return new Paragraph({
    spacing: { before: 100, after: 100 },
    alignment: AlignmentType.CENTER,
    children: [run(text, { italics: true, size: 22 })],
  });
}

function verdict(text) {
  return rich([{ text: "Verdict: ", bold: true }, { text }], { after: 180 });
}

const titleChildren = [];
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
  // NeoTeach footer: Department / \u00A9 University of Gujrat / page number
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
children.push(hChapter("Chapter 1: Project Feasibility Report"));

children.push(
  h2("1.1. Introduction"),
  p("Road freight in Pakistan is large but highly fragmented: most operators own only a few trucks, and shippers still depend on informal brokers for load matching, pricing and cash settlement. Customers lack a single place to request a truck, compare routes, see a clear trip cost and track the vehicle live. Drivers lack a reliable assignment and navigation workflow. Administrators have no central panel for approve/reject decisions, driver–truck assignment, live GPS oversight, chat moderation, cash confirmation and commission reconciliation."),
  rich([
    { text: "Captain Truck", bold: true },
    { text: " is a comprehensive real-time logistics and dispatch platform with four surfaces: a Flutter Customer app (Android), a Flutter Driver app (Android), a React Admin web panel (Vite + Tailwind, hosted on Vercel), and a shared NestJS API (TypeScript) on an Oracle Cloud Always Free VM. Customers create dispatch requests with pickup/drop, truck type and count; the server offers 2–3 OSM route options with on-device AI trip-cost estimates; an administrator reviews, approves or rejects, and assigns a driver and truck; the trip is tracked over Socket.IO GPS; customer and driver chat (text, image, voice) with Smart Reply on mobile and 90-day auto-delete; payment is Cash-on-Pickup or Stripe Test Mode; and a commission ledger records what each driver owes the platform." },
  ]),
  p("Data lives in PostgreSQL (Neon free tier), with Redis for live location and locks, Cloudinary for media, FCM for push, and OpenStreetMap services (Nominatim, Photon, OSRM) for maps and routing — all chosen to keep FYP cash spend near zero."),
  p("This chapter assesses whether the project is feasible, fixes its scope, estimates its cost and schedule, and introduces the team, tools, vision, risks and product features. Development follows the Waterfall Model: work proceeds in sequential phases — planning and proposal, requirements, system design, implementation (front-end, database, then core modules and AI), integration, testing and debugging, optimization, and final product delivery — with university milestones (proposal defense, progress report, Deliverable 1, internal defense) placed on that linear plan.")
);

// 1.2
children.push(
  h2("1.2. Project/Product Feasibility Report"),
  p("When an organization or individual initiates a new project, one of the first steps is to determine its feasibility — whether the idea is practical, achievable, and worth pursuing. Following the supervisor’s sample feasibility-study format, each area below states an Assessment and Findings. Captain Truck was assessed for technical, operational, economic, schedule, specification, information, motivational, and legal and ethical feasibility."),
  p("There are many types of feasibilities:", { after: 80 }),
  ...["Technical", "Operational", "Economic", "Schedule", "Specification", "Information", "Motivational", "Legal and Ethical"].map(bullet)
);

children.push(
  h3("1.2.1. Technical Feasibility"),
  rich([{ text: "Assessment: ", bold: true }, { text: "The technical feasibility study evaluates whether the team has the necessary skills and resources to develop Captain Truck. The project will use Flutter (Dart) for the Customer and Driver Android apps, React with Vite and Tailwind for the Admin dashboard, NestJS with TypeScript for the backend API, PostgreSQL (Neon) with Prisma for persistence, Socket.IO for realtime GPS and chat, Redis for live location/coordination, OpenStreetMap services (Nominatim, Photon, OSRM) for maps and routing, Cloudinary for media, FCM for push, and Cash-on-Pickup plus Stripe Test Mode for payments. On-device TFLite trip-cost estimation and ML Kit Smart Reply avoid a paid cloud generative-AI dependency. The API is hosted on an Oracle Cloud Always Free VM." }]),
  rich([{ text: "Findings: ", bold: true }, { text: "The development team is proficient in NestJS/TypeScript, React and Flutter fundamentals from coursework and prior practice, and the locked stack matches those skills. Gaps remain around production hardening of public OSRM/Nominatim rate limits, free-tier Neon sleep behaviour, offline map tile licensing, and TFLite model training/evaluation as a process separate from on-device inference. To address these gaps, the team will use documented timeouts and graceful fallbacks for OSM, connection pooling for Neon, a tile provider whose terms permit intended caching, supervisor reviews of AI evaluation limits, and free-tier Stripe Test Mode only (no live production payment claim). Overall, the required technologies are available and the residual skill/risk gaps are manageable within an FYP." }]),
  verdict("Technically feasible."),
  caption("Table 1.1: Technical requirements and availability"),
  table(
    ["Need", "Technology", "Availability"],
    [
      ["Customer & Driver mobile apps", "Flutter (Dart), Android only", "Stable; team builds Flutter screens"],
      ["Admin web panel", "React 19 + Vite + Tailwind → Vercel", "Stable; free hosting"],
      ["API / business logic", "NestJS + TypeScript", "Stable; REST + OpenAPI/Swagger"],
      ["Realtime GPS & chat", "Socket.IO (/realtime)", "Mature; JWT on handshake"],
      ["Relational database", "PostgreSQL on Neon (Prisma)", "Managed free tier; pooled connections"],
      ["Cache / live location", "Redis (Upstash or Oracle VM)", "Free tier; in-memory fallback for demos"],
      ["Authentication", "Custom JWT + refresh tokens", "Standard; argon2/bcrypt hashing"],
      ["Push notifications", "FCM only", "Free for Android"],
      ["Media (chat)", "Cloudinary", "Free tier; signed uploads"],
      ["Maps & routing", "OSM: Nominatim, Photon, OSRM", "Public services; rate-limit etiquette"],
      ["On-device AI", "TFLite + ML Kit Smart Reply", "On-device; no paid AI API"],
      ["Payments", "Cash-on-Pickup + Stripe Test Mode", "Test keys free; no live charges"],
      ["API host", "Oracle Always Free + Nginx + PM2", "Free always-on VM"],
    ],
    [2800, 3600, CONTENT_W - 6400]
  )
);

children.push(
  h3("1.2.2. Operational Feasibility"),
  rich([{ text: "Assessment: ", bold: true }, { text: "This feasibility study examines how Captain Truck will fit into existing shipper, driver and admin workflows and whether users will be able to adapt to the new system. Today, booking and dispatch are often handled through calls, messaging apps and paper notes. The new platform provides a Customer app for requests, routes, fare proposals and tracking; a Driver app for willingness, assignment, status, GPS and cash confirmation; and a browser Admin dashboard for approvals, assignment and reconciliation." }]),
  rich([{ text: "Findings: ", bold: true }, { text: "The system is expected to streamline dispatch coordination, route/fare agreement, live tracking and commission reconciliation. However, some users are accustomed to informal broker/WhatsApp habits and may resist moving approvals and cash confirmation into the app. To facilitate adoption, the team keeps admin-mediated assignment (no automatic matching), plans demo-oriented training/walkthroughs for the three roles, and gathers supervisor and peer feedback during development so usability concerns can be incorporated before final delivery." }]),
  verdict("Operationally feasible.")
);

children.push(
  h3("1.2.3. Economic Feasibility"),
  rich([{ text: "Assessment: ", bold: true }, { text: "The economic feasibility analysis focuses on the cost of developing Captain Truck versus the expected benefits. This includes estimated development effort/cost at market rates, ongoing free-tier cloud maintenance, and productivity/transparency gains from digitised dispatch." }]),
  rich([{ text: "Findings: ", bold: true }, { text: "Function Point Analysis (Section 1.4.1) values development effort at 26.09 person-months, or PKR 2,348,190 at a junior market labour rate. For an FYP this labour is contributed by the student team, so cash spend is limited to a Google Play developer account, internet, electricity and printing, while Neon, Redis/Upstash, Cloudinary, Vercel, Oracle Always Free, FCM and Stripe Test Mode stay on free tiers. Benefits include clearer route/cost options, admin-mediated assignment quality, dual cash/online payment records, and less lost commission reconciliation — plus intangible skill gains for the team. Given near-zero cash outlay against these benefits, the project is economically feasible within the FYP budget." }]),
  verdict("Economically feasible.")
);

children.push(
  h3("1.2.4. Schedule Feasibility"),
  rich([{ text: "Assessment: ", bold: true }, { text: "The schedule feasibility study evaluates whether Captain Truck can be completed within the academic timeframe. The planned calendar runs from 3 September 2026 to 16 April 2027 (226 days on the Waterfall Gantt in Section 1.7), covering planning, proposal, requirements, design, implementation, integration, testing, optimization and final delivery, with university milestones on the same linear plan." }]),
  rich([{ text: "Findings: ", bold: true }, { text: "The timeline is demanding because of multi-client surfaces (two Flutter apps, Admin, NestJS API), OSM routing, AI fare proposal, willingness/assignment, offline maps, chat/media, and dual payment/ledger behaviour. To manage this, the team follows the instructor-required Waterfall sequence with gated phases rather than open-ended feature growth, places proposal defense, progress report, Deliverable 1 and internal defense on the Gantt, and keeps exclusions explicit (no live Stripe production claim, no auto-matching, no bilty suite). The CPM critical path (Section 1.6) shows that delaying critical activities delays final delivery, so milestone buffers and weekly supervisor checkpoints are used to keep the plan achievable." }]),
  verdict("Feasible within the academic calendar.")
);

children.push(
  h3("1.2.5. Specification Feasibility"),
  rich([{ text: "Assessment: ", bold: true }, { text: "Specification feasibility checks whether requirements are clear, complete enough to build, and bounded so the team is not pulled into unbounded scope." }]),
  rich([{ text: "Findings: ", bold: true }, { text: "Behaviour is fixed by the updated FYP proposal (15 modules), the locked product stack, and backend/admin phase plans. Boundaries are explicit: no iOS-first commitment, no live Stripe production charges, no automated bidding/matching, no IoT trackers/NADRA, no GraphQL, no full bilty/consignment suite, and Flutter apps live in separate repositories from this API/admin monorepo. Remaining open items (exact offline tile provider licence, AI training pipeline documentation) are recorded as implementation tasks rather than undefined product scope." }]),
  verdict("Requirements are clear and bounded.")
);

children.push(
  h3("1.2.6. Information Feasibility"),
  rich([{ text: "Assessment: ", bold: true }, { text: "Information feasibility examines whether the data needed to operate Captain Truck can be obtained, stored and trusted." }]),
  rich([{ text: "Findings: ", bold: true }, { text: "Pickup/drop coordinates and addresses come from the customer (with OSM geocode helpers). Route distance/duration/polylines come from OSRM. AI trip cost is computed on-device and validated server-side; the customer proposal is checked against the admin-configured band; the server bill remains authoritative. User, dispatch, trip, chat, payment and commission records sit in PostgreSQL with defined keys and constraints. Live GPS is held in Redis with last-known timestamps. AI costs are labelled as estimates. Where public OSM data is incomplete, pin override and fallback messaging keep the request flow usable." }]),
  verdict("Information is available and reliable.")
);

children.push(
  h3("1.2.7. Motivational Feasibility"),
  rich([{ text: "Assessment: ", bold: true }, { text: "Motivational feasibility asks whether the team and target users have enough reason to build and adopt the system." }]),
  rich([{ text: "Findings: ", bold: true }, { text: "The team is building a real multi-client logistics product with industry-relevant NestJS, Flutter, React and realtime skills under supervisor guidance. Customers gain transparent route/cost options and live tracking; drivers gain structured assignments and offline-aware maps; administrators replace phone/WhatsApp coordination with one panel. Regular reviews and milestone demos keep progress steady." }]),
  verdict("All stakeholders are motivated to use the system.")
);

children.push(
  h3("1.2.8. Legal & Ethical Feasibility"),
  rich([{ text: "Assessment: ", bold: true }, { text: "Legal and ethical feasibility checks privacy, payment handling, licences and fair use of location/chat data under applicable Pakistani and platform rules." }]),
  rich([{ text: "Findings: ", bold: true }, { text: "Personal data is handled in line with Pakistan’s Prevention of Electronic Crimes Act 2016 and good practice for location/chat data. Stripe card details are entered on Stripe’s hosted Checkout / Elements; Captain Truck never stores raw card numbers. Cash flows are confirmed by drivers and visible to admins without storing unnecessary payment secrets. Permissions (location, microphone, notifications, storage for media) are requested only when needed, as Play Store policies require. NestJS, React, Flutter and packages used are open source; OSM services and offline tiles follow provider policies; Stripe and Cloudinary are used under Test Mode / free-tier terms. The admin remains in the assignment loop; chat older than 90 days is auto-deleted; abuse reporting is supported." }]),
  verdict("No infringement or liability is expected.")
);

// 1.3
children.push(
  h2("1.3. Project/Product Scope"),
  p("Scope lists what is inside the system boundary; anything outside it is treated as a change request."),
  caption("Table 1.2: Captain Truck project scope"),
  table(
    ["Component", "Description"],
    [
      ["Objective", "Real-time logistics platform: Customer & Driver Android apps, Admin web panel, NestJS API for admin-mediated truck assignment, OSM routing, AI cost, GPS, chat, cash/Stripe payment and commission ledger."],
      ["Core features", "JWT RBAC; truck types & rates; dispatch; 2–3 OSM routes + AI cost; admin approve/reject/assign; trips + Socket.IO GPS; chat + Smart Reply + 90-day TTL; Cash + Stripe Test; commission ledger; FCM; React Admin."],
      ["Deliverables", "NestJS API + React Admin (this repo); Flutter Customer & Driver apps (separate repos); documentation and tests."],
      ["Stakeholders", "Customers (shippers), drivers, administrators, supervisor, project team."],
      ["Timeline", "3 September 2026 to 16 April 2027 (Waterfall; 226 calendar days)."],
      ["Process model", "Waterfall Model (sequential phases with gated milestones)."],
      ["Exclusions", "iOS apps; live Stripe production; automated bidding/matching; IoT/NADRA; GraphQL; fleet ownership; ISO 27001."],
      ["Optional units", "Advanced analytics; multi-driver beyond lead-driver policy; production Stripe go-live."],
    ],
    [2400, CONTENT_W - 2400]
  )
);

// 1.4 Costing
children.push(
  h2("1.4. Project/Product Costing"),
  p("We estimated cost with three main methods — Function Point Analysis, COCOMO II and Activity Based Costing — and then cross-checked the effort with the LOC-oriented and FP-oriented empirical models taught in SPM Lecture 6. All amounts are in Pakistani rupees (PKR) and effort is in person-months (PM). Intermediate values are rounded to four decimal places, effort and schedule to two, and each cost is worked out from the rounded effort and rounded to the nearest rupee.")
);

children.push(
  h3("1.4.1. Project Cost Estimation by Function Point Analysis"),
  p("Function points measure the functionality delivered to users. Five information domain values are counted and weighted; every item was rated at average complexity."),
  caption("Table 1.3: Unadjusted function point count"),
  table(
    ["Domain value", "Items (summary)", "Count", "Weight", "Total"],
    [
      ["External Inputs (EI)", "Login; dispatch; route; assign; GPS; chat; pay; cash confirm; rates; commission", "10", "4", "40"],
      ["External Outputs (EO)", "GPS status; bill; push; routes+AI; payment confirm; commission summary", "6", "5", "30"],
      ["External Inquiries (EQ)", "My dispatches; types/rates; track; chat; assignments; admin queue; payment status", "7", "4", "28"],
      ["Internal Logical Files (ILF)", "Users; drivers; truck_types/rates; dispatches; routes; trips; chats; payments; ledger", "9", "10", "90"],
      ["External Interface Files (EIF)", "OSRM/Nominatim/Photon; Stripe Test; Cloudinary; FCM; Redis", "5", "7", "35"],
      ["Count total", "", "", "", "223"],
    ],
    [2200, 4200, 1000, 1000, CONTENT_W - 8400]
  ),
  caption("Table 1.4: Value adjustment factors (0 = no influence, 5 = essential)"),
  table(
    ["#", "General system characteristic", "Fi", "Reason"],
    [
      ["1", "Data communications", "5", "REST, Socket.IO, OSM, FCM, Stripe, Cloudinary"],
      ["2", "Distributed data processing", "5", "Customer, Driver, Admin, NestJS, Neon, Redis"],
      ["3", "Performance", "4", "Live GPS/chat must feel immediate"],
      ["4", "Heavily used configuration", "2", "Ordinary phones and browsers"],
      ["5", "Transaction rate", "3", "Moderate: dispatches, GPS, chats, payments"],
      ["6", "On-line data entry", "4", "Almost all data entered on-line"],
      ["7", "End-user efficiency", "4", "Routes, AI cost, Smart Reply, admin queue"],
      ["8", "On-line update", "5", "Live location, status, chat, ledger"],
      ["9", "Complex processing", "4", "Routing, pricing, commission, realtime authz"],
      ["10", "Reusability", "3", "One API shared by three clients"],
      ["11", "Installation ease", "3", "Play Store apps; browser Admin"],
      ["12", "Operational ease", "4", "Push alerts, admin ops, reconnect"],
      ["13", "Multiple sites", "2", "One product; no multi-site rollout"],
      ["14", "Facilitate change", "4", "Rates/types managed from Admin"],
      ["", "Σ Fi", "52", ""],
    ],
    [700, 3200, 800, CONTENT_W - 4700]
  ),
  formula("FP_est = Count Total × [0.65 + 0.01 × Σ(Fi)]"),
  formula("FP_est = 223 × [0.65 + 0.01 × 52] = 223 × 1.17 = 260.91"),
  p("We used a labour rate of PKR 90,000 per person-month and a productivity of 10 FP per person-month."),
  formula("Cost / FP = 90,000 / 10 = PKR 9,000"),
  formula("Total Project Cost = 260.91 × 9,000 = PKR 2,348,190"),
  formula("Total Estimated Effort = 260.91 / 10 = 26.09 person-months"),
  rich([{ text: "Result: ", bold: true }, { text: "260.91 FP, 26.09 person-months, PKR 2,348,190. Shared by three members, this is about 8.7 months each, which fits the academic window with parallel work inside each Waterfall phase." }])
);

children.push(
  h3("1.4.2. Project Cost Estimation by using COCOMO II (Constructive Cost Model)"),
  p("COCOMO II is the version taught in Lecture 6 and allows for reuse and modern tools. Table 1.5 shows why the Early Design model was selected."),
  caption("Table 1.5: Choice of COCOMO II submodel"),
  table(
    ["Submodel", "Stage", "Decision"],
    [
      ["Application Composition", "Early prototyping", "Not used — object counts not recorded"],
      ["Early Design", "Requirements + basic architecture", "Selected — 10.4364 KLOC; nominal factors"],
      ["Post-Architecture", "Detailed design/construction", "Not used yet — full EM ratings not measured"],
    ],
    [2800, 3200, CONTENT_W - 6000]
  ),
  p("Size was derived from function points at 40 LOC per FP. With all scale factors and effort multipliers at Nominal (Σ SF = 18.96, ∏ EM = 1.00):"),
  formula("KLOC = 260.91 × 40 / 1000 = 10.4364"),
  formula("E = 0.91 + 0.01 × 18.96 = 1.0996"),
  formula("PM = 2.94 × (10.4364)^1.0996 = 38.76 person-months"),
  formula("TDEV = 3.67 × (38.76)^0.3179 = 11.74 months"),
  formula("People = PM / TDEV = 38.76 / 11.74 ≈ 3"),
  rich([{ text: "Result: ", bold: true }, { text: "COCOMO II Early Design (nominal): 10.4364 KLOC, 38.76 person-months, PKR 3,488,400, 11.74 months, about 3 people." }])
);

children.push(
  h3("1.4.3. Activity Based Costing"),
  p("Each activity is costed from its resources, cost rate, duration and overhead. Weekly rate ≈ PKR 20,769 per person-week (90,000 × 12 / 52)."),
  caption("Table 1.6: Activity based costing"),
  table(
    ["Activity", "People", "Weeks", "Labour", "Overhead", "Cost"],
    [
      ["Planning + proposal (A–C)", "3", "5", "311,535", "6,000", "317,535"],
      ["Proposal defense + requirements", "3", "4", "249,228", "—", "249,228"],
      ["System design", "2", "2", "83,076", "—", "83,076"],
      ["Front-end + database design", "2", "6", "249,228", "7,000", "256,228"],
      ["D1 + internal defense", "3", "3", "186,921", "—", "186,921"],
      ["Development phase (core + AI)", "3", "10", "623,070", "—", "623,070"],
      ["Integration + testing", "3", "4", "249,228", "—", "249,228"],
      ["Optimization + final delivery", "2", "6", "249,228", "8,000", "257,228"],
      ["Shared overhead", "—", "—", "—", "115,500", "115,500"],
      ["Total", "", "", "2,201,514", "136,500", "2,338,014"],
    ],
    [3200, 1000, 1000, 1600, 1400, CONTENT_W - 8200]
  ),
  p("Cash the team actually spends is essentially the overhead: PKR 136,500 (Google Play, internet, electricity, printing). Free-tier cloud services are PKR 0.")
);

children.push(
  h3("1.4.4. LOC-Oriented Estimation Models"),
  caption("Table 1.7: LOC-oriented estimates (KLOC = 10.4364)"),
  table(
    ["Model", "Equation", "Effort (PM)", "Applicability"],
    [
      ["Walston–Felix", "E = 5.2 × (KLOC)^0.91", "(43.94)", "Not fully applicable; not costed"],
      ["Bailey–Basili", "E = 5.5 + 0.73 × (KLOC)^1.16", "16.59", "Applicable; PKR 1,493,100"],
      ["Boehm simple", "E = 3.2 × (KLOC)^1.05", "37.55", "Applicable; PKR 3,379,500"],
      ["Doty", "E = 5.288 × (KLOC)^1.047", "61.62", "Applicable (KLOC > 9); PKR 5,545,800"],
    ],
    [2200, 3800, 1400, CONTENT_W - 7400]
  )
);

children.push(
  h3("1.4.5. Function Point-Oriented Estimation Models"),
  caption("Table 1.8: FP-oriented estimates (FP = 260.91)"),
  table(
    ["Model", "Equation", "Effort (PM)", "Applicability"],
    [
      ["Albrecht and Gaffney", "E = −91.4 + 0.355 FP", "1.22", "Unrealistically low — not used"],
      ["Kemerer", "E = −37 + 0.96 FP", "(213.47)", "Overestimates small projects; not costed"],
      ["Small project regression", "E = −12.88 + 0.405 FP", "92.79", "Upper bound; PKR 8,351,100"],
    ],
    [2600, 3400, 1400, CONTENT_W - 7400]
  )
);

children.push(
  h3("1.4.6. Comparative Analysis of Estimation Results"),
  caption("Table 1.9: Comparison of estimates"),
  table(
    ["Model", "Effort (PM)", "Labour cost (PKR)", "Status"],
    [
      ["Function Point Analysis", "26.09", "2,348,190", "Applicable — planning baseline"],
      ["COCOMO II Early Design", "38.76", "3,488,400", "Applicable — cross-check"],
      ["Bailey–Basili", "16.59", "1,493,100", "Applicable — uncalibrated"],
      ["Boehm simple", "37.55", "3,379,500", "Applicable — uncalibrated"],
      ["Doty", "61.62", "5,545,800", "Applicable upper bound"],
      ["Small project regression", "92.79", "8,351,100", "Applicable upper bound"],
      ["Activity Based Costing", "—", "2,338,014", "Applicable; cash overhead 136,500"],
    ],
    [3200, 1600, 2200, CONTENT_W - 7000]
  ),
  p("FPA (PKR 2,348,190) stays the planning baseline; COCOMO II is the cross-check. Doty and the small-project regression are upper bounds and are not used for budgeting.")
);

// 1.5
children.push(
  h2("1.5. Task Dependency Table"),
  p("Tasks follow the Waterfall Gantt (Section 1.7). Durations below are the summary-phase durations used for CPM."),
  caption("Table 1.10: Task Dependency table"),
  table(
    ["Task Id", "Task Name"],
    [
      ["T1", "Planning"], ["T2", "Proposal Writing"], ["T3", "Proposal Submission"],
      ["T4", "Proposal Defense"], ["T5", "Requirements"], ["T6", "System Design"],
      ["T7", "Front-End Development"], ["T8", "Progress Report Submission"], ["T9", "Database Design"],
      ["T10", "Deliverable 1 Submission"], ["T11", "Internal Defense"], ["T12", "Development Phase (Modules, AI)"],
      ["T13", "Integration"], ["T14", "Testing and Debugging"], ["T15", "Optimization"],
      ["T16", "Final Product Delivery"],
    ],
    [2400, CONTENT_W - 2400]
  )
);

// 1.6 CPM
children.push(
  h2("1.6. CPM — Critical Path Method"),
  p("In 1957, DuPont developed a project management method designed to address the challenge of shutting down chemical plants for maintenance and then restarting the plants once the maintenance had been completed."),
  p("CPM provides the following benefits:", { after: 80 }),
  bullet("Provides a graphical view of the project."),
  bullet("Predicts the time required to complete the project."),
  p("CPM models the activities and events of a project as a network. Activities are depicted as nodes on the network and events that signify the beginning or ending of activities are depicted as arcs or lines between the nodes."),
  p("Steps in CPM Project Planning:", { bold: true, after: 80 }),
  ...[
    "Specify the individual activities.",
    "Determine the sequence of those activities.",
    "Draw a network diagram.",
    "Estimate the completion time for each activity.",
    "Identify the critical path (longest path through the network).",
    "Update the CPM diagram as the project progresses.",
  ].map((t, i) => p(`${i + 1}. ${t}`, { after: 60, align: AlignmentType.LEFT }))
);

children.push(
  h3("1. Specify the Individual Activities"),
  caption("Table 1.6.1: Task Dependency table"),
  table(
    ["Task Id", "Task Name"],
    [
      ["T1", "Planning"], ["T2", "Proposal Writing"], ["T3", "Proposal Submission"],
      ["T4", "Proposal Defense"], ["T5", "Requirements"], ["T6", "System Design"],
      ["T7", "Front-End Development"], ["T8", "Progress Report Submission"], ["T9", "Database Design"],
      ["T10", "Deliverable 1 Submission"], ["T11", "Internal Defense"], ["T12", "Development Phase (Modules, AI)"],
      ["T13", "Integration"], ["T14", "Testing and Debugging"], ["T15", "Optimization"],
      ["T16", "Final Product Delivery"],
    ],
    [2400, CONTENT_W - 2400]
  )
);

children.push(
  h3("2. Determine the Sequence of the Activities"),
  caption("Table 1.6.2: Sequence of the activities"),
  table(
    ["Activity", "Predecessor", "Duration in Days"],
    [
      ["T1", "None", "12"], ["T2", "T1", "9"], ["T3", "T2", "4"], ["T4", "T3", "11"],
      ["T5", "T4", "12"], ["T6", "T5", "12"], ["T7", "T6", "19"], ["T8", "T7", "2"],
      ["T9", "T6", "20"], ["T10", "T8, T9", "2"], ["T11", "T10", "11"], ["T12", "T11", "45"],
      ["T13", "T12", "13"], ["T14", "T13", "13"], ["T15", "T14", "13"], ["T16", "T15", "11"],
    ],
    [2400, 3600, CONTENT_W - 6000]
  ),
  p("T7 Front-End and T9 Database Design both start after System Design (NeoTeach-style branch). Deliverable 1 waits on both the progress-report path and database design.")
);

children.push(
  h3("3. Draw the Network Diagram"),
  p("CPM originally was developed as an activity-on-node (AON) network. Captain Truck uses an activity-on-node diagram in the same style as the NeoTeach sample SRS."),
  ...image("Figure_1_6_1_Network_Diagram.png", 620, "Figure 1.6.1: Network Diagram of Captain Truck System")
);

children.push(
  h3("4. Estimate Activity Completion Time"),
  p("The time required to complete each activity can be estimated using experience or the estimates of knowledgeable people. Earliest start/finish (ES, EF), latest start/finish (LS, LF) and total slack (TS = LS − ES) are shown below. Activities with zero slack lie on the critical path. T10 cannot start until both T8 and T9 finish."),
  caption("Table 1.6.3: Estimation of Activity Completion Time (CPM)"),
  table(
    ["Activity", "Dur.", "ES", "EF", "LS", "LF", "TS", "Critical"],
    [
      ["T1", "12", "0", "12", "0", "12", "0", "Yes"],
      ["T2", "9", "12", "21", "12", "21", "0", "Yes"],
      ["T3", "4", "21", "25", "21", "25", "0", "Yes"],
      ["T4", "11", "25", "36", "25", "36", "0", "Yes"],
      ["T5", "12", "36", "48", "36", "48", "0", "Yes"],
      ["T6", "12", "48", "60", "48", "60", "0", "Yes"],
      ["T7", "19", "60", "79", "60", "79", "0", "Yes"],
      ["T8", "2", "79", "81", "79", "81", "0", "Yes"],
      ["T9", "20", "60", "80", "61", "81", "1", "No"],
      ["T10", "2", "81", "83", "81", "83", "0", "Yes"],
      ["T11", "11", "83", "94", "83", "94", "0", "Yes"],
      ["T12", "45", "94", "139", "94", "139", "0", "Yes"],
      ["T13", "13", "139", "152", "139", "152", "0", "Yes"],
      ["T14", "13", "152", "165", "152", "165", "0", "Yes"],
      ["T15", "13", "165", "178", "165", "178", "0", "Yes"],
      ["T16", "11", "178", "189", "178", "189", "0", "Yes"],
    ],
    [1400, 900, 900, 900, 900, 900, 900, CONTENT_W - 6800]
  )
);

children.push(
  h3("5. Identify the Critical Path"),
  p("The critical path is the longest-duration path through the network. The significance of the critical path is that the activities that lie in it cannot be delayed without delaying the project."),
  p("By making the network diagram of Captain Truck, there are two possible paths:"),
  rich([{ text: "Path#01: ", bold: true }, { text: "T1 → T2 → T3 → T4 → T5 → T6 → T9 → T10 → T11 → T12 → T13 → T14 → T15 → T16" }]),
  p("Duration: 12 + 9 + 4 + 11 + 12 + 12 + 20 + 2 + 11 + 45 + 13 + 13 + 13 + 11 = 188 Days."),
  rich([{ text: "Path#02: ", bold: true }, { text: "T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8 → T10 → T11 → T12 → T13 → T14 → T15 → T16" }]),
  p("Duration: 12 + 9 + 4 + 11 + 12 + 12 + 19 + 2 + 2 + 11 + 45 + 13 + 13 + 13 + 11 = 189 Days."),
  rich([{ text: "Conclusion: ", bold: true }, { text: "We choose Path#02 because it is the longer path; any delay on Path#02 activities delays final delivery. Database Design (T9) has 1 day of total slack. The calendar span on the approved Gantt is 226 days (03-09-2026 to 16-04-2027) because weekends and milestone gaps sit between bars; CPM uses contiguous activity durations in the NeoTeach style." }])
);

children.push(
  h3("6. Update CPM Diagram"),
  p("As the project progresses, the actual task completion times will be known, and the network diagram can be updated to include this information. A new critical path may emerge, and structural changes may be made in the network if project requirements change."),
  ...image("Figure_1_6_2_Updated_Network_CPM.png", 620, "Figure 1.6.2: Updated Network/CPM Diagram"),
  p("Updated CPM Path Duration (Path#02): 189 Days.")
);

// 1.7 Gantt
children.push(
  h2("1.7. Gantt Chart"),
  p("The Gantt chart follows the Waterfall Model. Phases are sequential from planning through final product delivery. University milestones and member assignments (Umair, Shahzaib, Ali) are shown on the same timeline."),
  ...image("Figure_1_7_1_Gantt_Chart.png", 620, "Figure 1.7.1: Gantt Chart"),
  caption("Table 1.12: Waterfall phase plan and milestones"),
  table(
    ["Phase", "Content", "Calendar"],
    [
      ["Planning", "Project scope; feasibility and work plan", "03-09-2026 – 14-09-2026"],
      ["Proposal Writing", "Problem statement; proposal draft", "16-09-2026 – 24-09-2026"],
      ["Proposal Submission", "Compile and submit proposal", "25-09-2026 – 28-09-2026"],
      ["Proposal Defense", "Defense slides; proposal defense", "29-09-2026 – 09-10-2026"],
      ["Requirements", "Requirement gathering; SRS", "12-10-2026 – 23-10-2026"],
      ["System Design", "Architecture design; UI/UX design", "26-10-2026 – 06-11-2026"],
      ["Front-End Development", "Mobile app screens; Admin panel screens", "09-11-2026 – 27-11-2026"],
      ["Progress Report", "Compile and submit progress report", "01-12-2026 – 02-12-2026"],
      ["Database Design", "Schema design; migrations and seed", "03-12-2026 – 22-12-2026"],
      ["Deliverable 1", "Package and submit Deliverable 1", "23-12-2026 – 24-12-2026"],
      ["Internal Defense", "Defense material; internal defense", "29-12-2026 – 08-01-2027"],
      ["Development Phase", "Core modules; AI model; Admin operations", "12-01-2027 – 25-02-2027"],
      ["Integration", "API integration; client integration", "26-02-2027 – 10-03-2027"],
      ["Testing and Debugging", "System testing; bug fixing", "11-03-2027 – 23-03-2027"],
      ["Optimization", "Performance tuning; UI polish", "24-03-2027 – 05-04-2027"],
      ["Final Product Delivery", "Final documentation; deployment and handover", "06-04-2027 – 16-04-2027"],
    ],
    [2600, 4000, CONTENT_W - 6600]
  ),
  p("Project summary: Start 03-09-2026 · Finish 16-04-2027 · Duration 226 days · Resources Umair, Shahzaib, Ali.")
);

// 1.8–1.13
children.push(
  h2("1.8. Introduction to Team Members and their Skill Set"),
  p("The Captain Truck team has three members (University of Gujrat), supervised by Mr. Touqeer Ul Ameen."),
  caption("Table 1.8.1: Team Members & their Skills"),
  table(
    ["Name of Member", "Role", "Skillset"],
    [
      ["Muhammad Umair\n23011598-062", "Team lead; NestJS API, realtime, payments, commission", "TypeScript, NestJS, Prisma/PostgreSQL, Socket.IO, JWT, Stripe Test, Redis, Git, Oracle/PM2"],
      ["Muhammad Ali\n23011598-063", "Flutter Customer & Driver apps; maps & on-device AI", "Flutter/Dart, flutter_map, TFLite, ML Kit Smart Reply, FCM, Android builds"],
      ["Muhammad Shahzaib\n23011598-109", "React Admin Panel; documentation; testing", "React + Vite + Tailwind, Leaflet/OSM, technical writing, e2e testing, Vercel"],
    ],
    [2600, 3200, CONTENT_W - 5800]
  ),
  p("Each module has a primary owner and a second member who reviews it, so no part of the system depends on one person.")
);

children.push(
  h2("1.9. Task and Member Assignment Table"),
  caption("Table 1.9.1: Task & Member Assignment Table"),
  table(
    ["ID", "Task", "Days", "Assigned To"],
    [
      ["T1", "Planning", "12", "Umair, Shahzaib"],
      ["T2", "Proposal Writing", "9", "Umair, Shahzaib"],
      ["T3", "Proposal Submission", "4", "Shahzaib, Umair"],
      ["T4", "Proposal Defense", "11", "Shahzaib, Umair"],
      ["T5", "Requirements", "12", "Ali, Shahzaib"],
      ["T6", "System Design", "12", "Umair, Shahzaib"],
      ["T7", "Front-End Development", "19", "Ali, Shahzaib"],
      ["T8", "Progress Report Submission", "2", "Shahzaib, Umair"],
      ["T9", "Database Design", "20", "Umair"],
      ["T10", "Deliverable 1 Submission", "2", "Shahzaib, Umair"],
      ["T11", "Internal Defense", "11", "Shahzaib, Umair"],
      ["T12", "Development Phase (Modules, AI)", "45", "Umair, Ali, Shahzaib"],
      ["T13", "Integration", "13", "Umair, Ali"],
      ["T14", "Testing and Debugging", "13", "Shahzaib, Umair"],
      ["T15", "Optimization", "13", "Umair, Ali"],
      ["T16", "Final Product Delivery", "11", "Shahzaib, Umair"],
    ],
    [1000, 4200, 1200, CONTENT_W - 6400]
  )
);

children.push(
  h2("1.10. Tools and Technology with Reasoning"),
  caption("Table 1.15: Technologies"),
  table(
    ["Technology", "Purpose and Reasoning"],
    [
      ["NestJS + TypeScript", "Typed, modular API; OpenAPI; Controller → Service → Prisma layering"],
      ["PostgreSQL (Neon) + Prisma", "Relational integrity; migrations; money as integer cents; free managed DB"],
      ["Socket.IO", "Authenticated realtime GPS and chat"],
      ["Redis", "Live location, locks; free tier"],
      ["Flutter (Dart), Android", "Customer and Driver apps; flutter_map matches OSM"],
      ["React + Vite + Tailwind", "Admin panel; fast Vercel deploy"],
      ["OSM (Nominatim, Photon, OSRM)", "Free routing/geocoding; up to 3 route alternatives"],
      ["TFLite + ML Kit Smart Reply", "On-device AI cost and replies; no paid cloud AI"],
      ["Cloudinary", "Chat media on free tier; signed uploads"],
      ["FCM", "Android push only (not full Firebase BaaS)"],
      ["Cash + Stripe Test Mode", "Dual payment; no live charges required for FYP"],
      ["Oracle Always Free + Nginx + PM2", "Always-on API host; avoids serverless cold starts"],
      ["Vercel", "Free Admin hosting"],
    ],
    [3600, CONTENT_W - 3600]
  ),
  caption("Table 1.16: Tools"),
  table(
    ["Tool", "Reason"],
    [
      ["VS Code / Android Studio", "Development, emulators and debugging"],
      ["Git / GitHub", "Version control and collaboration"],
      ["Prisma Studio / Neon Console", "Inspect schema and data"],
      ["Swagger UI (/api/docs)", "Contract for Flutter teams"],
      ["Figma", "UI/UX mockups"],
      ["Draw.io / Mermaid", "UML, CPM, Gantt and decomposition diagrams"],
      ["Postman / REST Client", "API smoke tests"],
      ["Microsoft Word", "Documentation"],
    ],
    [3600, CONTENT_W - 3600]
  )
);

children.push(
  h2("1.11. Vision Document"),
  caption("Table 1.17: Problem statement"),
  simpleTable(
    [
      ["Field", "Statement"],
      ["The problem of", "fragmented truck dispatch, opaque pricing, weak live tracking and manual cash/commission settlement"],
      ["affects", "shippers (customers), small truck drivers and the administrators who coordinate them"],
      ["the impact of which is", "broker dependence, empty or poorly matched trips, unclear bills, lost cash reconciliation and low trust"],
      ["a successful solution would", "let customers request trucks with clear OSM routes and AI costs, keep an admin in the assignment loop, track trips live, support chat and dual payment, and maintain a commission ledger in one platform"],
    ],
    [2800, CONTENT_W - 2800]
  ),
  spacer(120),
  p("Product position. For shippers and small fleet drivers in Pakistan who need trustworthy, admin-mediated dispatch with transparent cost and live tracking, Captain Truck is a real-time logistics platform that combines Customer/Driver Android apps, a React Admin panel and a NestJS API. Unlike informal broker WhatsApp workflows or pure load boards without human assignment control, it offers OSM multi-route choice, on-device AI trip cost, Socket.IO GPS, chat with retention policy, Cash-on-Pickup and Stripe Test Mode, and an auditable commission ledger — built entirely on free-tier infrastructure suitable for an FYP."),
  caption("Table 1.18: Stakeholders and needs"),
  table(
    ["Stakeholder", "Key needs"],
    [
      ["Customer (shipper)", "Create dispatch, choose route/cost, pay or choose cash, live track, chat"],
      ["Driver", "See assignments, update GPS/status, chat, confirm cash collected"],
      ["Administrator", "Pending queue, approve/reject/assign, live map, users, rates, commissions"],
      ["Supervisor / university", "Working system and complete documentation on time"],
    ],
    [3200, CONTENT_W - 3200]
  ),
  p("Constraints: Android-only mobile clients; FYP budget ≈ $0 beyond Play account and utilities; free-tier cloud only; delivery within one academic year; admin-mediated assignment (no automated bidding); Waterfall process as required by the instructor.")
);

children.push(
  h2("1.12. Risk List"),
  p("Probability (P) and impact (I) are rated 1–5; the list is sorted by exposure (P × I) and reviewed after each Waterfall phase gate."),
  caption("Table 1.19: Risk list"),
  table(
    ["#", "Risk", "P", "I", "P×I", "Mitigation"],
    [
      ["R1", "Public OSRM/Nominatim downtime or high latency", "4", "4", "16", "Timeouts; fallbacks; pin override; cache"],
      ["R2", "Scope creep across API + two apps + Admin", "4", "4", "16", "Frozen scope; exclusions; phase exit checks"],
      ["R3", "Neon free-tier cold start / connection limits", "3", "4", "12", "Pooled URL; retry; health checks"],
      ["R4", "Realtime GPS abuse or unauthorized room join", "3", "5", "15", "JWT handshake; trip-room authz; throttle"],
      ["R5", "Stripe Test / webhook ordering failures", "3", "4", "12", "Signature verify; idempotency; cash path"],
      ["R6", "Chat media or PII misuse", "2", "5", "10", "Host allowlist; participants only; 90-day TTL"],
      ["R7", "Unauthorized cross-role access (IDOR)", "2", "5", "10", "Role guards + ownership checks"],
      ["R8", "Team member unavailable during exams", "3", "3", "9", "Second owner per module"],
      ["R9", "On-device AI cost outliers vs distance", "3", "3", "9", "Server clamps; locked base rate"],
      ["R10", "Late defect discovery (Waterfall)", "3", "4", "12", "Design reviews; unit tests; test phase"],
    ],
    [700, 3400, 600, 600, 700, CONTENT_W - 6000]
  )
);

children.push(
  h2("1.13. Product Features / Product Decomposition"),
  p("Captain Truck is decomposed into nine modules. Under the Waterfall plan, modules are specified in requirements/design, built mainly in the implementation phases, then integrated and tested."),
  ...image("Figure_1_3_Product_Decomposition.png", 580, "Figure 1.13.1: Product Decomposition of Captain Truck"),
  caption("Module summary (maps to Waterfall phases)"),
  table(
    ["Modules", "Main Waterfall phase", "Focus"],
    [
      ["1–2", "Requirements → Design → Implementation", "Auth + dispatch foundation"],
      ["3–4", "Implementation (core)", "Routes/AI cost + admin assignment"],
      ["5–7", "Implementation (core)", "GPS, chat, payments"],
      ["8–9", "Implementation + Integration", "Commission + Admin/FCM"],
      ["All", "Testing → Optimization → Delivery", "Verify, harden, release"],
    ],
    [1600, 4200, CONTENT_W - 5800]
  ),
  spacer(200),
  p("— End of Chapter 1: Project Feasibility Report —", { align: AlignmentType.CENTER, bold: true })
);

const pageProps = {
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

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(OUT, buf);
  // Also place a copy next to the blank template purpose
  const copy = "D:\\BSSE\\FYP_Documentation_Chapter1_Filled.docx";
  fs.writeFileSync(copy, buf);
  console.log("Wrote", OUT, buf.length);
  console.log("Wrote", copy, buf.length);
}).catch((e) => {
  console.error(e);
  process.exit(1);
});
