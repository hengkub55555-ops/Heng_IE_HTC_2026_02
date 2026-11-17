/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Cloud,
  Upload,
  Download,
  Trash2,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  FileJson,
  HardDrive,
  Clock,
  LogOut,
  Database,
  AlertTriangle,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  signInWithGoogleWorkspace,
  logoutWorkspace,
  getWorkspaceAccessToken,
  initWorkspaceAuth,
  uploadBackupToDrive,
  listBackupsFromDrive,
  downloadBackupFromDrive,
  deleteBackupFromDrive,
  DriveBackupMetadata,
  FullDatabaseBackupPayload,
} from '../services/googleDrive';
import {
  LineOECData,
  DayColumn,
  MonthlyEfficiencyRow,
  ActionItem,
  OECFilterState,
} from '../types/oec';
import { useAppPreferences } from '../contexts/AppPreferencesContext';

interface GoogleDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLines: LineOECData[];
  currentDays: DayColumn[];
  currentMonthlyEfficiency: MonthlyEfficiencyRow[];
  currentActionItems: ActionItem[];
  filters: OECFilterState;
  onRestoreDatabase: (payload: FullDatabaseBackupPayload) => void;
}

export const GoogleDriveModal: React.FC<GoogleDriveModalProps> = ({
  isOpen,
  onClose,
  currentLines,
  currentDays,
  currentMonthlyEfficiency,
  currentActionItems,
  filters,
  onRestoreDatabase,
}) => {
  const { language, t } = useAppPreferences();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backups, setBackups] = useState<DriveBackupMetadata[]>([]);
  const [feedback, setFeedback] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  const [pendingAction, setPendingAction] = useState<{
    type: 'restore' | 'delete';
    backup: DriveBackupMetadata;
  } | null>(null);
  const [isExecutingAction, setIsExecutingAction] = useState(false);

  const dateLocale = language === 'th' ? 'th-TH' : language === 'zh' ? 'zh-CN' : 'en-US';

  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = initWorkspaceAuth(
      user => {
        setCurrentUser(user);
        loadBackups();
      },
      () => {
        setCurrentUser(null);
        setBackups([]);
      }
    );

    if (getWorkspaceAccessToken()) {
      loadBackups();
    }

    return () => unsubscribe();
  }, [isOpen]);

  const showNotice = (
    message: string,
    type: 'success' | 'error' | 'info' = 'success'
  ) => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 4500);
  };

  const handleSignIn = async () => {
    setIsLoggingIn(true);
    try {
      const result = await signInWithGoogleWorkspace();
      if (result) {
        setCurrentUser(result.user);
        showNotice(
          t(
            `เข้าสู่ระบบสำเร็จ: ${result.user.email}`,
            `Signed in: ${result.user.email}`,
            `登录成功: ${result.user.email}`
          ),
          'success'
        );
        await loadBackups();
      }
    } catch (err: unknown) {
      console.error('Sign-in error:', err);
      showNotice(
        t(
          'ไม่สามารถเข้าสู่ระบบ Google ได้ กรุณาลองใหม่อีกครั้ง',
          'Failed to sign in with Google. Please try again.',
          '无法登录 Google 账号，请重试。'
        ),
        'error'
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logoutWorkspace();
    setCurrentUser(null);
    setBackups([]);
    showNotice(
      t(
        'ออกจากระบบ Google เรียบร้อยแล้ว',
        'Signed out of Google successfully',
        '已退出 Google 登录'
      ),
      'info'
    );
  };

  const loadBackups = async () => {
    if (!getWorkspaceAccessToken()) return;
    setIsLoadingBackups(true);
    try {
      const files = await listBackupsFromDrive();
      setBackups(files);
    } catch (err: unknown) {
      console.error('Load backups error:', err);
      showNotice(
        t(
          'ไม่สามารถโหลดรายการสำรองข้อมูลจาก Google Drive ได้',
          'Unable to list backup files from Google Drive',
          '无法从 Google Drive 读取备份文件列表'
        ),
        'error'
      );
    } finally {
      setIsLoadingBackups(false);
    }
  };

  const handleCreateBackup = async () => {
    if (!currentUser || !getWorkspaceAccessToken()) {
      showNotice(
        t(
          'กรุณาลงชื่อเข้าใช้ Google ก่อนสำรองข้อมูล',
          'Please sign in with Google before creating a backup',
          '备份前请先登录 Google 账号'
        ),
        'error'
      );
      return;
    }

    setIsBackingUp(true);
    try {
      const payload: FullDatabaseBackupPayload = {
        version: '1.2.0',
        app: 'Production&Efficiency OEC (生产&效率日清)',
        backupDate: new Date().toISOString(),
        plant: filters.plant === 'ทั้งหมด' ? 'HTC Ref(泰国冰箱)' : filters.plant,
        year: filters.year,
        month: filters.month,
        lines: currentLines,
        days: currentDays,
        monthlyEfficiency: currentMonthlyEfficiency,
        actionItems: currentActionItems,
      };

      const file = await uploadBackupToDrive(payload);
      showNotice(
        t(
          `สำรองข้อมูลขึ้น Google Drive สำเร็จ! ไฟล์: ${file.name}`,
          `Backup uploaded to Google Drive: ${file.name}`,
          `已成功备份至 Google Drive: ${file.name}`
        ),
        'success'
      );
      await loadBackups();
    } catch (err: unknown) {
      console.error('Backup error:', err);
      showNotice(
        t(
          'เกิดข้อผิดพลาดในการสำรองข้อมูลไปยัง Google Drive',
          'Error uploading backup to Google Drive',
          '上传备份至 Google Drive 时出错'
        ),
        'error'
      );
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleConfirmRestore = async () => {
    if (!pendingAction || pendingAction.type !== 'restore') return;
    setIsExecutingAction(true);
    try {
      const backupPayload = await downloadBackupFromDrive(pendingAction.backup.id);
      onRestoreDatabase(backupPayload);
      showNotice(
        t(
          `กู้คืนฐานข้อมูลจาก "${pendingAction.backup.name}" สำเร็จเรียบร้อยแล้ว!`,
          `Restored database from "${pendingAction.backup.name}"!`,
          `已从 "${pendingAction.backup.name}" 成功恢复数据库！`
        ),
        'success'
      );
      setPendingAction(null);
      onClose();
    } catch (err: unknown) {
      console.error('Restore error:', err);
      showNotice(
        t(
          'เกิดข้อผิดพลาดในการกู้คืนข้อมูลจาก Google Drive',
          'Error restoring backup from Google Drive',
          '从 Google Drive 恢复数据时出错'
        ),
        'error'
      );
    } finally {
      setIsExecutingAction(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingAction || pendingAction.type !== 'delete') return;
    setIsExecutingAction(true);
    try {
      await deleteBackupFromDrive(pendingAction.backup.id);
      showNotice(
        t(
          `ลบไฟล์สำรอง "${pendingAction.backup.name}" จาก Google Drive เรียบร้อยแล้ว`,
          `Deleted backup "${pendingAction.backup.name}" from Google Drive`,
          `已从 Google Drive 删除备份 "${pendingAction.backup.name}"`
        ),
        'success'
      );
      setPendingAction(null);
      await loadBackups();
    } catch (err: unknown) {
      console.error('Delete error:', err);
      showNotice(
        t(
          'เกิดข้อผิดพลาดในการลบไฟล์จาก Google Drive',
          'Error deleting file from Google Drive',
          '从 Google Drive 删除文件时出错'
        ),
        'error'
      );
    } finally {
      setIsExecutingAction(false);
    }
  };

  const formatFileSize = (bytesStr?: string) => {
    if (!bytesStr) return 'JSON File';
    const bytes = parseInt(bytesStr, 10);
    if (isNaN(bytes)) return 'JSON File';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0f9d58] to-[#0070c0] px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg backdrop-blur-xs">
              <HardDrive className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <span>Google Drive Cloud Database</span>
              </h3>
              <p className="text-xs text-emerald-100">
                {t(
                  'เก็บข้อมูล OEC ทุกวัน เดือน ปี ไว้ใน Google Drive ของคุณอย่างปลอดภัย',
                  'Safely archive and restore all OEC production data in your Google Drive',
                  '将每日、月、年 OEC 生产数据安全备份至您的 Google Drive 云端空间'
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`px-6 py-2.5 text-xs font-semibold flex items-center gap-2 border-b ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : feedback.type === 'error'
                ? 'bg-rose-50 text-rose-800 border-rose-200'
                : 'bg-blue-50 text-blue-800 border-blue-200'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* User Sign In Card */}
          {!currentUser ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center space-y-3">
              <div className="w-12 h-12 bg-white rounded-full border border-slate-200 shadow-xs flex items-center justify-center mx-auto">
                <Cloud className="w-6 h-6 text-[#0070c0]" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">
                  {t(
                    'เชื่อมต่อกับบัญชี Google Drive ของคุณ',
                    'Connect Your Google Drive Account',
                    '连接您的 Google Drive 账号'
                  )}
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  {t(
                    'เข้าสู่ระบบเพื่อสำรองข้อมูลตารางการผลิต OEC (วัน เดือน ปี, Actual, Plan, UPH, Action Items) เก็บไว้ในโฟลเดอร์ Google Drive ส่วนตัวของคุณ',
                    'Sign in to back up daily OEC tables, UPH efficiency, and action items to your Google Drive.',
                    '登录后可将每日 OEC 生产数据、UPH 效率及改善追踪备份至您的个人 Google Drive 文件夹。'
                  )}
                </p>
              </div>

              <div className="pt-2 flex justify-center">
                <button
                  onClick={handleSignIn}
                  disabled={isLoggingIn}
                  className="inline-flex items-center gap-3 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 48 48">
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                  </svg>
                  <span>
                    {isLoggingIn
                      ? t('กำลังเชื่อมต่อ...', 'Connecting...', '正在连接...')
                      : t('ลงชื่อเข้าใช้ด้วย Google', 'Sign in with Google', '使用 Google 账号登录')}
                  </span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'Google User'}
                    className="w-10 h-10 rounded-full border border-emerald-300 shadow-2xs"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-sm shadow-2xs">
                    {currentUser.email ? currentUser.email[0].toUpperCase() : 'G'}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 text-sm">
                      {currentUser.displayName || currentUser.email}
                    </span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded border border-emerald-200">
                      {t('เชื่อมต่อ Drive แล้ว', 'Drive Connected', '已连接 Drive')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono">{currentUser.email}</p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer self-end sm:self-center"
              >
                <LogOut className="w-3.5 h-3.5 text-slate-500" />
                <span>{t('ออกจากระบบ', 'Sign Out', '退出登录')}</span>
              </button>
            </div>
          )}

          {/* Current Database Summary & Backup Action */}
          <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <Database className="w-4 h-4 text-[#0070c0]" />
                  <span>
                    {t(
                      'สำรองข้อมูล Database ปัจจุบัน (Current Snapshot)',
                      'Back Up Current Database Snapshot',
                      '备份当前数据库快照 (Current Snapshot)'
                    )}
                  </span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  {filters.year} · {filters.month} · {currentLines.length}{' '}
                  {t('สายการผลิต', 'lines', '条产线')} · {currentDays.length}{' '}
                  {t('วันทำการ', 'days', '工作日')}
                </p>
              </div>

              <button
                onClick={handleCreateBackup}
                disabled={!currentUser || isBackingUp}
                className="px-4 py-2.5 bg-gradient-to-r from-[#0f9d58] to-[#0070c0] hover:from-[#0d8a4d] hover:to-[#005a9c] text-white text-xs font-bold rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                <Upload className={`w-4 h-4 ${isBackingUp ? 'animate-bounce' : ''}`} />
                <span>
                  {isBackingUp
                    ? t('กำลังอัปโหลด...', 'Uploading...', '正在上传...')
                    : t('สำรองฐานข้อมูลขึ้น Drive ทันที', 'Back Up to Drive Now', '立即备份至 Drive')}
                </span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] text-slate-600">
              <div className="p-2 bg-slate-50 rounded border border-slate-100">
                <span className="block text-slate-400 font-medium">
                  {t('โรงงาน (Plant)', 'Plant', '工厂 (Plant)')}
                </span>
                <span className="font-semibold text-slate-800 truncate block">
                  {filters.plant === 'ทั้งหมด' ? 'HTC Ref(泰国冰箱)' : filters.plant}
                </span>
              </div>
              <div className="p-2 bg-slate-50 rounded border border-slate-100">
                <span className="block text-slate-400 font-medium">
                  {t('ปี / เดือน', 'Year / Month', '年份 / 月份')}
                </span>
                <span className="font-semibold text-slate-800 truncate block">
                  {filters.year} / {filters.month}
                </span>
              </div>
              <div className="p-2 bg-slate-50 rounded border border-slate-100">
                <span className="block text-slate-400 font-medium">
                  {t('สายการผลิต', 'Prod Lines', '产线')}
                </span>
                <span className="font-semibold text-slate-800">
                  {currentLines.map(l => l.prodLine).join(', ') || 'Line A, Line B'}
                </span>
              </div>
              <div className="p-2 bg-slate-50 rounded border border-slate-100">
                <span className="block text-slate-400 font-medium">
                  {t('บันทึกประชุม', 'Action Items', '改善追踪项')}
                </span>
                <span className="font-semibold text-slate-800">
                  {currentActionItems.length} {t('รายการ', 'items', '项')}
                </span>
              </div>
            </div>
          </div>

          {/* Backup History */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-emerald-600" />
                <span>
                  {t(
                    `ไฟล์สำรองใน Google Drive (${backups.length} ไฟล์)`,
                    `Backup Files in Google Drive (${backups.length})`,
                    `Google Drive 备份列表 (${backups.length} 个文件)`
                  )}
                </span>
              </h4>

              {currentUser && (
                <button
                  onClick={loadBackups}
                  disabled={isLoadingBackups}
                  className="px-2.5 py-1 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded text-xs flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBackups ? 'animate-spin' : ''}`} />
                  <span>{t('รีเฟรช', 'Refresh', '刷新')}</span>
                </button>
              )}
            </div>

            {!currentUser ? (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                {t(
                  'กรุณาลงชื่อเข้าใช้ Google เพื่อดูรายการไฟล์สำรอง',
                  'Please sign in with Google to view backup files',
                  '请先登录 Google 以查看云端备份文件'
                )}
              </div>
            ) : isLoadingBackups ? (
              <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
                <span>
                  {t(
                    'กำลังโหลดรายการไฟล์จาก Google Drive...',
                    'Loading backups from Google Drive...',
                    '正在从 Google Drive 加载备份列表...'
                  )}
                </span>
              </div>
            ) : backups.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300 space-y-1">
                <p className="font-semibold text-slate-700">
                  {t(
                    'ยังไม่มีไฟล์สำรองใน Google Drive',
                    'No backup files found in Google Drive',
                    'Google Drive 中暂无备份文件'
                  )}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {backups.map(file => (
                  <div
                    key={file.id}
                    className="p-3 bg-white border border-slate-200 hover:border-slate-300 rounded-lg shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-50 text-[#0070c0] rounded-md shrink-0 mt-0.5">
                        <FileJson className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-800 text-xs break-all">
                            {file.name}
                          </span>
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                            {formatFileSize(file.size)}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>
                            {t('บันทึกเมื่อ:', 'Modified:', '保存时间:')}{' '}
                            {new Date(file.modifiedTime).toLocaleString(dateLocale)}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {file.webViewLink && (
                        <a
                          href={file.webViewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 transition-colors"
                          title={t('ดูไฟล์ใน Google Drive', 'View in Google Drive', '在 Drive 中查看')}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}

                      <button
                        onClick={() => setPendingAction({ type: 'restore', backup: file })}
                        className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#0070c0] border border-blue-200 rounded text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{t('กู้คืน', 'Restore', '恢复')}</span>
                      </button>

                      <button
                        onClick={() => setPendingAction({ type: 'delete', backup: file })}
                        className="p-1.5 text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded border border-rose-200 transition-colors cursor-pointer"
                        title={t('ลบไฟล์สำรอง', 'Delete backup', '删除备份')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>
              {t(
                'ความปลอดภัย Google Drive OAuth 2.0',
                'Secured via Google Drive OAuth 2.0',
                '已通过 Google Drive OAuth 2.0 安全认证'
              )}
            </span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            {t('ปิดหน้าต่าง', 'Close', '关闭窗口')}
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {pendingAction && (
        <div className="fixed inset-0 z-60 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-full ${
                  pendingAction.type === 'restore'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-rose-100 text-rose-700'
                }`}
              >
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">
                  {pendingAction.type === 'restore'
                    ? t('ยืนยันการกู้คืนฐานข้อมูล?', 'Confirm Database Restore?', '确认恢复数据库？')
                    : t('ยืนยันการลบไฟล์จาก Google Drive?', 'Delete Backup from Drive?', '确认从 Drive 删除备份？')}
                </h4>
                <p className="text-xs text-slate-500">
                  {pendingAction.type === 'restore'
                    ? t(
                        'ข้อมูลในตารางปัจจุบันจะถูกเขียนทับด้วยข้อมูลจากไฟล์สำรองนี้',
                        'Current data will be overwritten by this backup snapshot.',
                        '当前表格数据将被此备份文件覆盖。'
                      )
                    : t(
                        'การลบไฟล์นี้จาก Google Drive ไม่สามารถย้อนกลับได้',
                        'Deleting this file from Google Drive cannot be undone.',
                        '从 Google Drive 删除此文件后将无法撤销。'
                      )}
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
              <div className="font-semibold text-slate-800 truncate">{pendingAction.backup.name}</div>
              <div className="text-slate-500">
                {new Date(pendingAction.backup.modifiedTime).toLocaleString(dateLocale)}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setPendingAction(null)}
                disabled={isExecutingAction}
                className="px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                {t('ยกเลิก', 'Cancel', '取消')}
              </button>
              <button
                onClick={pendingAction.type === 'restore' ? handleConfirmRestore : handleConfirmDelete}
                disabled={isExecutingAction}
                className={`px-4 py-2 text-xs font-bold text-white rounded-lg cursor-pointer ${
                  pendingAction.type === 'restore'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {isExecutingAction
                  ? t('กำลังดำเนินการ...', 'Processing...', '正在处理...')
                  : pendingAction.type === 'restore'
                  ? t('ยืนยันกู้คืนข้อมูล', 'Confirm Restore', '确认恢复')
                  : t('ยืนยันลบไฟล์', 'Confirm Delete', '确认删除')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
