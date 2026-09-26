import React from 'react';
import { TrendingDown, TrendingUp, Target, Clock, Zap, AlertTriangle, CheckCircle } from 'lucide-react';

interface KpiCardsProps {
  totalPlanning: number;
  totalActual: number;
  totalGap: number;
  overallUph: number;
  achievementRate: number;
  totalWorkHours: number;
  onCardClick?: (metric: string) => void;
}

export const KpiCards: React.FC<KpiCardsProps> = ({
  totalPlanning,
  totalActual,
  totalGap,
  overallUph,
  achievementRate,
  totalWorkHours,
  onCardClick,
}) => {
  const isGapNegative = totalGap < 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
      {/* 1. Planning Card */}
      <div 
        onClick={() => onCardClick?.('planning')}
        className="bg-[#0070c0] hover:bg-[#0064ad] text-white rounded-md p-4 shadow-sm transition-all duration-150 relative overflow-hidden flex flex-col justify-between min-h-[105px] border border-blue-600/30"
      >
        <div className="flex items-center justify-between">
          <span className="text-base sm:text-lg font-bold tracking-tight">Planning</span>
          <span className="text-[11px] font-medium text-blue-100 bg-blue-800/40 px-2 py-0.5 rounded">
            เป้าหมายรวม
          </span>
        </div>
        <div className="mt-2 text-right">
          <div className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            {totalPlanning.toLocaleString()}
          </div>
          <div className="text-[11px] text-blue-200 mt-1 flex items-center justify-end gap-1">
            <Target className="w-3 h-3" />
            <span>Target Units (ชิ้น)</span>
          </div>
        </div>
      </div>

      {/* 2. Act. (Actual) Card */}
      <div 
        onClick={() => onCardClick?.('act')}
        className="bg-[#0070c0] hover:bg-[#0064ad] text-white rounded-md p-4 shadow-sm transition-all duration-150 relative overflow-hidden flex flex-col justify-between min-h-[105px] border border-blue-600/30"
      >
        <div className="flex items-center justify-between">
          <span className="text-base sm:text-lg font-bold tracking-tight">Act.</span>
          <span className="text-[11px] font-medium text-emerald-200 bg-emerald-900/40 px-2 py-0.5 rounded">
            ยอดผลิตจริง
          </span>
        </div>
        <div className="mt-2 text-right">
          <div className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            {totalActual.toLocaleString()}
          </div>
          <div className="text-[11px] text-blue-200 mt-1 flex items-center justify-end gap-1">
            <span className="font-semibold text-white">{achievementRate.toFixed(1)}%</span>
            <span>ของแผนงาน</span>
          </div>
        </div>
      </div>

      {/* 3. Gap Card */}
      <div 
        onClick={() => onCardClick?.('gap')}
        className={`bg-[#0070c0] hover:bg-[#0064ad] text-white rounded-md p-4 shadow-sm transition-all duration-150 relative overflow-hidden flex flex-col justify-between min-h-[105px] border ${
          isGapNegative ? 'border-rose-400/40' : 'border-emerald-400/40'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-base sm:text-lg font-bold tracking-tight">Gap</span>
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${
            isGapNegative ? 'text-rose-200 bg-rose-900/50' : 'text-emerald-200 bg-emerald-900/50'
          }`}>
            {isGapNegative ? 'ขาดเป้า' : 'เกินเป้า'}
          </span>
        </div>
        <div className="mt-2 text-right">
          <div className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${
            isGapNegative ? 'text-white' : 'text-emerald-200'
          }`}>
            {totalGap > 0 ? `+${totalGap.toLocaleString()}` : totalGap.toLocaleString()}
          </div>
          <div className="text-[11px] text-blue-200 mt-1 flex items-center justify-end gap-1">
            {isGapNegative ? (
              <>
                <TrendingDown className="w-3 h-3 text-rose-300" />
                <span className="text-rose-200">ขาด {Math.abs(totalGap).toLocaleString()} ตัว</span>
              </>
            ) : (
              <>
                <TrendingUp className="w-3 h-3 text-emerald-300" />
                <span className="text-emerald-200">ทะลุเป้า {totalGap.toLocaleString()} ตัว</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 4. UPH Card */}
      <div 
        onClick={() => onCardClick?.('uph')}
        className="bg-[#0070c0] hover:bg-[#0064ad] text-white rounded-md p-4 shadow-sm transition-all duration-150 relative overflow-hidden flex flex-col justify-between min-h-[105px] border border-blue-600/30"
      >
        <div className="flex items-center justify-between">
          <span className="text-base sm:text-lg font-bold tracking-tight">UPH</span>
          <span className="text-[11px] font-medium text-amber-200 bg-amber-900/40 px-2 py-0.5 rounded">
            ประสิทธิภาพ/ชม.
          </span>
        </div>
        <div className="mt-2 text-right">
          <div className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            {overallUph}
          </div>
          <div className="text-[11px] text-blue-200 mt-1 flex items-center justify-end gap-1">
            <Zap className="w-3 h-3 text-amber-300" />
            <span>Units Per Hour ({totalWorkHours} ชม. รวม)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
