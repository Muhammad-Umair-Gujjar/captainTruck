const fs = require("fs");
const path = require("path");
const { Resvg } = require("@resvg/resvg-js");

const outDir = path.join("D:", "vally", "captain_truck", "docs", "figures");
fs.mkdirSync(outDir, { recursive: true });

function svgToPng(svg, file) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: 1400 },
    background: "white",
  });
  const png = resvg.render().asPng();
  fs.writeFileSync(path.join(outDir, file), png);
  console.log("wrote", file, png.length);
}

function box(x, y, w, h, lines) {
  const text = lines
    .map(
      (t, i) =>
        `<text x="${x + w / 2}" y="${y + 18 + i * 14}" text-anchor="middle" font-family="Times New Roman, serif" font-size="12" fill="#000">${t}</text>`
    )
    .join("");
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#fff" stroke="#000" stroke-width="1.5"/>${text}`;
}

function arrow(x1, y1, x2, y2) {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#000" stroke-width="1.5" marker-end="url(#arrow)"/>`;
}

const networkSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="520" viewBox="0 0 1600 520">
  <defs>
    <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L6,3 L0,6 Z" fill="#000"/>
    </marker>
  </defs>
  <rect width="1600" height="520" fill="#fff"/>
  <text x="800" y="28" text-anchor="middle" font-family="Times New Roman, serif" font-size="16" font-weight="bold" fill="#000">Network Diagram of Captain Truck System (AON)</text>

  <circle cx="40" cy="160" r="22" fill="#fff" stroke="#000" stroke-width="1.5"/>
  <text x="40" y="164" text-anchor="middle" font-family="Times New Roman, serif" font-size="11" fill="#000">Start</text>

  ${box(80, 130, 90, 60, ["T1", "Planning"])}
  ${box(190, 130, 100, 60, ["T2", "Proposal"])}
  ${box(310, 130, 100, 60, ["T3", "Submission"])}
  ${box(430, 130, 100, 60, ["T4", "Defense"])}
  ${box(550, 130, 100, 60, ["T5", "Requirements"])}
  ${box(670, 130, 100, 60, ["T6", "Sys Design"])}

  ${box(820, 70, 120, 60, ["T7", "Front-End"])}
  ${box(970, 70, 110, 60, ["T8", "Prog. Report"])}
  ${box(820, 220, 120, 60, ["T9", "Database"])}

  ${box(1120, 130, 110, 60, ["T10", "Deliverable 1"])}
  ${box(1260, 130, 110, 60, ["T11", "Int. Defense"])}
  ${box(1400, 50, 120, 55, ["T12", "Dev Phase"])}
  ${box(1400, 120, 120, 55, ["T13", "Integration"])}
  ${box(1400, 190, 120, 55, ["T14", "Testing"])}
  ${box(1400, 260, 120, 55, ["T15", "Optimize"])}
  ${box(1400, 330, 120, 55, ["T16", "Delivery"])}

  <circle cx="1560" cy="400" r="22" fill="#fff" stroke="#000" stroke-width="1.5"/>
  <text x="1560" y="404" text-anchor="middle" font-family="Times New Roman, serif" font-size="11" fill="#000">End</text>

  ${arrow(62, 160, 80, 160)}
  ${arrow(170, 160, 190, 160)}
  ${arrow(290, 160, 310, 160)}
  ${arrow(410, 160, 430, 160)}
  ${arrow(530, 160, 550, 160)}
  ${arrow(650, 160, 670, 160)}
  ${arrow(770, 145, 820, 100)}
  ${arrow(770, 175, 820, 250)}
  ${arrow(940, 100, 970, 100)}
  ${arrow(1080, 100, 1120, 145)}
  ${arrow(940, 250, 1120, 175)}
  ${arrow(1230, 160, 1260, 160)}
  ${arrow(1370, 145, 1400, 78)}
  ${arrow(1460, 105, 1460, 120)}
  ${arrow(1460, 175, 1460, 190)}
  ${arrow(1460, 245, 1460, 260)}
  ${arrow(1460, 315, 1460, 330)}
  ${arrow(1520, 358, 1545, 385)}

  <text x="40" y="480" font-family="Times New Roman, serif" font-size="12" fill="#000">Path#01 (188 days): T1–T6 → T9 → T10–T16    |    Path#02 Critical (189 days): T1–T6 → T7 → T8 → T10–T16</text>
