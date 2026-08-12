Add-Type -AssemblyName System.IO.Compression.FileSystem

$excelPath = "C:\Users\Admin\Documents\GitHub\quanlytrungtamthaylinh\EXCEL\SGKTHPT.xlsx"
$zip = [System.IO.Compression.ZipFile]::OpenRead($excelPath)

$sheetsToParse = @(
    @{ Name = "lớp 10"; Target = "xl/worksheets/sheet2.xml" },
    @{ Name = "lớp 11"; Target = "xl/worksheets/sheet3.xml" },
    @{ Name = "lớp 12"; Target = "xl/worksheets/sheet4.xml" },
    @{ Name = "SÁCH THAM KHẢO DÙNG CHUNG"; Target = "xl/worksheets/sheet5.xml" }
)

$outLines = @()

foreach ($item in $sheetsToParse) {
    $sheetName = $item.Name
    $target = $item.Target

    $outLines += "=================================================="
    $outLines += "SHEET: $sheetName"
    $outLines += "=================================================="

    $sheetEntry = $zip.Entries | Where-Object { $_.FullName -eq $target }
    if ($sheetEntry) {
        $sStream = $sheetEntry.Open()
        $sReader = New-Object System.IO.StreamReader($sStream, [System.Text.Encoding]::UTF8)
        [xml]$sXml = $sReader.ReadToEnd()
        $sReader.Close()
        $sStream.Close()

        $rows = $sXml.SelectNodes("//*[local-name()='row']")
        foreach ($row in $rows) {
            $rowNum = $row.getAttribute("r")
            $cells = $row.SelectNodes("./*[local-name()='c']")
            
            $cellDict = @{}
            foreach ($c in $cells) {
                $ref = $c.getAttribute("r")
                $colLetter = $ref -replace '[0-9]', ''
                $vNode = $c.SelectSingleNode("./*[local-name()='v']")
                $val = ""
                if ($vNode) { $val = $vNode.InnerText }
                
                # Check inlineStr if present
                $isNode = $c.SelectSingleNode("./*[local-name()='is']")
                if ($isNode) { $val = $isNode.InnerText }
                
                $cellDict[$colLetter] = $val
            }

            # Check column E (quantity)
            if ($cellDict.ContainsKey('E') -and $cellDict['E'] -ne $null) {
                $sl = $cellDict['E'].ToString().Trim()
                if ($sl -ne "" -and $sl -ne "0") {
                    $stt = $cellDict['A']
                    $ma = $cellDict['B']
                    $ten = $cellDict['C']
                    $gia = $cellDict['D']
                    $ghichu = $cellDict['F']
                    $outLines += "Row ${rowNum}: STT=[$stt] MA=[$ma] TEN=[$ten] GIA=[$gia] SL=[$sl] GHICHU=[$ghichu]"
                }
            }
        }
    }
}

$zip.Dispose()

[System.IO.File]::WriteAllLines('c:\Users\Admin\Documents\GitHub\quanlytrungtamthaylinh\raw_orders.txt', $outLines, [System.Text.Encoding]::UTF8)
