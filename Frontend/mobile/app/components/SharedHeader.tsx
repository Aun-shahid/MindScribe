import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, StatusBar } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useTheme } from '../contexts/ThemeContext';
import { router } from 'expo-router';

interface Props {
  titleLeft: string;
  titleRight?: string;
  showAnalytics?: boolean;
  onAnalytics?: () => void;
}

export default function SharedHeader({ titleLeft, titleRight, showAnalytics = true, onAnalytics }: Props) {
  const { themeStyle } = useTheme();
  return (
    <View style={[styles.headerContainer, { backgroundColor: themeStyle.card, paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 32) : 16 }]}>
      <TouchableOpacity
        style={[styles.backBtnCircle, { borderColor: 'rgba(0,0,0,0.06)' }]}
        onPress={() => router.back()}
      >
        <FontAwesome name="arrow-left" size={16} color={themeStyle.title} />
      </TouchableOpacity>

      <Text style={[styles.headerTitle, { color: themeStyle.title }]}> 
        <Text style={styles.headerBlue}>{titleLeft} </Text>
        {titleRight ? <Text style={styles.headerOrange}>{titleRight}</Text> : null}
      </Text>

      {showAnalytics && (
        <TouchableOpacity
          style={[styles.analyticsButton, { backgroundColor: themeStyle.card }]}
          onPress={() => onAnalytics ? onAnalytics() : router.push('./mood-analytics-detail')}
        >
          <FontAwesome name="bar-chart" size={18} color={themeStyle.title} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    position: 'relative',
  },
  backBtnCircle: {
    position: 'absolute',
    left: 18,
    top: 42,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 10,
    marginTop: 20,
    textAlign: 'center',
  },
  headerBlue: { color: '#524f85' },
  headerOrange: { color: '#FF9F6B' },
  analyticsButton: {
    position: 'absolute',
    right: 18,
    top: 42,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
});
