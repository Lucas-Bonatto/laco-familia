import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, shadows } from '../theme';
import type { EventKind, FamilyEvent, FamilyMember } from '../types';
import { AnimatedPressable } from './AnimatedPressable';

export function Avatar({ member, size = 42 }: { member: FamilyMember; size?: number }) {
  return <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: member.color }]}>
    <Text style={[styles.avatarText, { fontSize: size * 0.3 }]}>{member.initials}</Text>
  </View>;
}

export function MemberPicker({ members, selectedId, onSelect }: {
  members: FamilyMember[]; selectedId: string; onSelect: (id: string) => void;
}) {
  return <View style={styles.memberRow}>{members.map((member) => {
    const selected = member.id === selectedId;
    return <AnimatedPressable key={member.id} onPress={() => onSelect(member.id)}
      accessibilityLabel={`Selecionar ${member.name}`}
      style={[styles.memberPill, selected && styles.memberPillSelected]}>
      <Avatar member={member} size={30} />
      <Text style={[styles.memberName, selected && styles.memberNameSelected]}>{member.name}</Text>
    </AnimatedPressable>;
  })}</View>;
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {action && onAction ? <AnimatedPressable onPress={onAction} style={styles.linkButton}>
      <Text style={styles.linkText}>{action}</Text><Ionicons name="arrow-forward" color={colors.mintStrong} size={16} />
    </AnimatedPressable> : null}
  </View>;
}

const kindMeta: Record<EventKind, { icon: keyof typeof Ionicons.glyphMap; background: string; color: string }> = {
  consulta: { icon: 'medkit-outline', background: colors.coralSoft, color: colors.coral },
  exame: { icon: 'flask-outline', background: colors.blue, color: colors.blueStrong },
  remedio: { icon: 'medical-outline', background: colors.lavender, color: '#6357B6' },
  outro: { icon: 'sparkles-outline', background: colors.yellowSoft, color: '#A07100' },
};

type EventCardProps = {
  event: FamilyEvent;
  member: FamilyMember;
  compact?: boolean;
  onPress?: () => void;
};

export function EventCard({ event, member, compact = false, onPress }: EventCardProps) {
  const date = new Date(event.startsAt); const meta = kindMeta[event.kind];
  const day = date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const continuousSchedule = event.medicationSchedule?.mode === 'continuous'
    ? event.medicationSchedule
    : null;
  const content = <>
    <View style={[styles.eventIcon, { backgroundColor: meta.background }]}><Ionicons name={meta.icon} color={meta.color} size={24} /></View>
    <View style={styles.eventBody}>
      <View style={styles.eventTopline}><Text numberOfLines={1} style={styles.eventTitle}>{event.title}</Text><View style={[styles.miniDot, { backgroundColor: member.color }]} /></View>
      <Text style={styles.eventDate}>{continuousSchedule ? `Todos os dias • ${continuousSchedule.time}` : `${day} • ${time}`}</Text>
      {event.location && !compact ? <View style={styles.eventLocationRow}><Ionicons name="location-outline" size={14} color={colors.muted} /><Text numberOfLines={1} style={styles.eventLocation}>{event.location}</Text></View> : null}
      {event.medicationSchedule && !compact ? <View style={styles.treatmentRow}><Ionicons name={event.medicationSchedule.mode === 'continuous' ? 'infinite-outline' : 'repeat-outline'} size={14} color="#6357B6" /><Text numberOfLines={1} style={styles.treatmentText}>{event.medicationSchedule.mode === 'continuous' ? `Tratamento contínuo • todos os dias às ${event.medicationSchedule.time}` : `${event.medicationSchedule.durationDays} dias • a cada ${event.medicationSchedule.intervalHours}h • ${event.medicationSchedule.totalDoses} doses`}</Text></View> : null}
    </View>
    {onPress ? <Ionicons name="chevron-forward" size={20} color="#B7C1BD" /> : null}
  </>;

  if (onPress) {
    return <AnimatedPressable
      onPress={onPress}
      accessibilityLabel={`Abrir detalhes de ${event.title}`}
      style={[styles.eventCard, compact && styles.eventCardCompact]}
    >
      {content}
    </AnimatedPressable>;
  }

  return <View style={[styles.eventCard, compact && styles.eventCardCompact]}>{content}</View>;
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.9)' },
  avatarText: { color: colors.surface, fontWeight: '800', letterSpacing: 0.2 },
  memberRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  memberPill: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: radii.pill, backgroundColor: '#ECECE7', paddingVertical: 5, paddingHorizontal: 7, paddingRight: 12 },
  memberPillSelected: { backgroundColor: colors.ink },
  memberName: { color: colors.muted, fontWeight: '700', fontSize: 13 },
  memberNameSelected: { color: colors.surface },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { color: colors.ink, fontSize: 20, lineHeight: 25, fontWeight: '800' },
  linkButton: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4 },
  linkText: { color: colors.mintStrong, fontSize: 13, fontWeight: '800' },
  eventCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.md, padding: 14, gap: 12, ...shadows.card },
  eventCardCompact: { paddingVertical: 12, shadowOpacity: 0, elevation: 0, borderWidth: 1, borderColor: colors.line },
  eventIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  eventBody: { flex: 1, gap: 3 },
  eventTopline: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  eventTitle: { flex: 1, color: colors.ink, fontSize: 15, fontWeight: '800' },
  eventDate: { color: colors.muted, fontSize: 13, textTransform: 'capitalize' },
  eventLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  eventLocation: { color: colors.muted, flex: 1, fontSize: 12 },
  treatmentRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  treatmentText: { flex: 1, color: '#6357B6', fontSize: 11, fontWeight: '800' },
  miniDot: { width: 8, height: 8, borderRadius: 4 },
});
