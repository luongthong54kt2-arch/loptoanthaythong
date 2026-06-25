// @ts-nocheck
import { useEffect, useState } from 'react'
import { Plus, Pencil, Users, BookOpen, User, Trash2 } from 'lucide-react'
import { useDataStore } from '@/store/dataStore'
import { useAuthStore } from '@/store/authStore'
import Modal from '@/components/Modal'
import { fmtVNDShort } from '@/lib/helpers'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase' // ✅ Thêm supabase để gọi lệnh xóa trực tiếp

const EMPTY = {
  class_name: '', subject: 'Toán', grade: '', teacher_id: '', fee_per_session: '',
  planned_sessions: '', start_date: '', max_students: 30,
  room: '', school: '', schedule: '', note: '', status: 'active'
}

export default function Classes() {
  const { classes, students, enrollments, profiles, loadClasses, loadStudents, loadEnrollments, loadProfiles,
    addClass, updateClass, enroll, unenroll } = useDataStore()
  
  // ✅ Lấy thêm user từ AuthStore để biết ai đang đăng nhập
  const { user, isAdmin } = useAuthStore() as any
  
  const [modal, setModal]       = useState<'form' | 'roster' | null>(null)
  const [editing, setEditing]   = useState<any>(null)
  const [form, setForm]         = useState(EMPTY)
  const [selClass, setSelClass] = useState<any>(null)
  const [saving, setSaving]     = useState(false)
  const [search, setSearch]     = useState('')
  const [leftSearch, setLeftSearch]   = useState('')
  const [rightSearch, setRightSearch] = useState('')

  useEffect(() => {
    loadClasses(); loadStudents(); loadEnrollments(); loadProfiles();
  }, [])

  // ✅ Nếu là Giáo viên tạo lớp, tự động gán teacher_id là ID của giáo viên đó
  const openAdd  = () => { 
    setEditing(null); 
    setForm({ ...EMPTY, teacher_id: isAdmin() ? '' : user?.id }); 
    setModal('form');
  }
  const openEdit = (c: any) => { setEditing(c); setForm({ ...c }); setModal('form') }
  const openRoster = (c: any) => { 
    setSelClass(c)
    setLeftSearch('')
    setRightSearch('')
    setModal('roster')
  }

  const save = async () => {
    if (!form.class_name) return toast.error('Nhập tên lớp')
    if (!form.grade) return toast.error('Vui lòng chọn Khối lớp')
    setSaving(true)
    try {
      const payload: any = {
        ...form,
        fee_per_session: Number(form.fee_per_session) || 0,
        planned_sessions: Number(form.planned_sessions) || 0,
        max_students: Number(form.max_students) || 30,
        start_date: form.start_date || null,
        teacher_id: form.teacher_id || null
      }

      if (editing) await updateClass(editing.id, payload)
      else await addClass(payload)

      toast.success(editing ? 'Đã cập nhật lớp' : 'Đã thêm lớp mới')
      setModal(null)
    } catch (e: any) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  // ✅ HÀM XÓA LỚP HỌC TRỰC TIẾP
  const handleDeleteClass = async (id: string, className: string) => {
    const confirmMsg = `Thầy/Cô có chắc chắn muốn xóa lớp "${className}"?\n\nHệ thống sẽ tự động dọn dẹp TOÀN BỘ danh sách học sinh, điểm danh và dữ liệu học phí thuộc lớp này. Hành động không thể hoàn tác!`
    if (!window.confirm(confirmMsg)) return;

    const toastId = toast.loading('Đang xóa lớp học...');
    try {
      const { error } = await supabase.from('classes').delete().eq('id', id);
      if (error) throw error;
      
      toast.success('Đã xóa lớp học thành công!', { id: toastId });
      loadClasses(); // Tải lại danh sách lớp ngầm
    } catch (e: any) {
      toast.error(e.message || 'Lỗi khi xóa lớp học!', { id: toastId });
    }
  }

  // ✅ LỌC LỚP HỌC: Admin thấy hết, Giáo viên chỉ thấy lớp do mình phụ trách
  const myClasses = isAdmin() ? classes : classes.filter((c: any) => c.teacher_id === user?.id)

  const filtered = myClasses.filter(c =>
    (c as any).class_name?.toLowerCase().includes(search.toLowerCase()) ||
    ((c as any).subject || '').toLowerCase().includes(search.toLowerCase())
  )

  const rosterStudents: any[] = selClass
    ? enrollments
        .filter(e => e.class_id === selClass.id && e.status === 'active')
        .map(e => students.find(s => s.id === e.student_id))
        .filter(Boolean)
    : []

  const filteredRoster = rosterStudents.filter(s =>
    s.full_name?.toLowerCase().includes(leftSearch.toLowerCase()) ||
    s.student_code?.toLowerCase().includes(leftSearch.toLowerCase())
  )

  const filteredAllStudents = students
    .filter(s => s.status === 'active')
    .filter(s => !enrollments.some(e => e.class_id === selClass?.id && e.student_id === s.id && e.status === 'active'))
    .filter(s =>
      s.full_name?.toLowerCase().includes(rightSearch.toLowerCase()) ||
      s.student_code?.toLowerCase().includes(rightSearch.toLowerCase())
    )

  const inp = (field: keyof typeof EMPTY, extra = {}) => ({
    value: form[field] || '',
    onChange: (e: any) => setForm(f => ({ ...f, [field]: e.target.value })),
    className: 'input',
    ...extra,
  })

  const teachers = profiles.filter(p => p.role === 'TEACHER' || p.role === 'ADMIN')

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="section-title flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-teal-600" /> Lớp học {isAdmin() ? '(Tất cả)' : 'của tôi'}
          </h1>
          <p className="text-gray-400 text-sm">{myClasses.length} lớp · {myClasses.filter((c:any)=>c.status==='active').length} đang mở</p>
        </div>
        
        {/* ✅ Bỏ chặn isAdmin, cho phép GV tạo lớp */}
        <button onClick={openAdd} className="btn-teal flex items-center gap-2">
          <Plus className="w-4 h-4" /> Thêm lớp
        </button>
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="🔍 Tìm lớp học, môn học..." className="input max-w-sm" />

      <div className="card overflow-hidden shadow-xl border-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'linear-gradient(135deg,#0d9488,#14b8a6)' }}>
                {['Tên lớp','Môn','Giáo viên','Khối','Học phí','Lịch','Phòng','Sĩ số','Trạng thái','Thao tác'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-white font-bold text-xs whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="text-center py-12 text-gray-400">Chưa có lớp học nào</td></tr>
              )}
              {filtered.map((c: any, i) => {
                const count = enrollments.filter(e => e.class_id === c.id && e.status === 'active').length
                const teacher = profiles.find(p => p.id === c.teacher_id)
                
                return (
                  <tr key={c.id} className={`border-b border-teal-50 hover:bg-teal-50/50 transition-colors ${i%2===0?'bg-white':'bg-teal-50/20'}`}>
                    <td className="px-4 py-3 font-bold text-gray-800">{c.class_name}</td>
                    <td className="px-4 py-3 text-gray-600">{c.subject}</td>
                    <td className="px-4 py-3">
                      {teacher ? (
                        <div className="flex items-center gap-1.5 text-teal-700 font-semibold whitespace-nowrap">
                          <User className="w-3.5 h-3.5" /> {teacher.name || teacher.email}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic text-xs">Chưa có GV</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{c.grade}</td>
                    <td className="px-4 py-3 font-bold text-teal-700">{fmtVNDShort(c.fee_per_session)}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{c.schedule || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{c.room || '—'}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => openRoster(c)} className="flex items-center gap-1 text-teal-600 hover:text-teal-800 font-bold bg-teal-50 px-2 py-1 rounded-md border border-teal-100 transition-colors">
                        <Users className="w-3.5 h-3.5" /> {count}/{c.max_students||'∞'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span className={c.status==='active'?'badge-active':'badge-inactive'}>
                        {c.status==='active'?'Đang mở':'Đóng'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => openEdit(c)} className="p-1.5 text-teal-600 hover:bg-teal-100 rounded-lg transition-all" title="Sửa thông tin lớp">
                          <Pencil className="w-4 h-4" />
                        </button>
                        {/* ✅ NÚT XÓA LỚP */}
                        <button onClick={() => handleDeleteClass(c.id, c.class_name)} className="p-1.5 text-red-500 hover:bg-red-100 hover:text-red-700 rounded-lg transition-all" title="Xóa lớp học này">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modal==='form'} onClose={() => setModal(null)}
        title={editing ? `Sửa lớp: ${editing.class_name}` : 'Thêm lớp mới'} size="2xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-3">
            <label className="label">Tên lớp học *</label>
            <input {...inp('class_name')} placeholder="VD: Toán 10A" />
          </div>
          <div>
            <label className="label">Trạng thái</label>
            <select {...inp('status')} className="input">
              <option value="active">Đang mở</option>
              <option value="inactive">Đóng lớp</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="label font-bold text-teal-700">Giáo viên phụ trách</label>
            {/* ✅ Nếu là GV, khóa cứng dropdown tên GV để họ không tự gán lớp cho người khác */}
            <select {...inp('teacher_id')} className="input border-teal-200" disabled={!isAdmin()}>
              {isAdmin() ? (
                <>
                  <option value="">— Chưa phân công —</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.name || t.email} ({t.role})</option>
                  ))}
                </>
              ) : (
                <option value={user?.id}>{user?.user_metadata?.full_name || user?.email || 'Bản thân tôi'}</option>
              )}
            </select>
          </div>
          <div>
            <label className="label">Môn học</label>
            <select {...inp('subject')} className="input">
              {['Toán','Lý','Hóa','Anh','Văn','Sinh','Sử','Địa','Tin'].map(s=>(
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Khối lớp *</label>
            <select {...inp('grade')} className="input" required>
              <option value="">-- Chọn khối lớp --</option>
              <option value="6">Khối 6</option>
              <option value="7">Khối 7</option>
              <option value="8">Khối 8</option>
              <option value="9">Khối 9</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="label">Trường</label>
            <input {...inp('school')} placeholder="THPT..." />
          </div>
          <div>
            <label className="label">Học phí/buổi</label>
            <input {...inp('fee_per_session')} type="number" placeholder="150000" />
          </div>
          <div>
            <label className="label">Số buổi/tháng</label>
            <input {...inp('planned_sessions')} type="number" placeholder="8" />
          </div>

          <div className="md:col-span-2">
            <label className="label">Ngày bắt đầu</label>
            <input {...inp('start_date')} type="date" />
          </div>
          <div>
            <label className="label">Sĩ số tối đa</label>
            <input {...inp('max_students')} type="number" />
          </div>
          <div>
            <label className="label">Phòng học</label>
            <input {...inp('room')} placeholder="P.101..." />
          </div>

          <div className="md:col-span-4">
            <label className="label">Lịch học chi tiết</label>
            <input {...inp('schedule')} placeholder="VD: Thứ 2 (18h-20h), Thứ 5 (17h-19h)" />
          </div>

          <div className="md:col-span-4">
            <label className="label">Ghi chú thêm</label>
            <input {...inp('note')} placeholder="Ghi chú về tài liệu, yêu cầu..." className="input" />
          </div>
        </div>

        <div className="flex gap-3 mt-5 justify-end border-t border-gray-100 pt-4 sticky bottom-0 bg-white pb-2">
          <button onClick={() => setModal(null)} className="btn-outline px-6">Hủy</button>
          <button onClick={save} disabled={saving} className="btn-teal px-8 shadow-md">
            {saving ? 'Đang lưu...' : editing ? 'Cập nhật' : 'Thêm lớp học'}
          </button>
        </div>
      </Modal>

      <Modal open={modal==='roster'} onClose={() => setModal(null)}
        title={`Danh sách học sinh – ${selClass?.class_name}`} size="3xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:h-[60vh] lg:min-h-[400px] lg:max-h-[600px]">
          {/* CỘT TRÁI: DANH SÁCH ĐÃ ĐĂNG KÝ HỌC */}
          <div className="flex flex-col h-[350px] lg:h-full border border-teal-100 rounded-2xl bg-white p-4 shadow-sm">
            <div className="shrink-0 pb-3 border-b border-teal-50">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-bold text-teal-700 flex items-center gap-1.5">
                  <Users className="w-5 h-5 text-teal-600" /> Đang học ({rosterStudents.length})
                </h4>
              </div>
              <input
                type="text"
                placeholder="Tìm trong lớp..."
                value={leftSearch}
                onChange={e => setLeftSearch(e.target.value)}
                className="input py-1 text-sm bg-teal-50/30 border-teal-100 focus:border-teal-400 focus:bg-white"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 mt-3 pr-1 custom-scrollbar">
              {filteredRoster.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-12">Không tìm thấy học sinh nào</p>
              ) : (
                filteredRoster.map(s => {
                  const studentClasses = enrollments
                    .filter(e => e.student_id === s.id && e.status === 'active')
                    .map(e => classes.find(c => c.id === e.class_id))
                    .filter(Boolean)

                  return (
                    <div key={s.id} className="flex items-center justify-between bg-white border border-teal-100 rounded-xl px-4 py-2.5 shadow-sm hover:border-teal-300 transition-colors">
                      <div className="flex-1 min-w-0 pr-3">
                        <div className="flex items-baseline gap-2">
                          <p className="font-bold text-sm text-gray-800 truncate">{s.full_name}</p>
                          <span className="text-[10px] text-gray-400 font-mono shrink-0">{s.student_code}</span>
                        </div>
                        <p className="text-xs text-gray-400 truncate">{s.school || 'Không rõ trường'} · Khối {s.grade || '—'}</p>
                        
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {studentClasses.map(c => (
                            <span key={c.id} className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${c.id === selClass?.id ? 'bg-teal-50 text-teal-700 border-teal-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                              {c.class_name}
                            </span>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={async () => {
                          await unenroll(s.id, selClass.id)
                          toast.success('Đã bỏ ghi danh')
                        }}
                        className="text-xs text-red-500 hover:bg-red-50 hover:text-red-700 px-3 py-1.5 rounded-lg border border-red-100 transition-colors font-bold shrink-0"
                      >
                        Bỏ đăng ký
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* CỘT PHẢI: HỌC SINH TOÀN TRƯỜNG */}
          <div className="flex flex-col h-[350px] lg:h-full border border-gray-200 rounded-2xl bg-white p-4 shadow-sm">
            <div className="shrink-0 pb-3 border-b border-gray-100">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-bold text-gray-700 flex items-center gap-1.5">
                  <BookOpen className="w-5 h-5 text-gray-500" /> Học sinh toàn trường ({students.length})
                </h4>
              </div>
              <input
                type="text"
                placeholder="Tìm theo tên, mã học sinh..."
                value={rightSearch}
                onChange={e => setRightSearch(e.target.value)}
                className="input py-1 text-sm bg-gray-50/50 border-gray-200 focus:border-teal-400 focus:bg-white"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 mt-3 pr-1 custom-scrollbar">
              {filteredAllStudents.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-12">Không tìm thấy học sinh nào</p>
              ) : (
                filteredAllStudents.map(s => {
                  const studentClasses = enrollments
                    .filter(e => e.student_id === s.id && e.status === 'active')
                    .map(e => classes.find(c => c.id === e.class_id))
                    .filter(Boolean)

                  return (
                    <div key={s.id} className="flex items-center justify-between bg-white border border-gray-200 hover:border-teal-300 rounded-xl px-4 py-2.5 shadow-sm transition-colors">
                      <div className="flex-1 min-w-0 pr-3">
                        <div className="flex items-baseline gap-2">
                          <p className="font-bold text-sm text-gray-800 truncate">{s.full_name}</p>
                          <span className="text-[10px] text-gray-400 font-mono shrink-0">{s.student_code}</span>
                        </div>
                        <p className="text-xs text-gray-400 truncate">{s.school || 'Không rõ trường'} · Khối {s.grade || '—'}</p>
                        
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {studentClasses.length === 0 ? (
                            <span className="text-[10px] text-gray-400 italic">Chưa học lớp nào</span>
                          ) : (
                            studentClasses.map(c => (
                              <span key={c.id} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border bg-gray-100 text-gray-600 border-gray-200">
                                {c.class_name}
                              </span>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="shrink-0">
                        <button
                          onClick={async () => {
                            await enroll(s.id, selClass.id)
                            toast.success(`Đã thêm ${s.full_name} vào lớp`)
                          }}
                          className="text-xs btn-teal py-1.5 px-3 shadow-sm font-bold"
                        >
                          Thêm vào lớp
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
