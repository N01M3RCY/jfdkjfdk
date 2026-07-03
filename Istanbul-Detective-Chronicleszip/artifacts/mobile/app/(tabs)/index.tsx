import React, { useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useGetCases, useGetAllProgress, getGetAllProgressQueryKey } from '@workspace/api-client-react';
import { useUser } from '@/context/UserContext';
import { CaseCard } from '@/components/CaseCard';
import { LoadingScreen } from '@/components/LoadingScreen';
import { EmptyState } from '@/components/EmptyState';
import { PedometerWidget } from '@/components/PedometerWidget';
import type { Case, UserProgress } from '@workspace/api-client-react';

const CITIES = ['İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya'];

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useUser();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string | null>(user?.city ?? null);

  const { data: cases, isLoading: casesLoading, refetch: refetchCases } = useGetCases(
    selectedCity ? { city: selectedCity } : {}
  );
  const { data: progressList, refetch: refetchProgress } = useGetAllProgress(
    user?.id ?? 'anonymous',
    { query: { enabled: !!user?.id, queryKey: getGetAllProgressQueryKey(user?.id ?? 'anonymous') } }
  );

  const progressMap = React.useMemo(() => {
    const map = new Map<string, UserProgress>();
    (progressList ?? []).forEach(p => map.set(p.caseId, p));
    return map;
  }, [progressList]);

  const activeCases = (cases ?? []).filter(c => {
    const p = progressMap.get(c.id);
    return p && p.status === 'active';
  });

  const featuredCases = (cases ?? []).filter(c => {
    const p = progressMap.get(c.id);
    return !p || p.status !== 'completed';
  }).slice(0, 4);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([refetchCases(), refetchProgress()]);
    setRefreshing(false);
  }

  function getProgressPct(caseItem: Case): number | undefined {
    const p = progressMap.get(caseItem.id);
    if (!p) return undefined;
    if (p.status === 'completed') return 100;
    if (caseItem.stepCount === 0) return 0;
    return Math.round((p.completedSteps.length / caseItem.stepCount) * 100);
  }

  if (casesLoading && !cases) return <LoadingScreen message="Davalar yükleniyor..." />;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}
      >
        {/* Hero Header */}
        <LinearGradient
          colors={['#1A0008', '#0A0A0F']}
          style={[styles.hero, { paddingTop: insets.top + 16 }]}
        >
          <View style={styles.heroContent}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
                Merhaba, {user?.displayName ?? 'Dedektif'} 👋
              </Text>
              <Text style={[styles.heroTitle, { color: colors.foreground }]}>
                Kadrajdaki{'\n'}Sır
              </Text>
              <Text style={[styles.heroTagline, { color: colors.accent }]}>Her karede bir gizem saklanır.</Text>
            </View>
            <View style={styles.heroRight}>
              <View style={[styles.xpBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <MaterialCommunityIcons name="star-four-points" size={13} color={colors.accent} />
                <Text style={[styles.xpText, { color: colors.accent }]}>{user?.xp ?? 0} XP</Text>
              </View>
              {user?.isAdmin && (
                <TouchableOpacity
                  style={[styles.adminBadge, { backgroundColor: colors.accent + '20', borderColor: colors.accent + '50' }]}
                  onPress={() => router.push('/admin')}
                >
                  <MaterialCommunityIcons name="shield-crown" size={13} color={colors.accent} />
                  <Text style={[styles.adminBadgeText, { color: colors.accent }]}>Admin</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* City Selector */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cityScroll}>
            <TouchableOpacity
              style={[
                styles.cityChip,
                {
                  backgroundColor: !selectedCity ? colors.primary : colors.card,
                  borderColor: !selectedCity ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setSelectedCity(null)}
            >
              <Text style={[styles.cityChipText, { color: !selectedCity ? '#FFF' : colors.mutedForeground }]}>
                Tümü
              </Text>
            </TouchableOpacity>
            {CITIES.map(city => {
              const isSelected = city === selectedCity;
              return (
                <TouchableOpacity
                  key={city}
                  style={[
                    styles.cityChip,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.card,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setSelectedCity(isSelected ? null : city)}
                >
                  <Text style={[styles.cityChipText, { color: isSelected ? '#FFF' : colors.mutedForeground }]}>
                    {city}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </LinearGradient>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <StatCard
            value={(progressList ?? []).filter(p => p.status === 'completed').length}
            label="Çözülen"
            icon="check-circle"
            color={colors.success}
            colors={colors}
          />
          <StatCard
            value={activeCases.length}
            label="Aktif Dava"
            icon="clock"
            color={colors.accent}
            colors={colors}
          />
          <StatCard
            value={cases?.length ?? 0}
            label="Toplam"
            icon="folder"
            color={colors.primary}
            colors={colors}
          />
        </View>

        {/* Pedometer Widget */}
        <View style={styles.widgetSection}>
          <PedometerWidget />
        </View>

        {/* Active Investigations */}
        {activeCases.length > 0 && (
          <Section title="Aktif Soruşturmalar" icon="zap" colors={colors}>
            {activeCases.map(c => (
              <CaseCard
                key={c.id}
                caseItem={c}
                progress={getProgressPct(c)}
                onPress={() => router.push(`/case/${c.id}`)}
              />
            ))}
          </Section>
        )}

        {/* Featured Cases */}
        <Section
          title={selectedCity ? `${selectedCity} Davaları` : 'Öne Çıkan Davalar'}
          icon="star"
          colors={colors}
          onSeeAll={() => router.push('/cases')}
        >
          {featuredCases.length === 0 ? (
            <EmptyState icon="folder" title="Dava bulunamadı" subtitle="Bu şehirde aktif dava yok." />
          ) : (
            featuredCases.map(c => (
              <CaseCard
                key={c.id}
                caseItem={c}
                progress={getProgressPct(c)}
                onPress={() => router.push(`/case/${c.id}`)}
              />
            ))
          )}
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({
  title, icon, children, colors, onSeeAll,
}: {
  title: string;
  icon: keyof typeof Feather.glyphMap;
  children: React.ReactNode;
  colors: ReturnType<typeof useColors>;
  onSeeAll?: () => void;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Feather name={icon} size={14} color={colors.primary} />
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
        {onSeeAll && (
          <TouchableOpacity onPress={onSeeAll} style={{ marginLeft: 'auto' }}>
            <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '600' }}>Tümünü Gör</Text>
          </TouchableOpacity>
        )}
      </View>
      {children}
    </View>
  );
}

function StatCard({ value, label, icon, color, colors }: {
  value: number; label: string; icon: keyof typeof Feather.glyphMap;
  color: string; colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Feather name={icon} size={18} color={color} />
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { paddingHorizontal: 20, paddingBottom: 20, gap: 16 },
  heroContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroRight: { alignItems: 'flex-end', gap: 8, marginTop: 8 },
  greeting: { fontSize: 13, fontWeight: '500', marginBottom: 4 },
  heroTitle: { fontSize: 30, fontWeight: '900', lineHeight: 34, letterSpacing: -0.5 },
  heroTagline: { fontSize: 12, fontWeight: '600', letterSpacing: 0.3, marginTop: 4 },
  xpBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1,
  },
  xpText: { fontSize: 12, fontWeight: '700' },
  adminBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1,
  },
  adminBadgeText: { fontSize: 11, fontWeight: '700' },
  cityScroll: { marginHorizontal: -20, paddingHorizontal: 20 },
  cityChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, marginRight: 8,
  },
  cityChipText: { fontSize: 13, fontWeight: '600' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 16, gap: 10 },
  statCard: {
    flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 14, borderWidth: 1, gap: 4,
  },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 10, fontWeight: '500' },
  widgetSection: { paddingHorizontal: 20, marginBottom: 16 },
  section: { paddingHorizontal: 20, marginBottom: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', letterSpacing: -0.3 },
});
