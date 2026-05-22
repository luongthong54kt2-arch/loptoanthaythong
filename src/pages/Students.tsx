import { useEffect, useState } from 'react'
import { Plus, Pencil, Users, Search, Eye, EyeOff } from 'lucide-react'
import { useDataStore } from '@/store/dataStore'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import Modal from '@/components/Modal'
import type { Student } from '@/types'
import toast from 'react-hot-toast'

type FormData = Omit<Student, 'id' | 'created_at'> & { password: string | null }

const EMPTY: FormData = {
  student_code: '', full_name: '', date_of_birth: null,
  parent_name: null, parent_phone: null, parent_email: null,
  zalo: null, school: null, grade: null, address: null,
  note: null, status: 'active',
  password: null,
}

export default function Students() {
  const { students, classes, enrollments, loadStudents, loadClasses, loadEnrollments } = useDataStore()
  const { user, isAdmin } = useAuthStore() as any

  const [modal, setModal]               = useState<'form' | null>(null)
  const [editing, setEditing]           = useState<Student | null>(null)
  const [form, setForm]                 = useState<FormData>(EMPTY)
  const [search, setSearch]             = useState('')
  const [saving, setSaving]             = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    void Promise.all([loadStudents(), loadClasses(), loadEnrollments()])
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const openAdd  = () => { setEditing(null); setForm(EMPTY); setShowPassword(false); setModal('form') }
  const openEdit = (s: Student) => {
    setEditing(s)
    setForm({ ...s, password: (s as any).password ?? null })
    setShowPassword(false)
    setModal('form')
  }

  const save = async () => {
    if (!form.full_name)    { toast.error('Nhập tên học sinh'); return }
    if (!form.student_code) { toast.error('Nhập mã học sinh'); return }
    if (!form.password || !form.password.trim()) {
      toast.error('Vui lòng đặt mật khẩu cho học sinh'); return
    }

    setSaving(true)
    try {
      const payload: any = {
        student_code: form.student_code,
        full_name:    form.full_name,
        parent_name:  form.parent_name,
        parent_phone: form.parent_phone,
        zalo:         form.zalo,
        email:        form.parent_email,
        school:       form.school,
        grade:        form.grade,
        address:      form.address,
        note:         form.note,
        status:       form.status,
        password:     form.password?.trim() || null,
      }

      if (editing) {
        // ✅ Gọi trực tiếp Supabase để tránh treo (giống UserMgmt & Classes)
        const { error } = await supabase
          .from('students')
          .update(payload)
          .eq('id', editing.id)
        if (error) throw error
        toast.success('Đã cập nhật học sinh')
      } else {
        // ✅ Gọi trực tiếp Supabase để tránh treo
        const { error } = await supabase
          .from('students')
          .insert(payload)
        if (error) throw error
        toast.success(
          isAdmin()
            ? 'Đã thêm học sinh mới'
            : 'Đã thêm! Hãy qua phần Lớp học để xếp lớp cho học sinh nhé.',
          { duration: 4000 }
        )
      }

      setModal(null)
      // Reload ngầm, KHÔNG await để tránh treo
      loadStudents()
    } catch (e: any) {
      toast.error(e.message || 'Lỗi không xác định')
    } finally {
      setSaving(false)
    }
  }

  const inp = (field: keyof FormData) => ({
    value:    (form[field] as string) ?? '',
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value || null })),
    className: 'input',
  })

  const myClassIds   = isAdmin() ? [] : classes.filter((c: any) => c.teacher_id === user?.id).map((c: any) => c.id)
  const myStudentIds = isAdmin() ? [] : enrollments.filter((e: any) => myClassIds.includes(e.class_id) && e.status === 'active').map((e: any) => e.student_id)
  const myStudents   = isAdmin() ? students : students.filter(s => myStudentIds.includes(s.id))

  const filtered = myStudents.filter(s =>
    s.full_name.toLowerCase().includes(search.toLowerCase()) ||
    s.student_code.toLowerCase().includes(search.toLowerCase()) ||
    (s.parent_phone ?? '').includes(search) ||
    (s.school ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const getClassNames = (studentId: string) =>
    enrollments
      .filter(e => e.student_id === studentId && e.status === 'active')
      .map(e => classes.find(c => c.id === e.class_id)?.name || (classes.find(c => c.id === e.class_id) as any)?.class_name)
      .filter((n): n is string => !!n)
      .join(', ')

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="section-title flex items-center gap-2">
            <Users className="w-7 h-7 text-teal-600" /> Học sinh {isAdmin() ? '(Toàn trường)' : 'của tôi'}
          </h1>
          <p className="text-gray-400 text-sm">
            {myStudents.length} học sinh · {myStudents.filter(s => s.status === 'active').length} đang học
          </p>
        </div>
        <button onClick={openAdd} className="btn-teal flex items-center gap-2">
          <Plus className="w-4 h-4" /> Thêm học sinh
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3.5 top-3 w-4 h-4 text-teal-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Tìm tên, mã, SĐT, trường..." className="input pl-10" />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'linear-gradient(135deg,#0d9488,#14b8a6)' }}>
                {['Mã HS','Họ tên','Phụ huynh','SĐT','Zalo','Email PH','Trường','Lớp đang học','Mật khẩu','Trạng thái',''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-white font-bold text-xs whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={11} className="text-center py-12 text-gray-400">Chưa có học sinh nào</td></tr>
              )}
              {filtered.map((s, i) => (
                <tr key={s.id} className={`border-b border-teal-50 hover:bg-teal-50/50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-teal-50/20'}`}>
                  <td className="px-4 py-3 font-bold text-teal-700 font-mono text-xs">{s.student_code}</td>
                  <td className="px-4 py-3 font-bold text-gray-800 whitespace-nowrap">{s.full_name}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{s.parent_name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{s.parent_phone ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{s.zalo ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{(s as any).email ?? (s as any).parent_email ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{s.school ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-teal-700 font-semibold">{getClassNames(s.id) || '—'}</td>
                  <td className="px-4 py-3">
                    {(s as any).password ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">✓ Đã đặt</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-red-500 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">✗ Chưa có</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={s.status === 'active' ? 'badge-active' : 'badge-inactive'}>
                      {s.status === 'active' ? 'Đang học' : 'Nghỉ'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => openEdit(s)} className="p-1.5 text-teal-600 hover:bg-teal-100 rounded-lg transition-all">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modal === 'form'} onClose={() => setModal(null)}
        title={editing ? `Sửa: ${editing.full_name}` : 'Thêm học sinh mới'} size="2xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">

          <div>
            <label className="label">Mã học sinh *</label>
            <input {...inp('student_code')} placeholder="VD: HS001" />
          </div>
          <div className="md:col-span-2">
            <label className="label">Họ và tên *</label>
            <input {...inp('full_name')} placeholder="Nguyễn Văn A" />
          </div>
          <div>
            <label className="label">Trạng thái</label>
            <select
              value={form.status ?? 'active'}
              onChange={e => setForm(f => ({ ...f, status: e.target.value as 'active' | 'inactive' }))}
              className="input"
            >
              <option value="active">Đang học</option>
              <option value="inactive">Nghỉ học</option>
            </select>
          </div>

          <div className="md:col-span-4">
            <label className="label">
              Mật khẩu đăng nhập *{' '}
              <span className="text-gray-400 font-normal text-xs">(Học sinh dùng để vào Cổng học sinh & phòng thi)</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password ?? ''}
                onChange={e => setForm(f => ({ ...f, password: e.target.value || null }))}
                placeholder="Nhập mật khẩu cho học sinh..."
                className="input pr-12"
              />
              <button type="button" onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-teal-600 transition-colors"
                tabIndex={-1}>
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="label">Trường học</label>
            <input {...inp('school')} placeholder="VD: THPT Nguyễn Huệ" />
          </div>
          <div className="md:col-span-2">
            <label className="label">Khối lớp</label>
            <input {...inp('grade')} placeholder="VD: Lớp 10" />
          </div>

          <div className="md:col-span-2">
            <label className="label">Tên phụ huynh</label>
            <input {...inp('parent_name')} placeholder="Nguyễn Văn B" />
          </div>
          <div>
            <label className="label">SĐT phụ huynh</label>
            <input {...inp('parent_phone')} type="tel" placeholder="09xx..." />
          </div>
          <div>
            <label className="label">Zalo</label>
            <input {...inp('zalo')} placeholder="SĐT Zalo..." />
          </div>

          <div className="md:col-span-2">
            <label className="label">Email liên hệ</label>
            <input {...inp('parent_email')} type="email" placeholder="example@gmail.com" />
          </div>
          <div className="md:col-span-2">
            <label className="label">Địa chỉ</label>
            <input {...inp('address')} placeholder="Địa chỉ nhà..." />
          </div>

          <div className="md:col-span-4">
            <label className="label">Ghi chú thêm</label>
            <input {...inp('note')} placeholder="Ghi chú về học lực, tính cách..." className="input" />
          </div>
        </div>

        <div className="flex gap-3 mt-5 justify-end border-t border-gray-100 pt-4">
          <button onClick={() => setModal(null)} className="btn-outline px-6">Hủy</button>
          <button onClick={() => { void save() }} disabled={saving} className="btn-teal px-8">
            {saving ? 'Đang lưu...' : editing ? 'Cập nhật' : 'Thêm học sinh'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
