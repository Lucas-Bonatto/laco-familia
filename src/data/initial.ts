import type { AppSnapshot } from '../types';

export function createInitialSnapshot(): AppSnapshot {
  return {
    familyId: '',
    familyName: '',
    inviteCode: '',
    members: [],
    events: [],
    activeMemberId: '',
    waterEntries: [],
    memories: [],
  };
}
