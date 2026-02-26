
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
        const visibleTabs = ['dashboard', 'actions', 'profile'];
        const isVisible = visibleTabs.includes(route.name);
        return {
          tabBarActiveTintColor: '#524f85',
          tabBarInactiveTintColor: '#9e9e9e',
          tabBarIcon: ({ color, size }: any) => {
            if (route.name === 'dashboard') return <MaterialIcons name="dashboard" size={size} color={color} />;
            if (route.name === 'actions') return <MaterialIcons name="apps" size={size} color={color} />;
            if (route.name === 'profile') return <FontAwesome name="user" size={size} color={color} />;
            return null;
          },
          tabBarStyle: {
            paddingVertical: 8,
            paddingHorizontal: 12,
            height: 64,
          },
          tabBarItemStyle: isVisible ? { 
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
          } : undefined,
          tabBarLabelStyle: { fontSize: 11, paddingBottom: 4 },
          headerShown: false,
        };
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="actions" options={{ title: 'Actions' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      

      {/* Hidden routes */}
      <Tabs.Screen name="analytics" options={{ href: null }} />
      <Tabs.Screen name="activity-tracker" options={{ href: null }} />
      <Tabs.Screen name="activities" options={{ href: null }} />
      <Tabs.Screen name="log-activity" options={{ href: null }} />
      <Tabs.Screen name="journal" options={{ href: null }} />
      <Tabs.Screen name="create-journal" options={{ href: null }} />
      <Tabs.Screen name="journal-list" options={{ href: null }} />
      <Tabs.Screen name="journal-detail" options={{ href: null }} />
      <Tabs.Screen name="journal-edit" options={{ href: null }} />
      <Tabs.Screen name="journal-analytics-detail" options={{ href: null }} />
      <Tabs.Screen name="take-a-break" options={{ href: null }} />
      <Tabs.Screen name="relaxation-sounds" options={{ href: null }} />
      <Tabs.Screen name="relaxation-sessions" options={{ href: null }} />
      <Tabs.Screen name="breathing-exercises" options={{ href: null }} />
      <Tabs.Screen name="visualization-journeys" options={{ href: null }} />
      <Tabs.Screen name="playsound" options={{ href: null }} />
      <Tabs.Screen name="playvisualization" options={{ href: null }} />
      <Tabs.Screen name="playbreathing" options={{ href: null }} />
      <Tabs.Screen name="mood" options={{ href: null }} />
      <Tabs.Screen name="mood-detail" options={{ href: null }} />
      <Tabs.Screen name="mood-edit" options={{ href: null }} />
      <Tabs.Screen name="mood-insights" options={{ href: null }} />
      <Tabs.Screen name="mood-analytics-detail" options={{ href: null }} />
      <Tabs.Screen name="mood-weekly-trend" options={{ href: null }} />
      <Tabs.Screen name="history-dashboard" options={{ href: null }} />
      <Tabs.Screen name="goals" options={{ href: null }} />
      <Tabs.Screen name="add-goal" options={{ href: null }} />
      <Tabs.Screen name="update-goal" options={{ href: null }} />
      <Tabs.Screen name="update-progress-goal" options={{ href: null }} />
      <Tabs.Screen name="emotional-insights" options={{ href: null }} />
      <Tabs.Screen name="create-emotional-insight" options={{ href: null }} />
      <Tabs.Screen name="emotional-insights-analytics" options={{ href: null }} />
      <Tabs.Screen name="emotional-insights-history" options={{ href: null }} />
      <Tabs.Screen name="connect-with-therapist" options={{ href: null }} />
      <Tabs.Screen name="sessions" options={{ href: null }} />
      <Tabs.Screen name="session-detail" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="notification-settings" options={{ href: null }} />
      <Tabs.Screen name="profile-edit" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      
    
    </Tabs>
  );
}
