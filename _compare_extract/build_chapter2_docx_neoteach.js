/**
 * Captain Truck — Chapter 2 SRS (Object Oriented) — NeoTeach formatting
 * Use-case description tables match NeoTeach sample exactly:
 *   Title Use-case → Table caption → 4-col metadata → Pre-Condition →
 *   Basic Flow (User|System) → Alternative Flow → Post-Condition
 * Output: D:\BSSE\Captain_Truck_Chapter2_SRS.docx
 */
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, BorderStyle, WidthType, AlignmentType, Header, Footer,
  PageNumber, ShadingType, PageBreak, VerticalAlign,
  NumberFormat, PositionalTab, PositionalTabAlignment, PositionalTabLeader, PositionalTabRelativeTo,
} = require("docx");

const MD_PATH = path.join("D:", "vally", "captain_truck", "docs", "Chapter2.md");
const OUT = "D:\\BSSE\\Captain_Truck_Chapter2_SRS.docx";
const OUT_COPY = "D:\\BSSE\\FYP_Documentation_Chapter2_Filled.docx";

const PAGE_W = 11906;
const MARGIN = 1008;
const CONTENT_W = PAGE_W - MARGIN * 2;
const FONT = "Times New Roman";

const thin = { style: BorderStyle.SINGLE, size: 8, color: "000000" };
const borders = { top: thin, bottom: thin, left: thin, right: thin };
const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

function run(text, o = {}) {
  return new TextRun({
    text: String(text ?? ""),
    font: o.font ?? FONT,
    size: o.size ?? 24,
    bold: !!o.bold,
    italics: !!o.italics,
    color: o.color,
  });
}

function p(text, o = {}) {
  const children = Array.isArray(text)
    ? text
    : [run(String(text ?? ""), o)];
  return new Paragraph({
    spacing: { after: o.after ?? 160, before: o.before ?? 0, line: o.line ?? 276 },
    alignment: o.align ?? AlignmentType.JUSTIFIED,
    indent: o.indent,
    children,
  });
}

function rich(segments, o = {}) {
  return new Paragraph({
    spacing: { after: o.after ?? 160, before: o.before ?? 0, line: 276 },
    alignment: o.align ?? AlignmentType.JUSTIFIED,
    children: segments.map((s) => (typeof s === "string" ? run(s) : run(s.text, s))),
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

function h4(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_4,
    spacing: { before: 180, after: 100 },
    alignment: AlignmentType.LEFT,
    children: [run(text, { bold: true, size: 22 })],
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
    children: [run(stripMd(text), { size: 24 })],
  });
}

function stripMd(s) {
  return String(s ?? "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^\s*[-*]\s+/, "")
    .trim();
}

function cell(text, width, o = {}) {
  const lines = Array.isArray(text) ? text : [String(text ?? "")];
  return new TableCell({
    borders: o.noBorder ? noBorders : borders,
    width: { size: width, type: WidthType.DXA },
    columnSpan: o.colSpan,
    shading: o.header
      ? { type: ShadingType.CLEAR, fill: "D9D9D9" }
      : o.fill
        ? { type: ShadingType.CLEAR, fill: o.fill }
        : undefined,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 40, bottom: 40, left: 60, right: 60 },
    children: lines.map(
      (line, i) =>
        new Paragraph({
          spacing: { after: i === lines.length - 1 ? 0 : 40, before: 0, line: 240 },
          alignment: o.align ?? AlignmentType.LEFT,
          children: [
            run(stripMd(line), {
              size: o.size ?? 18,
              bold: !!o.header || !!o.bold,
              italics: !!o.italics,
              font: o.font,
            }),
          ],
        })
    ),
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
        children: headers.map((h, i) =>
          cell(h, w[i], { header: true, align: AlignmentType.CENTER, size: 16 })
        ),
      }),
      ...rows.map(
        (r) =>
          new TableRow({
            children: r.map((c, i) =>
              cell(c, w[i], { size: Array.isArray(c) || String(c).length > 80 ? 16 : 17 })
            ),
          })
      ),
    ],
  });
}

function codeBlock(lines) {
  const text = Array.isArray(lines) ? lines.join("\n") : String(lines);
  const paras = text.split("\n").map(
    (line) =>
      new Paragraph({
        spacing: { after: 0, before: 0, line: 240 },
        children: [run(line.length ? line : " ", { size: 14, font: "Consolas" })],
      })
  );
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [CONTENT_W],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders,
            width: { size: CONTENT_W, type: WidthType.DXA },
            shading: { type: ShadingType.CLEAR, fill: "F2F2F2" },
            margins: { top: 60, bottom: 60, left: 80, right: 80 },
            children: paras.length ? paras : [new Paragraph({ children: [run(" ")] })],
          }),
        ],
      }),
    ],
  });
}

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

function neoFooter() {
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

/* ---------------- Markdown helpers ---------------- */

function parsePipeTable(block) {
  const lines = block
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("|"));
  if (lines.length < 2) return null;
  const split = (line) =>
    line
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((c) => stripMd(c.trim()));
  const headers = split(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (/^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?$/.test(lines[i])) continue;
    rows.push(split(lines[i]));
  }
  return { headers, rows };
}

