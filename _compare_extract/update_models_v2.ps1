# Update only estimation models in Captain Truck Chapter 1 (match E-Poll model set)
$ErrorActionPreference = 'Stop'
$path = "D:\FYP\Chapter1_Captain_Truck_Project_Feasibility_Report.docx"

Get-Process WINWORD -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$doc = $word.Documents.Open($path)

function FindPara([string]$needle, [string]$styleContains, [int]$startAt = 1) {
  for ($i = $startAt; $i -le $doc.Paragraphs.Count; $i++) {
    $p = $doc.Paragraphs.Item($i)
    $st = $p.Style.NameLocal
    if ($styleContains -and ($st -notlike "*$styleContains*")) { continue }
    $t = ($p.Range.Text -replace "[\r\a]", "")
    if ($t.Contains($needle)) { return $i }
  }
  return -1
}

function FindReplaceAll([string]$find, [string]$replace) {
  $count = 0
  while ($true) {
    $rng = $doc.Content
    $f = $rng.Find
    $f.ClearFormatting() | Out-Null
    $f.Replacement.ClearFormatting() | Out-Null
    $ok = $f.Execute($find, $false, $false, $false, $false, $false, $true, 1, $false, $replace, 2)
    if (-not $ok) { break }
    $count++
    if ($count -gt 80) { break }
  }
  return $count
}

function InsertBeforePara([int]$paraIndex, [string]$text, [string]$styleName) {
  $r = $doc.Paragraphs.Item($paraIndex).Range
  $r.Collapse(1) # start
  $r.InsertBefore($text + "`r")
  $p = $doc.Paragraphs.Item($paraIndex) # newly inserted is at this index shifting target down... 
  # After InsertBefore, new content is BEFORE original para, so original moves to paraIndex+1
  # New para is at paraIndex
  try { $doc.Paragraphs.Item($paraIndex).Style = $styleName } catch {}
  return $paraIndex + 1 # new index of the original target
}

function AddTableBefore([int]$paraIndex, [object[][]]$data, [int]$rows, [int]$cols) {
  $r = $doc.Paragraphs.Item($paraIndex).Range
  $r.Collapse(1)
  $tbl = $doc.Tables.Add($r, $rows, $cols)
  try { $tbl.Style = "Table Grid" } catch {}
  for ($row = 1; $row -le $rows; $row++) {
    for ($col = 1; $col -le $cols; $col++) {
      $cell = $tbl.Cell($row, $col).Range
      $cell.Text = [string]$data[$row - 1][$col - 1]
    }
  }
  # Prefer existing table formatting: copy from Table 1.6 if possible
  return $tbl
}

Write-Host "Opened. Paras=$($doc.Paragraphs.Count) Tables=$($doc.Tables.Count)"

# Styles from body
$h142 = FindPara "1.4.2 Project Cost Estimation" "Heading 3"
$h143 = FindPara "1.4.3 Activity Based Costing" "Heading 3"
$h141 = FindPara "1.4.1 Project Cost Estimation" "Heading 3"
$h15  = FindPara "1.5 Task Dependency Table" "Heading 2"
$bodySample = FindPara "Function points measure the functionality" "Normal"
$styleH3 = $doc.Paragraphs.Item($h141).Style.NameLocal
$styleH2 = $doc.Paragraphs.Item($h15).Style.NameLocal
$styleBody = $doc.Paragraphs.Item($bodySample).Style.NameLocal
Write-Host "Body indices: 1.4.2=$h142 1.4.3=$h143 1.5=$h15 styles H3=$styleH3 Body=$styleBody"

if ($h142 -lt 0 -or $h143 -lt 0 -or $h15 -lt 0) { throw "Missing body headings" }

# --- TOC title fix (string replace) ---
$n = FindReplaceAll "COCOMO'81 (Constructive Cost Model)" "COCOMO II (Constructive Cost Model)"
Write-Host "Replaced COCOMO'81 title mentions: $n"

