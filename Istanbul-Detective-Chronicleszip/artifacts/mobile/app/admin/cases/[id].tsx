import React, { useState, useEffect } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useGetCase, useUpdateCase, useCreateCaseStep, useDeleteCaseStep } from '@workspace/api-client-react';
import { LoadingScreen } from '@/components/LoadingScreen';

const STEP_TYPES = ['photo', 'riddle', 'location'];

export default function EditCaseScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: caseData, isLoading, refetch } = useGetCase(id!);
  const updateCase = useUpdateCase();
  const createStep = useCreateCaseStep();
  const deleteStep = useDeleteCaseStep();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [district, setDistrict] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // New step form
  const [stepTitle, setStepTitle] = useState('');
  const [stepDesc, setStepDesc] = useState('');
  const [stepType, setStepType] = useState('photo');
  const [stepMatchPct, setStepMatchPct] = useState('70');
  const [stepHint, setStepHint] = useState('');
  const [stepAnswer, setStepAnswer] = useState('');
  const [stepLat, setStepLat] = useState('');
  const [stepLng, setStepLng] = useState('');
  const [stepRadius, setStepRadius] = useState('200');
  const [showAddStep, setShowAddStep] = useState(false);

  useEffect(() => {
    if (caseData) {
      setTitle(caseData.title);
      setDescription(caseData.description);
      setDistrict(caseData.district);
      setIsActive(caseData.isActive);
    }
  }, [caseData]);

  if (isLoading || !caseData) return <LoadingScreen />;

  async function handleSave() {
    setIsSaving(true);
    try {
      await updateCase.mutateAsync({ id: id!, data: { title, description, district, isActive } });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('Hata', 'Dava güncellenemedi.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAddStep() {
    if (!stepTitle.trim() || !stepDesc.trim()) {
      Alert.alert('Eksik', 'Adım başlığı ve açıklaması zorunludur.');
      return;
    }
    try {
      await createStep.mutateAsync({
        caseId: id!,
        data: {
          order: caseData?.steps?.length ?? 0,
          type: stepType,
          title: stepTitle,
          description: stepDesc,
          targetImageUrl: null,
          targetLat: stepLat ? parseFloat(stepLat) : null,
          targetLng: stepLng ? parseFloat(stepLng) : null,
          targetRadiusM: stepRadius ? parseInt(stepRadius, 10) : null,
          targetAnswer: stepAnswer || null,
          requiredMatchPct: parseInt(stepMatchPct, 10) || 70,
          hint: stepHint || null,
        },
      });
      setShowAddStep(false);
      setStepTitle('');
      setStepDesc('');
      setStepAnswer('');
      setStepHint('');
      setStepLat('');
      setStepLng('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      refetch();
    } catch {
      Alert.alert('Hata', 'Adım eklenemedi.');
    }
  }

  async function handleDeleteStep(stepId: string) {
    Alert.alert('Adımı Sil', 'Bu adımı silmek istediğinizden emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteStep.mutateAsync({ caseId: id!, stepId });
            refetch();
          } catch {
            Alert.alert('Hata', 'Adım silinemedi.');
          }
        },
      },
    ]);
  }

  const inputStyle = [styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 16, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>{caseData.title}</Text>
          <TouchableOpacity style={[styles.saveBtn, { backgroundColor: isSaving ? colors.muted : colors.primary }]} onPress={handleSave} disabled={isSaving}>
            <Text style={styles.saveBtnText}>{isSaving ? '...' : 'Kaydet'}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
          {/* Case fields */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Dava Bilgileri</Text>
            <TextInput style={inputStyle} value={title} onChangeText={setTitle} placeholder="Başlık" placeholderTextColor={colors.mutedForeground} />
            <TextInput style={[inputStyle, { minHeight: 80 }]} value={description} onChangeText={setDescription} placeholder="Açıklama" placeholderTextColor={colors.mutedForeground} multiline textAlignVertical="top" />
            <TextInput style={inputStyle} value={district} onChangeText={setDistrict} placeholder="İlçe" placeholderTextColor={colors.mutedForeground} />
            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: colors.foreground }]}>Aktif</Text>
              <Switch value={isActive} onValueChange={setIsActive} trackColor={{ false: colors.muted, true: colors.primary }} />
            </View>
          </View>

          {/* Steps */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.stepHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Adımlar ({caseData.steps.length})</Text>
              <TouchableOpacity style={[styles.addStepBtn, { backgroundColor: colors.primary }]} onPress={() => setShowAddStep(!showAddStep)}>
                <Feather name={showAddStep ? 'x' : 'plus'} size={16} color="#FFF" />
              </TouchableOpacity>
            </View>

            {caseData.steps.map((step, i) => (
              <View key={step.id} style={[styles.stepRow, { borderColor: colors.border }]}>
                <View style={[styles.stepNum, { backgroundColor: colors.muted }]}>
                  <Text style={[styles.stepNumText, { color: colors.foreground }]}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.stepTitle, { color: colors.foreground }]}>{step.title}</Text>
                  <Text style={[styles.stepMeta, { color: colors.mutedForeground }]}>{step.type} — %{step.requiredMatchPct}</Text>
                </View>
                <TouchableOpacity onPress={() => handleDeleteStep(step.id)} style={[styles.deleteBtn, { backgroundColor: colors.destructive + '20' }]}>
                  <Feather name="trash-2" size={14} color={colors.destructive} />
                </TouchableOpacity>
              </View>
            ))}

            {showAddStep && (
              <View style={[styles.addStepForm, { borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Yeni Adım</Text>

                {/* Type selector */}
                <View style={styles.typeRow}>
                  {STEP_TYPES.map(t => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.typeChip, { backgroundColor: stepType === t ? colors.primary : colors.muted, borderColor: stepType === t ? colors.primary : colors.border }]}
                      onPress={() => setStepType(t)}
                    >
                      <Text style={[styles.typeText, { color: stepType === t ? '#FFF' : colors.foreground }]}>
                        {t === 'photo' ? 'Fotoğraf' : t === 'riddle' ? 'Bilmece' : 'Konum'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TextInput style={inputStyle} value={stepTitle} onChangeText={setStepTitle} placeholder="Adım başlığı" placeholderTextColor={colors.mutedForeground} />
                <TextInput style={[inputStyle, { minHeight: 70 }]} value={stepDesc} onChangeText={setStepDesc} placeholder="Adım açıklaması" placeholderTextColor={colors.mutedForeground} multiline textAlignVertical="top" />

                <View style={styles.inlineRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.microLabel, { color: colors.mutedForeground }]}>Min. Eşleşme %</Text>
                    <TextInput style={inputStyle} value={stepMatchPct} onChangeText={setStepMatchPct} keyboardType="numeric" placeholder="70" placeholderTextColor={colors.mutedForeground} />
                  </View>
                </View>

                {stepType === 'riddle' && (
                  <TextInput style={inputStyle} value={stepAnswer} onChangeText={setStepAnswer} placeholder="Doğru cevap" placeholderTextColor={colors.mutedForeground} />
                )}

                {(stepType === 'photo' || stepType === 'location') && (
                  <View style={styles.inlineRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.microLabel, { color: colors.mutedForeground }]}>Enlem</Text>
                      <TextInput style={inputStyle} value={stepLat} onChangeText={setStepLat} keyboardType="decimal-pad" placeholder="41.0082" placeholderTextColor={colors.mutedForeground} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.microLabel, { color: colors.mutedForeground }]}>Boylam</Text>
                      <TextInput style={inputStyle} value={stepLng} onChangeText={setStepLng} keyboardType="decimal-pad" placeholder="28.9784" placeholderTextColor={colors.mutedForeground} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.microLabel, { color: colors.mutedForeground }]}>Yarıçap (m)</Text>
                      <TextInput style={inputStyle} value={stepRadius} onChangeText={setStepRadius} keyboardType="numeric" placeholder="200" placeholderTextColor={colors.mutedForeground} />
                    </View>
                  </View>
                )}

                <TextInput style={inputStyle} value={stepHint} onChangeText={setStepHint} placeholder="İpucu (opsiyonel)" placeholderTextColor={colors.mutedForeground} />

                <TouchableOpacity style={[styles.addStepSubmit, { backgroundColor: colors.primary }]} onPress={handleAddStep}>
                  <Feather name="plus" size={16} color="#FFF" />
                  <Text style={styles.addStepSubmitText}>Adımı Ekle</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 16, fontWeight: '700', flex: 1 },
  saveBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  saveBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  content: { padding: 16, gap: 14 },
  section: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  input: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  switchLabel: { fontSize: 14, fontWeight: '600' },
  stepHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addStepBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1 },
  stepNum: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { fontSize: 13, fontWeight: '700' },
  stepTitle: { fontSize: 13, fontWeight: '600' },
  stepMeta: { fontSize: 11, marginTop: 2 },
  deleteBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  addStepForm: { borderTopWidth: 1, paddingTop: 14, gap: 10 },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeChip: { flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  typeText: { fontSize: 12, fontWeight: '600' },
  inlineRow: { flexDirection: 'row', gap: 8 },
  microLabel: { fontSize: 10, fontWeight: '600', marginBottom: 4, textTransform: 'uppercase' },
  addStepSubmit: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10 },
  addStepSubmitText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
});
