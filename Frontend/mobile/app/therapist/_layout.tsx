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


import { Tabs } from 'expo-router';

export default function Layout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          headerShown: false,
          tabBarLabel: 'Home',
        }}
      />
      <Tabs.Screen
        name="patients"
        options={{
          title: 'Patients',
          headerShown: false,
          tabBarLabel: 'Patients',
        }}
      />
      <Tabs.Screen
        name="tools"
        options={{
          title: 'Tools',
          headerShown: false,
          tabBarLabel: 'Tools',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Settings',
          headerShown: false,
          tabBarLabel: 'Settings',
        }}
      />
    </Tabs>
  );
}
