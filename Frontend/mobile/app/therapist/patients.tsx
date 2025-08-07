// import { 
//   StyleSheet, 
//   Text, 
//   View, 
//   TouchableOpacity, 
//   TextInput, 
//   ScrollView, 
//   SafeAreaView,
//   Modal,
//   Alert,
//   ActivityIndicator,
//   RefreshControl
// } from 'react-native'
// import React, { useState, useEffect } from 'react'
// import { router, useFocusEffect } from 'expo-router'
// import { useTheme } from '../contexts/ThemeContext'
// import api from '../utils/api'

// type Patient = {
//   id: string;
//   full_name: string;
//   email: string;
//   phone_number: string;
//   date_of_birth: string;
//   gender: string;
//   patient_profile: {
//     patient_id: string;
//     primary_concern: string;
//     therapy_start_date: string;
//     session_frequency: string;
//     preferred_session_days: string[];
//     emergency_contact_name: string;
//     emergency_contact_phone: string;
//     preferred_language: string;
//     connected_at: string;
//   } | null;
//   last_session: string | null;
//   next_session: string | null;
//   total_sessions: string;
//   created_at: string;
// }

// type NewPatient = {
//   first_name: string;
//   last_name: string;
//   email: string;
//   phone_number: string;
//   date_of_birth: string;
//   gender: string;
//   primary_concern: string;
//   therapy_start_date: string;
//   session_frequency: string;
//   preferred_session_days: string[];
//   emergency_contact_name: string;
//   emergency_contact_phone: string;
//   address: string;
//   medical_history: string;
//   current_medications: string;
//   preferred_language: string;
// }

// const Patients = () => {
//   const { themeStyle } = useTheme()
  
//   const [patients, setPatients] = useState<Patient[]>([])
//   const [allPatients, setAllPatients] = useState<Patient[]>([])
//   const [loading, setLoading] = useState(true)
//   const [searchQuery, setSearchQuery] = useState('')
//   const [selectedFilter, setSelectedFilter] = useState('All')
//   const [showAddModal, setShowAddModal] = useState(false)
//   const [submitting, setSubmitting] = useState(false)
//   const [refreshing, setRefreshing] = useState(false)
  
//   const [newPatient, setNewPatient] = useState<NewPatient>({
//     first_name: '',
//     last_name: '',
//     email: '',
//     phone_number: '',
//     date_of_birth: '',
//     gender: 'male',
//     primary_concern: '',
//     therapy_start_date: new Date().toISOString().split('T')[0],
//     session_frequency: 'weekly',
//     preferred_session_days: [],
//     emergency_contact_name: '',
//     emergency_contact_phone: '',
//     address: '',
//     medical_history: '',
//     current_medications: '',
//     preferred_language: 'en'
//   })

//   // Consent modal state
//   const [showConsentModal, setShowConsentModal] = useState(false)
//   const [selectedPatientForSession, setSelectedPatientForSession] = useState<Patient | null>(null)
//   const [consentData, setConsentData] = useState({
//     session_type: 'individual',
//     duration_minutes: 60,
//     location: 'Office',
//     is_online: false,
//     patient_goals: '',
//     fee_charged: 0,
//     consent_recording: false,
//     consent_ai_analysis: false
//   })

//   const filters = ['All', 'High-Risk', 'New', 'Recently Active']
//   const weekDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

//   useEffect(() => {
//     fetchPatients()
//   }, [])

//   // Add focus listener to refresh patients when returning to this screen
//   useFocusEffect(
//     React.useCallback(() => {
//       console.log('Patients screen focused - refreshing data')
//       fetchPatients()
//     }, [])
//   )

//   const fetchPatients = async () => {
//     try {
//       setLoading(true)
//       const response = await api.get('/therapy_sessions/patients/')
//       const patientsData = response.data || []
      
//       console.log('Fetched patients data:', patientsData)
      
//       // Validate and clean patient data to prevent render errors
//       const cleanedPatients = patientsData.map((patient: any) => ({
//         id: patient.id?.toString() || '',
//         full_name: typeof patient.full_name === 'string' ? patient.full_name : 'Unknown Patient',
//         email: typeof patient.email === 'string' ? patient.email : '',
//         phone_number: typeof patient.phone_number === 'string' ? patient.phone_number : '',
//         date_of_birth: typeof patient.date_of_birth === 'string' ? patient.date_of_birth : '',
//         gender: typeof patient.gender === 'string' ? patient.gender : '',
//         patient_profile: patient.patient_profile && typeof patient.patient_profile === 'object' ? {
//           patient_id: patient.patient_profile.patient_id?.toString() || '',
//           primary_concern: typeof patient.patient_profile.primary_concern === 'string' ? patient.patient_profile.primary_concern : 'General therapy',
//           therapy_start_date: typeof patient.patient_profile.therapy_start_date === 'string' ? patient.patient_profile.therapy_start_date : '',
//           session_frequency: typeof patient.patient_profile.session_frequency === 'string' ? patient.patient_profile.session_frequency : '',
//           preferred_session_days: Array.isArray(patient.patient_profile.preferred_session_days) ? patient.patient_profile.preferred_session_days : [],
//           emergency_contact_name: typeof patient.patient_profile.emergency_contact_name === 'string' ? patient.patient_profile.emergency_contact_name : '',
//           emergency_contact_phone: typeof patient.patient_profile.emergency_contact_phone === 'string' ? patient.patient_profile.emergency_contact_phone : '',
//           preferred_language: typeof patient.patient_profile.preferred_language === 'string' ? patient.patient_profile.preferred_language : '',
//           connected_at: typeof patient.patient_profile.connected_at === 'string' ? patient.patient_profile.connected_at : ''
//         } : null,
//         last_session: typeof patient.last_session === 'string' ? patient.last_session : null,
//         next_session: typeof patient.next_session === 'string' ? patient.next_session : null,
//         total_sessions: patient.total_sessions?.toString() || '0',
//         created_at: typeof patient.created_at === 'string' ? patient.created_at : ''
//       }))
      
//       console.log('Cleaned patients data:', cleanedPatients)
//       setPatients(cleanedPatients)
//       setAllPatients(cleanedPatients)
//     } catch (error) {
//       console.error('Failed to fetch patients:', error)
//       Alert.alert('Error', 'Failed to load patients')
//     } finally {
//       setLoading(false)
//     }
//   }

//   const onRefresh = async () => {
//     setRefreshing(true)
//     await fetchPatients()
//     setRefreshing(false)
//   }

//   const searchPatients = async (query: string) => {
//     if (!query.trim()) {
//       fetchPatients()
//       return
//     }
    
//     try {
//       // For now, use local filtering since search endpoint might not be configured
//       // You can replace this with API call when backend search is ready
//       const filtered = allPatients.filter((patient: Patient) => {
//         const searchLower = query.toLowerCase()
//         const fullName = (patient.full_name || '').toLowerCase()
//         const email = (patient.email || '').toLowerCase()
//         const phone = patient.phone_number || ''
//         const primaryConcern = (patient.patient_profile?.primary_concern || '').toLowerCase()
        
