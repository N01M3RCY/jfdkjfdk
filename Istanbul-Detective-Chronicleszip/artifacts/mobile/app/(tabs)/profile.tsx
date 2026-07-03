import React, { useState } from 'react';
import {
  Alert,
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
import { useGetAllProgress, useGetCases, getGetAllProgressQueryKey } from '@workspace/api-client-react';
import { useUser } from '@/context/UserContext';

const CITIES = ['İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya', 'Trabzon', 'Konya'];

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout, updateUser } = useUser();
  const [showCityPicker, setShowCityPicker] = useState(false);

  const { data: progressList } = useGetAllProgress(user?.id ?? 'anonymous', {
    query: { enabled: !!user?.id, queryKey: getGetAllProgressQueryKey(user?.id ?? 'anonymous') },
  });
  const { data: cases } = useGetCases({});

  const completed = (progressList ?? []).filter(p => p.status === 'completed');
  const active = (progressList ?? []).filter(p => p.status === 'active');

  const BADGE_COLOR: Record<string, string> = {
    'Efsane Dedektif': '#D4A017',
    'Usta Dedektif': '#C8102E',
    'Kıdemli Dedektif': '#7C3AED',
    'Dedektif': '#2563EB',
    'Stajyer Dedektif': '#059669',
    'Aday Dedektif': '#6B6B7E',
  };

  const badgeColor = BADGE_COLOR[user?.badge ?? 'Aday Dedektif'] ?? colors.mutedForeground;

  function handleLogout() {
    Alert.alert(
      'Çıkış Yap',
      'Hesabınızdan çıkmak istiyor musunuz?',
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Çıkış Yap', style: 'destructive', onPress: logout },
      ]
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Hero */}
      <LinearGradient
        colors={['#1A0008', '#0A0A0F']}
        style={[styles.hero, { paddingTop: insets.top + 20 }]}
      >
        <View style={[styles.avatarRing, { borderColor: colors.primary }]}>
          <View style={[styles.avatar, { backgroundColor: colors.card }]}>
            <MaterialCommunityIcons name="camera-iris" size={40} color={colors.primary} />
          </View>
        </View>
        <Text style={[styles.name, { color: colors.foreground }]}>{user?.displayName ?? 'Dedektif'}</Text>
        <Text style={[styles.username, { color: colors.mutedForeground }]}>@{user?.username}</Text>

        <View style={[styles.badgePill, { backgroundColor: badgeColor + '20', borderColor: badgeColor + '60' }]}>
          <MaterialCommunityIcons name="police-badge" size={12} color={badgeColor} />
          <Text style={[styles.badgeText, { color: badgeColor }]}>{user?.badge}</Text>
        </View>

        {user?.isAdmin && (
          <View style={[styles.adminPill, { backgroundColor: colors.accent + '20', borderColor: colors.accent + '60' }]}>
            <MaterialCommunityIcons name="shield-crown" size={12} color={colors.accent} />
            <Text style={[styles.badgeText, { color: colors.accent }]}>Admin</Text>
          </View>
        )}

        {/* XP Bar */}
        <View style={styles.xpRow}>
          <Text style={[styles.xpLabel, { color: colors.mutedForeground }]}>{user?.xp ?? 0} XP</Text>
          <View style={[styles.xpBar, { backgroundColor: colors.muted }]}>
            <View style={[styles.xpFill, { backgroundColor: colors.accent, width: `${Math.min(100, ((user?.xp ?? 0) % 500) / 5)}%` }]} />
          </View>
          <Text style={[styles.xpLabel, { color: colors.mutedForeground }]}>{500 - ((user?.xp ?? 0) % 500)} XP sonraki</Text>
        </View>
      </LinearGradient>

      {/* Stats */}
      <View style={styles.statsGrid}>
        <StatBox label="Çözülen" value={completed.length} icon="check-circle" color={colors.success} colors={colors} />
        <StatBox label="Aktif" value={active.length} icon="clock" color={colors.accent} colors={colors} />
        <StatBox label="Toplam XP" value={user?.xp ?? 0} icon="star" color={colors.primary} colors={colors} />
      </View>

      {/* City */}
      <Section title="Şehrim" colors={colors}>
        <TouchableOpacity
          style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setShowCityPicker(!showCityPicker)}
        >
          <Feather name="map-pin" size={18} color={colors.primary} />
          <Text style={[styles.rowText, { color: colors.foreground }]}>{user?.city ?? 'İstanbul'}</Text>
          <Feather name={showCityPicker ? 'chevron-up' : 'chevron-down'} size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
        {showCityPicker && (
          <View style={[styles.cityList, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {CITIES.map(city => (
              <TouchableOpacity
                key={city}
                style={[styles.cityOption, city === user?.city && { backgroundColor: colors.primary + '20' }]}
                onPress={() => { updateUser({ city }); setShowCityPicker(false); }}
              >
                <Text style={[styles.cityOptionText, { color: city === user?.city ? colors.primary : colors.foreground }]}>
                  {city}
                </Text>
                {city === user?.city && <Feather name="check" size={14} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </Section>

      {/* Solved Cases */}
      {completed.length > 0 && (
        <Section title="Çözülen Davalar" colors={colors}>
          {completed.map(p => {
            const c = cases?.find(x => x.id === p.caseId);
            return (
              <TouchableOpacity
                key={p.id}
                style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push(`/case/${p.caseId}`)}
              >
                <View style={[styles.solvedIcon, { backgroundColor: '#22C55E20' }]}>
                  <Feather name="check" size={14} color="#22C55E" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowText, { color: colors.foreground }]}>{c?.title ?? 'Dava'}</Text>
                  <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>{c?.city} — {c?.district}</Text>
                </View>
                <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            );
          })}
        </Section>
      )}

      {/* Admin */}
      {user?.isAdmin && (
        <Section title="Yönetim" colors={colors}>
          <TouchableOpacity
            style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push('/admin')}
          >
            <MaterialCommunityIcons name="shield-crown" size={18} color={colors.accent} />
            <Text style={[styles.rowText, { color: colors.accent }]}>Admin Paneli</Text>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        </Section>
      )}

      {/* Account */}
      <Section title="Hesap" colors={colors}>
        <TouchableOpacity
          style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={handleLogout}
        >
          <Feather name="log-out" size={18} color={colors.destructive} />
          <Text style={[styles.rowText, { color: colors.destructive }]}>Çıkış Yap</Text>
        </TouchableOpacity>
      </Section>
    </ScrollView>
  );
}

function Section({ title, children, colors }: { title: string; children: React.ReactNode; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{title}</Text>
      <View style={{ gap: 8 }}>{children}</View>
    </View>
  );
}

function StatBox({ label, value, icon, color, colors }: {
  label: string; value: number; icon: keyof typeof Feather.glyphMap;
  color: string; colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Feather name={icon} size={18} color={color} />
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { alignItems: 'center', paddingHorizontal: 20, paddingBottom: 24, gap: 8 },
  avatarRing: {
    width: 90, height: 90, borderRadius: 45, borderWidth: 3,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  avatar: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 24, fontWeight: '800', letterSpacing: -0.3 },
  username: { fontSize: 13, marginTop: -4 },
  badgePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1,
  },
  adminPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1,
  },
  badgeText: { fontSize: 12, fontWeight: '700' },
  xpRow: { width: '100%', gap: 4, alignItems: 'center' },
  xpLabel: { fontSize: 11 },
  xpBar: { width: '100%', height: 4, borderRadius: 2, overflow: 'hidden' },
  xpFill: { height: '100%', borderRadius: 2 },
  statsGrid: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 16, gap: 10 },
  statBox: {
    flex: 1, alignItems: 'center', paddingVertical: 14,
    borderRadius: 14, borderWidth: 1, gap: 4,
  },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 10, fontWeight: '500' },
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 12, borderWidth: 1,
  },
  rowText: { flex: 1, fontSize: 15, fontWeight: '500' },
  rowSub: { fontSize: 12, marginTop: 2 },
  solvedIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cityList: { borderRadius: 12, borderWidth: 1, overflow: 'hidden', marginTop: 4 },
  cityOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  cityOptionText: { fontSize: 15 },
});
