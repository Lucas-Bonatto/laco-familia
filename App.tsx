import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedPressable } from './src/components/AnimatedPressable';
import { listenForNotificationNavigation, scheduleDailyWaterReminders } from './src/services/notifications';
import { AgendaScreen } from './src/screens/AgendaScreen';
import { FamilyScreen } from './src/screens/FamilyScreen';
import { MemoriesScreen } from './src/screens/MemoriesScreen';
import { AuthScreen, FamilySetupScreen, SupabaseSetupScreen } from './src/screens/CloudEntryScreens';
import { TodayScreen } from './src/screens/TodayScreen';
import { WaterScreen } from './src/screens/WaterScreen';
import { AppProvider, useApp } from './src/state/AppContext';
import { isSupabaseConfigured } from './src/services/supabase';
import { colors, shadows } from './src/theme';
import type { TabKey } from './src/types';

const tabs: { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap; activeIcon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'today', label: 'Hoje', icon: 'home-outline', activeIcon: 'home' },
  { key: 'agenda', label: 'Agenda', icon: 'calendar-outline', activeIcon: 'calendar' },
  { key: 'water', label: 'Água', icon: 'water-outline', activeIcon: 'water' },
  { key: 'memories', label: 'Memórias', icon: 'images-outline', activeIcon: 'images' },
  { key: 'family', label: 'Família', icon: 'people-outline', activeIcon: 'people' },
];

function LacoApp() {
  const { authReady, hydrated, session, familyId, members } = useApp(); const [activeTab, setActiveTab] = useState<TabKey>('today');
  const opacity = useRef(new Animated.Value(1)).current; const translateY = useRef(new Animated.Value(0)).current;
  useEffect(() => { if (!hydrated || !session || members.length === 0) return; void scheduleDailyWaterReminders().catch(() => undefined); return listenForNotificationNavigation((screen) => setActiveTab(screen)); }, [hydrated, session?.user.id, members.length]);
  const navigate = (tab: TabKey) => { if (tab === activeTab) return; opacity.setValue(0.25); translateY.setValue(8); setActiveTab(tab); Animated.parallel([Animated.timing(opacity, { toValue: 1, duration: 230, useNativeDriver: true }), Animated.spring(translateY, { toValue: 0, useNativeDriver: true, speed: 24, bounciness: 3 })]).start(); };
  if (!isSupabaseConfigured) return <SupabaseSetupScreen />;
  if (!authReady) return <SafeAreaView style={styles.safeArea}><View style={styles.loading}><Text style={styles.loadingText}>Abrindo o Laço…</Text></View></SafeAreaView>;
  if (!session) return <AuthScreen />;
  if (!hydrated) return <SafeAreaView style={styles.safeArea}><View style={styles.loading}><Text style={styles.loadingText}>Buscando os cuidados da família…</Text></View></SafeAreaView>;
  if (!familyId || members.length === 0) return <FamilySetupScreen />;
  const content = activeTab === 'agenda' ? <AgendaScreen /> : activeTab === 'water' ? <WaterScreen /> : activeTab === 'memories' ? <MemoriesScreen /> : activeTab === 'family' ? <FamilyScreen /> : <TodayScreen onNavigate={navigate} />;
  return <SafeAreaView style={styles.safeArea}><StatusBar style="dark" /><Animated.View style={[styles.page, { opacity, transform: [{ translateY }] }]}>{content}</Animated.View><View style={styles.tabBar}>{tabs.map((tab) => { const selected = tab.key === activeTab; return <AnimatedPressable key={tab.key} onPress={() => navigate(tab.key)} accessibilityLabel={`Abrir ${tab.label}`} containerStyle={styles.tabButtonSlot} style={styles.tabButton} pressedScale={0.9}><View style={[styles.tabIconWrap, selected && styles.tabIconWrapActive]}><Ionicons name={selected ? tab.activeIcon : tab.icon} size={21} color={selected ? colors.surface : colors.muted} /></View><Text style={[styles.tabLabel, selected && styles.tabLabelActive]}>{tab.label}</Text></AnimatedPressable>; })}</View></SafeAreaView>;
}

export default function App() { return <AppProvider><LacoApp /></AppProvider>; }

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.cream }, page: { flex: 1 }, loading: { flex: 1, alignItems: 'center', justifyContent: 'center' }, loadingText: { color: colors.muted, fontWeight: '800' },
  tabBar: { position: 'absolute', left: 12, right: 12, bottom: Platform.OS === 'ios' ? 8 : 12, height: Platform.OS === 'ios' ? 78 : 72, paddingTop: 8, paddingBottom: Platform.OS === 'ios' ? 12 : 7, paddingHorizontal: 5, borderRadius: 25, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.97)', borderWidth: 1, borderColor: 'rgba(229,232,227,0.9)', ...shadows.card },
  tabButtonSlot: { flex: 1 }, tabButton: { width: '100%', alignItems: 'center', justifyContent: 'center', gap: 3 }, tabIconWrap: { width: 36, height: 31, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, tabIconWrapActive: { backgroundColor: colors.ink }, tabLabel: { color: colors.muted, fontSize: 9, fontWeight: '800', textAlign: 'center' }, tabLabelActive: { color: colors.ink, fontWeight: '900' },
});
