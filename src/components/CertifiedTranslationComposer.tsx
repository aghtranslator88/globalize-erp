/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  FilePlus, Image as ImageIcon, Stamp, Settings, Download, Eye, FileText, 
  Trash2, Plus, Layout, History, CheckCircle2, AlertCircle, Move, RotateCw, 
  Maximize, Minimize, Type, AlignLeft, AlignCenter, AlignRight, Bold, Italic, 
  Underline, List, Table as TableIcon, FileUp, Save, Undo, MoreHorizontal,
  FileDigit, ShieldCheck, ChevronLeft, ChevronRight,
  Layers, ArrowUp, ArrowDown, Maximize2, Upload
} from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { PDFDocument, rgb, degrees } from 'pdf-lib';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import * as pdfjs from 'pdfjs-dist';
// @ts-ignore
import * as mammoth from 'mammoth';
import { motion, AnimatePresence } from 'framer-motion';

// Setup PDF.js worker locally using Vite's asset URL import
// @ts-ignore
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

import dbInstance from '../db/store';
import { useToast } from './Toast';
import { 
  Profile, UserRole, LetterheadTemplate, StampAsset, 
  LayoutPreset, PdfExportLog 
} from '../types';

interface ComposerProps {
  isRtl: boolean;
  currentRole: UserRole;
  currentUser: Profile;
}

type SubTab = 'compose' | 'assets' | 'logs' | 'presets';

