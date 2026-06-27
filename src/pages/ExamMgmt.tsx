import { useEffect, useState } from 'react'
import { FileUp, FileText, Trash2, RefreshCw, Eye, Edit2, Save, X, Settings } from 'lucide-react'
import { useExamStore } from '@/store/examStore'
import { parseWordToExam } from '@/services/mathWordParserService'
import { parseTexToExam } from '@/services/texParserService'
import { createDefaultPointsConfig } from '@/services/scoringService'
import { fmt } from '@/lib/helpers'
import { supabase } from '@/lib/supabase'
import Modal from '@/components/Modal'
import MathText from '@/components/MathText' 
import PointsConfigEditor from '@/components/PointsConfigEditor'
import toast from 'react-hot-toast'

export default function ExamMgmt() {
  const { exams, loading, loadExams, createExam, deleteExam, getExamData } = useExamStore()
  const [uploading, setUploading] = useState(false)
  
  // State cho xem trước
  const [previewData, setPreviewData] = useState<any>(null)
  const [previewing, setPreviewing] = useState<string | null>(null)

  // State cho chỉnh sửa câu hỏi trực tiếp
  const [editingQuestionId, setEditingQuestionId] = useState<string | number | null>(null)
  const [editForm, setEditForm] = useState<any>(null)
  const [savingEdit, setSavingEdit] = useState(false)

  // State cho cấu hình điểm
  const [configExam, setConfigExam] = useState<any>(null)

  // State cho chỉnh sửa tên đề thi
  const [editingExamId, setEditingExamId] = useState<string | null>(null)
  const [editingExamTitle, setEditingExamTitle] = useState<string>('')
  const [savingRename, setSavingRename] = useState(false)

  const handleRenameExam = async (id: string) => {
    if (!editingExamTitle.trim()) {
      toast.error('Tên đề thi không được để trống')
      return
    }
    setSavingRename(true)
    const toastId = toast.loading('Đang đổi tên đề thi...')
    try {
      const { error } = await supabase
        .from('exams')
        .update({ title: editingExamTitle.trim() })
        .eq('id', id)

      if (error) throw error

      toast.success('Đổi tên đề thi thành công!', { id: toastId })
      setEditingExamId(null)
      await loadExams()
    } catch (err: any) {
      toast.error('Lỗi khi đổi tên: ' + err.message, { id: toastId })
    } finally {
      setSavingRename(false)
    }
  }

  useEffect(() => {
    void loadExams()
  }, [loadExams])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const toastId = toast.loading('Đang phân tích file Word...')
    
    try {
      const examData = await parseWordToExam(file)
      
      // Tự động tạo cấu hình điểm mặc định
      examData.pointsConfig = createDefaultPointsConfig(examData.questions)

      toast.loading('Đang lưu lên Supabase...', { id: toastId })
      const title = file.name.replace(/\.docx$/i, '')
      await createExam(examData, title)

      toast.success('Tải đề thi thành công!', { id: toastId })
    } catch (error: any) {
      toast.error(`Lỗi: ${error.message || 'Không thể đọc file Word'}`, { id: toastId })
    } finally {
      setUploading(false)
      if (e.target) e.target.value = '' 
    }
  }

  const handleTexUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const toastId = toast.loading('Đang khởi động tiến trình đọc LaTeX...')
    
    try {
      const examData = await parseTexToExam(file, (msg) => {
        toast.loading(msg, { id: toastId })
      })
      
      // Tự động tạo cấu hình điểm mặc định
      examData.pointsConfig = createDefaultPointsConfig(examData.questions)

      toast.loading('Đang lưu lên Supabase...', { id: toastId })
      const title = file.name.replace(/\.tex$/i, '')
      await createExam(examData, title)

      toast.success('Tải đề thi LaTeX thành công!', { id: toastId })
    } catch (error: any) {
      toast.error(`Lỗi: ${error.message || 'Không thể đọc file LaTeX'}`, { id: toastId })
    } finally {
      setUploading(false)
      if (e.target) e.target.value = '' 
    }
  }

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Bạn có chắc muốn xóa đề: ${title}?`)) return
    try {
      await deleteExam(id)
      toast.success('Đã xóa đề thi')
    } catch (e) {
      toast.error('Lỗi khi xóa')
    }
  }

  const handlePreview = async (id: string, title: string) => {
    setPreviewing(id)
    const toastId = toast.loading('Đang tải dữ liệu đề thi...')
    try {
      const data = await getExamData(id)
      setPreviewData({ id, title, ...data })
      toast.success('Tải thành công', { id: toastId })
    } catch (e) {
      toast.error('Lỗi tải đề thi', { id: toastId })
    } finally {
      setPreviewing(null)
    }
  }

  const handleOpenConfig = async (id: string, title: string) => {
    const toastId = toast.loading('Đang tải cấu hình...')
    try {
      const data = await getExamData(id)
      const config = data.pointsConfig || createDefaultPointsConfig(data.questions || [])
      setConfigExam({ id, title, data, config })
      toast.success('Đã tải', { id: toastId })
    } catch (e) {
      toast.error('Lỗi tải cấu hình', { id: toastId })
    }
  }

  const startEditing = (q: any) => {
    setEditingQuestionId(q.number)
    setEditForm(JSON.parse(JSON.stringify(q)))
  }

  const saveQuestionEdit = async () => {
    if (!editForm) return
    setSavingEdit(true)
    const toastId = toast.loading('Đang lưu thay đổi...')

    try {
      const updatedQuestions = previewData.questions.map((q: any) => {
        if (q.number === editForm.number) return editForm
        return q
      })

      const updatedAnswers = { ...(previewData.answers || {}) }
      if (editForm.correctAnswer) {
        updatedAnswers[editForm.number] = editForm.correctAnswer
      } else {
        delete updatedAnswers[editForm.number]
      }

      const newExamPayload = {
        ...previewData,
        questions: updatedQuestions,
        answers: updatedAnswers,
      }

      const { error } = await supabase
        .from('exams')
        .update({ data: newExamPayload })
        .eq('id', previewData.id)

      if (error) throw error

      setPreviewData((prev: any) => ({
        ...prev,
        questions: updatedQuestions,
        answers: updatedAnswers
      }))
      
      setEditingQuestionId(null)
      setEditForm(null)
      toast.success('Đã cập nhật câu hỏi thành công!', { id: toastId })
    } catch (err: any) {
      toast.error('Lỗi khi lưu câu hỏi: ' + err.message, { id: toastId })
    } finally {
      setSavingEdit(false)
    }
  }

  const getExamGrade = (title: string) => {
    const t = title.toLowerCase()
    if (t.includes('lớp 6') || t.includes('khối 6') || t.includes('toán 6') || t.includes('khối sáu') || /\b(khối\s+)?6\b/.test(t)) return 6
    if (t.includes('lớp 7') || t.includes('khối 7') || t.includes('toán 7') || t.includes('khối bảy') || /\b(khối\s+)?7\b/.test(t)) return 7
    if (t.includes('lớp 8') || t.includes('khối 8') || t.includes('toán 8') || t.includes('khối tám') || /\b(khối\s+)?8\b/.test(t)) return 8
    if (t.includes('lớp 9') || t.includes('khối 9') || t.includes('toán 9') || t.includes('khối chín') || /\b(khối\s+)?9\b/.test(t)) return 9
    return null
  }

  const grades = [6, 7, 8, 9]

  const examsByGrade = {
    6: exams.filter(e => getExamGrade(e.title) === 6),
    7: exams.filter(e => getExamGrade(e.title) === 7),
    8: exams.filter(e => getExamGrade(e.title) === 8),
    9: exams.filter(e => getExamGrade(e.title) === 9),
    others: exams.filter(e => {
      const g = getExamGrade(e.title)
      return g === null
    })
  }

  let globalQuestionNumber = 1

  return (
    <div className="space-y-6">
      <div className="page-header flex justify-between items-start">
        <div>
          <h1 className="section-title flex items-center gap-2">
            <FileText className="w-7 h-7 text-teal-600" /> Ngân hàng đề thi
          </h1>
          <p className="text-gray-400 text-sm mt-1">Phân tích tự động và cấu hình điểm thi</p>
        </div>
        
        <div className="flex gap-2">
          <label className={`btn-teal flex items-center gap-2 cursor-pointer ${uploading ? 'opacity-70 pointer-events-none' : ''}`}>
            {uploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
            {uploading ? 'Đang xử lý...' : 'Tải lên từ Word'}
            <input type="file" accept=".docx" className="hidden" onChange={handleFileUpload} disabled={uploading} />
          </label>
          <label 
            className={`btn-teal flex items-center gap-2 cursor-pointer ${uploading ? 'opacity-70 pointer-events-none' : ''}`}
            style={{ background: 'linear-gradient(135deg, #6d28d9, #7c3aed)' }}
          >
            {uploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
            {uploading ? 'Đang xử lý...' : 'Tải lên từ LaTeX'}
            <input type="file" accept=".tex" className="hidden" onChange={handleTexUpload} disabled={uploading} />
          </label>
        </div>
      </div>

      {/* 4 Cột Khối Lớp */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {grades.map(grade => {
          const list = examsByGrade[grade as 6 | 7 | 8 | 9]
          // Màu sắc tương ứng từng khối lớp
          const theme = {
            6: { border: 'border-blue-500', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-800' },
            7: { border: 'border-emerald-500', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-800' },
            8: { border: 'border-orange-500', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-800' },
            9: { border: 'border-purple-500', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-800' },
          }[grade as 6 | 7 | 8 | 9]

          return (
            <div key={grade} className={`flex flex-col rounded-2xl border-t-4 ${theme.border} bg-white shadow-sm overflow-hidden min-h-[400px]`}>
              {/* Header của cột */}
              <div className="px-4 py-3 bg-gray-50/80 border-b border-gray-100 flex justify-between items-center">
                <h3 className={`font-bold text-base ${theme.text}`}>Khối {grade}</h3>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${theme.badge}`}>
                  {list.length} đề
                </span>
              </div>

              {/* Danh sách đề thi */}
              <div className="p-3 flex-1 space-y-3 overflow-y-auto max-h-[600px] custom-scrollbar bg-slate-50/30">
                {loading && list.length === 0 && exams.length === 0 ? (
                  <div className="flex justify-center items-center h-32">
                    <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
                  </div>
                ) : list.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-xs italic">
                    Chưa có đề thi
                  </div>
                ) : (
                  list.map(exam => (
                    <div 
                      key={exam.id} 
                      className="bg-white p-3 rounded-xl border border-gray-150 hover:border-teal-300 hover:shadow-md transition-all duration-200 group"
                    >
                      {editingExamId === exam.id ? (
                        <div className="flex gap-1 items-center mb-1">
                          <input 
                            type="text" 
                            value={editingExamTitle} 
                            onChange={(e) => setEditingExamTitle(e.target.value)} 
                            className="w-full border border-teal-300 rounded px-2 py-1 text-xs font-bold text-teal-800 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-teal-50/50"
                            autoFocus
                            disabled={savingRename}
                            onKeyDown={async (e) => {
                              if (e.key === 'Enter') {
                                await handleRenameExam(exam.id)
                              } else if (e.key === 'Escape') {
                                setEditingExamId(null)
                              }
                            }}
                          />
                          <button 
                            onClick={() => handleRenameExam(exam.id)}
                            disabled={savingRename}
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded flex-shrink-0"
                            title="Lưu"
                          >
                            <Save className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => setEditingExamId(null)}
                            disabled={savingRename}
                            className="p-1 text-gray-500 hover:bg-gray-50 rounded flex-shrink-0"
                            title="Hủy"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-1 group/title mb-1">
                          <h4 className="font-bold text-teal-800 text-sm leading-snug line-clamp-2" title={exam.title}>
                            {exam.title}
                          </h4>
                          <button 
                            onClick={() => { setEditingExamId(exam.id); setEditingExamTitle(exam.title); }}
                            className="p-0.5 text-gray-400 hover:text-teal-600 rounded opacity-0 group-hover/title:opacity-100 transition-opacity flex-shrink-0"
                            title="Đổi tên đề"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                      <p className="text-[11px] text-gray-400 mb-2">
                        {fmt(new Date(exam.created_at), 'dd/MM/yyyy HH:mm')}
                      </p>
                      
                      <div className="flex justify-end gap-1.5 pt-1.5 border-t border-gray-50">
                        <button 
                          onClick={() => handleOpenConfig(exam.id, exam.title)}
                          className="p-1 text-orange-500 hover:bg-orange-50 rounded transition-colors"
                          title="Cấu hình điểm"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handlePreview(exam.id, exam.title)}
                          disabled={previewing === exam.id}
                          className="p-1 text-blue-500 hover:bg-blue-50 rounded transition-colors"
                          title="Xem trước & Chỉnh sửa"
                        >
                          {previewing === exam.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button 
                          onClick={() => handleDelete(exam.id, exam.title)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                          title="Xóa đề thi"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Đề thi khác (nếu có) */}
      {examsByGrade.others.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="font-bold text-sm text-gray-500 uppercase tracking-wider">Đề thi chưa phân loại</h3>
            <span className="bg-gray-200 text-gray-700 text-xs font-bold px-2 py-0.5 rounded-full">
              {examsByGrade.others.length}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {examsByGrade.others.map(exam => (
              <div 
                key={exam.id} 
                className="bg-white p-3 rounded-xl border border-gray-150 hover:border-teal-350 hover:shadow-md transition-all duration-200 group"
              >
                {editingExamId === exam.id ? (
                  <div className="flex gap-1 items-center mb-1">
                    <input 
                      type="text" 
                      value={editingExamTitle} 
                      onChange={(e) => setEditingExamTitle(e.target.value)} 
                      className="w-full border border-teal-300 rounded px-2 py-1 text-xs font-bold text-teal-800 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-teal-50/50"
                      autoFocus
                      disabled={savingRename}
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter') {
                          await handleRenameExam(exam.id)
                        } else if (e.key === 'Escape') {
                          setEditingExamId(null)
                        }
                      }}
                    />
                    <button 
                      onClick={() => handleRenameExam(exam.id)}
                      disabled={savingRename}
                      className="p-1 text-emerald-600 hover:bg-emerald-50 rounded flex-shrink-0"
                      title="Lưu"
                    >
                      <Save className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => setEditingExamId(null)}
                      disabled={savingRename}
                      className="p-1 text-gray-500 hover:bg-gray-50 rounded flex-shrink-0"
                      title="Hủy"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-1 group/title mb-1">
                    <h4 className="font-bold text-teal-800 text-sm leading-snug line-clamp-2" title={exam.title}>
                      {exam.title}
                    </h4>
                    <button 
                      onClick={() => { setEditingExamId(exam.id); setEditingExamTitle(exam.title); }}
                      className="p-0.5 text-gray-400 hover:text-teal-600 rounded opacity-0 group-hover/title:opacity-100 transition-opacity flex-shrink-0"
                      title="Đổi tên đề"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                <p className="text-[11px] text-gray-400 mb-2">
                  {fmt(new Date(exam.created_at), 'dd/MM/yyyy HH:mm')}
                </p>
                
                <div className="flex justify-end gap-1.5 pt-1.5 border-t border-gray-50">
                  <button 
                    onClick={() => handleOpenConfig(exam.id, exam.title)}
                    className="p-1 text-orange-500 hover:bg-orange-50 rounded transition-colors"
                    title="Cấu hình điểm"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handlePreview(exam.id, exam.title)}
                    disabled={previewing === exam.id}
                    className="p-1 text-blue-500 hover:bg-blue-50 rounded transition-colors"
                    title="Xem trước & Chỉnh sửa"
                  >
                    {previewing === exam.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button 
                    onClick={() => handleDelete(exam.id, exam.title)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                    title="Xóa đề thi"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ✅ MODAL CẤU HÌNH ĐIỂM (Đã sửa size thành 3xl) */}
      <Modal open={!!configExam} onClose={() => setConfigExam(null)} title="" size="3xl" >
        {configExam && (
          <div className="-m-6">
            <PointsConfigEditor
              config={configExam.config}
              onChange={async (newConfig) => {
                const newData = { ...configExam.data, pointsConfig: newConfig };
                await supabase.from('exams').update({ data: newData }).eq('id', configExam.id);
                toast.success('Lưu cấu hình điểm thành công!');
                setConfigExam(null);
              }}
              onClose={() => setConfigExam(null)}
            />
          </div>
        )}
      </Modal>

      {/* ✅ MODAL XEM TRƯỚC VÀ CHỈNH SỬA ĐỀ THI */}
      <Modal open={!!previewData} onClose={() => { if(!savingEdit) setPreviewData(null); setEditingQuestionId(null); }} title={`Xem trước & Biên tập: ${previewData?.title}`} size="3xl">
        <div className="space-y-8 max-h-[75vh] overflow-y-auto pr-2 bg-gray-50 p-4 rounded-xl">
          
          {[1, 2, 3, 4].map(part => {
            const questionsInPart = previewData?.questions?.filter((q: any) => {
              const qPart = typeof q.part === 'string' ? parseInt(q.part.replace(/\D/g, '')) : q.part;
              return qPart === part;
            }) || [];

            if (questionsInPart.length === 0) return null;

            const partTitles: Record<number, { title: string, desc: string, color: string }> = {
              1: { title: 'PHẦN 1. TRẮC NGHIỆM NHIỀU LỰA CHỌN', desc: 'Mỗi câu chọn 1 đáp án đúng (A, B, C, D)', color: 'bg-blue-600' },
              2: { title: 'PHẦN 2. TRẮC NGHIỆM ĐÚNG/SAI', desc: 'Chọn Đúng hoặc Sai cho mỗi ý a, b, c, d', color: 'bg-emerald-600' },
              3: { title: 'PHẦN 3. TRẢ LỜI NGẮN', desc: 'Điền đáp án số vào ô trống', color: 'bg-orange-600' },
              4: { title: 'PHẦN 4. TỰ LUẬN', desc: 'Trình bày lời giải chi tiết', color: 'bg-violet-600' }
            };

            const info = partTitles[part];

            return (
              <div key={part} className="space-y-4">
                <div className={`p-4 rounded-xl shadow-md text-white ${info.color} bg-gradient-to-r from-black/10 to-transparent`}>
                  <h3 className="font-bold text-lg">{info.title}</h3>
                  <p className="text-sm opacity-90">{info.desc}</p>
                </div>

                {questionsInPart.map((q: any) => {
                  const displayQNum = globalQuestionNumber++;
                  const isEditingThis = editingQuestionId === q.number;

                  return (
                    <div key={q.number} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                      
                      {/* Tiêu đề & Nút thao tác câu hỏi */}
                      <div className="flex justify-between items-start mb-4 border-b border-gray-50 pb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-teal-100 text-teal-700 font-bold rounded-full flex items-center justify-center flex-shrink-0">
                            {displayQNum}
                          </div>
                          <span className="text-xs text-gray-400 font-mono">ID: {q.number}</span>
                        </div>
                        
                        {/* Nút sửa / lưu */}
                        {!isEditingThis ? (
                          <button 
                            onClick={() => startEditing(q)}
                            className="btn-outline py-1.5 px-3 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-300 transition-all"
                          >
                            <Edit2 className="w-3.5 h-3.5" /> Sửa câu này
                          </button>
                        ) : (
                          <div className="flex gap-2">
                            <button 
                              onClick={saveQuestionEdit}
                              disabled={savingEdit}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white py-1.5 px-3.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all shadow-sm"
                            >
                              <Save className="w-3.5 h-3.5" /> {savingEdit ? 'Đang lưu...' : 'Lưu'}
                            </button>
                            <button 
                              onClick={() => { setEditingQuestionId(null); setEditForm(null); }}
                              disabled={savingEdit}
                              className="bg-gray-200 hover:bg-gray-300 text-gray-700 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
                            >
                              <X className="w-3.5 h-3.5" /> Hủy
                            </button>
                          </div>
                        )}
                      </div>

                      {/* CHẾ ĐỘ XEM THƯỜNG */}
                      {!isEditingThis ? (
                        <div className="space-y-4">
                          <div className="pl-12">
                            <MathText html={q.text} block className="text-gray-800 font-medium text-base leading-relaxed" />
                            {q.images?.map((img: any, idx: number) => (
                              <img 
                                key={idx} 
                                src={img.base64 ? `data:${img.contentType || 'image/png'};base64,${img.base64}` : `data:image/png;base64,${img.data}`} 
                                className="max-h-64 mt-3 rounded-lg border border-gray-200 shadow-sm" 
                                alt={`Ảnh câu ${displayQNum}`} 
                              />
                            ))}
                          </div>

                          {/* Phương án Phần 1 (Trắc nghiệm thường) */}
                          {part === 1 && q.options && q.options.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-12">
                              {q.options.map((opt: any, idx: number) => {
                                const isCorrect = q.correctAnswer?.toUpperCase() === opt.letter.toUpperCase();
                                const displayLetter = String.fromCharCode(65 + idx);

                                return (
                                  <div key={opt.letter} className={`flex items-start gap-3 p-3 rounded-xl border-2 ${isCorrect ? 'bg-blue-50 border-blue-300 shadow-sm' : 'bg-gray-50 border-gray-100'}`}>
                                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isCorrect ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                                      {displayLetter}
                                    </span>
                                    <MathText html={opt.text} className={`text-sm pt-0.5 ${isCorrect ? 'text-blue-800 font-medium' : 'text-gray-700'}`} />
                                  </div>
                                )
                              })}
                            </div>
                          )}

                          {/* Phương án Phần 2 (Đúng / Sai) */}
                          {part === 2 && q.options && q.options.length > 0 && (
                            <div className="pl-12">
                              <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                                <div className="grid grid-cols-[1fr_80px_80px] bg-slate-100 border-b border-gray-200 text-xs font-bold text-gray-500 text-center uppercase tracking-wider">
                                  <div className="py-2.5 px-4 text-left">Mệnh đề</div>
                                  <div className="py-2.5 border-l border-gray-200 text-emerald-700 bg-emerald-50/50">Đúng</div>
                                  <div className="py-2.5 border-l border-gray-200 text-red-700 bg-red-50/50">Sai</div>
                                </div>
                                <div className="divide-y divide-gray-100">
                                  {q.options.map((opt: any, idx: number) => {
                                    const isTrue = q.correctAnswer?.toLowerCase().includes(opt.letter.toLowerCase());
                                    const displayLetter = String.fromCharCode(97 + idx); // a, b, c, d
                                    
                                    return (
                                      <div key={opt.letter} className={`grid grid-cols-[1fr_80px_80px] text-sm items-stretch ${isTrue ? 'bg-emerald-50/30' : 'bg-red-50/30'}`}>
                                        <div className="p-3 flex gap-2.5 items-start">
                                          <span className={`font-bold mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white shadow-sm flex-shrink-0 ${isTrue ? 'bg-emerald-500' : 'bg-red-400'}`}>
                                            {displayLetter}
                                          </span>
                                          <MathText html={opt.text} className="text-gray-700 leading-relaxed pt-px" />
                                        </div>
                                        <div className={`border-l border-gray-200 flex items-center justify-center ${isTrue ? 'bg-emerald-500 text-white' : ''}`}>
                                          {isTrue ? <span className="font-bold text-sm">✓</span> : <span className="w-3 h-3 border border-gray-300 rounded-full bg-white"></span>}
                                        </div>
                                        <div className={`border-l border-gray-200 flex items-center justify-center ${!isTrue ? 'bg-red-500 text-white' : ''}`}>
                                          {!isTrue ? <span className="font-bold text-sm">✕</span> : <span className="w-3 h-3 border border-gray-300 rounded-full bg-white"></span>}
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Phương án Phần 3 (Trả lời ngắn) */}
                          {part === 3 && q.correctAnswer && (
                            <div className="pl-12">
                              <div className="inline-block bg-orange-50 border border-orange-200 rounded-lg px-4 py-2">
                                <span className="text-orange-800 font-bold text-sm">Đáp án: </span>
                                <span className="text-orange-900 font-bold text-lg ml-1">{q.correctAnswer}</span>
                              </div>
                            </div>
                          )}

                          {/* Lời giải chi tiết */}
                          {q.solution && (
                            <div className="pl-12">
                              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                                <span className="font-bold text-slate-700 text-sm block mb-2">💡 Lời giải chi tiết:</span>
                                <MathText html={q.solution} className="text-sm text-slate-700 leading-relaxed" block />
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        // CHẾ ĐỘ CHỈNH SỬA TRỰC TIẾP
                        <div className="space-y-4 pl-4 border-l-4 border-amber-400 bg-amber-50/30 p-4 rounded-r-xl">
                          <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Nội dung câu hỏi *</label>
                            <textarea 
                              value={editForm.text}
                              onChange={e => setEditForm({ ...editForm, text: e.target.value })}
                              className="input font-mono text-sm"
                              rows={3}
                            />
                          </div>

                          {/* Chỉnh sửa Phần 1 - Trắc nghiệm */}
                          {part === 1 && editForm.options && (
                            <div className="space-y-3">
                              <label className="block text-xs font-bold text-gray-500">Các phương án và đáp án đúng</label>
                              <div className="grid grid-cols-1 gap-2">
                                {editForm.options.map((opt: any, idx: number) => {
                                  const letter = opt.letter.toUpperCase();
                                  const isCorrect = editForm.correctAnswer?.toUpperCase() === letter;

                                  return (
                                    <div key={opt.letter} className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => setEditForm({ ...editForm, correctAnswer: letter })}
                                        className={`w-8 h-8 rounded-full font-bold text-xs flex-shrink-0 transition-all ${isCorrect ? 'bg-blue-600 text-white border-2 border-blue-700' : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'}`}
                                      >
                                        {letter}
                                      </button>
                                      <input 
                                        type="text" 
                                        value={opt.text}
                                        onChange={e => {
                                          const newOpts = [...editForm.options];
                                          newOpts[idx].text = e.target.value;
                                          setEditForm({ ...editForm, options: newOpts });
                                        }}
                                        className="input py-1 text-sm flex-1"
                                      />
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}

                          {/* Chỉnh sửa Phần 2 - Đúng / Sai */}
                          {part === 2 && editForm.options && (
                            <div className="space-y-3">
                              <label className="block text-xs font-bold text-gray-500">Các mệnh đề và trạng thái Đúng (T) / Sai (F)</label>
                              <div className="space-y-2">
                                {editForm.options.map((opt: any, idx: number) => {
                                  const letter = opt.letter.toLowerCase();
                                  const isTrue = editForm.correctAnswer?.toLowerCase().includes(letter);

                                  const handleToggleTF = () => {
                                    let currentAnsArr = editForm.correctAnswer ? editForm.correctAnswer.toLowerCase().split(',').filter(Boolean) : [];
                                    if (isTrue) {
                                      currentAnsArr = currentAnsArr.filter((item: string) => item !== letter);
                                    } else {
                                      currentAnsArr.push(letter);
                                    }
                                    setEditForm({ ...editForm, correctAnswer: currentAnsArr.sort().join(',') });
                                  };

                                  return (
                                    <div key={opt.letter} className="flex items-start gap-2">
                                      <button
                                        type="button"
                                        onClick={handleToggleTF}
                                        className={`py-1.5 px-3 rounded-lg text-xs font-bold flex-shrink-0 transition-all ${isTrue ? 'bg-emerald-600 text-white' : 'bg-red-500 text-white'}`}
                                      >
                                        Mệnh đề {letter.toUpperCase()}: {isTrue ? 'ĐÚNG' : 'SAI'}
                                      </button>
                                      <input 
                                        type="text" 
                                        value={opt.text}
                                        onChange={e => {
                                          const newOpts = [...editForm.options];
                                          newOpts[idx].text = e.target.value;
                                          setEditForm({ ...editForm, options: newOpts });
                                        }}
                                        className="input py-1 text-sm flex-1"
                                      />
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}

                          {/* Chỉnh sửa Phần 3 */}
                          {part === 3 && (
                            <div>
                              <label className="block text-xs font-bold text-gray-500 mb-1">Đáp án đúng (Kết quả ngắn) *</label>
                              <input 
                                type="text" 
                                value={editForm.correctAnswer || ''}
                                onChange={e => setEditForm({ ...editForm, correctAnswer: e.target.value })}
                                className="input py-1.5 font-bold text-orange-700"
                              />
                            </div>
                          )}

                          {/* Chỉnh sửa Lời giải */}
                          <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Lời giải chi tiết</label>
                            <textarea 
                              value={editForm.solution || ''}
                              onChange={e => setEditForm({ ...editForm, solution: e.target.value })}
                              className="input font-mono text-xs"
                              rows={2}
                              placeholder="Nhập lời giải..."
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </Modal>
    </div>
  )
}
