$ErrorActionPreference = "Stop"
$path = "D:\BSSE\Captain_Truck_Chapter1_Feasibility_Report.docx"
$pdf  = "D:\BSSE\Captain_Truck_Chapter1_Feasibility_Report.pdf"

# Ensure no leftover Word locks
Get-Process WINWORD -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 1

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
  $doc = $word.Documents.Open($path, $false, $true) # ReadOnly open for export first? better read-write for footer fix

  Write-Host "Sections:" $doc.Sections.Count

  for ($i = 1; $i -le $doc.Sections.Count; $i++) {
    $sec = $doc.Sections.Item($i)
    $sec.PageSetup.DifferentFirstPageHeaderFooter = $false
    $sec.PageSetup.OddAndEvenPagesHeaderFooter = $false

    # Clear headers
    foreach ($t in 1,2,3) {
      try { $sec.Headers.Item($t).LinkToPrevious = $false; $sec.Headers.Item($t).Range.Text = "" } catch {}
    }

    $footer = $sec.Footers.Item(1)
    $footer.LinkToPrevious = $false

    if ($i -eq 1) {
      $footer.Range.Text = ""
    } else {
      $footer.Range.Text = ""
      $r = $footer.Range
      $r.ParagraphFormat.Alignment = 1
      $r.Font.Name = "Times New Roman"
      $r.Font.Size = 9
      $r.InsertAfter("Department of Software Engineering`r")
      $r.InsertAfter("© University of Gujrat`r")
      $r.Collapse(0)
      [void]$doc.Fields.Add($r, 33) # PAGE
      try {
        $pn = $footer.PageNumbers
        $pn.RestartNumberingAtSection = $true
        $pn.StartingNumber = 1
        if ($i -eq 2) { $pn.NumberStyle = 4 } else { $pn.NumberStyle = 0 }
      } catch {
        Write-Host "PageNumbers note:" $_.Exception.Message
      }
    }
  }

  $doc.Fields.Update() | Out-Null
  $doc.Save()
  if (Test-Path $pdf) { Remove-Item $pdf -Force }
  $doc.ExportAsFixedFormat($pdf, 17)
  $doc.Close($true)
  Write-Host "DONE"
}
finally {
  $word.Quit()
  [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
}