export default function CertifiedTranslationComposer({ isRtl, currentRole, currentUser }: ComposerProps) {
  const { warning, error } = useToast();
  if (currentUser.role !== 'owner' && currentUser.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center p-20 bg-white rounded-3xl border border-zinc-150 shadow-sm space-y-4">
        <ShieldCheck size={48} className="text-red-500" />
        <h3 className="text-xl font-bold text-zinc-900">{isRtl ? 'غير مصرح (Forbidden)' : 'Access Forbidden'}</h3>
        <p className="text-zinc-500 text-sm max-w-md text-center">
          {isRtl 
            ? 'هذه الأداة مخصصة للمدراء والمالكين فقط لإصدار الوثائق الرسمية والمصدقة.' 
            : 'Access to the Certified Translation Composer is restricted to Owners and Bureau Admins only.'}
        </p>
      </div>
    );
  }

  const [activeSubTab, setActiveSubTab] = useState<SubTab>('compose');
  const [isProcessing, setIsProcessing] = useState(false);
  const [tick, setTick] = useState(0);

  // Core State for Composition
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [clientName, setClientName] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [translationContent, setTranslationContent] = useState('');
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [originalFileDataUrl, setOriginalFileDataUrl] = useState<string | null>(null);
  const [taskAttachments, setTaskAttachments] = useState<any[]>([]);

  // RTL/LTR Selection & Target Upload States
  const [sourceLangDir, setSourceLangDir] = useState<'ltr' | 'rtl' | null>(null);
  const [targetLangDir, setTargetLangDir] = useState<'ltr' | 'rtl' | null>(null);
  const [targetFile, setTargetFile] = useState<File | null>(null);

  // Dynamic Overlays State
  const [overlays, setOverlays] = useState<Array<{
    id: string;
    type: 'stamp' | 'image';
    imageUrl: string;
    name: string;
    x: number;
    y: number;
    scale: number;
    rotation: number;
    zIndex: number;
  }>>([]);
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
  
  // Layout Logic
  const [selectedLetterhead, setSelectedLetterhead] = useState<string>('');
  const [selectedStamp, setSelectedStamp] = useState<string>('');
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [originalPosition, setOriginalPosition] = useState<'before' | 'after' | 'exclude'>('after');
  
  // Interactive Stamp Position
  const [stampPos, setStampPos] = useState({ x: 450, y: 700 }); // Default A4 approx
  const [stampRotation, setStampRotation] = useState(0);
  const [stampScale, setStampScale] = useState(1);
  const [isNaturalVariation, setIsNaturalVariation] = useState(false);
  const [authorizedConfirmation, setAuthorizedConfirmation] = useState(false);

  // Asset Management States
  const [isUploadingLetterhead, setIsUploadingLetterhead] = useState(false);
  const [isUploadingStamp, setIsUploadingStamp] = useState(false);

  useEffect(() => {
    const unsub = dbInstance.subscribe(() => setTick(t => t + 1));
    return unsub;
  }, []);

  // Synchronize predefined stamp selection with overlays list
  useEffect(() => {
    if (selectedStamp) {
      const stampObj = dbInstance.stamps.find(s => s.id === selectedStamp);
      if (stampObj) {
        setOverlays(prev => {
          const filtered = prev.filter(o => o.type !== 'stamp');
          return [
            ...filtered,
            {
              id: `stamp-${selectedStamp}`,
              type: 'stamp',
              name: stampObj.name,
              imageUrl: stampObj.imageUrl,
              x: stampPos.x,
              y: stampPos.y,
              scale: stampScale,
              rotation: stampRotation,
              zIndex: 20
            }
          ];
        });
      }
    } else {
      setOverlays(prev => prev.filter(o => o.type !== 'stamp'));
    }
  }, [selectedStamp, stampPos, stampScale, stampRotation]);

  const editor = useEditor({
    extensions: [StarterKit],
    content: translationContent,
    onUpdate: ({ editor }) => {
      setTranslationContent(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm focus:outline-none min-h-full font-serif',
      },
    },
  });

  useEffect(() => {
    if (editor && translationContent !== editor.getHTML()) {
      editor.commands.setContent(translationContent);
    }
  }, [translationContent, editor]);

  // Pre-load default assets
  useEffect(() => {
    const defaultLh = dbInstance.letterheads.find(l => l.isDefault);
    if (defaultLh) setSelectedLetterhead(defaultLh.id);
  }, [tick]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'original' | 'letterhead' | 'stamp' | 'target' | 'overlay') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'original') {
      setOriginalFile(file);
      const reader = new FileReader();
      reader.onload = (loadEvent) => setOriginalFileDataUrl(loadEvent.target?.result as string);
      reader.readAsDataURL(file);
    } else if (type === 'target') {
      setTargetFile(file);
      const isDocx = file.name.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      const isDoc = file.name.endsWith('.doc');
      
      if (isDocx) {
        const reader = new FileReader();
        reader.onload = (loadEvent) => {
          const arrayBuffer = loadEvent.target?.result as ArrayBuffer;
          mammoth.convertToHtml({ arrayBuffer: arrayBuffer })
            .then((result) => {
              const html = result.value;
              setTranslationContent(html);
              editor?.commands.setContent(html);
              
              // Automatically apply default letterhead
              const defaultLh = dbInstance.letterheads.find(l => l.isDefault) || dbInstance.letterheads[0];
              if (defaultLh) {
                setSelectedLetterhead(defaultLh.id);
              }
              
              // Automatically select and apply default stamp
              const defaultStamp = dbInstance.stamps[0];
              if (defaultStamp) {
                setSelectedStamp(defaultStamp.id);
              }
              
              alert(isRtl ? 'تم تحميل ملف DOCX بنجاح وتطبيق التنسيق التلقائي.' : 'DOCX file successfully loaded with automatic letterhead & stamp applied.');
            })
            .catch((err) => {
              console.error('Mammoth parsing error:', err);
              warning(isRtl ? 'فشل تحليل ملف DOCX.' : 'Failed to parse DOCX file.');
            });
        };
        reader.readAsArrayBuffer(file);
      } else if (isDoc) {
        warning(isRtl 
          ? 'تنسيق DOC القديم غير مدعوم بالكامل للتحليل التلقائي؛ يرجى حفظه كـ DOCX أو رفع ملف PDF.' 
          : 'Legacy DOC format is not fully supported for automatic parsing; please save as DOCX or upload PDF.');
        const reader = new FileReader();
        reader.onload = (loadEvent) => {
          const text = loadEvent.target?.result as string;
          const cleanedText = text.replace(/[^\x20-\x7E\s\u0600-\u06FF]/g, '');
          setTranslationContent(cleanedText);
          editor?.commands.setContent(cleanedText);
        };
        reader.readAsText(file);
      } else {
        const reader = new FileReader();
        reader.onload = (loadEvent) => {
          const content = loadEvent.target?.result as string;
          setTranslationContent(content);
          editor?.commands.setContent(content);
        };
        reader.readAsText(file);
      }
    } else if (type === 'overlay') {
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        const dataUrl = loadEvent.target?.result as string;
        const newOverlay = {
          id: `overlay-img-${Date.now()}`,
          type: 'image' as const,
          name: file.name,
          imageUrl: dataUrl,
          x: 200,
          y: 300,
          scale: 1.0,
          rotation: 0,
          zIndex: 10 + overlays.length
        };
        setOverlays(prev => [...prev, newOverlay]);
        setSelectedOverlayId(newOverlay.id);
        alert(isRtl ? 'تمت إضافة تراكب الصورة الجديد!' : 'New image overlay added successfully!');
      };
      reader.readAsDataURL(file);
    } else if (type === 'letterhead') {
      const reader = new FileReader();
      reader.onload = async (loadEvent) => {
        const dataUrl = loadEvent.target?.result as string;
        
        let finalImageUrl = dataUrl;

        if (file.type === 'application/pdf') {
          try {
            const loadingTask = pdfjs.getDocument({ data: new Uint8Array(loadEvent.target?.result as ArrayBuffer) });
            const pdf = await loadingTask.promise;
            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: 2 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            await page.render({ 
              canvasContext: context!, 
              viewport,
              // @ts-ignore
              canvas: canvas 
            }).promise;
            finalImageUrl = canvas.toDataURL('image/png');
          } catch (err) {
            console.error('PDF Letterhead extraction failed:', err);
          }
        }

        dbInstance.addLetterhead({
          name: file.name,
          imageUrl: finalImageUrl,
          isDefault: dbInstance.letterheads.length === 0,
          placement: 'background',
          margins: { top: 20, bottom: 20, left: 20, right: 20 },
          opacity: 1
        });
      };

      if (file.type === 'application/pdf') {
        reader.readAsArrayBuffer(file);
      } else {
        reader.readAsDataURL(file);
      }
    } else if (type === 'stamp') {
      const reader = new FileReader();
      reader.onload = async (loadEvent) => {
        const dataUrl = loadEvent.target?.result as string;
        
        let finalImageUrl = dataUrl;
        
        if (file.type === 'application/pdf') {
          try {
            const loadingTask = pdfjs.getDocument({ data: new Uint8Array(loadEvent.target?.result as ArrayBuffer) });
            const pdf = await loadingTask.promise;
            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: 2 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            await page.render({ 
              canvasContext: context!, 
              viewport,
              // @ts-ignore - version compatibility
              canvas: canvas 
            }).promise;
            finalImageUrl = canvas.toDataURL('image/png');
          } catch (err) {
            console.error('PDF Stamp extraction failed:', err);
          }
        }

        dbInstance.addStamp({
          name: file.name,
          type: 'custom',
          imageUrl: finalImageUrl,
          defaultSize: 100,
          defaultOpacity: 1,
          defaultRotation: 0,
          originalPdfData: file.type === 'application/pdf' ? dataUrl : undefined
        });
      };

      if (file.type === 'application/pdf') {
        reader.readAsArrayBuffer(file);
      } else {
        reader.readAsDataURL(file);
      }
    }
  };

  const handleTaskSelection = (taskId: string) => {
    setSelectedTaskId(taskId);
    if (!taskId) {
      setTaskAttachments([]);
      return;
    }

    const task = dbInstance.tasks.find(t => t.id === taskId);
    if (task) {
      setClientName(task.clientNameCache || '');
      setReferenceNo(task.referenceNo || '');
      setTaskAttachments(task.attachments || []);
      
      // If there are attachments, try to find a translated one for the content
      const targetAtt = task.attachments?.find(a => a.name.includes('[TR]') || a.name.toLowerCase().includes('target') || a.name.toLowerCase().includes('translated'));
      if (targetAtt) {
        if (targetAtt.name.endsWith('.txt') || targetAtt.name.endsWith('.html')) {
          fetch(targetAtt.url)
            .then(res => res.text())
            .then(content => {
              setTranslationContent(content);
              editor?.commands.setContent(content);
            })
            .catch(() => warning(isRtl ? 'تعذر تحميل محتوى المرفق.' : 'Unable to load attachment content.'));
        }
      }

      // Try to find an original one
      const originalAtt = task.attachments?.find(a => !a.name.includes('[TR]') && (a.name.toLowerCase().includes('original') || a.name.toLowerCase().includes('source') || task.attachments?.length === 1));
      if (originalAtt) {
         setOriginalFileDataUrl(originalAtt.url);
         setOriginalFile({ name: originalAtt.name, type: originalAtt.type } as any);
      }
    }
  };

  const handleSelectAttachmentAsOriginal = (att: any) => {
    setOriginalFileDataUrl(att.url);
    setOriginalFile({ name: att.name, type: att.type } as any);
  };

  const handleSelectAttachmentAsContent = (att: any) => {
    if (!att.url || (!att.name.endsWith('.txt') && !att.name.endsWith('.html'))) {
      warning(isRtl ? 'اختر مرفق نص أو HTML يحتوي على الترجمة الفعلية.' : 'Select a text or HTML attachment that contains the actual translation.');
      return;
    }
    fetch(att.url)
      .then(res => res.text())
      .then(content => {
        setTranslationContent(content);
        editor?.commands.setContent(content);
      })
      .catch(() => warning(isRtl ? 'تعذر تحميل محتوى المرفق.' : 'Unable to load attachment content.'));
  };

  const handleExportPdf = async () => {
    if (selectedStamp && !authorizedConfirmation) {
      warning(isRtl ? 'يرجى تأكيد تفويض استخدام الختم' : 'Please confirm authorization to use the stamp');
      return;
    }

    setIsProcessing(true);
    try {
      const surface = document.getElementById('pdf-a4-surface');
      if (!surface) throw new Error('Preview surface not found');

      // 1. Capture the HTML surface (A4) to jsPDF
      const canvas = await html2canvas(surface, {
        scale: 3, // Higher scale for better legal clarity
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      const translatedPdfBytes = pdf.output('arraybuffer');

      // 2. Real Merger using pdf-lib
      const mainPdf = await PDFDocument.create();
      const translatedPdf = await PDFDocument.load(translatedPdfBytes);
      const translatedPages = await mainPdf.copyPages(translatedPdf, translatedPdf.getPageIndices());
      
      // If we have an original PDF document
      let originalPages: any[] = [];
      if (originalFile && (originalFile.type === 'application/pdf' || originalFile.name?.toLowerCase().endsWith('.pdf'))) {
        let originalArrayBuffer: ArrayBuffer;
        
        if (originalFile instanceof File) {
          originalArrayBuffer = await originalFile.arrayBuffer();
        } else if (originalFileDataUrl) {
          // It's a URL or DataURL
          const response = await fetch(originalFileDataUrl);
          originalArrayBuffer = await response.arrayBuffer();
        } else {
          throw new Error('Original file data not found');
        }

        const originalPdf = await PDFDocument.load(originalArrayBuffer);
        originalPages = await mainPdf.copyPages(originalPdf, originalPdf.getPageIndices());
      }

      // Add pages in requested order
      if (originalPosition === 'before') {
        originalPages.forEach(p => mainPdf.addPage(p));
        translatedPages.forEach(p => mainPdf.addPage(p));
      } else if (originalPosition === 'after') {
        translatedPages.forEach(p => mainPdf.addPage(p));
        originalPages.forEach(p => mainPdf.addPage(p));
      } else {
        translatedPages.forEach(p => mainPdf.addPage(p));
      }

      const finalPdfBytes = await mainPdf.save();
      const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const fileName = `Certified_${clientName.replace(/\s+/g, '_') || 'Translation'}_${referenceNo || 'REF'}.pdf`;
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();

      // Log the event
      dbInstance.addPdfLog({
        userId: currentUser.id,
        userName: currentUser.fullName,
        clientName: clientName || 'Walk-in Client',
        referenceNo: referenceNo || 'REF-T-001',
        letterheadName: dbInstance.letterheads.find(l => l.id === selectedLetterhead)?.name,
        stampName: dbInstance.stamps.find(s => s.id === selectedStamp)?.name,
        presetName: dbInstance.presets.find(p => p.id === selectedPreset)?.name,
        fileName: fileName,
        status: 'success'
      });

      dbInstance.addNotification({
        title: 'Certified PDF Exported',
        titleAr: 'تم تصدير ملف ترجمة معتمدة',
        message: `Official document ready: ${fileName}`,
        messageAr: `المستند الرسمي جاهز: ${fileName}`,
        userId: currentUser.id,
        type: 'success'
      });

    } catch (err: any) {
      console.error('PDF Generation Error:', err);
      error(isRtl ? 'خطأ في إنشاء ملف PDF. يرجى مراجعة وحدة التحكم.' : 'Error generating PDF. See console.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportDocx = () => {
    const editorHtml = editor?.getHTML() || '';
    const isTargetRtl = targetLangDir === 'rtl';
    
    const docHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <title>Exported Document</title>
        <style>
          body { 
            font-family: 'Times New Roman', Times, serif; 
            font-size: 12pt; 
            line-height: 1.5; 
            margin: 1in;
            ${isTargetRtl ? 'direction: rtl; text-align: right;' : 'direction: ltr; text-align: left;'}
          }
          table { border-collapse: collapse; width: 100%; margin: 10px 0; }
          th, td { border: 1px solid #999; padding: 6px 10px; }
          p { margin: 0 0 10px 0; }
        </style>
      </head>
      <body>
        ${editorHtml}
      </body>
      </html>
    `;
    
    const blob = new Blob(['\ufeff' + docHtml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    
    const fileName = `Certified_${clientName.replace(/\s+/g, '_') || 'Translation'}_${referenceNo || 'REF'}.doc`;
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    
    dbInstance.logSecurityEvent('other', `Export of target Word document for client: ${clientName || 'Walk-in'} succeeded.`, 'success');
    alert(isRtl ? 'تم تصدير مستند Word بنجاح.' : 'Word document exported successfully.');
  };

  return (
    <div className="space-y-6">
      {/* Module Header & Sub-Tabs */}
      <div className="bg-white rounded-2xl border border-zinc-150 shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-gold flex items-center justify-center text-brand-navy shadow-lg shadow-brand-gold/20">
              <ShieldCheck size={22} className="stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-white font-bold tracking-tight">
                {isRtl ? 'محرر الترجمة المعتمدة' : 'Certified Translation Composer'}
              </h3>
              <p className="text-brand-gold-light text-[10px] font-medium uppercase tracking-widest opacity-80">Globalize Legal Terminal</p>
            </div>
          </div>
          
          <div className="flex items-center bg-zinc-800/50 p-1 rounded-xl flex-wrap lg:flex-nowrap gap-1">
            <button 
              onClick={() => setActiveSubTab('compose')}
              className={`flex-1 lg:flex-none px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeSubTab === 'compose' ? 'bg-white text-zinc-950 shadow-md' : 'text-zinc-400 hover:text-white'}`}
            >
              {isRtl ? 'إنشاء مستند' : 'Compose'}
            </button>
            <button 
              onClick={() => setActiveSubTab('assets')}
              className={`flex-1 lg:flex-none px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeSubTab === 'assets' ? 'bg-white text-zinc-950 shadow-md' : 'text-zinc-400 hover:text-white'}`}
            >
              {isRtl ? 'الأصول واللوجو' : 'Assets & Branding'}
            </button>
            <button 
              onClick={() => setActiveSubTab('presets')}
              className={`flex-1 lg:flex-none px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeSubTab === 'presets' ? 'bg-white text-zinc-950 shadow-md' : 'text-zinc-400 hover:text-white'}`}
            >
              {isRtl ? 'القوالب' : 'Presets'}
            </button>
            <button 
              onClick={() => setActiveSubTab('logs')}
              className={`flex-1 lg:flex-none px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeSubTab === 'logs' ? 'bg-white text-zinc-950 shadow-md' : 'text-zinc-400 hover:text-white'}`}
            >
              {isRtl ? 'الأرشيف' : 'Audit Logs'}
            </button>
          </div>
        </div>

        <div className="p-0">
          {activeSubTab === 'compose' && (
            <div className="flex flex-col lg:flex-row min-h-screen lg:h-[800px] overflow-hidden">
              {/* Left Panel: Inputs */}
              <div className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-zinc-100 flex flex-col bg-zinc-50/30 overflow-y-auto max-h-[400px] lg:max-h-full">
                <div className="p-5 space-y-6">
                  {/* Task Selection */}
                  <div className="space-y-3">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                       <FileDigit size={12} /> {isRtl ? 'اختر مهمة نشطة' : 'Feed from Active Task'}
                    </span>
                    <select 
                      value={selectedTaskId}
                      onChange={e => handleTaskSelection(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-lg outline-none bg-white font-bold"
                    >
                      <option value="">{isRtl ? '-- اختر من المهام --' : '-- Direct Input (No Task) --'}</option>
                      {dbInstance.tasks.filter(t => t.status !== 'completed' && t.status !== 'delivered').map(t => (
                        <option key={t.id} value={t.id}>{t.referenceNo} - {t.clientNameCache}</option>
                      ))}
                    </select>

                    {taskAttachments.length > 0 && (
                      <div className="mt-2 space-y-2 p-3 bg-white border border-zinc-150 rounded-xl">
                        <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">{isRtl ? 'المرفقات المتاحة' : 'Task Attachments'}</p>
                        <div className="space-y-1.5">
                          {taskAttachments.map(att => (
                            <div key={att.id} className="flex items-center justify-between gap-2 p-1.5 hover:bg-zinc-50 rounded-lg transition-colors border border-transparent hover:border-zinc-100">
                               <div className="flex items-center gap-2 overflow-hidden">
                                  <FileText size={10} className="text-zinc-400 shrink-0" />
                                  <span className="text-[9px] font-medium text-zinc-600 truncate">{att.name}</span>
                               </div>
                               <div className="flex items-center gap-1">
                                  <button 
                                    onClick={() => handleSelectAttachmentAsOriginal(att)}
                                    title="Set as Original"
                                    className="p-1 hover:bg-zinc-200 rounded text-[8px] font-bold text-zinc-500"
                                  >SRC</button>
                                  <button 
                                    onClick={() => handleSelectAttachmentAsContent(att)}
                                    title="Load as Translation"
                                    className="p-1 hover:bg-zinc-200 rounded text-[8px] font-bold text-zinc-500"
                                  >TR</button>
                               </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Meta Information */}
                  <div className="space-y-3">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                       <FileText size={12} /> Document Info
                    </span>
                    <div className="space-y-2">
                      <input 
                        type="text" 
                        placeholder={isRtl ? 'اسم العميل' : 'Client Name'}
                        value={clientName}
                        onChange={e => setClientName(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900 outline-none transition-all"
                      />
                      <input 
                        type="text" 
                        placeholder={isRtl ? 'الرقم المرجعي' : 'Reference Number'}
                        value={referenceNo}
                        onChange={e => setReferenceNo(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900 outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Attachment Section (Source Document) */}
                  <div className="space-y-3">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                       <FileUp size={12} /> Original Document (Source)
                    </span>

                    {/* Source Language Direction Choice */}
                    <div className="flex items-center justify-between text-[9px] pb-1 font-bold text-zinc-500 bg-zinc-100/50 p-2 rounded-lg border border-zinc-200/60">
                      <span>{isRtl ? 'لغة المصدر (اتجاة الكتابة) *' : 'Source Direction (RTL/LTR) *'}</span>
                      <div className="flex gap-2">
                        <label className="flex items-center gap-1 cursor-pointer select-none">
                          <input 
                            type="radio" 
                            name="sourceDir" 
                            checked={sourceLangDir === 'ltr'} 
                            onChange={() => setSourceLangDir('ltr')} 
                          /> LTR
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer select-none">
                          <input 
                            type="radio" 
                            name="sourceDir" 
                            checked={sourceLangDir === 'rtl'} 
                            onChange={() => setSourceLangDir('rtl')} 
                          /> RTL
                        </label>
                      </div>
                    </div>

                    <div className={`p-4 border-2 border-dashed rounded-xl transition-all flex flex-col items-center justify-center gap-2 ${originalFile ? 'border-green-200 bg-green-50/30' : 'border-zinc-200 hover:border-zinc-300 bg-white'}`}>
                      {originalFile ? (
                        <>
                          <CheckCircle2 size={24} className="text-green-500" />
                          <p className="text-[10px] font-medium text-green-700 truncate w-full text-center">{originalFile.name}</p>
                          <button onClick={() => setOriginalFile(null)} className="text-[9px] text-zinc-400 hover:text-red-500 underline">Remove</button>
                        </>
                      ) : (
                        <>
                          <FilePlus size={24} className="text-zinc-300" />
                          <label className="text-[10px] font-bold text-zinc-900 cursor-pointer bg-zinc-100 px-3 py-1 rounded-md hover:bg-zinc-200 transition-all">
                             Browse Source File
                             <input 
                               type="file" 
                               accept=".pdf,image/*,.doc,.docx" 
                               className="hidden" 
                               onChange={e => {
                                 if (!sourceLangDir) {
                                   alert(isRtl ? 'يرجى تحديد اتجاه لغة الملف الأصلي أولاً.' : 'Please select the source file language direction first.');
                                   e.target.value = '';
                                   return;
                                 }
                                 handleFileUpload(e, 'original');
                               }} 
                             />
                          </label>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Target Document Section */}
                  <div className="space-y-3 pt-2 border-t border-zinc-150">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                       <FilePlus size={12} /> Target Translation Doc
                    </span>
                    
                    {/* Target Language Direction Choice */}
                    <div className="flex items-center justify-between text-[9px] pb-1 font-bold text-zinc-500 bg-zinc-100/50 p-2 rounded-lg border border-zinc-200/60">
                      <span>{isRtl ? 'لغة الترجمة (اتجاة الكتابة) *' : 'Target Direction (RTL/LTR) *'}</span>
                      <div className="flex gap-2">
                        <label className="flex items-center gap-1 cursor-pointer select-none">
                          <input 
                            type="radio" 
                            name="targetDir" 
                            checked={targetLangDir === 'ltr'} 
                            onChange={() => setTargetLangDir('ltr')} 
                          /> LTR
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer select-none">
                          <input 
                            type="radio" 
                            name="targetDir" 
                            checked={targetLangDir === 'rtl'} 
                            onChange={() => setTargetLangDir('rtl')} 
                          /> RTL
                        </label>
                      </div>
                    </div>

                    <div className={`p-4 border-2 border-dashed rounded-xl transition-all flex flex-col items-center justify-center gap-2 ${targetFile ? 'border-green-200 bg-green-50/30' : 'border-zinc-200 hover:border-zinc-300 bg-white'}`}>
                      {targetFile ? (
                        <>
                          <CheckCircle2 size={24} className="text-green-500" />
                          <p className="text-[10px] font-medium text-green-700 truncate w-full text-center">{targetFile.name}</p>
                          <button onClick={() => setTargetFile(null)} className="text-[9px] text-zinc-400 hover:text-red-500 underline">Remove</button>
                        </>
                      ) : (
                        <>
                          <FilePlus size={24} className="text-zinc-300" />
                          <label className="text-[10px] font-bold text-zinc-900 cursor-pointer bg-zinc-100 px-3 py-1 rounded-md hover:bg-zinc-200 transition-all">
                             Browse Target File
                             <input 
                               type="file" 
                               accept=".docx,.txt,.html,.doc" 
                               className="hidden" 
                               onChange={e => {
                                 if (!targetLangDir) {
                                   alert(isRtl ? 'يرجى تحديد اتجاه لغة ملف الترجمة أولاً.' : 'Please select the target file language direction first.');
                                   e.target.value = '';
                                   return;
                                 }
                                 handleFileUpload(e, 'target');
                               }} 
                             />
                          </label>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Asset Selection */}
                  <div className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase">{isRtl ? 'اختر الترويسة' : 'Select Letterhead'}</label>
                      <select 
                        value={selectedLetterhead}
                        onChange={e => setSelectedLetterhead(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-lg outline-none bg-white"
                      >
                        <option value="">None (Empty Page)</option>
                        {dbInstance.letterheads.map(lh => (
                          <option key={lh.id} value={lh.id}>{lh.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase">{isRtl ? 'اختر الختم' : 'Select Stamp'}</label>
                      <select 
                        value={selectedStamp}
                        onChange={e => setSelectedStamp(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-lg outline-none bg-white"
                      >
                        <option value="">No Stamp</option>
                        {dbInstance.stamps.map(st => (
                          <option key={st.id} value={st.id}>{st.name}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase">{isRtl ? 'ترتيب المرفقات' : 'Original Position'}</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          onClick={() => setOriginalPosition('before')}
                          className={`px-2 py-1.5 text-[9px] font-bold rounded-md border transition-all ${originalPosition === 'before' ? 'bg-zinc-950 text-white border-zinc-950' : 'bg-white text-zinc-500 border-zinc-200'}`}
                        >Before Trans.</button>
                        <button 
                          onClick={() => setOriginalPosition('after')}
                          className={`px-2 py-1.5 text-[9px] font-bold rounded-md border transition-all ${originalPosition === 'after' ? 'bg-zinc-950 text-white border-zinc-950' : 'bg-white text-zinc-500 border-zinc-200'}`}
                        >After Trans.</button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-brand-border space-y-2">
                    <button 
                      onClick={handleExportPdf}
                      disabled={isProcessing}
                      className={`w-full py-3 bg-brand-gold hover:bg-brand-gold-hover text-brand-navy rounded-xl font-black text-xs shadow-lg shadow-brand-gold/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${isProcessing ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                      {isProcessing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          {isRtl ? 'جاري المعالجة...' : 'Processing...'}
                        </>
                      ) : (
                        <><Download size={16} /> {isRtl ? 'تصدير وثيقة معتمدة' : 'Export Certified PDF'}</>
                      )}
                    </button>

                    <button 
                      onClick={handleExportDocx}
                      type="button"
                      className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                    >
                      <Save size={14} />
                      {isRtl ? 'تصدير مستند Word (.doc)' : 'Export Word Document'}
                    </button>

                    <div className="mt-3 flex items-start gap-2">
                      <input 
                        type="checkbox" 
                        id="auth-check" 
                        checked={authorizedConfirmation}
                        onChange={e => setAuthorizedConfirmation(e.target.checked)}
                        className="mt-0.5"
                      />
                      <label htmlFor="auth-check" className="text-[9px] leading-tight text-zinc-400 font-medium italic">
                        {isRtl ? 'أؤكد أنني مخول باستخدام الختم/التوقيع المختار لأغراض هذه الوثيقة.' : 'I confirm that I am authorized to use the selected stamp/signature for this document.'}
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Center Panel: Preview & Editor */}
              <div className="flex-1 bg-zinc-100/50 flex flex-col overflow-hidden relative">
                {/* Editor Toolbar Overlay */}
                <div className="px-4 py-2 border-b bg-white border-zinc-150 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Active Workspace</span>
                    <div className="flex items-center gap-1">
                       <button className="p-1.5 hover:bg-zinc-100 rounded text-zinc-500"><Undo size={14} /></button>
                       <button className="p-1.5 hover:bg-zinc-100 rounded text-zinc-500"><Save size={14} /></button>
                    </div>
                  </div>
                  <div className="text-[10px] text-zinc-400 font-mono">Page 1 of 1</div>
                </div>

                <div className="flex-1 overflow-auto p-4 lg:p-12 flex justify-center scrollbar-thin bg-zinc-100/50">
                  {/* A4 Page Simulation - Mobile Scaling Container */}
                  <div className="origin-top scale-[0.6] sm:scale-[0.8] md:scale-100 transition-transform">
                    <div id="pdf-a4-surface" className="w-[595px] min-h-[842px] bg-white shadow-2xl relative flex flex-col">
                    {/* Letterhead Background Layer */}
                    {selectedLetterhead && (
                      <div className="absolute inset-0 z-0 pointer-events-none opacity-90 overflow-hidden">
                        <img 
                          src={dbInstance.letterheads.find(l => l.id === selectedLetterhead)?.imageUrl} 
                          alt="LH" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {/* Content Layer */}
                    <div dir={targetLangDir || 'ltr'} className="relative z-10 p-16 flex-1 flex flex-col tiptap-certified">
                      <EditorContent editor={editor} className="flex-1 min-h-fit" />
                    </div>

                    {/* Dynamic Overlays Layer (Stamps and Custom Images) */}
                    {overlays.map(ov => {
                      const isSelected = selectedOverlayId === ov.id;
                      return (
                        <motion.div 
                          key={ov.id}
                          drag
                          dragMomentum={false}
                          style={{ 
                            x: ov.x, 
                            y: ov.y, 
                            rotate: ov.rotation, 
                            scale: ov.scale, 
                            zIndex: ov.zIndex,
                            position: 'absolute',
                            left: 0,
                            top: 0
                          }}
                          onDragStart={() => setSelectedOverlayId(ov.id)}
                          onDragEnd={(e, info) => {
                            const surface = document.getElementById('pdf-a4-surface');
                            if (surface) {
                              const rect = surface.getBoundingClientRect();
                              const scaleFactor = rect.width / 595;
                              const newX = (info.point.x - rect.left) / scaleFactor;
                              const newY = (info.point.y - rect.top) / scaleFactor;
                              
                              // Update position
                              setOverlays(prev => prev.map(o => o.id === ov.id ? { ...o, x: newX, y: newY } : o));
                              if (ov.type === 'stamp') {
                                setStampPos({ x: newX, y: newY });
                              }
                            }
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOverlayId(ov.id);
                          }}
                          className={`cursor-move select-none ${isSelected ? 'ring-2 ring-brand-gold ring-offset-2 rounded' : ''}`}
                        >
                           <img 
                            src={ov.imageUrl} 
                            alt={ov.name}
                            className="w-32 h-32 object-contain pointer-events-none"
                           />
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

              {/* Right Panel: Layout Controls */}
              <div className="w-full lg:w-72 border-t lg:border-t-0 lg:border-l border-zinc-100 bg-white p-5 space-y-6 overflow-y-auto max-h-[400px] lg:max-h-full">
                 <div className="space-y-4">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                       <Layout size={12} /> Styling & Layout
                    </span>

                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-zinc-500 uppercase">Stamp Parameters</label>
                       <div className="space-y-3 p-3 bg-zinc-50 rounded-lg">
                          <div className="space-y-1">
                             <div className="flex justify-between text-[9px] font-bold text-zinc-400 uppercase">
                                <span>Size</span>
                                <span>{Math.round(stampScale * 100)}%</span>
                             </div>
                             <input type="range" min="0.5" max="2" step="0.1" value={stampScale} onChange={e => setStampScale(Number(e.target.value))} className="w-full h-1 bg-brand-border appearance-none rounded-full accent-brand-gold" />
                          </div>
                          <div className="space-y-1">
                             <div className="flex justify-between text-[9px] font-bold text-zinc-400 uppercase">
                                <span>Rotation</span>
                                <span>{stampRotation}°</span>
                             </div>
                             <input type="range" min="-180" max="180" step="1" value={stampRotation} onChange={e => setStampRotation(Number(e.target.value))} className="w-full h-1 bg-brand-border appearance-none rounded-full accent-brand-gold" />
                          </div>
                          <div className="flex items-center justify-between pt-1">
                             <span className="text-[9px] font-bold text-zinc-400 uppercase">Natural Variation</span>
                             <button 
                                onClick={() => setIsNaturalVariation(!isNaturalVariation)}
                                className={`w-8 h-4 rounded-full transition-all relative ${isNaturalVariation ? 'bg-brand-navy' : 'bg-brand-border'}`}
                             >
                                <div className={`absolute top-0.5 w-3 h-3 bg-brand-gold rounded-full transition-all ${isNaturalVariation ? 'right-0.5' : 'left-0.5'}`} />
                             </button>
                          </div>
                       </div>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-zinc-500 uppercase">Typography</label>
                       <div className="grid grid-cols-1 gap-2">
                          <div className="flex items-center justify-between p-2 border border-zinc-150 rounded-lg">
                             <Type size={12} className="text-zinc-400" />
                             <select className="text-[10px] font-bold outline-none bg-transparent">
                                <option>Times New Roman</option>
                                <option>Arial</option>
                                <option>Sakkal Majalla</option>
                                <option>Inter</option>
                             </select>
                          </div>
                          <div className="flex gap-2">
                            <div className="flex-1 flex items-center justify-between p-2 border border-zinc-150 rounded-lg">
                               <span className="text-[10px] font-bold text-zinc-400">Size</span>
                               <input type="number" defaultValue={11} className="w-8 text-[10px] font-bold outline-none bg-transparent text-right" />
                            </div>
                            <div className="flex-1 flex items-center justify-between p-2 border border-zinc-150 rounded-lg">
                               <span className="text-[10px] font-bold text-zinc-400">LH</span>
                               <input type="number" step="0.1" defaultValue={1.5} className="w-8 text-[10px] font-bold outline-none bg-transparent text-right" />
                            </div>
                          </div>
                       </div>
                    </div>

                     {/* Overlay Layering & Controls Panel */}
                     <div className="space-y-2 pt-2 border-t border-zinc-150">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                          <Layers size={12} /> {isRtl ? 'طبقات الصور والتراكيب' : 'Overlays & Layering'}
                        </label>
                        
                        {/* Upload overlay image trigger */}
                        <label className="w-full py-2 border border-dashed border-zinc-300 text-zinc-500 rounded-xl font-bold text-[10px] hover:bg-zinc-50 hover:border-zinc-400 transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                           <Upload size={12} /> {isRtl ? 'إضافة صورة تراكب مخصصة' : 'Upload Image Overlay'}
                           <input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, 'overlay')} />
                        </label>
                        
                        {overlays.length > 0 ? (
                          <div className="space-y-3 mt-3">
                            {/* Overlay List */}
                            <div className="max-h-[150px] overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                              {overlays.map(ov => {
                                const isSelected = selectedOverlayId === ov.id;
                                return (
                                  <div 
                                    key={ov.id}
                                    onClick={() => setSelectedOverlayId(ov.id)}
                                    className={`flex items-center justify-between p-2 rounded-lg border text-[10px] cursor-pointer transition-colors ${isSelected ? 'bg-zinc-950 text-white border-zinc-950' : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100'}`}
                                  >
                                    <span className="truncate max-w-[120px] font-medium">{ov.name || ov.type}</span>
                                    <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                                      {/* Move z-index / layer buttons */}
                                      <button 
                                        onClick={() => {
                                          setOverlays(prev => prev.map(o => o.id === ov.id ? { ...o, zIndex: o.zIndex + 1 } : o));
                                        }}
                                        title="Bring Forward"
                                        className="p-1 hover:bg-zinc-200 hover:text-black rounded"
                                      >
                                        <ArrowUp size={10} />
                                      </button>
                                      <button 
                                        onClick={() => {
                                          setOverlays(prev => prev.map(o => o.id === ov.id ? { ...o, zIndex: Math.max(0, o.zIndex - 1) } : o));
                                        }}
                                        title="Send Backward"
                                        className="p-1 hover:bg-zinc-200 hover:text-black rounded"
                                      >
                                        <ArrowDown size={10} />
                                      </button>
                                      <button 
                                        onClick={() => {
                                          setOverlays(prev => prev.filter(o => o.id !== ov.id));
                                          if (selectedOverlayId === ov.id) setSelectedOverlayId(null);
                                          if (ov.type === 'stamp') setSelectedStamp('');
                                        }}
                                        title="Delete"
                                        className="p-1 hover:text-red-500 rounded animate-pulse"
                                      >
                                        <Trash2 size={10} />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            
                            {/* Selected Overlay Parameters */}
                            {selectedOverlayId && overlays.find(o => o.id === selectedOverlayId) && (() => {
                              const activeOv = overlays.find(o => o.id === selectedOverlayId)!;
                              return (
                                <div className="space-y-3 p-3 bg-zinc-50 border border-zinc-150 rounded-xl animate-in fade-in-50 duration-150">
                                  <p className="text-[9px] font-bold text-zinc-500 uppercase truncate">Active: {activeOv.name}</p>
                                  
                                  {/* Scale */}
                                  <div className="space-y-1">
                                    <div className="flex justify-between text-[8px] font-bold text-zinc-400 uppercase">
                                      <span>Scale / Size</span>
                                      <span>{Math.round(activeOv.scale * 100)}%</span>
                                    </div>
                                    <input 
                                      type="range" 
                                      min="0.2" 
                                      max="3.0" 
                                      step="0.05" 
                                      value={activeOv.scale} 
                                      onChange={e => {
                                        const val = Number(e.target.value);
                                        setOverlays(prev => prev.map(o => o.id === activeOv.id ? { ...o, scale: val } : o));
                                        if (activeOv.type === 'stamp') setStampScale(val);
                                      }} 
                                      className="w-full h-1 bg-brand-border appearance-none rounded-full accent-brand-gold" 
                                    />
                                  </div>
                                  
                                  {/* Rotation */}
                                  <div className="space-y-1">
                                    <div className="flex justify-between text-[8px] font-bold text-zinc-400 uppercase">
                                      <span>Rotation</span>
                                      <span>{activeOv.rotation}°</span>
                                    </div>
                                    <input 
                                      type="range" 
                                      min="-180" 
                                      max="180" 
                                      step="1" 
                                      value={activeOv.rotation} 
                                      onChange={e => {
                                        const val = Number(e.target.value);
                                        setOverlays(prev => prev.map(o => o.id === activeOv.id ? { ...o, rotation: val } : o));
                                        if (activeOv.type === 'stamp') setStampRotation(val);
                                      }} 
                                      className="w-full h-1 bg-brand-border appearance-none rounded-full accent-brand-gold" 
                                    />
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        ) : (
                          <p className="text-[9px] text-zinc-400 italic text-center py-2">{isRtl ? 'لا توجد صور تراكب حالياً.' : 'No active image overlays.'}</p>
                        )}
                     </div>
                 </div>

                 <div className="pt-2">
                    <button className="w-full py-2 border border-zinc-200 text-zinc-500 rounded-lg font-bold text-[10px] hover:bg-zinc-50 transition-all flex items-center justify-center gap-2">
                       <Save size={12} /> Save as Preset
                    </button>
                 </div>
              </div>
            </div>
          )}

          {activeSubTab === 'assets' && (
            <div className="p-4 lg:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-[600px]">
              {/* Manage Letterheads */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold flex items-center gap-2 text-zinc-900">
                    <ImageIcon size={18} className="text-zinc-400" /> 
                    {isRtl ? 'الترويسات والشعارات المعتمدة' : 'Official Letterheads'}
                  </h4>
                  <label className="px-3 py-1 bg-brand-navy hover:bg-brand-navy-hover text-white rounded-lg text-[10px] font-bold cursor-pointer transition-all flex items-center gap-1.5 shrink-0 shadow-sm shadow-brand-navy/10">
                    <Plus size={12} /> Add Letterhead
                    <input type="file" accept="image/*,application/pdf" className="hidden" onChange={e => handleFileUpload(e, 'letterhead')} />
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {dbInstance.letterheads.map(lh => (
                    <div key={lh.id} className="group relative border border-zinc-150 rounded-xl overflow-hidden bg-zinc-50">
                      <div className="aspect-[1/1.4] bg-white overflow-hidden p-2">
                        <img src={lh.imageUrl} className="w-full h-full object-contain opacity-60 group-hover:opacity-100 transition-all" alt="Lh" />
                      </div>
                      <div className="p-2.5 bg-white border-t border-zinc-100 flex items-center justify-between">
                        <div className="min-w-0">
                           <p className="text-[10px] font-bold text-zinc-900 truncate">{lh.name}</p>
                           <p className="text-[8px] text-zinc-400 font-medium">Size: A4</p>
                        </div>
                        <div className="flex items-center gap-1">
                           {lh.isDefault && <CheckCircle2 size={12} className="text-green-500" />}
                           <button className="p-1 hover:text-red-500 transition-all"><Trash2 size={12} /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {dbInstance.letterheads.length === 0 && (
                    <div className="col-span-2 py-12 flex flex-col items-center justify-center border-2 border-dashed border-zinc-100 rounded-2xl text-zinc-300">
                      <ImageIcon size={32} />
                      <p className="text-xs font-medium mt-2">No official letterheads uploaded yet.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Manage Stamps */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold flex items-center gap-2 text-zinc-900">
                    <Stamp size={18} className="text-zinc-400" /> 
                    {isRtl ? 'الأختام والتوقيعات الرسمية' : 'Stamps & Signatures'}
                  </h4>
                  <label className="px-3 py-1 bg-brand-navy hover:bg-brand-navy-hover text-white rounded-lg text-[10px] font-bold cursor-pointer transition-all flex items-center gap-1.5 shadow-sm shadow-brand-navy/10">
                    <Plus size={12} /> Add Stamp
                    <input type="file" accept="image/*,application/pdf" className="hidden" onChange={e => handleFileUpload(e, 'stamp')} />
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {dbInstance.stamps.map(st => (
                    <div key={st.id} className="group relative border border-zinc-150 rounded-xl overflow-hidden bg-zinc-50">
                      <div className="aspect-square bg-white flex items-center justify-center p-4">
                         <img src={st.imageUrl} className="w-full h-full object-contain" alt="Stamp" />
                      </div>
                      <div className="p-2.5 bg-white border-t border-zinc-100 flex items-center justify-between">
                         <div className="min-w-0">
                            <p className="text-[10px] font-bold text-zinc-900 truncate">{st.name}</p>
                            <span className="text-[8px] uppercase font-bold text-purple-600 bg-purple-50 px-1 rounded">{st.type.replace('_',' ')}</span>
                         </div>
                         <button className="p-1 hover:text-red-500 transition-all"><Trash2 size={12} /></button>
                      </div>
                    </div>
                  ))}
                  {dbInstance.stamps.length === 0 && (
                    <div className="col-span-2 py-12 flex flex-col items-center justify-center border-2 border-dashed border-zinc-100 rounded-2xl text-zinc-300">
                      <Stamp size={32} />
                      <p className="text-xs font-medium mt-2">No official stamps uploaded yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'presets' && (
            <div className="p-4 lg:p-8 min-h-[600px] space-y-6">
               <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-zinc-100 pb-4 gap-4">
                 <div>
                   <h4 className="text-lg font-light text-zinc-900">{isRtl ? 'قوالب التنسيق المحفوظة' : 'Saved Layout Presets'}</h4>
                   <p className="text-xs text-zinc-400 font-medium">Quick configurations for repeat certified tasks.</p>
                 </div>
                 <button className="w-full sm:w-auto px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2">
                    <Save size={14} /> Create Blank Preset
                 </button>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {dbInstance.presets.map(p => (
                   <div key={p.id} className="p-5 border border-zinc-150 rounded-2xl hover:border-purple-200 hover:shadow-lg transition-all group bg-white cursor-pointer relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <MoreHorizontal size={14} className="text-zinc-300 hover:text-zinc-900" />
                      </div>
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-zinc-50 rounded-xl group-hover:bg-purple-50 transition-colors">
                           <Layout size={20} className="text-zinc-400 group-hover:text-purple-600" />
                        </div>
                        <div className="flex-1">
                          <h5 className="text-[13px] font-bold text-zinc-900">{isRtl ? (p.nameAr || p.name) : p.name}</h5>
                          <div className="mt-2 space-y-1">
                             <div className="flex items-center justify-between text-[9px] font-medium text-zinc-400 uppercase">
                                <span>Page Size</span>
                                <span className="text-zinc-600">{p.pageSize}</span>
                             </div>
                             <div className="flex items-center justify-between text-[9px] font-medium text-zinc-400 uppercase">
                                <span>Original Doc</span>
                                <span className="text-zinc-600">Include {p.originalPosition}</span>
                             </div>
                             <div className="flex items-center justify-between text-[9px] font-medium text-zinc-400 uppercase">
                                <span>Stamp Style</span>
                                <span className="text-zinc-600">Custom Position</span>
                             </div>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-zinc-50 flex items-center gap-2">
                         <button className="flex-1 py-1.5 bg-zinc-950 text-white rounded-lg text-[10px] font-bold">Use Preset</button>
                         <button className="flex-1 py-1.5 bg-zinc-50 text-zinc-500 rounded-lg text-[10px] font-bold hover:bg-zinc-100">Edit</button>
                      </div>
                   </div>
                 ))}
               </div>
            </div>
          )}

          {activeSubTab === 'logs' && (
            <div className="p-4 lg:p-8 min-h-[600px] flex flex-col">
               <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-zinc-100 pb-4 gap-4">
                 <div>
                   <h4 className="text-lg font-light text-zinc-900">{isRtl ? 'سجل عمليات التصدير والتدقيق' : 'PDF Export Audit Trail'}</h4>
                   <p className="text-xs text-zinc-400 font-medium">A security log of every legally certified document generated.</p>
                 </div>
                 <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <button className="p-2 hover:bg-zinc-50 rounded-lg text-zinc-400"><History size={16}/></button>
                    <button className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg text-[10px] font-bold transition-all">Download Report (CSV)</button>
                 </div>
               </div>

               <div className="flex-1 mt-6 overflow-x-auto">
                 <table className="w-full text-[11px]">
                   <thead>
                     <tr className="text-zinc-400 text-left border-b border-zinc-100">
                       <th className="pb-3 px-2 font-bold uppercase tracking-widest">{isRtl ? 'التاريخ والوقت' : 'Timestamp'}</th>
                       <th className="pb-3 px-2 font-bold uppercase tracking-widest">{isRtl ? 'العميل' : 'Client'}</th>
                       <th className="pb-3 px-2 font-bold uppercase tracking-widest">{isRtl ? 'المرجع' : 'Reference'}</th>
                       <th className="pb-3 px-2 font-bold uppercase tracking-widest">{isRtl ? 'المستخدم' : 'Authorized User'}</th>
                       <th className="pb-3 px-2 font-bold uppercase tracking-widest">{isRtl ? 'ملف التصدير' : 'Generated File'}</th>
                       <th className="pb-3 px-2 font-bold uppercase tracking-widest text-right">{isRtl ? 'الحالة' : 'Status'}</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-zinc-50">
                     {dbInstance.pdfLogs.map(log => (
                       <tr key={log.id} className="hover:bg-zinc-50/50 transition-colors">
                         <td className="py-3 px-2 font-medium text-zinc-500">{new Date(log.timestamp).toLocaleString()}</td>
                         <td className="py-3 px-2 font-bold text-zinc-900">{log.clientName}</td>
                         <td className="py-3 px-2 font-mono text-zinc-400">{log.referenceNo}</td>
                         <td className="py-3 px-2 font-semibold">
                            <div className="flex items-center gap-2">
                               <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center text-[10px]">{log.userName[0]}</div>
                               {log.userName}
                            </div>
                         </td>
                         <td className="py-3 px-2 italic text-zinc-400">{log.fileName}</td>
                         <td className="py-3 px-2 text-right">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${log.status === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                               {log.status === 'success' ? 'COMPLETED' : 'FAILED'}
                            </span>
                         </td>
                       </tr>
                     ))}
                     {dbInstance.pdfLogs.length === 0 && (
                       <tr>
                         <td colSpan={6} className="py-12 text-center text-zinc-300 italic">No export history found. Documents generated will appear here for auditing.</td>
                       </tr>
                     )}
                   </tbody>
                 </table>
               </div>

               <div className="mt-8 p-4 bg-zinc-50 rounded-2xl border border-zinc-150 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                     <AlertCircle size={20} />
                  </div>
                  <div className="flex-1">
                     <p className="text-[11px] font-bold text-zinc-800">Compliance Warning</p>
                     <p className="text-[10px] text-zinc-500 leading-snug">This audit trail is immutable in production environments. Any attempt to modify or delete logs of certified documents will be flagged for board review.</p>
                  </div>
               </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .tiptap-certified .ProseMirror {
          min-height: 500px;
          outline: none;
        }
        .tiptap-certified .ProseMirror p {
          margin-bottom: 0.5em;
        }
      `}</style>
    </div>
  );
}
