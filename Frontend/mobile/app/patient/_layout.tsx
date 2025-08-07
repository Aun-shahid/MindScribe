
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
          // if (route.name === 'patients') {
          //   return <FontAwesome5 name="user-friends" size={size} color={color} />;
          // }
          // if (route.name === 'tools') {
          //   return <Feather name="tool" size={size} color={color} />;
          // }
          // if (route.name === 'sessions') {
          //   return <MaterialIcons name="event-note" size={size} color={color} />;
          // }
          return null;
        },
        headerShown: false,
      })}
    >
      <Tabs.Screen name="dashboard" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      

      {/* Hidden routes */}
      <Tabs.Screen name="activity-tracker" options={{ href: null }} />
      <Tabs.Screen name="journal" options={{ href: null }} />
      <Tabs.Screen name="mood-tracker" options={{ href: null }} />
      <Tabs.Screen name="history-dashboard" options={{ href: null }} />
    
    </Tabs>
  );
}
