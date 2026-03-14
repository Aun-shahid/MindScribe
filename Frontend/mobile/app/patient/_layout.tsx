
import React from 'react';
import { Tabs } from 'expo-router';
import CustomTabBar from '../components/CustomTabBar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Layout() {
  const insets = useSafeAreaInsets();
  const tabSceneBottomPadding = Math.max(insets.bottom + 92, 112);

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: {
          backgroundColor: '#342949',
          paddingBottom: tabSceneBottomPadding,
        },
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