function extractFence(md, marker) {
  const re = new RegExp("```" + marker + "\\s*([\\s\\S]*?)```", "i");
  const m = md.match(re);
  return m ? m[1].trim() : "";
}

function extractAllFences(md, marker) {
  const re = new RegExp("```" + marker + "\\s*([\\s\\S]*?)```", "gi");
  const out = [];
  let m;
  while ((m = re.exec(md))) out.push(m[1].trim());
  return out;
}

function bulletsFrom(text) {
  return String(text || "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^[-*•]/.test(l) || /^A\d/.test(l))
    .map((l) => l.replace(/^[-*•]\s*/, "").trim());
}

function parseUseCases(md) {
  const start = md.indexOf("## 2.2.12 Usecase Description");
  if (start < 0) throw new Error("2.2.12 section not found");
  const endMatch = md.slice(start + 10).search(/\n## Chapter 2 summary/);
  const section = endMatch >= 0 ? md.slice(start, start + 10 + endMatch) : md.slice(start);
  const parts = section.split(/\n### Table (2\.2\.12\.\d+):\s*/);
  const ucs = [];
  for (let i = 1; i < parts.length; i += 2) {
    const id = parts[i];
    const body = parts[i + 1] || "";
    const titleLine = body
      .split("\n")[0]
      .trim()
      .replace(/\s+Use-case$/i, "")
      .replace(/^\*\*Table[^:]+:\s*/i, "")
      .replace(/\*\*/g, "");
    // Support legacy Field|Value tables and NeoTeach paired metadata tables
    const fields = {};
    const fieldTable = body.match(/\| Field \| Value \|[\s\S]*?(?=\n\*\*Pre-Condition)/);
    if (fieldTable) {
      const pt = parsePipeTable(fieldTable[0]);
      if (pt) {
        for (const row of pt.rows) {
          const k = stripMd(row[0] || "").replace(/:$/, "");
          fields[k] = stripMd(row[1] || "");
        }
      }
    } else {
      const neo = body.match(
        /\| Use-case Name: \|[\s\S]*?(?=\n\*\*Pre-Condition)/i
      );
      if (neo) {
        const pt = parsePipeTable(neo[0]);
        if (pt) {
          // rows may be header-like; scan all cells for labels
          for (const row of [pt.headers, ...pt.rows]) {
            for (let ci = 0; ci < row.length - 1; ci++) {
              const lab = stripMd(row[ci] || "").replace(/:$/, "");
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
                fields[lab] = stripMd(row[ci + 1] || "");
              }
            }
          }
        }
      }
    }
    // Title from **Table x: Title** if present
    const cap = body.match(/\*\*Table 2\.2\.12\.\d+:\s*([^*]+)\*\*/);
    const displayTitle = cap ? cap[1].trim() : titleLine;
    const pre = (body.match(/\*\*Pre-Condition:\*\*([\s\S]*?)\*\*Basic Flow/) || [])[1] || "";
    const alt = (body.match(/\*\*Alternative Flow:\*\*([\s\S]*?)\*\*Post-Condition/) || [])[1] || "";
    const post = (body.match(/\*\*Post-Condition:\*\*([\s\S]*?)(?=\n---|\n### |\n## |$)/) || [])[1] || "";

    // Collect all User|System tables under Basic Flow (Stripe/Cash variants)
    const flowSection = (body.match(/\*\*Basic Flow[\s\S]*?(?=\*\*Alternative Flow)/) || [""])[0];
    const flowBlocks = [];
    const flowParts = flowSection.split(/\*\*Basic Flow([^*]*)\*\*/).slice(1);
    if (flowParts.length === 0) {
      const t = flowSection.match(/\| User \| System \|[\s\S]*?(?=\n\*\*|$)/);
      if (t) {
        const pt = parsePipeTable(t[0]);
        if (pt) flowBlocks.push({ label: "", rows: pt.rows });
      }
    } else {
      for (let fi = 0; fi < flowParts.length; fi += 2) {
        const label = stripMd(flowParts[fi] || "").replace(/[():]/g, "").trim();
        const chunk = flowParts[fi + 1] || "";
        const t = chunk.match(/\| User \| System \|[\s\S]*?(?=\n\*\*|$)/);
        if (t) {
          const pt = parsePipeTable(t[0]);
          if (pt) flowBlocks.push({ label, rows: pt.rows });
        }
      }
    }
    // Fallback: any User|System table in flow section
    if (!flowBlocks.length) {
      const t = flowSection.match(/\| User \| System \|[\s\S]*?(?=\n\*\*|$)/);
      if (t) {
        const pt = parsePipeTable(t[0]);
        if (pt) flowBlocks.push({ label: "", rows: pt.rows });
      }
    }

    ucs.push({
      tableId: id,
      title: displayTitle || titleLine,
      name: fields["Use-case Name"] || "",
      ucId: fields["Use-case ID"] || "",
      actor: fields["Actor"] || "",
      createdBy: fields["Created By"] || "",
      date: fields["Date"] || "",
      description: fields["Description"] || "",
      pre: bulletsFrom(pre),
      flows: flowBlocks,
      alt: bulletsFrom(alt),
      post: bulletsFrom(post),
    });
  }
  return ucs;
}

/** Paragraphs for multi-line value cells (bullets / plain lines). */
function valueParas(lines, o = {}) {
  const items = (lines || []).filter((x) => String(x || "").trim().length);
  if (!items.length) {
    return [
      new Paragraph({
        spacing: { after: 0, before: 0, line: 240 },
        children: [run("", { size: o.size ?? 18 })],
      }),
    ];
  }
  return items.map(
    (line, i) =>
      new Paragraph({
        spacing: { after: i === items.length - 1 ? 0 : 40, before: 0, line: 240 },
        children: [
          run(stripMd(line).startsWith("A") && /^A\d/.test(stripMd(line))
            ? stripMd(line)
            : `• ${stripMd(line).replace(/^•\s*/, "")}`, {
            size: o.size ?? 18,
            bold: !!o.boldLine && /^A\d/.test(stripMd(line)),
          }),
        ],
      })
  );
}

function labelCell(text, width) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: { type: ShadingType.CLEAR, fill: "D9D9D9" },
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 50, bottom: 50, left: 60, right: 60 },
    children: [
      new Paragraph({
        spacing: { after: 0, before: 0, line: 240 },
        children: [run(text, { size: 18, bold: true })],
      }),
    ],
  });
}

function textValueCell(textOrParas, width) {
  const children = Array.isArray(textOrParas)
    ? textOrParas
    : [
        new Paragraph({
          spacing: { after: 0, before: 0, line: 240 },
          children: [run(stripMd(textOrParas), { size: 18 })],
        }),
      ];
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 50, bottom: 50, left: 60, right: 60 },
    children: children.length ? children : [new Paragraph({ children: [run("")] })],
  });
}

