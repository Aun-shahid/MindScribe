

import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  TextInput, 
  ScrollView, 
  SafeAreaView,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl
} from 'react-native'
import React, { useState, useEffect } from 'react'
import { router, useFocusEffect } from 'expo-router'
import { useTheme } from '../contexts/ThemeContext'
import api from '../utils/api'

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

const Patients = () => {
  const { themeStyle } = useTheme()
  
  const [patients, setPatients] = useState<Patient[]>([])
  const [allPatients, setAllPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFilter, setSelectedFilter] = useState('All')
  const [refreshing, setRefreshing] = useState(false)

  // View options dropdown state
  const [showViewOptionsModal, setShowViewOptionsModal] = useState(false)
  const [selectedPatientForView, setSelectedPatientForView] = useState<Patient | null>(null)

  const filters = ['All', 'High-Risk', 'New', 'Recently Active']

  useEffect(() => {
    fetchPatients()
  }, [])

  // Add focus listener to refresh patients when returning to this screen
  useFocusEffect(
    React.useCallback(() => {
      console.log('Patients screen focused - refreshing data')
      fetchPatients()
    }, [])
  )

  const fetchPatients = async () => {
    try {
      setLoading(true)
      const response = await api.get('/therapy_sessions/patients/')
      const patientsData = response.data || []
      
      console.log('Fetched patients data:', patientsData)
      
      // Validate and clean patient data to prevent render errors
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
      
      console.log('Cleaned patients data:', cleanedPatients)
      setPatients(cleanedPatients)
      setAllPatients(cleanedPatients)
    } catch (error) {
      console.error('Failed to fetch patients:', error)
      Alert.alert('Error', 'Failed to load patients')
    } finally {
      setLoading(false)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await fetchPatients()
    setRefreshing(false)
  }

  const searchPatients = async (query: string) => {
    if (!query.trim()) {
      fetchPatients()
      return
    }
    
    try {
      // For now, use local filtering since search endpoint might not be configured
      // You can replace this with API call when backend search is ready
      const filtered = allPatients.filter((patient: Patient) => {
        const searchLower = query.toLowerCase()
        const fullName = (patient.full_name || '').toLowerCase()
        const email = (patient.email || '').toLowerCase()
        const phone = patient.phone_number || ''
        const primaryConcern = (patient.patient_profile?.primary_concern || '').toLowerCase()
        
        return fullName.includes(searchLower) ||
               email.includes(searchLower) ||
               phone.includes(query) ||
               primaryConcern.includes(searchLower)
      })
      setPatients(filtered)
    } catch (error) {
      console.error('Search failed:', error)
      // Fallback to basic filtering
      const filtered = allPatients.filter((patient: Patient) => {
        const searchLower = query.toLowerCase()
        const fullName = (patient.full_name || '').toLowerCase()
        const email = (patient.email || '').toLowerCase()
        const phone = patient.phone_number || ''
        
        return fullName.includes(searchLower) ||
               email.includes(searchLower) ||
               phone.includes(query)
      })
      setPatients(filtered)
    }
  }

  const getRiskLevel = (patient: Patient) => {
    // Mock risk assessment - you can implement actual logic
    const sessionCount = parseInt(patient.total_sessions || '0')
    if (sessionCount === 0) return { level: 'new', color: '#007AFF' }
    if (sessionCount < 3) return { level: 'medium', color: '#FF9500' }
    return { level: 'low', color: '#34C759' }
  }

  const getMoodStatus = (patient: Patient) => {
    // Use actual patient data when available
    const primaryConcern = patient.patient_profile?.primary_concern || 'General therapy'
    const sessionCount = parseInt(patient.total_sessions || '0')
    
    // Determine mood based on session count and data
    let mood = 'stable'
    if (sessionCount === 0) mood = 'new patient'
    else if (sessionCount < 3) mood = 'initial progress'
    else if (sessionCount < 10) mood = 'improving'
    else mood = 'ongoing treatment'
    
    return {
      mood,
      condition: primaryConcern
    }
  }

  const handleViewDetails = (patient: Patient) => {
    router.push({
      pathname: './patient-details',
      params: { patientId: patient.id }
    })
  }

  const handleViewSession = (patient: Patient) => {
  router.push({
    pathname: './session-details',
    params: { 
      patientId: patient.id,
      patientName: patient.full_name
    }
  })
}

  // New handler for showing view options dropdown
  const handleShowViewOptions = (patient: Patient) => {
    setSelectedPatientForView(patient)
    setShowViewOptionsModal(true)
  }

  // Handler for patient details option
  const handleViewPatientDetails = () => {
    if (selectedPatientForView) {
      setShowViewOptionsModal(false)
      handleViewDetails(selectedPatientForView)
    }
  }

  // Handler for session details option
  const handleViewSessionDetails = () => {
    if (selectedPatientForView) {
      setShowViewOptionsModal(false)
      handleViewSession(selectedPatientForView)
    }
  }

  const handleStartSession = (patient: Patient) => {
    router.push({
      pathname: './sessionformconsent',
      params: {
        patientId: patient.id,
        patientName: patient.full_name
      }
    })
  }

  const filteredPatients = patients.filter(patient => {
    if (selectedFilter === 'All') return true
    if (selectedFilter === 'New') return parseInt(patient.total_sessions || '0') === 0
    if (selectedFilter === 'High-Risk') return parseInt(patient.total_sessions || '0') < 3
    if (selectedFilter === 'Recently Active') return patient.last_session
    
    return true
  })

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeStyle.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: '#00B894' }]}>
        <Text style={styles.headerTitle}>My Patients</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => router.push('./addpatientform')}
          >
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: themeStyle.background }]}>
        <TextInput
          style={[styles.searchInput, { 
            backgroundColor: themeStyle.dashboardcard,
            color: themeStyle.text,
            borderColor: themeStyle.border 
          }]}
          placeholder="Search patients..."
          placeholderTextColor={themeStyle.label}
          value={searchQuery}
          onChangeText={(text) => {
            setSearchQuery(text)
            searchPatients(text)
          }}
        />
      </View>

      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterTab,
              selectedFilter === filter && styles.filterTabActive
            ]}
            onPress={() => setSelectedFilter(filter)}
          >
            <Text style={[
              styles.filterText,
              { color: selectedFilter === filter ? '#fff' : themeStyle.text }
            ]}>
              {filter}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Patients List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeStyle.text} />
        </View>
      ) : (
        <ScrollView 
          style={styles.patientsList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#007AFF']}
              tintColor={themeStyle.text}
            />
          }
        >
          {filteredPatients.map((patient, index) => {
            // Add debug logging to identify problematic data
            console.log('Patient data:', JSON.stringify(patient, null, 2))
            console.log(`Patient ${patient.full_name} - Total Sessions: "${patient.total_sessions}" (parsed: ${parseInt(patient.total_sessions || '0')})`)
            
            // Ensure patient has a valid ID
            if (!patient || !patient.id) {
              console.warn('Invalid patient data found:', patient)
              return null
            }
            
            const risk = getRiskLevel(patient)
            const mood = getMoodStatus(patient)
            
            return (
              <View key={patient.id || `patient-${index}`} style={[styles.patientCard, { backgroundColor: themeStyle.dashboardcard }]}>
                {/* Patient Header */}
                <View style={styles.patientHeader}>
                  <View style={styles.patientInfo}>
                    <Text style={styles.patientIcon}>👤</Text>
                    <View>
                      <Text style={[styles.patientName, { color: themeStyle.text }]}>
                        {typeof patient.full_name === 'string' ? patient.full_name : 'Unknown Patient'}
                      </Text>
                      <View style={styles.conditionRow}>
                        <Text style={[styles.conditionText, { color: themeStyle.label }]}>
                          {typeof mood.condition === 'string' ? mood.condition : 'General therapy'}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={[styles.riskBadge, { backgroundColor: risk.color }]}>
                    <Text style={styles.riskText}>{risk.level}</Text>
                  </View>
                </View>

                {/* Mood Status */}
                <View style={styles.moodRow}>
                  <Text style={styles.moodIcon}>📈</Text>
                  <Text style={[styles.moodText, { color: themeStyle.text }]}>
                    Mood {mood.mood}
                  </Text>
                  <Text style={[styles.lastSession, { color: themeStyle.label }]}>
                    Total Sessions: {parseInt(patient.total_sessions || '0')} sessions
                  </Text>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.detailsButton, { borderColor: themeStyle.border }]}
                    onPress={() => handleShowViewOptions(patient)}
                  >
                    <Text style={[styles.detailsButtonText, { color: themeStyle.text }]}>
                      View Details
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.sessionButton}
                    onPress={() => handleStartSession(patient)}
                  >
                    <Text style={styles.sessionButtonText}>Start Session</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )
          })}
        </ScrollView>
      )}

      {/* View Options Modal */}
      <Modal
        visible={showViewOptionsModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowViewOptionsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.viewOptionsContainer, { backgroundColor: themeStyle.dashboardcard }]}>
            <Text style={[styles.viewOptionsTitle, { color: themeStyle.text }]}>
              Choose View Option
            </Text>
            
            <TouchableOpacity
              style={[styles.viewOptionButton, { borderBottomColor: themeStyle.border }]}
              onPress={handleViewPatientDetails}
            >
              <Text style={styles.viewOptionIcon}>👤</Text>
              <View style={styles.viewOptionTextContainer}>
                <Text style={[styles.viewOptionTitle, { color: themeStyle.text }]}>
                  View Patient Details
                </Text>
                <Text style={[styles.viewOptionSubtitle, { color: themeStyle.label }]}>
                  See full patient information and history
                </Text>
              </View>
              <Text style={[styles.viewOptionArrow, { color: themeStyle.label }]}>→</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.viewOptionButton}
              onPress={handleViewSessionDetails}
            >
              <Text style={styles.viewOptionIcon}>📊</Text>
              <View style={styles.viewOptionTextContainer}>
                <Text style={[styles.viewOptionTitle, { color: themeStyle.text }]}>
                  View Session Details
                </Text>
                <Text style={[styles.viewOptionSubtitle, { color: themeStyle.label }]}>
                  See session history and notes
                </Text>
              </View>
              <Text style={[styles.viewOptionArrow, { color: themeStyle.label }]}>→</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.cancelOptionButton, { borderTopColor: themeStyle.border }]}
              onPress={() => setShowViewOptionsModal(false)}
            >
              <Text style={[styles.cancelOptionText, { color: themeStyle.label }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

export default Patients

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
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  addButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginBottom: 5,
  },
  searchInput: {
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 15,
    borderWidth: 1,
  },
  filterContainer: {
    paddingHorizontal: 20,
    marginBottom: -20,
    paddingVertical: 2,
  },
  filterTab: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    backgroundColor: '#f5f5f7',
    borderWidth: 1,
    borderColor: '#e5e5ea',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    minWidth: 'auto',
    alignSelf: 'flex-start',
  },
  filterTabActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
    elevation: 2,
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.1,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
   
  },
  patientsList: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 2,
    marginTop: -630,
  },
  patientCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  patientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  patientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  patientIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  patientName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  conditionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  conditionText: {
    fontSize: 14,
    marginRight: 8,
  },
  riskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  riskText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  moodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  moodIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  moodText: {
    fontSize: 14,
    flex: 1,
  },
  lastSession: {
    fontSize: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  detailsButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  detailsButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  sessionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
  },
  sessionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  cancelButton: {
    fontSize: 16,
  },
  modalTitle: {
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
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 5,
  },
  patientInfoConsent: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  pickerContainer: {
    height: 50,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    borderWidth: 1,
    justifyContent: 'center',
  },
  pickerText: {
    fontSize: 16,
    textTransform: 'capitalize',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 3,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
  },
  checkmark: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  consentNote: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 10,
    marginBottom: 20,
    paddingHorizontal: 15,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalCloseText: {
    fontSize: 24,
    color: 'white',
    fontWeight: 'bold',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonConsent: {
    backgroundColor: '#f0f0f0',
  },
  confirmButtonConsent: {
    backgroundColor: '#007AFF',
  },
  cancelButtonTextConsent: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
  },
  confirmButtonTextConsent: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  // View Options Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  viewOptionsContainer: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  viewOptionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  viewOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
  },
  viewOptionIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  viewOptionTextContainer: {
    flex: 1,
  },
  viewOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  viewOptionSubtitle: {
    fontSize: 14,
  },
  viewOptionArrow: {
    fontSize: 18,
    fontWeight: '500',
  },
  cancelOptionButton: {
    paddingVertical: 16,
    alignItems: 'center',
    borderTopWidth: 0.5,
  },
  cancelOptionText: {
    fontSize: 16,
    fontWeight: '500',
  },
})