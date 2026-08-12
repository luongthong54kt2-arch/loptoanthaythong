Add-Type -AssemblyName System.IO.Compression.FileSystem

$excelPath = "C:\Users\Admin\Documents\GitHub\quanlytrungtamthaylinh\EXCEL\SGKTHPT.xlsx"
$zip = [System.IO.Compression.ZipFile]::OpenRead($excelPath)

# Read workbook.xml.rels
$relsEntry = $zip.Entries | Where-Object { $_.FullName -eq "xl/_rels/workbook.xml.rels" }
$relsStream = $relsEntry.Open()
$relsReader = New-Object System.IO.StreamReader($relsStream, [System.Text.Encoding]::UTF8)
$relsContent = $relsReader.ReadToEnd()
$relsReader.Close()
$relsStream.Close()

# Read workbook.xml
$wbEntry = $zip.Entries | Where-Object { $_.FullName -eq "xl/workbook.xml" }
$wbStream = $wbEntry.Open()
$wbReader = New-Object System.IO.StreamReader($wbStream, [System.Text.Encoding]::UTF8)
$wbContent = $wbReader.ReadToEnd()
$wbReader.Close()
$wbStream.Close()

Write-Host "--- WORKBOOK.XML ---"
Write-Host $wbContent

Write-Host "--- WORKBOOK.XML.RELS ---"
Write-Host $relsContent

$zip.Dispose()
