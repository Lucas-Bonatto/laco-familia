import type { AppSnapshot, FamilyEvent, FamilyMember, Memory, WaterEntry } from '../types';
import { supabase } from './supabase';

type FamilyRow = { id: string; name: string; invite_code: string };
type MemberRow = {
  id: string;
  family_id: string;
  user_id: string;
  display_name: string;
  role: 'owner' | 'member';
  color: string;
};
type EventRow = {
  id: string;
  title: string;
  kind: FamilyEvent['kind'];
  starts_at: string;
  subject_member_id: string;
  created_by: string;
  location: string | null;
  notes: string | null;
  reminder_minutes: number;
  medication_mode: 'period' | 'continuous' | null;
  medication_time: string | null;
  medication_duration_days: number | null;
  medication_interval_hours: number | null;
  medication_total_doses: number | null;
};
type WaterRow = {
  id: string;
  subject_member_id: string;
  amount_ml: number;
  created_at: string;
};
type MemoryRow = {
  id: string;
  title: string;
  caption: string | null;
  image_path: string;
  created_by: string;
  created_at: string;
};

export type NewCloudEvent = Omit<FamilyEvent, 'id' | 'createdById' | 'notificationId' | 'notificationIds'>;
export type NewCloudMemory = Pick<Memory, 'title' | 'caption' | 'imageUri'>;

