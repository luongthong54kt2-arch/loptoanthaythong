import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import ResultView from '@/components/ResultView' 
import PDFExamRoom from '@/components/PDFExamRoom'
import ExamRoom from '@/components/ExamRoom' // ✅ IMPORT GIAO DIỆN CHUNG
import { shuffleExamForStudent } from '@/services/mergeExamsService'
import toast from 'react-hot-toast'

export default function ExamRoomPage() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  
  const [student, setStudent] = useState<any>(null)
  const [room, setRoom] = useState<any>(null)
  const [exam, setExam] = useState<any>(null)
  const [currentExamData, setCurrentExamData] = useState<any>(null) 
  
  const [answers, setAnswers] = useState<Record<number, any>>({}) 
  const [loading, setLoading] = useState(true)
  const [submissionId, setSubmissionId] = useState<string | undefined>()
  const [submittedResult, setSubmittedResult] = useState<any>(null)

  useEffect(() => {
    const sessionStr = sessionStorage.getItem('current_student')
    if (!sessionStr) {
      toast.error('Vui lòng đăng nhập qua cổng thi')
      navigate('/thi')
      return
    }
    const currentStudent = JSON.parse(sessionStr)
    setStudent(currentStudent)

    const loadExamData = async () => {
      try {
        const { data: roomData, error: roomErr } = await supabase.from('exam_rooms').select('*').eq('id', roomId).single()
        if (roomErr || !roomData) throw new Error('Không tìm thấy phòng thi')
        
        const now = new Date()
        if (roomData.opens_at && now < new Date(roomData.opens_at)) {
          throw new Error(`Đề thi chưa mở. Thời gian mở: ${new Date(roomData.opens_at).toLocaleString('vi-VN')}`)
        }
        setRoom(roomData)

        const { data: examData, error: examErr } = await supabase.from('exams').select('id, data, title').eq('id', roomData.exam_id).single()
        if (examErr || !examData) throw new Error('Không tìm thấy đề thi')
        setExam(examData)

        const isPdf = !!examData.data?.pdfUrl || !!examData.data?.pdfDriveUrl || !!examData.data?.pdfBase64;
        
        const { data: submission } = await supabase
          .from('exam_submissions').select('*').eq('room_id', roomId).eq('student_id', currentStudent.id).maybeSingle()
        
        let finalExamData = examData.data;

        if (submission && submission.score_breakdown?.shuffled_exam) {
          finalExamData = submission.score_breakdown.shuffled_exam;
        } else if (!isPdf && roomData.settings?.shuffle) {
          finalExamData = shuffleExamForStudent(examData.data);
        }

        setCurrentExamData(finalExamData);

        if (submission) {
          setSubmissionId(submission.id)
          if (submission.status === 'submitted') {
            const b = submission.score_breakdown || {};
            const correct = (b.multipleChoice?.correct || 0) + (b.trueFalse?.correct || 0) + (b.shortAnswer?.correct || 0);
            const total = (b.multipleChoice?.total || 0) + (b.trueFalse?.total || 0) + (b.shortAnswer?.total || 0) || finalExamData.questions.length;
            
            setSubmittedResult({
              ...submission, student: currentStudent, percentage: b.percentage || 0,
              totalScore: submission.score || b.totalScore || 0, correctCount: correct,
              wrongCount: Math.max(0, total - correct), totalQuestions: total,
              scoreBreakdown: b,           // ✅ FIX BUG 3: map scoreBreakdown tường minh
              answers: submission.answers  // ✅ đảm bảo answers luôn có
            });
          } else {
            setAnswers(submission.answers || {})
          }
        } else {
          const { data: newSub } = await supabase.from('exam_submissions').upsert({
            room_id: roomId, student_id: currentStudent.id, status: 'in_progress', answers: {},
            score_breakdown: { shuffled_exam: finalExamData, attempt_count: 1 } 
          }, { onConflict: 'room_id, student_id' }).select().single()
          if (newSub) setSubmissionId(newSub.id)
        }

      } catch (err: any) {
        toast.error(err.message)
        navigate('/thi')
      } finally {
        setLoading(false)
      }
    }

    loadExamData()
  }, [roomId, navigate])

  const handleRetry = async () => {
    if (!confirm('Bạn có muốn thi lại? Kết quả cũ sẽ bị xóa hoàn toàn.')) return;
    try {
      const currentAttempt = submittedResult?.score_breakdown?.attempt_count || submittedResult?.scoreBreakdown?.attempt_count || 1;
      await supabase.from('exam_submissions').update({
        status: 'in_progress',
        answers: {},
        score: null,
        score_breakdown: {
          shuffled_exam: currentExamData,
          attempt_count: currentAttempt + 1
        },
        submitted_at: null,
        tab_switches: 0,
        tab_switch_warnings: [],
        duration: 0
      }).eq('id', submissionId);
      window.location.reload(); 
    } catch (e) {
      toast.error('Lỗi khi làm mới bài thi');
    }
  };

  // ✅ 1. HIỂN THỊ KẾT QUẢ SAU KHI NỘP BÀI
  if (submittedResult && currentExamData) {
    const mappedRoom = { ...room, examTitle: exam.title, settings: room.settings || { showCorrectAnswers: true, showExplanations: true } };
    return (
      <div className="relative">
        <ResultView submission={submittedResult} room={mappedRoom} exam={{...currentExamData, title: exam.title}} onExit={() => { sessionStorage.removeItem('current_student'); navigate('/thi'); }} />
        {room.settings?.allowRetry && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
            <button onClick={handleRetry} className="px-6 py-3 bg-white text-blue-600 border-2 border-blue-600 rounded-full font-bold shadow-xl hover:bg-blue-50 hover:scale-105 transition">
              🔄 Bắt đầu thi lại
            </button>
          </div>
        )}
      </div>
    );
  }

  if (loading || !currentExamData) return <div className="min-h-screen flex items-center justify-center text-teal-600 font-bold">♻️ Đang tải dữ liệu...</div>

  // ✅ 2. NẾU LÀ ĐỀ PDF -> MỞ GIAO DIỆN PDFExamRoom
  const isPdfExam = !!currentExamData.pdfUrl || !!currentExamData.pdfDriveUrl || !!currentExamData.pdfBase64;
  if (isPdfExam) {
    return (
      <PDFExamRoom 
        room={room} 
        exam={{ ...currentExamData, id: exam.id, title: exam.title }} 
        student={student} 
        existingSubmissionId={submissionId} 
        onSubmitted={setSubmittedResult} 
        onExit={() => { sessionStorage.removeItem('current_student'); navigate('/thi'); }} 
      />
    );
  }

  // ✅ 3. NẾU LÀ ĐỀ WORD / LATEX -> MỞ GIAO DIỆN CHUNG ExamRoom
  return (
    <ExamRoom 
      room={room}
      exam={{ ...currentExamData, id: exam.id, title: exam.title }}
      student={student}
      existingSubmissionId={submissionId}
      initialAnswers={answers}
      onSubmitted={setSubmittedResult}
      onExit={() => { sessionStorage.removeItem('current_student'); navigate('/thi'); }}
    />
  );
}
