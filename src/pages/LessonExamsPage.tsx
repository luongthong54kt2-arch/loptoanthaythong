// @ts-nocheck
// src/pages/LessonExamsPage.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { compileFullTex, base64ToBlob, downloadBlob } from '@/services/api';
import toast from 'react-hot-toast';
import {
  BookOpen, Users, Shuffle, Copy, Check, Download, Eye, FileText,
  Save, Plus, Trash2, CheckCircle2, AlertCircle, Sparkles, Layers,
  ExternalLink, X, RefreshCw, Printer, Info, HelpCircle
} from 'lucide-react';

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface ClassItem {
  id: string;
  class_name: string;
  grade?: string | number;
}

interface StudentItem {
  id: string;
  full_name: string;
  student_code?: string;
  gender?: string;
}

interface ParsedExam {
  code: string;           // e.g. "001"
  question1: string;      // LaTeX của câu 1
  question2: string;      // LaTeX của câu 2
  rawText: string;
}

interface LessonData {
  id: string;
  title: string;          // e.g. "Buổi 1 - Đại số Chương 1"
  date: string;           // yyyy-mm-dd
  rawLatex: string;       // Toàn bộ code 10 mã đề giáo viên đã dán
  assignments: Record<string, string>; // studentId -> examCode
  updatedAt: string;
}

// ─── Mẫu 10 Mã Đề Mẫu (Sample) ────────────────────────────────────────────────

const SAMPLE_10_EXAMS = String.raw`\textbf{Mã đề: 001}
\begin{ex}
  Rút gọn biểu thức sau bằng cách sử dụng hằng đẳng thức:
  $A = (2x + 3)^2 - (2x - 3)^2$.
\end{ex}
\begin{ex}
  Cho tam giác $ABC$ vuông tại $A$, đường cao $AH$. Biết $AB = 6\text{ cm}$, $AC = 8\text{ cm}$.
  \begin{enumerate}[a)]
    \item Tính độ dài cạnh huyền $BC$ và đường cao $AH$.
    \item Tính diện tích tam giác $ABH$.
  \end{enumerate}
\end{ex}

\textbf{Mã đề: 002}
\begin{ex}
  Phân tích đa thức sau thành nhân tử:
  $B = x^2 - 6x + 9 - y^2$.
\end{ex}
\begin{ex}
  Cho tam giác $MNP$ vuông tại $M$, đường cao $MK$. Biết $MN = 9\text{ cm}$, $MP = 12\text{ cm}$.
  \begin{enumerate}[a)]
    \item Tính độ dài cạnh $NP$ và đoạn thẳng $NK$.
    \item Tính tỉ số diện tích $\triangle MKN$ và $\triangle MKP$.
  \end{enumerate}
\end{ex}

\textbf{Mã đề: 003}
\begin{ex}
  Tính giá trị của biểu thức $C = x^3 - 3x^2 + 3x - 1$ tại $x = 101$.
\end{ex}
\begin{ex}
  Cho tam giác $ABC$ vuông tại $A$ có $\widehat{B} = 30^\circ$ và $BC = 10\text{ cm}$.
  \begin{enumerate}[a)]
    \item Tính các cạnh $AB, AC$.
    \item Kẻ trung tuyến $AM$. Tính diện tích $\triangle ABM$.
  \end{enumerate}
\end{ex}

\textbf{Mã đề: 004}
\begin{ex}
  Tìm $x$ biết: $(x - 2)^2 - (x - 1)(x + 1) = 9$.
\end{ex}
\begin{ex}
  Cho hình chữ nhật $ABCD$ có $AB = 8\text{ cm}$, $BC = 6\text{ cm}$. Kẻ $AH \perp BD$ tại $H$.
  \begin{enumerate}[a)]
    \item Tính độ dài đường chéo $BD$ và đoạn $AH$.
    \item Tính diện tích tam giác $AHD$.
  \end{enumerate}
\end{ex}

\textbf{Mã đề: 005}
\begin{ex}
  Rút gọn biểu thức: $D = (x + 1)^3 - (x - 1)^3 - 6x^2$.
\end{ex}
\begin{ex}
  Cho hình thang cân $ABCD$ ($AB \parallel CD$, $AB < CD$) có $AB = 4\text{ cm}$, $CD = 10\text{ cm}$, cạnh bên $AD = 5\text{ cm}$.
  \begin{enumerate}[a)]
    \item Tính chiều cao của hình thang.
    \item Tính diện tích hình thang $ABCD$.
  \end{enumerate}
\end{ex}

\textbf{Mã đề: 006}
\begin{ex}
  Tìm giá trị nhỏ nhất của biểu thức: $E = x^2 - 4x + 7$.
\end{ex}
\begin{ex}
  Cho tam giác $ABC$ vuông tại $A$, phân giác $AD$. Biết $AB = 3\text{ cm}$, $AC = 4\text{ cm}$.
  \begin{enumerate}[a)]
    \item Tính độ dài cạnh $BC$ và các đoạn thẳng $DB, DC$.
    \item Tính độ dài đường phân giác $AD$.
  \end{enumerate}
\end{ex}

\textbf{Mã đề: 007}
\begin{ex}
  Chứng minh rằng biểu thức $F = x^2 - 2x + 5 > 0$ với mọi số thực $x$.
\end{ex}
\begin{ex}
  Cho tam giác $ABC$ cân tại $A$, đường cao $AH = 8\text{ cm}$, cạnh đáy $BC = 12\text{ cm}$.
  \begin{enumerate}[a)]
    \item Tính độ dài cạnh bên $AB$.
    \item Kẻ $HK \perp AB$ tại $K$. Tính độ dài $HK$.
  \end{enumerate}
\end{ex}

\textbf{Mã đề: 008}
\begin{ex}
  Phân tích đa thức thành nhân tử: $G = x^3 + 8 + (x + 2)(x - 5)$.
\end{ex}
\begin{ex}
  Cho tam giác $ABC$ vuông tại $A$. Đường tròn đường kính $AB$ cắt $BC$ tại $D$. Biết $AB = 6$, $AC = 8$.
  \begin{enumerate}[a)]
    \item Chứng minh $AD \perp BC$ và tính $BD$.
    \item Tính diện tích tam giác $ABD$.
  \end{enumerate}
\end{ex}

\textbf{Mã đề: 009}
\begin{ex}
  Tính nhanh: $H = 2025^2 - 2024^2 + 2023^2 - 2022^2$.
\end{ex}
\begin{ex}
  Cho hình vuông $ABCD$ có cạnh bằng $6\text{ cm}$. Gọi $M$ là trung điểm của $BC$.
  \begin{enumerate}[a)]
    \item Tính độ dài đoạn thẳng $AM$ và $DM$.
    \item Kẻ $AH \perp DM$. Chứng minh $\triangle AHM \backsim \triangle DCM$.
  \end{enumerate}
\end{ex}

\textbf{Mã đề: 010}
\begin{ex}
  Tìm $x, y$ thỏa mãn: $x^2 + y^2 - 4x + 6y + 13 = 0$.
\end{ex}
\begin{ex}
  Cho tam giác $ABC$ nhọn có hai đường cao $BD$ và $CE$ cắt nhau tại $H$.
  \begin{enumerate}[a)]
    \item Chứng minh bốn điểm $A, E, H, D$ cùng thuộc một đường tròn.
    \item Chứng minh $BD \cdot BH + CE \cdot CH = BC^2$.
  \end{enumerate}
\end{ex}`;

