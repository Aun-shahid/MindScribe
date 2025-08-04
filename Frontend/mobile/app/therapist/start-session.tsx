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
    if (sessionStarted && sessionStartTime) {
      interval = setInterval(() => {
        const now = new Date()
        const diff = Math.floor((now.getTime() - sessionStartTime.getTime()) / 1000)
        const minutes = Math.floor(diff / 60)
        const seconds = diff % 60
        setSessionDuration(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [sessionStarted, sessionStartTime])

  const handleStartSession = async () => {
    if (!patientId) {
      Alert.alert('Error', 'No patient selected')
      return
    }

    try {
      setLoading(true)
      
      // Create a new session first
      const createResponse = await api.post('/therapy_sessions/sessions/create/', {
        patient_id: patientId,
        session_type: 'individual',
        is_quick_session: false,
        scheduled_date: new Date().toISOString(),
        location: 'Office',
        is_online: false,
        consent_recording: true,
        consent_ai_analysis: true
      })

      const newSessionId = createResponse.data.id
      setSessionId(newSessionId)

      // Start the session
      const startResponse = await api.post(`/therapy_sessions/sessions/${newSessionId}/start/`, {
        detail: 'Starting therapy session',
        session: {
          status: 'in_progress',
          actual_start_time: new Date().toISOString()
        }
      })

      setSessionStarted(true)
      setSessionStartTime(new Date())
      
      console.log('Session started successfully:', startResponse.data)
      
    } catch (error) {
      console.error('Failed to start session:', error)
      Alert.alert('Error', 'Failed to start session. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleStopRecording = () => {
    setIsRecording(false)
    Alert.alert('Recording Stopped', 'Audio recording has been stopped.')
  }

  const handleStartRecording = () => {
    setIsRecording(true)
    Alert.alert('Recording Started', 'Audio recording has begun.')
  }

  const handleEndSession = async () => {
    if (!sessionId) return

    try {
      Alert.alert(
        'End Session',
        'Are you sure you want to end this session?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'End Session',
            style: 'destructive',
            onPress: async () => {
              setLoading(true)
              try {
                // Prepare end session data with all optional fields
                const endSessionData = {
                  session_notes: notes || '',
                  patient_mood_after: 7, // Default mood rating
                  homework_assigned: '',
                  next_session_goals: '',
                  session_effectiveness: 8 // Default effectiveness rating
                }

                console.log('Ending session with data:', endSessionData)
                
                await api.post(`/therapy_sessions/sessions/${sessionId}/end/`, endSessionData)
                
                console.log('Session ended successfully')
                router.push('./patients')
              } catch (error: any) {
                console.error('Failed to end session:', error)
                
                let errorMessage = 'Failed to end session properly.'
                
                if (error.response) {
                  console.error('Error response:', error.response.data)
                  console.error('Error status:', error.response.status)
                  
                  if (error.response.status === 400) {
                    errorMessage = 'Invalid session data. Please try again.'
                  } else if (error.response.status === 403) {
                    errorMessage = 'You do not have permission to end this session.'
                  } else if (error.response.status === 404) {
                    errorMessage = 'Session not found.'
                  }
                }
                
                Alert.alert('Error', errorMessage)
              } finally {
                setLoading(false)
              }
            }
          }
        ]
      )
    } catch (error) {
      console.error('Error ending session:', error)
    }
  }

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
