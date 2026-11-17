/**
 * Blank FYP documentation shell: NeoTeach headings + empty templates only.
 * Output: D:\BSSE\FYP_Documentation_Headings_Template.docx
 */
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, BorderStyle, WidthType, AlignmentType, Header, Footer,
  PageNumber, ShadingType } = require('docx');
const fs = require('fs');

const PAGE_W = 11906; // A4
const MARGIN = 1080;
const CONTENT_W = PAGE_W - MARGIN * 2;

const thin = { style: BorderStyle.SINGLE, size: 8, color: "000000" };
const borders = { top: thin, bottom: thin, left: thin, right: thin };
const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

function p(text, opts = {}) {
  return new Paragraph({
    spacing: { after: opts.after ?? 120, before: opts.before ?? 0 },
    alignment: opts.align,
    children: [new TextRun({ text, font: "Times New Roman", size: opts.size ?? 22, bold: opts.bold, italics: opts.italics })],
  });
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 200 },
    children: [new TextRun({ text, font: "Times New Roman", size: 28, bold: true })],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 140 },
    children: [new TextRun({ text, font: "Times New Roman", size: 24, bold: true })],
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 100 },
    children: [new TextRun({ text, font: "Times New Roman", size: 22, bold: true })],
  });
}

function placeholder(note = "[Insert content here]") {
  return new Paragraph({
    spacing: { after: 160 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "AAAAAA", space: 1 } },
    children: [new TextRun({ text: note, font: "Times New Roman", size: 20, italics: true, color: "666666" })],
  });
}

function figPlaceholder(label) {
  return new Paragraph({
    spacing: { before: 120, after: 200 },
    alignment: AlignmentType.CENTER,
    border: { top: thin, bottom: thin, left: thin, right: thin },
    children: [new TextRun({ text: `[Insert diagram: ${label}]`, font: "Times New Roman", size: 20, italics: true })],
  });
}

function cell(text, width, opts = {}) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: opts.header ? { type: ShadingType.CLEAR, fill: "E8E8E8" } : undefined,
    children: [new Paragraph({
      spacing: { before: 40, after: 40 },
      children: [new TextRun({ text, font: "Times New Roman", size: 18, bold: !!opts.header })],
    })],
  });
}

function blankTable(headers, rows, colWidths) {
  const headerRow = new TableRow({
    children: headers.map((h, i) => cell(h, colWidths[i], { header: true })),
  });
  const body = [];
  for (let r = 0; r < rows; r++) {
    body.push(new TableRow({
      children: colWidths.map((w) => cell("", w)),
    }));
  }
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [headerRow, ...body],
  });
}

function useCaseTemplate(title) {
  const w = [2400, CONTENT_W - 2400];
  const rows = [
    ["Use-case Name:", ""],
    ["Use-case ID:", ""],
    ["Actor:", ""],
    ["Created By:", ""],
    ["Date:", ""],
    ["Description:", ""],
  ].map(([k, v]) => new TableRow({
    children: [cell(k, w[0], { header: true }), cell(v, w[1])],
  }));

  return [
    h3(title),
    new Table({ width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: w, rows }),
    p("Pre-Condition:", { bold: true, before: 160 }),
    placeholder("• [Condition 1]"),
    placeholder("• [Condition 2]"),
    p("Basic Flow:", { bold: true, before: 120 }),
    blankTable(["User", "System"], 4, [Math.floor(CONTENT_W / 2), Math.ceil(CONTENT_W / 2)]),
    p("Alternative Flow:", { bold: true, before: 160 }),
    placeholder("A1 – [Describe alternative]"),
    p("Post-Condition:", { bold: true, before: 120 }),
    placeholder("• [Post-condition 1]"),
    placeholder("• [Post-condition 2]"),
  ];
}

const children = [];

