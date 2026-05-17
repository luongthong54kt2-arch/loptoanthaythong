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

      <div className="card overflow-hidden border-teal-100 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'linear-gradient(135deg,#0d9488,#14b8a6)' }}>
                <th className="px-4 py-4 text-left text-white font-bold text-xs uppercase tracking-wider">Mã phòng</th>
                <th className="px-4 py-4 text-left text-white font-bold text-xs uppercase tracking-wider">Đề thi</th>
                <th className="px-4 py-4 text-left text-white font-bold text-xs uppercase tracking-wider">Lớp học</th>
                <th className="px-4 py-4 text-center text-white font-bold text-xs uppercase tracking-wider">Thời lượng</th>
                <th className="px-4 py-4 text-left text-white font-bold text-xs uppercase tracking-wider">Trạng thái</th>
                <th className="px-4 py-4 text-right text-white font-bold text-xs uppercase tracking-wider">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-teal-50">
              {loading && rooms.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12"><RefreshCw className="w-6 h-6 animate-spin text-teal-500 mx-auto" /></td></tr>
              ) : rooms.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-16 text-gray-400">Chưa có phòng thi nào. Hãy mở phòng thi đầu tiên!</td></tr>
              ) : (
                rooms.map((room, i) => (
                  <tr key={room.id} className={`hover:bg-teal-50/40 transition-colors ${i % 2 === 0 ? '' : 'bg-teal-50/10'}`}>
                    <td className="px-4 py-4">
                      <span className="flex items-center gap-1.5 font-mono text-lg font-extrabold text-teal-700 bg-teal-50 px-3 py-1 rounded-xl border border-teal-200 w-max shadow-sm">
                        <KeyRound className="w-4 h-4 opacity-50" /> {room.code}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-bold text-gray-800">{room.exams?.title || '—'}</td>
                    <td className="px-4 py-4 text-gray-600 font-medium">
                      {(room.classes as any)?.class_name || (room.classes as any)?.name || 'Tất cả'}
                    </td>
                    <td className="px-4 py-4 text-center font-bold text-gray-500">{room.time_limit} phút</td>
                    <td className="px-4 py-4">
                      <select 
                        value={room.status} 
                        onChange={(e) => updateRoomStatus(room.id, e.target.value as any)}
                        className={`text-[11px] font-extrabold px-2.5 py-1.5 rounded-full outline-none border-2 cursor-pointer transition-all ${
                          room.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' : 
                          room.status === 'closed' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        <option value="waiting">🟡 CHỜ BẮT ĐẦU</option>
                        <option value="active">🟢 ĐANG THI</option>
                        <option value="closed">🔴 ĐÃ KHÓA</option>
                      </select>
                    </td>
                    <td className="px-4 py-4 text-right flex justify-end gap-2">
                      <button 
                        onClick={() => navigate(`/exam-results/${room.id}`)}
                        className="p-2 text-teal-600 hover:bg-teal-100 rounded-xl transition-all border border-transparent hover:border-teal-200"
                        title="Xem bảng điểm & kết quả"
                      >
                        <BarChart3 className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => handleDelete(room.id, room.code)}
                        className="p-2 text-red-400 hover:bg-red-50 rounded-xl transition-all"
                        title="Xóa phòng"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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
