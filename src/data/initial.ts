import type { AppSnapshot } from '../types';

export function createInitialSnapshot(): AppSnapshot {
  return {
    familyId: '',
    familyName: '',
    inviteCode: '',
    inviteExpiresAt: '',
    members: [],
    events: [],
    activeMemberId: '',
    waterEntries: [],
    memories: [],
  };
}
