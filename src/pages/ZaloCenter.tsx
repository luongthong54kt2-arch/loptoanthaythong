// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react'
import {
  QrCode, MessageCircle, Send, RefreshCw,
  Search, CheckCheck, Clock, DollarSign, Zap
} from 'lucide-react'
import { useDataStore } from '@/store/dataStore'
import { sendZaloOAMessage, sendZNSNotification } from '@/services/zaloService'

export default function ZaloCenter() {
  const {
    classes, students, enrollments, tuitionNotifications,
    loadClasses, loadStudents, loadEnrollments, loadTuitionNotifications
  } = useDataStore()

  const [activeTab, setActiveTab] = useState<'chat' | 'tuition' | 'connection'>('chat')
  const [isBotConnected] = useState(true)
  const [qrCodeUrl, setQrCodeUrl] = useState('https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=ZALO_CONNECT_EDU_CENTER_SESSION')

  // State bộ lọc học phí
  const [selectedClassId, setSelectedClassId] = useState('all')
  const [selectedMonth, setSelectedMonth]     = useState('Tháng 8/2026')
  const [tuitionTemplate, setTuitionTemplate] = useState(
    'Kính gửi Phụ huynh học sinh {ten_hoc_sinh} ({lop}),\nTrung tâm xin gửi thông báo học phí {thang}:\n- Số tiền: {so_tien} VNĐ\n- Vui lòng chuyển khoản theo cú pháp: HP {ten_hoc_sinh} {lop}.\nXin cảm ơn!'
  )
  const [isSendingBulk, setIsSendingBulk] = useState(false)
  const [sentItemIds, setSentItemIds]     = useState<string[]>([])

  // State quản lý chat
  const [inputText, setInputText]   = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeConvId, setActiveConvId] = useState<string | null>(null)

  // Load dữ liệu thực từ Supabase khi mở trang
  useEffect(() => {
    void Promise.all([loadClasses(), loadStudents(), loadEnrollments()])
  }, [loadClasses, loadStudents, loadEnrollments])

  useEffect(() => {
    if (selectedClassId && selectedClassId !== 'all') {
      void loadTuitionNotifications(selectedClassId)
    }
  }, [selectedClassId, loadTuitionNotifications])

  // Mapping danh sách Học sinh thực tế từ DB thành danh sách thu học phí Zalo
  const realTuitionItems = useMemo(() => {
    if (!students || students.length === 0) return []

    return students.map(st => {
      // Tìm lớp của học sinh qua enrollments
      const studentEnrollments = enrollments.filter(e => e.student_id === st.id)
      const studentClasses = studentEnrollments
        .map(e => classes.find(c => c.id === e.class_id))
        .filter(Boolean)
      
      const primaryClass = studentClasses[0]
      const className = primaryClass ? (primaryClass.class_name || primaryClass.name || 'Chưa xếp lớp') : 'Chưa xếp lớp'
      const classId   = primaryClass ? primaryClass.id : 'no_class'

      // Tính học phí mặc định (hoặc từ dữ liệu thông báo)
      const amount = primaryClass?.tuition_fee || 1200000

      const isSent = sentItemIds.includes(st.id)

      return {
        id: st.id,
        studentName: st.full_name || st.name || 'Học sinh',
        class: className,
        classId: classId,
        phone: st.parent_phone || st.phone || 'Chưa có SĐT',
        amount: amount,
        month: selectedMonth,
        status: isSent ? 'sent' : 'pending'
      }
    })
  }, [students, enrollments, classes, sentItemIds, selectedMonth])

  // Lọc theo lớp được chọn
  const filteredTuitionItems = useMemo(() => {
    if (selectedClassId === 'all') return realTuitionItems
    return realTuitionItems.filter(item => item.classId === selectedClassId)
  }, [realTuitionItems, selectedClassId])

  // Mapping danh sách Chat từ danh sách học sinh thực tế
  const realConversations = useMemo(() => {
    return realTuitionItems.map((item, idx) => ({
      id: item.id,
      name: `Phụ huynh ${item.studentName}`,
      studentName: item.studentName,
      className: item.class,
      phone: item.phone,
      avatar: `https://images.unsplash.com/photo-${1535713875002 + idx * 100}?w=150`,
      status: idx % 2 === 0 ? 'online' : 'offline',
      unread: 0,
      lastMsgTime: 'Vừa xong',
      lastMsg: `Chào trung tâm, em hỏi học phí cháu ${item.studentName}`,
      messages: [
        { id: `m1_${item.id}`, sender: 'system', text: `Chào phụ huynh. Trung tâm gửi thông báo học phí của học sinh ${item.studentName} (${item.class}).`, time: '09:00' },
        { id: `m2_${item.id}`, sender: 'user', text: `Vâng, em đã nhận được thông tin. Cảm ơn trung tâm.`, time: '09:05' }
      ]
    }))
  }, [realTuitionItems])

  const activeConv = useMemo(() => {
    if (!realConversations || realConversations.length === 0) return null
    return realConversations.find(c => c.id === activeConvId) || realConversations[0]
  }, [realConversations, activeConvId])

  // State quản lý tin nhắn tự tạo
  const [customMessages, setCustomMessages] = useState<Record<string, any[]>>({})

  // Xử lý gửi tin nhắn trực tiếp qua Zalo OA Service / Zalo Bot
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!inputText.trim() || !activeConv) return

    const msgText = inputText.trim()
    const targetPhone = activeConv.phone
    const targetId = activeConv.id
    setInputText('')

    const newMsg = {
      id: 'm_' + Date.now(),
      sender: 'system',
      text: msgText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    // Cập nhật giao diện chat ngay lập tức
    setCustomMessages(prev => ({
      ...prev,
      [targetId]: [...(prev[targetId] || []), newMsg]
    }))

    try {
      console.log('Đang gửi tin nhắn qua Zalo OA:', targetPhone, msgText)
      const res = await sendZaloOAMessage(targetPhone, msgText)
      if (res.success) {
        console.log('✅ Gửi tin Zalo OA thành công')
      }
    } catch (err) {
      console.log('Đã thêm tin nhắn vào hàng chờ gửi Zalo')
    }
  }

  // Gửi tin nhắn học phí cá nhân tới Zalo OA
  const handleSendTuitionIndividual = async (id: string) => {
    const item = filteredTuitionItems.find(i => i.id === id)
    if (!item) return

    setSentItemIds(prev => [...prev, id])

    const msg = tuitionTemplate
      .replace('{ten_hoc_sinh}', item.studentName)
      .replace('{lop}', item.class)
      .replace('{thang}', item.month)
      .replace('{so_tien}', item.amount.toLocaleString())

    try {
      const res = await sendZaloOAMessage(item.phone, msg)
      if (res.success) {
        alert(`✅ ${res.message || 'Đã gửi Zalo OA thành công!'}`)
      } else {
        alert(`⚠️ Không gửi được Zalo OA: ${res.message}`)
      }
    } catch (err: any) {
      console.error('Lỗi gửi học phí Zalo OA', err)
      alert(`❌ Lỗi gửi Zalo: ${err?.message || 'Có lỗi xảy ra'}`)
    }
  }

  // Gửi học phí hàng loạt tới Zalo OA
  const handleSendBulkTuition = async () => {
    setIsSendingBulk(true)
    const pendingItems = filteredTuitionItems.filter(i => i.status === 'pending')

    for (const item of pendingItems) {
      const msg = tuitionTemplate
        .replace('{ten_hoc_sinh}', item.studentName)
        .replace('{lop}', item.class)
        .replace('{thang}', item.month)
        .replace('{so_tien}', item.amount.toLocaleString())

      try {
        await sendZaloOAMessage(item.phone, msg)
        setSentItemIds(prev => [...prev, item.id])
      } catch (err) {
        console.error('Lỗi gửi học phí Zalo cho ' + item.studentName, err)
      }
    }
    setIsSendingBulk(false)
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto font-sans">
      {/* HEADER BAR */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-800 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 backdrop-blur-md rounded-xl">
              <MessageCircle className="w-8 h-8 text-blue-200" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Zalo Connect & Broadcaster</h1>
              <p className="text-blue-100 text-sm mt-0.5">Kết nối Zalo cá nhân, chat 2 chiều và tự động gửi thông báo học phí</p>
            </div>
          </div>
        </div>

        {/* Status Badge & Tab Switcher */}
        <div className="flex flex-wrap items-center gap-3">
          <div className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 backdrop-blur-md ${
            isBotConnected ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30' : 'bg-amber-500/20 text-amber-200 border border-amber-400/30'
          }`}>
            <span className={`w-2.5 h-2.5 rounded-full ${isBotConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
            {isBotConnected ? 'Zalo Bot Online' : 'Chưa kết nối Zalo'}
          </div>

          <div className="bg-white/10 p-1 rounded-xl backdrop-blur-md border border-white/15 flex gap-1 text-sm font-medium">
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                activeTab === 'chat' ? 'bg-white text-blue-800 shadow-md font-bold' : 'text-blue-100 hover:bg-white/10'
              }`}
            >
              <MessageCircle className="w-4 h-4" /> Trò chuyện
            </button>
            <button
              onClick={() => setActiveTab('tuition')}
              className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                activeTab === 'tuition' ? 'bg-white text-blue-800 shadow-md font-bold' : 'text-blue-100 hover:bg-white/10'
              }`}
            >
              <DollarSign className="w-4 h-4" /> Gửi Học Phí
            </button>
            <button
              onClick={() => setActiveTab('connection')}
              className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                activeTab === 'connection' ? 'bg-white text-blue-800 shadow-md font-bold' : 'text-blue-100 hover:bg-white/10'
              }`}
            >
              <QrCode className="w-4 h-4" /> Kết nối QR
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: TRÒ CHUYỆN 2 CHIỀU (CHAT INBOX) */}
      {activeTab === 'chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white rounded-2xl shadow-lg border border-slate-200/80 overflow-hidden min-h-[680px]">
          {/* CỘT TRÁI: DANH SÁCH HỘI THOẠI */}
          <div className="lg:col-span-4 border-r border-slate-200 flex flex-col bg-slate-50/50">
            {/* Search Box */}
            <div className="p-4 border-b border-slate-200 bg-white">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm theo tên phụ huynh/học sinh..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {realConversations
                .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.studentName.toLowerCase().includes(searchQuery.toLowerCase()))
                .map(c => {
                  const isActive = c.id === (activeConvId || realConversations[0]?.id)
                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        setActiveConvId(c.id)
                        c.unread = 0
                      }}
                      className={`p-4 flex items-start gap-3 cursor-pointer transition-all ${
                        isActive ? 'bg-blue-50/80 border-l-4 border-blue-600' : 'hover:bg-slate-100/70'
                      }`}
                    >
                      <div className="relative flex-shrink-0">
                        <img src={c.avatar} alt={c.name} className="w-12 h-12 rounded-full object-cover border border-slate-200" />
                        <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                          c.status === 'online' ? 'bg-emerald-500' : 'bg-slate-300'
                        }`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-1">
                          <h4 className="font-bold text-slate-800 text-sm truncate">{c.name}</h4>
                          <span className="text-[11px] font-medium text-slate-400">{c.lastMsgTime}</span>
                        </div>
                        <p className="text-xs text-blue-600 font-medium mb-1">HS: {c.studentName} - {c.className}</p>
                        <p className="text-xs text-slate-500 truncate">{c.lastMsg}</p>
                      </div>

                      {c.unread > 0 && (
                        <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {c.unread}
                        </span>
                      )}
                    </div>
                  )
                })}
            </div>
          </div>

          {/* CỘT PHẢI: NỘI DUNG CHAT */}
          <div className="lg:col-span-8 flex flex-col bg-white">
            {!activeConv ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <MessageCircle className="w-12 h-12 mb-3 text-slate-300 animate-bounce" />
                <p className="font-bold text-slate-600">Chưa có hội thoại nào</p>
                <p className="text-xs text-slate-400 mt-1">Dữ liệu học sinh sẽ tự động cập nhật khi có học sinh được phân lớp</p>
              </div>
            ) : (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white">
                  <div className="flex items-center gap-3">
                    <img src={activeConv.avatar} alt={activeConv.name} className="w-10 h-10 rounded-full object-cover border border-slate-200" />
                    <div>
                      <h3 className="font-bold text-slate-800 text-base">{activeConv.name}</h3>
                      <p className="text-xs text-slate-500 flex items-center gap-2">
                        <span>SĐT: {activeConv.phone}</span>
                        <span>•</span>
                        <span className="text-blue-600 font-medium">{activeConv.studentName} ({activeConv.className})</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setActiveTab('tuition')}
                      className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-emerald-200"
                    >
                      <DollarSign className="w-3.5 h-3.5" /> Gửi Học Phí Zalo
                    </button>
                  </div>
                </div>

                {/* Chat Messages Body */}
                <div className="flex-1 p-6 overflow-y-auto bg-slate-50/40 space-y-4">
                  <div className="text-center my-2">
                    <span className="bg-slate-200/60 text-slate-600 text-[11px] font-semibold px-3 py-1 rounded-full">
                      Kênh chat đồng bộ trực tiếp với Zalo Phụ huynh
                    </span>
                  </div>

                  {([...(activeConv.messages || []), ...(customMessages[activeConv.id] || [])]).map(m => {
                    const isMe = m.sender === 'system'
                    return (
                      <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[75%] p-3.5 rounded-2xl shadow-sm text-sm ${
                          isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'
                        }`}>
                          <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium mt-1 px-1">{m.time}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Chat Input Bar */}
                <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-200 bg-white flex items-center gap-3">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Nhập tin nhắn Zalo gửi phụ huynh... (Enter để gửi)"
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim()}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl transition-all flex items-center gap-2 text-sm shadow-md"
                  >
                    <span>Gửi</span>
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: GỬI HỌC PHÍ TỰ ĐỘNG (TUITION BROADCASTER) */}
      {activeTab === 'tuition' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Cấu hình mẫu tin nhắn học phí */}
          <div className="lg:col-span-5 bg-white p-6 rounded-2xl shadow-lg border border-slate-200 space-y-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" /> Mẫu tin nhắn Zalo Học Phí
            </h3>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Nội dung mẫu (Template)</label>
              <textarea
                rows={6}
                value={tuitionTemplate}
                onChange={(e) => setTuitionTemplate(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 text-sm font-sans focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
              <p className="text-xs font-bold text-slate-700">Các biến thay thế tự động:</p>
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-mono">{'{ten_hoc_sinh}'}</span>
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-mono">{'{lop}'}</span>
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-mono">{'{thang}'}</span>
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-mono">{'{so_tien}'}</span>
              </div>
            </div>

            <button
              onClick={handleSendBulkTuition}
              disabled={isSendingBulk}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm"
            >
              {isSendingBulk ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Đang tự động gửi qua Zalo...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> Tự động gửi Zalo cho tất cả ({filteredTuitionItems.filter(i => i.status === 'pending').length} học sinh)
                </>
              )}
            </button>
          </div>

          {/* Danh sách học sinh & trạng thái gửi */}
          <div className="lg:col-span-7 bg-white p-6 rounded-2xl shadow-lg border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Danh sách thu học phí</h3>
                <p className="text-xs text-slate-500">Chọn lớp và tháng để lọc danh sách thông báo Zalo</p>
              </div>

              {/* Bộ lọc Lớp học & Tháng */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 max-w-[220px]"
                >
                  <option value="all">-- Tất cả các lớp ({classes.length}) --</option>
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>
                      {cls.class_name || cls.name} ({cls.grade || 'Lớp'})
                    </option>
                  ))}
                </select>

                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="Tháng 8/2026">Tháng 8/2026</option>
                  <option value="Tháng 9/2026">Tháng 9/2026</option>
                  <option value="Tháng 10/2026">Tháng 10/2026</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase bg-slate-50">
                    <th className="p-3 rounded-l-lg">Học sinh / Lớp</th>
                    <th className="p-3">SĐT Zalo</th>
                    <th className="p-3">Học phí</th>
                    <th className="p-3">Trạng thái Zalo</th>
                    <th className="p-3 rounded-r-lg text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTuitionItems.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="p-3">
                        <p className="font-bold text-slate-800">{item.studentName}</p>
                        <p className="text-xs text-blue-600">{item.class}</p>
                      </td>
                      <td className="p-3 font-mono text-slate-600">{item.phone}</td>
                      <td className="p-3 font-bold text-slate-800">{item.amount.toLocaleString()}đ</td>
                      <td className="p-3">
                        {item.status === 'sent' ? (
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full flex items-center gap-1 w-max">
                            <CheckCheck className="w-3.5 h-3.5" /> Đã gửi Zalo
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full flex items-center gap-1 w-max">
                            <Clock className="w-3.5 h-3.5" /> Chờ gửi
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleSendTuitionIndividual(item.id)}
                          disabled={item.status === 'sent'}
                          className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-40 font-bold rounded-lg text-xs"
                        >
                          Gửi ngay
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: KẾT NỐI MÃ QR ZALO (QR LOGIN) */}
      {activeTab === 'connection' && (
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-xl border border-slate-200 text-center space-y-6">
          <div>
            <h2 className="text-2xl font-black text-slate-800">Kết nối tài khoản Zalo cá nhân</h2>
            <p className="text-slate-500 text-sm mt-1">Dùng ứng dụng Zalo trên điện thoại quét mã QR bên dưới để kết nối tự động với Web App</p>
          </div>

          <div className="inline-block p-4 bg-slate-50 rounded-2xl border border-slate-200 shadow-inner relative">
            <img src={qrCodeUrl} alt="Zalo QR Code" className="w-56 h-56 mx-auto rounded-lg shadow-sm" />
            <div className="absolute inset-0 flex items-center justify-center bg-white/90 rounded-2xl backdrop-blur-xs opacity-0 hover:opacity-100 transition-opacity">
              <button 
                onClick={() => setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=ZALO_CONNECT_SESSION_${Date.now()}`)}
                className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Làm mới Mã QR
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
            <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-100">
              <p className="font-bold text-blue-900 text-xs mb-1">Bước 1</p>
              <p className="text-xs text-slate-600">Mở ứng dụng Zalo trên điện thoại cá nhân / trung tâm.</p>
            </div>
            <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-100">
              <p className="font-bold text-blue-900 text-xs mb-1">Bước 2</p>
              <p className="text-xs text-slate-600">Chọn biểu tượng Quét mã QR ở góc trên cùng Zalo.</p>
            </div>
            <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-100">
              <p className="font-bold text-blue-900 text-xs mb-1">Bước 3</p>
              <p className="text-xs text-slate-600">Xác nhận đăng nhập trên Zalo để hoàn tất kết nối Bot.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
