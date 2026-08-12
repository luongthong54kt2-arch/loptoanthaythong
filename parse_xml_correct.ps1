Add-Type -AssemblyName System.IO.Compression.FileSystem

$excelPath = "C:\Users\Admin\Documents\GitHub\quanlytrungtamthaylinh\EXCEL\SGKTHPT.xlsx"
$zip = [System.IO.Compression.ZipFile]::OpenRead($excelPath)

# 1. Shared Strings
$ssEntry = $zip.Entries | Where-Object { $_.FullName -eq "xl/sharedStrings.xml" }
$sst = @()
if ($ssEntry) {
    $stream = $ssEntry.Open()
    $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::UTF8)
    [xml]$ssXml = $reader.ReadToEnd()
    $reader.Close()
    $stream.Close()

    foreach ($si in $ssXml.sst.si) {
        if ($si.t) {
            $sst += $si.t.'#text'
        } elseif ($si.r) {
            $txt = ($si.r | ForEach-Object { $_.t.'#text' }) -join ""
            $sst += $txt
        } else {
            $sst += ""
        }
    }
}

# 2. Workbook sheet names and rels
$wbEntry = $zip.Entries | Where-Object { $_.FullName -eq "xl/workbook.xml" }
$wbStream = $wbEntry.Open()
$wbReader = New-Object System.IO.StreamReader($wbStream, [System.Text.Encoding]::UTF8)
[xml]$wbXml = $wbReader.ReadToEnd()
$wbReader.Close()
$wbStream.Close()

$relsEntry = $zip.Entries | Where-Object { $_.FullName -eq "xl/_rels/workbook.xml.rels" }
$relsStream = $relsEntry.Open()
$relsReader = New-Object System.IO.StreamReader($relsStream, [System.Text.Encoding]::UTF8)
[xml]$relsXml = $relsReader.ReadToEnd()
$relsReader.Close()
$relsStream.Close()

$sheetMap = @{}
foreach ($rel in $relsXml.Relationships.Relationship) {
    $sheetMap[$rel.Id] = $rel.Target
}

$outLines = @()

foreach ($sheet in $wbXml.workbook.sheets.sheet) {
    $sheetName = $sheet.name
    $rId = $sheet.getAttribute("id", "http://schemas.openxmlformats.org/officeDocument/2006/relationships")
    if (-not $rId) { $rId = $sheet.id }
    $target = $sheetMap[$rId]
    if (-not $target.StartsWith("xl/")) { $target = "xl/" + $target }
    
    $sheetEntry = $zip.Entries | Where-Object { $_.FullName -eq $target }
    if ($sheetEntry) {
        $sStream = $sheetEntry.Open()
        $sReader = New-Object System.IO.StreamReader($sStream, [System.Text.Encoding]::UTF8)
        [xml]$sXml = $sReader.ReadToEnd()
        $sReader.Close()
        $sStream.Close()

        $outLines += "=================================================="
        $outLines += "SHEET: $sheetName"
        $outLines += "=================================================="

        if ($sXml.worksheet.sheetData.row) {
            foreach ($row in $sXml.worksheet.sheetData.row) {
                $rowNum = $row.r
                $cellVals = @()
                foreach ($c in $row.c) {
                    $ref = $c.r
                    $val = ""
                    if ($c.t -eq "s") {
                        $idx = [int]$c.v
                        $val = $sst[$idx]
                    } elseif ($c.v) {
                        $val = $c.v
                    }
                    if ($val -ne "") {
                        $cellVals += "${ref}: ${val}"
                    }
                }
                if ($cellVals.Count -gt 0) {
                    $outLines += "Row ${rowNum}: " + ($cellVals -join " | ")
                }
            }
        }
    }
}

$zip.Dispose()

[System.IO.File]::WriteAllLines('c:\Users\Admin\Documents\GitHub\quanlytrungtamthaylinh\xml_dump.txt', $outLines, [System.Text.Encoding]::UTF8)
