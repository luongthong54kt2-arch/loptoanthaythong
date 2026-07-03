// @ts-nocheck
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  LogOut, 
  ChevronRight, 
  BookOpen, 
  UserCircle, 
  GraduationCap, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Lock, 
  FileText, 
  CheckCircle, 
  Clock 
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

export default function StudentPortal() {
  const navigate = useNavigate()
  const [student, setStudent] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Đăng nhập form
  const [studentCodeInput, setStudentCodeInput] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  // Danh sách bài thi và bài làm
  const [examsList, setExamsList] = useState<any[]>([])
  const [submissionsList, setSubmissionsList] = useState<any[]>([])

  useEffect(() => {
    const sessionStr = sessionStorage.getItem('current_student')
    if (sessionStr) {
      const parsed = JSON.parse(sessionStr)
      setStudent(parsed)
      fetchStudentData(parsed.id)
    } else {
      setLoading(false)
    }
  }, [])

  // ── Tải danh sách bài thi và kết quả làm bài ─────────────────
  const fetchStudentData = async (studentId: string) => {
    setLoading(true)
    try {
      // 1. Lấy danh sách lớp học sinh tham gia
      const { data: enrolls } = await supabase
        .from('enrollments')
        .select('class_id')
        .eq('student_id', studentId)
        .eq('status', 'active')

      const myClassIds = enrolls?.map(e => e.class_id) || []

      // 2. Lấy tất cả phòng thi
      const { data: rooms, error: roomsErr } = await supabase
        .from('exam_rooms')
        .select(`
          *,
          exams ( title ),
          classes ( class_name )
        `)
        .order('created_at', { ascending: false })

      if (roomsErr) throw roomsErr

      // Lọc phòng thi học sinh được phép tham gia (phòng thi chung hoặc thuộc lớp của học sinh)
      const eligibleRooms = (rooms || []).filter((room: any) => {
        return !room.class_id || myClassIds.includes(room.class_id)
      })

      // 3. Lấy danh sách bài nộp của học sinh
      const { data: subs, error: subsErr } = await supabase
        .from('exam_submissions')
        .select('*')
        .eq('student_id', studentId)

      if (subsErr) throw subsErr

      setExamsList(eligibleRooms)
      setSubmissionsList(subs || [])
    } catch (error) {
      console.error('Lỗi tải dữ liệu:', error)
      toast.error('Không thể tải danh sách bài thi.')
    } finally {
      setLoading(false)
    }
  }

  // ── Xác minh học sinh (mã + mật khẩu bắt buộc) ─────────────
  const verifyStudent = async (code: string, password: string) => {
    if (!code.trim()) {
      toast.error('Vui lòng nhập Mã học sinh!')
      return null
    }
    if (!password.trim()) {
      toast.error('Vui lòng nhập Mật khẩu!')
      return null
    }

    const { data, error } = await supabase
      .from('students')
      .select('*')
      .ilike('student_code', code.trim())
      .maybeSingle()

    if (error || !data) {
      toast.error('Sai Mã học sinh! Vui lòng kiểm tra lại.')
      return null
    }

    if (data.status === 'inactive') {
      toast.error('Tài khoản học sinh này đã bị khóa hoặc nghỉ học.')
      return null
    }

    if (!data.password) {
      toast.error('Tài khoản này chưa được đặt mật khẩu. Vui lòng liên hệ giáo viên.')
      return null
    }

    if (data.password !== password.trim()) {
      toast.error('Sai mật khẩu! Vui lòng kiểm tra lại.')
      return null
    }

    sessionStorage.setItem('current_student', JSON.stringify(data))
    sessionStorage.setItem('studentName', data.full_name)
    sessionStorage.setItem('student_name', data.full_name)

    return data
  }

  // ── Đăng nhập học sinh ─────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoggingIn(true)
    try {
      const studentData = await verifyStudent(studentCodeInput, passwordInput)
      if (!studentData) return

      setStudent(studentData)
      toast.success(`Xin chào, ${studentData.full_name}! 👋`)
      await fetchStudentData(studentData.id)
    } catch (err) {
      toast.error('Lỗi kết nối máy chủ!')
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handleLogout = () => {
    sessionStorage.removeItem('current_student')
    sessionStorage.removeItem('studentName')
    sessionStorage.removeItem('student_name')
    setStudent(null)
    setStudentCodeInput('')
    setPasswordInput('')
    setExamsList([])
    setSubmissionsList([])
  }

  // ── Loading ──────────────────────────────────────────────────
  if (loading && student) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-teal-50">
        <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 font-bold text-teal-700">Đang tải danh sách bài thi...</p>
      </div>
    )
  }

  // ── GIAO DIỆN ĐĂNG NHẬP ─────────────────────────────────────
  if (!student) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: 'linear-gradient(135deg, #ccfbf1 0%, #5eead4 50%, #0d9488 100%)' }}
      >
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-teal-300/30 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-teal-600/20 rounded-full blur-3xl" />
        </div>

        <div className="relative w-full max-w-md animate-fade-in">
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl border-2 border-teal-200 overflow-hidden">
            {/* Header */}
            <div 
              className="px-8 pt-10 pb-8 text-center text-white"
              style={{ background: 'linear-gradient(135deg, #0d9488, #14b8a6, #5eead4)' }}
            >
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg backdrop-blur-sm">
                <GraduationCap className="w-9 h-9 text-white" />
              </div>
              <h1 className="font-extrabold text-2xl tracking-wide uppercase">LỚP TOÁN THẦY LĨNH</h1>
              <h2 className="text-white/90 font-bold text-lg mt-1">Bài Tập Về Nhà</h2>
              <p className="text-white/75 text-xs mt-2 italic max-w-xs mx-auto leading-relaxed">
                Sau mỗi buổi học thầy sẽ giao 2 đề thi, các học trò cố gắng làm hết 2 đề thi này
              </p>
            </div>

            <form onSubmit={handleLogin} className="p-8 space-y-5">
              <h3 className="text-gray-800 font-extrabold text-xl mb-4 text-center">ĐĂNG NHẬP CỔNG THI</h3>

              {/* Mã học sinh */}
              <div>
                <label className="block text-xs font-bold text-teal-700 mb-1 uppercase tracking-wide">Mã học sinh *</label>
                <input
                  type="text"
                  value={studentCodeInput}
                  onChange={e => setStudentCodeInput(e.target.value.toUpperCase())}
                  placeholder="VD: HS001"
                  className="w-full px-4 py-3 rounded-xl border-2 border-teal-100 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/20 transition-all font-mono font-bold text-lg text-center uppercase tracking-widest bg-white"
                  required
                />
              </div>

              {/* Mật khẩu */}
              <div>
                <label className="block text-xs font-bold text-teal-700 mb-1 uppercase tracking-wide">Mật khẩu *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordInput}
                    onChange={e => setPasswordInput(e.target.value)}
                    placeholder="Nhập mật khẩu"
                    className="w-full px-4 py-3 pr-12 rounded-xl border-2 border-teal-100 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/20 transition-all font-bold text-lg text-center bg-white"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-teal-400 hover:text-teal-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Cảnh báo giám sát */}
              <div className="bg-amber-50 text-amber-700 p-4 rounded-xl flex gap-2.5 text-xs font-medium border border-amber-100">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p className="leading-relaxed">Hệ thống có giám sát chuyển tab. Vui lòng tập trung làm bài thi.</p>
              </div>

              {/* Nút đăng nhập */}
              <button
                type="submit"
                disabled={isLoggingIn}
                className="btn-teal w-full flex items-center justify-center gap-2 text-base py-3.5 shadow-lg shadow-teal-500/25"
              >
                {isLoggingIn ? (
                  <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <span>VÀO HỆ THỐNG</span>
                )}
              </button>
            </form>
          </div>
          <p className="text-center text-white/60 text-xs mt-4">
            © 2025 LỚP TOÁN THẦY LĨNH – Powered by React + Supabase
          </p>
        </div>
      </div>
    )
  }

  // Phân loại danh sách bài thi
  const submittedRoomIds = submissionsList
    .filter(s => s.status === 'submitted')
    .map(s => s.room_id)

  const inProgressSubMap = new Map()
  submissionsList
    .filter(s => s.status !== 'submitted')
    .forEach(s => inProgressSubMap.set(s.room_id, s))

  // Đã thi: có bài nộp status = 'submitted'
  const completedExams = examsList
    .filter(room => submittedRoomIds.includes(room.id))
    .map(room => {
      const sub = submissionsList.find(s => s.room_id === room.id && s.status === 'submitted')
      return { room, sub }
    })

  // Chưa thi: chưa có bài nộp status = 'submitted'
  const pendingExams = examsList.filter(room => !submittedRoomIds.includes(room.id))

  // --- PHÂN TÍCH TIẾN ĐỘ THEO BUỔI & BÀI ---
  const parsedExams = examsList.map(room => {
    const title = room.exams?.title || ''
    const matchBuoi = title.match(/(?:buổi|buoi|b)\s*(\d+)/i)
    const buoi = matchBuoi ? parseInt(matchBuoi[1]) : null

    const matchDe = title.match(/(?:đề|de|bài|bai|đề\s*số|de\s*so)\s*(\d+)/i)
    const bai = matchDe ? parseInt(matchDe[1]) : null

    return { room, buoi, bai, title }
  })

  // Tìm buổi học lớn nhất
  const buoiNumbers = parsedExams
    .map(e => e.buoi)
    .filter(b => typeof b === 'number' && b > 0)
  const maxBuoi = buoiNumbers.length > 0 ? Math.max(...buoiNumbers) : 4

  // Tạo cấu trúc cột: mỗi buổi có Đề 1 và Đề 2
  const tableCols = []
  for (let b = 1; b <= maxBuoi; b++) {
    tableCols.push({ buoi: b, bai: 1 })
    tableCols.push({ buoi: b, bai: 2 })
  }

  // Khớp dữ liệu phòng thi & bài nộp cho từng cột
  const gridData = tableCols.map(c => {
    const matched = parsedExams.find(e => e.buoi === c.buoi && e.bai === c.bai)
    let sub = null
    if (matched) {
      sub = submissionsList.find(s => s.room_id === matched.room.id)
    }
    return {
      buoi: c.buoi,
      bai: c.bai,
      exam: matched ? matched.room : null,
      sub
    }
  })

  const getAttempts = (item: any) => {
    if (!item.exam) return '-'
    if (!item.sub) return '0'
    return item.sub.score_breakdown?.attempt_count || 1
  }

  const getViolations = (item: any) => {
    if (!item.exam) return '-'
    if (!item.sub) return '0'
    const historySwitches = (item.sub.score_breakdown?.history || []).reduce((sum: number, att: any) => sum + (att.tab_switches || 0), 0)
    return (item.sub.tab_switches || 0) + historySwitches
  }

  const getScoreDisplay = (item: any) => {
    if (!item.exam) return '-'
    if (!item.sub) return 'Chưa thi'
    if (item.sub.status !== 'submitted') return 'Đang làm'
    return typeof item.sub.score === 'number' ? item.sub.score.toFixed(1) : 'Chưa chấm'
  }

  // --- DỮ LIỆU ĐỒ THỊ ---
  const chartData = submissionsList
    .filter(s => s.status === 'submitted' && s.submitted_at)
    .map(s => {
      const room = examsList.find(r => r.id === s.room_id)
      const title = room?.exams?.title || `Phòng ${room?.code || ''}`
      const matchBuoi = title.match(/(?:buổi|buoi|b)\s*(\d+)/i)
      const buoi = matchBuoi ? parseInt(matchBuoi[1]) : 999
      const matchDe = title.match(/(?:đề|de|bài|bai)\s*(\d+)/i)
      const bai = matchDe ? parseInt(matchDe[1]) : 999

      return {
        title,
        buoi,
        bai,
        score: s.score || 0,
        duration: Math.round((s.duration || 0) / 60), // sang phút
        submittedAt: new Date(s.submitted_at)
      }
    })
    .sort((a, b) => a.submittedAt.getTime() - b.submittedAt.getTime())

  // Vẽ đồ thị
  const w = 800
  const h = 350
  const chartMargin = { top: 40, right: 60, bottom: 70, left: 50 }
  const plotW = w - chartMargin.left - chartMargin.right
  const plotH = h - chartMargin.top - chartMargin.bottom
  
  const maxDuration = chartData.length > 0
    ? Math.max(...chartData.map(d => d.duration), 45)
    : 45

  const points = chartData.map((d, i) => {
    const x = chartData.length > 1
      ? chartMargin.left + (i / (chartData.length - 1)) * plotW
      : chartMargin.left + plotW / 2
    const yScore = chartMargin.top + plotH - (d.score / 10) * plotH
    const yDuration = chartMargin.top + plotH - (d.duration / maxDuration) * plotH
    const barHeight = (d.duration / maxDuration) * plotH
    return { ...d, x, yScore, yDuration, barHeight }
  })

  const scorePathD = points.length > 1
    ? `M ${points.map(p => `${p.x},${p.yScore}`).join(' L ')}`
    : ''

  const scoreAreaD = points.length > 1
    ? `${scorePathD} L ${points[points.length - 1].x},${chartMargin.top + plotH} L ${points[0].x},${chartMargin.top + plotH} Z`
    : ''

  const getShortTitle = (title: string) => {
    const matchBuoi = title.match(/(?:buổi|buoi|b)\s*(\d+)/i)
    const buoi = matchBuoi ? `B${matchBuoi[1]}` : ''
    const matchDe = title.match(/(?:đề|de|bài|bai)\s*(\d+)/i)
    const de = matchDe ? `Đ${matchDe[1]}` : ''
    if (buoi && de) return `${buoi}-${de}`
    return title.length > 12 ? title.substring(0, 10) + '..' : title
  }

  // ── DASHBOARD (đã đăng nhập) ─────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-teal-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 text-teal-700">
            <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center shadow-md">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-extrabold text-base leading-tight text-teal-800 uppercase tracking-wide">LỚP TOÁN THẦY LĨNH</h1>
              <p className="text-[10px] font-bold uppercase tracking-wider text-teal-500">Cổng Thi Học Sinh</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-teal-50 px-3.5 py-1.5 rounded-full border border-teal-100">
              <UserCircle className="w-5 h-5 text-teal-600" />
              <span className="text-sm font-bold text-teal-800">{student.full_name}</span>
              <span className="bg-teal-200 text-teal-800 text-[10px] font-bold px-1.5 py-0.5 rounded-md ml-1 font-mono">{student.student_code}</span>
            </div>
            <button
              onClick={handleLogout}
              className="text-sm font-bold text-gray-500 hover:text-red-600 flex items-center gap-1 transition-colors"
            >
              <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Đăng xuất</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 space-y-8 animate-fade-in">
        {/* Cảnh báo chung */}
        <div className="bg-amber-50 text-amber-800 p-4 rounded-2xl flex gap-3 text-sm font-medium border border-amber-200/60 shadow-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-600 mt-0.5" />
          <div>
            <span className="font-bold">Lưu ý quan trọng:</span> Hệ thống có tính năng giám sát chuyển tab/thoát màn hình khi đang làm bài. Các em hãy tập trung và không chuyển tab khi đang làm bài thi để tránh bị nhắc nhở hoặc khóa bài tự động.
          </div>
        </div>

        {/* BÁO CÁO TIẾN ĐỘ HỌC TẬP (TABLE + CHART) */}
        <section className="bg-white rounded-3xl p-6 border border-teal-100 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-teal-50 pb-4">
            <div>
              <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
                📊 Báo Cáo Tiến Độ & Kết Quả Học Tập
              </h2>
              <p className="text-gray-400 text-xs font-semibold mt-0.5">
                Bảng theo dõi buổi học và biểu đồ kết quả điểm số, thời gian làm bài của học sinh.
              </p>
            </div>
            {/* Quick stats badges */}
            <div className="flex gap-2.5 flex-wrap">
              <div className="bg-teal-50 text-teal-700 px-3 py-1.5 rounded-xl border border-teal-100 text-xs font-bold flex items-center gap-1">
                Bài đã làm: <span className="font-extrabold text-sm">{completedExams.length}</span>
              </div>
              <div className="bg-orange-50 text-orange-700 px-3 py-1.5 rounded-xl border border-orange-100 text-xs font-bold flex items-center gap-1">
                Điểm TB: <span className="font-extrabold text-sm">
                  {completedExams.length > 0 
                    ? (completedExams.reduce((sum, item) => sum + (item.sub.score || 0), 0) / completedExams.length).toFixed(1)
                    : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* TABLE MATRIX */}
          <div>
            <h3 className="text-sm font-extrabold text-gray-700 mb-3 uppercase tracking-wider flex items-center gap-1.5">
              <span>📋 Bảng tổng hợp kết quả chi tiết</span>
            </h3>
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full border-collapse table-fixed">
                <thead>
                  {/* Row 1: Buổi */}
                  <tr className="bg-teal-600 text-white text-center font-bold text-sm">
                    <th className="p-3 border border-teal-700 bg-teal-700 w-[140px] sticky left-0 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.1)] text-left font-black">Buổi học</th>
                    {Array.from({ length: maxBuoi }, (_, i) => i + 1).map(b => (
                      <th key={b} colSpan={2} className="p-3 border border-teal-700 font-extrabold tracking-wide text-sm bg-teal-600">
                        Buổi {b}
                      </th>
                    ))}
                  </tr>
                  {/* Row 2: Bài */}
                  <tr className="bg-teal-50 text-teal-800 text-center font-bold text-xs uppercase">
                    <th className="p-3 border border-teal-200 bg-teal-50 sticky left-0 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.05)] text-left font-black">Mã đề / bài</th>
                    {tableCols.map((c, idx) => (
                      <th key={idx} className="p-2.5 border border-teal-200 font-extrabold min-w-[90px] text-xs">
                        Đề {c.bai}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Row 3: Số lần thi */}
                  <tr className="text-center hover:bg-slate-50 transition-colors">
                    <td className="p-3 border border-slate-200 text-left font-bold text-gray-700 bg-white sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)] text-xs">
                      Số lần thi
                    </td>
                    {gridData.map((item, idx) => {
                      const val = getAttempts(item)
                      return (
                        <td key={idx} className="p-3 border border-slate-200 font-semibold text-gray-600 text-xs">
                          {val}
                        </td>
                      )
                    })}
                  </tr>
                  {/* Row 4: Số lần vi phạm */}
                  <tr className="text-center hover:bg-slate-50 transition-colors">
                    <td className="p-3 border border-slate-200 text-left font-bold text-gray-700 bg-white sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)] text-xs">
                      Số lần vi phạm
                    </td>
                    {gridData.map((item, idx) => {
                      const val = getViolations(item)
                      const isViolating = typeof val === 'number' && val > 0
                      return (
                        <td key={idx} className={`p-3 border border-slate-200 font-bold text-xs ${isViolating ? 'text-rose-600 bg-rose-50/50' : 'text-gray-500'}`}>
                          {val}
                        </td>
                      )
                    })}
                  </tr>
                  {/* Row 5: Điểm số */}
                  <tr className="text-center hover:bg-slate-50 transition-colors">
                    <td className="p-3 border border-slate-200 text-left font-bold text-gray-700 bg-white sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)] text-xs">
                      Điểm số
                    </td>
                    {gridData.map((item, idx) => {
                      const display = getScoreDisplay(item)
                      let scoreColor = 'text-gray-400'
                      if (item.sub && item.sub.status === 'submitted' && typeof item.sub.score === 'number') {
                        scoreColor = item.sub.score >= 8.0 
                          ? 'text-emerald-600 bg-emerald-50/30 font-bold' 
                          : item.sub.score >= 5.0 
                            ? 'text-teal-600 bg-teal-50/10' 
                            : 'text-rose-600 bg-rose-50/30 font-bold'
                      } else if (display === 'Đang thi') {
                        scoreColor = 'text-amber-600 bg-amber-50/30 animate-pulse font-bold'
                      }

                      return (
                        <td 
                          key={idx} 
                          className={`p-3 border border-slate-200 font-black text-xs ${scoreColor}`}
                        >
                          {display}
                        </td>
                      )
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* CHART */}
          <div className="pt-4 border-t border-teal-50">
            <h3 className="text-sm font-extrabold text-gray-700 mb-4 uppercase tracking-wider">
              📈 Biểu đồ kết quả điểm và thời gian làm bài
            </h3>
            {chartData.length === 0 ? (
              <div className="bg-slate-50 rounded-2xl p-10 text-center border-2 border-dashed border-slate-200 flex flex-col items-center justify-center min-h-[220px]">
                <AlertCircle className="w-10 h-10 text-slate-300 mb-2" />
                <h4 className="text-slate-500 font-bold">Chưa có dữ liệu biểu đồ</h4>
                <p className="text-slate-400 text-xs mt-1">Hoàn thành ít nhất một bài kiểm tra để hiển thị sơ đồ trực quan.</p>
              </div>
            ) : (
              <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 overflow-x-auto">
                <div className="min-w-[650px] w-full">
                  <svg viewBox="0 0 800 350" width="100%" height="auto" className="mx-auto overflow-visible">
                    {/* Definitions for Gradients */}
                    <defs>
                      <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0d9488" stopOpacity="0.25"/>
                        <stop offset="100%" stopColor="#0d9488" stopOpacity="0.00"/>
                      </linearGradient>
                    </defs>

                    {/* Gridlines & Axes Labels */}
                    {Array.from({ length: 6 }).map((_, i) => {
                      const scoreVal = i * 2
                      const y = chartMargin.top + plotH - (scoreVal / 10) * plotH
                      return (
                        <g key={i}>
                          <line 
                            x1={chartMargin.left} 
                            y1={y} 
                            x2={w - chartMargin.right} 
                            y2={y} 
                            stroke="#e2e8f0" 
                            strokeWidth="1" 
                            strokeDasharray="4 4" 
                          />
                          {/* Left Label (Score) */}
                          <text 
                            x={chartMargin.left - 12} 
                            y={y + 4} 
                            fill="#0d9488" 
                            fontSize="11" 
                            fontWeight="bold"
                            textAnchor="end"
                          >
                            {scoreVal}
                          </text>
                          {/* Right Label (Duration) */}
                          <text 
                            x={w - chartMargin.right + 12} 
                            y={y + 4} 
                            fill="#f97316" 
                            fontSize="11" 
                            fontWeight="bold"
                            textAnchor="start"
                          >
                            {Math.round((scoreVal / 10) * maxDuration)}m
                          </text>
                        </g>
                      )
                    })}

                    {/* Duration Bars */}
                    {points.map((p, idx) => (
                      <g key={`bar-${idx}`}>
                        <rect 
                          x={p.x - 12} 
                          y={p.yDuration} 
                          width="24" 
                          height={p.barHeight} 
                          fill="#fed7aa" 
                          opacity="0.5" 
                          stroke="#f97316" 
                          strokeWidth="1.5" 
                          rx="3" 
                          ry="3" 
                        />
                        <text 
                          x={p.x} 
                          y={p.yDuration - 6} 
                          fill="#ea580c" 
                          fontSize="9" 
                          fontWeight="extrabold" 
                          textAnchor="middle"
                        >
                          {p.duration}m
                        </text>
                      </g>
                    ))}

                    {/* Score Path Area Fill */}
                    {points.length > 1 && (
                      <path d={scoreAreaD} fill="url(#scoreGrad)" />
                    )}

                    {/* Score Line */}
                    {points.length > 1 && (
                      <path d={scorePathD} fill="none" stroke="#0d9488" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    )}

                    {/* Points & Score values & X labels */}
                    {points.map((p, idx) => (
                      <g key={`dot-${idx}`}>
                        <circle 
                          cx={p.x} 
                          cy={p.yScore} 
                          r="7" 
                          fill="#0d9488" 
                          opacity="0.15" 
                        />
                        <circle 
                          cx={p.x} 
                          cy={p.yScore} 
                          r="4.5" 
                          fill="#0d9488" 
                          stroke="#ffffff" 
                          strokeWidth="1.5" 
                        />
                        <text 
                          x={p.x} 
                          y={p.yScore - 10} 
                          fill="#0f766e" 
                          fontSize="11" 
                          fontWeight="black" 
                          textAnchor="middle"
                        >
                          {p.score.toFixed(1)}
                        </text>

                        {/* X-axis ticks & rotated labels */}
                        <line 
                          x1={p.x} 
                          y1={chartMargin.top + plotH} 
                          x2={p.x} 
                          y2={chartMargin.top + plotH + 5} 
                          stroke="#cbd5e1" 
                          strokeWidth="1.5" 
                        />
                        <text 
                          x={p.x - 5} 
                          y={chartMargin.top + plotH + 20} 
                          fill="#64748b" 
                          fontSize="10" 
                          fontWeight="bold"
                          textAnchor="end"
                          transform={`rotate(-25, ${p.x}, ${chartMargin.top + plotH + 20})`}
                        >
                          {getShortTitle(p.title)}
                        </text>
                      </g>
                    ))}

                    {/* Chart Legend */}
                    <g transform="translate(180, 5)">
                      <line x1="0" y1="15" x2="30" y2="15" stroke="#0d9488" strokeWidth="3" />
                      <circle cx="15" cy="15" r="4" fill="#0d9488" />
                      <text x="40" y="19" fill="#475569" fontSize="12" fontWeight="bold">Điểm số (Thang 10)</text>

                      <rect x="230" y="7" width="20" height="15" fill="#fed7aa" rx="3" opacity="0.6" stroke="#f97316" strokeWidth="1.5" />
                      <text x="260" y="19" fill="#475569" fontSize="12" fontWeight="bold">Thời gian làm bài (Phút)</text>
                    </g>
                  </svg>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* DANH SÁCH BÀI THI CHƯA THI */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b-2 border-teal-500 pb-2">
            <FileText className="w-6 h-6 text-teal-600" />
            <h2 className="text-xl font-extrabold text-gray-800">Bài Thi Chưa Làm ({pendingExams.length})</h2>
          </div>

          {pendingExams.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center border-2 border-dashed border-gray-200 shadow-sm">
              <CheckCircle className="w-12 h-12 text-teal-500 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-gray-700">Tuyệt vời! Đã hoàn thành tất cả bài thi</h3>
              <p className="text-gray-400 text-sm mt-1">Hiện tại không có bài thi nào đang chờ bạn làm.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {pendingExams.map(room => {
                const hasSub = inProgressSubMap.has(room.id)
                const isClosed = room.status === 'closed'
                const isWaiting = room.status === 'waiting'
                const isActive = room.status === 'active'

                let statusBadge = null
                if (isClosed) {
                  statusBadge = <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2.5 py-1 rounded-full border border-gray-200">Đã đóng</span>
                } else if (isWaiting) {
                  statusBadge = <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-full border border-amber-200">Chưa mở</span>
                } else {
                  statusBadge = <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-full border border-emerald-200 animate-pulse">Đang mở</span>
                }

                return (
                  <div 
                    key={room.id} 
                    className="bg-white rounded-2xl p-5 border border-teal-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start gap-2 mb-3">
                        <span className="text-xs font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
                          {room.classes?.class_name || 'Bài thi tự do'}
                        </span>
                        {statusBadge}
                      </div>
                      <h3 className="text-base font-extrabold text-gray-800 mb-2 line-clamp-2 leading-snug">
                        {room.exams?.title || `Phòng thi ${room.code}`}
                      </h3>
                      <div className="flex items-center gap-4 text-gray-500 text-xs font-semibold mb-4">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          Thời gian: {room.time_limit} phút
                        </span>
                        {hasSub && (
                          <span className="bg-orange-50 text-orange-700 px-2 py-0.5 rounded border border-orange-100 text-[10px] uppercase font-black">
                            Đang làm dở
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-xs text-gray-400 font-medium">Mã phòng: <span className="font-mono font-bold text-gray-600">{room.code}</span></span>
                      
                      {isClosed ? (
                        <button disabled className="px-4 py-2 bg-gray-100 text-gray-400 text-sm font-bold rounded-xl cursor-not-allowed border border-gray-200">
                          Hết thời gian
                        </button>
                      ) : isWaiting ? (
                        <button disabled className="px-4 py-2 bg-amber-50 text-amber-500 text-sm font-bold rounded-xl cursor-not-allowed border border-amber-100">
                          Chờ mở phòng
                        </button>
                      ) : (
                        <button 
                          onClick={() => navigate(`/exam-room/${room.id}`)}
                          className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-extrabold rounded-xl transition-all shadow-md shadow-teal-500/20 flex items-center gap-1"
                        >
                          {hasSub ? 'Tiếp tục ⚡' : 'Làm bài ⚡'}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* DANH SÁCH BÀI THI ĐÃ THI */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b-2 border-teal-500 pb-2">
            <CheckCircle className="w-6 h-6 text-teal-600" />
            <h2 className="text-xl font-extrabold text-gray-800">Bài Thi Đã Hoàn Thành ({completedExams.length})</h2>
          </div>

          {completedExams.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center border border-gray-200 shadow-sm text-gray-400 text-sm font-medium">
              Chưa có bài thi nào hoàn thành. Hãy làm bài để xem kết quả!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {completedExams.map(({ room, sub }) => {
                const formattedDate = sub.submitted_at 
                  ? format(new Date(sub.submitted_at), 'dd/MM/yyyy HH:mm') 
                  : 'N/A'

                return (
                  <div 
                    key={room.id} 
                    className="bg-white rounded-2xl p-5 border border-gray-150 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start gap-2 mb-3">
                        <span className="text-xs font-bold text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                          {room.classes?.class_name || 'Bài thi tự do'}
                        </span>
                        <span className="bg-teal-50 text-teal-700 text-xs font-extrabold px-2.5 py-1 rounded-full border border-teal-150">
                          Đã nộp bài
                        </span>
                      </div>
                      <h3 className="text-base font-extrabold text-gray-800 mb-2 line-clamp-2 leading-snug">
                        {room.exams?.title || `Phòng thi ${room.code}`}
                      </h3>
                      <p className="text-xs text-gray-400 font-semibold mb-4">
                        Nộp lúc: {formattedDate}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                      <div className="flex items-baseline gap-1">
                        <span className="text-xs text-gray-500 font-medium">Điểm:</span>
                        <span className="text-xl font-black text-teal-600">
                          {typeof sub.score === 'number' ? sub.score.toFixed(1) : 'Chưa chấm'}
                        </span>
                        <span className="text-[10px] text-gray-400">/10</span>
                      </div>

                      <button 
                        onClick={() => navigate(`/exam-room/${room.id}`)}
                        className="px-4 py-2 bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-700 text-sm font-extrabold rounded-xl transition-all flex items-center gap-1"
                      >
                        Xem kết quả 🔍
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
