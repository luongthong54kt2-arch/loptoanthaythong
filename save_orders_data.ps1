Add-Type -AssemblyName System.IO.Compression.FileSystem

$excelPath = "C:\Users\Admin\Documents\GitHub\quanlytrungtamthaylinh\EXCEL\SGKTHPT.xlsx"
$zip = [System.IO.Compression.ZipFile]::OpenRead($excelPath)

$sheetsToParse = @(
    @{ Name = "Lớp 10"; Target = "xl/worksheets/sheet2.xml" },
    @{ Name = "Lớp 11"; Target = "xl/worksheets/sheet3.xml" },
    @{ Name = "Lớp 12"; Target = "xl/worksheets/sheet4.xml" }
)

$allOrders = @()

foreach ($item in $sheetsToParse) {
    $sheetName = $item.Name
    $target = $item.Target

    $sheetEntry = $zip.Entries | Where-Object { $_.FullName -eq $target }
    if ($sheetEntry) {
        $sStream = $sheetEntry.Open()
        $sReader = New-Object System.IO.StreamReader($sStream, [System.Text.Encoding]::UTF8)
        [xml]$sXml = $sReader.ReadToEnd()
        $sReader.Close()
        $sStream.Close()

        $rows = $sXml.SelectNodes("//*[local-name()='row']")
        foreach ($row in $rows) {
            $cells = $row.SelectNodes("./*[local-name()='c']")
            
            $cellDict = @{}
            foreach ($c in $cells) {
                $ref = $c.getAttribute("r")
                $colLetter = $ref -replace '[0-9]', ''
                $vNode = $c.SelectSingleNode("./*[local-name()='v']")
                $val = ""
                if ($vNode) { $val = $vNode.InnerText }
                
                $isNode = $c.SelectSingleNode("./*[local-name()='is']")
                if ($isNode) { $val = $isNode.InnerText }
                
                $cellDict[$colLetter] = $val
            }

            if ($cellDict.ContainsKey('E') -and $cellDict['E'] -ne $null) {
                $slRaw = $cellDict['E'].ToString().Trim()
                if ($slRaw -match '^\d+$') {
                    $sl = [int]$slRaw
                    if ($sl -gt 0) {
                        $stt = $cellDict['A']
                        $ma = $cellDict['B']
                        $ten = $cellDict['C']
                        $giaRaw = $cellDict['D']
                        $gia = 0
                        if ($giaRaw -match '^\d+$') { $gia = [int]$giaRaw }
                        $ghichu = $cellDict['F']

                        $allOrders += [PSCustomObject]@{
                            Lop = $sheetName
                            STT = $stt
                            MaSach = $ma
                            TenSach = $ten
                            GiaBia = $gia
                            SoLuong = $sl
                            ThanhTien = $gia * $sl
                            GhiChu = $ghichu
                        }
                    }
                }
            }
        }
    }
}

$zip.Dispose()

$allOrders | Export-Clixml -Path 'c:\Users\Admin\Documents\GitHub\quanlytrungtamthaylinh\orders_data.xml'
