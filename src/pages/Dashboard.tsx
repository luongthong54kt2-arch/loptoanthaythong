import { useEffect, useState, useCallback } from 'react'
import { Users, BookOpen, CalendarCheck, Banknote, ChevronLeft, ChevronRight, Clock, MapPin } from 'lucide-react'
import { useDataStore } from '@/store/dataStore'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { fmtVNDShort, fmt, parseScheduleToDays } from '@/lib/helpers'
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

function parseTimeToMinutes(timeStr: string | null | undefined): number {
  if (!timeStr) return 9999
  const cleanStr = timeStr.trim().toLowerCase()
  const firstPart = cleanStr.split(/[-–đ]/)[0].trim()
  const match = firstPart.match(/(\d{1,2})\s*[h:]\s*(\d{2})?/)
  if (match) {
    const hours = parseInt(match[1], 10)
    const minutes = match[2] ? parseInt(match[2], 10) : 0
    return hours * 60 + minutes
  }
  const hourOnlyMatch = firstPart.match(/^(\d{1,2})$/)
  if (hourOnlyMatch) {
    return parseInt(hourOnlyMatch[1], 10) * 60
  }
  return 9999
}

export default function Dashboard() {
  const { profile, isAdmin } = useAuthStore()
  const { classes, students, payments, loadClasses, loadStudents, loadPayments } = useDataStore()

  const [loaded, setLoaded]       = useState(false)
  const [todayAtt, setTodayAtt]   = useState(0)

  const [viewDate, setViewDate] = useState(new Date())

  // Get Monday of the week containing viewDate, and return all 7 days
  const getWeekDays = (baseDate: Date) => {
    const currentDay = baseDate.getDay() // 0 = Sun, 1 = Mon, ..., 6 = Sat
    const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay
    const monday = new Date(baseDate)
    monday.setDate(baseDate.getDate() + diffToMonday)

    const days = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      days.push(d)
    }
    return days
  }

  const weekDays = getWeekDays(viewDate)

  const isToday = (date: Date) => {
    const today = new Date()
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
  }

  const formatWeekRange = (days: Date[]) => {
    if (days.length === 0) return ''
    const start = days[0]
    const end = days[days.length - 1]
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${pad(start.getDate())}/${pad(start.getMonth() + 1)} - ${pad(end.getDate())}/${pad(end.getMonth() + 1)}/${end.getFullYear()}`
  }

  const getClassesForDay = (dayNum: number) => {
    return classes
      .filter(c => c.status === 'active')
      .flatMap(c => {
        const scheduleDays = parseScheduleToDays(c.schedule)
        const matched = scheduleDays.filter(s => s.day === dayNum)
        return matched.map(m => ({
          ...c,
          time: m.time
        }))
      })
      .sort((a, b) => {
        return parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time)
      })
  }

  const prevWeek = () => {
    setViewDate(prev => {
      const d = new Date(prev)
      d.setDate(prev.getDate() - 7)
      return d
    })
  }

  const nextWeek = () => {
    setViewDate(prev => {
      const d = new Date(prev)
      d.setDate(prev.getDate() + 7)
      return d
    })
  }

  const goToday = () => {
    setViewDate(new Date())
  }

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

      <div className="card p-6 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-teal-600" />
            Lịch học tuần này
          </h3>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={prevWeek} 
              className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition"
              title="Tuần trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={goToday} 
              className="text-xs font-semibold px-2 py-1 rounded bg-teal-50 text-teal-600 hover:bg-teal-100 transition"
            >
              Hôm nay
            </button>
            <button 
              onClick={nextWeek} 
              className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition"
              title="Tuần sau"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold text-gray-500 bg-gray-50 px-2 py-1 rounded border border-gray-100">
              {formatWeekRange(weekDays)}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto -mx-2 px-2 scrollbar-thin">
          <div className="grid grid-cols-7 gap-2 min-w-[750px] py-1">
            {weekDays.map((dayDate) => {
              const dayNum = dayDate.getDay()
              const isDayToday = isToday(dayDate)
              const dayClasses = getClassesForDay(dayNum)
              const dayNames = ['CN', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7']

              return (
                <div 
                  key={dayDate.toISOString()} 
                  className={`flex flex-col gap-2 p-1.5 rounded-xl transition-all duration-300 ${
                    isDayToday 
                      ? 'bg-teal-50/50 border border-teal-200 shadow-sm' 
                      : 'border border-transparent'
                  }`}
                >
                  {/* Day Header */}
                  <div className={`flex flex-col items-center py-2 rounded-lg border ${
                    isDayToday 
                      ? 'bg-teal-100/50 border-teal-200' 
                      : 'bg-gray-50/60 border-gray-100'
                  }`}>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${
                      isDayToday ? 'text-teal-700' : 'text-gray-400'
                    }`}>
                      {dayNames[dayNum]}
                    </span>
                    <span className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-extrabold mt-1 transition-all duration-300 ${
                      isDayToday 
                        ? 'bg-teal-600 text-white shadow-sm' 
                        : 'text-gray-700'
                    }`}>
                      {String(dayDate.getDate()).padStart(2, '0')}
                    </span>
                    {isDayToday && (
                      <span className="text-[8px] font-bold text-teal-600 mt-1 bg-white px-1.5 py-0.5 rounded-full uppercase tracking-tight shadow-sm border border-teal-100">
                        Hôm nay
                      </span>
                    )}
                  </div>

                  {/* Classes list */}
                  <div className="flex flex-col gap-2 flex-1 min-h-[160px]">
                    {dayClasses.length === 0 ? (
                      <div className="flex-1 flex items-center justify-center py-6 border border-dashed border-gray-200 rounded-lg bg-gray-50/20">
                        <span className="text-[9px] text-gray-400 font-medium italic">Không có lớp</span>
                      </div>
                    ) : (
                      dayClasses.map(cls => (
                        <div 
                          key={`${cls.id}-${cls.time}`} 
                          className="bg-white p-2 rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-teal-300 transition-all duration-200 flex flex-col gap-1"
                        >
                          <div className="font-extrabold text-gray-800 text-[10px] leading-tight line-clamp-2">
                            {(cls as any).class_name || (cls as any).name}
                          </div>
                          
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            <span className="inline-block px-1 py-0.2 text-[8px] font-bold rounded bg-teal-50 text-teal-600 border border-teal-100">
                              {(cls as any).subject || 'Toán'}
                            </span>
                            {(cls as any).room && (
                              <div className="flex items-center gap-0.5 text-[8px] text-gray-500 bg-gray-50 border border-gray-200 px-1 py-0.2 rounded">
                                <MapPin className="w-2 h-2 text-gray-400" />
                                <span className="truncate max-w-[45px]">{(cls as any).room}</span>
                              </div>
                            )}
                          </div>
                          
                          {cls.time && (
                            <div className="flex items-center gap-1 text-[9px] font-medium text-teal-700 mt-1">
                              <Clock className="w-2.5 h-2.5 flex-shrink-0" />
                              <span>{cls.time}</span>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