//         return fullName.includes(searchLower) ||
//                email.includes(searchLower) ||
//                phone.includes(query) ||
//                primaryConcern.includes(searchLower)
//       })
//       setPatients(filtered)
//     } catch (error) {
//       console.error('Search failed:', error)
//       // Fallback to basic filtering
//       const filtered = allPatients.filter((patient: Patient) => {
//         const searchLower = query.toLowerCase()
//         const fullName = (patient.full_name || '').toLowerCase()
//         const email = (patient.email || '').toLowerCase()
//         const phone = patient.phone_number || ''
        
//         return fullName.includes(searchLower) ||
//                email.includes(searchLower) ||
//                phone.includes(query)
//       })
//       setPatients(filtered)
//     }
//   }

//   const handleCreatePatient = async () => {
//     // Validation
//     if (!newPatient.first_name || !newPatient.last_name || !newPatient.phone_number) {
//       Alert.alert('Error', 'Please fill in all required fields (First Name, Last Name, Phone Number)')
//       return
//     }

//     // Email validation (if provided)
//     if (newPatient.email) {
//       const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
//       if (!emailRegex.test(newPatient.email)) {
//         Alert.alert('Error', 'Please enter a valid email address')
//         return
//       }
//     }

//     // Date validation (if provided)
//     if (newPatient.date_of_birth) {
//       const dateRegex = /^\d{4}-\d{2}-\d{2}$/
//       if (!dateRegex.test(newPatient.date_of_birth)) {
//         Alert.alert('Error', 'Date of Birth must be in YYYY-MM-DD format')
//         return
//       }
//     }

//     // Phone validation
//     if (newPatient.phone_number && newPatient.phone_number.length < 10) {
//       Alert.alert('Error', 'Please enter a valid phone number')
//       return
//     }

//     try {
//       setSubmitting(true)
      
//       // Prepare data for API with all required fields
//       const patientData = {
//         first_name: newPatient.first_name.trim(),
//         last_name: newPatient.last_name.trim(),
//         email: newPatient.email.trim().toLowerCase() || '',
//         phone_number: newPatient.phone_number.trim(),
//         date_of_birth: newPatient.date_of_birth || '',
//         gender: newPatient.gender,
//         primary_concern: newPatient.primary_concern.trim() || '',
//         therapy_start_date: newPatient.therapy_start_date,
//         session_frequency: newPatient.session_frequency,
//         preferred_session_days: newPatient.preferred_session_days,
//         emergency_contact_name: newPatient.emergency_contact_name.trim() || '',
//         emergency_contact_phone: newPatient.emergency_contact_phone.trim() || '',
//         address: newPatient.address.trim() || '',
//         medical_history: newPatient.medical_history.trim() || '',
//         current_medications: newPatient.current_medications.trim() || '',
//         preferred_language: newPatient.preferred_language
//       }
      
//       // Log the data being sent for debugging
//       console.log('Creating patient with data:', patientData)
      
//       let response;
      
//       try {
//         // Try the main endpoint
//         response = await api.post('/therapy_sessions/patients/create/', patientData)
//       } catch (error: any) {
//         console.log('Main endpoint failed:', error.response?.status)
//         throw error  // Re-throw to be handled by outer catch
//       }
      
//       console.log('Patient creation response:', response.data)
      
//       Alert.alert('Success', 'Patient created successfully')
//       setShowAddModal(false)
//       resetForm()
//       fetchPatients()
      
//     } catch (error: any) {
//       console.error('Failed to create patient:', error)
      
//       // Handle the specific UserManager error
//       if (error.response?.data?.detail?.includes('UserManager')) {
//         Alert.alert(
//           'Backend Configuration Error', 
//           'There is a configuration issue with the backend. Please contact the administrator to fix the UserManager password generation issue.'
//         )
//         return
//       }
      
//       // Better error handling with specific messages
//       if (error.response) {
//         console.error('Error response data:', error.response.data)
//         console.error('Error response status:', error.response.status)
        
//         if (error.response.status === 400) {
//           const errorData = error.response.data
//           let errorMessage = 'Invalid data provided. Please check:\n'
          
//           if (errorData.email) {
//             errorMessage += `• Email: ${Array.isArray(errorData.email) ? errorData.email[0] : errorData.email}\n`
//           }
//           if (errorData.phone_number) {
//             errorMessage += `• Phone: ${Array.isArray(errorData.phone_number) ? errorData.phone_number[0] : errorData.phone_number}\n`
//           }
//           if (errorData.date_of_birth) {
//             errorMessage += `• Date of Birth: ${Array.isArray(errorData.date_of_birth) ? errorData.date_of_birth[0] : errorData.date_of_birth}\n`
//           }
//           if (errorData.first_name) {
//             errorMessage += `• First Name: ${Array.isArray(errorData.first_name) ? errorData.first_name[0] : errorData.first_name}\n`
//           }
//           if (errorData.last_name) {
//             errorMessage += `• Last Name: ${Array.isArray(errorData.last_name) ? errorData.last_name[0] : errorData.last_name}\n`
//           }
//           if (errorData.therapy_start_date) {
//             errorMessage += `• Therapy Start Date: ${Array.isArray(errorData.therapy_start_date) ? errorData.therapy_start_date[0] : errorData.therapy_start_date}\n`
//           }
//           if (errorData.preferred_session_days) {
//             errorMessage += `• Preferred Days: ${Array.isArray(errorData.preferred_session_days) ? errorData.preferred_session_days[0] : errorData.preferred_session_days}\n`
//           }
//           if (errorData.non_field_errors) {
//             errorMessage += `• ${Array.isArray(errorData.non_field_errors) ? errorData.non_field_errors[0] : errorData.non_field_errors}\n`
//           }
//           if (errorData.detail && !errorData.detail.includes('UserManager')) {
//             errorMessage += `• ${errorData.detail}\n`
//           }
          
//           Alert.alert('Validation Error', errorMessage)
//         } else if (error.response.status === 405) {
//           Alert.alert('Error', 'This endpoint method is not allowed. Please check the API configuration.')
//         } else {
//           Alert.alert('Error', `Failed to create patient (${error.response.status})`)
//         }
//       } else if (error.request) {
//         Alert.alert('Network Error', 'Unable to connect to server. Please check your internet connection.')
//       } else {
//         Alert.alert('Error', 'An unexpected error occurred')
//       }
//     } finally {
//       setSubmitting(false)
//     }
//   }

//   const resetForm = () => {
//     setNewPatient({
//       first_name: '',
//       last_name: '',
//       email: '',
//       phone_number: '',
//       date_of_birth: '',
//       gender: 'male',
//       primary_concern: '',
//       therapy_start_date: new Date().toISOString().split('T')[0],
//       session_frequency: 'weekly',
//       preferred_session_days: [],
//       emergency_contact_name: '',
//       emergency_contact_phone: '',
//       address: '',
//       medical_history: '',
//       current_medications: '',
//       preferred_language: 'en'
//     })
//   }

//   const togglePreferredDay = (day: string) => {
//     setNewPatient(prev => ({
//       ...prev,
//       preferred_session_days: prev.preferred_session_days.includes(day)
//         ? prev.preferred_session_days.filter(d => d !== day)
//         : [...prev.preferred_session_days, day]
//     }))
//   }

