export type TabKey = 'today' | 'agenda' | 'water' | 'memories' | 'family';
export type EventKind = 'consulta' | 'exame' | 'remedio' | 'outro';

export type FamilyMember = {
  id: string;
  userId: string;
  name: string;
  role: string;
  isOwner: boolean;
  initials: string;
  color: string;
};

export type PeriodMedicationSchedule = {
  mode: 'period';
  durationDays: number;
  intervalHours: number;
  totalDoses: number;
};

export type ContinuousMedicationSchedule = {
  mode: 'continuous';
  time: string;
};

export type LegacyMedicationSchedule = {
  mode?: undefined;
  durationDays: number;
  intervalHours: number;
  totalDoses: number;
};

export type MedicationSchedule =
  | PeriodMedicationSchedule
  | ContinuousMedicationSchedule
  | LegacyMedicationSchedule;

export type FamilyEvent = {
  id: string;
  title: string;
  kind: EventKind;
  startsAt: string;
  memberId: string;
  createdById: string;
  location?: string;
  notes?: string;
  reminderMinutes: number;
  medicationSchedule?: MedicationSchedule;
  notificationIds?: string[];
  // Kept only so events created by older app versions still load safely.
  notificationId?: string;
};

export type WaterEntry = {
  id: string;
  memberId: string;
  amountMl: number;
  createdAt: string;
};

export type Memory = {
  id: string;
  title: string;
  caption?: string;
  imageUri: string;
  imagePath?: string;
  createdAt: string;
  createdById: string;
};

export type AppSnapshot = {
  familyId: string;
  familyName: string;
  inviteCode: string;
  inviteExpiresAt: string;
  members: FamilyMember[];
  events: FamilyEvent[];
  waterEntries: WaterEntry[];
  memories: Memory[];
  activeMemberId: string;
};

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';