// ─── Helpers: Parser LaTeX 10 Mã Đề ──────────────────────────────────────────

function parseLatexExamCodes(raw: string): ParsedExam[] {
  if (!raw || !raw.trim()) return [];

  // Tìm các vị trí \textbf{Mã đề: ...} hoặc Mã đề: ...
  const regexHeader = /(?:\\textbf\{\s*(?:Mã\s*đề|Đề|MÃ\s*ĐỀ)[:\s]*([^}]+)\}|(?:Mã\s*đề|Đề|MÃ\s*ĐỀ)[:\s]*([0-9a-zA-Z_-]+))/gi;
  
  const matches: { index: number; code: string }[] = [];
  let m: RegExpExecArray | null;

  while ((m = regexHeader.exec(raw)) !== null) {
    const code = (m[1] || m[2] || '').trim();
    matches.push({ index: m.index, code });
  }

  if (matches.length === 0) {
    // Nếu không tìm thấy header mã đề, thử parse toàn bộ câu hỏi
    const exMatches = extractQuestions(raw);
    if (exMatches.length > 0) {
      return [{
        code: '001',
        question1: exMatches[0] || '',
        question2: exMatches[1] || '',
        rawText: raw.trim(),
      }];
    }
    return [];
  }

  const results: ParsedExam[] = [];

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index : raw.length;
    const chunk = raw.slice(start, end).trim();

    // Bỏ dòng tiêu đề mã đề ra khỏi chunk để lấy các câu
    const questions = extractQuestions(chunk);

    results.push({
      code: matches[i].code,
      question1: questions[0] || '% (Chưa có nội dung Câu 1)',
      question2: questions[1] || '% (Chưa có nội dung Câu 2)',
      rawText: chunk,
    });
  }

  return results;
}

function extractQuestions(chunk: string): string[] {
  const questions: string[] = [];
  // Tìm các môi trường \begin{ex} ... \end{ex}
  const exRegex = /\\begin\{ex\}([\s\S]*?)\\end\{ex\}/gi;
  let match: RegExpExecArray | null;

  while ((match = exRegex.exec(chunk)) !== null) {
    questions.push(match[1].trim());
  }

  // Nếu không dùng \begin{ex}, thử tìm \begin{bt} ... \end{bt}
  if (questions.length === 0) {
    const btRegex = /\\begin\{bt\}([\s\S]*?)\\end\{bt\}/gi;
    while ((match = btRegex.exec(chunk)) !== null) {
      questions.push(match[1].trim());
    }
  }

  // Nếu vẫn không có, chia đôi khối text theo dòng kẻ hoặc đoạn văn
  if (questions.length === 0) {
    const clean = chunk.replace(/\\textbf\{[^}]*Mã\s*đề[^}]*\}\s*/gi, '').trim();
    if (clean) {
      const parts = clean.split(/\n\s*\n/);
      if (parts.length >= 2) {
        questions.push(parts[0].trim());
        questions.push(parts.slice(1).join('\n\n').trim());
      } else {
        questions.push(clean);
      }
    }
  }

  return questions;
}

// ─── Generators: Sinh mã LaTeX cho 1. MAIN/data/Cau1.tex ─────────────────────

/**
 * Sinh nội dung phiếu thi cho 1 học sinh (Đúng 2 trang A4 in 2 mặt có dòng kẻ chấm)
 * Sử dụng đúng lệnh \dotlineEX{...} đã định nghĩa trong 1. MAIN/main.tex
 */
