/**
 * Render Captain Truck use-case diagrams (PlantUML / UML style via Kroki).
 * Overwrites:
 *  - docs/figures/Figure_2_2_10_1_High_Level_Usecase.png
 *  - docs/figures/Figure_2_2_11_1_Analysis_Level_Usecase.png
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const OUT = path.join("D:", "vally", "captain_truck", "docs", "figures");

function krokiPngUrl(plantuml) {
  const compressed = zlib.deflateSync(Buffer.from(plantuml, "utf8"), { level: 9 });
  const b64 = compressed
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return "https://kroki.io/plantuml/png/" + b64;
}

async function render(plantuml, file) {
  const url = krokiPngUrl(plantuml);
  const res = await fetch(url);
  if (!res.ok) {
    const t = await res.text();
    throw new Error(file + " HTTP " + res.status + " " + t.slice(0, 300));
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 200) throw new Error(file + " tiny response");
  fs.writeFileSync(path.join(OUT, file), buf);
  console.log("OK", file, buf.length);
}

const HIGH = `
@startuml
skinparam monochrome true
skinparam shadowing false
skinparam defaultFontName Arial
skinparam defaultFontSize 13
skinparam actorStyle awesome
skinparam packageStyle rectangle
skinparam usecase {
  BackgroundColor White
  BorderColor Black
  FontSize 12
}
skinparam actor {
  BackgroundColor White
  BorderColor Black
}
left to right direction

actor "Customer" as Customer
actor "Driver" as Driver
actor "Administrator" as Admin
actor "PostgreSQL" as DB
actor "Payment Gateway" as PayGW

rectangle "Captain Truck" {
  usecase "Register Customer" as UC_Reg
  usecase "Login / Session" as UC_Login
  usecase "Manage Profile" as UC_Prof
  usecase "Manage Dispatch" as UC_Disp
  usecase "Select Route and Propose Fare" as UC_Route
  usecase "Pay Trip / Confirm Cash" as UC_Pay
  usecase "Track Trip and Chat" as UC_Track
  usecase "Driver Willingness" as UC_Will
  usecase "Trip Status / GPS / Offline Maps" as UC_Trip
  usecase "Manage Users and Create Drivers" as UC_Users
  usecase "Truck Types and Base Rates" as UC_Rates
  usecase "Review / Reject / Assign" as UC_Assign
  usecase "Commission Ledger" as UC_Ledg
  usecase "Admin Ops Panel" as UC_Ops
}

' Primary actors (left)
Customer --> UC_Reg
Customer --> UC_Login
Customer --> UC_Prof
Customer --> UC_Disp
Customer --> UC_Route
Customer --> UC_Pay
Customer --> UC_Track

Driver --> UC_Login
Driver --> UC_Prof
Driver --> UC_Will
Driver --> UC_Trip
Driver --> UC_Track
Driver --> UC_Pay

Admin --> UC_Login
Admin --> UC_Users
Admin --> UC_Rates
Admin --> UC_Assign
Admin --> UC_Will
Admin --> UC_Ops
Admin --> UC_Track
Admin --> UC_Ledg
Admin --> UC_Trip

' Secondary actors (right) — NeoTeach-style support links
UC_Reg --> DB
UC_Login --> DB
UC_Prof --> DB
UC_Disp --> DB
UC_Route --> DB
UC_Track --> DB
UC_Will --> DB
UC_Trip --> DB
UC_Users --> DB
UC_Rates --> DB
UC_Assign --> DB
UC_Ledg --> DB
UC_Ops --> DB
UC_Pay --> DB
UC_Pay --> PayGW : process payment

@enduml
`;

const ANALYSIS = `
@startuml
skinparam monochrome true
skinparam shadowing false
skinparam defaultFontName Arial
skinparam defaultFontSize 11
skinparam actorStyle awesome
skinparam packageStyle rectangle
skinparam usecase {
  BackgroundColor White
  BorderColor Black
  FontSize 10
}
skinparam actor {
  BackgroundColor White
  BorderColor Black
}
left to right direction

actor "Customer" as Customer
actor "Driver" as Driver
actor "Administrator" as Admin
actor "PostgreSQL" as DB
actor "Payment Gateway" as PayGW

rectangle "Captain Truck" {
  package "Auth" {
    usecase "UC_Register_Customer" as R
    usecase "UC_Login" as L
    usecase "UC_Session_Manage" as S
    usecase "UC_Get_Me" as ME
  }
  package "Profiles / Users" {
    usecase "UC_Update_Profile" as UP
    usecase "UC_Admin_Manage_Users" as AU
    usecase "UC_Admin_Create_Driver" as AD
  }
  package "Catalog" {
    usecase "UC_List_Truck_Types" as LT
    usecase "UC_Admin_Truck_Types" as TT
    usecase "UC_Admin_Base_Rates" as BR
  }
  package "Dispatch / Route / Fare" {
    usecase "UC_Create_Dispatch" as CD
    usecase "UC_View_Dispatches" as VD
    usecase "UC_Cancel_Dispatch" as CX
    usecase "UC_Generate_Routes" as GR
    usecase "UC_Select_Route" as SR
    usecase "UC_Compute_Bill" as CB
    usecase "UC_Propose_Fare" as PF
  }
  package "Approval / Assign" {
    usecase "UC_Admin_Review_Dispatch" as AR
    usecase "UC_Admin_Reject_Dispatch" as AJ
    usecase "UC_Driver_Willingness" as DW
    usecase "UC_Admin_Assign_Driver" as AA
  }
  package "Trip / GPS" {
    usecase "UC_Update_Trip_Status" as US
    usecase "UC_Track_Trip_GPS" as TG
    usecase "UC_Offline_Maps" as OM
    usecase "UC_Complete_Trip" as CP
  }
  package "Chat / Media" {
    usecase "UC_Chat_Message" as CH
    usecase "UC_Upload_Media" as UM
  }
  package "Pay / Ledger / Push / Ops" {
    usecase "UC_Pay_Trip" as PY
    usecase "UC_Confirm_Commission" as CC
    usecase "UC_Ledger_Adjust" as LA
    usecase "UC_Manage_Push_Tokens" as PT
    usecase "UC_Admin_Ops_Panel" as AP
  }
}

' Customer
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

' Driver
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

' Administrator
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

' Secondary (PostgreSQL + Payment Gateway)
R --> DB
L --> DB
S --> DB
ME --> DB
UP --> DB
AU --> DB
AD --> DB
LT --> DB
TT --> DB
BR --> DB
CD --> DB
VD --> DB
CX --> DB
GR --> DB
SR --> DB
CB --> DB
PF --> DB
AR --> DB
AJ --> DB
DW --> DB
AA --> DB
US --> DB
TG --> DB
OM --> DB
CP --> DB
CH --> DB
UM --> DB
PY --> DB
CC --> DB
LA --> DB
PT --> DB
AP --> DB
PY --> PayGW : process payment

@enduml
`;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  await render(HIGH, "Figure_2_2_10_1_High_Level_Usecase.png");
  await render(ANALYSIS, "Figure_2_2_11_1_Analysis_Level_Usecase.png");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
