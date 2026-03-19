

import React from 'react';
import { Tabs } from 'expo-router';
import { Feather, FontAwesome, FontAwesome5, MaterialIcons } from '@expo/vector-icons';

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
          if (route.name === 'patients') {
            return <FontAwesome5 name="user-friends" size={size} color={color} />;
          }
          if (route.name === 'tools') {
            return <Feather name="tool" size={size} color={color} />;
          }
          if (route.name === 'notifications') {
            return <FontAwesome name="bell" size={size} color={color} />;
          }
           if (route.name === 'profile') {
            return <FontAwesome name="user" size={size} color={color} />;
          }
         
          return null;
        },
        headerShown: false,
      })}
    >
      <Tabs.Screen name="dashboard" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      <Tabs.Screen name="patients" options={{ title: 'Patients' }} />
      <Tabs.Screen name="notifications" options={{ title: 'Alerts' }} />
      <Tabs.Screen name="tools" options={{ title: 'Tools' }} />
    

      {/* Hidden routes */}
      <Tabs.Screen name="addpatientform" options={{ href: null }} />
      <Tabs.Screen name="end-session" options={{ href: null }} />
      <Tabs.Screen name="patient-details" options={{ href: null }} />
      <Tabs.Screen name="Session-Calender" options={{ href: null }} />
      <Tabs.Screen name="session-detail-view" options={{ href: null }} />
      <Tabs.Screen name="session-details" options={{ href: null }} />
      <Tabs.Screen name="sessionformconsent" options={{ href: null }} />
      <Tabs.Screen name="sessions" options={{ href: null }} />
      <Tabs.Screen name="start-new-session" options={{ href: null }} />
      <Tabs.Screen name="start-session" options={{ href: null }} />
      <Tabs.Screen name="therapist-qr-code" options={{ href: null }} />
      

    </Tabs>
  );
}
