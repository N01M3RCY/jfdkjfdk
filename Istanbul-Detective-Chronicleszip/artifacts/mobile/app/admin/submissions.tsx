import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useGetAdminSubmissions } from '@workspace/api-client-react';
import { LoadingScreen } from '@/components/LoadingScreen';
import { EmptyState } from '@/components/EmptyState';

export default function AdminSubmissionsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: submissions, isLoading } = useGetAdminSubmissions();

  if (isLoading && !submissions) return <LoadingScreen />;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Gönderimler ({submissions?.length ?? 0})</Text>
      </View>

      <FlatList
        data={submissions ?? []}
        keyExtractor={s => s.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 20 }]}
        ListEmptyComponent={<EmptyState icon="send" title="Henüz gönderim yok" />}
        renderItem={({ item: s }) => (
          <View style={[styles.row, { backgroundColor: colors.card, borderColor: s.passed ? '#22C55E40' : colors.border }]}>
            <View style={[styles.score, { backgroundColor: s.passed ? '#22C55E20' : colors.destructive + '20' }]}>
              <Text style={[styles.scoreText, { color: s.passed ? '#22C55E' : colors.destructive }]}>%{s.matchScore}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: colors.foreground }]} numberOfLines={1}>
                {s.userId.slice(0, 8)}... — {s.caseId.slice(0, 10)}...
              </Text>
              <Text style={[styles.rowMeta, { color: colors.mutedForeground }]}>
                {new Date(s.createdAt).toLocaleString('tr-TR')}
                {s.passed ? ' — Geçti' : ' — Kaldı'}
              </Text>
            </View>
            <Feather name={s.passed ? 'check-circle' : 'x-circle'} size={18} color={s.passed ? '#22C55E' : colors.destructive} />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700', flex: 1 },
  list: { padding: 16, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  score: { width: 52, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  scoreText: { fontSize: 15, fontWeight: '800' },
  rowTitle: { fontSize: 13, fontWeight: '600' },
  rowMeta: { fontSize: 11, marginTop: 2 },
});