//   const getRiskLevel = (patient: Patient) => {
//     // Mock risk assessment - you can implement actual logic
//     const sessionCount = parseInt(patient.total_sessions || '0')
//     if (sessionCount === 0) return { level: 'new', color: '#007AFF' }
//     if (sessionCount < 3) return { level: 'medium', color: '#FF9500' }
//     return { level: 'low', color: '#34C759' }
//   }

//   const getMoodStatus = (patient: Patient) => {
//     // Use actual patient data when available
//     const primaryConcern = patient.patient_profile?.primary_concern || 'General therapy'
//     const sessionCount = parseInt(patient.total_sessions || '0')
    
//     // Determine mood based on session count and data
//     let mood = 'stable'
//     if (sessionCount === 0) mood = 'new patient'
//     else if (sessionCount < 3) mood = 'initial progress'
//     else if (sessionCount < 10) mood = 'improving'
//     else mood = 'ongoing treatment'
    
//     return {
//       mood,
//       condition: primaryConcern
//     }
//   }

//   const handleViewDetails = (patient: Patient) => {
//     router.push({
//       pathname: './patient-details',
//       params: { patientId: patient.id }
//     })
//   }

//   const handleStartSession = (patient: Patient) => {
//     setSelectedPatientForSession(patient)
//     setShowConsentModal(true)
//   }

//   const handleConsentAndStartSession = async () => {
//     if (!selectedPatientForSession) return

//     try {
//       setSubmitting(true)
      
//       // Validate required fields
//       if (!consentData.patient_goals.trim()) {
//         Alert.alert('Error', 'Please enter session goals.')
//         return
//       }

//       if (!consentData.consent_recording || !consentData.consent_ai_analysis) {
//         Alert.alert('Error', 'Both recording and AI analysis consent are required to proceed.')
//         return
//       }
      
//       // Step 1: Create a new session
//       const createSessionData = {
//         patient_id: selectedPatientForSession.id,
//         session_type: consentData.session_type,
//         scheduled_date: new Date().toISOString(),
//         duration_minutes: consentData.duration_minutes,
//         location: consentData.location,
//         is_online: consentData.is_online,
//         patient_goals: consentData.patient_goals,
//         fee_charged: consentData.fee_charged,
//         consent_recording: consentData.consent_recording,
//         consent_ai_analysis: consentData.consent_ai_analysis
//       }
      
//       console.log('Creating session with data:', createSessionData)
//       const createResponse = await api.post('/therapy_sessions/sessions/create/', createSessionData)
      
//       if (!createResponse.data?.id) {
//         throw new Error('Session creation failed - no session ID returned')
//       }
      
//       const sessionId = createResponse.data.id
//       console.log('Session created successfully with ID:', sessionId)
      
//       // Step 2: Start the session
//       const startSessionData = {
//         detail: "Starting therapy session",
//         session: {
//           status: "in_progress",
//           actual_start_time: new Date().toISOString()
//         }
//       }
      
//       console.log('Starting session with ID:', sessionId)
//       const startResponse = await api.post(`/therapy_sessions/sessions/${sessionId}/start/`, startSessionData)
      
//       console.log('Session started successfully:', startResponse.data)
      
//       // Close modal and reset state
//       setShowConsentModal(false)
//       setSelectedPatientForSession(null)
//       setConsentData({
//         session_type: 'individual',
//         duration_minutes: 60,
//         location: 'Office',
//         is_online: false,
//         patient_goals: '',
//         fee_charged: 0,
//         consent_recording: false,
//         consent_ai_analysis: false
//       })
      
//       // Step 3: Navigate to the session UI
//       router.push({
//         pathname: './start-session',
//         params: { 
//           patientId: selectedPatientForSession.id,
//           sessionId: sessionId,
//           sessionStarted: 'true'
//         }
//       })
      
//       // Refresh patients data after navigation to ensure counts are updated
//       setTimeout(() => {
//         fetchPatients()
//       }, 1000)
      
//     } catch (error: any) {
//       console.error('Failed to start session:', error)
      
//       let errorMessage = 'Failed to start session. Please try again.'
      
//       if (error.response) {
//         console.error('Error response:', error.response.data)
//         console.error('Error status:', error.response.status)
        
//         if (error.response.status === 400) {
//           errorMessage = 'Invalid session data. Please check the information provided.'
//         } else if (error.response.status === 403) {
//           errorMessage = 'You do not have permission to start sessions.'
//         } else if (error.response.status === 404) {
//           errorMessage = 'Patient not found.'
//         } else {
//           errorMessage = `Session creation failed (${error.response.status})`
//         }
//       } else if (error.request) {
//         errorMessage = 'Unable to connect to server. Please check your internet connection.'
//       }
      
//       Alert.alert('Error', errorMessage)
//     } finally {
//       setSubmitting(false)
//     }
//   }

//   const filteredPatients = patients.filter(patient => {
//     if (selectedFilter === 'All') return true
//     if (selectedFilter === 'New') return parseInt(patient.total_sessions || '0') === 0
//     if (selectedFilter === 'High-Risk') return parseInt(patient.total_sessions || '0') < 3
//     if (selectedFilter === 'Recently Active') return patient.last_session
    
//     return true
//   })

//   return (
//     <SafeAreaView style={[styles.container, { backgroundColor: themeStyle.background }]}>
//       {/* Header */}
//       <View style={[styles.header, { backgroundColor: '#00B894' }]}>
//         <Text style={styles.headerTitle}>My Patients</Text>
//         <TouchableOpacity 
//           style={styles.addButton}
//           onPress={() => setShowAddModal(true)}
//         >
//           <Text style={styles.addButtonText}>+</Text>
//         </TouchableOpacity>
//       </View>

//       {/* Search Bar */}
//       <View style={[styles.searchContainer, { backgroundColor: themeStyle.background }]}>
//         <TextInput
//           style={[styles.searchInput, { 
//             backgroundColor: themeStyle.dashboardcard,
//             color: themeStyle.text,
//             borderColor: themeStyle.border 
//           }]}
//           placeholder="Search patients..."
//           placeholderTextColor={themeStyle.label}
//           value={searchQuery}
//           onChangeText={(text) => {
//             setSearchQuery(text)
//             searchPatients(text)
//           }}
//         />
//       </View>

//       {/* Filter Tabs */}
//       <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
//         {filters.map((filter) => (
//           <TouchableOpacity
//             key={filter}
//             style={[
//               styles.filterTab,
//               selectedFilter === filter && styles.filterTabActive
//             ]}
//             onPress={() => setSelectedFilter(filter)}
//           >
//             <Text style={[
//               styles.filterText,
//               { color: selectedFilter === filter ? '#fff' : themeStyle.text }
//             ]}>
//               {filter}
//             </Text>
//           </TouchableOpacity>
//         ))}
//       </ScrollView>

