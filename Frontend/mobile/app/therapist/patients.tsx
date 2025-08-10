

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
import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { router, useFocusEffect } from 'expo-router'
import { useTheme } from '../contexts/ThemeContext'
import { useTherapistPatients } from '../hooks/useTherapist'
import type { Patient } from '../types/therapist'

const Patients = () => {
  const { themeStyle } = useTheme()
  
  // Use the therapist patients hook
  const {
    patients,
    allPatients,
    loading,
    error,
    filter,
    updateFilter,
    addPatient,
    updatePatient,
    deletePatient,
    refetch
  } = useTherapistPatients()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFilter, setSelectedFilter] = useState('All')
  const [refreshing, setRefreshing] = useState(false)

  // View options dropdown state
  const [showViewOptionsModal, setShowViewOptionsModal] = useState(false)
  const [selectedPatientForView, setSelectedPatientForView] = useState<Patient | null>(null)

  const filters = ['All', 'High-Risk', 'New', 'Recently Active']

  // Add focus listener to refresh patients when returning to this screen
  useFocusEffect(
    useCallback(() => {
      console.log('Patients screen focused - refreshing data')
      refetch()
    }, [refetch])
  )

  // Handle errors from the hook
  useEffect(() => {
    if (error) {
      console.error('Patient data error:', error)
      Alert.alert('Error', `Failed to load patients: ${error.message}`)
    }
  }, [error])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await refetch()
    } catch (err) {
      console.error('Refresh error:', err)
      Alert.alert('Error', 'Failed to refresh patients')
    } finally {
      setRefreshing(false)
    }
  }, [refetch])

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
    // Use the hook's updateFilter to handle search
    updateFilter({ search_query: query })
  }, [updateFilter])

  const getRiskLevel = useCallback((patient: Patient) => {
    try {
      const sessionCount = patient.total_sessions ? parseInt(String(patient.total_sessions)) : 0
      if (sessionCount === 0) return { level: 'new', color: '#49467E' }
      if (sessionCount < 3) return { level: 'medium', color: '#FF9500' }
      return { level: 'low', color: '#34C759' }
    } catch {
      return { level: 'unknown', color: '#999999' }
    }
  }, [])

  const getMoodStatus = useCallback((patient: Patient) => {
    const primaryConcern = patient.patient_profile?.primary_concern || 'General therapy'
    const sessionCount = patient.total_sessions ? parseInt(String(patient.total_sessions)) : 0
    
    let mood = 'stable'
    if (sessionCount === 0) mood = 'new patient'
    else if (sessionCount < 3) mood = 'initial progress'
    else if (sessionCount < 10) mood = 'improving'
    else mood = 'ongoing treatment'
    
    return { mood, condition: primaryConcern }
  }, [])

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

  // Local filtering for better UX combined with hook's filter
  const filteredPatients = useMemo(() => {
    if (!patients || !Array.isArray(patients)) return []
    
    let filtered = patients
    
    // Apply search filter locally (in addition to hook's search)
    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase()
      filtered = filtered.filter((patient: Patient) => {
        const fullName = (patient.full_name || '').toLowerCase()
        const email = (patient.email || '').toLowerCase()
        const phone = patient.phone_number || ''
        const primaryConcern = (patient.patient_profile?.primary_concern || '').toLowerCase()
        
        return fullName.includes(searchLower) ||
               email.includes(searchLower) ||
               phone.includes(searchQuery) ||
               primaryConcern.includes(searchLower)
      })
    }
    
    // Apply category filter
    if (selectedFilter !== 'All') {
      filtered = filtered.filter((patient: Patient) => {
        const sessions = patient.total_sessions ? parseInt(String(patient.total_sessions)) : 0
        
        switch (selectedFilter) {
          case 'New':
            return sessions === 0
          case 'High-Risk':
            return sessions < 3
          case 'Recently Active':
            return patient.last_session
          default:
            return true
        }
      })
    }
    
    return filtered
  }, [patients, searchQuery, selectedFilter])

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeStyle.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: themeStyle.darktext }]}>
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
            handleSearch(text)
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
          <ActivityIndicator size="large" color="#49467E" />
          <Text style={[styles.loadingText, { color: themeStyle.text }]}>Loading patients...</Text>
        </View>
      ) : filteredPatients.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>👥</Text>
          <Text style={[styles.emptyTitle, { color: themeStyle.text }]}>
            {searchQuery ? 'No patients found' : 'No patients yet'}
          </Text>
          <Text style={[styles.emptySubtitle, { color: themeStyle.label }]}>
            {searchQuery 
              ? 'Try adjusting your search terms'
              : 'Add your first patient to get started'
            }
          </Text>
          {!searchQuery && (
            <TouchableOpacity
              style={styles.emptyActionButton}
              onPress={() => router.push('./addpatientform')}
            >
              <Text style={styles.emptyActionText}>Add Patient</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <ScrollView 
          style={styles.patientsList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#49467E']}
              tintColor={themeStyle.text}
            />
          }
        >
          {filteredPatients.map((patient, index) => {
            // Enhanced validation for patient data
            if (!patient?.id) {
              console.warn('Invalid patient data found:', patient)
              return null
            }
            
            // Ensure we have valid name data
            const patientName = patient.full_name && patient.full_name.trim() 
              ? patient.full_name 
              : 'Unknown Patient'
            
            console.log(`[DEBUG] Patient ${patient.id}: name="${patientName}", sessions="${patient.total_sessions}", last_session="${patient.last_session}"`)
            
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
                        {patientName}
                      </Text>
                      <View style={styles.conditionRow}>
                        <Text style={[styles.conditionText, { color: themeStyle.label }]}>
                          {mood.condition}
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
                    Status: {mood.mood}
                  </Text>
                  <Text style={[styles.lastSession, { color: themeStyle.label }]}>
                    Sessions: {patient.total_sessions ? parseInt(String(patient.total_sessions)) : 0}
                  </Text>
                </View>

                {/* Additional Info Row */}
                <View style={styles.moodRow}>
                  <Text style={styles.moodIcon}>📅</Text>
                  {/* <Text style={[styles.moodText, { color: themeStyle.text }]}>
                    Last: {patient.last_session 
                      ? new Date(patient.last_session).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      : 'No sessions yet'
                    }
                  </Text> */}
                  <Text style={[styles.lastSession, { color: themeStyle.label }]}>
                    Email: {patient.email || 'No email'}
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
    paddingHorizontal: 24,
    paddingVertical: 20,
    paddingTop: 60,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 0.5,
  },
  addButton: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  addButtonText: {
    color: 'white',
    fontSize: 26,
    fontWeight: '600',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 8,
  },
  searchInput: {
    height: 44,
    borderRadius: 20,
    paddingHorizontal: 18,
    borderWidth: 1,
    fontSize: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  filterContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
    paddingVertical: 8,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 10,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    minWidth: 'auto',
    alignSelf: 'flex-start',
  },
  filterTabActive: {
    backgroundColor: '#49467E',
    borderColor: '#49467E',
    elevation: 2,
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
  },
  emptyIcon: {
    fontSize: 72,
    marginBottom: 24,
    opacity: 0.7,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    opacity: 0.8,
  },
  emptyActionButton: {
    backgroundColor: '#49467E',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 24,
    shadowColor: '#49467E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  emptyActionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  patientsList: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    marginTop: -630, // Adjust to avoid overlap with header
  },
  patientCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(73, 70, 126, 0.05)',
    backgroundColor: 'white',
  },
  patientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  patientInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  patientIcon: {
    fontSize: 32,
    marginRight: 16,
    marginTop: 2,
    opacity: 0.8,
  },
  patientName: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: 0.2,
    lineHeight: 24,
  },
  conditionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  conditionText: {
    fontSize: 14,
    marginRight: 8,
    fontWeight: '500',
    opacity: 0.7,
  },
  riskBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    alignSelf: 'flex-start',
  },
  riskText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
    letterSpacing: 0.3,
  },
  moodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  moodIcon: {
    fontSize: 16,
    marginRight: 10,
    opacity: 0.8,
  },
  moodText: {
    fontSize: 14,
    flex: 1,
    fontWeight: '500',
    opacity: 0.8,
  },
  lastSession: {
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.6,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  detailsButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#49467E',
    alignItems: 'center',
    backgroundColor: 'rgba(73, 70, 126, 0.05)',
  },
  detailsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#49467E',
    letterSpacing: 0.2,
  },
  sessionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: '#49467E',
    alignItems: 'center',
    shadowColor: '#49467E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  sessionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
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
    backgroundColor: '#49467E',
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
    backgroundColor: '#49467E',
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  viewOptionsContainer: {
    width: '95%',
    maxWidth: 420,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    overflow: 'hidden',
  },
  viewOptionsTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 24,
    paddingHorizontal: 24,
    letterSpacing: 0.3,
  },
  viewOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderBottomWidth: 0.5,
  },
  viewOptionIcon: {
    fontSize: 28,
    marginRight: 20,
  },
  viewOptionTextContainer: {
    flex: 1,
  },
  viewOptionTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  viewOptionSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.8,
  },
  viewOptionArrow: {
    fontSize: 20,
    fontWeight: '600',
    opacity: 0.6,
  },
  cancelOptionButton: {
    paddingVertical: 20,
    alignItems: 'center',
    borderTopWidth: 0.5,
    backgroundColor: 'rgba(248, 249, 250, 0.5)',
  },
  cancelOptionText: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
})

