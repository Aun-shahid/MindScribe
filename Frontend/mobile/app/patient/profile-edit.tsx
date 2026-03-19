import { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useAuthContext } from '../contexts/AuthContext';
import { FontAwesome, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import StickyHeader from '../components/StickyHeader';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi));

const CARD_GRAD: readonly [string, string, string] = [
  'rgba(255,179,107,0.11)',
  'rgba(167,139,250,0.08)',
  'rgba(52,41,73,0.72)',
];

// ── Field config ──────────────────────────────────────────────────────────────
const FIELDS = [
  { key: 'first_name',    label: 'First Name',    placeholder: 'Enter first name',   icon: 'user',         iconLib: 'FontAwesome',  accent: '#A78BFA', accentDim: 'rgba(167,139,250,0.18)', accentBorder: 'rgba(167,139,250,0.45)', strip: '#A78BFA', keyboard: 'default'      as const, cap: 'words'     as const },
  { key: 'last_name',     label: 'Last Name',     placeholder: 'Enter last name',    icon: 'user',         iconLib: 'FontAwesome',  accent: '#A78BFA', accentDim: 'rgba(167,139,250,0.18)', accentBorder: 'rgba(167,139,250,0.45)', strip: '#A78BFA', keyboard: 'default'      as const, cap: 'words'     as const },
  { key: 'username',      label: 'Username',      placeholder: 'Enter username',     icon: 'at',           iconLib: 'FontAwesome',  accent: '#60A5FA', accentDim: 'rgba(96,165,250,0.18)',  accentBorder: 'rgba(96,165,250,0.45)',  strip: '#60A5FA', keyboard: 'default'      as const, cap: 'none'      as const },
  { key: 'phone_number',  label: 'Phone Number',  placeholder: '+1 234 567 8900',    icon: 'phone',        iconLib: 'FontAwesome',  accent: '#34D399', accentDim: 'rgba(52,211,153,0.18)', accentBorder: 'rgba(52,211,153,0.45)',  strip: '#34D399', keyboard: 'phone-pad'   as const, cap: 'none'      as const },
  { key: 'date_of_birth', label: 'Date of Birth', placeholder: 'YYYY-MM-DD',        icon: 'calendar-alt', iconLib: 'FontAwesome5', accent: '#FBBF24', accentDim: 'rgba(251,191,36,0.18)', accentBorder: 'rgba(251,191,36,0.45)',  strip: '#FFB36B', keyboard: 'default'      as const, cap: 'none'      as const },
] as const;

type FieldKey = typeof FIELDS[number]['key'];

