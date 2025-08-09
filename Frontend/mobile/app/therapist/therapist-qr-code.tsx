import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Share,
  Dimensions
} from 'react-native'
import { router } from 'expo-router'
import { useTheme } from '../contexts/ThemeContext'
import api from '../utils/api'
import QRCode from 'react-native-qrcode-svg'

const { width } = Dimensions.get('window')

interface TherapistInfo {
  therapist_pin: string
  therapist_id: string
  therapist_name: string
  specialization: string
  clinic_name: string
  patient_count: number
}

const TherapistQRCode = () => {
  const { themeStyle } = useTheme()
  
  const [therapistInfo, setTherapistInfo] = useState<TherapistInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchTherapistInfo()
  }, [])

  const fetchTherapistInfo = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await api.get('/users/therapist-pin/')
      const data = response.data
      
      if (data && data.therapist_pin) {
        setTherapistInfo(data)
        console.log('Therapist QR Code Data:', {
          pin: data.therapist_pin,
          name: data.therapist_name,
          specialization: data.specialization,
          clinic: data.clinic_name,
          patients: data.patient_count
        })
      } else {
        throw new Error('No therapist PIN received from server')
      }
    } catch (error: any) {
      console.error('Failed to fetch therapist info:', error)
      
      let errorMessage = 'Failed to load QR code. Please try again.'
      
      if (error.response?.status === 403) {
        errorMessage = 'Only therapists can access this feature.'
      } else if (error.response?.status === 404) {
        errorMessage = 'Therapist profile not found. Please contact support.'
      } else if (error.response?.status === 401) {
        errorMessage = 'Please log in again to access this feature.'
      }
      
      setError(errorMessage)
      Alert.alert('Error', errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleShare = async () => {
    if (!therapistInfo) return

    try {
      const shareMessage = `Connect to me as your therapist!\n\nTherapist: ${therapistInfo.therapist_name}\nSpecialization: ${therapistInfo.specialization}\n${therapistInfo.clinic_name ? `Clinic: ${therapistInfo.clinic_name}\n` : ''}Therapist PIN: ${therapistInfo.therapist_pin}\n\nScan the QR code or enter this PIN in the patient app to connect.`
      
      await Share.share({
        message: shareMessage,
        title: 'Connect to Your Therapist'
      })
    } catch (error) {
      console.error('Error sharing:', error)
    }
  }

  const handleRefresh = () => {
    fetchTherapistInfo()
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeStyle.background }]}>
        <View style={[styles.header, { backgroundColor: themeStyle.background }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[styles.backButton, { color: themeStyle.text }]}>← Back</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: themeStyle.text }]}>Therapist QR Code</Text>
          <View style={{ width: 60 }} />
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={[styles.loadingText, { color: themeStyle.label }]}>
            Loading your QR code...
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  if (error || !therapistInfo) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeStyle.background }]}>
        <View style={[styles.header, { backgroundColor: themeStyle.background }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[styles.backButton, { color: themeStyle.text }]}>← Back</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: themeStyle.text }]}>Therapist QR Code</Text>
          <View style={{ width: 60 }} />
        </View>
        
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={[styles.errorText, { color: themeStyle.text }]}>
            {error || 'Failed to load QR code'}
          </Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={handleRefresh}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeStyle.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: themeStyle.background }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backButton, { color: themeStyle.text }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: themeStyle.text }]}>Patient Connection</Text>
        <TouchableOpacity onPress={handleShare}>
          <Text style={[styles.shareButton, { color: '#007AFF' }]}>Share</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Therapist Info */}
        <View style={[styles.infoCard, { backgroundColor: themeStyle.dashboardcard }]}>
          <View style={styles.therapistIcon}>
            <Text style={styles.iconText}>👨‍⚕️</Text>
          </View>
          <Text style={[styles.therapistName, { color: themeStyle.text }]}>
            {therapistInfo.therapist_name}
          </Text>
          <Text style={[styles.specialization, { color: themeStyle.label }]}>
            {therapistInfo.specialization}
          </Text>
          {therapistInfo.clinic_name && (
            <Text style={[styles.clinic, { color: themeStyle.label }]}>
              {therapistInfo.clinic_name}
            </Text>
          )}
          <Text style={[styles.patientCount, { color: themeStyle.label }]}>
            {therapistInfo.patient_count} connected patients
          </Text>
        </View>

        {/* QR Code Section */}
        <View style={[styles.qrSection, { backgroundColor: themeStyle.dashboardcard }]}>
          <Text style={[styles.qrTitle, { color: themeStyle.text }]}>
            Patient Connection QR Code
          </Text>
          <Text style={[styles.qrSubtitle, { color: themeStyle.label }]}>
            Show this QR code to patients who want to connect with you
          </Text>

          <View style={styles.qrContainer}>
            <QRCode
              value={therapistInfo.therapist_pin}
              size={Math.min(width * 0.6, 220)}
              backgroundColor="white"
              color="black"
              logoBackgroundColor="transparent"
            />
          </View>

          <View style={styles.pinInfo}>
            <Text style={[styles.pinLabel, { color: themeStyle.label }]}>
              Therapist PIN
            </Text>
            <Text style={[styles.pinValue, { color: themeStyle.text }]}>
              {therapistInfo.therapist_pin}
            </Text>
            <Text style={[styles.pinNote, { color: themeStyle.label }]}>
              Patients can also enter this PIN manually if they cannot scan the QR code
            </Text>
          </View>
        </View>

        {/* Instructions */}
        <View style={[styles.instructionsCard, { backgroundColor: themeStyle.dashboardcard }]}>
          <Text style={[styles.instructionsTitle, { color: themeStyle.text }]}>
            How patients connect:
          </Text>
          <View style={styles.instruction}>
            <Text style={styles.stepNumber}>1</Text>
            <Text style={[styles.stepText, { color: themeStyle.label }]}>
              Patient opens the TherapEase app
            </Text>
          </View>
          <View style={styles.instruction}>
            <Text style={styles.stepNumber}>2</Text>
            <Text style={[styles.stepText, { color: themeStyle.label }]}>
              They scan this QR code or enter your PIN
            </Text>
          </View>
          <View style={styles.instruction}>
            <Text style={styles.stepNumber}>3</Text>
            <Text style={[styles.stepText, { color: themeStyle.label }]}>
              Connection is established automatically
            </Text>
          </View>
        </View>

        {/* Refresh Button */}
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={handleRefresh}
        >
          <Text style={styles.refreshButtonText}>🔄 Refresh QR Code</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

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
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    fontSize: 16,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  shareButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorIcon: {
    fontSize: 50,
    marginBottom: 15,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  infoCard: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  therapistIcon: {
    marginBottom: 10,
  },
  iconText: {
    fontSize: 40,
  },
  therapistName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
  },
  specialization: {
    fontSize: 16,
    marginBottom: 5,
    textAlign: 'center',
  },
  clinic: {
    fontSize: 14,
    marginBottom: 5,
    textAlign: 'center',
  },
  patientCount: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  qrSection: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  qrTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 5,
    textAlign: 'center',
  },
  qrSubtitle: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  qrContainer: {
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  pinInfo: {
    alignItems: 'center',
  },
  pinLabel: {
    fontSize: 14,
    marginBottom: 5,
  },
  pinValue: {
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 10,
    fontFamily: 'monospace',
  },
  pinNote: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  instructionsCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
  },
  instruction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  stepNumber: {
    backgroundColor: '#007AFF',
    color: 'white',
    width: 24,
    height: 24,
    borderRadius: 12,
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 12,
    fontWeight: 'bold',
    marginRight: 12,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  refreshButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  refreshButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
})

export default TherapistQRCode
