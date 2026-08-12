$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$wb = $excel.Workbooks.Open('C:\Users\Admin\Documents\GitHub\quanlytrungtamthaylinh\EXCEL\SGKTHPT.xlsx')

Remove-Item -Path 'c:\Users\Admin\Documents\GitHub\quanlytrungtamthaylinh\all_rows_utf8.txt' -ErrorAction SilentlyContinue

for ($i = 1; $i -le $wb.Worksheets.Count; $i++) {
    $ws = $wb.Worksheets.Item($i)
    $sheetName = $ws.Name
    $usedRows = $ws.UsedRange.Rows.Count
    $usedCols = $ws.UsedRange.Columns.Count

    for ($r = 1; $r -le $usedRows; $r++) {
        $vals = @()
        for ($c = 1; $c -le $usedCols; $c++) {
            $vals += $ws.Cells.Item($r, $c).Text
        }
        
        $nonEmpty = $vals | Where-Object { $_ -ne "" }
        if ($nonEmpty) {
            $outLine = "Sheet [${sheetName}] Row ${r}: " + ($vals -join " | ")
            [System.IO.File]::AppendAllText('c:\Users\Admin\Documents\GitHub\quanlytrungtamthaylinh\all_rows_utf8.txt', $outLine + "`r`n", [System.Text.Encoding]::UTF8)
        }
    }
}

$wb.Close($false)
$excel.Quit()
