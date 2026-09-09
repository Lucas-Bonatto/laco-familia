import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { createInitialSnapshot } from '../data/initial';
import {
  createCloudFamily,
  deleteCloudEvent,
  insertCloudEvent,
  insertCloudMemory,
  insertCloudWater,
  joinCloudFamily,
  loadCloudSnapshot,
  revokeCloudFamilyInvite,
  rotateCloudFamilyInvite,
  type NewCloudEvent,
  type NewCloudMemory,
} from '../services/cloud';
import { clearEventReminders, reconcileEventReminders } from '../services/notifications';
import { clearLocalUserData, purgeLegacySensitiveSnapshots } from '../services/storage';
import { isSupabaseConfigured, supabase } from '../services/supabase';
import type { AppSnapshot, SyncStatus } from '../types';

type AppContextValue = AppSnapshot & {
  session: Session | null;
  currentUserId: string;
  suggestedDisplayName: string;
  authReady: boolean;
  hydrated: boolean;
  syncStatus: SyncStatus;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (displayName: string, email: string, password: string) => Promise<{ needsEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
  createFamily: (displayName: string, familyName: string) => Promise<void>;
  joinFamily: (displayName: string, inviteCode: string) => Promise<void>;
  rotateFamilyInvite: () => Promise<void>;
  revokeFamilyInvite: () => Promise<void>;
  completeOnboarding: (name: string, familyName: string) => Promise<void>;
  refresh: () => Promise<void>;
  setActiveMemberId: (memberId: string) => void;
  addEvent: (event: NewCloudEvent) => Promise<void>;
  removeEvent: (eventId: string) => Promise<void>;
  addWater: (amountMl: number, memberId?: string) => Promise<void>;
  addMemory: (memory: NewCloudMemory) => Promise<void>;
  waterTotalFor: (memberId: string) => number;
};

const AppContext = createContext<AppContextValue | null>(null);

function isToday(iso: string) {
  const value = new Date(iso);
  const today = new Date();
  return value.getDate() === today.getDate()
    && value.getMonth() === today.getMonth()
    && value.getFullYear() === today.getFullYear();
}

function displayNameFromSession(session: Session | null) {
  const metadataName = session?.user.user_metadata?.display_name;
  if (typeof metadataName === 'string' && metadataName.trim()) return metadataName.trim();
  return session?.user.email?.split('@')[0] ?? '';
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [snapshot, setSnapshot] = useState<AppSnapshot>(() => createInitialSnapshot());
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured);
  const [hydrated, setHydrated] = useState(!isSupabaseConfigured);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const activeMemberIdRef = useRef('');

  useEffect(() => { activeMemberIdRef.current = snapshot.activeMemberId; }, [snapshot.activeMemberId]);

  useEffect(() => {
    const localCleanup = purgeLegacySensitiveSnapshots().catch(() => undefined);
    if (!isSupabaseConfigured) return;
    let mounted = true;
    void localCleanup
      .then(() => supabase.auth.getSession())
      .then(({ data }: { data: { session: Session | null } }) => {
        if (mounted) {
          setSession(data.session);
          setAuthReady(true);
        }
      })
      .catch(() => {
        if (mounted) setAuthReady(true);
      });
    const { data } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, nextSession: Session | null) => {
      if (mounted) {
        setSession(nextSession);
        setAuthReady(true);
      }
    });
    return () => { mounted = false; data.subscription.unsubscribe(); };
  }, []);

  const refresh = useCallback(async () => {
    const userId = session?.user.id;
    if (!userId) return;
    setSyncStatus('syncing');
    try {
      const cloudSnapshot = await loadCloudSnapshot(userId, activeMemberIdRef.current);
      setSnapshot(cloudSnapshot);
      setSyncStatus('synced');
    } catch (error) {
      setSyncStatus((current) => current === 'synced' ? 'offline' : 'error');
      throw error;
    } finally {
      setHydrated(true);
    }
  }, [session?.user.id]);

  useEffect(() => {
    if (!authReady) return;
    const userId = session?.user.id;
    if (!userId) {
      setSnapshot(createInitialSnapshot());
      setHydrated(true);
      setSyncStatus('idle');
      return;
    }

    let cancelled = false;
    setHydrated(false);
    void refresh().catch(() => {
      if (!cancelled) {
        setHydrated(true);
        setSyncStatus('error');
      }
    });
    return () => { cancelled = true; };
  }, [authReady, session?.user.id, refresh]);

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId || !snapshot.familyId) return;
    void reconcileEventReminders(userId, snapshot.events);
  }, [session?.user.id, snapshot.familyId, snapshot.events]);

  useEffect(() => {
    if (!session?.user.id || !snapshot.familyId) return;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => { void refresh().catch(() => undefined); }, 220);
    };
    const familyId = snapshot.familyId;
    const channel = supabase.channel(`laco-family-${familyId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'families', filter: `id=eq.${familyId}` }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'family_members', filter: `family_id=eq.${familyId}` }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: `family_id=eq.${familyId}` }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'water_entries', filter: `family_id=eq.${familyId}` }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'memories', filter: `family_id=eq.${familyId}` }, scheduleRefresh)
      .subscribe();
    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      void supabase.removeChannel(channel);
    };
  }, [session?.user.id, snapshot.familyId, refresh]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
  }, []);

  const signUp = useCallback(async (displayName: string, email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { display_name: displayName.trim() } },
    });
    if (error) throw error;
    return { needsEmailConfirmation: !data.session };
  }, []);

  const signOut = useCallback(async () => {
    const userId = session?.user.id;
    const { error } = await supabase.auth.signOut();
    if (error) await supabase.auth.signOut({ scope: 'local' });
    if (userId) {
      await clearEventReminders(userId).catch(() => undefined);
      await clearLocalUserData(userId).catch(() => undefined);
    }
    activeMemberIdRef.current = '';
    setSnapshot(createInitialSnapshot());
    setHydrated(true);
    setSyncStatus('idle');
    if (error) throw error;
  }, [session?.user.id]);

  const createFamily = useCallback(async (displayName: string, familyName: string) => {
    await createCloudFamily(familyName, displayName);
    await refresh();
  }, [refresh]);

  const joinFamily = useCallback(async (displayName: string, inviteCode: string) => {
    await joinCloudFamily(inviteCode, displayName);
    await refresh();
  }, [refresh]);

  const rotateFamilyInvite = useCallback(async () => {
    if (!snapshot.familyId) throw new Error('Entre na família antes de criar um convite.');
    await rotateCloudFamilyInvite(snapshot.familyId);
    await refresh();
  }, [snapshot.familyId, refresh]);

  const revokeFamilyInvite = useCallback(async () => {
    if (!snapshot.familyId) throw new Error('Entre na família antes de revogar o convite.');
    await revokeCloudFamilyInvite(snapshot.familyId);
    await refresh();
  }, [snapshot.familyId, refresh]);

  const completeOnboarding = useCallback(async (name: string, familyName: string) => {
    await createFamily(name, familyName);
  }, [createFamily]);

  const setActiveMemberId = useCallback((memberId: string) => {
    activeMemberIdRef.current = memberId;
    setSnapshot((current) => ({ ...current, activeMemberId: memberId }));
  }, []);

  const addEvent = useCallback(async (event: NewCloudEvent) => {
    const userId = session?.user.id;
    if (!snapshot.familyId || !userId) throw new Error('Entre na família antes de agendar.');
    setSyncStatus('syncing');
    await insertCloudEvent(snapshot.familyId, userId, event);
    await refresh();
  }, [session?.user.id, snapshot.familyId, refresh]);

  const removeEvent = useCallback(async (eventId: string) => {
    setSyncStatus('syncing');
    await deleteCloudEvent(eventId);
    await refresh();
  }, [refresh]);

  const addWater = useCallback(async (amountMl: number, memberId?: string) => {
    const userId = session?.user.id;
    const targetMemberId = memberId ?? snapshot.activeMemberId;
    if (!snapshot.familyId || !userId || !targetMemberId) throw new Error('Escolha alguém da família.');
    setSyncStatus('syncing');
    await insertCloudWater(snapshot.familyId, userId, targetMemberId, amountMl);
    await refresh();
  }, [session?.user.id, snapshot.familyId, snapshot.activeMemberId, refresh]);

  const addMemory = useCallback(async (memory: NewCloudMemory) => {
    const userId = session?.user.id;
    if (!snapshot.familyId || !userId) throw new Error('Entre na família antes de guardar uma foto.');
    setSyncStatus('syncing');
    await insertCloudMemory(snapshot.familyId, userId, memory);
    await refresh();
  }, [session?.user.id, snapshot.familyId, refresh]);

  const waterTotalFor = useCallback((memberId: string) => snapshot.waterEntries
    .filter((entry) => entry.memberId === memberId && isToday(entry.createdAt))
    .reduce((total, entry) => total + entry.amountMl, 0), [snapshot.waterEntries]);

  const value = useMemo<AppContextValue>(() => ({
    ...snapshot,
    session,
    currentUserId: session?.user.id ?? '',
    suggestedDisplayName: displayNameFromSession(session),
    authReady,
    hydrated,
    syncStatus,
    signIn,
    signUp,
    signOut,
    createFamily,
    joinFamily,
    rotateFamilyInvite,
    revokeFamilyInvite,
    completeOnboarding,
    refresh,
    setActiveMemberId,
    addEvent,
    removeEvent,
    addWater,
    addMemory,
    waterTotalFor,
  }), [
    snapshot, session, authReady, hydrated, syncStatus, signIn, signUp, signOut,
    createFamily, joinFamily, rotateFamilyInvite, revokeFamilyInvite,
    completeOnboarding, refresh, setActiveMemberId,
    addEvent, removeEvent, addWater, addMemory, waterTotalFor,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp precisa estar dentro de AppProvider.');
  return value;
}
