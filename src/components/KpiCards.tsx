import React from 'react';
import { TrendingDown, TrendingUp, Target, Zap } from 'lucide-react';
import { useAppPreferences } from '../contexts/AppPreferencesContext';

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
  const { t } = useAppPreferences();
  const isGapNegative = totalGap < 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
      {/* 1. Planning Card */}
      <div 
        onClick={() => onCardClick?.('planning')}
        className="bg-[#0070c0] hover:bg-[#0064ad] text-white rounded-md p-4 shadow-sm transition-all duration-150 relative overflow-hidden flex flex-col justify-between min-h-[105px] border border-white/15"
      >
        <div className="flex items-center justify-between">
          <span className="text-base sm:text-lg font-bold tracking-tight">
            {t('Planning (แผนผลิต)', 'Planning', '计划产量 (Planning)')}
          </span>
          <span className="text-[11px] font-medium text-white/90 bg-black/20 px-2 py-0.5 rounded">
            {t('เป้าหมายรวม', 'Total Target', '总目标')}
          </span>
        </div>
        <div className="mt-2 text-right">
          <div className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            {totalPlanning.toLocaleString()}
          </div>
          <div className="text-[11px] text-white/85 mt-1 flex items-center justify-end gap-1">
            <Target className="w-3 h-3" />
            <span>{t('Target Units (ชิ้น)', 'Target Units (pcs)', '目标台数 (台)')}</span>
          </div>
        </div>
      </div>

      {/* 2. Act. (Actual) Card */}
      <div 
        onClick={() => onCardClick?.('act')}
        className="bg-[#0070c0] hover:bg-[#0064ad] text-white rounded-md p-4 shadow-sm transition-all duration-150 relative overflow-hidden flex flex-col justify-between min-h-[105px] border border-white/15"
      >
        <div className="flex items-center justify-between">
          <span className="text-base sm:text-lg font-bold tracking-tight">
            {t('Act. (ผลิตจริง)', 'Act. (Actual)', '实际产量 (Act.)')}
          </span>
          <span className="text-[11px] font-medium text-emerald-200 bg-emerald-950/40 px-2 py-0.5 rounded">
            {t('ยอดผลิตจริง', 'Actual Output', '实际产出')}
          </span>
        </div>
        <div className="mt-2 text-right">
          <div className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            {totalActual.toLocaleString()}
          </div>
          <div className="text-[11px] text-white/85 mt-1 flex items-center justify-end gap-1">
            <span className="font-semibold text-white">{achievementRate.toFixed(1)}%</span>
            <span>{t('ของแผนงาน', 'of Plan', '计划达成率')}</span>
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
          <span className="text-base sm:text-lg font-bold tracking-tight">
            {t('Gap (ส่วนต่าง)', 'Gap (Variance)', '差异 (Gap)')}
          </span>
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${
            isGapNegative ? 'text-rose-200 bg-rose-950/50' : 'text-emerald-200 bg-emerald-950/50'
          }`}>
            {isGapNegative
              ? t('ขาดเป้า', 'Below Target', '未达标')
              : t('เกินเป้า', 'Above Target', '超额达标')}
          </span>
        </div>
        <div className="mt-2 text-right">
          <div className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${
            isGapNegative ? 'text-white' : 'text-emerald-200'
          }`}>
            {totalGap > 0 ? `+${totalGap.toLocaleString()}` : totalGap.toLocaleString()}
          </div>
          <div className="text-[11px] text-white/85 mt-1 flex items-center justify-end gap-1">
            {isGapNegative ? (
              <>
                <TrendingDown className="w-3 h-3 text-rose-300" />
                <span className="text-rose-200">
                  {t(
                    `ขาด ${Math.abs(totalGap).toLocaleString()} ตัว`,
                    `Short by ${Math.abs(totalGap).toLocaleString()} units`,
                    `差 ${Math.abs(totalGap).toLocaleString()} 台`
                  )}
                </span>
              </>
            ) : (
              <>
                <TrendingUp className="w-3 h-3 text-emerald-300" />
                <span className="text-emerald-200">
                  {t(
                    `ทะลุเป้า ${totalGap.toLocaleString()} ตัว`,
                    `Exceeded by ${totalGap.toLocaleString()} units`,
                    `超产 ${totalGap.toLocaleString()} 台`
                  )}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 4. UPH Card */}
      <div 
        onClick={() => onCardClick?.('uph')}
        className="bg-[#0070c0] hover:bg-[#0064ad] text-white rounded-md p-4 shadow-sm transition-all duration-150 relative overflow-hidden flex flex-col justify-between min-h-[105px] border border-white/15"
      >
        <div className="flex items-center justify-between">
          <span className="text-base sm:text-lg font-bold tracking-tight">UPH</span>
          <span className="text-[11px] font-medium text-amber-200 bg-amber-950/40 px-2 py-0.5 rounded">
            {t('ประสิทธิภาพ/ชม.', 'Units / Hour', '每小时产出')}
          </span>
        </div>
        <div className="mt-2 text-right">
          <div className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            {overallUph}
          </div>
          <div className="text-[11px] text-white/85 mt-1 flex items-center justify-end gap-1">
            <Zap className="w-3 h-3 text-amber-300" />
            <span>
              {t(
                `Units Per Hour (${totalWorkHours} ชม. รวม)`,
                `Units Per Hour (${totalWorkHours} hrs total)`,
                `每小时台数 (共 ${totalWorkHours} 小时)`
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

