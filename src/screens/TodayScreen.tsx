import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { Avatar, EventCard, SectionHeader } from '../components/ui';
import { useApp } from '../state/AppContext';
import { colors, radii, shadows } from '../theme';
import type { TabKey } from '../types';
import { nextDailyOccurrence } from '../utils/medication';

export function TodayScreen({ onNavigate }: { onNavigate: (tab: TabKey) => void }) {
  const { members, activeMemberId, events, waterTotalFor } = useApp();
  const active = members.find((member) => member.id === activeMemberId) ?? members[0];
  if (!active) return null;
  const total = waterTotalFor(active.id);
  const progress = Math.min(total / 2000, 1);
  const upcoming = [...events]
    .filter((event) => event.medicationSchedule?.mode === 'continuous' || new Date(event.startsAt).getTime() > Date.now())
    .sort((a, b) => {
      const aTime = a.medicationSchedule?.mode === 'continuous'
        ? nextDailyOccurrence(a.medicationSchedule.time, a.startsAt).getTime()
        : new Date(a.startsAt).getTime();
      const bTime = b.medicationSchedule?.mode === 'continuous'
        ? nextDailyOccurrence(b.medicationSchedule.time, b.startsAt).getTime()
        : new Date(b.startsAt).getTime();
      return aTime - bTime;
    }).slice(0, 2);

  return <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
    <View style={styles.header}>
      <View><Text style={styles.eyebrow}>QUINTAL DA FAMÍLIA</Text><Text style={styles.greeting}>Oi, {active.name}! 👋</Text><Text style={styles.subtitle}>Vamos cuidar de quem a gente ama?</Text></View>
      <Avatar member={active} size={48} />
    </View>

    <AnimatedPressable onPress={() => onNavigate('water')} accessibilityLabel="Abrir registro de água" style={styles.heroCard}>
      <View style={styles.heroCopy}>
        <View style={styles.heroBadge}><Ionicons name="water" color={colors.blueStrong} size={15} /><Text style={styles.heroBadgeText}>META DE HOJE</Text></View>
        <Text style={styles.heroTitle}>Hidratação em{`\n`}andamento!</Text>
        <Text style={styles.heroValue}>{total.toLocaleString('pt-BR')} ml</Text>
        <Text style={styles.heroMeta}>de 2.000 ml • {Math.round(progress * 100)}%</Text>
        <View style={styles.heroAction}><Text style={styles.heroActionText}>Registrar água</Text><Ionicons name="arrow-forward" size={17} color={colors.ink} /></View>
      </View>
      <View style={styles.glassWrap}>
        <View style={styles.glass}>
          <View style={[styles.glassWater, { height: `${Math.max(progress * 100, 8)}%` }]}><View style={styles.wave} /></View>
          <View style={styles.face}><View style={styles.eye} /><View style={styles.eye} /></View><View style={styles.smile} />
        </View>
        <Text style={styles.glassCheer}>{progress >= 1 ? 'Meta batida! 🎉' : 'Glu, glu!'}</Text>
      </View>
    </AnimatedPressable>

    <View>
      <SectionHeader title="Próximos cuidados" action="Ver agenda" onAction={() => onNavigate('agenda')} />
      <View style={styles.eventList}>{upcoming.length ? upcoming.map((event) => {
        const member = members.find((item) => item.id === event.memberId) ?? active;
        return <EventCard key={event.id} event={event} member={member} />;
      }) : <View style={styles.emptyCard}><Text style={styles.emptyEmoji}>🌤️</Text><View style={{ flex: 1 }}><Text style={styles.emptyTitle}>Agenda tranquila por aqui</Text><Text style={styles.emptyText}>Uma raridade. Aproveite sem culpa!</Text></View></View>}</View>
    </View>

    <View><SectionHeader title="Atalhos espertos" />
      <View style={styles.shortcutRow}>
        <AnimatedPressable onPress={() => onNavigate('agenda')} containerStyle={styles.shortcutSlot} style={[styles.shortcut, styles.shortcutCoral]}><View style={styles.shortcutIcon}><Ionicons name="calendar-outline" size={23} color={colors.coral} /></View><Text style={styles.shortcutTitle}>Novo{`\n`}lembrete</Text></AnimatedPressable>
        <AnimatedPressable onPress={() => onNavigate('memories')} containerStyle={styles.shortcutSlot} style={[styles.shortcut, styles.shortcutYellow]}><View style={styles.shortcutIcon}><Ionicons name="camera-outline" size={23} color="#9C7308" /></View><Text style={styles.shortcutTitle}>Guardar{`\n`}momento</Text></AnimatedPressable>
        <AnimatedPressable onPress={() => onNavigate('family')} containerStyle={styles.shortcutSlot} style={[styles.shortcut, styles.shortcutMint]}><View style={styles.shortcutIcon}><Ionicons name="people-outline" size={23} color={colors.mintStrong} /></View><Text style={styles.shortcutTitle}>Ver{`\n`}família</Text></AnimatedPressable>
      </View>
    </View>
  </ScrollView>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 120, gap: 28 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { color: colors.mintStrong, fontSize: 11, fontWeight: '900', letterSpacing: 1.6, marginBottom: 5 },
  greeting: { color: colors.ink, fontSize: 29, lineHeight: 34, fontWeight: '900', letterSpacing: -0.6 },
  subtitle: { color: colors.muted, fontSize: 14, marginTop: 3 },
  heroCard: { minHeight: 242, borderRadius: radii.lg, backgroundColor: colors.blue, padding: 20, flexDirection: 'row', overflow: 'hidden', ...shadows.card },
  heroCopy: { flex: 1, zIndex: 2 },
  heroBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.7)', paddingHorizontal: 9, paddingVertical: 6, borderRadius: radii.pill },
  heroBadgeText: { color: colors.blueStrong, fontSize: 10, fontWeight: '900', letterSpacing: 0.7 },
  heroTitle: { color: colors.ink, fontSize: 23, lineHeight: 25, fontWeight: '900', marginTop: 14, letterSpacing: -0.4 },
  heroValue: { color: colors.ink, fontSize: 21, fontWeight: '900', marginTop: 12 },
  heroMeta: { color: '#4E7577', fontSize: 12, marginTop: 1 },
  heroAction: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 },
  heroActionText: { color: colors.ink, fontSize: 13, fontWeight: '900' },
  glassWrap: { width: 118, justifyContent: 'center', alignItems: 'center' },
  glass: { width: 82, height: 142, borderWidth: 5, borderColor: 'rgba(255,255,255,0.9)', borderTopWidth: 3, borderRadius: 24, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.28)' },
  glassWater: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#43B6D1' },
  wave: { position: 'absolute', top: -7, left: -6, width: 94, height: 15, borderRadius: 50, backgroundColor: '#79D4E8' },
  face: { position: 'absolute', top: 61, left: 24, flexDirection: 'row', gap: 15 },
  eye: { width: 6, height: 9, borderRadius: 5, backgroundColor: colors.ink },
  smile: { position: 'absolute', width: 21, height: 11, top: 77, left: 27, borderBottomWidth: 3, borderColor: colors.ink, borderRadius: 10 },
  glassCheer: { color: colors.blueStrong, fontSize: 11, fontWeight: '900', marginTop: 7 },
  eventList: { gap: 10 },
  emptyCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, padding: 18, borderRadius: radii.md, borderWidth: 1, borderColor: colors.line },
  emptyEmoji: { fontSize: 30 }, emptyTitle: { color: colors.ink, fontWeight: '800' }, emptyText: { color: colors.muted, fontSize: 13, marginTop: 2 },
  shortcutRow: { width: '100%', flexDirection: 'row', gap: 10 },
  shortcutSlot: { flex: 1 },
  shortcut: { width: '100%', minHeight: 132, borderRadius: radii.md, padding: 14, justifyContent: 'space-between' },
  shortcutCoral: { backgroundColor: colors.coralSoft }, shortcutYellow: { backgroundColor: colors.yellowSoft }, shortcutMint: { backgroundColor: colors.mint },
  shortcutIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' },
  shortcutTitle: { color: colors.ink, fontSize: 14, lineHeight: 17, fontWeight: '900' },
});