//       {/* Patients List */}
//       {loading ? (
//         <View style={styles.loadingContainer}>
//           <ActivityIndicator size="large" color={themeStyle.text} />
//         </View>
//       ) : (
//         <ScrollView 
//           style={styles.patientsList}
//           refreshControl={
//             <RefreshControl
//               refreshing={refreshing}
//               onRefresh={onRefresh}
//               colors={['#007AFF']}
//               tintColor={themeStyle.text}
//             />
//           }
//         >
//           {filteredPatients.map((patient, index) => {
//             // Add debug logging to identify problematic data
//             console.log('Patient data:', JSON.stringify(patient, null, 2))
//             console.log(`Patient ${patient.full_name} - Total Sessions: "${patient.total_sessions}" (parsed: ${parseInt(patient.total_sessions || '0')})`)
            
//             // Ensure patient has a valid ID
//             if (!patient || !patient.id) {
//               console.warn('Invalid patient data found:', patient)
//               return null
//             }
            
//             const risk = getRiskLevel(patient)
//             const mood = getMoodStatus(patient)
//             const sessionCount = parseInt(patient.total_sessions || '0')
            
//             return (
//               <View key={patient.id || `patient-${index}`} style={[styles.patientCard, { backgroundColor: themeStyle.dashboardcard }]}>
//                 {/* Patient Header */}
//                 <View style={styles.patientHeader}>
//                   <View style={styles.patientInfo}>
//                     <Text style={styles.patientIcon}>👤</Text>
//                     <View>
//                       <Text style={[styles.patientName, { color: themeStyle.text }]}>
//                         {typeof patient.full_name === 'string' ? patient.full_name : 'Unknown Patient'} ({sessionCount})
//                       </Text>
//                       <View style={styles.conditionRow}>
//                         <Text style={[styles.conditionText, { color: themeStyle.label }]}>
//                           {typeof mood.condition === 'string' ? mood.condition : 'General therapy'}
//                         </Text>
//                       </View>
//                     </View>
//                   </View>
//                   <View style={[styles.riskBadge, { backgroundColor: risk.color }]}>
//                     <Text style={styles.riskText}>{risk.level}</Text>
//                   </View>
//                 </View>

//                 {/* Mood Status */}
//                 <View style={styles.moodRow}>
//                   <Text style={styles.moodIcon}>📈</Text>
//                   <Text style={[styles.moodText, { color: themeStyle.text }]}>
//                     Mood {mood.mood}
//                   </Text>
//                   <Text style={[styles.lastSession, { color: themeStyle.label }]}>
//                     Last session: {(() => {
//                       if (!patient.last_session || patient.last_session === 'null') {
//                         return 'No sessions yet'
//                       }
//                       // If it's a date string, format it nicely
//                       if (typeof patient.last_session === 'string') {
//                         try {
//                           const date = new Date(patient.last_session)
//                           if (!isNaN(date.getTime())) {
//                             return date.toLocaleDateString()
//                           }
//                         } catch {
//                           // If date parsing fails, return the raw string
//                         }
//                         return patient.last_session
//                       }
//                       return 'No sessions yet'
//                     })()}
//                   </Text>
//                 </View>

//                 {/* Action Buttons */}
//                 <View style={styles.actionButtons}>
//                   <TouchableOpacity
//                     style={[styles.detailsButton, { borderColor: themeStyle.border }]}
//                     onPress={() => handleViewDetails(patient)}
//                   >
//                     <Text style={[styles.detailsButtonText, { color: themeStyle.text }]}>
//                       View Details
//                     </Text>
//                   </TouchableOpacity>
//                   <TouchableOpacity
//                     style={styles.sessionButton}
//                     onPress={() => handleStartSession(patient)}
//                   >
//                     <Text style={styles.sessionButtonText}>Start Session</Text>
//                   </TouchableOpacity>
//                   <TouchableOpacity
//     // Edit Notes Button              
//   onPress={() => router.push({
//     pathname: '/edit-session-notes',
//     params: { sessionId, existingNotes, existingMood },
//   })}
// >
//   <Text>Edit Notes</Text>
// </TouchableOpacity>

//                 </View>
//               </View>
//             )
//           })}
//         </ScrollView>
//       )}

//       {/* Add Patient Modal */}
//       <Modal
//         visible={showAddModal}
//         animationType="slide"
//         presentationStyle="pageSheet"
//       >
//         <SafeAreaView style={[styles.modalContainer, { backgroundColor: themeStyle.background }]}>
//           <View style={styles.modalHeader}>
//             <TouchableOpacity onPress={() => setShowAddModal(false)}>
//               <Text style={[styles.cancelButton, { color: themeStyle.text }]}>Cancel</Text>
//             </TouchableOpacity>
//             <Text style={[styles.modalTitle, { color: themeStyle.text }]}>Add New Patient</Text>
//             <TouchableOpacity 
//               onPress={handleCreatePatient}
//               disabled={submitting}
//             >
//               <Text style={[styles.saveButton, { color: submitting ? themeStyle.label : '#007AFF' }]}>
//                 {submitting ? 'Saving...' : 'Save'}
//               </Text>
//             </TouchableOpacity>
//           </View>

//           <ScrollView style={styles.formContainer}>
//             {/* Basic Information */}
//             <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>Basic Information</Text>
            
//             <View style={styles.inputRow}>
//               <TextInput
//                 style={[styles.input, styles.halfInput, { backgroundColor: themeStyle.dashboardcard, color: themeStyle.text }]}
//                 placeholder="First Name *"
//                 placeholderTextColor={themeStyle.label}
//                 value={newPatient.first_name}
//                 onChangeText={(text) => setNewPatient(prev => ({...prev, first_name: text}))}
//               />
//               <TextInput
//                 style={[styles.input, styles.halfInput, { backgroundColor: themeStyle.dashboardcard, color: themeStyle.text }]}
//                 placeholder="Last Name *"
//                 placeholderTextColor={themeStyle.label}
//                 value={newPatient.last_name}
//                 onChangeText={(text) => setNewPatient(prev => ({...prev, last_name: text}))}
//               />
//             </View>

//             <TextInput
//               style={[styles.input, { backgroundColor: themeStyle.dashboardcard, color: themeStyle.text }]}
//               placeholder="Email"
//               placeholderTextColor={themeStyle.label}
//               value={newPatient.email}
//               onChangeText={(text) => setNewPatient(prev => ({...prev, email: text}))}
//               keyboardType="email-address"
//             />

//             <TextInput
//               style={[styles.input, { backgroundColor: themeStyle.dashboardcard, color: themeStyle.text }]}
//               placeholder="Phone Number *"
//               placeholderTextColor={themeStyle.label}
//               value={newPatient.phone_number}
//               onChangeText={(text) => setNewPatient(prev => ({...prev, phone_number: text}))}
//               keyboardType="phone-pad"
//             />

//             <TextInput
//               style={[styles.input, { backgroundColor: themeStyle.dashboardcard, color: themeStyle.text }]}
//               placeholder="Date of Birth (YYYY-MM-DD)"
//               placeholderTextColor={themeStyle.label}
//               value={newPatient.date_of_birth}
//               onChangeText={(text) => setNewPatient(prev => ({...prev, date_of_birth: text}))}
//             />

