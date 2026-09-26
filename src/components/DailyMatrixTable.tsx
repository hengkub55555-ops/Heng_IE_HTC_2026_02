import React, { useState } from 'react';
import { DayColumn, LineOECData, CategoryType } from '../types/oec';
import { Plus, Trash2, Edit2, Check, X, ArrowUpDown, Clock, Target, Zap } from 'lucide-react';

interface DailyMatrixTableProps {
  days: DayColumn[];
  lines: LineOECData[];
  onUpdateCellValue: (lineId: string, category: 'planning' | 'act' | 'workTime', day: number, value: number | null) => void;
  onAddDay: (day: number, weekday: string) => void;
  onDeleteLine: (lineId: string) => void;
  isEditMode: boolean;
}

export const DailyMatrixTable: React.FC<DailyMatrixTableProps> = ({
  days,
  lines,
  onUpdateCellValue,
  onAddDay,
  onDeleteLine,
  isEditMode,
}) => {
  const [editingCell, setEditingCell] = useState<{
    lineId: string;
    category: 'planning' | 'act' | 'workTime';
    day: number;
    val: string;
  } | null>(null);

  const [newDayNum, setNewDayNum] = useState<number>(26);
  const [newDayWeekday, setNewDayWeekday] = useState<string>('SAT');
  const [showAddDayForm, setShowAddDayForm] = useState<boolean>(false);

  const handleStartEdit = (lineId: string, category: 'planning' | 'act' | 'workTime', day: number, currentVal: number | null | undefined) => {
    setEditingCell({
      lineId,
      category,
      day,
      val: currentVal !== null && currentVal !== undefined ? String(currentVal) : '',
    });
  };

  const handleSaveEdit = () => {
    if (!editingCell) return;
    const num = editingCell.val.trim() === '' ? null : Number(editingCell.val);
    onUpdateCellValue(editingCell.lineId, editingCell.category, editingCell.day, isNaN(num as number) ? null : num);
    setEditingCell(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  // Group lines by plant for rowspan rendering
  const plantGroups: { [plant: string]: LineOECData[] } = {};
  lines.forEach(l => {
    if (!plantGroups[l.plant]) plantGroups[l.plant] = [];
    plantGroups[l.plant].push(l);
  });

  return (
    <div className="bg-white rounded-md border border-slate-300 shadow-sm overflow-hidden mb-6">
      {/* Table Toolbar */}
      <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-300 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700 tracking-wide uppercase">
            ตารางบันทึกข้อมูลรายวัน (Daily Production & Efficiency Matrix)
          </span>
          <span className="text-[11px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
            {lines.length} สายการผลิต · {days.length} วันทำการ
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setShowAddDayForm(!showAddDayForm)}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-blue-600" />
            <span>เพิ่มคอลัมน์วัน</span>
          </button>
        </div>
      </div>

      {/* Add Day Column Quick Form */}
      {showAddDayForm && (
        <div className="bg-blue-50/70 border-b border-blue-200 p-3 flex flex-wrap items-center gap-3 text-xs">
          <span className="font-semibold text-blue-900">เพิ่มวันในตาราง:</span>
          <div className="flex items-center gap-1.5">
            <label className="text-slate-600">วันที่:</label>
            <input
              type="number"
              min="1"
              max="31"
              value={newDayNum}
              onChange={e => setNewDayNum(Number(e.target.value))}
              className="w-16 bg-white border border-slate-300 rounded px-2 py-1 text-slate-800"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-slate-600">วันในสัปดาห์:</label>
            <select
              value={newDayWeekday}
              onChange={e => setNewDayWeekday(e.target.value)}
              className="bg-white border border-slate-300 rounded px-2 py-1 text-slate-800"
            >
              <option value="MON">MON (จันทร์)</option>
              <option value="TUE">TUE (อังคาร)</option>
              <option value="WEN">WEN (พุธ)</option>
              <option value="THU">THU (พฤหัส)</option>
              <option value="FRI">FRI (ศุกร์)</option>
              <option value="SAT">SAT (เสาร์)</option>
              <option value="SUN">SUN (อาทิตย์)</option>
            </select>
          </div>
          <button
            onClick={() => {
              onAddDay(newDayNum, newDayWeekday);
              setNewDayNum(newDayNum + 1);
              setShowAddDayForm(false);
            }}
            className="px-3 py-1 bg-[#0070c0] hover:bg-[#005ba3] text-white rounded font-medium shadow-xs"
          >
            ยืนยันเพิ่มวัน
          </button>
          <button
            onClick={() => setShowAddDayForm(false)}
            className="px-2.5 py-1 text-slate-600 hover:text-slate-800"
          >
            ยกเลิก
          </button>
        </div>
      )}

      {/* Scrollable Matrix Table */}
      <div className="overflow-x-auto max-h-[700px]">
        <table className="w-full text-xs text-left border-collapse border border-slate-300 min-w-[1250px]">
          {/* Header Row exactly matching screenshot */}
          <thead className="bg-[#cbd5e1] text-slate-900 font-bold sticky top-0 z-20 shadow-xs">
            <tr className="border-b border-slate-400 divide-x divide-slate-300">
              <th className="py-2 px-3 text-center min-w-[130px] font-bold">Plant</th>
              <th className="py-2 px-2.5 text-center min-w-[85px] font-bold">Prod.line</th>
              <th className="py-2 px-2 text-center min-w-[85px] font-bold">Category</th>
              {days.map(d => (
                <th key={d.day} className="py-1 px-1.5 text-center min-w-[42px] max-w-[55px] font-bold leading-tight">
                  <div className="text-[12px]">{d.day}</div>
                  <div className="text-[10px] text-slate-700 font-semibold">{d.weekday}</div>
                </th>
              ))}
              <th className="py-2 px-3 text-center min-w-[80px] bg-slate-300 font-bold">
                Total / Avg
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 text-slate-800">
            {Object.entries(plantGroups).map(([plantName, plantLines]) => {
              return plantLines.map((line, lineIndex) => {
                // Calculate line totals
                let sumPlan = 0;
                let sumAct = 0;
                let sumWorkTime = 0;

                days.forEach(d => {
                  const p = line.planning[d.day];
                  const a = line.act[d.day];
                  const wt = line.workTime[d.day];

                  if (p !== null && p !== undefined) sumPlan += Number(p);
                  if (a !== null && a !== undefined) sumAct += Number(a);
                  if (wt !== null && wt !== undefined) sumWorkTime += Number(wt);
                });

                const netGap = sumAct - sumPlan;
                const avgUph = sumWorkTime > 0 ? Math.round(sumAct / sumWorkTime) : 0;

                // 5 categories per production line
                const categories: {
                  type: CategoryType;
                  key: 'planning' | 'act' | 'gap' | 'workTime' | 'uph';
                  isEditable: boolean;
                  totalVal: number | string;
                }[] = [
                  { type: 'Planning', key: 'planning', isEditable: true, totalVal: sumPlan.toLocaleString() },
                  { type: 'Act', key: 'act', isEditable: true, totalVal: sumAct.toLocaleString() },
                  { type: 'Gap', key: 'gap', isEditable: false, totalVal: netGap > 0 ? `+${netGap.toLocaleString()}` : netGap.toLocaleString() },
                  { type: 'Work Time', key: 'workTime', isEditable: true, totalVal: `${sumWorkTime} h` },
                  { type: 'UPH', key: 'uph', isEditable: false, totalVal: avgUph.toLocaleString() },
                ];

                return categories.map((cat, catIdx) => {
                  const isFirstRowOfLine = catIdx === 0;
                  const isFirstRowOfPlant = lineIndex === 0 && isFirstRowOfLine;
                  const plantTotalRows = plantLines.length * 5;

                  return (
                    <tr
                      key={`${line.id}-${cat.type}`}
                      className={`hover:bg-slate-50/80 transition-colors divide-x divide-slate-200 ${
                        cat.type === 'UPH' ? 'border-b-2 border-slate-300' : 'border-b border-slate-200'
                      }`}
                    >
                      {/* Plant Cell (Rowspan for all lines in plant) */}
                      {isFirstRowOfPlant && (
                        <td
                          rowSpan={plantTotalRows}
                          className="py-3 px-3 font-bold text-slate-800 align-middle bg-slate-50/50 text-center border-r border-slate-300 whitespace-nowrap"
                        >
                          <div className="font-extrabold text-[13px]">{plantName}</div>
                          <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                            {plantLines.length} Lines Active
                          </div>
                        </td>
                      )}

                      {/* Prod.line Cell (Rowspan 5 for this line) */}
                      {isFirstRowOfLine && (
                        <td
                          rowSpan={5}
                          className="py-2 px-2.5 font-bold text-slate-900 align-middle text-center bg-white border-r border-slate-300"
                        >
                          <div className="font-bold text-[12px]">{line.prodLine}</div>
                          {lines.length > 1 && (
                            <button
                              onClick={() => onDeleteLine(line.id)}
                              className="mt-1 text-[10px] text-rose-500 hover:text-rose-700 underline opacity-0 hover:opacity-100 transition-opacity"
                              title="ลบสายการผลิตนี้"
                            >
                              ลบ Line
                            </button>
                          )}
                        </td>
                      )}

                      {/* Category Cell */}
                      <td className={`py-1.5 px-2 font-semibold text-[11px] text-slate-700 whitespace-nowrap ${
                        cat.type === 'Gap' ? 'bg-amber-50/30' : cat.type === 'UPH' ? 'bg-blue-50/20' : 'bg-white'
                      }`}>
                        {cat.type}
                      </td>

                      {/* Days Data Columns */}
                      {days.map(d => {
                        let cellVal: number | null | undefined = null;
                        let isCalculated = false;
                        let isNegative = false;

                        if (cat.key === 'planning') {
                          cellVal = line.planning[d.day];
                        } else if (cat.key === 'act') {
                          cellVal = line.act[d.day];
                        } else if (cat.key === 'workTime') {
                          cellVal = line.workTime[d.day];
                        } else if (cat.key === 'gap') {
                          isCalculated = true;
                          const p = line.planning[d.day];
                          const a = line.act[d.day];
                          if (a !== null && a !== undefined) {
                            cellVal = Number(a) - Number(p || 0);
                            isNegative = cellVal < 0;
                          }
                        } else if (cat.key === 'uph') {
                          isCalculated = true;
                          const a = line.act[d.day];
                          const wt = line.workTime[d.day];
                          if (a !== null && a !== undefined && wt && wt > 0) {
                            cellVal = Math.round(Number(a) / Number(wt));
                          }
                        }

                        const isCurrentlyEditing =
                          editingCell?.lineId === line.id &&
                          editingCell?.category === cat.key &&
                          editingCell?.day === d.day;

                        return (
                          <td
                            key={d.day}
                            onClick={() => {
                              if (cat.isEditable) {
                                handleStartEdit(line.id, cat.key as 'planning' | 'act' | 'workTime', d.day, cellVal);
                              }
                            }}
                            className={`py-1 px-1 text-center font-medium transition-colors text-[11px] select-none ${
                              cat.isEditable ? 'cursor-pointer hover:bg-blue-50/80' : 'bg-slate-50/40'
                            } ${
                              isNegative ? 'text-rose-600 font-semibold bg-rose-50/40' : ''
                            } ${
                              isCurrentlyEditing ? 'p-0 bg-blue-100 ring-2 ring-blue-500 z-10' : ''
                            }`}
                          >
                            {isCurrentlyEditing ? (
                              <input
                                autoFocus
                                type="number"
                                value={editingCell.val}
                                onChange={e => setEditingCell({ ...editingCell, val: e.target.value })}
                                onBlur={handleSaveEdit}
                                onKeyDown={handleKeyDown}
                                className="w-full h-full text-center bg-white border-none outline-none font-semibold text-slate-900 py-1"
                              />
                            ) : (
                              <span>
                                {cellVal !== null && cellVal !== undefined
                                  ? Number(cellVal).toLocaleString()
                                  : ''}
                              </span>
                            )}
                          </td>
                        );
                      })}

                      {/* Summary / Total Column */}
                      <td className={`py-1.5 px-2 text-center font-bold text-[11px] bg-slate-100 ${
                        cat.type === 'Gap' && netGap < 0 ? 'text-rose-600' : 'text-slate-800'
                      }`}>
                        {cat.totalVal}
                      </td>
                    </tr>
                  );
                });
              });
            })}
          </tbody>
        </table>
      </div>

      {/* Footer Notes for Factory Manager */}
      <div className="bg-slate-50 px-4 py-2 text-[11px] text-slate-500 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
            <span>Gap ติดลบ = ต่ำกว่าเป้าหมายที่วางไว้</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
            <span>UPH คำนวณอัตโนมัติ = ยอดผลิตจริง (Act) ÷ ชั่วโมงทำงาน (Work Time)</span>
          </span>
        </div>
        <span className="text-slate-400 font-medium">
          💡 คลิกที่ช่อง Planning, Act, หรือ Work Time เพื่อแก้ไขตัวเลขโดยตรง ระบบจะคำนวณ Gap และ UPH ให้ทันที
        </span>
      </div>
    </div>
  );
};