export default function ProfileEdit() {
  const { profile, updateProfile } = useAuthContext();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [values, setValues] = useState<Record<FieldKey, string>>({
    first_name:    profile?.first_name    || '',
    last_name:     profile?.last_name     || '',
    username:      profile?.username      || '',
    phone_number:  profile?.phone_number  || '',
    date_of_birth: profile?.date_of_birth || '',
  });
  const [loading, setLoading] = useState(false);

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

  // ── Responsive tokens ─────────────────────────────────────────────────────
  const pi       = clamp(width * 0.048,  16, 24);
  const hTop     = insets.top + clamp(height * 0.014, 10, 18);
  const hBtnSz   = clamp(width * 0.098,  34, 40);
  const hBtnR    = hBtnSz / 2;
  const hIcon    = clamp(width * 0.047,  16, 20);
  const hTitleSz = clamp(width * 0.075,  26, 32);
  const hMTop    = clamp(height * 0.022, 14, 22);
  const hPadBot  = clamp(height * 0.02,  14, 22);
  const hEst     = hTop + hMTop + hTitleSz + 8 + hPadBot;

  const bubbleLarge  = clamp(width * 0.74, 220, 310);
  const bubbleMedium = clamp(width * 0.52, 170, 230);
  const bubbleSmall  = clamp(width * 0.32,  96, 132);

  const cR       = clamp(width * 0.05,   16, 22);
  const cPad     = clamp(width * 0.05,   16, 22);
  const cGap     = clamp(height * 0.022, 14, 20);
  const badgeSz  = clamp(width * 0.076,  26, 32);
  const badgeR   = clamp(width * 0.038,  13, 16);
  const iconSz   = clamp(width * 0.032,  11, 13);
  const labelSz  = clamp(width * 0.042,  15, 17);
  const subLblSz = clamp(width * 0.029,  10, 11);
  const inputSz  = clamp(width * 0.042,  15, 17);
  const btnR     = clamp(width * 0.055,  18, 24);
  const btnPadY  = clamp(height * 0.018, 14, 18);
  const btnTxtSz = clamp(width * 0.044,  15, 18);

  // ── useFocusEffect bubbles ────────────────────────────────────────────────
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

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setLoading(true);
    try {
      await updateProfile({
        first_name:    values.first_name,
        last_name:     values.last_name,
        username:      values.username,
        phone_number:  values.phone_number,
        date_of_birth: values.date_of_birth,
      });
      Alert.alert('Profile updated!', 'Your profile has been saved successfully.');
      router.back();
    } catch (e: any) {
      Alert.alert('Update failed', e?.message || 'Could not update profile.');
    } finally {
      setLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>

      {/* Background */}
      <LinearGradient
        colors={['#342949', '#2A1F3D', '#342949']}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Bubbles */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {/* 1 — odd warm purple 0.25 — top-right */}
        <Animated.View style={[styles.bubble, {
          width: bubbleMedium, height: bubbleMedium,
          top: clamp(height * 0.06, 34, 62),
          right: -clamp(width * 0.12, 36, 56),
          backgroundColor: 'rgba(167,139,250,0.25)',
          transform: [{ translateY: b1y }, { translateX: b1x }],
        }]} />
        {/* 2 — even cool 0.20 — top-left */}
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
        firstWord="Edit"
        secondWord="Profile"
        onBackPress={() => router.back()}
      />

      {/* Fading large header */}
      <Animated.View style={[styles.headerContainer, {
        paddingTop: hTop,
        paddingHorizontal: pi,
        paddingBottom: hPadBot,
        opacity: scrollY.interpolate({
          inputRange: [0, 100, 150],
          outputRange: [1, 0.5, 0],
          extrapolate: 'clamp',
        }),
      }]}>
        <TouchableOpacity
          style={[styles.backBtn, {
            left: pi, top: hTop,
            width: hBtnSz, height: hBtnSz, borderRadius: hBtnR,
          }]}
          onPress={() => router.back()}
        >
          <FontAwesome name="chevron-left" size={hIcon} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={{ alignItems: 'center', marginTop: hMTop }}>
          <Text style={{ fontSize: hTitleSz, fontWeight: '800', textAlign: 'center' }}>
            <Text style={{ color: '#FFFFFF' }}>Edit </Text>
            <Text style={{ color: '#B8A8E6' }}>Profile</Text>
          </Text>
          <LinearGradient
            colors={['transparent', '#A78BFA', '#FFB36B', 'transparent']}
            start={[0, 0]} end={[1, 0]}
            style={{
              height: 2,
              width: clamp(width * 0.3, 96, 130),
              borderRadius: 2,
              marginTop: clamp(height * 0.007, 5, 7),
            }}
          />
        </View>
      </Animated.View>

      {/* Content */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <Animated.ScrollView
          contentContainerStyle={{
            paddingTop: hEst + clamp(height * 0.034, 22, 34),
            paddingHorizontal: pi,
            paddingBottom: clamp(insets.bottom + height * 0.06, 40, 60),
          }}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── Field cards ── */}
          {FIELDS.map((field, idx) => (
            <View key={field.key} style={{ marginBottom: cGap }}>
              <View style={[styles.card, { borderRadius: cR }]}>

                {/* Gradient overlay */}
                <LinearGradient
                  colors={CARD_GRAD}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={[StyleSheet.absoluteFill, { borderRadius: cR }]}
                  pointerEvents="none"
                />

                {/* Coloured accent strip */}
                <View style={{
                  height: 3,
                  backgroundColor: field.strip,
                  borderTopLeftRadius: cR, borderTopRightRadius: cR,
                }} />

                <View style={{ padding: cPad }}>

                  {/* Icon badge + label row */}
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: clamp(width * 0.028, 10, 13),
                    marginBottom: clamp(height * 0.018, 12, 16),
                  }}>
                    <View style={{
                      width: badgeSz, height: badgeSz, borderRadius: badgeR,
                      alignItems: 'center', justifyContent: 'center',
                      backgroundColor: field.accentDim,
                      borderWidth: 1, borderColor: field.accentBorder,
                    }}>
                      {field.iconLib === 'FontAwesome5'
                        ? <FontAwesome5 name={field.icon as any} size={iconSz} color={field.accent} />
                        : <FontAwesome  name={field.icon as any} size={iconSz} color={field.accent} />
                      }
                    </View>
                    <View>
                      <Text style={{ color: '#FFFFFF', fontSize: labelSz, fontWeight: '800', letterSpacing: 0.3 }}>
                        {field.label}
                      </Text>
                      <Text style={{ color: '#9D8EC7', fontSize: subLblSz, letterSpacing: 1.2, marginTop: 1 }}>
                        {idx < 2 ? 'REQUIRED' : 'OPTIONAL'}
                      </Text>
                    </View>
                  </View>

                  {/* Underline input (CreateJournal style) */}
                  <View style={{
                    borderBottomWidth: 1.5,
                    borderBottomColor: field.accentBorder,
                    paddingBottom: 4,
                  }}>
                    <TextInput
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
                      value={values[field.key]}
                      onChangeText={(t) => setValues((prev) => ({ ...prev, [field.key]: t }))}
                      placeholder={field.placeholder}
                      placeholderTextColor="rgba(184,168,230,0.45)"
                      keyboardType={field.keyboard}
                      autoCapitalize={field.cap}
                    />
                  </View>

                </View>
              </View>
            </View>
          ))}

          {/* ── Save button ── */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={loading}
            activeOpacity={0.88}
            style={[styles.saveBtn, { borderRadius: btnR, marginTop: clamp(height * 0.01, 6, 10) }, loading && { opacity: 0.6 }]}
          >
            <LinearGradient
              colors={['#A78BFA', '#7C5CE0']}
              start={[0, 0]} end={[1, 1]}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                gap: clamp(width * 0.025, 8, 12),
                paddingVertical: btnPadY,
                borderRadius: btnR,
              }}
            >
              <FontAwesome name="save" size={clamp(width * 0.045, 16, 19)} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: btnTxtSz, fontWeight: '700', letterSpacing: 0.3 }}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* ── Cancel ── */}
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.8}
            style={{ alignItems: 'center', marginTop: clamp(height * 0.018, 12, 16), paddingVertical: clamp(height * 0.012, 8, 12) }}
          >
            <Text style={{ color: 'rgba(184,168,230,0.6)', fontSize: clamp(width * 0.038, 14, 16), fontWeight: '600' }}>
              Cancel
            </Text>
          </TouchableOpacity>

        </Animated.ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bubble:    { position: 'absolute', borderRadius: 9999 },

  headerContainer: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 900,
  },
  backBtn: {
    position: 'absolute',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
  },

  card: {
    overflow: 'hidden',
    backgroundColor: '#3F3752',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    shadowColor: '#120A24',
    shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 7,
  },

  saveBtn: {
    overflow: 'hidden',
    shadowColor: '#7C5CE0',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 8,
  },
});