function generateStudentExamLatex(
  student: StudentItem,
  exam: ParsedExam,
  className: string,
  lessonTitle: string
): string {
  const sName = student.full_name || 'Học sinh';
  const sCode = student.student_code || student.id?.slice(0, 6) || 'HS-000';
  const eCode = exam.code || '001';

  return String.raw`% ======================================================================
% HỌC SINH: ${sName} | MÃ: ${sCode} | MÃ ĐỀ: ${eCode}
% ======================================================================
\noindent
\begin{tcolorbox}[colback=white,colframe=black,arc=0mm,boxrule=0.8pt,top=4pt,bottom=4pt,left=6pt,right=6pt]
  \begin{minipage}[c]{0.44\textwidth}
    {\bfseries\large LỚP TOÁN THẦY THÔNG}\\[3pt]
    \textbf{Họ và tên:} \textbf{\large ${sName}}\\[3pt]
    \textbf{Lớp:} ${className} \quad -- \quad \textbf{Mã HS:} \texttt{${sCode}}
  \end{minipage}
  \hfill
  \begin{minipage}[c]{0.22\textwidth}
    \begin{tcolorbox}[colback=white,colframe=black,arc=0mm,boxrule=0.6pt,height=1.8cm,halign=center,valign=top,top=2pt]
      {\bfseries\normalsize Điểm}
    \end{tcolorbox}
  \end{minipage}
  \hfill
  \begin{minipage}[c]{0.30\textwidth}
    \raggedleft
    \textit{Thời gian làm bài: 30 phút}\\[4pt]
    \textbf{Mã đề thi:} \fbox{\textbf{\Large\strut\ ${eCode}\ }}
  \end{minipage}
\end{tcolorbox}
\vspace{0.25cm}

\noindent\textbf{\large ĐỀ BÀI (MÃ ĐỀ: ${eCode})}
\vspace{0.1cm}

% --- CÂU 1 (TRANG 1) ---
\begin{ex}
${exam.question1}
\end{ex}

\vspace{0.25cm}
\noindent\textit{\textbf{Bài làm:}}
\dotlineEX{18}

\newpage
% ----------------------------------------------------------------------
% TRANG 2 (MẶT SAU) -- DÒNG KẺ TIẾP THEO
% ----------------------------------------------------------------------
\noindent
\textbf{Học sinh:} ${sName} \quad -- \quad \textbf{Mã đề:} \fbox{\textbf{${eCode}}} \hfill \textit{Trang 2/2}\par
\vspace{-0.1cm}
\noindent\hrulefill
\vspace{0.3cm}

% --- CÂU 2 (TRANG 2) ---
\begin{ex}
${exam.question2}
\end{ex}

\vspace{0.25cm}
\noindent\textit{\textbf{Bài làm (tiếp theo):}}
\dotlineEX{22}

\newpage
`;
}

/**
 * Sinh toàn bộ code để dán vào D:\GitHub\quanlytrungtamthaythong\1. MAIN\data\Cau1.tex
 */
function generateFullCau1Tex(
  students: StudentItem[],
  assignments: Record<string, string>,
  exams: ParsedExam[],
  className: string,
  lessonTitle: string
): string {
  if (students.length === 0 || exams.length === 0) return '';

  const examMap = new Map<string, ParsedExam>();
  exams.forEach(e => examMap.set(e.code, e));

  const sections = students.map(st => {
    const code = assignments[st.id] || exams[0]?.code || '001';
    const exam = examMap.get(code) || exams[0];
    return generateStudentExamLatex(st, exam, className, lessonTitle);
  });

  const headerNotice = String.raw`% ==============================================================================
% FILE ĐƯỢC XUẤT TỰ ĐỘNG CHO: 1. MAIN\data\Cau1.tex
% Lớp: ${className} | Buổi học: ${lessonTitle}
% Tổng số học sinh: ${students.length} | Số mã đề sử dụng: ${exams.length}
% In 2 mặt (Duplex) để mỗi học sinh là 1 tờ A4 (Trang 1: Mặt trước, Trang 2: Mặt sau)
% ==============================================================================

`;

  return headerNotice + sections.join('\n');
}

/**
 * Bọc code trên vào một standalone main LaTeX document hoàn chỉnh để biên dịch thử PDF trực tiếp trên Web
 */
function buildStandaloneTexForPreview(bodyTex: string): string {
  return String.raw`\documentclass[14pt,a4paper,oneside]{book}
\usepackage[utf8]{vietnam}
\usepackage{amsmath,amssymb,mathrsfs,fancyhdr,enumerate,multirow,makecell}
\usepackage[top=1.5cm, bottom=1.5cm, left=1.5cm, right=1.5cm]{geometry}
\usepackage[dethi]{ex_test}
\usepackage{tikz}
\usepackage{xcolor}

\def\mau{teal}
\def\colorEX{\color{blue}}

% Dòng kẻ làm bài mô phỏng đúng 1. MAIN\main.tex
\renewcommand{\dotlineEX}[1]{
  \setlength{\parskip}{0.8\baselineskip}%
  \setlength{\parindent}{0pt}%
  \def\numlinedot{#1}
  \par
  \foreach \dotline in{1,...,\numlinedot}
  {
    \noindent\color{gray}{\tiny \dotfill}
    \par
  }\vspace*{-0.8\baselineskip}
}

\everymath{\color{blue}}
\pagestyle{fancy}
\fancyhf{}
\renewcommand{\headrulewidth}{0pt}

\begin{document}
${bodyTex}
\end{document}`;
}

