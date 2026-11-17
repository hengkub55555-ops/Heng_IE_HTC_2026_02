import React, { useState } from 'react';
import { X, Plus, Building2, Layers } from 'lucide-react';
import { LineOECData, DayColumn } from '../types/oec';
import { useAppPreferences } from '../contexts/AppPreferencesContext';

interface AddLineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddLine: (newLine: LineOECData) => void;
  days: DayColumn[];
  existingPlants: string[];
}

export const AddLineModal: React.FC<AddLineModalProps> = ({
  isOpen,
  onClose,
  onAddLine,
  days,
  existingPlants,
}) => {
  const { t } = useAppPreferences();
  const [plant, setPlant] = useState(existingPlants[0] || 'HTC Ref(泰国冰箱)');
  const [customPlant, setCustomPlant] = useState('');
  const [isCustomPlant, setIsCustomPlant] = useState(false);
  const [prodLine, setProdLine] = useState('Line C');
  const [defaultWorkTime, setDefaultWorkTime] = useState(21);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalPlant = isCustomPlant ? customPlant.trim() : plant;
    if (!finalPlant || !prodLine.trim()) return;

    const initialPlanning: { [d: number]: number | null } = {};
    const initialAct: { [d: number]: number | null } = {};
    const initialWorkTime: { [d: number]: number | null } = {};

    days.forEach(d => {
      initialPlanning[d.day] = null;
      initialAct[d.day] = null;
      initialWorkTime[d.day] = defaultWorkTime;
    });

    const newLine: LineOECData = {
      id: `line-${Date.now()}`,
      plant: finalPlant,
      prodLine: prodLine.trim(),
      planning: initialPlanning,
      act: initialAct,
      workTime: initialWorkTime,
    };

    onAddLine(newLine);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-[#0070c0] text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-blue-200" />
            <h3 className="font-bold text-base">
              {t(
                'เพิ่มสายการผลิต / โรงงานใหม่',
                'Add Production Line / Plant',
                '新增产线 / 工厂'
              )}
            </h3>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 text-xs">
          <div className="mb-4">
            <label className="block text-slate-700 font-semibold mb-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              <span>{t('ชื่อโรงงาน (Plant):', 'Plant Name:', '工厂名称 (Plant):')}</span>
            </label>
            {!isCustomPlant ? (
              <div className="space-y-1.5">
                <select
                  value={plant}
                  onChange={e => setPlant(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-slate-800 font-medium"
                >
                  {existingPlants.map(p => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setIsCustomPlant(true)}
                  className="text-blue-600 hover:text-blue-800 text-[11px] underline cursor-pointer"
                >
                  {t('+ กรอกชื่อโรงงานใหม่', '+ Enter new plant name', '+ 输入新工厂名称')}
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                <input
                  type="text"
                  required
                  placeholder={t(
                    'เช่น HTC Washing Machine, HTC AC',
                    'e.g. HTC Washing Machine, HTC AC',
                    '例如 HTC 洗衣机工厂, HTC 空调'
                  )}
                  value={customPlant}
                  onChange={e => setCustomPlant(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-slate-800"
                />
                <button
                  type="button"
                  onClick={() => setIsCustomPlant(false)}
                  className="text-slate-500 hover:text-slate-700 text-[11px] underline cursor-pointer"
                >
                  {t(
                    'เลือกจากโรงงานที่มีอยู่เดิม',
                    'Select from existing plants',
                    '从现有工厂列表中选择'
                  )}
                </button>
              </div>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-slate-700 font-semibold mb-1 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>{t('ชื่อสายการผลิต (Prod.line):', 'Prod.line Name:', '产线名称 (Prod.line):')}</span>
            </label>
            <input
              type="text"
              required
              placeholder={t(
                'เช่น Line C, Line D, Sub-Assembly',
                'e.g. Line C, Line D, Sub-Assembly',
                '例如 Line C, Line D, 部装线'
              )}
              value={prodLine}
              onChange={e => setProdLine(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-slate-800 font-medium"
            />
          </div>

          <div className="mb-5">
            <label className="block text-slate-700 font-semibold mb-1">
              {t(
                'ชั่วโมงทำงานเริ่มต้นต่อวัน (Work Time Hours):',
                'Default Work Time Hours / Day:',
                '默认每日工作时长 (小时):'
              )}
            </label>
            <input
              type="number"
              min="1"
              max="48"
              value={defaultWorkTime}
              onChange={e => setDefaultWorkTime(Number(e.target.value))}
              className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-slate-800"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              {t(
                'สามารถแก้ไขรายวันภายหลังได้ในตาราง',
                'Daily hours can be adjusted later in the matrix',
                '后续可在表格中按天修改'
              )}
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
            >
              {t('ยกเลิก', 'Cancel', '取消')}
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-[#0070c0] hover:bg-[#005ba3] text-white font-semibold rounded shadow-xs cursor-pointer"
            >
              {t('เพิ่มสายการผลิต', 'Add Production Line', '确认新增产线')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