</svg>`;

svgToPng(networkSvg, "Figure_1_6_1_Network_Diagram.png");
svgToPng(networkSvg.replace("Network Diagram of Captain Truck System (AON)", "Updated Network/CPM Diagram — Captain Truck"), "Figure_1_6_2_Updated_Network_CPM.png");

const decompSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
  <rect width="1200" height="900" fill="#fff"/>
  <text x="600" y="36" text-anchor="middle" font-family="Times New Roman, serif" font-size="18" font-weight="bold" fill="#000">Product Decomposition of Captain Truck</text>
  <rect x="450" y="60" width="300" height="48" fill="#fff" stroke="#000" stroke-width="2"/>
  <text x="600" y="90" text-anchor="middle" font-family="Times New Roman, serif" font-size="14" font-weight="bold" fill="#000">Captain Truck</text>
  ${[
    [40, "1. Auth"],
    [170, "2. Dispatch"],
    [300, "3. Routing/AI"],
    [430, "4. Assignment"],
    [560, "5. Trips/GPS"],
    [690, "6. Chat"],
    [820, "7. Payments"],
    [950, "8. Ledger"],
    [1080, "9. Admin/Push"],
  ]
    .map(([x, t], i) => {
      const cx = 600;
      const mid = x + 50;
      return `<line x1="${cx}" y1="108" x2="${mid}" y2="150" stroke="#000" stroke-width="1"/>
      <rect x="${x}" y="150" width="100" height="40" fill="#fff" stroke="#000" stroke-width="1.2"/>
      <text x="${mid}" y="175" text-anchor="middle" font-family="Times New Roman, serif" font-size="11" fill="#000">${t}</text>`;
    })
    .join("")}
  <text x="600" y="240" text-anchor="middle" font-family="Times New Roman, serif" font-size="13" font-weight="bold" fill="#000">Module breakdown (selected)</text>
  ${[
    ["1 Auth", "Register/Login", "Admin creates drivers", "JWT + refresh", "RBAC"],
    ["2 Dispatch", "Pickup/drop", "Truck count", "Locked base rate", "Status machine"],
    ["3 Routing", "OSRM 2–3 routes", "Nominatim/Photon", "TFLite cost", "Server bill"],
    ["4 Assign", "Pending queue", "Approve/reject", "Assign driver", "Audit log"],
    ["5 Trips", "Lifecycle", "Socket.IO GPS", "Redis live loc", "Track views"],
    ["6 Chat", "Text/image/voice", "Cloudinary", "Smart Reply", "90-day TTL"],
    ["7 Pay", "Cash pickup", "Stripe Test", "Webhooks", "Cash confirm"],
    ["8 Ledger", "Expected %", "Collected/pending", "Admin confirm", "Driver summary"],
    ["9 Admin", "Queue UI", "Live map", "Users/rates", "FCM pushes"],
  ]
    .map((row, i) => {
      const x = 20 + (i % 3) * 390;
      const y = 270 + Math.floor(i / 3) * 200;
      return `<rect x="${x}" y="${y}" width="370" height="180" fill="#fff" stroke="#000" stroke-width="1"/>
      <text x="${x + 10}" y="${y + 24}" font-family="Times New Roman, serif" font-size="13" font-weight="bold" fill="#000">${row[0]}</text>
      ${row
        .slice(1)
        .map(
          (t, j) =>
            `<text x="${x + 16}" y="${y + 50 + j * 28}" font-family="Times New Roman, serif" font-size="12" fill="#000">• ${t}</text>`
        )
        .join("")}`;
    })
    .join("")}
</svg>`;

svgToPng(decompSvg, "Figure_1_3_Product_Decomposition.png");
console.log("done");
