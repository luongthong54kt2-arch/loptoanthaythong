$data = Import-Clixml -Path 'c:\Users\Admin\Documents\GitHub\quanlytrungtamthaylinh\orders_data.xml'

$totalSL = 0
$totalTT = 0

$lines = @()
$lines += "========================================================================================================="
$lines += "TONG HOP CHI TIET DON DAT SACH GIAO KHOA THPT (TU FILE SGKTHPT.xlsx)"
$lines += "========================================================================================================="

foreach ($item in $data) {
    $totalSL += $item.SoLuong
    $totalTT += $item.ThanhTien
    $gb = $item.GiaBia.ToString('#,##0')
    $tt = $item.ThanhTien.ToString('#,##0')
    $line = "[{0}] STT {1,2} | Ma: {2,-10} | Ten: {3,-55} | Gia: {4,8} đ | SL: {5,2} | ThanhTien: {6,10} đ | Ghi chu: {7}" -f $item.Lop, $item.STT, $item.MaSach, $item.TenSach, $gb, $item.SoLuong, $tt, $item.GhiChu
    $lines += $line
}

$lines += "========================================================================================================="
$lines += ("TONG SO LUONG SACH DAT: {0} quyen" -f $totalSL)
$lines += ("TONG THANH TIEN:        {0} VNĐ" -f $totalTT.ToString('#,##0'))
$lines += "========================================================================================================="

[System.IO.File]::WriteAllLines('c:\Users\Admin\Documents\GitHub\quanlytrungtamthaylinh\final_summary_ascii.txt', $lines, [System.Text.Encoding]::UTF8)
