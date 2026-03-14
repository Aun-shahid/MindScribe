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
import { Slot } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./contexts/AuthContext";

console.log('🌟 ROOT: Root layout loading...');

export default function RootLayout() {
  console.log('🌟 ROOT: RootLayout component rendering');
  
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Slot />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
