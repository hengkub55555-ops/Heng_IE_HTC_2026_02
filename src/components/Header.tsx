import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Upload, 
  Download, 
  Presentation, 
  RotateCcw, 
  Plus, 
  Edit3, 
  Eye,
  Filter,
  CheckCircle2,
  Calendar,
  TableProperties,
  BarChart3,
  Cloud,
  CloudCheck,
  RefreshCw,
  Share2,
  Copy,
  Check,
  Globe,
  HardDrive,
  Save,
  History,
  TrendingUp
} from 'lucide-react';
import { OECFilterState, ActiveSheetTab } from '../types/oec';
import { THAI_MONTHS } from '../utils/dateHelper';

interface HeaderProps {
  filters: OECFilterState;
  onFilterChange: (filters: OECFilterState) => void;
  availablePlants: string[];
  availableLines: string[];
  activeTab: ActiveSheetTab;
  onTabChange: (tab: ActiveSheetTab) => void;
  onOpenImport: () => void;
  onDownloadTemplate: () => void;
  onExportExcel: () => void;
  onExportCSV: () => void;
  onOpenPresentation: () => void;
  onResetData: () => void;
  onOpenAddLine: () => void;
  isEditMode: boolean;
  onToggleEditMode: () => void;
  isOnline?: boolean;
  isSyncing?: boolean;
  lastSyncTime?: Date | null;
  onManualSync?: () => void;
  onOpenPublish?: () => void;
  onOpenGoogleDrive?: () => void;
  onOpenDatePeriod?: () => void;
  onSaveOnWeb?: () => void;
  onOpenWebSaveModal?: () => void;
  hasUnsavedChanges?: boolean;
  savedPeriodsCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  filters,
  onFilterChange,
  availablePlants,
  availableLines,
  activeTab,
  onTabChange,
  onOpenImport,
  onDownloadTemplate,
  onExportExcel,
  onExportCSV,
  onOpenPresentation,
  onResetData,
  onOpenAddLine,
  isEditMode,
  onToggleEditMode,
  isOnline = true,
  isSyncing = false,
  lastSyncTime = null,
  onManualSync,
  onOpenPublish,
  onOpenGoogleDrive,
  onOpenDatePeriod,
  onSaveOnWeb,
  onOpenWebSaveModal,
  hasUnsavedChanges = false,
  savedPeriodsCount = 1,
}) => {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm print:hidden">
      {/* Top Banner & Filters */}
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 py-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          
          {/* Main Title matching the screenshot */}
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-9 bg-[#0070c0] rounded-sm hidden sm:block" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0070c0] tracking-tight flex flex-wrap items-center gap-2">
                <span>Production&Efficiency OEC</span>
                <span className="text-[#0070c0] font-bold text-xl sm:text-2xl">(生产&效率日清)</span>
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                ระบบจัดการและรายงานข้อมูลการผลิตและประสิทธิภาพประจำวัน สำหรับผู้บริหารและผู้จัดการโรงงาน
              </p>
            </div>
          </div>

          {/* Top-Right Dropdown Filters matching screenshot & Cloud Status */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Online Status & Share */}
            <div className="flex items-center gap-2 mr-1">
              <div 
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-xs font-semibold shadow-2xs"
                title="ฐานข้อมูล Firestore เชื่อมต่อแบบ Real-Time ข้อมูลอัปเดตตรงกันทุกเครื่องทันที"
              >
                <span className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-amber-500 animate-ping' : 'bg-emerald-500 animate-pulse'}`} />
                <span>{isSyncing ? 'กำลังซิงค์...' : 'ออนไลน์ (Cloud Live)'}</span>
              </div>

              {/* Prominent Save on Web Button */}
              {onSaveOnWeb && (
                <button
                  onClick={onSaveOnWeb}
                  disabled={isSyncing}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-bold shadow-xs transition-all cursor-pointer ${
                    hasUnsavedChanges
                      ? 'bg-amber-500 hover:bg-amber-600 text-white ring-2 ring-amber-300 animate-pulse'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                  title="บันทึกข้อมูลลงบน Web Database ทันที (Ctrl + S)"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSyncing ? 'กำลังบันทึก...' : hasUnsavedChanges ? 'บันทึกบน Web (มีการแก้ไข)*' : 'บันทึกบน Web'}</span>
                </button>
              )}

              {/* Web Save Manager / History Button */}
              {onOpenWebSaveModal && (
                <button
                  onClick={onOpenWebSaveModal}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded text-xs font-semibold border border-emerald-200 transition-colors cursor-pointer"
                  title="ดูข้อมูลที่บันทึกไว้บน Web แยกตามเดือน/ปี และประวัติการบันทึก"
                >
                  <History className="w-3.5 h-3.5 text-emerald-600" />
                  <span>ข้อมูลที่บันทึกบน Web ({savedPeriodsCount})</span>
                </button>
              )}

              {onManualSync && (
                <button
                  onClick={onManualSync}
                  disabled={isSyncing}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium border border-slate-300 transition-colors cursor-pointer"
                  title="ซิงค์ข้อมูลล่าสุดขึ้น Cloud Firestore ทันที"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span className="hidden xl:inline">ซิงค์คลาวด์</span>
                </button>
              )}

              {/* Google Drive Cloud Backup Button */}
              {onOpenGoogleDrive && (
                <button
                  onClick={onOpenGoogleDrive}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-[#0070c0] hover:from-emerald-700 hover:to-[#005a9c] text-white rounded text-xs font-bold shadow-xs transition-all cursor-pointer"
                  title="เปิดระบบสำรองข้อมูลและกู้คืนฐานข้อมูลผ่าน Google Drive บน Web"
                >
                  <HardDrive className="w-3.5 h-3.5 text-emerald-200" />
                  <span>Google Drive (สำรอง DB)</span>
                </button>
              )}

              {/* Date & Period Manager Button */}
              {onOpenDatePeriod && (
                <button
                  onClick={onOpenDatePeriod}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-800 rounded text-xs font-semibold border border-slate-300 shadow-2xs transition-colors cursor-pointer"
                  title="จัดการวัน เดือน ปี สำหรับใส่ข้อมูลและสร้างตารางวันทำการ"
                >
                  <Calendar className="w-3.5 h-3.5 text-[#0070c0]" />
                  <span>จัดการ วัน/เดือน/ปี</span>
                </button>
              )}

              {onOpenPublish && (
                <button
                  onClick={onOpenPublish}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded text-xs font-bold shadow-xs transition-all cursor-pointer"
                  title="ดูข้อมูลการเผยแพร่ออนไลน์และคัดลอกลิงก์สำหรับแชร์ให้ผู้จัดการ"
                >
                  <Globe className="w-3.5 h-3.5 text-sky-200" />
                  <span>เผยแพร่ออนไลน์</span>
                </button>
              )}

              <button
                onClick={onOpenPublish || handleCopyLink}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#0070c0] rounded text-xs font-semibold border border-blue-200 transition-colors"
                title="คัดลอกลิงก์ Web นี้ไปเปิดบนมือถือหรือส่งให้ทีมงาน/ผู้จัดการ"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>คัดลอกแล้ว!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5" />
                    <span>แชร์ลิงก์</span>
                  </>
                )}
              </button>
            </div>

            {/* Plant Dropdown */}
            <div className="flex flex-col">
              <label className="text-[11px] font-semibold text-slate-600 mb-0.5">Plant</label>
              <select
                value={filters.plant}
                onChange={e => onFilterChange({ ...filters, plant: e.target.value })}
                className="bg-slate-100 hover:bg-slate-200/80 border border-slate-300 text-slate-800 text-xs font-medium rounded px-3 py-1.5 min-w-[140px] focus:outline-none focus:ring-2 focus:ring-[#0070c0] transition-colors cursor-pointer"
              >
                <option value="ทั้งหมด">ทั้งหมด</option>
                {availablePlants.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Year Dropdown */}
            <div className="flex flex-col">
              <label className="text-[11px] font-semibold text-slate-600 mb-0.5">Year (ปี)</label>
              <select
                value={filters.year}
                onChange={e => {
                  const y = Number(e.target.value);
                  const newMonth = filters.month === 'All' ? 'All' : `${y}-${filters.month.split('-')[1] || '09'}`;
                  onFilterChange({ ...filters, year: y, month: newMonth });
                }}
                className="bg-slate-100 hover:bg-slate-200/80 border border-slate-300 text-slate-800 text-xs font-medium rounded px-3 py-1.5 min-w-[90px] focus:outline-none focus:ring-2 focus:ring-[#0070c0] transition-colors cursor-pointer"
              >
                <option value={2024}>2024</option>
                <option value={2025}>2025</option>
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
                <option value={2028}>2028</option>
                <option value={2029}>2029</option>
                <option value={2030}>2030</option>
              </select>
            </div>

            {/* Month Dropdown */}
            <div className="flex flex-col">
              <label className="text-[11px] font-semibold text-slate-600 mb-0.5">Month (เดือน)</label>
              <select
                value={filters.month}
                onChange={e => onFilterChange({ ...filters, month: e.target.value })}
                className="bg-slate-100 hover:bg-slate-200/80 border border-slate-300 text-slate-800 text-xs font-medium rounded px-3 py-1.5 min-w-[150px] focus:outline-none focus:ring-2 focus:ring-[#0070c0] transition-colors cursor-pointer"
              >
                <option value="All">ทุกเดือน (All Months)</option>
                {THAI_MONTHS.map(m => (
                  <option key={m.value} value={`${filters.year}-${m.value}`}>
                    {filters.year}-{m.value} {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Prod Line Filter */}
            <div className="flex flex-col">
              <label className="text-[11px] font-semibold text-slate-600 mb-0.5">Line</label>
              <select
                value={filters.prodLine}
                onChange={e => onFilterChange({ ...filters, prodLine: e.target.value })}
                className="bg-slate-100 hover:bg-slate-200/80 border border-slate-300 text-slate-800 text-xs font-medium rounded px-3 py-1.5 min-w-[110px] focus:outline-none focus:ring-2 focus:ring-[#0070c0] transition-colors cursor-pointer"
              >
                <option value="All">ทุก Line</option>
                {availableLines.map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Sheet Tabs Bar (Excel / Modern Tab Switcher) */}
        <div className="mt-3 flex items-center justify-between border-b border-slate-200 overflow-x-auto">
          <div className="flex items-center gap-1">
            <button
              onClick={() => onTabChange('daily-oec')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-t-md transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'daily-oec'
                  ? 'border-[#0070c0] text-[#0070c0] bg-blue-50/70 shadow-xs'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <TableProperties className="w-4 h-4" />
              <span>Sheet 1: Daily OEC (ตารางหลัก 生产&效率日清)</span>
            </button>

            <button
              onClick={() => onTabChange('daily-trend')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-t-md transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'daily-trend'
                  ? 'border-[#0070c0] text-[#0070c0] bg-blue-50/70 shadow-xs'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <TrendingUp className="w-4 h-4 text-[#0070c0]" />
              <span>Sheet 2: กราฟ & ตารางบันทึกข้อมูลรายวัน (Daily Trend & Live Record)</span>
            </button>

            <button
              onClick={() => onTabChange('summary-efficiency')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-t-md transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'summary-efficiency'
                  ? 'border-[#0070c0] text-[#0070c0] bg-blue-50/70 shadow-xs'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              <span>Sheet 3: Summary Efficiency Line A, B (AVG & Actual YTD)</span>
            </button>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="pt-2.5 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            {/* Import Button */}
            <button
              onClick={onOpenImport}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0070c0] hover:bg-[#005ba3] text-white text-xs font-semibold rounded shadow-sm transition-all"
              title="นำเข้าไฟล์ Excel หรือ CSV เพื่ออัปเดตข้อมูลบนหน้าเว็บ"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>นำเข้าไฟล์ (Excel / CSV)</span>
            </button>

            {/* Template Download */}
            <button
              onClick={onDownloadTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded border border-slate-300 transition-colors"
              title="ดาวน์โหลดไฟล์แม่แบบ Excel สำหรับกรอกข้อมูล OEC"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>โหลดแม่แบบ Excel</span>
            </button>

            {/* Export Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded border border-slate-300 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" />
                <span>ส่งออกข้อมูล</span>
              </button>

              {showExportMenu && (
                <div 
                  className="absolute left-0 mt-1 w-44 bg-white rounded-md shadow-lg border border-slate-200 py-1 z-50 text-xs"
                  onMouseLeave={() => setShowExportMenu(false)}
                >
                  <button
                    onClick={() => {
                      onExportExcel();
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>ส่งออกเป็น Excel (.xlsx)</span>
                  </button>
                  <button
                    onClick={() => {
                      onExportCSV();
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-600" />
                    <span>ส่งออกเป็น CSV (.csv)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Edit Mode Toggle */}
            <button
              onClick={onToggleEditMode}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded border transition-colors ${
                isEditMode
                  ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
              }`}
              title="สลับโหมดแก้ไขข้อมูลในตารางโดยตรง"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditMode ? 'กำลังเปิดโหมดแก้ไข (คลิกช่องเพื่อแก้)' : 'เปิดโหมดแก้ไขตาราง'}</span>
            </button>

            {/* Add Production Line */}
            <button
              onClick={onOpenAddLine}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded border border-slate-300 transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-600" />
              <span>เพิ่มสายการผลิต / โรงงาน</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Reset Button */}
            <button
              onClick={onResetData}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
              title="รีเซ็ตกลับเป็นข้อมูลตัวอย่างตั้งต้นจากรูป"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>รีเซ็ตค่าเดิม</span>
            </button>

            {/* Presentation Mode / Factory Manager Report Button */}
            <button
              onClick={onOpenPresentation}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-semibold rounded shadow-sm transition-all"
            >
              <Presentation className="w-3.5 h-3.5" />
              <span>รายงานนำเสนอ ผจก. โรงงาน</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

