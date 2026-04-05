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
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PatientService from '../services/patient.service';
import type { CreateJournalEntryData, JournalEntry } from '../services/patient.service';
import StickyHeader from '../components/StickyHeader';
import TabLoaderCard from '../components/TabLoaderCard';
import { validateMeaningfulTextField } from '../utils/validation';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi));

const MOOD_TAGS = [
  'Happy', 'Grateful', 'Anxious', 'Calm', 'Excited',
  'Sad', 'Hopeful', 'Stressed', 'Peaceful', 'Overwhelmed',
];

const MOOD_TAG_COLORS: Record<string, string> = {
  Happy: '#F7B731',     Grateful: '#2ECC71', Anxious: '#F39C12',
  Calm: '#3498DB',      Excited: '#E84393',  Sad: '#5D6DFA',
  Hopeful: '#9B59B6',   Stressed: '#E74C3C', Peaceful: '#1ABC9C',
  Overwhelmed: '#8E44AD',
};

const CARD_GRAD: readonly [string, string, string] = [
  'rgba(255,179,107,0.11)',
  'rgba(167,139,250,0.08)',
  'rgba(52,41,73,0.72)',
];
const CARD_BG     = '#3F3752';
const CARD_BORDER = 'rgba(255,255,255,0.16)';

export default function JournalEdit() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading,    setLoading]    = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollY  = useRef(new Animated.Value(0)).current;

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

  const pi           = clamp(width * 0.048,  16, 24);
  const si           = clamp(width * 0.04,   14, 20);
  const hTop         = insets.top + clamp(height * 0.014, 10, 18);
  const hBtnSz       = clamp(width * 0.098,  34, 40);
  const hBtnR        = hBtnSz / 2;
  const hIcon        = clamp(width * 0.047,  16, 20);
  const hTitleSz     = clamp(width * 0.075,  26, 32);
  const hMTop        = clamp(height * 0.022, 14, 22);
  const hPadBot      = clamp(height * 0.02,  14, 22);
  const hEst         = hTop + hMTop + hTitleSz + 8 + hPadBot;

  const bLarge  = clamp(width * 0.74, 220, 320);
  const bMedium = clamp(width * 0.56, 170, 260);
  const bSmall  = clamp(width * 0.34, 110, 160);

  const cR        = clamp(width * 0.042,  13, 16);
  const cPad      = clamp(width * 0.045,  14, 18);
  const sGap      = clamp(height * 0.028, 18, 24);
  const cBot      = clamp(height * 0.05,  30, 46);

  const cardTitleSz  = clamp(width * 0.042, 15, 17);
  const cardSubSz    = clamp(width * 0.034, 12, 14);
  const titleInSz    = clamp(width * 0.042, 15, 17);
  const bodyInSz     = clamp(width * 0.039, 14, 16);
  const bodyLH       = Math.round(bodyInSz * 1.45);
  const bodyMinH     = clamp(height * 0.24, 160, 220);
  const pillPadY     = clamp(height * 0.01,   6,  9);
  const pillPadX     = clamp(width * 0.033,  11, 14);
  const pillR        = clamp(width * 0.04,   14, 18);
  const pillTxtSz    = clamp(width * 0.035,  12, 14);
  const switchLblSz  = clamp(width * 0.04,   14, 16);
  const switchSubSz  = clamp(width * 0.031,  11, 12);
  const switchW      = clamp(width * 0.13,   46, 52);
  const switchH      = clamp(height * 0.04,  26, 30);
  const switchR      = switchH / 2;
  const switchThumbSz= clamp(height * 0.034, 22, 26);
  const iconBadgeSz  = clamp(width * 0.076,  26, 32);
  const iconBadgeR   = clamp(width * 0.038,  13, 16);
  const iconSz       = clamp(width * 0.032,  11, 13);
  const submitPadY   = clamp(height * 0.016, 12, 15);
  const submitR      = clamp(width * 0.045,  14, 18);
  const submitTxtSz  = clamp(width * 0.043,  15, 18);
  const submitIconSz = clamp(width * 0.046,  16, 19);
  const wordCntSz    = clamp(width * 0.033,  12, 13);

  const [formData, setFormData] = useState<CreateJournalEntryData>({
    title: '', content: '', mood_tags_list: [],
    is_favorite: false,
    entry_date: new Date().toISOString().split('T')[0],
  });

  const loadEntry = useCallback(async () => {
    if (!id) return;
    try {
      const entry: JournalEntry = await PatientService.getJournalEntry(id);
      setFormData({
        prompt:         entry.tags || undefined,
        title:          entry.title          || '',
        content:        entry.content        || '',
        mood_tags_list: entry.tags_list       || [],
        is_favorite:    entry.is_favorite,
        entry_date:     new Date(entry.created_at).toISOString().split('T')[0],
      });
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    } catch (err: any) {
      console.error('[JournalEdit] Error loading:', err);
      Alert.alert('Error', 'Failed to load journal entry');
      router.push(`./journal-detail?id=${id}` as any);
    } finally {
      setLoading(false);
    }
  }, [fadeAnim, id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fadeAnim.setValue(0);
      loadEntry();
      return () => {};
    }, [fadeAnim, loadEntry])
  );

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
        fly(b1y, b1x, 8000, 7000),
        fly(b2y, b2x, 10000, 8000),
        fly(b3y, b3x, 9000, 7500),
        fly(b4y, b4x, 8500, 7200),
        fly(b5y, b5x, 9500, 8200),
      ];
      return () => anims.forEach((a) => a.stop());
    }, [b1x,b1y,b2x,b2y,b3x,b3y,b4x,b4y,b5x,b5y])
  );

  const toggleMoodTag = (tag: string) => {
    setFormData((prev) => {
      const current = prev.mood_tags_list || [];
      return {
        ...prev,
        mood_tags_list: current.includes(tag)
          ? current.filter((t) => t !== tag)
          : [...current, tag],
      };
    });
  };

  const handleSubmit = async () => {
    const titleValidation = validateMeaningfulTextField(formData.title || '', 'Title', 2, false);
    if (!titleValidation.isValid) {
      Alert.alert('Invalid Title', titleValidation.message || 'Please add a valid title to your journal entry');
      return;
    }

    const contentValidation = validateMeaningfulTextField(formData.content || '', 'Content', 5, false);
    if (!contentValidation.isValid) {
      Alert.alert('Invalid Content', contentValidation.message || 'Please write meaningful content.');
      return;
    }

    setSubmitting(true);
    try {
      // Remove is_private from payload
      const { is_private, ...rest } = formData;
      await PatientService.updateJournalEntry(id, rest);
      Alert.alert('Success', 'Journal entry updated successfully!', [
        { text: 'OK', onPress: () => router.push(`./journal-detail?id=${id}` as any) },
      ]);
    } catch (err: any) {
      console.error('[JournalEdit] Error updating:', err);
      Alert.alert('Error', err.response?.data?.message || 'Failed to update journal entry');
    } finally {
      setSubmitting(false);
    }
  };

  // ── back handler — always goes to journal-detail ──────────────────────────
  const handleBack = () => router.push(`./journal-detail?id=${id}` as any);

  if (loading) {
    return (
      <TabLoaderCard
        fullScreen
        title="Loading journal entry..."
        subtitle="Preparing your editor"
        spinnerColor="#A78BFA"
      />
    );
  }

  const wordCount = formData.content?.trim().split(/\s+/).filter((w) => w).length ?? 0;

  return (
    <View style={s.container}>
      <LinearGradient colors={['#342949', '#2A1F3D', '#342949']} style={StyleSheet.absoluteFill} pointerEvents="none" />

      {/* Ambient glow blobs */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={[s.glow, { width: bLarge * 1.1, height: bLarge * 1.1, top: -bLarge * 0.3, right: -bLarge * 0.3, backgroundColor: 'rgba(167,139,250,0.06)' }]} />
        <View style={[s.glow, { width: bMedium, height: bMedium, bottom: '18%', left: -bMedium * 0.35, backgroundColor: 'rgba(255,179,107,0.05)' }]} />
      </View>

      {/* Floating bubbles */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Animated.View style={[s.bubble, { width: bMedium, height: bMedium, top: '10%', left: '-10%', backgroundColor: 'rgba(167,139,250,0.15)', transform: [{ translateY: b1y }, { translateX: b1x }] }]} />
        <Animated.View style={[s.bubble, { width: bLarge, height: bLarge, top: '25%', right: '-15%', backgroundColor: 'rgba(184,168,230,0.18)', transform: [{ translateY: b2y }, { translateX: b2x }] }]} />
        <Animated.View style={[s.bubble, { width: bMedium, height: bMedium, top: '50%', left: '10%', backgroundColor: 'rgba(167,139,250,0.13)', transform: [{ translateY: b3y }, { translateX: b3x }] }]} />
        <Animated.View style={[s.bubble, { width: bLarge * 0.78, height: bLarge * 0.78, bottom: '15%', right: '5%', backgroundColor: 'rgba(184,168,230,0.22)', transform: [{ translateY: b4y }, { translateX: b4x }] }]} />
        <Animated.View style={[s.bubble, { width: bSmall, height: bSmall, bottom: '30%', left: '-5%', backgroundColor: 'rgba(167,139,250,0.19)', transform: [{ translateY: b5y }, { translateX: b5x }] }]} />
      </View>

      {/* Sticky header — back to journal-detail */}
      <StickyHeader
        scrollY={scrollY}
        firstWord="Edit"
        secondWord="Journal"
        onBackPress={handleBack}
      />

      {/* Fading large header — back to journal-detail, no underline gradient */}
      <Animated.View style={[s.headerContainer, {
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
          onPress={handleBack}
          style={[s.backBtnCircle, { left: pi, top: hTop, width: hBtnSz, height: hBtnSz, borderRadius: hBtnR }]}
        >
          <FontAwesome name="chevron-left" size={hIcon} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={{ alignItems: 'center', marginTop: hMTop }}>
          <Text style={{ fontSize: hTitleSz, fontWeight: '800', textAlign: 'center' }}>
            <Text style={{ color: '#FFFFFF' }}>Edit </Text>
            <Text style={{ color: '#B8A8E6' }}>Journal</Text>
          </Text>
        </View>
      </Animated.View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: si,
            paddingTop: hEst + clamp(height * 0.034, 22, 34),
            paddingBottom: cBot,
          }}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
        >
          <Animated.View style={{ opacity: fadeAnim }}>

            {/* ── Title Card ── */}
            <View style={[s.card, { padding: 0, overflow: 'hidden', borderRadius: cR, backgroundColor: CARD_BG, borderColor: CARD_BORDER, marginBottom: sGap }]}>
              <LinearGradient colors={CARD_GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={[StyleSheet.absoluteFill, { borderRadius: cR, zIndex: -1 }]} pointerEvents="none" />
              <View style={{ height: 3, backgroundColor: '#A78BFA', borderTopLeftRadius: cR, borderTopRightRadius: cR }} />
              <View style={{ padding: cPad }}>
                <View style={[s.cardHeaderRow, { marginBottom: clamp(height * 0.018, 12, 16) }]}>
                  <LinearGradient
                    colors={['rgba(167,139,250,0.30)', 'rgba(167,139,250,0.10)']}
                    style={[s.iconBadge, { width: iconBadgeSz, height: iconBadgeSz, borderRadius: iconBadgeR, borderColor: 'rgba(167,139,250,0.45)' }]}
                  >
                    <FontAwesome name="pencil" size={iconSz} color="#C4B0FF" />
                  </LinearGradient>
                  <View>
                    <Text style={{ color: '#FFFFFF', fontSize: cardTitleSz, fontWeight: '800', letterSpacing: 0.5 }}>Entry Title</Text>
                    <Text style={{ color: '#9D8EC7', fontSize: clamp(width * 0.029, 10, 11), letterSpacing: 1.2, marginTop: 1 }}>REQUIRED</Text>
                  </View>
                </View>
                <View style={{ borderBottomWidth: 1.5, borderBottomColor: 'rgba(167,139,250,0.45)', paddingBottom: 4 }}>
                  <TextInput
                    style={{ backgroundColor: 'transparent', color: '#FFFFFF', paddingVertical: clamp(height * 0.009, 6, 8), paddingHorizontal: 2, height: clamp(height * 0.056, 38, 44), fontSize: titleInSz, fontWeight: '700', letterSpacing: 0.3 }}
                    placeholder="Give your entry a title..."
                    placeholderTextColor="rgba(184,168,230,0.45)"
                    value={formData.title}
                    onChangeText={(text) => setFormData((prev) => ({ ...prev, title: text }))}
                  />
                </View>
              </View>
            </View>

            {/* ── Content Card ── */}
            <View style={[s.card, { padding: 0, overflow: 'hidden', borderRadius: cR, backgroundColor: CARD_BG, borderColor: CARD_BORDER, marginBottom: sGap }]}>
              <LinearGradient colors={CARD_GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={[StyleSheet.absoluteFill, { borderRadius: cR, zIndex: -1 }]} pointerEvents="none" />
              <View style={{ height: 3, backgroundColor: '#FFB36B', borderTopLeftRadius: cR, borderTopRightRadius: cR }} />
              <View style={{ padding: cPad }}>
                <View style={[s.cardHeaderRow, { marginBottom: clamp(height * 0.014, 10, 14) }]}>
                  <LinearGradient
                    colors={['rgba(255,179,107,0.25)', 'rgba(255,179,107,0.08)']}
                    style={[s.iconBadge, { width: iconBadgeSz, height: iconBadgeSz, borderRadius: iconBadgeR, borderColor: 'rgba(255,179,107,0.40)' }]}
                  >
                    <FontAwesome name="edit" size={iconSz} color="#FFB36B" />
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#FFFFFF', fontSize: cardTitleSz, fontWeight: '800', letterSpacing: 0.4 }}>What&apos;s on your mind?</Text>
                    <Text style={{ color: '#C9A97E', fontSize: clamp(width * 0.029, 10, 11), letterSpacing: 0.8, marginTop: 1 }}>Write freely — no rules here</Text>
                  </View>
                </View>
                <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginBottom: 4 }} />
                <TextInput
                  style={{ backgroundColor: 'transparent', color: '#FFFFFF', paddingVertical: clamp(height * 0.016, 10, 14), paddingHorizontal: 2, fontSize: bodyInSz, minHeight: bodyMinH, lineHeight: bodyLH, letterSpacing: 0.2 }}
                  placeholder="Start writing... Express yourself freely."
                  placeholderTextColor="rgba(184,168,230,0.45)"
                  value={formData.content}
                  onChangeText={(text) => setFormData((prev) => ({ ...prev, content: text }))}
                  multiline
                  numberOfLines={12}
                  textAlignVertical="top"
                />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)' }}>
                  <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: '#FFB36B', opacity: 0.7 }} />
                  <Text style={{ color: '#9D8EC7', fontSize: wordCntSz, fontStyle: 'italic' }}>{wordCount} words</Text>
                </View>
              </View>
            </View>

            {/* ── Tags Card ── */}
            <View style={[s.card, { padding: cPad, overflow: 'hidden', borderRadius: cR, backgroundColor: CARD_BG, borderColor: CARD_BORDER, marginBottom: sGap }]}>
              <LinearGradient colors={CARD_GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={[StyleSheet.absoluteFill, { borderRadius: cR, zIndex: -1 }]} pointerEvents="none" />
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: '#A78BFA', borderTopLeftRadius: cR, borderTopRightRadius: cR }} />
              <View style={{ marginTop: clamp(height * 0.008, 4, 8) }}>
                <Text style={{ color: '#FFFFFF', fontSize: cardTitleSz, fontWeight: '700', marginBottom: clamp(height * 0.008, 5, 7) }}>
                  🎨 Tags<Text style={{ color: '#9D8EC7', fontWeight: '500' }}> (Optional)</Text>
                </Text>
                <Text style={{ color: '#B8A8E6', fontSize: cardSubSz, marginBottom: clamp(height * 0.015, 10, 12) }}>
                  Select tags that describe your current state
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: clamp(width * 0.025, 8, 10) }}>
                  {MOOD_TAGS.map((tag) => {
                    const isSelected = formData.mood_tags_list?.includes(tag);
                    const tagColor   = MOOD_TAG_COLORS[tag] || '#B8A8E6';
                    return (
                      <TouchableOpacity
                        key={tag}
                        onPress={() => toggleMoodTag(tag)}
                        style={{ paddingVertical: pillPadY, paddingHorizontal: pillPadX, borderRadius: pillR, borderWidth: 1, borderColor: tagColor, backgroundColor: isSelected ? tagColor : `${tagColor}24` }}
                      >
                        <Text style={{ color: '#FFFFFF', fontSize: pillTxtSz, fontWeight: '600' }}>{tag}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* ── Favourite Toggle Card ── */}
            <View style={[s.card, { padding: cPad, overflow: 'hidden', borderRadius: cR, backgroundColor: CARD_BG, borderColor: CARD_BORDER, marginBottom: sGap }]}> 
              <LinearGradient colors={CARD_GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={[StyleSheet.absoluteFill, { borderRadius: cR, zIndex: -1 }]} pointerEvents="none" />
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: '#FFB36B', borderTopLeftRadius: cR, borderTopRightRadius: cR }} />
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: clamp(height * 0.016, 10, 14), marginTop: clamp(height * 0.008, 4, 8) }}
                onPress={() => setFormData((prev) => ({ ...prev, is_favorite: !prev.is_favorite }))}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: clamp(width * 0.086, 30, 36), height: clamp(width * 0.086, 30, 36), borderRadius: clamp(width * 0.043, 15, 18), backgroundColor: 'rgba(255,196,92,0.18)', borderWidth: 1, borderColor: 'rgba(255,196,92,0.45)', alignItems: 'center', justifyContent: 'center', marginRight: clamp(width * 0.028, 10, 13) }}>
                    <Text style={{ fontSize: clamp(width * 0.048, 16, 20) }}>⭐</Text>
                  </View>
                  <View>
                    <Text style={{ color: '#FFFFFF', fontSize: switchLblSz, fontWeight: '700' }}>Mark as Favourite</Text>
                    <Text style={{ color: '#CEC2EE', fontSize: switchSubSz, marginTop: 2 }}>Pin this journal for quick access</Text>
                  </View>
                </View>
                <View style={{ width: switchW, height: switchH, borderRadius: switchR, padding: 2, borderWidth: 1, borderColor: formData.is_favorite ? '#FFD27A' : 'rgba(255,255,255,0.24)', backgroundColor: formData.is_favorite ? '#F5A623' : '#8E87A8' }}>
                  <View style={{ width: switchThumbSz, height: switchThumbSz, borderRadius: switchThumbSz / 2, backgroundColor: '#FFFFFF', transform: [{ translateX: formData.is_favorite ? clamp(width * 0.055, 20, 24) : 2 }], shadowColor: '#000', shadowOpacity: 0.2, shadowOffset: { width: 0, height: 2 }, shadowRadius: 2, elevation: 2 }} />
                </View>
              </TouchableOpacity>
            </View>

            {/* ── Save Button ── */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.9}
              style={[{ borderRadius: submitR, overflow: 'hidden', marginTop: clamp(height * 0.02, 12, 18), marginBottom: clamp(height * 0.01, 6, 10), opacity: submitting ? 0.6 : 1 }]}
            >
              <LinearGradient
                colors={['#8B5CF6', '#A78BFA']}
                start={[0, 0]} end={[1, 1]}
                style={{ width: '100%', minHeight: clamp(height * 0.064, 48, 56), borderRadius: submitR, alignItems: 'center', justifyContent: 'center', paddingVertical: submitPadY }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: clamp(width * 0.024, 8, 10) }}>
                  <FontAwesome name="save" size={submitIconSz} color="#FFFFFF" />
                  <Text style={{ color: '#FFFFFF', fontSize: submitTxtSz, fontWeight: '700' }}>
                    {submitting ? '✨ Saving...' : 'Save Changes'}
                  </Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* Cancel — goes back to journal-detail */}
            <TouchableOpacity
              onPress={handleBack}
              disabled={submitting}
              activeOpacity={0.8}
              style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: clamp(height * 0.016, 10, 14), borderRadius: submitR, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', marginTop: clamp(height * 0.012, 8, 12) }}
            >
              <Text style={{ color: '#CEC2EE', fontSize: clamp(width * 0.04, 14, 16), fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>

          </Animated.View>
        </Animated.ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#342949' },
  glow:      { position: 'absolute', borderRadius: 9999 },
  bubble:    { position: 'absolute', borderRadius: 9999 },
  headerContainer: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 900 },
  backBtnCircle: {
    position: 'absolute',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
    shadowColor: '#000', shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 1,
  },
  card: {
    elevation: 7,
    shadowColor: '#120A24',
    shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    borderWidth: 1,
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBadge:     { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
});