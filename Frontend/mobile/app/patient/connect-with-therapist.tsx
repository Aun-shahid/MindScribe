import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, StatusBar, Animated, Modal, useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import PatientService from '../services/patient.service';
import { validateTherapistPinField } from '../utils/validation';
import { useAuthContext } from '../contexts/AuthContext';
import { router, useFocusEffect } from 'expo-router';
import StickyHeader from '../components/StickyHeader';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

// ── Shared card gradient (master spec) ───────────────────────────────────────
const CARD_GRAD: readonly [string, string, string] = [
  'rgba(255,179,107,0.11)',
  'rgba(167,139,250,0.08)',
  'rgba(52,41,73,0.72)',
];

export default function ConnectWithTherapist() {
  const { fetchProfile } = useAuthContext();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // ── Responsive tokens ─────────────────────────────────────────────────────
  const pageInset             = clamp(width * 0.05, 16, 22);
  const headerTopPadding      = insets.top + clamp(height * 0.017, 14, 22);
  const headerBottomPadding   = clamp(height * 0.004, 2, 6);
  const backButtonSize        = clamp(width * 0.085, 28, 34);
  const backIconSize          = clamp(width * 0.04, 13, 16);
  const titleFontSize         = clamp(width * 0.074, 24, 30);
  const titleMarginTop        = clamp(height * 0.05, 30, 46);
  const headerFadeDistance    = clamp(height * 0.022, 14, 20);

  const containerSidePadding  = pageInset;
  // Extra vertical gap after the header — bumped up for more breathing room
  const containerTopPadding   = clamp(height * 0.04, 28, 44);
  const cardRadius            = clamp(width * 0.05, 16, 22);
  const cardGap               = clamp(height * 0.022, 14, 20);
  const cardPadding           = clamp(width * 0.05, 16, 22);
  const qrCircleSize          = clamp(width * 0.245, 84, 112);
  const qrIconSize            = clamp(width * 0.09, 30, 40);
  const cardTitleSize         = clamp(width * 0.046, 16, 20);
  const cardSubtitleSize      = clamp(width * 0.034, 12, 14);
  const scanBadgeRadius       = clamp(width * 0.055, 16, 22);
  const scanBadgePaddingX     = clamp(width * 0.036, 12, 16);
  const scanBadgePaddingY     = clamp(height * 0.008, 5, 8);
  const scanBadgeTextSize     = clamp(width * 0.033, 12, 14);
  const qrSmallIconSize       = clamp(width * 0.037, 13, 15);

  const dividerVertical       = clamp(height * 0.022, 14, 22);
  const dividerTextSize       = clamp(width * 0.033, 12, 14);
  const dividerTextMargin     = clamp(width * 0.03, 10, 14);

  // Input card tokens (profile-edit style)
  const badgeSz               = clamp(width * 0.076, 26, 32);
  const badgeR                = clamp(width * 0.038, 13, 16);
  const iconSz                = clamp(width * 0.032, 11, 13);
  const labelSz               = clamp(width * 0.042, 15, 17);
  const subLblSz              = clamp(width * 0.029, 10, 11);
  const inputSz               = clamp(width * 0.042, 15, 17);

  const buttonRadius          = clamp(width * 0.055, 16, 22);
  const buttonPaddingY        = clamp(height * 0.013, 9, 13);
  const buttonIconSize        = clamp(width * 0.038, 13, 15);
  const buttonTextSize        = clamp(width * 0.036, 13, 15);
  const buttonMinHeight       = clamp(height * 0.055, 40, 50);
  const skipTextSize          = clamp(width * 0.033, 12, 14);
  const screenBottomSpacer    = clamp(height * 0.06, 28, 52);

  const estimatedTitleHeight  = Math.ceil(titleFontSize * 1.3);
  const headerHeight          = headerTopPadding + titleMarginTop + estimatedTitleHeight + headerBottomPadding;

  // Scanner tokens
  const scannerFrameSize      = clamp(Math.min(width, height) * 0.66, 220, 330);
  const scannerFrameRadius    = clamp(scannerFrameSize * 0.09, 18, 30);
  const scannerFrameBorder    = clamp(width * 0.008, 2, 4);
  const scannerTopPadding     = insets.top + clamp(height * 0.014, 12, 18);
  const scannerTopSidePadding = clamp(width * 0.05, 16, 24);
  const scannerTopBottomPad   = clamp(height * 0.017, 12, 18);
  const scannerCloseBtnSize   = clamp(width * 0.11, 40, 48);
  const scannerCloseIconSize  = clamp(width * 0.055, 20, 24);
  const scannerTitleSize      = clamp(width * 0.043, 15, 18);
  const scannerHintSize       = clamp(width * 0.036, 13, 15);
  const scannerHintLH         = Math.round(scannerHintSize * 1.4);
  const scannerBottomPadding  = clamp(height * 0.037, 24, 36);
  const rescanBtnRadius       = clamp(width * 0.032, 10, 14);
  const rescanBtnPaddingX     = clamp(width * 0.07, 24, 32);
  const rescanBtnPaddingY     = clamp(height * 0.016, 10, 14);
  const rescanTextSize        = clamp(width * 0.038, 14, 16);

  // ── Bubble sizes — master spec ────────────────────────────────────────────
  const bubbleLarge  = clamp(width * 0.74, 220, 310);
  const bubbleMedium = clamp(width * 0.52, 170, 230);
  const bubbleSmall  = clamp(width * 0.32,  96, 132);

  // ── State ─────────────────────────────────────────────────────────────────
  const [therapistPin, setTherapistPin]       = useState<string>('');
  const [connectMessage, setConnectMessage]   = useState<string>('');
  const [loading, setLoading]                 = useState(false);
  const [showScanner, setShowScanner]         = useState(false);
  const [scanned, setScanned]                 = useState(false);
  const [permission, requestPermission]       = useCameraPermissions();

  // ── Bubble refs ───────────────────────────────────────────────────────────
  const b1y = useRef(new Animated.Value(0)).current;
  const b1x = useRef(new Animated.Value(0)).current;
  const b2y = useRef(new Animated.Value(0)).current;
  const b2x = useRef(new Animated.Value(0)).current;
  const b3y = useRef(new Animated.Value(0)).current;
  const b3x = useRef(new Animated.Value(0)).current;
  const b4y = useRef(new Animated.Value(0)).current;
  const b4x = useRef(new Animated.Value(0)).current;
  const b5y = useRef(new Animated.Value(0)).current;
  const b5x = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;

  // ── useFocusEffect bubble animations (master spec) ────────────────────────
  useFocusEffect(
    useCallback(() => {
      [b1y,b1x,b2y,b2x,b3y,b3x,b4y,b4x,b5y,b5x].forEach((v) => v.setValue(0));

      const fly = (y: Animated.Value, x: Animated.Value, dY: number, dX: number) => {
        const c = Animated.parallel([
          Animated.loop(Animated.sequence([
            Animated.timing(y, { toValue: -50, duration: dY, useNativeDriver: true }),
            Animated.timing(y, { toValue:  50, duration: dY, useNativeDriver: true }),
          ])),
          Animated.loop(Animated.sequence([
            Animated.timing(x, { toValue:  30, duration: dX, useNativeDriver: true }),
            Animated.timing(x, { toValue: -30, duration: dX, useNativeDriver: true }),
          ])),
        ]);
        c.start();
        return c;
      };

      const anims = [
        fly(b1y, b1x, 8000,  7000),
        fly(b2y, b2x, 10000, 8000),
        fly(b3y, b3x, 9000,  7500),
        fly(b4y, b4x, 8500,  7200),
        fly(b5y, b5x, 9500,  8200),
      ];

      return () => anims.forEach((a) => a.stop());
    }, [b1x,b1y,b2x,b2y,b3x,b3y,b4x,b4y,b5x,b5y])
  );

  // ── Handlers ──────────────────────────────────────────────────────────────
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
    let pin = data;
    try {
      const parsed = JSON.parse(data);
      if (parsed.pin) pin = parsed.pin;
      else if (parsed.code) pin = parsed.code;
      else if (parsed.therapist_pin) pin = parsed.therapist_pin;
    } catch { /* raw string is the PIN */ }
    setTherapistPin(pin.trim());
  };

  const handleConnect = async () => {
    const pinValidation = validateTherapistPinField(therapistPin);
    if (!pinValidation.isValid) {
      Alert.alert('Invalid Code', pinValidation.message || 'Therapist code is invalid.');
      return;
    }
    try {
      setLoading(true);
      await PatientService.connectTherapist(therapistPin.trim(), connectMessage.trim());
      Alert.alert('Request Sent', 'Connection request created. Your therapist must approve it.');
      try { await fetchProfile(); } catch { /* ignore */ }
      router.back();
    } catch (err: any) {
      const respData = err?.response?.data;
      if (respData && (respData.detail === 'You are already connected to this therapist.' || (typeof respData === 'string' && respData.includes('already connected')))) {
        try { await fetchProfile(); } catch {}
        Alert.alert('Connected', 'You are already connected to this therapist.');
        router.back();
        return;
      }
      Alert.alert('Error', String(respData || err?.message || 'Failed to send connection request'));
    } finally {
      setLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.wrapper}>
      <StatusBar barStyle="light-content" backgroundColor="#342949" />

      {/* Background */}
      <LinearGradient
        colors={['#342949', '#2A1F3D', '#342949']}
        start={[0, 0]} end={[0, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Dual-colour floating bubbles — master spec ──────────────────────── */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {/* 1 — odd warm purple 0.25 — top-right */}
        <Animated.View style={[styles.bubble, {
          width: bubbleMedium, height: bubbleMedium,
          top: clamp(height * 0.06, 34, 62),
          right: -clamp(width * 0.12, 36, 56),
          backgroundColor: 'rgba(167,139,250,0.25)',
          transform: [{ translateY: b1y }, { translateX: b1x }],
        }]} />
        {/* 2 — even cool 0.20 — top-left large */}
        <Animated.View style={[styles.bubble, {
          width: bubbleLarge, height: bubbleLarge,
          top: -clamp(height * 0.12, 80, 120),
          left: -clamp(width * 0.18, 56, 88),
          backgroundColor: 'rgba(184,168,230,0.20)',
          transform: [{ translateY: b2y }, { translateX: b2x }],
        }]} />
        {/* 3 — odd warm 0.22 — mid-left */}
        <Animated.View style={[styles.bubble, {
          width: clamp(width * 0.4, 120, 170), height: clamp(width * 0.4, 120, 170),
          bottom: clamp(height * 0.24, 160, 230),
          left: -clamp(width * 0.08, 20, 36),
          backgroundColor: 'rgba(167,139,250,0.22)',
          transform: [{ translateY: b3y }, { translateX: b3x }],
        }]} />
        {/* 4 — even cool 0.18 — bottom-right */}
        <Animated.View style={[styles.bubble, {
          width: clamp(width * 0.48, 150, 200), height: clamp(width * 0.48, 150, 200),
          bottom: clamp(height * 0.12, 80, 120),
          right: -clamp(width * 0.14, 42, 70),
          backgroundColor: 'rgba(184,168,230,0.18)',
          transform: [{ translateY: b4y }, { translateX: b4x }],
        }]} />
        {/* 5 — odd warm 0.15 — mid-right */}
        <Animated.View style={[styles.bubble, {
          width: bubbleSmall, height: bubbleSmall,
          top: '40%',
          right: clamp(width * 0.05, 14, 24),
          backgroundColor: 'rgba(167,139,250,0.15)',
          transform: [{ translateY: b5y }, { translateX: b5x }],
        }]} />
      </View>

      {/* Sticky header */}
      <StickyHeader
        scrollY={scrollY}
        firstWord="Connect with"
        secondWord="Therapist"
        onBackPress={() => router.back()}
      />

      {/* Fading large header */}
      <Animated.View style={[styles.headerContainer, {
        paddingTop: headerTopPadding,
        paddingHorizontal: pageInset,
        paddingBottom: headerBottomPadding,
        opacity: scrollY.interpolate({
          inputRange: [0, headerFadeDistance * 0.45, headerFadeDistance],
          outputRange: [1, 0, 0],
          extrapolate: 'clamp',
        }),
        transform: [{
          translateY: scrollY.interpolate({
            inputRange: [0, headerFadeDistance],
            outputRange: [0, -10],
            extrapolate: 'clamp',
          }),
        }],
      }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backButton, {
            left: pageInset,
            top: headerTopPadding - clamp(height * 0.006, 3, 6),
            width: backButtonSize,
            height: backButtonSize,
            borderRadius: backButtonSize / 2,
          }]}
        >
          <FontAwesome name="chevron-left" size={backIconSize} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { fontSize: titleFontSize, marginTop: titleMarginTop }]}>
          <Text style={styles.headerWhite}>Connect with </Text>
          <Text style={styles.headerPurple}>Therapist</Text>
        </Text>
      </Animated.View>

      {/* Scrollable content */}
      <Animated.ScrollView
        contentContainerStyle={{
          paddingHorizontal: containerSidePadding,
          paddingTop: headerHeight + containerTopPadding,
          paddingBottom: screenBottomSpacer,
        }}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── QR card — UNCHANGED ── */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={openScanner}
          style={[styles.connectCard, {
            borderRadius: cardRadius,
            padding: cardPadding,
            marginBottom: cardGap,
          }]}
        >
          <View style={[styles.qrCircle, {
            width: qrCircleSize, height: qrCircleSize,
            borderRadius: qrCircleSize / 2,
          }]}>
            <FontAwesome name="camera" size={qrIconSize} color="#342949" />
          </View>
          <Text style={[styles.cardTitle, { marginTop: clamp(height * 0.018, 10, 16), fontSize: cardTitleSize }]}>
            Scan QR Code
          </Text>
          <Text style={[styles.cardSubtitle, { marginTop: clamp(height * 0.007, 4, 8), fontSize: cardSubtitleSize }]}>
            Tap to open camera and scan
          </Text>
          <View style={[styles.scanBadge, {
            borderRadius: scanBadgeRadius,
            paddingHorizontal: scanBadgePaddingX,
            paddingVertical: scanBadgePaddingY,
            marginTop: clamp(height * 0.018, 10, 16),
          }]}>
            <FontAwesome name="qrcode" size={qrSmallIconSize} color="#8B5CF6" style={{ marginRight: clamp(width * 0.015, 5, 7) }} />
            <Text style={[styles.scanBadgeText, { fontSize: scanBadgeTextSize }]}>Auto-fills PIN</Text>
          </View>
        </TouchableOpacity>

        {/* ── Divider ── */}
        <View style={[styles.dividerRow, { marginVertical: dividerVertical }]}>
          <View style={styles.line} />
          <Text style={[styles.dividerText, { marginHorizontal: dividerTextMargin, fontSize: dividerTextSize }]}>
            or enter manually
          </Text>
          <View style={styles.line} />
        </View>

        {/* ── Therapist Code — profile-edit card style ── */}
        <View style={{ marginBottom: cardGap }}>
          <View style={[styles.inputCard, { borderRadius: cardRadius }]}>
            <LinearGradient
              colors={CARD_GRAD}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={[StyleSheet.absoluteFill, { borderRadius: cardRadius }]}
              pointerEvents="none"
            />
            {/* Purple accent strip */}
            <View style={{
              height: 3, backgroundColor: '#A78BFA',
              borderTopLeftRadius: cardRadius, borderTopRightRadius: cardRadius,
            }} />

            <View style={{ padding: cardPadding }}>
              {/* Icon badge + label row */}
              <View style={{
                flexDirection: 'row', alignItems: 'center',
                gap: clamp(width * 0.028, 10, 13),
                marginBottom: clamp(height * 0.018, 12, 16),
              }}>
                <View style={{
                  width: badgeSz, height: badgeSz, borderRadius: badgeR,
                  alignItems: 'center', justifyContent: 'center',
                  backgroundColor: 'rgba(167,139,250,0.18)',
                  borderWidth: 1, borderColor: 'rgba(167,139,250,0.45)',
                }}>
                  <FontAwesome name="key" size={iconSz} color="#A78BFA" />
                </View>
                <View>
                  <Text style={{ color: '#FFFFFF', fontSize: labelSz, fontWeight: '800', letterSpacing: 0.3 }}>
                    Therapist Code
                  </Text>
                  <Text style={{ color: '#9D8EC7', fontSize: subLblSz, letterSpacing: 1.2, marginTop: 1 }}>
                    REQUIRED
                  </Text>
                </View>
              </View>

              {/* Underline input */}
              <View style={{ borderBottomWidth: 1.5, borderBottomColor: 'rgba(167,139,250,0.45)', paddingBottom: 4 }}>
                <TextInput
                  value={therapistPin}
                  onChangeText={setTherapistPin}
                  placeholder="Enter code"
                  placeholderTextColor="rgba(184,168,230,0.45)"
                  style={{
                    color: '#FFFFFF',
                    fontSize: inputSz,
                    fontWeight: '600',
                    letterSpacing: 0.2,
                    paddingVertical: clamp(height * 0.009, 6, 9),
                    paddingHorizontal: 2,
                    backgroundColor: 'transparent',
                    height: clamp(height * 0.056, 38, 46),
                  }}
                  autoCapitalize="none"
                />
              </View>
            </View>
          </View>
        </View>

        {/* ── Message — profile-edit card style (orange strip) ── */}
        <View style={{ marginBottom: cardGap }}>
          <View style={[styles.inputCard, { borderRadius: cardRadius }]}>
            <LinearGradient
              colors={CARD_GRAD}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={[StyleSheet.absoluteFill, { borderRadius: cardRadius }]}
              pointerEvents="none"
            />
            {/* Orange accent strip */}
            <View style={{
              height: 3, backgroundColor: '#FFB36B',
              borderTopLeftRadius: cardRadius, borderTopRightRadius: cardRadius,
            }} />

            <View style={{ padding: cardPadding }}>
              {/* Icon badge + label row */}
              <View style={{
                flexDirection: 'row', alignItems: 'center',
                gap: clamp(width * 0.028, 10, 13),
                marginBottom: clamp(height * 0.018, 12, 16),
              }}>
                <View style={{
                  width: badgeSz, height: badgeSz, borderRadius: badgeR,
                  alignItems: 'center', justifyContent: 'center',
                  backgroundColor: 'rgba(255,179,107,0.15)',
                  borderWidth: 1, borderColor: 'rgba(255,179,107,0.4)',
                }}>
                  <FontAwesome name="edit" size={iconSz} color="#FFB36B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#FFFFFF', fontSize: labelSz, fontWeight: '800', letterSpacing: 0.3 }}>
                    Message
                  </Text>
                  <Text style={{ color: '#C9A97E', fontSize: subLblSz, letterSpacing: 0.8, marginTop: 1 }}>
                    OPTIONAL — introduce yourself
                  </Text>
                </View>
              </View>

              {/* Thin divider (CreateJournal style) */}
              <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginBottom: 4 }} />

              {/* Open textarea */}
              <TextInput
                value={connectMessage}
                onChangeText={setConnectMessage}
                placeholder="Introduce yourself to your therapist..."
                placeholderTextColor="rgba(184,168,230,0.45)"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                style={{
                  color: '#FFFFFF',
                  fontSize: clamp(width * 0.039, 14, 16),
                  fontWeight: '400',
                  letterSpacing: 0.15,
                  paddingVertical: clamp(height * 0.016, 10, 14),
                  paddingHorizontal: 2,
                  backgroundColor: 'transparent',
                  minHeight: clamp(height * 0.145, 100, 130),
                  lineHeight: clamp(width * 0.039, 14, 16) * 1.55,
                }}
              />
            </View>
          </View>
        </View>

        {/* ── Connect button ── */}
        <TouchableOpacity
          style={[styles.primaryBtn, {
            marginTop: clamp(height * 0.01, 6, 10),
            paddingVertical: buttonPaddingY,
            borderRadius: buttonRadius,
          }, loading && { opacity: 0.7 }]}
          onPress={handleConnect}
          activeOpacity={0.9}
          disabled={loading}
        >
          <LinearGradient
            colors={['#8B5CF6', '#A78BFA']}
            start={[0, 0]} end={[1, 1]}
            style={[styles.primaryBtnGradient, { minHeight: buttonMinHeight, borderRadius: buttonRadius }]}
          >
            <View style={styles.primaryBtnInner}>
              <FontAwesome name="send" size={buttonIconSize} color="#fff" style={{ marginRight: clamp(width * 0.026, 8, 12) }} />
              <Text style={[styles.primaryBtnText, { fontSize: buttonTextSize }]}>
                {loading ? 'Sending...' : 'Connect with Therapist'}
              </Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ marginTop: clamp(height * 0.016, 10, 14), alignItems: 'center', paddingVertical: clamp(height * 0.01, 6, 10) }}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Text style={[styles.skipText, { fontSize: skipTextSize }]}>Skip for now</Text>
        </TouchableOpacity>

      </Animated.ScrollView>

      {/* ── QR Scanner Modal — UNCHANGED ── */}
      <Modal visible={showScanner} animationType="slide" onRequestClose={() => setShowScanner(false)}>
        <View style={styles.scannerContainer}>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          />
          <View style={styles.scannerOverlay} pointerEvents="none">
            <View style={[styles.scannerFrame, {
              width: scannerFrameSize, height: scannerFrameSize,
              borderRadius: scannerFrameRadius, borderWidth: scannerFrameBorder,
            }]} />
          </View>
          <View style={[styles.scannerTopBar, {
            paddingTop: scannerTopPadding,
            paddingHorizontal: scannerTopSidePadding,
            paddingBottom: scannerTopBottomPad,
          }]}>
            <TouchableOpacity onPress={() => setShowScanner(false)} style={[styles.scannerCloseBtn, { width: scannerCloseBtnSize, height: scannerCloseBtnSize, borderRadius: scannerCloseBtnSize / 2 }]}>
              <FontAwesome name="times" size={scannerCloseIconSize} color="#fff" />
            </TouchableOpacity>
            <Text style={[styles.scannerTitle, { fontSize: scannerTitleSize }]}>Scan Therapist QR Code</Text>
            <View style={{ width: scannerCloseBtnSize }} />
          </View>
          <View style={[styles.scannerBottomBar, { padding: scannerBottomPadding }]}>
            <Text style={[styles.scannerHint, { fontSize: scannerHintSize, lineHeight: scannerHintLH }]}>
              Point your camera at the QR code shown by your therapist
            </Text>
            {scanned && (
              <TouchableOpacity style={[styles.rescanBtn, { borderRadius: rescanBtnRadius, paddingHorizontal: rescanBtnPaddingX, paddingVertical: rescanBtnPaddingY }]} onPress={() => setScanned(false)}>
                <Text style={[styles.rescanText, { fontSize: rescanTextSize }]}>Tap to Scan Again</Text>
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
  bubble:  { position: 'absolute', borderRadius: 9999 },

  headerContainer: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
  },
  backButton: {
    position: 'absolute',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
  },
  headerTitle:  { fontWeight: '800', textAlign: 'center' },
  headerWhite:  { color: '#FFFFFF' },
  headerPurple: { color: '#B8A8E6' },

  // ── QR card (unchanged) ───────────────────────────────────────────────────
  connectCard: {
    backgroundColor: 'rgba(184,168,230,0.18)',
    alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(233,225,255,0.55)',
    shadowColor: '#000', shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 12 }, shadowRadius: 24, elevation: 6,
  },
  qrCircle: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#B8A8E6',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)',
  },
  cardTitle:     { color: '#FFFFFF', fontWeight: '800' },
  cardSubtitle:  { color: '#E4DFFF' },
  scanBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(139,92,246,0.1)',
    borderColor: 'rgba(139,92,246,0.3)', borderWidth: 1,
  },
  scanBadgeText: { color: '#8B5CF6', fontWeight: '700' },

  // ── Divider ───────────────────────────────────────────────────────────────
  dividerRow:  { flexDirection: 'row', alignItems: 'center' },
  line:        { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  dividerText: { color: '#B8A8E6' },

  // ── Input cards (profile-edit style) ─────────────────────────────────────
  inputCard: {
    overflow: 'hidden',
    backgroundColor: '#3F3752',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)',
    shadowColor: '#120A24', shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 8 }, shadowRadius: 18, elevation: 7,
  },

  // ── Connect button ────────────────────────────────────────────────────────
  primaryBtn: {
    borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#000', shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 10 }, shadowRadius: 18, elevation: 4,
    overflow: 'hidden',
  },
  primaryBtnGradient: { width: '100%', paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  primaryBtnInner:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  primaryBtnText:     { color: '#fff', fontWeight: '800' },
  skipText:           { fontWeight: '700', color: '#B8A8E6' },

  // ── Scanner ───────────────────────────────────────────────────────────────
  scannerContainer:  { flex: 1, backgroundColor: '#000' },
  scannerOverlay:    { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  scannerFrame:      { borderColor: '#A78BFA', backgroundColor: 'transparent' },
  scannerTopBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  scannerCloseBtn: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.15)' },
  scannerTitle:    { color: '#fff', fontWeight: '700', flex: 1, textAlign: 'center' },
  scannerBottomBar:{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center' },
  scannerHint:     { color: '#ccc', textAlign: 'center' },
  rescanBtn:       { marginTop: 14, backgroundColor: '#A78BFA' },
  rescanText:      { color: '#fff', fontWeight: '700' },
});
