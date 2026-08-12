$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$wb = $excel.Workbooks.Open('C:\Users\Admin\Documents\GitHub\quanlytrungtamthaylinh\EXCEL\SGKTHPT.xlsx')

$orders = @()

for ($i = 1; $i -le $wb.Worksheets.Count; $i++) {
    $ws = $wb.Worksheets.Item($i)
    $sheetName = $ws.Name
    $usedRows = $ws.UsedRange.Rows.Count
    $usedCols = $ws.UsedRange.Columns.Count

    for ($r = 1; $r -le $usedRows; $r++) {
        $stt = $ws.Cells.Item($r, 1).Text
        $ma = $ws.Cells.Item($r, 2).Text
        $ten = $ws.Cells.Item($r, 3).Text
        $gia = $ws.Cells.Item($r, 4).Text
        $sl = $ws.Cells.Item($r, 5).Text
        $ghichu = $ws.Cells.Item($r, 6).Text

        if ($sl -ne $null) {
            $slTrim = $sl.Trim()
            if ($slTrim -ne "" -and $slTrim -notlike "*LUONG*" -and $slTrim -notlike "*LƯỢNG*" -and $slTrim -ne "SL") {
                $orders += [PSCustomObject]@{
                    Sheet = $sheetName
                    Row = $r
                    STT = $stt
                    MaSo = $ma
                    TenSach = $ten
                    GiaBia = $gia
                    SoLuong = $slTrim
                    GhiChu = $ghichu
                }
            }
        }
    }
}

$wb.Close($false)
$excel.Quit()

$orders | Format-Table -AutoSize | Out-String | Set-Content -Path 'c:\Users\Admin\Documents\GitHub\quanlytrungtamthaylinh\orders_found.txt' -Encoding UTF8
