import { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { Avatar } from '../components/ui';
import { useApp } from '../state/AppContext';
import { friendlyCloudError } from '../services/cloud';
import { colors, radii, shadows } from '../theme';

export function MemoriesScreen() {
  const { memories, members, addMemory } = useApp();
  const [selectedUri, setSelectedUri] = useState<string | null>(null); const [title, setTitle] = useState(''); const [caption, setCaption] = useState('');
  const [saving, setSaving] = useState(false);
  const choosePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { Alert.alert('Precisamos da sua permissão', 'Libere o acesso às fotos para guardar um momento no Laço.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.85 });
    const asset = result.assets?.[0]; if (!result.canceled && asset) setSelectedUri(asset.uri);
  };
  const closeEditor = () => { setSelectedUri(null); setTitle(''); setCaption(''); };
  const save = async () => {
    if (!selectedUri || !title.trim() || saving) return;
    setSaving(true);
    try {
      await addMemory({ imageUri: selectedUri, title: title.trim(), caption: caption.trim() || undefined });
      closeEditor();
    } catch (error) {
      Alert.alert('A foto não foi guardada', friendlyCloudError(error));
    } finally {
      setSaving(false);
    }
  };

  return <View style={styles.screen}>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      <View style={styles.header}><View><Text style={styles.title}>Nossas memórias</Text><Text style={styles.subtitle}>A saúde também mora nos dias felizes. 📸</Text></View><AnimatedPressable onPress={() => void choosePhoto()} style={styles.addButton}><Ionicons name="camera" size={22} color={colors.surface} /></AnimatedPressable></View>
      <View style={styles.highlightCard}><View style={styles.highlightIcon}><Ionicons name="heart" size={25} color={colors.coral} /></View><View style={styles.highlightBody}><Text style={styles.highlightTitle}>O álbum mais importante</Text><Text style={styles.highlightText}>Passeios, abraços, pequenas vitórias e aquela foto que alguém tirou piscando.</Text></View></View>
      {memories.length ? <View style={styles.gallery}>{memories.map((memory) => {
        const author = members.find((member) => member.id === memory.createdById) ?? members[0];
        return <View key={memory.id} style={styles.memoryCard}><Image source={{ uri: memory.imageUri }} style={styles.memoryImage} /><View style={styles.memoryShade} /><View style={styles.memoryCopy}><Text style={styles.memoryTitle}>{memory.title}</Text>{memory.caption ? <Text style={styles.memoryCaption}>{memory.caption}</Text> : null}<View style={styles.memoryMeta}>{author ? <Avatar member={author} size={27} /> : null}<Text style={styles.memoryDate}>{new Date(memory.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</Text></View></View></View>;
      })}</View> : <View style={styles.empty}><View style={styles.photoStack}><View style={[styles.fakePhoto, styles.fakePhotoBack]} /><View style={[styles.fakePhoto, styles.fakePhotoFront]}><Text style={styles.fakePhotoEmoji}>🏡</Text></View></View><Text style={styles.emptyTitle}>Este álbum está pedindo história</Text><Text style={styles.emptyText}>Escolha uma foto do celular e inaugure as memórias da família.</Text><AnimatedPressable onPress={() => void choosePhoto()} style={styles.emptyButton}><Ionicons name="images-outline" size={19} color={colors.ink} /><Text style={styles.emptyButtonText}>Escolher primeira foto</Text></AnimatedPressable></View>}
    </ScrollView>
    <Modal visible={Boolean(selectedUri)} transparent animationType="slide" onRequestClose={closeEditor}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <View style={styles.modalTopbar}>
            <Text style={styles.modalTitle}>Conte a história</Text>
            <AnimatedPressable onPress={closeEditor} accessibilityLabel="Fechar memória" style={styles.modalCloseButton}>
              <Ionicons name="close" size={22} color={colors.ink} />
            </AnimatedPressable>
          </View>
          <ScrollView
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalContent}
          >
            {selectedUri ? <Image source={{ uri: selectedUri }} style={styles.preview} /> : null}
            <TextInput value={title} onChangeText={setTitle} placeholder="Ex.: Domingo no parque" placeholderTextColor="#9AA5A1" style={styles.input} returnKeyType="next" />
            <TextInput value={caption} onChangeText={setCaption} placeholder="Uma legenda carinhosa (opcional)" placeholderTextColor="#9AA5A1" style={[styles.input, styles.captionInput]} multiline />
            <View style={styles.modalActions}>
              <AnimatedPressable onPress={closeEditor} style={styles.cancelButton}><Text style={styles.cancelText}>Cancelar</Text></AnimatedPressable>
              <AnimatedPressable disabled={!title.trim() || saving} onPress={() => void save()} style={styles.saveButton}><Ionicons name="heart" size={17} color={colors.surface} /><Text style={styles.saveText}>{saving ? 'Enviando...' : 'Guardar'}</Text></AnimatedPressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 125 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 },
  title: { color: colors.ink, fontSize: 29, fontWeight: '900', letterSpacing: -0.7 }, subtitle: { color: colors.muted, fontSize: 14, marginTop: 4 }, addButton: { width: 50, height: 50, borderRadius: 17, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center', ...shadows.card },
  highlightCard: { flexDirection: 'row', gap: 13, alignItems: 'center', borderRadius: radii.md, padding: 16, backgroundColor: colors.coralSoft, marginBottom: 20 }, highlightIcon: { width: 46, height: 46, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.72)', alignItems: 'center', justifyContent: 'center' }, highlightBody: { flex: 1 }, highlightTitle: { color: colors.ink, fontSize: 15, fontWeight: '900' }, highlightText: { color: '#785F5B', fontSize: 12, lineHeight: 17, marginTop: 3 },
  gallery: { gap: 15 }, memoryCard: { height: 310, borderRadius: radii.lg, overflow: 'hidden', backgroundColor: '#DCE2DE', ...shadows.card }, memoryImage: { width: '100%', height: '100%' }, memoryShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 145, backgroundColor: 'rgba(14,37,32,0.55)' }, memoryCopy: { position: 'absolute', left: 18, right: 18, bottom: 17 }, memoryTitle: { color: colors.surface, fontSize: 23, fontWeight: '900' }, memoryCaption: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 4 }, memoryMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 11 }, memoryDate: { color: 'rgba(255,255,255,0.85)', fontSize: 11, textTransform: 'capitalize' },
  empty: { alignItems: 'center', paddingTop: 35, paddingHorizontal: 25 }, photoStack: { width: 150, height: 145, marginBottom: 17 }, fakePhoto: { position: 'absolute', width: 118, height: 132, borderRadius: 18, borderWidth: 7, borderColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadows.card }, fakePhotoBack: { left: 9, top: 4, backgroundColor: colors.yellow, transform: [{ rotate: '-9deg' }] }, fakePhotoFront: { right: 4, top: 8, backgroundColor: colors.mint, transform: [{ rotate: '7deg' }] }, fakePhotoEmoji: { fontSize: 48 }, emptyTitle: { color: colors.ink, fontSize: 20, fontWeight: '900', textAlign: 'center' }, emptyText: { color: colors.muted, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 7 }, emptyButton: { minHeight: 50, borderRadius: 16, backgroundColor: colors.mint, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 18, marginTop: 18 }, emptyButtonText: { color: colors.ink, fontSize: 13, fontWeight: '900' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(16,43,38,0.45)' }, modalSheet: { maxHeight: '94%', backgroundColor: colors.cream, paddingTop: 10, borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden' }, modalHandle: { width: 42, height: 5, borderRadius: 3, backgroundColor: '#CBD0CC', alignSelf: 'center', marginBottom: 9 }, modalTopbar: { minHeight: 52, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, modalCloseButton: { width: 40, height: 40, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }, modalContent: { paddingHorizontal: 20, paddingBottom: 30 }, preview: { width: '100%', height: 210, borderRadius: 20, backgroundColor: '#D8DEDA', marginBottom: 15 }, modalTitle: { color: colors.ink, fontSize: 23, fontWeight: '900' }, input: { minHeight: 50, borderRadius: radii.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14, color: colors.ink, fontSize: 15, marginBottom: 9 }, captionInput: { minHeight: 75, paddingTop: 13, textAlignVertical: 'top' }, modalActions: { flexDirection: 'row', gap: 9, marginTop: 5 }, cancelButton: { flex: 1, height: 51, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E6E8E4' }, cancelText: { color: colors.muted, fontWeight: '800' }, saveButton: { flex: 1.4, height: 51, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.ink }, saveText: { color: colors.surface, fontWeight: '900' },
});
