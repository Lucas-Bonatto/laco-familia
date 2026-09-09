import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { friendlyCloudError } from '../services/cloud';
import { useApp } from '../state/AppContext';
import { colors, radii, shadows } from '../theme';

function BrandHeader({ subtitle }: { subtitle: string }) {
  return <View style={styles.brandHeader}>
    <View style={styles.brandMark}><Ionicons name="heart" size={31} color={colors.surface} /></View>
    <View style={styles.brandCopy}><Text style={styles.eyebrow}>LAÇO</Text><Text style={styles.brandSubtitle}>{subtitle}</Text></View>
  </View>;
}

export function SupabaseSetupScreen() {
  return <View style={styles.centerScreen}>
    <View style={styles.setupCard}>
      <View style={styles.cloudIcon}><Ionicons name="cloud-outline" size={34} color={colors.mintStrong} /></View>
      <Text style={styles.setupTitle}>Só falta a chave pública</Text>
      <Text style={styles.setupText}>O app já está preparado para a nuvem. Adicione a URL e a chave publicável do Supabase no arquivo .env e reinicie o Expo.</Text>
      <View style={styles.safeNote}><Ionicons name="shield-checkmark-outline" size={18} color="#6557BC" /><Text style={styles.safeNoteText}>Nunca coloque a chave secreta service_role dentro do app.</Text></View>
    </View>
  </View>;
}

export function AuthScreen() {
  const { signIn, signUp } = useApp();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const valid = email.trim().includes('@') && password.length >= 6 && (mode === 'signin' || Boolean(displayName.trim()));

  const submit = async () => {
    if (!valid || loading) return;
    setLoading(true);
    try {
      if (mode === 'signin') {
        await signIn(email, password);
      } else {
        const result = await signUp(displayName, email, password);
        if (result.needsEmailConfirmation) {
          Alert.alert('Confira seu e-mail 💌', 'Enviamos um link de confirmação. Depois de tocar nele, volte ao Laço e entre com sua senha.');
          setMode('signin');
        }
      }
    } catch (error) {
      Alert.alert('Não deu certo ainda', friendlyCloudError(error));
    } finally {
      setLoading(false);
    }
  };

  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.authContent}>
      <BrandHeader subtitle="Cuidado em família, onde cada um estiver." />
      <View style={styles.heroIcon}><Text style={styles.heroEmoji}>🏡</Text></View>
      <Text style={styles.title}>{mode === 'signin' ? 'Que bom ter você de volta.' : 'Vamos criar seu acesso.'}</Text>
      <Text style={styles.subtitle}>{mode === 'signin' ? 'Entre para ver os cuidados compartilhados da família.' : 'Cada familiar terá seu próprio login, mas todos cuidarão do mesmo grupo.'}</Text>
      <View style={styles.switchRow}>
        <View style={styles.switchButtonSlot}>
          <AnimatedPressable containerStyle={styles.switchButtonContainer} onPress={() => setMode('signin')} style={[styles.switchButton, mode === 'signin' && styles.switchButtonActive]}><Text style={[styles.switchText, mode === 'signin' && styles.switchTextActive]}>Entrar</Text></AnimatedPressable>
        </View>
        <View style={styles.switchButtonSlot}>
          <AnimatedPressable containerStyle={styles.switchButtonContainer} onPress={() => setMode('signup')} style={[styles.switchButton, mode === 'signup' && styles.switchButtonActive]}><Text style={[styles.switchText, mode === 'signup' && styles.switchTextActive]}>Criar conta</Text></AnimatedPressable>
        </View>
      </View>
      <View style={styles.formCard}>
        {mode === 'signup' ? <><Text style={styles.label}>Como você quer aparecer?</Text><TextInput value={displayName} onChangeText={setDisplayName} autoCapitalize="words" autoComplete="name" placeholder="Ex.: Lucas" placeholderTextColor="#9AA5A1" style={styles.input} /></> : null}
        <Text style={styles.label}>E-mail</Text><TextInput value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" placeholder="voce@email.com" placeholderTextColor="#9AA5A1" style={styles.input} />
        <Text style={styles.label}>Senha</Text><TextInput value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} placeholder="Pelo menos 6 caracteres" placeholderTextColor="#9AA5A1" style={styles.input} />
        <AnimatedPressable disabled={!valid || loading} onPress={() => void submit()} style={styles.primaryButton}><Text style={styles.primaryButtonText}>{loading ? 'Um instante...' : mode === 'signin' ? 'Entrar no Laço' : 'Criar meu acesso'}</Text><Ionicons name="arrow-forward" size={19} color={colors.surface} /></AnimatedPressable>
      </View>
      <View style={styles.privacyRow}><Ionicons name="lock-closed-outline" size={16} color={colors.mintStrong} /><Text style={styles.privacyText}>Seus dados ficam protegidos pelo login e pelo grupo familiar.</Text></View>
    </ScrollView>
  </KeyboardAvoidingView>;
}

