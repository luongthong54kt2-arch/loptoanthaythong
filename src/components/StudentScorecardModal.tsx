// @ts-nocheck
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { 
  CalendarCheck, Trophy, ExternalLink, Loader2, CheckCircle,
  User, Calendar, Phone, MapPin, StickyNote, GraduationCap, Camera
} from 'lucide-react'
import Modal from '@/components/Modal'
import toast from 'react-hot-toast'

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
  const [uploading, setUploading] = useState(false)
  const [attendance, setAttendance] = useState<any[]>([])
  const [submissions, setSubmissions] = useState<any[]>([])
  const [studentInfo, setStudentInfo] = useState<any>(null)

  useEffect(() => {
    if (open && student?.id) {
      loadStudentData()
    }
  }, [open, student?.id])

  const loadStudentData = async () => {
    setLoading(true)
    try {
      const [attRes, subRes, infoRes] = await Promise.all([
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
          .limit(10),
        supabase
          .from('students')
          .select('*')
          .eq('id', student.id)
          .maybeSingle()
      ])

      setAttendance(attRes.data || [])
      setSubmissions(subRes.data || [])
      setStudentInfo(infoRes.data || null)
    } catch (error) {
      console.error('Lỗi khi tải bảng điểm thu gọn:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Chỉ chấp nhận tệp tin hình ảnh!')
      return
    }

    if (file.size > 3 * 1024 * 1024) {
      toast.error('Kích thước ảnh không được vượt quá 3MB!')
      return
    }

    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${student.id}_${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      // Upload to 'exams_pdf' bucket
      const { error: uploadError } = await supabase.storage
        .from('exams_pdf')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('exams_pdf')
        .getPublicUrl(filePath)

      // Update student table
      const { error: updateError } = await supabase
        .from('students')
        .update({ avatar_url: publicUrl })
        .eq('id', student.id)

      if (updateError) throw updateError

      setStudentInfo(prev => prev ? { ...prev, avatar_url: publicUrl } : { avatar_url: publicUrl })
      toast.success('Cập nhật ảnh đại diện thành công!')
    } catch (err: any) {
      console.error('Lỗi upload avatar:', err)
      toast.error('Không thể tải ảnh lên: ' + (err.message || err))
    } finally {
      setUploading(false)
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    try {
      return format(new Date(dateStr), 'dd/MM/yyyy')
    } catch {
      return dateStr
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

  const displayName = studentInfo?.full_name || student.full_name || 'Học sinh'
  const displayCode = studentInfo?.student_code || student.student_code || '—'

  // Chữ cái viết tắt làm Avatar
  const initials = displayName
    .split(' ')
    .slice(-2)
    .map((w: string) => w[0])
    .join('')
    .toUpperCase() || 'HS'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Hồ sơ & Bảng điểm học sinh`}
      size="2xl"
    >
      <div className="space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
            <p className="text-sm text-gray-500 font-medium">Đang tải dữ liệu học tập...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Cột trái (Hồ sơ cá nhân & Chuyên cần): lg:col-span-5 */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Thẻ hồ sơ cá nhân */}
              <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-5 space-y-4">
                
                {/* Khu vực Avatar & Tên */}
                <div className="text-center pb-3 border-b border-slate-100">
                  <div className="relative group w-20 h-20 mx-auto mb-2.5">
                    {studentInfo?.avatar_url ? (
                      <img 
                        src={studentInfo.avatar_url} 
                        alt={displayName} 
                        className="w-20 h-20 rounded-full object-cover border-4 border-teal-50 shadow-md"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-teal-500 via-teal-600 to-emerald-600 border-4 border-teal-50 flex items-center justify-center text-white text-2xl font-black shadow-md">
                        {initials}
                      </div>
                    )}
                    
                    {/* Overlay thay đổi ảnh */}
                    <label className="absolute inset-0 flex flex-col items-center justify-center bg-black/45 text-white rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-all duration-200 shadow-inner">
                      <Camera className="w-5 h-5 mb-0.5" />
                      <span className="text-[9px] font-bold uppercase tracking-wider">Đổi ảnh</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleAvatarChange} 
                        disabled={uploading} 
                      />
                    </label>

                    {/* Vòng xoay khi đang upload */}
                    {uploading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full">
                        <Loader2 className="w-6 h-6 text-teal-400 animate-spin" />
                      </div>
                    )}
                  </div>

                  <h3 className="font-bold text-gray-800 text-lg line-clamp-1">{displayName}</h3>
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-mono font-bold text-teal-700 bg-teal-50 border border-teal-100 mt-1">
                    {displayCode}
                  </span>
                </div>

                {/* Thông tin liên hệ / học vấn */}
                <div className="space-y-3.5 text-xs">
                  {/* Ngày sinh & Lớp */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-start gap-2">
                      <Calendar className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-gray-400 font-semibold">Ngày sinh</div>
                        <div className="text-gray-700 font-bold truncate">{formatDate(studentInfo?.date_of_birth)}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <GraduationCap className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-gray-400 font-semibold">Khối lớp</div>
                        <div className="text-gray-700 font-bold truncate">{studentInfo?.grade || '—'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Trường học */}
                  <div className="flex items-start gap-2">
                    <GraduationCap className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-gray-400 font-semibold">Trường học</div>
                      <div className="text-gray-700 font-bold truncate" title={studentInfo?.school || ''}>
                        {studentInfo?.school || '—'}
                      </div>
                    </div>
                  </div>

                  {/* Họ tên phụ huynh */}
                  <div className="flex items-start gap-2">
                    <User className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-gray-400 font-semibold">Phụ huynh</div>
                      <div className="text-gray-700 font-bold truncate" title={studentInfo?.parent_name || ''}>
                        {studentInfo?.parent_name || '—'}
                      </div>
                    </div>
                  </div>

                  {/* Số điện thoại phụ huynh */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-start gap-2">
                      <Phone className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-gray-400 font-semibold">SĐT Phụ huynh</div>
                        <div className="text-gray-700 font-bold truncate">
                          {studentInfo?.parent_phone ? (
                            <a href={`tel:${studentInfo.parent_phone}`} className="text-teal-600 hover:underline">
                              {studentInfo.parent_phone}
                            </a>
                          ) : '—'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Phone className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-gray-400 font-semibold">Zalo</div>
                        <div className="text-gray-700 font-bold truncate">{studentInfo?.zalo || '—'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Địa chỉ */}
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-gray-400 font-semibold">Địa chỉ</div>
                      <div className="text-gray-700 font-bold line-clamp-2" title={studentInfo?.address || ''}>
                        {studentInfo?.address || '—'}
                      </div>
                    </div>
                  </div>

                  {/* Ghi chú */}
                  <div className="flex items-start gap-2 pt-1 border-t border-slate-100">
                    <StickyNote className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-gray-400 font-semibold">Ghi chú</div>
                      <div className="text-gray-600 italic font-medium line-clamp-3" title={studentInfo?.note || ''}>
                        {studentInfo?.note || '—'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Link liên kết tiến độ */}
                <div className="pt-2">
                  <a
                    href={`/progress?code=${displayCode}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 w-full py-2 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-100 rounded-xl transition-all"
                  >
                    Xem tiến độ chi tiết <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Chuyên cần */}
              <div className="bg-white border border-slate-100 p-5 rounded-2xl flex flex-col items-center justify-center text-center">
                <div className="flex items-center gap-2 mb-4 self-start">
                  <CalendarCheck className="w-4 h-4 text-teal-600" />
                  <h3 className="font-bold text-gray-800 text-xs">Chuyên cần (Gần đây)</h3>
                </div>

                {totalSessions === 0 ? (
                  <div className="py-6 text-gray-400 text-[11px] font-medium">
                    Chưa có dữ liệu điểm danh
                  </div>
                ) : (
                  <div className="w-full space-y-4">
                    {/* Tỷ lệ đi học */}
                    <div className={`inline-flex flex-col items-center justify-center p-3 border rounded-full w-24 h-24 mx-auto ${rateColor}`}>
                      <span className="text-xl font-black">{attendanceRate}%</span>
                      <span className="text-[9px] font-bold uppercase tracking-wider mt-0.5">Đi học</span>
                    </div>

                    {/* Thanh tiến độ */}
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full ${progressColor} transition-all`} style={{ width: `${attendanceRate}%` }} />
                    </div>

                    {/* Thống kê chi tiết */}
                    <div className="grid grid-cols-3 gap-1.5 pt-1 text-xs">
                      <div className="bg-green-50 text-green-700 p-1.5 rounded-xl border border-green-100">
                        <div className="font-black">{presentCount}</div>
                        <div className="text-[9px] font-bold">Đi học</div>
                      </div>
                      <div className="bg-amber-50 text-amber-700 p-1.5 rounded-xl border border-amber-100">
                        <div className="font-black">{lateCount}</div>
                        <div className="text-[9px] font-bold">Đi muộn</div>
                      </div>
                      <div className="bg-red-50 text-red-700 p-1.5 rounded-xl border border-red-100">
                        <div className="font-black">{absentCount}</div>
                        <div className="text-[9px] font-bold">Vắng mặt</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Cột phải (Điểm thi gần đây): lg:col-span-7 */}
            <div className="lg:col-span-7 bg-white border border-slate-100 p-5 rounded-2xl flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Trophy className="w-4 h-4 text-orange-500" />
                  <h3 className="font-bold text-gray-800 text-xs">10 bài thi gần nhất</h3>
                </div>

                {submissions.length === 0 ? (
                  <div className="flex items-center justify-center py-20 text-gray-400 text-xs font-medium">
                    Chưa tham gia bài thi nào
                  </div>
                ) : (
                  <div className="space-y-3 overflow-y-auto max-h-[480px] pr-1">
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

                          <div className={`px-3 py-1.5 rounded-xl border font-black text-xs shrink-0 ${scoreBg}`}>
                            {!isSubmitted ? 'Đang làm' : `${score.toFixed(2)}đ`}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
            
          </div>
        )}
      </div>
    </Modal>
  )
}
