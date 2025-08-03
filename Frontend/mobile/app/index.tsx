import { useEffect } from 'react';
import { router, useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  const routerInstance = useRouter();

  useEffect(() => {
    // Add a small delay to ensure the router is ready
    const timer = setTimeout(() => {
      // Simply redirect to the auth splash screen
      // The auth context will handle checking authentication status
      router.replace('./auth/welcome');
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Show a loading state while redirecting
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#524f85" />
    </View>
  );
}
