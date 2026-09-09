import { useState } from 'react';
import { Alert, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { Avatar } from '../components/ui';
import { useApp } from '../state/AppContext';
import { friendlyCloudError } from '../services/cloud';
import { colors, radii, shadows } from '../theme';

export function FamilyScreen() {
  const {
    familyName,
    inviteCode,
    inviteExpiresAt,
    members,
    events,
    activeMemberId,
    currentUserId,
    setActiveMemberId,
    waterTotalFor,
    syncStatus,
    refresh,
    rotateFamilyInvite,
    revokeFamilyInvite,
    signOut,
  } = useApp();
  const [inviteBusy, setInviteBusy] = useState(false);
  const synced = syncStatus === 'synced';
  const isOwner = members.some((member) => member.userId === currentUserId && member.isOwner);
  const expiresLabel = inviteExpiresAt
    ? new Date(inviteExpiresAt).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '';

  const runInviteAction = async (action: () => Promise<void>, errorTitle: string) => {
    if (inviteBusy) return;
    setInviteBusy(true);
    try {
      await action();
    } catch (error) {
      Alert.alert(errorTitle, friendlyCloudError(error));
    } finally {
      setInviteBusy(false);
    }
  };

  const shareInvite = async () => {
    if (!inviteCode) return;
    await Share.share({
      title: `Convite para ${familyName}`,
      message: `Venha cuidar da família comigo no Laço 💚\n\nCódigo temporário: ${inviteCode}\n\nUse-o em até 24 horas. O convite funciona uma única vez.`,
    });
  };

  const confirmRotation = () => {
    if (!inviteCode) {
      void runInviteAction(rotateFamilyInvite, 'Não foi possível criar o convite');
      return;
    }
    Alert.alert(
      'Criar novo convite?',
      'O código atual deixará de funcionar imediatamente.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Criar novo', onPress: () => void runInviteAction(rotateFamilyInvite, 'Não foi possível renovar o convite') },
      ],
    );
  };

  const confirmRevocation = () => {
    Alert.alert(
      'Revogar este convite?',
      'O código deixará de funcionar imediatamente.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Revogar', style: 'destructive', onPress: () => void runInviteAction(revokeFamilyInvite, 'Não foi possível revogar o convite') },
      ],
    );
  };
  return <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
    <View style={styles.header}><View><Text style={styles.title}>{familyName}</Text><Text style={styles.subtitle}>Cuidado compartilhado fica bem mais leve.</Text></View><View style={styles.peopleIcon}><Ionicons name="people" size={24} color={colors.mintStrong} /></View></View>
    <AnimatedPressable onPress={() => void refresh().catch((error) => Alert.alert('Não foi possível atualizar', friendlyCloudError(error)))} style={styles.syncCard}><View style={[styles.syncDot, { backgroundColor: synced ? colors.mintStrong : syncStatus === 'syncing' ? '#E1A52C' : colors.coral }]} /><View style={styles.syncBody}><Text style={styles.syncTitle}>{synced ? 'Família sincronizada' : syncStatus === 'syncing' ? 'Atualizando os cuidados…' : 'Conexão instável'}</Text><Text style={styles.syncText}>{synced ? 'As mudanças aparecem nos celulares de todos.' : 'Toque aqui para tentar sincronizar novamente.'}</Text></View><Ionicons name={synced ? 'cloud-done-outline' : 'refresh-outline'} size={23} color={colors.muted} /></AnimatedPressable>
    {isOwner ? <View style={styles.inviteCard}>
      <View style={styles.inviteTop}>
        <View>
          <Text style={styles.inviteEyebrow}>CONVITE TEMPORÁRIO · 1 USO</Text>
          <Text style={styles.inviteCode}>{inviteCode || 'SEM CONVITE'}</Text>
        </View>
        <Text style={styles.inviteEmoji}>🏡</Text>
      </View>
      <Text style={styles.inviteText}>
        {inviteCode
          ? `Válido até ${expiresLabel}. Compartilhe apenas com a pessoa que deve entrar agora.`
          : 'Crie um código quando alguém precisar entrar. Ele expira em 24 horas e funciona uma vez.'}
      </Text>
      <View style={styles.inviteActions}>
        {inviteCode ? <AnimatedPressable disabled={inviteBusy} onPress={() => void shareInvite().catch(() => undefined)} style={styles.inviteButton}>
          <Ionicons name="share-social-outline" size={18} color={colors.ink} />
          <Text style={styles.inviteButtonText}>Compartilhar</Text>
        </AnimatedPressable> : null}
        <AnimatedPressable disabled={inviteBusy} onPress={confirmRotation} style={styles.inviteSecondaryButton}>
          <Ionicons name="refresh-outline" size={17} color={colors.surface} />
          <Text style={styles.inviteSecondaryText}>{inviteCode ? 'Renovar' : 'Criar convite'}</Text>
        </AnimatedPressable>
        {inviteCode ? <AnimatedPressable disabled={inviteBusy} onPress={confirmRevocation} style={styles.inviteDangerButton}>
          <Ionicons name="close-circle-outline" size={17} color="#FFC3BA" />
          <Text style={styles.inviteDangerText}>Revogar</Text>
        </AnimatedPressable> : null}
      </View>
    </View> : <View style={styles.memberInviteCard}>
      <Ionicons name="lock-closed-outline" size={22} color="#6557BC" />
      <View style={{ flex: 1 }}>
        <Text style={styles.privacyTitle}>Convites protegidos</Text>
        <Text style={styles.privacyText}>Somente a pessoa administradora pode criar e compartilhar códigos de acesso.</Text>
      </View>
    </View>}
    <View><Text style={styles.sectionTitle}>Quem está no Laço</Text><View style={styles.memberList}>{members.map((member) => {
      const total = waterTotalFor(member.id); const nextEvent = [...events].filter((event) => event.memberId === member.id && new Date(event.startsAt).getTime() > Date.now()).sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0]; const selected = member.id === activeMemberId;
      return <AnimatedPressable key={member.id} onPress={() => setActiveMemberId(member.id)} style={[styles.memberCard, selected && styles.memberCardSelected]}>
        <Avatar member={member} size={51} /><View style={styles.memberBody}><View style={styles.memberTitleRow}><Text style={styles.memberName}>{member.name}</Text><Text style={styles.memberRole}>{member.role}</Text></View><View style={styles.memberStats}><View style={styles.stat}><Ionicons name="water-outline" size={15} color={colors.blueStrong} /><Text style={styles.statText}>{total.toLocaleString('pt-BR')} ml hoje</Text></View><View style={styles.stat}><Ionicons name="calendar-outline" size={15} color={colors.coral} /><Text numberOfLines={1} style={styles.statText}>{nextEvent ? new Date(nextEvent.startsAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : 'sem compromissos'}</Text></View></View></View>
        {selected ? <View style={styles.selectedBadge}><Ionicons name="checkmark" size={15} color={colors.surface} /></View> : <Ionicons name="chevron-forward" size={20} color="#B8C1BD" />}
      </AnimatedPressable>;
    })}</View></View>
    <View style={styles.privacyCard}><View style={styles.privacyIcon}><Ionicons name="shield-checkmark-outline" size={24} color="#6557BC" /></View><View style={{ flex: 1 }}><Text style={styles.privacyTitle}>Privacidade é cuidado também</Text><Text style={styles.privacyText}>Só integrantes convidados devem acessar consultas, hidratação e memórias do grupo.</Text></View></View>
    <AnimatedPressable onPress={() => void signOut().catch((error) => Alert.alert('Não foi possível sair', friendlyCloudError(error)))} style={styles.signOutButton}><Ionicons name="log-out-outline" size={17} color={colors.muted} /><Text style={styles.signOutText}>Sair desta conta</Text></AnimatedPressable>
  </ScrollView>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 125, gap: 22 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, title: { color: colors.ink, fontSize: 29, fontWeight: '900', letterSpacing: -0.7 }, subtitle: { color: colors.muted, fontSize: 14, marginTop: 4 }, peopleIcon: { width: 48, height: 48, borderRadius: 17, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' },
  syncCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13, borderRadius: radii.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }, syncDot: { width: 9, height: 9, borderRadius: 5 }, syncBody: { flex: 1 }, syncTitle: { color: colors.ink, fontSize: 13, fontWeight: '900' }, syncText: { color: colors.muted, fontSize: 11, lineHeight: 15, marginTop: 2 },
  inviteCard: { borderRadius: radii.lg, backgroundColor: colors.ink, padding: 20, overflow: 'hidden', ...shadows.card }, inviteTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }, inviteEyebrow: { color: colors.mint, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 }, inviteCode: { maxWidth: 250, color: colors.surface, fontSize: 30, fontWeight: '900', letterSpacing: 2.2, marginTop: 5 }, inviteEmoji: { fontSize: 43 }, inviteText: { maxWidth: 300, color: '#C9D7D2', fontSize: 13, lineHeight: 18, marginTop: 8 }, inviteButton: { alignSelf: 'flex-start', minHeight: 43, marginTop: 16, paddingHorizontal: 14, borderRadius: 13, backgroundColor: colors.mint, flexDirection: 'row', alignItems: 'center', gap: 7 }, inviteButtonText: { color: colors.ink, fontSize: 12, fontWeight: '900' },
  inviteActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }, inviteSecondaryButton: { minHeight: 43, marginTop: 16, paddingHorizontal: 12, borderRadius: 13, borderWidth: 1, borderColor: '#58706A', flexDirection: 'row', alignItems: 'center', gap: 6 }, inviteSecondaryText: { color: colors.surface, fontSize: 12, fontWeight: '900' }, inviteDangerButton: { minHeight: 43, marginTop: 16, paddingHorizontal: 10, borderRadius: 13, flexDirection: 'row', alignItems: 'center', gap: 5 }, inviteDangerText: { color: '#FFC3BA', fontSize: 12, fontWeight: '900' }, memberInviteCard: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 16, borderRadius: radii.md, backgroundColor: colors.lavender },
  sectionTitle: { color: colors.ink, fontSize: 20, fontWeight: '900', marginBottom: 12 }, memberList: { gap: 10 }, memberCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radii.md, ...shadows.card }, memberCardSelected: { borderColor: colors.mintStrong, backgroundColor: '#F3FCF8' }, memberBody: { flex: 1 }, memberTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 }, memberName: { color: colors.ink, fontSize: 16, fontWeight: '900' }, memberRole: { color: colors.muted, fontSize: 10, fontWeight: '800', backgroundColor: '#ECEEEA', borderRadius: radii.pill, paddingHorizontal: 7, paddingVertical: 3 }, memberStats: { flexDirection: 'row', gap: 10, marginTop: 7 }, stat: { flexDirection: 'row', alignItems: 'center', gap: 3 }, statText: { maxWidth: 105, color: colors.muted, fontSize: 11, fontWeight: '700' }, selectedBadge: { width: 25, height: 25, borderRadius: 13, backgroundColor: colors.mintStrong, alignItems: 'center', justifyContent: 'center' },
  privacyCard: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 16, borderRadius: radii.md, backgroundColor: colors.lavender }, privacyIcon: { width: 45, height: 45, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.62)', alignItems: 'center', justifyContent: 'center' }, privacyTitle: { color: colors.ink, fontSize: 14, fontWeight: '900' }, privacyText: { color: '#665E84', fontSize: 11, lineHeight: 16, marginTop: 3 },
  signOutButton: { alignSelf: 'center', minHeight: 42, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 6 }, signOutText: { color: colors.muted, fontSize: 12, fontWeight: '800' },
});
