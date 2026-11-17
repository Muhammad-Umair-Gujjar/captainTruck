/**
 * Generate NeoTeach-style UML use-case diagrams as SVG, then PNG via Edge/Chrome headless.
 * Overwrites Figure_2_2_10_1 and Figure_2_2_11_1 only.
 */
const fs = require("fs");
const path = require("path");
const { execFileSync, spawnSync } = require("child_process");

const FIG = path.join("D:", "vally", "captain_truck", "docs", "figures");

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function stick(x, y, label, scale = 1) {
  const h = 28 * scale;
  const r = 7 * scale;
  const cy = y - h;
  return `
  <g>
    <circle cx="${x}" cy="${cy - r - 2}" r="${r}" fill="none" stroke="#000" stroke-width="1.6"/>
    <line x1="${x}" y1="${cy}" x2="${x}" y2="${cy + h * 0.55}" stroke="#000" stroke-width="1.6"/>
    <line x1="${x - 12 * scale}" y1="${cy + h * 0.18}" x2="${x + 12 * scale}" y2="${cy + h * 0.18}" stroke="#000" stroke-width="1.6"/>
    <line x1="${x}" y1="${cy + h * 0.55}" x2="${x - 10 * scale}" y2="${cy + h}" stroke="#000" stroke-width="1.6"/>
    <line x1="${x}" y1="${cy + h * 0.55}" x2="${x + 10 * scale}" y2="${cy + h}" stroke="#000" stroke-width="1.6"/>
    <text x="${x}" y="${y + 16}" text-anchor="middle" font-family="Times New Roman, serif" font-size="${12 * scale}">${esc(label)}</text>
  </g>`;
}

function cylinder(x, y, label) {
  const w = 70, h = 36;
  return `
  <g>
    <ellipse cx="${x}" cy="${y - h / 2}" rx="${w / 2}" ry="8" fill="#fff" stroke="#000" stroke-width="1.5"/>
    <path d="M${x - w / 2},${y - h / 2} L${x - w / 2},${y + h / 2} A${w / 2},8 0 0 0 ${x + w / 2},${y + h / 2} L${x + w / 2},${y - h / 2}" fill="#fff" stroke="#000" stroke-width="1.5"/>
    <ellipse cx="${x}" cy="${y + h / 2}" rx="${w / 2}" ry="8" fill="#fff" stroke="#000" stroke-width="1.5"/>
    <text x="${x}" y="${y + h / 2 + 24}" text-anchor="middle" font-family="Times New Roman, serif" font-size="11">${esc(label)}</text>
  </g>`;
}

function oval(x, y, w, h, lines) {
  const text = lines
    .map((ln, i) => {
      const dy = (i - (lines.length - 1) / 2) * 13;
      return `<text x="${x}" y="${y + dy + 4}" text-anchor="middle" font-family="Times New Roman, serif" font-size="11">${esc(ln)}</text>`;
    })
    .join("\n");
  return `<ellipse cx="${x}" cy="${y}" rx="${w / 2}" ry="${h / 2}" fill="#fff" stroke="#000" stroke-width="1.5"/>${text}`;
}

function line(x1, y1, x2, y2, o = {}) {
  const sw = o.width ?? 1.2;
  const dash = o.dash ? ` stroke-dasharray="${o.dash}"` : "";
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#000" stroke-width="${sw}"${dash}/>`;
}

