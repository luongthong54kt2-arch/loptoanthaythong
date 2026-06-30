// @ts-nocheck
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { CalendarCheck, Trophy, ExternalLink, Loader2, CheckCircle } from 'lucide-react'
import Modal from '@/components/Modal'

interface StudentScorecardModalProps {
  student: {
    id: string
    full_name: string
    student_code: string
  } | null
  open: boolean
  onClose: () => void
}

export default function StudentScorecardModal({ student, open, onClose }: StudentScorecardModalProps) {
  const [loading, setLoading] = useState(false)
  const [attendance, setAttendance] = useState<any[]>([])
  const [submissions, setSubmissions] = useState<any[]>([])

  useEffect(() => {
    if (open && student?.id) {
      loadStudentData()
    }
  }, [open, student?.id])

  const loadStudentData = async () => {
    setLoading(true)
    try {
      const [attRes, subRes] = await Promise.all([
        supabase
          .from('attendance')
          .select('date, present, late')
          .eq('student_id', student.id)
          .order('date', { ascending: false }),
        supabase
          .from('exam_submissions')
          .select('score, score_breakdown, submitted_at, status, exam_rooms(exams(title, data))')
          .eq('student_id', student.id)
          .order('submitted_at', { ascending: false })
          .limit(10)
      ])

      setAttendance(attRes.data || [])
      setSubmissions(subRes.data || [])
    } catch (error) {
      console.error('Lỗi khi tải bảng điểm thu gọn:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!student) return null

  // Tính toán chuyên cần
  const totalSessions = attendance.length
  const presentCount = attendance.filter(a => a.present && !a.late).length
  const lateCount = attendance.filter(a => a.late).length
  const absentCount = attendance.filter(a => !a.present).length
  const attendanceRate = totalSessions > 0
    ? Math.round(((presentCount + lateCount) / totalSessions) * 100)
    : 0

  const rateColor = attendanceRate >= 80 ? 'text-teal-600 border-teal-200 bg-teal-50' 
                  : attendanceRate >= 60 ? 'text-amber-600 border-amber-200 bg-amber-50' 
                  : 'text-red-600 border-red-200 bg-red-50'

  const progressColor = attendanceRate >= 80 ? 'bg-teal-600'
                      : attendanceRate >= 60 ? 'bg-amber-500'
                      : 'bg-red-500'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Bảng điểm học sinh: ${student.full_name}`}
      size="2xl"
    >
      <div className="space-y-6">
        {/* Thông tin học sinh & Link liên kết */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
          <div>
            <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Mã học sinh</div>
            <div className="font-mono text-base font-bold text-teal-700">{student.student_code}</div>
          </div>
          <a
            href={`/progress?code=${student.student_code}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition-all shadow-sm w-max"
          >
            Xem chi tiết tiến độ học tập <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
            <p className="text-sm text-gray-500 font-medium">Đang tải dữ liệu học tập...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Cột trái: Chuyên cần */}
            <div className="md:col-span-5 bg-white border border-slate-100 p-5 rounded-2xl flex flex-col items-center justify-center text-center">
              <div className="flex items-center gap-2 mb-4 self-start">
                <CalendarCheck className="w-5 h-5 text-teal-600" />
                <h3 className="font-bold text-gray-800 text-sm">Chuyên cần</h3>
              </div>

              {totalSessions === 0 ? (
                <div className="py-8 text-gray-400 text-xs font-medium">
                  Chưa có dữ liệu điểm danh
                </div>
              ) : (
                <div className="w-full space-y-4">
                  {/* Tỷ lệ đi học */}
                  <div className={`inline-flex flex-col items-center justify-center p-4 border rounded-full w-28 h-28 mx-auto ${rateColor}`}>
                    <span className="text-2xl font-black">{attendanceRate}%</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider mt-0.5">Đi học</span>
                  </div>

                  {/* Thanh tiến độ nhỏ */}
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className={`h-2 rounded-full ${progressColor} transition-all`} style={{ width: `${attendanceRate}%` }} />
                  </div>

                  {/* Thống kê chi tiết */}
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <div className="bg-green-50 text-green-700 p-2 rounded-xl border border-green-100">
                      <div className="text-lg font-black">{presentCount}</div>
                      <div className="text-[10px] font-bold">Đi học</div>
                    </div>
                    <div className="bg-amber-50 text-amber-700 p-2 rounded-xl border border-amber-100">
                      <div className="text-lg font-black">{lateCount}</div>
                      <div className="text-[10px] font-bold">Đi muộn</div>
                    </div>
                    <div className="bg-red-50 text-red-700 p-2 rounded-xl border border-red-100">
                      <div className="text-lg font-black">{absentCount}</div>
                      <div className="text-[10px] font-bold">Vắng mặt</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 font-medium">
                    Tổng cộng: {totalSessions} buổi học
                  </div>
                </div>
              )}
            </div>

            {/* Cột phải: Điểm thi gần đây */}
            <div className="md:col-span-7 bg-white border border-slate-100 p-5 rounded-2xl flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-5 h-5 text-orange-500" />
                <h3 className="font-bold text-gray-800 text-sm">10 bài thi gần nhất</h3>
              </div>

              {submissions.length === 0 ? (
                <div className="flex-1 flex items-center justify-center py-12 text-gray-400 text-xs font-medium">
                  Chưa tham gia bài thi nào
                </div>
              ) : (
                <div className="space-y-3 overflow-y-auto max-h-[300px] pr-1">
                  {submissions.map((sub, idx) => {
                    const score = Number(sub.score) || 0
                    const title = sub.exam_rooms?.exams?.title || `Bài thi ${idx + 1}`
                    const isSubmitted = sub.status === 'submitted'
                    
                    const scoreBg = !isSubmitted ? 'bg-amber-50 border-amber-100 text-amber-600'
                                  : score >= 8 ? 'bg-green-50 border-green-100 text-green-700'
                                  : score >= 5 ? 'bg-orange-50 border-orange-100 text-orange-700'
                                  : 'bg-red-50 border-red-100 text-red-700'

                    // Câu đúng / tổng số câu
                    const sb = sub.score_breakdown || {}
                    const examQuestions = sub.exam_rooms?.exams?.data?.questions || []
                    const mcCorrect = sb.multipleChoice?.correct || 0
                    const tfCorrect = sb.trueFalse?.correct || 0
                    const saCorrect = sb.shortAnswer?.correct || 0
                    const totalCorrect = mcCorrect + tfCorrect + saCorrect
                    const totalQCount = examQuestions.length || 
                      ((sb.multipleChoice?.total || 0) + (sb.trueFalse?.total || 0) + (sb.shortAnswer?.total || 0))

                    return (
                      <div key={idx} className="flex items-center justify-between p-3 border border-slate-50 hover:border-slate-100 hover:bg-slate-50/50 rounded-xl transition-all gap-4">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-gray-700 truncate" title={title}>
                            {title}
                          </h4>
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400 font-medium">
                            {sub.submitted_at ? (
                              <span>{format(new Date(sub.submitted_at), 'dd/MM/yyyy HH:mm')}</span>
                            ) : (
                              <span>Đang làm bài</span>
                            )}
                            {isSubmitted && totalQCount > 0 && (
                              <span className="flex items-center gap-0.5 text-gray-500 font-semibold bg-gray-100 px-1.5 py-0.5 rounded">
                                <CheckCircle className="w-3 h-3 text-green-500" />
                                {totalCorrect}/{totalQCount} câu đúng
                              </span>
                            )}
                          </div>
                        </div>

                        <div className={`px-3 py-1.5 rounded-xl border font-black text-sm shrink-0 ${scoreBg}`}>
                          {!isSubmitted ? 'Đang làm' : `${score.toFixed(2)}đ`}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
