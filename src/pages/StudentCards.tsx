// ── Single Card Component (THIẾT KẾ THEO YÊU CẦU MỚI) ──────────────────
function StudentCard({ student, centerName, classInfo, theme }: {
  student: any; centerName: string; classInfo: any; theme: ThemeKey
}) {
  const t        = THEMES[theme]
  const initials = student.full_name?.split(' ').slice(-2).map((w: string) => w[0]).join('').toUpperCase() || 'HS'
  const url      = `${window.location.origin}/progress?code=${student.student_code}`
  const qrSrc = `https://quickchart.io/qr?text=${encodeURIComponent(url)}&size=100&margin=2&dark=${t.qrColor}&light=ffffff`

  // Ưu tiên tên nhập ở ô cấu hình, nếu trống sẽ lấy mặc định "LỚP TOÁN THẦY LĨNH"
  const displayName = centerName?.trim() || 'LỚP TOÁN THẦY LĨNH'

  return (
    <div className="student-card" style={{
      width: '85.6mm', height: '54mm',
      borderRadius: '3.5mm',
      overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      fontFamily: '"Segoe UI", system-ui, sans-serif',
      backgroundColor: '#ffffff',
      boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
      flexShrink: 0,
      position: 'relative',
    }}>

      {/* Header - Được nới rộng để làm nổi bật thương hiệu */}
      <div style={{
        background: t.gradient,
        padding: '3.5mm 4.5mm 3mm',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        minHeight: '19mm',
      }}>
        <div style={{ flex: 1, paddingRight: '2mm' }}>
          <div style={{
            color: 'rgba(255,255,255,0.85)',
            fontSize: '6.5px',
            fontWeight: 800,
            letterSpacing: '2.5px', textTransform: 'uppercase', marginBottom: '0.8mm',
          }}>
            THẺ HỌC VIÊN
          </div>
          {/* LỚP TOÁN THẦY LĨNH - Chữ lớn nhất, sáng và nổi bật nhất */}
          <div style={{ 
            color: '#ffffff', 
            fontSize: '15px', 
            fontWeight: 900, 
            lineHeight: 1.15, 
            letterSpacing: '-0.2px',
            maxWidth: '52mm' 
          }}>
            {displayName}
          </div>
          {/* Thay chữ môn học thành Số điện thoại */}
          <div style={{ 
            color: '#ffffff', 
            fontSize: '8.5px', 
            marginTop: '1.2mm', 
            fontWeight: 700,
            letterSpacing: '0.3px',
            opacity: 0.95
          }}>
            SĐT: 0866976878
          </div>
        </div>

        {/* Avatar circle */}
        <div style={{
          width: '11.5mm', height: '11.5mm',
          background: 'rgba(255,255,255,0.22)',
          border: '1.5px solid rgba(255,255,255,0.6)',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#ffffff', fontSize: '9.5px', fontWeight: 900, flexShrink: 0,
        }}>
          {initials}
        </div>
      </div>

      {/* Body - Phối hợp màu sắc có chiều sâu và độ tương phản cao */}
      <div style={{
        flex: 1, padding: '3mm 4.5mm',
        display: 'flex', gap: '3mm', alignItems: 'stretch',
      }}>
        {/* Info */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1.5mm' }}>
          {/* Tên học viên - Chữ đậm nét, tinh tế */}
          <div style={{ 
            fontSize: '13.5px', 
            fontWeight: 800, 
            color: '#0f172a', /* Màu Slate-900 siêu sang trọng, dịu mắt hơn đen đặc */
            lineHeight: 1.2 
          }}>
            {student.full_name}
          </div>
          {/* Mã học viên */}
          <div style={{ 
            fontSize: '9.5px', 
            fontFamily: '"Courier New", Courier, monospace', 
            fontWeight: 700, 
            color: '#475569', /* Màu chữ xám đậm Slate-600 */
            letterSpacing: '0.8px' 
          }}>
            {student.student_code}
          </div>
          
          {/* Thông tin lớp học */}
          {classInfo && (
            <div style={{ 
              fontSize: '9.5px', 
              color: '#1e293b', /* Màu Slate-800 sắc nét */
              fontWeight: 700, 
              marginTop: '0.5mm' 
            }}>
              Lớp: {classInfo.class_name || classInfo.name}
            </div>
          )}
          {student.grade && (
            <div style={{ 
              fontSize: '8.5px', 
              color: '#64748b', 
              fontWeight: 700 
            }}>
              Khối {student.grade}
            </div>
          )}
          <div style={{
            marginTop: '1.5mm', height: '1.2mm', width: '40%',
            borderRadius: '1mm', background: t.gradient, opacity: 0.8,
          }} />
        </div>

        {/* Cụm QR Code */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '1.2mm',
          paddingLeft: '2.5mm', borderLeft: '0.5mm dashed #e2e8f0',
        }}>
          <img src={qrSrc} alt="QR" style={{ width: '17.5mm', height: '17.5mm', display: 'block' }} />
          <div style={{ 
            fontSize: '5.5px', 
            color: '#334155', 
            fontWeight: 800,  
            textAlign: 'center', 
            lineHeight: 1.4,
            textTransform: 'uppercase',
            letterSpacing: '0.2px'
          }}>
            Scan xem<br />tiến trình
          </div>
        </div>
      </div>
    </div>
  )
}
