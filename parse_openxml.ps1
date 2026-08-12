Add-Type -AssemblyName System.IO.Compression.FileSystem

function Read-ArchiveEntry ($zip, $entryPath) {
    $entry = $zip.Entries | Where-Object { $_.FullName -eq $entryPath }
    if ($entry) {
        $stream = $entry.Open()
        $reader = New-Object System.IO.StreamReader($stream)
        $content = $reader.ReadToEnd()
        $reader.Close()
        $stream.Close()
        return [xml]$content
    }
    return $null
}

$excelPath = "C:\Users\Admin\Documents\GitHub\quanlytrungtamthaylinh\EXCEL\SGKTHPT.xlsx"
$zip = [System.IO.Compression.ZipFile]::OpenRead($excelPath)

# Read sharedStrings.xml
$ssXml = Read-ArchiveEntry $zip "xl/sharedStrings.xml"
$sst = @()
if ($ssXml) {
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

# Read workbook.xml to map r:id to sheet names
$wbXml = Read-ArchiveEntry $zip "xl/workbook.xml"
$relsXml = Read-ArchiveEntry $zip "xl/_rels/workbook.xml.rels"

$sheetMap = @{}
foreach ($rel in $relsXml.Relationships.Relationship) {
    $sheetMap[$rel.Id] = $rel.Target
}

$report = @()

foreach ($sheet in $wbXml.workbook.sheets.sheet) {
    $sheetName = $sheet.name
    $rId = $sheet.id
    $target = $sheetMap[$rId]
    $sheetXmlPath = "xl/" + $target
    $sheetXml = Read-ArchiveEntry $zip $sheetXmlPath

    if ($sheetXml -and $sheetXml.worksheet.sheetData.row) {
        foreach ($row in $sheetXml.worksheet.sheetData.row) {
            $rowNum = $row.r
            $cells = @{}
            foreach ($c in $row.c) {
                $ref = $c.r
                $colLetter = $ref -replace '[0-9]', ''
                $val = ""
                if ($c.t -eq "s") {
                    $idx = [int]$c.v
                    $val = $sst[$idx]
                } else {
                    $val = $c.v
                }
                $cells[$colLetter] = $val
            }

            # Check column E (quantity) or other columns
            # Column mapping: A=1 (STT), B=2 (Mã), C=3 (Tên), D=4 (Giá), E=5 (SL), F=6 (Ghi chú)
            if ($cells.ContainsKey('E') -and $cells['E'] -ne $null) {
                $sl = $cells['E'].ToString().Trim()
                if ($sl -ne "" -and $sl -notlike "*LUONG*" -and $sl -notlike "*LƯỢNG*" -and $sl -ne "SL") {
                    $report += [PSCustomObject]@{
                        Sheet = $sheetName
                        Row = $rowNum
                        STT = $cells['A']
                        MaSo = $cells['B']
                        TenSach = $cells['C']
                        GiaBia = $cells['D']
                        SoLuong = $sl
                        GhiChu = $cells['F']
                    }
                }
            }
        }
    }
}

$zip.Dispose()

$report | Format-Table -AutoSize | Out-String | Set-Content -Path 'c:\Users\Admin\Documents\GitHub\quanlytrungtamthaylinh\fast_orders.txt' -Encoding UTF8
