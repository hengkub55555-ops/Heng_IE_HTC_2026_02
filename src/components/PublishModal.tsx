import React, { useState } from 'react';
import { 
  Globe, 
  Copy, 
  Check, 
  ExternalLink, 
  X, 
  ShieldCheck, 
  Smartphone, 
  Laptop, 
  Share2, 
  Cloud, 
  Sparkles,
  Users
} from 'lucide-react';

interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  isOnline: boolean;
  lastSyncTime: Date | null;
}

export const PublishModal: React.FC<PublishModalProps> = ({
  isOpen,
  onClose,
  isOnline,
  lastSyncTime,
}) => {
  const [copiedShared, setCopiedShared] = useState(false);
  const [copiedCurrent, setCopiedCurrent] = useState(false);

  if (!isOpen) return null;

  // The official Cloud Run shared URL for this applet
  const sharedUrl = 'https://ais-pre-m2hhrr72jurlvudvbjtxl3-434237865567.asia-southeast1.run.app';
  const currentUrl = typeof window !== 'undefined' ? window.location.href : sharedUrl;

  const handleCopyShared = () => {
    navigator.clipboard.writeText(sharedUrl);
    setCopiedShared(true);
    setTimeout(() => setCopiedShared(false), 2500);
  };

  const handleCopyCurrent = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopiedCurrent(true);
    setTimeout(() => setCopiedCurrent(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        className="bg-white rounded-xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#005a9c] to-[#0070c0] px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-lg backdrop-blur-xs">
              <Globe className="w-5 h-5 text-sky-200" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">เผยแพร่และแชร์เว็บออนไลน์ (Publish Online)</h3>
              <p className="text-xs text-sky-100">
                Production & Efficiency OEC Dashboard พร้อมเผยแพร่ออนไลน์
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Cloud Status Banner */}
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-3">
            <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-md shrink-0 mt-0.5">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="text-xs">
              <div className="font-bold text-emerald-900 flex items-center gap-2">
                <span>ฐานข้อมูล Cloud Firestore พร้อมใช้งานแบบ Real-Time</span>
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <p className="text-emerald-700 mt-0.5 leading-relaxed">
                ข้อมูลตารางรายวัน, สรุปรายเดือน AVG/YTD และ Action Items มีการซิงค์ผ่านคลาวด์อัตโนมัติ ผู้ใช้งานทุกคนจะเห็นข้อมูลตรงกันทันที
              </p>
            </div>
          </div>

          {/* Primary Share URL */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-[#0070c0]" />
                ลิงก์สาธารณะสำหรับเผยแพร่ (Public Shared App URL):
              </span>
              <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                แนะนำสำหรับส่งให้ผู้จัดการ
              </span>
            </label>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={sharedUrl}
                className="flex-1 bg-slate-50 border border-slate-300 text-slate-800 text-xs font-mono rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0070c0]"
              />
              <button
                onClick={handleCopyShared}
                className="px-3.5 py-2.5 bg-[#0070c0] hover:bg-[#005a9c] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm transition-colors shrink-0"
              >
                {copiedShared ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>คัดลอกแล้ว</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>คัดลอกลิงก์</span>
                  </>
                )}
              </button>
              <a
                href={sharedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-300 transition-colors"
                title="เปิดลิงก์ในหน้าต่างใหม่"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
            <p className="text-[11px] text-slate-500">
              * ลิงก์นี้สามารถส่งเข้ากลุ่ม LINE, Email หรือทำเป็น Bookmark เพื่อให้ผู้จัดการโรงงานและทีมงานเปิดดูได้จากทุกที่
            </p>
          </div>

          {/* Current URL as alternative */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <label className="text-xs font-semibold text-slate-600 flex items-center justify-between">
              <span>ลิงก์ปัจจุบันที่คุณกำลังเปิดใช้งาน (Current URL):</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={currentUrl}
                className="flex-1 bg-slate-50 border border-slate-200 text-slate-600 text-xs font-mono rounded-lg px-3 py-2 focus:outline-none"
              />
              <button
                onClick={handleCopyCurrent}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg border border-slate-300 flex items-center gap-1 transition-colors shrink-0"
              >
                {copiedCurrent ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCurrent ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
              </button>
            </div>
          </div>

          {/* Supported Devices Info */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-2.5">
              <Smartphone className="w-5 h-5 text-indigo-600 shrink-0" />
              <div className="text-xs">
                <p className="font-semibold text-slate-800">โทรศัพท์ & แท็บเล็ต</p>
                <p className="text-[11px] text-slate-500">เปิดดูในไลน์ผลิตหรือขณะเดินตรวจโรงงาน</p>
              </div>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-2.5">
              <Laptop className="w-5 h-5 text-[#0070c0] shrink-0" />
              <div className="text-xs">
                <p className="font-semibold text-slate-800">คอมพิวเตอร์ & จอ Monitor</p>
                <p className="text-[11px] text-slate-500">เปิดประชุม OEC นำเสนอผู้จัดการโรงงาน</p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500 flex items-center gap-1.5">
            <Cloud className="w-3.5 h-3.5 text-sky-600" />
            <span>ซิงค์ครั้งล่าสุด: {lastSyncTime ? lastSyncTime.toLocaleTimeString('th-TH') : 'เรียบร้อยแล้ว'}</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