// ---- Cover ----
children.push(
  p("Department of Software Engineering", { align: AlignmentType.CENTER, size: 28, bold: true, after: 80 }),
  p("University of Gujrat", { align: AlignmentType.CENTER, size: 26, after: 200 }),
  p("[PROJECT TITLE]", { align: AlignmentType.CENTER, size: 36, bold: true, after: 80 }),
  p("[Short subtitle / one-line description]", { align: AlignmentType.CENTER, size: 22, italics: true, after: 280 }),
  p("Session: [e.g. BSSE-2023-2027]", { align: AlignmentType.CENTER, after: 80 }),
  p("Project Advisor: [Advisor Name]", { align: AlignmentType.CENTER, after: 200 }),
  p("Submitted By:", { align: AlignmentType.CENTER, bold: true, after: 120 }),
);
children.push(blankTable(["Student Name", "Roll No."], 3, [Math.floor(CONTENT_W * 0.6), Math.ceil(CONTENT_W * 0.4)]));
children.push(p("", { after: 400 }));

// Statement
children.push(
  h1("STATEMENT OF SUBMISSION"),
  placeholder("This is certified that [Student Name(s)] Roll No. [....] has/have successfully completed the final year project named as [Project Name] at the Department of Software Engineering, University of Gujrat, to fulfill the requirement of the degree of Bachelor’s in Software Engineering."),
  p(""),
  p("______________________          _____________________"),
  p("Project Supervisor               Project Coordination Office"),
  p("                                 Faculty of C&IT - UOG"),
  p(""),
  p("______________________"),
  p("Head of the Department"),
);

// Ack + Abstract
children.push(
  h1("Acknowledgement"),
  placeholder("[Thank advisor, department, friends/family. Include Date.]"),
  h1("Abstract"),
  placeholder("[Write project abstract — problem, solution, stack, actors, outcomes.]"),
);

// TOC note
children.push(
  h1("TABLE OF CONTENTS"),
  placeholder("[Update fields in Word: References → Table of Contents, or copy from NeoTeach TOC and retarget page numbers.]"),
);

// ========== CHAPTER 1 ==========
children.push(h1("CHAPTER 1: PROJECT FEASIBILITY REPORT"));
children.push(h2("1.1. Introduction"));
children.push(placeholder());

children.push(h2("1.2. Project/Product Feasibility Report"));
children.push(placeholder("[Short intro to feasibility areas.]"));
for (const t of [
  "1.2.1. Technical Feasibility",
  "1.2.2. Operational Feasibility",
  "1.2.3. Economic Feasibility",
  "1.2.4. Schedule Feasibility",
  "1.2.5. Specification Feasibility",
  "1.2.6. Information Feasibility",
  "1.2.7. Motivational Feasibility",
  "1.2.8. Legal & Ethical Feasibility",
]) {
  children.push(h3(t));
  children.push(placeholder());
}

children.push(h2("1.3. Project/Product Scope"));
children.push(placeholder());

children.push(h2("1.4. Project/Product Costing"));
children.push(placeholder());
children.push(h3("1.4.1. Project Cost Estimation by Function Point Analysis"));
children.push(placeholder());
children.push(p("Table 1.4.1.1: Unadjusted Function Points", { bold: true, before: 120 }));
children.push(blankTable(["Function Type", "Simple", "Average", "Complex", "Total"], 5, [2200, 1600, 1600, 1600, 2746]));
children.push(p("Table 1.4.1.2: [Additional FP table]", { bold: true, before: 160 }));
children.push(blankTable(["Item", "Value"], 4, [CONTENT_W / 2, CONTENT_W / 2]));
children.push(p("Table 1.4.1.3: Productivity (LOC/PM)", { bold: true, before: 160 }));
children.push(blankTable(["Language / Method", "LOC/PM"], 3, [CONTENT_W / 2, CONTENT_W / 2]));

children.push(h3("1.4.2. Project Cost Estimation by using COCOMO (Constructive Cost Model)"));
children.push(placeholder("[COCOMO’81 or COCOMO II — match Chapter 1 decision.]"));
children.push(blankTable(["Parameter", "Value"], 5, [CONTENT_W / 2, CONTENT_W / 2]));

