import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, Animated } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome } from '@expo/vector-icons';
import PatientService from '../services/patient.service';
import StarRating from '../components/StarRating';

export default function RelaxationSessionScreen() {
  const { contentId, contentTitle, contentCategory, durationListened } = useLocalSearchParams();
  const router = useRouter();

  // Session form
  const [moodBefore, setMoodBefore] = useState<number>(3);
  const [moodAfter, setMoodAfter] = useState<number>(4);
  const [rating, setRating] = useState<number>(4);
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);


  // Bubble animations
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

  useEffect(() => {
    // Bubble animation
    const createFloatingAnimation = (valueY: Animated.Value, valueX: Animated.Value, durationY: number, durationX: number, delay: number) => {
      return Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(valueY, {
              toValue: -30,
              duration: durationY,
              useNativeDriver: true,
            }),
            Animated.timing(valueY, {
              toValue: 0,
              duration: durationY,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(valueX, {
              toValue: 20,
              duration: durationX,
              useNativeDriver: true,
            }),
            Animated.timing(valueX, {
              toValue: -20,
              duration: durationX,
              useNativeDriver: true,
            }),
          ]),
        ])
      );
    };

    const animations = [
      createFloatingAnimation(bubble1Y, bubble1X, 8000, 7000, 0),
      createFloatingAnimation(bubble2Y, bubble2X, 10000, 9000, 500),
      createFloatingAnimation(bubble3Y, bubble3X, 7000, 8000, 1000),
      createFloatingAnimation(bubble4Y, bubble4X, 9000, 7500, 1500),
      createFloatingAnimation(bubble5Y, bubble5X, 8500, 8500, 2000),
    ];

    animations.forEach(anim => anim.start());

    return () => { 
      animations.forEach(anim => anim.stop());
    };
  }, []);


  const handleCompleteSession = async () => {
    if (!contentId) {
      Alert.alert('Error', 'Missing session information');
      return;
    }

    try {
      setSubmitting(true);
      const payload: Record<string, any> = {
        content: String(contentId),
        duration_listened_seconds: Number(durationListened) || 0,
        completed: true,
        rating: rating ?? null,
        mood_before: moodBefore != null ? String(moodBefore) : null,
        mood_after: moodAfter != null ? String(moodAfter) : null,
        notes: (notes && notes.trim().length > 0) ? notes.trim() : null,
      };

      console.log('[RelaxationSession] create payload:', payload);

      const res = await PatientService.createRelaxationSession(payload);
      console.log('[RelaxationSession] create response:', res);
      Alert.alert('Session saved', 'Your relaxation session has been recorded successfully');
      router.push('/patient/actions');
    } catch (err: any) {
      console.error('Failed to save session', err, err?.response?.data || err?.response);
      const serverDetail = err?.response?.data?.detail || err?.response?.data || err?.message;
      Alert.alert('Error', String(serverDetail || 'Failed to save session'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip Session Rating',
      'Are you sure you want to skip rating this session?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Skip', style: 'destructive', onPress: () => router.push('/patient/actions') }
      ]
    );
  };


  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#342949', '#342949', '#342949']}
        style={styles.screenGradient}
      />

      {/* Animated Bubbles */}
      <Animated.View style={[
        styles.bubble, 
        { width: 200, height: 200, top: 50, right: -50, backgroundColor: 'rgba(133, 130, 180, 0.25)' },
        { transform: [{ translateY: bubble1Y }, { translateX: bubble1X }] }
      ]} />
      <Animated.View style={[
        styles.bubble, 
        { width: 280, height: 280, top: -100, left: -80, backgroundColor: 'rgba(133, 130, 180, 0.2)' },
        { transform: [{ translateY: bubble2Y }, { translateX: bubble2X }] }
      ]} />
      <Animated.View style={[
        styles.bubble, 
        { width: 150, height: 150, bottom: 200, left: -30, backgroundColor: 'rgba(133, 130, 180, 0.22)' },
        { transform: [{ translateY: bubble3Y }, { translateX: bubble3X }] }
      ]} />
      <Animated.View style={[
        styles.bubble, 
        { width: 180, height: 180, bottom: 100, right: -60, backgroundColor: 'rgba(133, 130, 180, 0.18)' },
        { transform: [{ translateY: bubble4Y }, { translateX: bubble4X }] }
      ]} />
      <Animated.View style={[
        styles.bubble, 
        { width: 120, height: 120, top: '40%', right: 20, backgroundColor: 'rgba(133, 130, 180, 0.15)' },
        { transform: [{ translateY: bubble5Y }, { translateX: bubble5X }] }
      ]} />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Back Button */}
        <TouchableOpacity
          onPress={() => router.push('./take-a-break')}
          style={styles.backButton}
        >
          <FontAwesome name="chevron-left" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.pageTitle}>
            <Text style={styles.headerWhite}>Rate Your Session</Text>
          </Text>
          <Text style={styles.subtitle}>Help us understand your experience</Text>
        </View>

        {/* Session Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.sessionTitle}>{contentTitle}</Text>
          <Text style={styles.sessionCategory}>{contentCategory}</Text>
        </View>

        {/* Feedback Form */}
        <View style={styles.formCard}>
          {/* Mood Before */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Mood Before</Text>
            <Text style={styles.sectionSubtitle}>How did you feel before starting? (1-5)</Text>
            <View style={styles.moodButtons}>
              {[1, 2, 3, 4, 5].map((value) => (
                <TouchableOpacity
                  key={value}
                  onPress={() => setMoodBefore(value)}
                  style={[
                    styles.moodButton,
                    moodBefore === value && styles.moodButtonActive
                  ]}
                >
                  <Text style={[
                    styles.moodButtonText,
                    moodBefore === value && styles.moodButtonTextActive
                  ]}>
                    {value}
                  </Text>
                  <Text style={[
                    styles.moodLabel,
                    moodBefore === value && styles.moodLabelActive
                  ]}>
                    {value === 1 ? 'Low' : value === 5 ? 'High' : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Mood After */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Mood After</Text>
            <Text style={styles.sectionSubtitle}>How do you feel now? (1-5)</Text>
            <View style={styles.moodButtons}>
              {[1, 2, 3, 4, 5].map((value) => (
                <TouchableOpacity
                  key={value}
                  onPress={() => setMoodAfter(value)}
                  style={[
                    styles.moodButton,
                    moodAfter === value && styles.moodButtonActive
                  ]}
                >
                  <Text style={[
                    styles.moodButtonText,
                    moodAfter === value && styles.moodButtonTextActive
                  ]}>
                    {value}
                  </Text>
                  <Text style={[
                    styles.moodLabel,
                    moodAfter === value && styles.moodLabelActive
                  ]}>
                    {value === 1 ? 'Low' : value === 5 ? 'High' : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Rate This Session */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Rate This Session</Text>
            <Text style={styles.sectionSubtitle}>How would you rate this relaxation session?</Text>
            <View style={styles.starContainer}>
              <StarRating value={rating} onChange={setRating} />
            </View>
          </View>

          {/* Notes */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Notes (Optional)</Text>
            <Text style={styles.sectionSubtitle}>Share your thoughts about this session</Text>
            <TextInput
              multiline
              numberOfLines={4}
              value={notes}
              onChangeText={setNotes}
              placeholder="How did this session make you feel?"
              placeholderTextColor="rgba(255,255,255,0.4)"
              style={styles.textArea}
            />
          </View>

          {/* Action Buttons */}
          <TouchableOpacity 
            style={[styles.completeBtn, submitting && styles.completeBtnDisabled]} 
            onPress={handleCompleteSession}
            disabled={submitting}
          >
            <Text style={styles.completeBtnText}>
              {submitting ? 'Saving...' : 'Complete Session'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
            <Text style={styles.skipBtnText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}


const styles = StyleSheet.create({
  container: { 
    flex: 1,
  },
  screenGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 0,
  },
  bubble: {
    position: 'absolute',
    borderRadius: 1000,
    zIndex: 1,
  },
  scrollView: {
    flex: 1,
    zIndex: 2,
  },
  content: { 
    padding: 20, 
    paddingBottom: 40 
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: 60,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  headerWhite: {
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: '#473F5A',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  sessionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 6,
    textAlign: 'center',
  },
  sessionCategory: {
    fontSize: 14,
    color: '#B8A8E6',
    textAlign: 'center',
  },
  formCard: { 
    backgroundColor: '#473F5A',
    borderRadius: 16, 
    padding: 20,
  },
  formSection: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 16,
  },
  moodButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  moodButton: {
    flex: 1,
    backgroundColor: '#342949',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  moodButtonActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#B8A8E6',
  },
  moodButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 4,
  },
  moodButtonTextActive: {
    color: '#FFFFFF',
  },
  moodLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '600',
  },
  moodLabelActive: {
    color: 'rgba(255,255,255,0.8)',
  },
  starContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  textArea: { 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 12, 
    padding: 16, 
    minHeight: 100,
    color: '#FFFFFF',
    fontSize: 15,
    textAlignVertical: 'top',
    backgroundColor: '#342949',
  },
  completeBtn: { 
    marginTop: 8,
    paddingVertical: 16, 
    borderRadius: 24, 
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  completeBtnDisabled: {
    opacity: 0.6,
  },
  completeBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  skipBtn: {
    marginTop: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  skipBtnText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 15,
    fontWeight: '600',
  },
});




