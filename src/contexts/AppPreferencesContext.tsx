import React, { createContext, useContext, useState, useEffect } from 'react';

export type AppLanguage = 'th' | 'en' | 'zh';
export type AppThemeId = 'ocean' | 'emerald' | 'indigo' | 'amber' | 'midnight';

export interface ThemeConfig {
  id: AppThemeId;
  name: {
    th: string;
    en: string;
    zh: string;
  };
  description: {
    th: string;
    en: string;
    zh: string;
  };
  primaryHex: string;
  primaryHoverHex: string;
  secondaryHex: string;
  accentBgClass: string;
  swatchColors: [string, string, string];
  isDark?: boolean;
}

export const APP_THEMES: ThemeConfig[] = [
  {
    id: 'ocean',
    name: {
      th: '1. โอเชียนบลู (ค่าเริ่มต้น)',
      en: '1. Ocean Blue (Default)',
      zh: '1. 经典海蓝 (默认)',
    },
    description: {
      th: 'โทนสีน้ำเงินมาตรฐานโรงงาน คมชัด อ่านง่าย',
      en: 'Standard factory blue, crisp & high contrast',
      zh: '标准工厂蓝，清晰易读',
    },
    primaryHex: '#0070c0',
    primaryHoverHex: '#005ba3',
    secondaryHex: '#002060',
    accentBgClass: 'bg-[#0070c0]',
    swatchColors: ['#0070c0', '#009fe3', '#f8fafc'],
  },
  {
    id: 'emerald',
    name: {
      th: '2. เอเมอรัลด์กรีน (Eco Green)',
      en: '2. Emerald Green (Eco)',
      zh: '2. 翡翠绿 (环保绿)',
    },
    description: {
      th: 'โทนสีเขียวสดชื่น สบายตา เน้นประสิทธิภาพสีเขียว',
      en: 'Fresh emerald tones for sustainable operations',
      zh: '清新护眼绿，突显高效生产',
    },
    primaryHex: '#059669',
    primaryHoverHex: '#047857',
    secondaryHex: '#064e3b',
    accentBgClass: 'bg-emerald-600',
    swatchColors: ['#059669', '#10b981', '#f0fdf4'],
  },
  {
    id: 'indigo',
    name: {
      th: '3. รอยัลอินดิโก้ (Modern Purple)',
      en: '3. Royal Indigo (Executive)',
      zh: '3. 皇家靛紫 (现代紫)',
    },
    description: {
      th: 'โทนสีม่วงครามทันสมัย สไตล์แดชบอร์ดผู้บริหาร',
      en: 'Modern indigo & violet executive analytics look',
      zh: '现代高管仪表板靛紫风格',
    },
    primaryHex: '#4f46e5',
    primaryHoverHex: '#4338ca',
    secondaryHex: '#312e81',
    accentBgClass: 'bg-indigo-600',
    swatchColors: ['#4f46e5', '#818cf8', '#f5f3ff'],
  },
  {
    id: 'amber',
    name: {
      th: '4. อินดัสเทรียลแอมเบอร์ (Warm Gold)',
      en: '4. Industrial Amber (Warm)',
      zh: '4. 工业琥珀金 (暖色)',
    },
    description: {
      th: 'โทนสีส้มทองอุตสาหกรรม โดดเด่น เห็นตัวเลขชัดเจน',
      en: 'Warm industrial copper & amber high-visibility mode',
      zh: '工业暖金配色，数据醒目直观',
    },
    primaryHex: '#d97706',
    primaryHoverHex: '#b45309',
    secondaryHex: '#78350f',
    accentBgClass: 'bg-amber-600',
    swatchColors: ['#d97706', '#f59e0b', '#fffbeb'],
  },
  {
    id: 'midnight',
    name: {
      th: '5. มิดไนท์ดาร์ก (Dark Mode)',
      en: '5. Midnight Cyber (Dark)',
      zh: '5. 暗夜深邃 (深色模式)',
    },
    description: {
      th: 'โหมดมืดถนอมสายตา สำหรับจอภาพห้องควบคุมและกะดึก',
      en: 'Eye-care dark mode for control rooms & night shifts',
      zh: '护眼深色模式，适合中控大屏与夜班',
    },
    primaryHex: '#0284c7',
    primaryHoverHex: '#0369a1',
    secondaryHex: '#38bdf8',
    accentBgClass: 'bg-sky-600',
    swatchColors: ['#0f172a', '#0284c7', '#38bdf8'],
    isDark: true,
  },
];

interface AppPreferencesContextValue {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  themeId: AppThemeId;
  setThemeId: (theme: AppThemeId) => void;
  currentTheme: ThemeConfig;
  /**
   * Inline trilingual helper: returns text matching current language (th, en, zh)
   */
  t: (th: string, en: string, zh: string) => string;
}

const STORAGE_KEY_LANG = 'oec_app_language_v1';
const STORAGE_KEY_THEME = 'oec_app_theme_v1';

const AppPreferencesContext = createContext<AppPreferencesContextValue | undefined>(undefined);

export const AppPreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<AppLanguage>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LANG) as AppLanguage | null;
      if (saved === 'th' || saved === 'en' || saved === 'zh') return saved;
    } catch (e) {
      // ignore
    }
    return 'th';
  });

  const [themeId, setThemeIdState] = useState<AppThemeId>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_THEME) as AppThemeId | null;
      if (saved && APP_THEMES.some(item => item.id === saved)) return saved;
    } catch (e) {
      // ignore
    }
    return 'ocean';
  });

  const setLanguage = (lang: AppLanguage) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY_LANG, lang);
    } catch (e) {
      // ignore
    }
  };

  const setThemeId = (id: AppThemeId) => {
    setThemeIdState(id);
    try {
      localStorage.setItem(STORAGE_KEY_THEME, id);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeId);
    document.documentElement.setAttribute('lang', language);
  }, [themeId, language]);

  const currentTheme = APP_THEMES.find(item => item.id === themeId) || APP_THEMES[0];

  const t = (th: string, en: string, zh: string): string => {
    if (language === 'en') return en;
    if (language === 'zh') return zh;
    return th;
  };

  return (
    <AppPreferencesContext.Provider
      value={{
        language,
        setLanguage,
        themeId,
        setThemeId,
        currentTheme,
        t,
      }}
    >
      {children}
    </AppPreferencesContext.Provider>
  );
};

export const useAppPreferences = (): AppPreferencesContextValue => {
  const ctx = useContext(AppPreferencesContext);
  if (!ctx) {
    throw new Error('useAppPreferences must be used within an AppPreferencesProvider');
  }
  return ctx;
};
