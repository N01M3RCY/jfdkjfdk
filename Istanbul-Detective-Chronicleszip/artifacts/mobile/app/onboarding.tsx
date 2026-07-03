// This screen is replaced by auth.tsx — kept as empty redirect for compatibility
import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function OnboardingRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/auth');
  }, []);
  return null;
}
