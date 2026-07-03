import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';
import { useUser } from '@/context/UserContext';

// Expo Sensors pedometer — only available on native platforms
let Pedometer: any = null;
if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    Pedometer = require('expo-sensors').Pedometer;
  } catch {
    Pedometer = null;
  }
}

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;
const DAILY_GOAL = 8000;

export function PedometerWidget() {
  const colors = useColors();
  const { token } = useUser();
  const [steps, setSteps] = useState(0);
  const [available, setAvailable] = useState(Platform.OS !== 'web');
  const progressAnim = useRef(new Animated.Value(0)).current;
  const syncedRef = useRef(false);

  useEffect(() => {
    if (Platform.OS === 'web' || !Pedometer) {
      setAvailable(false);
      return;
    }
    let sub: any;
    Pedometer.isAvailableAsync().then((ok: boolean) => {
      setAvailable(ok);
      if (!ok) return;

      // Get steps since midnight
      const now = new Date();
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      Pedometer.getStepCountAsync(midnight, now).then((result: any) => {
        setSteps(result?.steps ?? 0);
      });

      // Watch live updates
      sub = Pedometer.watchStepCount((result: any) => {
        setSteps(s => s + (result?.steps ?? 0));
      });
    });
    return () => sub?.remove();
  }, []);

  // Animate progress bar
  useEffect(() => {
    const pct = Math.min(steps / DAILY_GOAL, 1);
    Animated.spring(progressAnim, {
      toValue: pct,
      useNativeDriver: false,
      tension: 80,
      friction: 20,
    }).start();
  }, [steps]);

  // Sync to server every time steps changes (debounced by ref)
  useEffect(() => {
    if (!token || !available || steps === 0) return;
    const timer = setTimeout(async () => {
      try {
        await fetch(`${API_BASE}/steps-goals/today`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ steps, goalSteps: DAILY_GOAL }),
        });
      } catch { /* offline — will sync later */ }
    }, 3000);
    return () => clearTimeout(timer);
  }, [steps, token, available]);

  const pct = Math.min(Math.round((steps / DAILY_GOAL) * 100), 100);
  const done = steps >= DAILY_GOAL;

  if (!available) {
    // Web / unavailable: show a decorative static widget
    return (
      <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.row}>
          <MaterialCommunityIcons name="walk" size={22} color={colors.mutedForeground} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Adım Sayacı</Text>
            <Text style={[styles.sub, { color: colors.mutedForeground }]}>Sadece mobil cihazda aktif</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={done ? ['#052e16', '#14532d'] : [colors.card, colors.card]}
      style={[styles.container, { borderColor: done ? '#22C55E40' : colors.border }]}
    >
      <View style={styles.row}>
        <View style={[styles.iconCircle, { backgroundColor: done ? '#22C55E20' : colors.primary + '20' }]}>
          <MaterialCommunityIcons name="walk" size={22} color={done ? '#22C55E' : colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.label, { color: done ? '#86EFAC' : colors.foreground }]}>
            {done ? '🎯 Günlük Hedef Tamamlandı!' : 'Bugünkü Adımlar'}
          </Text>
          <View style={styles.stepsRow}>
            <Text style={[styles.stepsCount, { color: done ? '#4ADE80' : colors.foreground }]}>
              {steps.toLocaleString('tr-TR')}
            </Text>
            <Text style={[styles.stepsGoal, { color: colors.mutedForeground }]}>
              / {DAILY_GOAL.toLocaleString('tr-TR')} adım
            </Text>
          </View>
        </View>
        <Text style={[styles.pct, { color: done ? '#4ADE80' : colors.accent }]}>{pct}%</Text>
      </View>

      {/* Progress bar */}
      <View style={[styles.barBg, { backgroundColor: colors.muted }]}>
        <Animated.View
          style={[
            styles.barFill,
            {
              backgroundColor: done ? '#22C55E' : colors.primary,
              width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            },
          ]}
        />
      </View>

      <View style={styles.footer}>
        <Feather name="activity" size={11} color={colors.mutedForeground} />
        <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
          {steps >= DAILY_GOAL
            ? 'Dedektif kondisyonundasın!'
            : `${(DAILY_GOAL - steps).toLocaleString('tr-TR')} adım kaldı`}
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 2 },
  stepsRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  stepsCount: { fontSize: 22, fontWeight: '800' },
  stepsGoal: { fontSize: 12 },
  pct: { fontSize: 16, fontWeight: '800' },
  barBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  footerText: { fontSize: 11 },
  sub: { fontSize: 11 },
});
