[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$data = Import-Clixml -Path 'c:\Users\Admin\Documents\GitHub\quanlytrungtamthaylinh\orders_data.xml'

$totalSL = 0
$totalTT = 0

Write-Host "TỔNG HỢP CHI TIẾT ĐƠN ĐẶT SÁCH GIÁO KHOA THPT"
Write-Host "========================================================================================================="

foreach ($item in $data) {
    $totalSL += $item.SoLuong
    $totalTT += $item.ThanhTien
    $gb = "{0:N0}" -f $item.GiaBia
    $tt = "{0:N0}" -f $item.ThanhTien
    Write-Host ("[{0}] STT {1,2} | Mã: {2,-10} | {3,-60} | Giá: {4,8} đ | SL: {5,2} | TT: {6,10} đ | Ghi chú: {7}" -f $item.Lop, $item.STT, $item.MaSach, $item.TenSach, $gb, $item.SoLuong, $tt, $item.GhiChu)
}

Write-Host "========================================================================================================="
Write-Host ("TỔNG SỐ LƯỢNG SÁCH ĐẶT: {0} quyển" -f $totalSL)
Write-Host ("TỔNG THÀNH TIỀN:        {0:N0} VNĐ" -f $totalTT)