function initialsFor(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0]?.[0] ?? ''}${parts.at(-1)?.[0] ?? ''}` : name.slice(0, 2))
    .toLocaleUpperCase('pt-BR');
}

function memberFromRow(row: MemberRow, currentUserId: string): FamilyMember {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.display_name,
    role: row.user_id === currentUserId ? 'Você' : row.role === 'owner' ? 'Administrador' : 'Família',
    initials: initialsFor(row.display_name),
    color: row.color,
  };
}

function eventFromRow(row: EventRow, memberRows: MemberRow[]): FamilyEvent {
  const creator = memberRows.find((member) => member.user_id === row.created_by);
  const medicationSchedule = row.medication_mode === 'continuous' && row.medication_time
    ? { mode: 'continuous' as const, time: row.medication_time.slice(0, 5) }
    : row.medication_mode === 'period'
      && row.medication_duration_days
      && row.medication_interval_hours
      && row.medication_total_doses
      ? {
        mode: 'period' as const,
        durationDays: row.medication_duration_days,
        intervalHours: row.medication_interval_hours,
        totalDoses: row.medication_total_doses,
      }
      : undefined;

  return {
    id: row.id,
    title: row.title,
    kind: row.kind,
    startsAt: row.starts_at,
    memberId: row.subject_member_id,
    createdById: creator?.id ?? row.subject_member_id,
    location: row.location ?? undefined,
    notes: row.notes ?? undefined,
    reminderMinutes: row.reminder_minutes,
    medicationSchedule,
  };
}

async function memoryFromRow(row: MemoryRow, memberRows: MemberRow[]): Promise<Memory> {
  const { data } = await supabase.storage.from('family-memories').createSignedUrl(row.image_path, 60 * 60 * 24 * 7);
  const creator = memberRows.find((member) => member.user_id === row.created_by);
  return {
    id: row.id,
    title: row.title,
    caption: row.caption ?? undefined,
    imageUri: data?.signedUrl ?? '',
    imagePath: row.image_path,
    createdAt: row.created_at,
    createdById: creator?.id ?? '',
  };
}

export async function loadCloudSnapshot(
  currentUserId: string,
  preferredActiveMemberId = '',
): Promise<AppSnapshot> {
  const membershipResult = await supabase
    .from('family_members')
    .select('id,family_id,user_id,display_name,role,color')
    .eq('user_id', currentUserId)
    .maybeSingle();
  if (membershipResult.error) throw membershipResult.error;
  const ownMembership = membershipResult.data as MemberRow | null;

  if (!ownMembership) {
    return {
      familyId: '', familyName: '', inviteCode: '', members: [], events: [],
      waterEntries: [], memories: [], activeMemberId: '',
    };
  }

  const familyId = ownMembership.family_id;
  const [familyResult, membersResult, eventsResult, waterResult, memoriesResult] = await Promise.all([
    supabase.from('families').select('id,name,invite_code').eq('id', familyId).single(),
    supabase.from('family_members').select('id,family_id,user_id,display_name,role,color').eq('family_id', familyId).order('created_at'),
    supabase.from('events').select('id,title,kind,starts_at,subject_member_id,created_by,location,notes,reminder_minutes,medication_mode,medication_time,medication_duration_days,medication_interval_hours,medication_total_doses').eq('family_id', familyId).order('starts_at'),
    supabase.from('water_entries').select('id,subject_member_id,amount_ml,created_at').eq('family_id', familyId).order('created_at', { ascending: false }).limit(3000),
    supabase.from('memories').select('id,title,caption,image_path,created_by,created_at').eq('family_id', familyId).order('created_at', { ascending: false }).limit(200),
  ]);

  const firstError = [familyResult.error, membersResult.error, eventsResult.error, waterResult.error, memoriesResult.error]
    .find(Boolean);
  if (firstError) throw firstError;

  const family = familyResult.data as FamilyRow;
  const memberRows = membersResult.data as MemberRow[];
  const members = memberRows.map((row) => memberFromRow(row, currentUserId));
  const currentMember = members.find((member) => member.userId === currentUserId);
  const activeMemberId = members.some((member) => member.id === preferredActiveMemberId)
    ? preferredActiveMemberId
    : currentMember?.id ?? members[0]?.id ?? '';
  const memories = await Promise.all((memoriesResult.data as MemoryRow[]).map((row) => memoryFromRow(row, memberRows)));

  return {
    familyId: family.id,
    familyName: family.name,
    inviteCode: family.invite_code,
    members,
    events: (eventsResult.data as EventRow[]).map((row) => eventFromRow(row, memberRows)),
    waterEntries: (waterResult.data as WaterRow[]).map<WaterEntry>((row) => ({
      id: row.id,
      memberId: row.subject_member_id,
      amountMl: row.amount_ml,
      createdAt: row.created_at,
    })),
    memories,
    activeMemberId,
  };
}

export async function createCloudFamily(familyName: string, displayName: string) {
  const { error } = await supabase.rpc('create_family', {
    family_name_input: familyName.trim(),
    display_name_input: displayName.trim(),
  });
  if (error) throw error;
}

export async function joinCloudFamily(inviteCode: string, displayName: string) {
  const { error } = await supabase.rpc('join_family', {
    invite_code_input: inviteCode.trim(),
    display_name_input: displayName.trim(),
  });
  if (error) throw error;
}

export async function insertCloudEvent(familyId: string, currentUserId: string, event: NewCloudEvent) {
  const schedule = event.medicationSchedule;
  const { error } = await supabase.from('events').insert({
    family_id: familyId,
    title: event.title,
    kind: event.kind,
    starts_at: event.startsAt,
    subject_member_id: event.memberId,
    created_by: currentUserId,
    location: event.location ?? null,
    notes: event.notes ?? null,
    reminder_minutes: event.reminderMinutes,
    medication_mode: schedule?.mode ?? null,
    medication_time: schedule?.mode === 'continuous' ? schedule.time : null,
    medication_duration_days: schedule?.mode === 'period' || schedule?.mode === undefined
      ? schedule?.durationDays ?? null
      : null,
    medication_interval_hours: schedule?.mode === 'period' || schedule?.mode === undefined
      ? schedule?.intervalHours ?? null
      : null,
    medication_total_doses: schedule?.mode === 'period' || schedule?.mode === undefined
      ? schedule?.totalDoses ?? null
      : null,
  });
  if (error) throw error;
}

export async function deleteCloudEvent(eventId: string) {
  const { error } = await supabase.from('events').delete().eq('id', eventId);
  if (error) throw error;
}

export async function insertCloudWater(
  familyId: string,
  currentUserId: string,
  memberId: string,
  amountMl: number,
) {
  const { error } = await supabase.from('water_entries').insert({
    family_id: familyId,
    subject_member_id: memberId,
    amount_ml: amountMl,
    created_by: currentUserId,
  });
  if (error) throw error;
}

function imageDetails(imageUri: string) {
  const path = imageUri.toLowerCase().split('?')[0] ?? '';
  if (path.endsWith('.png')) return { extension: 'png', contentType: 'image/png' };
  if (path.endsWith('.webp')) return { extension: 'webp', contentType: 'image/webp' };
  if (path.endsWith('.heic')) return { extension: 'heic', contentType: 'image/heic' };
  if (path.endsWith('.heif')) return { extension: 'heif', contentType: 'image/heif' };
  return { extension: 'jpg', contentType: 'image/jpeg' };
}

export async function insertCloudMemory(
  familyId: string,
  currentUserId: string,
  memory: NewCloudMemory,
) {
  const { extension, contentType } = imageDetails(memory.imageUri);
  const imagePath = `${familyId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extension}`;
  const response = await fetch(memory.imageUri);
  const imageData = await response.arrayBuffer();
  const upload = await supabase.storage.from('family-memories').upload(imagePath, imageData, {
    contentType,
    upsert: false,
  });
  if (upload.error) throw upload.error;

  const insert = await supabase.from('memories').insert({
    family_id: familyId,
    title: memory.title,
    caption: memory.caption ?? null,
    image_path: imagePath,
    created_by: currentUserId,
  });
  if (insert.error) {
    await supabase.storage.from('family-memories').remove([imagePath]).catch(() => undefined);
    throw insert.error;
  }
}

export function friendlyCloudError(error: unknown) {
  const message = error instanceof Error
    ? error.message
    : typeof error === 'object' && error && 'message' in error
      ? String(error.message)
      : 'Não foi possível concluir agora.';
  if (/invalid login credentials/i.test(message)) return 'E-mail ou senha incorretos.';
  if (/email not confirmed/i.test(message)) return 'Confirme o e-mail recebido antes de entrar.';
  if (/user already registered/i.test(message)) return 'Este e-mail já está cadastrado.';
  if (/password/i.test(message) && /characters|least/i.test(message)) return 'A senha precisa ter pelo menos 6 caracteres.';
  if (/network request failed|fetch failed/i.test(message)) return 'Sem conexão com a internet. Tente novamente em instantes.';
  return message;
}
