import React, { useState, useRef, useEffect } from 'react';
import { SafeAreaView, ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Platform, StatusBar, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useTheme } from '../contexts/ThemeContext';
import PatientService from '../services/patient.service';
import { useAuthContext } from '../contexts/AuthContext';
import { router } from 'expo-router';

const { height: screenHeight } = Dimensions.get('window');

export default function ConnectWithTherapist() {
  const { themeStyle, colors } = useTheme();
  const { fetchProfile } = useAuthContext();

  const [therapistPin, setTherapistPin] = useState<string>('');
  const [connectMessage, setConnectMessage] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Animated values for floating bubbles
  const bubble1Y = useRef(new Animated.Value(0)).current;
  const bubble1X = useRef(new Animated.Value(0)).current;
  const bubble2Y = useRef(new Animated.Value(0)).current;
  const bubble2X = useRef(new Animated.Value(0)).current;
  const bubble3Y = useRef(new Animated.Value(0)).current;
  const bubble3X = useRef(new Animated.Value(0)).current;
  const bubble4Y = useRef(new Animated.Value(0)).current;
  const bubble4X = useRef(new Animated.Value(0)).current;
  const bubble5Y = useRef(new Animated.Value(0)).current;
  const bubble5X = useRef(new Animated.Value(0)).current;

  // Animate bubbles
  useEffect(() => {
    const createFloatingAnimation = (
      animatedY: Animated.Value,
      animatedX: Animated.Value,
      durationY: number,
      durationX: number,
      delay: number
    ) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.sequence([
              Animated.timing(animatedY, {
                toValue: -30,
                duration: durationY,
                useNativeDriver: true,
              }),
              Animated.timing(animatedY, {
                toValue: 0,
                duration: durationY,
                useNativeDriver: true,
              }),
            ]),
            Animated.sequence([
              Animated.timing(animatedX, {
                toValue: 20,
                duration: durationX,
                useNativeDriver: true,
              }),
              Animated.timing(animatedX, {
                toValue: 0,
                duration: durationX,
                useNativeDriver: true,
              }),
            ]),
          ]),
        ])
      );
    };

    const anim1 = createFloatingAnimation(bubble1Y, bubble1X, 8000, 7000, 0);
    const anim2 = createFloatingAnimation(bubble2Y, bubble2X, 9000, 8000, 1000);
    const anim3 = createFloatingAnimation(bubble3Y, bubble3X, 7000, 9000, 500);
    const anim4 = createFloatingAnimation(bubble4Y, bubble4X, 10000, 7500, 1500);
    const anim5 = createFloatingAnimation(bubble5Y, bubble5X, 8500, 8500, 2000);

    anim1.start();
    anim2.start();
    anim3.start();
    anim4.start();
    anim5.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
      anim4.stop();
      anim5.stop();
    };
  }, []);

  const handleConnect = async () => {
    if (!therapistPin || therapistPin.trim().length === 0) {
      Alert.alert('Enter PIN', 'Please enter the therapist PIN or scan the QR code');
      return;
    }
    try {
      setLoading(true);
      const res = await PatientService.connectTherapist(therapistPin.trim(), connectMessage.trim());
      Alert.alert('Request Sent', 'Connection request created. Your therapist must approve it.');
      // optionally refresh profile
      try { await fetchProfile(); } catch (e) { /* ignore */ }
      router.back();
    } catch (err: any) {
      console.error('[Connect] error', err);
      const respData = err?.response?.data;
      if (respData && (respData.detail === 'You are already connected to this therapist.' || (typeof respData === 'string' && respData.includes('already connected')))) {
        try { await fetchProfile(); } catch (e) {}
        Alert.alert('Connected', 'You are already connected to this therapist.');
        router.back();
        return;
      }
      const msg = respData || err?.message || 'Failed to send connection request';
      Alert.alert('Error', String(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.wrapper, { backgroundColor: '#342949', paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 32) : 16 }]}>
      {/* Gradient background */}
      <LinearGradient
        colors={['#342949', '#342949', '#342949']}
        start={[0, 0]}
        end={[0, 1]}
        style={[styles.screenGradient, { height: screenHeight }]}
        pointerEvents="none"
      />
      {/* Floating bubble decorations with animation */}
      <View style={styles.floatingBubbles} pointerEvents="none">
        <Animated.View style={[
          styles.bubble,
          { width: 200, height: 200, top: 50, right: -50, backgroundColor: 'rgba(115, 123, 161, 0.2)' },
          { transform: [{ translateY: bubble1Y }, { translateX: bubble1X }] }
        ]} />
        <Animated.View style={[
          styles.bubble,
          { width: 280, height: 280, top: -100, left: -80, backgroundColor: 'rgba(115, 123, 161, 0.15)' },
          { transform: [{ translateY: bubble2Y }, { translateX: bubble2X }] }
        ]} />
        <Animated.View style={[
          styles.bubble,
          { width: 150, height: 150, bottom: 200, left: -30, backgroundColor: 'rgba(115, 123, 161, 0.18)' },
          { transform: [{ translateY: bubble3Y }, { translateX: bubble3X }] }
        ]} />
        <Animated.View style={[
          styles.bubble,
          { width: 180, height: 180, bottom: 100, right: -60, backgroundColor: 'rgba(115, 123, 161, 0.16)' },
          { transform: [{ translateY: bubble4Y }, { translateX: bubble4X }] }
        ]} />
        <Animated.View style={[
          styles.bubble,
          { width: 120, height: 120, top: '40%', right: 20, backgroundColor: 'rgba(115, 123, 161, 0.12)' },
          { transform: [{ translateY: bubble5Y }, { translateX: bubble5X }] }
        ]} />
      </View>
      <View style={[styles.headerRow, { paddingTop: 8 }] }>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <FontAwesome name="chevron-left" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitleLarge}>
          <Text style={styles.headerBlue}>Connect with </Text>
          <Text style={styles.headerOrange}>Your Therapist</Text>
        </Text>
      </View>

      
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.hint]}>Scan the QR code provided by your therapist or enter the code manually</Text>

        <View style={styles.connectCard}>
          <LinearGradient
            colors={[ '#FFB6B6', '#FF9F6B']}
            start={[0, 0]}
            end={[1, 1]}
            style={styles.qrCircle}
          >
            <FontAwesome name="qrcode" size={40} color={'#fff'} />
          </LinearGradient>
          <Text style={[styles.cardTitle, { color: '#000', marginTop: 12 }]}>Scan QR Code</Text>
          <Text style={[styles.cardSubtitle, { color: '#666', marginTop: 6 }]}>Open camera to scan</Text>
        </View>

        <View style={[styles.dividerRow, { marginVertical: 20 }] }>
          <View style={styles.line} />
          <Text style={styles.dividerText}>or enter manually</Text>
          <View style={styles.line} />
        </View>

        <Text style={[styles.inputLabel, { marginTop: 4 }]}>Therapist Code</Text>
        <TextInput
          value={therapistPin}
          onChangeText={setTherapistPin}
          placeholder="Enter code"
          placeholderTextColor="#999"
          style={[styles.input, { color: '#000' }]}
        />

        <Text style={[styles.inputLabel, { marginTop: 8 }]}>Message (Optional)</Text>
        <TextInput
          value={connectMessage}
          onChangeText={setConnectMessage}
          placeholder="Introduce yourself to your therapist..."
          placeholderTextColor="#999"
          style={[styles.textArea, { borderColor: '#e0dfe8', color: '#000' }]}
          multiline
        />

        <TouchableOpacity 
          style={[styles.primaryBtn, { backgroundColor: '#8B5CF6', marginTop: 22 }]} 
          onPress={handleConnect} 
          activeOpacity={0.9}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <FontAwesome name="send" size={16} color="#fff" style={{ marginRight: 10 }} />
            <Text style={styles.primaryBtnText}>{loading ? 'Sending...' : 'Connect with Therapist'}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={{ marginTop: 10, alignItems: 'center' }} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, paddingHorizontal: 20 },
  screenGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    zIndex: 0,
  },
  floatingBubbles: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  bubble: {
    position: 'absolute',
    borderRadius: 1000,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 0, minHeight: 64, position: 'relative', zIndex: 2 },
  backButton: { position: 'absolute', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', shadowColor: '#000', shadowOpacity: 0.03, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 1 },
  headerTitleLarge: { fontSize: 26, fontWeight: '800', marginLeft: 0, marginTop: 28, textAlign: 'center' },
  headerBlue: { color: '#FFFFFF' },
  headerOrange: { color: '#B8A8E6' },
  container: { paddingVertical: 28, zIndex: 2 },
  hint: { marginBottom: 12, color: '#FFFFFF' },
  connectCard: { backgroundColor: '#fff', borderRadius: 18, padding: 22, alignItems: 'center', marginBottom: 18, shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 12 }, shadowRadius: 24, elevation: 6, zIndex: 3 },
  qrCircle: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  cardSubtitle: { fontSize: 13 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 14, zIndex: 2 },
  line: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  dividerText: { marginHorizontal: 12, fontSize: 13, color: '#FFFFFF' },
  inputLabel: { fontSize: 14, marginBottom: 6, color: '#FFFFFF' },
  input: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#eee', shadowColor: '#000', shadowOpacity: 0.03, shadowOffset: { width: 0, height: 6 }, shadowRadius: 10, elevation: 2, zIndex: 3 },
  textArea: { borderWidth: 1, borderRadius: 10, padding: 12, height: 110, textAlignVertical: 'top', backgroundColor: '#fff', borderColor: '#eee', shadowColor: '#000', shadowOpacity: 0.03, shadowOffset: { width: 0, height: 6 }, shadowRadius: 8, elevation: 2, zIndex: 3 },
  primaryBtn: { paddingVertical: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 10 }, shadowRadius: 18, elevation: 4, zIndex: 3 },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  secondaryBtn: { paddingVertical: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 8 }, shadowRadius: 12, elevation: 3, zIndex: 3 },
  secondaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  skipText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
    
});
