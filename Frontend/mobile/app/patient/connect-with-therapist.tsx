import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, StatusBar, Animated, Modal, useWindowDimensions, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PatientService from '../services/patient.service';
import { validateTherapistPinField } from '../utils/validation';
import { useAuthContext } from '../contexts/AuthContext';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import StickyHeader from '../components/StickyHeader';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

const CARD_GRAD: readonly [string, string, string] = [
  'rgba(255,179,107,0.11)',
  'rgba(167,139,250,0.08)',
  'rgba(52,41,73,0.72)',
];

type ConnectionRequestItem = {
  id: string;
  status: 'pending' | 'accepted' | 'merged' | 'rejected' | 'expired' | string;
  message?: string;
  rejection_reason?: string | null;
  created_at?: string;
  updated_at?: string;
  responded_at?: string | null;
  therapist?: {
    id?: string;
    name?: string;
    specialization?: string;
    clinic_name?: string;
  };
};

const CONNECTION_REQUESTS_STORAGE_KEY = 'patient_connection_requests_v1';

const REQUEST_STATUS_META: Record<string, { label: string; bg: string; border: string; text: string }> = {
  pending: {
    label: 'Pending',
    bg: 'rgba(255,179,107,0.13)',
    border: 'rgba(255,179,107,0.42)',
    text: '#FFB36B',
  },
  accepted: {
    label: 'Accepted',
    bg: 'rgba(34,197,94,0.14)',
    border: 'rgba(34,197,94,0.42)',
    text: '#22C55E',
  },
  merged: {
    label: 'Accepted',
    bg: 'rgba(34,197,94,0.14)',
    border: 'rgba(34,197,94,0.42)',
    text: '#22C55E',
  },
  rejected: {
    label: 'Rejected',
    bg: 'rgba(239,68,68,0.15)',
    border: 'rgba(239,68,68,0.42)',
    text: '#EF4444',
  },
  expired: {
    label: 'Expired',
    bg: 'rgba(148,163,184,0.14)',
    border: 'rgba(148,163,184,0.36)',
    text: '#94A3B8',
  },
};

