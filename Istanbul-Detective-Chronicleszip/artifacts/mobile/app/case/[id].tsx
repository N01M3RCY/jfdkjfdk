import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useGetCase, useGetAllProgress, getGetAllProgressQueryKey } from '@workspace/api-client-react';
import { useUser } from '@/context/UserContext';
import { LoadingScreen } from '@/components/LoadingScreen';
import type { CaseStep } from '@workspace/api-client-react';

const STEP_TYPE_ICONS: Record<string, string> = {
  photo: 'camera',
  riddle: 'help-circle',
  location: 'map-pin',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  kolay: '#22C55E',
  orta: '#F59E0B',
  zor: '#EF4444',
};

interface Suspect {
  id: string;
  name: string;
  bio: string;
  motive: string;
  alibi: string;
  isCulprit: boolean;
  culpritClue?: string;
}

export default function CaseDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useUser();
  const [showCulprit, setShowCulprit] = useState(false);

  const { data: caseData, isLoading } = useGetCase(id!);
  const { data: progressList } = useGetAllProgress(user?.id ?? 'anonymous', {
    query: { enabled: !!user?.id, queryKey: getGetAllProgressQueryKey(user?.id ?? 'anonymous') },
  });

  const progress = progressList?.find(p => p.caseId === id);

  if (isLoading || !caseData) return <LoadingScreen message="Dava yükleniyor..." />;

  const diffColor = DIFFICULTY_COLORS[caseData.difficulty] ?? colors.mutedForeground;
  const completedStepIds = progress?.completedSteps ?? [];
  const currentStepIdx = progress?.currentStep ?? 0;
  const isSolved = progress?.status === 'completed';
  const suspects: Suspect[] = (caseData as any).suspects ?? [];
  const culprit = suspects.find((s) => s.isCulprit);

  function handleStartInvestigation() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/investigate/${id}?step=${currentStepIdx}`);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 110 }} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.heroContainer}>
          <LinearGradient colors={['#1A0008', '#12121A']} style={styles.hero}>
            <View style={styles.heroInner}>
              <MaterialCommunityIcons name="magnify" size={80} color={colors.primary + '30'} style={styles.bgIcon} />
              <View style={styles.categoryRow}>
                <View style={[styles.categoryBadge, { backgroundColor: colors.primary + '20', borderColor: colors.primary + '40' }]}>
                  <Text style={[styles.categoryText, { color: colors.primary }]}>{caseData.category.toUpperCase()}</Text>
                </View>
                <View style={[styles.categoryBadge, { backgroundColor: diffColor + '20', borderColor: diffColor + '40' }]}>
                  <Text style={[styles.categoryText, { color: diffColor }]}>{caseData.difficulty.toUpperCase()}</Text>
                </View>
                {isSolved && (
                  <View style={[styles.categoryBadge, { backgroundColor: '#22C55E20', borderColor: '#22C55E40' }]}>
                    <Feather name="check-circle" size={10} color="#22C55E" />
                    <Text style={[styles.categoryText, { color: '#22C55E', marginLeft: 4 }]}>ÇÖZÜLDÜ</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.caseTitle, { color: colors.foreground }]}>{caseData.title}</Text>
              <View style={styles.metaRow}>
                <Feather name="map-pin" size={13} color={colors.mutedForeground} />
                <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{caseData.district}, {caseData.city}</Text>
                <Feather name="layers" size={13} color={colors.mutedForeground} />
                <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{caseData.steps.length} adım</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.content}>
          {/* Description */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Dava Özeti</Text>
            <Text style={[styles.description, { color: colors.mutedForeground }]}>{caseData.description}</Text>
          </View>

          {/* AR Evidence button */}
          <TouchableOpacity
            style={[styles.arBtn, { backgroundColor: '#7C3AED20', borderColor: '#7C3AED40' }]}
            onPress={() => router.push(`/ar-evidence/${id}?caseTitle=${encodeURIComponent(caseData.title)}`)}
          >
            <MaterialCommunityIcons name="augmented-reality" size={22} color="#A78BFA" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.arTitle, { color: '#A78BFA' }]}>AR Kanıt Taraması</Text>
              <Text style={[styles.arSub, { color: '#7C3AED80' }]}>Sanal kanıtları kameranla yakala</Text>
            </View>
            <Feather name="chevron-right" size={18} color="#7C3AED80" />
          </TouchableOpacity>

          {/* Progress */}
          {progress && !isSolved && (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>İlerleme</Text>
              <View style={[styles.progressBar, { backgroundColor: colors.muted }]}>
                <View style={[styles.progressFill, {
                  backgroundColor: colors.accent,
                  width: `${caseData.steps.length > 0 ? Math.round((completedStepIds.length / caseData.steps.length) * 100) : 0}%`
                }]} />
              </View>
              <Text style={[styles.progressText, { color: colors.mutedForeground }]}>
                {completedStepIds.length} / {caseData.steps.length} adım tamamlandı
              </Text>
            </View>
          )}

          {/* Suspects */}
          {suspects.length > 0 && (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.suspectsHeader}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Şüpheliler</Text>
                {isSolved && culprit && (
                  <TouchableOpacity
                    style={[styles.revealBtn, { backgroundColor: '#EF444420', borderColor: '#EF444440' }]}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); setShowCulprit(true); }}
                  >
                    <Feather name="alert-triangle" size={12} color="#EF4444" />
                    <Text style={[styles.revealBtnText, { color: '#EF4444' }]}>Suçluyu Gör</Text>
                  </TouchableOpacity>
                )}
              </View>
              {suspects.map((s, i) => (
                <SuspectRow key={s.id} suspect={s} isSolved={isSolved} colors={colors} index={i} />
              ))}
            </View>
          )}

          {/* Steps */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Soruşturma Adımları</Text>
            {caseData.steps.map((step, idx) => (
              <StepRow
                key={step.id}
                step={step}
                index={idx}
                isCompleted={completedStepIds.includes(step.id)}
                isCurrent={idx === currentStepIdx && !isSolved}
                isLocked={idx > currentStepIdx && !isSolved}
                colors={colors}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Back button */}
      <TouchableOpacity style={[styles.backBtn, { top: insets.top + 12 }]} onPress={() => router.back()}>
        <View style={[styles.backBtnInner, { backgroundColor: colors.card + 'CC', borderColor: colors.border }]}>
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </View>
      </TouchableOpacity>

      {/* Start CTA */}
      {!isSolved && (
        <View style={[styles.ctaContainer, { paddingBottom: insets.bottom + 8, backgroundColor: colors.background + 'F0', borderTopColor: colors.border }]}>
          <TouchableOpacity style={[styles.ctaBtn, { backgroundColor: colors.primary }]} onPress={handleStartInvestigation}>
            <MaterialCommunityIcons name="magnify" size={20} color="#FFF" />
            <Text style={styles.ctaText}>
              {progress ? 'Soruşturmaya Devam Et' : 'Soruşturmayı Başlat'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Culprit Reveal Modal */}
      {culprit && (
        <CulpritRevealModal
          visible={showCulprit}
          culprit={culprit}
          onClose={() => setShowCulprit(false)}
          colors={colors}
        />
      )}
    </View>
  );
}

// ── Suspect Row ───────────────────────────────────────────────────────────────
function SuspectRow({ suspect, isSolved, colors, index }: { suspect: Suspect; isSolved: boolean; colors: any; index: number }) {
  const borderColor = isSolved && suspect.isCulprit ? '#EF4444' : colors.border;
  const COLORS = ['#3B82F6', '#8B5CF6', '#F59E0B', '#10B981'];
  const avatarColor = COLORS[index % COLORS.length];

  return (
    <View style={[styles.suspectRow, { borderColor: borderColor + '60', borderWidth: suspect.isCulprit && isSolved ? 1 : 0 }]}>
      <View style={[styles.suspectAvatar, { backgroundColor: avatarColor + '20' }]}>
        <Text style={[styles.suspectInitial, { color: avatarColor }]}>{suspect.name.charAt(0)}</Text>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={styles.suspectNameRow}>
          <Text style={[styles.suspectName, { color: colors.foreground }]}>{suspect.name}</Text>
          {isSolved && suspect.isCulprit && (
            <View style={[styles.guiltyBadge, { backgroundColor: '#EF444420' }]}>
              <Text style={styles.guiltyText}>SUÇLU</Text>
            </View>
          )}
        </View>
        <Text style={[styles.suspectBio, { color: colors.mutedForeground }]}>{suspect.bio}</Text>
        <Text style={[styles.suspectMotive, { color: colors.accent + 'CC' }]}>Motif: {suspect.motive}</Text>
        <Text style={[styles.suspectAlibi, { color: colors.mutedForeground }]}>Alibi: {suspect.alibi}</Text>
      </View>
    </View>
  );
}

// ── Culprit Reveal Modal ──────────────────────────────────────────────────────
function CulpritRevealModal({ visible, culprit, onClose, colors }: {
  visible: boolean; culprit: Suspect; onClose: () => void; colors: any;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.culpritCard, { backgroundColor: '#0D0005', borderColor: '#EF444440' }]}>
          <View style={styles.culpritIcon}>
            <Text style={{ fontSize: 52 }}>🔍</Text>
          </View>
          <Text style={styles.culpritLabel}>SUÇLU TESPİT EDİLDİ</Text>
          <Text style={[styles.culpritName, { color: '#FFF' }]}>{culprit.name}</Text>
          <Text style={[styles.culpritBio, { color: 'rgba(255,255,255,0.6)' }]}>{culprit.bio}</Text>
          {culprit.culpritClue && (
            <View style={styles.culpritClueBox}>
              <Feather name="alert-circle" size={14} color="#EF4444" />
              <Text style={styles.culpritClueText}>{culprit.culpritClue}</Text>
            </View>
          )}
          <TouchableOpacity style={styles.closeRevealBtn} onPress={onClose}>
            <Text style={styles.closeRevealText}>Davayı Kapat</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Step Row ──────────────────────────────────────────────────────────────────
function StepRow({ step, index, isCompleted, isCurrent, isLocked, colors }: {
  step: CaseStep; index: number; isCompleted: boolean; isCurrent: boolean; isLocked: boolean;
  colors: ReturnType<typeof useColors>;
}) {
  const typeIcon = STEP_TYPE_ICONS[step.type] ?? 'circle';
  const borderColor = isCompleted ? '#22C55E' : isCurrent ? colors.primary : colors.border;
  const iconColor = isCompleted ? '#22C55E' : isCurrent ? colors.primary : colors.mutedForeground;

  return (
    <View style={[styles.stepRow, { borderColor: borderColor + '60', opacity: isLocked ? 0.4 : 1 }]}>
      <View style={[styles.stepNumCircle, { backgroundColor: isCompleted ? '#22C55E20' : isCurrent ? colors.primary + '20' : colors.muted }]}>
        {isCompleted ? (
          <Feather name="check" size={14} color="#22C55E" />
        ) : (
          <Text style={[styles.stepNum, { color: iconColor }]}>{index + 1}</Text>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.stepTitle, { color: colors.foreground }]}>{step.title}</Text>
        <View style={styles.stepMeta}>
          <Feather name={typeIcon as any} size={11} color={iconColor} />
          <Text style={[styles.stepType, { color: colors.mutedForeground }]}>
            {step.type === 'photo' ? 'Fotoğraf' : step.type === 'riddle' ? 'Bilmece' : 'Konum'} — Min. %{step.requiredMatchPct}
          </Text>
          {isLocked && <Feather name="lock" size={11} color={colors.mutedForeground} />}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroContainer: { position: 'relative' },
  hero: { paddingTop: 100, paddingBottom: 30, paddingHorizontal: 20 },
  heroInner: { gap: 10, position: 'relative' },
  bgIcon: { position: 'absolute', right: -20, top: -40, opacity: 0.4 },
  categoryRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  categoryBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  categoryText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  caseTitle: { fontSize: 26, fontWeight: '800', lineHeight: 30 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  metaText: { fontSize: 12 },
  content: { padding: 20, gap: 12 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  description: { fontSize: 14, lineHeight: 21 },
  progressBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressText: { fontSize: 12 },
  arBtn: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 14, borderWidth: 1 },
  arTitle: { fontSize: 14, fontWeight: '700' },
  arSub: { fontSize: 11, marginTop: 1 },
  suspectsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  revealBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: 1 },
  revealBtnText: { fontSize: 11, fontWeight: '700' },
  suspectRow: { padding: 12, borderRadius: 12, flexDirection: 'row', gap: 12, backgroundColor: 'transparent', marginTop: 4 },
  suspectAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  suspectInitial: { fontSize: 16, fontWeight: '800' },
  suspectNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  suspectName: { fontSize: 14, fontWeight: '700' },
  guiltyBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  guiltyText: { fontSize: 9, fontWeight: '800', color: '#EF4444' },
  suspectBio: { fontSize: 11, lineHeight: 15 },
  suspectMotive: { fontSize: 11, fontWeight: '600' },
  suspectAlibi: { fontSize: 11, fontStyle: 'italic' },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1 },
  stepNumCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  stepNum: { fontSize: 13, fontWeight: '700' },
  stepTitle: { fontSize: 14, fontWeight: '600' },
  stepMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  stepType: { fontSize: 11 },
  backBtn: { position: 'absolute', left: 16, zIndex: 10 },
  backBtnInner: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  ctaContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1 },
  ctaBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14 },
  ctaText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  culpritCard: { width: '100%', borderRadius: 24, borderWidth: 1, padding: 28, alignItems: 'center', gap: 12 },
  culpritIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#EF444420', alignItems: 'center', justifyContent: 'center' },
  culpritLabel: { fontSize: 11, fontWeight: '800', color: '#EF4444', letterSpacing: 2 },
  culpritName: { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  culpritBio: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  culpritClueBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#EF444415', borderRadius: 12, padding: 14 },
  culpritClueText: { color: '#FCA5A5', fontSize: 13, lineHeight: 19, flex: 1 },
  closeRevealBtn: { backgroundColor: '#EF4444', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 14, marginTop: 4 },
  closeRevealText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
