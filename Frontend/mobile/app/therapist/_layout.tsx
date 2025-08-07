// import { Tabs } from 'expo-router';

// export default function Layout() {
//   return (
//     <Tabs>
//       <Tabs.Screen
//         name="dashboard"
//         options={{
//           title: 'Dashboard',
//           headerShown: false,
//           tabBarLabel: 'Home',
//         }}
//       />
//       <Tabs.Screen
//         name="profile"
//         options={{
//           title: 'Profile',
//           headerShown: false,
//           tabBarLabel: 'Profile',
//         }}
//       />
//     </Tabs>
//   );
// }


// import { Tabs } from 'expo-router';

// export default function Layout() {
//   return (
//     <Tabs>
//       <Tabs.Screen
//         name="dashboard"
//         options={{
//           title: 'Dashboard',
//           headerShown: false,
//           tabBarLabel: 'Home',
//         }}
//       />
//       <Tabs.Screen
//         name="patients"
//         options={{
//           title: 'Patients',
//           headerShown: false,
//           tabBarLabel: 'Patients',
//         }}
//       />
//       <Tabs.Screen
//         name="tools"
//         options={{
//           title: 'Tools',
//           headerShown: false,
//           tabBarLabel: 'Tools',
//         }}
//       />
//       <Tabs.Screen
//         name="profile"
//         options={{
//           title: 'Settings',
//           headerShown: false,
//           tabBarLabel: 'Settings',
//         }}
//       />
//     </Tabs>
//   );
// }


import React from 'react';
import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { FontAwesome } from '@expo/vector-icons';
import { FontAwesome5 } from '@expo/vector-icons';
import { Feather } from '@expo/vector-icons';

export default function Layout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: '#524f85',
        tabBarInactiveTintColor: '#9e9e9e',
        tabBarIcon: ({ color, size }) => {
          if (route.name === 'dashboard') {
            return <MaterialIcons name="dashboard" size={size} color={color} />;
          }
          if (route.name === 'profile') {
            return <FontAwesome name="user" size={size} color={color} />;
          }
          if (route.name === 'patients') {
            return <FontAwesome5 name="user-friends" size={size} color={color} />;
          }
          if (route.name === 'tools') {
            return <Feather name="tool" size={size} color={color} />;
          }
          if (route.name === 'sessions') {
            return <MaterialIcons name="event-note" size={size} color={color} />;
          }
          return null;
        },
        headerShown: false,
      })}
    >
      <Tabs.Screen name="dashboard" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      <Tabs.Screen name="patients" options={{ title: 'Patients' }} />
      <Tabs.Screen name="tools" options={{ title: 'Tools' }} />
      <Tabs.Screen name="sessions" options={{ title: 'Sessions' }} />

      {/* Hidden routes */}
      <Tabs.Screen name="end-session" options={{ href: null }} />
      <Tabs.Screen name="start-session" options={{ href: null }} />
      <Tabs.Screen name="patient-details" options={{ href: null }} />
      <Tabs.Screen name="Session-Calender" options={{ href: null }} />
    <Tabs.Screen name="session-detail-view" options={{ href: null }} />
    <Tabs.Screen name="session-details" options={{ href: null }} />

    </Tabs>
  );
}
