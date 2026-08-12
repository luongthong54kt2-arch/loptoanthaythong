$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$wb = $excel.Workbooks.Open('C:\Users\Admin\Documents\GitHub\quanlytrungtamthaylinh\EXCEL\SGKTHPT.xlsx')

$sheetsToParse = @(
    @{ Name = "Lớp 10"; Target = "xl/worksheets/sheet2.xml" },
    @{ Name = "Lớp 11"; Target = "xl/worksheets/sheet3.xml" },
    @{ Name = "Lớp 12"; Target = "xl/worksheets/sheet4.xml" }
)

Add-Type -AssemblyName System.IO.Compression.FileSystem

$excelPath = "C:\Users\Admin\Documents\GitHub\quanlytrungtamthaylinh\EXCEL\SGKTHPT.xlsx"
$zip = [System.IO.Compression.ZipFile]::OpenRead($excelPath)

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
$wb.Close($false)

# Create new Excel workbook with summary
$newWb = $excel.Workbooks.Add()
$ws = $newWb.Worksheets.Item(1)
$ws.Name = "TongHopHoaDon"

# Title
$ws.Cells.Item(1, 1).Value2 = "BẢNG TỔNG HỢP HÓA ĐƠN ĐẶT SÁCH GIÁO KHOA THPT"
$ws.Range("A1:H1").Merge()
$ws.Range("A1:H1").Font.Bold = $true
$ws.Range("A1:H1").Font.Size = 16
$ws.Range("A1:H1").HorizontalAlignment = -4108 # Center

# Headers
$headers = @("Khối Lớp", "STT", "Mã Sách", "Tên Sách", "Giá Bìa (Đồng)", "Số Lượng Đặt", "Thành Tiền (Đồng)", "Ghi Chú")
for ($c = 1; $c -le $headers.Count; $c++) {
    $ws.Cells.Item(3, $c).Value2 = $headers[$c - 1]
    $ws.Cells.Item(3, $c).Font.Bold = $true
    $ws.Cells.Item(3, $c).Interior.Color = 14395790 # Soft Blue Accent
    $ws.Cells.Item(3, $c).HorizontalAlignment = -4108
}

$r = 4
foreach ($item in $allOrders) {
    $ws.Cells.Item($r, 1).Value2 = $item.Lop
    $ws.Cells.Item($r, 2).Value2 = $item.STT
    $ws.Cells.Item($r, 3).Value2 = $item.MaSach
    $ws.Cells.Item($r, 4).Value2 = $item.TenSach
    $ws.Cells.Item($r, 5).Value2 = $item.GiaBia
    $ws.Cells.Item($r, 5).NumberFormat = "#,##0"
    $ws.Cells.Item($r, 6).Value2 = $item.SoLuong
    $ws.Cells.Item($r, 6).NumberFormat = "#,##0"
    $ws.Cells.Item($r, 7).Value2 = "=E$r*F$r"
    $ws.Cells.Item($r, 7).NumberFormat = "#,##0"
    $ws.Cells.Item($r, 8).Value2 = $item.GhiChu
    $r++
}

# Summary Row
$ws.Cells.Item($r, 4).Value2 = "TỔNG CỘNG"
$ws.Cells.Item($r, 4).Font.Bold = $true
$ws.Cells.Item($r, 4).HorizontalAlignment = -4108

$ws.Cells.Item($r, 6).Value2 = "=SUM(F4:F" + ($r - 1) + ")"
$ws.Cells.Item($r, 6).Font.Bold = $true
$ws.Cells.Item($r, 6).NumberFormat = "#,##0"

$ws.Cells.Item($r, 7).Value2 = "=SUM(G4:G" + ($r - 1) + ")"
$ws.Cells.Item($r, 7).Font.Bold = $true
$ws.Cells.Item($r, 7).NumberFormat = "#,##0"

# Formatting borders & columns
$usedRange = $ws.Range("A3:H$r")
$usedRange.Borders.LineStyle = 1

$ws.Columns.Item(1).ColumnWidth = 12
$ws.Columns.Item(2).ColumnWidth = 8
$ws.Columns.Item(3).ColumnWidth = 15
$ws.Columns.Item(4).ColumnWidth = 55
$ws.Columns.Item(5).ColumnWidth = 16
$ws.Columns.Item(6).ColumnWidth = 15
$ws.Columns.Item(7).ColumnWidth = 18
$ws.Columns.Item(8).ColumnWidth = 40

$outputPath = "C:\Users\Admin\Documents\GitHub\quanlytrungtamthaylinh\EXCEL\TongHop_HoaDon_DatSach_SGKTHPT.xlsx"
Remove-Item -Path $outputPath -ErrorAction SilentlyContinue

$newWb.SaveAs($outputPath)
$newWb.Close($false)
$excel.Quit()

Write-Host "File saved successfully at: $outputPath"
