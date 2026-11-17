# Fast Word COM update — estimation models only (E-Poll set)
$ErrorActionPreference = 'Stop'
$path = "D:\FYP\Chapter1_Captain_Truck_Project_Feasibility_Report.docx"

Get-Process WINWORD -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$doc = $word.Documents.Open($path)
$wdCollapseStart = 1
$wdCollapseEnd = 0
$wdFindContinue = 1
$wdReplaceAll = 2
$wdReplaceOne = 1
$wdStory = 6

function FindOnce([string]$text, [bool]$forward = $true) {
  $rng = $doc.Content
  $f = $rng.Find
  $f.ClearFormatting() | Out-Null
  $f.Text = $text
  $f.Forward = $forward
  $f.Wrap = 0 # wdFindStop
  $f.MatchWholeWord = $false
  $f.MatchCase = $false
  if ($f.Execute()) { return $rng.Duplicate }
  return $null
}

function ReplaceAll([string]$find, [string]$replace) {
  $rng = $doc.Content
  $f = $rng.Find
  $f.ClearFormatting() | Out-Null
  $f.Replacement.ClearFormatting() | Out-Null
  $f.Execute($find, $false, $false, $false, $false, $false, $true, $wdFindContinue, $false, $replace, $wdReplaceAll) | Out-Null
}

Write-Host "Open OK paras=$($doc.Paragraphs.Count)"

# 1) Title string updates (TOC + heading)
ReplaceAll "by using COCOMO'81 (Constructive Cost Model)" "by using COCOMO II (Constructive Cost Model)"
Write-Host "Titles updated"

# 2) Intro paragraph
$introOld = "We estimated cost with three methods"
$rIntro = FindOnce $introOld
if ($null -eq $rIntro) { throw "Intro not found" }
# Expand to whole paragraph
$rIntro.Expand(4) | Out-Null # wdParagraph=4
$rIntro.Text = "We estimated cost with three main methods, Function Point Analysis, COCOMO II and Activity Based Costing, and then cross-checked the effort with the LOC-oriented and FP-oriented empirical models taught in SPM Lecture 6. All amounts are in Pakistani rupees (PKR) and effort is in person-months (PM). Intermediate values are rounded to four decimal places, effort and schedule to two, and each cost is worked out from the rounded effort and rounded to the nearest rupee.`r"
Write-Host "Intro updated"

# 3) Delete old body 1.4.2 (Heading 3) through before body 1.4.3
# Find Heading 3 occurrences by searching unique body strings
$r142 = $null
$find = $doc.Content.Find
$find.ClearFormatting() | Out-Null
# Search for heading text; skip TOC by requiring we find "COCOMO'81 estimates" nearby OR search "COCOMO II" after replace
# After title replace, body heading is already "COCOMO II"
$searchFrom = $doc.Content
$f = $searchFrom.Find
$f.ClearFormatting() | Out-Null
# Prefer paragraph-index scan (avoids TOC Find loops)
$r142 = $null
$r143 = $null
for ($i = 1; $i -le $doc.Paragraphs.Count; $i++) {
  $p = $doc.Paragraphs.Item($i)
  $st = $p.Style.NameLocal
  if ($st -notlike "Heading*") { continue }
  $t = ($p.Range.Text -replace "[\r\a]", "")
  if (($null -eq $r142) -and $t.StartsWith("1.4.2 Project Cost Estimation")) {
    $r142 = $p.Range.Duplicate
    Write-Host "Body 1.4.2 para=$i"
  }
  elseif (($null -eq $r143) -and $t.StartsWith("1.4.3 Activity Based Costing")) {
    $r143 = $p.Range.Duplicate
    Write-Host "Body 1.4.3 para=$i"
  }
}
if ($null -eq $r142) { throw "Body 1.4.2 heading not found" }
if ($null -eq $r143) { throw "Body 1.4.3 not found" }

