import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: W, height: H } = Dimensions.get('window');

// ── Virtual AR Evidence types ─────────────────────────────────────────────────
interface VirtualClue {
  id: string;
  type: 'footprint' | 'cipher' | 'shadow' | 'keyhole' | 'bloodstain' | 'fingerprint';
  label: string;
  x: number; // 0–1 relative to screen width
  y: number; // 0–1 relative to screen height
  captured: boolean;
}

const CLUE_TYPES = [
  { type: 'footprint' as const, icon: '👣', label: 'Ayak İzi', description: 'Karanlıkta bırakılmış bir ayak izi tespit edildi.' },
  { type: 'cipher' as const, icon: '🔐', label: 'Şifreli Not', description: 'Duvarda gizlenmiş şifreli bir mesaj bulundu.' },
  { type: 'shadow' as const, icon: '👤', label: 'Gölge Silüeti', description: 'Bir şüphelinin gölgesi ortaya çıktı.' },
  { type: 'keyhole' as const, icon: '🗝️', label: 'Anahtar Deliği', description: 'Gizli bir geçiş yolu işareti görüldü.' },
  { type: 'bloodstain' as const, icon: '🩸', label: 'İz', description: 'Olay yerine ait bir iz tespit edildi.' },
  { type: 'fingerprint' as const, icon: '🖐️', label: 'Parmak İzi', description: 'Yüzeyde latent parmak izi saptandı.' },
];