/**
 * NeoTeach use-case description — ONE single 2-column table (like sample image):
 * Use-case Name, ID, Actor, Created By, Date, Description,
 * Pre-Condition, Basic Flow (nested User|System), Alternative Flow, Post-Condition.
 */
function buildUseCaseNeoTeach(uc) {
  const out = [];
  const shortTitle = uc.title.replace(/\s+Use-?cases?$/i, "").trim();
  out.push(h3(`Use Case: ${shortTitle}`));
  out.push(
    new Paragraph({
      spacing: { before: 80, after: 120 },
      alignment: AlignmentType.LEFT,
      children: [
        run(`Table ${uc.tableId}: ${shortTitle} User Description`, {
          bold: true,
          size: 22,
        }),
      ],
    })
  );

  const labelW = 2400;
  const valueW = CONTENT_W - labelW;
  const flowInnerW = valueW - 120;
  const half = Math.floor(flowInnerW / 2);
  const halves = [half, flowInnerW - half];

  // Build nested Basic Flow User|System table(s) for the value cell
  const flowChildren = [];
  for (const flow of uc.flows) {
    if (flow.label) {
      flowChildren.push(
        new Paragraph({
          spacing: { after: 60, before: 40, line: 240 },
          children: [run(`(${flow.label})`, { size: 17, bold: true, italics: true })],
        })
      );
    }
    flowChildren.push(
      new Table({
        width: { size: flowInnerW, type: WidthType.DXA },
        columnWidths: halves,
        rows: [
          new TableRow({
            tableHeader: true,
            children: [
              cell("User", halves[0], {
                header: true,
                align: AlignmentType.CENTER,
                size: 17,
              }),
              cell("System", halves[1], {
                header: true,
                align: AlignmentType.CENTER,
                size: 17,
              }),
            ],
          }),
          ...flow.rows.map(
            (r) =>
              new TableRow({
                children: [
                  cell(r[0] || "", halves[0], { size: 16 }),
                  cell(r[1] || "", halves[1], { size: 16 }),
                ],
              })
          ),
        ],
      })
    );
  }
  if (!flowChildren.length) {
    flowChildren.push(
      new Paragraph({
        spacing: { after: 0, before: 0 },
        children: [run("", { size: 18 })],
      })
    );
  }

  const rows = [
    ["Use-case Name:", uc.name],
    ["Use-case ID:", uc.ucId],
    ["Actor:", uc.actor],
    ["Created By:", uc.createdBy],
    ["Date:", uc.date],
    ["Description:", uc.description],
  ].map(
    ([lab, val]) =>
      new TableRow({
        children: [labelCell(lab, labelW), textValueCell(val, valueW)],
      })
  );

  rows.push(
    new TableRow({
      children: [
        labelCell("Pre-Condition:", labelW),
        textValueCell(valueParas(uc.pre), valueW),
      ],
    })
  );

  rows.push(
    new TableRow({
      children: [
        labelCell("Basic Flow:", labelW),
        new TableCell({
          borders,
          width: { size: valueW, type: WidthType.DXA },
          margins: { top: 60, bottom: 60, left: 60, right: 60 },
          children: flowChildren,
        }),
      ],
    })
  );

  rows.push(
    new TableRow({
      children: [
        labelCell("Alternative Flow:", labelW),
        textValueCell(valueParas(uc.alt), valueW),
      ],
    })
  );

  rows.push(
    new TableRow({
      children: [
        labelCell("Post-Condition:", labelW),
        textValueCell(valueParas(uc.post), valueW),
      ],
    })
  );

  out.push(
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [labelW, valueW],
      rows,
    })
  );
  out.push(spacer(240));
  return out;
}

