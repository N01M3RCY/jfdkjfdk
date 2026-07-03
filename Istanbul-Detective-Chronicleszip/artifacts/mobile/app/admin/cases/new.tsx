import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useCreateCase } from '@workspace/api-client-react';

const CITIES = ['İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya', 'Trabzon', 'Konya'];
const DIFFICULTIES = ['kolay', 'orta', 'zor'];
const CATEGORIES = ['cinayet', 'hirsizlik', 'kacakcilik', 'casusluk', 'gasp', 'kayip'];

export default function NewCaseScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const createCase = useCreateCase();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('İstanbul');
  const [district, setDistrict] = useState('');
  const [difficulty, setDifficulty] = useState('orta');
  const [category, setCategory] = useState('cinayet');
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    if (!title.trim() || !description.trim() || !district.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen tüm zorunlu alanları doldurun.');
      return;
    }

    setIsSaving(true);
    try {
      await createCase.mutateAsync({
        data: { title, description, city, district, difficulty, category, thumbnailUrl: null, isActive },
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch {
      Alert.alert('Hata', 'Dava oluşturulamadı.');
    } finally {
      setIsSaving(false);
    }
  }

  const inputStyle = [styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 16, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="x" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Yeni Dava</Text>
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: isSaving ? colors.muted : colors.primary }]}
            onPress={handleSave}
            disabled={isSaving}
          >
            <Text style={styles.saveBtnText}>{isSaving ? 'Kaydediliyor...' : 'Kaydet'}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
          <FormField label="Dava Başlığı *" colors={colors}>
            <TextInput style={inputStyle} value={title} onChangeText={setTitle} placeholder="Dava adı..." placeholderTextColor={colors.mutedForeground} />
          </FormField>

          <FormField label="Açıklama *" colors={colors}>
            <TextInput
              style={[inputStyle, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Dava özeti..."
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </FormField>

          <FormField label="Şehir" colors={colors}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {CITIES.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.chip, { backgroundColor: city === c ? colors.primary : colors.muted, borderColor: city === c ? colors.primary : colors.border }]}
                  onPress={() => setCity(c)}
                >
                  <Text style={[styles.chipText, { color: city === c ? '#FFF' : colors.foreground }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </FormField>

          <FormField label="İlçe *" colors={colors}>
            <TextInput style={inputStyle} value={district} onChangeText={setDistrict} placeholder="İlçe..." placeholderTextColor={colors.mutedForeground} />
          </FormField>

          <FormField label="Zorluk" colors={colors}>
            <View style={styles.row}>
              {DIFFICULTIES.map(d => (
                <TouchableOpacity
                  key={d}
                  style={[styles.chip, { flex: 1, backgroundColor: difficulty === d ? colors.primary : colors.muted, borderColor: difficulty === d ? colors.primary : colors.border }]}
                  onPress={() => setDifficulty(d)}
                >
                  <Text style={[styles.chipText, { color: difficulty === d ? '#FFF' : colors.foreground, textAlign: 'center' }]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </FormField>

          <FormField label="Kategori" colors={colors}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {CATEGORIES.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.chip, { backgroundColor: category === c ? colors.accent + '30' : colors.muted, borderColor: category === c ? colors.accent : colors.border }]}
                  onPress={() => setCategory(c)}
                >
                  <Text style={[styles.chipText, { color: category === c ? colors.accent : colors.foreground }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </FormField>

          <View style={[styles.switchRow, { borderColor: colors.border }]}>
            <Text style={[styles.switchLabel, { color: colors.foreground }]}>Dava Aktif</Text>
            <Switch value={isActive} onValueChange={setIsActive} trackColor={{ false: colors.muted, true: colors.primary }} />
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

function FormField({ label, children, colors }: { label: string; children: React.ReactNode; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700', flex: 1 },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  saveBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  content: { padding: 20, gap: 16 },
  field: { gap: 8 },
  label: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  textArea: { minHeight: 100 },
  row: { flexDirection: 'row', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, marginRight: 8 },
  chipText: { fontSize: 13, fontWeight: '600' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderTopWidth: 1 },
  switchLabel: { fontSize: 15, fontWeight: '600' },
});
