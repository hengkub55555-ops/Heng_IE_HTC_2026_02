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
  TrendingUp,
  Languages,
  Palette
} from 'lucide-react';
import { OECFilterState, ActiveSheetTab } from '../types/oec';
import { THAI_MONTHS } from '../utils/dateHelper';
import { useAppPreferences, APP_THEMES, AppLanguage } from '../contexts/AppPreferencesContext';

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
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const { language, setLanguage, themeId, setThemeId, currentTheme, t } = useAppPreferences();

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const monthNamesEn: Record<string, string> = {
    '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
    '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug',
    '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec',
  };
  const monthNamesZh: Record<string, string> = {
    '01': '1月', '02': '2月', '03': '3月', '04': '4月',
    '05': '5月', '06': '6月', '07': '7月', '08': '8月',
    '09': '9月', '10': '10月', '11': '11月', '12': '12月',
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
                <span className="text-[#0070c0] font-bold text-xl sm:text-2xl">
                  {t('(ตารางควบคุมการผลิต & ประสิทธิภาพ)', '(Daily Production & Efficiency)', '(生产&效率日清)')}
                </span>
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                {t(
                  'ระบบจัดการและรายงานข้อมูลการผลิตและประสิทธิภาพประจำวัน สำหรับผู้บริหารและผู้จัดการโรงงาน',
                  'Daily Production & Efficiency Management System for Factory Executives & Managers',
                  '面向工厂管理层与经理的每日生产与效率日清（OEC）管理报表系统'
                )}
              </p>
            </div>
          </div>

          {/* Top-Right Dropdown Filters matching screenshot & Cloud Status */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Language Switcher (TH / EN / ZH) & 5 Color Theme Switcher */}
            <div className="flex flex-wrap items-center gap-2 bg-slate-100/90 border border-slate-200 rounded-md px-2 py-1">
              {/* Language Selector */}
              <div className="flex items-center gap-1" title={t('เปลี่ยนภาษาบนหน้าเว็บ', 'Switch Web Language', '切换网页语言')}>
                <Languages className="w-3.5 h-3.5 text-[#0070c0] mr-0.5" />
                {([
                  { code: 'th' as AppLanguage, label: 'ไทย' },
                  { code: 'en' as AppLanguage, label: 'EN' },
                  { code: 'zh' as AppLanguage, label: '中文' },
                ]).map(langItem => (
                  <button
                    key={langItem.code}
                    onClick={() => setLanguage(langItem.code)}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                      language === langItem.code
                        ? 'bg-[#0070c0] text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                    }`}
                  >
                    {langItem.label}
                  </button>
                ))}
              </div>

              <div className="h-4 w-px bg-slate-300 mx-0.5" />

              {/* 5 Color Theme Switcher (Quick Swatches + Dropdown) */}
              <div className="relative flex items-center gap-1.5">
                <button
                  onClick={() => setShowThemeMenu(!showThemeMenu)}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold text-slate-700 hover:bg-white/80 transition-colors cursor-pointer"
                  title={t('เลือกโหมดสีหน้าเว็บ (5 สไตล์)', 'Select Color Theme (5 Modes)', '选择网页主题配色（5种模式）')}
                >
                  <Palette className="w-3.5 h-3.5 text-[#0070c0]" />
                  <span className="hidden sm:inline">{t('โหมดสี', 'Theme', '主题色')}:</span>
                </button>

                {/* Quick 5 Color Dots */}
                <div className="flex items-center gap-1">
                  {APP_THEMES.map(theme => (
                    <button
                      key={theme.id}
                      onClick={() => setThemeId(theme.id)}
                      title={theme.name[language]}
                      style={{ backgroundColor: theme.id === 'midnight' ? '#0f172a' : theme.primaryHex }}
                      className={`w-4 h-4 rounded-full transition-transform cursor-pointer border ${
                        themeId === theme.id
                          ? 'scale-125 ring-2 ring-offset-1 ring-slate-700 border-white'
                          : 'opacity-75 hover:opacity-100 border-white/60'
                      }`}
                    />
                  ))}
                </div>

                {/* Detailed Theme Dropdown */}
                {showThemeMenu && (
                  <div
                    className="absolute right-0 top-7 mt-1 w-64 bg-white rounded-lg shadow-xl border border-slate-200 py-2 z-50 text-xs"
                    onMouseLeave={() => setShowThemeMenu(false)}
                  >
                    <div className="px-3 py-1.5 border-b border-slate-100 font-bold text-slate-700 flex items-center justify-between">
                      <span>{t('เลือกโหมดสี (5 สไตล์)', 'Select Color Mode (5 Themes)', '选择配色模式 (5种主题)')}</span>
                      <span className="text-[10px] text-slate-400">{currentTheme.id.toUpperCase()}</span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {APP_THEMES.map(theme => {
                        const isSelected = theme.id === themeId;
                        return (
                          <button
                            key={theme.id}
                            onClick={() => {
                              setThemeId(theme.id);
                              setShowThemeMenu(false);
                            }}
                            className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                              isSelected ? 'bg-slate-50/90 font-bold' : ''
                            }`}
                          >
                            <div className="pr-2">
                              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                <span>{theme.name[language]}</span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                              </div>
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                {theme.description[language]}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {theme.swatchColors.map((hex, i) => (
                                <span
                                  key={i}
                                  style={{ backgroundColor: hex }}
                                  className="w-3.5 h-3.5 rounded-full border border-slate-300"
                                />
                              ))}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Online Status & Share */}
            <div className="flex flex-wrap items-center gap-2 mr-1">
              <div 
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-xs font-semibold shadow-2xs"
                title={t(
                  'ฐานข้อมูล Firestore เชื่อมต่อแบบ Real-Time ข้อมูลอัปเดตตรงกันทุกเครื่องทันที',
                  'Real-Time Firestore Database connected across all devices',
                  'Firestore 实时数据库已连接，所有设备实时同步'
                )}
              >
                <span className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-amber-500 animate-ping' : 'bg-emerald-500 animate-pulse'}`} />
                <span>
                  {isSyncing
                    ? t('กำลังซิงค์...', 'Syncing...', '同步中...')
                    : t('ออนไลน์ (Cloud Live)', 'Online (Cloud Live)', '在线 (云端实时)')}
                </span>
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
                  title={t('บันทึกข้อมูลลงบน Web Database ทันที (Ctrl + S)', 'Save data to Web Database now (Ctrl + S)', '立即保存数据到网页数据库 (Ctrl + S)')}
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>
                    {isSyncing
                      ? t('กำลังบันทึก...', 'Saving...', '保存中...')
                      : hasUnsavedChanges
                      ? t('บันทึกบน Web (มีการแก้ไข)*', 'Save on Web (Unsaved)*', '网页保存 (有修改)*')
                      : t('บันทึกบน Web', 'Save on Web', '网页保存')}
                  </span>
                </button>
              )}

              {/* Web Save Manager / History Button */}
              {onOpenWebSaveModal && (
                <button
                  onClick={onOpenWebSaveModal}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded text-xs font-semibold border border-emerald-200 transition-colors cursor-pointer"
                  title={t('ดูข้อมูลที่บันทึกไว้บน Web แยกตามเดือน/ปี และประวัติการบันทึก', 'View Web saved periods & snapshot history', '查看网页已保存的月份数据与历史记录')}
                >
                  <History className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{t(`ข้อมูลที่บันทึกบน Web (${savedPeriodsCount})`, `Web Saved (${savedPeriodsCount})`, `已存记录 (${savedPeriodsCount})`)}</span>
                </button>
              )}

              {onManualSync && (
                <button
                  onClick={onManualSync}
                  disabled={isSyncing}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium border border-slate-300 transition-colors cursor-pointer"
                  title={t('ซิงค์ข้อมูลล่าสุดขึ้น Cloud Firestore ทันที', 'Sync latest data to Cloud Firestore', '立即同步最新数据至云端')}
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span className="hidden xl:inline">{t('ซิงค์คลาวด์', 'Cloud Sync', '云同步')}</span>
                </button>
              )}

              {/* Google Drive Cloud Backup Button */}
              {onOpenGoogleDrive && (
                <button
                  onClick={onOpenGoogleDrive}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-[#0070c0] hover:from-emerald-700 hover:to-[#005a9c] text-white rounded text-xs font-bold shadow-xs transition-all cursor-pointer"
                  title={t('เปิดระบบสำรองข้อมูลและกู้คืนฐานข้อมูลผ่าน Google Drive บน Web', 'Backup & Restore Database with Google Drive', '通过 Google Drive 备份与恢复数据库')}
                >
                  <HardDrive className="w-3.5 h-3.5 text-emerald-200" />
                  <span>{t('Google Drive (สำรอง DB)', 'Google Drive (Backup)', 'Google Drive (云备份)')}</span>
                </button>
              )}

              {/* Date & Period Manager Button */}
              {onOpenDatePeriod && (
                <button
                  onClick={onOpenDatePeriod}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-800 rounded text-xs font-semibold border border-slate-300 shadow-2xs transition-colors cursor-pointer"
                  title={t('จัดการวัน เดือน ปี สำหรับใส่ข้อมูลและสร้างตารางวันทำการ', 'Manage Dates, Months, Years & Working Days', '管理日/月/年及生成工作日表')}
                >
                  <Calendar className="w-3.5 h-3.5 text-[#0070c0]" />
                  <span>{t('จัดการ วัน/เดือน/ปี', 'Date / Period', '日期/月份管理')}</span>
                </button>
              )}

              {onOpenPublish && (
                <button
                  onClick={onOpenPublish}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded text-xs font-bold shadow-xs transition-all cursor-pointer"
                  title={t('ดูข้อมูลการเผยแพร่ออนไลน์และคัดลอกลิงก์สำหรับแชร์ให้ผู้จัดการ', 'Publish online & share link with managers', '在线发布与分享链接给管理层')}
                >
                  <Globe className="w-3.5 h-3.5 text-sky-200" />
                  <span>{t('เผยแพร่ออนไลน์', 'Publish Online', '在线发布')}</span>
                </button>
              )}

              <button
                onClick={onOpenPublish || handleCopyLink}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#0070c0] rounded text-xs font-semibold border border-blue-200 transition-colors"
                title={t('คัดลอกลิงก์ Web นี้ไปเปิดบนมือถือหรือส่งให้ทีมงาน/ผู้จัดการ', 'Copy Web link to share with team/managers', '复制网页链接分享给团队或经理')}
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{t('คัดลอกแล้ว!', 'Copied!', '已复制!')}</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5" />
                    <span>{t('แชร์ลิงก์', 'Share Link', '分享链接')}</span>
                  </>
                )}
              </button>
            </div>

            {/* Plant Dropdown */}
            <div className="flex flex-col">
              <label className="text-[11px] font-semibold text-slate-600 mb-0.5">
                {t('Plant (โรงงาน)', 'Plant', '工厂 (Plant)')}
              </label>
              <select
                value={filters.plant}
                onChange={e => onFilterChange({ ...filters, plant: e.target.value })}
                className="bg-slate-100 hover:bg-slate-200/80 border border-slate-300 text-slate-800 text-xs font-medium rounded px-3 py-1.5 min-w-[140px] focus:outline-none focus:ring-2 focus:ring-[#0070c0] transition-colors cursor-pointer"
              >
                <option value="ทั้งหมด">{t('ทั้งหมด (All Plants)', 'All Plants', '全部工厂')}</option>
                {availablePlants.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Year Dropdown */}
            <div className="flex flex-col">
              <label className="text-[11px] font-semibold text-slate-600 mb-0.5">
                {t('Year (ปี)', 'Year', '年份 (Year)')}
              </label>
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
              <label className="text-[11px] font-semibold text-slate-600 mb-0.5">
                {t('Month (เดือน)', 'Month', '月份 (Month)')}
              </label>
              <select
                value={filters.month}
                onChange={e => onFilterChange({ ...filters, month: e.target.value })}
                className="bg-slate-100 hover:bg-slate-200/80 border border-slate-300 text-slate-800 text-xs font-medium rounded px-3 py-1.5 min-w-[150px] focus:outline-none focus:ring-2 focus:ring-[#0070c0] transition-colors cursor-pointer"
              >
                <option value="All">{t('ทุกเดือน (All Months)', 'All Months', '全部月份')}</option>
                {THAI_MONTHS.map(m => {
                  const mLabel =
                    language === 'en'
                      ? monthNamesEn[m.value] || m.label
                      : language === 'zh'
                      ? monthNamesZh[m.value] || m.label
                      : m.label;
                  return (
                    <option key={m.value} value={`${filters.year}-${m.value}`}>
                      {filters.year}-{m.value} ({mLabel})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Prod Line Filter */}
            <div className="flex flex-col">
              <label className="text-[11px] font-semibold text-slate-600 mb-0.5">
                {t('Line (สายการผลิต)', 'Prod Line', '产线 (Line)')}
              </label>
              <select
                value={filters.prodLine}
                onChange={e => onFilterChange({ ...filters, prodLine: e.target.value })}
                className="bg-slate-100 hover:bg-slate-200/80 border border-slate-300 text-slate-800 text-xs font-medium rounded px-3 py-1.5 min-w-[110px] focus:outline-none focus:ring-2 focus:ring-[#0070c0] transition-colors cursor-pointer"
              >
                <option value="All">{t('ทุก Line', 'All Lines', '全部产线')}</option>
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
              <span>
                {t(
                  'Sheet 1: Daily OEC (ตารางหลัก 生产&效率日清)',
                  'Sheet 1: Daily OEC Dashboard & Matrix',
                  'Sheet 1: 每日生产&效率日清主表 (Daily OEC)'
                )}
              </span>
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
              <span>
                {t(
                  'Sheet 2: กราฟ & ตารางบันทึกข้อมูลรายวัน (Daily Trend & Live Record)',
                  'Sheet 2: Daily Trend Charts & Live Data Record',
                  'Sheet 2: 每日趋势图表与数据记录表 (Daily Trend)'
                )}
              </span>
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
              <span>
                {t(
                  'Sheet 3: Summary Efficiency Line A, B (AVG & Actual YTD)',
                  'Sheet 3: Summary Efficiency Line A, B (AVG & Actual YTD)',
                  'Sheet 3: 产线 A, B 效率汇总 (月均与年度累计 YTD)'
                )}
              </span>
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
              title={t('นำเข้าไฟล์ Excel หรือ CSV เพื่ออัปเดตข้อมูลบนหน้าเว็บ', 'Import Excel or CSV file to update web data', '导入 Excel 或 CSV 文件以更新网页数据')}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{t('นำเข้าไฟล์ (Excel / CSV)', 'Import (Excel / CSV)', '导入文件 (Excel / CSV)')}</span>
            </button>

            {/* Template Download */}
            <button
              onClick={onDownloadTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded border border-slate-300 transition-colors"
              title={t('ดาวน์โหลดไฟล์แม่แบบ Excel สำหรับกรอกข้อมูล OEC', 'Download Excel Template for OEC data', '下载 OEC 数据 Excel 模板')}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>{t('โหลดแม่แบบ Excel', 'Excel Template', '下载 Excel 模板')}</span>
            </button>

            {/* Export Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded border border-slate-300 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" />
                <span>{t('ส่งออกข้อมูล', 'Export Data', '导出数据')}</span>
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
                    <span>{t('ส่งออกเป็น Excel (.xlsx)', 'Export as Excel (.xlsx)', '导出为 Excel (.xlsx)')}</span>
                  </button>
                  <button
                    onClick={() => {
                      onExportCSV();
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-600" />
                    <span>{t('ส่งออกเป็น CSV (.csv)', 'Export as CSV (.csv)', '导出为 CSV (.csv)')}</span>
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
              title={t('สลับโหมดแก้ไขข้อมูลในตารางโดยตรง', 'Toggle direct table editing mode', '切换表格直接编辑模式')}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>
                {isEditMode
                  ? t('กำลังเปิดโหมดแก้ไข (คลิกช่องเพื่อแก้)', 'Edit Mode Active (Click cell)', '编辑模式已开启 (点击单元格修改)')
                  : t('เปิดโหมดแก้ไขตาราง', 'Enable Table Edit', '开启表格编辑')}
              </span>
            </button>

            {/* Add Production Line */}
            <button
              onClick={onOpenAddLine}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded border border-slate-300 transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-600" />
              <span>{t('เพิ่มสายการผลิต / โรงงาน', 'Add Line / Plant', '新增产线 / 工厂')}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Reset Button */}
            <button
              onClick={onResetData}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
              title={t('รีเซ็ตกลับเป็นข้อมูลตัวอย่างตั้งต้นจากรูป', 'Reset back to default benchmark data', '重置为初始标准示例数据')}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t('รีเซ็ตค่าเดิม', 'Reset Default', '重置默认')}</span>
            </button>

            {/* Presentation Mode / Factory Manager Report Button */}
            <button
              onClick={onOpenPresentation}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-semibold rounded shadow-sm transition-all"
            >
              <Presentation className="w-3.5 h-3.5" />
              <span>{t('รายงานนำเสนอ ผจก. โรงงาน', 'Executive Report', '厂长汇报演示')}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

