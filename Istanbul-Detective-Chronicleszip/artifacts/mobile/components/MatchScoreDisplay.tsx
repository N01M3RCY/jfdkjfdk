import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';

interface MatchScoreDisplayProps {
  score: number;
  required: number;
  feedback: string;
}

export function MatchScoreDisplay({ score, required, feedback }: MatchScoreDisplayProps) {
  const colors = useColors();
  const passed = score >= required;
  const progress = useSharedValue(0);
  const scale = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(300, withTiming(score / 100, { duration: 1500 }));
    scale.value = withDelay(200, withSpring(1, { mass: 0.5 }));
  }, []);

  const arcStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const color = passed ? colors.success : score >= required * 0.8 ? colors.warning : colors.destructive;

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.scoreCircle, { borderColor: color }, arcStyle]}>
        <Text style={[styles.scoreNumber, { color }]}>{score}</Text>
        <Text style={[styles.scoreLabel, { color: colors.mutedForeground }]}>Eşleşme</Text>
      </Animated.View>

      <View style={styles.statusRow}>
        <View style={[styles.iconCircle, { backgroundColor: passed ? '#22C55E20' : '#EF444420' }]}>
          <Feather name={passed ? 'check-circle' : 'x-circle'} size={24} color={passed ? '#22C55E' : '#EF4444'} />
        </View>
        <Text style={[styles.statusText, { color: passed ? '#22C55E' : '#EF4444' }]}>
          {passed ? 'Tebrikler!' : 'Yetersiz Eşleşme'}
        </Text>
      </View>

      <View style={[styles.progressBar, { backgroundColor: colors.muted }]}>
        <Animated.View style={[styles.progressFill, { backgroundColor: color, width: `${score}%` }]} />
        <View style={[styles.requiredMarker, { left: `${required}%`, backgroundColor: colors.foreground }]} />
      </View>

      <Text style={[styles.requiredText, { color: colors.mutedForeground }]}>
        Gerekli: %{required} — Senin: %{score}
      </Text>

      <Text style={[styles.feedback, { color: colors.foreground }]}>{feedback}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 16,
    paddingVertical: 20,
  },
  scoreCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumber: {
    fontSize: 48,
    fontWeight: '800',
  },
  scoreLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 20,
    fontWeight: '700',
  },
  progressBar: {
    height: 8,
    width: '100%',
    borderRadius: 4,
    overflow: 'visible',
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  requiredMarker: {
    position: 'absolute',
    top: -4,
    width: 3,
    height: 16,
    borderRadius: 2,
    marginLeft: -1,
  },
  requiredText: {
    fontSize: 12,
  },
  feedback: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
