const fs = require("fs");
const path = require("path");

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parse(s) {
  const [d, m, y] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function fmt(d) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${d.getFullYear()}`;
}
function span(a, b) {
  return Math.round((b - a) / 86400000) + 1;
}
function durLabel(days) {
  return days === 1 ? "1 day" : `${days} days`;
}
function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const phases = [
  { name: "Planning", start: "03-09-2026", finish: "14-09-2026", children: [
    ["Project scope", "03-09-2026", "08-09-2026", "Umair"],
    ["Feasibility and work plan", "09-09-2026", "14-09-2026", "Shahzaib"],
  ]},
  { name: "Proposal Writing", start: "16-09-2026", finish: "24-09-2026", children: [
    ["Problem statement", "16-09-2026", "18-09-2026", "Umair"],
    ["Proposal draft", "21-09-2026", "24-09-2026", "Shahzaib"],
  ]},
  { name: "Proposal Submission", start: "25-09-2026", finish: "28-09-2026", children: [
    ["Compile proposal", "25-09-2026", "25-09-2026", "Shahzaib"],
    ["Submit proposal", "28-09-2026", "28-09-2026", "Umair"],
  ]},
  { name: "Proposal Defense", start: "29-09-2026", finish: "09-10-2026", children: [
    ["Defense slides", "29-09-2026", "02-10-2026", "Shahzaib"],
    ["Proposal defense", "05-10-2026", "09-10-2026", "Umair"],
  ]},
  { name: "Requirements", start: "12-10-2026", finish: "23-10-2026", children: [
    ["Requirement gathering", "12-10-2026", "16-10-2026", "Ali"],
    ["SRS", "19-10-2026", "23-10-2026", "Shahzaib"],
  ]},
  { name: "System Design", start: "26-10-2026", finish: "06-11-2026", children: [
    ["Architecture design", "26-10-2026", "30-10-2026", "Umair"],
    ["UI/UX design", "02-11-2026", "06-11-2026", "Shahzaib"],
  ]},
  { name: "Front-End Development", start: "09-11-2026", finish: "27-11-2026", children: [
    ["Mobile app screens", "09-11-2026", "20-11-2026", "Ali"],
    ["Admin panel screens", "23-11-2026", "27-11-2026", "Shahzaib"],
  ]},
  { name: "Progress Report Submission", start: "01-12-2026", finish: "02-12-2026", children: [
    ["Compile progress report", "01-12-2026", "01-12-2026", "Shahzaib"],
    ["Submit progress report", "02-12-2026", "02-12-2026", "Umair"],
  ]},
  { name: "Database Design", start: "03-12-2026", finish: "22-12-2026", children: [
    ["Schema design", "03-12-2026", "11-12-2026", "Umair"],
    ["Migrations and seed", "14-12-2026", "22-12-2026", "Umair"],
  ]},
  { name: "Deliverable 1 Submission", start: "23-12-2026", finish: "24-12-2026", children: [
    ["Package Deliverable 1", "23-12-2026", "23-12-2026", "Shahzaib"],
    ["Submit Deliverable 1", "24-12-2026", "24-12-2026", "Umair"],
  ]},
  { name: "Internal Defense", start: "29-12-2026", finish: "08-01-2027", children: [
    ["Defense material", "29-12-2026", "01-01-2027", "Shahzaib"],
    ["Internal defense", "04-01-2027", "08-01-2027", "Umair"],
  ]},
  { name: "Development Phase (Core Modules, AI Model)", start: "12-01-2027", finish: "25-02-2027", children: [
    ["Core modules", "12-01-2027", "04-02-2027", "Umair"],
    ["AI trip-cost model", "05-02-2027", "17-02-2027", "Ali"],
    ["Admin operations", "18-02-2027", "25-02-2027", "Shahzaib"],
  ]},
  { name: "Integration", start: "26-02-2027", finish: "10-03-2027", children: [
    ["API integration", "26-02-2027", "04-03-2027", "Umair"],
    ["Client integration", "05-03-2027", "10-03-2027", "Ali"],
  ]},
  { name: "Testing and Debugging", start: "11-03-2027", finish: "23-03-2027", children: [
    ["System testing", "11-03-2027", "17-03-2027", "Shahzaib"],
    ["Bug fixing", "18-03-2027", "23-03-2027", "Umair"],
  ]},
  { name: "Optimization", start: "24-03-2027", finish: "05-04-2027", children: [
    ["Performance tuning", "24-03-2027", "30-03-2027", "Umair"],
    ["UI polish", "31-03-2027", "05-04-2027", "Ali"],
  ]},
  { name: "Final Product Delivery", start: "06-04-2027", finish: "16-04-2027", children: [
    ["Final documentation", "06-04-2027", "09-04-2027", "Shahzaib"],
    ["Deployment and handover", "12-04-2027", "16-04-2027", "Umair"],
  ]},
];

const rows = [];
let idn = 1;
rows.push({ id: idn++, name: "Captain Truck", level: 0, summary: true, who: "", start: parse("03-09-2026"), finish: parse("16-04-2027") });
for (const phase of phases) {
  const ps = parse(phase.start);
  const pf = parse(phase.finish);
  rows.push({ id: idn++, name: phase.name, level: 1, summary: true, who: "", start: ps, finish: pf });
  for (const [name, s, f, who] of phase.children) {
    rows.push({ id: idn++, name, level: 2, summary: false, who, start: parse(s), finish: parse(f) });
  }
}
for (const row of rows) row.days = span(row.start, row.finish);

const T0 = parse("01-09-2026");
const T1 = parse("17-04-2027");
const TODAY = parse("17-11-2026");
const SPAN = span(T0, T1);
const PPX = 3.15;
const ROW_H = 20;
const HEAD_H = 22;
const TITLE_H = 34;
const CAP_H = 32;
const COLS = [
  { key: "id", label: "ID", w: 34 },
  { key: "name", label: "Task Name", w: 300 },
  { key: "dur", label: "Duration", w: 72 },
  { key: "start", label: "Start", w: 104 },
  { key: "finish", label: "Finish", w: 104 },
];
const TABLE_W = COLS.reduce((s, c) => s + c.w, 0);
const CHART_W = Math.round((SPAN - 1) * PPX) + PPX + 90;
const WIDTH = TABLE_W + CHART_W;
const GRID_TOP = TITLE_H;
const BODY_TOP = GRID_TOP + HEAD_H * 2;
const HEIGHT = BODY_TOP + rows.length * ROW_H + CAP_H;

function xOf(date) {
  return TABLE_W + Math.round((date - T0) / 86400000) * PPX;
}
function xEnd(date) {
  return xOf(date) + PPX;
}

const months = [];
{
  let cursor = new Date(T0);
  while (cursor <= T1) {
    const y = cursor.getFullYear();
    const m = cursor.getMonth();
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 0);
    months.push({ label: MONTHS[m], start: start < T0 ? T0 : start, end: end > T1 ? T1 : end });
    cursor = new Date(y, m + 1, 1);
  }
}

const parts = [];
parts.push(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;padding:0;background:#fff;}
  *{box-sizing:border-box;}
  body{font-family:"Segoe UI",Calibri,Arial,sans-serif;color:#222;}
  #sheet{position:relative;width:${WIDTH}px;height:${HEIGHT}px;background:#fff;overflow:hidden;}
  .title{position:absolute;left:10px;top:6px;font-size:18px;font-weight:700;}
  .caption{position:absolute;left:0;right:0;bottom:8px;text-align:center;font-size:14px;font-weight:700;font-style:italic;}
  .cell{position:absolute;font-size:11px;line-height:${ROW_H}px;white-space:nowrap;overflow:hidden;border-bottom:1px solid #e4e4e4;border-right:1px solid #ececec;}
  .head{background:#f7f7f7;font-weight:700;color:#222;border-bottom:1px solid #cfcfcf;border-top:1px solid #bfbfbf;}
  .sum{font-weight:700;}
  .vline{position:absolute;top:${GRID_TOP}px;width:1px;background:#eee;}
  .mline{position:absolute;top:${GRID_TOP}px;width:1px;background:#d5d5d5;}
  .today{position:absolute;width:2px;background:#2f9e44;z-index:3;}
  .bar{position:absolute;z-index:2;}
  .leaf{height:9px;background:#2ec4d6;border-radius:1px;}
  .who{position:absolute;z-index:4;font-size:11px;font-weight:700;color:#12869a;line-height:14px;background:#fff;padding:0 3px;}
  .bracket{position:absolute;z-index:2;height:2px;background:#111;}
  .tick{position:absolute;z-index:2;width:2px;background:#111;}
  .mlab{position:absolute;font-size:12px;font-weight:700;text-align:center;line-height:${HEAD_H}px;border-left:1px solid #d5d5d5;border-bottom:1px solid #ddd;background:#f3f6fb;overflow:hidden;color:#1a3d7c;}
  .wlab{position:absolute;font-size:10px;font-weight:600;text-align:center;line-height:${HEAD_H}px;border-left:1px solid #e6e6e6;border-bottom:1px solid #ddd;background:#fff;overflow:hidden;color:#444;}
</style></head><body><div id="sheet"><div class="title">1.7. Gantt chart</div>`);

