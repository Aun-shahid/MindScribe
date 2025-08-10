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

  // Debug logs to track the session state
  useEffect(() => {
    console.log('🔧 StartSession initialized with:')
    console.log('   patientId:', patientId)
    console.log('   existingSessionId:', existingSessionId)
    console.log('   alreadyStarted:', alreadyStarted)
    console.log('   sessionId state:', sessionId)
    console.log('   sessionStarted state:', sessionStarted)
  }, [patientId, existingSessionId, alreadyStarted, sessionId, sessionStarted])

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
    console.log('🛑 Attempting to stop recording...')
    console.log('   Current sessionId:', sessionId)
    console.log('   Current sessionStarted:', sessionStarted)
    
    if (!sessionId) {
      console.error('❌ No sessionId found when trying to stop recording')
      Alert.alert('Error', 'No active session found. Please restart the session.');
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
    console.log('🎙️ Attempting to start recording...')
    console.log('   Current sessionId:', sessionId)
    console.log('   Current sessionStarted:', sessionStarted)
    
    if (!sessionId) {
      console.error('❌ No sessionId found when trying to start recording')
      Alert.alert('Error', 'No active session found. Please restart the session.');
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
    console.log('🏁 Attempting to end session...')
    console.log('   Current sessionId:', sessionId)
    console.log('   Current sessionStarted:', sessionStarted)
    
    if (!sessionId) {
      console.error('❌ No sessionId found when trying to end session')
      Alert.alert('Error', 'No active session found. Please restart the session.');
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


  // Show the "Start Session" button only if no session has been started and no existing session ID
  if (!sessionStarted && !sessionId) {
    console.log('🚀 Showing start session button (no active session)')
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeStyle.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: '#49467E' }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Start Session</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.startContent}>
          <Text style={[styles.startTitle, { color: themeStyle.text }]}>
            Ready to Start Session?
          </Text>
          
          <Text style={[styles.startSubtitle, { color: themeStyle.label }]}>
            This will begin a new therapy session with the selected patient
          </Text>

          <TouchableOpacity
            style={[styles.startButton, { opacity: loading ? 0.7 : 1, backgroundColor: '#49467E' }]}
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

  // Show active session UI
  console.log('📱 Showing active session UI')
  console.log('   sessionId:', sessionId)
  console.log('   sessionStarted:', sessionStarted)

  // Safety check - if we're supposed to show active session but no sessionId, show error
  if (!sessionId) {
    console.error('❌ Critical error: Should show active session but sessionId is null')
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeStyle.background }]}>
        <View style={[styles.header, { backgroundColor: '#FF3B30' }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Session Error</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.startContent}>
          <Text style={[styles.startTitle, { color: themeStyle.text }]}>
            Session Error
          </Text>
          <Text style={[styles.startSubtitle, { color: themeStyle.label }]}>
            No active session found. Please go back and start a new session.
          </Text>
          <TouchableOpacity
            style={[styles.startButton, { backgroundColor: '#FF3B30' }]}
            onPress={() => router.back()}
          >
            <Text style={styles.startButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeStyle.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: '#49467E' }]}>
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
            <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>⏱️ Session in Progress</Text>
            <Text style={[styles.duration, { color: '#49467E', fontWeight: 'bold' }]}>Duration: {sessionDuration}</Text>
          </View>
        </View>

        {/* Audio Recording */}
        <View style={[styles.card, { backgroundColor: themeStyle.dashboardcard }]}>
          <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>�️ Audio Recording</Text>
          
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
                      backgroundColor: isRecording ? '#49467E' : '#E0E0E0'
                    }
                  ]}
                />
              ))}
            </View>

            <View style={styles.recordingButtons}>
              {!isRecording ? (
                <TouchableOpacity
                  style={[styles.recordButton, { backgroundColor: '#49467E' }]}
                  onPress={handleStartRecording}
                >
                  <Text style={styles.recordButtonText}>Start Recording</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.recordButton, { backgroundColor: '#E74C3C' }]}
                  onPress={handleStopRecording}
                >
                  <Text style={styles.recordButtonText}>Stop Recording</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Real-time Emotion Analysis */}
        <View style={[styles.card, { backgroundColor: themeStyle.dashboardcard }]}>
          <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>📊 Real-time Emotion Analysis</Text>
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
          <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>💬 Live Transcript</Text>
          <Text style={[styles.subtitle, { color: themeStyle.label }]}>
            Real-time conversation transcription
          </Text>

          <View style={styles.transcriptContainer}>
            {transcript.map((item, index) => (
              <View key={index} style={styles.transcriptItem}>
                <View style={[
                  styles.transcriptBubble,
                  {
                    backgroundColor: item.speaker === 'Therapist' ? '#49467E' : '#F8F9FA',
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
          <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>📝 Additional Notes & Observations</Text>
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
    paddingVertical: 16,
    paddingTop: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
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
  endSessionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
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
    paddingHorizontal: 32,
  },
  startTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  startSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 48,
    lineHeight: 24,
  },
  startButton: {
    backgroundColor: '#49467E',
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 16,
    minWidth: 220,
    alignItems: 'center',
    shadowColor: '#49467E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  startButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(73, 70, 126, 0.1)',
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 20,
    opacity: 0.7,
  },
  duration: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  recordingControls: {
    alignItems: 'center',
  },
  recordingStatus: {
    fontSize: 16,
    marginBottom: 20,
    fontWeight: '500',
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    height: 80,
    marginBottom: 24,
    paddingHorizontal: 30,
    backgroundColor: 'rgba(73, 70, 126, 0.05)',
    borderRadius: 12,
    paddingVertical: 16,
  },
  waveformBar: {
    width: 4,
    marginHorizontal: 1.5,
    borderRadius: 2,
  },
  recordingButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  recordButton: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    minWidth: 140,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  recordButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  emotionContainer: {
    gap: 20,
  },
  emotionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: 'rgba(73, 70, 126, 0.05)',
    padding: 16,
    borderRadius: 12,
  },
  emotionIcon: {
    fontSize: 28,
    width: 40,
  },
  emotionLabel: {
    fontSize: 16,
    fontWeight: '600',
    width: 80,
  },
  progressBar: {
    flex: 1,
    height: 10,
    backgroundColor: '#E0E0E0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  emotionPercentage: {
    fontSize: 16,
    fontWeight: 'bold',
    width: 50,
    textAlign: 'right',
    color: '#49467E',
  },
  transcriptContainer: {
    maxHeight: 350,
    backgroundColor: 'rgba(73, 70, 126, 0.03)',
    borderRadius: 12,
    padding: 16,
  },
  transcriptItem: {
    marginBottom: 16,
  },
  transcriptBubble: {
    borderRadius: 18,
    padding: 16,
    maxWidth: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  transcriptSpeaker: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  transcriptText: {
    fontSize: 15,
    lineHeight: 22,
  },
  transcriptTime: {
    fontSize: 11,
    marginTop: 6,
    fontWeight: '500',
  },
  notesInput: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 140,
    textAlignVertical: 'top',
    lineHeight: 24,
  },
  bottomSpacer: {
    height: 30,
  },
})


