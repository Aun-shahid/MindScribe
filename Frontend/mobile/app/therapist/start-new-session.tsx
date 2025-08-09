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
import { router } from 'expo-router'
import { useTheme } from '../contexts/ThemeContext'
import api from '../utils/api'
import QRCode from 'react-native-qrcode-svg'

type Patient = {
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

const StartNewSession = () => {
  const { themeStyle } = useTheme()
  
  const [activeTab, setActiveTab] = useState('existing') // 'existing' or 'new'
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  
  // QR Code related state
  const [therapistPin, setTherapistPin] = useState<string | null>(null)
  const [qrLoading, setQrLoading] = useState(false)
  const [qrError, setQrError] = useState<string | null>(null)
  
  // New patient form state
  const [newPatient, setNewPatient] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    date_of_birth: '',
    gender: 'male',
    primary_concern: '',
    therapy_start_date: new Date().toISOString().split('T')[0],
    session_frequency: 'weekly',
    preferred_session_days: [] as string[],
    emergency_contact_name: '',
    emergency_contact_phone: '',
    address: '',
    medical_history: '',
    current_medications: '',
    preferred_language: 'en'
  })

  useEffect(() => {
    if (activeTab === 'existing') {
      fetchPatients()
    } else if (activeTab === 'new') {
      fetchTherapistPin()
    }
  }, [activeTab])

  const fetchTherapistPin = async () => {
    try {
      setQrLoading(true)
      setQrError(null)
      
      const response = await api.get('/users/therapist-pin/')
      const pinData = response.data
      
      if (pinData && pinData.therapist_pin) {
        setTherapistPin(pinData.therapist_pin)
        console.log('Therapist PIN retrieved:', pinData.therapist_pin)
        console.log('Therapist Info:', {
          name: pinData.therapist_name,
          specialization: pinData.specialization,
          clinic: pinData.clinic_name,
          patients: pinData.patient_count
        })
      } else {
        throw new Error('No PIN received from server')
      }
    } catch (error: any) {
      console.error('Failed to fetch therapist PIN:', error)
      setQrError('Failed to generate QR code. Please try again.')
      
      if (error.response?.status === 403) {
        Alert.alert('Error', 'Only therapists can access this feature.')
      } else if (error.response?.status === 404) {
        Alert.alert('Error', 'Therapist profile not found. Please contact support.')
      } else {
        Alert.alert('Error', 'Failed to load QR code. Please check your connection and try again.')
      }
    } finally {
      setQrLoading(false)
    }
  }

  const fetchPatients = async () => {
    try {
      setLoading(true)
      const response = await api.get('/therapy_sessions/patients/')
      const patientsData = response.data || []
      
      // Clean patient data
      const cleanedPatients = patientsData.map((patient: any) => ({
        id: patient.id?.toString() || '',
        full_name: typeof patient.full_name === 'string' ? patient.full_name : 'Unknown Patient',
        email: typeof patient.email === 'string' ? patient.email : '',
        phone_number: typeof patient.phone_number === 'string' ? patient.phone_number : '',
        date_of_birth: typeof patient.date_of_birth === 'string' ? patient.date_of_birth : '',
        gender: typeof patient.gender === 'string' ? patient.gender : '',
        patient_profile: patient.patient_profile && typeof patient.patient_profile === 'object' ? {
          patient_id: patient.patient_profile.patient_id?.toString() || '',
          primary_concern: typeof patient.patient_profile.primary_concern === 'string' ? patient.patient_profile.primary_concern : 'General therapy',
          therapy_start_date: typeof patient.patient_profile.therapy_start_date === 'string' ? patient.patient_profile.therapy_start_date : '',
          session_frequency: typeof patient.patient_profile.session_frequency === 'string' ? patient.patient_profile.session_frequency : '',
          preferred_session_days: Array.isArray(patient.patient_profile.preferred_session_days) ? patient.patient_profile.preferred_session_days : [],
          emergency_contact_name: typeof patient.patient_profile.emergency_contact_name === 'string' ? patient.patient_profile.emergency_contact_name : '',
          emergency_contact_phone: typeof patient.patient_profile.emergency_contact_phone === 'string' ? patient.patient_profile.emergency_contact_phone : '',
          preferred_language: typeof patient.patient_profile.preferred_language === 'string' ? patient.patient_profile.preferred_language : '',
          connected_at: typeof patient.patient_profile.connected_at === 'string' ? patient.patient_profile.connected_at : ''
        } : null,
        last_session: typeof patient.last_session === 'string' ? patient.last_session : null,
        next_session: typeof patient.next_session === 'string' ? patient.next_session : null,
        total_sessions: patient.total_sessions?.toString() || '0',
        created_at: typeof patient.created_at === 'string' ? patient.created_at : ''
      }))
      
      setPatients(cleanedPatients)
    } catch (error) {
      console.error('Failed to fetch patients:', error)
      Alert.alert('Error', 'Failed to load patients')
    } finally {
      setLoading(false)
    }
  }

  const filteredPatients = patients.filter(patient => 
    patient.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient)
  }

  const handleStartSession = () => {
    if (!selectedPatient) {
      Alert.alert('Error', 'Please select a patient first')
      return
    }
    
    // Navigate to sessionformconsent page with existing patient
    router.push({
      pathname: './sessionformconsent',
      params: {
        patientId: selectedPatient.id,
        patientName: selectedPatient.full_name,
        isNewPatient: 'false'
      }
    })
  }

  const handleCreatePatientAndStartSession = async () => {
    // Validation for new patient
    if (!newPatient.first_name || !newPatient.last_name || !newPatient.phone_number) {
      Alert.alert('Error', 'Please fill in all required fields (First Name, Last Name, Phone Number)')
      return
    }

    // Email validation (if provided)
    if (newPatient.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(newPatient.email)) {
        Alert.alert('Error', 'Please enter a valid email address')
        return
      }
    }

    try {
      // Create patient first
      const patientData = {
        first_name: newPatient.first_name.trim(),
        last_name: newPatient.last_name.trim(),
        email: newPatient.email.trim().toLowerCase() || '',
        phone_number: newPatient.phone_number.trim(),
        date_of_birth: newPatient.date_of_birth || '',
        gender: newPatient.gender,
        primary_concern: newPatient.primary_concern.trim() || '',
        therapy_start_date: newPatient.therapy_start_date,
        session_frequency: newPatient.session_frequency,
        preferred_session_days: newPatient.preferred_session_days,
        emergency_contact_name: newPatient.emergency_contact_name.trim() || '',
        emergency_contact_phone: newPatient.emergency_contact_phone.trim() || '',
        address: newPatient.address.trim() || '',
        medical_history: newPatient.medical_history.trim() || '',
        current_medications: newPatient.current_medications.trim() || '',
        preferred_language: newPatient.preferred_language
      }
      
      const response = await api.post('/therapy_sessions/patients/create/', patientData)
      
      if (response.data && response.data.patient) {
        const createdPatient = response.data.patient
        
        // Navigate to sessionformconsent with new patient and clear flag
        router.push({
          pathname: './sessionformconsent',
          params: {
            patientId: createdPatient.id,
            patientName: createdPatient.full_name,
            isNewPatient: 'true'
          }
        })
        
        Alert.alert('Success', `Patient ${createdPatient.full_name} created successfully!`)
      }
    } catch (error: any) {
      console.error('Error creating patient:', error)
      Alert.alert('Error', 'Failed to create patient. Please try again.')
    }
  }

  const renderExistingPatients = () => (
    <View style={styles.tabContent}>
      <Text style={[styles.subtitle, { color: themeStyle.label }]}>
        Choose an existing patient or add a new one
      </Text>

      {/* Search Patients */}
      <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>Search Patients</Text>
      <TextInput
        style={[styles.searchInput, { 
          backgroundColor: themeStyle.dashboardcard,
          color: themeStyle.text,
          borderColor: themeStyle.border 
        }]}
        placeholder="Type patient name..."
        placeholderTextColor={themeStyle.label}
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {/* Patients List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeStyle.text} />
        </View>
      ) : (
        <ScrollView style={styles.patientsList}>
          {filteredPatients.map((patient) => (
            <TouchableOpacity
              key={patient.id}
              style={[
                styles.patientItem,
                { 
                  backgroundColor: themeStyle.dashboardcard,
                  borderColor: selectedPatient?.id === patient.id ? '#007AFF' : themeStyle.border
                }
              ]}
              onPress={() => handlePatientSelect(patient)}
            >
              <View style={styles.patientInfo}>
                <Text style={[styles.patientName, { color: themeStyle.text }]}>
                  {patient.full_name}
                </Text>
                <Text style={[styles.patientAge, { color: themeStyle.label }]}>
                  {patient.patient_profile?.primary_concern || 'General therapy'}
                </Text>
              </View>
              {selectedPatient?.id === patient.id && (
                <View style={styles.checkmark}>
                  <Text style={styles.checkmarkText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  )

  const renderNewPatient = () => (
    <ScrollView style={styles.tabContent}>
      <Text style={[styles.subtitle, { color: themeStyle.label }]}>
        Add a new patient and start session immediately
      </Text>
      
      {/* QR Code Section */}
      <View style={styles.qrContainer}>
        <View style={styles.qrIconContainer}>
          <Text style={styles.qrIcon}>📱</Text>
        </View>
        
        <Text style={[styles.qrTitle, { color: themeStyle.text }]}>
          New Patient Connection
        </Text>
        
        <Text style={[styles.qrSubtitle, { color: themeStyle.label }]}>
          Show this QR code to your patient to establish connection
        </Text>
        
        {/* QR Code Display */}
        <View style={[styles.qrCodeContainer, { backgroundColor: qrLoading || qrError ? themeStyle.dashboardcard : 'white' }]}>
          {qrLoading ? (
            <View style={styles.qrLoadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={[styles.qrLoadingText, { color: themeStyle.label }]}>
                Generating QR Code...
              </Text>
            </View>
          ) : qrError ? (
            <View style={styles.qrErrorContainer}>
              <Text style={styles.qrErrorIcon}>⚠️</Text>
              <Text style={[styles.qrErrorText, { color: themeStyle.text }]}>
                {qrError}
              </Text>
              <TouchableOpacity 
                style={[styles.retryButton, { backgroundColor: '#007AFF' }]}
                onPress={fetchTherapistPin}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : therapistPin ? (
            <View style={styles.qrCodeSuccess}>
              <QRCode
                value={therapistPin}
                size={150}
                backgroundColor="white"
                color="black"
                logoBackgroundColor="transparent"
              />
              <View style={styles.qrCodeInfo}>
                <Text style={[styles.pinDisplay, { color: themeStyle.text }]}>
                  PIN: {therapistPin}
                </Text>
                <Text style={[styles.pinSubtext, { color: themeStyle.label }]}>
                  Patients can also enter this PIN manually
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.qrPlaceholder}>
              <Text style={[styles.qrCodeText, { color: themeStyle.label }]}>
                QR Code will be generated here
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Patient Form Section */}
      <View style={styles.formDivider} />
      
      <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>Patient Information</Text>
      
      {/* Basic Information */}
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.formInput, styles.formHalfInput, { backgroundColor: themeStyle.dashboardcard, color: themeStyle.text }]}
          placeholder="First Name *"
          placeholderTextColor={themeStyle.label}
          value={newPatient.first_name}
          onChangeText={(text) => setNewPatient({...newPatient, first_name: text})}
        />
        <TextInput
          style={[styles.formInput, styles.formHalfInput, { backgroundColor: themeStyle.dashboardcard, color: themeStyle.text }]}
          placeholder="Last Name *"
          placeholderTextColor={themeStyle.label}
          value={newPatient.last_name}
          onChangeText={(text) => setNewPatient({...newPatient, last_name: text})}
        />
      </View>

      <TextInput
        style={[styles.formInput, { backgroundColor: themeStyle.dashboardcard, color: themeStyle.text }]}
        placeholder="Phone Number *"
        placeholderTextColor={themeStyle.label}
        value={newPatient.phone_number}
        onChangeText={(text) => setNewPatient({...newPatient, phone_number: text})}
        keyboardType="phone-pad"
      />

      <TextInput
        style={[styles.formInput, { backgroundColor: themeStyle.dashboardcard, color: themeStyle.text }]}
        placeholder="Email (Optional)"
        placeholderTextColor={themeStyle.label}
        value={newPatient.email}
        onChangeText={(text) => setNewPatient({...newPatient, email: text})}
        keyboardType="email-address"
      />

      <TextInput
        style={[styles.formInput, { backgroundColor: themeStyle.dashboardcard, color: themeStyle.text }]}
        placeholder="Primary Concern"
        placeholderTextColor={themeStyle.label}
        value={newPatient.primary_concern}
        onChangeText={(text) => setNewPatient({...newPatient, primary_concern: text})}
      />

      <TextInput
        style={[styles.formInput, { backgroundColor: themeStyle.dashboardcard, color: themeStyle.text }]}
        placeholder="Date of Birth (YYYY-MM-DD)"
        placeholderTextColor={themeStyle.label}
        value={newPatient.date_of_birth}
        onChangeText={(text) => setNewPatient({...newPatient, date_of_birth: text})}
      />

      <TextInput
        style={[styles.formInput, { backgroundColor: themeStyle.dashboardcard, color: themeStyle.text }]}
        placeholder="Therapy Start Date (YYYY-MM-DD)"
        placeholderTextColor={themeStyle.label}
        value={newPatient.therapy_start_date}
        onChangeText={(text) => setNewPatient({...newPatient, therapy_start_date: text})}
      />

      {/* Gender Selection */}
      <Text style={[styles.fieldLabel, { color: themeStyle.text }]}>Gender</Text>
      <View style={styles.genderContainer}>
        {['male', 'female', 'other', 'prefer_not_to_say'].map((gender) => (
          <TouchableOpacity
            key={gender}
            style={[
              styles.genderButton,
              newPatient.gender === gender && styles.genderButtonSelected
            ]}
            onPress={() => setNewPatient({...newPatient, gender})}
          >
            <Text style={[
              styles.genderButtonText,
              newPatient.gender === gender && styles.genderButtonTextSelected
            ]}>
              {gender.replace('_', ' ').charAt(0).toUpperCase() + gender.replace('_', ' ').slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Session Frequency */}
      <Text style={[styles.fieldLabel, { color: themeStyle.text }]}>Session Frequency</Text>
      <View style={styles.genderContainer}>
        {[
          { value: 'weekly', label: 'Weekly' },
          { value: 'biweekly', label: 'Bi-weekly' },
          { value: 'monthly', label: 'Monthly' },
          { value: 'as_needed', label: 'As Needed' }
        ].map((freq) => (
          <TouchableOpacity
            key={freq.value}
            style={[
              styles.genderButton,
              newPatient.session_frequency === freq.value && styles.genderButtonSelected
            ]}
            onPress={() => setNewPatient({...newPatient, session_frequency: freq.value})}
          >
            <Text style={[
              styles.genderButtonText,
              newPatient.session_frequency === freq.value && styles.genderButtonTextSelected
            ]}>
              {freq.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Preferred Session Days */}
      <Text style={[styles.fieldLabel, { color: themeStyle.text }]}>Preferred Session Days</Text>
      <View style={styles.daysContainer}>
        {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
          <TouchableOpacity
            key={day}
            style={[
              styles.dayButton,
              newPatient.preferred_session_days.includes(day) && styles.dayButtonSelected
            ]}
            onPress={() => {
              const updatedDays = newPatient.preferred_session_days.includes(day)
                ? newPatient.preferred_session_days.filter(d => d !== day)
                : [...newPatient.preferred_session_days, day]
              setNewPatient({...newPatient, preferred_session_days: updatedDays})
            }}
          >
            <Text style={[
              styles.dayButtonText,
              newPatient.preferred_session_days.includes(day) && styles.dayButtonTextSelected
            ]}>
              {day.substring(0, 3)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Emergency Contact */}
      <Text style={[styles.fieldLabel, { color: themeStyle.text }]}>Emergency Contact</Text>
      
      <TextInput
        style={[styles.formInput, { backgroundColor: themeStyle.dashboardcard, color: themeStyle.text }]}
        placeholder="Emergency Contact Name"
        placeholderTextColor={themeStyle.label}
        value={newPatient.emergency_contact_name}
        onChangeText={(text) => setNewPatient({...newPatient, emergency_contact_name: text})}
      />

      <TextInput
        style={[styles.formInput, { backgroundColor: themeStyle.dashboardcard, color: themeStyle.text }]}
        placeholder="Emergency Contact Phone"
        placeholderTextColor={themeStyle.label}
        value={newPatient.emergency_contact_phone}
        onChangeText={(text) => setNewPatient({...newPatient, emergency_contact_phone: text})}
        keyboardType="phone-pad"
      />

      {/* Address Information */}
      <Text style={[styles.fieldLabel, { color: themeStyle.text }]}>Address Information</Text>
      
      <TextInput
        style={[styles.formInput, styles.textArea, { backgroundColor: themeStyle.dashboardcard, color: themeStyle.text }]}
        placeholder="Complete Address"
        placeholderTextColor={themeStyle.label}
        value={newPatient.address}
        onChangeText={(text) => setNewPatient({...newPatient, address: text})}
        multiline
        numberOfLines={3}
      />

      {/* Medical Information */}
      <Text style={[styles.fieldLabel, { color: themeStyle.text }]}>Medical Information</Text>
      
      <TextInput
        style={[styles.formInput, styles.textArea, { backgroundColor: themeStyle.dashboardcard, color: themeStyle.text }]}
        placeholder="Medical History"
        placeholderTextColor={themeStyle.label}
        value={newPatient.medical_history}
        onChangeText={(text) => setNewPatient({...newPatient, medical_history: text})}
        multiline
        numberOfLines={3}
      />

      <TextInput
        style={[styles.formInput, styles.textArea, { backgroundColor: themeStyle.dashboardcard, color: themeStyle.text }]}
        placeholder="Current Medications"
        placeholderTextColor={themeStyle.label}
        value={newPatient.current_medications}
        onChangeText={(text) => setNewPatient({...newPatient, current_medications: text})}
        multiline
        numberOfLines={3}
      />

      {/* Preferred Language */}
      <Text style={[styles.fieldLabel, { color: themeStyle.text }]}>Preferred Language</Text>
      <View style={styles.genderContainer}>
        {[
          { value: 'en', label: 'English' },
          { value: 'ur', label: 'Urdu' }
        ].map((lang) => (
          <TouchableOpacity
            key={lang.value}
            style={[
              styles.genderButton,
              newPatient.preferred_language === lang.value && styles.genderButtonSelected
            ]}
            onPress={() => setNewPatient({...newPatient, preferred_language: lang.value})}
          >
            <Text style={[
              styles.genderButtonText,
              newPatient.preferred_language === lang.value && styles.genderButtonTextSelected
            ]}>
              {lang.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

    </ScrollView>
  )

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeStyle.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: themeStyle.background }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backButton, { color: themeStyle.text }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: themeStyle.text }]}>Select Patient</Text>
        <View style={{ width: 30 }} />
      </View>

      {/* Tab Buttons */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'existing' && styles.activeTab
          ]}
          onPress={() => setActiveTab('existing')}
        >
          <Text style={[
            styles.tabButtonText,
            { color: activeTab === 'existing' ? '#fff' : themeStyle.text }
          ]}>
            🔍 Existing Patient
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'new' && styles.activeTab
          ]}
          onPress={() => setActiveTab('new')}
        >
          <Text style={[
            styles.tabButtonText,
            { color: activeTab === 'new' ? '#fff' : themeStyle.text }
          ]}>
            👤 New Patient
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'existing' ? renderExistingPatients() : renderNewPatient()}

      {/* Patient Consent Section (only for existing patients) */}
      {/* {activeTab === 'existing' && selectedPatient && (
        <View style={[styles.consentSection, { backgroundColor: themeStyle.dashboardcard }]}>
          <Text style={[styles.consentTitle, { color: themeStyle.text }]}>Patient Consent</Text>
          <Text style={[styles.consentSubtitle, { color: themeStyle.label }]}>
            Confirm patient has given consent for recording
          </Text>
        </View> */}
      {/* )} */}

      {/* Start Session Button */}
      {activeTab === 'existing' ? (
        <TouchableOpacity
          style={[
            styles.startButton,
            !selectedPatient && styles.startButtonDisabled
          ]}
          onPress={handleStartSession}
          disabled={!selectedPatient}
        >
          <Text style={styles.startButtonText}>Start Session with Selected Patient</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[
            styles.startButton,
            (!newPatient.first_name || !newPatient.last_name || !newPatient.phone_number) && styles.startButtonDisabled
          ]}
          onPress={handleCreatePatientAndStartSession}
          disabled={!newPatient.first_name || !newPatient.last_name || !newPatient.phone_number}
        >
          <Text style={styles.startButtonText}>Create Patient & Start Session</Text>
        </TouchableOpacity>
      )}

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
  },
  backButton: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginHorizontal: 5,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#007AFF',
  },
  tabButtonText: {
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  patientsList: {
    flex: 1,
  },
  patientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderRadius: 8,
    borderWidth: 2,
    marginBottom: 10,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  patientAge: {
    fontSize: 14,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  qrContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  qrIconContainer: {
    marginBottom: 20,
  },
  qrIcon: {
    fontSize: 40,
  },
  qrTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  qrSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 30,
  },
  qrCodePlaceholder: {
    width: 200,
    height: 200,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  qrCodeText: {
    fontSize: 14,
    textAlign: 'center',
  },
  qrInstruction: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 10,
  },
  sessionId: {
    fontSize: 12,
  },
  consentSection: {
    margin: 20,
    padding: 20,
    borderRadius: 8,
  },
  consentTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  consentSubtitle: {
    fontSize: 14,
    marginBottom: 15,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#ccc',
    borderRadius: 4,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  checkboxText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  consentText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  timestamp: {
    fontSize: 12,
  },
  startButton: {
    backgroundColor: '#007AFF',
    margin: 20,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  startButtonDisabled: {
    backgroundColor: '#ccc',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
  },
  modalContainer: {
    margin: 20,
    borderRadius: 12,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
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
  halfInputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    flex: 1,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
  },
  checkboxLabel: {
    fontSize: 14,
    marginLeft: 10,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
  },
  modalButton: {
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
  // QR Code specific styles
  qrCodeContainer: {
    width: 220,
    minHeight: 220,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  qrLoadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrLoadingText: {
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
  },
  qrErrorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  qrErrorIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  qrErrorText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 15,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  qrCodeSuccess: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrCodeInfo: {
    alignItems: 'center',
    marginTop: 15,
  },
  pinDisplay: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 5,
  },
  pinSubtext: {
    fontSize: 12,
    textAlign: 'center',
  },
  qrPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  qrButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 15,
    alignItems: 'center',
  },
  qrButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // Patient form styles
  formDivider: {
    height: 2,
    backgroundColor: '#e0e0e0',
    marginVertical: 30,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  formInput: {
    height: 50,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  formHalfInput: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    marginTop: 5,
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  genderButton: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  genderButtonSelected: {
    backgroundColor: '#007AFF',
  },
  genderButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  genderButtonTextSelected: {
    color: 'white',
  },
  // Additional form styles
  textArea: {
    height: 80,
    paddingTop: 15,
    textAlignVertical: 'top',
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  dayButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  dayButtonSelected: {
    backgroundColor: '#007AFF',
  },
  dayButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
  },
  dayButtonTextSelected: {
    color: 'white',
  },
})

export default StartNewSession
