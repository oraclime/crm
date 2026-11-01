import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import {
  CrmActivityLog,
  CrmCampaign,
  CrmFollowUp,
  CrmImportBatch,
  CrmIssue,
  CrmLead,
  CrmMessageTemplate,
  CrmNotification,
  CrmPartnership,
  CrmTask,
  CrmUser,
  LeadStageStatus,
  UserRole,
} from '../types/crm';
import {
  DATA_RESET_AUDIT_SUMMARY,
  hashPasswordSync,
  INITIAL_CRM_ACTIVITY_LOGS,
  INITIAL_CRM_CAMPAIGNS,
  INITIAL_CRM_FOLLOWUPS,
  INITIAL_CRM_ISSUES,
  INITIAL_CRM_LEADS,
  INITIAL_CRM_PARTNERSHIPS,
  INITIAL_CRM_TASKS,
  INITIAL_CRM_TEMPLATES,
  INITIAL_CRM_USERS,
  INITIAL_IMPORT_BATCHES,
  validateAndFormatLeadPhone,
  verifyPasswordHash,
} from '../utils/crmSeedAndHelpers';

interface CrmContextValue {
  currentUser: CrmUser | null;
  firebaseUser: FirebaseUser | null;
  cloudConnected: boolean;
  users: CrmUser[];
  leads: CrmLead[];
  activeLeads: CrmLead[];
  deletedLeads: CrmLead[];
  visibleLeads: CrmLead[];
  followUps: CrmFollowUp[];
  partnerships: CrmPartnership[];
  tasks: CrmTask[];
  issues: CrmIssue[];
  campaigns: CrmCampaign[];
  templates: CrmMessageTemplate[];
  activityLogs: CrmActivityLog[];
  importBatches: CrmImportBatch[];
  notifications: CrmNotification[];
  whatsappWebConnected: boolean;
  setWhatsappWebConnected: (connected: boolean) => void;
  dataResetSummary: typeof DATA_RESET_AUDIT_SUMMARY;

  // Auth & Role Operations (Strictly profile-derived, no frontend role switcher)
  loginWithEmailPassword: (email: string, password: string) => { ok: boolean; error?: string; role?: UserRole };
  loginWithGoogleCloud: () => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (newPassword: string) => void;

  // Admin User Management System Operations
  createUserAccount: (input: {
    name: string;
    email: string;
    passwordPlain: string;
    role: UserRole;
    phone: string;
    city: string;
    assignedManagerId: string;
    active: boolean;
  }) => { ok: boolean; error?: string; user?: CrmUser };
  updateUserAccount: (id: string, patch: Partial<CrmUser>) => { ok: boolean; error?: string };
  adminResetUserPassword: (userId: string, newPasswordPlain: string) => { ok: boolean; error?: string };
  adminDeleteUserAccount: (
    userId: string,
    options?: {
      leadHandling: 'unassign' | 'reassign';
      reassignToUserName?: string;
    }
  ) => { ok: boolean; error?: string; affectedLeadsCount?: number };
  executeFullBusinessDataReset: () => Promise<void>;
  markAllNotificationsRead: () => void;

  // Lead Operations
  createLead: (input: Partial<CrmLead>) => CrmLead;
  updateLead: (id: string, patch: Partial<CrmLead>, logNote?: string) => void;
  moveLeadStage: (id: string, newStage: LeadStageStatus, note?: string) => void;
  bulkAssignLeads: (leadIds: string[], assignedManager: string, assignedStaff: string) => void;
  bulkUpdateLeadStatus: (leadIds: string[], status: LeadStageStatus) => void;
  softDeleteLeads: (leadIds: string[], reason: string) => void;
  restoreLeads: (leadIds: string[]) => void;
  permanentDeleteLeads: (leadIds: string[]) => void;
  importLeadsBatch: (newLeads: CrmLead[], batchMeta: Omit<CrmImportBatch, 'id' | 'timestamp' | 'importedBy'>) => void;

  // WhatsApp & Campaign Operations
  recordWhatsAppChatOpened: (leadId: string, campaignId?: string) => void;
  recordWhatsAppMessageConfirmed: (leadId: string, campaignId?: string) => void;
  createCampaign: (input: Omit<CrmCampaign, 'id' | 'createdByUid'>) => CrmCampaign;
  updateCampaign: (id: string, patch: Partial<CrmCampaign>) => void;
  saveMessageTemplate: (tpl: Omit<CrmMessageTemplate, 'id' | 'updatedAt'> & { id?: string }) => void;
  deleteMessageTemplate: (id: string) => void;

  // Follow-up Operations
  createFollowUp: (input: Omit<CrmFollowUp, 'id' | 'createdByUid' | 'createdAt'>) => void;
  updateFollowUp: (id: string, patch: Partial<CrmFollowUp>) => void;

  // Partnership Operations
  convertLeadToPartnership: (leadId: string, terms: Partial<CrmPartnership>) => CrmPartnership | null;
  updatePartnership: (id: string, patch: Partial<CrmPartnership>) => void;

  // Task & Issue Operations
  createTask: (input: Omit<CrmTask, 'id' | 'createdByUid' | 'createdAt'>) => void;
  updateTask: (id: string, patch: Partial<CrmTask>) => void;
  createIssue: (input: Omit<CrmIssue, 'id' | 'createdByUid' | 'createdAt'>) => void;
  updateIssue: (id: string, patch: Partial<CrmIssue>) => void;

  // Activity Log Helper
  logActivity: (
    actionType: CrmActivityLog['actionType'],
    details: string,
    leadId?: string,
    showroomName?: string
  ) => void;
}

const CrmContext = createContext<CrmContextValue | null>(null);

// Legacy keys to purge permanently during initial zero-state reset
const LEGACY_LS_KEYS_TO_PURGE = [
  'oraclime_showrooms_v1',
  'oraclime_template_v1',
  'ora_crm_leads_v2',
  'ora_crm_followups_v2',
  'ora_crm_partnerships_v2',
  'ora_crm_tasks_v2',
  'ora_crm_issues_v2',
  'ora_crm_campaigns_v2',
  'ora_crm_activity_logs_v2',
  'ora_crm_import_batches_v2',
];

const LS_KEYS = {
  RESET_DONE: 'ora_crm_zero_reset_done_v3',
  CURRENT_USER: 'ora_crm_current_user_v3',
  USERS: 'ora_crm_users_v3',
  LEADS: 'ora_crm_leads_v3',
  FOLLOWUPS: 'ora_crm_followups_v3',
  PARTNERSHIPS: 'ora_crm_partnerships_v3',
  TASKS: 'ora_crm_tasks_v3',
  ISSUES: 'ora_crm_issues_v3',
  CAMPAIGNS: 'ora_crm_campaigns_v3',
  TEMPLATES: 'ora_crm_templates_v3',
  LOGS: 'ora_crm_activity_logs_v3',
  BATCHES: 'ora_crm_import_batches_v3',
  NOTIFICATIONS: 'ora_crm_notifications_v3',
  WA_CONNECTED: 'ora_crm_wa_connected_v3',
  DELETED_USER_EMAILS: 'ora_crm_deleted_user_emails_v3',
};

