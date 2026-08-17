import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedPressable } from './AnimatedPressable';
import { colors } from '../theme';
import type { EventKind, FamilyEvent, FamilyMember } from '../types';

const kindMeta: Record<EventKind, { label: string; emoji: string }> = {
  consulta: { label: 'Consulta', emoji: '🩺' },
  exame: { label: 'Exame', emoji: '🔬' },
  remedio: { label: 'Remédio', emoji: '💊' },
  outro: { label: 'Outro', emoji: '✨' },
};

export function EventDetailsModal({ event, member, onClose }: {
  event: FamilyEvent | null;
  member: FamilyMember | null;
  onClose: () => void;
}) {
  if (!event) return null;
  const kind = kindMeta[event.kind];
  const date = new Date(event.startsAt);
  const continuousSchedule = event.medicationSchedule?.mode === 'continuous'
    ? event.medicationSchedule
    : null;
  const dateLabel = continuousSchedule
    ? 'Todos os dias'
    : date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  const timeLabel = continuousSchedule
    ? continuousSchedule.time
    : date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const treatmentLabel = event.medicationSchedule
    ? event.medicationSchedule.mode === 'continuous'
      ? `Tratamento contínuo, todos os dias às ${event.medicationSchedule.time}.`
      : `${event.medicationSchedule.durationDays} dias, a cada ${event.medicationSchedule.intervalHours} horas (${event.medicationSchedule.totalDoses} doses).`
    : null;

  return <Modal visible transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.backdrop}>
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <View style={styles.heading}>
            <View style={styles.kindIcon}><Text style={styles.kindEmoji}>{kind.emoji}</Text></View>
            <View style={styles.headingCopy}><Text style={styles.eyebrow}>{kind.label}</Text><Text style={styles.title}>{event.title}</Text></View>
          </View>
          <AnimatedPressable onPress={onClose} accessibilityLabel="Fechar detalhes" style={styles.closeButton}><Ionicons name="close" size={22} color={colors.ink} /></AnimatedPressable>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <InfoRow icon="person-outline" label="Para quem" value={member?.name ?? 'Família'} />
          <InfoRow icon="calendar-outline" label="Data" value={dateLabel} capitalize />
          <InfoRow icon="time-outline" label="Horário" value={timeLabel} />
          {event.location ? <InfoRow icon="location-outline" label="Local" value={event.location} /> : null}
          {treatmentLabel ? <InfoRow icon={continuousSchedule ? 'infinite-outline' : 'repeat-outline'} label="Tratamento" value={treatmentLabel} /> : null}
          {event.notes ? <InfoRow icon="document-text-outline" label="Observações" value={event.notes} /> : null}
          <View style={styles.reminder}><Ionicons name="notifications-outline" size={18} color={colors.mintStrong} /><Text style={styles.reminderText}>{event.kind === 'remedio' ? 'Os lembretes seguem o tratamento configurado.' : `O aviso será enviado ${event.reminderMinutes >= 60 ? `${Math.round(event.reminderMinutes / 60)} hora(s)` : `${event.reminderMinutes} minuto(s)`} antes.`}</Text></View>
          <AnimatedPressable onPress={onClose} style={styles.doneButton}><Text style={styles.doneText}>Entendi</Text></AnimatedPressable>
        </ScrollView>
      </View>
    </View>
  </Modal>;
}

function InfoRow({ icon, label, value, capitalize = false }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return <View style={styles.infoRow}>
    <View style={styles.infoIcon}><Ionicons name={icon} size={19} color={colors.mintStrong} /></View>
    <View style={styles.infoCopy}><Text style={styles.infoLabel}>{label}</Text><Text style={[styles.infoValue, capitalize && styles.infoValueCapitalize]}>{value}</Text></View>
  </View>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(16,43,38,0.42)' },
  sheet: { maxHeight: '88%', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingTop: 10, paddingHorizontal: 20, backgroundColor: colors.cream },
  handle: { width: 42, height: 5, borderRadius: 3, backgroundColor: '#CBD0CC', alignSelf: 'center', marginBottom: 15 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 17 },
  heading: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }, headingCopy: { flex: 1 },
  kindIcon: { width: 50, height: 50, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  kindEmoji: { fontSize: 25 }, eyebrow: { color: colors.mintStrong, fontSize: 10, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  title: { color: colors.ink, fontSize: 22, lineHeight: 26, fontWeight: '900', marginTop: 2 },
  closeButton: { width: 38, height: 38, borderRadius: 15, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  content: { paddingBottom: 30, gap: 9 },
  infoRow: { minHeight: 67, borderRadius: 17, paddingHorizontal: 13, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  infoIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.mint }, infoCopy: { flex: 1 },
  infoLabel: { color: colors.muted, fontSize: 10, fontWeight: '900', letterSpacing: 0.5, textTransform: 'uppercase' }, infoValue: { color: colors.ink, fontSize: 14, lineHeight: 19, fontWeight: '800', marginTop: 2 }, infoValueCapitalize: { textTransform: 'capitalize' },
  reminder: { minHeight: 52, borderRadius: 15, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.mint }, reminderText: { flex: 1, color: colors.ink, fontSize: 11, lineHeight: 16, fontWeight: '800' },
  doneButton: { height: 54, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginTop: 5, backgroundColor: colors.ink }, doneText: { color: colors.surface, fontSize: 15, fontWeight: '900' },
});
