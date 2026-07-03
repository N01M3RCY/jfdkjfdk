import { Stack } from 'expo-router';

export default function ARLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[caseId]" />
    </Stack>
  );
}
