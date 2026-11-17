import React, { useState } from 'react';
import {
  X,
  Printer,
  AlertTriangle,
  Plus,
  Trash2,
  UserCheck,
  FileText,
  Building,
} from 'lucide-react';
import { LineOECData, DayColumn, ActionItem, MonthlyEfficiencyRow } from '../types/oec';
import { useAppPreferences } from '../contexts/AppPreferencesContext';
import { formatPeriodLabel } from '../utils/dateHelper';

interface PresentationModalProps {
  isOpen: boolean;
  onClose: () => void;
  lines: LineOECData[];
  days: DayColumn[];
  totalPlanning: number;
  totalActual: number;
  totalGap: number;
  overallUph: number;
  achievementRate: number;
  actionItems: ActionItem[];
  onUpdateActionItems: (items: ActionItem[]) => void;
  plantName: string;
  year: number;
  month: string;
  monthlyEfficiency?: MonthlyEfficiencyRow[];
}

export const PresentationModal: React.FC<PresentationModalProps> = ({
  isOpen,
  onClose,
  lines,
  days,
  totalPlanning,
  totalActual,
  totalGap,
  overallUph,
  achievementRate,
  actionItems,
  onUpdateActionItems,
  plantName,
  year,
  month,
  monthlyEfficiency = [],
}) => {
  const { language, t } = useAppPreferences();

  const [managerRemarks, setManagerRemarks] = useState<string>(
    '1. ให้ฝ่ายซ่อมบำรุงเร่งสรุปรายงานสาเหตุเครื่องจักรหลักขัดข้องพร้อมมาตรการป้องกันระยะยาว\n2. มอบหมายฝ่าย IE ปรับสมดุลสายการผลิต (Line Balancing) ของ Line B ให้ UPH ไม่ต่ำกว่า 110 ภายในสัปดาห์หน้า\n3. ขอให้ทุกหน่วยงานเข้มงวดการจัดทำ OEC ประจำวันเพื่อตรวจจับปัญหาได้ทันทีในกะ'
  );

  const [newIssue, setNewIssue] = useState('');
  const [newRootCause, setNewRootCause] = useState('');
  const [newAction, setNewAction] = useState('');
  const [newOwner, setNewOwner] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [showAddActionForm, setShowAddActionForm] = useState(false);

  if (!isOpen) return null;

  const dateLocale = language === 'th' ? 'th-TH' : language === 'zh' ? 'zh-CN' : 'en-US';
  const periodDisplay = formatPeriodLabel(year, month, language);

  const dailyGaps: { day: number; weekday: string; gap: number }[] = [];
  days.forEach(d => {
    let dayPlan = 0;
    let dayAct = 0;
    lines.forEach(l => {
      dayPlan += Number(l.planning[d.day] || 0);
      dayAct += Number(l.act[d.day] || 0);
    });
    dailyGaps.push({ day: d.day, weekday: d.weekday, gap: dayAct - dayPlan });
  });

  const topLossDays = [...dailyGaps]
    .filter(g => g.gap < 0)
    .sort((a, b) => a.gap - b.gap)
    .slice(0, 3);

  const handlePrint = () => {
    window.print();
  };

  const handleAddAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIssue || !newAction) return;

    const newItem: ActionItem = {
      id: `act-${Date.now()}`,
      issue: newIssue,
      rootCause:
        newRootCause ||
        t('อยู่ระหว่างวิเคราะห์ 5-Why', 'Under 5-Why RCA', '正在进行 5-Why 根因分析'),
      action: newAction,
      owner: newOwner || t('ผู้รับผิดชอบงาน', 'Owner', '负责人'),
      dueDate: newDueDate || new Date().toISOString().split('T')[0],
      status: 'In Progress',
    };

    onUpdateActionItems([...actionItems, newItem]);
    setNewIssue('');
    setNewRootCause('');
    setNewAction('');
    setNewOwner('');
    setNewDueDate('');
    setShowAddActionForm(false);
  };

  const handleDeleteAction = (id: string) => {
    onUpdateActionItems(actionItems.filter(item => item.id !== id));
  };

  const handleStatusChange = (id: string, status: 'Open' | 'In Progress' | 'Resolved') => {
    onUpdateActionItems(
      actionItems.map(item => (item.id === id ? { ...item, status } : item))
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-2xl border border-slate-300 w-full max-w-5xl my-auto overflow-hidden animate-in fade-in duration-200">
        {/* Top Control Bar */}
        <div className="bg-slate-900 text-white px-6 py-3 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <span className="bg-emerald-500 text-slate-950 font-bold text-[11px] px-2 py-0.5 rounded uppercase">
              Executive Mode
            </span>
            <h2 className="font-bold text-base sm:text-lg">
              {t(
                'รายงานนำเสนอผู้จัดการโรงงาน (Plant Manager Report)',
                'Plant Manager Executive OEC Report',
                '厂长运营汇报演示 (Plant Manager Report)'
              )}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{t('พิมพ์รายงาน / บันทึก PDF', 'Print / Save PDF', '打印 / 导出 PDF')}</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Executive Report Content */}
        <div className="p-6 sm:p-8 max-h-[85vh] overflow-y-auto print:max-h-none print:overflow-visible print:p-0">
          {/* Executive Report Header */}
          <div className="border-b-2 border-slate-800 pb-4 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-blue-700 uppercase tracking-widest">
                  <Building className="w-3.5 h-3.5" />
                  <span>{plantName} · Factory Operations</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                  Daily Production & Efficiency OEC Report
                </h1>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {t(
                    'รายงานสรุปผลการผลิตรายวัน การวิเคราะห์ประสิทธิภาพ UPH และมาตรการแก้ไขปัญหาสำหรับผู้จัดการโรงงาน',
                    'Daily Production Output, UPH Efficiency Analysis & Countermeasures Report',
                    '每日生产达成、UPH 效率分析及改善对策综合汇报'
                  )}
                </p>
              </div>

              <div className="text-left sm:text-right bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded border sm:border-0 border-slate-200">
                <div className="text-xs font-semibold text-slate-700">
                  {t('ประจำงวด:', 'Period:', '报告周期:')} {periodDisplay}
                </div>
                <div className="text-[11px] text-slate-500">
                  {t('วันที่จัดทำ:', 'Generated:', '生成日期:')}{' '}
                  {new Date().toLocaleDateString(dateLocale, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </div>
                <div className="text-[11px] font-semibold text-emerald-700">
                  {t(
                    'สถานะ: พร้อมประชุม OEC Review',
                    'Status: Ready for OEC Review',
                    '状态: OEC 评审会议就绪'
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Executive KPI Overview Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 tabular-nums">
            <div className="bg-slate-50 p-3.5 rounded border border-slate-200">
              <span className="text-xs font-semibold text-slate-500">
                {t('เป้าหมาย (Planning)', 'Target (Planning)', '计划目标 (Planning)')}
              </span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {totalPlanning.toLocaleString()}{' '}
                <span className="text-xs font-normal text-slate-500">
                  {t('เครื่อง', 'Units', '台')}
                </span>
              </div>
              <div className="text-[11px] text-slate-600 mt-0.5">
                {t('เป้าสะสมประจำงวด', 'Period Target', '本周期累计计划')}
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded border border-slate-200">
              <span className="text-xs font-semibold text-slate-500">
                {t('ผลิตได้จริง (Actual)', 'Actual Output', '实际完成 (Actual)')}
              </span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {totalActual.toLocaleString()}{' '}
                <span className="text-xs font-normal text-slate-500">
                  {t('เครื่อง', 'Units', '台')}
                </span>
              </div>
              <div className="text-[11px] font-semibold text-blue-700 mt-0.5">
                {t('บรรลุ', 'Achieved', '达成率')} {achievementRate.toFixed(1)}%
              </div>
            </div>

            <div
              className={`p-3.5 rounded border ${
                totalGap < 0 ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'
              }`}
            >
              <span className="text-xs font-semibold text-slate-600">
                {t('ผลต่าง (Net Gap)', 'Net Gap', '产量差异 (Net Gap)')}
              </span>
              <div
                className={`text-2xl font-black mt-1 ${
                  totalGap < 0 ? 'text-rose-700' : 'text-emerald-700'
                }`}
              >
                {totalGap > 0 ? `+${totalGap.toLocaleString()}` : totalGap.toLocaleString()}{' '}
                <span className="text-xs font-normal text-slate-600">
                  {t('เครื่อง', 'Units', '台')}
                </span>
              </div>
              <div
                className={`text-[11px] font-semibold ${
                  totalGap < 0 ? 'text-rose-600' : 'text-emerald-600'
                }`}
              >
                {totalGap < 0
                  ? t(
                      `ขาดเป้าหมาย ${Math.abs(totalGap).toLocaleString()} ชิ้น`,
                      `Shortfall: ${Math.abs(totalGap).toLocaleString()} units`,
                      `低于计划 ${Math.abs(totalGap).toLocaleString()} 台`
                    )
                  : t('ยอดผลิตเกินเป้าหมาย', 'Exceeded Target', '超出计划目标')}
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded border border-slate-200">
              <span className="text-xs font-semibold text-slate-500">
                {t('ประสิทธิภาพเฉลี่ย (UPH)', 'Overall UPH', '平均效率 (UPH)')}
              </span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {overallUph}{' '}
                <span className="text-xs font-normal text-slate-500">
                  {t('ตัว/ชม.', 'Units/Hr', '台/小时')}
                </span>
              </div>
              <div className="text-[11px] text-slate-600 mt-0.5">
                {t('เป้าหมายมาตรฐาน: 110 UPH', 'Target Benchmark: 110 UPH', '标准目标: 110 UPH')}
              </div>
            </div>
          </div>

          {/* Bottleneck Diagnosis */}
          <div className="mb-6 bg-slate-50 rounded border border-slate-200 p-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>
                {t(
                  'การวิเคราะห์ผลการดำเนินงานและจุดคอขวด (OEC Bottleneck Diagnosis)',
                  'OEC Bottleneck Diagnosis & Variance Highlights',
                  'OEC 瓶颈诊断与异常波动分析'
                )}
              </span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-700">
              <div className="bg-white p-3 rounded border border-slate-200">
                <span className="font-semibold text-slate-900 block mb-1">
                  {t(
                    '1. วันที่พบปัญหายอดผลิตขาดเป้าหมายสูงสุด (Top 3 Loss Days):',
                    '1. Top 3 Production Shortfall Days:',
                    '1. 产量负差异最大前 3 日 (Top 3 Loss Days):'
                  )}
                </span>
                <ul className="space-y-1.5 pl-2">
                  {topLossDays.map(d => (
                    <li key={d.day} className="flex items-center justify-between text-rose-700">
                      <span>
                        • {t('วันที่', 'Day', '日期')} {d.day} ({d.weekday})
                      </span>
                      <span className="font-bold font-mono tabular-nums">
                        {d.gap.toLocaleString()}
                      </span>
                    </li>
                  ))}
                  {topLossDays.length === 0 && (
                    <li className="text-emerald-700">
                      {t(
                        'ยอดผลิตเป็นไปตามเป้าหมาย ไม่มีวันที่ขาดทุนร้ายแรง',
                        'Production met target across recorded days',
                        '所有记录工作日均达成生产计划'
                      )}
                    </li>
                  )}
                </ul>
              </div>

              <div className="bg-white p-3 rounded border border-slate-200">
                <span className="font-semibold text-slate-900 block mb-1">
                  {t(
                    '2. ข้อสังเกตความแตกต่างรายสายการผลิต:',
                    '2. Production Line Breakdown:',
                    '2. 各产线达成情况对比:'
                  )}
                </span>
                <ul className="space-y-1 pl-2 tabular-nums">
                  {lines.map(line => {
                    let pTotal = 0;
                    let aTotal = 0;
                    days.forEach(d => {
                      pTotal += Number(line.planning[d.day] || 0);
                      aTotal += Number(line.act[d.day] || 0);
                    });
                    const diff = aTotal - pTotal;
                    const pct = pTotal > 0 ? ((aTotal / pTotal) * 100).toFixed(1) : '100';

                    return (
                      <li key={line.id} className="flex items-center justify-between">
                        <span>
                          • {line.prodLine}: {t('บรรลุ', 'Achv', '达成')} {pct}%
                        </span>
                        <span
                          className={`font-semibold ${
                            diff < 0 ? 'text-rose-600' : 'text-emerald-600'
                          }`}
                        >
                          Gap: {diff > 0 ? `+${diff.toLocaleString()}` : diff.toLocaleString()}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>

          {/* YTD Summary Table */}
          {monthlyEfficiency && monthlyEfficiency.length > 0 && (
            <div className="mb-6 bg-white rounded border border-slate-300 overflow-hidden">
              <div className="bg-slate-100 px-3.5 py-2 border-b border-slate-300 flex items-center justify-between">
                <span className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-blue-600" />
                  <span>
                    {t(
                      'สรุปประสิทธิภาพสะสม YTD รายเดือน (Line A & Line B Summary Efficiency)',
                      'YTD Monthly Summary Efficiency (Line A & Line B)',
                      '年度累计月度效率汇总 (Line A & Line B)'
                    )}
                  </span>
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] text-left border-collapse tabular-nums">
                  <thead className="bg-slate-200 text-slate-800 font-bold border-b border-slate-300 text-center">
                    <tr className="divide-x divide-slate-300">
                      <th className="py-1.5 px-2">{t('เดือน', 'Month', '月份')}</th>
                      <th className="py-1.5 px-2 bg-sky-100 text-sky-950">Line A Plan</th>
                      <th className="py-1.5 px-2 bg-sky-100 text-sky-950">Line A Act</th>
                      <th className="py-1.5 px-2 bg-sky-200 text-sky-950">Line A UPH</th>
                      <th className="py-1.5 px-2 bg-blue-100 text-blue-950">Line B Plan</th>
                      <th className="py-1.5 px-2 bg-blue-100 text-blue-950">Line B Act</th>
                      <th className="py-1.5 px-2 bg-blue-200 text-blue-950">Line B UPH</th>
                      <th className="py-1.5 px-2 bg-emerald-100 text-emerald-950">Plant Total Act</th>
                      <th className="py-1.5 px-2 bg-emerald-200 text-emerald-950">Plant AVG UPH</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    {monthlyEfficiency.map(m => {
                      const totAct = m.lineAAct + m.lineBAct;
                      const totHrs = m.lineAWorkHours + m.lineBWorkHours;
                      const plantUph = totHrs > 0 ? Math.round(totAct / totHrs) : 0;
                      return (
                        <tr
                          key={m.month}
                          className="divide-x divide-slate-200 text-center hover:bg-slate-50"
                        >
                          <td className="py-1 px-2 font-semibold bg-slate-50">{m.month}</td>
                          <td className="py-1 px-2 text-right">{m.lineAPlan.toLocaleString()}</td>
                          <td className="py-1 px-2 text-right font-bold">
                            {m.lineAAct.toLocaleString()}
                          </td>
                          <td className="py-1 px-2 font-extrabold text-sky-700 bg-sky-50/50">
                            {m.lineAUph}
                          </td>
                          <td className="py-1 px-2 text-right">{m.lineBPlan.toLocaleString()}</td>
                          <td className="py-1 px-2 text-right font-bold">
                            {m.lineBAct.toLocaleString()}
                          </td>
                          <td className="py-1 px-2 font-extrabold text-blue-800 bg-blue-50/50">
                            {m.lineBUph}
                          </td>
                          <td className="py-1 px-2 text-right font-black text-slate-900 bg-emerald-50/30">
                            {totAct.toLocaleString()}
                          </td>
                          <td className="py-1 px-2 font-extrabold text-emerald-800 bg-emerald-100/50">
                            {plantUph}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {(() => {
                    let aPlan = 0,
                      aAct = 0,
                      aHrs = 0;
                    let bPlan = 0,
                      bAct = 0,
                      bHrs = 0;
                    monthlyEfficiency.forEach(m => {
                      aPlan += m.lineAPlan;
                      aAct += m.lineAAct;
                      aHrs += m.lineAWorkHours;
                      bPlan += m.lineBPlan;
                      bAct += m.lineBAct;
                      bHrs += m.lineBWorkHours;
                    });
                    const totAct = aAct + bAct;
                    const totHrs = aHrs + bHrs;
                    const aUph = aHrs > 0 ? Math.round(aAct / aHrs) : 0;
                    const bUph = bHrs > 0 ? Math.round(bAct / bHrs) : 0;
                    const plantUph = totHrs > 0 ? Math.round(totAct / totHrs) : 0;

                    return (
                      <tfoot className="bg-slate-900 text-white font-bold border-t-2 border-slate-400 text-center divide-x divide-slate-700">
                        <tr>
                          <td className="py-1.5 px-2 bg-slate-950 text-amber-300">TOTAL YTD</td>
                          <td className="py-1.5 px-2 text-right text-sky-200">
                            {aPlan.toLocaleString()}
                          </td>
                          <td className="py-1.5 px-2 text-right font-black text-white">
                            {aAct.toLocaleString()}
                          </td>
                          <td className="py-1.5 px-2 font-black text-sky-300 bg-slate-800">
                            {aUph} UPH
                          </td>
                          <td className="py-1.5 px-2 text-right text-blue-200">
                            {bPlan.toLocaleString()}
                          </td>
                          <td className="py-1.5 px-2 text-right font-black text-white">
                            {bAct.toLocaleString()}
                          </td>
                          <td className="py-1.5 px-2 font-black text-amber-300 bg-slate-800">
                            {bUph} UPH
                          </td>
                          <td className="py-1.5 px-2 text-right font-black text-emerald-300">
                            {totAct.toLocaleString()}
                          </td>
                          <td className="py-1.5 px-2 font-black text-emerald-300 bg-emerald-950">
                            {plantUph} UPH
                          </td>
                        </tr>
                      </tfoot>
                    );
                  })()}
                </table>
              </div>
            </div>
          )}

          {/* Action Items */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-blue-600" />
                <span>
                  {t(
                    'แผนปฏิบัติการและมาตรการแก้ไข (Action Items & Countermeasures)',
                    'Action Items & Countermeasures',
                    '改善行动计划与对策追踪'
                  )}
                </span>
              </h3>

              <button
                type="button"
                onClick={() => setShowAddActionForm(!showAddActionForm)}
                className="text-xs font-medium text-blue-700 hover:text-blue-900 inline-flex items-center gap-1 print:hidden cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('เพิ่มมาตรการใหม่', 'Add Action Item', '新增改善项')}</span>
              </button>
            </div>

            {showAddActionForm && (
              <form
                onSubmit={handleAddAction}
                className="bg-blue-50/70 p-3.5 rounded border border-blue-200 mb-3 text-xs print:hidden"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-0.5">
                      {t('หัวข้อปัญหา / อาการ:', 'Issue:', '问题描述:')}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={t(
                        'เช่น มอเตอร์สายพานขัดข้อง',
                        'e.g. Conveyor motor fault',
                        '例如 传送带电机故障'
                      )}
                      value={newIssue}
                      onChange={e => setNewIssue(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-0.5">
                      {t('สาเหตุรากเหง้า (Root Cause):', 'Root Cause:', '根本原因:')}
                    </label>
                    <input
                      type="text"
                      placeholder={t(
                        'เช่น ขาดการตรวจสภาพตามรอบ PM',
                        'e.g. Missed PM inspection cycle',
                        '例如 未按点检周期保养'
                      )}
                      value={newRootCause}
                      onChange={e => setNewRootCause(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-0.5">
                      {t('มาตรการแก้ไข / แผนงาน:', 'Countermeasure:', '改善对策:')}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={t(
                        'เช่น ซ่อมเปลี่ยนลูกปืนและทำ checklist',
                        'e.g. Replace bearing & enforce PM checklist',
                        '例如 更换轴承并落实点检清单'
                      )}
                      value={newAction}
                      onChange={e => setNewAction(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-0.5">
                      {t('ผู้รับผิดชอบ:', 'Owner:', '负责人:')}
                    </label>
                    <input
                      type="text"
                      placeholder={t('เช่น วิศวกรซ่อมบำรุง', 'e.g. Maintenance Eng', '例如 设备维护工程师')}
                      value={newOwner}
                      onChange={e => setNewOwner(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-0.5">
                      {t('กำหนดเสร็จ:', 'Due Date:', '完成期限:')}
                    </label>
                    <input
                      type="date"
                      value={newDueDate}
                      onChange={e => setNewDueDate(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-slate-800"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium shadow-xs cursor-pointer"
                  >
                    {t('บันทึกมาตรการ', 'Save Action', '保存对策')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddActionForm(false)}
                    className="px-2.5 py-1 text-slate-600 hover:text-slate-800 cursor-pointer"
                  >
                    {t('ยกเลิก', 'Cancel', '取消')}
                  </button>
                </div>
              </form>
            )}

            <div className="overflow-x-auto border border-slate-300 rounded">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-200 text-slate-800 font-bold border-b border-slate-300">
                  <tr>
                    <th className="py-2 px-3">{t('หัวข้อปัญหา (Issue)', 'Issue', '问题点')}</th>
                    <th className="py-2 px-3">
                      {t('สาเหตุรากเหง้า (Root Cause)', 'Root Cause', '根本原因')}
                    </th>
                    <th className="py-2 px-3">
                      {t('มาตรการแก้ไข (Countermeasure)', 'Countermeasure', '改善措施')}
                    </th>
                    <th className="py-2 px-3 min-w-[130px]">
                      {t('ผู้รับผิดชอบ', 'Owner', '负责人')}
                    </th>
                    <th className="py-2 px-2.5 text-center min-w-[90px]">
                      {t('กำหนดเสร็จ', 'Due Date', '截止日')}
                    </th>
                    <th className="py-2 px-2.5 text-center min-w-[100px]">
                      {t('สถานะ', 'Status', '状态')}
                    </th>
                    <th className="py-2 px-2 text-center w-8 print:hidden" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800">
                  {actionItems.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{item.issue}</td>
                      <td className="py-2.5 px-3 text-slate-600">{item.rootCause}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-800">{item.action}</td>
                      <td className="py-2.5 px-3 text-slate-700">{item.owner}</td>
                      <td className="py-2.5 px-2.5 text-center text-slate-600 font-mono text-[11px]">
                        {item.dueDate}
                      </td>
                      <td className="py-2.5 px-2.5 text-center">
                        <select
                          value={item.status}
                          onChange={e =>
                            handleStatusChange(item.id, e.target.value as ActionItem['status'])
                          }
                          className={`text-[11px] font-semibold rounded px-2 py-0.5 border cursor-pointer ${
                            item.status === 'Resolved'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : item.status === 'In Progress'
                              ? 'bg-amber-50 text-amber-700 border-amber-300'
                              : 'bg-rose-50 text-rose-700 border-rose-300'
                          }`}
                        >
                          <option value="Open">Open</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Resolved">Resolved</option>
                        </select>
                      </td>
                      <td className="py-2.5 px-2 text-center print:hidden">
                        <button
                          onClick={() => handleDeleteAction(item.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                          title={t('ลบรายการ', 'Delete item', '删除项')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {actionItems.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-4 text-center text-slate-400">
                        {t('ยังไม่มีรายการมาตรการแก้ไข', 'No action items recorded', '暂无改善追踪项')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Plant Manager Directives */}
          <div className="border border-slate-300 rounded p-4 bg-slate-50/50 mb-4">
            <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-700" />
              <span>
                {t(
                  'ข้อสั่งการและข้อคิดเห็นเพิ่มเติมของผู้จัดการโรงงาน (Factory Manager Directives & Signature):',
                  'Factory Manager Directives & Signature:',
                  '厂长指示意见与签核 (Manager Directives):'
                )}
              </span>
            </label>
            <textarea
              rows={3}
              value={managerRemarks}
              onChange={e => setManagerRemarks(e.target.value)}
              placeholder={t(
                'พิมพ์ข้อสั่งการ ทิศทางการผลิต หรือบันทึกการประชุม...',
                'Enter manager directives or review meeting notes...',
                '输入厂长指示或生产会议纪要...'
              )}
              className="w-full bg-white border border-slate-300 rounded p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />

            <div className="mt-4 pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
              <div className="text-[11px] text-slate-500">
                <p>
                  {t(
                    'รายงานนี้สร้างขึ้นผ่านระบบ Production & Efficiency OEC Dashboard',
                    'Generated via Production & Efficiency OEC Dashboard',
                    '本报告由生产&效率日清（OEC）看板系统生成'
                  )}
                </p>
                <p>
                  {t(
                    'ข้อมูลได้รับการซิงค์และยืนยันโดยฝ่ายวางแผนการผลิต (Production Planning Department)',
                    'Verified and synced by Production Planning Department',
                    '数据已由生产计划部门审核并同步'
                  )}
                </p>
              </div>

              <div className="text-center sm:text-right">
                <div className="w-48 border-b border-slate-400 mx-auto sm:ml-auto pb-1 mb-1 text-xs text-slate-400 font-serif italic">
                  {t('ลงนาม / Signature', 'Signature', '签字确认')}
                </div>
                <div className="text-xs font-bold text-slate-800">
                  {t('ผู้จัดการโรงงาน (Plant Manager)', 'Plant Manager', '厂长 (Plant Manager)')}
                </div>
                <div className="text-[10px] text-slate-500">HTC Refrigerator Thailand</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