let hx = 0;
for (const col of COLS) {
  parts.push(`<div class="cell head" style="left:${hx}px;top:${GRID_TOP}px;width:${col.w}px;height:${HEAD_H * 2}px;line-height:${HEAD_H * 2}px;padding-left:6px;border-left:${hx === 0 ? "1px solid #bfbfbf" : "1px solid #ececec"};">${esc(col.label)}</div>`);
  hx += col.w;
}

let weekNum = 1;
for (const mo of months) {
  const left = xOf(mo.start);
  const width = xEnd(mo.end) - left;
  const dim = new Date(mo.start.getFullYear(), mo.start.getMonth() + 1, 0).getDate();
  const visible = span(mo.start, mo.end);
  const nWeeks = visible >= dim - 1 ? 4 : Math.max(2, Math.round((visible / dim) * 4));
  parts.push(`<div class="mlab" style="left:${left}px;top:${GRID_TOP}px;width:${width}px;height:${HEAD_H}px;">${esc(mo.label)}</div>`);
  parts.push(`<div class="mline" style="left:${left}px;height:${HEAD_H * 2 + rows.length * ROW_H}px;"></div>`);
  for (let i = 0; i < nWeeks; i++) {
    const wLeft = left + (width * i) / nWeeks;
    const wWidth = width / nWeeks;
    parts.push(`<div class="wlab" style="left:${wLeft}px;top:${GRID_TOP + HEAD_H}px;width:${wWidth}px;height:${HEAD_H}px;">W${weekNum}</div>`);
    if (i > 0) parts.push(`<div class="vline" style="left:${wLeft}px;height:${HEAD_H * 2 + rows.length * ROW_H}px;"></div>`);
    weekNum++;
  }
}
parts.push(`<div class="today" style="left:${xOf(TODAY)}px;top:${BODY_TOP}px;height:${rows.length * ROW_H}px;"></div>`);

