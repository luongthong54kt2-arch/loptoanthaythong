import { useEffect, useState, useCallback } from 'react'
import { Users, BookOpen, CalendarCheck, Banknote, TrendingUp } from 'lucide-react'
import { useDataStore } from '@/store/dataStore'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { fmtVNDShort, fmt } from '@/lib/helpers'
import type { LucideIcon } from 'lucide-react'

type Color = 'teal' | 'green' | 'amber' | 'red'

interface StatCardProps {
  icon: LucideIcon
  label: string
  value: string | number
  sub?: string
  color?: Color
}

const colorMap: Record<Color, string> = {
  teal:  'from-teal-500 to-teal-400',
  green: 'from-green-500 to-green-400',
  amber: 'from-amber-500 to-amber-400',
  red:   'from-red-500 to-red-400',
}

function StatCard({ icon: Icon, label, value, sub, color = 'teal' }: StatCardProps) {
  return (
    <div className="card p-6 flex items-center gap-4">
      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${colorMap[color]} flex items-center justify-center flex-shrink-0`}>
        <Icon className="w-7 h-7 text-white" />
      </div>
      <div>
        <p className="text-gray-500 text-sm font-semibold">{label}</p>
        <p className="text-2xl font-extrabold text-gray-800">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { profile, isAdmin } = useAuthStore()
  const { classes, students, payments, loadClasses, loadStudents, loadPayments } = useDataStore()

  const [loaded, setLoaded]       = useState(false)
  const [todayAtt, setTodayAtt]   = useState(0)
  const [recentPays, setRecentPays] = useState<any[]>([])

  // ✅ FIX 1: deps [] → chỉ chạy 1 lần khi mount, không loop
  // ✅ FIX 3: loadAttendance() cần params → fetch trực tiếp Supabase cho Dashboard
  const loadDashboard = useCallback(async () => {
    try {
      const todayStr = new Date().toISOString().slice(0, 10)

      await Promise.all([
        loadClasses(),
        loadStudents(),
        loadPayments(),
        // ✅ FIX 3: Fetch điểm danh hôm nay trực tiếp, không qua store
        supabase
          .from('attendance')
          .select('id', { count: 'exact', head: true })
          .eq('date', todayStr)
          .then(({ count }) => setTodayAtt(count ?? 0)),
        // ✅ FIX 2: Lấy 5 thanh toán gần nhất dùng đúng field `date`
        supabase
          .from('payments')
          .select('id, amount, method, date, student_id, students(full_name)')
          .order('date', { ascending: false })
          .limit(5)
          .then(({ data }) => setRecentPays(data || [])),
      ])
    } finally {
      setLoaded(true)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { void loadDashboard() }, [loadDashboard])

  const activeClasses  = classes.filter(c => c.status === 'active').length
  const activeStudents = students.filter(s => s.status === 'active').length
  const totalRevenue   = payments.reduce((s, p) => s + (p.amount ?? 0), 0)

  if (!loaded) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="section-title">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Xin chào, <strong>{profile?.name ?? profile?.email}</strong> 👋
          </p>
        </div>
        <span className="text-sm text-gray-400">{fmt(new Date(), 'EEEE, dd/MM/yyyy')}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={BookOpen}      label="Lớp đang mở"      value={activeClasses}             sub="lớp học đang hoạt động" color="teal"  />
        <StatCard icon={Users}         label="Học sinh"          value={activeStudents}            sub="đang theo học"          color="green" />
        <StatCard icon={CalendarCheck} label="Điểm danh hôm nay" value={todayAtt}                 sub="bản ghi hôm nay"        color="amber" />
        {isAdmin() && (
          <StatCard icon={Banknote}    label="Tổng thu"          value={fmtVNDShort(totalRevenue)} sub="tổng doanh thu"         color="teal"  />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {isAdmin() && (
          <div className="card p-6">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-teal-600" />
              Học phí gần đây
            </h3>
            {recentPays.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">Chưa có dữ liệu</p>
            ) : (
              <div className="space-y-3">
                {recentPays.map(p => (
                  <div key={p.id} className="flex items-center justify-between py-2 border-b border-teal-50">
                    <div>
                      <p className="font-semibold text-sm text-gray-800">
                        {p.students?.full_name ?? '—'}
                      </p>
                      {/* ✅ FIX 2: dùng p.date thay vì p.paid_at */}
                      <p className="text-xs text-gray-400">
                        {p.date ? fmt(p.date) : '—'} · {p.method === 'transfer' ? '🏦' : '💵'}
                      </p>
                    </div>
                    <span className="font-bold text-green-600 text-sm">{fmtVNDShort(p.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="card p-6">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-teal-600" />
            Lớp học đang mở
          </h3>
          {classes.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">Chưa có lớp học</p>
          ) : (
            <div className="space-y-3">
              {classes.filter(c => c.status === 'active').slice(0, 5).map(c => (
                <div key={c.id} className="flex items-center justify-between py-2 border-b border-teal-50">
                  <div>
                    <p className="font-semibold text-sm text-gray-800">
                      {(c as any).class_name || (c as any).name}
                    </p>
                    {/* ✅ FIX 4: c.description không có trong schema → dùng subject + schedule */}
                    <p className="text-xs text-gray-400">
                      {[(c as any).subject, (c as any).schedule].filter(Boolean).join(' · ') || '—'}
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">
                    Đang mở
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
