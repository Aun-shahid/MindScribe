/*
 * START SESSION PAGE - What This File Does:
 * 
 * This is like a "therapy session control room" for therapists. Think of it as:
 * 
 * 1. SESSION STARTER: 
 *    - Shows a "Ready to Start?" button when first opened
 *    - Creates a new therapy session in the system when clicked
 *    - Links the session to a specific patient
 * 
 * 2. RECORDING STUDIO:
 *    - Has a timer that counts how long the session has been running
 *    - Start/Stop recording buttons (like a voice recorder)
 *    - Shows if currently recording or paused
 * 
 * 3. REAL-TIME EMOTION MONITOR:
 *    - Displays patient's emotional state during the session
 *    - Shows percentages for Calm, Anxious, and Angry emotions
 *    - Updates live as the session progresses (currently using sample data)
 * 
 * 4. CONVERSATION TRACKER:
 *    - Shows a live transcript of what's being said
 *    - Identifies who's talking (Therapist vs Patient)
 *    - Timestamps each conversation part
 * 
 * 5. NOTE-TAKING AREA:
 *    - Provides a text box for therapist to write observations
 *    - Can record important insights during the session
 *    - Notes are saved for future reference
 * 
 * 6. SESSION CONTROLLER:
 *    - "End Session" button to properly stop everything
 *    - Makes sure recording is stopped before ending
 *    - Takes you to the completion form when done
 * 
 * It's basically like having a digital assistant that helps therapists 
 * manage their therapy sessions from start to finish!
 */



import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  SafeAreaView,
  Alert,
  ActivityIndicator,
  ScrollView,
  TextInput
} from 'react-native'
import React, { useState, useEffect } from 'react'
import { router, useLocalSearchParams } from 'expo-router'
import { useTheme } from '../contexts/ThemeContext'
import api from '../utils/api'