children.push(h3("1.4.3. Activity Based Costing"));
children.push(p("Table 1.4.3.1: Activity Based Costing", { bold: true }));
children.push(blankTable(["Activity", "Effort / Cost"], 5, [CONTENT_W / 2, CONTENT_W / 2]));

children.push(h2("1.5. Task Dependency Table"));
children.push(p("Table 1.5.1: Task Dependency table", { bold: true }));
children.push(blankTable(["Task ID", "Task Name", "Depends On", "Duration"], 8, [1400, 3600, 2400, 2346]));

children.push(h2("1.6. CPM - Critical Path Method"));
children.push(placeholder());
children.push(p("Table 1.6.1: Task Dependency table", { bold: true }));
children.push(blankTable(["Task", "Predecessor", "Duration"], 6, [CONTENT_W / 3, CONTENT_W / 3, CONTENT_W / 3]));
children.push(p("Table 1.6.2: Sequence of the activities", { bold: true, before: 160 }));
children.push(blankTable(["Sequence", "Activities"], 4, [CONTENT_W / 2, CONTENT_W / 2]));
children.push(p("Figure 1.6.1: Network Diagram", { bold: true, before: 160, align: AlignmentType.CENTER }));
children.push(figPlaceholder("Network / CPM Diagram"));
children.push(p("Table 1.6.3: Estimation of Activity Completion Time (CPM)", { bold: true }));
children.push(blankTable(["Activity", "ES", "EF", "LS", "LF", "Slack"], 6, [2200, 1400, 1400, 1400, 1400, 1946]));
children.push(p("Figure 1.6.2: Updated Network/CPM Diagram", { bold: true, align: AlignmentType.CENTER, before: 160 }));
children.push(figPlaceholder("Updated Network/CPM Diagram"));

children.push(h2("1.7. Gantt Chart"));
children.push(p("Figure 1.7.1: Gantt Chart", { bold: true, align: AlignmentType.CENTER }));
children.push(figPlaceholder("Gantt Chart"));

children.push(h2("1.8. Introduction to Team Members and their Skill Set"));
children.push(p("Table 1.8.1: Team Members & their Skills", { bold: true }));
children.push(blankTable(["Name / Roll No.", "Role", "Skill Set"], 4, [2800, 2400, 4546]));

children.push(h2("1.9. Task and Member Assignment Table"));
children.push(p("Table 1.9.1: Task & Member Assignment Table", { bold: true }));
children.push(blankTable(["Task ID", "Task", "Weeks", "Assigned To"], 8, [1400, 3600, 1400, 3346]));

children.push(h2("1.10. Tools and Technology with Reasoning"));
children.push(blankTable(["Technology", "Purpose / Reasoning"], 10, [CONTENT_W / 2, CONTENT_W / 2]));

children.push(h2("1.11. Vision Document"));
children.push(placeholder("[Problem of / affects / impact / successful solution]"));
children.push(placeholder("[Product position statement]"));
children.push(blankTable(["Stakeholder", "Key Needs"], 5, [CONTENT_W / 2, CONTENT_W / 2]));

children.push(h2("1.12. Risk List"));
children.push(blankTable(["#", "Risk", "P", "I", "P×I", "Mitigation"], 8, [600, 2800, 800, 800, 800, 3946]));

children.push(h2("1.13. Product Features / Product Decomposition"));
children.push(placeholder("[Describe modules / decomposition.]"));
children.push(p("Figure 1.13.1: Product Decomposition", { bold: true, align: AlignmentType.CENTER }));
children.push(figPlaceholder("Product Decomposition Diagram"));