function figureWithCode(captionText, codeText) {
  return [
    caption(captionText),
    p("Diagram code:", { bold: true, before: 40, after: 60, size: 20 }),
    codeBlock(codeText),
    spacer(120),
  ];
}

function parseNamedTable(md, titleRegex) {
  const m = md.match(titleRegex);
  if (!m) return null;
  const from = m.index + m[0].length;
  const slice = md.slice(from, from + 8000);
  const t = slice.match(/\|[^\n]+\|[\s\S]*?(?=\n\n|\n---|\n### |\n## |$)/);
  if (!t) return null;
  return parsePipeTable(t[0]);
}

/* ---------------- Build document ---------------- */

const md = fs.readFileSync(MD_PATH, "utf8");
const useCases = parseUseCases(md);
console.log("Parsed use cases:", useCases.length, useCases.map((u) => u.tableId).join(", "));

const titleChildren = [];
const frontChildren = [];
const children = [];

const pageProps = {
  size: { width: PAGE_W, height: 16838 },
  margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
};

// ---- Title ----
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
    spacing: { after: 80 },
    children: [run("Chapter 2: Software Requirement Specification", { bold: true, size: 28 })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 320 },
    children: [run("(For Object Oriented Approach)", { italics: true, size: 24 })],
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

// ---- Front TOC ----
frontChildren.push(
  hChapter("TABLE OF CONTENTS"),
  tocLine("CHAPTER 2: SOFTWARE REQUIREMENT SPECIFICATION (OO)", "1", { bold: true }),
  tocLine("2.1. INTRODUCTION", "2"),
  tocLine("2.1.1. Systems Specifications", "2", { indent: 360 }),
  tocLine("2.1.2. Identifying External Entities", "6", { indent: 360 }),
  tocLine("2.1.3. Context Level Data Flow Diagram", "8", { indent: 360 }),
  tocLine("2.1.4. Capture \"shall\" Statements", "10", { indent: 360 }),
  tocLine("2.1.5. Allocate Requirements", "16", { indent: 360 }),
  tocLine("2.1.6. Prioritize Requirements", "17", { indent: 360 }),
  tocLine("2.1.7. Requirements Trace-ability Matrix", "18", { indent: 360 }),
  tocLine("2.2.10. High Level Usecase Diagram", "19"),
  tocLine("2.2.11. Analysis Level Usecase Diagram", "21"),
  tocLine("2.2.12. Usecase Description", "23")
);

// ---- Chapter body ----
children.push(
  hChapter("CHAPTER 2: SOFTWARE REQUIREMENT SPECIFICATION (FOR OBJECT ORIENTED APPROACH)"),
  h2("2.1 Introduction"),
  p("A Software Requirements Specification (SRS) for an object-oriented project like Captain Truck covers functional, non-functional, and interface requirements. This chapter captures, structures, and represents stakeholder needs so they can be correctly embodied in the system. The OO SRS activities used here follow the same outline as the NeoTeach sample SRS:"),
  bullet("Requirements elicitation"),
  bullet("Requirements analysis and negotiation"),
  bullet("Requirements specification"),
  bullet("System modeling"),
  bullet("Requirements validation"),
  bullet("Requirements management"),
  p("Captain Truck is specified as four cooperating surfaces that share one NestJS API:"),
  bullet("Flutter Customer app (Android)"),
  bullet("Flutter Driver app (Android)"),
  bullet("React Admin web panel (Vite + Tailwind → Vercel)"),
  bullet("NestJS API + Socket.IO realtime (Oracle Always Free VM) with PostgreSQL (Neon)"),
  p("Core behaviours required by the updated proposal: JWT role-based auth; truck types and versioned base rates; dispatch lifecycle; up to three OSM routes; on-device AI trip cost with customer fare proposal inside an admin-configured band; admin approve/reject; driver willingness then assignment; trip lifecycle with Socket.IO GPS and offline map caching; chat (text/image/voice) with Smart Reply on mobile and 90-day TTL; Cash-on-Pickup and Stripe Test Mode with distinct reconciliation; commission ledger; FCM push; Admin operational dashboard."),
  p("All diagrams in this chapter are black-and-white for print. Diagram code is shown under each figure.")
);

const fig211 = extractFence(
  md.slice(md.indexOf("**Figure 2.1.1:"), md.indexOf("### 2.1.1")),
  "text"
);
children.push(...figureWithCode("Figure 2.1.1: System Specifications (overview)", fig211 || "flowchart TB ..."));

children.push(
  h3("2.1.1 Systems Specifications"),
  p("The following clauses describe the system specifications for Captain Truck (NeoTeach-style clauses)."),
  h4("Introduction"),
  p("Captain Truck is a real-time logistics and dispatch platform that digitises admin-mediated full-truckload booking for shippers and drivers in Pakistan. Customers create dispatch requests with pickup/drop, truck type and count; the platform returns OSM route alternatives; an on-device AI model estimates trip cost; the customer proposes a fare within an administrator-configured adjustment band; an administrator reviews, rejects with reason, confirms driver willingness, and assigns a driver and truck; the trip is tracked live (with offline map support for drivers); participants chat; payment is cash-on-pickup or Stripe Test Mode; and a commission ledger records platform commission and method-specific payables/remittances."),
  h4("Area Knowledge"),
  p("Road freight in Pakistan is fragmented. Small operators and shippers often rely on informal brokers for matching, pricing and cash settlement. Gaps include opaque trip cost, weak live tracking, informal assignment, unclear driver willingness, and poor commission reconciliation across cash versus online collection. Digital load boards improve discovery but often omit a human admin assignment loop, customer-adjustable AI pricing, dual cash/card settlement with separate accounting directions, and a full ops panel. Captain Truck fills that gap with OSM multi-route choice, TFLite AI trip cost (on device), customer fare proposal, Socket.IO GPS, offline-aware driver maps, chat with retention policy, Cash + Stripe Test Mode, and an auditable commission ledger on free-tier infrastructure."),
  h4("Organization Overview"),
  p("Captain Truck is developed by students of the Department of Software Engineering, University of Gujrat, under Mr. Touqeer Ul Ameen."),
  table(
    ["Member", "Roll No.", "Primary ownership"],
    [
      ["Muhammad Umair (Project Manager)", "23011598-062", "NestJS API, realtime, payments, commission"],
      ["Muhammad Ali", "23011598-063", "Flutter Customer & Driver apps; maps & on-device AI"],
      ["Muhammad Shahzaib", "23011598-109", "React Admin panel; documentation; testing"],
    ],
    [3200, 2200, CONTENT_W - 5400]
  ),
  spacer(120),
  p("The team applies NestJS, Flutter, React, PostgreSQL (Prisma/Neon), Redis (optional/coordination), Socket.IO, Cloudinary, FCM and Stripe Test Mode. Development follows the Waterfall Model (Chapter 1): planning → requirements → design → implementation → integration → testing → optimization → delivery (September 2026 – June 2027), with university milestones placed on that linear plan."),
  h4("Current Market Status"),
  p("Informal WhatsApp/broker workflows remain common. Commercial logistics apps and load boards exist but may be costly, closed, region-limited, or mismatched to FYP constraints (free tiers, Android-first, admin mediation, no automatic matching). Captain Truck targets an academic, free-tier, admin-mediated MVP that is still mobile-ready via versioned REST (/api/v1) and Socket.IO (/realtime). Named commercial comparisons in the proposal must be verified against current public documentation before final submission."),
  h4("Business Regions Overview"),
  p("Captain Truck focuses on three regions of capability:"),
  bullet("Customer booking and pricing — request creation, route comparison, AI estimate, fare proposal within band, status visibility, payment choice, live track and chat."),
  bullet("Driver trip fulfilment — receive willingness inquiry and assignment, navigate with cached maps, publish GPS, update trip status, chat, confirm cash collection."),
  bullet("Admin operations and reconciliation — user/driver management, truck types and rate history, pending queue, approve/reject, willingness, assign, live ops map, payments oversight, commission ledger and adjustments."),
  h4("Existing System"),
  p("Current practice for many small shippers and operators depends on phone calls, messaging apps, paper notes and separate tracking tools. Route comparison and fare agreement are informal. Driver assignment is verbal. Live location may be shared ad hoc. Cash collected on the road is hard to reconcile with platform commission. Online test/demo payment flows are rarely integrated with the same dispatch record."),
  p("These existing approaches cover basic communication but fail to provide a single controlled workflow for routes, AI-informed but customer-adjustable fare, mandatory admin review, driver willingness, offline-aware maps, dual payment accounting and an auditable ledger. Captain Truck addresses that gap within the exclusions listed in the updated proposal (no bilty suite, no auto-matching, no live Stripe production claim, no IoT/NADRA)."),
  h4("Organizational Chart")
);

const orgCode = extractFence(
  md.slice(md.indexOf("Figure 2.1.1.1"), md.indexOf("#### Scope of the System")),
  "text"
);
children.push(
  ...figureWithCode("Figure 2.1.1.1: Organization Chart — Captain Truck FYP Team", orgCode),
  h4("Scope of the System"),
  p("The scope covers a secure, real-time full-truckload dispatch platform with the 15 functional modules of the updated proposal. Under Waterfall, modules are specified here, designed in Chapter 3, implemented mainly in the development phase, then integrated and tested."),
  rich([{ text: "Phase 1 (core path): ", bold: true }, { text: "Auth/RBAC; user & driver management; truck types & rate versions; dispatch create & lifecycle; OSM geocode/routes; AI estimate + fare proposal band; admin approve/reject; willingness + assign; trip statuses; GPS; basic chat; cash + Stripe Test; commission ledger; admin dashboard shell; FCM registration." }]),
  rich([{ text: "Phase 2 (hardening & mobile depth): ", bold: true }, { text: "Offline map tile download/cache; queued timestamped GPS; Smart Reply; media signed uploads polish; ledger dual directions and discrepancy adjustments; AI training/evaluation documentation (≤20 recent completed trips window); security/idempotency and usability testing." }]),
  rich([{ text: "Out of scope (proposal exclusions): ", bold: true }, { text: "Live Stripe production claim; in-app wallet/escrow/auto payout; automatic driver matching/bidding; hardware telematics/IoT; NADRA/biometrics; multi-stop route editing; production-grade AI price guarantee; full bilty/consignment/WMS; multilingual UI (Smart Reply English-only); deferred advanced analytics/ratings if core modules need more time." }]),
  h4("Summary of Requirements (Initial Requirements)"),
  p("Functional Requirements — Captain Truck", { bold: true, after: 100 })
);

const frTable = parseNamedTable(md, /\*\*Functional Requirements — Captain Truck\*\*/);
if (frTable) {
  children.push(
    table(frTable.headers, frTable.rows, [900, 1400, CONTENT_W - 2300]),
    spacer(120)
  );
}
children.push(p("Non-Functional Requirements — Captain Truck", { bold: true, after: 100 }));
const nfrTable = parseNamedTable(md, /\*\*Non-Functional Requirements — Captain Truck\*\*/);
if (nfrTable) {
  children.push(
    table(nfrTable.headers, nfrTable.rows, [900, 1600, CONTENT_W - 2500]),
    spacer(120)
  );
}

children.push(
  h4("Operating Environment"),
  table(
    ["Layer", "Choice"],
    [
      ["Mobile", "Flutter (Dart), Android (iOS only if testing resources allow)"],
      ["Admin", "React + Vite + Tailwind → Vercel"],
      ["API", "NestJS + TypeScript on Oracle Always Free + Nginx + PM2"],
      ["DB", "PostgreSQL on Neon (Prisma)"],
      ["Cache / live GPS", "Redis (Upstash or Oracle VM; optional for single-instance)"],
      ["Maps", "OSM: Nominatim, Photon, OSRM; flutter_map / Leaflet; offline tiles per licence"],
      ["AI", "On-device TFLite cost + ML Kit Smart Reply"],
      ["Media", "Cloudinary"],
      ["Push", "FCM only"],
      ["Payments", "Cash-on-Pickup + Stripe Test Mode"],
    ],
    [2800, CONTENT_W - 2800]
  ),
  spacer(120),
  h4("Assumptions and Constraints"),
  bullet("Drivers do not self-register publicly; admin creates driver accounts."),
  bullet("Multi-truck policy (FYP): one lead driver for truckCount ≥ 1; billing still uses truckCount."),
  bullet("No automatic matching/bidding; admin willingness then assign."),
  bullet("Server validates fare proposal band and bill; client totals are validated/ignored on mismatch."),
  bullet("Stripe is Test Mode for FYP demonstration unless production eligibility is independently confirmed."),
  bullet("Refunds / live merchant payouts out of scope for FYP."),
  bullet("AI output is advisory; training/retraining is a separate documented process (not automatic from TFLite inference alone).")
);

children.push(
  h3("2.1.2 Identifying External Entities"),
  p("External entities are identified in two phases (NeoTeach method)."),
  h4("a. Over-specify entities from the product description"),
  bullet("Customer (shipper) — creates dispatches, selects routes, proposes fare, pays, tracks, chats."),
  bullet("Driver — responds to willingness, receives assignments, updates GPS/status, chats, confirms cash, uses offline maps."),
  bullet("Administrator — manages users/drivers, rates, approve/reject, willingness, assign, ledger, live ops."),
  bullet("OSM services — Nominatim/Photon geocode; OSRM routing; map tiles (subject to provider terms)."),
  bullet("Stripe — Test Mode Checkout / PaymentIntent + webhooks."),
  bullet("Cloudinary — chat image/voice storage."),
  bullet("FCM — Android push delivery."),
  bullet("Neon PostgreSQL — persistent data store."),
  bullet("Redis — live GPS and job locks / Socket.IO coordination (when used)."),
  bullet("On-device AI (TFLite / ML Kit) — local inference on the mobile device (logical external capability to the API)."),
  bullet("Play Store / device OS — app install and runtime (Android)."),
  bullet("System maintenance team — developers deploying/monitoring the API (refined out of context DFD as internal)."),
  h4("b. Refined external entities (used on context DFD)"),
  table(
    ["Entity", "Type", "Interaction with Captain Truck"],
    [
      ["Customer", "Human actor", "REST + Socket.IO via Customer app"],
      ["Driver", "Human actor", "REST + Socket.IO via Driver app"],
      ["Administrator", "Human actor", "REST + Socket.IO via Admin web"],
      ["OSM (Nominatim / Photon / OSRM / tiles)", "External system", "Server/client geocode, routes, map tiles"],
      ["Stripe Test Mode", "External system", "Payment create + webhook callbacks"],
      ["Cloudinary", "External system", "Signed media URLs for chat"],
      ["FCM", "External system", "Push notifications to devices"],
      ["Neon PostgreSQL", "External system", "Persistent relational storage"],
      ["Redis", "External system", "Live location cache / locks / optional adapter"],
    ],
    [3200, 1800, CONTENT_W - 5000]
  ),
  spacer(100),
  p("Internal processes (auth, dispatch state machine, fare-band validation, bill formula, willingness/assign rules, commission math, chat TTL job) are inside the Captain Truck system boundary. On-device TFLite/ML Kit run on the client device but are shown in architecture as on-device capabilities rather than separate human actors.")
);

const dfdCode = extractAllFences(
  md.slice(md.indexOf("### 2.1.3"), md.indexOf("### 2.1.4")),
  "text"
);
children.push(
  h3("2.1.3 Context Level Data Flow Diagram"),
  ...figureWithCode("Figure 2.1.3.1: Context Level DFD — Captain Truck", dfdCode[0] || ""),
  ...figureWithCode("Figure 2.1.3.2: High-level dispatch and payment flow (proposal)", dfdCode[1] || "")
);

children.push(
  h3("2.1.4 Capture \"shall\" Statements"),
  p('Shall statements are grouped by the 15 updated-proposal modules. Wording matches the proposal and is refined where Chapter 1 / API behaviour is already locked (integer cents, JWT roles, Socket.IO rooms, Cloudinary signed uploads, Waterfall process).'),
  p("Table 2.1.4.1: Capture \"shall\" Requirements", { bold: true, align: AlignmentType.LEFT, after: 100 })
);

const shallTable = parseNamedTable(md, /Table 2\.1\.4\.1: Capture/);
if (shallTable) {
  children.push(
    table(shallTable.headers, shallTable.rows, [1400, CONTENT_W - 1400]),
    spacer(120)
  );
}

children.push(
  h3("2.1.5 Allocate Requirements"),
  p("Table 2.1.5.1: Allocate Requirements", { bold: true, align: AlignmentType.LEFT, after: 100 })
);
const alloc = parseNamedTable(md, /Table 2\.1\.5\.1: Allocate/);
if (alloc) {
  children.push(table(alloc.headers, alloc.rows, [1200, 2800, CONTENT_W - 4000]), spacer(120));
}

children.push(
  h3("2.1.6 Prioritize Requirements"),
  p("Priority ranks: Highest (MVP / critical path), Medium (important), Low (supporting / polish)."),
  p("Table 2.1.6.1: Prioritize Requirements", { bold: true, align: AlignmentType.LEFT, after: 100 })
);
const prio = parseNamedTable(md, /Table 2\.1\.6\.1: Prioritize/);
if (prio) {
  children.push(table(prio.headers, prio.rows, [1200, 1400, 1800, CONTENT_W - 4400]), spacer(120));
}

children.push(
  h3("2.1.7 Requirements Trace-ability Matrix"),
  p("Table 2.1.7.1: Requirements Traceability Matrix", { bold: true, align: AlignmentType.LEFT, after: 100 })
);
const rtm = parseNamedTable(md, /Table 2\.1\.7\.1: Requirements/);
if (rtm) {
  children.push(
    table(rtm.headers, rtm.rows, [700, 1100, 2800, 1200, 2200, CONTENT_W - 8000]),
    spacer(80)
  );
}
children.push(
  p("Build numbers group Waterfall implementation drops aligned with Chapter 1 phases (auth → users/catalog/dispatch → routes/fare → willingness/assign → trips/GPS → chat/media → pay/ledger → push/admin polish).", {
    italics: true,
    size: 20,
  })
);

// High-level UC diagram
const hlCodes = extractAllFences(
  md.slice(md.indexOf("## 2.2.10"), md.indexOf("## 2.2.11")),
  "text"
);
children.push(
  h2("2.2.10 High Level Usecase Diagram"),
  p("Actors are the three human roles only: Customer, Driver, and Administrator. External systems (OSM, Stripe, Cloudinary, FCM) are not use-case actors; they appear on the context DFD."),
  p("Actor–module associations (high level):", { bold: true, after: 80 }),
  table(
    ["Actor", "High-level use cases"],
    [
      ["Customer", "Register; Login/Session; Manage profile; Manage dispatch; Select route & propose fare; Pay trip; Track trip & chat; Push tokens"],
      ["Driver", "Login/Session only (no public register); Manage driver profile; Respond to willingness; Trip ops (status/GPS/offline maps/complete); Chat & media; Confirm cash; Push tokens"],
      ["Administrator", "Login/Session; Create drivers & manage users; Truck types & rates; Review / reject / willingness / assign; Ops panel & live track; Chat; Commission ledger"],
    ],
    [2200, CONTENT_W - 2200]
  ),
  spacer(100),
  ...figureWithCode("Figure 2.2.10.1: High Level Use-case Diagram — Captain Truck", hlCodes[0] || "")
);

const anCodes = extractAllFences(
  md.slice(md.indexOf("## 2.2.11"), md.indexOf("## 2.2.12")),
  "text"
);
children.push(
  h2("2.2.11 Analysis Level Usecase Diagram"),
  p("Analysis-level use cases expand the high-level diagram. Associations match the updated proposal modules and role rules (drivers do not self-register; willingness is admin-initiated and driver-answered; cash confirm is a driver payment action; chat/media are shared by trip participants)."),
  p("Corrected association checklist:", { bold: true, after: 80 }),
  table(
    ["Use case", "Customer", "Driver", "Admin"],
    [
      ["UC_Register_Customer", "Yes", "", ""],
      ["UC_Login / UC_Session_Manage / UC_Get_Me", "Yes", "Yes", "Yes"],
      ["UC_Update_Profile", "Yes", "Yes", ""],
      ["UC_List_Truck_Types", "Yes", "", ""],
      ["UC_Create / View / Cancel Dispatch", "Yes", "", ""],
      ["UC_Generate_Routes / Select_Route", "Yes", "", ""],
      ["UC_Compute_Bill / Propose_Fare", "Yes", "", ""],
      ["UC_Admin_Create_Driver / Manage_Users", "", "", "Yes"],
      ["UC_Admin_Truck_Types / Base_Rates", "", "", "Yes"],
      ["UC_Admin_Review / Reject", "", "", "Yes"],
      ["UC_Driver_Willingness", "", "Respond", "Ask"],
      ["UC_Admin_Assign_Driver", "", "", "Yes"],
      ["UC_Update_Trip_Status / Complete_Trip", "", "Yes", "Yes"],
      ["UC_Track_Trip_GPS", "View", "Publish", "View"],
      ["UC_Offline_Maps", "", "Yes", ""],
      ["UC_Chat_Message / Upload_Media", "Yes", "Yes", "Yes"],
      ["UC_Pay_Trip", "Pay", "Cash confirm", ""],
      ["UC_Confirm_Commission / Ledger_Adjust", "", "", "Yes"],
      ["UC_Admin_Ops_Panel", "", "", "Yes"],
      ["UC_Manage_Push_Tokens", "Yes", "Yes", ""],
    ],
    [4200, 1400, 1800, CONTENT_W - 7400]
  ),
  spacer(100),
  ...figureWithCode("Figure 2.2.11.1: Analysis Level Use-case Diagram — Captain Truck", anCodes[0] || "")
);

children.push(
  h2("2.2.12 Usecase Description"),
  p("Detailed use cases follow the NeoTeach OO template. Customer self-registers; Driver accounts are admin-created; Administrator owns catalog, approval, willingness inquiry, assignment and ledger. Where a proposal behaviour is required but not yet fully coded, the use case still specifies the required behaviour for implementation and testing.")
);

for (const uc of useCases) {
  children.push(...buildUseCaseNeoTeach(uc));
}

children.push(
  h2("Chapter 2 Summary (Accuracy Anchors)"),
  table(
    ["Topic", "Source of truth used"],
    [
      ["Team / rolls", "Updated proposal: Umair 062, Ali 063, Shahzaib 109"],
      ["Modules", "Updated proposal Modules 1–15"],
      ["Process", "Waterfall (Chapter 1)"],
      ["Roles", "CUSTOMER, DRIVER, ADMIN"],
      ["Dispatch / trip", "Controlled lifecycles; trip only after approve+assign"],
      ["Pricing", "AI estimate + locked base × truckCount + customer proposal within band"],
      ["Assignment", "Admin-mediated willingness then assign (no auto-match)"],
      ["Payments", "Cash + Stripe Test; dual accounting directions"],
      ["Chat", "Types + Cloudinary + Smart Reply (on-device) + 90-day TTL"],
      ["Stack", "NestJS, Flutter Android×2, React Admin, Neon, Redis, OSM, FCM, Cloudinary, Oracle, Vercel"],
      ["Diagrams", "Black-and-white Mermaid; diagram code included under each figure"],
    ],
    [2800, CONTENT_W - 2800]
  ),
  spacer(200),
  p("End of Chapter 2 — Captain Truck Software Requirements Specification (OO Approach)", {
    italics: true,
    align: AlignmentType.CENTER,
  })
);

const doc = new Document({
  styles: {
    default: {
      document: {
        styles: [
          {
            id: "Normal",
            name: "Normal",
            run: { font: FONT, size: 24 },
            paragraph: { spacing: { after: 120, line: 276 } },
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
        run: { font: FONT, size: 32, bold: true },
        paragraph: { spacing: { before: 0, after: 280 }, outlineLevel: 0 },
      },
      {
        id: "Heading2",
        name: "Heading 2",
        basedOn: "Normal",
        next: "Normal",
        quickStyle: true,
        run: { font: FONT, size: 26, bold: true },
        paragraph: { spacing: { before: 280, after: 140 }, outlineLevel: 1 },
      },
      {
        id: "Heading3",
        name: "Heading 3",
        basedOn: "Normal",
        next: "Normal",
        quickStyle: true,
        run: { font: FONT, size: 24, bold: true },
        paragraph: { spacing: { before: 220, after: 120 }, outlineLevel: 2 },
      },
      {
        id: "Heading4",
        name: "Heading 4",
        basedOn: "Normal",
        next: "Normal",
        quickStyle: true,
        run: { font: FONT, size: 22, bold: true },
        paragraph: { spacing: { before: 180, after: 100 }, outlineLevel: 3 },
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
    {
      properties: {
        page: {
          ...pageProps,
          pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL },
        },
      },
      headers: { default: new Header({ children: [new Paragraph({ children: [] })] }) },
      footers: { default: new Footer({ children: [new Paragraph({ children: [] })] }) },
      children: titleChildren,
    },
    {
      properties: {
        page: {
          ...pageProps,
          pageNumbers: { start: 1, formatType: NumberFormat.LOWER_ROMAN },
        },
      },
      headers: { default: new Header({ children: [new Paragraph({ children: [] })] }) },
      footers: { default: neoFooter() },
      children: frontChildren,
    },
    {
      properties: {
        page: {
          ...pageProps,
          pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL },
        },
      },
      headers: { default: new Header({ children: [new Paragraph({ children: [] })] }) },
      footers: { default: neoFooter() },
      children,
    },
  ],
});

Packer.toBuffer(doc)
  .then((buf) => {
    fs.writeFileSync(OUT, buf);
    fs.writeFileSync(OUT_COPY, buf);
    console.log("Wrote", OUT, buf.length);
    console.log("Wrote", OUT_COPY, buf.length);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
