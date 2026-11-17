/**
 * Render Captain Truck Ch2 use-case diagrams in NeoTeach UML style via Kroki PlantUML.
 * Overwrites:
 *   docs/figures/Figure_2_2_10_1_High_Level_Usecase.png
 *   docs/figures/Figure_2_2_11_1_Analysis_Level_Usecase.png
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const FIG = path.join("D:", "vally", "captain_truck", "docs", "figures");

const HIGH_LEVEL = `
@startuml
skinparam monochrome true
skinparam shadowing false
skinparam defaultFontName "Times New Roman"
skinparam defaultFontSize 13
skinparam ActorBackgroundColor white
skinparam ActorBorderColor black
skinparam UsecaseBackgroundColor white
skinparam UsecaseBorderColor black
skinparam RectangleBackgroundColor white
skinparam RectangleBorderColor black
skinparam ArrowColor black
skinparam Padding 4
left to right direction

actor "Customer" as Customer
actor "Driver" as Driver
actor "Administrator" as Admin

actor "OSM Services" as OSM
actor "Stripe\\nTest Mode" as Stripe
actor "Cloudinary" as Cloudinary
actor "FCM" as FCM
database "Neon\\nPostgreSQL" as DB

rectangle "Captain Truck: Real-Time Logistics and Dispatch Platform" {
  usecase "Authentication\\n& Registration" as AUTH
  usecase "Profile &\\nUser Management" as PROF
  usecase "Truck Types\\n& Base Rates" as RATES
  usecase "Dispatch &\\nRoute Selection" as DISP
  usecase "AI Fare Estimate\\n& Customer Proposal" as FARE
  usecase "Approval, Willingness\\n& Assignment" as ASSIGN
  usecase "Trip Ops, GPS\\n& Offline Maps" as TRIP
  usecase "Chat & Media" as CHAT
  usecase "Payments\\n(Cash / Stripe Test)" as PAY
  usecase "Commission Ledger" as LEDG
  usecase "Push Notifications" as PUSH
  usecase "Admin Ops Panel" as OPS
}

' --- Customer ---
Customer --> AUTH
Customer --> PROF
Customer --> DISP
Customer --> FARE
Customer --> TRIP
Customer --> CHAT
Customer --> PAY
Customer --> PUSH

' --- Driver (no public register; uses Auth for login) ---
Driver --> AUTH
Driver --> PROF
Driver --> ASSIGN
Driver --> TRIP
Driver --> CHAT
Driver --> PAY
Driver --> PUSH

' --- Administrator ---
Admin --> AUTH
Admin --> PROF
Admin --> RATES
Admin --> ASSIGN
Admin --> TRIP
Admin --> CHAT
Admin --> LEDG
Admin --> OPS

' --- External systems (NeoTeach-style) ---
OSM --> DISP
Stripe --> PAY
Cloudinary --> CHAT
FCM --> PUSH

DB -- AUTH
DB -- PROF
DB -- RATES
DB -- DISP
DB -- FARE
DB -- ASSIGN
DB -- TRIP
DB -- CHAT
DB -- PAY
DB -- LEDG
DB -- PUSH
DB -- OPS

@enduml
`.trim();

const ANALYSIS = `
@startuml
skinparam monochrome true
skinparam shadowing false
skinparam defaultFontName "Times New Roman"
skinparam defaultFontSize 11
skinparam ActorBackgroundColor white
skinparam ActorBorderColor black
skinparam UsecaseBackgroundColor white
skinparam UsecaseBorderColor black
skinparam PackageBackgroundColor white
skinparam PackageBorderColor black
skinparam ArrowColor black
skinparam Padding 2
top to bottom direction

actor "Customer" as Customer
actor "Driver" as Driver
actor "Administrator" as Admin

rectangle "Captain Truck: Real-Time Logistics and Dispatch Platform" {
  package "1. Auth" as P1 {
    usecase "UC_Register_Customer" as R
    usecase "UC_Login" as L
    usecase "UC_Session_Manage" as S
    usecase "UC_Get_Me" as ME
  }

  package "2. Profiles / Users" as P2 {
    usecase "UC_Update_Profile" as UP
    usecase "UC_Admin_Manage_Users" as AU
    usecase "UC_Admin_Create_Driver" as AD
  }

  package "3. Truck Types & Rates" as P3 {
    usecase "UC_List_Truck_Types" as LT
    usecase "UC_Admin_Truck_Types" as TT
    usecase "UC_Admin_Base_Rates" as BR
  }

  package "4-6. Dispatch / Route / Fare" as P4 {
    usecase "UC_Create_Dispatch" as CD
    usecase "UC_View_Dispatches" as VD
    usecase "UC_Cancel_Dispatch" as CX
    usecase "UC_Generate_Routes" as GR
    usecase "UC_Select_Route" as SR
    usecase "UC_Compute_Bill" as CB
    usecase "UC_Propose_Fare" as PF
  }

  package "7. Approval / Willingness / Assign" as P7 {
    usecase "UC_Admin_Review_Dispatch" as AR
    usecase "UC_Admin_Reject_Dispatch" as AJ
    usecase "UC_Driver_Willingness" as DW
    usecase "UC_Admin_Assign_Driver" as AA
  }

  package "8-9. Trip / GPS / Offline" as P8 {
    usecase "UC_Update_Trip_Status" as US
    usecase "UC_Track_Trip_GPS" as TG
    usecase "UC_Offline_Maps" as OM
    usecase "UC_Complete_Trip" as CP
  }

  package "10-11. Chat & Media" as P10 {
    usecase "UC_Chat_Message" as CH
    usecase "UC_Upload_Media" as UM
  }

  package "12-13. Payments & Ledger" as P12 {
    usecase "UC_Pay_Trip" as PY
    usecase "UC_Confirm_Commission" as CC
    usecase "UC_Ledger_Adjust" as LA
  }

  package "14-15. Push & Admin UI" as P14 {
    usecase "UC_Manage_Push_Tokens" as PT
    usecase "UC_Admin_Ops_Panel" as AP
  }
}

' Customer associations
Customer --> R
Customer --> L
Customer --> S
Customer --> ME
Customer --> UP
Customer --> LT
Customer --> CD
Customer --> VD
Customer --> CX
Customer --> GR
Customer --> SR
Customer --> CB
Customer --> PF
Customer --> TG
Customer --> CH
Customer --> UM
Customer --> PY
Customer --> PT

' Driver associations (no register)
Driver --> L
Driver --> S
Driver --> ME
Driver --> UP
Driver --> DW
Driver --> US
Driver --> TG
Driver --> OM
Driver --> CP
Driver --> CH
Driver --> UM
Driver --> PY
Driver --> PT

' Admin associations
Admin --> L
Admin --> S
Admin --> ME
Admin --> AU
Admin --> AD
Admin --> TT
Admin --> BR
Admin --> AR
Admin --> AJ
Admin --> DW
Admin --> AA
Admin --> US
Admin --> TG
Admin --> CP
Admin --> CH
Admin --> UM
Admin --> CC
Admin --> LA
Admin --> AP

@enduml
`.trim();

function krokiUrl(diagram, type) {
  const compressed = zlib.deflateSync(Buffer.from(diagram, "utf8"), { level: 9 });
  const b64 = compressed
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return `https://kroki.io/${type}/png/` + b64;
}

async function render(diagram, file, type = "plantuml") {
  const url = krokiUrl(diagram, type);
  const res = await fetch(url);
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`${file} HTTP ${res.status}: ${t.slice(0, 300)}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 200 || buf[0] !== 0x89) {
    throw new Error(`${file} bad PNG (${buf.length} bytes)`);
  }
  const out = path.join(FIG, file);
  fs.writeFileSync(out, buf);
  console.log("OK", file, buf.length);
  return out;
}

(async () => {
  fs.mkdirSync(FIG, { recursive: true });
  // also save plantuml sources next to figures for rebuild
  fs.writeFileSync(path.join(FIG, "Figure_2_2_10_1_High_Level_Usecase.puml"), HIGH_LEVEL);
  fs.writeFileSync(path.join(FIG, "Figure_2_2_11_1_Analysis_Level_Usecase.puml"), ANALYSIS);
  await render(HIGH_LEVEL, "Figure_2_2_10_1_High_Level_Usecase.png");
  await render(ANALYSIS, "Figure_2_2_11_1_Analysis_Level_Usecase.png");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
