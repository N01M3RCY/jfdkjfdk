import React, { useState } from 'react';
import {
  ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text,
  TouchableOpacity, View, Alert,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/context/UserContext';

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;

interface AdminUser {
  id: string;
  username: string;
  displayName: string;
  city: string;
  isAdmin: boolean;
  xp: number;
  badge: string;
  createdAt: string;
  activeCases: number;
  completedCases: number;
}

export default function AdminUsersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token } = useUser();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data: users, isLoading, refetch } = useQuery<AdminUser[]>({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Yetki hatası');
      return res.json();
    },
    enabled: !!token,
  });

  const toggleAdminMutation = useMutation({
    mutationFn: async ({ userId, isAdmin }: { userId: string; isAdmin: boolean }) => {
      await fetch(`${API_BASE}/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isAdmin }),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  const BADGE_COLOR: Record<string, string> = {
    'Efsane Dedektif': '#D4A017',
    'Usta Dedektif': '#C8102E',
    'Kıdemli Dedektif': '#7C3AED',
    'Dedektif': '#2563EB',
    'Stajyer Dedektif': '#059669',
    'Aday Dedektif': '#6B6B7E',
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Kullanıcılar</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>{users?.length ?? 0} kayıtlı dedektif</Text>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 24, gap: 12 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          showsVerticalScrollIndicator={false}
        >
          {(users ?? []).map(u => {
            const badgeColor = BADGE_COLOR[u.badge] ?? colors.mutedForeground;
            return (
              <View key={u.id} style={[styles.userCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.userHeader}>
                  <View style={[styles.avatar, { backgroundColor: u.isAdmin ? colors.accent + '20' : colors.muted }]}>
                    <MaterialCommunityIcons
                      name={u.isAdmin ? 'shield-crown' : 'account'}
                      size={20}
                      color={u.isAdmin ? colors.accent : colors.mutedForeground}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.displayName, { color: colors.foreground }]}>{u.displayName}</Text>
                    <Text style={[styles.username, { color: colors.mutedForeground }]}>@{u.username} · {u.city}</Text>
                  </View>
                  <View style={[styles.badgePill, { backgroundColor: badgeColor + '15', borderColor: badgeColor + '40' }]}>
                    <Text style={[styles.badgePillText, { color: badgeColor }]}>{u.badge}</Text>
                  </View>
                </View>

                <View style={styles.statsRow}>
                  <View style={styles.stat}>
                    <Feather name="star" size={12} color={colors.accent} />
                    <Text style={[styles.statVal, { color: colors.foreground }]}>{u.xp} XP</Text>
                  </View>
                  <View style={styles.stat}>
                    <Feather name="clock" size={12} color={colors.accent} />
                    <Text style={[styles.statVal, { color: colors.foreground }]}>{u.activeCases} aktif</Text>
                  </View>
                  <View style={styles.stat}>
                    <Feather name="check-circle" size={12} color={colors.success} />
                    <Text style={[styles.statVal, { color: colors.foreground }]}>{u.completedCases} çözüldü</Text>
                  </View>
                </View>

                <View style={[styles.divider, { backgroundColor: colors.border }]} />

                <View style={styles.userActions}>
                  {u.isAdmin ? (
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: colors.destructive + '15' }]}
                      onPress={() => {
                        Alert.alert('Admin Kaldır', `${u.displayName} kullanıcısının admin yetkisini kaldır?`, [
                          { text: 'İptal', style: 'cancel' },
                          { text: 'Kaldır', style: 'destructive', onPress: () => toggleAdminMutation.mutate({ userId: u.id, isAdmin: false }) },
                        ]);
                      }}
                    >
                      <MaterialCommunityIcons name="shield-remove" size={14} color={colors.destructive} />
                      <Text style={[styles.actionText, { color: colors.destructive }]}>Admin'i Kaldır</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: colors.accent + '15' }]}
                      onPress={() => {
                        Alert.alert('Admin Yap', `${u.displayName} kullanıcısını admin yap?`, [
                          { text: 'İptal', style: 'cancel' },
                          { text: 'Onayla', onPress: () => toggleAdminMutation.mutate({ userId: u.id, isAdmin: true }) },
                        ]);
                      }}
                    >
                      <MaterialCommunityIcons name="shield-plus" size={14} color={colors.accent} />
                      <Text style={[styles.actionText, { color: colors.accent }]}>Admin Yap</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 22, fontWeight: '800' },
  headerSub: { fontSize: 12 },
  userCard: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 12 },
  userHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  displayName: { fontSize: 15, fontWeight: '700' },
  username: { fontSize: 12, marginTop: 1 },
  badgePill: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1,
  },
  badgePillText: { fontSize: 10, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 16 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statVal: { fontSize: 12, fontWeight: '600' },
  divider: { height: 1 },
  userActions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
  },
  actionText: { fontSize: 12, fontWeight: '600' },
});
