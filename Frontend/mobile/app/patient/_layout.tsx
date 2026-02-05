
import React from 'react';
import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { FontAwesome } from '@expo/vector-icons';
import { FontAwesome5 } from '@expo/vector-icons';
import { Feather } from '@expo/vector-icons';

export default function Layout() {
  return (
    <Tabs
      screenOptions={({ route }) => {
        const visibleTabs = ['dashboard', 'analytics', 'profile'];
        const isVisible = visibleTabs.includes(route.name);
        return {
          tabBarActiveTintColor: '#524f85',
          tabBarInactiveTintColor: '#9e9e9e',
          tabBarIcon: ({ color, size }: any) => {
            if (route.name === 'dashboard') return <MaterialIcons name="dashboard" size={size} color={color} />;
            if (route.name === 'analytics') return <MaterialIcons name="analytics" size={size} color={color} />;
            if (route.name === 'profile') return <FontAwesome name="user" size={size} color={color} />;
            return null;
          },
          // Hide tab bar button for routes not in visibleTabs while keeping route available
          tabBarButton: isVisible ? undefined : () => null,
          // Make tab bar evenly spaced for visible tabs
          tabBarStyle: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingVertical: 8,
            paddingHorizontal: 12,
            height: 64,
          },
          tabBarItemStyle: { flex: 1 },
          tabBarLabelStyle: { fontSize: 11, paddingBottom: 4 },
          headerShown: false,
        };
      }}
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
      
    
    </Tabs>
  );
}
