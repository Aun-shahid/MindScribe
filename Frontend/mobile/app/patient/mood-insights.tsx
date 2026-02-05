import React, { useEffect } from 'react';
import { SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';

export default function MoodInsightsScreen(){
  const router = useRouter();
  useEffect(()=>{ router.replace('./mood'); }, [router]);
  return (<SafeAreaView />);
}