# --- 1.4 intro (Normal, after Heading 2 1.4) ---
$intro = FindPara "We estimated cost with three methods" "Normal"
if ($intro -gt 0) {
  $doc.Paragraphs.Item($intro).Range.Text = "We estimated cost with three main methods, Function Point Analysis, COCOMO II and Activity Based Costing, and then cross-checked the effort with the LOC-oriented and FP-oriented empirical models taught in SPM Lecture 6. All amounts are in Pakistani rupees (PKR) and effort is in person-months (PM). Intermediate values are rounded to four decimal places, effort and schedule to two, and each cost is worked out from the rounded effort and rounded to the nearest rupee.`r"
  try { $doc.Paragraphs.Item($intro).Style = $styleBody } catch {}
  Write-Host "Updated intro para $intro"
}

# Re-resolve after edits
$h142 = FindPara "1.4.2 Project Cost Estimation" "Heading 3"
$h143 = FindPara "1.4.3 Activity Based Costing" "Heading 3"

# Delete body 1.4.2 content (heading through before 1.4.3)
$start = $doc.Paragraphs.Item($h142).Range.Start
$end = $doc.Paragraphs.Item($h143).Range.Start
if ($end -le $start) { throw "Bad range for 1.4.2 delete" }
$doc.Range($start, $end).Delete() | Out-Null
Write-Host "Deleted old 1.4.2 body"

$h143 = FindPara "1.4.3 Activity Based Costing" "Heading 3"

# Insert new 1.4.2 content before 1.4.3 (insert in reverse order so final order is correct)
$cocomoTexts = @(
  "1.4.2 Project Cost Estimation by using COCOMO II (Constructive Cost Model)",
  "COCOMO II replaces the COCOMO'81 model of our earlier draft (Basic, organic mode, 28.16 person-months), because it is the version taught in Lecture 6 and it allows for reuse and modern tools. It has three submodels. Table 1.5 shows why we chose the Early Design model.",
  "Table 1.5: Choice of COCOMO II submodel"
)
# Insert heading+paras first, then table, then remaining text
$h143 = FindPara "1.4.3 Activity Based Costing" "Heading 3"
$h143 = InsertBeforePara $h143 $cocomoTexts[0] $styleH3
$h143 = InsertBeforePara $h143 $cocomoTexts[1] $styleBody
$h143 = InsertBeforePara $h143 $cocomoTexts[2] $styleBody

# Table 1.5
$data5 = @(
  @("Submodel", "Stage", "Inputs required", "Decision"),
  @("Application Composition", "Early prototyping of screens, reports and components", "Object points, % reuse, PROD rating", "Not used - object counts not recorded; avoid once architecture is settled"),
  @("Early Design", "Requirements stabilised and basic architecture established", "Size (KLOC or FP), 5 scale factors, 7 effort multipliers", "Selected - size 10.4364 KLOC; nominal factors assumed"),
  @("Post-Architecture", "Detailed design and construction", "Size, 5 scale factors, 17 effort multipliers", "Not used yet - detailed EM ratings not measured for all modules")
)
AddTableBefore $h143 $data5 4 4 | Out-Null
# After adding table, 1.4.3 index shifts - re-find
$h143 = FindPara "1.4.3 Activity Based Costing" "Heading 3"

