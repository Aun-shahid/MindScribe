import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native'
import React, { useState, useEffect } from 'react'
import { router, useLocalSearchParams } from 'expo-router'
import { useTheme } from '../contexts/ThemeContext'
import api from '../utils/api'

type PatientDetailsType = {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
  date_of_birth: string;
  gender: string;
  patient_profile: {
    patient_id: string;
    primary_concern: string;
    therapy_start_date: string;
    session_frequency: string;
    preferred_session_days: string[];
    emergency_contact_name: string;
    emergency_contact_phone: string;
    preferred_language: string;
    connected_at: string;
  } | null;
  last_session: string | null;
  next_session: string | null;
  total_sessions: string;
  created_at: string;
}

const PatientDetails = () => {
  const { themeStyle } = useTheme()
  const { patientId } = useLocalSearchParams()
  
  const [patient, setPatient] = useState<PatientDetailsType | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchPatientDetails = async () => {
    try {
      setLoading(true)
      
      // Fetch patient details
      const response = await api.get(`/therapy_sessions/patients/`)
      if (response.data && Array.isArray(response.data)) {
        // Find the patient by ID from the list
        const foundPatient = response.data.find((p: PatientDetailsType) => p.id === patientId)
        if (foundPatient) {
          console.log('Found patient data:', JSON.stringify(foundPatient, null, 2))
          
          // Clean the patient data to ensure safe rendering
          const cleanedPatient = {
            ...foundPatient,
            last_session: typeof foundPatient.last_session === 'string' 
              ? foundPatient.last_session 
              : foundPatient.last_session 
                ? JSON.stringify(foundPatient.last_session) 
                : null,
            next_session: typeof foundPatient.next_session === 'string' 
              ? foundPatient.next_session 
              : foundPatient.next_session 
                ? JSON.stringify(foundPatient.next_session) 
                : null,
          }
          setPatient(cleanedPatient)
          
        } else {
          Alert.alert('Error', 'Patient not found')
          router.push('./patients')
        }
      } else {
        Alert.alert('Error', 'Patient not found')
        router.push('./patients')
      }
    } catch (error) {
      console.error('Failed to fetch patient details:', error)
      Alert.alert('Error', 'Failed to load patient details')
      router.push('./patients')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (patientId) {
      fetchPatientDetails()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId])

  const handleStartSession = () => {
    router.push({
      pathname: './start-session',
      params: { patientId: patient?.id }
    })
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeStyle.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeStyle.text} />
          <Text style={[styles.loadingText, { color: themeStyle.label }]}>Loading patient details...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!patient) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeStyle.background }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: themeStyle.error }]}>Patient not found</Text>
          <TouchableOpacity 
            style={[styles.backButton, { backgroundColor: themeStyle.logoutButton }]}
            onPress={() => router.back()}
          >
            <Text style={[styles.backButtonText, { color: themeStyle.logoutText }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeStyle.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: '#00B894' }]}>
        <TouchableOpacity onPress={() => router.push('./patients')}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Patient Details</Text>
        <TouchableOpacity onPress={handleStartSession}>
          <Text style={styles.sessionText} onPress={handleStartSession}>Start Session</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Basic Information */}
        <View style={[styles.section, { backgroundColor: themeStyle.dashboardcard }]}>
          <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>Basic Information</Text>
          
          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: themeStyle.label }]}>Full Name:</Text>
            <Text style={[styles.value, { color: themeStyle.text }]}>{patient.full_name}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: themeStyle.label }]}>Email:</Text>
            <Text style={[styles.value, { color: themeStyle.text }]}>{patient.email}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: themeStyle.label }]}>Phone:</Text>
            <Text style={[styles.value, { color: themeStyle.text }]}>{patient.phone_number || 'Not provided'}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: themeStyle.label }]}>Date of Birth:</Text>
            <Text style={[styles.value, { color: themeStyle.text }]}>{patient.date_of_birth || 'Not provided'}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: themeStyle.label }]}>Gender:</Text>
            <Text style={[styles.value, { color: themeStyle.text }]}>{patient.gender || 'Not specified'}</Text>
          </View>
        </View>

        {/* Therapy Information */}
        {(patient.patient_profile?.primary_concern || patient.patient_profile?.therapy_start_date || patient.patient_profile?.session_frequency) && (
          <View style={[styles.section, { backgroundColor: themeStyle.dashboardcard }]}>
            <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>Therapy Information</Text>
            
            {patient.patient_profile?.primary_concern && (
              <View style={styles.infoRow}>
                <Text style={[styles.label, { color: themeStyle.label }]}>Primary Concern:</Text>
                <Text style={[styles.value, { color: themeStyle.text }]}>{patient.patient_profile.primary_concern}</Text>
              </View>
            )}
            
            {patient.patient_profile?.therapy_start_date && (
              <View style={styles.infoRow}>
                <Text style={[styles.label, { color: themeStyle.label }]}>Therapy Start:</Text>
                <Text style={[styles.value, { color: themeStyle.text }]}>{patient.patient_profile.therapy_start_date}</Text>
              </View>
            )}
            
            {patient.patient_profile?.session_frequency && (
              <View style={styles.infoRow}>
                <Text style={[styles.label, { color: themeStyle.label }]}>Session Frequency:</Text>
                <Text style={[styles.value, { color: themeStyle.text }]}>{patient.patient_profile.session_frequency}</Text>
              </View>
            )}
          </View>
        )}

        {/* Emergency Contact */}
        {(patient.patient_profile?.emergency_contact_name || patient.patient_profile?.emergency_contact_phone) && (
          <View style={[styles.section, { backgroundColor: themeStyle.dashboardcard }]}>
            <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>Emergency Contact</Text>
            
            {patient.patient_profile?.emergency_contact_name && (
              <View style={styles.infoRow}>
                <Text style={[styles.label, { color: themeStyle.label }]}>Name:</Text>
                <Text style={[styles.value, { color: themeStyle.text }]}>{patient.patient_profile.emergency_contact_name}</Text>
              </View>
            )}
            
            {patient.patient_profile?.emergency_contact_phone && (
              <View style={styles.infoRow}>
                <Text style={[styles.label, { color: themeStyle.label }]}>Phone:</Text>
                <Text style={[styles.value, { color: themeStyle.text }]}>{patient.patient_profile.emergency_contact_phone}</Text>
              </View>
            )}
          </View>
        )}

        {/* Additional Information */}
        <View style={[styles.section, { backgroundColor: themeStyle.dashboardcard }]}>
          <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>Additional Information</Text>
          
          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: themeStyle.label }]}>Preferred Language:</Text>
            <Text style={[styles.value, { color: themeStyle.text }]}>{patient.patient_profile?.preferred_language || 'English'}</Text>
          </View>
          
          {patient.patient_profile?.preferred_session_days && patient.patient_profile.preferred_session_days.length > 0 && (
            <View style={styles.infoColumn}>
              <Text style={[styles.label, { color: themeStyle.label }]}>Preferred Session Days:</Text>
              <Text style={[styles.value, { color: themeStyle.text }]}>
                {patient.patient_profile.preferred_session_days.join(', ')}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  )
}

export default PatientDetails

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
  sessionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoColumn: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  value: {
    fontSize: 14,
    flex: 2,
    textAlign: 'right',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 20,
  },
})