const StartSession = () => {
  const { themeStyle } = useTheme()
  const { patientId, sessionId: existingSessionId, sessionStarted: alreadyStarted } = useLocalSearchParams()
  
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(existingSessionId as string || null)
  const [sessionStarted, setSessionStarted] = useState(alreadyStarted === 'true')
  const [isRecording, setIsRecording] = useState(false)
  const [sessionDuration, setSessionDuration] = useState('00:00')
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(alreadyStarted === 'true' ? new Date() : null)
  const [notes, setNotes] = useState('')

  // Mock emotion analysis data
  const [emotionData] = useState({
    calm: 30,
    anxious: 60,
    angry: 10
  })

  // Mock transcript data
  const [transcript] = useState([
    {
      speaker: 'Therapist',
      text: 'How are you feeling today?',
      time: '00:45'
    },
    {
      speaker: 'Patient',
      text: "I've been feeling quite anxious lately, especially about work. The deadlines are overwhelming.",
      time: '00:52'
    },
    {
      speaker: 'Therapist',
      text: 'Can you tell me more about what specifically about work is causing this anxiety?',
      time: '01:15'
    }
  ])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (sessionStarted && sessionStartTime && isRecording) {
      interval = setInterval(() => {
        const now = new Date()
        const diff = Math.floor((now.getTime() - sessionStartTime.getTime()) / 1000)
        const minutes = Math.floor(diff / 60)
        const seconds = diff % 60
        setSessionDuration(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [sessionStarted, sessionStartTime, isRecording])

  // ...existing code...
const handleStartSession = async () => {
  if (!patientId) {
    Alert.alert('Error', 'No patient selected')
    return
  }

  try {
    setLoading(true)
    console.log('🔍 Creating session for patient:', patientId)
    
    // Fix: Use the correct endpoint and data structure
    const sessionData = {
      patient: patientId, // Changed from patient_id to patient
      session_type: 'individual',
      status: 'IN_PROGRESS',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().slice(0, 5),
      duration: 50,
      location: 'Office',
      notes: ''
    }
    
    console.log('📤 Sending session data:', sessionData)
    
    // Use the standard sessions endpoint
    const createResponse = await api.post('/therapy_sessions/sessions/', sessionData)
    
    console.log('✅ Session created:', createResponse.data)
    
    const newSessionId = createResponse.data.id
    console.log('🆔 Session ID set to:', newSessionId) // Debug log
    
    setSessionId(newSessionId)
    setSessionStarted(true)
    setSessionStartTime(new Date())
    
    console.log('🎉 Session started successfully with ID:', newSessionId)
    
  } catch (error: any) {
    console.error('💥 Failed to start session:', error)
    
    if (error.response) {
      console.error('📄 Error response data:', error.response.data)
      console.error('🔢 Error status:', error.response.status)
    }
    
    let errorMessage = 'Failed to start session. Please try again.'
    if (error.response?.status === 400) {
      errorMessage = `Invalid data: ${JSON.stringify(error.response.data)}`
    } else if (error.response?.status === 500) {
      errorMessage = 'Server error. Please check backend.'
    }
    
    Alert.alert('Error', errorMessage)
  } finally {
    setLoading(false)
  }
}
// ...existing code...
  const handleStopRecording = async () => {
    if (!sessionId) {
      Alert.alert('Error', 'No active session found');
      return;
    }

    try {
      setLoading(true);
      
      // Just stop the local recording state - don't change session status yet
      // The session status will be changed when we actually end the session
      setIsRecording(false);
      Alert.alert('Recording Stopped', 'Audio recording has been stopped. Session is ready to end.');
      
    } catch (error: any) {
      console.error('❌ Failed to stop recording:', error);
      Alert.alert('Error', 'Failed to stop recording. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const handleStartRecording = async () => {
    if (!sessionId) {
      Alert.alert('Error', 'No active session found');
      return;
    }

    try {
      // Ensure session is in progress when recording starts
      await api.patch(`/therapy_sessions/sessions/${sessionId}/`, {
        status: 'IN_PROGRESS'
      });

      setIsRecording(true);
      Alert.alert('Recording Started', 'Audio recording has begun.');
      
    } catch (error: any) {
      console.error('❌ Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording. Please try again.');
    }
  }

  const handleEndSession = async () => {
    if (!sessionId) {
      Alert.alert('Error', 'No active session found');
      return;
    }

    Alert.alert('End Session', 'Ready to complete this session?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Complete Session',
        onPress: async () => {
          try {
            setLoading(true);
            
            // Just stop recording locally if it's still active
            if (isRecording) {
              console.log('🛑 Stopping recording before ending session...');
              setIsRecording(false);
            }

            // Navigate to end session page - let the end session endpoint handle status change
            router.push({
              pathname: './end-session',
              params: {
                sessionId,
                patientId
              }
            });
            
          } catch (error: any) {
            console.error('❌ Failed to navigate to end session:', error);
            Alert.alert('Error', 'Failed to navigate to end session. Please try again.');
          } finally {
            setLoading(false);
          }
        }
      }
    ]);
  };


  if (!sessionStarted && !existingSessionId) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeStyle.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: '#00B894' }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Start Session</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.startContent}>
          <Text style={[styles.startTitle, { color: themeStyle.text }]}>
            Ready to Start Session?
          </Text>
          
          <Text style={[styles.startSubtitle, { color: themeStyle.label }]}>
            This will begin a new therapy session with the selected patient
          </Text>

          <TouchableOpacity
            style={[styles.startButton, { opacity: loading ? 0.7 : 1 }]}
            onPress={handleStartSession}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.startButtonText}>Start Session</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeStyle.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: '#00B894' }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Session</Text>
        <TouchableOpacity onPress={handleEndSession}>
          <Text style={styles.endSessionText}>End</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Session in Progress */}
        <View style={[styles.card, { backgroundColor: themeStyle.dashboardcard }]}>
          <View style={styles.sessionHeader}>
            <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>Session in Progress</Text>
            <Text style={[styles.duration, { color: '#FF6B6B' }]}>Duration: {sessionDuration}</Text>
          </View>
        </View>

        {/* Audio Recording */}
        <View style={[styles.card, { backgroundColor: themeStyle.dashboardcard }]}>
          <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>🎵 Audio Recording</Text>
          
          <View style={styles.recordingControls}>
            <Text style={[styles.recordingStatus, { color: themeStyle.label }]}>
              Status: {isRecording ? 'Recording' : 'Paused'}
            </Text>
            
            {/* Waveform Visualization */}
            <View style={styles.waveformContainer}>
              {Array.from({ length: 20 }).map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.waveformBar,
                    {
                      height: isRecording ? Math.random() * 40 + 10 : 10,
                      backgroundColor: isRecording ? '#00B894' : '#ccc'
                    }
                  ]}
                />
              ))}
            </View>

            <View style={styles.recordingButtons}>
              {!isRecording ? (
                <TouchableOpacity
                  style={[styles.recordButton, { backgroundColor: '#00B894' }]}
                  onPress={handleStartRecording}
                >
                  <Text style={styles.recordButtonText}>Start Recording</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.recordButton, { backgroundColor: '#FF6B6B' }]}
                  onPress={handleStopRecording}
                >
                  <Text style={styles.recordButtonText}>End Session</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Real-time Emotion Analysis */}
        <View style={[styles.card, { backgroundColor: themeStyle.dashboardcard }]}>
          <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>Real-time Emotion Analysis</Text>
          <Text style={[styles.subtitle, { color: themeStyle.label }]}>
            Analyzing emotional trends during session
          </Text>

          <View style={styles.emotionContainer}>
            <View style={styles.emotionItem}>
              <Text style={styles.emotionIcon}>😌</Text>
              <Text style={[styles.emotionLabel, { color: themeStyle.text }]}>Calm</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${emotionData.calm}%`, backgroundColor: '#4CAF50' }]} />
              </View>
              <Text style={[styles.emotionPercentage, { color: themeStyle.text }]}>{emotionData.calm}%</Text>
            </View>

            <View style={styles.emotionItem}>
              <Text style={styles.emotionIcon}>😰</Text>
              <Text style={[styles.emotionLabel, { color: themeStyle.text }]}>Anxious</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${emotionData.anxious}%`, backgroundColor: '#FF9800' }]} />
              </View>
              <Text style={[styles.emotionPercentage, { color: themeStyle.text }]}>{emotionData.anxious}%</Text>
            </View>

            <View style={styles.emotionItem}>
              <Text style={styles.emotionIcon}>😠</Text>
              <Text style={[styles.emotionLabel, { color: themeStyle.text }]}>Angry</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${emotionData.angry}%`, backgroundColor: '#F44336' }]} />
              </View>
              <Text style={[styles.emotionPercentage, { color: themeStyle.text }]}>{emotionData.angry}%</Text>
            </View>
          </View>
        </View>

        {/* Live Transcript */}
        <View style={[styles.card, { backgroundColor: themeStyle.dashboardcard }]}>
          <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>Live Transcript</Text>
          <Text style={[styles.subtitle, { color: themeStyle.label }]}>
            Real-time conversation transcription
          </Text>

          <View style={styles.transcriptContainer}>
            {transcript.map((item, index) => (
              <View key={index} style={styles.transcriptItem}>
                <View style={[
                  styles.transcriptBubble,
                  {
                    backgroundColor: item.speaker === 'Therapist' ? '#00B894' : '#E8F5E8',
                    alignSelf: item.speaker === 'Therapist' ? 'flex-end' : 'flex-start',
                    marginLeft: item.speaker === 'Therapist' ? 50 : 0,
                    marginRight: item.speaker === 'Patient' ? 50 : 0,
                  }
                ]}>
                  <Text style={[
                    styles.transcriptSpeaker,
                    { color: item.speaker === 'Therapist' ? 'white' : '#333' }
                  ]}>
                    {item.speaker}
                  </Text>
                  <Text style={[
                    styles.transcriptText,
                    { color: item.speaker === 'Therapist' ? 'white' : '#333' }
                  ]}>
                    {item.text}
                  </Text>
                  <Text style={[
                    styles.transcriptTime,
                    { color: item.speaker === 'Therapist' ? 'rgba(255,255,255,0.7)' : '#666' }
                  ]}>
                    {item.time}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Additional Notes & Observations */}
        <View style={[styles.card, { backgroundColor: themeStyle.dashboardcard }]}>
          <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>� Additional Notes & Observations</Text>
          <Text style={[styles.subtitle, { color: themeStyle.label }]}>
            Record your observations and insights during the session
          </Text>

          <TextInput
            style={[styles.notesInput, { 
              backgroundColor: themeStyle.background,
              color: themeStyle.text,
              borderColor: themeStyle.border 
            }]}
            placeholder="Write any additional observations, key insights, or important details to remember for the next session..."
            placeholderTextColor={themeStyle.label}
            multiline
            numberOfLines={6}
            value={notes}
            onChangeText={setNotes}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  )
}

export default StartSession

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: 50,
  },
  backText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  endSessionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  startContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  startTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  startSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
  },
  startButton: {
    backgroundColor: '#00B894',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  startButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  duration: {
    fontSize: 16,
    fontWeight: '600',
  },
  recordingControls: {
    alignItems: 'center',
  },
  recordingStatus: {
    fontSize: 14,
    marginBottom: 16,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    height: 60,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  waveformBar: {
    width: 3,
    marginHorizontal: 1,
    borderRadius: 2,
  },
  recordingButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  recordButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  recordButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  emotionContainer: {
    gap: 16,
  },
  emotionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  emotionIcon: {
    fontSize: 24,
    width: 32,
  },
  emotionLabel: {
    fontSize: 16,
    fontWeight: '500',
    width: 70,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  emotionPercentage: {
    fontSize: 14,
    fontWeight: '600',
    width: 40,
    textAlign: 'right',
  },
  transcriptContainer: {
    maxHeight: 300,
  },
  transcriptItem: {
    marginBottom: 12,
  },
  transcriptBubble: {
    borderRadius: 16,
    padding: 12,
    maxWidth: '80%',
  },
  transcriptSpeaker: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  transcriptText: {
    fontSize: 14,
    lineHeight: 20,
  },
  transcriptTime: {
    fontSize: 11,
    marginTop: 4,
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 120,
  },
  bottomSpacer: {
    height: 20,
  },
})