rows.forEach((row, i) => {
  const top = BODY_TOP + i * ROW_H;
  let x = 0;
  const values = { id: String(row.id), name: row.name, dur: durLabel(row.days), start: fmt(row.start), finish: fmt(row.finish) };
  for (const col of COLS) {
    const pad = col.key === "name" ? 6 + row.level * 14 : 6;
    const align = col.key === "id" ? "center" : "left";
    parts.push(`<div class="cell${row.summary ? " sum" : ""}" style="left:${x}px;top:${top}px;width:${col.w}px;height:${ROW_H}px;padding-left:${col.key === "id" ? 0 : pad}px;text-align:${align};font-weight:${row.summary ? 700 : 400};border-left:${x === 0 ? "1px solid #bfbfbf" : "1px solid #ececec"};">${esc(values[col.key])}</div>`);
    x += col.w;
  }
  const yMid = top + ROW_H / 2;
  const x1 = xOf(row.start);
  const drawW = Math.max(row.summary ? 14 : 11, Math.max(2, xEnd(row.finish) - x1));
  if (row.summary) {
    parts.push(`<div class="bracket" style="left:${x1}px;top:${yMid - 1}px;width:${drawW}px;"></div>`);
    parts.push(`<div class="tick" style="left:${x1}px;top:${yMid - 5}px;height:10px;"></div>`);
    parts.push(`<div class="tick" style="left:${x1 + drawW - 1}px;top:${yMid - 5}px;height:10px;"></div>`);
  } else {
    parts.push(`<div class="bar leaf" style="left:${x1}px;top:${yMid - 5}px;width:${drawW}px;"></div>`);
    parts.push(`<div class="who" style="left:${x1 + drawW + 3}px;top:${yMid - 7}px;">${esc(row.who)}</div>`);
  }
});
parts.push(`<div class="caption">Figure 1.7.1: Gantt Chart</div></div></body></html>`);

const outDir = __dirname;
fs.writeFileSync(path.join(outDir, "_gantt_cal.html"), parts.join("\n"), "utf8");

function indentName(row) {
  return "&nbsp;".repeat(row.level * 4) + row.name;
}
const tableLines = ["| ID | Task Name | Duration | Start | Finish |", "|---:|---|---:|---|---|"];
for (const row of rows) {
  tableLines.push(`| ${row.id} | ${indentName(row)} | ${durLabel(row.days)} | ${fmt(row.start)} | ${fmt(row.finish)} |`);
}
const mermaid = ["```mermaid", "gantt", "    title Captain Truck", "    dateFormat DD-MM-YYYY", "    axisFormat %d-%m-%Y"];
for (const row of rows) {
  if (row.level === 0) continue;
  if (row.level === 1) {
    mermaid.push("");
    mermaid.push(`    section ${row.name}`);
    continue;
  }
  mermaid.push(`    ${row.name.replace(/:/g, " -")} :${fmt(row.start)}, ${fmt(row.finish)}`);
}
mermaid.push("```");

const md = `# 1.7. Gantt chart

The Captain Truck schedule runs from September 2026 to 17 April 2027. Each phase has the sub-tasks that sit inside it, with duration, start and finish, in the same layout as a project Gantt. 17 April 2027 is a Saturday, so the last day on the chart is 16 April 2027.

Black bars are summary tasks. Teal bars are the sub-tasks, labelled with the member who owns them (Umair, Ali, Shahzaib). The green line is 17 November 2026. Duration is every calendar day from the start date to the finish date. Dates are dd-mm-yyyy.

![Figure 1.7.1: Gantt Chart](figures/captain-truck-gantt.png)

*Figure 1.7.1: Gantt Chart*

## Schedule

${tableLines.join("\n")}

## Mermaid

${mermaid.join("\n")}
`;
fs.writeFileSync(path.join(outDir, "..", "gantt-chart.md"), md, "utf8");
fs.writeFileSync(path.join(outDir, "_gantt_meta.json"), JSON.stringify({ width: WIDTH, height: HEIGHT }, null, 2));
console.log("PROJECT", rows[0].days, "days", WIDTH, HEIGHT);
console.log(rows.filter((r) => r.level <= 1).map((r) => `${r.name}: ${r.days}`).join("\n"));