const formatDate = (iso?: string | null) => {
  if (!iso) return 'N/A';
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return 'N/A';
  return dt.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const normalizeName = (value?: string | null) => (value || '').trim().toLowerCase();

const flattenErrorMessages = (payload: any): string[] => {
  if (!payload) return [];
  if (typeof payload === 'string') return [payload];
  if (Array.isArray(payload)) {
    return payload.flatMap((item) => flattenErrorMessages(item));
  }
  if (typeof payload === 'object') {
    return Object.values(payload).flatMap((value) => flattenErrorMessages(value));
  }
  return [];
};

const parseConnectionError = (error: any): { title: string; message: string; kind: string } => {
  const payload = error?.response?.data;
  const detail = typeof payload?.detail === 'string' ? payload.detail : '';
  const combined = [detail, ...flattenErrorMessages(payload)].join(' ').toLowerCase();

  if (combined.includes('already connected')) {
    return {
      title: 'Already Connected',
      message: 'You are already connected to this therapist.',
      kind: 'already_connected',
    };
  }

  if (combined.includes('pending connection request') || combined.includes('already have a pending')) {
    return {
      title: 'Request Pending',
      message: 'You already have a pending request for this therapist. Please wait for their response.',
      kind: 'pending',
    };
  }

  if (combined.includes('invalid therapist pin') || combined.includes('therapist_pin')) {
    return {
      title: 'Invalid Code',
      message: 'No matching therapist found for this code. Please check and try again.',
      kind: 'invalid_pin',
    };
  }

  if (combined.includes('not accepting new patients')) {
    return {
      title: 'Unavailable',
      message: 'This therapist is not accepting new connection requests right now.',
      kind: 'therapist_unavailable',
    };
  }

  if (!error?.response) {
    return {
      title: 'Connection Error',
      message: 'Unable to connect right now. Please check your internet and try again.',
      kind: 'network',
    };
  }

  return {
    title: 'Error',
    message: 'Unable to send connection request. Please try again.',
    kind: 'generic',
  };
};

export default function ConnectWithTherapist() {
  const { fetchProfile } = useAuthContext();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // ── Read where we came from, persist in ref so tab-cache doesn't lose it ──
  const params = useLocalSearchParams<{ from?: string }>();
  const fromRaw = params.from;
  const fromParam = Array.isArray(fromRaw) ? fromRaw[0] : fromRaw;
  const fromRef = useRef(fromParam);
  useFocusEffect(useCallback(() => { if (fromParam) fromRef.current = fromParam; }, [fromParam]));
  const goBack = () => {
    if (fromRef.current === 'dashboard') {
      router.push('./dashboard' as any);
    } else {
      router.push('./actions' as any);
    }
  };

  const pageInset             = clamp(width * 0.05, 16, 22);
  const headerTopPadding      = insets.top + clamp(height * 0.017, 14, 22);
  const headerBottomPadding   = clamp(height * 0.004, 2, 6);
  const backButtonSize        = clamp(width * 0.085, 28, 34);
  const backIconSize          = clamp(width * 0.04, 13, 16);
  const titleFontSize         = clamp(width * 0.074, 24, 30);
  const titleMarginTop        = clamp(height * 0.05, 30, 46);
  const headerFadeDistance    = clamp(height * 0.022, 14, 20);

  const containerSidePadding  = pageInset;
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

  const bubbleLarge  = clamp(width * 0.74, 220, 310);
  const bubbleMedium = clamp(width * 0.52, 170, 230);
  const bubbleSmall  = clamp(width * 0.32,  96, 132);

  const [therapistPin, setTherapistPin]     = useState<string>('');
  const [connectMessage, setConnectMessage] = useState<string>('');
  const [loading, setLoading]               = useState(false);
  const [showScanner, setShowScanner]       = useState(false);
  const [scanned, setScanned]               = useState(false);
  const [permission, requestPermission]     = useCameraPermissions();
  const [showRequests, setShowRequests]     = useState(false);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [connectionRequests, setConnectionRequests] = useState<ConnectionRequestItem[]>([]);
  const [patientProfile, setPatientProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [showConnectAnotherForm, setShowConnectAnotherForm] = useState(false);

  const sheetY = useRef(new Animated.Value(height)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

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

  const readStoredRequests = useCallback(async (): Promise<ConnectionRequestItem[]> => {
    try {
      const raw = await AsyncStorage.getItem(CONNECTION_REQUESTS_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, []);

  const writeStoredRequests = useCallback(async (items: ConnectionRequestItem[]) => {
    try {
      await AsyncStorage.setItem(CONNECTION_REQUESTS_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore local storage write failures
    }
  }, []);

  const loadConnectionRequests = useCallback(async () => {
    try {
      setRequestsLoading(true);
      const [stored, profile, notifications] = await Promise.all([
        readStoredRequests(),
        PatientService.getPatientProfile().catch(() => null),
        PatientService.getNotifications({}).catch(() => []),
      ]);

      const requests = [...stored];
      const activeTherapistName = normalizeName(profile?.therapist_info?.name);
      const connectedAt = profile?.connected_at;

      if (profile) {
        setPatientProfile((prev: any) => profile || prev);
      }

      if (activeTherapistName) {
        const pendingForConnected = requests.find(
          (item) => item.status === 'pending' && normalizeName(item.therapist?.name) === activeTherapistName
        );
        if (pendingForConnected) {
          pendingForConnected.status = 'accepted';
          pendingForConnected.updated_at = connectedAt || new Date().toISOString();
          pendingForConnected.responded_at = connectedAt || new Date().toISOString();
        }
      }

      const notificationList = Array.isArray(notifications) ? notifications : [];

      notificationList
        .filter((n: any) => typeof n?.title === 'string' && n.title.toLowerCase().includes('connection request accepted'))
        .forEach((n: any) => {
          const msg = String(n?.message || '');
          const match = msg.match(/Dr\.\s([^\.]+?)\saccepted/i);
          const acceptedName = normalizeName(match?.[1]);
          const sentAt = n?.sent_at || new Date().toISOString();
          const sentAtMs = new Date(sentAt).getTime();
          if (!acceptedName) return;
          const pending = requests.find(
            (item) => item.status === 'pending' && normalizeName(item.therapist?.name).includes(acceptedName)
          );
          if (pending) {
            const requestCreatedMs = new Date(pending.created_at || 0).getTime();
            if (!Number.isFinite(sentAtMs) || !Number.isFinite(requestCreatedMs) || sentAtMs < requestCreatedMs) return;
            pending.status = 'accepted';
            pending.updated_at = sentAt;
            pending.responded_at = sentAt;
          }
        });

      notificationList
        .filter((n: any) => {
          const title = String(n?.title || '').toLowerCase();
          const message = String(n?.message || '').toLowerCase();
          return title.includes('connection request rejected') || message.includes('declined by the therapist');
        })
        .forEach((n: any) => {
          const sentAt = n?.sent_at || new Date().toISOString();
          const sentAtMs = new Date(sentAt).getTime();
          const pendingRequests = requests.filter((item) => item.status === 'pending');
          if (pendingRequests.length === 1) {
            const requestCreatedMs = new Date(pendingRequests[0].created_at || 0).getTime();
            if (!Number.isFinite(sentAtMs) || !Number.isFinite(requestCreatedMs) || sentAtMs < requestCreatedMs) return;
            pendingRequests[0].status = 'rejected';
            pendingRequests[0].updated_at = sentAt;
            pendingRequests[0].responded_at = sentAt;
          }
        });

      requests.sort((a, b) => {
        const aTime = new Date(a.created_at || 0).getTime();
        const bTime = new Date(b.created_at || 0).getTime();
        return bTime - aTime;
      });

      await writeStoredRequests(requests);
      setConnectionRequests(requests);
    } catch (err) {
      console.error('Failed to load connection requests:', err);
      setConnectionRequests([]);
    } finally {
      setRequestsLoading(false);
    }
  }, [readStoredRequests, writeStoredRequests]);

  const loadPatientProfile = useCallback(async () => {
    try {
      setProfileLoading(true);
      const profile = await PatientService.getPatientProfile();
      setPatientProfile(profile);
    } catch (err) {
      console.error('Failed to load patient profile:', err);
      // Keep last known profile to avoid flickering back to disconnected UI on transient failures.
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadConnectionRequests();
      loadPatientProfile();

      const intervalId = setInterval(() => {
        loadPatientProfile();
      }, 15000);

      return () => clearInterval(intervalId);
    }, [loadConnectionRequests, loadPatientProfile])
  );

  useEffect(() => {
    if (showRequests) {
      Animated.parallel([
        Animated.timing(overlayOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(sheetY, { toValue: 0, tension: 72, friction: 12, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(overlayOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(sheetY, { toValue: height, duration: 240, useNativeDriver: true }),
      ]).start();
    }
  }, [height, overlayOpacity, sheetY, showRequests]);

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
      const response = await PatientService.connectTherapist(therapistPin.trim(), connectMessage.trim());
      const request = response?.request;
      const therapistInfo = request?.therapist_info;
      const createdAt = request?.created_at || new Date().toISOString();
      const nextItem: ConnectionRequestItem = {
        id: String(request?.id || `${Date.now()}-${therapistPin.trim()}`),
        status: String(request?.status || 'pending'),
        message: String(request?.message || connectMessage.trim() || ''),
        created_at: createdAt,
        updated_at: request?.updated_at || createdAt,
        responded_at: request?.responded_at || null,
        therapist: {
          id: therapistInfo?.id ? String(therapistInfo.id) : undefined,
          name: therapistInfo?.name || 'Therapist',
          specialization: therapistInfo?.specialization || undefined,
          clinic_name: therapistInfo?.clinic_name || undefined,
        },
      };

      const existing = await readStoredRequests();
      const deduped = [nextItem, ...existing.filter((item) => item.id !== nextItem.id)];
      await writeStoredRequests(deduped);
      await loadConnectionRequests();
      await loadPatientProfile();
      setShowConnectAnotherForm(false);
      setTherapistPin('');
      setConnectMessage('');
      Alert.alert('Request Sent', 'Connection request created. Your therapist must approve it.');
      try { await fetchProfile(); } catch { /* ignore */ }
    } catch (err: any) {
      const parsed = parseConnectionError(err);
      if (parsed.kind === 'already_connected') {
        try { await fetchProfile(); } catch {}
        setTherapistPin('');
        setConnectMessage('');
        Alert.alert(parsed.title, parsed.message);
        return;
      }
      Alert.alert(parsed.title, parsed.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = useCallback(async () => {
    if (disconnecting) return;

    Alert.alert(
      'Disconnect therapist?',
      'This will remove your current therapist connection and notify them.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              setDisconnecting(true);
              await PatientService.disconnectTherapist();
              await Promise.all([fetchProfile(), loadPatientProfile(), loadConnectionRequests()]);
              Alert.alert('Disconnected', 'You are no longer connected to a therapist.');
            } catch (err: any) {
              const parsed = parseConnectionError(err);
              Alert.alert(parsed.title, parsed.message);
            } finally {
              setDisconnecting(false);
            }
          },
        },
      ]
    );
  }, [disconnecting, fetchProfile, loadConnectionRequests, loadPatientProfile]);

  const pendingCount = connectionRequests.filter((req) => req.status === 'pending').length;

  const acceptedRequest = connectionRequests.find((req) => req.status === 'accepted' || req.status === 'merged');

  const connectedTherapistName = String(patientProfile?.therapist_info?.name || '').trim();
  const connectedTherapistId = String(patientProfile?.therapist_info?.id || '').trim();
  const connectedTherapistSpecialization = String(patientProfile?.therapist_info?.specialization || '').trim();
  const connectedTherapistClinic = String(patientProfile?.therapist_info?.clinic_name || '').trim();
  const acceptedRequestTherapistName = String(acceptedRequest?.therapist?.name || '').trim();
  const acceptedRequestTherapistSpecialization = String(acceptedRequest?.therapist?.specialization || '').trim();
  const acceptedRequestTherapistClinic = String(acceptedRequest?.therapist?.clinic_name || '').trim();
  const connectedAt = patientProfile?.connected_at;
  const isConnected = Boolean(connectedTherapistId || connectedTherapistName || acceptedRequestTherapistName);
  const displayTherapistName = connectedTherapistName || acceptedRequestTherapistName || 'Therapist';
  const displayTherapistSpecialization = connectedTherapistSpecialization || acceptedRequestTherapistSpecialization;
  const displayTherapistClinic = connectedTherapistClinic || acceptedRequestTherapistClinic;

  useEffect(() => {
    if (isConnected) {
      setShowConnectAnotherForm(false);
    }
  }, [isConnected]);

  const handleDeleteRequestCard = useCallback(async (id: string) => {
    const next = connectionRequests.filter((item) => item.id !== id);
    setConnectionRequests(next);
    await writeStoredRequests(next);
  }, [connectionRequests, writeStoredRequests]);

  return (
    <View style={styles.wrapper}>
      <StatusBar barStyle="light-content" backgroundColor="#342949" />

      <LinearGradient
        colors={['#342949', '#2A1F3D', '#342949']}
        start={[0, 0]} end={[0, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Animated.View style={[styles.bubble, { width: bubbleMedium, height: bubbleMedium, top: clamp(height * 0.06, 34, 62), right: -clamp(width * 0.12, 36, 56), backgroundColor: 'rgba(167,139,250,0.25)', transform: [{ translateY: b1y }, { translateX: b1x }] }]} />
        <Animated.View style={[styles.bubble, { width: bubbleLarge, height: bubbleLarge, top: -clamp(height * 0.12, 80, 120), left: -clamp(width * 0.18, 56, 88), backgroundColor: 'rgba(184,168,230,0.20)', transform: [{ translateY: b2y }, { translateX: b2x }] }]} />
        <Animated.View style={[styles.bubble, { width: clamp(width * 0.4, 120, 170), height: clamp(width * 0.4, 120, 170), bottom: clamp(height * 0.24, 160, 230), left: -clamp(width * 0.08, 20, 36), backgroundColor: 'rgba(167,139,250,0.22)', transform: [{ translateY: b3y }, { translateX: b3x }] }]} />
        <Animated.View style={[styles.bubble, { width: clamp(width * 0.48, 150, 200), height: clamp(width * 0.48, 150, 200), bottom: clamp(height * 0.12, 80, 120), right: -clamp(width * 0.14, 42, 70), backgroundColor: 'rgba(184,168,230,0.18)', transform: [{ translateY: b4y }, { translateX: b4x }] }]} />
        <Animated.View style={[styles.bubble, { width: bubbleSmall, height: bubbleSmall, top: '40%', right: clamp(width * 0.05, 14, 24), backgroundColor: 'rgba(167,139,250,0.15)', transform: [{ translateY: b5y }, { translateX: b5x }] }]} />
      </View>

      <StickyHeader
        scrollY={scrollY}
        firstWord="Connect with"
        secondWord="Therapist"
        onBackPress={goBack}
      />

      <Animated.View style={[styles.headerContainer, {
        paddingTop: headerTopPadding,
        paddingHorizontal: pageInset,
        paddingBottom: headerBottomPadding,
        opacity: scrollY.interpolate({ inputRange: [0, headerFadeDistance * 0.45, headerFadeDistance], outputRange: [1, 0, 0], extrapolate: 'clamp' }),
        transform: [{ translateY: scrollY.interpolate({ inputRange: [0, headerFadeDistance], outputRange: [0, -10], extrapolate: 'clamp' }) }],
      }]}>

        {/* ── Back button — hitSlop + zIndex:1000 fix for reliable Android tap ── */}
        <TouchableOpacity
          onPress={goBack}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={[styles.backButton, {
            left: pageInset,
            top: headerTopPadding - clamp(height * 0.006, 3, 6),
            width: backButtonSize,
            height: backButtonSize,
            borderRadius: backButtonSize / 2,
            zIndex: 1000,
          }]}
        >
          <FontAwesome name="chevron-left" size={backIconSize} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            setShowRequests(true);
            loadConnectionRequests();
          }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={[styles.requestButton, {
            right: pageInset,
            top: headerTopPadding - clamp(height * 0.006, 3, 6),
            width: backButtonSize,
            height: backButtonSize,
            borderRadius: backButtonSize / 2,
          }]}
        >
          <FontAwesome name="list-alt" size={backIconSize} color="#FFFFFF" />
          {pendingCount > 0 && (
            <View style={styles.requestBadge}>
              <Text style={styles.requestBadgeText}>{pendingCount > 9 ? '9+' : String(pendingCount)}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Title — position unchanged */}
        <Text style={[styles.headerTitle, { fontSize: titleFontSize, marginTop: titleMarginTop }]}>
          <Text style={styles.headerWhite}>Connect with </Text>
          <Text style={styles.headerPurple}>Therapist</Text>
        </Text>
      </Animated.View>

      <Animated.ScrollView
        contentContainerStyle={{
          paddingHorizontal: containerSidePadding,
          paddingTop: headerHeight + containerTopPadding,
          paddingBottom: screenBottomSpacer,
        }}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
      >

        {isConnected && (
          <View style={[styles.connectionCard, { borderRadius: cardRadius, padding: cardPadding, marginBottom: cardGap }]}>
            <View style={styles.connectionHeaderRow}>
              <View style={styles.connectionBadge}>
                <FontAwesome name="check-circle" size={14} color="#22C55E" />
                <Text style={styles.connectionBadgeText}>Connected</Text>
              </View>
              {profileLoading ? (
                <Text style={styles.connectionMeta}>Refreshing...</Text>
              ) : connectedAt ? (
                <Text style={styles.connectionMeta}>Since {formatDate(connectedAt)}</Text>
              ) : (
                <Text style={styles.connectionMeta}>Connected</Text>
              )}
            </View>

            <Text style={styles.connectionLabel}>Your therapist</Text>
            <Text style={styles.connectionName}>{displayTherapistName}</Text>
            {!!displayTherapistSpecialization && (
              <Text style={styles.connectionSubtext}>{displayTherapistSpecialization}</Text>
            )}
            {!!displayTherapistClinic && (
              <Text style={styles.connectionSubtext}>{displayTherapistClinic}</Text>
            )}

            <TouchableOpacity
              onPress={handleDisconnect}
              disabled={disconnecting}
              style={[styles.disconnectBtn, disconnecting && { opacity: 0.75 }]}
              activeOpacity={0.9}
            >
              <FontAwesome name="unlink" size={buttonIconSize} color="#fff" style={{ marginRight: clamp(width * 0.024, 8, 11) }} />
              <Text style={[styles.disconnectBtnText, { fontSize: buttonTextSize }]}>
                {disconnecting ? 'Disconnecting...' : 'Disconnect therapist'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowConnectAnotherForm((prev) => !prev)}
              style={styles.connectAnotherBtn}
              activeOpacity={0.9}
            >
              <FontAwesome name="plus-circle" size={13} color="#D8CCFF" style={{ marginRight: 8 }} />
              <Text style={styles.connectAnotherBtnText}>
                {showConnectAnotherForm ? 'Hide connect form' : 'Connect with another therapist'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={loadPatientProfile}
              disabled={profileLoading}
              style={[styles.refreshConnectionBtn, profileLoading && { opacity: 0.75 }]}
              activeOpacity={0.85}
            >
              <FontAwesome name="refresh" size={12} color="#D8CCFF" style={{ marginRight: 8 }} />
              <Text style={styles.refreshConnectionBtnText}>{profileLoading ? 'Refreshing...' : 'Refresh status'}</Text>
            </TouchableOpacity>

            <Text style={styles.connectionHintText}>
              You can keep this therapist and still send another connection request.
            </Text>
          </View>
        )}

        {(!isConnected || showConnectAnotherForm) && (
          <>
            {/* ── QR card — UNCHANGED ── */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={openScanner}
              style={[styles.connectCard, { borderRadius: cardRadius, padding: cardPadding, marginBottom: cardGap }]}
            >
              <View style={[styles.qrCircle, { width: qrCircleSize, height: qrCircleSize, borderRadius: qrCircleSize / 2 }]}>
                <FontAwesome name="camera" size={qrIconSize} color="#342949" />
              </View>
              <Text style={[styles.cardTitle, { marginTop: clamp(height * 0.018, 10, 16), fontSize: cardTitleSize }]}>Scan QR Code</Text>
              <Text style={[styles.cardSubtitle, { marginTop: clamp(height * 0.007, 4, 8), fontSize: cardSubtitleSize }]}>Tap to open camera and scan</Text>
              <View style={[styles.scanBadge, { borderRadius: scanBadgeRadius, paddingHorizontal: scanBadgePaddingX, paddingVertical: scanBadgePaddingY, marginTop: clamp(height * 0.018, 10, 16) }]}>
                <FontAwesome name="qrcode" size={qrSmallIconSize} color="#8B5CF6" style={{ marginRight: clamp(width * 0.015, 5, 7) }} />
                <Text style={[styles.scanBadgeText, { fontSize: scanBadgeTextSize }]}>Auto-fills PIN</Text>
              </View>
            </TouchableOpacity>

            {/* ── Divider ── */}
            <View style={[styles.dividerRow, { marginVertical: dividerVertical }]}>
              <View style={styles.line} />
              <Text style={[styles.dividerText, { marginHorizontal: dividerTextMargin, fontSize: dividerTextSize }]}>or enter manually</Text>
              <View style={styles.line} />
            </View>

            {/* ── Therapist Code card ── */}
            <View style={{ marginBottom: cardGap }}>
              <View style={[styles.inputCard, { borderRadius: cardRadius }]}>
                <LinearGradient colors={CARD_GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: cardRadius }]} pointerEvents="none" />
                <View style={{ height: 3, backgroundColor: '#A78BFA', borderTopLeftRadius: cardRadius, borderTopRightRadius: cardRadius }} />
                <View style={{ padding: cardPadding }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: clamp(width * 0.028, 10, 13), marginBottom: clamp(height * 0.018, 12, 16) }}>
                    <View style={{ width: badgeSz, height: badgeSz, borderRadius: badgeR, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(167,139,250,0.18)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.45)' }}>
                      <FontAwesome name="key" size={iconSz} color="#A78BFA" />
                    </View>
                    <View>
                      <Text style={{ color: '#FFFFFF', fontSize: labelSz, fontWeight: '800', letterSpacing: 0.3 }}>Therapist Code</Text>
                      <Text style={{ color: '#9D8EC7', fontSize: subLblSz, letterSpacing: 1.2, marginTop: 1 }}>REQUIRED</Text>
                    </View>
                  </View>
                  <View style={{ borderBottomWidth: 1.5, borderBottomColor: 'rgba(167,139,250,0.45)', paddingBottom: 4 }}>
                    <TextInput
                      value={therapistPin} onChangeText={setTherapistPin}
                      placeholder="Enter code" placeholderTextColor="rgba(184,168,230,0.45)"
                      style={{ color: '#FFFFFF', fontSize: inputSz, fontWeight: '600', letterSpacing: 0.2, paddingVertical: clamp(height * 0.009, 6, 9), paddingHorizontal: 2, backgroundColor: 'transparent', height: clamp(height * 0.056, 38, 46) }}
                      autoCapitalize="none"
                    />
                  </View>
                </View>
              </View>
            </View>

            {/* ── Message card ── */}
            <View style={{ marginBottom: cardGap }}>
              <View style={[styles.inputCard, { borderRadius: cardRadius }]}>
                <LinearGradient colors={CARD_GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: cardRadius }]} pointerEvents="none" />
                <View style={{ height: 3, backgroundColor: '#FFB36B', borderTopLeftRadius: cardRadius, borderTopRightRadius: cardRadius }} />
                <View style={{ padding: cardPadding }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: clamp(width * 0.028, 10, 13), marginBottom: clamp(height * 0.018, 12, 16) }}>
                    <View style={{ width: badgeSz, height: badgeSz, borderRadius: badgeR, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,179,107,0.15)', borderWidth: 1, borderColor: 'rgba(255,179,107,0.4)' }}>
                      <FontAwesome name="edit" size={iconSz} color="#FFB36B" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#FFFFFF', fontSize: labelSz, fontWeight: '800', letterSpacing: 0.3 }}>Message</Text>
                      <Text style={{ color: '#C9A97E', fontSize: subLblSz, letterSpacing: 0.8, marginTop: 1 }}>OPTIONAL — introduce yourself</Text>
                    </View>
                  </View>
                  <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginBottom: 4 }} />
                  <TextInput
                    value={connectMessage} onChangeText={setConnectMessage}
                    placeholder="Introduce yourself to your therapist..." placeholderTextColor="rgba(184,168,230,0.45)"
                    multiline numberOfLines={4} textAlignVertical="top"
                    style={{ color: '#FFFFFF', fontSize: clamp(width * 0.039, 14, 16), fontWeight: '400', letterSpacing: 0.15, paddingVertical: clamp(height * 0.016, 10, 14), paddingHorizontal: 2, backgroundColor: 'transparent', minHeight: clamp(height * 0.145, 100, 130), lineHeight: clamp(width * 0.039, 14, 16) * 1.55 }}
                  />
                </View>
              </View>
            </View>

            {/* ── Connect button ── */}
            <TouchableOpacity
              style={[styles.primaryBtn, { marginTop: clamp(height * 0.01, 6, 10), paddingVertical: buttonPaddingY, borderRadius: buttonRadius }, loading && { opacity: 0.7 }]}
              onPress={handleConnect} activeOpacity={0.9} disabled={loading}
            >
              <LinearGradient colors={['#8B5CF6', '#A78BFA']} start={[0, 0]} end={[1, 1]} style={[styles.primaryBtnGradient, { minHeight: buttonMinHeight, borderRadius: buttonRadius }]}>
                <View style={styles.primaryBtnInner}>
                  <FontAwesome name="send" size={buttonIconSize} color="#fff" style={{ marginRight: clamp(width * 0.026, 8, 12) }} />
                  <Text style={[styles.primaryBtnText, { fontSize: buttonTextSize }]}>{loading ? 'Sending...' : 'Connect with Therapist'}</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={{ marginTop: clamp(height * 0.016, 10, 14), alignItems: 'center', paddingVertical: clamp(height * 0.01, 6, 10) }} onPress={goBack} activeOpacity={0.7}>
              <Text style={[styles.skipText, { fontSize: skipTextSize }]}>Skip for now</Text>
            </TouchableOpacity>
          </>
        )}

      </Animated.ScrollView>

      <Modal transparent visible={showRequests} animationType="none" onRequestClose={() => setShowRequests(false)}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.sheetOverlay, { opacity: overlayOpacity }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowRequests(false)} />
        </Animated.View>

        <Animated.View style={[styles.sheetContainer, { transform: [{ translateY: sheetY }] }]}>
          <LinearGradient colors={['#2C2248', '#241C3E', '#1E1630']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
          <View style={styles.sheetTopBar} />
          <View style={styles.sheetHandle} />

          <View style={styles.sheetHeaderRow}>
            <Text style={styles.sheetTitle}>Connection Requests</Text>
            <TouchableOpacity onPress={loadConnectionRequests} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <FontAwesome name="refresh" size={16} color="#B8A8E6" />
            </TouchableOpacity>
          </View>
          <View style={styles.sheetHeaderSpacer} />

          {requestsLoading ? (
            <View style={styles.sheetStateContainer}>
              <Text style={styles.sheetStateText}>Loading requests...</Text>
            </View>
          ) : connectionRequests.length === 0 ? (
            <View style={styles.sheetStateContainer}>
              <Text style={styles.sheetStateTitle}>No requests yet</Text>
              <Text style={styles.sheetStateText}>When you send a connection request, its status will show here.</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 16 }} showsVerticalScrollIndicator={false}>
              {connectionRequests.map((req) => {
                const meta = REQUEST_STATUS_META[req.status] || REQUEST_STATUS_META.pending;
                const therapistName = req.therapist?.name || 'Therapist';
                const specialization = req.therapist?.specialization || req.therapist?.clinic_name || '';
                const respondedAt = req.responded_at || (req.status !== 'pending' ? req.updated_at : undefined);
                return (
                  <View key={req.id} style={[styles.requestCard, { borderColor: meta.border }]}> 
                    <View style={styles.requestCardHead}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.requestTherapistName}>{therapistName}</Text>
                        {!!specialization && <Text style={styles.requestSub}>{specialization}</Text>}
                      </View>
                      <View style={styles.requestRightActions}>
                        <View style={[styles.requestStatusChip, { backgroundColor: meta.bg, borderColor: meta.border }]}>
                          <Text style={[styles.requestStatusText, { color: meta.text }]}>{meta.label}</Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => handleDeleteRequestCard(req.id)}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          style={styles.requestDeleteButton}
                        >
                          <FontAwesome name="times" size={12} color="#FCA5A5" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {!!req.message && (
                      <Text style={styles.requestMessage} numberOfLines={2}>
                        Your message: {req.message}
                      </Text>
                    )}

                    <View style={styles.requestDivider} />

                    <Text style={styles.requestMeta}>Requested: {formatDate(req.created_at)}</Text>
                    {respondedAt ? <Text style={styles.requestMeta}>Updated: {formatDate(respondedAt)}</Text> : null}
                    {req.status === 'rejected' && !!req.rejection_reason ? (
                      <Text style={styles.requestReason}>Reason: {req.rejection_reason}</Text>
                    ) : null}
                  </View>
                );
              })}
            </ScrollView>
          )}
        </Animated.View>
      </Modal>

      {/* ── QR Scanner Modal — UNCHANGED ── */}
      <Modal visible={showScanner} animationType="slide" onRequestClose={() => setShowScanner(false)}>
        <View style={styles.scannerContainer}>
          <CameraView style={StyleSheet.absoluteFillObject} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={scanned ? undefined : handleBarCodeScanned} />
          <View style={styles.scannerOverlay} pointerEvents="none">
            <View style={[styles.scannerFrame, { width: scannerFrameSize, height: scannerFrameSize, borderRadius: scannerFrameRadius, borderWidth: scannerFrameBorder }]} />
          </View>
          <View style={[styles.scannerTopBar, { paddingTop: scannerTopPadding, paddingHorizontal: scannerTopSidePadding, paddingBottom: scannerTopBottomPad }]}>
            <TouchableOpacity onPress={() => setShowScanner(false)} style={[styles.scannerCloseBtn, { width: scannerCloseBtnSize, height: scannerCloseBtnSize, borderRadius: scannerCloseBtnSize / 2 }]}>
              <FontAwesome name="times" size={scannerCloseIconSize} color="#fff" />
            </TouchableOpacity>
            <Text style={[styles.scannerTitle, { fontSize: scannerTitleSize }]}>Scan Therapist QR Code</Text>
            <View style={{ width: scannerCloseBtnSize }} />
          </View>
          <View style={[styles.scannerBottomBar, { padding: scannerBottomPadding }]}>
            <Text style={[styles.scannerHint, { fontSize: scannerHintSize, lineHeight: scannerHintLH }]}>Point your camera at the QR code shown by your therapist</Text>
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

  headerContainer: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100 },
  backButton: {
    position: 'absolute',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
    // zIndex applied inline — must be above gradient overlays and bubble layer
  },
  requestButton: {
    position: 'absolute',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
  },
  requestBadge: {
    position: 'absolute',
    right: -4,
    top: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B6B',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  requestBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  headerTitle:  { fontWeight: '800', textAlign: 'center' },
  headerWhite:  { color: '#FFFFFF' },
  headerPurple: { color: '#B8A8E6' },

  sheetOverlay: {
    backgroundColor: 'rgba(10,6,20,0.72)',
  },
  sheetContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    minHeight: '58%',
    maxHeight: '88%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(167,139,250,0.2)',
    overflow: 'hidden',
  },
  sheetTopBar: {
    height: 3,
    backgroundColor: '#A78BFA',
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.24)',
    alignSelf: 'center',
    marginTop: 10,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  sheetHeaderSpacer: {
    height: 14,
  },
  sheetTitle: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '800',
  },
  sheetStateContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    alignItems: 'center',
  },
  sheetStateTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  sheetStateText: {
    color: '#B8A8E6',
    textAlign: 'center',
  },
  requestCard: {
    marginBottom: 12,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: 'rgba(54,46,76,0.96)',
    borderWidth: 1,
    shadowColor: '#120A24',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 7,
  },
  requestCardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  requestRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requestTherapistName: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  requestSub: {
    marginTop: 2,
    color: '#B8A8E6',
    fontSize: 12,
  },
  requestStatusChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  requestStatusText: {
    fontSize: 12,
    fontWeight: '800',
  },
  requestDeleteButton: {
    width: 28,
    height: 28,
    marginLeft: 8,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  requestMessage: {
    color: '#EDE7FF',
    fontSize: 13,
    marginBottom: 10,
    lineHeight: 19,
  },
  requestDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginBottom: 10,
  },
  requestMeta: {
    color: '#AFA4CF',
    fontSize: 12,
    marginBottom: 3,
  },
  requestReason: {
    marginTop: 2,
    color: '#FCA5A5',
    fontSize: 12,
  },

  connectionCard: {
    backgroundColor: 'rgba(54,46,76,0.96)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.35)',
    shadowColor: '#120A24',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 6,
  },
  connectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  connectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.24)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  connectionBadgeText: {
    color: '#86EFAC',
    fontSize: 12,
    fontWeight: '800',
  },
  connectionMeta: {
    color: '#B8A8E6',
    fontSize: 12,
  },
  connectionLabel: {
    color: '#B8A8E6',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  connectionName: {
    marginTop: 4,
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '900',
  },
  connectionSubtext: {
    marginTop: 4,
    color: '#DDD6FE',
    fontSize: 13,
  },
  disconnectBtn: {
    marginTop: 14,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 4,
  },
  disconnectBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  connectAnotherBtn: {
    marginTop: 10,
    minHeight: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.45)',
    backgroundColor: 'rgba(42,31,61,0.9)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectAnotherBtnText: {
    color: '#D8CCFF',
    fontSize: 13,
    fontWeight: '800',
  },
  refreshConnectionBtn: {
    marginTop: 10,
    minHeight: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.45)',
    backgroundColor: 'rgba(76,62,108,0.8)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshConnectionBtnText: {
    color: '#D8CCFF',
    fontSize: 13,
    fontWeight: '700',
  },
  connectionHintText: {
    marginTop: 10,
    color: '#B8A8E6',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
  },

  connectCard: {
    backgroundColor: '#3A3356',
    alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(233,225,255,0.55)',
    shadowColor: '#000', shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 12 }, shadowRadius: 24, elevation: 6,
  },
  qrCircle:      { alignItems: 'center', justifyContent: 'center', backgroundColor: '#B8A8E6', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' },
  cardTitle:     { color: '#FFFFFF', fontWeight: '800' },
  cardSubtitle:  { color: '#E4DFFF' },
  scanBadge:     { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(139,92,246,0.1)', borderColor: 'rgba(139,92,246,0.3)', borderWidth: 1 },
  scanBadgeText: { color: '#8B5CF6', fontWeight: '700' },

  dividerRow:  { flexDirection: 'row', alignItems: 'center' },
  line:        { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  dividerText: { color: '#B8A8E6' },

  inputCard: {
    overflow: 'hidden',
    backgroundColor: '#3F3752',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)',
    shadowColor: '#120A24', shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 8 }, shadowRadius: 18, elevation: 7,
  },

  primaryBtn:         { borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', shadowColor: '#000', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 10 }, shadowRadius: 18, elevation: 4, overflow: 'hidden' },
  primaryBtnGradient: { width: '100%', paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  primaryBtnInner:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  primaryBtnText:     { color: '#fff', fontWeight: '800' },
  skipText:           { fontWeight: '700', color: '#B8A8E6' },

  scannerContainer: { flex: 1, backgroundColor: '#000' },
  scannerOverlay:   { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  scannerFrame:     { borderColor: '#A78BFA', backgroundColor: 'transparent' },
  scannerTopBar:    { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  scannerCloseBtn:  { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.15)' },
  scannerTitle:     { color: '#fff', fontWeight: '700', flex: 1, textAlign: 'center' },
  scannerBottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center' },
  scannerHint:      { color: '#ccc', textAlign: 'center' },
  rescanBtn:        { marginTop: 14, backgroundColor: '#A78BFA' },
  rescanText:       { color: '#fff', fontWeight: '700' },
});