//             {/* Gender Selection */}
//             <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>Gender</Text>
//             <View style={styles.genderContainer}>
//               {['male', 'female', 'other', 'prefer_not_to_say'].map((gender) => (
//                 <TouchableOpacity
//                   key={gender}
//                   style={[
//                     styles.genderButton,
//                     newPatient.gender === gender && styles.genderButtonSelected
//                   ]}
//                   onPress={() => setNewPatient(prev => ({...prev, gender}))}
//                 >
//                   <Text style={[
//                     styles.genderButtonText,
//                     newPatient.gender === gender && styles.genderButtonTextSelected
//                   ]}>
//                     {gender.replace('_', ' ').charAt(0).toUpperCase() + gender.replace('_', ' ').slice(1)}
//                   </Text>
//                 </TouchableOpacity>
//               ))}
//             </View>

//             {/* Therapy Information */}
//             <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>Therapy Information</Text>
            
//             {/* Primary Concern */}
//             <TextInput
//               style={[styles.input, styles.textArea, { backgroundColor: themeStyle.dashboardcard, color: themeStyle.text }]}
//               placeholder="Primary Concern"
//               placeholderTextColor={themeStyle.label}
//               value={newPatient.primary_concern}
//               onChangeText={(text) => setNewPatient(prev => ({...prev, primary_concern: text}))}
//               multiline
//               numberOfLines={3}
//             />

//             {/* Therapy Start Date */}
//             <TextInput
//               style={[styles.input, { backgroundColor: themeStyle.dashboardcard, color: themeStyle.text }]}
//               placeholder="Therapy Start Date (YYYY-MM-DD)"
//               placeholderTextColor={themeStyle.label}
//               value={newPatient.therapy_start_date}
//               onChangeText={(text) => setNewPatient(prev => ({...prev, therapy_start_date: text}))}
//             />

//             {/* Session Frequency */}
//             <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>Session Frequency</Text>
//             <View style={styles.genderContainer}>
//               {[
//                 { value: 'weekly', label: 'Weekly' },
//                 { value: 'biweekly', label: 'Bi-weekly' },
//                 { value: 'monthly', label: 'Monthly' },
//                 { value: 'as_needed', label: 'As Needed' }
//               ].map((freq) => (
//                 <TouchableOpacity
//                   key={freq.value}
//                   style={[
//                     styles.genderButton,
//                     newPatient.session_frequency === freq.value && styles.genderButtonSelected
//                   ]}
//                   onPress={() => setNewPatient(prev => ({...prev, session_frequency: freq.value}))}
//                 >
//                   <Text style={[
//                     styles.genderButtonText,
//                     newPatient.session_frequency === freq.value && styles.genderButtonTextSelected
//                   ]}>
//                     {freq.label}
//                   </Text>
//                 </TouchableOpacity>
//               ))}
//             </View>

//             {/* Preferred Session Days */}
//             <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>Preferred Session Days</Text>
//             <View style={styles.daysContainer}>
//               {weekDays.map((day) => (
//                 <TouchableOpacity
//                   key={day}
//                   style={[
//                     styles.dayButton,
//                     newPatient.preferred_session_days.includes(day) && styles.dayButtonSelected
//                   ]}
//                   onPress={() => togglePreferredDay(day)}
//                 >
//                   <Text style={[
//                     styles.dayButtonText,
//                     newPatient.preferred_session_days.includes(day) && styles.dayButtonTextSelected
//                   ]}>
//                     {day.substring(0, 3)}
//                   </Text>
//                 </TouchableOpacity>
//               ))}
//             </View>

//             {/* Emergency Contact */}
//             <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>Emergency Contact</Text>
            
//             <TextInput
//               style={[styles.input, { backgroundColor: themeStyle.dashboardcard, color: themeStyle.text }]}
//               placeholder="Emergency Contact Name"
//               placeholderTextColor={themeStyle.label}
//               value={newPatient.emergency_contact_name}
//               onChangeText={(text) => setNewPatient(prev => ({...prev, emergency_contact_name: text}))}
//             />

//             <TextInput
//               style={[styles.input, { backgroundColor: themeStyle.dashboardcard, color: themeStyle.text }]}
//               placeholder="Emergency Contact Phone"
//               placeholderTextColor={themeStyle.label}
//               value={newPatient.emergency_contact_phone}
//               onChangeText={(text) => setNewPatient(prev => ({...prev, emergency_contact_phone: text}))}
//               keyboardType="phone-pad"
//             />

//             {/* Address Information */}
//             <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>Address Information</Text>
            
//             <TextInput
//               style={[styles.input, styles.textArea, { backgroundColor: themeStyle.dashboardcard, color: themeStyle.text }]}
//               placeholder="Complete Address"
//               placeholderTextColor={themeStyle.label}
//               value={newPatient.address}
//               onChangeText={(text) => setNewPatient(prev => ({...prev, address: text}))}
//               multiline
//               numberOfLines={3}
//             />

//             {/* Medical Information */}
//             <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>Medical Information</Text>
            
//             <TextInput
//               style={[styles.input, styles.textArea, { backgroundColor: themeStyle.dashboardcard, color: themeStyle.text }]}
//               placeholder="Medical History"
//               placeholderTextColor={themeStyle.label}
//               value={newPatient.medical_history}
//               onChangeText={(text) => setNewPatient(prev => ({...prev, medical_history: text}))}
//               multiline
//               numberOfLines={3}
//             />

//             <TextInput
//               style={[styles.input, styles.textArea, { backgroundColor: themeStyle.dashboardcard, color: themeStyle.text }]}
//               placeholder="Current Medications"
//               placeholderTextColor={themeStyle.label}
//               value={newPatient.current_medications}
//               onChangeText={(text) => setNewPatient(prev => ({...prev, current_medications: text}))}
//               multiline
//               numberOfLines={3}
//             />

//             {/* Preferred Language */}
//             <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>Preferred Language</Text>
//             <View style={styles.genderContainer}>
//               {[
//                 { value: 'en', label: 'English' },
//                 { value: 'ur', label: 'Urdu' }
//               ].map((lang) => (
//                 <TouchableOpacity
//                   key={lang.value}
//                   style={[
//                     styles.genderButton,
//                     newPatient.preferred_language === lang.value && styles.genderButtonSelected
//                   ]}
//                   onPress={() => setNewPatient(prev => ({...prev, preferred_language: lang.value}))}
//                 >
//                   <Text style={[
//                     styles.genderButtonText,
//                     newPatient.preferred_language === lang.value && styles.genderButtonTextSelected
//                   ]}>
//                     {lang.label}
//                   </Text>
//                 </TouchableOpacity>
//               ))}
//             </View>

//             <View style={styles.formSpacer} />
//           </ScrollView>
//         </SafeAreaView>
//       </Modal>

//       {/* Consent Modal */}
//       <Modal
//         visible={showConsentModal}
//         animationType="slide"
//         presentationStyle="pageSheet"
//       >
//         <SafeAreaView style={[styles.container, { backgroundColor: themeStyle.background }]}>
//           <View style={[styles.modalHeader, { backgroundColor: '#007AFF' }]}>
//             <TouchableOpacity onPress={() => setShowConsentModal(false)}>
//               <Text style={styles.modalCloseText}>×</Text>
//             </TouchableOpacity>
//             <Text style={styles.modalTitle}>Session Consent & Setup</Text>
//             <View style={{ width: 24 }} />
//           </View>
          