function highLevelSvg() {
  const W = 1080, H = 1180;
  const sysX = 300, sysY = 70, sysW = 420, sysH = 1040;
  const ucs = [
    ["Authentication", "& Registration"],
    ["Profile &", "User Management"],
    ["Truck Types", "& Base Rates"],
    ["Dispatch &", "Route Selection"],
    ["AI Fare Estimate", "& Customer Proposal"],
    ["Approval, Willingness", "& Assignment"],
    ["Trip Ops, GPS", "& Offline Maps"],
    ["Chat & Media"],
    ["Payments", "(Cash / Stripe Test)"],
    ["Commission Ledger"],
    ["Push Notifications"],
    ["Admin Ops Panel"],
  ];
  const keys = [
    "AUTH", "PROF", "RATES", "DISP", "FARE", "ASSIGN",
    "TRIP", "CHAT", "PAY", "LEDG", "PUSH", "OPS",
  ];
  const pts = {};
  const startY = sysY + 70;
  const gap = 80;
  const cx = sysX + sysW / 2;
  ucs.forEach((lines, i) => {
    pts[keys[i]] = { x: cx, y: startY + i * gap, lines };
  });

  // Humans left
  const humans = [
    { id: "Customer", x: 95, y: 260 },
    { id: "Driver", x: 95, y: 520 },
    { id: "Administrator", x: 95, y: 820 },
  ];
  // Externals right (clear of DB bus)
  const exts = [
    { id: "OSM Services", x: 980, y: 220, kind: "stick" },
    { id: "Stripe Test Mode", x: 980, y: 380, kind: "stick" },
    { id: "Cloudinary", x: 980, y: 540, kind: "stick" },
    { id: "FCM", x: 980, y: 700, kind: "stick" },
    { id: "Neon PostgreSQL", x: 980, y: 920, kind: "db" },
  ];

  const rels = [
    // Customer
    ["Customer", "AUTH"], ["Customer", "PROF"], ["Customer", "DISP"], ["Customer", "FARE"],
    ["Customer", "TRIP"], ["Customer", "CHAT"], ["Customer", "PAY"], ["Customer", "PUSH"],
    // Driver
    ["Driver", "AUTH"], ["Driver", "PROF"], ["Driver", "ASSIGN"], ["Driver", "TRIP"],
    ["Driver", "CHAT"], ["Driver", "PAY"], ["Driver", "PUSH"],
    // Admin
    ["Administrator", "AUTH"], ["Administrator", "PROF"], ["Administrator", "RATES"],
    ["Administrator", "ASSIGN"], ["Administrator", "TRIP"], ["Administrator", "CHAT"],
    ["Administrator", "LEDG"], ["Administrator", "OPS"],
    // Externals
    ["OSM Services", "DISP"], ["Stripe Test Mode", "PAY"],
    ["Cloudinary", "CHAT"], ["FCM", "PUSH"],
  ];

  const actorPos = {};
  humans.forEach((a) => (actorPos[a.id] = a));
  exts.forEach((a) => (actorPos[a.id] = a));

  let lines = "";
  // Ortho routing so lines do not cut through unrelated ovals (NeoTeach-clean look)
  const leftBus = sysX - 18;
  const rightBus = sysX + sysW + 18;
  rels.forEach(([a, u]) => {
    const ap = actorPos[a];
    const up = pts[u];
    const fromRight = ap.x > cx;
    const ax = fromRight ? ap.x - 40 : ap.x + 40;
    const ay = ap.y - 20;
    const ux = fromRight ? up.x + 130 : up.x - 130;
    const bus = fromRight ? rightBus : leftBus;
    lines += `<path d="M${ax} ${ay} L${bus} ${ay} L${bus} ${up.y} L${ux} ${up.y}" fill="none" stroke="#000" stroke-width="1.35"/>`;
  });
  // DB links (dashed) on a dedicated far-right bus
  const dbBus = rightBus + 36;
  keys.forEach((k) => {
    const p = pts[k];
    const db = actorPos["Neon PostgreSQL"];
    lines += `<path d="M${p.x + 130} ${p.y} L${dbBus} ${p.y} L${dbBus} ${db.y - 10} L${db.x - 40} ${db.y - 10}" fill="none" stroke="#000" stroke-width="0.9" stroke-dasharray="3 3"/>`;
  });

  let body = `
  <rect x="${sysX}" y="${sysY}" width="${sysW}" height="${sysH}" fill="#fff" stroke="#000" stroke-width="2" rx="2"/>
  <text x="${sysX + sysW / 2}" y="${sysY + 28}" text-anchor="middle" font-family="Times New Roman, serif" font-size="13" font-weight="bold">Captain Truck: Real-Time Logistics and Dispatch Platform</text>
  `;
  keys.forEach((k) => {
    const p = pts[k];
    body += oval(p.x, p.y, 260, 48, p.lines);
  });
  humans.forEach((a) => (body += stick(a.x, a.y, a.id)));
  exts.forEach((a) => {
    if (a.kind === "db") body += cylinder(a.x, a.y, a.id);
    else body += stick(a.x, a.y, a.id);
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="100%" height="100%" fill="#fff"/>
  ${lines}
  ${body}
</svg>`;
}

function analysisSvg() {
  const W = 1100, H = 1450;
  const sysX = 160, sysY = 100, sysW = 780, sysH = 1280;

  // Module boxes in a 3-column grid
  const modules = [
    {
      title: "1. Auth",
      x: 190, y: 160, w: 220, h: 200,
      ucs: ["UC_Register_Customer", "UC_Login", "UC_Session_Manage", "UC_Get_Me"],
      id: "P1",
    },
    {
      title: "2. Profiles / Users",
      x: 440, y: 160, w: 220, h: 180,
      ucs: ["UC_Update_Profile", "UC_Admin_Manage_Users", "UC_Admin_Create_Driver"],
      id: "P2",
    },
    {
      title: "3. Truck Types & Rates",
      x: 690, y: 160, w: 220, h: 180,
      ucs: ["UC_List_Truck_Types", "UC_Admin_Truck_Types", "UC_Admin_Base_Rates"],
      id: "P3",
    },
    {
      title: "4–6. Dispatch / Route / Fare",
      x: 190, y: 400, w: 340, h: 260,
      ucs: [
        "UC_Create_Dispatch", "UC_View_Dispatches", "UC_Cancel_Dispatch",
        "UC_Generate_Routes", "UC_Select_Route",
        "UC_Compute_Bill", "UC_Propose_Fare",
      ],
      id: "P4",
    },
    {
      title: "7. Approval / Willingness / Assign",
      x: 560, y: 400, w: 350, h: 220,
      ucs: [
        "UC_Admin_Review_Dispatch", "UC_Admin_Reject_Dispatch",
        "UC_Driver_Willingness", "UC_Admin_Assign_Driver",
      ],
      id: "P7",
    },
    {
      title: "8–9. Trip / GPS / Offline",
      x: 190, y: 700, w: 340, h: 220,
      ucs: ["UC_Update_Trip_Status", "UC_Track_Trip_GPS", "UC_Offline_Maps", "UC_Complete_Trip"],
      id: "P8",
    },
    {
      title: "10–11. Chat & Media",
      x: 560, y: 660, w: 350, h: 160,
      ucs: ["UC_Chat_Message", "UC_Upload_Media"],
      id: "P10",
    },
    {
      title: "12–13. Payments & Ledger",
      x: 190, y: 960, w: 340, h: 180,
      ucs: ["UC_Pay_Trip", "UC_Confirm_Commission", "UC_Ledger_Adjust"],
      id: "P12",
    },
    {
      title: "14–15. Push & Admin UI",
      x: 560, y: 860, w: 350, h: 160,
      ucs: ["UC_Manage_Push_Tokens", "UC_Admin_Ops_Panel"],
      id: "P14",
    },
  ];

  const ucPos = {};
  let body = `
  <rect x="${sysX}" y="${sysY}" width="${sysW}" height="${sysH}" fill="#fff" stroke="#000" stroke-width="2"/>
  <text x="${sysX + sysW / 2}" y="${sysY + 28}" text-anchor="middle" font-family="Times New Roman, serif" font-size="14" font-weight="bold">Captain Truck: Real-Time Logistics and Dispatch Platform</text>
  `;

  modules.forEach((m) => {
    body += `<rect x="${m.x}" y="${m.y}" width="${m.w}" height="${m.h}" fill="#fff" stroke="#000" stroke-width="1.4" rx="4"/>`;
    body += `<text x="${m.x + m.w / 2}" y="${m.y + 18}" text-anchor="middle" font-family="Times New Roman, serif" font-size="11" font-weight="bold">${esc(m.title)}</text>`;
    m.ucs.forEach((u, i) => {
      const ox = m.x + m.w / 2;
      const oy = m.y + 48 + i * 28;
      ucPos[u] = { x: ox, y: oy, left: m.x, right: m.x + m.w };
      body += oval(ox, oy, Math.min(200, m.w - 24), 22, [u]);
    });
  });

  // Actors: Customer/Driver left, Administrator right (NeoTeach analysis style)
  const actors = [
    { id: "Customer", x: 70, y: 320 },
    { id: "Driver", x: 70, y: 780 },
    { id: "Administrator", x: 1030, y: 520 },
  ];
  actors.forEach((a) => (body += stick(a.x, a.y, a.id, 0.95)));

  // NeoTeach analysis pattern: actors associate to MODULE packages (not every leaf),
  // keeping relations correct while remaining readable.
  const moduleLinks = [
    // Customer modules
    ["Customer", "P1"], ["Customer", "P2"], ["Customer", "P3"], ["Customer", "P4"],
    ["Customer", "P8"], ["Customer", "P10"], ["Customer", "P12"], ["Customer", "P14"],
    // Driver modules (no register-only module exclusive; uses Auth for login)
    ["Driver", "P1"], ["Driver", "P2"], ["Driver", "P7"], ["Driver", "P8"],
    ["Driver", "P10"], ["Driver", "P12"], ["Driver", "P14"],
    // Admin modules
    ["Administrator", "P1"], ["Administrator", "P2"], ["Administrator", "P3"],
    ["Administrator", "P7"], ["Administrator", "P8"], ["Administrator", "P10"],
    ["Administrator", "P12"], ["Administrator", "P14"],
  ];

  const modPos = Object.fromEntries(
    modules.map((m) => [m.id, { x: m.x, y: m.y, w: m.w, h: m.h, cx: m.x + m.w / 2, cy: m.y + m.h / 2 }])
  );
  const actorPos = Object.fromEntries(actors.map((a) => [a.id, a]));
  let lines = "";
  moduleLinks.forEach(([a, mid]) => {
    const ap = actorPos[a];
    const mp = modPos[mid];
    if (!ap || !mp) return;
    const fromLeft = ap.x < sysX;
    const ax = fromLeft ? ap.x + 42 : ap.x - 42;
    const ay = ap.y - 18;
    const mx = fromLeft ? mp.x : mp.x + mp.w;
    const my = mp.cy;
    lines += line(ax, ay, mx, my);
  });
  // silence unused
  void ucPos;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="100%" height="100%" fill="#fff"/>
  ${lines}
  ${body}
</svg>`;
}

function findBrowser() {
  const candidates = [
    process.env.EDGE_PATH,
    process.env.CHROME_PATH,
    "C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe",
    "C:\\\\Program Files (x86)\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe",
    "C:\\\\Program Files (x86)\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe",
    "C:\\\\Program Files\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe",
  ].filter(Boolean);
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

function svgToPng(svgPath, pngPath, width) {
  const browser = findBrowser();
  if (!browser) throw new Error("Chrome/Edge not found for SVG→PNG");
  const absSvg = path.resolve(svgPath).replace(/\\/g, "/");
  const fileUrl = "file:///" + absSvg;
  const out = path.resolve(pngPath);
  // headless screenshot of SVG page
  const htmlPath = pngPath + ".html";
  fs.writeFileSync(
    htmlPath,
    `<!doctype html><html><body style="margin:0;background:#fff">
    <img id="i" src="${path.basename(svgPath)}" style="display:block"/>
    </body></html>`
  );
  // Prefer screenshot of the svg file directly via data — use --screenshot on html colocated
  const htmlUrl = "file:///" + path.resolve(htmlPath).replace(/\\/g, "/");
  const args = [
    "--headless=new",
    "--disable-gpu",
    `--window-size=${width},1600`,
    "--hide-scrollbars",
    `--screenshot=${out}`,
    htmlUrl,
  ];
  const r = spawnSync(browser, args, { encoding: "utf8", timeout: 60000 });
  if (r.status !== 0 && !fs.existsSync(out)) {
    throw new Error("browser screenshot failed: " + (r.stderr || r.stdout || r.status));
  }
  try { fs.unlinkSync(htmlPath); } catch {}
}

(async () => {
  fs.mkdirSync(FIG, { recursive: true });
  const hiSvg = path.join(FIG, "Figure_2_2_10_1_High_Level_Usecase.svg");
  const anSvg = path.join(FIG, "Figure_2_2_11_1_Analysis_Level_Usecase.svg");
  const hiPng = path.join(FIG, "Figure_2_2_10_1_High_Level_Usecase.png");
  const anPng = path.join(FIG, "Figure_2_2_11_1_Analysis_Level_Usecase.png");

  fs.writeFileSync(hiSvg, highLevelSvg());
  fs.writeFileSync(anSvg, analysisSvg());
  console.log("Wrote SVG");

  // Convert via kroki? Use plantuml? Prefer browser screenshot of SVG file as img in html
  svgToPng(hiSvg, hiPng, 1000);
  console.log("OK high", fs.statSync(hiPng).size);
  svgToPng(anSvg, anPng, 1120);
  console.log("OK analysis", fs.statSync(anPng).size);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