$del = $doc.Range($r142.Start, $r143.Start)
Write-Host "Deleting 1.4.2 range $($del.Start)-$($del.End)"
$del.Delete() | Out-Null

function FindHeadingRange([string]$startsWith) {
  for ($i = 1; $i -le $doc.Paragraphs.Count; $i++) {
    $p = $doc.Paragraphs.Item($i)
    if ($p.Style.NameLocal -notlike "Heading*") { continue }
    $t = ($p.Range.Text -replace "[\r\a]", "")
    if ($t.StartsWith($startsWith)) { return $p.Range.Duplicate }
  }
  return $null
}
$r143 = FindHeadingRange "1.4.3 Activity Based Costing"
if ($null -eq $r143) { throw "1.4.3 missing after delete" }
$ins = $doc.Range($r143.Start, $r143.Start)

# Build COCOMO II section as one typed block, then tables
$cocomoBlock = @"
1.4.2 Project Cost Estimation by using COCOMO II (Constructive Cost Model)
COCOMO II replaces the COCOMO'81 model of our earlier draft (Basic, organic mode, 28.16 person-months), because it is the version taught in Lecture 6 and it allows for reuse and modern tools. It has three submodels. Table 1.5 shows why we chose the Early Design model.
Table 1.5: Choice of COCOMO II submodel
"@
$ins.InsertBefore((($cocomoBlock -replace "`r`n","`r") -replace "`n","`r") + "`r")
Write-Host "Inserted COCOMO heading block"

# Find caption Table 1.5 to insert table after it
$searchFrom = $doc.Content
$f = $searchFrom.Find
$f.ClearFormatting() | Out-Null
$cap5 = $null
while ($f.Execute("Table 1.5: Choice of COCOMO II submodel")) {
  $cap5 = $searchFrom.Duplicate
  break
}
# Move after that paragraph
$afterCap = $doc.Range($cap5.Paragraphs.Item(1).Range.End, $cap5.Paragraphs.Item(1).Range.End)
$tbl5 = $doc.Tables.Add($afterCap, 4, 4)
try { $tbl5.Style = "Table Grid" } catch {}
$d5 = @(
  @("Submodel","Stage","Inputs required","Decision"),
  @("Application Composition","Early prototyping of screens, reports and components","Object points, % reuse, PROD rating","Not used - object counts not recorded; avoid once architecture is settled"),
  @("Early Design","Requirements stabilised and basic architecture established","Size (KLOC or FP), 5 scale factors, 7 effort multipliers","Selected - size 10.4364 KLOC; nominal factors assumed"),
  @("Post-Architecture","Detailed design and construction","Size, 5 scale factors, 17 effort multipliers","Not used yet - detailed EM ratings not measured for all modules")
)
for ($i=0;$i -lt 4;$i++){ for($j=0;$j -lt 4;$j++){ $tbl5.Cell($i+1,$j+1).Range.Text = $d5[$i][$j] } }
Write-Host "Table 1.5 added"

