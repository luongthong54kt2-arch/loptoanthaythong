[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$wb = $excel.Workbooks.Open('C:\Users\Admin\Documents\GitHub\quanlytrungtamthaylinh\EXCEL\SGKTHPT.xlsx')

$outLines = @()

for ($i = 1; $i -le $wb.Worksheets.Count; $i++) {
    $ws = $wb.Worksheets.Item($i)
    $sName = $ws.Name
    $outLines += "=================================================="
    $outLines += "SHEET INDEX $i : $sName"
    $outLines += "=================================================="

    $usedRows = $ws.UsedRange.Rows.Count
    $usedCols = $ws.UsedRange.Columns.Count

    for ($r = 1; $r -le $usedRows; $r++) {
        $rowVals = @()
        for ($c = 1; $c -le $usedCols; $c++) {
            $rowVals += $ws.Cells.Item($r, $c).Text
        }
        $nonEmpty = $rowVals | Where-Object { $_ -ne $null -and $_.Trim() -ne "" }
        if ($nonEmpty) {
            $outLines += "Row $($r.ToString().PadLeft(3)): " + ($rowVals -join " | ")
        }
    }
}

$wb.Close($false)
$excel.Quit()

[System.IO.File]::WriteAllLines('c:\Users\Admin\Documents\GitHub\quanlytrungtamthaylinh\all_sheets_full_utf8.txt', $outLines, [System.Text.Encoding]::UTF8)
