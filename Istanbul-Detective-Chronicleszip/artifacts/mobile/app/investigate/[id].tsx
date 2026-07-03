import React, { useState, useRef } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import {
  useGetCase,
  useGetAllProgress,
  useCreateSubmission,
  useUpsertCaseProgress,
  getGetAllProgressQueryKey,
} from '@workspace/api-client-react';
import { useUser } from '@/context/UserContext';
import { LoadingScreen } from '@/components/LoadingScreen';
import { MatchScoreDisplay } from '@/components/MatchScoreDisplay';
import type { SubmissionResult, CaseStep } from '@workspace/api-client-react';

export default function InvestigateScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id, step: stepParam } = useLocalSearchParams<{ id: string; step: string }>();
  const { user, updateUser } = useUser();

  const [currentStepIdx, setCurrentStepIdx] = useState(parseInt(stepParam ?? '0', 10));
  const [answer, setAnswer] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

  const { data: caseData, isLoading } = useGetCase(id!);
  const { data: progressList, refetch: refetchProgress } = useGetAllProgress(user?.id ?? 'anonymous', {
    query: { enabled: !!user?.id, queryKey: getGetAllProgressQueryKey(user?.id ?? 'anonymous') },
  });

  const createSubmission = useCreateSubmission();
  const upsertProgress = useUpsertCaseProgress();

  if (isLoading || !caseData) return <LoadingScreen message="Dava yükleniyor..." />;

  const steps = caseData.steps;
  const currentStep = steps[currentStepIdx];
  const progress = progressList?.find(p => p.caseId === id);
  const completedStepIds: string[] = progress?.completedSteps ?? [];
  const isAlreadyCompleted = completedStepIds.includes(currentStep?.id ?? '');

  async function handleTakePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Kamera erişimi için izin vermeniz gerekiyor.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets[0]) {
      setCapturedPhoto(result.assets[0].uri);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }

  async function handleSubmit() {
    if (!currentStep || !user) return;
    setIsSubmitting(true);

    try {
      let userLat: number | undefined;
      let userLng: number | undefined;

      if (currentStep.type === 'photo' || currentStep.type === 'location') {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            userLat = loc.coords.latitude;
            userLng = loc.coords.longitude;
          }
        } catch {
          // Location unavailable, continue without it
        }
      }

      const submissionResult = await createSubmission.mutateAsync({
        data: {
          userId: user.id,
          caseId: id!,
          stepId: currentStep.id,
          userLat: userLat ?? null,
          userLng: userLng ?? null,
          userAnswer: currentStep.type === 'riddle' ? answer : null,
        },
      });

      setResult(submissionResult);
      Haptics.notificationAsync(
        submissionResult.passed
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Error
      );

      if (submissionResult.passed) {
        const newCompletedSteps = [...new Set([...completedStepIds, currentStep.id])];
        const isLastStep = currentStepIdx === steps.length - 1;
        const newStatus = isLastStep ? 'completed' : 'active';
        const nextStepIdx = isLastStep ? currentStepIdx : currentStepIdx + 1;

        await upsertProgress.mutateAsync({
          userId: user.id,
          caseId: id!,
          data: {
            userId: user.id,
            currentStep: nextStepIdx,
            completedSteps: newCompletedSteps,
            status: newStatus,
          },
        });

        if (isLastStep) {
          // Award XP for solving the case
          const newXp = (user?.xp ?? 0) + 100;
          await updateUser({ xp: newXp });
        }

        await refetchProgress();
      }
    } catch (err) {
      Alert.alert('Hata', 'Gönderim sırasında bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleNext() {
    if (!result) return;
    if (!result.passed) {
      setResult(null);
      setCapturedPhoto(null);
      setAnswer('');
      return;
    }

    const isLastStep = currentStepIdx === steps.length - 1;
    if (isLastStep) {
      Alert.alert('Tebrikler!', 'Davayı başarıyla çözdünüz!', [
        { text: 'Ana Sayfaya Dön', onPress: () => router.replace('/') },
      ]);
    } else {
      setCurrentStepIdx(i => i + 1);
      setResult(null);
      setCapturedPhoto(null);
      setAnswer('');
      setShowHint(false);
    }
  }

  if (!currentStep) return <LoadingScreen />;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <LinearGradient colors={['#1A0008', colors.background]} style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>{caseData.title}</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
            Adım {currentStepIdx + 1} / {steps.length}
          </Text>
        </View>
        {/* Step progress dots */}
        <View style={styles.dots}>
          {steps.map((s, i) => (
            <View
              key={s.id}
              style={[
                styles.dot,
                {
                  backgroundColor: completedStepIds.includes(s.id)
                    ? '#22C55E'
                    : i === currentStepIdx
                    ? colors.primary
                    : colors.border,
                },
              ]}
            />
          ))}
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}>
        {/* Step Info */}
        <View style={[styles.stepCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.stepTypeRow}>
            <View style={[styles.stepTypeIcon, { backgroundColor: colors.primary + '20' }]}>
              <Feather
                name={(currentStep.type === 'photo' ? 'camera' : currentStep.type === 'riddle' ? 'help-circle' : 'map-pin') as any}
                size={20}
                color={colors.primary}
              />
            </View>
            <Text style={[styles.stepType, { color: colors.primary }]}>
              {currentStep.type === 'photo' ? 'Fotoğraf Kanıtı' : currentStep.type === 'riddle' ? 'Bilmece' : 'Konum Doğrulama'}
            </Text>
          </View>
          <Text style={[styles.stepTitle, { color: colors.foreground }]}>{currentStep.title}</Text>
          <Text style={[styles.stepDesc, { color: colors.mutedForeground }]}>{currentStep.description}</Text>

          <View style={[styles.matchRequirement, { backgroundColor: colors.muted }]}>
            <MaterialCommunityIcons name="percent" size={14} color={colors.accent} />
            <Text style={[styles.matchText, { color: colors.accent }]}>
              Minimum Eşleşme: %{currentStep.requiredMatchPct}
            </Text>
          </View>
        </View>

        {/* Result View */}
        {result ? (
          <View style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MatchScoreDisplay
              score={result.matchScore}
              required={result.requiredScore}
              feedback={result.feedback}
            />
            <TouchableOpacity
              style={[styles.nextBtn, { backgroundColor: result.passed ? '#22C55E' : colors.primary }]}
              onPress={handleNext}
            >
              <Text style={styles.nextBtnText}>{result.passed ? (currentStepIdx === steps.length - 1 ? 'Davayı Tamamla' : 'Sonraki Adım') : 'Tekrar Dene'}</Text>
              <Feather name={result.passed ? 'arrow-right' : 'refresh-cw'} size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Photo type UI */}
            {currentStep.type === 'photo' && (
              <View style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <TouchableOpacity
                  style={[styles.cameraBtn, { borderColor: capturedPhoto ? '#22C55E' : colors.border }]}
                  onPress={handleTakePhoto}
                >
                  {capturedPhoto ? (
                    <>
                      <Feather name="check-circle" size={32} color="#22C55E" />
                      <Text style={[styles.cameraBtnText, { color: '#22C55E' }]}>Fotoğraf Çekildi</Text>
                      <Text style={[styles.cameraBtnSub, { color: colors.mutedForeground }]}>Değiştirmek için tekrar bas</Text>
                    </>
                  ) : (
                    <>
                      <View style={[styles.cameraIconCircle, { backgroundColor: colors.primary + '20' }]}>
                        <Feather name="camera" size={32} color={colors.primary} />
                      </View>
                      <Text style={[styles.cameraBtnText, { color: colors.foreground }]}>Kanıt Fotoğrafı Çek</Text>
                      <Text style={[styles.cameraBtnSub, { color: colors.mutedForeground }]}>Hedef konumda kameranı aç</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Riddle type UI */}
            {currentStep.type === 'riddle' && (
              <View style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.actionLabel, { color: colors.mutedForeground }]}>Cevabınız:</Text>
                <TextInput
                  value={answer}
                  onChangeText={setAnswer}
                  placeholder="Cevabı buraya yazın..."
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.answerInput, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                  autoCapitalize="none"
                />
              </View>
            )}

            {/* Location type UI */}
            {currentStep.type === 'location' && (
              <View style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.locationInfo}>
                  <MaterialCommunityIcons name="radar" size={48} color={colors.primary + '80'} />
                  <Text style={[styles.locationText, { color: colors.foreground }]}>
                    Hedef Konuma Gidin
                  </Text>
                  <Text style={[styles.locationSub, { color: colors.mutedForeground }]}>
                    Konum doğrulandığında GPS bilginiz alınacak
                  </Text>
                  {currentStep.hint && (
                    <View style={[styles.locationHintBox, { backgroundColor: colors.muted }]}>
                      <Feather name="map-pin" size={14} color={colors.accent} />
                      <Text style={[styles.locationHintText, { color: colors.accent }]}>{currentStep.hint}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Hint */}
            {currentStep.hint && currentStep.type !== 'location' && (
              <TouchableOpacity
                style={[styles.hintBtn, { borderColor: colors.border }]}
                onPress={() => setShowHint(!showHint)}
              >
                <Feather name="info" size={15} color={colors.accent} />
                <Text style={[styles.hintBtnText, { color: colors.accent }]}>
                  {showHint ? 'İpucunu Gizle' : 'İpucunu Göster'}
                </Text>
              </TouchableOpacity>
            )}
            {showHint && currentStep.hint && (
              <View style={[styles.hintBox, { backgroundColor: colors.accent + '15', borderColor: colors.accent + '40' }]}>
                <Text style={[styles.hintText, { color: colors.accent }]}>{currentStep.hint}</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Submit Button */}
      {!result && (
        <View style={[styles.submitContainer, { paddingBottom: insets.bottom + 8, backgroundColor: colors.background + 'F0', borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[
              styles.submitBtn,
              {
                backgroundColor: isSubmitting ? colors.muted : colors.primary,
                opacity: isSubmitting ? 0.7 : 1,
              },
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting || (currentStep.type === 'riddle' && !answer.trim())}
          >
            {isSubmitting ? (
              <Text style={styles.submitBtnText}>Analiz Ediliyor...</Text>
            ) : (
              <>
                <MaterialCommunityIcons name="send" size={18} color="#FFF" />
                <Text style={styles.submitBtnText}>Kanıtı Gönder</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 15, fontWeight: '700' },
  headerSub: { fontSize: 12 },
  dots: { flexDirection: 'row', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  content: { padding: 20, gap: 16 },
  stepCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  stepTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepTypeIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  stepType: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  stepTitle: { fontSize: 18, fontWeight: '800', lineHeight: 24 },
  stepDesc: { fontSize: 14, lineHeight: 21 },
  matchRequirement: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8 },
  matchText: { fontSize: 12, fontWeight: '600' },
  actionCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  cameraBtn: { borderRadius: 14, borderWidth: 2, borderStyle: 'dashed', padding: 30, alignItems: 'center', gap: 10 },
  cameraIconCircle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  cameraBtnText: { fontSize: 16, fontWeight: '700' },
  cameraBtnSub: { fontSize: 12, textAlign: 'center' },
  actionLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  answerInput: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  locationInfo: { alignItems: 'center', gap: 12, paddingVertical: 12 },
  locationText: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  locationSub: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  locationHintBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 10 },
  locationHintText: { fontSize: 13, flex: 1, lineHeight: 18 },
  hintBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  hintBtnText: { fontSize: 13, fontWeight: '600' },
  hintBox: { borderRadius: 12, borderWidth: 1, padding: 14 },
  hintText: { fontSize: 14, lineHeight: 21 },
  resultCard: { borderRadius: 16, borderWidth: 1, padding: 20, gap: 16 },
  nextBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12 },
  nextBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  submitContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14 },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