$more = @(
  "Size was derived from the function points at 40 LOC per FP, which is lower than the 53 LOC/FP common for object-oriented languages because NestJS modules, Prisma, React and Flutter widgets replace much of the hand-written infrastructure code. Early Design fits Captain Truck: the requirements and architecture are fixed in the planning phase (task B), Nest API contracts and Prisma models are settled, and construction of remaining increments continues under that baseline. The model is:",
  "PM = A x Size^E x (product of EMi), where E = B + 0.01 x Sum(SFj)",
  "TDEV = C x PM^(D + 0.2 x 0.01 x Sum(SFj))",
  "PM is effort in person-months and Size is new code in KLOC. A = 2.94 and B = 0.91 are calibration constants, SFj are the five scale factors (PREC, FLEX, RESL, TEAM, PMAT) and EMi the seven Early Design effort multipliers (RCPX, RUSE, PDIF, PERS, PREX, FCIL, SCED). TDEV is the schedule in months, with C = 3.67 and D = 0.28. These equations and the nominal values below are the published COCOMO II.2000 calibration (Boehm et al., Software Cost Estimation with COCOMO II, Prentice Hall, 2000).",
  "With all scale factors and effort multipliers at Nominal (Sum SF = 18.96, product EM = 1.00):",
  "KLOC = 260.91 x 40 / 1000 = 10.4364",
  "E = 0.91 + 0.01 x 18.96 = 1.0996",
  "PM = 2.94 x (10.4364)^1.0996 = 38.76 person-months",
  "TDEV = 3.67 x (38.76)^0.3179 = 11.74 months",
  "People = PM / TDEV = 38.76 / 11.74 = 3.30 ~ 3",
  "COCOMO II also points to a team of about 3, but at nominal ratings it needs 38.76 person-months over 11.74 months: more effort than the function point estimate (26.09) and longer than our 26-week critical path. The gap comes mainly from the nominal assumption. NestJS, React, Flutter and free-tier managed services may justify better-than-nominal ratings for tools (FCIL) and experience (PREX, PERS), which would lower the effort, but we will apply them only after agreeing the ratings with our supervisor. The size of 10.4364 KLOC also rests on the assumed 40 LOC/FP.",
  "Result: COCOMO II Early Design (nominal): 10.4364 KLOC, 38.76 person-months, PKR 3,488,400, 11.74 months, about 3 people."
)
foreach ($t in $more) {
  $h143 = FindPara "1.4.3 Activity Based Costing" "Heading 3"
  $null = InsertBeforePara $h143 $t $styleBody
}
Write-Host "Inserted COCOMO II section"

# --- Replace Table 1.7 Summary through before 1.5 ---
$t17 = FindPara "Table 1.7: Summary of estimates" "Normal"
$h15 = FindPara "1.5 Task Dependency Table" "Heading 2"
Write-Host "Summary caption=$t17 1.5=$h15"
if ($t17 -lt 0) { throw "Table 1.7 summary not found" }
$start = $doc.Paragraphs.Item($t17).Range.Start
$end = $doc.Paragraphs.Item($h15).Range.Start
if ($end -le $start) { throw "Bad range for summary delete start=$start end=$end" }
$doc.Range($start, $end).Delete() | Out-Null
Write-Host "Deleted old summary table block"

$h15 = FindPara "1.5 Task Dependency Table" "Heading 2"
$h143check = FindPara "1.4.3 Activity Based Costing" "Heading 3"
$styleH3 = $doc.Paragraphs.Item($h143check).Style.NameLocal
$styleBody = $doc.Paragraphs.Item((FindPara "Each activity is costed" "Normal")).Style.NameLocal

# Build 1.4.4 - 1.4.6 before 1.5
function Ins15([string]$text, [string]$style) {
  $h = FindPara "1.5 Task Dependency Table" "Heading 2"
  return (InsertBeforePara $h $text $style)
}

Ins15 "1.4.4 LOC-Oriented Estimation Models" $styleH3 | Out-Null
Ins15 "Lecture 6 (slide 23) gives four empirical models that predict effort E in person-months from size in KLOC. We applied them to the same 10.4364 KLOC used for COCOMO II. Slide 33 states when each model should be avoided; where Captain Truck breaks that condition the equation still produces a number, but we show it in brackets and do not cost it." $styleBody | Out-Null
Ins15 "Table 1.7: LOC-oriented estimates (KLOC = 10.4364)" $styleBody | Out-Null

$h15 = FindPara "1.5 Task Dependency Table" "Heading 2"
$locData = @(
  @("Model", "Equation", "Calculation", "Effort (PM)", "Applicability"),
  @("Walston-Felix", "E = 5.2 x (KLOC)^0.91", "5.2 x (10.4364)^0.91 = 5.2 x 8.4505", "(43.94)", "Not fully applicable: not advised for small projects; not costed"),
  @("Bailey-Basili", "E = 5.5 + 0.73 x (KLOC)^1.16", "5.5 + 0.73 x (10.4364)^1.16 = 5.5 + 0.73 x 15.1886 = 16.59", "16.59", "Applicable: small to medium projects; PKR 1,493,100"),
  @("Boehm simple", "E = 3.2 x (KLOC)^1.05", "3.2 x (10.4364)^1.05 = 3.2 x 11.7349 = 37.55", "37.55", "Applicable: modest size; PKR 3,379,500"),
  @("Doty", "E = 5.288 x (KLOC)^1.047", "5.288 x (10.4364)^1.047 = 5.288 x 11.6526 = 61.62", "61.62", "Applicable (above KLOC > 9); PKR 5,545,800")
)
AddTableBefore $h15 $locData 5 5 | Out-Null

