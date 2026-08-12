$data = Import-Clixml -Path 'c:\Users\Admin\Documents\GitHub\quanlytrungtamthaylinh\orders_data.xml'

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false

$newWb = $excel.Workbooks.Add()
$ws = $newWb.Worksheets.Item(1)
$ws.Name = "TongHopHoaDon"

# Title
$ws.Cells.Item(1, 1).Value2 = "BANG TONG HOP HOA DON DAT SACH GIAP KHOA THPT"
$ws.Range("A1:H1").Merge()
$ws.Range("A1:H1").Font.Bold = $true
$ws.Range("A1:H1").Font.Size = 16
$ws.Range("A1:H1").HorizontalAlignment = -4108 # Center

# Headers
$headers = @("Khoi Lop", "STT", "Ma Sach", "Ten Sach", "Gia Bia (VND)", "So Luong", "Thanh Tien (VND)", "Ghi Chu")
for ($c = 1; $c -le $headers.Count; $c++) {
    $ws.Cells.Item(3, $c).Value2 = $headers[$c - 1]
    $ws.Cells.Item(3, $c).Font.Bold = $true
    $ws.Cells.Item(3, $c).Interior.Color = 14395790 # Soft Blue Accent
    $ws.Cells.Item(3, $c).HorizontalAlignment = -4108
}

$r = 4
foreach ($item in $data) {
    $ws.Cells.Item($r, 1).Value2 = [string]$item.Lop
    $ws.Cells.Item($r, 2).Value2 = [string]$item.STT
    $ws.Cells.Item($r, 3).Value2 = [string]$item.MaSach
    $ws.Cells.Item($r, 4).Value2 = [string]$item.TenSach
    $ws.Cells.Item($r, 5).Value = [double]$item.GiaBia
    $ws.Cells.Item($r, 5).NumberFormat = "#,##0"
    $ws.Cells.Item($r, 6).Value = [double]$item.SoLuong
    $ws.Cells.Item($r, 6).NumberFormat = "#,##0"
    $ws.Cells.Item($r, 7).Value2 = "=E$r*F$r"
    $ws.Cells.Item($r, 7).NumberFormat = "#,##0"
    $ws.Cells.Item($r, 8).Value2 = [string]$item.GhiChu
    $r++
}

# Summary Row
$ws.Cells.Item($r, 4).Value2 = "TONG CONG"
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

Write-Host "File created clean: $outputPath"
