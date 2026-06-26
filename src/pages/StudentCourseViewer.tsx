// @ts-nocheck
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Lock, CheckCircle, PlayCircle, ChevronLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import LessonExamRoom from '@/components/LessonExamRoom'
import InteractiveVideoPlayer from '@/components/InteractiveVideoPlayer' // ✅ Import Player
import toast from 'react-hot-toast'

export default function StudentCourseViewer({ courseId: propCourseId, studentId: propStudentId }: { courseId?: string, studentId?: string }) {
  const params = useParams<{ courseId: string, studentId: string }>()
  const courseId = propCourseId || params.courseId
  const studentId = propStudentId || params.studentId

  const [course, setCourse] = useState<any>(null)
  const [progress, setProgress] = useState<any[]>([])
  const [activeLesson, setActiveLesson] = useState<any>(null)
  const [showPractice, setShowPractice] = useState(false)
  const [studentName, setStudentName] = useState('Học sinh')

  useEffect(() => {
    const sessionStr = sessionStorage.getItem('current_student')
    if (sessionStr) {
      const currentStudent = JSON.parse(sessionStr)
      setStudentName(currentStudent.full_name || currentStudent.name || 'Học sinh')
    }

    const fetchData = async () => {
      const { data: courseData } = await supabase.from('courses')
        .select('*, chapters(*, lessons(*))').eq('id', courseId).single()
      
      const { data: progressData } = await supabase.from('student_progress')
        .select('*').eq('student_id', studentId)

      setCourse(courseData)
      setProgress(progressData || [])
      
      // Sắp xếp chương và bài học theo order_index để chọn đúng bài học đầu tiên làm activeLesson
      if (courseData?.chapters && courseData.chapters.length > 0) {
        const sortedChapters = [...courseData.chapters].sort((a: any, b: any) => a.order_index - b.order_index)
        const firstChapter = sortedChapters[0]
        if (firstChapter?.lessons && firstChapter.lessons.length > 0) {
          const sortedLessons = [...firstChapter.lessons].sort((a: any, b: any) => a.order_index - b.order_index)
          setActiveLesson(sortedLessons[0])
        }
      }
    }
    fetchData()
  }, [courseId, studentId])

  const isUnlocked = (lesson: any) => {
    if (course?.chapters?.[0]?.lessons?.[0] && lesson.order_index === 1 && course.chapters[0].lessons[0].id === lesson.id) return true
    const p = progress.find(item => item.lesson_id === lesson.id)
    return p?.is_unlocked || false
  }

  // Hàm lưu tiến trình chung (Dùng cho cả nộp Bài tập lẫn làm Video xong)
  const handlePracticeSubmitted = async (percentage: number) => {
    try {
      await supabase.from('student_progress').upsert({
        student_id: studentId,
        lesson_id: activeLesson.id,
        is_passed: percentage >= 80,
        highest_score: percentage
      });

      if (percentage >= 80) {
        toast.success('🎉 Bạn đã đạt trên 80% và hoàn thành bài học!')
        const { data: progressData } = await supabase.from('student_progress').select('*').eq('student_id', studentId)
        setProgress(progressData || [])
      } else {
        toast.error(`⚠️ Điểm của bạn là ${percentage}%. Cần đạt 80% để qua bài.`)
      }
    } catch(e) {
      console.error(e);
    } finally {
      setShowPractice(false);
    }
  }

  if (showPractice && activeLesson?.exam_id) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col">
        <div className="p-4 bg-gray-100 flex items-center border-b shadow-sm">
          <button onClick={() => setShowPractice(false)} className="flex items-center gap-2 text-gray-600 hover:text-red-600 font-bold transition">
            <ChevronLeft /> Thoát luyện tập
          </button>
        </div>
        <div className="flex-1 relative">
          <LessonExamRoom 
            examId={activeLesson.exam_id} 
            studentName={studentName}
            onSubmitted={handlePracticeSubmitted}
            onExit={() => setShowPractice(false)} 
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-white">
      <aside className="w-80 border-r overflow-y-auto p-4 bg-gray-50 custom-scrollbar">
        <h2 className="font-bold text-lg mb-6">{course?.title}</h2>
        {course?.chapters?.sort((a:any, b:any) => a.order_index - b.order_index).map((chapter: any) => (
          <div key={chapter.id} className="mb-6">
            <h3 className="text-xs font-black text-gray-400 uppercase mb-3">{chapter.title}</h3>
            <div className="space-y-2">
              {chapter.lessons?.sort((a:any, b:any) => a.order_index - b.order_index).map((lesson: any) => {
                const unlocked = isUnlocked(lesson)
                const passed = progress.find(p => p.lesson_id === lesson.id)?.is_passed
                return (
                  <button 
                    key={lesson.id}
                    disabled={!unlocked}
                    onClick={() => setActiveLesson(lesson)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                      activeLesson?.id === lesson.id ? 'bg-teal-600 text-white shadow-lg' : 'hover:bg-teal-50'
                    } ${!unlocked ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                  >
                    {passed ? <CheckCircle className="w-5 h-5 text-green-400" /> : unlocked ? <PlayCircle className="w-5 h-5 text-teal-400" /> : <Lock className="w-5 h-5" />}
                    <span className="text-sm font-bold text-left">{lesson.title}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </aside>

      <main className="flex-1 flex flex-col">
        {activeLesson ? (
          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b flex justify-between items-center bg-white shadow-sm z-10">
              <h1 className="font-extrabold text-xl">{activeLesson.title}</h1>
              {activeLesson.exam_id && (
                <button onClick={() => setShowPractice(true)} className="bg-teal-600 text-white font-bold px-6 py-2 rounded-xl shadow-md hover:bg-teal-700 transition">
                  ✏️ Luyện tập ngay
                </button>
              )}
            </div>
            <div className="flex-1 bg-gray-200 relative">
              {activeLesson.video_url ? (
                <InteractiveVideoPlayer 
                   lesson={activeLesson} 
                   onComplete={() => handlePracticeSubmitted(100)} 
                />
              ) : activeLesson.pdf_url ? (
                <iframe src={`${activeLesson.pdf_url}#toolbar=0`} className="w-full h-full border-none" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">Không có tài liệu PDF / Video</div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 font-bold text-lg">Chọn một bài học để bắt đầu</div>
        )}
      </main>
    </div>
  )
}