function generateClues(caseId: string): VirtualClue[] {
  // Deterministic random based on caseId hash
  const seed = caseId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const rand = (n: number, salt: number) => ((seed + salt * 73) % n);

  return Array.from({ length: 4 }, (_, i) => {
    const clueDef = CLUE_TYPES[rand(CLUE_TYPES.length, i)];
    return {
      id: `clue-${caseId}-${i}`,
      type: clueDef.type,
      label: clueDef.label,
      x: 0.1 + (rand(80, i * 7) / 100),
      y: 0.2 + (rand(60, i * 11) / 100),
      captured: false,
    };
  });
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function AREvidenceScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { caseId, caseTitle } = useLocalSearchParams<{ caseId: string; caseTitle: string }>();
  const [clues, setClues] = useState<VirtualClue[]>(() => generateClues(caseId ?? 'default'));
  const [capturedClues, setCapturedClues] = useState<VirtualClue[]>([]);
  const [scanning, setScanning] = useState(false);
  const [showResult, setShowResult] = useState<VirtualClue | null>(null);
  const scanAnim = useRef(new Animated.Value(0)).current;
  const pulseAnims = useRef(clues.map(() => new Animated.Value(1))).current;
  const glowAnims = useRef(clues.map(() => new Animated.Value(0))).current;
  const cameraMode = Platform.OS !== 'web';

  // Load previously captured clues from storage
  useEffect(() => {
    AsyncStorage.getItem(`ar-evidence-${caseId}`).then(raw => {
      if (raw) {
        const saved: string[] = JSON.parse(raw);
        setClues(prev => prev.map(c => ({ ...c, captured: saved.includes(c.id) })));
        setCapturedClues(prev => {
          const base = generateClues(caseId ?? 'default');
          return base.filter(c => saved.includes(c.id));
        });
      }
    });
  }, [caseId]);

  // Pulse animation loop for uncaptured clues
  useEffect(() => {
    const animations = pulseAnims.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1.3, duration: 800 + i * 200, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 1, duration: 800 + i * 200, useNativeDriver: true }),
        ])
      )
    );
    animations.forEach(a => a.start());
    return () => animations.forEach(a => a.stop());
  }, []);

  // Glow animation loop
  useEffect(() => {
    const animations = glowAnims.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: 1200 + i * 150, useNativeDriver: false }),
          Animated.timing(anim, { toValue: 0, duration: 1200 + i * 150, useNativeDriver: false }),
        ])
      )
    );
    animations.forEach(a => a.start());
    return () => animations.forEach(a => a.stop());
  }, []);

  // Scan animation
  function startScan() {
    setScanning(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Animated.loop(
      Animated.timing(scanAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
      { iterations: 3 }
    ).start(() => {
      setScanning(false);
      scanAnim.setValue(0);
    });
  }

  async function captureClue(clue: VirtualClue, idx: number) {
    if (clue.captured) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const updated = clues.map(c => c.id === clue.id ? { ...c, captured: true } : c);
    setClues(updated);
    setCapturedClues(prev => [...prev, { ...clue, captured: true }]);
    setShowResult({ ...clue, captured: true });

    // Persist to storage
    const ids = updated.filter(c => c.captured).map(c => c.id);
    await AsyncStorage.setItem(`ar-evidence-${caseId}`, JSON.stringify(ids));
  }

  const uncaptured = clues.filter(c => !c.captured).length;
  const CLUE_COLORS = {
    footprint: '#3B82F6',
    cipher: '#8B5CF6',
    shadow: '#6B7280',
    keyhole: '#F59E0B',
    bloodstain: '#EF4444',
    fingerprint: '#10B981',
  };

  return (
    <View style={styles.container}>
      {/* Camera background (simulated dark room) */}
      <LinearGradient
        colors={['#050010', '#0A0A14', '#040814']}
        style={StyleSheet.absoluteFill}
      />

      {/* Grid overlay for AR effect */}
      <View style={styles.gridOverlay} pointerEvents="none">
        {Array.from({ length: 8 }, (_, i) => (
          <View key={i} style={[styles.gridLine, { top: `${i * 14}%` }]} />
        ))}
      </View>

      {/* Scan sweep line */}
      {scanning && (
        <Animated.View
          style={[
            styles.scanLine,
            {
              transform: [{
                translateY: scanAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-H * 0.6, H * 0.6],
                }),
              }],
            },
          ]}
          pointerEvents="none"
        />
      )}

      {/* Virtual clue markers */}
      {clues.map((clue, idx) => {
        const clrDef = CLUE_TYPES.find(c => c.type === clue.type);
        const clueColor = CLUE_COLORS[clue.type];
        return (
          <TouchableOpacity
            key={clue.id}
            style={[styles.clueMarker, { left: clue.x * W - 30, top: clue.y * H - 30, opacity: clue.captured ? 0.3 : 1 }]}
            onPress={() => captureClue(clue, idx)}
            disabled={clue.captured}
          >
            <Animated.View
              style={[
                styles.clueGlow,
                {
                  backgroundColor: clueColor,
                  opacity: glowAnims[idx].interpolate({ inputRange: [0, 1], outputRange: [0.1, 0.35] }),
                  transform: [{ scale: pulseAnims[idx] }],
                },
              ]}
            />
            <View style={[styles.clueInner, { borderColor: clue.captured ? '#22C55E60' : clueColor + 'CC' }]}>
              <Text style={styles.clueEmoji}>{clrDef?.icon ?? '❓'}</Text>
            </View>
            {!clue.captured && (
              <Text style={[styles.clueLabel, { color: clueColor }]}>{clue.label}</Text>
            )}
            {clue.captured && (
              <View style={styles.capturedBadge}>
                <Feather name="check" size={8} color="#FFF" />
              </View>
            )}
          </TouchableOpacity>
        );
      })}

      {/* Header */}
      <LinearGradient
        colors={['rgba(0,0,0,0.85)', 'transparent']}
        style={[styles.header, { paddingTop: insets.top + 8 }]}
        pointerEvents="box-none"
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="x" size={22} color="#FFF" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>🔬 AR Kanıt Taraması</Text>
          <Text style={styles.headerSub} numberOfLines={1}>{caseTitle ?? caseId}</Text>
        </View>
        <View style={[styles.counterBadge, { borderColor: uncaptured > 0 ? '#EF4444' : '#22C55E' }]}>
          <Text style={[styles.counterText, { color: uncaptured > 0 ? '#EF4444' : '#22C55E' }]}>
            {clues.filter(c => c.captured).length}/{clues.length}
          </Text>
        </View>
      </LinearGradient>

      {/* Bottom controls */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.9)']}
        style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}
        pointerEvents="box-none"
      >
        <Text style={styles.footerHint}>
          {uncaptured > 0
            ? `Ekranda ${uncaptured} sanal kanıt gizli — üstlerine dokun ve yakala!`
            : '✅ Tüm sanal kanıtları yakaladın! Harika iş dedektif.'}
        </Text>
        <TouchableOpacity
          style={[styles.scanBtn, { borderColor: scanning ? '#3B82F6' : '#FFFFFF60' }]}
          onPress={startScan}
          disabled={scanning}
        >
          <MaterialCommunityIcons name="radar" size={22} color={scanning ? '#3B82F6' : '#FFF'} />
          <Text style={[styles.scanBtnText, { color: scanning ? '#3B82F6' : '#FFF' }]}>
            {scanning ? 'Tarıyor...' : 'Alanı Tara'}
          </Text>
        </TouchableOpacity>

        {/* Captured evidence list */}
        {capturedClues.length > 0 && (
          <View style={styles.capturedList}>
            {capturedClues.map(c => {
              const meta = CLUE_TYPES.find(ct => ct.type === c.type);
              return (
                <View key={c.id} style={styles.capturedItem}>
                  <Text style={styles.capturedIcon}>{meta?.icon}</Text>
                  <Text style={styles.capturedLabel}>{c.label}</Text>
                </View>
              );
            })}
          </View>
        )}
      </LinearGradient>

      {/* Capture result modal */}
      {showResult && (
        <View style={styles.resultOverlay} pointerEvents="box-none">
          <View style={styles.resultCard}>
            <Text style={styles.resultEmoji}>
              {CLUE_TYPES.find(c => c.type === showResult.type)?.icon ?? '🔍'}
            </Text>
            <Text style={styles.resultTitle}>{showResult.label} Yakalandı!</Text>
            <Text style={styles.resultDesc}>
              {CLUE_TYPES.find(c => c.type === showResult.type)?.description}
            </Text>
            <TouchableOpacity
              style={styles.resultBtn}
              onPress={() => setShowResult(null)}
            >
              <Text style={styles.resultBtnText}>Kanıt Dosyasına Ekle ✓</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050010' },
  gridOverlay: { ...StyleSheet.absoluteFillObject },
  gridLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: '#1E3A5F20' },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  clueMarker: { position: 'absolute', width: 60, height: 60, alignItems: 'center', justifyContent: 'center' },
  clueGlow: { position: 'absolute', width: 60, height: 60, borderRadius: 30 },
  clueInner: {
    width: 44, height: 44, borderRadius: 22, borderWidth: 2,
    backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center',
  },
  clueEmoji: { fontSize: 20 },
  clueLabel: { fontSize: 9, fontWeight: '700', marginTop: 2, textShadowColor: '#000', textShadowRadius: 3 },
  capturedBadge: {
    position: 'absolute', top: 0, right: 0, width: 16, height: 16, borderRadius: 8,
    backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center',
  },
  header: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', padding: 16, paddingBottom: 40, gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: 11 },
  counterBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  counterText: { fontSize: 13, fontWeight: '800' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, gap: 14, alignItems: 'center' },
  footerHint: { color: 'rgba(255,255,255,0.7)', fontSize: 12, textAlign: 'center', lineHeight: 18 },
  scanBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24, borderWidth: 1 },
  scanBtnText: { fontSize: 14, fontWeight: '700' },
  capturedList: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  capturedItem: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(34,197,94,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  capturedIcon: { fontSize: 14 },
  capturedLabel: { color: '#4ADE80', fontSize: 11, fontWeight: '600' },
  resultOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.7)' },
  resultCard: { backgroundColor: '#0D1117', borderRadius: 20, padding: 28, alignItems: 'center', gap: 12, margin: 24, borderWidth: 1, borderColor: '#22C55E40' },
  resultEmoji: { fontSize: 52 },
  resultTitle: { color: '#FFF', fontSize: 20, fontWeight: '800', textAlign: 'center' },
  resultDesc: { color: 'rgba(255,255,255,0.6)', fontSize: 13, textAlign: 'center', lineHeight: 19 },
  resultBtn: { backgroundColor: '#22C55E', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 4 },
  resultBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
});
