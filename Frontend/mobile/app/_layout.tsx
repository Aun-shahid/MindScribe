// // app/_layout.tsx
// import { Slot } from "expo-router";
// import { SafeAreaProvider } from "react-native-safe-area-context";
// import { AuthProvider } from "./contexts/AuthContext";

// export default function RootLayout() {
//   return (
//     <SafeAreaProvider>
//       <AuthProvider>
//         <Slot />
//       </AuthProvider>
//     </SafeAreaProvider>
//   );
// }
// app/_layout.tsx
import { useEffect } from "react";
import { Slot } from "expo-router";
import * as Linking from "expo-linking";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { router } from "expo-router";
import { AuthProvider } from "./contexts/AuthContext";

// Deep linking configuration
const linking = {
  prefixes: ["mindscribe://", "https://www.mindscribe.live", "https://mindscribe.live"],
  config: {
    screens: {
      "auth/reset-confirm": "patient/reset-password",
      "auth/verify-email": "patient/verify-email",
    },
  },
};

console.log('🌟 ROOT: Root layout loading...');

export default function RootLayout() {
  console.log('🌟 ROOT: RootLayout component rendering');
  
  useEffect(() => {
    // Handle initial URL if app was launched from a link
    const handleInitialURL = async () => {
      const initialURL = await Linking.getInitialURL();
      if (initialURL != null) {
        console.log('🔗 [DEEP LINK] Initial URL:', initialURL);
        handleDeepLink(initialURL);
      }
    };

    // Handle URL when app is already open
    const subscription = Linking.addEventListener('url', (event) => {
      console.log('🔗 [DEEP LINK] URL received:', event.url);
      handleDeepLink(event.url);
    });

    handleInitialURL();

    return () => {
      subscription?.remove();
    };
  }, []);

  const handleDeepLink = (url: string) => {
    try {
      const parsed = Linking.parse(url);
      console.log('🔗 [DEEP LINK] Parsed:', parsed);
      
      const { hostname, path, queryParams } = parsed;
      const normalizedPath = (path || '').toLowerCase();

      if (
        normalizedPath.includes('reset-password') ||
        normalizedPath.includes('patient/reset') ||
        normalizedPath.includes('resetconfirm')
      ) {
        const token = queryParams?.token as string;
        if (token) {
          console.log('🔗 [DEEP LINK] Navigating to reset-confirm with token:', token);
          router.push({
            pathname: '/auth/reset-confirm',
            params: { token },
          });
        }
      } else if (normalizedPath.includes('verify-email') || normalizedPath.includes('patient/verify')) {
        const code = queryParams?.code as string;
        if (code) {
          console.log('🔗 [DEEP LINK] Navigating to verify-email with code:', code);
          router.push({
            pathname: '/auth/verify-email',
            params: { code },
          });
        }
      }
    } catch (error) {
      console.error('❌ [DEEP LINK] Error handling deep link:', error);
    }
  };
  
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Slot />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
