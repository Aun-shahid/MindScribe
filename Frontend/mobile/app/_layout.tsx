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
import { Slot, router } from "expo-router";
import * as Linking from "expo-linking";
import { Alert, LogBox } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./contexts/AuthContext";

console.log('🌟 ROOT: Root layout loading...');

export default function RootLayout() {
  if (__DEV__) {
    console.log('🌟 ROOT: RootLayout component rendering');
  }
  
  useEffect(() => {
    // In production APK, hide developer-oriented logs and show user-friendly fallback.
    const globalAny = global as any;
    const errorUtils = globalAny?.ErrorUtils;
    const previousGlobalHandler = errorUtils?.getGlobalHandler?.();

    if (!__DEV__) {
      LogBox.ignoreAllLogs(true);
      const noop = () => {};
      console.log = noop;
      console.warn = noop;
      console.error = noop;

      errorUtils?.setGlobalHandler?.((error: unknown, isFatal?: boolean) => {
        Alert.alert('Something went wrong', 'Please try again. If the problem continues, restart the app.');
        if (previousGlobalHandler) {
          previousGlobalHandler(error, isFatal);
        }
      });
    }

    // Handle initial URL if app was launched from a link
    const handleInitialURL = async () => {
      const initialURL = await Linking.getInitialURL();
      if (initialURL != null) {
        if (__DEV__) {
          console.log('🔗 [DEEP LINK] Initial URL:', initialURL);
        }
        handleDeepLink(initialURL);
      }
    };

    // Handle URL when app is already open
    const subscription = Linking.addEventListener('url', (event) => {
      if (__DEV__) {
        console.log('🔗 [DEEP LINK] URL received:', event.url);
      }
      handleDeepLink(event.url);
    });

    handleInitialURL();

    return () => {
      subscription?.remove();
      if (!__DEV__ && previousGlobalHandler && errorUtils?.setGlobalHandler) {
        errorUtils.setGlobalHandler(previousGlobalHandler);
      }
    };
  }, []);

  const handleDeepLink = (url: string) => {
    try {
      const parsed = Linking.parse(url);
      if (__DEV__) {
        console.log('🔗 [DEEP LINK] Parsed:', parsed);
      }
      
      const { path, queryParams } = parsed;
      const normalizedPath = (path || '').toLowerCase();

      if (
        normalizedPath.includes('reset-password') ||
        normalizedPath.includes('patient/reset') ||
        normalizedPath.includes('resetconfirm')
      ) {
        const token = queryParams?.token as string;
        if (token) {
          if (__DEV__) {
            console.log('🔗 [DEEP LINK] Navigating to reset-confirm with token:', token);
          }
          router.push({
            pathname: '/auth/reset-confirm',
            params: { token },
          });
        }
      } else if (normalizedPath.includes('verify-email') || normalizedPath.includes('patient/verify')) {
        const code = queryParams?.code as string;
        if (code) {
          if (__DEV__) {
            console.log('🔗 [DEEP LINK] Navigating to verify-email with code:', code);
          }
          router.push({
            pathname: '/auth/verify-email',
            params: { code },
          });
        }
      }
    } catch (error) {
      if (__DEV__) {
        console.error('❌ [DEEP LINK] Error handling deep link:', error);
      }
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