# Insert remaining COCOMO narrative before 1.4.3
$r143 = FindHeadingRange "1.4.3 Activity Based Costing"
$more = @"
Size was derived from the function points at 40 LOC per FP, which is lower than the 53 LOC/FP common for object-oriented languages because NestJS modules, Prisma, React and Flutter widgets replace much of the hand-written infrastructure code. Early Design fits Captain Truck: the requirements and architecture are fixed in the planning phase (task B), Nest API contracts and Prisma models are settled, and construction of remaining increments continues under that baseline. The model is:
PM = A x Size^E x (product of EMi), where E = B + 0.01 x Sum(SFj)
TDEV = C x PM^(D + 0.2 x 0.01 x Sum(SFj))
PM is effort in person-months and Size is new code in KLOC. A = 2.94 and B = 0.91 are calibration constants, SFj are the five scale factors (PREC, FLEX, RESL, TEAM, PMAT) and EMi the seven Early Design effort multipliers (RCPX, RUSE, PDIF, PERS, PREX, FCIL, SCED). TDEV is the schedule in months, with C = 3.67 and D = 0.28. These equations and the nominal values below are the published COCOMO II.2000 calibration (Boehm et al., Software Cost Estimation with COCOMO II, Prentice Hall, 2000).
With all scale factors and effort multipliers at Nominal (Sum SF = 18.96, product EM = 1.00):
KLOC = 260.91 x 40 / 1000 = 10.4364
E = 0.91 + 0.01 x 18.96 = 1.0996
PM = 2.94 x (10.4364)^1.0996 = 38.76 person-months
TDEV = 3.67 x (38.76)^0.3179 = 11.74 months
People = PM / TDEV = 38.76 / 11.74 = 3.30 ~ 3
COCOMO II also points to a team of about 3, but at nominal ratings it needs 38.76 person-months over 11.74 months: more effort than the function point estimate (26.09) and longer than our 26-week critical path. The gap comes mainly from the nominal assumption. NestJS, React, Flutter and free-tier managed services may justify better-than-nominal ratings for tools (FCIL) and experience (PREX, PERS), which would lower the effort, but we will apply them only after agreeing the ratings with our supervisor. The size of 10.4364 KLOC also rests on the assumed 40 LOC/FP.
Result: COCOMO II Early Design (nominal): 10.4364 KLOC, 38.76 person-months, PKR 3,488,400, 11.74 months, about 3 people.
"@
$ins2 = $doc.Range($r143.Start, $r143.Start)
$ins2.InsertBefore((($more -replace "`r`n","`r") -replace "`n","`r") + "`r")
Write-Host "COCOMO narrative inserted"

# Apply Heading 3 to body 1.4.2 heading paragraph
$r142new = FindHeadingRange "1.4.2 Project Cost Estimation by using COCOMO II"
if ($null -eq $r142new) {
  # Newly inserted text may still be Normal — find by text and style
  for ($i = 1; $i -le $doc.Paragraphs.Count; $i++) {
    $t = ($doc.Paragraphs.Item($i).Range.Text -replace "[\r\a]", "")
    if ($t.StartsWith("1.4.2 Project Cost Estimation by using COCOMO II") -and ($doc.Paragraphs.Item($i).Style.NameLocal -notlike "TOC*")) {
      try { $doc.Paragraphs.Item($i).Style = "Heading 3" } catch {}
      break
    }
  }
}

# 4) Delete Table 1.7 Summary block through before 1.5
$searchFrom = $doc.Content
$f = $searchFrom.Find
$f.ClearFormatting() | Out-Null
$r17 = $null
if ($f.Execute("Table 1.7: Summary of estimates")) { $r17 = $searchFrom.Duplicate } else { throw "Summary not found" }

$r15 = FindHeadingRange "1.5 Task Dependency Table"
if ($null -eq $r15) { throw "1.5 heading not found" }
$del2 = $doc.Range($r17.Paragraphs.Item(1).Range.Start, $r15.Start)
Write-Host "Deleting summary $($del2.Start)-$($del2.End)"
$del2.Delete() | Out-Null

# Re-find 1.5
$r15 = FindHeadingRange "1.5 Task Dependency Table"
if ($null -eq $r15) { throw "1.5 missing after summary delete" }

$block456 = @"
1.4.4 LOC-Oriented Estimation Models
Lecture 6 (slide 23) gives four empirical models that predict effort E in person-months from size in KLOC. We applied them to the same 10.4364 KLOC used for COCOMO II. Slide 33 states when each model should be avoided; where Captain Truck breaks that condition the equation still produces a number, but we show it in brackets and do not cost it.
Table 1.7: LOC-oriented estimates (KLOC = 10.4364)
"@
$ins3 = $doc.Range($r15.Start, $r15.Start)
$ins3.InsertBefore((($block456 -replace "`r`n","`r") -replace "`n","`r") + "`r")

