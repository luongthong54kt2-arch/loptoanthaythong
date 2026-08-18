import * as XLSX from 'xlsx'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export interface ExportExamExcelOptions {
  roomId: string
  roomData?: any
  submissions?: any[]
  notSubmittedStudents?: any[]
}

export async function exportExamRoomScores(options: ExportExamExcelOptions | string) {
  const roomId = typeof options === 'string' ? options : options.roomId
  const toastId = toast.loading('Đang chuẩn bị dữ liệu xuất Excel...')

  try {
    let room = typeof options === 'object' ? options.roomData : null
    let subs = typeof options === 'object' && options.submissions ? options.submissions : null
    let notSubmitted = typeof options === 'object' && options.notSubmittedStudents ? options.notSubmittedStudents : null

    // 1. Nếu chưa có thông tin phòng, truy vấn từ Supabase
    if (!room) {
      const { data: roomData, error: roomErr } = await supabase
        .from('exam_rooms')
        .select('*, exams(title, data), classes(id, class_name, name, grade)')
        .eq('id', roomId)
        .single()

      if (roomErr || !roomData) {
        throw new Error('Không tìm thấy thông tin phòng thi')
      }
      room = roomData
    }

    const examTitle = room.exams?.title || 'Bài thi'
    const roomCode = room.code || '—'
    const className = (room.classes as any)?.class_name || (room.classes as any)?.name || 'Tất cả'
    const examQuestions = room.exams?.data?.questions || []
    const defaultTotalQ = examQuestions.length

    // 2. Nếu chưa có submissions, lấy từ Supabase
    if (!subs) {
      const { data: subsData, error: subsErr } = await supabase
        .from('exam_submissions')
        .select('*, students(id, full_name, student_code)')
        .eq('room_id', roomId)
        .order('submitted_at', { ascending: false })

      if (subsErr) throw subsErr
      subs = subsData || []
    }

    // Lọc bài nộp hợp lệ (điểm !== 0 hoặc đã nộp)
    const activeSubs = (subs || []).filter((s: any) => s.score !== 0)

    // 3. Nếu chưa có danh sách học sinh chưa nộp, truy vấn từ bảng enrollments
    if (!notSubmitted) {
      if (room.class_id) {
        const { data: enrollments } = await supabase
          .from('enrollments')
          .select('student_id, students(id, full_name, student_code)')
          .eq('class_id', room.class_id)
          .eq('status', 'active')

        if (enrollments) {
          const activeStudentIds = new Set(activeSubs.map((s: any) => s.student_id))
          notSubmitted = enrollments
            .filter((e: any) => !activeStudentIds.has(e.student_id))
            .map((e: any) => e.students)
            .filter(Boolean)
        } else {
          notSubmitted = []
        }
      } else {
        notSubmitted = []
      }
    }

    // 4. Chuẩn hóa dữ liệu học sinh ĐÃ LÀM
    const submittedRows = activeSubs.map((sub: any) => {
      const sb = sub.score_breakdown || {}
      const historyTabSwitches = (sb.history || []).reduce((sum: number, att: any) => sum + (att.tab_switches || 0), 0)
      const totalTabSwitches = (sub.tab_switches || 0) + historyTabSwitches
      const attemptCount = sb.attempt_count || (sb.history ? sb.history.length + 1 : 1)

      const mcCorrect = sb.multipleChoice?.correct || 0
      const tfCorrect = sb.trueFalse?.correct || 0
      const saCorrect = sb.shortAnswer?.correct || 0
      const computedCorrect = mcCorrect + tfCorrect + saCorrect
      const correctCount = sub.correct_count ?? computedCorrect

      const totalQ = defaultTotalQ || ((sb.multipleChoice?.total || 0) + (sb.trueFalse?.total || 0) + (sb.shortAnswer?.total || 0))

      const rawDuration = sub.duration || 0
      const minutes = Math.floor(rawDuration / 60)
      const seconds = rawDuration % 60
      const durationStr = `${minutes} phút ${seconds.toString().padStart(2, '0')} giây`

      const rawScore = sub.score != null ? Number(sub.score) : 0
      const scoreFormatted = Number(rawScore.toFixed(2))

      const submittedTime = sub.submitted_at 
        ? new Date(sub.submitted_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })
        : '—'

      return {
        hasDone: true,
        studentId: sub.student_id,
        studentCode: sub.students?.student_code || '—',
        fullName: sub.students?.full_name || 'Chưa rõ tên',
        className: className,
        rawScore: rawScore,
        score: scoreFormatted,
        correctCount: `${correctCount}/${totalQ}`,
        attemptCount: attemptCount,
        tabSwitches: totalTabSwitches,
        rawDuration: rawDuration,
        duration: durationStr,
        status: sub.status === 'submitted' ? 'Đã nộp bài' : 'Đang làm',
        submittedAt: submittedTime
      }
    })

    // Sắp xếp học sinh đã làm từ điểm cao xuống thấp (nếu bằng điểm, ai làm nhanh hơn xếp trên)
    submittedRows.sort((a: any, b: any) => {
      if (b.rawScore !== a.rawScore) {
        return b.rawScore - a.rawScore
      }
      return a.rawDuration - b.rawDuration
    })

    // 5. Chuẩn hóa dữ liệu học sinh CHƯA LÀM
    const notSubmittedRows = (notSubmitted || []).map((student: any) => {
      return {
        hasDone: false,
        studentId: student.id,
        studentCode: student.student_code || '—',
        fullName: student.full_name || 'Chưa rõ tên',
        className: className,
        rawScore: -1,
        score: 'Chưa làm',
        correctCount: 'Chưa làm',
        attemptCount: 'Chưa làm',
        tabSwitches: 'Chưa làm',
        rawDuration: 0,
        duration: 'Chưa làm',
        status: 'Chưa làm bài',
        submittedAt: '—'
      }
    })

    // Sắp xếp danh sách chưa làm theo tên chữ cái A-Z
    notSubmittedRows.sort((a: any, b: any) => a.fullName.localeCompare(b.fullName, 'vi'))

    // 6. Ghép danh sách hoàn chỉnh: Đã làm (xếp theo điểm cao -> thấp) ở trên, Chưa làm ở dưới
    const allRows: any[] = []
    let rank = 1

    submittedRows.forEach((item: any) => {
      allRows.push([
        rank++,
        item.studentCode,
        item.fullName,
        item.className,
        item.score,
        item.correctCount,
        item.attemptCount,
        item.tabSwitches,
        item.duration,
        item.status,
        item.submittedAt
      ])
    })

    notSubmittedRows.forEach((item: any) => {
      allRows.push([
        '—',
        item.studentCode,
        item.fullName,
        item.className,
        item.score,
        item.correctCount,
        item.attemptCount,
        item.tabSwitches,
        item.duration,
        item.status,
        item.submittedAt
      ])
    })

    // 7. Tính toán các chỉ số thống kê
    const totalStudents = submittedRows.length + notSubmittedRows.length
    const scores = submittedRows.map((r: any) => r.rawScore)
    const maxScore = scores.length > 0 ? Math.max(...scores).toFixed(2) : '—'
    const minScore = scores.length > 0 ? Math.min(...scores).toFixed(2) : '—'
    const avgScore = scores.length > 0 ? (scores.reduce((a: number, b: number) => a + b, 0) / scores.length).toFixed(2) : '—'
    const passCount = scores.filter((s: number) => s >= 5).length
    const passRate = scores.length > 0 ? ((passCount / scores.length) * 100).toFixed(1) + '%' : '—'

    // 8. Tạo Sheet Excel định dạng chuẩn
    const exportDateStr = new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })
    
    const wsData: any[][] = [
      ['BẢNG ĐIỂM VÀ KẾT QUẢ THI CHI TIẾT'],
      [`Tên đề thi: ${examTitle}`],
      [`Mã phòng thi: ${roomCode}  |  Lớp: ${className}  |  Thời gian làm bài: ${room.time_limit || 45} phút`],
      [`Ngày xuất file: ${exportDateStr}  |  Tổng số học sinh: ${totalStudents} (Đã nộp: ${submittedRows.length}, Chưa làm: ${notSubmittedRows.length})`],
      [],
      [
        'STT (Xếp hạng)',
        'Mã học sinh',
        'Họ và tên',
        'Lớp',
        'Điểm số',
        'Số câu đúng',
        'Số lần thi',
        'Số lần vi phạm (Chuyển tab)',
        'Tổng thời gian làm bài',
        'Trạng thái',
        'Thời gian nộp bài'
      ],
      ...allRows,
      [],
      ['--- BẢNG THỐNG KÊ KẾT QUẢ ---'],
      ['Tổng số học sinh trong danh sách:', totalStudents],
      ['Số học sinh đã hoàn thành:', `${submittedRows.length} (${totalStudents > 0 ? ((submittedRows.length / totalStudents) * 100).toFixed(1) : 0}%)`],
      ['Số học sinh chưa làm bài:', notSubmittedRows.length],
      ['Điểm cao nhất:', maxScore],
      ['Điểm thấp nhất:', minScore],
      ['Điểm trung bình:', avgScore],
      ['Tỷ lệ học sinh đạt điểm >= 5:', `${passCount}/${submittedRows.length} (${passRate})`]
    ]

    const ws = XLSX.utils.aoa_to_sheet(wsData)

    // Đặt độ rộng các cột cho đẹp mắt
    ws['!cols'] = [
      { wch: 16 }, // STT (Xếp hạng)
      { wch: 14 }, // Mã học sinh
      { wch: 26 }, // Họ và tên
      { wch: 14 }, // Lớp
      { wch: 12 }, // Điểm số
      { wch: 14 }, // Số câu đúng
      { wch: 12 }, // Số lần thi
      { wch: 28 }, // Số lần vi phạm
      { wch: 25 }, // Tổng thời gian làm bài
      { wch: 16 }, // Trạng thái
      { wch: 22 }  // Thời gian nộp bài
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Bảng điểm chi tiết')

    // Tạo tên file an toàn không dấu gạch ngang rắc rối
    const safeExamTitle = examTitle.replace(/[/\\?%*:|"<>]/g, '_').substring(0, 30)
    const safeClassName = className.replace(/[/\\?%*:|"<>]/g, '_')
    const fileName = `Bang_Diem_${safeClassName}_${roomCode}_${safeExamTitle}.xlsx`

    XLSX.writeFile(wb, fileName)

    toast.success(`Đã xuất file Excel: ${fileName}`, { id: toastId })
  } catch (error: any) {
    console.error('Lỗi khi xuất file Excel:', error)
    toast.error('Lỗi khi xuất file Excel: ' + (error?.message || error), { id: toastId })
  }
}
