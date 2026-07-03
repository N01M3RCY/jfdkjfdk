import React, { useState, useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  RefreshControl,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useGetCases, useGetCities, useGetAllProgress, getGetAllProgressQueryKey } from '@workspace/api-client-react';
import { useUser } from '@/context/UserContext';
import { CaseCard } from '@/components/CaseCard';
import { LoadingScreen } from '@/components/LoadingScreen';
import { EmptyState } from '@/components/EmptyState';
import type { UserProgress } from '@workspace/api-client-react';

const DIFFICULTIES = [
  { id: 'all', label: 'Tümü' },
  { id: 'kolay', label: 'Kolay' },
  { id: 'orta', label: 'Orta' },
  { id: 'zor', label: 'Zor' },
];

export default function CasesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useUser();

  const [search, setSearch] = useState('');
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedDiff, setSelectedDiff] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const { data: cases, isLoading, refetch } = useGetCases({ isActive: true });
  const { data: cities } = useGetCities();
  const { data: progressList } = useGetAllProgress(user?.id ?? 'anonymous', {
    query: { enabled: !!user?.id, queryKey: getGetAllProgressQueryKey(user?.id ?? 'anonymous') },
  });

  const progressMap = useMemo(() => {
    const map = new Map<string, UserProgress>();
    (progressList ?? []).forEach(p => map.set(p.caseId, p));
    return map;
  }, [progressList]);

  const filtered = useMemo(() => {
    let result = cases ?? [];
    if (selectedCity) result = result.filter(c => c.city === selectedCity);
    if (selectedDiff !== 'all') result = result.filter(c => c.difficulty === selectedDiff);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.district.toLowerCase().includes(q)
      );
    }
    return result;
  }, [cases, selectedCity, selectedDiff, search]);

  function getProgress(caseId: string): number | undefined {
    const p = progressMap.get(caseId);
    if (!p) return undefined;
    if (p.status === 'completed') return 100;
    const c = cases?.find(x => x.id === caseId);
    if (!c || c.stepCount === 0) return 0;
    return Math.round((p.completedSteps.length / c.stepCount) * 100);
  }

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  if (isLoading && !cases) return <LoadingScreen message="Davalar yükleniyor..." />;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: colors.background }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Dava Dosyaları</Text>
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Dava ara..."
            placeholderTextColor={colors.mutedForeground}
            style={[styles.searchInput, { color: colors.foreground }]}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        {/* Difficulty Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {DIFFICULTIES.map(d => (
            <TouchableOpacity
              key={d.id}
              style={[
                styles.filterChip,
                {
                  backgroundColor: selectedDiff === d.id ? colors.primary : colors.card,
                  borderColor: selectedDiff === d.id ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setSelectedDiff(d.id)}
            >
              <Text style={[styles.filterText, { color: selectedDiff === d.id ? '#FFF' : colors.mutedForeground }]}>
                {d.label}
              </Text>
            </TouchableOpacity>
          ))}
          <View style={styles.divider} />
          <TouchableOpacity
            style={[
              styles.filterChip,
              {
                backgroundColor: !selectedCity ? colors.secondary : colors.card,
                borderColor: !selectedCity ? colors.border : colors.border,
              },
            ]}
            onPress={() => setSelectedCity(null)}
          >
            <Text style={[styles.filterText, { color: !selectedCity ? colors.foreground : colors.mutedForeground }]}>
              Tüm Şehirler
            </Text>
          </TouchableOpacity>
          {(cities ?? []).map(city => (
            <TouchableOpacity
              key={city.id}
              style={[
                styles.filterChip,
                {
                  backgroundColor: selectedCity === city.name ? colors.accent + '30' : colors.card,
                  borderColor: selectedCity === city.name ? colors.accent : colors.border,
                },
              ]}
              onPress={() => setSelectedCity(selectedCity === city.name ? null : city.name)}
            >
              <Text style={[styles.filterText, { color: selectedCity === city.name ? colors.accent : colors.mutedForeground }]}>
                {city.name} ({city.caseCount})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 90 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.resultCount, { color: colors.mutedForeground }]}>
          {filtered.length} dava bulundu
        </Text>
        {filtered.length === 0 ? (
          <EmptyState icon="folder" title="Dava bulunamadı" subtitle="Farklı filtreler deneyin." />
        ) : (
          filtered.map(c => (
            <CaseCard
              key={c.id}
              caseItem={c}
              progress={getProgress(c.id)}
              onPress={() => router.push(`/case/${c.id}`)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  filterRow: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    width: 1,
    height: '100%',
    backgroundColor: '#2A2A3A',
    marginRight: 8,
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  resultCount: {
    fontSize: 12,
    marginBottom: 12,
  },
});
