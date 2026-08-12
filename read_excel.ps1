$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$wb = $excel.Workbooks.Open('C:\Users\Admin\Documents\GitHub\quanlytrungtamthaylinh\EXCEL\SGKTHPT.xlsx')
for ($i = 1; $i -le $wb.Worksheets.Count; $i++) {
    $ws = $wb.Worksheets.Item($i)
    Write-Host "--- Sheet: $($ws.Name) ---"
    $maxR = [Math]::Min(30, $ws.UsedRange.Rows.Count)
    $maxC = [Math]::Min(15, $ws.UsedRange.Columns.Count)
    for ($r = 1; $r -le $maxR; $r++) {
        $rowStr = ""
        for ($c = 1; $c -le $maxC; $c++) {
            $val = $ws.Cells.Item($r, $c).Text
            $rowStr += "[$val] "
        }
        Write-Host "Row $r : $rowStr"
    }
}
$wb.Close($false)
$excel.Quit()