# Style 1.4.4 heading
$searchFrom = $doc.Content
$f = $searchFrom.Find
$f.ClearFormatting() | Out-Null
if ($f.Execute("1.4.4 LOC-Oriented Estimation Models")) {
  try { $searchFrom.Paragraphs.Item(1).Style = "Heading 3" } catch {}
}

# Table 1.7 after its caption
$searchFrom = $doc.Content
$f = $searchFrom.Find
$f.ClearFormatting() | Out-Null
$f.Execute("Table 1.7: LOC-oriented estimates") | Out-Null
$after = $doc.Range($searchFrom.Paragraphs.Item(1).Range.End, $searchFrom.Paragraphs.Item(1).Range.End)
$tLoc = $doc.Tables.Add($after, 5, 5)
try { $tLoc.Style = "Table Grid" } catch {}
$loc = @(
  @("Model","Equation","Calculation","Effort (PM)","Applicability"),
  @("Walston-Felix","E = 5.2 x (KLOC)^0.91","5.2 x (10.4364)^0.91 = 5.2 x 8.4505","(43.94)","Not fully applicable: not advised for small projects; not costed"),
  @("Bailey-Basili","E = 5.5 + 0.73 x (KLOC)^1.16","5.5 + 0.73 x (10.4364)^1.16 = 5.5 + 0.73 x 15.1886 = 16.59","16.59","Applicable: small to medium projects; PKR 1,493,100"),
  @("Boehm simple","E = 3.2 x (KLOC)^1.05","3.2 x (10.4364)^1.05 = 3.2 x 11.7349 = 37.55","37.55","Applicable: modest size; PKR 3,379,500"),
  @("Doty","E = 5.288 x (KLOC)^1.047","5.288 x (10.4364)^1.047 = 5.288 x 11.6526 = 61.62","61.62","Applicable (above KLOC > 9); PKR 5,545,800")
)
for ($i=0;$i -lt 5;$i++){ for($j=0;$j -lt 5;$j++){ $tLoc.Cell($i+1,$j+1).Range.Text = $loc[$i][$j] } }
Write-Host "LOC table done"

# Re-find 1.5 and insert rest
$r15 = FindHeadingRange "1.5 Task Dependency Table"
$mid = @"
The applicable models give 16.59 to 61.62 person-months. Bailey-Basili is the lowest applicable costed model and Doty the highest. Walston-Felix is shown for reference only, since Captain Truck (about 10.4 KLOC, three developers) is a small project.
1.4.5 Function Point-Oriented Estimation Models
The FP-oriented models on slide 23 take the adjusted function point count; the lecture's own example (slide 26) applies them to adjusted FP. Our 260.91 FP from Section 1.4.1 is the same measure, so the input is compatible. The equations are regressions on other organisations' projects and have not been calibrated to Captain Truck.
Table 1.8: FP-oriented estimates (FP = 260.91)
"@
$doc.Range($r15.Start, $r15.Start).InsertBefore((($mid -replace "`r`n","`r") -replace "`n","`r") + "`r")

$searchFrom = $doc.Content
$f = $searchFrom.Find
$f.ClearFormatting() | Out-Null
if ($f.Execute("1.4.5 Function Point-Oriented Estimation Models")) {
  try { $searchFrom.Paragraphs.Item(1).Style = "Heading 3" } catch {}
}