export function FamilySetupScreen() {
  const { createFamily, joinFamily, signOut, suggestedDisplayName } = useApp();
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [displayName, setDisplayName] = useState(suggestedDisplayName);
  const [familyName, setFamilyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  useEffect(() => { if (!displayName) setDisplayName(suggestedDisplayName); }, [displayName, suggestedDisplayName]);
  const valid = Boolean(displayName.trim() && (mode === 'create' ? familyName.trim() : inviteCode.replace(/\W/g, '').length === 12));

  const submit = async () => {
    if (!valid || loading) return;
    setLoading(true);
    try {
      if (mode === 'create') await createFamily(displayName, familyName);
      else await joinFamily(displayName, inviteCode);
    } catch (error) {
      Alert.alert('Quase lá', friendlyCloudError(error));
    } finally {
      setLoading(false);
    }
  };

  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.authContent}>
      <BrandHeader subtitle="Agora escolha onde sua família vai se encontrar." />
      <Text style={styles.title}>Seu grupo familiar</Text>
      <Text style={styles.subtitle}>Crie um grupo novo ou use o código que alguém da família enviou.</Text>
      <View style={styles.switchRow}>
        <View style={styles.switchButtonSlot}>
          <AnimatedPressable containerStyle={styles.switchButtonContainer} onPress={() => setMode('create')} style={[styles.switchButton, mode === 'create' && styles.switchButtonActive]}><Text style={[styles.switchText, mode === 'create' && styles.switchTextActive]}>Criar família</Text></AnimatedPressable>
        </View>
        <View style={styles.switchButtonSlot}>
          <AnimatedPressable containerStyle={styles.switchButtonContainer} onPress={() => setMode('join')} style={[styles.switchButton, mode === 'join' && styles.switchButtonActive]}><Text style={[styles.switchText, mode === 'join' && styles.switchTextActive]}>Usar convite</Text></AnimatedPressable>
        </View>
      </View>
      <View style={styles.formCard}>
        <Text style={styles.label}>Seu nome no grupo</Text><TextInput value={displayName} onChangeText={setDisplayName} autoCapitalize="words" placeholder="Ex.: Lucas" placeholderTextColor="#9AA5A1" style={styles.input} />
        {mode === 'create' ? <><Text style={styles.label}>Nome da família</Text><TextInput value={familyName} onChangeText={setFamilyName} autoCapitalize="words" placeholder="Ex.: Nosso Ninho" placeholderTextColor="#9AA5A1" style={styles.input} /></> : <><Text style={styles.label}>Código do convite</Text><TextInput value={inviteCode} onChangeText={(value) => setInviteCode(value.toLocaleUpperCase('pt-BR').replace(/[^A-F0-9]/g, '').slice(0, 12))} autoCapitalize="characters" autoCorrect={false} maxLength={12} placeholder="Ex.: A1B2C3D4E5F6" placeholderTextColor="#9AA5A1" style={[styles.input, styles.codeInput]} /></>}
        <AnimatedPressable disabled={!valid || loading} onPress={() => void submit()} style={styles.primaryButton}><Ionicons name={mode === 'create' ? 'home-outline' : 'people-outline'} size={19} color={colors.surface} /><Text style={styles.primaryButtonText}>{loading ? 'Preparando...' : mode === 'create' ? 'Criar nosso espaço' : 'Entrar na família'}</Text></AnimatedPressable>
      </View>
      <AnimatedPressable onPress={() => void signOut().catch((error) => Alert.alert('Não foi possível sair', friendlyCloudError(error)))} style={styles.signOutButton}><Ionicons name="log-out-outline" size={17} color={colors.muted} /><Text style={styles.signOutText}>Usar outra conta</Text></AnimatedPressable>
    </ScrollView>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream }, centerScreen: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream }, authContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 23, paddingVertical: 34 },
  brandHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 27 }, brandMark: { width: 54, height: 54, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ink, ...shadows.card }, brandCopy: { flex: 1 }, eyebrow: { color: colors.mintStrong, fontSize: 13, fontWeight: '900', letterSpacing: 2 }, brandSubtitle: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 3 },
  heroIcon: { width: 76, height: 76, borderRadius: 26, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center', marginBottom: 17 }, heroEmoji: { fontSize: 39 }, title: { color: colors.ink, fontSize: 29, lineHeight: 34, fontWeight: '900', letterSpacing: -0.7 }, subtitle: { color: colors.muted, fontSize: 14, lineHeight: 20, marginTop: 8, marginBottom: 20 },
  switchRow: { flexDirection: 'row', width: '100%', padding: 4, gap: 4, borderRadius: 16, backgroundColor: '#E7E9E5', marginBottom: 12 }, switchButtonSlot: { flex: 1, minWidth: 0 }, switchButtonContainer: { width: '100%' }, switchButton: { width: '100%', height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, switchButtonActive: { backgroundColor: colors.surface, ...shadows.card }, switchText: { color: colors.muted, fontSize: 13, fontWeight: '900', textAlign: 'center' }, switchTextActive: { color: colors.ink },
  formCard: { padding: 18, borderRadius: radii.lg, backgroundColor: colors.surface, ...shadows.card }, label: { color: colors.ink, fontSize: 12, fontWeight: '900', marginTop: 10, marginBottom: 7 }, input: { height: 51, paddingHorizontal: 14, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.line, backgroundColor: '#FAFAF7', color: colors.ink, fontSize: 15 }, codeInput: { fontSize: 21, fontWeight: '900', letterSpacing: 4, textAlign: 'center' }, primaryButton: { minHeight: 55, marginTop: 21, paddingHorizontal: 18, borderRadius: 17, backgroundColor: colors.ink, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' }, primaryButtonText: { color: colors.surface, fontSize: 15, fontWeight: '900' },
  privacyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 19 }, privacyText: { maxWidth: 280, color: colors.muted, fontSize: 11, lineHeight: 15, textAlign: 'center' }, signOutButton: { alignSelf: 'center', minHeight: 42, paddingHorizontal: 14, marginTop: 15, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' }, signOutText: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  setupCard: { width: '100%', maxWidth: 420, padding: 24, borderRadius: radii.lg, backgroundColor: colors.surface, ...shadows.card }, cloudIcon: { width: 65, height: 65, borderRadius: 22, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center', marginBottom: 18 }, setupTitle: { color: colors.ink, fontSize: 24, fontWeight: '900' }, setupText: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 8 }, safeNote: { marginTop: 18, padding: 13, borderRadius: 14, backgroundColor: colors.lavender, flexDirection: 'row', alignItems: 'center', gap: 9 }, safeNoteText: { flex: 1, color: '#655E84', fontSize: 11, lineHeight: 16, fontWeight: '800' },
});
