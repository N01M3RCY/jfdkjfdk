import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import type { Case } from '@workspace/api-client-react';

interface CaseCardProps {
  caseItem: Case;
  progress?: number; // 0-100
  onPress: () => void;
  showRealTitle?: boolean; // When false (default), show codeTitle as mystery
}

const DIFFICULTY_CONFIG = {
  kolay: { label: 'Kolay', color: '#22C55E' },
  orta: { label: 'Orta', color: '#F59E0B' },
  zor: { label: 'Zor', color: '#EF4444' },
};

const CATEGORY_ICONS: Record<string, string> = {
  cinayet: 'skull',
  hirsizlik: 'bag-personal',
  kacakcilik: 'ship-wheel',
  casusluk: 'spy',
  kayip: 'magnify',
};

const CATEGORY_LABELS: Record<string, string> = {
  cinayet: 'Cinayet',
  hirsizlik: 'Hırsızlık',
  kacakcilik: 'Kaçakçılık',
  casusluk: 'Casusluk',
  kayip: 'Kayıp Şahıs',
};

export function CaseCard({ caseItem, progress, onPress, showRealTitle = false }: CaseCardProps) {
  const colors = useColors();
  const diffConfig = DIFFICULTY_CONFIG[caseItem.difficulty as keyof typeof DIFFICULTY_CONFIG] ?? { label: caseItem.difficulty, color: '#6B6B7E' };
  const categoryIcon = CATEGORY_ICONS[caseItem.category] ?? 'magnify';
  const categoryLabel = CATEGORY_LABELS[caseItem.category] ?? caseItem.category;
  const isSolved = progress === 100;
  const isActive = progress !== undefined && progress > 0 && !isSolved;

  // Mystery: show codeTitle if not started/solved, real title when active/solved or showRealTitle
  const displayTitle = (showRealTitle || isActive || isSolved || !(caseItem as any).codeTitle)
    ? caseItem.title
    : ((caseItem as any).codeTitle || caseItem.title);

  const isMystery = !showRealTitle && !isActive && !isSolved && !!(caseItem as any).codeTitle;

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.accentBar, { backgroundColor: isSolved ? colors.success : isActive ? colors.accent : diffConfig.color }]} />

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={[styles.categoryIcon, { backgroundColor: colors.muted }]}>
            <MaterialCommunityIcons name={categoryIcon as any} size={18} color={colors.accent} />
          </View>
          <View style={styles.badges}>
            <View style={[styles.badge, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>{categoryLabel}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: diffConfig.color + '20', borderColor: diffConfig.color + '50' }]}>
              <Text style={[styles.badgeText, { color: diffConfig.color }]}>{diffConfig.label}</Text>
            </View>
            {isSolved && (
              <View style={[styles.badge, { backgroundColor: '#22C55E20', borderColor: '#22C55E50' }]}>
                <Feather name="check-circle" size={10} color="#22C55E" />
                <Text style={[styles.badgeText, { color: '#22C55E', marginLeft: 2 }]}>Çözüldü</Text>
              </View>
            )}
            {isActive && (
              <View style={[styles.badge, { backgroundColor: colors.accent + '20', borderColor: colors.accent + '50' }]}>
                <Text style={[styles.badgeText, { color: colors.accent }]}>Devam</Text>
              </View>
            )}
          </View>
        </View>

        {isMystery && (
          <View style={[styles.mysteryTag, { backgroundColor: colors.primary + '15' }]}>
            <Feather name="lock" size={10} color={colors.primary} />
            <Text style={[styles.mysteryText, { color: colors.primary }]}>Dosya Şifreli</Text>
          </View>
        )}

        <Text style={[styles.title, { color: isMystery ? colors.accent : colors.foreground }]} numberOfLines={2}>
          {displayTitle}
        </Text>

        {!isMystery && (
          <Text style={[styles.description, { color: colors.mutedForeground }]} numberOfLines={2}>
            {caseItem.description}
          </Text>
        )}

        {isMystery && (
          <Text style={[styles.description, { color: colors.mutedForeground }]} numberOfLines={2}>
            Bu dava dosyası henüz kilitli. Soruşturmaya başla!
          </Text>
        )}

        <View style={styles.footer}>
          <View style={styles.footerLeft}>
            <Feather name="map-pin" size={12} color={colors.mutedForeground} />
            <Text style={[styles.footerText, { color: colors.mutedForeground }]}>{caseItem.district}, {caseItem.city}</Text>
          </View>
          <View style={styles.footerLeft}>
            <Feather name="layers" size={12} color={colors.mutedForeground} />
            <Text style={[styles.footerText, { color: colors.mutedForeground }]}>{caseItem.stepCount} adım</Text>
          </View>
          {(caseItem as any).maxParticipants > 0 && (
            <View style={styles.footerLeft}>
              <Feather name="users" size={12} color={colors.mutedForeground} />
              <Text style={[styles.footerText, { color: colors.mutedForeground }]}>max {(caseItem as any).maxParticipants}</Text>
            </View>
          )}
        </View>

        {isActive && progress !== undefined && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { backgroundColor: colors.muted }]}>
              <View style={[styles.progressFill, { backgroundColor: colors.accent, width: `${progress}%` }]} />
            </View>
            <Text style={[styles.progressText, { color: colors.mutedForeground }]}>{progress}%</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { borderRadius: 16, borderWidth: 1, overflow: 'hidden', flexDirection: 'row', marginBottom: 12 },
  accentBar: { width: 4 },
  content: { flex: 1, padding: 14, gap: 6 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  categoryIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  badges: { flexDirection: 'row', gap: 5, flex: 1, flexWrap: 'wrap' },
  badge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20, borderWidth: 1,
  },
  badgeText: { fontSize: 10, fontWeight: '600' },
  mysteryTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  mysteryText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  title: { fontSize: 15, fontWeight: '700', lineHeight: 20 },
  description: { fontSize: 12, lineHeight: 17 },
  footer: { flexDirection: 'row', gap: 12, marginTop: 2, flexWrap: 'wrap' },
  footerLeft: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerText: { fontSize: 11 },
  progressContainer: { marginTop: 4, gap: 3 },
  progressBar: { height: 3, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  progressText: { fontSize: 10, textAlign: 'right' },
});
