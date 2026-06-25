import { useEffect, useState } from 'react'
import { MonitorPlay, Plus, Trash2, KeyRound, BarChart3, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useExamRoomStore } from '@/store/examRoomStore'
import { useExamStore } from '@/store/examStore'
import { useDataStore } from '@/store/dataStore'
import Modal from '@/components/Modal'
import toast from 'react-hot-toast'

export default function ExamRoomsMgmt() {
  const navigate = useNavigate()
  const { rooms, loading, loadRooms, createRoom, updateRoomStatus, deleteRoom } = useExamRoomStore()
  const { exams, loadExams } = useExamStore()
  const { classes, loadClasses } = useDataStore()

  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // ✅ Đã thêm settings vào Form state
  const [form, setForm] = useState<{
    exam_id: string;
    class_id: string;
    time_limit: number;
    status: 'waiting' | 'active' | 'closed';
    settings: { shuffle: boolean; allowRetry: boolean };
  }>({
    exam_id: '',
    class_id: '',
    time_limit: 45,
    status: 'waiting',
    settings: { shuffle: true, allowRetry: false } // Mặc định: Bật trộn đề, tắt thi lại
  })

  useEffect(() => {
    void loadRooms()
    void loadExams()
    void loadClasses()
  }, [loadRooms, loadExams, loadClasses])

  const handleCreate = async () => {
    if (!form.exam_id) return toast.error('Vui lòng chọn đề thi')
    if (!form.class_id) return toast.error('Vui lòng chọn lớp học')

    setSaving(true)
    try {
      await createRoom(form)
      toast.success('Mở phòng thi thành công!')
      setModalOpen(false)
      // Reset form sau khi tạo
      setForm({ 
        exam_id: '', class_id: '', time_limit: 45, status: 'waiting', 
        settings: { shuffle: true, allowRetry: false } 
      })
    } catch (e: any) {
      toast.error('Lỗi khi mở phòng thi')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`Xóa phòng thi mã [${code}]? Mọi bài làm của học sinh sẽ bị mất.`)) return
    try {
      await deleteRoom(id)
      toast.success('Đã xóa phòng thi')
    } catch (e) {
      toast.error('Lỗi khi xóa')
    }
  }

  const getRoomGrade = (room: any) => {
    const roomClass = classes.find(c => c.id === room.class_id)
    if (roomClass) {
      const gradeStr = (roomClass.grade || '').toLowerCase().trim()
      if (gradeStr.includes('6') || gradeStr === '6') return 6
      if (gradeStr.includes('7') || gradeStr === '7') return 7
      if (gradeStr.includes('8') || gradeStr === '8') return 8
      if (gradeStr.includes('9') || gradeStr === '9') return 9

      const className = ((roomClass.class_name || roomClass.name || '') as string).toLowerCase()
      if (className.includes('lớp 6') || className.includes('khối 6') || className.includes('toán 6') || /\b6\b/.test(className)) return 6
      if (className.includes('lớp 7') || className.includes('khối 7') || className.includes('toán 7') || /\b7\b/.test(className)) return 7
      if (className.includes('lớp 8') || className.includes('khối 8') || className.includes('toán 8') || /\b8\b/.test(className)) return 8
      if (className.includes('lớp 9') || className.includes('khối 9') || className.includes('toán 9') || /\b9\b/.test(className)) return 9
    }

    const examTitle = (room.exams?.title || '').toLowerCase()
    if (examTitle.includes('lớp 6') || examTitle.includes('khối 6') || examTitle.includes('toán 6') || examTitle.includes('khối sáu') || /\b(khối\s+)?6\b/.test(examTitle)) return 6
    if (examTitle.includes('lớp 7') || examTitle.includes('khối 7') || examTitle.includes('toán 7') || examTitle.includes('khối bảy') || /\b(khối\s+)?7\b/.test(examTitle)) return 7
    if (examTitle.includes('lớp 8') || examTitle.includes('khối 8') || examTitle.includes('toán 8') || examTitle.includes('khối tám') || /\b(khối\s+)?8\b/.test(examTitle)) return 8
    if (examTitle.includes('lớp 9') || examTitle.includes('khối 9') || examTitle.includes('toán 9') || examTitle.includes('khối chín') || /\b(khối\s+)?9\b/.test(examTitle)) return 9

    return null
  }

  const displayGrades = [6, 7, 8, 9]
  const hasOtherRooms = rooms.some(room => {
    const grade = getRoomGrade(room)
    return grade === null || !displayGrades.includes(grade)
  })

  return (
    <div className="space-y-6">
      <div className="page-header flex justify-between items-start">
        <div>
          <h1 className="section-title flex items-center gap-2">
            <MonitorPlay className="w-7 h-7 text-teal-600" /> Quản lý Phòng thi
          </h1>
          <p className="text-gray-400 text-sm mt-1">Giao đề và theo dõi kết quả thi của học sinh</p>
        </div>
        
        <button onClick={() => setModalOpen(true)} className="btn-teal flex items-center gap-2 shadow-lg shadow-teal-500/20">
          <Plus className="w-4 h-4" /> Mở phòng thi mới
        </button>
      </div>

      {loading && rooms.length === 0 ? (
        <div className="card flex justify-center items-center py-16">
          <RefreshCw className="w-8 h-8 animate-spin text-teal-600" />
        </div>
      ) : (
        <div className={`grid grid-cols-1 md:grid-cols-2 ${hasOtherRooms ? 'xl:grid-cols-5' : 'xl:grid-cols-4'} gap-6`}>
          {[...displayGrades, ...(hasOtherRooms ? ['others'] : [])].map((col) => {
            const isOther = col === 'others'
            const gradeRooms = rooms.filter(r => isOther ? (getRoomGrade(r) === null || !displayGrades.includes(getRoomGrade(r)!)) : getRoomGrade(r) === col)
            const title = isOther ? 'Khác' : `Khối ${col}`

            return (
              <div key={col} className="flex flex-col bg-slate-50/50 rounded-2xl border border-slate-200/60 p-4 h-[550px] min-w-[240px]">
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-200">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${isOther ? 'bg-amber-400' : 'bg-teal-500'}`}></span>
                    {title}
                  </h3>
                  <span className="text-xs font-bold bg-teal-50 text-teal-700 px-2 py-0.5 rounded-md border border-teal-100">
                    {gradeRooms.length} phòng
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                  {gradeRooms.length === 0 ? (
                    <div className="h-full flex flex-col justify-center items-center text-gray-400 text-xs italic py-16">
                      Chưa có phòng thi
                    </div>
                  ) : (
                    gradeRooms.map((room) => (
                      <div 
                        key={room.id} 
                        className="bg-white border border-teal-100/60 rounded-xl p-4 shadow-sm hover:border-teal-300 hover:shadow-md transition-all duration-200 space-y-3"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-mono text-[13px] font-extrabold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-200 shadow-sm flex items-center gap-1">
                            <KeyRound className="w-3.5 h-3.5 opacity-60" /> {room.code}
                          </span>
                          
                          <select 
                            value={room.status} 
                            onChange={(e) => updateRoomStatus(room.id, e.target.value as any)}
                            className={`text-[10px] font-extrabold px-2 py-1 rounded-full outline-none border cursor-pointer transition-all ${
                              room.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' : 
                              room.status === 'closed' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            <option value="waiting">🟡 Chờ</option>
                            <option value="active">🟢 Thi</option>
                            <option value="closed">🔴 Khóa</option>
                          </select>
                        </div>
                        
                        <div>
                          <h4 className="font-bold text-gray-800 text-sm leading-snug line-clamp-2" title={room.exams?.title}>
                            {room.exams?.title || '—'}
                          </h4>
                          <p className="text-xs text-gray-500 font-medium truncate mt-1">
                            Lớp: {(room.classes as any)?.class_name || (room.classes as any)?.name || 'Tất cả'}
                          </p>
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t border-gray-50">
                          <span className="text-[10px] text-gray-400 font-bold bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                            {room.time_limit} phút
                          </span>
                          <div className="flex gap-1.5">
                            <button 
                              onClick={() => navigate(`/exam-results/${room.id}`)}
                              className="p-1.5 text-teal-600 hover:bg-teal-50 hover:text-teal-700 rounded-lg border border-transparent hover:border-teal-100 transition-all"
                              title="Xem bảng điểm & kết quả"
                            >
                              <BarChart3 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDelete(room.id, room.code)}
                              className="p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all"
                              title="Xóa phòng"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Thiết lập phòng thi mới" size="md">
        <div className="space-y-5">
          <div className="bg-teal-50 p-4 rounded-2xl border border-teal-100 mb-2">
            <p className="text-xs text-teal-700 font-bold uppercase tracking-wider mb-1">💡 Mẹo nhỏ:</p>
            <p className="text-xs text-teal-600 leading-relaxed">Chọn đề thi và lớp tương ứng. Mã phòng sẽ được hệ thống tạo ngẫu nhiên sau khi lưu.</p>
          </div>

          <div>
            <label className="label">1. Chọn đề thi từ thư viện *</label>
            <select value={form.exam_id} onChange={e => setForm({...form, exam_id: e.target.value})} className="input font-semibold text-teal-900">
              <option value="">-- Chọn đề thi --</option>
              {exams.map(ex => (
                <option key={ex.id} value={ex.id}>{ex.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">2. Giao cho lớp học nào? *</label>
            <select value={form.class_id} onChange={e => setForm({...form, class_id: e.target.value})} className="input">
              <option value="">-- Chọn lớp học --</option>
              {classes.filter(c => c.status === 'active').map(c => (
                <option key={c.id} value={c.id}>{(c as any).class_name || (c as any).name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Thời gian (Phút)</label>
              <input type="number" value={form.time_limit} onChange={e => setForm({...form, time_limit: Number(e.target.value)})} className="input text-center font-bold text-lg" />
            </div>
            <div>
              <label className="label">Trạng thái phòng</label>
              <select value={form.status} onChange={e => setForm({...form, status: e.target.value as any})} className="input font-bold">
                <option value="waiting">🟡 Chờ bắt đầu</option>
                <option value="active">🟢 Cho thi ngay</option>
              </select>
            </div>
          </div>

          {/* ✅ TÙY CHỌN NÂNG CAO ĐÃ ĐƯỢC THÊM VÀO ĐÂY */}
          <div className="col-span-1 md:col-span-2 flex flex-col gap-3 mt-4 p-4 bg-teal-50 border border-teal-100 rounded-xl">
            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                checked={form.settings.shuffle} 
                onChange={e => setForm({...form, settings: {...form.settings, shuffle: e.target.checked}})} 
                className="w-5 h-5 accent-teal-600 rounded cursor-pointer" 
              />
              <div>
                <span className="text-gray-800 text-sm font-bold block">🔀 Xáo trộn câu hỏi & đáp án</span>
                <span className="text-gray-500 text-xs">(Hệ thống tự trộn mỗi học sinh 1 mã đề - Chỉ dùng cho đề Word)</span>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                checked={form.settings.allowRetry} 
                onChange={e => setForm({...form, settings: {...form.settings, allowRetry: e.target.checked}})} 
                className="w-5 h-5 accent-teal-600 rounded cursor-pointer" 
              />
              <div>
                <span className="text-gray-800 text-sm font-bold block">🔄 Cho phép thi lại nhiều lần</span>
                <span className="text-gray-500 text-xs">(Học sinh có thể làm lại bài, điểm mới sẽ ghi đè điểm cũ)</span>
              </div>
            </label>
          </div>

          <div className="flex justify-end gap-3 mt-8 pt-5 border-t border-gray-100">
            <button onClick={() => setModalOpen(false)} className="btn-outline px-8 py-2.5">Đóng</button>
            <button onClick={handleCreate} disabled={saving} className="btn-teal px-10 py-2.5 font-bold shadow-lg shadow-teal-500/30">
              {saving ? 'Đang khởi tạo...' : 'Mở phòng thi'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
