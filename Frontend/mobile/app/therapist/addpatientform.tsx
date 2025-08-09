import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  TextInput, 
  ScrollView, 
  SafeAreaView,
  Alert
} from 'react-native'
import React, { useState, useEffect } from 'react'
import { router } from 'expo-router'
import { useTheme } from '../contexts/ThemeContext'
import api from '../utils/api'
import QRCode from 'react-native-qrcode-svg'

type NewPatient = {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  date_of_birth: string;
  gender: string;
  primary_concern: string;
  therapy_start_date: string;
  session_frequency: string;
  preferred_session_days: string[];
  emergency_contact_name: string;
  emergency_contact_phone: string;
  address: string;
  medical_history: string;
  current_medications: string;
  preferred_language: string;
}

const AddPatientForm = () => {
  const { themeStyle } = useTheme()
  
  const [submitting, setSubmitting] = useState(false)
  const [therapistPin, setTherapistPin] = useState<string>('')
  const [therapistInfo, setTherapistInfo] = useState<any>(null)
  const [loadingPin, setLoadingPin] = useState(true)
  
  const [newPatient, setNewPatient] = useState<NewPatient>({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    date_of_birth: '',
    gender: 'male',
    primary_concern: '',
    therapy_start_date: new Date().toISOString().split('T')[0],
    session_frequency: 'weekly',
    preferred_session_days: [],
    emergency_contact_name: '',
    emergency_contact_phone: '',
    address: '',
    medical_history: '',
    current_medications: '',
    preferred_language: 'en'
  })

  const weekDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

  // Fetch therapist PIN for QR code
  useEffect(() => {
    const fetchTherapistPin = async () => {
      try {
        setLoadingPin(true)
        const response = await api.get('/users/therapist-pin/')
        setTherapistPin(response.data.therapist_pin)
        setTherapistInfo(response.data)
      } catch (error) {
        console.error('Error fetching therapist PIN:', error)
        Alert.alert('Error', 'Failed to load QR code information')
      } finally {
        setLoadingPin(false)
      }
    }

    fetchTherapistPin()
  }, [])

  const handleCreatePatient = async () => {
    // Validation
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

    // Date validation (if provided)
    if (newPatient.date_of_birth) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/
      if (!dateRegex.test(newPatient.date_of_birth)) {
        Alert.alert('Error', 'Date of Birth must be in YYYY-MM-DD format')
        return
      }
    }

    // Phone validation
    if (newPatient.phone_number && newPatient.phone_number.length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number')
      return
    }

    try {
      setSubmitting(true)
      
      // Prepare data for API with all required fields
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
      
      // Log the data being sent for debugging
      console.log('Creating patient with data:', patientData)
      
      let response;
      
      try {
        // Try the main endpoint
        response = await api.post('/therapy_sessions/patients/create/', patientData)
      } catch (error: any) {
        console.log('Main endpoint failed:', error.response?.status)
        throw error  // Re-throw to be handled by outer catch
      }
      
      console.log('Patient creation response:', response.data)
      
      Alert.alert('Success', 'Patient created successfully', [
        {
          text: 'OK',
          onPress: () => {
            router.back()
          }
        }
      ])
      
    } catch (error: any) {
      console.error('Failed to create patient:', error)
      
      // Handle the specific UserManager error
      if (error.response?.data?.detail?.includes('UserManager')) {
        Alert.alert(
          'Backend Configuration Error', 
          'There is a configuration issue with the backend. Please contact the administrator to fix the UserManager password generation issue.'
        )
        return
      }
      
      // Better error handling with specific messages
      if (error.response) {
        console.error('Error response data:', error.response.data)
        console.error('Error response status:', error.response.status)
        
        if (error.response.status === 400) {
          const errorData = error.response.data
          let errorMessage = 'Invalid data provided. Please check:\n'
          
          if (errorData.email) {
            errorMessage += `• Email: ${Array.isArray(errorData.email) ? errorData.email[0] : errorData.email}\n`
          }
          if (errorData.phone_number) {
            errorMessage += `• Phone: ${Array.isArray(errorData.phone_number) ? errorData.phone_number[0] : errorData.phone_number}\n`
          }
          if (errorData.date_of_birth) {
            errorMessage += `• Date of Birth: ${Array.isArray(errorData.date_of_birth) ? errorData.date_of_birth[0] : errorData.date_of_birth}\n`
          }
          if (errorData.first_name) {
            errorMessage += `• First Name: ${Array.isArray(errorData.first_name) ? errorData.first_name[0] : errorData.first_name}\n`
          }
          if (errorData.last_name) {
            errorMessage += `• Last Name: ${Array.isArray(errorData.last_name) ? errorData.last_name[0] : errorData.last_name}\n`
          }
          if (errorData.therapy_start_date) {
            errorMessage += `• Therapy Start Date: ${Array.isArray(errorData.therapy_start_date) ? errorData.therapy_start_date[0] : errorData.therapy_start_date}\n`
          }
          if (errorData.preferred_session_days) {
            errorMessage += `• Preferred Days: ${Array.isArray(errorData.preferred_session_days) ? errorData.preferred_session_days[0] : errorData.preferred_session_days}\n`
          }
          if (errorData.non_field_errors) {
            errorMessage += `• ${Array.isArray(errorData.non_field_errors) ? errorData.non_field_errors[0] : errorData.non_field_errors}\n`
          }
          if (errorData.detail && !errorData.detail.includes('UserManager')) {
            errorMessage += `• ${errorData.detail}\n`
          }
          
          Alert.alert('Validation Error', errorMessage)
        } else if (error.response.status === 405) {
          Alert.alert('Error', 'This endpoint method is not allowed. Please check the API configuration.')
        } else {
          Alert.alert('Error', `Failed to create patient (${error.response.status})`)
        }
      } else if (error.request) {
        Alert.alert('Network Error', 'Unable to connect to server. Please check your internet connection.')
      } else {
        Alert.alert('Error', 'An unexpected error occurred')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const togglePreferredDay = (day: string) => {
    setNewPatient(prev => ({
      ...prev,
      preferred_session_days: prev.preferred_session_days.includes(day)
        ? prev.preferred_session_days.filter(d => d !== day)
        : [...prev.preferred_session_days, day]
    }))
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeStyle.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.cancelButton, { color: themeStyle.text }]}>Cancel</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: themeStyle.text }]}>Add New Patient</Text>
        <TouchableOpacity 
          onPress={handleCreatePatient}
          disabled={submitting}
        >
          <Text style={[styles.saveButton, { color: submitting ? themeStyle.label : '#007AFF' }]}>
            {submitting ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.formContainer}>
        {/* QR Code Section */}
        <View style={styles.qrSection}>
          <Text style={[styles.qrTitle, { color: themeStyle.text }]}>Patient Connection</Text>
          <Text style={[styles.qrSubtitle, { color: themeStyle.label }]}>
            Have your patient scan this QR code to connect with you
          </Text>
          
          <View style={styles.qrContainer}>
            {loadingPin ? (
              <View style={styles.qrLoading}>
                <Text style={[styles.qrLoadingText, { color: themeStyle.label }]}>Loading QR Code...</Text>
              </View>
            ) : therapistPin ? (
              <View style={styles.qrCodeWrapper}>
                <QRCode
                  value={therapistPin}
                  size={150}
                  color="#000000"
                  backgroundColor="#FFFFFF"
                />
                <Text style={[styles.qrPinText, { color: themeStyle.label }]}>
                  PIN: {therapistPin}
                </Text>
              </View>
            ) : (
              <View style={styles.qrError}>
                <Text style={[styles.qrErrorText, { color: '#FF6B6B' }]}>
                  Unable to load QR code
                </Text>
              </View>
            )}
          </View>
          
          {therapistInfo && (
            <View style={styles.therapistInfoCard}>
              <Text style={[styles.therapistName, { color: themeStyle.text }]}>
                {therapistInfo.therapist_name}
              </Text>
              <Text style={[styles.therapistDetails, { color: themeStyle.label }]}>
                {therapistInfo.specialization}
              </Text>
              {therapistInfo.clinic_name && (
                <Text style={[styles.therapistDetails, { color: themeStyle.label }]}>
                  {therapistInfo.clinic_name}
                </Text>
              )}
            </View>
          )}
          
          <View style={styles.divider} />
        </View>

        {/* Basic Information */}
        <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>Basic Information</Text>
        
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, styles.halfInput, { backgroundColor: themeStyle.dashboardcard, color: themeStyle.text }]}
            placeholder="First Name *"
            placeholderTextColor={themeStyle.label}
            value={newPatient.first_name}
            onChangeText={(text) => setNewPatient(prev => ({...prev, first_name: text}))}
          />
          <TextInput
            style={[styles.input, styles.halfInput, { backgroundColor: themeStyle.dashboardcard, color: themeStyle.text }]}
            placeholder="Last Name *"
            placeholderTextColor={themeStyle.label}
            value={newPatient.last_name}
            onChangeText={(text) => setNewPatient(prev => ({...prev, last_name: text}))}
          />
        </View>

        <TextInput
          style={[styles.input, { backgroundColor: themeStyle.dashboardcard, color: themeStyle.text }]}
          placeholder="Email"
          placeholderTextColor={themeStyle.label}
          value={newPatient.email}
          onChangeText={(text) => setNewPatient(prev => ({...prev, email: text}))}
          keyboardType="email-address"
        />

        <TextInput
          style={[styles.input, { backgroundColor: themeStyle.dashboardcard, color: themeStyle.text }]}
          placeholder="Phone Number *"
          placeholderTextColor={themeStyle.label}
          value={newPatient.phone_number}
          onChangeText={(text) => setNewPatient(prev => ({...prev, phone_number: text}))}
          keyboardType="phone-pad"
        />

        <TextInput
          style={[styles.input, { backgroundColor: themeStyle.dashboardcard, color: themeStyle.text }]}
          placeholder="Date of Birth (YYYY-MM-DD)"
          placeholderTextColor={themeStyle.label}
          value={newPatient.date_of_birth}
          onChangeText={(text) => setNewPatient(prev => ({...prev, date_of_birth: text}))}
        />

        {/* Gender Selection */}
        <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>Gender</Text>
        <View style={styles.genderContainer}>
          {['male', 'female', 'other', 'prefer_not_to_say'].map((gender) => (
            <TouchableOpacity
              key={gender}
              style={[
                styles.genderButton,
                newPatient.gender === gender && styles.genderButtonSelected
              ]}
              onPress={() => setNewPatient(prev => ({...prev, gender}))}
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

        {/* Therapy Information */}
        <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>Therapy Information</Text>
        
        {/* Primary Concern */}
        <TextInput
          style={[styles.input, styles.textArea, { backgroundColor: themeStyle.dashboardcard, color: themeStyle.text }]}
          placeholder="Primary Concern"
          placeholderTextColor={themeStyle.label}
          value={newPatient.primary_concern}
          onChangeText={(text) => setNewPatient(prev => ({...prev, primary_concern: text}))}
          multiline
          numberOfLines={3}
        />

        {/* Therapy Start Date */}
        <TextInput
          style={[styles.input, { backgroundColor: themeStyle.dashboardcard, color: themeStyle.text }]}
          placeholder="Therapy Start Date (YYYY-MM-DD)"
          placeholderTextColor={themeStyle.label}
          value={newPatient.therapy_start_date}
          onChangeText={(text) => setNewPatient(prev => ({...prev, therapy_start_date: text}))}
        />

        {/* Session Frequency */}
        <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>Session Frequency</Text>
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
              onPress={() => setNewPatient(prev => ({...prev, session_frequency: freq.value}))}
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
        <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>Preferred Session Days</Text>
        <View style={styles.daysContainer}>
          {weekDays.map((day) => (
            <TouchableOpacity
              key={day}
              style={[
                styles.dayButton,
                newPatient.preferred_session_days.includes(day) && styles.dayButtonSelected
              ]}
              onPress={() => togglePreferredDay(day)}
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
        <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>Emergency Contact</Text>
        
        <TextInput
          style={[styles.input, { backgroundColor: themeStyle.dashboardcard, color: themeStyle.text }]}
          placeholder="Emergency Contact Name"
          placeholderTextColor={themeStyle.label}
          value={newPatient.emergency_contact_name}
          onChangeText={(text) => setNewPatient(prev => ({...prev, emergency_contact_name: text}))}
        />

        <TextInput
          style={[styles.input, { backgroundColor: themeStyle.dashboardcard, color: themeStyle.text }]}
          placeholder="Emergency Contact Phone"
          placeholderTextColor={themeStyle.label}
          value={newPatient.emergency_contact_phone}
          onChangeText={(text) => setNewPatient(prev => ({...prev, emergency_contact_phone: text}))}
          keyboardType="phone-pad"
        />

        {/* Address Information */}
        <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>Address Information</Text>
        
        <TextInput
          style={[styles.input, styles.textArea, { backgroundColor: themeStyle.dashboardcard, color: themeStyle.text }]}
          placeholder="Complete Address"
          placeholderTextColor={themeStyle.label}
          value={newPatient.address}
          onChangeText={(text) => setNewPatient(prev => ({...prev, address: text}))}
          multiline
          numberOfLines={3}
        />

        {/* Medical Information */}
        <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>Medical Information</Text>
        
        <TextInput
          style={[styles.input, styles.textArea, { backgroundColor: themeStyle.dashboardcard, color: themeStyle.text }]}
          placeholder="Medical History"
          placeholderTextColor={themeStyle.label}
          value={newPatient.medical_history}
          onChangeText={(text) => setNewPatient(prev => ({...prev, medical_history: text}))}
          multiline
          numberOfLines={3}
        />

        <TextInput
          style={[styles.input, styles.textArea, { backgroundColor: themeStyle.dashboardcard, color: themeStyle.text }]}
          placeholder="Current Medications"
          placeholderTextColor={themeStyle.label}
          value={newPatient.current_medications}
          onChangeText={(text) => setNewPatient(prev => ({...prev, current_medications: text}))}
          multiline
          numberOfLines={3}
        />

        {/* Preferred Language */}
        <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>Preferred Language</Text>
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
              onPress={() => setNewPatient(prev => ({...prev, preferred_language: lang.value}))}
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

        <View style={styles.formSpacer} />
      </ScrollView>
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
  cancelButton: {
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    marginTop: 10,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  input: {
    height: 50,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  halfInput: {
    flex: 1,
  },
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
  formSpacer: {
    height: 50,
  },
  // QR Code Styles
  qrSection: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  qrTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  qrSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  qrLoading: {
    padding: 20,
    alignItems: 'center',
  },
  qrLoadingText: {
    fontSize: 14,
  },
  qrCodeWrapper: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  qrPinText: {
    marginTop: 10,
    fontSize: 12,
    textAlign: 'center',
  },
  qrError: {
    padding: 20,
    alignItems: 'center',
  },
  qrErrorText: {
    fontSize: 14,
    textAlign: 'center',
  },
  therapistInfoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 15,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  therapistName: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  therapistDetails: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    width: '100%',
    marginTop: 20,
  },
})

export default AddPatientForm
