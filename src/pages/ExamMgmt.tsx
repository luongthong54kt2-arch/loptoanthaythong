import { useEffect, useState } from 'react'
import { FileUp, FileText, Trash2, RefreshCw, Eye, Edit2, Save, X, Settings, Download, BookOpen, Sparkles, Folder, FolderOpen, Layers, Search, ChevronRight } from 'lucide-react'
import { useExamStore } from '@/store/examStore'
import { parseWordToExam } from '@/services/mathWordParserService'
import { parseTexToExam } from '@/services/texParserService'
import { createDefaultPointsConfig } from '@/services/scoringService'
import { generateSimilarQuestions } from '@/services/geminiService'
import { fmt } from '@/lib/helpers'
import { supabase } from '@/lib/supabase'
import Modal from '@/components/Modal'
import MathText from '@/components/MathText' 
import PointsConfigEditor from '@/components/PointsConfigEditor'
import toast from 'react-hot-toast'
import { EX_TEST_DETHI_TEMPLATE } from '@/constants'
import { compileFullTex } from '@/services/api'
import { uploadPdfToSupabase } from '@/services/supabaseService'

export default function ExamMgmt() {
  const { exams, loading, loadExams, createExam, deleteExam, getExamData } = useExamStore()
  const [uploading, setUploading] = useState(false)
  
  // State cho xem trÆ°á»›c
  const [previewData, setPreviewData] = useState<any>(null)
  const [previewing, setPreviewing] = useState<string | null>(null)

  // State cho chá»‰nh sá»­a cÃ¢u há»i trá»±c tiáº¿p
  const [editingQuestionId, setEditingQuestionId] = useState<string | number | null>(null)
  const [editForm, setEditForm] = useState<any>(null)
  const [savingEdit, setSavingEdit] = useState(false)

  // State cho cáº¥u hÃ¬nh Ä‘iá»ƒm
  const [configExam, setConfigExam] = useState<any>(null)

  // State cho chá»‰nh sá»­a tÃªn Ä‘á» thi
  const [editingExamId, setEditingExamId] = useState<string | null>(null)
  const [editingExamTitle, setEditingExamTitle] = useState<string>('')
  const [savingRename, setSavingRename] = useState(false)

  // State cho downloading file LaTeX
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [generatingSimilarId, setGeneratingSimilarId] = useState<string | null>(null)

  // State cho phÃ¢n loáº¡i Khá»‘i & 4 ThÆ° má»¥c (GK1, CK1, GK2, CK2)
  const [selectedGrade, setSelectedGrade] = useState<number | 'all' | 'others'>('all')
  const [activeFolderTab, setActiveFolderTab] = useState<'all' | 'GK1' | 'CK1' | 'GK2' | 'CK2' | 'KHAC'>('all')
  const [columnFolders, setColumnFolders] = useState<Record<string | number, 'all' | 'GK1' | 'CK1' | 'GK2' | 'CK2' | 'KHAC'>>({
    6: 'all', 7: 'all', 8: 'all', 9: 'all', 10: 'all', 11: 'all', 12: 'all', others: 'all'
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [targetUploadFolder, setTargetUploadFolder] = useState<'GK1' | 'CK1' | 'GK2' | 'CK2' | 'KHAC'>('GK1')

  const generateTexFromQuestions = (title: string, questions: any[]): string => {
    const part1 = (questions || []).filter(q => q.part === 1 || q.type === 'multiple_choice');
    const part2 = (questions || []).filter(q => q.part === 2 || q.type === 'true_false');
    const part3 = (questions || []).filter(q => q.part === 3 || q.type === 'short_answer');
    const other = (questions || []).filter(q => q.part !== 1 && q.part !== 2 && q.part !== 3 && q.type !== 'multiple_choice' && q.type !== 'true_false' && q.type !== 'short_answer');

    let body = '';

    const cleanText = (html: string) => {
      if (!html) return '';
      let tex = html;
      tex = tex.replace(/<strong>([\s\S]*?)<\/strong>/gi, '\\textbf{$1}');
      tex = tex.replace(/<b>([\s\S]*?)<\/b>/gi, '\\textbf{$1}');
      tex = tex.replace(/<em>([\s\S]*?)<\/em>/gi, '\\textit{$1}');
      tex = tex.replace(/<i>([\s\S]*?)<\/i>/gi, '\\textit{$1}');
      tex = tex.replace(/<u>([\s\S]*?)<\/u>/gi, '\\underline{$1}');
      tex = tex.replace(/<br\s*\/?>/gi, '\\\\\n');
      tex = tex.replace(/&nbsp;/gi, '~');
      tex = tex.replace(/<(?:\/?[a-zA-Z][a-zA-Z0-9]*)(?:\s+[^>]*?)?>/g, '');
      return tex.trim();
    };

    if (part1.length > 0) {
      body += `\\textbf{PHáº¦N I. CÃ¢u tráº¯c nghiá»‡m nhiá»u phÆ°Æ¡ng Ã¡n lá»±a chá»n.} Há»c sinh tráº£ lá»i tá»« cÃ¢u 1 Ä‘áº¿n cÃ¢u ${part1.length}. Má»—i cÃ¢u há»i há»c sinh chá»‰ chá»n má»™t phÆ°Æ¡ng Ã¡n.\n\\hrule\n\\medskip\n`;
      part1.forEach((q) => {
        body += `\\begin{ex}\n${cleanText(q.text)}\n`;
        if (q.options && q.options.length > 0) {
          body += `\\choice\n`;
          const letters = ['A', 'B', 'C', 'D'];
          q.options.forEach((opt: any, oIdx: number) => {
            const isTrue = opt.isCorrect || opt.letter === q.correctAnswer || (q.correctAnswer === letters[oIdx]);
            body += `{\n  ${isTrue ? '\\True ' : ''}${cleanText(opt.text)}\n}\n`;
          });
        }
        if (q.solution) {
          body += `\\loigiai{${cleanText(q.solution)}}\n`;
        }
        body += `\\end{ex}\n\n`;
      });
    }

    if (part2.length > 0) {
      body += `\\textbf{PHáº¦N II. CÃ¢u tráº¯c nghiá»‡m Ä‘Ãºng sai.} Há»c sinh tráº£ lá»i tá»« cÃ¢u 1 Ä‘áº¿n cÃ¢u ${part2.length}. Trong má»—i Ã½ a), b), c), d) á»Ÿ má»—i cÃ¢u, há»c sinh chá»n Ä‘Ãºng hoáº·c sai.\n\\hrule\n\\medskip\n`;
      part2.forEach((q) => {
        body += `\\begin{ex}\n${cleanText(q.text)}\n`;
        if (q.options && q.options.length > 0) {
          body += `\\choiceTF[t]\n`;
          q.options.forEach((opt: any) => {
            const isTrue = opt.isCorrect || (q.correctAnswer && q.correctAnswer.split(',').includes(opt.letter));
            body += `{\n  ${isTrue ? '\\True ' : ''}${cleanText(opt.text)}\n}\n`;
          });
        }
        if (q.solution) {
          body += `\\loigiai{${cleanText(q.solution)}}\n`;
        }
        body += `\\end{ex}\n\n`;
      });
    }

    if (part3.length > 0) {
      body += `\\textbf{PHáº¦N III. CÃ¢u tráº¯c nghiá»‡m tráº£ lá»i ngáº¯n.} Há»c sinh tráº£ lá»i tá»« cÃ¢u 1 Ä‘áº¿n cÃ¢u ${part3.length}.\n\\hrule\n\\medskip\n`;
      part3.forEach((q) => {
        body += `\\begin{ex}\n${cleanText(q.text)}\n`;
        if (q.correctAnswer) {
          body += `\\shortans{${q.correctAnswer}}\n`;
        }
        if (q.solution) {
          body += `\\loigiai{${cleanText(q.solution)}}\n`;
        }
        body += `\\end{ex}\n\n`;
      });
    }

    if (other.length > 0) {
      body += `\\textbf{PHáº¦N IV. Tá»± luáº­n.}\n\\hrule\n\\medskip\n`;
      other.forEach((q) => {
        body += `\\begin{ex}\n${cleanText(q.text)}\n`;
        if (q.solution) {
          body += `\\loigiai{${cleanText(q.solution)}}\n`;
        }
        body += `\\end{ex}\n\n`;
      });
    }

    const template = EX_TEST_DETHI_TEMPLATE;
    
    let customizedTemplate = template;
    if (title) {
      customizedTemplate = customizedTemplate.replace(
        /\\textit\{MÃ´n: ToÃ¡n 12 -- Thá»i gian: 45 phÃºt\}/g,
        `\\textit{MÃ´n: ToÃ¡n -- Äá»: ${title}}`
      );
    }

    const customParts = customizedTemplate.split('%=== THÃŠM CÃ‚U Há»ŽI Táº I ÄÃ‚Y ===');
    if (customParts.length >= 2) {
      return `${customParts[0]}\n\n${body}\n\n${customParts.slice(1).join('%=== THÃŠM CÃ‚U Há»ŽI Táº I ÄÃ‚Y ===')}`;
    }
    return `${customizedTemplate}\n\n${body}`;
  };

  const handleDownloadTex = async (id: string, title: string) => {
    setDownloadingId(id)
    const toastId = toast.loading('Äang táº£i dá»¯ liá»‡u Ä‘á»ƒ xuáº¥t file...')
    try {
      const data = await getExamData(id)
      
      let texContent = ''
      if (data.originalTex && data.originalTex.includes('\\begin{document}')) {
        texContent = data.originalTex
      } else {
        texContent = generateTexFromQuestions(title, data.questions || [])
      }

      // Thay tháº¿ tÃªn tÃ¡c giáº£ vÃ  áº©n lá»i giáº£i
      texContent = texContent
        .replace(/Nguyá»…n Há»¯u PhÃºc/g, 'Lá»›p toÃ¡n tháº§y thÃ´ng')
        .replace(/Mr\.Phuc\s+Math/g, '')
        .replace(/\\usepackage\s*\[\s*loigiai\s*\]\s*\{\s*ex_test\s*\}/g, '\\usepackage[dethi]{ex_test}')
        .replace(/\\circEX/g, '\\circled')

      const blob = new Blob([texContent], { type: 'text/plain;charset=utf-8' })
      const filename = `${title.replace(/\s+/g, '_')}.tex`
      
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      toast.success('Táº£i file LaTeX thÃ nh cÃ´ng!', { id: toastId })
    } catch (e: any) {
      toast.error('Lá»—i khi xuáº¥t file: ' + e.message, { id: toastId })
    } finally {
      setDownloadingId(null)
    }
  }

  // State cho xem PDF
  const [pdfUrlToView, setPdfUrlToView] = useState<string | null>(null)
  const [compilingId, setCompilingId] = useState<string | null>(null)

  const handleViewPdf = async (exam: any) => {
    // 1. Kiá»ƒm tra xem Ä‘á» thi Ä‘Ã£ cÃ³ sáºµn file PDF chÆ°a
    if (exam.pdfUrl) {
      setPdfUrlToView(exam.pdfUrl)
      return
    }
    if (exam.pdfDriveUrl) {
      setPdfUrlToView(exam.pdfDriveUrl)
      return
    }

    // 2. Náº¿u chÆ°a cÃ³, há»i xem tháº§y/cÃ´ cÃ³ muá»‘n biÃªn dá»‹ch LaTeX sang PDF ngay láº­p tá»©c khÃ´ng
    if (!confirm('Äá» thi nÃ y chÆ°a cÃ³ báº£n xem trÆ°á»›c PDF. Há»‡ thá»‘ng cáº§n biÃªn dá»‹ch LaTeX sang PDF (máº¥t khoáº£ng 5-10s). Tiáº¿p tá»¥c?')) {
      return
    }

    setCompilingId(exam.id)
    const toastId = toast.loading('Äang láº¥y dá»¯ liá»‡u Ä‘á» thi...')
    try {
      const data = await getExamData(exam.id)
      
      let texContent = ''
      if (data.originalTex && data.originalTex.includes('\\begin{document}')) {
        texContent = data.originalTex
      } else {
        texContent = generateTexFromQuestions(exam.title, data.questions || [])
      }

      // Thay tháº¿ tÃªn tÃ¡c giáº£ vÃ  áº©n lá»i giáº£i
      texContent = texContent
        .replace(/Nguyá»…n Há»¯u PhÃºc/g, 'Lá»›p toÃ¡n tháº§y thÃ´ng')
        .replace(/Mr\.Phuc\s+Math/g, '')
        .replace(/\\usepackage\s*\[\s*loigiai\s*\]\s*\{\s*ex_test\s*\}/g, '\\usepackage[dethi]{ex_test}')
        .replace(/\\circEX/g, '\\circled')

      toast.loading('Äang biÃªn dá»‹ch LaTeX sang PDF...', { id: toastId })
      const compileRes = await compileFullTex({ tex: texContent })
      
      if (!compileRes.ok || !compileRes.base64) {
        throw new Error(compileRes.detail || 'BiÃªn dá»‹ch LaTeX tháº¥t báº¡i')
      }

      toast.loading('Äang táº£i file PDF lÃªn há»‡ thá»‘ng...', { id: toastId })
      const uploadRes = await uploadPdfToSupabase(compileRes.base64, `${exam.title}.pdf`)
      const fileUrl = uploadRes.fileUrl

      // LÆ°u link PDF má»›i vÃ o dá»¯ liá»‡u Ä‘á» thi trong DB
      const updatedData = {
        ...data,
        pdfUrl: fileUrl
      }
      
      await supabase
        .from('exams')
        .update({ data: updatedData })
        .eq('id', exam.id)

      toast.success('BiÃªn dá»‹ch vÃ  lÆ°u PDF thÃ nh cÃ´ng!', { id: toastId })
      setPdfUrlToView(fileUrl)
      await loadExams() // Refresh danh sÃ¡ch Ä‘á»ƒ cáº­p nháº­t tráº¡ng thÃ¡i pdfUrl
    } catch (e: any) {
      toast.error('Lá»—i khi biÃªn dá»‹ch PDF: ' + e.message, { id: toastId })
    } finally {
      setCompilingId(null)
    }
  }

  const handleGenerateSimilarExam = async (exam: any) => {
    if (!confirm(`Báº¡n cÃ³ cháº¯c muá»‘n táº¡o Ä‘á» thi má»›i TÆ¯Æ NG Tá»° Ä‘á»: "${exam.title}" khÃ´ng? (Há»‡ thá»‘ng sáº½ dÃ¹ng AI thay Ä‘á»•i cÃ¡c sá»‘ liá»‡u toÃ¡n nhÆ°ng giá»¯ nguyÃªn Ä‘á»™ khÃ³ vÃ  cáº¥u trÃºc Ä‘á»).`)) {
      return
    }

    setGeneratingSimilarId(exam.id)
    const toastId = toast.loading('Äang láº¥y dá»¯ liá»‡u Ä‘á» gá»‘c...')
    try {
      const data = await getExamData(exam.id)
      
      toast.loading('AI Ä‘ang thiáº¿t káº¿ vÃ  táº¡o sá»‘ liá»‡u má»›i cho Ä‘á» thi...', { id: toastId })
      const newQuestions = await generateSimilarQuestions(data.questions || [])
      
      const newAnswers: Record<string, any> = {}
      newQuestions.forEach((q: any) => {
        if (q.correctAnswer) {
          newAnswers[q.number] = q.correctAnswer
        }
      })

      // Äá»“ng bá»™ láº¡i cÃ¡c pháº§n (sections)
      const qMap = new Map(newQuestions.map(q => [q.number, q]))
      const newSections = (data.sections || []).map((s: any) => ({
        ...s,
        questions: (s.questions || []).map((q: any) => qMap.get(q.number) || q)
      }))

      const newExamData = {
        ...data,
        questions: newQuestions,
        answers: newAnswers,
        sections: newSections,
      }

      // XÃ³a cache PDF vÃ  nguyÃªn báº£n LaTeX cÅ© vÃ¬ Ä‘Ã¢y lÃ  sá»‘ liá»‡u má»›i
      delete newExamData.pdfUrl
      delete newExamData.pdfDriveUrl
      delete newExamData.pdfBase64
      delete newExamData.originalTex

      toast.loading('Äang lÆ°u Ä‘á» thi má»›i vÃ o há»‡ thá»‘ng...', { id: toastId })
      const newTitle = `${exam.title} - TÆ°Æ¡ng tá»±`
      await createExam(newExamData, newTitle)

      toast.success(`ÄÃ£ táº¡o thÃ nh cÃ´ng Ä‘á» thi tÆ°Æ¡ng tá»±: "${newTitle}"!`, { id: toastId })
      await loadExams()
    } catch (err: any) {
      console.error(err)
      toast.error('Lá»—i khi táº¡o Ä‘á» tÆ°Æ¡ng tá»±: ' + err.message, { id: toastId })
    } finally {
      setGeneratingSimilarId(null)
    }
  }

  // Äá»‹nh nghÄ©a 4 thÆ° má»¥c chÃ­nh & thÆ° má»¥c khÃ¡c
  const FOLDER_DEFS: { id: 'GK1' | 'CK1' | 'GK2' | 'CK2' | 'KHAC'; label: string; fullLabel: string; badge: string; border: string; bg: string; text: string }[] = [
    { id: 'GK1', label: 'GK1', fullLabel: 'Giá»¯a Há»c KÃ¬ 1', badge: 'bg-blue-100 text-blue-800 border-blue-200', border: 'border-blue-500', bg: 'bg-blue-50/60', text: 'text-blue-700' },
    { id: 'CK1', label: 'CK1', fullLabel: 'Cuá»‘i Há»c KÃ¬ 1', badge: 'bg-emerald-100 text-emerald-800 border-emerald-200', border: 'border-emerald-500', bg: 'bg-emerald-50/60', text: 'text-emerald-700' },
    { id: 'GK2', label: 'GK2', fullLabel: 'Giá»¯a Há»c KÃ¬ 2', badge: 'bg-amber-100 text-amber-800 border-amber-200', border: 'border-amber-500', bg: 'bg-amber-50/60', text: 'text-amber-700' },
    { id: 'CK2', label: 'CK2', fullLabel: 'Cuá»‘i Há»c KÃ¬ 2', badge: 'bg-purple-100 text-purple-800 border-purple-200', border: 'border-purple-500', bg: 'bg-purple-50/60', text: 'text-purple-700' },
    { id: 'KHAC', label: 'KhÃ¡c', fullLabel: 'BTVN / ThÆ°á»ng XuyÃªn', badge: 'bg-slate-100 text-slate-700 border-slate-200', border: 'border-slate-400', bg: 'bg-slate-50/60', text: 'text-slate-600' },
  ]

  // HÃ m tá»± Ä‘á»™ng nháº­n diá»‡n thÆ° má»¥c hoáº·c láº¥y thÆ° má»¥c Ä‘Ã£ Ä‘Æ°á»£c gÃ¡n
  const getExamFolder = (exam: any): 'GK1' | 'CK1' | 'GK2' | 'CK2' | 'KHAC' => {
    const custom = exam?.data?.folder || exam?.data?.category
    if (custom && ['GK1', 'CK1', 'GK2', 'CK2', 'KHAC'].includes(custom)) {
      return custom
    }
    const t = (exam?.title || '').toLowerCase()
    if (/(gk\s*1|giá»¯a\s*k[Ã¬á»³]\s*1|gk\s*i|giá»¯a\s*k[Ã¬á»³]\s*i|on\s*gk\s*mot|Ã´n\s*gk|gk1)/.test(t)) return 'GK1'
    if (/(ck\s*1|cuá»‘i\s*k[Ã¬á»³]\s*1|ck\s*i|cuá»‘i\s*k[Ã¬á»³]\s*i|há»c\s*k[Ã¬á»³]\s*1|ck1)/.test(t)) return 'CK1'
    if (/(gk\s*2|giá»¯a\s*k[Ã¬á»³]\s*2|gk\s*ii|giá»¯a\s*k[Ã¬á»³]\s*ii|gk2)/.test(t)) return 'GK2'
    if (/(ck\s*2|cuá»‘i\s*k[Ã¬á»³]\s*2|ck\s*ii|cuá»‘i\s*k[Ã¬á»³]\s*ii|há»c\s*k[Ã¬á»³]\s*2|ck2)/.test(t)) return 'CK2'
    return 'KHAC'
  }

  // Chuyá»ƒn Ä‘á» thi vÃ o thÆ° má»¥c
  const handleMoveToFolder = async (exam: any, targetFolder: 'GK1' | 'CK1' | 'GK2' | 'CK2' | 'KHAC') => {
    const toastId = toast.loading(`Äang lÆ°u Ä‘á» vÃ o thÆ° má»¥c ${targetFolder}...`)
    try {
      const curData = exam.data || {}
      const updatedData = { ...curData, folder: targetFolder }
      const { error } = await supabase
        .from('exams')
        .update({ data: updatedData })
        .eq('id', exam.id)
      if (error) throw error
      toast.success(`ÄÃ£ lÆ°u Ä‘á» vÃ o thÆ° má»¥c ${targetFolder}!`, { id: toastId })
      await loadExams()
    } catch (err: any) {
      toast.error(`Lá»—i chuyá»ƒn thÆ° má»¥c: ${err.message}`, { id: toastId })
    }
  }

  const handleRenameExam = async (id: string) => {
    if (!editingExamTitle.trim()) {
      toast.error('TÃªn Ä‘á» thi khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng')
      return
    }
    setSavingRename(true)
    const toastId = toast.loading('Äang Ä‘á»•i tÃªn Ä‘á» thi...')
    try {
      const { error } = await supabase
        .from('exams')
        .update({ title: editingExamTitle.trim() })
        .eq('id', id)

      if (error) throw error

      toast.success('Äá»•i tÃªn Ä‘á» thi thÃ nh cÃ´ng!', { id: toastId })
      setEditingExamId(null)
      await loadExams()
    } catch (err: any) {
      toast.error('Lá»—i khi Ä‘á»•i tÃªn: ' + err.message, { id: toastId })
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
    const toastId = toast.loading('Äang phÃ¢n tÃ­ch file Word...')
    
    try {
      const examData = await parseWordToExam(file)
      
      // Tá»± Ä‘á»™ng táº¡o cáº¥u hÃ¬nh Ä‘iá»ƒm máº·c Ä‘á»‹nh
      examData.pointsConfig = createDefaultPointsConfig(examData.questions)
      examData.folder = targetUploadFolder

      toast.loading('Äang lÆ°u lÃªn Supabase...', { id: toastId })
      const title = file.name.replace(/\.docx$/i, '')
      await createExam(examData, title)

      toast.success('Táº£i Ä‘á» thi thÃ nh cÃ´ng!', { id: toastId })
    } catch (error: any) {
      toast.error(`Lá»—i: ${error.message || 'KhÃ´ng thá»ƒ Ä‘á»c file Word'}`, { id: toastId })
    } finally {
      setUploading(false)
      if (e.target) e.target.value = '' 
    }
  }

  const handleTexUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const toastId = toast.loading('Äang khá»Ÿi Ä‘á»™ng tiáº¿n trÃ¬nh Ä‘á»c LaTeX...')
    
    try {
      const fileText = await file.text()
      const examData = await parseTexToExam(file, (msg) => {
        toast.loading(msg, { id: toastId })
      })
      
      // Tá»± Ä‘á»™ng táº¡o cáº¥u hÃ¬nh Ä‘iá»ƒm máº·c Ä‘á»‹nh
      examData.pointsConfig = createDefaultPointsConfig(examData.questions)
      examData.originalTex = fileText

      toast.loading('Äang lÆ°u lÃªn Supabase...', { id: toastId })
      const title = file.name.replace(/\.tex$/i, '')
      await createExam(examData, title)

      toast.success('Táº£i Ä‘á» thi LaTeX thÃ nh cÃ´ng!', { id: toastId })
    } catch (error: any) {
      toast.error(`Lá»—i: ${error.message || 'KhÃ´ng thá»ƒ Ä‘á»c file LaTeX'}`, { id: toastId })
    } finally {
      setUploading(false)
      if (e.target) e.target.value = '' 
    }
  }

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Báº¡n cÃ³ cháº¯c muá»‘n xÃ³a Ä‘á»: ${title}?`)) return
    try {
      await deleteExam(id)
      toast.success('ÄÃ£ xÃ³a Ä‘á» thi')
    } catch (e) {
      toast.error('Lá»—i khi xÃ³a')
    }
  }

  const handlePreview = async (id: string, title: string) => {
    setPreviewing(id)
    const toastId = toast.loading('Äang táº£i dá»¯ liá»‡u Ä‘á» thi...')
    try {
      const data = await getExamData(id)
      setPreviewData({ id, title, ...data })
      toast.success('Táº£i thÃ nh cÃ´ng', { id: toastId })
    } catch (e) {
      toast.error('Lá»—i táº£i Ä‘á» thi', { id: toastId })
    } finally {
      setPreviewing(null)
    }
  }

  const handleOpenConfig = async (id: string, title: string) => {
    const toastId = toast.loading('Äang táº£i cáº¥u hÃ¬nh...')
    try {
      const data = await getExamData(id)
      const config = data.pointsConfig || createDefaultPointsConfig(data.questions || [])
      setConfigExam({ id, title, data, config })
      toast.success('ÄÃ£ táº£i', { id: toastId })
    } catch (e) {
      toast.error('Lá»—i táº£i cáº¥u hÃ¬nh', { id: toastId })
    }
  }

  const startEditing = (q: any) => {
    setEditingQuestionId(q.number)
    setEditForm(JSON.parse(JSON.stringify(q)))
  }

  const saveQuestionEdit = async () => {
    if (!editForm) return
    setSavingEdit(true)
    const toastId = toast.loading('Äang lÆ°u thay Ä‘á»•i...')

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
      delete newExamPayload.pdfUrl
      delete newExamPayload.pdfDriveUrl
      delete newExamPayload.pdfBase64

      const { error } = await supabase
        .from('exams')
        .update({ data: newExamPayload })
        .eq('id', previewData.id)

      if (error) throw error

      setPreviewData((prev: any) => {
        const next = {
          ...prev,
          questions: updatedQuestions,
          answers: updatedAnswers
        }
        delete next.pdfUrl
        delete next.pdfDriveUrl
        delete next.pdfBase64
        return next
      })
      
      setEditingQuestionId(null)
      setEditForm(null)
      await loadExams() // Refresh list state to reflect PDF cache deletion
      toast.success('ÄÃ£ cáº­p nháº­t cÃ¢u há»i thÃ nh cÃ´ng!', { id: toastId })
    } catch (err: any) {
      toast.error('Lá»—i khi lÆ°u cÃ¢u há»i: ' + err.message, { id: toastId })
    } finally {
      setSavingEdit(false)
    }
  }

  const getExamGrade = (title: string) => {
    const t = title.toLowerCase()
    if (t.includes('lá»›p 12') || t.includes('khá»‘i 12') || t.includes('toÃ¡n 12') || t.includes('khá»‘i mÆ°á»i hai') || /\b(khá»‘i\s+)?12\b/.test(t)) return 12
    if (t.includes('lá»›p 11') || t.includes('khá»‘i 11') || t.includes('toÃ¡n 11') || t.includes('khá»‘i mÆ°á»i má»™t') || /\b(khá»‘i\s+)?11\b/.test(t)) return 11
    if (t.includes('lá»›p 10') || t.includes('khá»‘i 10') || t.includes('toÃ¡n 10') || t.includes('khá»‘i mÆ°á»i') || /\b(khá»‘i\s+)?10\b/.test(t)) return 10
    if (t.includes('lá»›p 6') || t.includes('khá»‘i 6') || t.includes('toÃ¡n 6') || t.includes('khá»‘i sÃ¡u') || /\b(khá»‘i\s+)?6\b/.test(t)) return 6
    if (t.includes('lá»›p 7') || t.includes('khá»‘i 7') || t.includes('toÃ¡n 7') || t.includes('khá»‘i báº£y') || /\b(khá»‘i\s+)?7\b/.test(t)) return 7
    if (t.includes('lá»›p 8') || t.includes('khá»‘i 8') || t.includes('toÃ¡n 8') || t.includes('khá»‘i tÃ¡m') || /\b(khá»‘i\s+)?8\b/.test(t)) return 8
    if (t.includes('lá»›p 9') || t.includes('khá»‘i 9') || t.includes('toÃ¡n 9') || t.includes('khá»‘i chÃ­n') || /\b(khá»‘i\s+)?9\b/.test(t)) return 9
    return null
  }

  const grades = [6, 7, 8, 9, 10, 11, 12]

  const examsByGrade: Record<number | string, typeof exams> = {
    6: exams.filter(e => getExamGrade(e.title) === 6),
    7: exams.filter(e => getExamGrade(e.title) === 7),
    8: exams.filter(e => getExamGrade(e.title) === 8),
    9: exams.filter(e => getExamGrade(e.title) === 9),
    10: exams.filter(e => getExamGrade(e.title) === 10),
    11: exams.filter(e => getExamGrade(e.title) === 11),
    12: exams.filter(e => getExamGrade(e.title) === 12),
    others: exams.filter(e => {
      const g = getExamGrade(e.title)
      return g === null
    })
  }

  let globalQuestionNumber = 1

  // Tháº» hiá»ƒn thá»‹ má»™t Ä‘á» thi (Exam Card) cÃ³ gáº¯n nhÃ£n ThÆ° má»¥c & dropdown chuyá»ƒn thÆ° má»¥c
  const renderExamCard = (exam: any) => {
    const folder = getExamFolder(exam)
    const folderInfo = FOLDER_DEFS.find(f => f.id === folder) || FOLDER_DEFS[4]

    return (
      <div 
        key={exam.id} 
        className="bg-white p-3.5 rounded-xl border border-gray-150 hover:border-teal-300 hover:shadow-md transition-all duration-200 group flex flex-col justify-between"
      >
        <div>
          {editingExamId === exam.id ? (
            <div className="flex gap-1 items-center mb-1.5">
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
                title="LÆ°u"
              >
                <Save className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => setEditingExamId(null)}
                disabled={savingRename}
                className="p-1 text-gray-500 hover:bg-gray-50 rounded flex-shrink-0"
                title="Há»§y"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-1 group/title mb-1.5">
              <h4 className="font-bold text-slate-800 text-sm leading-snug line-clamp-2" title={exam.title}>
                {exam.title}
              </h4>
              <button 
                onClick={() => { setEditingExamId(exam.id); setEditingExamTitle(exam.title); }}
                className="p-0.5 text-gray-400 hover:text-teal-600 rounded opacity-0 group-hover/title:opacity-100 transition-opacity flex-shrink-0"
                title="Äá»•i tÃªn Ä‘á»"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="flex items-center justify-between text-[11px] text-gray-400 mb-2">
            <span>{fmt(new Date(exam.created_at), 'dd/MM/yyyy HH:mm')}</span>
            
            {/* Tag thÆ° má»¥c & Dropdown chuyá»ƒn nhanh thÆ° má»¥c */}
            <div className="flex items-center gap-1">
              <select
                value={folder}
                onChange={(e) => handleMoveToFolder(exam, e.target.value as any)}
                className={`text-[10.5px] font-bold px-2 py-0.5 rounded-md border ${folderInfo.badge} outline-none cursor-pointer transition-colors shadow-2xs hover:opacity-90`}
                title="Báº¥m Ä‘á»ƒ chuyá»ƒn thÆ° má»¥c (GK1, CK1, GK2, CK2, KhÃ¡c)"
              >
                <option value="GK1">ðŸ“ GK1 (Giá»¯a kÃ¬ 1)</option>
                <option value="CK1">ðŸ“ CK1 (Cuá»‘i kÃ¬ 1)</option>
                <option value="GK2">ðŸ“ GK2 (Giá»¯a kÃ¬ 2)</option>
                <option value="CK2">ðŸ“ CK2 (Cuá»‘i kÃ¬ 2)</option>
                <option value="KHAC">ðŸ“ KhÃ¡c / BTVN</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Thanh nÃºt cÃ´ng cá»¥ hÃ nh Ä‘á»™ng */}
        <div className="flex justify-end gap-1.5 pt-2 border-t border-gray-100">
          <button 
            onClick={() => handleViewPdf(exam)}
            disabled={compilingId === exam.id}
            className="p-1 text-rose-500 hover:bg-rose-50 rounded transition-colors"
            title="Äá»c PDF"
          >
            {compilingId === exam.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
          </button>
          <button 
            onClick={() => handleDownloadTex(exam.id, exam.title)}
            disabled={downloadingId === exam.id}
            className="p-1 text-teal-600 hover:bg-teal-50 rounded transition-colors"
            title="Táº£i file LaTeX (.tex)"
          >
            {downloadingId === exam.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          </button>
          <button 
            onClick={() => handleGenerateSimilarExam(exam)}
            disabled={generatingSimilarId === exam.id}
            className="p-1 text-purple-600 hover:bg-purple-50 rounded transition-colors"
            title="Táº¡o Ä‘á» tÆ°Æ¡ng tá»± (AI)"
          >
            {generatingSimilarId === exam.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          </button>
          <button 
            onClick={() => handleOpenConfig(exam.id, exam.title)}
            className="p-1 text-orange-500 hover:bg-orange-50 rounded transition-colors"
            title="Cáº¥u hÃ¬nh Ä‘iá»ƒm"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button 
            onClick={() => handlePreview(exam.id, exam.title)}
            disabled={previewing === exam.id}
            className="p-1 text-blue-500 hover:bg-blue-50 rounded transition-colors"
            title="Xem trÆ°á»›c & Chá»‰nh sá»­a"
          >
            {previewing === exam.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
          </button>
          <button 
            onClick={() => handleDelete(exam.id, exam.title)}
            className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
            title="XÃ³a Ä‘á» thi"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  // Lá»c Ä‘á» thi theo tÃ¬m kiáº¿m
  const filterBySearch = (list: any[]) => {
    if (!searchTerm.trim()) return list
    const q = searchTerm.toLowerCase().trim()
    return list.filter(e => (e.title || '').toLowerCase().includes(q))
  }

  return (
    <div className="space-y-6">
      {/* 1. Header Trang & Thanh cÃ´ng cá»¥ Táº£i lÃªn */}
      <div className="page-header flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="section-title flex items-center gap-2.5 text-2xl font-extrabold text-slate-800">
            <FileText className="w-7 h-7 text-teal-600" /> NgÃ¢n hÃ ng Ä‘á» thi
          </h1>
          <p className="text-gray-500 text-xs mt-1">
            Bá»‘ trÃ­ Ä‘á» thi theo tá»«ng Khá»‘i lá»›p vÃ  4 thÆ° má»¥c ká»³ thi: <span className="font-bold text-blue-600">GK1</span>, <span className="font-bold text-emerald-600">CK1</span>, <span className="font-bold text-amber-600">GK2</span>, <span className="font-bold text-purple-600">CK2</span>
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Ã” tÃ¬m kiáº¿m Ä‘á» */}
          <div className="relative flex-1 md:w-56">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="TÃ¬m kiáº¿m Ä‘á» thi..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-7 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
              >
                âœ•
              </button>
            )}
          </div>

          {/* Chá»n thÆ° má»¥c má»¥c tiÃªu khi táº£i lÃªn */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200 text-xs">
            <Folder className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
            <span className="text-[11px] font-semibold text-gray-500">LÆ°u vÃ o:</span>
            <select
              value={targetUploadFolder}
              onChange={(e) => setTargetUploadFolder(e.target.value as any)}
              className="bg-white border border-teal-200 text-teal-800 font-bold rounded-lg px-2 py-1 text-xs outline-none cursor-pointer shadow-2xs"
            >
              <option value="GK1">ðŸ“ GK1</option>
              <option value="CK1">ðŸ“ CK1</option>
              <option value="GK2">ðŸ“ GK2</option>
              <option value="CK2">ðŸ“ CK2</option>
              <option value="KHAC">ðŸ“ KhÃ¡c</option>
            </select>
          </div>

          {/* NÃºt táº£i file Word / TeX */}
          <div className="flex gap-2">
            <label className={`btn-teal flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl cursor-pointer shadow-xs transition-all ${uploading ? 'opacity-70 pointer-events-none' : ''}`}>
              {uploading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FileUp className="w-3.5 h-3.5" />}
              {uploading ? 'Äang Ä‘á»c...' : 'Táº£i Word'}
              <input type="file" accept=".docx" className="hidden" onChange={handleFileUpload} disabled={uploading} />
            </label>
            <label 
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white rounded-xl cursor-pointer shadow-xs transition-all hover:opacity-95 ${uploading ? 'opacity-70 pointer-events-none' : ''}`}
              style={{ background: 'linear-gradient(135deg, #6d28d9, #7c3aed)' }}
            >
              {uploading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FileUp className="w-3.5 h-3.5" />}
              {uploading ? 'Äang Ä‘á»c...' : 'Táº£i LaTeX'}
              <input type="file" accept=".tex" className="hidden" onChange={handleTexUpload} disabled={uploading} />
            </label>
          </div>
        </div>
      </div>

      {/* 2. Thanh Chá»n Khá»‘i Lá»›p (Grade Selector Bar) */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-2 overflow-x-auto custom-scrollbar">
        <button
          onClick={() => { setSelectedGrade('all'); setActiveFolderTab('all'); }}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 flex-shrink-0 ${
            selectedGrade === 'all'
              ? 'bg-teal-700 text-white shadow-md shadow-teal-700/20'
              : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Táº¥t cáº£ cÃ¡c khá»‘i</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${selectedGrade === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
            {exams.length}
          </span>
        </button>

        <div className="h-6 w-px bg-slate-200 mx-1 flex-shrink-0" />

        {grades.map(grade => {
          const list = examsByGrade[grade] || []
          const isSelected = selectedGrade === grade
          return (
            <button
              key={grade}
              onClick={() => { setSelectedGrade(grade); setActiveFolderTab('all'); }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 flex-shrink-0 ${
                isSelected
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <span>Khá»‘i {grade}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
                {list.length}
              </span>
            </button>
          )
        })}

        {examsByGrade.others.length > 0 && (
          <button
            onClick={() => { setSelectedGrade('others'); setActiveFolderTab('all'); }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 flex-shrink-0 ${
              selectedGrade === 'others'
                ? 'bg-slate-700 text-white shadow-md shadow-slate-700/20'
                : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <span>ChÆ°a phÃ¢n loáº¡i</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${selectedGrade === 'others' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'}`}>
              {examsByGrade.others.length}
            </span>
          </button>
        )}
      </div>

      {/* 3. HIá»‚N THá»Š Ná»˜I DUNG THEO 2 CHáº¾ Äá»˜ */}

      {/* CHáº¾ Äá»˜ A: CHá»ŒN Má»˜T KHá»I Cá»¤ THá»‚ -> HIá»‚N THá»Š 4 THÆ¯ Má»¤C Lá»šN (GK1, CK1, GK2, CK2, KHÃC) */}
      {selectedGrade !== 'all' ? (
        (() => {
          const currentList = selectedGrade === 'others' ? examsByGrade.others : (examsByGrade[selectedGrade] || [])
          const gradeTitle = selectedGrade === 'others' ? 'Äá» thi chÆ°a phÃ¢n loáº¡i khá»‘i' : `Khá»‘i ${selectedGrade}`
          
          // PhÃ¢n nhÃ³m Ä‘á» trong khá»‘i theo 4 thÆ° má»¥c
          const folderGroups: Record<'GK1' | 'CK1' | 'GK2' | 'CK2' | 'KHAC', any[]> = {
            GK1: currentList.filter(e => getExamFolder(e) === 'GK1'),
            CK1: currentList.filter(e => getExamFolder(e) === 'CK1'),
            GK2: currentList.filter(e => getExamFolder(e) === 'GK2'),
            CK2: currentList.filter(e => getExamFolder(e) === 'CK2'),
            KHAC: currentList.filter(e => getExamFolder(e) === 'KHAC'),
          }

          // Lá»c theo folder tab Ä‘ang chá»n
          const displayedList = activeFolderTab === 'all' ? currentList : folderGroups[activeFolderTab]
          const filteredExams = filterBySearch(displayedList)

          return (
            <div className="space-y-6">
              {/* 4 Tháº» ThÆ° Má»¥c Lá»›n Trá»±c Quan */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                {/* Tháº» Táº¥t cáº£ */}
                <div 
                  onClick={() => setActiveFolderTab('all')}
                  className={`cursor-pointer p-4 rounded-2xl border-2 transition-all flex flex-col justify-between ${
                    activeFolderTab === 'all'
                      ? 'border-teal-500 bg-teal-50/70 shadow-md ring-2 ring-teal-500/20'
                      : 'border-slate-200 bg-white hover:border-teal-300 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="p-2 rounded-xl bg-teal-100 text-teal-700">
                      <FolderOpen className="w-5 h-5" />
                    </span>
                    <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                      {currentList.length} Ä‘á»
                    </span>
                  </div>
                  <div className="mt-3">
                    <h4 className="font-bold text-slate-800 text-sm">Táº¥t cáº£ Ä‘á» thi</h4>
                    <p className="text-[11px] text-gray-400 mt-0.5">ToÃ n bá»™ {gradeTitle}</p>
                  </div>
                </div>

                {/* 4 ThÆ° má»¥c ká»³ thi + KhÃ¡c */}
                {FOLDER_DEFS.map(folder => {
                  const count = folderGroups[folder.id].length
                  const isActive = activeFolderTab === folder.id

                  return (
                    <div 
                      key={folder.id}
                      onClick={() => setActiveFolderTab(folder.id)}
                      className={`cursor-pointer p-4 rounded-2xl border-2 transition-all flex flex-col justify-between ${
                        isActive
                          ? `${folder.border} ${folder.bg} shadow-md ring-2 ring-teal-500/20`
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`p-2 rounded-xl ${folder.badge}`}>
                          <Folder className="w-5 h-5" />
                        </span>
                        <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full ${folder.badge}`}>
                          {count} Ä‘á»
                        </span>
                      </div>
                      <div className="mt-3">
                        <div className="flex items-center gap-1.5">
                          <h4 className={`font-bold text-sm ${folder.text}`}>{folder.label}</h4>
                          <span className="text-[10px] text-gray-400 font-medium">({folder.fullLabel})</span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-0.5">ThÆ° má»¥c Ä‘á» thi {folder.label}</p>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Danh sÃ¡ch Ä‘á» thi trong khá»‘i & thÆ° má»¥c Ä‘ang chá»n */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                      <FolderOpen className="w-5 h-5 text-teal-600" />
                      {gradeTitle} / {activeFolderTab === 'all' ? 'Táº¥t cáº£ thÆ° má»¥c' : `ThÆ° má»¥c ${activeFolderTab}`}
                    </span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {filteredExams.length} Ä‘á» thi
                    </span>
                  </div>

                  <button
                    onClick={() => setSelectedGrade('all')}
                    className="text-xs font-bold text-teal-600 hover:text-teal-700 hover:underline flex items-center gap-1"
                  >
                    Xem táº¥t cáº£ khá»‘i â†’
                  </button>
                </div>

                {filteredExams.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 text-xs italic bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                    ChÆ°a cÃ³ Ä‘á» thi nÃ o trong thÆ° má»¥c nÃ y. Báº¡n hÃ£y táº£i Ä‘á» lÃªn hoáº·c gÃ¡n Ä‘á» tá»« cÃ¡c thÆ° má»¥c khÃ¡c.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredExams.map(exam => renderExamCard(exam))}
                  </div>
                )}
              </div>
            </div>
          )
        })()
      ) : (
        /* CHáº¾ Äá»˜ B: Táº¤T Cáº¢ CÃC KHá»I (LÆ¯á»šI 7 Cá»˜T KHá»I Vá»šI Bá»˜ Lá»ŒC 4 THÆ¯ Má»¤C TRÃŠN Tá»ªNG Cá»˜T) */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {grades.map(grade => {
            const rawList = examsByGrade[grade] || []
            const activeColFolder = columnFolders[grade] || 'all'

            // Lá»c theo folder cá»§a tá»«ng cá»™t
            const listByFolder = activeColFolder === 'all' 
              ? rawList 
              : rawList.filter(e => getExamFolder(e) === activeColFolder)
            const list = filterBySearch(listByFolder)

            // Äáº¿m sá»‘ lÆ°á»£ng tá»«ng folder trong khá»‘i nÃ y
            const counts = {
              all: rawList.length,
              GK1: rawList.filter(e => getExamFolder(e) === 'GK1').length,
              CK1: rawList.filter(e => getExamFolder(e) === 'CK1').length,
              GK2: rawList.filter(e => getExamFolder(e) === 'GK2').length,
              CK2: rawList.filter(e => getExamFolder(e) === 'CK2').length,
              KHAC: rawList.filter(e => getExamFolder(e) === 'KHAC').length,
            }

            const themeMap: Record<number, { border: string; text: string; badge: string; tabActive: string }> = {
              6: { border: 'border-blue-500', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-800', tabActive: 'bg-blue-600 text-white' },
              7: { border: 'border-emerald-500', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-800', tabActive: 'bg-emerald-600 text-white' },
              8: { border: 'border-orange-500', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-800', tabActive: 'bg-orange-600 text-white' },
              9: { border: 'border-purple-500', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-800', tabActive: 'bg-purple-600 text-white' },
              10: { border: 'border-pink-500', text: 'text-pink-700', badge: 'bg-pink-100 text-pink-800', tabActive: 'bg-pink-600 text-white' },
              11: { border: 'border-indigo-500', text: 'text-indigo-700', badge: 'bg-indigo-100 text-indigo-800', tabActive: 'bg-indigo-600 text-white' },
              12: { border: 'border-rose-500', text: 'text-rose-700', badge: 'bg-rose-100 text-rose-800', tabActive: 'bg-rose-600 text-white' },
            }
            const theme = themeMap[grade]

            return (
              <div key={grade} className={`flex flex-col rounded-2xl border-t-4 ${theme.border} bg-white shadow-sm overflow-hidden min-h-[460px]`}>
                {/* Header cá»§a cá»™t */}
                <div className="px-4 py-3 bg-gray-50/90 border-b border-gray-100 flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <button 
                      onClick={() => setSelectedGrade(grade)} 
                      className={`font-bold text-base hover:underline ${theme.text}`}
                      title="Báº¥m Ä‘á»ƒ phÃ³ng to xem riÃªng khá»‘i nÃ y"
                    >
                      Khá»‘i {grade}
                    </button>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400 cursor-pointer" onClick={() => setSelectedGrade(grade)} />
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${theme.badge}`}>
                    {rawList.length} Ä‘á»
                  </span>
                </div>

                {/* 4 ThÆ° Má»¥c Tabs (GK1, CK1, GK2, CK2) DÆ°á»›i Header */}
                <div className="p-2 bg-slate-50/70 border-b border-slate-100 flex items-center gap-1 overflow-x-auto scrollbar-none text-[10.5px]">
                  <button
                    onClick={() => setColumnFolders(prev => ({ ...prev, [grade]: 'all' }))}
                    className={`px-2 py-1 rounded-md font-bold transition-all flex-shrink-0 ${
                      activeColFolder === 'all'
                        ? 'bg-slate-700 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    Táº¥t cáº£ ({counts.all})
                  </button>

                  <button
                    onClick={() => setColumnFolders(prev => ({ ...prev, [grade]: 'GK1' }))}
                    className={`px-2 py-1 rounded-md font-bold transition-all flex-shrink-0 ${
                      activeColFolder === 'GK1'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-blue-50/80 text-blue-700 hover:bg-blue-100 border border-blue-200'
                    }`}
                  >
                    GK1 ({counts.GK1})
                  </button>

                  <button
                    onClick={() => setColumnFolders(prev => ({ ...prev, [grade]: 'CK1' }))}
                    className={`px-2 py-1 rounded-md font-bold transition-all flex-shrink-0 ${
                      activeColFolder === 'CK1'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-emerald-50/80 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                    }`}
                  >
                    CK1 ({counts.CK1})
                  </button>

                  <button
                    onClick={() => setColumnFolders(prev => ({ ...prev, [grade]: 'GK2' }))}
                    className={`px-2 py-1 rounded-md font-bold transition-all flex-shrink-0 ${
                      activeColFolder === 'GK2'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-amber-50/80 text-amber-700 hover:bg-amber-100 border border-amber-200'
                    }`}
                  >
                    GK2 ({counts.GK2})
                  </button>

                  <button
                    onClick={() => setColumnFolders(prev => ({ ...prev, [grade]: 'CK2' }))}
                    className={`px-2 py-1 rounded-md font-bold transition-all flex-shrink-0 ${
                      activeColFolder === 'CK2'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'bg-purple-50/80 text-purple-700 hover:bg-purple-100 border border-purple-200'
                    }`}
                  >
                    CK2 ({counts.CK2})
                  </button>

                  {counts.KHAC > 0 && (
                    <button
                      onClick={() => setColumnFolders(prev => ({ ...prev, [grade]: 'KHAC' }))}
                      className={`px-2 py-1 rounded-md font-bold transition-all flex-shrink-0 ${
                        activeColFolder === 'KHAC'
                          ? 'bg-slate-600 text-white shadow-xs'
                          : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      KhÃ¡c ({counts.KHAC})
                    </button>
                  )}
                </div>

                {/* Danh sÃ¡ch Ä‘á» thi */}
                <div className="p-3 flex-1 space-y-3 overflow-y-auto max-h-[600px] custom-scrollbar bg-slate-50/30">
                  {loading && list.length === 0 && exams.length === 0 ? (
                    <div className="flex justify-center items-center h-32">
                      <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
                    </div>
                  ) : list.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-xs italic">
                      {activeColFolder === 'all' ? 'ChÆ°a cÃ³ Ä‘á» thi' : `ChÆ°a cÃ³ Ä‘á» trong thÆ° má»¥c ${activeColFolder}`}
                    </div>
                  ) : (
                    list.map(exam => renderExamCard(exam))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Äá» thi khÃ¡c (náº¿u cÃ³ vÃ  á»Ÿ cháº¿ Ä‘á»™ xem táº¥t cáº£) */}
      {selectedGrade === 'all' && examsByGrade.others.length > 0 && (
        <div className="mt-8 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm text-slate-700 uppercase tracking-wider">Äá» thi chÆ°a phÃ¢n loáº¡i khá»‘i</h3>
              <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {examsByGrade.others.length} Ä‘á»
              </span>
            </div>
            <button 
              onClick={() => setSelectedGrade('others')}
              className="text-xs text-teal-600 font-bold hover:underline"
            >
              Xem chi tiáº¿t â†’
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filterBySearch(examsByGrade.others).map(exam => renderExamCard(exam))}
          </div>
        </div>
      )}

{/* âœ… MODAL Cáº¤U HÃŒNH ÄIá»‚M (ÄÃ£ sá»­a size thÃ nh 3xl) */}
      <Modal open={!!configExam} onClose={() => setConfigExam(null)} title="" size="3xl" >
        {configExam && (
          <div className="-m-6">
            <PointsConfigEditor
              config={configExam.config}
              onChange={async (newConfig) => {
                const newData = { ...configExam.data, pointsConfig: newConfig };
                await supabase.from('exams').update({ data: newData }).eq('id', configExam.id);
                toast.success('LÆ°u cáº¥u hÃ¬nh Ä‘iá»ƒm thÃ nh cÃ´ng!');
                setConfigExam(null);
              }}
              onClose={() => setConfigExam(null)}
            />
          </div>
        )}
      </Modal>

      {/* âœ… MODAL XEM TRÆ¯á»šC VÃ€ CHá»ˆNH Sá»¬A Äá»€ THI */}
      <Modal open={!!previewData} onClose={() => { if(!savingEdit) setPreviewData(null); setEditingQuestionId(null); }} title={`Xem trÆ°á»›c & BiÃªn táº­p: ${previewData?.title}`} size="3xl">
        <div className="space-y-8 max-h-[75vh] overflow-y-auto pr-2 bg-gray-50 p-4 rounded-xl">
          
          {[1, 2, 3, 4].map(part => {
            const questionsInPart = previewData?.questions?.filter((q: any) => {
              const qPart = typeof q.part === 'string' ? parseInt(q.part.replace(/\D/g, '')) : q.part;
              return qPart === part;
            }) || [];

            if (questionsInPart.length === 0) return null;

            const partTitles: Record<number, { title: string, desc: string, color: string }> = {
              1: { title: 'PHáº¦N 1. TRáº®C NGHIá»†M NHIá»€U Lá»°A CHá»ŒN', desc: 'Má»—i cÃ¢u chá»n 1 Ä‘Ã¡p Ã¡n Ä‘Ãºng (A, B, C, D)', color: 'bg-blue-600' },
              2: { title: 'PHáº¦N 2. TRáº®C NGHIá»†M ÄÃšNG/SAI', desc: 'Chá»n ÄÃºng hoáº·c Sai cho má»—i Ã½ a, b, c, d', color: 'bg-emerald-600' },
              3: { title: 'PHáº¦N 3. TRáº¢ Lá»œI NGáº®N', desc: 'Äiá»n Ä‘Ã¡p Ã¡n sá»‘ vÃ o Ã´ trá»‘ng', color: 'bg-orange-600' },
              4: { title: 'PHáº¦N 4. Tá»° LUáº¬N', desc: 'TrÃ¬nh bÃ y lá»i giáº£i chi tiáº¿t', color: 'bg-violet-600' }
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
                      
                      {/* TiÃªu Ä‘á» & NÃºt thao tÃ¡c cÃ¢u há»i */}
                      <div className="flex justify-between items-start mb-4 border-b border-gray-50 pb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-teal-100 text-teal-700 font-bold rounded-full flex items-center justify-center flex-shrink-0">
                            {displayQNum}
                          </div>
                          <span className="text-xs text-gray-400 font-mono">ID: {q.number}</span>
                        </div>
                        
                        {/* NÃºt sá»­a / lÆ°u */}
                        {!isEditingThis ? (
                          <button 
                            onClick={() => startEditing(q)}
                            className="btn-outline py-1.5 px-3 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-300 transition-all"
                          >
                            <Edit2 className="w-3.5 h-3.5" /> Sá»­a cÃ¢u nÃ y
                          </button>
                        ) : (
                          <div className="flex gap-2">
                            <button 
                              onClick={saveQuestionEdit}
                              disabled={savingEdit}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white py-1.5 px-3.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all shadow-sm"
                            >
                              <Save className="w-3.5 h-3.5" /> {savingEdit ? 'Äang lÆ°u...' : 'LÆ°u'}
                            </button>
                            <button 
                              onClick={() => { setEditingQuestionId(null); setEditForm(null); }}
                              disabled={savingEdit}
                              className="bg-gray-200 hover:bg-gray-300 text-gray-700 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
                            >
                              <X className="w-3.5 h-3.5" /> Há»§y
                            </button>
                          </div>
                        )}
                      </div>

                      {/* CHáº¾ Äá»˜ XEM THÆ¯á»œNG */}
                      {!isEditingThis ? (
                        <div className="space-y-4">
                          <div className="pl-12">
                            <MathText html={q.text} block className="text-gray-800 font-medium text-base leading-relaxed" />
                            {q.images?.map((img: any, idx: number) => (
                              <img 
                                key={idx} 
                                src={img.base64 ? `data:${img.contentType || 'image/png'};base64,${img.base64}` : `data:image/png;base64,${img.data}`} 
                                className="max-h-64 mt-3 rounded-lg border border-gray-200 shadow-sm" 
                                alt={`áº¢nh cÃ¢u ${displayQNum}`} 
                              />
                            ))}
                          </div>

                          {/* PhÆ°Æ¡ng Ã¡n Pháº§n 1 (Tráº¯c nghiá»‡m thÆ°á»ng) */}
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

                          {/* PhÆ°Æ¡ng Ã¡n Pháº§n 2 (ÄÃºng / Sai) */}
                          {part === 2 && q.options && q.options.length > 0 && (
                            <div className="pl-12">
                              <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                                <div className="grid grid-cols-[1fr_80px_80px] bg-slate-100 border-b border-gray-200 text-xs font-bold text-gray-500 text-center uppercase tracking-wider">
                                  <div className="py-2.5 px-4 text-left">Má»‡nh Ä‘á»</div>
                                  <div className="py-2.5 border-l border-gray-200 text-emerald-700 bg-emerald-50/50">ÄÃºng</div>
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
                                          {isTrue ? <span className="font-bold text-sm">âœ“</span> : <span className="w-3 h-3 border border-gray-300 rounded-full bg-white"></span>}
                                        </div>
                                        <div className={`border-l border-gray-200 flex items-center justify-center ${!isTrue ? 'bg-red-500 text-white' : ''}`}>
                                          {!isTrue ? <span className="font-bold text-sm">âœ•</span> : <span className="w-3 h-3 border border-gray-300 rounded-full bg-white"></span>}
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* PhÆ°Æ¡ng Ã¡n Pháº§n 3 (Tráº£ lá»i ngáº¯n) */}
                          {part === 3 && q.correctAnswer && (
                            <div className="pl-12">
                              <div className="inline-block bg-orange-50 border border-orange-200 rounded-lg px-4 py-2">
                                <span className="text-orange-800 font-bold text-sm">ÄÃ¡p Ã¡n: </span>
                                <span className="text-orange-900 font-bold text-lg ml-1">{q.correctAnswer}</span>
                              </div>
                            </div>
                          )}

                          {/* Lá»i giáº£i chi tiáº¿t */}
                          {q.solution && (
                            <div className="pl-12">
                              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                                <span className="font-bold text-slate-700 text-sm block mb-2">ðŸ’¡ Lá»i giáº£i chi tiáº¿t:</span>
                                <MathText html={q.solution} className="text-sm text-slate-700 leading-relaxed" block />
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        // CHáº¾ Äá»˜ CHá»ˆNH Sá»¬A TRá»°C TIáº¾P
                        <div className="space-y-4 pl-4 border-l-4 border-amber-400 bg-amber-50/30 p-4 rounded-r-xl">
                          <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Ná»™i dung cÃ¢u há»i *</label>
                            <textarea 
                              value={editForm.text}
                              onChange={e => setEditForm({ ...editForm, text: e.target.value })}
                              className="input font-mono text-sm"
                              rows={3}
                            />
                          </div>

                          {/* Chá»‰nh sá»­a Pháº§n 1 - Tráº¯c nghiá»‡m */}
                          {part === 1 && editForm.options && (
                            <div className="space-y-3">
                              <label className="block text-xs font-bold text-gray-500">CÃ¡c phÆ°Æ¡ng Ã¡n vÃ  Ä‘Ã¡p Ã¡n Ä‘Ãºng</label>
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

                          {/* Chá»‰nh sá»­a Pháº§n 2 - ÄÃºng / Sai */}
                          {part === 2 && editForm.options && (
                            <div className="space-y-3">
                              <label className="block text-xs font-bold text-gray-500">CÃ¡c má»‡nh Ä‘á» vÃ  tráº¡ng thÃ¡i ÄÃºng (T) / Sai (F)</label>
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
                                        Má»‡nh Ä‘á» {letter.toUpperCase()}: {isTrue ? 'ÄÃšNG' : 'SAI'}
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

                          {/* Chá»‰nh sá»­a Pháº§n 3 */}
                          {part === 3 && (
                            <div>
                              <label className="block text-xs font-bold text-gray-500 mb-1">ÄÃ¡p Ã¡n Ä‘Ãºng (Káº¿t quáº£ ngáº¯n) *</label>
                              <input 
                                type="text" 
                                value={editForm.correctAnswer || ''}
                                onChange={e => setEditForm({ ...editForm, correctAnswer: e.target.value })}
                                className="input py-1.5 font-bold text-orange-700"
                              />
                            </div>
                          )}

                          {/* Chá»‰nh sá»­a Lá»i giáº£i */}
                          <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Lá»i giáº£i chi tiáº¿t</label>
                            <textarea 
                              value={editForm.solution || ''}
                              onChange={e => setEditForm({ ...editForm, solution: e.target.value })}
                              className="input font-mono text-xs"
                              rows={2}
                              placeholder="Nháº­p lá»i giáº£i..."
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

      {/* âœ… MODAL XEM TRÆ¯á»šC PDF */}
      {pdfUrlToView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
              <span className="font-extrabold text-slate-800 flex items-center gap-2">
                <BookOpen size={18} className="text-teal-600 animate-pulse" />
                Xem trÆ°á»›c tÃ i liá»‡u PDF
              </span>
              <div className="flex gap-2">
                <button 
                  onClick={() => window.open(pdfUrlToView, '_blank')} 
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 text-xs flex items-center gap-1.5 transition-all"
                >
                  Má»Ÿ tab má»›i
                </button>
                <button 
                  onClick={() => setPdfUrlToView(null)} 
                  className="p-2 rounded-xl hover:bg-slate-100 transition-all"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="h-[75vh]">
              <iframe src={pdfUrlToView} className="w-full h-full border-none" title="pdf-viewer" />
            </div>
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 text-[11px] text-gray-400">
              Máº¹o: Náº¿u trÃ¬nh duyá»‡t khÃ´ng tá»± Ä‘á»™ng táº£i PDF, báº¡n hÃ£y báº¥m vÃ o nÃºt "Má»Ÿ tab má»›i" Ä‘á»ƒ xem chi tiáº¿t.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
