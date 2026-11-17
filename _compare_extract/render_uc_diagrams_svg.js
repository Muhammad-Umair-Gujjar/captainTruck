/**
 * Hand-craft NeoTeach-style UML use-case diagrams (SVG → PNG via Kroki/SVG or sharp-free approach).
 * Uses pure SVG written to disk, then converted with kroki/diagrams.net-free path:
 *   render SVG with resvg-free fallback = embed SVG as PNG via "svg" kroki OR use puppeteer-less
 *   Here: write SVG, convert with kroki "svgbob" won't work — use plantuml sprite-free custom SVG
 *   and convert SVG→PNG with the built-in Windows / sharp / resvg.
 *
 * Primary path: write high-quality SVG, then use kroki mermaid? No.
 * Convert via: https://kroki.io doesn't take raw SVG.
 * Use: npx @resvg/resvg-js OR magick OR PowerShell + Edge — try resvg via dynamic import from CDN fetch of png from a data URL using "svgexport" 
 *
 * Simplest reliable on this machine: generate SVG, then use Word/Chrome-less conversion
 * via `npx --yes @aspect-ratio/...` — use `sharp` if available, else `pngjs`+manual, else
 * call PowerShell Add-Type System.Drawing for SVG? System.Drawing doesn't do SVG.
 *
 * Best: use plantuml with VERY explicit layout, OR use graphviz through kroki.
 *
 * This script generates Graphviz DOT (closest controllable UML-ish layout) via kroki graphviz.
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const FIG = path.join("D:", "vally", "captain_truck", "docs", "figures");

function kroki(type, source) {
  const compressed = zlib.deflateSync(Buffer.from(source, "utf8"), { level: 9 });
  const b64 = compressed.toString("base64").replace(/\+/g, "-").replace(/\//g, "_");
  return `https://kroki.io/${type}/png/` + b64;
}

async function render(type, source, file) {
  const res = await fetch(kroki(type, source));
  if (!res.ok) throw new Error(file + " " + res.status + " " + (await res.text()).slice(0, 200));
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf[0] !== 0x89) throw new Error(file + " not png");
  fs.writeFileSync(path.join(FIG, file), buf);
  console.log("OK", file, buf.length);
}

/**
 * High-level — NeoTeach visual: vertical use-case ovals, humans LEFT, externals RIGHT.
 * Graphviz with ellipse nodes.
 */