//           <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
//             <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>
//               Session Information
//             </Text>
            
//             {selectedPatientForSession && (
//               <Text style={[styles.patientInfoConsent, { color: themeStyle.label }]}>
//                 Patient: {selectedPatientForSession.full_name}
//               </Text>
//             )}

//             <View style={styles.inputRow}>
//               <View style={styles.halfInput}>
//                 <Text style={[styles.inputLabel, { color: themeStyle.text }]}>Session Type</Text>
//                 <View style={[styles.pickerContainer, { backgroundColor: themeStyle.dashboardcard, borderColor: themeStyle.border }]}>
//                   <Text style={[styles.pickerText, { color: themeStyle.text }]}>
//                     {consentData.session_type}
//                   </Text>
//                 </View>
//               </View>
              
//               <View style={styles.halfInput}>
//                 <Text style={[styles.inputLabel, { color: themeStyle.text }]}>Duration (min)</Text>
//                 <TextInput
//                   style={[styles.input, { backgroundColor: themeStyle.dashboardcard, color: themeStyle.text, borderColor: themeStyle.border }]}
//                   value={consentData.duration_minutes.toString()}
//                   onChangeText={(text) => setConsentData(prev => ({ ...prev, duration_minutes: parseInt(text) || 60 }))}
//                   keyboardType="numeric"
//                   placeholder="60"
//                   placeholderTextColor={themeStyle.label}
//                 />
//               </View>
//             </View>

//             <Text style={[styles.inputLabel, { color: themeStyle.text }]}>Location</Text>
//             <TextInput
//               style={[styles.input, { backgroundColor: themeStyle.dashboardcard, color: themeStyle.text, borderColor: themeStyle.border }]}
//               value={consentData.location}
//               onChangeText={(text) => setConsentData(prev => ({ ...prev, location: text }))}
//               placeholder="Office, Room 101"
//               placeholderTextColor={themeStyle.label}
//             />

//             <Text style={[styles.inputLabel, { color: themeStyle.text }]}>Session Goals *</Text>
//             <TextInput
//               style={[styles.input, styles.textArea, { backgroundColor: themeStyle.dashboardcard, color: themeStyle.text, borderColor: themeStyle.border }]}
//               value={consentData.patient_goals}
//               onChangeText={(text) => setConsentData(prev => ({ ...prev, patient_goals: text }))}
//               placeholder="What do you hope to accomplish in this session?"
//               placeholderTextColor={themeStyle.label}
//               multiline
//             />

//             <Text style={[styles.inputLabel, { color: themeStyle.text }]}>Fee Charged</Text>
//             <TextInput
//               style={[styles.input, { backgroundColor: themeStyle.dashboardcard, color: themeStyle.text, borderColor: themeStyle.border }]}
//               value={consentData.fee_charged.toString()}
//               onChangeText={(text) => setConsentData(prev => ({ ...prev, fee_charged: parseFloat(text) || 0 }))}
//               keyboardType="numeric"
//               placeholder="0"
//               placeholderTextColor={themeStyle.label}
//             />

//             <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>
//               Consent & Permissions
//             </Text>

//             <TouchableOpacity
//               style={[styles.checkboxContainer, { borderColor: themeStyle.border }]}
//               onPress={() => setConsentData(prev => ({ ...prev, is_online: !prev.is_online }))}
//             >
//               <View style={[styles.checkbox, consentData.is_online && styles.checkboxChecked]}>
//                 {consentData.is_online && <Text style={styles.checkmark}>✓</Text>}
//               </View>
//               <Text style={[styles.checkboxLabel, { color: themeStyle.text }]}>
//                 This is an online session
//               </Text>
//             </TouchableOpacity>

//             <TouchableOpacity
//               style={[styles.checkboxContainer, { borderColor: themeStyle.border }]}
//               onPress={() => setConsentData(prev => ({ ...prev, consent_recording: !prev.consent_recording }))}
//             >
//               <View style={[styles.checkbox, consentData.consent_recording && styles.checkboxChecked]}>
//                 {consentData.consent_recording && <Text style={styles.checkmark}>✓</Text>}
//               </View>
//               <Text style={[styles.checkboxLabel, { color: themeStyle.text }]}>
//                 I consent to audio recording of this session *
//               </Text>
//             </TouchableOpacity>

//             <TouchableOpacity
//               style={[styles.checkboxContainer, { borderColor: themeStyle.border }]}
//               onPress={() => setConsentData(prev => ({ ...prev, consent_ai_analysis: !prev.consent_ai_analysis }))}
//             >
//               <View style={[styles.checkbox, consentData.consent_ai_analysis && styles.checkboxChecked]}>
//                 {consentData.consent_ai_analysis && <Text style={styles.checkmark}>✓</Text>}
//               </View>
//               <Text style={[styles.checkboxLabel, { color: themeStyle.text }]}>
//                 I consent to AI analysis of session content for therapeutic insights *
//               </Text>
//             </TouchableOpacity>

//             <Text style={[styles.consentNote, { color: themeStyle.label }]}>
//               * Required for session creation. The recording and AI analysis help provide better therapeutic insights and session documentation.
//             </Text>

//             <View style={styles.modalButtons}>
//               <TouchableOpacity
//                 style={[styles.modalButton, styles.cancelButtonConsent]}
//                 onPress={() => setShowConsentModal(false)}
//               >
//                 <Text style={styles.cancelButtonTextConsent}>Cancel</Text>
//               </TouchableOpacity>
              
//               <TouchableOpacity
//                 style={[styles.modalButton, styles.confirmButtonConsent]}
//                 onPress={handleConsentAndStartSession}
//                 disabled={submitting}
//               >
//                 {submitting ? (
//                   <ActivityIndicator color="white" size="small" />
//                 ) : (
//                   <Text style={styles.confirmButtonTextConsent}>Start Session</Text>
//                 )}
//               </TouchableOpacity>
//             </View>

//             <View style={styles.formSpacer} />
//           </ScrollView>
//         </SafeAreaView>
//       </Modal>
//     </SafeAreaView>
//   )
// }

