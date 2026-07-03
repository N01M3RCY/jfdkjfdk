import React, { useState, useRef } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/context/UserContext';
import * as Haptics from 'expo-haptics';

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;

// ── Types ────────────────────────────────────────────────────────────────────
interface SocialPost {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  type: 'checkin' | 'achievement' | 'thought';
  content: string;
  city?: string;
  district?: string;
  achievementLabel?: string;
  likesCount: number;
  likedByMe: boolean;
  createdAt: string;
}

interface LeaderUser {
  id: string;
  username: string;
  displayName: string;
  city?: string;
  xp: string;
  badge?: string;
}

const POST_TYPE_META: Record<string, { icon: string; label: string; color: string }> = {
  checkin: { icon: 'map-pin', label: 'Check-in', color: '#3B82F6' },
  achievement: { icon: 'award', label: 'Başarım', color: '#F59E0B' },
  thought: { icon: 'message-circle', label: 'Düşünce', color: '#8B5CF6' },
};

// ── Main Component ───────────────────────────────────────────────────────────
export default function SocialScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token, user } = useUser();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'feed' | 'leaderboard'>('feed');
  const [showCompose, setShowCompose] = useState(false);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <LinearGradient
        colors={['#0D0016', colors.background]}
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Dedektif Topluluğu</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
            Kral ipucu ve dava sonucu paylaşmak yasak 🚫
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.composeBtn, { backgroundColor: colors.primary }]}
          onPress={() => setShowCompose(true)}
        >
          <Feather name="edit-2" size={16} color="#FFF" />
          <Text style={styles.composeBtnText}>Paylaş</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* Tabs */}
      <View style={[styles.tabBar, { borderColor: colors.border }]}>
        {(['feed', 'leaderboard'] as const).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tabItem, tab === t && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabLabel, { color: tab === t ? colors.primary : colors.mutedForeground }]}>
              {t === 'feed' ? '📡 Akış' : '🏆 Liderlik'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'feed' ? (
        <FeedTab colors={colors} token={token} queryClient={queryClient} />
      ) : (
        <LeaderboardTab colors={colors} token={token} currentUserId={user?.id} />
      )}

      {/* Compose Modal */}
      <ComposeModal
        visible={showCompose}
        onClose={() => setShowCompose(false)}
        colors={colors}
        token={token}
        user={user}
        onSuccess={() => {
          setShowCompose(false);
          queryClient.invalidateQueries({ queryKey: ['social-feed'] });
        }}
      />
    </View>
  );
}