Ins15 "The applicable models give 16.59 to 61.62 person-months. Bailey-Basili is the lowest applicable costed model and Doty the highest. Walston-Felix is shown for reference only, since Captain Truck (about 10.4 KLOC, three developers) is a small project." $styleBody | Out-Null

Ins15 "1.4.5 Function Point-Oriented Estimation Models" $styleH3 | Out-Null
Ins15 "The FP-oriented models on slide 23 take the adjusted function point count; the lecture's own example (slide 26) applies them to adjusted FP. Our 260.91 FP from Section 1.4.1 is the same measure, so the input is compatible. The equations are regressions on other organisations' projects and have not been calibrated to Captain Truck." $styleBody | Out-Null
Ins15 "Table 1.8: FP-oriented estimates (FP = 260.91)" $styleBody | Out-Null

$h15 = FindPara "1.5 Task Dependency Table" "Heading 2"
$fpData = @(
  @("Model", "Equation", "Calculation", "Effort (PM)", "Applicability"),
  @("Albrecht and Gaffney", "E = -91.4 + 0.355 FP", "-91.4 + 0.355 x 260.91 = -91.4 + 92.62 = 1.22", "1.22", "Barely above the ~257 FP threshold; unrealistically low - not used for budgeting"),
  @("Kemerer", "E = -37 + 0.96 FP", "-37 + 0.96 x 260.91 = -37 + 250.47 = 213.47", "(213.47)", "Not fully applicable: overestimates heavily on small projects; not costed"),
  @("Small project regression", "E = -12.88 + 0.405 FP", "-12.88 + 0.405 x 260.91 = -12.88 + 105.67 = 92.79", "92.79", "Applicable: small projects sized from requirements; PKR 8,351,100")
)
AddTableBefore $h15 $fpData 4 5 | Out-Null

Ins15 "Only the small project regression model applies as a usable upper bound. It gives 92.79 person-months, about 3.6 times the FPA effort of 26.09. This is not an arithmetic error: FPA uses our own productivity of 10 FP per person-month, while the regression implies about 2.81 FP per person-month, taken from the projects it was fitted to. Without local calibration we keep it only as an upper bound. Albrecht and Gaffney yields a positive but unrealistically small 1.22 PM and is not used for budgeting." $styleBody | Out-Null

Ins15 "1.4.6 Comparative Analysis of Estimation Results" $styleH3 | Out-Null
Ins15 "Table 1.9 brings all results together. Labour cost is effort x PKR 90,000 per person-month. Brackets mark values that are mathematical results only. ABC is listed for context: it prices the scheduled person-weeks and adds overheads, so it measures something different from the effort models and is never added to them." $styleBody | Out-Null
Ins15 "Table 1.9: Comparison of estimates" $styleBody | Out-Null

$h15 = FindPara "1.5 Task Dependency Table" "Heading 2"
$cmp = @(
  @("Model", "Category", "Size input", "Effort (PM)", "Labour cost (PKR)", "Status"),
  @("Function Point Analysis", "FPA", "260.91 FP", "26.09", "2,348,190", "Applicable - own productivity 10 FP/PM"),
  @("COCOMO II Early Design", "COCOMO II", "10.4364 KLOC", "38.76", "3,488,400", "Applicable; nominal SF/EM; TDEV 11.74 months"),
  @("Walston-Felix", "LOC-oriented", "10.4364 KLOC", "(43.94)", "-", "Not fully applicable - small project"),
  @("Bailey-Basili", "LOC-oriented", "10.4364 KLOC", "16.59", "1,493,100", "Applicable - uncalibrated"),
  @("Boehm simple", "LOC-oriented", "10.4364 KLOC", "37.55", "3,379,500", "Applicable - uncalibrated"),
  @("Doty", "LOC-oriented", "10.4364 KLOC", "61.62", "5,545,800", "Applicable (KLOC > 9)"),
  @("Albrecht and Gaffney", "FP-oriented", "260.91 FP", "1.22", "-", "Not used - unrealistically low"),
  @("Kemerer", "FP-oriented", "260.91 FP", "(213.47)", "-", "Not fully applicable - overestimates"),
  @("Small project regression", "FP-oriented", "260.91 FP", "92.79", "8,351,100", "Applicable - upper bound"),
  @("Activity Based Costing", "ABC", "78 person-weeks", "18.00", "1,619,982 labour (1,756,482 with overhead)", "Applicable (different scope); cash overhead PKR 136,500")
)
AddTableBefore $h15 $cmp 11 6 | Out-Null