const HIGH_DOT = `
digraph HighLevelUC {
  graph [rankdir=LR, bgcolor=white, pad=0.4, nodesep=0.35, ranksep=1.4, splines=line, fontname="Times New Roman"];
  node  [fontname="Times New Roman", fontsize=11, color=black, fontcolor=black];
  edge  [color=black, arrowsize=0.6, penwidth=1.0];

  // Human actors (left)
  subgraph cluster_humans {
    graph [style=invis];
    Customer [shape=plaintext, label=<
      <TABLE BORDER="0" CELLBORDER="0" CELLPADDING="2">
        <TR><TD><FONT POINT-SIZE="22">👤</FONT></TD></TR>
        <TR><TD>Customer</TD></TR>
      </TABLE>>];
    Driver [shape=plaintext, label=<
      <TABLE BORDER="0" CELLBORDER="0" CELLPADDING="2">
        <TR><TD><FONT POINT-SIZE="22">👤</FONT></TD></TR>
        <TR><TD>Driver</TD></TR>
      </TABLE>>];
    Admin [shape=plaintext, label=<
      <TABLE BORDER="0" CELLBORDER="0" CELLPADDING="2">
        <TR><TD><FONT POINT-SIZE="22">👤</FONT></TD></TR>
        <TR><TD>Administrator</TD></TR>
      </TABLE>>];
  }

  // System boundary
  subgraph cluster_system {
    label="Captain Truck: Real-Time Logistics and Dispatch Platform";
    labelloc=t;
    fontsize=13;
    fontname="Times New Roman";
    style=rounded;
    color=black;
    bgcolor=white;
    margin=18;

    node [shape=ellipse, style=solid, width=2.6, height=0.55, fixedsize=true, fontsize=10];

    AUTH   [label="Authentication\\n& Registration"];
    PROF   [label="Profile &\\nUser Management"];
    RATES  [label="Truck Types\\n& Base Rates"];
    DISP   [label="Dispatch &\\nRoute Selection"];
    FARE   [label="AI Fare Estimate\\n& Customer Proposal"];
    ASSIGN [label="Approval, Willingness\\n& Assignment"];
    TRIP   [label="Trip Ops, GPS\\n& Offline Maps"];
    CHAT   [label="Chat & Media"];
    PAY    [label="Payments\\n(Cash / Stripe Test)"];
    LEDG   [label="Commission Ledger"];
    PUSH   [label="Push Notifications"];
    OPS    [label="Admin Ops Panel"];

    // force vertical order
    AUTH -> PROF -> RATES -> DISP -> FARE -> ASSIGN -> TRIP -> CHAT -> PAY -> LEDG -> PUSH -> OPS [style=invis, weight=10];
  }

  // External systems (right)
  subgraph cluster_ext {
    graph [style=invis];
    OSM [shape=plaintext, label=<
      <TABLE BORDER="0" CELLBORDER="0" CELLPADDING="2">
        <TR><TD><FONT POINT-SIZE="22">👤</FONT></TD></TR>
        <TR><TD>OSM Services</TD></TR>
      </TABLE>>];
    Stripe [shape=plaintext, label=<
      <TABLE BORDER="0" CELLBORDER="0" CELLPADDING="2">
        <TR><TD><FONT POINT-SIZE="22">👤</FONT></TD></TR>
        <TR><TD>Stripe Test Mode</TD></TR>
      </TABLE>>];
    Cloudinary [shape=plaintext, label=<
      <TABLE BORDER="0" CELLBORDER="0" CELLPADDING="2">
        <TR><TD><FONT POINT-SIZE="22">👤</FONT></TD></TR>
        <TR><TD>Cloudinary</TD></TR>
      </TABLE>>];
    FCM [shape=plaintext, label=<
      <TABLE BORDER="0" CELLBORDER="0" CELLPADDING="2">
        <TR><TD><FONT POINT-SIZE="22">👤</FONT></TD></TR>
        <TR><TD>FCM</TD></TR>
      </TABLE>>];
    DB [shape=cylinder, width=1.15, height=0.7, label="Neon\\nPostgreSQL", fontsize=10];
  }

  // Customer relations
  Customer -> AUTH; Customer -> PROF; Customer -> DISP; Customer -> FARE;
  Customer -> TRIP; Customer -> CHAT; Customer -> PAY; Customer -> PUSH;

  // Driver relations (login via Auth; no public register oval separate)
  Driver -> AUTH; Driver -> PROF; Driver -> ASSIGN; Driver -> TRIP;
  Driver -> CHAT; Driver -> PAY; Driver -> PUSH;

  // Admin relations
  Admin -> AUTH; Admin -> PROF; Admin -> RATES; Admin -> ASSIGN;
  Admin -> TRIP; Admin -> CHAT; Admin -> LEDG; Admin -> OPS;

  // Externals
  OSM -> DISP; Stripe -> PAY; Cloudinary -> CHAT; FCM -> PUSH;

  // DB to all modules (NeoTeach style)
  AUTH -> DB; PROF -> DB; RATES -> DB; DISP -> DB; FARE -> DB; ASSIGN -> DB;
  TRIP -> DB; CHAT -> DB; PAY -> DB; LEDG -> DB; PUSH -> DB; OPS -> DB;
}
`.trim();

/**
 * Analysis — NeoTeach style: actors associate to MODULE packages;
 * leaf use cases sit inside packages (reduces spaghetti).
 */
