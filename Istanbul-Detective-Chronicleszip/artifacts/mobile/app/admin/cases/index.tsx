import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useGetCases, useDeleteCase } from '@workspace/api-client-react';
import { LoadingScreen } from '@/components/LoadingScreen';
import { EmptyState } from '@/components/EmptyState';

export default function AdminCasesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data: cases, isLoading, refetch } = useGetCases({});
  const deleteCase = useDeleteCase();

  function handleDelete(id: string, title: string) {
    Alert.alert('Davayı Sil', `"${title}" davasını silmek istediğinizden emin misiniz?`, [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCase.mutateAsync({ id });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            refetch();
          } catch {
            Alert.alert('Hata', 'Dava silinemedi.');
          }
        },
      },
    ]);
  }

  if (isLoading && !cases) return <LoadingScreen />;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Davalar ({cases?.length ?? 0})</Text>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/admin/cases/new')}
        >
          <Feather name="plus" size={18} color="#FFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={cases ?? []}
        keyExtractor={c => c.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 20 }]}
        ListEmptyComponent={<EmptyState icon="folder" title="Henüz dava yok" subtitle="İlk davayı oluşturmak için + butonuna basın" />}
        renderItem={({ item: c }) => (
          <View style={[styles.caseRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.statusDot, { backgroundColor: c.isActive ? '#22C55E' : colors.mutedForeground }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.caseTitle, { color: colors.foreground }]} numberOfLines={1}>{c.title}</Text>
              <Text style={[styles.caseMeta, { color: colors.mutedForeground }]}>
                {c.city} — {c.difficulty} — {c.stepCount} adım
              </Text>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.muted }]}
                onPress={() => router.push(`/admin/cases/${c.id}`)}
              >
                <Feather name="edit-2" size={14} color={colors.foreground} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.destructive + '20' }]}
                onPress={() => handleDelete(c.id, c.title)}
              >
                <Feather name="trash-2" size={14} color={colors.destructive} />
              </TouchableOpacity>
            </View>
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
  addBtn: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, gap: 8 },
  caseRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  caseTitle: { fontSize: 14, fontWeight: '600' },
  caseMeta: { fontSize: 12, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});
