import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { ChevronLeft, BrainCircuit, Eye } from 'lucide-react'
import Modal from '@/components/Modal'
import EssayGraderPanel from '@/components/EssayGraderPanel'
import SubmissionDetailView from '@/components/SubmissionDetailView'
import toast from 'react-hot-toast'

export default function ExamResultsPage() {
  const { roomId } = useParams()
  const navigate = useNavigate()

  const [room, setRoom] = useState<any>(null)
  const [exam, setExam] = useState<any>(null)
  const [submissions, setSubmissions] = useState<any[]>([])
  const [notSubmittedStudents, setNotSubmittedStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedSub, setSelectedSub] = useState<any>(null)
  const [showEssayGrader, setShowEssayGrader] = useState(false)
  const [activeTab, setActiveTab] = useState<'submitted' | 'not_submitted'>('submitted')

  useEffect(() => {
    loadAllData()
  }, [roomId])

  const loadAllData = async () => {
    setLoading(true)
    try {
      const { data: roomData } = await supabase
        .from('exam_rooms')
        .select('*, exams(title, data)')
        .eq('id', roomId)
        .single()

      setRoom(roomData)
      setExam(roomData.exams)

      const { data: subs } = await supabase
        .from('exam_submissions')
        .select('*, students(full_name, student_code)')
        .eq('room_id', roomId)
        .order('submitted_at', { ascending: false })

      setSubmissions(subs || [])

      // Lấy danh sách học sinh thuộc lớp của phòng thi để tìm ai chưa nộp
      if (roomData?.class_id) {
        const { data: enrolledStudents } = await supabase
          .from('enrollments')
          .select('student_id, students(id, full_name, student_code)')
          .eq('class_id', roomData.class_id)
          .eq('status', 'active')

        if (enrolledStudents) {
          const submittedStudentIds = new Set((subs || []).map((s: any) => s.student_id))
          const notSubmitted = enrolledStudents
            .filter((e: any) => !submittedStudentIds.has(e.student_id))
            .map((e: any) => e.students)
            .filter(Boolean)
          setNotSubmittedStudents(notSubmitted)
        }
      }
    } catch (err) {
      toast.error('Không thể tải dữ liệu kết quả')
    } finally {
      setLoading(false)
    }
  }

  const totalEnrolled = submissions.length + notSubmittedStudents.length

  if (loading) return <div className="p-20 text-center text-teal-600 font-bold">Đang tải bảng điểm...</div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/exam-rooms')} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div>
            <h1 className="section-title text-2xl">Kết quả: {room?.exams?.title}</h1>
            <p className="text-gray-400 text-sm">
              Mã phòng: <span className="font-mono font-bold text-teal-600">{room?.code}</span> · {submissions.length}/{totalEnrolled} đã nộp
              {notSubmittedStudents.length > 0 && (
                <span className="text-red-500 font-semibold"> · {notSubmittedStudents.length} chưa nộp</span>
              )}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowEssayGrader(true)}
          className="btn-teal bg-violet-600 hover:bg-violet-700 flex items-center gap-2 w-max"
        >
          <BrainCircuit className="w-4 h-4" /> Chấm Tự luận AI
        </button>
      </div>

      {/* Tab Selector */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('submitted')}
          className={`px-5 py-2.5 font-bold text-sm transition-all border-b-2 -mb-px flex items-center gap-1.5 ${
            activeTab === 'submitted'
              ? 'border-teal-600 text-teal-600'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          📝 Đã làm ({submissions.length})
        </button>
        <button
          onClick={() => setActiveTab('not_submitted')}
          className={`px-5 py-2.5 font-bold text-sm transition-all border-b-2 -mb-px flex items-center gap-1.5 ${
            activeTab === 'not_submitted'
              ? 'border-teal-600 text-teal-600'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          ⏳ Chưa làm ({notSubmittedStudents.length})
        </button>
      </div>

      {activeTab === 'submitted' ? (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-left font-bold text-gray-600">Học sinh</th>
                <th className="px-6 py-4 text-center font-bold text-gray-600">Trạng thái</th>
                <th className="px-6 py-4 text-center font-bold text-gray-600">Cảnh báo vi phạm</th>
                <th className="px-6 py-4 text-center font-bold text-gray-600">Điểm</th>
                <th className="px-6 py-4 text-center font-bold text-gray-600">Số câu đúng</th>
                <th className="px-6 py-4 text-right font-bold text-gray-600">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {/* Học sinh đã nộp bài / đang làm */}
              {[...submissions]
                .sort((a, b) => {
                  const scoreA = a.score ?? -1
                  const scoreB = b.score ?? -1
                  return scoreB - scoreA
                })
                .map((sub) => {
                  const sb = sub.score_breakdown || {}

                  // ✅ FIX BUG 2+5: correctCount từ score_breakdown, không phải correct_count
                  const mcCorrect = sb.multipleChoice?.correct || 0
                  const tfCorrect = sb.trueFalse?.correct || 0
                  const saCorrect = sb.shortAnswer?.correct || 0
                  const computedCorrectCount = mcCorrect + tfCorrect + saCorrect

                  // ✅ FIX BUG 5: totalQuestions từ exam.questions.length (đầy đủ)
                  const examQuestions = exam?.data?.questions || []
                  const totalQCount = examQuestions.length ||
                    ((sb.multipleChoice?.total || 0) + (sb.trueFalse?.total || 0) + (sb.shortAnswer?.total || 0))

                  const formattedSub = {
                    ...sub,
                    student: {
                      name: sub.students?.full_name,
                      className: '',
                      studentCode: sub.students?.student_code
                    },
                    roomCode: room.code,
                    totalScore: sub.score || sb.totalScore || 0,
                    percentage: sb.percentage || 0,
                    // ✅ FIX: dùng correct_count từ DB nếu có, fallback sang compute
                    correctCount: sub.correct_count ?? computedCorrectCount,
                    totalQuestions: totalQCount,
                    duration: sub.duration || 0,
                    tabSwitchCount: sub.tab_switches || 0,
                    scoreBreakdown: sb,           // ✅ FIX BUG 1: map đúng tên camelCase
                    answers: sub.answers          // ✅ đảm bảo answers luôn có
                  }

                  return (
                    <tr key={sub.id} className="hover:bg-teal-50/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-800">{sub.students?.full_name}</div>
                        <div className="text-xs text-gray-400 font-mono">{sub.students?.student_code}</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          sub.status === 'submitted'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {sub.status === 'submitted' ? 'Đã nộp' : 'Đang làm'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {(sub.tab_switches || 0) > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-extrabold bg-red-50 text-red-700 border border-red-200 shadow-sm animate-pulse">
                            ⚠️ Chuyển tab {sub.tab_switches} lần
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs font-semibold">✅ Bình thường</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-teal-600 text-lg">
                        {sub.score != null ? sub.score.toFixed(2) : '—'}
                      </td>
                      <td className="px-6 py-4 text-center text-gray-600">
                        {sub.status === 'submitted'
                          ? <span className="font-semibold">{computedCorrectCount}<span className="text-gray-400 font-normal">/{totalQCount}</span></span>
                          : '—'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setSelectedSub(formattedSub)}
                          className="p-2 text-teal-600 hover:bg-teal-100 rounded-lg transition-all"
                          title="Xem chi tiết câu trả lời"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  )
                })}

              {submissions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-gray-400">
                    Chưa có học sinh nào nộp bài.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card p-6 bg-slate-50/50">
          {notSubmittedStudents.length === 0 ? (
            <p className="text-center text-gray-400 font-bold py-12">🎉 Tất cả học sinh đã nộp bài!</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {notSubmittedStudents.map((student) => (
                <div 
                  key={student.id} 
                  className="bg-white border border-slate-200/80 rounded-xl p-4 font-bold text-gray-800 text-center shadow-sm hover:border-teal-500 hover:shadow-md transition-all duration-200 flex items-center justify-center min-h-[60px]"
                >
                  {student.full_name}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Modal open={showEssayGrader} onClose={() => setShowEssayGrader(false)} title="Chấm bài tự luận bằng Gemini AI" size="3xl">
        <div className="p-2">
          <EssayGraderPanel
            submissions={submissions.map(s => ({ ...s, student: { name: s.students?.full_name } }))}
            questions={exam?.data?.questions || []}
            onScoreUpdate={loadAllData}
          />
        </div>
      </Modal>

      {selectedSub && (() => {
        // ✅ FIX ROOT CAUSE: Dùng shuffled_exam của học sinh nếu có.
        // Khi shuffle bật, câu hỏi được đánh số lại 1,2,3...
        // Answers lưu theo số mới đó, không khớp với đề gốc (101,102...).
        // → Phải dùng đúng đề mà học sinh đã làm để xem bài.
        const studentExam = selectedSub.scoreBreakdown?.shuffled_exam
          || selectedSub.score_breakdown?.shuffled_exam
          || exam.data;
        return (
          <SubmissionDetailView
            submission={selectedSub}
            exam={{ ...studentExam, title: exam.title }}
            room={room}
            onClose={() => setSelectedSub(null)}
          />
        );
      })()}
    </div>
  )
}
