import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot, 
  getDocFromServer,
  Unsubscribe 
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { 
  LineOECData, 
  DayColumn, 
  MonthlyEfficiencyRow, 
  ActionItem, 
  PeriodStorageState, 
  WebSavedSnapshot 
} from '../types/oec';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Use the databaseId provided in firebase-applet-config.json
export const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export const auth = getAuth(app);

const DASHBOARD_DOC_ID = 'htc_ref_dashboard_v1';
const DASHBOARD_REF = doc(db, 'oec_dashboard', DASHBOARD_DOC_ID);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface CloudDashboardPayload {
  lines: LineOECData[];
  days: DayColumn[];
  monthlyEfficiency: MonthlyEfficiencyRow[];
  actionItems: ActionItem[];
  periodData?: PeriodStorageState;
  webSnapshots?: WebSavedSnapshot[];
  updatedAt?: string;
  updatedBy?: string;
}

/**
 * Validate connection to Firestore as required by Firebase skill
 */
export async function testFirestoreConnection(): Promise<boolean> {
  const path = 'oec_dashboard/connection_test';
  try {
    await getDocFromServer(doc(db, 'oec_dashboard', 'connection_test'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore is running in offline mode. Local persistence active.');
      return false;
    }
    // Document might not exist, which is normal and indicates connection succeeded
    return true;
  }
}

/**
 * Real-time subscription to cloud dashboard data
 */
export function subscribeToOecDashboard(
  onUpdate: (payload: CloudDashboardPayload) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const path = `oec_dashboard/${DASHBOARD_DOC_ID}`;
  return onSnapshot(
    DASHBOARD_REF,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as CloudDashboardPayload;
        onUpdate(data);
      }
    },
    (err) => {
      console.error('Firestore onSnapshot error:', err);
      if (onError) onError(err);
      handleFirestoreError(err, OperationType.GET, path);
    }
  );
}

/**
 * Save dashboard state to Cloud Firestore
 */
export async function saveOecDashboardOnline(payload: CloudDashboardPayload): Promise<void> {
  const path = `oec_dashboard/${DASHBOARD_DOC_ID}`;
  try {
    await setDoc(
      DASHBOARD_REF,
      {
        ...payload,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

/**
 * Seed initial dashboard data to Cloud if empty
 */
export async function initOrSeedCloudData(
  defaultData: CloudDashboardPayload
): Promise<CloudDashboardPayload> {
  const path = `oec_dashboard/${DASHBOARD_DOC_ID}`;
  try {
    const snap = await getDoc(DASHBOARD_REF);
    if (!snap.exists()) {
      await setDoc(DASHBOARD_REF, {
        ...defaultData,
        updatedAt: new Date().toISOString(),
      });
      return defaultData;
    }
    return snap.data() as CloudDashboardPayload;
  } catch (err) {
    console.warn('Failed to seed cloud data, falling back to local:', err);
    return defaultData;
  }
}
