import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { EventDetailsModal } from '../components/EventDetailsModal';
import { EventCard, MemberPicker } from '../components/ui';
import { useApp } from '../state/AppContext';
import { colors, radii, shadows } from '../theme';
import type { EventKind, FamilyEvent } from '../types';
import { calculateMedicationDoses, medicationScheduleError, nextDailyOccurrence } from '../utils/medication';
import { friendlyCloudError } from '../services/cloud';

type Filter = 'todos' | EventKind;
const kindOptions: { value: EventKind; label: string; emoji: string }[] = [
  { value: 'consulta', label: 'Consulta', emoji: '🩺' }, { value: 'exame', label: 'Exame', emoji: '🔬' },
  { value: 'remedio', label: 'Remédio', emoji: '💊' }, { value: 'outro', label: 'Outro', emoji: '✨' },
];
const filters: { value: Filter; label: string }[] = [
  { value: 'todos', label: 'Todos' }, { value: 'consulta', label: 'Consultas' },
  { value: 'exame', label: 'Exames' }, { value: 'remedio', label: 'Remédios' },
];
const intervalOptions = [4, 6, 8, 12, 24];

export function AgendaScreen() {
  const { events, members, removeEvent } = useApp(); const [filter, setFilter] = useState<Filter>('todos');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<FamilyEvent | null>(null);
  const visibleEvents = useMemo(() => [...events]
    .filter((event) => filter === 'todos' || event.kind === filter)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt)), [events, filter]);

  const confirmStopTreatment = (event: FamilyEvent) => {
    Alert.alert(
      'Encerrar tratamento?',
      `Os lembretes diários de “${event.title}” serão cancelados.`,
      [
        { text: 'Continuar tratamento', style: 'cancel' },
        { text: 'Encerrar', style: 'destructive', onPress: () => void removeEvent(event.id).catch((error) => Alert.alert('Não foi possível encerrar', friendlyCloudError(error))) },
      ],
    );
  };

  return <View style={styles.screen}>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      <View style={styles.header}><View><Text style={styles.title}>Agenda da turma</Text><Text style={styles.subtitle}>Ninguém vai poder dizer “eu esqueci”. 😉</Text></View><View style={styles.calendarIcon}><Ionicons name="calendar" size={23} color={colors.coral} /></View></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>{filters.map((item) =>
        <AnimatedPressable key={item.value} onPress={() => setFilter(item.value)} style={[styles.filter, filter === item.value && styles.filterActive]}>
          <Text style={[styles.filterText, filter === item.value && styles.filterTextActive]}>{item.label}</Text>
        </AnimatedPressable>)}</ScrollView>
      <View style={styles.list}>{visibleEvents.length ? visibleEvents.map((event) => {
        const member = members.find((item) => item.id === event.memberId) ?? members[0];
        return member ? <View key={event.id} style={styles.eventEntry}>
          <EventCard event={event} member={member} onPress={() => setSelectedEvent(event)} />
          {event.medicationSchedule?.mode === 'continuous' ? <AnimatedPressable onPress={() => confirmStopTreatment(event)} style={styles.stopTreatmentButton}><Ionicons name="stop-circle-outline" size={17} color="#8F4035" /><Text style={styles.stopTreatmentText}>Encerrar tratamento</Text></AnimatedPressable> : null}
        </View> : null;
      }) : <View style={styles.empty}><Text style={styles.emptyEmoji}>🗓️</Text><Text style={styles.emptyTitle}>Nada marcado</Text><Text style={styles.emptyText}>Essa parte da agenda está respirando aliviada.</Text></View>}</View>
    </ScrollView>
    <AnimatedPressable onPress={() => setModalVisible(true)} accessibilityLabel="Adicionar evento" style={styles.fab}><Ionicons name="add" size={30} color={colors.surface} /></AnimatedPressable>
    <NewEventModal visible={modalVisible} onClose={() => setModalVisible(false)} />
    <EventDetailsModal
      event={selectedEvent}
      member={selectedEvent ? members.find((item) => item.id === selectedEvent.memberId) ?? null : null}
      onClose={() => setSelectedEvent(null)}
    />
  </View>;
}

function NewEventModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { members, activeMemberId, addEvent } = useApp();
  const [title, setTitle] = useState(''); const [location, setLocation] = useState(''); const [notes, setNotes] = useState('');
  const [kind, setKind] = useState<EventKind>('consulta'); const [memberId, setMemberId] = useState(activeMemberId);
  const [startsAt, setStartsAt] = useState(() => { const date = new Date(Date.now() + 86400000); date.setHours(10, 0, 0, 0); return date; });
  const [medicationMode, setMedicationMode] = useState<'period' | 'continuous'>('period');
  const [durationDays, setDurationDays] = useState('7');
  const [intervalHours, setIntervalHours] = useState('8');
  const [saving, setSaving] = useState(false);

  const durationValue = Number.parseInt(durationDays, 10);
  const intervalValue = Number.parseInt(intervalHours, 10);
  const scheduleError = kind === 'remedio' && medicationMode === 'period'
    ? medicationScheduleError(durationValue, intervalValue)
    : null;
  const totalDoses = kind === 'remedio' && medicationMode === 'period'
    ? calculateMedicationDoses(durationValue, intervalValue)
    : 0;

  const save = async () => {
    if (saving) return;
    if (!title.trim()) {
      Alert.alert('Falta o nome do cuidado', 'Escreva o nome do remédio, da consulta ou do evento antes de salvar.');
      return;
    }
    if (!memberId) {
      Alert.alert('Escolha alguém', 'Selecione para quem este cuidado será agendado.');
      return;
    }
    if (scheduleError) {
      Alert.alert('Revise o tratamento', scheduleError);
      return;
    }
    setSaving(true);
    try {
      const selectedTime = `${String(startsAt.getHours()).padStart(2, '0')}:${String(startsAt.getMinutes()).padStart(2, '0')}`;
      const eventDate = kind === 'remedio' && medicationMode === 'continuous'
        ? nextDailyOccurrence(selectedTime)
        : startsAt;
      await addEvent({ title: title.trim(), kind, startsAt: eventDate.toISOString(), memberId,
        location: location.trim() || undefined, notes: notes.trim() || undefined,
        reminderMinutes: kind === 'remedio' ? 0 : kind === 'exame' ? 720 : 60,
        medicationSchedule: kind === 'remedio' && medicationMode === 'continuous' ? {
          mode: 'continuous',
          time: selectedTime,
        } : kind === 'remedio' ? {
          mode: 'period',
          durationDays: durationValue,
          intervalHours: intervalValue,
          totalDoses,
        } : undefined });
      setTitle(''); setLocation(''); setNotes(''); onClose();
    } catch (error) {
      Alert.alert('Não foi possível agendar', friendlyCloudError(error));
    } finally {
      setSaving(false);
    }
  };

  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBackdrop}>
      <View style={styles.modalSheet}><View style={styles.modalHandle} />
        <View style={styles.modalHeader}><View><Text style={styles.modalTitle}>Novo cuidado</Text><Text style={styles.modalSubtitle}>O Laço lembra, a família comparece.</Text></View><AnimatedPressable onPress={onClose} style={styles.closeButton}><Ionicons name="close" size={22} color={colors.ink} /></AnimatedPressable></View>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.form}>
          <Text style={styles.label}>O que vamos lembrar?</Text><TextInput value={title} onChangeText={setTitle} placeholder="Ex.: Consulta com a Dra. Paula" placeholderTextColor="#9AA5A1" style={styles.input} />
          <Text style={styles.label}>Tipo</Text><View style={styles.kindGrid}>{kindOptions.map((option) => <AnimatedPressable key={option.value} onPress={() => setKind(option.value)} containerStyle={styles.kindOptionSlot} style={[styles.kindOption, kind === option.value && styles.kindOptionActive]}><Text style={styles.kindEmoji}>{option.emoji}</Text><Text style={[styles.kindLabel, kind === option.value && styles.kindLabelActive]}>{option.label}</Text></AnimatedPressable>)}</View>
          <Text style={styles.label}>Para quem?</Text><MemberPicker members={members} selectedId={memberId} onSelect={setMemberId} />
          {kind === 'remedio' ? <View style={styles.modeSection}>
            <Text style={styles.label}>Como é o tratamento?</Text>
            <View style={styles.modeRow}>
              <AnimatedPressable onPress={() => setMedicationMode('period')} style={[styles.modeOption, medicationMode === 'period' && styles.modeOptionActive]}><Ionicons name="calendar-outline" size={19} color={medicationMode === 'period' ? colors.surface : '#6357B6'} /><View><Text style={[styles.modeTitle, medicationMode === 'period' && styles.modeTitleActive]}>Por período</Text><Text style={[styles.modeCaption, medicationMode === 'period' && styles.modeCaptionActive]}>Vários dias</Text></View></AnimatedPressable>
              <AnimatedPressable onPress={() => setMedicationMode('continuous')} style={[styles.modeOption, medicationMode === 'continuous' && styles.modeOptionActive]}><Ionicons name="infinite-outline" size={20} color={medicationMode === 'continuous' ? colors.surface : '#6357B6'} /><View><Text style={[styles.modeTitle, medicationMode === 'continuous' && styles.modeTitleActive]}>Contínuo</Text><Text style={[styles.modeCaption, medicationMode === 'continuous' && styles.modeCaptionActive]}>Todos os dias</Text></View></AnimatedPressable>
            </View>
          </View> : null}
          {kind !== 'remedio' || medicationMode === 'period' ? <View style={styles.dateRow}>
            <View style={styles.dateField}><Text style={styles.label}>{kind === 'remedio' ? 'Data da primeira dose' : 'Data'}</Text><View style={styles.pickerWrap}><DateTimePicker value={startsAt} mode="date" minimumDate={new Date()} onChange={(_, value) => value && setStartsAt(value)} accentColor={colors.mintStrong} /></View></View>
            <View style={styles.dateField}><Text style={styles.label}>{kind === 'remedio' ? 'Hora da primeira dose' : 'Hora'}</Text><View style={styles.pickerWrap}><DateTimePicker value={startsAt} mode="time" onChange={(_, value) => value && setStartsAt(value)} accentColor={colors.mintStrong} /></View></View>
          </View> : <View style={styles.continuousTimeSection}>
            <Text style={styles.label}>Horário diário</Text>
            <View style={styles.continuousTimeCard}><View style={styles.continuousClock}><Ionicons name="time-outline" size={22} color="#6357B6" /></View><View style={styles.continuousTimeCopy}><Text style={styles.continuousTimeTitle}>Lembrar todos os dias</Text><Text style={styles.continuousTimeHint}>Sem data final definida</Text></View><DateTimePicker value={startsAt} mode="time" onChange={(_, value) => value && setStartsAt(value)} accentColor={colors.mintStrong} /></View>
          </View>}
          {kind === 'remedio' && medicationMode === 'period' ? <View style={styles.medicationCard}>
            <View style={styles.medicationHeader}>
              <View style={styles.medicationIcon}><Ionicons name="medical" size={20} color="#6357B6" /></View>
              <View style={styles.medicationHeaderCopy}><Text style={styles.medicationTitle}>Período do tratamento</Text><Text style={styles.medicationHint}>Começando na data e hora escolhidas acima.</Text></View>
            </View>
            <View style={styles.medicationFields}>
              <View style={styles.medicationField}>
                <Text style={styles.medicationFieldLabel}>Por quantos dias?</Text>
                <View style={styles.unitInput}><TextInput value={durationDays} onChangeText={(value) => setDurationDays(value.replace(/\D/g, ''))} keyboardType="number-pad" maxLength={2} style={styles.numberInput} /><Text style={styles.unitText}>dias</Text></View>
              </View>
              <View style={styles.medicationField}>
                <Text style={styles.medicationFieldLabel}>A cada quantas horas?</Text>
                <View style={styles.unitInput}><TextInput value={intervalHours} onChangeText={(value) => setIntervalHours(value.replace(/\D/g, ''))} keyboardType="number-pad" maxLength={2} style={styles.numberInput} /><Text style={styles.unitText}>horas</Text></View>
              </View>
            </View>
            <Text style={styles.quickLabel}>Intervalos comuns</Text>
            <View style={styles.intervalRow}>{intervalOptions.map((hours) => <AnimatedPressable key={hours} onPress={() => setIntervalHours(String(hours))} style={[styles.intervalChip, intervalValue === hours && styles.intervalChipActive]}><Text style={[styles.intervalChipText, intervalValue === hours && styles.intervalChipTextActive]}>{hours}h</Text></AnimatedPressable>)}</View>
            {scheduleError ? <View style={styles.scheduleError}><Ionicons name="alert-circle-outline" size={17} color="#B44D3E" /><Text style={styles.scheduleErrorText}>{scheduleError}</Text></View> : <View style={styles.doseSummary}><Ionicons name="notifications-outline" size={17} color={colors.mintStrong} /><Text style={styles.doseSummaryText}>{totalDoses} lembretes de dose serão preparados.</Text></View>}
          </View> : kind === 'remedio' ? <View style={styles.continuousInfo}><Ionicons name="repeat" size={18} color={colors.mintStrong} /><Text style={styles.continuousInfoText}>Um lembrete será repetido diariamente no horário escolhido, até você encerrar o tratamento.</Text></View> : null}
          <Text style={styles.label}>Local (opcional)</Text><TextInput value={location} onChangeText={setLocation} placeholder="Clínica, laboratório..." placeholderTextColor="#9AA5A1" style={styles.input} />
          <Text style={styles.label}>Observação (opcional)</Text><TextInput value={notes} onChangeText={setNotes} placeholder="Jejum, documentos, preparo..." placeholderTextColor="#9AA5A1" style={[styles.input, styles.notesInput]} multiline />
          <AnimatedPressable onPress={() => void save()} disabled={saving} style={styles.saveButton}><Ionicons name="sparkles" size={18} color={colors.surface} /><Text style={styles.saveButtonText}>{saving ? 'Agendando...' : kind === 'remedio' && medicationMode === 'continuous' ? 'Salvar tratamento contínuo' : kind === 'remedio' ? 'Criar tratamento e lembretes' : 'Agendar e lembrar'}</Text></AnimatedPressable>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 130 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 23 },
  title: { color: colors.ink, fontSize: 29, fontWeight: '900', letterSpacing: -0.6 }, subtitle: { color: colors.muted, fontSize: 14, marginTop: 4 },
  calendarIcon: { width: 48, height: 48, borderRadius: 17, backgroundColor: colors.coralSoft, alignItems: 'center', justifyContent: 'center' },
  filters: { gap: 8, paddingBottom: 22 }, filter: { backgroundColor: '#EAEAE5', paddingHorizontal: 16, paddingVertical: 9, borderRadius: radii.pill }, filterActive: { backgroundColor: colors.ink },
  filterText: { color: colors.muted, fontSize: 13, fontWeight: '800' }, filterTextActive: { color: colors.surface }, list: { gap: 11 }, eventEntry: { gap: 6 }, stopTreatmentButton: { minHeight: 38, alignSelf: 'flex-end', borderRadius: 12, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.coralSoft }, stopTreatmentText: { color: '#8F4035', fontSize: 11, fontWeight: '900' },
  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 35 }, emptyEmoji: { fontSize: 42, marginBottom: 10 }, emptyTitle: { color: colors.ink, fontSize: 19, fontWeight: '900' }, emptyText: { color: colors.muted, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 5 },
  fab: { position: 'absolute', right: 22, bottom: 105, width: 58, height: 58, borderRadius: 20, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center', ...shadows.card },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(16,43,38,0.38)' }, modalSheet: { maxHeight: '92%', backgroundColor: colors.cream, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingTop: 10, paddingHorizontal: 20, paddingBottom: 18 },
  modalHandle: { width: 42, height: 5, borderRadius: 3, backgroundColor: '#CBD0CC', alignSelf: 'center', marginBottom: 15 }, modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  modalTitle: { color: colors.ink, fontSize: 25, fontWeight: '900' }, modalSubtitle: { color: colors.muted, fontSize: 13, marginTop: 3 }, closeButton: { width: 38, height: 38, borderRadius: 15, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  form: { paddingBottom: 22 }, label: { color: colors.ink, fontSize: 13, fontWeight: '800', marginTop: 14, marginBottom: 7 },
  input: { minHeight: 50, borderRadius: radii.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14, color: colors.ink, fontSize: 15 }, notesInput: { minHeight: 78, paddingTop: 13, textAlignVertical: 'top' },
  kindGrid: { width: '100%', flexDirection: 'row', gap: 8 }, kindOptionSlot: { flex: 1 }, kindOption: { width: '100%', minHeight: 82, alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 3, paddingVertical: 11, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }, kindOptionActive: { borderColor: colors.mintStrong, backgroundColor: colors.mint }, kindEmoji: { fontSize: 24 }, kindLabel: { color: colors.muted, fontSize: 12, fontWeight: '900' }, kindLabelActive: { color: colors.ink },
  modeSection: { marginTop: 2 }, modeRow: { flexDirection: 'row', gap: 9 }, modeOption: { flex: 1, minHeight: 65, borderRadius: 15, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: colors.surface, borderWidth: 1, borderColor: '#D8D1E8' }, modeOptionActive: { backgroundColor: '#6357B6', borderColor: '#6357B6' }, modeTitle: { color: colors.ink, fontSize: 13, fontWeight: '900' }, modeTitleActive: { color: colors.surface }, modeCaption: { color: colors.muted, fontSize: 10, marginTop: 2 }, modeCaptionActive: { color: '#E6E1FF' },
  dateRow: { flexDirection: 'row', gap: 10 }, dateField: { flex: 1 }, pickerWrap: { minHeight: 50, justifyContent: 'center', borderRadius: radii.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  continuousTimeSection: { marginTop: 2 }, continuousTimeCard: { minHeight: 66, borderRadius: 16, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0EDFF', borderWidth: 1, borderColor: '#D8D1FF' }, continuousClock: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }, continuousTimeCopy: { flex: 1, marginLeft: 10 }, continuousTimeTitle: { color: colors.ink, fontSize: 13, fontWeight: '900' }, continuousTimeHint: { color: '#6D6688', fontSize: 10, marginTop: 2 }, continuousInfo: { minHeight: 50, borderRadius: 14, marginTop: 12, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.mint }, continuousInfoText: { flex: 1, color: colors.ink, fontSize: 11, lineHeight: 15, fontWeight: '800' },
  medicationCard: { marginTop: 17, borderRadius: radii.md, padding: 15, backgroundColor: '#F0EDFF', borderWidth: 1, borderColor: '#D8D1FF' },
  medicationHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 }, medicationIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }, medicationHeaderCopy: { flex: 1 }, medicationTitle: { color: colors.ink, fontSize: 15, fontWeight: '900' }, medicationHint: { color: '#6D6688', fontSize: 11, marginTop: 2 },
  medicationFields: { flexDirection: 'row', gap: 9, marginTop: 14 }, medicationField: { flex: 1 }, medicationFieldLabel: { color: colors.ink, fontSize: 11, fontWeight: '800', marginBottom: 6 }, unitInput: { height: 49, borderRadius: radii.sm, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: '#D8D1E8', paddingHorizontal: 11 }, numberInput: { flex: 1, color: colors.ink, fontSize: 19, fontWeight: '900', paddingVertical: 0 }, unitText: { color: colors.muted, fontSize: 11, fontWeight: '800' },
  quickLabel: { color: '#6D6688', fontSize: 10, fontWeight: '900', letterSpacing: 0.7, marginTop: 13, marginBottom: 7 }, intervalRow: { flexDirection: 'row', gap: 6 }, intervalChip: { flex: 1, minHeight: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: '#D8D1E8' }, intervalChipActive: { backgroundColor: '#6357B6', borderColor: '#6357B6' }, intervalChipText: { color: '#6357B6', fontSize: 12, fontWeight: '900' }, intervalChipTextActive: { color: colors.surface },
  doseSummary: { minHeight: 40, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 11, marginTop: 12, backgroundColor: 'rgba(201,240,222,0.65)' }, doseSummaryText: { flex: 1, color: colors.ink, fontSize: 11, fontWeight: '800' }, scheduleError: { minHeight: 44, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 11, marginTop: 12, backgroundColor: colors.coralSoft }, scheduleErrorText: { flex: 1, color: '#8F4035', fontSize: 10, lineHeight: 14, fontWeight: '800' },
  saveButton: { marginTop: 22, height: 54, borderRadius: 17, backgroundColor: colors.ink, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, saveButtonText: { color: colors.surface, fontSize: 15, fontWeight: '900' },
});