function performInitialBrowserStoragePurgeIfNeeded() {
  try {
    const alreadyDone = localStorage.getItem(LS_KEYS.RESET_DONE);
    if (!alreadyDone) {
      LEGACY_LS_KEYS_TO_PURGE.forEach((k) => localStorage.removeItem(k));
      localStorage.setItem(LS_KEYS.LEADS, JSON.stringify([]));
      localStorage.setItem(LS_KEYS.FOLLOWUPS, JSON.stringify([]));
      localStorage.setItem(LS_KEYS.PARTNERSHIPS, JSON.stringify([]));
      localStorage.setItem(LS_KEYS.TASKS, JSON.stringify([]));
      localStorage.setItem(LS_KEYS.ISSUES, JSON.stringify([]));
      localStorage.setItem(LS_KEYS.CAMPAIGNS, JSON.stringify([]));
      localStorage.setItem(LS_KEYS.LOGS, JSON.stringify([]));
      localStorage.setItem(LS_KEYS.BATCHES, JSON.stringify([]));
      localStorage.setItem(LS_KEYS.NOTIFICATIONS, JSON.stringify([]));
      localStorage.setItem(LS_KEYS.USERS, JSON.stringify(INITIAL_CRM_USERS));
      localStorage.setItem(LS_KEYS.CURRENT_USER, JSON.stringify(INITIAL_CRM_USERS[0]));
      localStorage.setItem(LS_KEYS.RESET_DONE, 'true');

      // Also clear any custom IndexedDB business databases if present
      if (typeof indexedDB !== 'undefined' && 'databases' in indexedDB) {
        indexedDB
          .databases()
          .then((dbs) => {
            dbs.forEach((dbInfo) => {
              if (
                dbInfo.name &&
                (dbInfo.name.includes('oraclime') || dbInfo.name.includes('ora_crm'))
              ) {
                indexedDB.deleteDatabase(dbInfo.name);
              }
            });
          })
          .catch(() => {
            // Ignore IndexedDB enumeration errors
          });
      }
    }
  } catch {
    // Ignore storage errors
  }
}

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      return JSON.parse(raw) as T;
    }
  } catch {
    // Ignore storage read error
  }
  return fallback;
}

