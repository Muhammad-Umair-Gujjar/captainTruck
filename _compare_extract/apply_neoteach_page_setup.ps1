# NeoTeach page setup for Captain Truck Chapter 1
$ErrorActionPreference = "Stop"
$path = "D:\BSSE\Captain_Truck_Chapter1_Feasibility_Report.docx"
$pdf  = "D:\BSSE\Captain_Truck_Chapter1_Feasibility_Report.pdf"

$wdHeaderFooterPrimary = 1
$wdHeaderFooterFirstPage = 2
$wdHeaderFooterEvenPages = 3
$wdAlignParagraphCenter = 1
$wdFieldPage = 33
$wdPageNumberStyleArabic = 0
$wdPageNumberStyleLowercaseRoman = 4
$wdExportFormatPDF = 17
$wdCollapseEnd = 0

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0

try {
  $doc = $word.Documents.Open($path)
  Write-Host "Sections:" $doc.Sections.Count

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
      # Title: blank footer, no visible page number
      $footer.Range.Text = ""
    }
    else {
      # NeoTeach footer text + PAGE field
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

  if (Test-Path $pdf) { Remove-Item $pdf -Force }
  $doc.ExportAsFixedFormat($pdf, $wdExportFormatPDF)
  $doc.Close($true)
  Write-Host "OK saved" $path
  Write-Host "OK pdf" $pdf
}
finally {
  $word.Quit()
  [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
  [GC]::Collect(); [GC]::WaitForPendingFinalizers()
}