// ========== CHAPTER 2 ==========
children.push(h1("CHAPTER 2: SOFTWARE REQUIREMENT SPECIFICATION (FOR OBJECT ORIENTED APPROACH)"));
children.push(h2("2.1 Introduction:"));
children.push(placeholder("[SRS purpose + OO activities list: elicitation, analysis, specification, modeling, validation, management.]"));
children.push(p("Figure 2.1.1: System Specifications", { bold: true, align: AlignmentType.CENTER }));
children.push(figPlaceholder("System Specifications overview"));

children.push(h2("2.1.1 Systems Specifications"));
children.push(placeholder("[Clause intro.]"));
for (const t of [
  "Introduction",
  "Area Knowledge",
  "Organization Overview",
  "Current Market Status",
  "Business Regions Overview",
  "Existing System",
  "Organizational Chart",
]) {
  children.push(h3(t));
  children.push(placeholder());
}
children.push(p("Figure 2.1.1.1: Organization Chart", { bold: true, align: AlignmentType.CENTER }));
children.push(figPlaceholder("Organization Chart"));
children.push(h3("Scope of the System"));
children.push(placeholder("[Phase 1 / Phase 2 scope bullets.]"));
children.push(h3("Summary of Requirements: (Initial Requirements)"));
children.push(p("Functional Requirements", { bold: true }));
children.push(placeholder("[List functional requirement areas.]"));
children.push(p("Non-Functional Requirements", { bold: true, before: 120 }));
children.push(placeholder("[Usability / Performance / Security / Reliability / Compatibility …]"));

children.push(h2("2.1.2. Identifying External Entities"));
children.push(placeholder("[Two-phase process intro.]"));
children.push(h3("a. Over Specify Entities from Abstract"));
children.push(placeholder("1. …  2. …  3. …"));
children.push(h3("b. Perform Refinement"));
children.push(placeholder("[Keep only entities that interact directly with the system.]"));

children.push(h2("2.1.3. Context Level Data Flow Diagram:"));
children.push(p("Figure 2.1.3.1: Context Flow Diagram", { bold: true, align: AlignmentType.CENTER }));
children.push(figPlaceholder("Context Level DFD"));

children.push(h2('2.1.4. Capture "shall" Statements:'));
children.push(p('Table 2.1.4.1: Capture “shall” Requirements', { bold: true }));
children.push(blankTable(["Para #", "Initial Requirements"], 12, [1600, CONTENT_W - 1600]));

children.push(h2("2.1.5. Allocate Requirements:"));
children.push(p("Table 2.1.5.1: Allocate Requirements", { bold: true }));
children.push(blankTable(["Para #", "Initial Requirements", "Use Case Name"], 10, [1200, 5200, 3346]));

children.push(h2("2.1.6. Prioritize Requirements:"));
children.push(p("Table 2.1.6.1: Prioritize Requirements", { bold: true }));
children.push(blankTable(["Para #", "Rank", "Initial Requirements", "Use Case ID", "Use Case Name"], 10, [1100, 1200, 3400, 1400, 2646]));

children.push(h2("2.1.7. Requirements Trace-ability Matrix:"));
children.push(p("Table 2.1.7.1: Requirements Traceability Matrix", { bold: true }));
children.push(blankTable(["Sr #", "Para #", "System Specification Text", "Build", "Use Case Name", "Category"], 10, [800, 1000, 3400, 1200, 1800, 1546]));

children.push(h2("2.2.10. High Level Usecase Diagram:"));
children.push(p("Figure 2.2.10.1: High Level Use-case Diagram", { bold: true, align: AlignmentType.CENTER }));
children.push(figPlaceholder("High Level Use-case Diagram"));

children.push(h2("2.2.11. Analysis Level Usecase Diagram:"));
children.push(p("Figure 2.2.11.1: Analysis Level Use-case Diagram", { bold: true, align: AlignmentType.CENTER }));
children.push(figPlaceholder("Analysis Level Use-case Diagram"));