export const CrmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Run synchronous zero-state purge before initializing React state
  performInitialBrowserStoragePurgeIfNeeded();

  const [users, setUsers] = useState<CrmUser[]>(() =>
    loadFromStorage(LS_KEYS.USERS, INITIAL_CRM_USERS)
  );
  const [deletedUserEmails, setDeletedUserEmails] = useState<string[]>(() =>
    loadFromStorage(LS_KEYS.DELETED_USER_EMAILS, [])
  );
  const [currentUser, setCurrentUser] = useState<CrmUser | null>(() => {
    const stored = loadFromStorage<CrmUser | null>(LS_KEYS.CURRENT_USER, INITIAL_CRM_USERS[0]);
    if (!stored) return null;
    // Always resolve role and active status from the authoritative users table
    const dbProfile = loadFromStorage<CrmUser[]>(LS_KEYS.USERS, INITIAL_CRM_USERS).find(
      (u) => u.id === stored.id || u.email.toLowerCase() === stored.email.toLowerCase()
    );
    if (dbProfile) {
      return dbProfile.active ? dbProfile : null;
    }
    return null;
  });

  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [cloudConnected, setCloudConnected] = useState<boolean>(false);

  const [leads, setLeads] = useState<CrmLead[]>(() =>
    loadFromStorage(LS_KEYS.LEADS, INITIAL_CRM_LEADS)
  );
  const [followUps, setFollowUps] = useState<CrmFollowUp[]>(() =>
    loadFromStorage(LS_KEYS.FOLLOWUPS, INITIAL_CRM_FOLLOWUPS)
  );
  const [partnerships, setPartnerships] = useState<CrmPartnership[]>(() =>
    loadFromStorage(LS_KEYS.PARTNERSHIPS, INITIAL_CRM_PARTNERSHIPS)
  );
  const [tasks, setTasks] = useState<CrmTask[]>(() =>
    loadFromStorage(LS_KEYS.TASKS, INITIAL_CRM_TASKS)
  );
  const [issues, setIssues] = useState<CrmIssue[]>(() =>
    loadFromStorage(LS_KEYS.ISSUES, INITIAL_CRM_ISSUES)
  );
  const [campaigns, setCampaigns] = useState<CrmCampaign[]>(() =>
    loadFromStorage(LS_KEYS.CAMPAIGNS, INITIAL_CRM_CAMPAIGNS)
  );
  const [templates, setTemplates] = useState<CrmMessageTemplate[]>(() =>
    loadFromStorage(LS_KEYS.TEMPLATES, INITIAL_CRM_TEMPLATES)
  );
  const [activityLogs, setActivityLogs] = useState<CrmActivityLog[]>(() =>
    loadFromStorage(LS_KEYS.LOGS, INITIAL_CRM_ACTIVITY_LOGS)
  );
  const [importBatches, setImportBatches] = useState<CrmImportBatch[]>(() =>
    loadFromStorage(LS_KEYS.BATCHES, INITIAL_IMPORT_BATCHES)
  );
  const [notifications, setNotifications] = useState<CrmNotification[]>(() =>
    loadFromStorage(LS_KEYS.NOTIFICATIONS, [])
  );
  const [whatsappWebConnected, setWhatsappWebConnected] = useState<boolean>(() =>
    loadFromStorage(LS_KEYS.WA_CONNECTED, true)
  );

  // Persist state locally
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEYS.CURRENT_USER, JSON.stringify(currentUser));
      localStorage.setItem(LS_KEYS.USERS, JSON.stringify(users));
      localStorage.setItem(LS_KEYS.LEADS, JSON.stringify(leads));
      localStorage.setItem(LS_KEYS.FOLLOWUPS, JSON.stringify(followUps));
      localStorage.setItem(LS_KEYS.PARTNERSHIPS, JSON.stringify(partnerships));
      localStorage.setItem(LS_KEYS.TASKS, JSON.stringify(tasks));
      localStorage.setItem(LS_KEYS.ISSUES, JSON.stringify(issues));
      localStorage.setItem(LS_KEYS.CAMPAIGNS, JSON.stringify(campaigns));
      localStorage.setItem(LS_KEYS.TEMPLATES, JSON.stringify(templates));
      localStorage.setItem(LS_KEYS.LOGS, JSON.stringify(activityLogs));
      localStorage.setItem(LS_KEYS.BATCHES, JSON.stringify(importBatches));
      localStorage.setItem(LS_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
      localStorage.setItem(LS_KEYS.WA_CONNECTED, JSON.stringify(whatsappWebConnected));
      localStorage.setItem(LS_KEYS.DELETED_USER_EMAILS, JSON.stringify(deletedUserEmails));
    } catch {
      // Ignore quota errors
    }
  }, [
    currentUser,
    users,
    deletedUserEmails,
    leads,
    followUps,
    partnerships,
    tasks,
    issues,
    campaigns,
    templates,
    activityLogs,
    importBatches,
    notifications,
    whatsappWebConnected,
  ]);

  const purgeFirestoreBusinessCollectionsOnce = async (uid: string) => {
    const cloudPurgeKey = `ora_crm_firestore_reset_v3_${uid}`;
    if (localStorage.getItem(cloudPurgeKey)) return;
    const collectionsToClear = [
      'crm_followups',
      'crm_tasks',
      'crm_partnerships',
      'crm_issues',
      'crm_campaigns',
      'crm_activity_logs',
      'crm_leads',
    ];
    for (const colName of collectionsToClear) {
      try {
        const q = query(collection(db, colName), where('createdByUid', '==', uid));
        const snap = await getDocs(q);
        for (const docSnap of snap.docs) {
          await deleteDoc(doc(db, colName, docSnap.id));
        }
      } catch {
        // Ignore if collection is already empty or inaccessible
      }
    }
    localStorage.setItem(cloudPurgeKey, 'true');
  };

  // Listen to Firebase Auth state & sync Firestore collections when authenticated
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (fbUser) => {
      setFirebaseUser(fbUser);
      setCloudConnected(Boolean(fbUser));
      if (fbUser && fbUser.email) {
        const cleanFbEmail = fbUser.email.toLowerCase();
        const isRevoked = loadFromStorage<string[]>(LS_KEYS.DELETED_USER_EMAILS, []).includes(
          cleanFbEmail
        );
        if (isRevoked) {
          firebaseSignOut(auth).catch(() => {});
          setCurrentUser(null);
          return;
        }
        const matched = users.find(
          (u) => u.email.toLowerCase() === cleanFbEmail
        );
        if (matched && !matched.active) {
          firebaseSignOut(auth).catch(() => {});
          setCurrentUser(null);
          return;
        }
        const role: UserRole =
          fbUser.email.toLowerCase() === 'amaanrisky417@gmail.com'
            ? 'ADMIN'
            : matched?.role || 'STAFF';
        const syncedUser: CrmUser = {
          id: matched?.id || fbUser.uid,
          uid: fbUser.uid,
          name: fbUser.displayName || matched?.name || 'ORACLIME User',
          email: fbUser.email,
          passwordHash: matched?.passwordHash || hashPasswordSync('Admin@123'),
          role,
          phone: matched?.phone || '+91 98100 11001',
          city: matched?.city || 'New Delhi',
          assignedManagerId: matched?.assignedManagerId || '',
          active: true,
          lastLoginAt: new Date().toISOString(),
          createdAt: matched?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setCurrentUser(syncedUser);

        // Perform one-time Firestore business collection purge so cloud starts from zero
        purgeFirestoreBusinessCollectionsOnce(fbUser.uid).catch(() => {});

        // Sync user profile to Firestore /crm_users/{uid}
        const userPath = `crm_users/${fbUser.uid}`;
        setDoc(doc(db, 'crm_users', fbUser.uid), {
          id: syncedUser.id,
          uid: syncedUser.uid,
          name: syncedUser.name.slice(0, 120),
          email: syncedUser.email.slice(0, 180),
          passwordHash: (syncedUser.passwordHash || '').slice(0, 128),
          role: syncedUser.role,
          phone: syncedUser.phone.slice(0, 30),
          city: syncedUser.city.slice(0, 80),
          assignedManagerId: syncedUser.assignedManagerId.slice(0, 128),
          active: true,
          lastLoginAt: syncedUser.lastLoginAt,
          createdAt: syncedUser.createdAt,
          updatedAt: syncedUser.updatedAt,
        }).catch((err) => handleFirestoreError(err, OperationType.WRITE, userPath));
      }
    });
    return () => unsubAuth();
  }, []);

  // Attach Firestore listener for user's leads when signed in with Firebase Auth
  useEffect(() => {
    if (!firebaseUser) return;
    const leadsQuery = query(
      collection(db, 'crm_leads'),
      where('createdByUid', '==', firebaseUser.uid)
    );
    const unsubLeads = onSnapshot(
      leadsQuery,
      (snapshot) => {
        if (!snapshot.empty) {
          const remoteLeads = snapshot.docs.map((d) => d.data() as CrmLead);
          setLeads((prev) => {
            const byId = new Map(prev.map((l) => [l.id, l]));
            remoteLeads.forEach((rl) => byId.set(rl.id, rl));
            return Array.from(byId.values());
          });
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'crm_leads');
      }
    );
    return () => unsubLeads();
  }, [firebaseUser]);

  const syncLeadToFirestoreIfConnected = (lead: CrmLead) => {
    if (!firebaseUser) return;
    const safeId = lead.id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
    const payload = {
      id: safeId,
      leadCode: (lead.leadCode || 'ORA-LD').slice(0, 40),
      showroomName: (lead.showroomName || 'Showroom').slice(0, 200),
      businessName: (lead.businessName || '').slice(0, 200),
      ownerName: (lead.ownerName || '').slice(0, 140),
      contactPerson: (lead.contactPerson || '').slice(0, 140),
      whatsappNumber: (lead.whatsappNumber || '').slice(0, 30),
      normalizedPhone: (lead.normalizedPhone || '').slice(0, 20),
      formattedPhone: (lead.formattedPhone || '').slice(0, 30),
      isValidPhone: Boolean(lead.isValidPhone),
      alternativeNumber: (lead.alternativeNumber || '').slice(0, 30),
      email: (lead.email || '').slice(0, 180),
      city: (lead.city || 'New Delhi').slice(0, 100),
      state: (lead.state || 'Delhi').slice(0, 100),
      fullAddress: (lead.fullAddress || '').slice(0, 500),
      businessCategory: lead.businessCategory || 'AC Showroom',
      leadSource: (lead.leadSource || 'Manual').slice(0, 100),
      assignedManager: (lead.assignedManager || '').slice(0, 128),
      assignedStaff: (lead.assignedStaff || '').slice(0, 128),
      priority: lead.priority || 'Medium',
      status: lead.status || 'New Lead',
      createdDate: (lead.createdDate || new Date().toISOString()).slice(0, 64),
      lastContactDate: (lead.lastContactDate || '').slice(0, 64),
      nextFollowUpDate: (lead.nextFollowUpDate || '').slice(0, 64),
      remarks: (lead.remarks || '').slice(0, 2000),
      optedOut: Boolean(lead.optedOut),
      isDeleted: Boolean(lead.isDeleted),
      deletedAt: (lead.deletedAt || '').slice(0, 64),
      deletedBy: (lead.deletedBy || '').slice(0, 128),
      deletionReason: (lead.deletionReason || '').slice(0, 500),
      createdByUid: firebaseUser.uid,
    };
    setDoc(doc(db, 'crm_leads', safeId), payload).catch((err) =>
      handleFirestoreError(err, OperationType.WRITE, `crm_leads/${safeId}`)
    );
  };

  const pushNotification = (title: string, message: string) => {
    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        title,
        message,
        read: false,
        timestamp: new Date().toISOString(),
      },
      ...prev.slice(0, 29),
    ]);
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const logActivity = (
    actionType: CrmActivityLog['actionType'],
    details: string,
    leadId = '',
    showroomName = ''
  ) => {
    const newEntry: CrmActivityLog = {
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      leadId,
      showroomName,
      actionType,
      details: details.slice(0, 1500),
      performedBy: currentUser?.name || 'System User',
      performedByRole: currentUser?.role || 'STAFF',
      createdByUid: firebaseUser?.uid || currentUser?.uid || 'usr-admin-1',
      timestamp: new Date().toISOString(),
    };
    setActivityLogs((prev) => [newEntry, ...prev]);

    if (firebaseUser) {
      setDoc(doc(db, 'crm_activity_logs', newEntry.id), {
        id: newEntry.id,
        leadId: newEntry.leadId.slice(0, 128),
        showroomName: newEntry.showroomName.slice(0, 200),
        actionType: newEntry.actionType.slice(0, 100),
        details: newEntry.details.slice(0, 1500),
        performedBy: newEntry.performedBy.slice(0, 140),
        performedByRole: newEntry.performedByRole,
        createdByUid: firebaseUser.uid,
        timestamp: newEntry.timestamp,
      }).catch((err) =>
        handleFirestoreError(err, OperationType.CREATE, `crm_activity_logs/${newEntry.id}`)
      );
    }
  };

  const loginWithEmailPassword = (email: string, password: string) => {
    const cleanEmail = email.trim().toLowerCase();
    if (deletedUserEmails.includes(cleanEmail)) {
      return {
        ok: false,
        error: 'Access Revoked: This user account has been deleted by an Administrator and can no longer log in.',
      };
    }
    const matched = users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!matched) {
      return {
        ok: false,
        error: 'Account not found or deleted. Please check your corporate email address or contact the ORACLIME Administrator.',
      };
    }
    if (!matched.active) {
      return {
        ok: false,
        error: 'Access Denied: Your ORA CRM account has been deactivated by an Administrator.',
      };
    }
    if (!verifyPasswordHash(password, matched.passwordHash)) {
      return {
        ok: false,
        error: 'Invalid password for this ORA CRM account.',
      };
    }
    const updated: CrmUser = {
      ...matched,
      lastLoginAt: new Date().toISOString(),
    };
    setUsers((prev) => prev.map((u) => (u.id === matched.id ? updated : u)));
    setCurrentUser(updated);
    logActivity(
      'User Login',
      `${updated.name} (${updated.role}) authenticated and routed to ${updated.role} Dashboard.`
    );
    return { ok: true, role: updated.role };
  };

  const loginWithGoogleCloud = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const logout = async () => {
    if (firebaseUser) {
      await firebaseSignOut(auth);
    }
    setCurrentUser(null);
  };

  const changePassword = (newPassword: string) => {
    if (!currentUser) return;
    const hashed = hashPasswordSync(newPassword);
    const updated: CrmUser = {
      ...currentUser,
      passwordHash: hashed,
      updatedAt: new Date().toISOString(),
    };
    setCurrentUser(updated);
    setUsers((prev) => prev.map((u) => (u.id === currentUser.id ? updated : u)));
  };

  const createUserAccount = (input: {
    name: string;
    email: string;
    passwordPlain: string;
    role: UserRole;
    phone: string;
    city: string;
    assignedManagerId: string;
    active: boolean;
  }): { ok: boolean; error?: string; user?: CrmUser } => {
    if (currentUser?.role !== 'ADMIN') {
      return { ok: false, error: 'Only ADMIN users can create new user accounts.' };
    }
    const normalizedEmail = input.email.trim().toLowerCase();
    if (!normalizedEmail) {
      return { ok: false, error: 'Email address is required.' };
    }
    const duplicate = users.some((u) => u.email.toLowerCase() === normalizedEmail);
    if (duplicate) {
      return {
        ok: false,
        error: `An account with email "${normalizedEmail}" already exists. Duplicate email accounts are prevented.`,
      };
    }

    const id = `usr-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    const now = new Date().toISOString();
    const hashedPassword = hashPasswordSync(input.passwordPlain);
    const newUser: CrmUser = {
      id,
      uid: id,
      name: input.name.trim(),
      email: normalizedEmail,
      passwordHash: hashedPassword,
      role: input.role,
      phone: input.phone.trim() || '+91 98100 00000',
      city: input.city.trim() || 'New Delhi',
      assignedManagerId: input.assignedManagerId || '',
      active: input.active,
      lastLoginAt: '',
      createdAt: now,
      updatedAt: now,
    };

    setUsers((prev) => [...prev, newUser]);
    setDeletedUserEmails((prev) =>
      prev.filter((em) => em !== normalizedEmail)
    );

    if (firebaseUser) {
      setDoc(doc(db, 'crm_users', id), {
        id: newUser.id,
        uid: newUser.uid,
        name: newUser.name.slice(0, 120),
        email: newUser.email.slice(0, 180),
        passwordHash: (newUser.passwordHash || '').slice(0, 128),
        role: newUser.role,
        phone: newUser.phone.slice(0, 30),
        city: newUser.city.slice(0, 80),
        assignedManagerId: newUser.assignedManagerId.slice(0, 128),
        active: newUser.active,
        lastLoginAt: '',
        createdAt: newUser.createdAt,
        updatedAt: newUser.updatedAt,
      }).catch((err) => handleFirestoreError(err, OperationType.CREATE, `crm_users/${id}`));
    }

    pushNotification(
      'New User Created',
      `Created ${newUser.role} account for ${newUser.name} (${newUser.email}).`
    );
    return { ok: true, user: newUser };
  };

  const updateUserAccount = (
    id: string,
    patch: Partial<CrmUser>
  ): { ok: boolean; error?: string } => {
    if (currentUser?.role !== 'ADMIN') {
      return { ok: false, error: 'Only ADMIN users can modify user accounts.' };
    }
    if (patch.email) {
      const normalizedEmail = patch.email.trim().toLowerCase();
      const duplicate = users.some(
        (u) => u.id !== id && u.email.toLowerCase() === normalizedEmail
      );
      if (duplicate) {
        return {
          ok: false,
          error: `Another user already uses email "${normalizedEmail}".`,
        };
      }
      patch.email = normalizedEmail;
    }

    const now = new Date().toISOString();
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== id) return u;
        const updated = { ...u, ...patch, updatedAt: now };
        if (firebaseUser) {
          setDoc(doc(db, 'crm_users', u.id), {
            id: updated.id,
            uid: updated.uid,
            name: updated.name.slice(0, 120),
            email: updated.email.slice(0, 180),
            passwordHash: (updated.passwordHash || '').slice(0, 128),
            role: updated.role,
            phone: updated.phone.slice(0, 30),
            city: updated.city.slice(0, 80),
            assignedManagerId: updated.assignedManagerId.slice(0, 128),
            active: updated.active,
            lastLoginAt: updated.lastLoginAt || '',
            createdAt: updated.createdAt,
            updatedAt: updated.updatedAt,
          }).catch(() => {});
        }
        return updated;
      })
    );

    if (currentUser?.id === id) {
      setCurrentUser((prev) => (prev ? { ...prev, ...patch, updatedAt: now } : null));
    }
    return { ok: true };
  };

  const adminResetUserPassword = (
    userId: string,
    newPasswordPlain: string
  ): { ok: boolean; error?: string } => {
    if (currentUser?.role !== 'ADMIN') {
      return { ok: false, error: 'Only ADMIN users can reset user passwords.' };
    }
    if (!newPasswordPlain || newPasswordPlain.trim().length < 6) {
      return { ok: false, error: 'Password must be at least 6 characters.' };
    }
    const hashed = hashPasswordSync(newPasswordPlain.trim());
    return updateUserAccount(userId, { passwordHash: hashed });
  };

  const adminDeleteUserAccount = (
    userId: string,
    options?: {
      leadHandling: 'unassign' | 'reassign';
      reassignToUserName?: string;
    }
  ): { ok: boolean; error?: string; affectedLeadsCount?: number } => {
    // 1. Only ADMIN can delete user accounts
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return {
        ok: false,
        error: 'Security Rule: Only ADMIN users can delete user accounts.',
      };
    }

    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) {
      return { ok: false, error: 'User account not found.' };
    }

    // 2. Prevent self-deletion
    if (
      targetUser.id === currentUser.id ||
      targetUser.email.toLowerCase() === currentUser.email.toLowerCase()
    ) {
      return {
        ok: false,
        error: 'Security Rule: You cannot delete your own currently logged-in account.',
      };
    }

    // 3. Never allow deletion of the last active Admin account
    if (targetUser.role === 'ADMIN') {
      const remainingActiveAdmins = users.filter(
        (u) => u.role === 'ADMIN' && u.active && u.id !== targetUser.id
      );
      if (remainingActiveAdmins.length < 1) {
        return {
          ok: false,
          error: 'Security Rule: Cannot delete the last active ADMIN account.',
        };
      }
    }

    // 4. Safely handle related lead assignments (never delete leads or business records)
    const targetNameLower = targetUser.name.trim().toLowerCase();
    const replacementAssignee =
      options?.leadHandling === 'reassign' && options.reassignToUserName?.trim()
        ? options.reassignToUserName.trim()
        : 'Unassigned';

    let affectedLeadsCount = 0;
    setLeads((prev) =>
      prev.map((lead) => {
        const isStaffMatch = lead.assignedStaff.trim().toLowerCase() === targetNameLower;
        const isMgrMatch = lead.assignedManager.trim().toLowerCase() === targetNameLower;
        if (!isStaffMatch && !isMgrMatch) return lead;
        affectedLeadsCount += 1;
        const updatedLead: CrmLead = {
          ...lead,
          assignedStaff: isStaffMatch ? replacementAssignee : lead.assignedStaff,
          assignedManager: isMgrMatch ? replacementAssignee : lead.assignedManager,
        };
        syncLeadToFirestoreIfConnected(updatedLead);
        return updatedLead;
      })
    );

    // Safely update related follow-ups, tasks, partnerships, and issues without deleting them
    setFollowUps((prev) =>
      prev.map((f) =>
        f.assignedStaff.trim().toLowerCase() === targetNameLower
          ? { ...f, assignedStaff: replacementAssignee }
          : f
      )
    );
    setTasks((prev) =>
      prev.map((t) =>
        t.assignedStaff.trim().toLowerCase() === targetNameLower
          ? { ...t, assignedStaff: replacementAssignee }
          : t
      )
    );
    setPartnerships((prev) =>
      prev.map((p) =>
        p.assignedManager.trim().toLowerCase() === targetNameLower
          ? { ...p, assignedManager: replacementAssignee }
          : p
      )
    );
    setIssues((prev) =>
      prev.map((iss) =>
        iss.assignedPerson.trim().toLowerCase() === targetNameLower
          ? { ...iss, assignedPerson: replacementAssignee }
          : iss
      )
    );

    // 5. Remove user profile, clear manager reference on reporting staff, and revoke login access
    const normalizedTargetEmail = targetUser.email.trim().toLowerCase();
    setDeletedUserEmails((prev) =>
      prev.includes(normalizedTargetEmail) ? prev : [...prev, normalizedTargetEmail]
    );
    setUsers((prev) =>
      prev
        .filter((u) => u.id !== targetUser.id)
        .map((u) =>
          u.assignedManagerId === targetUser.id ? { ...u, assignedManagerId: '' } : u
        )
    );

    // Delete from Firestore /crm_users/{userId} if cloud connected
    if (firebaseUser) {
      deleteDoc(doc(db, 'crm_users', targetUser.id)).catch((err) =>
        handleFirestoreError(err, OperationType.DELETE, `crm_users/${targetUser.id}`)
      );
    }

    // 6. Record immutable audit log entry
    const deletedAtIso = new Date().toISOString();
    logActivity(
      'User Account Deleted',
      `Admin ${currentUser.name} (${currentUser.email}) deleted user account "${targetUser.name}" (${targetUser.email}, Role: ${targetUser.role}) at ${new Date(deletedAtIso).toLocaleString('en-IN')}. Active login access revoked. Related leads (${affectedLeadsCount}) preserved and set to "${replacementAssignee}".`
    );

    pushNotification(
      'User Account Deleted',
      `Deleted ${targetUser.role} account ${targetUser.name} (${targetUser.email}). ${affectedLeadsCount} lead(s) set to ${replacementAssignee}.`
    );

    return { ok: true, affectedLeadsCount };
  };

  const executeFullBusinessDataReset = async () => {
    if (currentUser?.role !== 'ADMIN') return;
    setFollowUps([]);
    setTasks([]);
    setPartnerships([]);
    setIssues([]);
    setCampaigns([]);
    setActivityLogs([]);
    setImportBatches([]);
    setNotifications([]);
    setLeads([]);

    LEGACY_LS_KEYS_TO_PURGE.forEach((k) => localStorage.removeItem(k));
    localStorage.setItem(LS_KEYS.LEADS, JSON.stringify([]));
    localStorage.setItem(LS_KEYS.FOLLOWUPS, JSON.stringify([]));
    localStorage.setItem(LS_KEYS.PARTNERSHIPS, JSON.stringify([]));
    localStorage.setItem(LS_KEYS.TASKS, JSON.stringify([]));
    localStorage.setItem(LS_KEYS.ISSUES, JSON.stringify([]));
    localStorage.setItem(LS_KEYS.CAMPAIGNS, JSON.stringify([]));
    localStorage.setItem(LS_KEYS.LOGS, JSON.stringify([]));
    localStorage.setItem(LS_KEYS.BATCHES, JSON.stringify([]));
    localStorage.setItem(LS_KEYS.NOTIFICATIONS, JSON.stringify([]));

    if (firebaseUser) {
      localStorage.removeItem(`ora_crm_firestore_reset_v3_${firebaseUser.uid}`);
      await purgeFirestoreBusinessCollectionsOnce(firebaseUser.uid);
    }
  };

  const createLead = (input: Partial<CrmLead>): CrmLead => {
    const phoneCheck = validateAndFormatLeadPhone(input.whatsappNumber || '');
    const id = `lead-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    const nextCodeNum = 1001 + leads.length;
    const newLead: CrmLead = {
      id,
      leadCode: input.leadCode || `ORA-LD-${nextCodeNum}`,
      showroomName: input.showroomName?.trim() || 'Unnamed AC Showroom',
      businessName: input.businessName?.trim() || input.showroomName?.trim() || '',
      ownerName: input.ownerName?.trim() || '',
      contactPerson: input.contactPerson?.trim() || input.ownerName?.trim() || '',
      whatsappNumber: phoneCheck.raw || input.whatsappNumber || '',
      normalizedPhone: phoneCheck.normalized,
      formattedPhone: phoneCheck.formatted,
      isValidPhone: phoneCheck.isValid,
      alternativeNumber: input.alternativeNumber?.trim() || '',
      email: input.email?.trim() || '',
      city: input.city?.trim() || 'New Delhi',
      state: input.state?.trim() || 'Delhi',
      fullAddress: input.fullAddress?.trim() || '',
      businessCategory: input.businessCategory || 'AC Showroom',
      leadSource: input.leadSource || 'Direct Entry',
      assignedManager: input.assignedManager || 'Vikram Rathore',
      assignedStaff: input.assignedStaff || currentUser?.name || 'Rohit Sharma',
      priority: input.priority || 'Medium',
      status: phoneCheck.isValid ? input.status || 'New Lead' : 'Invalid Lead',
      createdDate: new Date().toISOString(),
      lastContactDate: input.lastContactDate || '',
      nextFollowUpDate: input.nextFollowUpDate || '',
      remarks: input.remarks || '',
      optedOut: false,
      isDeleted: false,
      deletedAt: '',
      deletedBy: '',
      deletionReason: '',
      createdByUid: firebaseUser?.uid || currentUser?.uid || 'usr-admin-1',
    };

    setLeads((prev) => [newLead, ...prev]);
    syncLeadToFirestoreIfConnected(newLead);
    logActivity(
      'Lead Created',
      `Created lead ${newLead.leadCode} (${newLead.showroomName}, ${newLead.city}).`,
      newLead.id,
      newLead.showroomName
    );
    return newLead;
  };

  const updateLead = (id: string, patch: Partial<CrmLead>, logNote?: string) => {
    setLeads((prev) =>
      prev.map((lead) => {
        if (lead.id !== id) return lead;
        const updated = { ...lead, ...patch };
        if (patch.whatsappNumber !== undefined) {
          const check = validateAndFormatLeadPhone(patch.whatsappNumber);
          updated.normalizedPhone = check.normalized;
          updated.formattedPhone = check.formatted;
          updated.isValidPhone = check.isValid;
        }
        syncLeadToFirestoreIfConnected(updated);
        logActivity(
          'Lead Edited',
          logNote || `Updated lead details for ${updated.showroomName}.`,
          updated.id,
          updated.showroomName
        );
        return updated;
      })
    );
  };

  const moveLeadStage = (id: string, newStage: LeadStageStatus, note?: string) => {
    setLeads((prev) =>
      prev.map((lead) => {
        if (lead.id !== id) return lead;
        const oldStage = lead.status;
        if (oldStage === newStage) return lead;
        const updated: CrmLead = {
          ...lead,
          status: newStage,
          lastContactDate: new Date().toISOString(),
        };
        syncLeadToFirestoreIfConnected(updated);
        logActivity(
          'Status Changed',
          `Stage moved from "${oldStage}" to "${newStage}"${note ? ` (${note})` : ''}.`,
          updated.id,
          updated.showroomName
        );
        return updated;
      })
    );
  };

  const bulkAssignLeads = (
    leadIds: string[],
    assignedManager: string,
    assignedStaff: string
  ) => {
    if (currentUser?.role === 'STAFF') return;
    const idSet = new Set(leadIds);
    setLeads((prev) =>
      prev.map((lead) => {
        if (!idSet.has(lead.id)) return lead;
        const updated: CrmLead = {
          ...lead,
          assignedManager: assignedManager || lead.assignedManager,
          assignedStaff: assignedStaff || lead.assignedStaff,
        };
        syncLeadToFirestoreIfConnected(updated);
        return updated;
      })
    );
    logActivity(
      'Lead Assigned',
      `Bulk assigned ${leadIds.length} leads to Manager: ${assignedManager || 'Unchanged'}, Staff: ${assignedStaff || 'Unchanged'}.`
    );
    pushNotification(
      'Leads Assigned',
      `Assigned ${leadIds.length} showroom lead(s) to ${assignedStaff || assignedManager}.`
    );
  };

  const bulkUpdateLeadStatus = (leadIds: string[], status: LeadStageStatus) => {
    const idSet = new Set(leadIds);
    setLeads((prev) =>
      prev.map((lead) => {
        if (!idSet.has(lead.id)) return lead;
        const updated: CrmLead = { ...lead, status };
        syncLeadToFirestoreIfConnected(updated);
        return updated;
      })
    );
    logActivity(
      'Status Changed',
      `Bulk updated ${leadIds.length} leads to status "${status}".`
    );
  };

  const softDeleteLeads = (leadIds: string[], reason: string) => {
    if (currentUser?.role === 'STAFF') return;
    const idSet = new Set(leadIds);
    const now = new Date().toISOString();
    setLeads((prev) =>
      prev.map((lead) => {
        if (!idSet.has(lead.id)) return lead;
        const updated: CrmLead = {
          ...lead,
          isDeleted: true,
          deletedAt: now,
          deletedBy: currentUser?.name || 'User',
          deletionReason: reason || 'Moved to Recycle Bin',
        };
        syncLeadToFirestoreIfConnected(updated);
        return updated;
      })
    );
    logActivity(
      'Lead Deleted',
      `Moved ${leadIds.length} lead(s) to Recycle Bin. Reason: ${reason}`
    );
  };

  const restoreLeads = (leadIds: string[]) => {
    if (currentUser?.role === 'STAFF') return;
    const idSet = new Set(leadIds);
    setLeads((prev) =>
      prev.map((lead) => {
        if (!idSet.has(lead.id)) return lead;
        const updated: CrmLead = {
          ...lead,
          isDeleted: false,
          deletedAt: '',
          deletedBy: '',
          deletionReason: '',
        };
        syncLeadToFirestoreIfConnected(updated);
        return updated;
      })
    );
    logActivity(
      'Lead Restored',
      `Restored ${leadIds.length} lead(s) from Recycle Bin.`
    );
  };

  const permanentDeleteLeads = (leadIds: string[]) => {
    if (currentUser?.role !== 'ADMIN') return;
    const idSet = new Set(leadIds);
    setLeads((prev) => prev.filter((lead) => !idSet.has(lead.id)));
    logActivity(
      'Lead Deleted',
      `Permanently purged ${leadIds.length} lead(s) from Recycle Bin by Admin.`
    );
  };

  const importLeadsBatch = (
    newLeads: CrmLead[],
    batchMeta: Omit<CrmImportBatch, 'id' | 'timestamp' | 'importedBy'>
  ) => {
    setLeads((prev) => [...newLeads, ...prev]);
    newLeads.slice(0, 25).forEach((l) => syncLeadToFirestoreIfConnected(l));

    const batchRecord: CrmImportBatch = {
      ...batchMeta,
      id: `batch-${Date.now()}`,
      importedBy: currentUser?.name || 'Admin',
      timestamp: new Date().toISOString(),
    };
    setImportBatches((prev) => [batchRecord, ...prev]);
    logActivity(
      'Excel Import',
      `Imported ${batchMeta.importedCount} leads from "${batchMeta.fileName}" (${batchMeta.duplicateCount} duplicates, ${batchMeta.invalidCount} invalid).`
    );
    pushNotification(
      'Excel Import Completed',
      `Imported ${batchMeta.importedCount} showroom leads from ${batchMeta.fileName}.`
    );
  };

  const recordWhatsAppChatOpened = (leadId: string, campaignId?: string) => {
    const now = new Date().toISOString();
    const target = leads.find((l) => l.id === leadId);
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, chatOpenedAt: now } : l))
    );
    if (campaignId) {
      setCampaigns((prev) =>
        prev.map((c) => {
          if (c.id !== campaignId) return c;
          const openedSet = new Set([...c.chatsOpenedIds, leadId]);
          const chatsOpenedIds = Array.from(openedSet);
          return {
            ...c,
            chatsOpenedIds,
            chatsOpenedCount: chatsOpenedIds.length,
          };
        })
      );
    }
    logActivity(
      'WhatsApp Chat Opened',
      `Opened official WhatsApp Click-to-Chat link for ${target?.showroomName || leadId} (Not yet marked as sent).`,
      leadId,
      target?.showroomName
    );
  };

  const recordWhatsAppMessageConfirmed = (leadId: string, campaignId?: string) => {
    const now = new Date().toISOString();
    const target = leads.find((l) => l.id === leadId);
    setLeads((prev) =>
      prev.map((l) => {
        if (l.id !== leadId) return l;
        const nextStatus: LeadStageStatus =
          l.status === 'New Lead' || l.status === 'Not Contacted'
            ? 'Message Sent'
            : l.status;
        const updated: CrmLead = {
          ...l,
          status: nextStatus,
          lastContactDate: now,
          messageConfirmedAt: now,
        };
        syncLeadToFirestoreIfConnected(updated);
        return updated;
      })
    );

    if (campaignId) {
      setCampaigns((prev) =>
        prev.map((c) => {
          if (c.id !== campaignId) return c;
          const sentSet = new Set([...c.confirmedSentIds, leadId]);
          const openedSet = new Set([...c.chatsOpenedIds, leadId]);
          const confirmedSentIds = Array.from(sentSet);
          const chatsOpenedIds = Array.from(openedSet);
          const pendingCount = Math.max(
            0,
            c.selectedCount - confirmedSentIds.length - c.skippedIds.length
          );
          return {
            ...c,
            chatsOpenedIds,
            confirmedSentIds,
            chatsOpenedCount: chatsOpenedIds.length,
            confirmedSentCount: confirmedSentIds.length,
            pendingCount,
          };
        })
      );
    }

    logActivity(
      'Message Manually Confirmed',
      `Manually confirmed WhatsApp message sent to ${target?.showroomName || leadId}.`,
      leadId,
      target?.showroomName
    );
  };

  const createCampaign = (input: Omit<CrmCampaign, 'id' | 'createdByUid'>): CrmCampaign => {
    const newCamp: CrmCampaign = {
      ...input,
      id: `cmp-${Date.now()}`,
      createdByUid: firebaseUser?.uid || currentUser?.uid || 'usr-admin-1',
    };
    setCampaigns((prev) => [newCamp, ...prev]);
    pushNotification('Campaign Created', `Outreach campaign "${newCamp.name}" created.`);
    return newCamp;
  };

  const updateCampaign = (id: string, patch: Partial<CrmCampaign>) => {
    setCampaigns((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const saveMessageTemplate = (
    tpl: Omit<CrmMessageTemplate, 'id' | 'updatedAt'> & { id?: string }
  ) => {
    const now = new Date().toISOString();
    if (tpl.id) {
      setTemplates((prev) =>
        prev.map((item) =>
          item.id === tpl.id
            ? { ...item, ...tpl, id: tpl.id, updatedAt: now }
            : tpl.isDefault
            ? { ...item, isDefault: false }
            : item
        )
      );
    } else {
      const created: CrmMessageTemplate = {
        ...tpl,
        id: `tpl-${Date.now()}`,
        updatedAt: now,
      };
      setTemplates((prev) => [
        ...(tpl.isDefault ? prev.map((i) => ({ ...i, isDefault: false })) : prev),
        created,
      ]);
    }
  };

  const deleteMessageTemplate = (id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  const createFollowUp = (
    input: Omit<CrmFollowUp, 'id' | 'createdByUid' | 'createdAt'>
  ) => {
    const newFup: CrmFollowUp = {
      ...input,
      id: `fup-${Date.now()}`,
      createdByUid: firebaseUser?.uid || currentUser?.uid || 'usr-admin-1',
      createdAt: new Date().toISOString(),
    };
    setFollowUps((prev) => [newFup, ...prev]);
    updateLead(
      input.leadId,
      {
        nextFollowUpDate: input.scheduledAt,
        status: 'Follow-up Pending',
      },
      `Scheduled follow-up for ${new Date(input.scheduledAt).toLocaleString('en-IN')}`
    );
    logActivity(
      'Follow-up Created',
      `Scheduled follow-up for ${input.showroomName} assigned to ${input.assignedStaff}.`,
      input.leadId,
      input.showroomName
    );
  };

  const updateFollowUp = (id: string, patch: Partial<CrmFollowUp>) => {
    setFollowUps((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f;
        const updated = { ...f, ...patch };
        if (patch.callOutcome || patch.status === 'Completed') {
          logActivity(
            'Call Recorded',
            `Follow-up updated for ${updated.showroomName}: ${patch.callOutcome || updated.status}.`,
            updated.leadId,
            updated.showroomName
          );
        }
        return updated;
      })
    );
  };

  const convertLeadToPartnership = (
    leadId: string,
    terms: Partial<CrmPartnership>
  ): CrmPartnership | null => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return null;

    const created: CrmPartnership = {
      id: `part-${Date.now()}`,
      partnershipCode: `ORA-PTN-${501 + partnerships.length}`,
      leadId: lead.id,
      showroomName: lead.showroomName,
      ownerName: lead.ownerName || lead.contactPerson,
      contactDetails: `${lead.formattedPhone}${lead.email ? ` · ${lead.email}` : ''}`,
      city: lead.city,
      partnershipDate: new Date().toISOString().slice(0, 10),
      status: terms.status || 'Active Partner',
      agreedCommissionTerms:
        terms.agreedCommissionTerms ||
        '₹300 per Split AC Installation · ₹200 per Window AC Installation · 15% on Servicing',
      serviceCategories:
        terms.serviceCategories ||
        'Split AC Installation, Window AC Installation, AC Repair, AC Servicing, AC Maintenance',
      agreementNotes: terms.agreementNotes || 'Converted from Lead Pipeline.',
      assignedManager: terms.assignedManager || lead.assignedManager || 'Vikram Rathore',
      nextReviewDate:
        terms.nextReviewDate ||
        new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      createdByUid: firebaseUser?.uid || currentUser?.uid || 'usr-admin-1',
    };

    setPartnerships((prev) => [created, ...prev]);
    moveLeadStage(lead.id, 'Partnership Confirmed', `Converted to ${created.partnershipCode}`);
    logActivity(
      'Partnership Created',
      `Created Partnership ${created.partnershipCode} for ${lead.showroomName} (${created.status}).`,
      lead.id,
      lead.showroomName
    );
    pushNotification(
      'Partnership Confirmed',
      `${lead.showroomName} converted to ORACLIME Partner (${created.partnershipCode}).`
    );
    return created;
  };

  const updatePartnership = (id: string, patch: Partial<CrmPartnership>) => {
    setPartnerships((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...patch } : p))
    );
  };

  const createTask = (input: Omit<CrmTask, 'id' | 'createdByUid' | 'createdAt'>) => {
    const created: CrmTask = {
      ...input,
      id: `tsk-${Date.now()}`,
      createdByUid: firebaseUser?.uid || currentUser?.uid || 'usr-admin-1',
      createdAt: new Date().toISOString(),
    };
    setTasks((prev) => [created, ...prev]);
  };

  const updateTask = (id: string, patch: Partial<CrmTask>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };

  const createIssue = (input: Omit<CrmIssue, 'id' | 'createdByUid' | 'createdAt'>) => {
    const created: CrmIssue = {
      ...input,
      id: `iss-${Date.now()}`,
      createdByUid: firebaseUser?.uid || currentUser?.uid || 'usr-admin-1',
      createdAt: new Date().toISOString(),
    };
    setIssues((prev) => [created, ...prev]);
    logActivity(
      'Issue Created',
      `Logged ${created.category} issue for ${created.showroomName || 'General'}: ${created.description}`,
      created.leadId,
      created.showroomName
    );
  };

  const updateIssue = (id: string, patch: Partial<CrmIssue>) => {
    setIssues((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  };

  const activeLeads = useMemo(
    () => leads.filter((l) => !l.isDeleted),
    [leads]
  );

  const deletedLeads = useMemo(
    () => leads.filter((l) => l.isDeleted),
    [leads]
  );

  // Role-scoped lead visibility:
  // ADMIN sees all active leads; MANAGER sees team/all leads; STAFF sees only leads assigned to them
  const visibleLeads = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'ADMIN' || currentUser.role === 'MANAGER') {
      return activeLeads;
    }
    return activeLeads.filter(
      (l) =>
        l.assignedStaff.toLowerCase() === currentUser.name.toLowerCase() ||
        l.createdByUid === currentUser.uid
    );
  }, [activeLeads, currentUser]);

  return (
    <CrmContext.Provider
      value={{
        currentUser,
        firebaseUser,
        cloudConnected,
        users,
        leads,
        activeLeads,
        deletedLeads,
        visibleLeads,
        followUps,
        partnerships,
        tasks,
        issues,
        campaigns,
        templates,
        activityLogs,
        importBatches,
        notifications,
        whatsappWebConnected,
        setWhatsappWebConnected,
        dataResetSummary: DATA_RESET_AUDIT_SUMMARY,
        loginWithEmailPassword,
        loginWithGoogleCloud,
        logout,
        changePassword,
        createUserAccount,
        updateUserAccount,
        adminResetUserPassword,
        adminDeleteUserAccount,
        executeFullBusinessDataReset,
        markAllNotificationsRead,
        createLead,
        updateLead,
        moveLeadStage,
        bulkAssignLeads,
        bulkUpdateLeadStatus,
        softDeleteLeads,
        restoreLeads,
        permanentDeleteLeads,
        importLeadsBatch,
        recordWhatsAppChatOpened,
        recordWhatsAppMessageConfirmed,
        createCampaign,
        updateCampaign,
        saveMessageTemplate,
        deleteMessageTemplate,
        createFollowUp,
        updateFollowUp,
        convertLeadToPartnership,
        updatePartnership,
        createTask,
        updateTask,
        createIssue,
        updateIssue,
        logActivity,
      }}
    >
      {children}
    </CrmContext.Provider>
  );
};

export function useCrm() {
  const ctx = useContext(CrmContext);
  if (!ctx) {
    throw new Error('useCrm must be used inside CrmProvider');
  }
  return ctx;
}
