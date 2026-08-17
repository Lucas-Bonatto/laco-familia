import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AnimatedPressable } from '../components/AnimatedPressable';
import { useApp } from '../state/AppContext';
import { colors, radii, shadows } from '../theme';

export function OnboardingScreen() {
  const { completeOnboarding } = useApp();
  const [name, setName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const canContinue = Boolean(name.trim() && familyName.trim());

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        <View style={styles.brandMark}>
          <View style={styles.heartOne} />
          <View style={styles.heartTwo} />
          <Ionicons name="heart" size={42} color={colors.surface} />
        </View>

        <Text style={styles.eyebrow}>BEM-VINDO AO LAÇO</Text>
        <Text style={styles.title}>Cuidado em família,{`\n`}do jeitinho de vocês.</Text>
        <Text style={styles.subtitle}>
          Vamos começar sem dados inventados. Conte só o necessário para criar seu espaço local.
        </Text>

        <View style={styles.formCard}>
          <View style={styles.fieldHeader}>
            <View style={[styles.fieldIcon, { backgroundColor: colors.coralSoft }]}>
              <Ionicons name="person-outline" size={19} color={colors.coral} />
            </View>
            <View style={styles.fieldCopy}>
              <Text style={styles.label}>Como você quer aparecer?</Text>
              <Text style={styles.hint}>Pode ser seu primeiro nome ou apelido.</Text>
            </View>
          </View>
          <TextInput
            autoCapitalize="words"
            autoComplete="name"
            value={name}
            onChangeText={setName}
            placeholder="Ex.: Ana"
            placeholderTextColor="#9AA5A1"
            style={styles.input}
          />

          <View style={[styles.fieldHeader, styles.secondField]}>
            <View style={[styles.fieldIcon, { backgroundColor: colors.mint }]}>
              <Ionicons name="home-outline" size={19} color={colors.mintStrong} />
            </View>
            <View style={styles.fieldCopy}>
              <Text style={styles.label}>Qual é o nome da família?</Text>
              <Text style={styles.hint}>Ex.: Família Silva, Nosso Ninho...</Text>
            </View>
          </View>
          <TextInput
            autoCapitalize="words"
            value={familyName}
            onChangeText={setFamilyName}
            placeholder="Ex.: Família Silva"
            placeholderTextColor="#9AA5A1"
            style={styles.input}
          />

          <AnimatedPressable
            disabled={!canContinue}
            onPress={() => completeOnboarding(name, familyName)}
            style={styles.continueButton}
          >
            <Text style={styles.continueText}>Criar nosso espaço</Text>
            <Ionicons name="arrow-forward" size={19} color={colors.surface} />
          </AnimatedPressable>
        </View>

        <View style={styles.privacyRow}>
          <Ionicons name="shield-checkmark-outline" size={17} color={colors.mintStrong} />
          <Text style={styles.privacyText}>
            Neste momento, tudo ficará apenas neste aparelho.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 38 },
  brandMark: { width: 86, height: 86, borderRadius: 29, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ink, marginBottom: 27, overflow: 'hidden', ...shadows.card },
  heartOne: { position: 'absolute', width: 42, height: 42, borderRadius: 21, backgroundColor: colors.mintStrong, top: -10, right: -8 },
  heartTwo: { position: 'absolute', width: 28, height: 28, borderRadius: 14, backgroundColor: colors.coral, bottom: -5, left: -3 },
  eyebrow: { color: colors.mintStrong, fontSize: 11, fontWeight: '900', letterSpacing: 1.7 },
  title: { color: colors.ink, fontSize: 31, lineHeight: 36, fontWeight: '900', letterSpacing: -0.8, marginTop: 9 },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 11, marginBottom: 24 },
  formCard: { padding: 18, borderRadius: radii.lg, backgroundColor: colors.surface, ...shadows.card },
  fieldHeader: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  secondField: { marginTop: 20 },
  fieldIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  fieldCopy: { flex: 1 },
  label: { color: colors.ink, fontSize: 14, fontWeight: '900' },
  hint: { color: colors.muted, fontSize: 11, marginTop: 2 },
  input: { height: 51, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.line, backgroundColor: '#FAFAF7', paddingHorizontal: 14, color: colors.ink, fontSize: 15, marginTop: 10 },
  continueButton: { height: 55, borderRadius: 17, backgroundColor: colors.ink, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 23 },
  continueText: { color: colors.surface, fontSize: 15, fontWeight: '900' },
  privacyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 20 },
  privacyText: { color: colors.muted, fontSize: 11 },
});
