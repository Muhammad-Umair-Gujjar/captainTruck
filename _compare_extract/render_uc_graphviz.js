/**
 * NeoTeach-style UML use-case diagrams via Graphviz (Kroki)
 * — every actor↔module association is an explicit edge (no dropped links).
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const OUT = path.join("D:", "vally", "captain_truck", "docs", "figures");

const HIGH = `
digraph HIGH {
  graph [rankdir=LR, bgcolor="white", fontname="Times New Roman", fontsize=14, nodesep=0.35, ranksep=1.2, splines=true, pad=0.3];
  node  [fontname="Times New Roman", fontsize=11];
  edge  [color="black", arrowsize=0.6];

  subgraph cluster_humans {
    graph [label="", color="white", pencolor="white"];
    Customer [shape=box, style="rounded", label="Customer", width=1.4, height=0.55];
    Driver   [shape=box, style="rounded", label="Driver", width=1.4, height=0.55];
    Admin    [shape=box, style="rounded", label="Administrator", width=1.5, height=0.55];
  }

  subgraph cluster_system {
    graph [label=<<B>Captain Truck</B>>, labelloc=t, fontsize=14,
           color="black", bgcolor="white", style="rounded", penwidth=1.5, margin=18];
    node [shape=ellipse, style="solid", color="black", fillcolor="white",
          width=2.4, height=0.7, fixedsize=false];

    UC_Auth     [label="Authentication &\\nRegistration"];
    UC_Users    [label="Profile &\\nUser Management"];
    UC_Catalog  [label="Truck Types &\\nBase Rates"];
    UC_Dispatch [label="Dispatch &\\nRoute Selection"];
    UC_Fare     [label="AI Fare Estimate &\\nCustomer Proposal"];
    UC_Assign   [label="Approval, Willingness\\n& Assignment"];
    UC_Trip     [label="Trip Ops, GPS &\\nOffline Maps"];
    UC_Chat     [label="Chat & Media"];
    UC_Pay      [label="Payments\\n(Cash / Stripe Test)"];
    UC_Ledger   [label="Commission Ledger"];
    UC_Push     [label="Push Notifications"];
    UC_Ops      [label="Admin Ops Panel"];
  }

  subgraph cluster_ext {
    graph [label="", color="white", pencolor="white"];
    OSM        [shape=box, style="rounded", label="OSM Services", width=1.5, height=0.5];
    Stripe     [shape=box, style="rounded", label="Stripe Test Mode", width=1.6, height=0.5];
    Cloudinary [shape=box, style="rounded", label="Cloudinary", width=1.4, height=0.5];
    FCM        [shape=box, style="rounded", label="FCM", width=1.2, height=0.5];
    DB [shape=cylinder, width=1.3, height=0.9, label="Neon\\nPostgreSQL",
        style="solid", color="black", fillcolor="white", fontsize=10];
  }

  /* Customer — 9 associations */
  Customer -> UC_Auth;
  Customer -> UC_Users;
  Customer -> UC_Catalog;
  Customer -> UC_Dispatch;
  Customer -> UC_Fare;
  Customer -> UC_Trip;
  Customer -> UC_Chat;
  Customer -> UC_Pay;
  Customer -> UC_Push;

  /* Driver — 7 (NO register / NO catalog / NO fare propose / NO ledger / NO ops) */
  Driver -> UC_Auth;
  Driver -> UC_Users;
  Driver -> UC_Assign;
  Driver -> UC_Trip;
  Driver -> UC_Chat;
  Driver -> UC_Pay;
  Driver -> UC_Push;

  /* Admin — 8 (NO register-as-customer, NO fare propose, NO push tokens) */
  Admin -> UC_Auth;
  Admin -> UC_Users;
  Admin -> UC_Catalog;
  Admin -> UC_Assign;
  Admin -> UC_Trip;
  Admin -> UC_Chat;
  Admin -> UC_Ledger;
  Admin -> UC_Ops;

  /* Secondary */
  OSM -> UC_Dispatch;
  Stripe -> UC_Pay;
  Cloudinary -> UC_Chat;
  FCM -> UC_Push;
  DB -> UC_Auth;
  DB -> UC_Dispatch;
  DB -> UC_Assign;
  DB -> UC_Pay;
  DB -> UC_Ledger;
}
`;

const ANALYSIS = `
digraph ANALYSIS {
  graph [rankdir=TB, bgcolor="white", fontname="Times New Roman", fontsize=12,
         nodesep=0.25, ranksep=0.55, splines=spline, pad=0.25, concentrate=false];
  node  [fontname="Times New Roman", fontsize=9];
  edge  [color="black", arrowsize=0.5];

  Customer [shape=plaintext, label=<<B>Customer</B>>];
  Driver [shape=plaintext, label=<<B>Driver</B>>];
  Admin [shape=plaintext, label=<<B>Administrator</B>>];
  OSM [shape=plaintext, label=<<B>OSM</B>>];
  Stripe [shape=plaintext, label=<<B>Stripe</B>>];
  Cloudinary [shape=plaintext, label=<<B>Cloudinary</B>>];
  FCM [shape=plaintext, label=<<B>FCM</B>>];
  DB [shape=cylinder, width=0.9, height=0.55, label="Neon DB", fontsize=8];

  subgraph cluster_sys {
    graph [label=<<B>Captain Truck</B>>, labelloc=t, fontsize=13,
           color="black", bgcolor="white", style="rounded", penwidth=1.4, margin=12];
    node [shape=ellipse, style="solid", color="black", fillcolor="white"];

    subgraph cluster_auth {
      graph [label="1. Auth", fontsize=10, color="black", bgcolor="white"];
      R [label="UC_Register_Customer"];
      L [label="UC_Login"];
      S [label="UC_Session_Manage"];
      ME [label="UC_Get_Me"];
    }
    subgraph cluster_users {
      graph [label="2. Profiles / Users", fontsize=10, color="black", bgcolor="white"];
      UP [label="UC_Update_Profile"];
      AU [label="UC_Admin_Manage_Users"];
      AD [label="UC_Admin_Create_Driver"];
    }
    subgraph cluster_cat {
      graph [label="3. Truck Types & Rates", fontsize=10, color="black", bgcolor="white"];
      LT [label="UC_List_Truck_Types"];
      TT [label="UC_Admin_Truck_Types"];
      BR [label="UC_Admin_Base_Rates"];
    }
    subgraph cluster_disp {
      graph [label="4-6. Dispatch / Route / Fare", fontsize=10, color="black", bgcolor="white"];
      CD [label="UC_Create_Dispatch"];
      VD [label="UC_View_Dispatches"];
      CX [label="UC_Cancel_Dispatch"];
      GR [label="UC_Generate_Routes"];
      SR [label="UC_Select_Route"];
      CB [label="UC_Compute_Bill"];
      PF [label="UC_Propose_Fare"];
      SR -> GR [style=dashed, label=<<FONT POINT-SIZE="7">&lt;&lt;include&gt;&gt;</FONT>>];
      PF -> CB [style=dashed, label=<<FONT POINT-SIZE="7">&lt;&lt;include&gt;&gt;</FONT>>];
    }
    subgraph cluster_asg {
      graph [label="7. Approval / Willingness / Assign", fontsize=10, color="black", bgcolor="white"];
      AR [label="UC_Admin_Review_Dispatch"];
      AJ [label="UC_Admin_Reject_Dispatch"];
      DW [label="UC_Driver_Willingness"];
      AA [label="UC_Admin_Assign_Driver"];
      AJ -> AR [style=dashed, label=<<FONT POINT-SIZE="7">&lt;&lt;extend&gt;&gt;</FONT>>];
      AA -> DW [style=dashed, label=<<FONT POINT-SIZE="7">&lt;&lt;include&gt;&gt;</FONT>>];
    }
    subgraph cluster_trip {
      graph [label="8-9. Trip / GPS / Offline", fontsize=10, color="black", bgcolor="white"];
      US [label="UC_Update_Trip_Status"];
      TG [label="UC_Track_Trip_GPS"];
      OM [label="UC_Offline_Maps"];
      CP [label="UC_Complete_Trip"];
      OM -> TG [style=dashed, label=<<FONT POINT-SIZE="7">&lt;&lt;extend&gt;&gt;</FONT>>];
    }
    subgraph cluster_chat {
      graph [label="10-11. Chat & Media", fontsize=10, color="black", bgcolor="white"];
      CH [label="UC_Chat_Message"];
      UM [label="UC_Upload_Media"];
      UM -> CH [style=dashed, label=<<FONT POINT-SIZE="7">&lt;&lt;extend&gt;&gt;</FONT>>];
    }
    subgraph cluster_pay {
      graph [label="12-13. Payments & Ledger", fontsize=10, color="black", bgcolor="white"];
      PY [label="UC_Pay_Trip"];
      CC [label="UC_Confirm_Commission"];
      LA [label="UC_Ledger_Adjust"];
    }
    subgraph cluster_ops {
      graph [label="14-15. Push & Admin UI", fontsize=10, color="black", bgcolor="white"];
      PT [label="UC_Manage_Push_Tokens"];
      AP [label="UC_Admin_Ops_Panel"];
    }
  }

  /* Customer */
  Customer -> R; Customer -> L; Customer -> S; Customer -> ME;
  Customer -> UP; Customer -> LT;
  Customer -> CD; Customer -> VD; Customer -> CX;
  Customer -> GR; Customer -> SR; Customer -> CB; Customer -> PF;
  Customer -> TG; Customer -> CH; Customer -> UM; Customer -> PY; Customer -> PT;

  /* Driver — no Register */
  Driver -> L; Driver -> S; Driver -> ME; Driver -> UP; Driver -> DW;
  Driver -> US; Driver -> TG; Driver -> OM; Driver -> CP;
  Driver -> CH; Driver -> UM; Driver -> PY; Driver -> PT;

  /* Admin */
  Admin -> L; Admin -> S; Admin -> ME;
  Admin -> AU; Admin -> AD; Admin -> TT; Admin -> BR;
  Admin -> AR; Admin -> AJ; Admin -> DW; Admin -> AA;
  Admin -> US; Admin -> TG; Admin -> CP;
  Admin -> CH; Admin -> UM; Admin -> CC; Admin -> LA; Admin -> AP;

  /* Secondary */
  OSM -> GR;
  Stripe -> PY;
  Cloudinary -> UM;
  FCM -> PT;
  DB -> L; DB -> CD; DB -> AA; DB -> PY; DB -> CC;
}
`;

function krokiUrl(src, type) {
  const compressed = zlib.deflateSync(Buffer.from(src, "utf8"), { level: 9 });
  const b64 = compressed.toString("base64").replace(/\+/g, "-").replace(/\//g, "_");
  return `https://kroki.io/${type}/png/${b64}`;
}

async function render(name, src) {
  const res = await fetch(krokiUrl(src, "graphviz"));
  if (!res.ok) throw new Error(`${name} ${res.status} ${(await res.text()).slice(0, 400)}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf[0] !== 0x89) throw new Error(`${name} not PNG`);
  fs.writeFileSync(path.join(OUT, name), buf);
  console.log("OK", name, buf.length);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, "_high_level.dot"), HIGH);
  fs.writeFileSync(path.join(OUT, "_analysis_level.dot"), ANALYSIS);
  await render("Figure_2_2_10_1_High_Level_Usecase.png", HIGH);
  await render("Figure_2_2_11_1_Analysis_Level_Usecase.png", ANALYSIS);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
