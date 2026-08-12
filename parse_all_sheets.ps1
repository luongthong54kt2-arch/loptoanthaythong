[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$wb = $excel.Workbooks.Open('C:\Users\Admin\Documents\GitHub\quanlytrungtamthaylinh\EXCEL\SGKTHPT.xlsx')

for ($i = 1; $i -le $wb.Worksheets.Count; $i++) {
    $ws = $wb.Worksheets.Item($i)
    Write-Host "=================================================="
    Write-Host "SHEET: $($ws.Name)"
    Write-Host "=================================================="
    $usedRows = $ws.UsedRange.Rows.Count
    $usedCols = $ws.UsedRange.Columns.Count

    for ($r = 1; $r -le $usedRows; $r++) {
        $rowVals = @()
        $hasVal = $false
        for ($c = 1; $c -le $usedCols; $c++) {
            $val = $ws.Cells.Item($r, $c).Text
            if ($val -ne $null -and $val.Trim() -ne "") {
                $hasVal = $true
            }
            $rowVals += $val
        }
        if ($hasVal) {
            $line = "Row $($r.ToString().PadLeft(3)): " + ($rowVals -join " | ")
            Write-Host $line
        }
    }
}

$wb.Close($false)
$excel.Quit()