// export default Patients

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//   },
//   header: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     paddingHorizontal: 20,
//     paddingVertical: 15,
//     paddingTop: 50,
//   },
//   headerTitle: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     color: 'white',
//   },
//   addButton: {
//     backgroundColor: 'rgba(255,255,255,0.2)',
//     width: 36,
//     height: 36,
//     borderRadius: 18,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   addButtonText: {
//     color: 'white',
//     fontSize: 24,
//     fontWeight: 'bold',
//   },
//   searchContainer: {
//     paddingHorizontal: 20,
//     paddingVertical: 15,
//   },
//   searchInput: {
//     height: 40,
//     borderRadius: 20,
//     paddingHorizontal: 15,
//     borderWidth: 1,
//   },
//   filterContainer: {
//     paddingHorizontal: 20,
//     marginBottom: 15,
//   },
//   filterTab: {
//     paddingHorizontal: 16,
//     paddingVertical: 8,
//     borderRadius: 20,
//     marginRight: 10,
//     backgroundColor: '#f0f0f0',
//   },
//   filterTabActive: {
//     backgroundColor: '#007AFF',
//   },
//   filterText: {
//     fontSize: 14,
//     fontWeight: '500',
//   },
//   loadingContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   patientsList: {
//     flex: 1,
//     paddingHorizontal: 20,
//   },
//   patientCard: {
//     borderRadius: 12,
//     padding: 16,
//     marginBottom: 12,
//     elevation: 2,
//     shadowColor: '#000',
//     shadowOpacity: 0.1,
//     shadowOffset: { width: 0, height: 2 },
//     shadowRadius: 4,
//   },
//   patientHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'flex-start',
//     marginBottom: 12,
//   },
//   patientInfo: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     flex: 1,
//   },
//   patientIcon: {
//     fontSize: 24,
//     marginRight: 12,
//   },
//   patientName: {
//     fontSize: 16,
//     fontWeight: 'bold',
//     marginBottom: 4,
//   },
//   conditionRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//   },
//   conditionText: {
//     fontSize: 14,
//     marginRight: 8,
//   },
//   riskBadge: {
//     paddingHorizontal: 8,
//     paddingVertical: 4,
//     borderRadius: 12,
//   },
//   riskText: {
//     color: 'white',
//     fontSize: 12,
//     fontWeight: 'bold',
//   },
//   moodRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginBottom: 16,
//   },
//   moodIcon: {
//     fontSize: 16,
//     marginRight: 8,
//   },
//   moodText: {
//     fontSize: 14,
//     flex: 1,
//   },
//   lastSession: {
//     fontSize: 12,
//   },
//   actionButtons: {
//     flexDirection: 'row',
//     gap: 12,
//   },
//   detailsButton: {
//     flex: 1,
//     paddingVertical: 10,
//     paddingHorizontal: 16,
//     borderRadius: 8,
//     borderWidth: 1,
//     alignItems: 'center',
//   },
//   detailsButtonText: {
//     fontSize: 14,
//     fontWeight: '500',
//   },
//   sessionButton: {
//     flex: 1,
//     paddingVertical: 10,
//     paddingHorizontal: 16,
//     borderRadius: 8,
//     backgroundColor: '#8B5CF6',
//     alignItems: 'center',
//   },
//   sessionButtonText: {
//     color: 'white',
//     fontSize: 14,
//     fontWeight: '500',
//   },
//   modalContainer: {
//     flex: 1,
//   },
//   modalHeader: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     paddingHorizontal: 20,
//     paddingVertical: 15,
//     borderBottomWidth: 1,
//     borderBottomColor: '#e0e0e0',
//   },
//   cancelButton: {
//     fontSize: 16,
//   },
//   modalTitle: {
//     fontSize: 18,
//     fontWeight: 'bold',
//   },
//   saveButton: {
//     fontSize: 16,
//     fontWeight: '600',
//   },
//   formContainer: {
//     flex: 1,
//     paddingHorizontal: 20,
//     paddingTop: 20,
//   },
//   sectionTitle: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     marginBottom: 15,
//     marginTop: 10,
//   },
//   inputRow: {
//     flexDirection: 'row',
//     gap: 10,
//   },
//   input: {
//     height: 50,
//     borderRadius: 8,
//     paddingHorizontal: 15,
//     marginBottom: 15,
//     borderWidth: 1,
//     borderColor: '#e0e0e0',
//   },
//   halfInput: {
//     flex: 1,
//   },
//   textArea: {
//     height: 80,
//     paddingTop: 15,
//     textAlignVertical: 'top',
//   },
//   daysContainer: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     gap: 8,
//     marginBottom: 20,
//   },
//   dayButton: {
//     paddingHorizontal: 12,
//     paddingVertical: 8,
//     borderRadius: 20,
//     backgroundColor: '#f0f0f0',
//   },
//   dayButtonSelected: {
//     backgroundColor: '#007AFF',
//   },
//   dayButtonText: {
//     fontSize: 12,
//     fontWeight: '500',
//     color: '#333',
//   },
//   dayButtonTextSelected: {
//     color: 'white',
//   },
//   genderContainer: {
//     flexDirection: 'row',
//     gap: 10,
//     marginBottom: 20,
//   },
//   genderButton: {
//     flex: 1,
//     paddingHorizontal: 16,
//     paddingVertical: 12,
//     borderRadius: 8,
//     backgroundColor: '#f0f0f0',
//     alignItems: 'center',
//   },
//   genderButtonSelected: {
//     backgroundColor: '#007AFF',
//   },
//   genderButtonText: {
//     fontSize: 14,
//     fontWeight: '500',
//     color: '#333',
//   },
//   genderButtonTextSelected: {
//     color: 'white',
//   },
//   formSpacer: {
//     height: 50,
//   },
//   inputLabel: {
//     fontSize: 14,
//     fontWeight: '500',
//     marginBottom: 5,
//   },
//   patientInfoConsent: {
//     fontSize: 16,
//     fontWeight: '500',
//     marginBottom: 20,
//     padding: 15,
//     backgroundColor: '#f8f9fa',
//     borderRadius: 8,
//   },
//   pickerContainer: {
//     height: 50,
//     borderRadius: 8,
//     paddingHorizontal: 15,
//     marginBottom: 15,
//     borderWidth: 1,
//     justifyContent: 'center',
//   },
//   pickerText: {
//     fontSize: 16,
//     textTransform: 'capitalize',
//   },
//   checkboxContainer: {
//     flexDirection: 'row',
//     alignItems: 'flex-start',
//     marginBottom: 15,
//     padding: 15,
//     borderRadius: 8,
//     borderWidth: 1,
//   },
//   checkbox: {
//     width: 20,
//     height: 20,
//     borderWidth: 2,
//     borderColor: '#007AFF',
//     borderRadius: 3,
//     marginRight: 12,
//     alignItems: 'center',
//     justifyContent: 'center',
//     marginTop: 2,
//   },
//   checkboxChecked: {
//     backgroundColor: '#007AFF',
//   },
//   checkmark: {
//     color: 'white',
//     fontSize: 12,
//     fontWeight: 'bold',
//   },
//   checkboxLabel: {
//     fontSize: 14,
//     lineHeight: 20,
//     flex: 1,
//   },
//   consentNote: {
//     fontSize: 12,
//     fontStyle: 'italic',
//     marginTop: 10,
//     marginBottom: 20,
//     paddingHorizontal: 15,
//   },
//   modalContent: {
//     flex: 1,
//     padding: 20,
//   },
//   modalCloseText: {
//     fontSize: 24,
//     color: 'white',
//     fontWeight: 'bold',
//   },
//   modalButtons: {
//     flexDirection: 'row',
//     gap: 10,
//     marginTop: 20,
//   },
//   modalButton: {
//     flex: 1,
//     paddingVertical: 15,
//     borderRadius: 8,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   cancelButtonConsent: {
//     backgroundColor: '#f0f0f0',
//   },
//   confirmButtonConsent: {
//     backgroundColor: '#007AFF',
//   },
//   cancelButtonTextConsent: {
//     color: '#333',
//     fontSize: 16,
//     fontWeight: '500',
//   },
//   confirmButtonTextConsent: {
//     color: 'white',
//     fontSize: 16,
//     fontWeight: '500',
//   },
// })

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

