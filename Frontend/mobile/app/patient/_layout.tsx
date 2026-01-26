
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
          if (route.name === 'analytics') {
            return <MaterialIcons name="analytics" size={size} color={color} />;
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
      <Tabs.Screen name="analytics" options={{ title: 'Analytics' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      

      {/* Hidden routes */}
      <Tabs.Screen name="activity-tracker" options={{ href: null }} />
      <Tabs.Screen name="journal" options={{ href: null }} />
      <Tabs.Screen name="create-journal" options={{ href: null }} />
      <Tabs.Screen name="journal-list" options={{ href: null }} />
      <Tabs.Screen name="journal-detail" options={{ href: null }} />
      <Tabs.Screen name="journal-edit" options={{ href: null }} />
      <Tabs.Screen name="journal-analytics-detail" options={{ href: null }} />
      <Tabs.Screen name="take-a-break" options={{ href: null }} />
      <Tabs.Screen name="relaxation-sounds" options={{ href: null }} />
      <Tabs.Screen name="breathing-exercises" options={{ href: null }} />
      <Tabs.Screen name="mood" options={{ href: null }} />
      <Tabs.Screen name="mood-detail" options={{ href: null }} />
      <Tabs.Screen name="mood-edit" options={{ href: null }} />
      <Tabs.Screen name="mood-analytics-detail" options={{ href: null }} />
      <Tabs.Screen name="mood-weekly-trend" options={{ href: null }} />
      <Tabs.Screen name="history-dashboard" options={{ href: null }} />
      <Tabs.Screen name="create-emotional-insight" options={{ href: null }} />
      <Tabs.Screen name="emotional-insights-history" options={{ href: null }} />
      <Tabs.Screen name="emotional-insights-analytics" options={{ href: null }} />
    
    </Tabs>
  );
}
