// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useDataStore } from '@/store/dataStore';
import {
  Printer, Tag, Plus, Trash2, Download, Sparkles, RefreshCw,
  BookOpen, School, Calendar, Info, Layers, FileDown, Type
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Constants & Types ────────────────────────────────────────────────────────

const SLOGANS = [
  "Học tập là hạt giống của thành công.",
  "Hôm nay chăm chỉ, ngày mai tự hào.",
  "Thất bại là bài học, cố gắng là câu trả lời.",
  "Không có lối tắt đến thành công, chỉ có con đường của sự kiên trì.",
  "Đường tuy ngắn, không đi không đến; việc tuy nhỏ, không làm không thành.",
  "Tri thức là chìa khóa mở cửa tương lai.",
  "Học để biết, học để làm, học để khẳng định mình.",
  "Sách là thế giới, học tập là la bàn.",
  "Ngừng học tập là ngừng phát triển.",
  "Đầu tư vào tri thức luôn mang lại lợi nhuận cao nhất.",
  "Bắt đầu từ đâu cũng được, miễn là bạn không dừng lại.",
  "Tương lai của bạn được viết bằng chính những trang sách hôm nay.",
  "Đừng ước mọi chuyện dễ dàng hơn, hãy ước mình giỏi giang hơn.",
  "Mỗi ngày đi học là một bước tiến gần hơn đến ước mơ.",
  "Học hết mình, chơi nhiệt tình, tương lai rực rỡ."
];

const FONTS_LIST = [
  { name: 'Be Vietnam Pro', css: "'Be Vietnam Pro', sans-serif", label: 'Mặc định (Hiện đại)' },
  { name: 'Nunito', css: "'Nunito', sans-serif", label: 'Bo tròn dễ thương' },
  { name: 'Comfortaa', css: "'Comfortaa', sans-serif", label: 'Nét tròn thanh lịch' },
  { name: 'Playfair Display', css: "'Playfair Display', serif", label: 'Có chân cổ điển' },
  { name: 'Mali', css: "'Mali', cursive", label: 'Chữ viết tay học trò' },
  { name: 'Pacifico', css: "'Pacifico', cursive", label: 'Nét cọ nghệ thuật' },
];

const DEFAULT_SUBJECTS_BY_GRADE: Record<string, string[]> = {
  '6': [
    'Toán (Số học & Đại số) - Vở ghi', 'Toán (Số học & Đại số) - Vở bài tập',
    'Toán (Hình học) - Vở ghi', 'Toán (Hình học) - Vở bài tập',
    'Ngữ văn - Vở ghi (Tập 1)', 'Ngữ văn - Vở ghi (Tập 2)',
    'Ngữ văn - Vở soạn văn (Tập 1)', 'Ngữ văn - Vở soạn văn (Tập 2)',
    'Ngữ văn - Vở bài tập',
    'Tiếng Anh - Vở ghi', 'Tiếng Anh - Vở bài tập',
    'Khoa học tự nhiên - Vở ghi', 'Khoa học tự nhiên - Vở bài tập',
    'Lịch sử và Địa lí - Vở ghi', 'Lịch sử và Địa lí - Vở bài tập',
    'Giáo dục công dân - Vở ghi', 'Tin học - Vở ghi', 'Công nghệ - Vở ghi',
    'Hoạt động trải nghiệm - Vở ghi', 'Vở Nháp'
  ],
  '7': [
    'Toán (Đại số) - Vở ghi', 'Toán (Đại số) - Vở bài tập',
    'Toán (Hình học) - Vở ghi', 'Toán (Hình học) - Vở bài tập',
    'Ngữ văn - Vở ghi (Tập 1)', 'Ngữ văn - Vở ghi (Tập 2)',
    'Ngữ văn - Vở soạn văn (Tập 1)', 'Ngữ văn - Vở soạn văn (Tập 2)',
    'Ngữ văn - Vở bài tập',
    'Tiếng Anh - Vở ghi', 'Tiếng Anh - Vở bài tập',
    'Khoa học tự nhiên - Vở ghi', 'Khoa học tự nhiên - Vở bài tập',
    'Lịch sử và Địa lí - Vở ghi', 'Lịch sử và Địa lí - Vở bài tập',
    'Giáo dục công dân - Vở ghi', 'Tin học - Vở ghi', 'Công nghệ - Vở ghi',
    'Hoạt động trải nghiệm - Vở ghi', 'Vở Nháp'
  ],
  '8': [
    'Toán (Đại số) - Vở ghi', 'Toán (Đại số) - Vở bài tập',
    'Toán (Hình học) - Vở ghi', 'Toán (Hình học) - Vở bài tập',
    'Ngữ văn - Vở ghi (Tập 1)', 'Ngữ văn - Vở ghi (Tập 2)',
    'Ngữ văn - Vở soạn văn (Tập 1)', 'Ngữ văn - Vở soạn văn (Tập 2)',
    'Ngữ văn - Vở bài tập',
    'Tiếng Anh - Vở ghi', 'Tiếng Anh - Vở bài tập',
    'Khoa học tự nhiên - Vở ghi', 'Khoa học tự nhiên - Vở bài tập',
    'Lịch sử và Địa lí - Vở ghi', 'Lịch sử và Địa lí - Vở bài tập',
    'Giáo dục công dân - Vở ghi', 'Tin học - Vở ghi', 'Công nghệ - Vở ghi',
    'Hoạt động trải nghiệm - Vở ghi', 'Vở Nháp'
  ],
  '9': [
    'Toán (Đại số) - Vở ghi', 'Toán (Đại số) - Vở bài tập',
    'Toán (Hình học) - Vở ghi', 'Toán (Hình học) - Vở bài tập',
    'Ngữ văn - Vở ghi (Tập 1)', 'Ngữ văn - Vở ghi (Tập 2)',
    'Ngữ văn - Vở soạn văn (Tập 1)', 'Ngữ văn - Vở soạn văn (Tập 2)',
    'Ngữ văn - Vở bài tập',
    'Tiếng Anh - Vở ghi', 'Tiếng Anh - Vở bài tập',
    'Khoa học tự nhiên - Vở ghi', 'Khoa học tự nhiên - Vở bài tập',
    'Lịch sử và Địa lí - Vở ghi', 'Lịch sử và Địa lí - Vở bài tập',
    'Giáo dục công dân - Vở ghi', 'Tin học - Vở ghi', 'Công nghệ - Vở ghi',
    'Hoạt động trải nghiệm - Vở ghi', 'Vở Nháp'
  ],
  '10': [
    'Toán học - Vở ghi', 'Toán học - Vở bài tập',
    'Ngữ văn - Vở ghi (Tập 1)', 'Ngữ văn - Vở ghi (Tập 2)',
    'Ngữ văn - Vở soạn văn (Tập 1)', 'Ngữ văn - Vở soạn văn (Tập 2)',
    'Ngữ văn - Vở bài tập',
    'Tiếng Anh - Vở ghi', 'Tiếng Anh - Vở bài tập',
    'Vật lí - Vở ghi', 'Vật lí - Vở bài tập',
    'Hóa học - Vở ghi', 'Hóa học - Vở bài tập',
    'Sinh học - Vở ghi', 'Sinh học - Vở bài tập',
    'Lịch sử - Vở ghi', 'Địa lí - Vở ghi',
    'Giáo dục Kinh tế và Pháp luật - Vở ghi', 'Tin học - Vở ghi', 'Công nghệ - Vở ghi', 'Vở Nháp'
  ],
  '11': [
    'Toán học - Vở ghi', 'Toán học - Vở bài tập',
    'Ngữ văn - Vở ghi (Tập 1)', 'Ngữ văn - Vở ghi (Tập 2)',
    'Ngữ văn - Vở soạn văn (Tập 1)', 'Ngữ văn - Vở soạn văn (Tập 2)',
    'Ngữ văn - Vở bài tập',
    'Tiếng Anh - Vở ghi', 'Tiếng Anh - Vở bài tập',
    'Vật lí - Vở ghi', 'Vật lí - Vở bài tập',
    'Hóa học - Vở ghi', 'Hóa học - Vở bài tập',
    'Sinh học - Vở ghi', 'Sinh học - Vở bài tập',
    'Lịch sử - Vở ghi', 'Địa lí - Vở ghi',
    'Giáo dục Kinh tế và Pháp luật - Vở ghi', 'Tin học - Vở ghi', 'Công nghệ - Vở ghi', 'Vở Nháp'
  ],
  '12': [
    'Toán học - Vở ghi', 'Toán học - Vở bài tập',
    'Ngữ văn - Vở ghi (Tập 1)', 'Ngữ văn - Vở ghi (Tập 2)',
    'Ngữ văn - Vở soạn văn (Tập 1)', 'Ngữ văn - Vở soạn văn (Tập 2)',
    'Ngữ văn - Vở bài tập',
    'Tiếng Anh - Vở ghi', 'Tiếng Anh - Vở bài tập',
    'Vật lí - Vở ghi', 'Vật lí - Vở bài tập',
    'Hóa học - Vở ghi', 'Hóa học - Vở bài tập',
    'Sinh học - Vở ghi', 'Sinh học - Vở bài tập',
    'Lịch sử - Vở ghi', 'Địa lí - Vở ghi',
    'Giáo dục Kinh tế và Pháp luật - Vở ghi', 'Tin học - Vở ghi', 'Công nghệ - Vở ghi', 'Vở Nháp'
  ]
};

interface LabelItem {
  id: string;
  studentName: string;
  className: string;
  schoolName: string;
  subject: string;
  schoolYear: string;
  slogan: string;
}

type TemplateType = 'teal' | 'math' | 'chibi' | 'minimalist' | 'space' | 'vintage' | 'sporty';

const splitSlogan = (slogan: string, maxLen: number = 42): string[] => {
  if (!slogan) return [];
  if (slogan.length <= maxLen) return [slogan];

  // Find the space character closest to the middle of the string
  const midChar = Math.floor(slogan.length / 2);
  let bestSplitIndex = -1;
  let minDistance = Infinity;

  for (let i = 0; i < slogan.length; i++) {
    if (slogan[i] === ' ') {
      // Prefer punctuation if close
      let weight = 0;
      if (i > 0 && (slogan[i - 1] === ',' || slogan[i - 1] === ';' || slogan[i - 1] === ':')) {
        weight = -15; // make it highly preferred
      }
      const distance = Math.abs(i - midChar) + weight;
      if (distance < minDistance) {
        minDistance = distance;
        bestSplitIndex = i;
      }
    }
  }

  if (bestSplitIndex !== -1) {
    return [
      slogan.substring(0, bestSplitIndex).trim(),
      slogan.substring(bestSplitIndex + 1).trim()
    ];
  }
  
  return [slogan];
};

export default function NhanVoPage() {
  const [printMode, setPrintMode] = useState<'curriculum' | 'manual'>('curriculum');

  // --- Shared Student & School Info ---
  const [schoolName, setSchoolName] = useState('TRƯỜNG THCS SƠN TÂY');
  const [studentName, setStudentName] = useState('');
  const [className, setClassName] = useState('');
  const [schoolYear, setSchoolYear] = useState('2026 - 2027');
  const [selectedFont, setSelectedFont] = useState<string>('Be Vietnam Pro');

  // --- Curriculum Mode Settings ---
  const [selectedGrade, setSelectedGrade] = useState<string>('6');
  const [selectedCurriculum, setSelectedCurriculum] = useState<string>('ketnoi');
  const [curriculumSubjects, setCurriculumSubjects] = useState<string[]>([]);
  const [checkedSubjects, setCheckedSubjects] = useState<Record<string, boolean>>({});
  const [customSubjectInput, setCustomSubjectInput] = useState('');

  // --- Manual Mode Settings ---
  const [manualSubject, setManualSubject] = useState('Môn Toán');

  // Default Template is Math Doodle
  const [template, setTemplate] = useState<TemplateType>('math');
  const [sloganMode, setSloganMode] = useState<'none' | 'random' | string>('random');

  // List of active labels to print
  const [labels, setLabels] = useState<LabelItem[]>([]);
  const [exportingPdf, setExportingPdf] = useState(false);

  // Load default subjects list when selectedGrade changes
  useEffect(() => {
    if (selectedGrade && DEFAULT_SUBJECTS_BY_GRADE[selectedGrade]) {
      const subs = DEFAULT_SUBJECTS_BY_GRADE[selectedGrade];
      setCurriculumSubjects(subs);
      const initialChecked: Record<string, boolean> = {};
      subs.forEach(sub => {
        initialChecked[sub] = true;
      });
      setCheckedSubjects(initialChecked);
    }
  }, [selectedGrade]);

  const handleToggleSubject = (sub: string) => {
    setCheckedSubjects(prev => ({ ...prev, [sub]: !prev[sub] }));
  };

  const handleToggleAllSubjects = (checked: boolean) => {
    const newChecked: Record<string, boolean> = {};
    curriculumSubjects.forEach(sub => {
      newChecked[sub] = checked;
    });
    setCheckedSubjects(newChecked);
  };

  const handleAddCustomSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customSubjectInput.trim()) return;
    const newSub = customSubjectInput.trim();
    if (curriculumSubjects.includes(newSub)) {
      toast.error("Môn học này đã có trong danh sách!");
      return;
    }
    setCurriculumSubjects(prev => [...prev, newSub]);
    setCheckedSubjects(prev => ({ ...prev, [newSub]: true }));
    setCustomSubjectInput('');
    toast.success(`Đã thêm môn: ${newSub}`);
  };

  // Regenerate labels list based on settings
  const generateLabels = () => {
    if (printMode === 'curriculum') {
      if (!studentName.trim()) {
        setLabels([]);
        return;
      }
      const activeSubjects = curriculumSubjects.filter(sub => checkedSubjects[sub]);
      const generated = activeSubjects.map((sub, idx) => {
        let selectedSlogan = '';
        if (sloganMode === 'random') {
          selectedSlogan = SLOGANS[idx % SLOGANS.length];
        } else if (sloganMode !== 'none') {
          selectedSlogan = sloganMode;
        }

        return {
          id: `curr-single-${idx}-${Date.now()}`,
          studentName: studentName.trim(),
          className: className.trim() || 'Lớp ...',
          schoolName: schoolName,
          subject: sub,
          schoolYear: schoolYear,
          slogan: selectedSlogan,
        };
      });
      setLabels(generated);
    }
  };

  // Trigger regeneration in curriculum mode
  useEffect(() => {
    generateLabels();
  }, [
    printMode, studentName, className, schoolName, schoolYear, sloganMode,
    selectedGrade, selectedCurriculum, curriculumSubjects, checkedSubjects
  ]);

  // Add manual student label (Mode 2)
  const handleAddManualLabel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) {
      toast.error("Vui lòng điền tên học sinh ở trên!");
      return;
    }
    if (!manualSubject.trim()) {
      toast.error("Vui lòng nhập tên môn học!");
      return;
    }

    let selectedSlogan = '';
    if (sloganMode === 'random') {
      selectedSlogan = SLOGANS[labels.length % SLOGANS.length];
    } else if (sloganMode !== 'none') {
      selectedSlogan = sloganMode;
    }

    const newLabel: LabelItem = {
      id: `manual-${Date.now()}-${Math.random()}`,
      studentName: studentName.trim(),
      className: className.trim() || 'Lớp ...',
      schoolName: schoolName,
      subject: manualSubject.trim(),
      schoolYear: schoolYear,
      slogan: selectedSlogan,
    };

    setLabels(prev => [...prev, newLabel]);
    toast.success(`Đã thêm nhãn vở môn: ${newLabel.subject}`);
  };

  const handleRemoveLabel = (id: string) => {
    setLabels(prev => prev.filter(l => l.id !== id));
  };

  const handleUpdateLabelField = (id: string, field: keyof LabelItem, value: string) => {
    setLabels(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const handlePrint = () => {
    if (labels.length === 0) {
      toast.error("Danh sách nhãn vở đang trống!");
      return;
    }
    window.print();
  };

  // Export A4 formatted PDF document
  const handleDownloadPdf = async () => {
    if (labels.length === 0) {
      toast.error("Danh sách nhãn vở đang trống!");
      return;
    }

    setExportingPdf(true);
    const toastId = toast.loading("Đang chuẩn bị tạo tệp PDF...");

    try {
      const { jsPDF } = await import('jspdf');
      
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      // Render each SVG label into canvas PNG image
      const labelImages = await Promise.all(
        labels.map(async (label, index) => {
          return new Promise<string>((resolve, reject) => {
            const container = document.getElementById(`label-svg-container-${label.id}`);
            if (!container) {
              reject(new Error(`Không tìm thấy nhãn số ${index + 1}`));
              return;
            }
            const svgElement = container.querySelector('svg');
            if (!svgElement) {
              reject(new Error(`Lỗi dựng hình cho nhãn số ${index + 1}`));
              return;
            }

            const svgString = new XMLSerializer().serializeToString(svgElement);
            const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
            const DOMURL = window.URL || window.webkitURL || window;
            const blobURL = DOMURL.createObjectURL(svgBlob);

            const image = new Image();
            image.onload = () => {
              const canvas = document.createElement('canvas');
              // Output size matching high resolution SVG
              canvas.width = 950;
              canvas.height = 620;
              const context = canvas.getContext('2d');
              if (context) {
                context.fillStyle = '#ffffff';
                context.fillRect(0, 0, canvas.width, canvas.height);
                context.drawImage(image, 0, 0, canvas.width, canvas.height);
                const pngURL = canvas.toDataURL('image/png');
                DOMURL.revokeObjectURL(blobURL);
                resolve(pngURL);
              } else {
                DOMURL.revokeObjectURL(blobURL);
                reject(new Error("Lỗi bộ nhớ Canvas"));
              }
            };
            image.onerror = () => {
              DOMURL.revokeObjectURL(blobURL);
              reject(new Error(`Lỗi tải ảnh SVG ${index + 1}`));
            };
            image.src = blobURL;
          });
        })
      );

      // Distribute labels onto PDF pages (4 columns x 4 rows = 16 labels per A4 page)
      const labelsPerPage = 16;
      const totalPages = Math.ceil(labels.length / labelsPerPage);

      for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
        if (pageIndex > 0) {
          doc.addPage();
        }

        const startIndex = pageIndex * labelsPerPage;
        const endIndex = Math.min(startIndex + labelsPerPage, labels.length);
        const pageLabels = labelImages.slice(startIndex, endIndex);

        pageLabels.forEach((imgData, i) => {
          const row = Math.floor(i / 4);
          const col = i % 4;

          // Positions matching absolute A4 landscape print coordinates exactly:
          // x-coordinate: margin 8.5mm + col * 70mm (Total 280mm)
          // y-coordinate: margin 13mm + row * 46mm (Total 184mm)
          const x = 8.5 + col * 70;
          const y = 13.0 + row * 46;

          doc.addImage(imgData, 'PNG', x, y, 70, 46);
        });
      }

      const filename = `nhan-vo-${studentName.trim() ? studentName.trim().replace(/\s+/g, '-').toLowerCase() : 'hoc-sinh'}.pdf`;
      doc.save(filename);
      toast.success("Tạo tệp PDF thành công và đang tải xuống!");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Có lỗi xảy ra khi tạo tệp PDF!");
    } finally {
      setExportingPdf(false);
      toast.dismiss(toastId);
    }
  };

  const handleDownloadPng = (label: LabelItem, index: number) => {
    try {
      const container = document.getElementById(`label-svg-container-${label.id}`);
      if (!container) {
        toast.error("Không tìm thấy nhãn vở!");
        return;
      }
      const svgElement = container.querySelector('svg');
      if (!svgElement) {
        toast.error("Lỗi dựng hình SVG!");
        return;
      }

      const svgString = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const DOMURL = window.URL || window.webkitURL || window;
      const blobURL = DOMURL.createObjectURL(svgBlob);

      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 950;
        canvas.height = 620;
        const context = canvas.getContext('2d');
        if (context) {
          context.fillStyle = '#ffffff';
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          
          const pngURL = canvas.toDataURL('image/png');
          const downloadLink = document.createElement('a');
          downloadLink.href = pngURL;
          downloadLink.download = `nhan-vo-${label.studentName.replace(/\s+/g, '-').toLowerCase()}-${index + 1}.png`;
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
          
          DOMURL.revokeObjectURL(blobURL);
        }
      };
      image.src = blobURL;
      toast.success(`Đang tải ảnh nhãn vở ${index + 1}...`);
    } catch (err) {
      console.error(err);
      toast.error("Lỗi khi tải ảnh!");
    }
  };

  // Template SVG Renderer Component
  const RenderLabelSVG = ({ label }: { label: LabelItem }) => {
    const width = 950;
    const height = 620;

    const currentFontObj = FONTS_LIST.find(f => f.name === selectedFont) || FONTS_LIST[0];

    const customStyleBlock = (
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,400;0,600;0,700;0,900;1,400;1,600&family=Comfortaa:wght@400;700&family=Mali:ital,wght@0,400;0,700;1,400&family=Nunito:ital,wght@0,400;0,700;1,400&family=Pacifico&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap');
        .svg-input-text {
          font-family: ${currentFontObj.css} !important;
          line-height: 1.2 !important;
          padding: 0 !important;
          margin: 0 !important;
          border: none !important;
          outline: none !important;
        }
        .svg-label-text {
          font-family: ${currentFontObj.css} !important;
        }
      `}</style>
    );

    if (template === 'teal') {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full h-full">
          {customStyleBlock}
          <defs>
            <linearGradient id={`tealGrad-${label.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0f766e" />
              <stop offset="100%" stopColor="#115e59" />
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill={`url(#tealGrad-${label.id})`} rx="25" />
          
          <rect x="10" y="10" width={width - 20} height={height - 20} fill="none" stroke="#fef08a" strokeWidth="4" rx="20" strokeDasharray="15,10" />
          <rect x="18" y="18" width={width - 36} height={height - 36} fill="none" stroke="#ffffff" strokeWidth="2" rx="16" opacity="0.3" />

          <path d="M 50 150 Q 150 50 250 150 T 450 150" fill="none" stroke="#ffffff" strokeWidth="2" opacity="0.08" />
          <circle cx="850" cy="150" r="100" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.08" />
          <path d="M 780 150 L 920 150 M 850 80 L 850 220" stroke="#ffffff" strokeWidth="1" opacity="0.08" strokeDasharray="5,5" />

          {/* Header */}
          <g transform="translate(100, 105)">
            <path d="M -40 -15 L 0 -35 L 40 -15 L 0 5 Z" fill="#fef08a" />
            <path d="M -20 -5 L -20 20 C -20 25, 20 25, 20 20 L 20 -5" fill="none" stroke="#fef08a" strokeWidth="3" />
            <path d="M 40 -15 L 40 10 C 40 10, 43 20, 35 22" fill="none" stroke="#fef08a" strokeWidth="2" />
            <circle cx="35" cy="22" r="3" fill="#fef08a" />
            <text x="60" y="12" fill="#fef08a" fontSize="48" fontWeight="900" className="svg-label-text" letterSpacing="1">{label.schoolName.toUpperCase()}</text>
          </g>

          <line x1="80" y1="180" x2="870" y2="180" stroke="#ffffff" strokeWidth="3" opacity="0.2" />

          {/* Information Fields */}
          <g transform="translate(100, 240)">
            {/* Subject */}
            <text x="0" y="30" fontWeight="bold" fill="#fde047" className="svg-label-text" fontSize="34">Vở ghi:</text>
            <foreignObject x="140" y="-25" width="630" height="80" className="print:hidden">
              <input
                type="text"
                value={label.subject}
                onChange={(e) => handleUpdateLabelField(label.id, 'subject', e.target.value)}
                className="svg-input-text w-full h-full bg-transparent border-0 p-0 text-white font-normal focus:ring-0 focus:outline-none hover:bg-white/10 focus:bg-white/10 rounded px-1 transition-colors"
                style={{ fontSize: '34px' }}
              />
            </foreignObject>
            <text x="140" y="30" fill="#ffffff" className="svg-label-text hidden print:block" fontSize="34">{label.subject}</text>
            <line x1="130" y1="38" x2="770" y2="38" stroke="#ffffff" strokeWidth="2" strokeDasharray="5,5" opacity="0.6" />

            {/* Student Name */}
            <text x="0" y="110" fontWeight="bold" fill="#fde047" className="svg-label-text" fontSize="34">Học sinh:</text>
            <foreignObject x="170" y="45" width="600" height="90" className="print:hidden">
              <input
                type="text"
                value={label.studentName}
                onChange={(e) => handleUpdateLabelField(label.id, 'studentName', e.target.value)}
                className="svg-input-text w-full h-full bg-transparent border-0 p-0 text-white font-bold focus:ring-0 focus:outline-none hover:bg-white/10 focus:bg-white/10 rounded px-1 transition-colors"
                style={{ fontSize: '40px' }}
              />
            </foreignObject>
            <text x="170" y="110" fill="#ffffff" className="svg-label-text hidden print:block" fontSize="40" fontWeight="bold">{label.studentName}</text>
            <line x1="160" y1="118" x2="770" y2="118" stroke="#ffffff" strokeWidth="2" strokeDasharray="5,5" opacity="0.6" />

            {/* Class & School Year */}
            <text x="0" y="190" fontWeight="bold" fill="#fde047" className="svg-label-text" fontSize="34">Lớp:</text>
            <foreignObject x="90" y="135" width="160" height="80" className="print:hidden">
              <input
                type="text"
                value={label.className}
                onChange={(e) => handleUpdateLabelField(label.id, 'className', e.target.value)}
                className="svg-input-text w-full h-full bg-transparent border-0 p-0 text-white font-normal focus:ring-0 focus:outline-none hover:bg-white/10 focus:bg-white/10 rounded px-1 transition-colors"
                style={{ fontSize: '34px' }}
              />
            </foreignObject>
            <text x="90" y="190" fill="#ffffff" className="svg-label-text hidden print:block" fontSize="34">{label.className}</text>
            <line x1="80" y1="198" x2="250" y2="198" stroke="#ffffff" strokeWidth="2" strokeDasharray="5,5" opacity="0.6" />

            <text x="280" y="190" fontWeight="bold" fill="#fde047" className="svg-label-text" fontSize="34">Năm học:</text>
            <foreignObject x="450" y="135" width="320" height="80" className="print:hidden">
              <input
                type="text"
                value={label.schoolYear}
                onChange={(e) => handleUpdateLabelField(label.id, 'schoolYear', e.target.value)}
                className="svg-input-text w-full h-full bg-transparent border-0 p-0 text-white font-normal focus:ring-0 focus:outline-none hover:bg-white/10 focus:bg-white/10 rounded px-1 transition-colors"
                style={{ fontSize: '34px' }}
              />
            </foreignObject>
            <text x="450" y="190" fill="#ffffff" className="svg-label-text hidden print:block" fontSize="34">{label.schoolYear}</text>
            <line x1="440" y1="198" x2="770" y2="198" stroke="#ffffff" strokeWidth="2" strokeDasharray="5,5" opacity="0.6" />
          </g>

          {(() => {
            if (!label.slogan) return null;
            const lines = splitSlogan(label.slogan, 42);
            if (lines.length === 2) {
              return (
                <g transform={`translate(${width / 2}, 522)`}>
                  <rect x="-370" y="-35" width="740" height="90" fill="#115e59" rx="10" opacity="0.5" />
                  <text textAnchor="middle" fill="#fef08a" fontSize="28" fontStyle="italic" className="svg-label-text">
                    ★ {lines[0]}
                  </text>
                  <text dy="36" textAnchor="middle" fill="#fef08a" fontSize="28" fontStyle="italic" className="svg-label-text">
                    {lines[1]} ★
                  </text>
                </g>
              );
            }
            return (
              <g transform={`translate(${width / 2}, 540)`}>
                <rect x="-350" y="-38" width="700" height="56" fill="#115e59" rx="10" opacity="0.5" />
                <text textAnchor="middle" fill="#fef08a" fontSize="30" fontStyle="italic" className="svg-label-text">
                  ★ {label.slogan} ★
                </text>
              </g>
            );
          })()}
        </svg>
      );
    }

    if (template === 'math') {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full h-full">
          {customStyleBlock}
          <rect width="100%" height="100%" fill="#fafaf9" rx="25" />
          <defs>
            <pattern id={`grid-${label.id}`} width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#e7e5e4" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#grid-${label.id})`} rx="25" />
          
          <rect x="10" y="10" width={width - 20} height={height - 20} fill="none" stroke="#0d9488" strokeWidth="5" rx="12" />
          <rect x="18" y="18" width={width - 36} height={height - 36} fill="none" stroke="#0f766e" strokeWidth="1.5" rx="10" />

          <g stroke="#94a3b8" strokeWidth="1.5" fill="none" opacity="0.4" transform="scale(1.2)">
            <path d="M 650 120 L 750 120 M 700 70 L 700 170" />
            <path d="M 640 140 Q 670 80 700 120 T 750 160" stroke="#0d9488" strokeWidth="2" />
            <text x="740" y="115" fontSize="12" fill="#94a3b8" stroke="none" className="svg-label-text">x</text>
            <text x="705" y="80" fontSize="12" fill="#94a3b8" stroke="none" className="svg-label-text">y</text>
            
            <text x="50" y="150" fontSize="16" stroke="none" fill="#64748b" fontStyle="italic" className="svg-label-text">a² + b² = c²</text>
            <text x="50" y="350" fontSize="18" stroke="none" fill="#64748b" fontStyle="italic" className="svg-label-text">f(x) = ∫ x dx</text>
            <text x="680" y="350" fontSize="24" stroke="none" fill="#0d9488" fontWeight="bold" className="svg-label-text">π ≈ 3.14</text>
          </g>

          {/* Header */}
          <g transform="translate(100, 105)" className="svg-label-text">
            <rect x="-10" y="-45" width="80" height="80" fill="#0d9488" rx="15" />
            <text x="30" y="12" fill="#ffffff" fontSize="48" fontWeight="bold" textAnchor="middle">∑</text>
            <text x="90" y="12" fill="#0f766e" fontSize="48" fontWeight="900">{label.schoolName.toUpperCase()}</text>
          </g>

          <line x1="80" y1="180" x2="870" y2="180" stroke="#0d9488" strokeWidth="2" strokeDasharray="10,5" />

          <g transform="translate(120, 240)">
            {/* Subject */}
            <text x="0" y="30" fontWeight="bold" fill="#0f766e" className="svg-label-text" fontSize="34">Vở:</text>
            <foreignObject x="75" y="-25" width="655" height="80" className="print:hidden">
              <input
                type="text"
                value={label.subject}
                onChange={(e) => handleUpdateLabelField(label.id, 'subject', e.target.value)}
                className="svg-input-text w-full h-full bg-transparent border-0 p-0 text-slate-800 font-normal focus:ring-0 focus:outline-none hover:bg-slate-100 focus:bg-slate-100 rounded px-1 transition-colors"
                style={{ fontSize: '34px' }}
              />
            </foreignObject>
            <text x="75" y="30" fill="#1e293b" className="svg-label-text hidden print:block" fontSize="34">{label.subject}</text>
            <line x1="65" y1="38" x2="730" y2="38" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3,3" />

            {/* Student Name */}
            <text x="0" y="110" fontWeight="bold" fill="#0f766e" className="svg-label-text" fontSize="34">Học và tên:</text>
            <foreignObject x="195" y="45" width="535" height="90" className="print:hidden">
              <input
                type="text"
                value={label.studentName}
                onChange={(e) => handleUpdateLabelField(label.id, 'studentName', e.target.value)}
                className="svg-input-text w-full h-full bg-transparent border-0 p-0 text-teal-850 font-bold focus:ring-0 focus:outline-none hover:bg-slate-100 focus:bg-slate-100 rounded px-1 transition-colors"
                style={{ fontSize: '40px' }}
              />
            </foreignObject>
            <text x="195" y="110" fill="#0f766e" className="svg-label-text hidden print:block" fontSize="40" fontWeight="bold">{label.studentName}</text>
            <line x1="185" y1="118" x2="730" y2="118" stroke="#94a3b8" strokeWidth="2" strokeDasharray="3,3" />

            {/* Class & Năm học */}
            <text x="0" y="190" fontWeight="bold" fill="#0f766e" className="svg-label-text" fontSize="34">Lớp:</text>
            <foreignObject x="90" y="135" width="160" height="80" className="print:hidden">
              <input
                type="text"
                value={label.className}
                onChange={(e) => handleUpdateLabelField(label.id, 'className', e.target.value)}
                className="svg-input-text w-full h-full bg-transparent border-0 p-0 text-slate-800 font-normal focus:ring-0 focus:outline-none hover:bg-slate-100 hover:bg-slate-100 rounded px-1 transition-colors"
                style={{ fontSize: '34px' }}
              />
            </foreignObject>
            <text x="90" y="190" fill="#1e293b" className="svg-label-text hidden print:block" fontSize="34">{label.className}</text>
            <line x1="80" y1="198" x2="250" y2="198" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3,3" />

            <text x="280" y="190" fontWeight="bold" fill="#0f766e" className="svg-label-text" fontSize="34">Năm học:</text>
            <foreignObject x="440" y="135" width="290" height="80" className="print:hidden">
              <input
                type="text"
                value={label.schoolYear}
                onChange={(e) => handleUpdateLabelField(label.id, 'schoolYear', e.target.value)}
                className="svg-input-text w-full h-full bg-transparent border-0 p-0 text-slate-800 font-normal focus:ring-0 focus:outline-none hover:bg-slate-100 focus:bg-slate-100 rounded px-1 transition-colors"
                style={{ fontSize: '34px' }}
              />
            </foreignObject>
            <text x="440" y="190" fill="#1e293b" className="svg-label-text hidden print:block" fontSize="34">{label.schoolYear}</text>
            <line x1="430" y1="198" x2="730" y2="198" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3,3" />
          </g>

          {(() => {
            if (!label.slogan) return null;
            const lines = splitSlogan(label.slogan, 42);
            if (lines.length === 2) {
              return (
                <g transform={`translate(${width / 2}, 522)`}>
                  <text textAnchor="middle" fill="#0f766e" fontSize="28" fontStyle="italic" fontWeight="bold" className="svg-label-text">
                    “ {lines[0]}
                  </text>
                  <text dy="36" textAnchor="middle" fill="#0f766e" fontSize="28" fontStyle="italic" fontWeight="bold" className="svg-label-text">
                    {lines[1]} ”
                  </text>
                </g>
              );
            }
            return (
              <text x={width / 2} y="540" textAnchor="middle" fill="#0f766e" fontSize="30" fontStyle="italic" fontWeight="bold" className="svg-label-text">
                “ {label.slogan} ”
              </text>
            );
          })()}
        </svg>
      );
    }

    if (template === 'chibi') {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full h-full">
          {customStyleBlock}
          <defs>
            <linearGradient id={`chibiGrad-${label.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffedd5" />
              <stop offset="50%" stopColor="#fae8ff" />
              <stop offset="100%" stopColor="#e0f2fe" />
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill={`url(#chibiGrad-${label.id})`} rx="35" />
          
          <rect x="10" y="10" width={width - 20} height={height - 20} fill="none" stroke="#ec4899" strokeWidth="4" rx="15" />
          <rect x="18" y="18" width={width - 36} height={height - 36} fill="none" stroke="#f472b6" strokeWidth="2" rx="12" strokeDasharray="10,10" />

          <g fill="#ec4899" opacity="0.3">
            <path d="M 850 100 L 855 115 L 870 115 L 858 125 L 862 140 L 850 130 L 838 140 L 842 125 L 830 115 L 845 115 Z" />
            <path d="M 120 480 L 123 490 L 133 490 L 125 496 L 128 506 L 120 500 L 112 506 L 115 496 L 107 490 L 117 490 Z" transform="scale(0.8)" />
            <circle cx="80" cy="120" r="15" fill="#f43f5e" />
            <circle cx="95" cy="120" r="15" fill="#f43f5e" />
            <circle cx="87.5" cy="130" r="15" fill="#f43f5e" />
          </g>

          {/* Header */}
          <g transform="translate(100, 110)">
            <circle cx="20" cy="10" r="30" fill="#ec4899" />
            <path d="M 10 -5 L 30 15 M 10 15 L 30 -5" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
            <text x="70" y="20" fill="#ec4899" fontSize="44" fontWeight="900" className="svg-label-text">{label.schoolName}</text>
          </g>

          <line x1="80" y1="180" x2="870" y2="180" stroke="#f472b6" strokeWidth="3" />

          <rect x="80" y="210" width={width - 160} height="260" fill="#ffffff" rx="20" opacity="0.85" stroke="#fbcfe8" strokeWidth="2" />

          <g transform="translate(120, 250)">
            {/* Subject */}
            <text x="0" y="30" fontWeight="bold" fill="#be185d" className="svg-label-text" fontSize="32">Vở học môn:</text>
            <foreignObject x="200" y="-25" width="490" height="80" className="print:hidden">
              <input
                type="text"
                value={label.subject}
                onChange={(e) => handleUpdateLabelField(label.id, 'subject', e.target.value)}
                className="svg-input-text w-full h-full bg-transparent border-0 p-0 text-pink-700 font-bold focus:ring-0 focus:outline-none hover:bg-pink-50 focus:bg-pink-50 rounded px-1 transition-colors"
                style={{ fontSize: '32px' }}
              />
            </foreignObject>
            <text x="200" y="30" fill="#1e293b" className="svg-label-text hidden print:block" fontSize="32" fontWeight="bold">{label.subject}</text>
            <line x1="190" y1="38" x2="690" y2="38" stroke="#f472b6" strokeWidth="1.5" strokeDasharray="5,5" />

            {/* Student Name */}
            <text x="0" y="110" fontWeight="bold" fill="#be185d" className="svg-label-text" fontSize="32">Họ và tên bé:</text>
            <foreignObject x="220" y="45" width="470" height="90" className="print:hidden">
              <input
                type="text"
                value={label.studentName}
                onChange={(e) => handleUpdateLabelField(label.id, 'studentName', e.target.value)}
                className="svg-input-text w-full h-full bg-transparent border-0 p-0 text-pink-600 font-bold focus:ring-0 focus:outline-none hover:bg-pink-50 focus:bg-pink-50 rounded px-1 transition-colors"
                style={{ fontSize: '40px' }}
              />
            </foreignObject>
            <text x="220" y="110" fill="#db2777" className="svg-label-text hidden print:block" fontSize="40" fontWeight="bold">{label.studentName}</text>
            <line x1="210" y1="118" x2="690" y2="118" stroke="#f472b6" strokeWidth="2" strokeDasharray="5,5" />

            {/* Class & Year */}
            <text x="0" y="190" fontWeight="bold" fill="#be185d" className="svg-label-text" fontSize="32">Lớp lớp:</text>
            <foreignObject x="140" y="135" width="110" height="80" className="print:hidden">
              <input
                type="text"
                value={label.className}
                onChange={(e) => handleUpdateLabelField(label.id, 'className', e.target.value)}
                className="svg-input-text w-full h-full bg-transparent border-0 p-0 text-slate-800 font-normal focus:ring-0 focus:outline-none hover:bg-pink-50 focus:bg-pink-50 rounded px-1 transition-colors"
                style={{ fontSize: '32px' }}
              />
            </foreignObject>
            <text x="140" y="190" fill="#1e293b" className="svg-label-text hidden print:block" fontSize="32">{label.className}</text>
            <line x1="130" y1="198" x2="250" y2="198" stroke="#f472b6" strokeWidth="1.5" strokeDasharray="5,5" />

            <text x="280" y="190" fontWeight="bold" fill="#be185d" className="svg-label-text" fontSize="32">Năm học:</text>
            <foreignObject x="430" y="135" width="260" height="80" className="print:hidden">
              <input
                type="text"
                value={label.schoolYear}
                onChange={(e) => handleUpdateLabelField(label.id, 'schoolYear', e.target.value)}
                className="svg-input-text w-full h-full bg-transparent border-0 p-0 text-slate-800 font-normal focus:ring-0 focus:outline-none hover:bg-pink-50 focus:bg-pink-50 rounded px-1 transition-colors"
                style={{ fontSize: '32px' }}
              />
            </foreignObject>
            <text x="430" y="190" fill="#1e293b" className="svg-label-text hidden print:block" fontSize="32">{label.schoolYear}</text>
            <line x1="420" y1="198" x2="690" y2="198" stroke="#f472b6" strokeWidth="1.5" strokeDasharray="5,5" />
          </g>

          {(() => {
            if (!label.slogan) return null;
            const lines = splitSlogan(label.slogan, 42);
            if (lines.length === 2) {
              return (
                <g transform={`translate(${width / 2}, 515)`}>
                  <text textAnchor="middle" fill="#db2777" fontSize="30" fontStyle="italic" className="svg-label-text">
                    ✿ {lines[0]}
                  </text>
                  <text dy="36" textAnchor="middle" fill="#db2777" fontSize="30" fontStyle="italic" className="svg-label-text">
                    {lines[1]} ✿
                  </text>
                </g>
              );
            }
            return (
              <g transform={`translate(${width / 2}, 530)`}>
                <text textAnchor="middle" fill="#db2777" fontSize="32" fontStyle="italic" className="svg-label-text">
                  ✿ {label.slogan} ✿
                </text>
              </g>
            );
          })()}
        </svg>
      );
    }

    if (template === 'space') {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full h-full">
          {customStyleBlock}
          <defs>
            <linearGradient id={`spaceGrad-${label.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0B132B" />
              <stop offset="100%" stopColor="#1C2541" />
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill={`url(#spaceGrad-${label.id})`} rx="25" />
          <rect x="10" y="10" width={width - 20} height={height - 20} fill="none" stroke="#38bdf8" strokeWidth="4" rx="12" />
          <rect x="18" y="18" width={width - 36} height={height - 36} fill="none" stroke="#818cf8" strokeWidth="1" rx="10" opacity="0.3" strokeDasharray="5,5" />

          {/* Stars & Planets */}
          <g fill="#ffffff" opacity="0.2">
            <circle cx="120" cy="150" r="2" />
            <circle cx="850" cy="300" r="3" />
            <circle cx="750" cy="130" r="2" />
            <circle cx="150" cy="480" r="2" />
            <circle cx="850" cy="130" r="20" fill="none" stroke="#38bdf8" strokeWidth="2" />
            <ellipse cx="850" cy="130" rx="35" ry="8" fill="none" stroke="#38bdf8" strokeWidth="1.5" transform="rotate(-15, 850, 130)" />
            <path d="M 80 430 L 100 410 L 95 400 L 75 420 Z" fill="#818cf8" />
            <path d="M 90 420 L 110 380 L 115 390 L 100 425 Z" fill="#38bdf8" />
          </g>

          {/* Header */}
          <g transform="translate(100, 105)">
            <circle cx="0" cy="0" r="25" fill="#38bdf8" />
            <text x="0" y="8" fill="#0B132B" fontSize="24" fontWeight="bold" textAnchor="middle" className="svg-label-text">🚀</text>
            <text x="45" y="12" fill="#38bdf8" fontSize="48" fontWeight="900" className="svg-label-text" letterSpacing="1">{label.schoolName.toUpperCase()}</text>
          </g>

          <line x1="80" y1="180" x2="870" y2="180" stroke="#38bdf8" strokeWidth="2" opacity="0.4" />

          {/* Fields */}
          <g transform="translate(100, 240)">
            <text x="0" y="30" fontWeight="bold" fill="#38bdf8" className="svg-label-text" fontSize="34">Vở ghi:</text>
            <foreignObject x="140" y="-25" width="630" height="80" className="print:hidden">
              <input
                type="text"
                value={label.subject}
                onChange={(e) => handleUpdateLabelField(label.id, 'subject', e.target.value)}
                className="svg-input-text w-full h-full bg-transparent border-0 p-0 text-white font-normal focus:ring-0 focus:outline-none hover:bg-white/10 focus:bg-white/10 rounded px-1 transition-colors"
                style={{ fontSize: '34px' }}
              />
            </foreignObject>
            <text x="140" y="30" fill="#ffffff" className="svg-label-text hidden print:block" fontSize="34">{label.subject}</text>
            <line x1="130" y1="38" x2="770" y2="38" stroke="#38bdf8" strokeWidth="2" strokeDasharray="5,5" opacity="0.6" />

            <text x="0" y="110" fontWeight="bold" fill="#38bdf8" className="svg-label-text" fontSize="34">Học sinh:</text>
            <foreignObject x="160" y="45" width="610" height="90" className="print:hidden">
              <input
                type="text"
                value={label.studentName}
                onChange={(e) => handleUpdateLabelField(label.id, 'studentName', e.target.value)}
                className="svg-input-text w-full h-full bg-transparent border-0 p-0 text-white font-bold focus:ring-0 focus:outline-none hover:bg-white/10 focus:bg-white/10 rounded px-1 transition-colors"
                style={{ fontSize: '40px' }}
              />
            </foreignObject>
            <text x="160" y="110" fill="#ffffff" className="svg-label-text hidden print:block" fontSize="40" fontWeight="bold">{label.studentName}</text>
            <line x1="150" y1="118" x2="770" y2="118" stroke="#38bdf8" strokeWidth="2" strokeDasharray="5,5" opacity="0.6" />

            {/* Class & Year */}
            <text x="0" y="190" fontWeight="bold" fill="#38bdf8" className="svg-label-text" fontSize="34">Lớp:</text>
            <foreignObject x="90" y="135" width="160" height="80" className="print:hidden">
              <input
                type="text"
                value={label.className}
                onChange={(e) => handleUpdateLabelField(label.id, 'className', e.target.value)}
                className="svg-input-text w-full h-full bg-transparent border-0 p-0 text-white font-normal focus:ring-0 focus:outline-none hover:bg-white/10 focus:bg-white/10 rounded px-1 transition-colors"
                style={{ fontSize: '34px' }}
              />
            </foreignObject>
            <text x="90" y="190" fill="#ffffff" className="svg-label-text hidden print:block" fontSize="34">{label.className}</text>
            <line x1="80" y1="198" x2="250" y2="198" stroke="#38bdf8" strokeWidth="2" strokeDasharray="5,5" opacity="0.6" />

            <text x="280" y="190" fontWeight="bold" fill="#38bdf8" className="svg-label-text" fontSize="34">Năm học:</text>
            <foreignObject x="450" y="135" width="320" height="80" className="print:hidden">
              <input
                type="text"
                value={label.schoolYear}
                onChange={(e) => handleUpdateLabelField(label.id, 'schoolYear', e.target.value)}
                className="svg-input-text w-full h-full bg-transparent border-0 p-0 text-white font-normal focus:ring-0 focus:outline-none hover:bg-white/10 focus:bg-white/10 rounded px-1 transition-colors"
                style={{ fontSize: '34px' }}
              />
            </foreignObject>
            <text x="450" y="190" fill="#ffffff" className="svg-label-text hidden print:block" fontSize="34">{label.schoolYear}</text>
            <line x1="440" y1="198" x2="770" y2="198" stroke="#38bdf8" strokeWidth="2" strokeDasharray="5,5" opacity="0.6" />
          </g>

          {(() => {
            if (!label.slogan) return null;
            const lines = splitSlogan(label.slogan, 42);
            if (lines.length === 2) {
              return (
                <g transform={`translate(${width / 2}, 522)`}>
                  <text textAnchor="middle" fill="#818cf8" fontSize="28" fontStyle="italic" className="svg-label-text">
                    ✧ {lines[0]}
                  </text>
                  <text dy="36" textAnchor="middle" fill="#818cf8" fontSize="28" fontStyle="italic" className="svg-label-text">
                    {lines[1]} ✧
                  </text>
                </g>
              );
            }
            return (
              <g transform={`translate(${width / 2}, 540)`}>
                <text textAnchor="middle" fill="#818cf8" fontSize="30" fontStyle="italic" className="svg-label-text">
                  ✧ {label.slogan} ✧
                </text>
              </g>
            );
          })()}
        </svg>
      );
    }

    if (template === 'vintage') {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full h-full">
          {customStyleBlock}
          <rect width="100%" height="100%" fill="#FAF7F2" rx="25" />
          <rect x="10" y="10" width={width - 20} height={height - 20} fill="none" stroke="#2D4A22" strokeWidth="3" rx="12" />
          <rect x="18" y="18" width={width - 36} height={height - 36} fill="none" stroke="#2D4A22" strokeWidth="1" rx="10" opacity="0.5" />

          {/* Botanical drawings */}
          <g stroke="#2D4A22" strokeWidth="2.5" fill="none" opacity="0.3" strokeLinecap="round">
            <path d="M 850 40 Q 820 90 860 130" />
            <path d="M 835 65 Q 820 55 830 45" />
            <path d="M 838 85 Q 815 85 825 75" />
            <path d="M 850 110 Q 830 115 840 100" />
            <path d="M 80 500 Q 110 450 70 410" />
            <path d="M 95 475 Q 110 485 100 495" />
            <path d="M 92 455 Q 115 455 105 465" />
          </g>

          {/* Header */}
          <g transform="translate(100, 105)">
            <path d="M -30 10 Q -10 -20 10 10" fill="none" stroke="#2D4A22" strokeWidth="4" strokeLinecap="round" />
            <path d="M -15 -5 Q -25 -15 -15 -20" fill="#2D4A22" />
            <path d="M 0 -5 Q 10 -15 0 -20" fill="#2D4A22" />
            <text x="45" y="12" fill="#2D4A22" fontSize="48" fontWeight="900" className="svg-label-text" letterSpacing="1">{label.schoolName.toUpperCase()}</text>
          </g>

          <line x1="80" y1="180" x2="870" y2="180" stroke="#2D4A22" strokeWidth="2" opacity="0.3" />

          {/* Fields */}
          <g transform="translate(120, 240)">
            <text x="0" y="30" fontWeight="bold" fill="#2D4A22" className="svg-label-text" fontSize="34">Vở học môn:</text>
            <foreignObject x="210" y="-25" width="520" height="80" className="print:hidden">
              <input
                type="text"
                value={label.subject}
                onChange={(e) => handleUpdateLabelField(label.id, 'subject', e.target.value)}
                className="svg-input-text w-full h-full bg-transparent border-0 p-0 text-slate-800 font-normal focus:ring-0 focus:outline-none hover:bg-green-100/30 focus:bg-green-100/30 rounded px-1 transition-colors"
                style={{ fontSize: '34px' }}
              />
            </foreignObject>
            <text x="210" y="30" fill="#4A3728" className="svg-label-text hidden print:block" fontSize="34">{label.subject}</text>
            <line x1="200" y1="38" x2="730" y2="38" stroke="#2D4A22" strokeWidth="1.5" strokeDasharray="3,3" opacity="0.6" />

            <text x="0" y="110" fontWeight="bold" fill="#2D4A22" className="svg-label-text" fontSize="34">Học sinh:</text>
            <foreignObject x="180" y="45" width="550" height="90" className="print:hidden">
              <input
                type="text"
                value={label.studentName}
                onChange={(e) => handleUpdateLabelField(label.id, 'studentName', e.target.value)}
                className="svg-input-text w-full h-full bg-transparent border-0 p-0 text-slate-800 font-bold focus:ring-0 focus:outline-none hover:bg-green-100/30 focus:bg-green-100/30 rounded px-1 transition-colors"
                style={{ fontSize: '40px' }}
              />
            </foreignObject>
            <text x="180" y="110" fill="#2D4A22" className="svg-label-text hidden print:block" fontSize="40" fontWeight="bold">{label.studentName}</text>
            <line x1="170" y1="118" x2="730" y2="118" stroke="#2D4A22" strokeWidth="1.5" strokeDasharray="3,3" opacity="0.6" />

            {/* Class & Year */}
            <text x="0" y="190" fontWeight="bold" fill="#2D4A22" className="svg-label-text" fontSize="34">Lớp:</text>
            <foreignObject x="90" y="135" width="160" height="80" className="print:hidden">
              <input
                type="text"
                value={label.className}
                onChange={(e) => handleUpdateLabelField(label.id, 'className', e.target.value)}
                className="svg-input-text w-full h-full bg-transparent border-0 p-0 text-slate-800 font-normal focus:ring-0 focus:outline-none hover:bg-green-100/30 focus:bg-green-100/30 rounded px-1 transition-colors"
                style={{ fontSize: '34px' }}
              />
            </foreignObject>
            <text x="90" y="190" fill="#4A3728" className="svg-label-text hidden print:block" fontSize="34">{label.className}</text>
            <line x1="80" y1="198" x2="250" y2="198" stroke="#2D4A22" strokeWidth="1.5" strokeDasharray="3,3" opacity="0.6" />

            <text x="280" y="190" fontWeight="bold" fill="#2D4A22" className="svg-label-text" fontSize="34">Năm học:</text>
            <foreignObject x="440" y="135" width="290" height="80" className="print:hidden">
              <input
                type="text"
                value={label.schoolYear}
                onChange={(e) => handleUpdateLabelField(label.id, 'schoolYear', e.target.value)}
                className="svg-input-text w-full h-full bg-transparent border-0 p-0 text-slate-800 font-normal focus:ring-0 focus:outline-none hover:bg-green-100/30 focus:bg-green-100/30 rounded px-1 transition-colors"
                style={{ fontSize: '34px' }}
              />
            </foreignObject>
            <text x="440" y="190" fill="#4A3728" className="svg-label-text hidden print:block" fontSize="34">{label.schoolYear}</text>
            <line x1="430" y1="198" x2="730" y2="198" stroke="#2D4A22" strokeWidth="1.5" strokeDasharray="3,3" opacity="0.6" />
          </g>

          {(() => {
            if (!label.slogan) return null;
            const lines = splitSlogan(label.slogan, 42);
            if (lines.length === 2) {
              return (
                <g transform={`translate(${width / 2}, 527)`}>
                  <text textAnchor="middle" fill="#2D4A22" fontSize="28" fontStyle="italic" className="svg-label-text">
                    “ {lines[0]}
                  </text>
                  <text dy="36" textAnchor="middle" fill="#2D4A22" fontSize="28" fontStyle="italic" className="svg-label-text">
                    {lines[1]} ”
                  </text>
                </g>
              );
            }
            return (
              <text x={width / 2} y="545" textAnchor="middle" fill="#2D4A22" fontSize="30" fontStyle="italic" className="svg-label-text">
                “ {label.slogan} ”
              </text>
            );
          })()}
        </svg>
      );
    }

    if (template === 'sporty') {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full h-full">
          {customStyleBlock}
          <rect width="100%" height="100%" fill="#f8fafc" rx="25" />
          
          <path d="M 0 0 L 150 0 L 0 150 Z" fill="#1d4ed8" opacity="0.8" />
          <path d="M 0 0 L 100 0 L 0 100 Z" fill="#ea580c" />
          <path d="M 950 620 L 800 620 L 950 470 Z" fill="#ea580c" opacity="0.8" />
          <path d="M 950 620 L 850 620 L 950 520 Z" fill="#1d4ed8" />

          <rect x="10" y="10" width={width - 20} height={height - 20} fill="none" stroke="#0f172a" strokeWidth="4" rx="12" />

          {/* Header */}
          <g transform="translate(180, 105)">
            <path d="M -30 -20 L -10 -20 L -20 5 L -5 5 L -35 35 L -20 10 L -35 10 Z" fill="#ea580c" />
            <text x="0" y="12" fill="#0f172a" fontSize="48" fontWeight="900" className="svg-label-text" letterSpacing="1">{label.schoolName.toUpperCase()}</text>
          </g>

          <line x1="150" y1="180" x2="800" y2="180" stroke="#0f172a" strokeWidth="3" />

          {/* Fields */}
          <g transform="translate(150, 240)">
            <text x="0" y="30" fontWeight="bold" fill="#1d4ed8" className="svg-label-text" fontSize="34">Môn học:</text>
            <foreignObject x="170" y="-25" width="510" height="80" className="print:hidden">
              <input
                type="text"
                value={label.subject}
                onChange={(e) => handleUpdateLabelField(label.id, 'subject', e.target.value)}
                className="svg-input-text w-full h-full bg-transparent border-0 p-0 text-slate-800 font-bold focus:ring-0 focus:outline-none hover:bg-slate-100 focus:bg-slate-100 rounded px-1 transition-colors"
                style={{ fontSize: '34px' }}
              />
            </foreignObject>
            <text x="170" y="30" fill="#0f172a" className="svg-label-text hidden print:block" fontSize="34">{label.subject}</text>
            <line x1="160" y1="38" x2="680" y2="38" stroke="#0f172a" strokeWidth="2" />

            <text x="0" y="110" fontWeight="bold" fill="#1d4ed8" className="svg-label-text" fontSize="34">Học sinh:</text>
            <foreignObject x="170" y="45" width="510" height="90" className="print:hidden">
              <input
                type="text"
                value={label.studentName}
                onChange={(e) => handleUpdateLabelField(label.id, 'studentName', e.target.value)}
                className="svg-input-text w-full h-full bg-transparent border-0 p-0 text-slate-800 font-bold focus:ring-0 focus:outline-none hover:bg-slate-100 focus:bg-slate-100 rounded px-1 transition-colors"
                style={{ fontSize: '40px' }}
              />
            </foreignObject>
            <text x="170" y="110" fill="#0f172a" className="svg-label-text hidden print:block" fontSize="40" fontWeight="bold">{label.studentName}</text>
            <line x1="160" y1="118" x2="680" y2="118" stroke="#0f172a" strokeWidth="2" />

            {/* Class & Year */}
            <text x="0" y="190" fontWeight="bold" fill="#1d4ed8" className="svg-label-text" fontSize="34">Lớp:</text>
            <foreignObject x="90" y="135" width="140" height="80" className="print:hidden">
              <input
                type="text"
                value={label.className}
                onChange={(e) => handleUpdateLabelField(label.id, 'className', e.target.value)}
                className="svg-input-text w-full h-full bg-transparent border-0 p-0 text-slate-800 font-normal focus:ring-0 focus:outline-none hover:bg-slate-100 focus:bg-slate-100 rounded px-1 transition-colors"
                style={{ fontSize: '34px' }}
              />
            </foreignObject>
            <text x="90" y="190" fill="#0f172a" className="svg-label-text hidden print:block" fontSize="34">{label.className}</text>
            <line x1="80" y1="198" x2="230" y2="198" stroke="#0f172a" strokeWidth="2" />

            <text x="260" y="190" fontWeight="bold" fill="#1d4ed8" className="svg-label-text" fontSize="34">Năm học:</text>
            <foreignObject x="420" y="135" width="260" height="80" className="print:hidden">
              <input
                type="text"
                value={label.schoolYear}
                onChange={(e) => handleUpdateLabelField(label.id, 'schoolYear', e.target.value)}
                className="svg-input-text w-full h-full bg-transparent border-0 p-0 text-slate-800 font-normal focus:ring-0 focus:outline-none hover:bg-slate-100 focus:bg-slate-100 rounded px-1 transition-colors"
                style={{ fontSize: '34px' }}
              />
            </foreignObject>
            <text x="420" y="190" fill="#0f172a" className="svg-label-text hidden print:block" fontSize="34">{label.schoolYear}</text>
            <line x1="410" y1="198" x2="680" y2="198" stroke="#0f172a" strokeWidth="2" />
          </g>

          {(() => {
            if (!label.slogan) return null;
            const lines = splitSlogan(label.slogan, 42);
            if (lines.length === 2) {
              return (
                <g transform={`translate(${width / 2}, 527)`}>
                  <text textAnchor="middle" fill="#ea580c" fontSize="28" fontWeight="900" className="svg-label-text">
                    ⚡ {lines[0].toUpperCase()}
                  </text>
                  <text dy="36" textAnchor="middle" fill="#ea580c" fontSize="28" fontWeight="900" className="svg-label-text">
                    {lines[1].toUpperCase()} ⚡
                  </text>
                </g>
              );
            }
            return (
              <text x={width / 2} y="545" textAnchor="middle" fill="#ea580c" fontSize="30" fontWeight="900" className="svg-label-text">
                ⚡ {label.slogan.toUpperCase()} ⚡
              </text>
            );
          })()}
        </svg>
      );
    }

    // Default Minimalist
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full h-full">
        {customStyleBlock}
        <rect width="100%" height="100%" fill="#ffffff" rx="10" />
        
        <rect x="10" y="10" width={width - 20} height={height - 20} fill="none" stroke="#000000" strokeWidth="5" rx="6" />
        <rect x="18" y="18" width={width - 36} height={height - 36} fill="none" stroke="#000000" strokeWidth="1.5" rx="4" />

        {/* Header */}
        <g transform="translate(100, 110)">
          <text x="0" y="10" fill="#000000" fontSize="48" fontWeight="bold" letterSpacing="1" className="svg-label-text">{label.schoolName.toUpperCase()}</text>
        </g>

        <line x1="50" y1="170" x2="900" y2="170" stroke="#000000" strokeWidth="3" />

        <g transform="translate(100, 250)" fill="#000000">
          {/* Subject */}
          <text x="0" y="30" fontWeight="bold" fontSize="34" className="svg-label-text">Môn học / Loại tập:</text>
          <foreignObject x="340" y="-25" width="460" height="80" className="print:hidden">
            <input
              type="text"
              value={label.subject}
              onChange={(e) => handleUpdateLabelField(label.id, 'subject', e.target.value)}
              className="svg-input-text w-full h-full bg-transparent border-0 p-0 text-black font-normal focus:ring-0 focus:outline-none hover:bg-slate-100 focus:bg-slate-100 rounded px-1 transition-colors"
              style={{ fontSize: '34px' }}
            />
          </foreignObject>
          <text x="340" y="30" fill="#000000" fontSize="34" className="svg-label-text hidden print:block">{label.subject}</text>
          <line x1="330" y1="40" x2="800" y2="40" stroke="#000000" strokeWidth="1.5" strokeDasharray="5,5" />

          {/* Student Name */}
          <text x="0" y="120" fontWeight="bold" fontSize="34" className="svg-label-text">Họ và tên học sinh:</text>
          <foreignObject x="340" y="55" width="460" height="90" className="print:hidden">
            <input
              type="text"
              value={label.studentName}
              onChange={(e) => handleUpdateLabelField(label.id, 'studentName', e.target.value)}
              className="svg-input-text w-full h-full bg-transparent border-0 p-0 text-black font-bold focus:ring-0 focus:outline-none hover:bg-slate-100/80 focus:bg-slate-100/80 rounded px-1 transition-colors"
              style={{ fontSize: '40px' }}
            />
          </foreignObject>
          <text x="340" y="120" fill="#000000" fontSize="40" fontWeight="bold" className="svg-label-text hidden print:block">{label.studentName}</text>
          <line x1="330" y1="130" x2="800" y2="130" stroke="#000000" strokeWidth="2" strokeDasharray="5,5" />

          {/* Class & Year */}
          <text x="0" y="210" fontWeight="bold" fontSize="34" className="svg-label-text">Lớp:</text>
          <foreignObject x="90" y="135" width="160" height="80" className="print:hidden">
            <input
              type="text"
              value={label.className}
              onChange={(e) => handleUpdateLabelField(label.id, 'className', e.target.value)}
              className="svg-input-text w-full h-full bg-transparent border-0 p-0 text-black font-normal focus:ring-0 focus:outline-none hover:bg-slate-100 focus:bg-slate-100 rounded px-1 transition-colors"
              style={{ fontSize: '34px' }}
            />
          </foreignObject>
          <text x="90" y="210" fill="#000000" fontSize="34" className="svg-label-text hidden print:block">{label.className}</text>
          <line x1="80" y1="220" x2="250" y2="220" stroke="#000000" strokeWidth="1.5" strokeDasharray="5,5" />

          <text x="280" y="210" fontWeight="bold" fontSize="34" className="svg-label-text">Năm học:</text>
          <foreignObject x="440" y="135" width="360" height="80" className="print:hidden">
            <input
              type="text"
              value={label.schoolYear}
              onChange={(e) => handleUpdateLabelField(label.id, 'schoolYear', e.target.value)}
              className="svg-input-text w-full h-full bg-transparent border-0 p-0 text-black font-normal focus:ring-0 focus:outline-none hover:bg-slate-100 focus:bg-slate-100 rounded px-1 transition-colors"
              style={{ fontSize: '34px' }}
            />
          </foreignObject>
          <text x="440" y="210" fill="#000000" fontSize="34" className="svg-label-text hidden print:block">{label.schoolYear}</text>
          <line x1="430" y1="220" x2="800" y2="220" stroke="#000000" strokeWidth="1.5" strokeDasharray="5,5" />
        </g>

        {(() => {
          if (!label.slogan) return null;
          const lines = splitSlogan(label.slogan, 42);
          if (lines.length === 2) {
            return (
              <g transform={`translate(${width / 2}, 522)`}>
                <text textAnchor="middle" fill="#000000" fontSize="28" fontStyle="italic" className="svg-label-text">
                  “ {lines[0]}
                </text>
                <text dy="36" textAnchor="middle" fill="#000000" fontSize="28" fontStyle="italic" className="svg-label-text">
                  {lines[1]} ”
                </text>
              </g>
            );
          }
          return (
            <text x={width / 2} y="540" textAnchor="middle" fill="#000000" fontSize="30" fontStyle="italic" className="svg-label-text">
              “ {label.slogan} ”
            </text>
          );
        })()}
      </svg>
    );
  };

  return (
    <div className="space-y-6">
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,400;0,600;0,700;0,900;1,400;1,600&family=Comfortaa:wght@400;700&family=Mali:ital,wght@0,400;0,700;1,400&family=Nunito:ital,wght@0,400;0,700;1,400&family=Pacifico&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap" />
      
      <style dangerouslySetInnerHTML={{ __html: `
        /* Default print portal container is hidden on screen */
        #print-area-portal {
          display: none;
        }

        @media print {
          /* Force body background to white to prevent color bleed */
          html, body {
            background: white !important;
            background-color: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* Hide the main React root to prevent dashboard layout/background leakage */
          #root {
            display: none !important;
          }
          
          /* Display the body print portal cleanly on A4 landscape page (4 cols x 4 rows = 16 labels) */
          #print-area-portal {
            display: block !important;
            position: absolute !important;
            left: 50% !important;
            top: 1.0cm !important;
            transform: translateX(-50%) !important;
            width: 28.0cm !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
            box-shadow: none !important;
            visibility: visible !important;
          }

          #print-area-portal * {
            visibility: visible !important;
          }

          .print-grid {
            display: grid !important;
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 0 !important;
            width: 100% !important;
            background: white !important;
          }

          .print-card {
            width: 7.0cm !important;
            height: 4.6cm !important;
            border: 1px dashed #ccc !important;
            box-shadow: none !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            overflow: hidden !important;
            padding: 0 !important;
            margin: 0 !important;
            background: transparent !important;
          }

          @page {
            size: A4 landscape;
            margin: 0 !important;
          }
        }
      `}} />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 no-print">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-teal-50 text-teal-700 rounded-xl">
            <Tag size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Tạo Nhãn Vở Học Sinh</h1>
            <p className="text-slate-500 text-sm mt-0.5">Tạo và thiết kế nhãn vở học sinh đồng loạt theo môn học hoặc in lẻ thủ công.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadPdf}
            disabled={labels.length === 0 || exportingPdf}
            className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 disabled:opacity-50 transition-all shadow-sm"
          >
            {exportingPdf ? (
              <RefreshCw size={18} className="animate-spin text-teal-600" />
            ) : (
              <FileDown size={18} className="text-teal-600" />
            )}
            {exportingPdf ? "Đang tạo PDF..." : "Xuất tệp PDF (A4)"}
          </button>
          
          <button
            onClick={handlePrint}
            disabled={labels.length === 0}
            className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 transition-all shadow-md hover:shadow-lg"
          >
            <Printer size={18} />
            In nhãn vở (A4)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 no-print">
        {/* Settings Panel */}
        <div className="space-y-6">
          {/* Main Print Mode Selection */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
            <h2 className="text-md font-bold text-slate-700 flex items-center gap-2">
              <BookOpen size={18} className="text-teal-600" />
              Chế độ tạo nhãn vở
            </h2>
            
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setPrintMode('curriculum');
                  setLabels([]);
                }}
                className={`flex-1 py-2.5 rounded-lg text-xs font-bold text-center transition-all ${printMode === 'curriculum' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                In trọn bộ môn (Khối/Sách)
              </button>
              <button
                type="button"
                onClick={() => {
                  setPrintMode('manual');
                  setLabels([]);
                }}
                className={`flex-1 py-2.5 rounded-lg text-xs font-bold text-center transition-all ${printMode === 'manual' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                In lẻ từng nhãn
              </button>
            </div>
          </div>

          {/* Unified Student & School Information Card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
            <h2 className="text-md font-bold text-slate-700 flex items-center gap-2">
              <School size={18} className="text-teal-600" />
              Thông tin nhãn vở
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tên trường / Trung tâm</label>
                <input
                  type="text"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="w-full rounded-xl border-slate-200 focus:border-teal-500 focus:ring-teal-500 py-3 px-4 text-base font-bold text-slate-800 placeholder-slate-400 bg-slate-50/50"
                  placeholder="Ví dụ: LỚP TOÁN THẦY LĨNH..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tên học sinh</label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full rounded-xl border-slate-200 focus:border-teal-500 focus:ring-teal-500 py-3 px-4 text-base font-bold text-slate-800 placeholder-slate-400 bg-slate-50/50"
                  placeholder="Nhập tên học sinh..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Lớp học</label>
                  <input
                    type="text"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    className="w-full rounded-xl border-slate-200 focus:border-teal-500 focus:ring-teal-500 py-3 px-4 text-base font-bold text-slate-800 placeholder-slate-400 bg-slate-50/50"
                    placeholder="Ví dụ: 6A1..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Năm học</label>
                  <input
                    type="text"
                    value={schoolYear}
                    onChange={(e) => setSchoolYear(e.target.value)}
                    className="w-full rounded-xl border-slate-200 focus:border-teal-500 focus:ring-teal-500 py-3 px-4 text-base font-bold text-slate-800 placeholder-slate-400 bg-slate-50/50"
                    placeholder="Ví dụ: 2026 - 2027..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Type size={14} className="text-slate-450" />
                  Font chữ nhãn vở
                </label>
                <select
                  value={selectedFont}
                  onChange={(e) => setSelectedFont(e.target.value)}
                  className="w-full rounded-xl border-slate-200 text-sm focus:border-teal-500 focus:ring-teal-500 py-2.5 bg-slate-50/50 font-medium text-slate-700"
                >
                  {FONTS_LIST.map((f) => (
                    <option key={f.name} value={f.name}>
                      {f.name} ({f.label})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Curriculum Mode configurations */}
          {printMode === 'curriculum' && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
              <h2 className="text-md font-bold text-slate-700 flex items-center gap-2">
                <Layers size={18} className="text-teal-600" />
                Cấu hình bộ môn học
              </h2>

              <div className="space-y-4">
                {/* Grade Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Chọn Khối Lớp</label>
                  <select
                    value={selectedGrade}
                    onChange={(e) => setSelectedGrade(e.target.value)}
                    className="w-full rounded-xl border-slate-200 text-sm focus:border-teal-500 focus:ring-teal-500 py-2.5"
                  >
                    <option value="6">Khối 6</option>
                    <option value="7">Khối 7</option>
                    <option value="8">Khối 8</option>
                    <option value="9">Khối 9</option>
                    <option value="10">Khối 10</option>
                    <option value="11">Khối 11</option>
                    <option value="12">Khối 12</option>
                  </select>
                </div>

                {/* Book Series Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Bộ sách giáo khoa</label>
                  <select
                    value={selectedCurriculum}
                    onChange={(e) => setSelectedCurriculum(e.target.value)}
                    className="w-full rounded-xl border-slate-200 text-sm focus:border-teal-500 focus:ring-teal-500 py-2.5"
                  >
                    <option value="ketnoi">Kết nối tri thức và cuộc sống</option>
                    <option value="chantroi">Chân trời sáng tạo</option>
                    <option value="canhdieu">Cánh diều</option>
                    <option value="none">Tự do (Không in tên sách)</option>
                  </select>
                </div>

                {/* Subject Checklist */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Danh sách môn học</label>
                    <div className="flex items-center gap-2 text-[11px]">
                      <button type="button" onClick={() => handleToggleAllSubjects(true)} className="text-teal-600 hover:underline">Chọn hết</button>
                      <span className="text-slate-300">|</span>
                      <button type="button" onClick={() => handleToggleAllSubjects(false)} className="text-slate-500 hover:underline">Bỏ chọn</button>
                    </div>
                  </div>

                  <div className="max-h-48 overflow-y-auto border border-slate-100 rounded-xl p-2 space-y-1 bg-slate-50/50 custom-scrollbar">
                    {curriculumSubjects.map((sub) => (
                      <label key={sub} className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={!!checkedSubjects[sub]}
                          onChange={() => handleToggleSubject(sub)}
                          className="rounded text-teal-600 focus:ring-teal-500 border-slate-300 w-4 h-4"
                        />
                        <span className="font-medium text-slate-700">{sub}</span>
                      </label>
                    ))}
                  </div>

                  <form onSubmit={handleAddCustomSubject} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Thêm môn khác..."
                      value={customSubjectInput}
                      onChange={(e) => setCustomSubjectInput(e.target.value)}
                      className="flex-1 rounded-lg border-slate-200 text-xs focus:border-teal-500 focus:ring-teal-500 py-1.5"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 transition-colors"
                    >
                      Thêm
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Manual Mode subject configurations */}
          {printMode === 'manual' && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
              <h2 className="text-md font-bold text-slate-700 flex items-center gap-2">
                <Layers size={18} className="text-teal-600" />
                Cấu hình môn học lẻ
              </h2>

              <form onSubmit={handleAddManualLabel} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Môn học / Loại tập</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Môn Toán, Vở bài tập Đại số..."
                    value={manualSubject}
                    onChange={(e) => setManualSubject(e.target.value)}
                    className="w-full rounded-xl border-slate-200 text-sm focus:border-teal-500 focus:ring-teal-500 py-2.5"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-all shadow-sm"
                >
                  <Plus size={16} />
                  Thêm nhãn vở lẻ này
                </button>
              </form>
            </div>
          )}

          {/* Design Templates Selector */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
            <h2 className="text-md font-bold text-slate-700 flex items-center gap-2">
              <Sparkles size={18} className="text-teal-600" />
              Mẫu thiết kế nhãn vở
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTemplate('teal')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${template === 'teal' ? 'border-teal-600 bg-teal-50 text-teal-700 font-bold' : 'border-slate-100 hover:border-slate-200 text-slate-500'}`}
              >
                <div className="w-8 h-8 rounded-full bg-teal-700 mb-1.5 shadow-inner" />
                <span className="text-xs">Thương hiệu Teal</span>
              </button>

              <button
                type="button"
                onClick={() => setTemplate('math')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${template === 'math' ? 'border-teal-600 bg-teal-50 text-teal-700 font-bold' : 'border-slate-100 hover:border-slate-200 text-slate-500'}`}
              >
                <div className="w-8 h-8 rounded-full bg-slate-300 border border-slate-400 mb-1.5 flex items-center justify-center text-[10px] font-bold text-slate-700">x²</div>
                <span className="text-xs">Toán học Doodle</span>
              </button>

              <button
                type="button"
                onClick={() => setTemplate('chibi')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${template === 'chibi' ? 'border-teal-600 bg-teal-50 text-teal-700 font-bold' : 'border-slate-100 hover:border-slate-200 text-slate-500'}`}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-orange-200 to-pink-200 mb-1.5 flex items-center justify-center text-xs">🌸</div>
                <span className="text-xs">Chibi dễ thương</span>
              </button>

              <button
                type="button"
                onClick={() => setTemplate('minimalist')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${template === 'minimalist' ? 'border-teal-600 bg-teal-50 text-teal-700 font-bold' : 'border-slate-100 hover:border-slate-200 text-slate-500'}`}
              >
                <div className="w-8 h-8 rounded-full bg-white border-2 border-black mb-1.5" />
                <span className="text-xs">Tối giản Classic</span>
              </button>

              <button
                type="button"
                onClick={() => setTemplate('space')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${template === 'space' ? 'border-teal-600 bg-teal-50 text-teal-700 font-bold' : 'border-slate-100 hover:border-slate-200 text-slate-500'}`}
              >
                <div className="w-8 h-8 rounded-full bg-slate-900 border border-sky-400 mb-1.5 flex items-center justify-center text-xs">🚀</div>
                <span className="text-xs">Hoạt họa Vũ trụ</span>
              </button>

              <button
                type="button"
                onClick={() => setTemplate('vintage')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${template === 'vintage' ? 'border-teal-600 bg-teal-50 text-teal-700 font-bold' : 'border-slate-100 hover:border-slate-200 text-slate-500'}`}
              >
                <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-600 mb-1.5 flex items-center justify-center text-xs">🌿</div>
                <span className="text-xs">Cổ hoa Vintage</span>
              </button>

              <button
                type="button"
                onClick={() => setTemplate('sporty')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${template === 'sporty' ? 'border-teal-600 bg-teal-50 text-teal-700 font-bold' : 'border-slate-100 hover:border-slate-200 text-slate-500'}`}
              >
                <div className="w-8 h-8 rounded-full bg-orange-100 border border-orange-500 mb-1.5 flex items-center justify-center text-xs">⚡</div>
                <span className="text-xs">Năng động Sporty</span>
              </button>
            </div>
          </div>

          {/* Slogan Selector */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 no-print space-y-4">
            <h2 className="text-md font-bold text-slate-700 flex items-center gap-2">
              <Calendar size={18} className="text-teal-600" />
              Slogan động lực
            </h2>

            <div>
              <select
                value={sloganMode}
                onChange={(e) => setSloganMode(e.target.value)}
                className="w-full rounded-xl border-slate-200 text-sm focus:border-teal-500 focus:ring-teal-500 py-2.5"
              >
                <option value="none">-- Không in slogan (Để trống) --</option>
                <option value="random">Lấy ngẫu nhiên các câu châm ngôn</option>
                {SLOGANS.map((s, idx) => (
                  <option key={idx} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <p className="text-[11px] text-slate-400">Châm ngôn học tập in ở viền dưới nhãn vở giúp tạo thêm động lực cho học sinh học tập.</p>
          </div>
        </div>

        {/* Preview Area */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2 mb-6">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Khung xem trước trang in (Khổ A4 nằm ngang - 16 Nhãn)</h3>
                <p className="text-xs text-slate-500">Mỗi trang A4 sẽ in tối đa **16 nhãn** (4 cột x 4 hàng). Nhấp và sửa chữ trực tiếp ngay trên bìa nhãn vở dưới đây.</p>
              </div>
              {labels.length > 0 && (
                <span className="text-xs bg-teal-50 text-teal-700 font-bold px-3 py-1.5 rounded-lg border border-teal-100">
                  Tổng cộng: {labels.length} nhãn ({Math.ceil(labels.length / 16)} trang A4)
                </span>
              )}
            </div>

            {labels.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-3 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <Tag size={40} className="text-slate-300 animate-bounce" />
                <p className="text-slate-500 font-medium">Chưa có nhãn vở nào được tạo.</p>
                <p className="text-xs text-slate-400 max-w-xs">Nhập tên học sinh ở phần "Thông tin nhãn vở" để tạo nhãn vở tự động.</p>
              </div>
            ) : (
              /* Screen Grid for preview and interactively editing on screen */
              <div className="bg-slate-50 p-4 sm:p-6 rounded-2xl border border-slate-200 overflow-x-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 max-w-[950px] mx-auto bg-white p-6 rounded-xl shadow-sm">
                  {labels.map((label, idx) => (
                    <div
                      key={label.id}
                      className="relative border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group bg-white aspect-[95/62] w-full"
                    >
                      {/* Action buttons (hidden on print) */}
                      <div className="no-print absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-20 bg-white/95 p-1 rounded-lg shadow-sm border border-slate-100">
                        <button
                          type="button"
                          onClick={() => handleDownloadPng(label, idx)}
                          title="Tải ảnh nhãn vở này (.png)"
                          className="p-1 text-slate-500 hover:text-teal-600 hover:bg-slate-100 rounded transition-colors"
                        >
                          <Download size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveLabel(label.id)}
                          title="Xóa nhãn vở"
                          className="p-1 text-slate-500 hover:text-red-500 hover:bg-slate-100 rounded transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <div id={`label-svg-container-${label.id}`} className="w-full h-full">
                        <RenderLabelSVG label={label} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Manual Printing Info Card */}
      <div className="bg-teal-50 border border-teal-100 rounded-2xl p-5 flex gap-4 text-teal-800 no-print">
        <Info className="shrink-0 text-teal-600 mt-0.5" size={20} />
        <div className="space-y-1 text-sm">
          <p className="font-bold">Hướng dẫn in ấn đề-can nhãn vở:</p>
          <ul className="list-disc pl-4 space-y-1 text-xs text-teal-700">
            <li>Bạn nên in thử trên giấy thường khổ **A4** trước để căn chỉnh tỉ lệ và lề trang in của máy in.</li>
            <li>Khi chọn in, trong hộp thoại cài đặt in của trình duyệt (Chrome/Edge):</li>
            <ul className="list-circle pl-4 space-y-0.5 mt-1 font-semibold text-[11px]">
              <li>Khổ giấy: chọn **A4**.</li>
              <li>Hướng giấy: chọn **Nằm ngang (Landscape)**.</li>
              <li>Tỉ lệ (Scale): chọn **Mặc định (Default)** hoặc **100%**.</li>
              <li>Tùy chọn khác: bật **Đồ họa nền (Background graphics)** và tắt **Đầu trang và chân trang (Headers and footers)**.</li>
              <li>Lề (Margins): chọn **Không có (None)** hoặc **Mặc định (Default)**.</li>
            </ul>
            <li>Sử dụng giấy đề-can bóc dán sẵn khổ A4 để in, sau đó bóc ra và dán trực tiếp lên bìa sách/vở học sinh.</li>
          </ul>
        </div>
      </div>

      {/* Portal for printing only - completely decoupled from root wrappers */}
      {labels.length > 0 && createPortal(
        <div id="print-area-portal">
          <div className="print-grid">
            {labels.map((label) => (
              <div key={label.id} className="print-card">
                <RenderLabelSVG label={label} />
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