const Patients = () => {
  const { themeStyle } = useTheme()
  
  const [patients, setPatients] = useState<Patient[]>([])
  const [allPatients, setAllPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFilter, setSelectedFilter] = useState('All')
  const [showAddModal, setShowAddModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  
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

  // Consent modal state
  const [showConsentModal, setShowConsentModal] = useState(false)
  const [selectedPatientForSession, setSelectedPatientForSession] = useState<Patient | null>(null)
  const [consentData, setConsentData] = useState({
    session_type: 'individual',
    duration_minutes: 60,
    location: 'Office',
    is_online: false,
    patient_goals: '',
    fee_charged: 0,
    consent_recording: false,
    consent_ai_analysis: false
  })

  const filters = ['All', 'High-Risk', 'New', 'Recently Active']
  const weekDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

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
      
      Alert.alert('Success', 'Patient created successfully')
      setShowAddModal(false)
      resetForm()
      fetchPatients()
      
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

  const resetForm = () => {
    setNewPatient({
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
  }

  const togglePreferredDay = (day: string) => {
    setNewPatient(prev => ({
      ...prev,
      preferred_session_days: prev.preferred_session_days.includes(day)
        ? prev.preferred_session_days.filter(d => d !== day)
        : [...prev.preferred_session_days, day]
    }))
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

  const handleStartSession = (patient: Patient) => {
    setSelectedPatientForSession(patient)
    setShowConsentModal(true)
  }

  const handleConsentAndStartSession = async () => {
    if (!selectedPatientForSession) return

    try {
      setSubmitting(true)
      
      // Validate required fields
      if (!consentData.patient_goals.trim()) {
        Alert.alert('Error', 'Please enter session goals.')
        return
      }

      if (!consentData.consent_recording || !consentData.consent_ai_analysis) {
        Alert.alert('Error', 'Both recording and AI analysis consent are required to proceed.')
        return
      }
      
      // Step 1: Create a new session
      const createSessionData = {
        patient_id: selectedPatientForSession.id,
        session_type: consentData.session_type,
        scheduled_date: new Date().toISOString(),
        duration_minutes: consentData.duration_minutes,
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
      
      // Step 2: Start the session
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
      
      // Close modal and reset state
      setShowConsentModal(false)
      setSelectedPatientForSession(null)
      setConsentData({
        session_type: 'individual',
        duration_minutes: 60,
        location: 'Office',
        is_online: false,
        patient_goals: '',
        fee_charged: 0,
        consent_recording: false,
        consent_ai_analysis: false
      })
      
      // Step 3: Navigate to the session UI
      router.push({
        pathname: './start-session',
        params: { 
          patientId: selectedPatientForSession.id,
          sessionId: sessionId,
          sessionStarted: 'true'
        }
      })
      
      // Refresh patients data after navigation to ensure counts are updated
      setTimeout(() => {
        fetchPatients()
      }, 1000)
      
    } catch (error: any) {
      console.error('Failed to start session:', error)
      
      let errorMessage = 'Failed to start session. Please try again.'
      
      if (error.response) {
        console.error('Error response:', error.response.data)
        console.error('Error status:', error.response.status)
        
        if (error.response.status === 400) {
          errorMessage = 'Invalid session data. Please check the information provided.'
        } else if (error.response.status === 403) {
          errorMessage = 'You do not have permission to start sessions.'
        } else if (error.response.status === 404) {
          errorMessage = 'Patient not found.'
        } else {
          errorMessage = `Session creation failed (${error.response.status})`
        }
      } else if (error.request) {
        errorMessage = 'Unable to connect to server. Please check your internet connection.'
      }
      
      Alert.alert('Error', errorMessage)
    } finally {
      setSubmitting(false)
    }
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
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
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
            const sessionCount = parseInt(patient.total_sessions || '0')
            
            return (
              <View key={patient.id || `patient-${index}`} style={[styles.patientCard, { backgroundColor: themeStyle.dashboardcard }]}>
                {/* Patient Header */}
                <View style={styles.patientHeader}>
                  <View style={styles.patientInfo}>
                    <Text style={styles.patientIcon}>👤</Text>
                    <View>
                      <Text style={[styles.patientName, { color: themeStyle.text }]}>
                        {typeof patient.full_name === 'string' ? patient.full_name : 'Unknown Patient'} ({sessionCount})
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
                    Last session: {(() => {
                      if (!patient.last_session || patient.last_session === 'null') {
                        return 'No sessions yet'
                      }
                      // If it's a date string, format it nicely
                      if (typeof patient.last_session === 'string') {
                        try {
                          const date = new Date(patient.last_session)
                          if (!isNaN(date.getTime())) {
                            return date.toLocaleDateString()
                          }
                        } catch {
                          // If date parsing fails, return the raw string
                        }
                        return patient.last_session
                      }
                      return 'No sessions yet'
                    })()}
                  </Text>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.detailsButton, { borderColor: themeStyle.border }]}
                    onPress={() => handleViewDetails(patient)}
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
                  <TouchableOpacity
                    style={[styles.detailsButton, { borderColor: themeStyle.border }]}
                    onPress={() => handleViewSession(patient)}
                  >
                    <Text style={[styles.detailsButtonText, { color: themeStyle.text }]}>
                      View 
                    </Text>
                  </TouchableOpacity>
                

                </View>
              </View>
            )
          })}
        </ScrollView>
      )}

      {/* Add Patient Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: themeStyle.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Text style={[styles.cancelButton, { color: themeStyle.text }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: themeStyle.text }]}>Add New Patient</Text>
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
      </Modal>

      {/* Consent Modal */}
      <Modal
        visible={showConsentModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={[styles.container, { backgroundColor: themeStyle.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: '#007AFF' }]}>
            <TouchableOpacity onPress={() => setShowConsentModal(false)}>
              <Text style={styles.modalCloseText}>×</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Session Consent & Setup</Text>
            <View style={{ width: 24 }} />
          </View>
          
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>
              Session Information
            </Text>
            
            {selectedPatientForSession && (
              <Text style={[styles.patientInfoConsent, { color: themeStyle.label }]}>
                Patient: {selectedPatientForSession.full_name}
              </Text>
            )}

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
                  onChangeText={(text) => setConsentData(prev => ({ ...prev, duration_minutes: parseInt(text) || 60 }))}
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

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButtonConsent]}
                onPress={() => setShowConsentModal(false)}
              >
                <Text style={styles.cancelButtonTextConsent}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButtonConsent]}
                onPress={handleConsentAndStartSession}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.confirmButtonTextConsent}>Start Session</Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.formSpacer} />
          </ScrollView>
        </SafeAreaView>
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
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  searchInput: {
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 15,
    borderWidth: 1,
  },
  filterContainer: {
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: '#f0f0f0',
  },
  filterTabActive: {
    backgroundColor: '#007AFF',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  patientsList: {
    flex: 1,
    paddingHorizontal: 20,
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
})