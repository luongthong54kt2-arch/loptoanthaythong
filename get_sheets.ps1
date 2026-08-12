$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$wb = $excel.Workbooks.Open('C:\Users\Admin\Documents\GitHub\quanlytrungtamthaylinh\EXCEL\SGKTHPT.xlsx')

$res = @()
for ($i = 1; $i -le $wb.Worksheets.Count; $i++) {
    $ws = $wb.Worksheets.Item($i)
    $res += "SheetIdx $i : $($ws.Name)"
}
$wb.Close($false)
$excel.Quit()
$res | Set-Content -Path 'c:\Users\Admin\Documents\GitHub\quanlytrungtamthaylinh\sheet_names.txt' -Encoding UTF8
