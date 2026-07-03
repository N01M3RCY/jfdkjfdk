import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="cases/index" />
      <Stack.Screen name="cases/new" />
      <Stack.Screen name="cases/[id]" />
      <Stack.Screen name="submissions" />
      <Stack.Screen name="users" />
    </Stack>
  );
}
