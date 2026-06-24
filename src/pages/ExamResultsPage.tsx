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
  const [loading, setLoading] = useState(true)

  const [selectedSub, setSelectedSub] = useState<any>(null)
  const [showEssayGrader, setShowEssayGrader] = useState(false)

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
    } catch (err) {
      toast.error('Không thể tải dữ liệu kết quả')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="p-20 text-center text-teal-600 font-bold">Đang tải bảng điểm...</div>

  // ✅ THÊM ĐOẠN NÀY VÀO ĐÂY: Sắp xếp điểm từ cao đến thấp
  const sortedSubmissions = [...submissions].sort((a, b) => {
    const scoreA = a.status === 'submitted' && a.score !== null ? a.score : -1;
    const scoreB = b.status === 'submitted' && b.score !== null ? b.score : -1;
    return scoreB - scoreA;
  });

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
              Mã phòng: <span className="font-mono font-bold text-teal-600">{room?.code}</span> · {submissions.length} bài nộp
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

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-6 py-4 text-left font-bold text-gray-600">Học sinh</th>
              <th className="px-6 py-4 text-center font-bold text-gray-600">Trạng thái</th>
              <th className="px-6 py-4 text-center font-bold text-gray-600">Điểm</th>
              <th className="px-6 py-4 text-center font-bold text-gray-600">Số câu đúng</th>
              <th className="px-6 py-4 text-right font-bold text-gray-600">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
  {sortedSubmissions.map((sub) => {
    const sb = sub.score_breakdown || {}

    const mcCorrect = sb.multipleChoice?.correct || 0
    const tfCorrect = sb.trueFalse?.correct || 0
    const saCorrect = sb.shortAnswer?.correct || 0
    const computedCorrectCount = mcCorrect + tfCorrect + saCorrect

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
      correctCount: sub.correct_count ?? computedCorrectCount,
      totalQuestions: totalQCount,
      duration: sub.duration || 0,
      tabSwitchCount: sub.tab_switches || 0,
      scoreBreakdown: sb,
      answers: sub.answers
    }

    // Kiểm tra xem học sinh đã thực sự nộp bài và có điểm chưa
    const hasSubmitted = sub.status === 'submitted' && sub.score != null;

    return (
      <tr key={sub.id} className="hover:bg-teal-50/30 transition-colors">
        <td className="px-6 py-4">
          <div className="font-bold text-gray-800">{sub.students?.full_name}</div>
          <div className="text-xs text-gray-400 font-mono">{sub.students?.student_code}</div>
        </td>
        
        {/* Cập nhật Trạng thái */}
        <td className="px-6 py-4 text-center">
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
            hasSubmitted
              ? 'bg-green-100 text-green-700'
              : sub.status === 'in_progress' 
                ? 'bg-amber-100 text-amber-700' 
                : 'bg-gray-100 text-gray-500'
          }`}>
            {hasSubmitted ? 'Đã nộp' : sub.status === 'in_progress' ? 'Đang làm' : 'Chưa làm'}
          </span>
        </td>
        
        {/* Cập nhật Điểm số từ cao đến thấp, chưa làm hiển thị "Chưa làm" hoặc "—" */}
        <td className="px-6 py-4 text-center font-bold text-lg">
          {hasSubmitted ? (
            <span className="text-teal-600">{sub.score.toFixed(2)}</span>
          ) : (
            <span className="text-gray-400 text-sm font-normal">Chưa làm</span>
          )}
        </td>
        
        {/* Cập nhật Số câu đúng */}
        <td className="px-6 py-4 text-center text-gray-600">
          {hasSubmitted ? (
            <span className="font-semibold">
              {computedCorrectCount}
              <span className="text-gray-400 font-normal">/{totalQCount}</span>
            </span>
          ) : (
            '—'
          )}
        </td>
        
        <td className="px-6 py-4 text-right">
          {/* Chỉ cho phép xem chi tiết nếu học sinh đã làm bài */}
          {sub.status && (
            <button
              onClick={() => setSelectedSub(formattedSub)}
              className="p-2 text-teal-600 hover:bg-teal-100 rounded-lg transition-all"
              title="Xem chi tiết câu trả lời"
            >
              <Eye className="w-5 h-5" />
            </button>
          )}
        </td>
      </tr>
    )
  })}
</tbody>
        </table>
      </div>

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
