import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, X, Download, HelpCircle } from 'lucide-react';
import { parseUploadedFile, downloadOECTemplate } from '../utils/excelHelper';
import { LineOECData, DayColumn } from '../types/oec';
import { useAppPreferences } from '../contexts/AppPreferencesContext';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (lines: LineOECData[], days: DayColumn[]) => void;
  currentDays: DayColumn[];
  currentLines: LineOECData[];
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
  currentDays,
  currentLines,
}) => {
  const { t } = useAppPreferences();
  const [dragOver, setDragOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<{ lines: LineOECData[]; days: DayColumn[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleProcessFile = async (file: File) => {
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const result = await parseUploadedFile(file);
      setPreviewData(result);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : t('เกิดข้อผิดพลาดในการอ่านไฟล์', 'Failed to parse uploaded file', '读取上传文件时出错');
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleProcessFile(e.target.files[0]);
    }
  };

  const handleConfirmImport = () => {
    if (previewData) {
      onImportSuccess(previewData.lines, previewData.days);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-[#0070c0] text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-200" />
            <h3 className="font-bold text-base sm:text-lg">
              {t(
                'นำเข้าไฟล์ข้อมูล OEC (Excel / CSV)',
                'Import OEC Data File (Excel / CSV)',
                '导入 OEC 数据文件 (Excel / CSV)'
              )}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 max-h-[80vh] overflow-y-auto">
          {/* Instructions Box */}
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-md p-3.5 text-xs text-blue-900">
            <div className="flex items-start gap-2">
              <HelpCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-1">
                  {t('คำแนะนำโครงสร้างไฟล์:', 'File Structure Guide:', '文件格式说明:')}
                </p>
                <p className="text-blue-800 leading-relaxed mb-2">
                  {t(
                    'ไฟล์ควรมีหัวตาราง:',
                    'The spreadsheet should contain headers:',
                    '表格需包含列标题:'
                  )}{' '}
                  <code className="bg-blue-100 px-1 py-0.5 rounded font-mono">Plant</code>,{' '}
                  <code className="bg-blue-100 px-1 py-0.5 rounded font-mono">Prod.line</code>,{' '}
                  <code className="bg-blue-100 px-1 py-0.5 rounded font-mono">Category</code> (Planning, Act, Work Time){' '}
                  {t('และคอลัมน์วันที่ เช่น', 'and day columns such as', '以及日期列，例如')}{' '}
                  <code className="bg-blue-100 px-1 py-0.5 rounded font-mono">1 TUE</code>,{' '}
                  <code className="bg-blue-100 px-1 py-0.5 rounded font-mono">2 WEN</code>...
                </p>
                <button
                  type="button"
                  onClick={() => downloadOECTemplate(currentDays, currentLines)}
                  className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:text-blue-900 underline cursor-pointer"
                >
                  <Download className="w-3 h-3" />
                  <span>
                    {t(
                      'คลิกที่นี่เพื่อดาวน์โหลดไฟล์แม่แบบ Excel พร้อมตัวอย่างข้อมูล',
                      'Click here to download the Excel template with sample data',
                      '点击此处下载含示例数据的 Excel 模板'
                    )}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Drag & Drop Area */}
          <div
            onDragOver={e => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
              dragOver
                ? 'border-[#0070c0] bg-blue-50/50'
                : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              className="hidden"
              onChange={handleFileSelect}
            />

            <FileSpreadsheet className="w-10 h-10 text-[#0070c0] mx-auto mb-2 opacity-80" />
            <p className="text-sm font-semibold text-slate-800">
              {t('ลากไฟล์มาวางที่นี่ หรือ', 'Drag & drop file here, or', '将文件拖拽到此处，或')}{' '}
              <span className="text-[#0070c0] underline">
                {t('คลิกเพื่อเลือกไฟล์', 'Click to browse file', '点击选择文件')}
              </span>
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {t(
                'รองรับไฟล์ Excel (.xlsx, .xls) และไฟล์ CSV (.csv)',
                'Supports Excel (.xlsx, .xls) and CSV (.csv) files',
                '支持 Excel (.xlsx, .xls) 及 CSV (.csv) 文件'
              )}
            </p>
          </div>

          {/* Loading Indicator */}
          {isLoading && (
            <div className="mt-4 text-center text-xs text-slate-600">
              {t(
                'กำลังประมวลผลและตรวจสอบโครงสร้างไฟล์...',
                'Processing and validating spreadsheet structure...',
                '正在解析并校验文件结构...'
              )}
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="mt-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-md p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">
                  {t('ไม่สามารถอ่านไฟล์ได้:', 'Unable to read file:', '无法读取文件:')}
                </p>
                <p>{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Preview Parsed Data */}
          {previewData && (
            <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-md p-3.5">
              <div className="flex items-center gap-2 text-emerald-800 font-semibold text-xs mb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>
                  {t(
                    'อ่านไฟล์สำเร็จ! ตรวจพบข้อมูลดังนี้:',
                    'File parsed successfully! Detected:',
                    '文件读取成功！检测到以下数据:'
                  )}
                </span>
              </div>
              <ul className="text-xs text-slate-700 space-y-1 list-disc pl-5">
                <li>
                  <strong>{t('จำนวนสายการผลิต:', 'Production Lines:', '产线数量:')}</strong>{' '}
                  {previewData.lines.length} ({previewData.lines.map(l => l.prodLine).join(', ')})
                </li>
                <li>
                  <strong>{t('โรงงาน:', 'Plant:', '工厂:')}</strong>{' '}
                  {previewData.lines[0]?.plant || 'N/A'}
                </li>
                <li>
                  <strong>{t('จำนวนวันทำการ:', 'Working Days:', '工作日天数:')}</strong>{' '}
                  {previewData.days.length} ({t('วันที่', 'Day', '日期')} {previewData.days[0]?.day} –{' '}
                  {previewData.days[previewData.days.length - 1]?.day})
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded cursor-pointer"
          >
            {t('ยกเลิก', 'Cancel', '取消')}
          </button>
          <button
            type="button"
            disabled={!previewData || isLoading}
            onClick={handleConfirmImport}
            className={`px-4 py-1.5 text-xs font-semibold text-white rounded shadow-xs transition-all cursor-pointer ${
              previewData && !isLoading
                ? 'bg-[#0070c0] hover:bg-[#005ba3]'
                : 'bg-slate-400 cursor-not-allowed'
            }`}
          >
            {t('ยืนยันนำเข้าข้อมูล (Link Data)', 'Confirm Import (Link Data)', '确认导入数据 (Link Data)')}
          </button>
        </div>
      </div>
    </div>
  );
};
