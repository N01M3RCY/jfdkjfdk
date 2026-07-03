import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useUser } from '@/context/UserContext';

const CITIES = ['İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya', 'Trabzon', 'Konya'];

export default function AuthScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login, register } = useUser();

  const [mode, setMode] = useState<'welcome' | 'login' | 'register'>('welcome');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [city, setCity] = useState('İstanbul');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin() {
    if (!username.trim() || !password) return;
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const { error } = await login(username, password);
    setLoading(false);
    if (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Giriş Hatası', error);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }

  async function handleRegister() {
    if (!username.trim() || !password || !displayName.trim()) return;
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const { error } = await register(username, password, displayName, city);
    setLoading(false);
    if (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Kayıt Hatası', error);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <LinearGradient colors={['#05000A', '#0A0A0F', '#12121A']} style={[styles.container, { paddingTop: insets.top }]}>
        {/* Welcome Screen */}
        {mode === 'welcome' && (
          <View style={styles.screen}>
            <View style={[styles.heroIcon, { backgroundColor: colors.primary + '20' }]}>
              <MaterialCommunityIcons name="camera-iris" size={72} color={colors.primary} />
            </View>
            <Text style={[styles.appName, { color: colors.foreground }]}>Kadrajdaki{'\n'}Sır</Text>
            <Text style={[styles.tagline, { color: colors.accent }]}>Her karede bir gizem saklanır.</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Türkiye'nin şehirlerinde gizlenmiş davaları çöz. Gerçek konumlara git, kanıtları topla ve sırları ortaya çıkar.
            </Text>

            <View style={styles.features}>
              {[
                { icon: 'camera', text: 'Fotoğrafla kanıt topla' },
                { icon: 'map-pin', text: 'Gerçek lokasyonlarda soruştur' },
                { icon: 'help-circle', text: 'Şifreli bilmeceler çöz' },
                { icon: 'award', text: 'Deneyim kazan, rütbe yükselt' },
              ].map(f => (
                <View key={f.text} style={styles.featureRow}>
                  <View style={[styles.featureIcon, { backgroundColor: colors.primary + '20' }]}>
                    <Feather name={f.icon as any} size={15} color={colors.primary} />
                  </View>
                  <Text style={[styles.featureText, { color: colors.foreground }]}>{f.text}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.primary }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMode('register'); }}
            >
              <MaterialCommunityIcons name="camera-iris" size={18} color="#FFF" />
              <Text style={styles.btnText}>Kayıt Ol</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnOutline, { borderColor: colors.border }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMode('login'); }}
            >
              <Text style={[styles.btnOutlineText, { color: colors.foreground }]}>Zaten hesabım var — Giriş Yap</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Login Screen */}
        {mode === 'login' && (
          <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
            <TouchableOpacity onPress={() => setMode('welcome')} style={styles.backBtn}>
              <Feather name="arrow-left" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
            <MaterialCommunityIcons name="shield-lock" size={56} color={colors.primary} />
            <Text style={[styles.title, { color: colors.foreground }]}>Giriş Yap</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Dedektif kimliğinizle giriş yapın.</Text>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Kullanıcı Adı</Text>
              <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="user" size={16} color={colors.mutedForeground} />
                <TextInput
                  value={username}
                  onChangeText={setUsername}
                  placeholder="kullaniciadi"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.input, { color: colors.foreground }]}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Şifre</Text>
              <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="lock" size={16} color={colors.mutedForeground} />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.input, { color: colors.foreground }]}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Feather name={showPassword ? 'eye-off' : 'eye'} size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.btn, { backgroundColor: loading ? colors.muted : colors.primary, marginTop: 8 }]}
              onPress={handleLogin}
              disabled={loading || !username.trim() || !password}
            >
              {loading
                ? <Text style={styles.btnText}>Giriş yapılıyor...</Text>
                : <><Feather name="log-in" size={16} color="#FFF" /><Text style={styles.btnText}>Giriş Yap</Text></>
              }
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setMode('register')}>
              <Text style={[styles.switchText, { color: colors.mutedForeground }]}>
                Hesabın yok mu? <Text style={{ color: colors.primary }}>Kayıt Ol</Text>
              </Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* Register Screen */}
        {mode === 'register' && (
          <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
            <TouchableOpacity onPress={() => setMode('welcome')} style={styles.backBtn}>
              <Feather name="arrow-left" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
            <MaterialCommunityIcons name="account-plus" size={56} color={colors.primary} />
            <Text style={[styles.title, { color: colors.foreground }]}>Kayıt Ol</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Dedektif profilinizi oluşturun.</Text>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Dedektif Adı (Görünen Ad)</Text>
              <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="user" size={16} color={colors.mutedForeground} />
                <TextInput
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="Dedektif Mehmet"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.input, { color: colors.foreground }]}
                  returnKeyType="next"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Kullanıcı Adı</Text>
              <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="at-sign" size={16} color={colors.mutedForeground} />
                <TextInput
                  value={username}
                  onChangeText={setUsername}
                  placeholder="kullaniciadi"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.input, { color: colors.foreground }]}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Şifre</Text>
              <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="lock" size={16} color={colors.mutedForeground} />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="En az 6 karakter"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.input, { color: colors.foreground }]}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  returnKeyType="done"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Feather name={showPassword ? 'eye-off' : 'eye'} size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Şehriniz</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
                {CITIES.map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.cityChip,
                      {
                        backgroundColor: city === c ? colors.primary : colors.card,
                        borderColor: city === c ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setCity(c)}
                  >
                    <Text style={[styles.cityChipText, { color: city === c ? '#FFF' : colors.mutedForeground }]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <TouchableOpacity
              style={[styles.btn, { backgroundColor: loading ? colors.muted : colors.primary, marginTop: 8 }]}
              onPress={handleRegister}
              disabled={loading || !username.trim() || !password || !displayName.trim()}
            >
              {loading
                ? <Text style={styles.btnText}>Kayıt olunuyor...</Text>
                : <><MaterialCommunityIcons name="camera-iris" size={16} color="#FFF" /><Text style={styles.btnText}>Soruşturmaya Başla</Text></>
              }
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setMode('login')}>
              <Text style={[styles.switchText, { color: colors.mutedForeground }]}>
                Hesabın var mı? <Text style={{ color: colors.primary }}>Giriş Yap</Text>
              </Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  screen: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingBottom: 48,
    paddingTop: 32,
    alignItems: 'center',
    gap: 16,
  },
  backBtn: { alignSelf: 'flex-start', padding: 4, marginBottom: 4 },
  heroIcon: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center' },
  appName: { fontSize: 40, fontWeight: '900', textAlign: 'center', letterSpacing: -1.5, lineHeight: 44 },
  tagline: { fontSize: 14, fontWeight: '700', letterSpacing: 0.5 },
  title: { fontSize: 30, fontWeight: '900', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, textAlign: 'center', lineHeight: 22, maxWidth: 280 },
  features: { width: '100%', gap: 10 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  featureText: { fontSize: 13, fontWeight: '500', flex: 1 },
  formGroup: { width: '100%', gap: 6 },
  label: { fontSize: 12, fontWeight: '600', letterSpacing: 0.3 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 13,
  },
  input: { flex: 1, fontSize: 15 },
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 15, paddingHorizontal: 28,
    borderRadius: 14, width: '100%', justifyContent: 'center',
  },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  btnOutline: {
    borderWidth: 1, paddingVertical: 14, paddingHorizontal: 28,
    borderRadius: 14, width: '100%', alignItems: 'center',
  },
  btnOutlineText: { fontSize: 14, fontWeight: '600' },
  switchText: { fontSize: 13, textAlign: 'center' },
  cityChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, marginHorizontal: 4,
  },
  cityChipText: { fontSize: 13, fontWeight: '600' },
});