const ANALYSIS_DOT = `
digraph AnalysisUC {
  graph [rankdir=TB, bgcolor=white, pad=0.35, nodesep=0.25, ranksep=0.7, splines=spline, fontname="Times New Roman", compound=true];
  node  [fontname="Times New Roman", fontsize=10, color=black, fontcolor=black];
  edge  [color=black, arrowsize=0.55, penwidth=0.9];

  Customer [shape=plaintext, label=<
    <TABLE BORDER="0" CELLBORDER="0" CELLPADDING="2">
      <TR><TD><FONT POINT-SIZE="20">👤</FONT></TD></TR>
      <TR><TD><B>Customer</B></TD></TR>
    </TABLE>>];
  Driver [shape=plaintext, label=<
    <TABLE BORDER="0" CELLBORDER="0" CELLPADDING="2">
      <TR><TD><FONT POINT-SIZE="20">👤</FONT></TD></TR>
      <TR><TD><B>Driver</B></TD></TR>
    </TABLE>>];
  Admin [shape=plaintext, label=<
    <TABLE BORDER="0" CELLBORDER="0" CELLPADDING="2">
      <TR><TD><FONT POINT-SIZE="20">👤</FONT></TD></TR>
      <TR><TD><B>Administrator</B></TD></TR>
    </TABLE>>];

  subgraph cluster_system {
    label="Captain Truck: Real-Time Logistics and Dispatch Platform";
    labelloc=t;
    fontsize=13;
    fontname="Times New Roman";
    style=rounded;
    color=black;
    bgcolor=white;
    margin=16;

    node [shape=ellipse, fontsize=9, width=1.7, height=0.42, fixedsize=true];

    subgraph cluster_p1 {
      label="1. Auth"; style=rounded; color=black; bgcolor=white;
      R [label="UC_Register_Customer"];
      L [label="UC_Login"];
      S [label="UC_Session_Manage"];
      ME [label="UC_Get_Me"];
    }
    subgraph cluster_p2 {
      label="2. Profiles / Users"; style=rounded; color=black; bgcolor=white;
      UP [label="UC_Update_Profile"];
      AU [label="UC_Admin_Manage_Users"];
      AD [label="UC_Admin_Create_Driver"];
    }
    subgraph cluster_p3 {
      label="3. Truck Types & Rates"; style=rounded; color=black; bgcolor=white;
      LT [label="UC_List_Truck_Types"];
      TT [label="UC_Admin_Truck_Types"];
      BR [label="UC_Admin_Base_Rates"];
    }
    subgraph cluster_p4 {
      label="4–6. Dispatch / Route / Fare"; style=rounded; color=black; bgcolor=white;
      CD [label="UC_Create_Dispatch"];
      VD [label="UC_View_Dispatches"];
      CX [label="UC_Cancel_Dispatch"];
      GR [label="UC_Generate_Routes"];
      SR [label="UC_Select_Route"];
      CB [label="UC_Compute_Bill"];
      PF [label="UC_Propose_Fare"];
    }
    subgraph cluster_p7 {
      label="7. Approval / Willingness / Assign"; style=rounded; color=black; bgcolor=white;
      AR [label="UC_Admin_Review_Dispatch"];
      AJ [label="UC_Admin_Reject_Dispatch"];
      DW [label="UC_Driver_Willingness"];
      AA [label="UC_Admin_Assign_Driver"];
    }
    subgraph cluster_p8 {
      label="8–9. Trip / GPS / Offline"; style=rounded; color=black; bgcolor=white;
      US [label="UC_Update_Trip_Status"];
      TG [label="UC_Track_Trip_GPS"];
      OM [label="UC_Offline_Maps"];
      CP [label="UC_Complete_Trip"];
    }
    subgraph cluster_p10 {
      label="10–11. Chat & Media"; style=rounded; color=black; bgcolor=white;
      CH [label="UC_Chat_Message"];
      UM [label="UC_Upload_Media"];
    }
    subgraph cluster_p12 {
      label="12–13. Payments & Ledger"; style=rounded; color=black; bgcolor=white;
      PY [label="UC_Pay_Trip"];
      CC [label="UC_Confirm_Commission"];
      LA [label="UC_Ledger_Adjust"];
    }
    subgraph cluster_p14 {
      label="14–15. Push & Admin UI"; style=rounded; color=black; bgcolor=white;
      PT [label="UC_Manage_Push_Tokens"];
      AP [label="UC_Admin_Ops_Panel"];
    }
  }

  // Customer → modules (key use cases)
  Customer -> R; Customer -> L; Customer -> UP; Customer -> LT;
  Customer -> CD; Customer -> GR; Customer -> PF;
  Customer -> TG; Customer -> CH; Customer -> PY; Customer -> PT;

  // Driver
  Driver -> L; Driver -> UP; Driver -> DW;
  Driver -> US; Driver -> TG; Driver -> OM; Driver -> CP;
  Driver -> CH; Driver -> PY; Driver -> PT;

  // Admin
  Admin -> L; Admin -> AU; Admin -> AD; Admin -> TT; Admin -> BR;
  Admin -> AR; Admin -> AJ; Admin -> DW; Admin -> AA;
  Admin -> US; Admin -> TG; Admin -> CP;
  Admin -> CH; Admin -> CC; Admin -> LA; Admin -> AP;
}
`.trim();

(async () => {
  fs.mkdirSync(FIG, { recursive: true });
  fs.writeFileSync(path.join(FIG, "Figure_2_2_10_1_High_Level_Usecase.dot"), HIGH_DOT);
  fs.writeFileSync(path.join(FIG, "Figure_2_2_11_1_Analysis_Level_Usecase.dot"), ANALYSIS_DOT);
  await render("graphviz", HIGH_DOT, "Figure_2_2_10_1_High_Level_Usecase.png");
  await render("graphviz", ANALYSIS_DOT, "Figure_2_2_11_1_Analysis_Level_Usecase.png");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
