# Merge Chapter 1 + Chapter 2 body into one NeoTeach FYP documentation file.
$ErrorActionPreference = "Stop"

$ch1  = "D:\BSSE\Captain_Truck_Chapter1_Feasibility_Report.docx"
$ch2b = "D:\BSSE\_ch2_body_only.docx"
$out  = "D:\BSSE\Captain_Truck_FYP_Documentation.docx"
$pdf  = "D:\BSSE\Captain_Truck_FYP_Documentation.pdf"
$copy = "D:\BSSE\FYP_Documentation_Filled.docx"

if (-not (Test-Path $ch1))  { throw "Missing Chapter 1 docx" }
if (-not (Test-Path $ch2b)) { throw "Missing Chapter 2 body docx - build Chapter 2 first" }

Copy-Item $ch1 $out -Force

$wdCollapseEnd = 0
$wdPageBreak = 7
$wdHeaderFooterPrimary = 1
$wdHeaderFooterFirstPage = 2
$wdHeaderFooterEvenPages = 3
$wdAlignParagraphCenter = 1
$wdFieldPage = 33
$wdPageNumberStyleArabic = 0
$wdPageNumberStyleLowercaseRoman = 4
$wdExportFormatPDF = 17

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0

try {
  $doc = $word.Documents.Open($out)
  Write-Host "Opened combined base. Sections:" $doc.Sections.Count

  $end = $doc.Content
  $end.Collapse($wdCollapseEnd)
  $end.InsertBreak($wdPageBreak)
  $end = $doc.Content
  $end.Collapse($wdCollapseEnd)
  $null = $end.InsertFile($ch2b)
  Write-Host "Inserted Chapter 2 body. Sections now:" $doc.Sections.Count

  for ($i = 1; $i -le $doc.Sections.Count; $i++) {
    $sec = $doc.Sections.Item($i)
    $sec.PageSetup.DifferentFirstPageHeaderFooter = $false
    $sec.PageSetup.OddAndEvenPagesHeaderFooter = $false

    foreach ($hfType in @($wdHeaderFooterPrimary, $wdHeaderFooterFirstPage, $wdHeaderFooterEvenPages)) {
      try {
        $h = $sec.Headers.Item($hfType)
        $h.LinkToPrevious = $false
        $h.Range.Text = ""
      } catch {}
      try {
        $f = $sec.Footers.Item($hfType)
        $f.LinkToPrevious = $false
        $f.Range.Text = ""
      } catch {}
    }

    $footer = $sec.Footers.Item($wdHeaderFooterPrimary)
    $footer.LinkToPrevious = $false

    if ($i -eq 1) {
      $footer.Range.Text = ""
    }
    else {
      $footer.Range.Text = ""
      $r = $footer.Range
      $r.ParagraphFormat.Alignment = $wdAlignParagraphCenter
      $r.Font.Name = "Times New Roman"
      $r.Font.Size = 9
      $r.Text = "Department of Software Engineering`r"
      $r.InsertAfter("© University of Gujrat`r")
      $r.Collapse($wdCollapseEnd)
      $null = $doc.Fields.Add($r, $wdFieldPage)
      $footer.Range.ParagraphFormat.Alignment = $wdAlignParagraphCenter
      $footer.Range.Font.Name = "Times New Roman"
      $footer.Range.Font.Size = 9

      $pnums = $footer.PageNumbers
      $pnums.RestartNumberingAtSection = $true
      $pnums.StartingNumber = 1
      if ($i -eq 2) {
        $pnums.NumberStyle = $wdPageNumberStyleLowercaseRoman
      }
      else {
        $pnums.NumberStyle = $wdPageNumberStyleArabic
      }
    }
  }

  $doc.Fields.Update() | Out-Null
  $doc.Save()
  Copy-Item $out $copy -Force

  if (Test-Path $pdf) { Remove-Item $pdf -Force }
  try {
    $doc.ExportAsFixedFormat($pdf, $wdExportFormatPDF)
    Write-Host "OK pdf" $pdf
  } catch {
    Write-Host "PDF export skipped:" $_.Exception.Message
  }

  $doc.Close($true)
  Write-Host "OK saved" $out
  Write-Host "OK copy" $copy
}
finally {
  $word.Quit()
  [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
  [GC]::Collect(); [GC]::WaitForPendingFinalizers()
}