$searchFrom = $doc.Content
$f = $searchFrom.Find
$f.ClearFormatting() | Out-Null
$f.Execute("Table 1.8: FP-oriented estimates") | Out-Null
$after = $doc.Range($searchFrom.Paragraphs.Item(1).Range.End, $searchFrom.Paragraphs.Item(1).Range.End)
$tFp = $doc.Tables.Add($after, 4, 5)
try { $tFp.Style = "Table Grid" } catch {}
$fp = @(
  @("Model","Equation","Calculation","Effort (PM)","Applicability"),
  @("Albrecht and Gaffney","E = -91.4 + 0.355 FP","-91.4 + 0.355 x 260.91 = -91.4 + 92.62 = 1.22","1.22","Barely above the ~257 FP threshold; unrealistically low - not used for budgeting"),
  @("Kemerer","E = -37 + 0.96 FP","-37 + 0.96 x 260.91 = -37 + 250.47 = 213.47","(213.47)","Not fully applicable: overestimates heavily on small projects; not costed"),
  @("Small project regression","E = -12.88 + 0.405 FP","-12.88 + 0.405 x 260.91 = -12.88 + 105.67 = 92.79","92.79","Applicable: small projects sized from requirements; PKR 8,351,100")
)
for ($i=0;$i -lt 4;$i++){ for($j=0;$j -lt 5;$j++){ $tFp.Cell($i+1,$j+1).Range.Text = $fp[$i][$j] } }
Write-Host "FP table done"

$r15 = FindHeadingRange "1.5 Task Dependency Table"
$tail = @"
Only the small project regression model applies as a usable upper bound. It gives 92.79 person-months, about 3.6 times the FPA effort of 26.09. This is not an arithmetic error: FPA uses our own productivity of 10 FP per person-month, while the regression implies about 2.81 FP per person-month, taken from the projects it was fitted to. Without local calibration we keep it only as an upper bound. Albrecht and Gaffney yields a positive but unrealistically small 1.22 PM and is not used for budgeting.
1.4.6 Comparative Analysis of Estimation Results
Table 1.9 brings all results together. Labour cost is effort x PKR 90,000 per person-month. Brackets mark values that are mathematical results only. ABC is listed for context: it prices the scheduled person-weeks and adds overheads, so it measures something different from the effort models and is never added to them.
Table 1.9: Comparison of estimates
"@
$doc.Range($r15.Start, $r15.Start).InsertBefore((($tail -replace "`r`n","`r") -replace "`n","`r") + "`r")

$searchFrom = $doc.Content
$f = $searchFrom.Find
$f.ClearFormatting() | Out-Null
if ($f.Execute("1.4.6 Comparative Analysis of Estimation Results")) {
  try { $searchFrom.Paragraphs.Item(1).Style = "Heading 3" } catch {}
}

$searchFrom = $doc.Content
$f = $searchFrom.Find
$f.ClearFormatting() | Out-Null
$f.Execute("Table 1.9: Comparison of estimates") | Out-Null
$after = $doc.Range($searchFrom.Paragraphs.Item(1).Range.End, $searchFrom.Paragraphs.Item(1).Range.End)
$tCmp = $doc.Tables.Add($after, 11, 6)
try { $tCmp.Style = "Table Grid" } catch {}
$cmp = @(
  @("Model","Category","Size input","Effort (PM)","Labour cost (PKR)","Status"),
  @("Function Point Analysis","FPA","260.91 FP","26.09","2,348,190","Applicable - own productivity 10 FP/PM"),
  @("COCOMO II Early Design","COCOMO II","10.4364 KLOC","38.76","3,488,400","Applicable; nominal SF/EM; TDEV 11.74 months"),
  @("Walston-Felix","LOC-oriented","10.4364 KLOC","(43.94)","-","Not fully applicable - small project"),
  @("Bailey-Basili","LOC-oriented","10.4364 KLOC","16.59","1,493,100","Applicable - uncalibrated"),
  @("Boehm simple","LOC-oriented","10.4364 KLOC","37.55","3,379,500","Applicable - uncalibrated"),
  @("Doty","LOC-oriented","10.4364 KLOC","61.62","5,545,800","Applicable (KLOC > 9)"),
  @("Albrecht and Gaffney","FP-oriented","260.91 FP","1.22","-","Not used - unrealistically low"),
  @("Kemerer","FP-oriented","260.91 FP","(213.47)","-","Not fully applicable - overestimates"),
  @("Small project regression","FP-oriented","260.91 FP","92.79","8,351,100","Applicable - upper bound"),
  @("Activity Based Costing","ABC","78 person-weeks","18.00","1,619,982 labour (1,756,482 with overhead)","Applicable (different scope); cash overhead PKR 136,500")
)
for ($i=0;$i -lt 11;$i++){ for($j=0;$j -lt 6;$j++){ $tCmp.Cell($i+1,$j+1).Range.Text = $cmp[$i][$j] } }
Write-Host "Comparison table done"

