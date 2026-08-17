import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Easing, Modal, StyleSheet, Text, TextInput, View, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { Avatar, MemberPicker } from '../components/ui';
import { useApp } from '../state/AppContext';
import { colors, radii, shadows } from '../theme';
import { friendlyCloudError } from '../services/cloud';

const GOAL_ML = 2000; const quickAmounts = [200, 350, 500, 750];
type BottleMood = 'sad' | 'thirsty' | 'okay' | 'happy' | 'full';

export function WaterScreen() {
  const { members, activeMemberId, setActiveMemberId, waterTotalFor, addWater } = useApp();
  const [customOpen, setCustomOpen] = useState(false); const [customAmount, setCustomAmount] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const fillAnimation = useRef(new Animated.Value(0)).current;
  const waveAnimation = useRef(new Animated.Value(0)).current;
  const bubbleAnimation = useRef(new Animated.Value(0)).current;
  const bottleBounce = useRef(new Animated.Value(1)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = members.find((member) => member.id === activeMemberId) ?? members[0];
  const total = active ? waterTotalFor(active.id) : 0; const progress = Math.min(total / GOAL_ML, 1);
  const mood: BottleMood = progress === 0 ? 'sad' : progress < 0.3 ? 'thirsty' : progress < 0.6 ? 'okay' : progress < 1 ? 'happy' : 'full';
  const moodMessage = mood === 'sad'
    ? 'Estou sequinha... socorro, um gole! 🥺'
    : mood === 'thirsty'
      ? 'Opa! Já fiquei um pouquinho menos triste.'
      : mood === 'okay'
        ? 'Agora sim, estou ficando animada!'
        : mood === 'happy'
          ? 'Olha esse sorrisão hidratado!'
          : 'Garrafa cheia! Você é uma lenda aquática. 🏆';
  useEffect(() => {
    Animated.parallel([
      Animated.sequence([
        Animated.timing(fillAnimation, {
          toValue: Math.min(progress + 0.025, 1),
          duration: 1050,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(fillAnimation, {
          toValue: progress,
          duration: 260,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
      ]),
      Animated.sequence([
        Animated.timing(bottleBounce, { toValue: 1.035, duration: 180, useNativeDriver: true }),
        Animated.spring(bottleBounce, { toValue: 1, speed: 12, bounciness: 7, useNativeDriver: true }),
      ]),
    ]).start();
  }, [bottleBounce, fillAnimation, progress]);

  useEffect(() => {
    const waveLoop = Animated.loop(Animated.sequence([
      Animated.timing(waveAnimation, { toValue: 1, duration: 950, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(waveAnimation, { toValue: 0, duration: 950, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    const bubbleLoop = Animated.loop(Animated.timing(bubbleAnimation, {
      toValue: 1,
      duration: 2400,
      easing: Easing.linear,
      useNativeDriver: true,
    }));
    waveLoop.start();
    bubbleLoop.start();
    return () => { waveLoop.stop(); bubbleLoop.stop(); };
  }, [bubbleAnimation, waveAnimation]);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const register = async (amount: number) => {
    try {
      await addWater(amount);
      setToast(`+${amount} ml! Seus rins mandaram um coração. 💙`);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(null), 5200);
    } catch (error) {
      Alert.alert('A água não foi registrada', friendlyCloudError(error));
    }
  };
  const saveCustom = () => { const value = Number(customAmount.replace(/\D/g, '')); if (!value || value > 5000) return; void register(value); setCustomAmount(''); setCustomOpen(false); };
  if (!active) return null;
  const animatedHeight = fillAnimation.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const waveTranslate = waveAnimation.interpolate({ inputRange: [0, 1], outputRange: [-9, 7] });
  const reverseWaveTranslate = waveAnimation.interpolate({ inputRange: [0, 1], outputRange: [7, -9] });
  const bubbleRise = bubbleAnimation.interpolate({ inputRange: [0, 1], outputRange: [35, -75] });
  const bubbleOpacity = bubbleAnimation.interpolate({ inputRange: [0, 0.12, 0.82, 1], outputRange: [0, 0.85, 0.6, 0] });

  return <View style={styles.screen}>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      <View style={styles.header}><View><Text style={styles.title}>Hidratação</Text><Text style={styles.subtitle}>Um gole de cada vez, sem competição olímpica.</Text></View><View style={styles.dropIcon}><Ionicons name="water" size={24} color={colors.blueStrong} /></View></View>
      <Text style={styles.overline}>REGISTRANDO PARA</Text><MemberPicker members={members} selectedId={activeMemberId} onSelect={setActiveMemberId} />

      <View style={styles.bottleCard}>
        <View style={styles.goalCopy}><Text style={styles.goalLabel}>Hoje, {active.name}</Text><Text style={styles.goalValue}>{total.toLocaleString('pt-BR')}</Text><Text style={styles.goalUnit}>ml de {GOAL_ML.toLocaleString('pt-BR')} ml</Text><View style={styles.percentPill}><Text style={styles.percentText}>{Math.round(progress * 100)}% da meta</Text></View><Text style={styles.cheerText}>{moodMessage}</Text></View>
        <View style={styles.bottleArea}><Animated.View style={[styles.bottleRig, { transform: [{ scale: bottleBounce }] }]}><View style={styles.bottleCap} /><View style={styles.bottleNeck} /><View style={styles.bottle}>
          <Animated.View style={[styles.waterFill, { height: animatedHeight }]}><View style={styles.waterDepth} /><View style={styles.waterGlint} /><Animated.View style={[styles.waterWaveBack, { transform: [{ translateX: reverseWaveTranslate }] }]} /><Animated.View style={[styles.waterWave, { transform: [{ translateX: waveTranslate }] }]} /><Animated.View style={[styles.bubble, styles.bubbleOne, { opacity: bubbleOpacity, transform: [{ translateY: bubbleRise }] }]} /><Animated.View style={[styles.bubble, styles.bubbleTwo, { opacity: bubbleOpacity, transform: [{ translateY: bubbleRise }, { scale: 0.8 }] }]} /><Animated.View style={[styles.bubble, styles.bubbleThree, { opacity: bubbleOpacity, transform: [{ translateY: bubbleRise }, { scale: 1.15 }] }]} /></Animated.View>
          {mood === 'sad' ? <><View style={[styles.eyebrow, styles.eyebrowLeft]} /><View style={[styles.eyebrow, styles.eyebrowRight]} /><View style={styles.tear} /></> : null}
          <View style={styles.bottleFace}><View style={[styles.bottleEye, mood === 'full' && styles.fullEye]} /><View style={[styles.bottleEye, mood === 'full' && styles.fullEye]} /></View>
          <View style={[styles.bottleMouth, mood === 'sad' ? styles.mouthSad : mood === 'thirsty' ? styles.mouthThirsty : mood === 'okay' ? styles.mouthOkay : mood === 'happy' ? styles.mouthHappy : styles.mouthFull]}>{mood === 'full' ? <View style={styles.tongue} /> : null}</View>
          {mood === 'happy' || mood === 'full' ? <><View style={[styles.cheek, styles.cheekLeft]} /><View style={[styles.cheek, styles.cheekRight]} /></> : null}<View style={styles.bottleShine} />
        </View></Animated.View></View>
      </View>

      <View><Text style={styles.sectionTitle}>Quanto você bebeu?</Text><View style={styles.amountGrid}>{quickAmounts.map((amount) => <AnimatedPressable key={amount} onPress={() => void register(amount)} containerStyle={styles.amountButtonSlot} style={styles.amountButton}><Ionicons name="add" size={20} color={colors.blueStrong} /><Text style={styles.amountText}>{amount} ml</Text></AnimatedPressable>)}</View><AnimatedPressable onPress={() => setCustomOpen(true)} style={styles.customButton}><Ionicons name="create-outline" size={18} color={colors.ink} /><Text style={styles.customButtonText}>Digitar outra quantidade</Text></AnimatedPressable></View>

      <View><View style={styles.familyHeader}><Text style={styles.sectionTitle}>Placar da família</Text><Text style={styles.liveTag}>AO VIVO</Text></View><View style={styles.familyCard}>{members.map((member) => {
        const memberTotal = waterTotalFor(member.id); const memberProgress = Math.min(memberTotal / GOAL_ML, 1);
        return <View key={member.id} style={styles.familyRow}><Avatar member={member} size={38} /><View style={styles.familyBody}><View style={styles.familyTopline}><Text style={styles.familyName}>{member.name}</Text><Text style={styles.familyValue}>{memberTotal.toLocaleString('pt-BR')} ml</Text></View><View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${memberProgress * 100}%`, backgroundColor: member.color }]} /></View></View></View>;
      })}</View></View>
    </ScrollView>
    {toast ? <Animated.View style={styles.toast}><Text style={styles.toastText}>{toast}</Text></Animated.View> : null}
    <Modal visible={customOpen} transparent animationType="fade" onRequestClose={() => setCustomOpen(false)}><View style={styles.modalBackdrop}><View style={styles.customModal}><Text style={styles.modalEmoji}>🫗</Text><Text style={styles.modalTitle}>Manda os mililitros</Text><Text style={styles.modalText}>Vale copo, garrafa, caneca ou poção mágica.</Text><View style={styles.customInputRow}><TextInput autoFocus keyboardType="number-pad" value={customAmount} onChangeText={setCustomAmount} placeholder="0" placeholderTextColor="#A4AFAB" style={styles.customInput} /><Text style={styles.mlLabel}>ml</Text></View><View style={styles.modalActions}><AnimatedPressable onPress={() => setCustomOpen(false)} style={styles.cancelButton}><Text style={styles.cancelText}>Cancelar</Text></AnimatedPressable><AnimatedPressable onPress={saveCustom} style={styles.confirmButton}><Text style={styles.confirmText}>Registrar</Text></AnimatedPressable></View></View></View></Modal>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 125, gap: 26 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, title: { color: colors.ink, fontSize: 29, fontWeight: '900', letterSpacing: -0.6 }, subtitle: { maxWidth: 285, color: colors.muted, fontSize: 14, marginTop: 4 },
  dropIcon: { width: 48, height: 48, borderRadius: 17, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' }, overline: { color: colors.muted, fontSize: 10, fontWeight: '900', letterSpacing: 1.3, marginBottom: -17 },
  bottleCard: { minHeight: 295, flexDirection: 'row', borderRadius: radii.lg, backgroundColor: colors.blue, padding: 21, overflow: 'hidden', ...shadows.card }, goalCopy: { flex: 1, zIndex: 2 }, goalLabel: { color: colors.blueStrong, fontSize: 13, fontWeight: '800' },
  goalValue: { color: colors.ink, fontSize: 40, lineHeight: 43, fontWeight: '900', letterSpacing: -1.2, marginTop: 8 }, goalUnit: { color: '#4E7577', fontSize: 13 }, percentPill: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.72)', borderRadius: radii.pill, paddingHorizontal: 11, paddingVertical: 7, marginTop: 16 }, percentText: { color: colors.blueStrong, fontSize: 12, fontWeight: '900' }, cheerText: { maxWidth: 155, color: colors.ink, fontSize: 13, lineHeight: 18, fontWeight: '700', marginTop: 17 },
  bottleArea: { width: 126, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 3 }, bottleRig: { alignItems: 'center' }, bottleCap: { width: 49, height: 20, borderTopLeftRadius: 9, borderTopRightRadius: 9, backgroundColor: colors.coral, borderWidth: 4, borderBottomWidth: 2, borderColor: 'rgba(255,255,255,0.85)', zIndex: 2 }, bottleNeck: { width: 43, height: 25, backgroundColor: 'rgba(255,255,255,0.42)', borderLeftWidth: 4, borderRightWidth: 4, borderColor: 'rgba(255,255,255,0.9)', zIndex: 1 }, bottle: { width: 102, height: 218, borderRadius: 34, borderWidth: 5, borderColor: 'rgba(255,255,255,0.92)', backgroundColor: 'rgba(255,255,255,0.26)', overflow: 'hidden' },
  waterFill: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#3DB4CF', borderTopLeftRadius: 16, borderTopRightRadius: 16, overflow: 'hidden' }, waterDepth: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '42%', backgroundColor: 'rgba(13,126,153,0.18)' }, waterGlint: { position: 'absolute', top: 18, bottom: 12, left: 17, width: 7, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.18)' }, waterWaveBack: { position: 'absolute', top: -5, left: -8, width: 112, height: 17, borderRadius: 50, backgroundColor: 'rgba(28,152,181,0.42)' }, waterWave: { position: 'absolute', top: -9, left: -8, width: 112, height: 18, borderRadius: 50, backgroundColor: '#77D4E7' }, bubble: { position: 'absolute', borderWidth: 2, borderColor: 'rgba(255,255,255,0.75)', borderRadius: 20 }, bubbleOne: { width: 9, height: 9, top: 24, left: 18 }, bubbleTwo: { width: 13, height: 13, top: 56, right: 18 }, bubbleThree: { width: 7, height: 7, bottom: 21, left: 37 }, bottleFace: { position: 'absolute', top: 91, left: 31, flexDirection: 'row', gap: 19 }, bottleEye: { width: 7, height: 11, borderRadius: 5, backgroundColor: colors.ink }, fullEye: { width: 10, height: 7, borderRadius: 0, borderBottomWidth: 3, borderColor: colors.ink, backgroundColor: 'transparent' }, eyebrow: { position: 'absolute', top: 79, width: 13, height: 3, borderRadius: 2, backgroundColor: colors.ink }, eyebrowLeft: { left: 25, transform: [{ rotate: '18deg' }] }, eyebrowRight: { right: 25, transform: [{ rotate: '-18deg' }] }, tear: { position: 'absolute', top: 103, left: 23, width: 7, height: 11, borderTopLeftRadius: 6, borderTopRightRadius: 6, borderBottomLeftRadius: 6, backgroundColor: '#43B9D4', transform: [{ rotate: '18deg' }] }, bottleMouth: { position: 'absolute', borderColor: colors.ink }, mouthSad: { top: 116, left: 34, width: 25, height: 13, borderTopWidth: 4, borderRadius: 15 }, mouthThirsty: { top: 118, left: 38, width: 18, height: 3, borderRadius: 2, backgroundColor: colors.ink }, mouthOkay: { top: 111, left: 36, width: 22, height: 10, borderBottomWidth: 3, borderRadius: 13 }, mouthHappy: { top: 108, left: 33, width: 28, height: 15, borderBottomWidth: 4, borderRadius: 17 }, mouthFull: { top: 109, left: 34, width: 27, height: 18, borderRadius: 8, borderBottomLeftRadius: 15, borderBottomRightRadius: 15, backgroundColor: colors.ink, overflow: 'hidden' }, tongue: { position: 'absolute', left: 6, right: 6, bottom: -1, height: 7, borderTopLeftRadius: 7, borderTopRightRadius: 7, backgroundColor: colors.coral }, cheek: { position: 'absolute', top: 107, width: 9, height: 6, borderRadius: 5, backgroundColor: 'rgba(255,130,111,0.62)' }, cheekLeft: { left: 18 }, cheekRight: { right: 18 }, bottleShine: { position: 'absolute', top: 24, left: 13, width: 8, height: 56, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.62)' },
  sectionTitle: { color: colors.ink, fontSize: 20, fontWeight: '900', marginBottom: 13 }, amountGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 }, amountButtonSlot: { width: '48.5%' }, amountButton: { width: '100%', minHeight: 64, paddingHorizontal: 12, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, ...shadows.card }, amountText: { color: colors.ink, fontSize: 16, fontWeight: '900' }, customButton: { marginTop: 10, minHeight: 48, borderRadius: 15, backgroundColor: colors.mint, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }, customButtonText: { color: colors.ink, fontSize: 13, fontWeight: '900' },
  familyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, liveTag: { marginBottom: 13, color: colors.mintStrong, backgroundColor: colors.mint, borderRadius: radii.pill, paddingHorizontal: 9, paddingVertical: 4, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 }, familyCard: { gap: 15, borderRadius: radii.md, backgroundColor: colors.surface, padding: 16, ...shadows.card }, familyRow: { flexDirection: 'row', alignItems: 'center', gap: 11 }, familyBody: { flex: 1, gap: 6 }, familyTopline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, familyName: { color: colors.ink, fontSize: 13, fontWeight: '800' }, familyValue: { color: colors.muted, fontSize: 12, fontWeight: '700' }, progressTrack: { height: 7, borderRadius: 4, backgroundColor: '#E8ECEA', overflow: 'hidden' }, progressFill: { height: '100%', borderRadius: 4 },
  toast: { position: 'absolute', left: 20, right: 20, bottom: 99, backgroundColor: colors.ink, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 13, ...shadows.card }, toastText: { color: colors.surface, textAlign: 'center', fontSize: 13, fontWeight: '800' },
  modalBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(16,43,38,0.45)', padding: 25 }, customModal: { width: '100%', maxWidth: 360, borderRadius: 27, backgroundColor: colors.cream, padding: 22, alignItems: 'center' }, modalEmoji: { fontSize: 44 }, modalTitle: { color: colors.ink, fontSize: 22, fontWeight: '900', marginTop: 8 }, modalText: { color: colors.muted, fontSize: 13, textAlign: 'center', marginTop: 5 }, customInputRow: { height: 64, flexDirection: 'row', alignItems: 'center', marginTop: 20, backgroundColor: colors.surface, borderRadius: 17, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 16 }, customInput: { flex: 1, color: colors.ink, fontSize: 29, fontWeight: '900', textAlign: 'right' }, mlLabel: { color: colors.muted, fontSize: 16, fontWeight: '800', marginLeft: 7 }, modalActions: { flexDirection: 'row', gap: 9, marginTop: 18 }, cancelButton: { minWidth: 110, height: 49, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: '#E8EAE6' }, cancelText: { color: colors.muted, fontWeight: '800' }, confirmButton: { minWidth: 130, height: 49, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: colors.ink }, confirmText: { color: colors.surface, fontWeight: '900' },
});
