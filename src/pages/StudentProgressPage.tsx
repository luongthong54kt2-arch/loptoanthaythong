// @ts-nocheck
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { CalendarCheck, Trophy, BookOpen, GraduationCap, AlertCircle, Clock } from 'lucide-react'

export default function StudentProgressPage() {
  const code = new URLSearchParams(window.location.search).get('code') || ''
  const [student, setStudent]       = useState<any>(null)
  const [attendance, setAttendance] = useState<any[]>([])
  const [submissions, setSubmissions] = useState<any[]>([])
  const [courseProgress, setCourseProgress] = useState<any[]>([])
  const [centerName, setCenterName] = useState('EduCenter')
  const [loading, setLoading]   = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (code) load()
    else { setNotFound(true); setLoading(false) }
  }, [code])

  const load = async () => {
    try {
      // 1. Student
      const { data: s } = await supabase
        .from('students').select('*').ilike('student_code', code).maybeSingle()
      if (!s) { setNotFound(true); setLoading(false); return }
      setStudent(s)

      const now       = new Date()
      const monthStart = format(startOfMonth(now), 'yyyy-MM-dd')
      const monthEnd   = format(endOfMonth(now), 'yyyy-MM-dd')

      const [attRes, subRes, progRes] = await Promise.all([
        supabase.from('attendance')
          .select('date, present, late, classes(class_name, subject)')
          .eq('student_id', s.id)
          .gte('date', monthStart).lte('date', monthEnd)
          .order('date', { ascending: false }),

        supabase.from('exam_submissions')
          .select('score, submitted_at, exam_rooms(exams(title))')
          .eq('student_id', s.id).eq('status', 'submitted')
          .order('submitted_at', { ascending: false }).limit(5),

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

  // ── Tính toán điểm danh ─────────────────────────────────
  const presentCount   = attendance.filter(a => a.present && !a.late).length
  const lateCount      = attendance.filter(a => a.late).length
  const absentCount    = attendance.filter(a => !a.present).length
  const totalSessions  = attendance.length
  const attendanceRate = totalSessions > 0 ? Math.round(((presentCount + lateCount) / totalSessions) * 100) : 100

  // Group by class
  const byClass: Record<string, any[]> = {}
  for (const a of attendance) {
    const key = a.classes?.class_name || 'Lớp học'
    if (!byClass[key]) byClass[key] = []
    byClass[key].push(a)
  }

  // ── Tính tiến độ khóa học ──────────────────────────────
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

      {/* ── HERO ─────────────────────────────────────────── */}
      <div className="relative bg-gradient-to-br from-teal-500 via-teal-700 to-slate-800 text-white px-5 pt-14 pb-24 text-center overflow-hidden">
        {/* Decorative dots */}
        <div className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'radial-gradient(circle, white 1.5px, transparent 1.5px)', backgroundSize: '28px 28px' }} />

        <div className="relative z-10">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-full bg-white/20 border-4 border-white/40 flex items-center justify-center mx-auto mb-4 text-2xl font-black tracking-tight shadow-xl">
            {initials}
          </div>
          <h1 className="text-2xl font-black leading-tight">{student.full_name}</h1>
          <p className="text-teal-200 text-sm mt-1 font-mono tracking-widest">{student.student_code}</p>

          {/* Class badges */}
          {Object.keys(byClass).length > 0 && (
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {Object.keys(byClass).map(cls => (
                <span key={cls} className="bg-white/15 border border-white/25 px-3 py-1 rounded-full text-xs font-bold">
                  {cls}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── CONTENT ──────────────────────────────────────── */}
      <div className="-mt-12 relative z-10 px-4 pb-12 space-y-4 max-w-md mx-auto">

        {/* Attendance card */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-4 flex items-center gap-2 border-b border-gray-50">
            <CalendarCheck className="w-5 h-5 text-teal-600" />
            <h2 className="font-bold text-gray-800">
              Chuyên cần tháng {format(new Date(), 'MM/yyyy')}
            </h2>
          </div>

          {totalSessions === 0 ? (
            <div className="px-5 py-10 text-center">
              <Clock className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">Chưa có dữ liệu điểm danh tháng này</p>
            </div>
          ) : (
            <div className="p-5">
              {/* SVG donut + stats */}
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
                    { label: 'Có mặt', value: presentCount, bg: 'bg-green-50',  text: 'text-green-600' },
                    { label: 'Trễ',    value: lateCount,    bg: 'bg-amber-50',  text: 'text-amber-600' },
                    { label: 'Vắng',   value: absentCount,  bg: 'bg-red-50',    text: 'text-red-600'   },
                  ].map(item => (
                    <div key={item.label} className={`text-center p-2 ${item.bg} rounded-xl`}>
                      <div className={`text-2xl font-black ${item.text}`}>{item.value}</div>
                      <div className={`text-[10px] font-bold mt-0.5 ${item.text}`}>{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Per-class breakdown */}
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
            </div>
          )}
        </div>

        {/* Recent exam results */}
        {submissions.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 pt-5 pb-4 flex items-center gap-2 border-b border-gray-50">
              <Trophy className="w-5 h-5 text-orange-500" />
              <h2 className="font-bold text-gray-800">Kết quả bài thi gần nhất</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {submissions.map((sub, i) => {
                const score  = Number(sub.score) || 0
                const title  = sub.exam_rooms?.exams?.title || `Bài thi ${i + 1}`
                const pct    = Math.min(score * 10, 100)
                const color  = score >= 8 ? { bar: 'bg-green-500', text: 'text-green-600' }
                             : score >= 6 ? { bar: 'bg-amber-500',  text: 'text-amber-600' }
                             :              { bar: 'bg-red-500',    text: 'text-red-600'   }
                return (
                  <div key={i} className="px-5 py-3.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-semibold text-gray-700 line-clamp-1 flex-1 mr-3">{title}</span>
                      <span className={`text-xl font-black ${color.text} shrink-0`}>{score.toFixed(1)}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className={`h-2 rounded-full ${color.bar}`} style={{ width: `${pct}%` }} />
                    </div>
                    {sub.submitted_at && (
                      <p className="text-xs text-gray-400 mt-1.5">
                        {format(new Date(sub.submitted_at), 'dd/MM/yyyy')}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Course progress */}
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
