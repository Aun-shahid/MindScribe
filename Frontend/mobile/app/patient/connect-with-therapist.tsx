import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, StatusBar, Animated, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useTheme } from '../contexts/ThemeContext';
import PatientService from '../services/patient.service';
import { useAuthContext } from '../contexts/AuthContext';
import { router } from 'expo-router';
import StickyHeader from '../components/StickyHeader';
import { CameraView, useCameraPermissions } from 'expo-camera';

export default function ConnectWithTherapist() {
  const { themeStyle, colors } = useTheme();
  const { fetchProfile } = useAuthContext();

  const [therapistPin, setTherapistPin] = useState<string>('');
  const [connectMessage, setConnectMessage] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // QR scanner state
  const [showScanner, setShowScanner] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  // Scroll animation for fading header
  const scrollY = useRef(new Animated.Value(0)).current;

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

  const openScanner = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Camera Permission', 'Camera access is needed to scan the QR code. Please enable it in your device settings.');
        return;
      }
    }
    setScanned(false);
    setShowScanner(true);
  };

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    setScanned(true);
    setShowScanner(false);
    // Support JSON-encoded QR (e.g. { pin: '...' }) or raw string
    let pin = data;
    try {
      const parsed = JSON.parse(data);
      if (parsed.pin) pin = parsed.pin;
      else if (parsed.code) pin = parsed.code;
      else if (parsed.therapist_pin) pin = parsed.therapist_pin;
    } catch {
      // raw string is the PIN
    }
    setTherapistPin(pin.trim());
  };

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
    <View style={styles.wrapper}>
      <StatusBar barStyle="light-content" backgroundColor="#342949" />

      {/* Gradient background */}
      <LinearGradient
        colors={['#342949', '#2a1f3d', '#342949']}
        start={[0, 0]}
        end={[0, 1]}
        style={styles.screenGradient}
        pointerEvents="none"
      />

      {/* Floating bubble decorations */}
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

      {/* Sticky header - appears when scrolled */}
      <StickyHeader
        scrollY={scrollY}
        firstWord="Connect with"
        secondWord="Therapist"
        onBackPress={() => router.back()}
      />

      {/* Animated fading header */}
      <Animated.View style={[styles.headerContainer, {
        opacity: scrollY.interpolate({
          inputRange: [0, 100, 150],
          outputRange: [1, 0.5, 0],
          extrapolate: 'clamp',
        })
      }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome name="chevron-left" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          <Text style={styles.headerWhite}>Connect with </Text>
          <Text style={styles.headerPurple}>Therapist</Text>
        </Text>
      </Animated.View>

      <Animated.ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        <Text style={styles.hint}>Scan the QR code provided by your therapist or enter the code manually</Text>

        {/* Tappable QR card - opens real camera */}
        <TouchableOpacity activeOpacity={0.85} onPress={openScanner} style={styles.connectCard}>
          <LinearGradient
            colors={['#FF5AA8', '#FFB36B']}
            start={[0, 0]}
            end={[1, 1]}
            style={styles.qrCircle}
          >
            <FontAwesome name="camera" size={36} color="#fff" />
          </LinearGradient>
          <Text style={[styles.cardTitle, { color: '#000', marginTop: 14 }]}>Scan QR Code</Text>
          <Text style={[styles.cardSubtitle, { color: '#666', marginTop: 6 }]}>Tap to open camera and scan</Text>
          <View style={styles.scanBadge}>
            <FontAwesome name="qrcode" size={14} color="#8B5CF6" style={{ marginRight: 6 }} />
            <Text style={styles.scanBadgeText}>Auto-fills PIN</Text>
          </View>
        </TouchableOpacity>

        <View style={[styles.dividerRow, { marginVertical: 20 }]}>
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
          style={[styles.primaryBtn, { backgroundColor: '#8B5CF6', marginTop: 22 }, loading && { opacity: 0.7 }]}
          onPress={handleConnect}
          activeOpacity={0.9}
          disabled={loading}
        >
          <FontAwesome name="send" size={16} color="#fff" style={{ marginRight: 10 }} />
          <Text style={styles.primaryBtnText}>{loading ? 'Sending...' : 'Connect with Therapist'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={{ marginTop: 10, alignItems: 'center' }} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </Animated.ScrollView>

      {/* QR Scanner Modal */}
      <Modal visible={showScanner} animationType="slide" onRequestClose={() => setShowScanner(false)}>
        <View style={styles.scannerContainer}>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          />

          {/* Corner frame overlay */}
          <View style={styles.scannerOverlay} pointerEvents="none">
            <View style={styles.scannerFrame} />
          </View>

          {/* Top bar */}
          <View style={styles.scannerTopBar}>
            <TouchableOpacity onPress={() => setShowScanner(false)} style={styles.scannerCloseBtn}>
              <FontAwesome name="times" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.scannerTitle}>Scan Therapist QR Code</Text>
            <View style={{ width: 44 }} />
          </View>

          {/* Bottom bar */}
          <View style={styles.scannerBottomBar}>
            <Text style={styles.scannerHint}>Point your camera at the QR code shown by your therapist</Text>
            {scanned && (
              <TouchableOpacity style={styles.rescanBtn} onPress={() => setScanned(false)}>
                <Text style={styles.rescanText}>Tap to Scan Again</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#342949' },
  screenGradient: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
  },
  floatingBubbles: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
  },
  bubble: {
    position: 'absolute',
    borderRadius: 1000,
  },

  // Animated fading header
  headerContainer: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 22,
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: 52,
    padding: 8,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 20,
  },
  headerWhite: { color: '#FFFFFF' },
  headerPurple: { color: '#B8A8E6' },

  // Scroll content
  container: { paddingHorizontal: 20, paddingTop: 10 },
  hint: { marginBottom: 16, color: '#B8A8E6', fontSize: 14, textAlign: 'center', lineHeight: 20 },

  // QR card
  connectCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 18,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
    elevation: 6,
  },
  qrCircle: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 18, fontWeight: '800' },
  cardSubtitle: { fontSize: 13 },
  scanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderColor: 'rgba(139, 92, 246, 0.3)',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginTop: 14,
  },
  scanBadgeText: { color: '#8B5CF6', fontWeight: '700', fontSize: 13 },

  // Divider
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 14 },
  line: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  dividerText: { marginHorizontal: 12, fontSize: 13, color: '#B8A8E6' },

  // Inputs
  inputLabel: { fontSize: 14, marginBottom: 6, color: '#FFFFFF', fontWeight: '600' },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
    fontSize: 15,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 2,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    height: 110,
    textAlignVertical: 'top',
    fontSize: 15,
    backgroundColor: '#fff',
    borderColor: '#eee',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 8,
    elevation: 2,
  },

  // Connect button
  primaryBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
    elevation: 4,
  },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  skipText: { fontSize: 13, fontWeight: '700', color: '#B8A8E6' },

  // Scanner Modal
  scannerContainer: { flex: 1, backgroundColor: '#000' },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerFrame: {
    width: 260,
    height: 260,
    borderWidth: 3,
    borderColor: '#A78BFA',
    borderRadius: 24,
    backgroundColor: 'transparent',
  },
  scannerTopBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    paddingTop: 54,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scannerCloseBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 22,
  },
  scannerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  scannerBottomBar: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    padding: 30,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
  },
  scannerHint: { color: '#ccc', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  rescanBtn: {
    marginTop: 16,
    backgroundColor: '#A78BFA',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
  },
  rescanText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
