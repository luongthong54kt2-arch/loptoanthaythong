import { useEffect, useState, useMemo } from 'react'
import { Banknote, Plus, CheckCircle, XCircle } from 'lucide-react'
import { useDataStore } from '@/store/dataStore'
import { fmtVNDShort, countDaysInMonth, parseSchedule } from '@/lib/helpers'
import Modal from '@/components/Modal'
import { format, endOfMonth } from 'date-fns'
import type { PaymentMethod } from '@/types'
import toast from 'react-hot-toast'

interface TuitionRow {
  student:      { id: string; full_name: string; student_code: string }
  planned:      number
  absentCount:  number
  attended:     number
  feePerSession:number
  totalFee:     number
  paidAmount:   number
  debt:         number
  isPaid:       boolean
}

export default function Tuition() {
  const {
    classes, students, enrollments, attendance, payments,
    loadClasses, loadStudents, loadEnrollments,
    loadAttendance, loadPayments, addPayment,
  } = useDataStore()

  const now = new Date()
  const [selClass, setSelClass] = useState('')
  const [month, setMonth]       = useState(format(now, 'yyyy-MM'))
  const [payModal, setPayModal] = useState<TuitionRow | null>(null)
  const [payForm, setPayForm]   = useState({ amount: '', method: 'cash' as PaymentMethod, note: '' })
  const [saving, setSaving]     = useState(false)

  useEffect(() => {
    void Promise.all([loadClasses(), loadStudents(), loadEnrollments(), loadPayments()])
  }, [loadClasses, loadStudents, loadEnrollments, loadPayments])

  useEffect(() => {
    if (!selClass) return
    const [y, m] = month.split('-')
    const from = `${y}-${m}-01`
    const to   = format(endOfMonth(new Date(+y, +m - 1)), 'yyyy-MM-dd')
    void loadAttendance(selClass, from, to)
  }, [selClass, month, loadAttendance])

  const tuitionData = useMemo((): TuitionRow[] => {
    if (!selClass) return []
    const cls = classes.find(c => c.id === selClass)
    if (!cls) return []

    const [y, m] = month.split('-')
    const from = `${y}-${m}-01`
    const to   = format(endOfMonth(new Date(+y, +m - 1)), 'yyyy-MM-dd')

    const weekdays = parseSchedule((cls as any).schedule)
    const planned  = countDaysInMonth(+y, +m, weekdays)

    return enrollments
      .filter(e => e.class_id === selClass && e.status === 'active')
      .flatMap(e => {
        const student = students.find(s => s.id === e.student_id)
        if (!student) return []

        const attRecords = attendance.filter(a =>
          a.class_id === selClass && a.student_id === e.student_id &&
          a.date >= from && a.date <= to
        )
        const absentCount = attRecords.filter(a => !a.present).length
        const attended    = Math.max(0, planned - absentCount)
        const feePerSession = (cls as any).fee_per_session ?? 0
        const totalFee    = attended * feePerSession

        const paidAmount = payments
          .filter(p =>
            p.class_id === selClass && p.student_id === e.student_id &&
            p.paid_at >= from && p.paid_at <= to
          )
          .reduce((s, p) => s + (p.amount ?? 0), 0)

        const debt = Math.max(0, totalFee - paidAmount)

        return [{
          student: { id: student.id, full_name: student.full_name, student_code: student.student_code },
          planned, absentCount, attended, feePerSession,
          totalFee, paidAmount, debt, isPaid: debt <= 0,
        }]
      })
  }, [selClass, month, classes, enrollments, students, attendance, payments])

  const openPay = (row: TuitionRow) => {
    setPayModal(row)
    setPayForm({ amount: String(row.debt || row.totalFee), method: 'cash', note: '' })
  }

  const savePay = async () => {
    const amt = parseFloat(payForm.amount)
    if (!payForm.amount || isNaN(amt)) { toast.error('Nhập số tiền hợp lệ'); return }
    if (!payModal) return
    setSaving(true)
    try {
      await addPayment({
        student_id: payModal.student.id,
        class_id:   selClass,
        amount:     amt,
        method:     payForm.method,
        note:       payForm.note || null,
      })
      await loadPayments(selClass)
      toast.success(`✅ Đã ghi nhận ${fmtVNDShort(amt)} từ ${payModal.student.full_name}`)
      setPayModal(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Lỗi khi lưu')
    } finally {
      setSaving(false)
    }
  }

  const [yDisp, mDisp] = month.split('-')
  const totalFee  = tuitionData.reduce((s, d) => s + d.totalFee, 0)
  const totalPaid = tuitionData.reduce((s, d) => s + d.paidAmount, 0)
  const totalDebt = tuitionData.reduce((s, d) => s + d.debt, 0)
  const debtors   = tuitionData.filter(d => !d.isPaid).length

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="section-title flex items-center gap-2">
          <Banknote className="w-7 h-7 text-teal-600" /> Học phí
        </h1>
      </div>

      <div className="card p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-48">
            <label className="label">Lớp học</label>
            <select value={selClass} onChange={e => setSelClass(e.target.value)} className="input">
              <option value="">— Chọn lớp —</option>
              {classes.filter(c => c.status === 'active').map(c => (
                <option key={c.id} value={c.id}>{(c as any).class_name || (c as any).name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Tháng</label>
            <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="input" />
          </div>
        </div>
      </div>

      {selClass && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Tổng học phí', value: fmtVNDShort(totalFee),  color: 'bg-teal-50 text-teal-700' },
              { label: 'Đã thu',       value: fmtVNDShort(totalPaid), color: 'bg-green-50 text-green-700' },
              { label: 'Còn nợ',       value: fmtVNDShort(totalDebt), color: 'bg-red-50 text-red-700' },
              { label: 'Chưa đóng',   value: `${debtors} học sinh`,  color: 'bg-amber-50 text-amber-700' },
            ].map(s => (
              <div key={s.label} className={`card p-4 ${s.color}`}>
                <p className="text-xs font-bold opacity-70 mb-1">{s.label}</p>
                <p className="text-xl font-extrabold">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-teal-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-800">Học phí tháng {mDisp}/{yDisp}</h3>
              <span className="text-sm text-gray-400">{tuitionData.length} học sinh</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-teal-50">
                    {['Học sinh','Buổi dự kiến','Vắng','Đã học','Phí/buổi','Tổng phí','Đã đóng','Còn nợ','Trạng thái',''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-teal-700 font-bold text-xs whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tuitionData.length === 0 && (
                    <tr><td colSpan={10} className="text-center py-12 text-gray-400">Không có dữ liệu</td></tr>
                  )}
                  {tuitionData.map(d => (
                    <tr key={d.student.id} className="border-b border-teal-50 hover:bg-teal-50/40 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-bold text-gray-800">{d.student.full_name}</p>
                        <p className="text-xs text-gray-400">{d.student.student_code}</p>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">{d.planned}</td>
                      <td className="px-4 py-3 text-center text-red-500 font-bold">{d.absentCount}</td>
                      <td className="px-4 py-3 text-center text-teal-600 font-bold">{d.attended}</td>
                      <td className="px-4 py-3 text-gray-600">{fmtVNDShort(d.feePerSession)}</td>
                      <td className="px-4 py-3 font-bold text-teal-700">{fmtVNDShort(d.totalFee)}</td>
                      <td className="px-4 py-3 text-green-600 font-bold">{fmtVNDShort(d.paidAmount)}</td>
                      <td className="px-4 py-3 font-extrabold text-red-600">{d.debt > 0 ? fmtVNDShort(d.debt) : '—'}</td>
                      <td className="px-4 py-3">
                        {d.isPaid
                          ? <span className="badge-paid flex items-center gap-1"><CheckCircle className="w-3 h-3" />Đã đóng</span>
                          : <span className="badge-debt flex items-center gap-1"><XCircle className="w-3 h-3" />Còn nợ</span>}
                      </td>
                      <td className="px-4 py-3">
                        {!d.isPaid && (
                          <button onClick={() => openPay(d)} className="btn-teal text-xs py-1.5 px-3 flex items-center gap-1">
                            <Plus className="w-3 h-3" /> Thu tiền
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <Modal open={!!payModal} onClose={() => setPayModal(null)} title="Ghi nhận thanh toán" size="sm">
        {payModal && (
          <div className="space-y-4">
            <div className="bg-teal-50 rounded-xl p-4">
              <p className="font-bold text-teal-800">{payModal.student.full_name}</p>
              <p className="text-sm text-teal-600">Còn nợ: <strong>{fmtVNDShort(payModal.debt)}</strong></p>
            </div>
            <div>
              <label className="label">Số tiền (đ) *</label>
              <input
                type="number"
                value={payForm.amount}
                onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))}
                className="input"
              />
            </div>
            <div>
              <label className="label">Hình thức</label>
              <select
                value={payForm.method}
                onChange={e => setPayForm(f => ({ ...f, method: e.target.value as PaymentMethod }))}
                className="input"
              >
                <option value="cash">💵 Tiền mặt</option>
                <option value="transfer">🏦 Chuyển khoản</option>
                <option value="seapay">📱 SeaPay</option>
              </select>
            </div>
            <div>
              <label className="label">Ghi chú</label>
              <input
                value={payForm.note}
                onChange={e => setPayForm(f => ({ ...f, note: e.target.value }))}
                placeholder="Đóng học phí tháng..."
                className="input"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setPayModal(null)} className="btn-outline">Hủy</button>
              <button onClick={() => { void savePay() }} disabled={saving} className="btn-teal">
                {saving ? 'Đang lưu...' : '✅ Xác nhận'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
