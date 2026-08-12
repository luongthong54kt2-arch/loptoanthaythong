[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$wb = $excel.Workbooks.Open('C:\Users\Admin\Documents\GitHub\quanlytrungtamthaylinh\EXCEL\SGKTHPT.xlsx')

$sheets = @("lớp 10", "lớp 11", "lớp 12")

foreach ($sName in $sheets) {
    try {
        $ws = $wb.Worksheets.Item($sName)
        Write-Host "=================================================="
        Write-Host "SHEET: $sName"
        Write-Host "=================================================="
        $usedRows = $ws.UsedRange.Rows.Count
        for ($r = 1; $r -le $usedRows; $r++) {
            $stt = $ws.Cells.Item($r, 1).Text
            $ma = $ws.Cells.Item($r, 2).Text
            $ten = $ws.Cells.Item($r, 3).Text
            $gia = $ws.Cells.Item($r, 4).Text
            $sl = $ws.Cells.Item($r, 5).Text
            $ghichu = $ws.Cells.Item($r, 6).Text

            if ($sl -ne $null -and $sl.Trim() -ne "") {
                Write-Host "Row $($r.ToString().PadLeft(3)): STT=[$stt] MA=[$ma] TEN=[$ten] GIA=[$gia] SL=[$sl] GHICHU=[$ghichu]"
            }
        }
    } catch {
        Write-Host "Error reading sheet $sName : $_"
    }
}

$wb.Close($false)
$excel.Quit()
