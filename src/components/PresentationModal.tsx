import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingDown, 
  TrendingUp, 
  Plus, 
  Trash2, 
  Target, 
  Clock, 
  UserCheck, 
  FileText,
  Building,
  Calendar,
  Share2
} from 'lucide-react';
import { LineOECData, DayColumn, ActionItem, MonthlyEfficiencyRow } from '../types/oec';

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

  const [managerRemarks, setManagerRemarks] = useState<string>(
    '1. ให้ฝ่ายซ่อมบำรุงเร่งสรุปรายงานสาเหตุเครื่องจักรหลักขัดข้องในวันที่ 1, 4, 8 พร้อมมาตรการป้องกันระยะยาว\n2. มอบหมายฝ่าย IE ปรับสมดุลสายการผลิต (Line Balancing) ของ Line B ให้ UPH ไม่ต่ำกว่า 110 ภายในสัปดาห์หน้า\n3. ขอให้ทุกหน่วยงานเข้มงวดการจัดทำ OEC ประจำวันเพื่อตรวจจับปัญหาได้ทันทีในกะ'
  );

  const [newIssue, setNewIssue] = useState('');
  const [newRootCause, setNewRootCause] = useState('');
  const [newAction, setNewAction] = useState('');
  const [newOwner, setNewOwner] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [showAddActionForm, setShowAddActionForm] = useState(false);

  if (!isOpen) return null;

  // Calculate highest negative gap days
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
      rootCause: newRootCause || 'อยู่ระหว่างวิเคราะห์ 5-Why',
      action: newAction,
      owner: newOwner || 'ผู้รับผิดชอบงาน',
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
        
        {/* Top Control Bar (Hidden when printed) */}
        <div className="bg-slate-900 text-white px-6 py-3 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <span className="bg-emerald-500 text-slate-950 font-bold text-[11px] px-2 py-0.5 rounded uppercase">
              Executive Mode
            </span>
            <h2 className="font-bold text-base sm:text-lg">รายงานนำเสนอผู้จัดการโรงงาน (Plant Manager Report)</h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>พิมพ์รายงาน / บันทึก PDF</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded transition-colors"
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
                  รายงานสรุปผลการผลิตรายวัน การวิเคราะห์ประสิทธิภาพ UPH และมาตรการแก้ไขปัญหาสำหรับผู้จัดการโรงงาน
                </p>
              </div>

              <div className="text-left sm:text-right bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded border sm:border-0 border-slate-200">
                <div className="text-xs font-semibold text-slate-700">
                  ประจำงวด: {year} - {month === 'All' ? 'YTD สะสม' : month}
                </div>
                <div className="text-[11px] text-slate-500">
                  วันที่จัดทำ: {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
                <div className="text-[11px] font-semibold text-emerald-700">
                  สถานะ: พร้อมประชุม OEC Morning Review
                </div>
              </div>
            </div>
          </div>

          {/* Executive KPI Overview Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-slate-50 p-3.5 rounded border border-slate-200">
              <span className="text-xs font-semibold text-slate-500">เป้าหมาย (Planning)</span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {totalPlanning.toLocaleString()} <span className="text-xs font-normal text-slate-500">ตัว</span>
              </div>
              <div className="text-[11px] text-slate-600 mt-0.5">เป้าสะสมประจำงวด</div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded border border-slate-200">
              <span className="text-xs font-semibold text-slate-500">ผลิตได้จริง (Actual)</span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {totalActual.toLocaleString()} <span className="text-xs font-normal text-slate-500">ตัว</span>
              </div>
              <div className="text-[11px] font-semibold text-blue-700 mt-0.5">
                บรรลุ {achievementRate.toFixed(1)}% ของเป้า
              </div>
            </div>

            <div className={`p-3.5 rounded border ${
              totalGap < 0 ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'
            }`}>
              <span className="text-xs font-semibold text-slate-600">ผลต่าง (Net Gap)</span>
              <div className={`text-2xl font-black mt-1 ${
                totalGap < 0 ? 'text-rose-700' : 'text-emerald-700'
              }`}>
                {totalGap > 0 ? `+${totalGap.toLocaleString()}` : totalGap.toLocaleString()}{' '}
                <span className="text-xs font-normal text-slate-600">ตัว</span>
              </div>
              <div className={`text-[11px] font-semibold ${totalGap < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {totalGap < 0 ? `ขาดเป้าหมาย ${Math.abs(totalGap).toLocaleString()} ชิ้น` : 'ยอดผลิตเกินเป้าหมาย'}
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded border border-slate-200">
              <span className="text-xs font-semibold text-slate-500">ประสิทธิภาพเฉลี่ย (UPH)</span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {overallUph} <span className="text-xs font-normal text-slate-500">ตัว/ชม.</span>
              </div>
              <div className="text-[11px] text-slate-600 mt-0.5">เป้าหมายมาตรฐาน: 110 UPH</div>
            </div>
          </div>

          {/* Section: Automated Root Cause & Highlights Analysis */}
          <div className="mb-6 bg-slate-50 rounded border border-slate-200 p-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>การวิเคราะห์ผลการดำเนินงานและจุดคอขวด (OEC Bottleneck Diagnosis)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-700">
              <div className="bg-white p-3 rounded border border-slate-200">
                <span className="font-semibold text-slate-900 block mb-1">
                  1. วันที่พบปัญหายอดผลิตขาดเป้าหมายสูงสุด (Top 3 Loss Days):
                </span>
                <ul className="space-y-1.5 pl-2">
                  {topLossDays.map((d, i) => (
                    <li key={d.day} className="flex items-center justify-between text-rose-700">
                      <span>• วันที่ {d.day} ({d.weekday})</span>
                      <span className="font-bold font-mono">{d.gap.toLocaleString()} ชิ้น</span>
                    </li>
                  ))}
                  {topLossDays.length === 0 && (
                    <li className="text-emerald-700">ยอดผลิตเป็นไปตามเป้าหมาย ไม่มีวันที่ขาดทุนร้ายแรง</li>
                  )}
                </ul>
              </div>

              <div className="bg-white p-3 rounded border border-slate-200">
                <span className="font-semibold text-slate-900 block mb-1">
                  2. ข้อสังเกตความแตกต่างรายสายการผลิต:
                </span>
                <ul className="space-y-1 pl-2">
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
                        <span>• {line.prodLine}: บรรลุ {pct}%</span>
                        <span className={`font-semibold ${diff < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          Gap: {diff > 0 ? `+${diff.toLocaleString()}` : diff.toLocaleString()}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>

          {/* Section: YTD Summary Efficiency Snapshot */}
          {monthlyEfficiency && monthlyEfficiency.length > 0 && (
            <div className="mb-6 bg-white rounded border border-slate-300 overflow-hidden">
              <div className="bg-slate-100 px-3.5 py-2 border-b border-slate-300 flex items-center justify-between">
                <span className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-blue-600" />
                  <span>สรุปประสิทธิภาพสะสม YTD รายเดือน (Line A & Line B Summary Efficiency)</span>
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  Actual YTD & Average Performance
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] text-left border-collapse">
                  <thead className="bg-slate-200 text-slate-800 font-bold border-b border-slate-300 text-center">
                    <tr className="divide-x divide-slate-300">
                      <th className="py-1.5 px-2">Month</th>
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
                        <tr key={m.month} className="divide-x divide-slate-200 text-center hover:bg-slate-50">
                          <td className="py-1 px-2 font-semibold bg-slate-50">{m.month}</td>
                          <td className="py-1 px-2 text-right">{m.lineAPlan.toLocaleString()}</td>
                          <td className="py-1 px-2 text-right font-bold">{m.lineAAct.toLocaleString()}</td>
                          <td className="py-1 px-2 font-extrabold text-sky-700 bg-sky-50/50">{m.lineAUph}</td>
                          <td className="py-1 px-2 text-right">{m.lineBPlan.toLocaleString()}</td>
                          <td className="py-1 px-2 text-right font-bold">{m.lineBAct.toLocaleString()}</td>
                          <td className="py-1 px-2 font-extrabold text-blue-800 bg-blue-50/50">{m.lineBUph}</td>
                          <td className="py-1 px-2 text-right font-black text-slate-900 bg-emerald-50/30">{totAct.toLocaleString()}</td>
                          <td className="py-1 px-2 font-extrabold text-emerald-800 bg-emerald-100/50">{plantUph}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {/* YTD Summary Footer */}
                  {(() => {
                    let aPlan = 0, aAct = 0, aHrs = 0;
                    let bPlan = 0, bAct = 0, bHrs = 0;
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
                          <td className="py-1.5 px-2 text-right text-sky-200">{aPlan.toLocaleString()}</td>
                          <td className="py-1.5 px-2 text-right font-black text-white">{aAct.toLocaleString()}</td>
                          <td className="py-1.5 px-2 font-black text-sky-300 bg-slate-800">{aUph} UPH</td>
                          <td className="py-1.5 px-2 text-right text-blue-200">{bPlan.toLocaleString()}</td>
                          <td className="py-1.5 px-2 text-right font-black text-white">{bAct.toLocaleString()}</td>
                          <td className="py-1.5 px-2 font-black text-amber-300 bg-slate-800">{bUph} UPH</td>
                          <td className="py-1.5 px-2 text-right font-black text-emerald-300">{totAct.toLocaleString()}</td>
                          <td className="py-1.5 px-2 font-black text-emerald-300 bg-emerald-950">{plantUph} UPH</td>
                        </tr>
                      </tfoot>
                    );
                  })()}
                </table>
              </div>
            </div>
          )}

          {/* Section: Action Items & Follow-up Matrix */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-blue-600" />
                <span>แผนปฏิบัติการและมาตรการแก้ไข (Action Items & Countermeasures)</span>
              </h3>

              <button
                type="button"
                onClick={() => setShowAddActionForm(!showAddActionForm)}
                className="text-xs font-medium text-blue-700 hover:text-blue-900 inline-flex items-center gap-1 print:hidden"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>เพิ่มมาตรการใหม่</span>
              </button>
            </div>

            {/* Quick Add Action Form */}
            {showAddActionForm && (
              <form onSubmit={handleAddAction} className="bg-blue-50/70 p-3.5 rounded border border-blue-200 mb-3 text-xs print:hidden">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-0.5">หัวข้อปัญหา / อาการ:</label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น มอเตอร์สายพานขัดข้อง"
                      value={newIssue}
                      onChange={e => setNewIssue(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-0.5">สาเหตุรากเหง้า (Root Cause):</label>
                    <input
                      type="text"
                      placeholder="เช่น ขาดการตรวจสภาพตามรอบ PM"
                      value={newRootCause}
                      onChange={e => setNewRootCause(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-0.5">มาตรการแก้ไข / แผนงาน:</label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น ซ่อมเปลี่ยนลูกปืนและทำ checklist"
                      value={newAction}
                      onChange={e => setNewAction(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-0.5">ผู้รับผิดชอบ:</label>
                    <input
                      type="text"
                      placeholder="เช่น วิศวกรซ่อมบำรุง"
                      value={newOwner}
                      onChange={e => setNewOwner(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-0.5">กำหนดเสร็จ:</label>
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
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium shadow-xs"
                  >
                    บันทึกมาตรการ
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddActionForm(false)}
                    className="px-2.5 py-1 text-slate-600 hover:text-slate-800"
                  >
                    ยกเลิก
                  </button>
                </div>
              </form>
            )}

            {/* Action Items Table */}
            <div className="overflow-x-auto border border-slate-300 rounded">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-200 text-slate-800 font-bold border-b border-slate-300">
                  <tr>
                    <th className="py-2 px-3">หัวข้อปัญหา (Issue)</th>
                    <th className="py-2 px-3">สาเหตุรากเหง้า (Root Cause)</th>
                    <th className="py-2 px-3">มาตรการแก้ไข (Countermeasure)</th>
                    <th className="py-2 px-3 min-w-[130px]">ผู้รับผิดชอบ</th>
                    <th className="py-2 px-2.5 text-center min-w-[90px]">กำหนดเสร็จ</th>
                    <th className="py-2 px-2.5 text-center min-w-[100px]">สถานะ</th>
                    <th className="py-2 px-2 text-center w-8 print:hidden"></th>
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
                          onChange={e => handleStatusChange(item.id, e.target.value as ActionItem['status'])}
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
                          className="text-slate-400 hover:text-rose-600 p-1"
                          title="ลบรายการ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {actionItems.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-4 text-center text-slate-400">
                        ยังไม่มีรายการมาตรการแก้ไข
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section: Plant Manager Directives & Sign-off */}
          <div className="border border-slate-300 rounded p-4 bg-slate-50/50 mb-4">
            <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-700" />
              <span>ข้อสั่งการและข้อคิดเห็นเพิ่มเติมของผู้จัดการโรงงาน (Factory Manager Directives & Signature):</span>
            </label>
            <textarea
              rows={3}
              value={managerRemarks}
              onChange={e => setManagerRemarks(e.target.value)}
              placeholder="พิมพ์ข้อสั่งการ ทิศทางการผลิต หรือบันทึกการประชุมสำหรับส่งต่อหัวหน้าแผนก..."
              className="w-full bg-white border border-slate-300 rounded p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />

            <div className="mt-4 pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
              <div className="text-[11px] text-slate-500">
                <p>รายงานนี้สร้างขึ้นผ่านระบบ Production & Efficiency OEC Dashboard</p>
                <p>ข้อมูลได้รับการซิงค์และยืนยันโดยฝ่ายวางแผนการผลิต (Production Planning Department)</p>
              </div>

              <div className="text-center sm:text-right">
                <div className="w-48 border-b border-slate-400 mx-auto sm:ml-auto pb-1 mb-1 text-xs text-slate-400 font-serif italic">
                  ลงนาม / Signature
                </div>
                <div className="text-xs font-bold text-slate-800">ผู้จัดการโรงงาน (Plant Manager)</div>
                <div className="text-[10px] text-slate-500">HTC Refrigerator Thailand</div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
