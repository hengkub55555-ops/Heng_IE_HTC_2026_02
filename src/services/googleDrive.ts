/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { auth } from './firebase';
import { 
  LineOECData, 
  DayColumn, 
  MonthlyEfficiencyRow, 
  ActionItem,
  OECFilterState 
} from '../types/oec';

const SCOPES = [
  'https://www.googleapis.com/auth/drive.file'
];

const provider = new GoogleAuthProvider();
SCOPES.forEach(scope => provider.addScope(scope));

// In-memory token cache (never stored in localStorage/sessionStorage as per workspace-integration skill)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export interface DriveBackupMetadata {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size?: string;
  webViewLink?: string;
  periodYear?: number;
  periodMonth?: string;
}

export interface FullDatabaseBackupPayload {
  version: string;
  app: string;
  backupDate: string;
  plant: string;
  year: number;
  month: string;
  lines: LineOECData[];
  days: DayColumn[];
  monthlyEfficiency: MonthlyEfficiencyRow[];
  actionItems: ActionItem[];
  allPeriodsData?: Record<string, {
    lines: LineOECData[];
    days: DayColumn[];
  }>;
}

/**
 * Initialize Firebase Auth listener for Google Workspace
 */
export const initWorkspaceAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Trigger Google Sign In with popup to get Drive access token
 */
export const signInWithGoogleWorkspace = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Google OAuth access token');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: unknown) {
    console.error('Google Sign-In Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getWorkspaceAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const logoutWorkspace = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

/**
 * Upload OEC Database Backup directly to Google Drive
 */
export async function uploadBackupToDrive(
  payload: FullDatabaseBackupPayload,
  customFileName?: string
): Promise<DriveBackupMetadata> {
  if (!cachedAccessToken) {
    throw new Error('กรุณาลงชื่อเข้าใช้ด้วย Google Account ก่อนทำการสำรองข้อมูล');
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const fileName = customFileName || `OEC_Database_Backup_${payload.year}_${payload.month || 'All'}_${timestamp}.json`;

  const metadata = {
    name: fileName,
    mimeType: 'application/json',
    description: `OEC Production & Efficiency Database Backup created on ${new Date().toLocaleString('th-TH')}`,
    appProperties: {
      app: 'oec-production-efficiency',
      type: 'database-backup',
      year: String(payload.year),
      month: String(payload.month),
    },
  };

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelim = `\r\n--${boundary}--`;

  const body =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    JSON.stringify(payload, null, 2) +
    closeDelim;

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,modifiedTime,size,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cachedAccessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google Drive Upload Failed:', errorText);
    throw new Error(`Google Drive API Error: ${response.status} ${response.statusText}`);
  }

  const fileData = await response.json();
  return {
    id: fileData.id,
    name: fileData.name,
    mimeType: fileData.mimeType,
    modifiedTime: fileData.modifiedTime,
    size: fileData.size,
    webViewLink: fileData.webViewLink,
  };
}

/**
 * List existing OEC database backups from user's Google Drive
 */
export async function listBackupsFromDrive(): Promise<DriveBackupMetadata[]> {
  if (!cachedAccessToken) {
    throw new Error('กรุณาลงชื่อเข้าใช้ด้วย Google Account ก่อน');
  }

  const q = encodeURIComponent("name contains 'OEC_Database_Backup' and trashed = false");
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType,modifiedTime,size,webViewLink)&orderBy=modifiedTime desc&pageSize=30`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${cachedAccessToken}`,
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('Google Drive list files failed:', errText);
    throw new Error(`Failed to list Google Drive files: ${response.status}`);
  }

  const data = await response.json();
  return data.files || [];
}

/**
 * Download a backup file from Google Drive
 */
export async function downloadBackupFromDrive(fileId: string): Promise<FullDatabaseBackupPayload> {
  if (!cachedAccessToken) {
    throw new Error('กรุณาลงชื่อเข้าใช้ด้วย Google Account ก่อน');
  }

  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: {
      Authorization: `Bearer ${cachedAccessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download file from Google Drive: ${response.status}`);
  }

  const data = await response.json();
  return data as FullDatabaseBackupPayload;
}

/**
 * Delete a backup file from Google Drive (Requires user confirmation beforehand)
 */
export async function deleteBackupFromDrive(fileId: string): Promise<void> {
  if (!cachedAccessToken) {
    throw new Error('กรุณาลงชื่อเข้าใช้ด้วย Google Account ก่อน');
  }

  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${cachedAccessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to delete file from Google Drive: ${response.status}`);
  }
}
