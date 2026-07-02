// @ts-nocheck
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns'
import { CalendarCheck, Trophy, BookOpen, GraduationCap, AlertCircle, Clock, ChevronDown, ChevronUp, CheckCircle, XCircle } from 'lucide-react'
import MathText from '@/components/MathText'

export default function StudentProgressPage() {
  const code = new URLSearchParams(window.location.search).get('code') || ''
  const [student, setStudent]         = useState<any>(null)
  const [attendance, setAttendance]   = useState<any[]>([])
  const [submissions, setSubmissions] = useState<any[]>([])
  const [courseProgress, setCourseProgress] = useState<any[]>([])
  const [centerName]   = useState(import.meta.env.VITE_CENTER_NAME || 'LỚP TOÁN THẦY LĨNH')
  const [loading, setLoading]   = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [expandedSub, setExpandedSub] = useState<number | null>(null)
  const [detailSub, setDetailSub]     = useState<any>(null)   // bài thi đang xem chi tiết
  const [loadingDetail, setLoadingDetail] = useState(false)

  useEffect(() => {
    if (code) load()
    else { setNotFound(true); setLoading(false) }
  }, [code])

  const load = async () => {
    try {
      const { data: s } = await supabase
        .from('students').select('*').ilike('student_code', code).maybeSingle()
      if (!s) { setNotFound(true); setLoading(false); return }
      setStudent(s)

      // ✅ FIX 1: Load 90 ngày gần nhất thay vì chỉ tháng hiện tại
      //    → không bị trống nếu tháng này chưa có buổi học
      const toDate   = format(new Date(), 'yyyy-MM-dd')
      const fromDate = format(subDays(new Date(), 90), 'yyyy-MM-dd')

      const [attRes, subRes, progRes] = await Promise.all([
        supabase.from('attendance')
          .select('date, present, late, class_id, classes(class_name, subject)')
          .eq('student_id', s.id)
          .gte('date', fromDate)
          .lte('date', toDate)
          .order('date', { ascending: false }),

        // ✅ FIX 2: Lấy thêm score_breakdown để hiện chi tiết
        supabase.from('exam_submissions')
          .select('score, score_breakdown, answers, submitted_at, status, exam_rooms(exams(title, data))')
          .eq('student_id', s.id)
          .eq('status', 'submitted')
          .order('submitted_at', { ascending: false })
          .limit(10),

        supabase.from('student_progress')
          .select('is_passed, is_unlocked, highest_score, lessons(title, chapters(title, courses(title)))')
          .eq('student_id', s.id),
      ])

      setAttendance(attRes.data || [])
      setSubmissions(subRes.data || [])
      setCourseProgress(progRes.data || [])
    } catch {
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }

  // ── Load chi tiết từng câu hỏi ──────────────────────────────────────────────
  const openDetail = async (sub: any) => {
    setLoadingDetail(true)
    try {
      // Lấy câu hỏi từ shuffled_exam (bộ đề học sinh đã làm) hoặc đề gốc
      const bd = sub.score_breakdown || {}
      let examData = bd.shuffled_exam

      if (!examData) {
        // Fetch đề gốc từ exam_rooms → exams
        const roomId = sub.exam_rooms?.id || sub.room_id
        if (roomId) {
          const { data: room } = await supabase
            .from('exam_rooms').select('exams(data)').eq('id', roomId).maybeSingle()
          examData = room?.exams?.data
        }
      }

      setDetailSub({ ...sub, examData })
    } catch { /* bỏ qua */ }
    finally { setLoadingDetail(false) }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-teal-50">
      <div className="w-10 h-10 border-4 border-teal-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (notFound || !student) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
      <AlertCircle className="w-14 h-14 text-red-300 mb-4" />
      <h2 className="text-xl font-bold text-gray-700">Không tìm thấy học sinh</h2>
      <p className="text-gray-400 text-sm mt-2">Mã "{code}" không tồn tại trong hệ thống</p>
    </div>
  )

  // ── Điểm danh ──────────────────────────────────────────
  const presentCount   = attendance.filter(a => a.present && !a.late).length
  const lateCount      = attendance.filter(a => a.late).length
  const absentCount    = attendance.filter(a => !a.present).length
  const totalSessions  = attendance.length
  const attendanceRate = totalSessions > 0
    ? Math.round(((presentCount + lateCount) / totalSessions) * 100)
    : 0

  // Group by tháng để hiện timeline
  const byMonth: Record<string, any[]> = {}
  for (const a of attendance) {
    const key = format(new Date(a.date), 'MM/yyyy')
    if (!byMonth[key]) byMonth[key] = []
    byMonth[key].push(a)
  }

  // Group by lớp
  const byClass: Record<string, any[]> = {}
  for (const a of attendance) {
    const key = a.classes?.class_name || 'Lớp học'
    if (!byClass[key]) byClass[key] = []
    byClass[key].push(a)
  }

  // ── Tiến độ khóa học ───────────────────────────────────
  const byCourse: Record<string, { total: number; passed: number }> = {}
  for (const p of courseProgress) {
    const title = p.lessons?.chapters?.courses?.title || 'Khóa học'
    if (!byCourse[title]) byCourse[title] = { total: 0, passed: 0 }
    byCourse[title].total++
    if (p.is_passed) byCourse[title].passed++
  }

  const initials = student.full_name?.split(' ').slice(-2).map((w: string) => w[0]).join('').toUpperCase() || 'HS'
  const rateColor = attendanceRate >= 80 ? '#0d9488' : attendanceRate >= 60 ? '#f59e0b' : '#ef4444'
  const circumference = 2 * Math.PI * 40
  const strokeDash = (attendanceRate / 100) * circumference

  return (
    <div className="min-h-screen bg-slate-100">

      {/* HERO */}
      <div className="relative bg-gradient-to-br from-teal-500 via-teal-700 to-slate-800 text-white px-5 pt-14 pb-24 text-center overflow-hidden">
        <div className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'radial-gradient(circle, white 1.5px, transparent 1.5px)', backgroundSize: '28px 28px' }} />
        <div className="relative z-10">
          {student.avatar_url ? (
            <img 
              src={student.avatar_url} 
              alt={student.full_name} 
              className="w-28 h-28 rounded-full object-cover border-4 border-white/40 mx-auto mb-4 shadow-xl"
            />
          ) : (
            <div className="w-28 h-28 rounded-full bg-white/20 border-4 border-white/40 flex items-center justify-center mx-auto mb-4 text-3xl font-black tracking-tight shadow-xl">
              {initials}
            </div>
          )}
          <h1 className="text-2xl font-black leading-tight">{student.full_name}</h1>
          <p className="text-teal-200 text-sm mt-1 font-mono tracking-widest">{student.student_code}</p>
          {Object.keys(byClass).length > 0 && (
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {Object.keys(byClass).map(cls => (
                <span key={cls} className="bg-white/15 border border-white/25 px-3 py-1 rounded-full text-xs font-bold">{cls}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="-mt-12 relative z-10 px-4 pb-12 space-y-4 max-w-md mx-auto">

        {/* Điểm danh */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-4 flex items-center gap-2 border-b border-gray-50">
            <CalendarCheck className="w-5 h-5 text-teal-600" />
            <h2 className="font-bold text-gray-800">Chuyên cần (90 ngày gần nhất)</h2>
          </div>

          {totalSessions === 0 ? (
            <div className="px-5 py-10 text-center">
              <Clock className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">Chưa có dữ liệu điểm danh</p>
            </div>
          ) : (
            <div className="p-5">
              {/* Donut chart + stats */}
              <div className="flex items-center gap-5">
                <div className="relative w-24 h-24 shrink-0">
                  <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="13" />
                    <circle cx="50" cy="50" r="40" fill="none"
                      stroke={rateColor} strokeWidth="13"
                      strokeDasharray={`${strokeDash} ${circumference}`}
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dasharray 0.6s ease' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-gray-800 leading-none">{attendanceRate}%</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 flex-1">
                  {[
                    { label: 'Có mặt', value: presentCount, bg: 'bg-green-50', text: 'text-green-600' },
                    { label: 'Trễ',    value: lateCount,    bg: 'bg-amber-50', text: 'text-amber-600' },
                    { label: 'Vắng',   value: absentCount,  bg: 'bg-red-50',   text: 'text-red-600'  },
                  ].map(item => (
                    <div key={item.label} className={`text-center p-2 ${item.bg} rounded-xl`}>
                      <div className={`text-2xl font-black ${item.text}`}>{item.value}</div>
                      <div className={`text-[10px] font-bold mt-0.5 ${item.text}`}>{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Theo lớp */}
              {Object.keys(byClass).length > 1 && (
                <div className="mt-5 space-y-2.5 border-t border-gray-50 pt-4">
                  {Object.entries(byClass).map(([cls, records]) => {
                    const p = records.filter(r => r.present || r.late).length
                    const t = records.length
                    const r = Math.round((p / t) * 100)
                    return (
                      <div key={cls} className="flex items-center gap-3">
                        <span className="text-xs text-gray-600 w-28 truncate font-semibold">{cls}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                          <div className="h-2 rounded-full bg-teal-500 transition-all" style={{ width: `${r}%` }} />
                        </div>
                        <span className="text-xs font-bold text-gray-600 w-10 text-right shrink-0">{p}/{t}</span>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* ✅ Timeline theo tháng */}
              <div className="mt-5 border-t border-gray-50 pt-4 space-y-4">
                {Object.entries(byMonth).map(([month, records]) => (
                  <div key={month}>
                    <p className="text-xs font-bold text-gray-400 mb-2">Tháng {month}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {records.map((a, i) => (
                        <div key={i} title={`${a.date} – ${a.late ? 'Trễ' : a.present ? 'Có mặt' : 'Vắng'}`}
                          className={`w-7 h-7 rounded-lg text-[9px] font-bold flex items-center justify-center
                            ${a.late    ? 'bg-amber-100 text-amber-600'
                            : a.present ? 'bg-green-100 text-green-600'
                            :             'bg-red-100 text-red-500'}`}>
                          {format(new Date(a.date), 'd')}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ✅ FIX 2: Kết quả bài thi có chi tiết mở rộng */}
        {submissions.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 pt-5 pb-4 flex items-center gap-2 border-b border-gray-50">
              <Trophy className="w-5 h-5 text-orange-500" />
              <h2 className="font-bold text-gray-800">Kết quả bài thi</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {submissions.map((sub, i) => {
                const score = Number(sub.score) || 0
                const title = sub.exam_rooms?.exams?.title || `Bài thi ${i + 1}`
                const pct   = Math.min(score * 10, 100)
                const color = score >= 8 ? { bar: 'bg-green-500', text: 'text-green-600', bg: 'bg-green-50' }
                            : score >= 6 ? { bar: 'bg-amber-500',  text: 'text-amber-600', bg: 'bg-amber-50' }
                            :              { bar: 'bg-red-500',    text: 'text-red-600',   bg: 'bg-red-50'  }

                const bd = sub.score_breakdown || {}
                const sections = [
                  { key: 'multipleChoice', label: 'Trắc nghiệm' },
                  { key: 'trueFalse',      label: 'Đúng / Sai'  },
                  { key: 'shortAnswer',    label: 'Trả lời ngắn' },
                ].filter(s => bd[s.key]?.total > 0)

                const isOpen = expandedSub === i

                return (
                  <div key={i}>
                    {/* Row tổng */}
                    <button
                      onClick={() => setExpandedSub(isOpen ? null : i)}
                      className="w-full px-5 py-3.5 text-left hover:bg-gray-50 transition"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-semibold text-gray-700 line-clamp-1 flex-1 mr-3">{title}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-xl font-black ${color.text}`}>{score.toFixed(1)}</span>
                          {isOpen
                            ? <ChevronUp className="w-4 h-4 text-gray-400" />
                            : <ChevronDown className="w-4 h-4 text-gray-400" />}
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className={`h-2 rounded-full ${color.bar} transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                      {sub.submitted_at && (
                        <p className="text-xs text-gray-400 mt-1.5">
                          {format(new Date(sub.submitted_at), 'dd/MM/yyyy HH:mm')}
                        </p>
                      )}
                    </button>

                    {/* Chi tiết mở rộng */}
                    {isOpen && (
                      <div className={`px-5 pb-4 ${color.bg} border-t border-white/60`}>
                        {sections.length > 0 ? (
                          <div className="space-y-2 pt-3">
                            <p className="text-xs font-bold text-gray-500 mb-2">Chi tiết từng phần:</p>
                            {sections.map(s => {
                              const data    = bd[s.key]
                              const correct = data.correct || 0
                              const total   = data.total   || 0
                              const pts     = Number(data.points || data.score || 0)
                              const rate    = total > 0 ? Math.round((correct / total) * 100) : 0
                              return (
                                <div key={s.key} className="bg-white/70 rounded-xl p-3">
                                  <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-xs font-bold text-gray-700">{s.label}</span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-gray-500">{correct}/{total} câu</span>
                                      <span className={`text-xs font-black px-2 py-0.5 rounded-full
                                        ${rate >= 80 ? 'bg-green-100 text-green-700'
                                        : rate >= 60 ? 'bg-amber-100 text-amber-700'
                                        :              'bg-red-100 text-red-700'}`}>
                                        +{pts.toFixed(2)}đ
                                      </span>
                                    </div>
                                  </div>
                                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                                    <div className={`h-1.5 rounded-full transition-all
                                      ${rate >= 80 ? 'bg-green-500' : rate >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                                      style={{ width: `${rate}%` }} />
                                  </div>
                                </div>
                              )
                            })}

                            {/* Tổng kết */}
                            <div className="flex items-center justify-between pt-1">
                              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                                Đúng: {sections.reduce((s, k) => s + (bd[k.key]?.correct || 0), 0)} câu
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                <XCircle className="w-3.5 h-3.5 text-red-400" />
                                Sai: {sections.reduce((s, k) => s + ((bd[k.key]?.total || 0) - (bd[k.key]?.correct || 0)), 0)} câu
                              </div>
                              <span className={`font-black text-sm ${color.text}`}>
                                {score.toFixed(2)}/10
                              </span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 pt-3">Không có dữ liệu chi tiết</p>
                        )}
                        {/* Nút xem từng câu */}
                        <button
                          onClick={() => openDetail(sub)}
                          disabled={loadingDetail}
                          className="mt-3 w-full py-2 text-xs font-bold text-teal-600 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl transition flex items-center justify-center gap-1.5"
                        >
                          {loadingDetail ? '⏳ Đang tải...' : '🔍 Xem từng câu đúng / sai'}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Tiến độ khóa học */}
        {Object.keys(byCourse).length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 pt-5 pb-4 flex items-center gap-2 border-b border-gray-50">
              <BookOpen className="w-5 h-5 text-violet-500" />
              <h2 className="font-bold text-gray-800">Tiến độ khóa học</h2>
            </div>
            <div className="p-5 space-y-5">
              {Object.entries(byCourse).map(([title, data]) => {
                const pct = data.total > 0 ? Math.round((data.passed / data.total) * 100) : 0
                return (
                  <div key={title}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-bold text-gray-800 line-clamp-1 mr-2">{title}</span>
                      <span className="text-sm font-black text-violet-600 shrink-0">{data.passed}/{data.total} bài</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3">
                      <div className="h-3 rounded-full bg-gradient-to-r from-violet-400 to-violet-600 transition-all"
                        style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5 font-medium">{pct}% hoàn thành</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Modal xem chi tiết từng câu ─────────────────────────────── */}
        {detailSub && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">

              {/* Header modal */}
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
                <div>
                  <p className="font-black text-gray-800 text-base">
                    {detailSub.exam_rooms?.exams?.title || 'Chi tiết bài thi'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {detailSub.submitted_at ? format(new Date(detailSub.submitted_at), 'dd/MM/yyyy HH:mm') : ''}
                    {' · '}Điểm: <span className="font-black text-teal-600">{Number(detailSub.score || 0).toFixed(2)}/10</span>
                  </p>
                </div>
                <button onClick={() => setDetailSub(null)}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-lg transition">✕</button>
              </div>

              {/* Body scroll */}
              <div className="overflow-y-auto flex-1 p-4 space-y-3">
                {(() => {
                  const questions = detailSub.examData?.questions || []
                  const answers   = detailSub.answers || {}

                  if (questions.length === 0) {
                    return (
                      <div className="text-center py-12 text-gray-400">
                        <p className="text-sm">Không có dữ liệu câu hỏi</p>
                        <p className="text-xs mt-1">Đề thi có thể là dạng PDF</p>
                      </div>
                    )
                  }

                  return questions.map((q: any, idx: number) => {
                    const userAnswer    = answers[q.number] ?? answers[String(q.number)] ?? answers[idx + 1] ?? answers[idx]
                    const correctAnswer = q.correctAnswer || q.correct_answer || ''
                    const qType         = q.type || 'multiple_choice'

                    // Kiểm tra đúng/sai
                    let isCorrect = false
                    if (qType === 'multiple_choice') {
                      isCorrect = !!userAnswer && String(userAnswer).toUpperCase() === String(correctAnswer).toUpperCase()
                    } else if (qType === 'true_false') {
                      try {
                        const ua = typeof userAnswer === 'string' && userAnswer.startsWith('{') ? JSON.parse(userAnswer) : userAnswer
                        const ca = typeof correctAnswer === 'string' && correctAnswer.startsWith('{') ? JSON.parse(correctAnswer) : correctAnswer
                        isCorrect = JSON.stringify(ua) === JSON.stringify(ca)
                      } catch { isCorrect = false }
                    } else {
                      const norm = (s: string) => (s||'').toLowerCase().replace(/\s+/g,'').replace(/,/g,'.').trim()
                      isCorrect = !!userAnswer && norm(String(userAnswer)) === norm(String(correctAnswer))
                    }

                    const hasAnswer = userAnswer !== undefined && userAnswer !== null && userAnswer !== ''

                    // Parse TF answers
                    let tfAnswers: Record<string, string> = {}
                    if (qType === 'true_false' && userAnswer) {
                      const ua = String(userAnswer)
                      if (ua.startsWith('{')) {
                        try {
                          const p = JSON.parse(ua)
                          Object.keys(p).forEach(k => { tfAnswers[k.toLowerCase()] = p[k] ? 'T' : 'F' })
                        } catch {}
                      } else if (ua.includes(':')) {
                        ua.split(',').forEach((seg: string) => {
                          const [l, v] = seg.split(':')
                          if (l && v) tfAnswers[l.trim().toLowerCase()] = v.trim()
                        })
                      }
                    }

                    // Parse correctMap cho TF
                    let correctMap: Record<string, boolean> = {}
                    if (qType === 'true_false') {
                      try {
                        const p = JSON.parse(correctAnswer || '{}')
                        Object.keys(p).forEach(k => { correctMap[k.toLowerCase()] = !!p[k] })
                      } catch {
                        correctAnswer.toLowerCase().split(',').map((s: string) => s.trim()).filter(Boolean)
                          .forEach((l: string) => { correctMap[l] = true })
                      }
                    }

                    const displayOpts = (q.options && q.options.length > 0)
                      ? q.options
                      : qType === 'true_false' ? ['a','b','c','d'].map((l: string) => ({ letter: l, text: l.toUpperCase() })) : []

                    const borderColor = !hasAnswer ? 'border-gray-200' : isCorrect ? 'border-green-300' : 'border-red-300'
                    const bgHeader    = !hasAnswer ? 'bg-gray-50'      : isCorrect ? 'bg-green-50'     : 'bg-red-50'

                    return (
                      <div key={idx} className={`rounded-2xl border-2 bg-white overflow-hidden ${borderColor}`}>
                        {/* Header */}
                        <div className={`px-4 py-2.5 flex items-center gap-2 ${bgHeader}`}>
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0
                            ${!hasAnswer ? 'bg-gray-400' : isCorrect ? 'bg-green-500' : 'bg-red-500'}`}>
                            {idx + 1}
                          </div>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full
                            ${!hasAnswer ? 'bg-gray-100 text-gray-500' : isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {!hasAnswer ? '— Bỏ trống' : isCorrect ? '✅ Đúng' : '❌ Sai'}
                          </span>
                          <span className="text-xs text-gray-400 ml-auto">
                            {qType === 'multiple_choice' ? 'Trắc nghiệm' : qType === 'true_false' ? 'Đúng / Sai' : 'Trả lời ngắn'}
                          </span>
                        </div>

                        {/* Nội dung */}
                        <div className="px-4 py-3">
                          {/* ✅ MathText — render LaTeX/MathJax đầy đủ */}
                          {q.text && (
                            <div className="text-sm text-gray-800 leading-relaxed mb-3">
                              <MathText html={q.text} block />
                            </div>
                          )}

                          {/* Trắc nghiệm: hiện đủ A/B/C/D */}
                          {qType === 'multiple_choice' && displayOpts.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                              {displayOpts.map((opt: any) => {
                                const isUser  = String(userAnswer||'').toUpperCase() === opt.letter.toUpperCase()
                                const isRight = String(correctAnswer||'').toUpperCase() === opt.letter.toUpperCase()
                                let cls = 'bg-white border-gray-200 text-gray-700'
                                if (isRight)       cls = 'bg-green-50 border-green-500 text-green-800 font-semibold'
                                else if (isUser)   cls = 'bg-red-50 border-red-400 text-red-800'
                                return (
                                  <div key={opt.letter} className={`flex items-start gap-2 px-3 py-2 rounded-xl border-2 text-sm ${cls}`}>
                                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5
                                      ${isRight ? 'bg-green-500 text-white' : isUser ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                                      {opt.letter}
                                    </span>
                                    <div className="flex-1 min-w-0 text-xs leading-relaxed">
                                      <MathText html={opt.text || opt.letter} />
                                    </div>
                                    {isRight && <span className="text-green-600 font-bold shrink-0">✔</span>}
                                    {isUser && !isRight && <span className="text-red-500 font-bold shrink-0">✖</span>}
                                  </div>
                                )
                              })}
                            </div>
                          )}

                          {/* Đúng/Sai: bảng mệnh đề */}
                          {qType === 'true_false' && displayOpts.length > 0 && (
                            <div className="rounded-xl border-2 border-teal-200 overflow-hidden text-xs mb-3">
                              <div className="grid grid-cols-[1fr_52px_52px_44px] bg-teal-600 text-white font-bold text-center">
                                <div className="px-3 py-2 text-left">Mệnh đề</div>
                                <div className="py-2">HS chọn</div>
                                <div className="py-2 bg-teal-700">Đáp án</div>
                                <div className="py-2 bg-teal-800">KQ</div>
                              </div>
                              {displayOpts.map((opt: any) => {
                                const key = opt.letter.toLowerCase()
                                const userVal = tfAnswers[key]
                                const shouldBeTrue = correctMap[key] ?? false
                                const isOk = userVal ? (userVal === 'T' && shouldBeTrue) || (userVal === 'F' && !shouldBeTrue) : null
                                return (
                                  <div key={opt.letter} className={`grid grid-cols-[1fr_52px_52px_44px] border-t border-teal-100
                                    ${isOk === null ? 'bg-gray-50' : isOk ? 'bg-green-50/50' : 'bg-red-50/50'}`}>
                                    <div className="px-3 py-2.5 flex items-start gap-1.5 border-r border-teal-100">
                                      <span className="w-5 h-5 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center font-black text-[10px] shrink-0">{opt.letter}</span>
                                      <div className="flex-1 min-w-0 leading-relaxed"><MathText html={opt.text || opt.letter} /></div>
                                    </div>
                                    <div className={`text-center py-2.5 font-bold border-r border-teal-100
                                      ${userVal ? (isOk ? 'text-green-700' : 'text-red-600') : 'text-gray-300'}`}>
                                      {userVal === 'T' ? 'Đ' : userVal === 'F' ? 'S' : '—'}
                                    </div>
                                    <div className="text-center py-2.5 font-bold text-teal-700 bg-teal-50/40 border-r border-teal-100">
                                      {shouldBeTrue ? 'Đ' : 'S'}
                                    </div>
                                    <div className="text-center py-2.5">
                                      {isOk === null ? <span className="text-gray-300">—</span>
                                      : isOk ? <span className="text-green-600 font-bold">✔</span>
                                      :         <span className="text-red-500 font-bold">✖</span>}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}

                          {/* Trả lời ngắn */}
                          {qType === 'short_answer' && (
                            <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                              <div className={`p-2.5 rounded-xl border-2 ${isCorrect ? 'bg-green-50 border-green-200' : hasAnswer ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                                <p className="font-bold text-gray-500 text-[10px] mb-1">Học sinh trả lời:</p>
                                <div className="font-bold text-gray-800">
                                  {hasAnswer ? <MathText html={String(userAnswer)} /> : <span className="text-gray-400 italic font-normal">Bỏ trống</span>}
                                </div>
                              </div>
                              <div className="p-2.5 rounded-xl bg-teal-50 border-2 border-teal-200">
                                <p className="font-bold text-teal-600 text-[10px] mb-1">Đáp án đúng:</p>
                                <div className="font-bold text-teal-800"><MathText html={String(correctAnswer)} /></div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })
                })()}
              </div>

              {/* Summary footer */}
              {detailSub.examData?.questions?.length > 0 && (() => {
                const questions = detailSub.examData.questions
                const answers   = detailSub.answers || {}
                const total     = questions.length
                const correct   = questions.filter((q: any, idx: number) => {
                  const ua = answers[q.number] ?? answers[idx + 1] ?? answers[idx]
                  const ca = q.correctAnswer || ''
                  if (!ua) return false
                  try {
                    return String(ua).toUpperCase() === String(ca).toUpperCase()
                      || JSON.stringify(typeof ua === 'string' && ua.startsWith('{') ? JSON.parse(ua) : ua)
                         === JSON.stringify(typeof ca === 'string' && ca.startsWith('{') ? JSON.parse(ca) : ca)
                  } catch { return false }
                }).length
                return (
                  <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 shrink-0 flex items-center justify-between">
                    <div className="flex gap-3 text-xs font-bold">
                      <span className="text-green-600">✓ Đúng: {correct}</span>
                      <span className="text-red-500">✗ Sai: {total - correct}</span>
                    </div>
                    <span className="text-sm font-black text-teal-600">{Number(detailSub.score || 0).toFixed(2)}/10</span>
                  </div>
                )
              })()}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex flex-col items-center py-4 gap-1">
          <div className="flex items-center gap-2 text-teal-600 font-black text-sm">
            <GraduationCap className="w-4 h-4" /> {centerName}
          </div>
          <p className="text-xs text-gray-400">Hệ thống quản lý học tập</p>
        </div>
      </div>
    </div>
  )
}