Ins15 "The models disagree for three reasons. Each was fitted to a different set of past projects, with its own languages, tools and productivity; they measure size differently (FP directly, or KLOC converted from FP through our assumed ratio); and they cover different scope, since the effort models include all development work while ABC counts only the scheduled weeks. None has been calibrated with Captain Truck data." $styleBody | Out-Null
Ins15 "Leaving out the invalid and not fully applicable results, the valid estimates run from 16.59 to 92.79 person-months. The closest to our plan of three members over the 26-week critical path are ABC (18.00), FPA (26.09) and Bailey-Basili (16.59). COCOMO II (38.76) and Boehm simple (37.55) agree with each other and form a cautious upper case. Doty and the small project regression are far above the plan and are not used for budgeting. FPA (PKR 2,348,190) therefore stays our planning baseline, COCOMO II is the cross-check, and we will rate its factors and re-estimate with measured size and effort after Increment 1." $styleBody | Out-Null

Write-Host "Inserted 1.4.4-1.4.6"

# Renumber later tables (old 1.8+ -> +2)
FindReplaceAll "Table 1.8: Task dependency table" "Table 1.10: Task dependency table" | Out-Null
FindReplaceAll "Table 1.9: CPM calculations" "Table 1.11: CPM calculations" | Out-Null
FindReplaceAll "Table 1.10: Increment plan and milestones" "Table 1.12: Increment plan and milestones" | Out-Null
FindReplaceAll "Table 1.11: Team members and skills" "Table 1.13: Team members and skills" | Out-Null
FindReplaceAll "Table 1.12: Task and member assignment" "Table 1.14: Task and member assignment" | Out-Null
FindReplaceAll "Table 1.13: Technologies" "Table 1.15: Technologies" | Out-Null
FindReplaceAll "Table 1.14: Tools" "Table 1.16: Tools" | Out-Null
FindReplaceAll "Table 1.15: Problem statement" "Table 1.17: Problem statement" | Out-Null
FindReplaceAll "Table 1.16: Stakeholders and needs" "Table 1.18: Stakeholders and needs" | Out-Null
FindReplaceAll "Table 1.17: Risk list" "Table 1.19: Risk list" | Out-Null

# TOC: insert 1.4.4-1.4.6 after TOC 1.4.3
$toc143 = FindPara "1.4.3 Activity Based Costing" "TOC"
if ($toc143 -gt 0) {
  $next = ($doc.Paragraphs.Item($toc143 + 1).Range.Text -replace "[\r\a]", "").Trim()
  if (-not $next.StartsWith("1.4.4")) {
    $styleToc = $doc.Paragraphs.Item($toc143).Style.NameLocal
    $doc.Paragraphs.Item($toc143).Range.InsertAfter("1.4.4 LOC-Oriented Estimation Models`r1.4.5 Function Point-Oriented Estimation Models`r1.4.6 Comparative Analysis of Estimation Results`r")
    for ($k = 1; $k -le 3; $k++) {
      try { $doc.Paragraphs.Item($toc143 + $k).Style = $styleToc } catch {}
    }
    Write-Host "TOC entries added after $toc143"
  }
}

try { foreach ($toc in $doc.TablesOfContents) { $toc.Update() } } catch { Write-Host "TOC update warn: $_" }

$doc.Save()
$doc.Close()
$word.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($doc) | Out-Null
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
[GC]::Collect(); [GC]::WaitForPendingFinalizers()
Write-Host "DONE OK"
