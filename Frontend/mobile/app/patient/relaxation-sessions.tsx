import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, TextInput, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import { useTheme } from '../contexts/ThemeContext';
import PatientService, { RelaxationContent } from '../services/patient.service';
import StarRating from '../components/StarRating';

export default function RelaxationSessionScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { themeStyle } = useTheme();
  const [content, setContent] = useState<RelaxationContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Audio
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  // Timed loop controls
  const [timedMinutes, setTimedMinutes] = useState<number | null>(null); // 5,10,20
  const listenedMsRef = useRef<number>(0);
  const lastPositionRef = useRef<number>(0);
  const isRestartingRef = useRef<boolean>(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  // Session form
  const [moodBefore, setMoodBefore] = useState<number>(3);
  const [moodAfter, setMoodAfter] = useState<number>(4);
  const [rating, setRating] = useState<number>(4);
  const [notes, setNotes] = useState<string>('');
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!id) return;
    loadContent();
    setupAudio();
    return () => { cleanupAudio(); };
  }, [id]);

  const loadContent = async () => {
    try {
      setLoading(true);
      const data = await PatientService.getRelaxationContentDetail(String(id));
      setContent(data);
      console.log('[RelaxationSession] loaded content audio_url=', data?.audio_url);
      // reset any previous sound and timed counters when switching content
      try {
        if (soundRef.current) {
          await soundRef.current.unloadAsync();
          soundRef.current = null;
        }
      } catch (e) {}
      setSound(null);
      setIsPlaying(false);
      setPosition(0);
      setDuration(0);
      listenedMsRef.current = 0;
      lastPositionRef.current = 0;
      setTimedMinutes(null);
    } catch (err: any) {
      console.error('Failed to load content:', err);
      setError(err?.response?.data?.detail || 'Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  const setupAudio = async () => {
    try {
      const mode: any = {
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      };

      if (typeof (Audio as any).INTERRUPTION_MODE_IOS_DO_NOT_MIX !== 'undefined') {
        mode.interruptionModeIOS = (Audio as any).INTERRUPTION_MODE_IOS_DO_NOT_MIX;
      } else if (typeof (Audio as any).INTERRUPTION_MODE_IOS_DUCK_OTHERS !== 'undefined') {
        mode.interruptionModeIOS = (Audio as any).INTERRUPTION_MODE_IOS_DUCK_OTHERS;
      }

      if (typeof (Audio as any).INTERRUPTION_MODE_ANDROID_DO_NOT_MIX !== 'undefined') {
        mode.interruptionModeAndroid = (Audio as any).INTERRUPTION_MODE_ANDROID_DO_NOT_MIX;
      } else if (typeof (Audio as any).INTERRUPTION_MODE_ANDROID_DUCK_OTHERS !== 'undefined') {
        mode.interruptionModeAndroid = (Audio as any).INTERRUPTION_MODE_ANDROID_DUCK_OTHERS;
      }

      await Audio.setAudioModeAsync(mode);
    } catch (e) {}
  };

  const cleanupAudio = async () => {
    if (sound) {
      await sound.unloadAsync();
    }
  };

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis);
      setDuration(status.durationMillis || 0);
      setIsPlaying(status.isPlaying);

      // accumulate listened time only while playing
      if (status.isPlaying) {
        const lastPos = lastPositionRef.current || 0;
        const delta = Math.max(0, (status.positionMillis || 0) - lastPos);
        listenedMsRef.current += delta;
        lastPositionRef.current = status.positionMillis || 0;
      }

      // if timed loop target reached, stop playback
      if (timedMinutes) {
        const targetMs = timedMinutes * 60 * 1000;
        if (listenedMsRef.current >= targetMs) {
          (async () => {
            try {
              const s = soundRef.current;
              if (s) {
                await s.stopAsync();
                await s.setPositionAsync(0);
                await s.unloadAsync();
              }
            } catch (e) {}
            setSound(null);
            setIsPlaying(false);
            setPosition(0);
            setDuration(0);
            listenedMsRef.current = 0;
            lastPositionRef.current = 0;
            setTimedMinutes(null);
          })();
        }
      }

      // handle natural finish: restart if timed loop still active and target not reached
      if (status.didJustFinish) {
        if (timedMinutes) {
          const targetMs = timedMinutes * 60 * 1000;
          const s = soundRef.current;
          if (listenedMsRef.current < targetMs) {
            (async () => {
              try {
                // prevent concurrent restart attempts
                if (isRestartingRef.current) return;
                isRestartingRef.current = true;

                if (s) {
                  const st = await s.getStatusAsync();
                  if (st?.isLoaded) {
                    await s.setPositionAsync(0);
                    await s.playAsync();
                    isRestartingRef.current = false;
                    return;
                  }
                }

                // recreate the sound if missing or unloaded
                const uri = content?.audio_url as string;
                console.log('[RelaxationSession] recreating sound for restart, uri=', uri);
                const created = await Audio.Sound.createAsync({ uri }, { shouldPlay: true }, onPlaybackStatusUpdate);
                soundRef.current = created.sound;
                setSound(created.sound);
                isRestartingRef.current = false;
                return;
              } catch (e) {
                console.warn('[RelaxationSession] failed to restart after finish', e);
                isRestartingRef.current = false;
              }
            })();
            return;
          }
        }
        setIsPlaying(false);
      }
    }
  };

  const handlePlay = async () => {
    if (!content) return;
    try {
      if (sound) {
        if (isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
        } else {
          await sound.playAsync();
          setIsPlaying(true);
        }
        return;
      }

      console.log('[RelaxationSession] playing audio url:', content.audio_url);
      try { console.log('[RelaxationSession] attempting HEAD fetch for audio url'); } catch(e){}
      const { sound: newSound } = await Audio.Sound.createAsync({ uri: content.audio_url }, { shouldPlay: true }, onPlaybackStatusUpdate);

      try {
        await newSound.setStatusAsync({ volume: 1.0 });
        const st = await newSound.getStatusAsync();
        console.log('[RelaxationSession] newSound status after create:', st);
      } catch (qerr) {
        console.warn('[RelaxationSession] failed to query/set sound status', qerr);
      }

      // verify loaded
      const status = await newSound.getStatusAsync();
      if (!status?.isLoaded) {
        try { await newSound.unloadAsync(); } catch(e){}
        throw new Error('Failed to load audio');
      }

      // initialize listened counters for timed loop
      listenedMsRef.current = 0;
      lastPositionRef.current = 0;

      // ensure native looping is off; timed loop handled manually
      try { await newSound.setIsLoopingAsync(false); } catch(e){}

      soundRef.current = newSound;
      setSound(newSound);
      setIsPlaying(true);
    } catch (e) {
      console.error('Audio play error', e);
      // If error has message or code provide it
      try { console.error('Audio play error details:', e?.message || e); } catch (ee) {}
      Alert.alert('Playback error', `Unable to play audio. See console for details. URL: ${content.audio_url}`);
    }
  };

  const handleStop = async () => {
    if (sound) {
      await sound.unloadAsync();
      soundRef.current = null;
      setSound(null);
      setIsPlaying(false);
      setPosition(0);
      setDuration(0);
      listenedMsRef.current = 0;
      lastPositionRef.current = 0;
      setTimedMinutes(null);
    }
  };

  const formatTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleCompleteSession = async () => {
    if (!content) return;
    try {
      // Prefer the accumulated listened milliseconds (more accurate when restarting/looping)
      const listenedMs = Math.max(0, listenedMsRef.current || 0);
      const listenedSecondsFromAccum = Math.floor(listenedMs / 1000);
      const positionSeconds = Math.floor((position || 0) / 1000);
      const durationSeconds = Number(listenedSecondsFromAccum || positionSeconds || content.duration_seconds || 0);

      if (!content.id) {
        console.error('[RelaxationSession] missing content id, cannot save session', content);
        Alert.alert('Error', 'Unable to save session: missing content id');
        return;
      }

      const payload: Record<string, any> = {
        content: String(content.id),
        duration_listened_seconds: durationSeconds,
        completed: true,
        rating: rating ?? null,
        mood_before: moodBefore != null ? String(moodBefore) : null,
        mood_after: moodAfter != null ? String(moodAfter) : null,
        notes: (notes && notes.trim().length > 0) ? notes.trim() : null,
      };

      console.log('[RelaxationSession] create payload:', payload);

      const res = await PatientService.createRelaxationSession(payload);
      console.log('[RelaxationSession] create response:', res);
      sessionIdRef.current = res?.id || null;
      Alert.alert('Session saved', 'Relaxation session recorded');
      router.back();
    } catch (err: any) {
      console.error('Failed to save session', err, err?.response?.data || err?.response);
      const serverDetail = err?.response?.data?.detail || err?.response?.data || err?.message;
      Alert.alert('Error', String(serverDetail || 'Failed to save session'));
    }
  };

  if (loading) return (
    <View style={[styles.center, { backgroundColor: themeStyle.background }]}>
      <ActivityIndicator size="large" color={themeStyle.button} />
      <Text style={{ color: themeStyle.text, marginTop: 12 }}>Loading session...</Text>
    </View>
  );

  if (error || !content) return (
    <View style={[styles.center, { backgroundColor: themeStyle.background }]}>
      <Text style={{ color: themeStyle.text }}>{error || 'Content not found'}</Text>
      <TouchableOpacity style={[styles.btn, { backgroundColor: themeStyle.button }]} onPress={() => router.back()}>
        <Text style={{ color: themeStyle.buttonText }}>Go back</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: themeStyle.background }]} contentContainerStyle={styles.content}>
      <View style={[styles.playerCard, { backgroundColor: themeStyle.card }]}>
        <View style={styles.playerHeader}>
          <Text style={[styles.title, { color: themeStyle.title }]}>{content.title}</Text>
          <Text style={[styles.sub, { color: themeStyle.label }]}>{content.category_display || content.category}</Text>
        </View>

        <View style={styles.playerArea}>
          <TouchableOpacity style={[styles.playCircle, { backgroundColor: themeStyle.button }]} onPress={handlePlay}>
            <Text style={{ fontSize: 28, color: themeStyle.buttonText }}>{isPlaying ? '⏸️' : '▶️'}</Text>
          </TouchableOpacity>

          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={[styles.progressBar, { backgroundColor: themeStyle.background }]}>
              <View style={[styles.progressFill, { width: `${duration > 0 ? (position / duration) * 100 : 0}%`, backgroundColor: themeStyle.button }]} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: themeStyle.label }}>{formatTime(position)}</Text>
              <Text style={{ color: themeStyle.label }}>{formatTime(duration)}</Text>
            </View>
          </View>
        </View>
        {/* Timed loop controls */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[5,10,20].map((m) => (
              <TouchableOpacity key={m} onPress={() => {
                // toggle same selection off
                setTimedMinutes(prev => prev === m ? null : m);
                // reset counters when changing preset
                listenedMsRef.current = 0; lastPositionRef.current = 0;
              }} style={[styles.btn, { backgroundColor: timedMinutes === m ? themeStyle.button : themeStyle.card }]}> 
                <Text style={{ color: timedMinutes === m ? themeStyle.buttonText : themeStyle.text }}>{m}m</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ justifyContent: 'center' }}>
            {timedMinutes ? (
              <Text style={{ color: themeStyle.label }}>Remaining: {formatTime(Math.max(0, (timedMinutes * 60 * 1000) - listenedMsRef.current))}</Text>
            ) : (
              <Text style={{ color: themeStyle.label }}>Timed loop: off</Text>
            )}
          </View>
        </View>
      </View>

      <View style={[styles.formCard, { backgroundColor: themeStyle.card }]}>
        <Text style={[styles.fieldLabel, { color: themeStyle.label }]}>Mood Before</Text>
        <View style={styles.sliderRow}>
          <Text style={{ color: themeStyle.text }}>{moodBefore}/5</Text>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <TextInput keyboardType="numeric" value={String(moodBefore)} onChangeText={(t) => setMoodBefore(Math.max(1, Math.min(5, Number(t) || 1)))} style={[styles.numberInput, { borderColor: themeStyle.border, color: themeStyle.text }]} />
          </View>
        </View>

        <Text style={[styles.fieldLabel, { color: themeStyle.label, marginTop: 12 }]}>Mood After</Text>
        <View style={styles.sliderRow}>
          <Text style={{ color: themeStyle.text }}>{moodAfter}/5</Text>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <TextInput keyboardType="numeric" value={String(moodAfter)} onChangeText={(t) => setMoodAfter(Math.max(1, Math.min(5, Number(t) || 1)))} style={[styles.numberInput, { borderColor: themeStyle.border, color: themeStyle.text }]} />
          </View>
        </View>

        <Text style={[styles.fieldLabel, { color: themeStyle.label, marginTop: 12 }]}>Rate this session</Text>
        <StarRating value={rating} onChange={setRating} />

        <Text style={[styles.fieldLabel, { color: themeStyle.label, marginTop: 12 }]}>Notes (optional)</Text>
        <TextInput multiline numberOfLines={4} value={notes} onChangeText={setNotes} placeholder="How did this session make you feel?" placeholderTextColor={themeStyle.placeholder} style={[styles.textArea, { borderColor: themeStyle.border, color: themeStyle.text }]} />

        <TouchableOpacity style={[styles.completeBtn, { backgroundColor: themeStyle.button }]} onPress={handleCompleteSession}>
          <Text style={{ color: themeStyle.buttonText, fontWeight: '700' }}>Complete Session</Text>
        </TouchableOpacity>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  playerCard: { borderRadius: 16, padding: 18, marginBottom: 16 },
  playerHeader: { marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '700' },
  sub: { fontSize: 14 },
  playerArea: { flexDirection: 'row', alignItems: 'center' },
  playCircle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  progressBar: { height: 6, borderRadius: 6, overflow: 'hidden', backgroundColor: '#eee', marginVertical: 8 },
  progressFill: { height: '100%' },
  formCard: { borderRadius: 16, padding: 16 },
  fieldLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  sliderRow: { flexDirection: 'row', alignItems: 'center' },
  numberInput: { borderWidth: 1, borderRadius: 8, padding: 8, width: 64, textAlign: 'center' },
  textArea: { borderWidth: 1, borderRadius: 8, padding: 12, minHeight: 80, marginTop: 8 },
  completeBtn: { marginTop: 16, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  btn: { marginTop: 12, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10 },
});