// ─── Component Chính ─────────────────────────────────────────────────────────

export default function LessonExamsPage() {
  // Database states
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Selection states
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [lessons, setLessons] = useState<LessonData[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string>('');

  // Form states
  const [activeTab, setActiveTab] = useState<'editor' | 'distribution'>('editor');
  const [lessonTitle, setLessonTitle] = useState('Buổi 1 - Kiểm tra đầu giờ');
  const [lessonDate, setLessonDate] = useState(new Date().toISOString().split('T')[0]);
  const [rawLatexInput, setRawLatexInput] = useState(SAMPLE_10_EXAMS);
  const [assignments, setAssignments] = useState<Record<string, string>>({});

  // UI / Action states
  const [copied, setCopied] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [pdfPreview, setPdfPreview] = useState<{ url: string; blob: Blob } | null>(null);
  const [searchStudent, setSearchStudent] = useState('');

  // 1. Tải danh sách lớp, học sinh, enrollments từ Supabase
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [{ data: cls }, { data: stu }, { data: enr }] = await Promise.all([
          supabase.from('classes').select('id, class_name, grade').eq('status', 'active').order('class_name'),
          supabase.from('students').select('id, full_name, student_code').eq('status', 'active'),
          supabase.from('enrollments').select('*').eq('status', 'active'),
        ]);

        const classList = cls || [];
        setClasses(classList);
        setStudents(stu || []);
        setEnrollments(enr || []);

        if (classList.length > 0 && !selectedClassId) {
          setSelectedClassId(classList[0].id);
        }
      } catch (err: any) {
        console.error(err);
        toast.error('Lỗi khi tải dữ liệu lớp học: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
    void loadData();
  }, []);

  // 2. Tải danh sách các buổi học đã lưu trong localStorage của lớp đang chọn
  useEffect(() => {
    if (!selectedClassId) return;

    try {
      const storageKey = `lesson_exams_${selectedClassId}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed: LessonData[] = JSON.parse(saved);
        setLessons(parsed);
        if (parsed.length > 0) {
          const latest = parsed[0];
          setSelectedLessonId(latest.id);
          setLessonTitle(latest.title);
          setLessonDate(latest.date || new Date().toISOString().split('T')[0]);
          setRawLatexInput(latest.rawLatex || SAMPLE_10_EXAMS);
          setAssignments(latest.assignments || {});
          return;
        }
      }
      // Mặc định nếu lớp chưa có buổi học nào
      const defaultLesson: LessonData = {
        id: 'lesson-' + Date.now(),
        title: 'Buổi 1 - Kiểm tra định kỳ',
        date: new Date().toISOString().split('T')[0],
        rawLatex: SAMPLE_10_EXAMS,
        assignments: {},
        updatedAt: new Date().toISOString(),
      };
      setLessons([defaultLesson]);
      setSelectedLessonId(defaultLesson.id);
      setLessonTitle(defaultLesson.title);
      setRawLatexInput(defaultLesson.rawLatex);
      setAssignments({});
    } catch (e) {
      console.error(e);
    }
  }, [selectedClassId]);

  // Lấy danh sách học sinh thuộc lớp được chọn
  const currentClassStudents = useMemo(() => {
    if (!selectedClassId) return [];
    const enrolledIds = new Set(
      enrollments.filter(e => e.class_id === selectedClassId).map(e => e.student_id)
    );
    return students
      .filter(s => enrolledIds.has(s.id))
      .sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
  }, [selectedClassId, enrollments, students]);

  const currentClassInfo = useMemo(() => {
    return classes.find(c => c.id === selectedClassId);
  }, [classes, selectedClassId]);

  // Parse 10 mã đề từ input
  const parsedExams = useMemo(() => {
    return parseLatexExamCodes(rawLatexInput);
  }, [rawLatexInput]);

  // 3. Xử lý lưu buổi học
  const handleSaveLesson = () => {
    if (!selectedClassId) return;

    const targetId = selectedLessonId || 'lesson-' + Date.now();
    const updatedLesson: LessonData = {
      id: targetId,
      title: lessonTitle.trim() || 'Buổi học mới',
      date: lessonDate,
      rawLatex: rawLatexInput,
      assignments: assignments,
      updatedAt: new Date().toISOString(),
    };

    const nextLessons = lessons.some(l => l.id === targetId)
      ? lessons.map(l => (l.id === targetId ? updatedLesson : l))
      : [updatedLesson, ...lessons];

    setLessons(nextLessons);
    setSelectedLessonId(targetId);

    const storageKey = `lesson_exams_${selectedClassId}`;
    localStorage.setItem(storageKey, JSON.stringify(nextLessons));
    toast.success(`Đã lưu "${updatedLesson.title}" thành công!`);
  };

  // 4. Tạo thêm buổi học mới
  const handleCreateNewLesson = () => {
    const nextIndex = lessons.length + 1;
    const newLesson: LessonData = {
      id: 'lesson-' + Date.now(),
      title: `Buổi ${nextIndex} - Kiểm tra định kỳ`,
      date: new Date().toISOString().split('T')[0],
      rawLatex: SAMPLE_10_EXAMS,
      assignments: {},
      updatedAt: new Date().toISOString(),
    };

    const next = [newLesson, ...lessons];
    setLessons(next);
    setSelectedLessonId(newLesson.id);
    setLessonTitle(newLesson.title);
    setLessonDate(newLesson.date);
    setRawLatexInput(newLesson.rawLatex);
    setAssignments({});

    const storageKey = `lesson_exams_${selectedClassId}`;
    localStorage.setItem(storageKey, JSON.stringify(next));
    toast.success(`Đã thêm ${newLesson.title}!`);
  };

  // 5. Chọn buổi học từ dropdown
  const handleSelectLesson = (lessonId: string) => {
    const found = lessons.find(l => l.id === lessonId);
    if (found) {
      setSelectedLessonId(found.id);
      setLessonTitle(found.title);
      setLessonDate(found.date || new Date().toISOString().split('T')[0]);
      setRawLatexInput(found.rawLatex || SAMPLE_10_EXAMS);
      setAssignments(found.assignments || {});
    }
  };

  // 6. Xóa buổi học
  const handleDeleteLesson = (lessonId: string) => {
    if (lessons.length <= 1) {
      toast.error('Cần giữ lại ít nhất 1 buổi học!');
      return;
    }
    if (!confirm('Bạn có chắc chắn muốn xóa buổi học này không?')) return;

    const next = lessons.filter(l => l.id !== lessonId);
    setLessons(next);
    const storageKey = `lesson_exams_${selectedClassId}`;
    localStorage.setItem(storageKey, JSON.stringify(next));

    if (next.length > 0) {
      handleSelectLesson(next[0].id);
    }
    toast.success('Đã xóa buổi học');
  };

  // 7. Phân bổ mã đề ngẫu nhiên cho học sinh trong lớp
  const handleRandomizeAssignments = useCallback(() => {
    if (parsedExams.length === 0) {
      toast.error('Chưa có mã đề nào được nhận diện! Vui lòng kiểm tra lại Tab 1.');
      return;
    }
    if (currentClassStudents.length === 0) {
      toast.error('Lớp học này hiện chưa có học sinh nào!');
      return;
    }

    // Shuffle thuật toán Fisher-Yates để phân bổ đều
    const codes = parsedExams.map(e => e.code);
    const newAssignments: Record<string, string> = {};

    // Tạo một mảng mã đề lặp lại đủ cho sĩ số lớp và xáo trộn
    let pool: string[] = [];
    while (pool.length < currentClassStudents.length) {
      pool = pool.concat([...codes].sort(() => Math.random() - 0.5));
    }

    currentClassStudents.forEach((st, idx) => {
      newAssignments[st.id] = pool[idx];
    });

    setAssignments(newAssignments);
    toast.success(`🎉 Đã phân chia ngẫu nhiên ${codes.length} mã đề cho ${currentClassStudents.length} học sinh!`);
  }, [parsedExams, currentClassStudents]);

  // Tự động phân chia lần đầu nếu chưa có assignment
  useEffect(() => {
    if (
      currentClassStudents.length > 0 &&
      parsedExams.length > 0 &&
      Object.keys(assignments).length === 0
    ) {
      handleRandomizeAssignments();
    }
  }, [currentClassStudents, parsedExams, assignments, handleRandomizeAssignments]);

  // Đổi thủ công mã đề cho 1 học sinh
  const handleStudentExamChange = (studentId: string, code: string) => {
    setAssignments(prev => ({ ...prev, [studentId]: code }));
  };

  // 8. Sinh code cho Cau1.tex
  const generatedCau1Tex = useMemo(() => {
    return generateFullCau1Tex(
      currentClassStudents,
      assignments,
      parsedExams,
      currentClassInfo?.class_name || 'Lớp Toán',
      lessonTitle
    );
  }, [currentClassStudents, assignments, parsedExams, currentClassInfo, lessonTitle]);

  // Sao chép code cho Cau1.tex
  const handleCopyCau1 = async () => {
    if (!generatedCau1Tex) {
      toast.error('Không có nội dung để sao chép!');
      return;
    }
    await navigator.clipboard.writeText(generatedCau1Tex);
    setCopied(true);
    toast.success('📋 Đã sao chép mã LaTeX cho file 1. MAIN\\data\\Cau1.tex!');
    setTimeout(() => setCopied(false), 2000);
  };

  // Tải file Cau1.tex về máy
  const handleDownloadCau1Tex = () => {
    if (!generatedCau1Tex) {
      toast.error('Không có nội dung để tải!');
      return;
    }
    const blob = new Blob([generatedCau1Tex], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Cau1.tex';
    link.click();
    URL.revokeObjectURL(url);
    toast.success('💾 Đã tải xuống tệp Cau1.tex!');
  };

  // Ghi trực tiếp vào D:\GitHub\quanlytrungtamthaythong\1. MAIN\data\Cau1.tex
  const [isSavingDirect, setIsSavingDirect] = useState(false);
  const handleSaveDirectToCau1 = async () => {
    if (!generatedCau1Tex) {
      toast.error('Không có nội dung để ghi!');
      return;
    }
    try {
      setIsSavingDirect(true);
      const res = await fetch('/api/save-cau1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: generatedCau1Tex }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('🚀 Đã ghi trực tiếp vào 1. MAIN\\data\\Cau1.tex!');
      } else {
        throw new Error(data.error || 'Không thể ghi file');
      }
    } catch (err: any) {
      console.warn('Lỗi ghi trực tiếp:', err);
      await handleCopyCau1();
      toast('Đã tự động sao chép mã (bạn có thể mở Cau1.tex và bấm Ctrl+V)', { icon: 'ℹ️' });
    } finally {
      setIsSavingDirect(false);
    }
  };

  // 9. Biên dịch thử PDF trực tiếp trên web
  const handleCompilePdfPreview = async (limitStudents?: number) => {
    if (parsedExams.length === 0 || currentClassStudents.length === 0) {
      toast.error('Không đủ dữ liệu học sinh hoặc mã đề để biên dịch!');
      return;
    }

    try {
      setIsCompiling(true);
      toast.loading('Đang biên dịch PDF (đang dựng phiếu 2 mặt A4)...', { id: 'pdf-compile' });

      // Nếu biên dịch xem thử thì lấy tối đa 2 học sinh để tốc độ compile nhanh
      const studentsToCompile = limitStudents ? currentClassStudents.slice(0, limitStudents) : currentClassStudents;
      const body = generateFullCau1Tex(
        studentsToCompile,
        assignments,
        parsedExams,
        currentClassInfo?.class_name || 'Lớp Toán',
        lessonTitle
      );
      const fullTex = buildStandaloneTexForPreview(body);

      const res = await compileFullTex({ tex: fullTex });
      if (res && res.base64) {
        const blob = base64ToBlob(res.base64, 'application/pdf');
        const url = URL.createObjectURL(blob);
        setPdfPreview({ url, blob });
        toast.success('🎉 Biên dịch PDF hoàn tất!', { id: 'pdf-compile' });
      } else {
        throw new Error(res?.detail || 'Không nhận được dữ liệu PDF từ máy chủ');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Lỗi biên dịch: ' + (err.message || 'Kiểm tra cú pháp LaTeX'), { id: 'pdf-compile' });
    } finally {
      setIsCompiling(false);
    }
  };

  // Filter học sinh ở Tab 2
  const filteredStudents = useMemo(() => {
    if (!searchStudent.trim()) return currentClassStudents;
    const q = searchStudent.toLowerCase();
    return currentClassStudents.filter(s =>
      (s.full_name || '').toLowerCase().includes(q) ||
      (s.student_code || '').toLowerCase().includes(q)
    );
  }, [currentClassStudents, searchStudent]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* ── HEADER & THANH CHỌN LỚP & BUỔI HỌC ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:p-6 transition-all">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shadow-inner">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">
                  Kiểm Tra Buổi Học (10 Mã Đề A4 - 2 Mặt)
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-800">
                  Chuẩn 1. MAIN\data\Cau1.tex
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Phân bổ ngẫu nhiên 10 mã đề cho từng học sinh, tự động định dạng phiếu in 2 mặt A4 có dòng kẻ làm bài
              </p>
            </div>
          </div>

          {/* Nút lưu buổi học */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveLesson}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-bold shadow-md shadow-teal-600/20 transition-all transform active:scale-95"
            >
              <Save size={16} />
              <span>Lưu buổi học</span>
            </button>
          </div>
        </div>

        {/* Cụm điều khiển chọn Lớp & Buổi học */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-5">
          {/* 1. Chọn Lớp */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <BookOpen size={14} className="text-teal-600" />
              Chọn Lớp Học
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all outline-none"
            >
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.class_name} {c.grade ? `(Khối ${c.grade})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Chọn / Quản lý Buổi học */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <FileText size={14} className="text-teal-600" />
                Danh sách Buổi học
              </label>
              <button
                onClick={handleCreateNewLesson}
                className="text-xs font-bold text-teal-600 hover:text-teal-800 flex items-center gap-1"
                title="Thêm buổi học mới"
              >
                <Plus size={12} /> Thêm mới
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <select
                value={selectedLessonId}
                onChange={(e) => handleSelectLesson(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all outline-none"
              >
                {lessons.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.title} ({l.date || 'Chưa ngày'})
                  </option>
                ))}
              </select>
              {lessons.length > 1 && (
                <button
                  onClick={() => handleDeleteLesson(selectedLessonId)}
                  className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl border border-slate-200 transition-all"
                  title="Xóa buổi này"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>

          {/* 3. Tên Buổi học & Ngày tháng */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Tên Buổi học
            </label>
            <input
              type="text"
              value={lessonTitle}
              onChange={(e) => setLessonTitle(e.target.value)}
              placeholder="VD: Buổi 1 - Đại số Chương 1"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Ngày kiểm tra
            </label>
            <input
              type="date"
              value={lessonDate}
              onChange={(e) => setLessonDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all outline-none"
            />
          </div>
        </div>

        {/* Thống kê nhanh */}
        <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-slate-100 text-xs font-medium text-slate-600">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-teal-500"></span>
            Sĩ số lớp: <strong className="text-slate-800">{currentClassStudents.length}</strong> học sinh
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            Mã đề nhận diện: <strong className="text-slate-800">{parsedExams.length}</strong> mã đề
          </div>
          <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
            <Info size={13} />
            Mỗi học sinh = 1 tờ A4 (2 mặt có dòng kẻ làm bài \dotlineEX)
          </div>
        </div>
      </div>

      {/* ── 2 THẺ TABS CHÍNH ── */}
      <div className="flex items-center gap-2 border-b border-slate-200 px-2">
        <button
          onClick={() => setActiveTab('editor')}
          className={`flex items-center gap-2 px-5 py-3 rounded-t-xl text-sm font-bold transition-all border-b-2 ${
            activeTab === 'editor'
              ? 'border-teal-600 text-teal-700 bg-white shadow-sm'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
          }`}
        >
          <FileText size={16} />
          <span>Thẻ 1: Soạn & Dán 10 Mã Đề LaTeX</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 font-bold">
            {parsedExams.length} đề
          </span>
        </button>

        <button
          onClick={() => setActiveTab('distribution')}
          className={`flex items-center gap-2 px-5 py-3 rounded-t-xl text-sm font-bold transition-all border-b-2 ${
            activeTab === 'distribution'
              ? 'border-teal-600 text-teal-700 bg-white shadow-sm'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
          }`}
        >
          <Shuffle size={16} />
          <span>Thẻ 2: Phân Bổ Học Sinh & Xuất Mã Cau1.tex</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-teal-100 text-teal-800 font-bold">
            {currentClassStudents.length} HS
          </span>
        </button>
      </div>

      {/* ── NỘI DUNG TAB 1: SOẠN & DÁN 10 MÃ ĐỀ ── */}
      {activeTab === 'editor' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Cột trái: Ô nhập liệu LaTeX */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <FileText size={16} className="text-teal-600" />
                    Dán Code LaTeX 10 Mã Đề
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Định dạng: <code className="text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded">\textbf&#123;Mã đề: 001&#125; \begin&#123;ex&#125;... \end&#123;ex&#125;</code> (mỗi mã gồm 2 câu)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setRawLatexInput(SAMPLE_10_EXAMS);
                      toast.success('Đã tải mẫu 10 mã đề toán chuẩn!');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-all"
                  >
                    <Sparkles size={13} />
                    Mẫu 10 Mã Đề
                  </button>
                </div>
              </div>

              <textarea
                value={rawLatexInput}
                onChange={(e) => setRawLatexInput(e.target.value)}
                rows={22}
                placeholder="\textbf{Mã đề: 001}&#10;\begin{ex}&#10;  Câu 1...&#10;\end{ex}&#10;\begin{ex}&#10;  Câu 2...&#10;\end{ex}&#10;&#10;\textbf{Mã đề: 002}..."
                className="w-full font-mono text-xs text-slate-800 bg-slate-900/5 hover:bg-slate-900/[0.07] focus:bg-white border border-slate-300 focus:border-teal-500 rounded-xl p-4 leading-relaxed focus:ring-2 focus:ring-teal-500/20 transition-all outline-none resize-y"
              />

              <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
                <span>Số dòng: {rawLatexInput.split('\n').length} dòng</span>
                <span className="text-teal-700 font-semibold">
                  Tự động nhận diện: {parsedExams.length} mã đề
                </span>
              </div>
            </div>
          </div>

          {/* Cột phải: Thống kê & Danh sách mã đề đã nhận diện */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-teal-600" />
                  Mã đề đã nhận diện ({parsedExams.length})
                </span>
                <span className="text-xs font-normal text-slate-400">Mục tiêu: 10 đề</span>
              </h2>

              {parsedExams.length === 0 ? (
                <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <AlertCircle size={28} className="mx-auto mb-2 text-slate-300" />
                  <p className="text-xs">Chưa tìm thấy mã đề nào.</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Hãy bấm nút <strong>"Mẫu 10 Mã Đề"</strong> phía trên để dùng thử ngay.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                  {parsedExams.map((ex, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 hover:bg-teal-50/50 border border-slate-200 hover:border-teal-200 rounded-xl transition-all"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="px-2 py-0.5 rounded-md text-xs font-extrabold bg-teal-600 text-white shadow-sm">
                          Mã đề: {ex.code}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-500">
                          {ex.question1 ? 'Câu 1 ✓' : 'Câu 1 ✗'} | {ex.question2 ? 'Câu 2 ✓' : 'Câu 2 ✗'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 line-clamp-2 font-mono bg-white p-1.5 rounded border border-slate-100">
                        {ex.question1 || '(Chưa có nội dung câu 1)'}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-slate-100">
                <button
                  onClick={() => setActiveTab('distribution')}
                  className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <span>Chuyển sang Thẻ 2: Phân bổ & Xuất file</span>
                  <Shuffle size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── NỘI DUNG TAB 2: PHÂN BỔ HỌC SINH & XUẤT MÃ CAU1.TEX ── */}
      {activeTab === 'distribution' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Cột trái: Bảng phân chia mã đề cho từng học sinh */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Users size={16} className="text-teal-600" />
                    Danh Sách Phân Mã Đề
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Mỗi học sinh được gán 1 mã đề ngẫu nhiên (có thể chỉnh tay)
                  </p>
                </div>

                <button
                  onClick={handleRandomizeAssignments}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95 shrink-0"
                >
                  <Shuffle size={14} />
                  <span>Xáo trộn ngẫu nhiên</span>
                </button>
              </div>

              {/* Ô tìm kiếm học sinh */}
              <div className="mb-3">
                <input
                  type="text"
                  placeholder="Tìm học sinh theo tên hoặc mã..."
                  value={searchStudent}
                  onChange={(e) => setSearchStudent(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:border-teal-500"
                />
              </div>

              {/* Bảng học sinh */}
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[500px] overflow-y-auto custom-scrollbar">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 w-12 text-center">STT</th>
                      <th className="py-2.5 px-3">Học sinh</th>
                      <th className="py-2.5 px-3 w-32 text-center">Mã đề phân bổ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-8 text-center text-slate-400">
                          Không tìm thấy học sinh nào trong lớp này
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((st, idx) => {
                        const assignedCode = assignments[st.id] || parsedExams[0]?.code || '001';
                        return (
                          <tr key={st.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2.5 px-3 text-center text-slate-400 font-bold">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-slate-800">{st.full_name}</div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                {st.student_code || 'Chưa có mã'}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <select
                                value={assignedCode}
                                onChange={(e) => handleStudentExamChange(st.id, e.target.value)}
                                className="bg-white border border-slate-300 font-bold text-teal-700 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 shadow-sm"
                              >
                                {parsedExams.map(ex => (
                                  <option key={ex.code} value={ex.code}>
                                    Mã {ex.code}
                                  </option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Hiển thị: {filteredStudents.length} / {currentClassStudents.length} HS</span>
                <span className="text-teal-700 font-semibold">Tự động ngắt trang 2 mặt khi in</span>
              </div>
            </div>
          </div>

          {/* Cột phải: Xuất code LaTeX cho file Cau1.tex */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <FileText size={16} className="text-teal-600" />
                    Mã LaTeX Xuất Ra (Cau1.tex)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Đã điền sẵn Tên HS, Mã HS, Ô Điểm, Lời phê, Câu 1 & 2 + Dòng kẻ 2 mặt A4
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleSaveDirectToCau1}
                    disabled={isSavingDirect}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95 disabled:opacity-50"
                    title="Ghi trực tiếp vào file 1. MAIN\data\Cau1.tex trên máy"
                  >
                    {isSavingDirect ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                    <span>Ghi vào Cau1.tex</span>
                  </button>

                  <button
                    onClick={handleCopyCau1}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95"
                    title="Sao chép toàn bộ code để dán thủ công"
                  >
                    {copied ? <Check size={14} className="text-white" /> : <Copy size={14} />}
                    <span>{copied ? 'Đã chép!' : 'Sao chép mã'}</span>
                  </button>

                  <button
                    onClick={handleDownloadCau1Tex}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95"
                    title="Tải trực tiếp tệp Cau1.tex về máy"
                  >
                    <Download size={14} />
                    <span>Tải file .tex</span>
                  </button>

                  <button
                    onClick={() => handleCompilePdfPreview(2)}
                    disabled={isCompiling}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95 disabled:opacity-50"
                    title="Biên dịch mẫu 2 học sinh đầu tiên để xem trước nhanh"
                  >
                    {isCompiling ? <RefreshCw size={14} className="animate-spin" /> : <Eye size={14} />}
                    <span>Xem trước PDF</span>
                  </button>
                </div>
              </div>

              {/* Thông báo hướng dẫn dán file */}
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 mb-3 flex items-start gap-2">
                <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Hướng dẫn đưa vào dự án:</strong><br />
                  Bạn chỉ cần nhấn <strong>"Sao chép cho Cau1.tex"</strong> (hoặc tải file), sau đó mở tệp{' '}
                  <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200 font-mono text-[11px] text-teal-800">
                    D:\GitHub\quanlytrungtamthaythong\1. MAIN\data\Cau1.tex
                  </code>{' '}
                  và dán vào. Sau đó biên dịch file{' '}
                  <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200 font-mono text-[11px] text-teal-800">
                    1. MAIN\main.tex
                  </code>{' '}
                  là sẽ xuất ra toàn bộ đề của cả lớp!
                </div>
              </div>

              {/* Khung hiển thị code LaTeX sinh ra */}
              <div className="relative">
                <textarea
                  readOnly
                  value={generatedCau1Tex}
                  rows={20}
                  className="w-full font-mono text-xs text-slate-800 bg-slate-900/5 border border-slate-300 rounded-xl p-4 leading-relaxed outline-none select-all custom-scrollbar"
                />
              </div>

              <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
                <span>Dung lượng mã: {(new Blob([generatedCau1Tex]).size / 1024).toFixed(1)} KB</span>
                <button
                  onClick={handleSaveLesson}
                  className="text-teal-700 font-bold hover:underline flex items-center gap-1"
                >
                  <Save size={13} /> Lưu cấu hình buổi học này
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL XEM TRƯỚC PDF ── */}
      {pdfPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-teal-600" />
                <span className="font-extrabold text-slate-800 text-sm md:text-base">
                  Xem Trước PDF Phiếu Kiểm Tra A4 (2 Mặt)
                </span>
                <span className="px-2 py-0.5 text-xs font-bold bg-teal-100 text-teal-800 rounded-full">
                  Mẫu xem trước
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.open(pdfPreview.url, '_blank')}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 font-bold text-slate-700 text-xs border border-slate-200 flex items-center gap-1.5 transition-all"
                >
                  <ExternalLink size={13} /> Mở tab mới
                </button>
                <button
                  onClick={() => downloadBlob(pdfPreview.blob, `KiemTra_${lessonTitle.replace(/\s+/g, '_')}.pdf`)}
                  className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Download size={13} /> Tải PDF
                </button>
                <button
                  onClick={() => setPdfPreview(null)}
                  className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-all"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="h-[75vh] w-full bg-slate-900/10">
              <iframe
                src={pdfPreview.url}
                className="w-full h-full border-none"
                title="Xem trước PDF bài kiểm tra"
              />
            </div>

            <div className="px-5 py-2.5 border-t border-slate-200 bg-slate-50 text-xs text-slate-500 flex items-center justify-between">
              <span>Được biên dịch trực tiếp qua máy chủ TikZ/LaTeX Engine</span>
              <span>Lưu ý: Khi in thực tế, hãy chọn in 2 mặt (Flip on long edge)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
