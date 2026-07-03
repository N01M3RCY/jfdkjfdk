import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { useUser } from '@/context/UserContext';

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;

interface AdminStats {
  totalCases: number;
  activeCases: number;
  totalSubmissions: number;
  passedSubmissions: number;
  citiesWithCases: number;
  totalUsers: number;
}

export default function AdminDashboard() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token } = useUser();
  const [refreshing, setRefreshing] = React.useState(false);

  const { data: stats, isLoading, refetch } = useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Yetki hatası');
      return res.json();
    },
    enabled: !!token,
  });

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={['#0D0A00', colors.background]} style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Admin Paneli</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>Kadrajdaki Sır · Sistem Yönetimi</Text>
        </View>
        <View style={[styles.adminBadge, { backgroundColor: colors.accent + '20', borderColor: colors.accent + '50' }]}>
          <MaterialCommunityIcons name="shield-crown" size={14} color={colors.accent} />
          <Text style={[styles.adminBadgeText, { color: colors.accent }]}>Admin</Text>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 24, gap: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard icon="folder" label="Toplam Dava" value={stats?.totalCases ?? 0} color={colors.primary} colors={colors} />
          <StatCard icon="check-circle" label="Aktif Dava" value={stats?.activeCases ?? 0} color="#22C55E" colors={colors} />
          <StatCard icon="users" label="Kullanıcı" value={stats?.totalUsers ?? 0} color={colors.accent} colors={colors} />
          <StatCard icon="send" label="Gönderim" value={stats?.totalSubmissions ?? 0} color="#7C3AED" colors={colors} />
          <StatCard icon="award" label="Geçilen" value={stats?.passedSubmissions ?? 0} color="#0EA5E9" colors={colors} />
          <StatCard icon="map-pin" label="Şehirler" value={stats?.citiesWithCases ?? 0} color="#F59E0B" colors={colors} />
        </View>

        {/* Quick Actions */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Hızlı İşlemler</Text>

          <ActionRow
            icon="users"
            title="Kullanıcılar"
            subtitle="Tüm dedektifleri görüntüle ve yönet"
            colors={colors}
            onPress={() => router.push('/admin/users')}
            highlight
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <ActionRow
            icon="folder-plus"
            title="Dava Yönetimi"
            subtitle="Davaları görüntüle, ekle ve düzenle"
            colors={colors}
            onPress={() => router.push('/admin/cases')}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <ActionRow
            icon="send"
            title="Gönderimler"
            subtitle="Kullanıcı gönderimlerini görüntüle"
            colors={colors}
            onPress={() => router.push('/admin/submissions')}
          />
        </View>

        {/* Pass Rate */}
        {stats && stats.totalSubmissions > 0 && (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Başarı Oranı</Text>
            <View style={[styles.progressBar, { backgroundColor: colors.muted }]}>
              <View style={[
                styles.progressFill,
                { backgroundColor: '#22C55E', width: `${Math.round((stats.passedSubmissions / stats.totalSubmissions) * 100)}%` }
              ]} />
            </View>
            <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>
              {Math.round((stats.passedSubmissions / stats.totalSubmissions) * 100)}% — {stats.passedSubmissions} / {stats.totalSubmissions} gönderim geçti
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function StatCard({ icon, label, value, color, colors }: {
  icon: keyof typeof Feather.glyphMap; label: string; value: number; color: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Feather name={icon} size={16} color={color} />
      </View>
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

function ActionRow({ icon, title, subtitle, colors, onPress, highlight }: {
  icon: keyof typeof Feather.glyphMap; title: string; subtitle: string;
  colors: ReturnType<typeof useColors>; onPress: () => void; highlight?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.actionRow} onPress={onPress}>
      <View style={[styles.actionIcon, { backgroundColor: highlight ? colors.accent + '20' : colors.muted }]}>
        <Feather name={icon} size={18} color={highlight ? colors.accent : colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.actionTitle, { color: highlight ? colors.accent : colors.foreground }]}>{title}</Text>
        <Text style={[styles.actionSub, { color: colors.mutedForeground }]}>{subtitle}</Text>
      </View>
      <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 22, fontWeight: '800' },
  headerSub: { fontSize: 12 },
  adminBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, marginLeft: 'auto' },
  adminBadgeText: { fontSize: 12, fontWeight: '700' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { width: '47%', borderRadius: 14, borderWidth: 1, padding: 14, gap: 6, alignItems: 'center' },
  statIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 24, fontWeight: '800' },
  statLabel: { fontSize: 11, fontWeight: '500', textAlign: 'center' },
  section: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 14 },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  actionIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionTitle: { fontSize: 15, fontWeight: '600' },
  actionSub: { fontSize: 12 },
  divider: { height: 1 },
  progressBar: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  progressLabel: { fontSize: 12 },
});