children.push(h2("2.2.12. Usecase Description"));
children.push(placeholder("[Duplicate the blank use-case template below for each use case.]"));
children.push(...useCaseTemplate("Table 2.2.12.1: [Use Case Title]"));
children.push(...useCaseTemplate("Table 2.2.12.2: [Use Case Title]"));
children.push(...useCaseTemplate("Table 2.2.12.3: [Use Case Title]"));

// ========== CHAPTER 3 ==========
children.push(h1("CHAPTER 3: DESIGN DOCUMENT (FOR OBJECT ORIENTED APPROACH)"));
children.push(h2("3.1. Introduction:"));
children.push(placeholder());
children.push(h2("3.2. Domain Model"));
children.push(figPlaceholder("Domain Model"));
children.push(h2("3.3. System Sequence Diagram"));
children.push(figPlaceholder("System Sequence Diagram"));
children.push(h2("3.4. Sequence Diagram"));
children.push(figPlaceholder("Sequence Diagram(s)"));
children.push(h2("3.5. Collaboration Diagram"));
children.push(figPlaceholder("Collaboration Diagram"));
children.push(h2("3.6. Operation Contracts"));
children.push(placeholder("[Operation name / Cross references / Preconditions / Postconditions / Exceptions]"));
children.push(blankTable(["Field", "Content"], 6, [CONTENT_W / 2, CONTENT_W / 2]));
children.push(h2("3.7. Design Class Diagram"));
children.push(figPlaceholder("Design Class Diagram"));
children.push(h2("3.8. State Chart Diagram"));
children.push(figPlaceholder("State Chart Diagram"));
children.push(h2("3.9. Data Model"));
children.push(figPlaceholder("ER / Data Model"));

// ========== CHAPTER 4 ==========
children.push(h1("CHAPTER 4: USER INTERFACE DESIGN"));
children.push(h2("4.1. Introduction"));
children.push(placeholder());
children.push(h2("4.2. Site Maps"));
children.push(h3("4.2.1. [Role 1] Site Map"));
children.push(placeholder());
children.push(h3("4.2.2. [Role 2] Site Map"));
children.push(placeholder());
children.push(h3("4.2.3. Admin Site Map"));
children.push(placeholder());
children.push(h3("4.2.4. Site Map Diagram of [Project Name]"));
children.push(figPlaceholder("Site Map Diagram"));
children.push(h2("4.3. Story Boards"));
children.push(placeholder("[Insert storyboard screens / wireframes per flow.]"));
children.push(figPlaceholder("Storyboard set"));
children.push(h2("4.4. Navigational Maps:"));
children.push(h3("4.4.1. Login & Registration Flow"));
children.push(placeholder());
children.push(h3("4.4.2. [Role 1] Navigation Flow"));
children.push(placeholder());
children.push(h3("4.4.3. [Role 2] Navigation Flow"));
children.push(placeholder());
children.push(h3("4.4.4. Admin Navigation Flow"));
children.push(placeholder());
children.push(h3("4.4.5. Navigational Map Diagram"));
children.push(figPlaceholder("Navigational Map Diagram"));
children.push(h2("4.5. Trace-ability Matrix"));
children.push(blankTable(["UI / Screen", "Requirement / Use Case", "Notes"], 8, [3200, 3600, 2946]));

// ========== CHAPTER 5 ==========
children.push(h1("CHAPTER 5: SOFTWARE TESTING"));
children.push(h2("5.1 Introduction:"));
children.push(placeholder());
children.push(h2("5.2. Test Plan"));
children.push(h3("5.2.1. Purpose"));
children.push(placeholder());
children.push(h3("5.2.2. Outline"));
children.push(placeholder("[Test items, features to be tested, approach, pass/fail, schedule, risks…]"));

children.push(h2("5.3. Test Design Specification"));
children.push(h3("5.3.1. Purpose"));
children.push(placeholder());

children.push(h2("5.4. Test Case Specification"));
children.push(h3("5.4.1. Purpose"));
children.push(placeholder());
children.push(h3("5.4.2. Outline"));
children.push(blankTable(["Test Case ID", "Description", "Input", "Expected Result"], 6, [1600, 2800, 2400, 2946]));