$r15 = FindHeadingRange "1.5 Task Dependency Table"
$closing = @"
The models disagree for three reasons. Each was fitted to a different set of past projects, with its own languages, tools and productivity; they measure size differently (FP directly, or KLOC converted from FP through our assumed ratio); and they cover different scope, since the effort models include all development work while ABC counts only the scheduled weeks. None has been calibrated with Captain Truck data.
Leaving out the invalid and not fully applicable results, the valid estimates run from 16.59 to 92.79 person-months. The closest to our plan of three members over the 26-week critical path are ABC (18.00), FPA (26.09) and Bailey-Basili (16.59). COCOMO II (38.76) and Boehm simple (37.55) agree with each other and form a cautious upper case. Doty and the small project regression are far above the plan and are not used for budgeting. FPA (PKR 2,348,190) therefore stays our planning baseline, COCOMO II is the cross-check, and we will rate its factors and re-estimate with measured size and effort after Increment 1.
"@
$doc.Range($r15.Start, $r15.Start).InsertBefore((($closing -replace "`r`n","`r") -replace "`n","`r") + "`r")
Write-Host "Closing analysis inserted"

# Renumber subsequent tables (high -> low to avoid collisions)
ReplaceAll "Table 1.17: Risk list" "Table 1.19: Risk list"
ReplaceAll "Table 1.16: Stakeholders and needs" "Table 1.18: Stakeholders and needs"
ReplaceAll "Table 1.15: Problem statement" "Table 1.17: Problem statement"
ReplaceAll "Table 1.14: Tools" "Table 1.16: Tools"
ReplaceAll "Table 1.13: Technologies" "Table 1.15: Technologies"
ReplaceAll "Table 1.12: Task and member assignment" "Table 1.14: Task and member assignment"
ReplaceAll "Table 1.11: Team members and skills" "Table 1.13: Team members and skills"
ReplaceAll "Table 1.10: Increment plan and milestones" "Table 1.12: Increment plan and milestones"
ReplaceAll "Table 1.9: CPM calculations" "Table 1.11: CPM calculations"
ReplaceAll "Table 1.8: Task dependency table" "Table 1.10: Task dependency table"
Write-Host "Table renumbers done"

# TOC entries after TOC 1.4.3
for ($i = 1; $i -le [Math]::Min(100, $doc.Paragraphs.Count); $i++) {
  $p = $doc.Paragraphs.Item($i)
  if ($p.Style.NameLocal -notlike "TOC*") { continue }
  $t = ($p.Range.Text -replace "[\r\a]", "").Trim()
  if ($t.StartsWith("1.4.3 Activity Based Costing")) {
    $nxt = ($doc.Paragraphs.Item($i + 1).Range.Text -replace "[\r\a]", "").Trim()
    if (-not $nxt.StartsWith("1.4.4")) {
      $styleToc = $p.Style.NameLocal
      $p.Range.InsertAfter("1.4.4 LOC-Oriented Estimation Models`r1.4.5 Function Point-Oriented Estimation Models`r1.4.6 Comparative Analysis of Estimation Results`r")
      for ($k = 1; $k -le 3; $k++) {
        try { $doc.Paragraphs.Item($i + $k).Style = $styleToc } catch {}
      }
      Write-Host "TOC lines added after para $i"
    }
    break
  }
}

try { foreach ($toc in $doc.TablesOfContents) { $toc.Update() } } catch {}

$doc.Save()
$doc.Close()
$word.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($doc) | Out-Null
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
[GC]::Collect(); [GC]::WaitForPendingFinalizers()
Write-Host "DONE OK"
