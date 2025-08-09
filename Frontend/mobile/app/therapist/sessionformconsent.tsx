import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useTheme } from '../contexts/ThemeContext'
import api from '../utils/api'

const SessionFormConsent = () => {
  const { themeStyle } = useTheme()
  const { patientId, patientName, isNewPatient } = useLocalSearchParams()
  
  const [submitting, setSubmitting] = useState(false)
  const [consentData, setConsentData] = useState({
    session_type: 'individual',
    duration_minutes: 60 as number | string,
    location: 'Office',
    patient_goals: '',
    fee_charged: 0,
    is_online: false,
    consent_recording: false,
    consent_ai_analysis: false
  })

  // Clear form data when component mounts, patientId changes, or when it's a new patient
  useEffect(() => {
    console.log('Clearing form data for patient:', patientName, 'isNewPatient:', isNewPatient)
    setConsentData({
      session_type: 'individual',
      duration_minutes: 60,
      location: 'Office',
      patient_goals: '',
      fee_charged: 0,
      is_online: false,
      consent_recording: false,
      consent_ai_analysis: false
    })
  }, [patientId, patientName, isNewPatient])

  const handleConsentAndStartSession = async () => {
    try {
      setSubmitting(true)

      // Validation
      if (!consentData.patient_goals.trim()) {
        Alert.alert('Error', 'Session goals are required')
        return
      }

      if (!consentData.consent_recording || !consentData.consent_ai_analysis) {
        Alert.alert('Error', 'Both recording and AI analysis consent are required to proceed.')
        return
      }

      // Step 1: Create a new session (using exact same structure that worked in modal)
      const createSessionData = {
        patient_id: patientId,
        session_type: consentData.session_type,
        scheduled_date: new Date().toISOString(),
        duration_minutes: typeof consentData.duration_minutes === 'string' 
          ? (consentData.duration_minutes === '' ? 60 : parseInt(consentData.duration_minutes)) 
          : consentData.duration_minutes,
        location: consentData.location,
        is_online: consentData.is_online,
        patient_goals: consentData.patient_goals,
        fee_charged: consentData.fee_charged,
        consent_recording: consentData.consent_recording,
        consent_ai_analysis: consentData.consent_ai_analysis
      }
      
      console.log('Creating session with data:', createSessionData)
      const createResponse = await api.post('/therapy_sessions/sessions/create/', createSessionData)
      
      if (!createResponse.data?.id) {
        throw new Error('Session creation failed - no session ID returned')
      }
      
      const sessionId = createResponse.data.id
      console.log('Session created successfully with ID:', sessionId)
      
      // Step 2: Start the session (same as original modal)
      const startSessionData = {
        detail: "Starting therapy session",
        session: {
          status: "in_progress",
          actual_start_time: new Date().toISOString()
        }
      }
      
      console.log('Starting session with ID:', sessionId)
      const startResponse = await api.post(`/therapy_sessions/sessions/${sessionId}/start/`, startSessionData)
      
      console.log('Session started successfully:', startResponse.data)
      
      // Step 3: Navigate to the session UI (same as original modal)
      router.push({
        pathname: './start-session',
        params: { 
          patientId: patientId,
          sessionId: sessionId,
          sessionStarted: 'true'
        }
      })

    } catch (error: any) {
      console.error('❌ Failed to create session:', error)
      
      let errorMessage = 'Failed to create session. Please try again.'
      if (error.response?.status === 400) {
        const errorData = error.response.data
        if (typeof errorData === 'object') {
          const errorFields = Object.keys(errorData).join(', ')
          errorMessage = `Invalid data in fields: ${errorFields}`
        } else {
          errorMessage = `Invalid data: ${errorData}`
        }
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error. Please check backend connection.'
      }
      
      Alert.alert('Error', errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeStyle.background }]}>
      <View style={[styles.header, { backgroundColor: '#007AFF' }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.closeText}>×</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Session Consent & Setup</Text>
        <View style={{ width: 24 }} />
      </View>
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>
          Session Information
        </Text>
        
        <Text style={[styles.patientInfo, { color: themeStyle.label }]}>
          Patient: {patientName || 'Unknown Patient'}
        </Text>

        <View style={styles.inputRow}>
          <View style={styles.halfInput}>
            <Text style={[styles.inputLabel, { color: themeStyle.text }]}>Session Type</Text>
            <View style={[styles.pickerContainer, { backgroundColor: themeStyle.dashboardcard, borderColor: themeStyle.border }]}>
              <Text style={[styles.pickerText, { color: themeStyle.text }]}>
                {consentData.session_type}
              </Text>
            </View>
          </View>
          
          <View style={styles.halfInput}>
            <Text style={[styles.inputLabel, { color: themeStyle.text }]}>Duration (min)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: themeStyle.dashboardcard, color: themeStyle.text, borderColor: themeStyle.border }]}
              value={consentData.duration_minutes.toString()}
              onChangeText={(text) => {
                // Allow empty string or valid numbers
                if (text === '') {
                  setConsentData(prev => ({ ...prev, duration_minutes: '' }))
                } else {
                  const numValue = parseInt(text)
                  if (!isNaN(numValue)) {
                    setConsentData(prev => ({ ...prev, duration_minutes: numValue }))
                  }
                }
              }}
              keyboardType="numeric"
              placeholder="60"
              placeholderTextColor={themeStyle.label}
            />
          </View>
        </View>

        <Text style={[styles.inputLabel, { color: themeStyle.text }]}>Location</Text>
        <TextInput
          style={[styles.input, { backgroundColor: themeStyle.dashboardcard, color: themeStyle.text, borderColor: themeStyle.border }]}
          value={consentData.location}
          onChangeText={(text) => setConsentData(prev => ({ ...prev, location: text }))}
          placeholder="Office, Room 101"
          placeholderTextColor={themeStyle.label}
        />

        <Text style={[styles.inputLabel, { color: themeStyle.text }]}>Session Goals *</Text>
        <TextInput
          style={[styles.input, styles.textArea, { backgroundColor: themeStyle.dashboardcard, color: themeStyle.text, borderColor: themeStyle.border }]}
          value={consentData.patient_goals}
          onChangeText={(text) => setConsentData(prev => ({ ...prev, patient_goals: text }))}
          placeholder="What do you hope to accomplish in this session?"
          placeholderTextColor={themeStyle.label}
          multiline
        />

        <Text style={[styles.inputLabel, { color: themeStyle.text }]}>Fee Charged</Text>
        <TextInput
          style={[styles.input, { backgroundColor: themeStyle.dashboardcard, color: themeStyle.text, borderColor: themeStyle.border }]}
          value={consentData.fee_charged.toString()}
          onChangeText={(text) => setConsentData(prev => ({ ...prev, fee_charged: parseFloat(text) || 0 }))}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor={themeStyle.label}
        />

        <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>
          Consent & Permissions
        </Text>

        <TouchableOpacity
          style={[styles.checkboxContainer, { borderColor: themeStyle.border }]}
          onPress={() => setConsentData(prev => ({ ...prev, is_online: !prev.is_online }))}
        >
          <View style={[styles.checkbox, consentData.is_online && styles.checkboxChecked]}>
            {consentData.is_online && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={[styles.checkboxLabel, { color: themeStyle.text }]}>
            This is an online session
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.checkboxContainer, { borderColor: themeStyle.border }]}
          onPress={() => setConsentData(prev => ({ ...prev, consent_recording: !prev.consent_recording }))}
        >
          <View style={[styles.checkbox, consentData.consent_recording && styles.checkboxChecked]}>
            {consentData.consent_recording && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={[styles.checkboxLabel, { color: themeStyle.text }]}>
            I consent to audio recording of this session *
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.checkboxContainer, { borderColor: themeStyle.border }]}
          onPress={() => setConsentData(prev => ({ ...prev, consent_ai_analysis: !prev.consent_ai_analysis }))}
        >
          <View style={[styles.checkbox, consentData.consent_ai_analysis && styles.checkboxChecked]}>
            {consentData.consent_ai_analysis && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={[styles.checkboxLabel, { color: themeStyle.text }]}>
            I consent to AI analysis of session content for therapeutic insights *
          </Text>
        </TouchableOpacity>

        <Text style={[styles.consentNote, { color: themeStyle.label }]}>
          * Required for session creation. The recording and AI analysis help provide better therapeutic insights and session documentation.
        </Text>

        <View style={styles.buttons}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={() => router.back()}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.confirmButton]}
            onPress={handleConsentAndStartSession}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.confirmButtonText}>Start Session</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.formSpacer} />
      </ScrollView>
    </SafeAreaView>
  )
}

export default SessionFormConsent

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
  closeText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    marginTop: 20,
  },
  patientInfo: {
    fontSize: 16,
    marginBottom: 20,
    fontWeight: '500',
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  halfInput: {
    flex: 1,
    marginHorizontal: 4,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  pickerText: {
    fontSize: 16,
    textTransform: 'capitalize',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    paddingVertical: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#ccc',
    borderRadius: 4,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  checkmark: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  consentNote: {
    fontSize: 12,
    marginTop: 16,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
    paddingHorizontal: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#007AFF',
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  formSpacer: {
    height: 40,
  },
})