children.push(h2("5.5. Test Procedure Specification"));
children.push(h3("5.5.1. Purpose"));
children.push(placeholder());
children.push(h3("5.5.2. Outline"));
children.push(placeholder());
children.push(h3("5.5.3. Test Cases"));
children.push(blankTable(["TC ID", "Steps", "Expected", "Actual", "Status"], 6, [1200, 2800, 2000, 2000, 1746]));
children.push(h3("5.5.4. API Testing"));
children.push(blankTable(["Endpoint", "Method", "Input", "Expected", "Result"], 6, [2200, 1200, 2200, 2200, 1946]));

children.push(h2("5.6. Test Item Transmittal Report"));
children.push(h3("5.6.1. Purpose"));
children.push(placeholder());
children.push(h3("5.6.2. Outline"));
children.push(placeholder());

children.push(h2("5.7. Test Log"));
children.push(h3("5.7.1. Purpose"));
children.push(placeholder());
children.push(h3("5.7.2. Outline"));
children.push(blankTable(["Date", "Tester", "Activity", "Result / Notes"], 5, [1600, 2000, 2800, 3346]));

children.push(h2("5.8. Test Incident Report"));
children.push(h3("5.8.1. Purpose"));
children.push(placeholder());
children.push(h3("5.8.2. Outline"));
children.push(blankTable(["Incident ID", "Description", "Severity", "Status"], 5, [1600, 4000, 1600, 2546]));

children.push(h2("5.9. Test Summary Report"));
children.push(h3("5.9.1. Purpose"));
children.push(placeholder());
children.push(h3("5.9.2. Outline"));
children.push(placeholder());

// ========== CHAPTER 6 ==========
children.push(h1("CHAPTER 6: USER TECHNICAL MANUAL"));
children.push(h2("6.1 General Information"));
children.push(h3("6.1.1 System Overview"));
children.push(placeholder());
children.push(h2("6.2. System Summary"));
children.push(placeholder());
children.push(h2("6.3. Logging On"));
children.push(placeholder());
children.push(h3("6.3.1 System Menu"));
children.push(placeholder("[Describe menus / screens per role.]"));
children.push(h3("6.3.2 Changing User ID and Password"));
children.push(placeholder());
children.push(h3("6.3.3 Exit System"));
children.push(placeholder());
children.push(h2("6.4. Using the System"));
children.push(h3("6.4.1 Special Instructions for Error Correction"));
children.push(placeholder());
children.push(h3("6.4.2 Caveats and Exceptions"));
children.push(placeholder());

const doc = new Document({
  styles: {
    default: {
      document: {
        styles: [{
          id: "Normal",
          run: { font: "Times New Roman", size: 22 },
        }],
      },
    },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickStyle: true,
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 },
        run: { font: "Times New Roman", size: 28, bold: true } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickStyle: true,
        paragraph: { spacing: { before: 280, after: 140 }, outlineLevel: 1 },
        run: { font: "Times New Roman", size: 24, bold: true } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickStyle: true,
        paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 2 },
        run: { font: "Times New Roman", size: 22, bold: true } },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: PAGE_W, height: 16838 },
        margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
      },
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "Department of Software Engineering  |  University of Gujrat", font: "Times New Roman", size: 16, italics: true })],
        })],
      }),
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: "Page ", font: "Times New Roman", size: 16 }),
            new TextRun({ children: [PageNumber.CURRENT], font: "Times New Roman", size: 16 }),
          ],
        })],
      }),
    },
    children,
  }],
});

const outPath = "D:\\BSSE\\FYP_Documentation_Headings_Template.docx";
Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(outPath, buf);
  console.log("Wrote", outPath, "bytes", buf.length);
}).catch((e) => {
  console.error(e);
  process.exit(1);
});