// ── Feed Tab ─────────────────────────────────────────────────────────────────
function FeedTab({ colors, token, queryClient }: any) {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const { data: posts = [], refetch } = useQuery<SocialPost[]>({
    queryKey: ['social-feed'],
    queryFn: async () => {
      const r = await fetch(`${API_BASE}/social/feed`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return r.json();
    },
    enabled: !!token,
  });

  const likeMutation = useMutation({
    mutationFn: async (postId: string) => {
      const r = await fetch(`${API_BASE}/social/like/${postId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      return r.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['social-feed'] }),
  });

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  if (!posts.length) {
    return (
      <View style={styles.empty}>
        <MaterialCommunityIcons name="magnify" size={56} color={colors.mutedForeground + '60'} />
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Henüz paylaşım yok</Text>
        <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
          İlk dedektif paylaşımını sen yap!
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={posts}
      keyExtractor={i => i.id}
      contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 80 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      renderItem={({ item }) => (
        <PostCard
          post={item}
          colors={colors}
          onLike={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            likeMutation.mutate(item.id);
          }}
        />
      )}
    />
  );
}

// ── Post Card ────────────────────────────────────────────────────────────────
function PostCard({ post, colors, onLike }: { post: SocialPost; colors: any; onLike: () => void }) {
  const meta = POST_TYPE_META[post.type] ?? POST_TYPE_META.thought;
  const timeAgo = formatTimeAgo(post.createdAt);

  return (
    <View style={[styles.postCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header row */}
      <View style={styles.postHeader}>
        <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>
            {post.displayName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.postName, { color: colors.foreground }]}>{post.displayName}</Text>
          <Text style={[styles.postMeta, { color: colors.mutedForeground }]}>@{post.username} · {timeAgo}</Text>
        </View>
        <View style={[styles.typeBadge, { backgroundColor: meta.color + '20' }]}>
          <Feather name={meta.icon as any} size={11} color={meta.color} />
          <Text style={[styles.typeLabel, { color: meta.color }]}>{meta.label}</Text>
        </View>
      </View>

      {/* Content */}
      <Text style={[styles.postContent, { color: colors.foreground }]}>{post.content}</Text>

      {/* Location */}
      {post.city && (
        <View style={styles.postLocation}>
          <Feather name="map-pin" size={11} color={colors.mutedForeground} />
          <Text style={[styles.postLocationText, { color: colors.mutedForeground }]}>
            {post.district ? `${post.district}, ` : ''}{post.city}
          </Text>
        </View>
      )}

      {/* Like */}
      <TouchableOpacity style={styles.likeRow} onPress={onLike}>
        <Feather
          name={post.likedByMe ? 'heart' : 'heart'}
          size={16}
          color={post.likedByMe ? '#EF4444' : colors.mutedForeground}
        />
        <Text style={[styles.likeCount, { color: post.likedByMe ? '#EF4444' : colors.mutedForeground }]}>
          {post.likesCount}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Leaderboard Tab ──────────────────────────────────────────────────────────
function LeaderboardTab({ colors, token, currentUserId }: any) {
  const insets = useSafeAreaInsets();
  const { data: users = [] } = useQuery<LeaderUser[]>({
    queryKey: ['social-leaderboard'],
    queryFn: async () => {
      const r = await fetch(`${API_BASE}/social/leaderboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return r.json();
    },
    enabled: !!token,
  });

  const MEDALS = ['🥇', '🥈', '🥉'];

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: insets.bottom + 80 }}>
      {users.map((u, i) => (
        <View
          key={u.id}
          style={[
            styles.leaderRow,
            { backgroundColor: colors.card, borderColor: u.id === currentUserId ? colors.primary : colors.border },
            u.id === currentUserId && { borderWidth: 2 },
          ]}
        >
          <Text style={styles.medal}>{MEDALS[i] ?? `${i + 1}.`}</Text>
          <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {u.displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.leaderName, { color: u.id === currentUserId ? colors.primary : colors.foreground }]}>
              {u.displayName}
              {u.id === currentUserId && ' (Sen)'}
            </Text>
            <Text style={[styles.leaderCity, { color: colors.mutedForeground }]}>
              {u.city ?? 'Bilinmeyen Şehir'} · {u.badge ?? 'Stajyer Dedektif'}
            </Text>
          </View>
          <View style={[styles.xpBadge, { backgroundColor: colors.accent + '20' }]}>
            <Text style={[styles.xpText, { color: colors.accent }]}>{u.xp} XP</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

// ── Compose Modal ─────────────────────────────────────────────────────────────
function ComposeModal({ visible, onClose, colors, token, user, onSuccess }: any) {
  const [type, setType] = useState<'checkin' | 'achievement' | 'thought'>('thought');
  const [content, setContent] = useState('');
  const [city, setCity] = useState(user?.city ?? '');
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!content.trim()) return;
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/social/post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type, content, city: city || undefined }),
      });
      const data = await r.json();
      if (!r.ok) {
        Alert.alert(data.spoiler ? '🚫 Spoiler Uyarısı' : 'Hata', data.error ?? 'Bir hata oluştu');
        return;
      }
      setContent('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSuccess();
    } catch {
      Alert.alert('Hata', 'Gönderi oluşturulamadı.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.modalContainer, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Modal header */}
        <View style={[styles.modalHeader, { borderColor: colors.border }]}>
          <TouchableOpacity onPress={onClose}>
            <Text style={[styles.modalCancel, { color: colors.mutedForeground }]}>İptal</Text>
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>Gönderi Oluştur</Text>
          <TouchableOpacity
            onPress={submit}
            disabled={!content.trim() || loading}
            style={[styles.modalPost, { backgroundColor: content.trim() ? colors.primary : colors.muted }]}
          >
            <Text style={styles.modalPostText}>{loading ? '...' : 'Paylaş'}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 16 }}>
          {/* Spoiler warning */}
          <View style={[styles.spoilerWarning, { backgroundColor: '#7C3AED20', borderColor: '#7C3AED40' }]}>
            <Feather name="alert-triangle" size={14} color="#A78BFA" />
            <Text style={[styles.spoilerText, { color: '#A78BFA' }]}>
              Dava sonuçları ve ipuçları paylaşmak yasaktır. Spoiler içeren gönderiler otomatik engellenir.
            </Text>
          </View>

          {/* Type selector */}
          <View style={styles.typeRow}>
            {(['checkin', 'achievement', 'thought'] as const).map(t => {
              const m = POST_TYPE_META[t];
              return (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.typeBtn,
                    { borderColor: type === t ? m.color : colors.border, backgroundColor: type === t ? m.color + '20' : colors.card },
                  ]}
                  onPress={() => setType(t)}
                >
                  <Feather name={m.icon as any} size={14} color={type === t ? m.color : colors.mutedForeground} />
                  <Text style={[styles.typeBtnText, { color: type === t ? m.color : colors.mutedForeground }]}>{m.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Content input */}
          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder={
              type === 'checkin' ? 'Bugün nereye gittin?'
              : type === 'achievement' ? 'Bugün ne başardın?'
              : 'Dedektif hayatı hakkında düşüncelerini paylaş...'
            }
            placeholderTextColor={colors.mutedForeground}
            style={[styles.contentInput, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
            multiline
            maxLength={300}
            autoFocus
          />
          <Text style={[styles.charCount, { color: colors.mutedForeground }]}>{content.length} / 300</Text>

          {/* City */}
          <TextInput
            value={city}
            onChangeText={setCity}
            placeholder="Şehir (isteğe bağlı)"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.cityInput, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'az önce';
  if (m < 60) return `${m}dk`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}sa`;
  return `${Math.floor(h / 24)}g`;
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle: { fontSize: 22, fontWeight: '800' },
  headerSub: { fontSize: 11, marginTop: 2 },
  composeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  composeBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1 },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabLabel: { fontSize: 13, fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  postCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  postHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '800' },
  postName: { fontSize: 14, fontWeight: '700' },
  postMeta: { fontSize: 11 },
  typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  typeLabel: { fontSize: 10, fontWeight: '700' },
  postContent: { fontSize: 14, lineHeight: 21 },
  postLocation: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  postLocationText: { fontSize: 11 },
  likeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  likeCount: { fontSize: 13, fontWeight: '600' },
  leaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  medal: { fontSize: 22, width: 30, textAlign: 'center' },
  leaderName: { fontSize: 14, fontWeight: '700' },
  leaderCity: { fontSize: 11 },
  xpBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  xpText: { fontSize: 13, fontWeight: '700' },
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  modalCancel: { fontSize: 15, width: 60 },
  modalTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700' },
  modalPost: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20 },
  modalPostText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  spoilerWarning: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  spoilerText: { fontSize: 12, lineHeight: 17, flex: 1 },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  typeBtnText: { fontSize: 12, fontWeight: '600' },
  contentInput: { borderRadius: 12, borderWidth: 1, padding: 14, fontSize: 15, minHeight: 120, textAlignVertical: 'top' },
  charCount: { fontSize: 11, textAlign: 'right' },
  cityInput: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14 },
});
