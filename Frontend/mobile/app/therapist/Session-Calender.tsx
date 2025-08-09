// import React, { useEffect, useState } from 'react'
// import {
//   StyleSheet,
//   View,
//   Text,
//   SafeAreaView,
//   TouchableOpacity,
//   ActivityIndicator,
//   ScrollView,
//   Alert
// } from 'react-native'
// import { useTheme } from '../contexts/ThemeContext'
// import { useRouter } from 'expo-router'
// import { Calendar } from 'react-native-calendars'
// import api from '../utils/api'

// type SessionType = {
//   id: string
//   patient_name: string
//   time: string
//   status: string
// }

// const SessionsCalendar = () => {
//   const { themeStyle } = useTheme()
//   const router = useRouter()
//   const [selectedDate, setSelectedDate] = useState<string>(
//     new Date().toISOString().slice(0, 10)
//   )
//   const [sessions, setSessions] = useState<SessionType[]>([])
//   const [loading, setLoading] = useState(false)

//   const fetchSessions = async (date: string) => {
//     try {
//       setLoading(true)
//       const response = await api.get(`/therapy_sessions/sessions/?date=${date}&limit=50`)
//       if (response.data && Array.isArray(response.data)) {
//         // Map API fields to your UI expectations
//         const mapped = response.data.map((s: any) => ({
//           id: s.id,
//           patient_name: s.patient || 'Unknown',
//           time: s.time || 'Unknown time',
//           status: s.status || 'UNKNOWN'
//         }))
//         setSessions(mapped)
//       } else {
//         setSessions([])
//       }
//     } catch (error) {
//       console.error('Failed to fetch sessions:', error)
//       Alert.alert('Error', 'Could not load sessions.')
//     } finally {
//       setLoading(false)
//     }
//   }

//   useEffect(() => {
//     fetchSessions(selectedDate)
//   }, [selectedDate])

//   const getStatusStyle = (status: string) => {
//     switch (status) {
//       case 'IN_PROGRESS':
//       case 'REQUESTED':
//       case 'upcoming':
//         return styles.statusUpcoming
//       case 'COMPLETE':
//       case 'completed':
//         return styles.statusCompleted
//       case 'CANCELLED':
//         return styles.statusCancelled
//       default:
//         return styles.statusUnknown
//     }
//   }

//   return (
//     <SafeAreaView style={[styles.container, { backgroundColor: themeStyle.background }]}>
//       <View style={styles.header}>
//         <TouchableOpacity onPress={() => router.back()}>
//           <Text style={styles.backText}>←</Text>
//         </TouchableOpacity>
//         <Text style={styles.headerTitle}>Sessions Calendar</Text>
//         <View style={{ width: 24 }} />
//       </View>

//       <Calendar
//         onDayPress={(day) => setSelectedDate(day.dateString)}
//         markedDates={{
//           [selectedDate]: { selected: true, selectedColor: '#00B894' }
//         }}
//         theme={{
//           backgroundColor: themeStyle.background,
//           calendarBackground: themeStyle.background,
//           textSectionTitleColor: themeStyle.text,
//           selectedDayBackgroundColor: '#00B894',
//           selectedDayTextColor: '#ffffff',
//           dayTextColor: themeStyle.text,
//           todayTextColor: '#00B894',
//           arrowColor: '#00B894',
//           monthTextColor: themeStyle.text,
//         }}
//       />

//       <View style={styles.sessionsHeader}>
//         <Text style={[styles.sessionsTitle, { color: themeStyle.text }]}>
//           Sessions for {new Date(selectedDate).toLocaleDateString()}
//         </Text>
//       </View>

//       {loading ? (
//         <View style={styles.loadingContainer}>
//           <ActivityIndicator size="large" color={themeStyle.text} />
//         </View>
//       ) : (
//         <ScrollView style={styles.sessionsList}>
//           {sessions.length === 0 ? (
//             <Text style={[styles.noSessionsText, { color: themeStyle.label }]}>
//               No sessions scheduled.
//             </Text>
//           ) : (
//             sessions.map((session) => (
//               <View
//                 key={session.id}
//                 style={[
//                   styles.sessionItem,
//                   { backgroundColor: themeStyle.dashboardcard }
//                 ]}
//               >
//                 <View style={styles.sessionInfo}>
//                   <Text style={[styles.sessionName, { color: themeStyle.text }]}>
//                     {session.patient_name}
//                   </Text>
//                   <Text style={[styles.sessionTime, { color: themeStyle.label }]}>
//                     {session.time}
//                   </Text>
//                 </View>
//                 <View style={[styles.sessionStatus, getStatusStyle(session.status)]}>
//                   <Text style={styles.statusText}>{session.status.toLowerCase()}</Text>
//                 </View>
//               </View>
//             ))
//           )}
//           <View style={styles.bottomSpacer} />
//         </ScrollView>
//       )}
//     </SafeAreaView>
//   )
// }

// export default SessionsCalendar

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
//     backgroundColor: '#00B894',
//   },
//   backText: {
//     color: 'white',
//     fontSize: 24,
//     fontWeight: 'bold',
//   },
//   headerTitle: {
//     fontSize: 20,
//     fontWeight: 'bold',
//     color: 'white',
//   },
//   sessionsHeader: {
//     paddingHorizontal: 20,
//     paddingVertical: 12,
//   },
//   sessionsTitle: {
//     fontSize: 16,
//     fontWeight: '600',
//   },
//   loadingContainer: {
//     padding: 20,
//   },
//   sessionsList: {
//     paddingHorizontal: 20,
//   },
//   noSessionsText: {
//     textAlign: 'center',
//     marginTop: 20,
//   },
//   sessionItem: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     padding: 16,
//     borderRadius: 12,
//     marginBottom: 12,
//     elevation: 1,
//   },
//   sessionInfo: {
//     flex: 1,
//   },
//   sessionName: {
//     fontSize: 16,
//     fontWeight: '600',
//   },
//   sessionTime: {
//     fontSize: 14,
//   },
//   sessionStatus: {
//     paddingVertical: 4,
//     paddingHorizontal: 8,
//     borderRadius: 8,
//   },
//   statusText: {
//     color: 'white',
//     fontSize: 12,
//     fontWeight: '600',
//     textTransform: 'capitalize',
//   },
//   statusUpcoming: {
//     backgroundColor: '#0984E3',
//   },
//   statusCompleted: {
//     backgroundColor: '#00B894',
//   },
//   statusCancelled: {
//     backgroundColor: '#D63031',
//   },
//   statusUnknown: {
//     backgroundColor: '#636E72',
//   },
//   bottomSpacer: {
//     height: 40,
//   },
// })

import React, { useEffect, useState, useMemo } from 'react'
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  Dimensions
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../contexts/ThemeContext'
import { useRouter } from 'expo-router'
import { Calendar } from 'react-native-calendars'
import { useSessionCalendar } from '../hooks/useTherapist'
import { CalendarSession } from '../types/therapist'

const { width } = Dimensions.get('window')

const SessionsCalendar = () => {
  const { themeStyle } = useTheme()
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  )

  // Use the structured hook for calendar data
  const { 
    sessions: allSessions, 
    loading, 
    error,
    fetchSessionsForDate 
  } = useSessionCalendar()

  // Filter sessions for the selected date
  const sessionsForDate = useMemo(() => {
    if (!allSessions) return []
    
    return allSessions.filter(session => {
      const sessionDate = session.session_date?.split('T')[0]
      return sessionDate === selectedDate
    })
  }, [allSessions, selectedDate])

  // Refresh sessions when date changes
  useEffect(() => {
    fetchSessionsForDate(selectedDate)
  }, [selectedDate, fetchSessionsForDate])

  // Handle error state
  useEffect(() => {
    if (error) {
      Alert.alert('Error', 'Could not load sessions. Please try again.')
    }
  }, [error])

  const getStatusStyle = (status: string) => {
    switch (status.toUpperCase()) {
      case 'IN_PROGRESS':
      case 'REQUESTED':
      case 'SCHEDULED':
        return { backgroundColor: '#6C5CE7', borderColor: '#5A4FCF' }
      case 'COMPLETED':
        return { backgroundColor: '#524f85', borderColor: '#45407A' }
      case 'CANCELLED':
        return { backgroundColor: '#E74C3C', borderColor: '#C0392B' }
      default:
        return { backgroundColor: '#95A5A6', borderColor: '#7F8C8D' }
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case 'IN_PROGRESS':
        return 'play-circle-outline'
      case 'REQUESTED':
      case 'SCHEDULED':
        return 'calendar-outline'
      case 'COMPLETED':
        return 'checkmark-circle-outline'
      case 'CANCELLED':
        return 'close-circle-outline'
      default:
        return 'help-circle-outline'
    }
  }

  const formatTime = (sessionDate: string) => {
    try {
      const date = new Date(sessionDate)
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      })
    } catch {
      return 'Time not set'
    }
  }

  const handleViewDetails = (sessionId: string, patientName: string) => {
    router.push({
      pathname: './session-detail-view',
      params: {
        sessionId: sessionId,
        patientName: patientName
      }
    })
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeStyle.background }]}>
      {/* Professional Header */}
      <View style={[styles.headerGradient, { backgroundColor: themeStyle.button }]}>
        <View style={styles.headerContainer}>
          <TouchableOpacity 
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Session Calendar</Text>
            <Text style={styles.headerSubtitle}>Professional Scheduling</Text>
          </View>
          
          <TouchableOpacity style={styles.calendarButton}>
            <Ionicons name="calendar-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Enhanced Calendar Section */}
      <View style={styles.calendarContainer}>
        <Calendar
          onDayPress={(day) => setSelectedDate(day.dateString)}
          markedDates={{
            [selectedDate]: { 
              selected: true, 
              selectedColor: themeStyle.button,
              selectedTextColor: '#FFFFFF'
            }
          }}
          theme={{
            backgroundColor: 'transparent',
            calendarBackground: 'transparent',
            textSectionTitleColor: themeStyle.text,
            selectedDayBackgroundColor: themeStyle.button,
            selectedDayTextColor: '#FFFFFF',
            dayTextColor: themeStyle.text,
            todayTextColor: themeStyle.logoutButton,
            arrowColor: themeStyle.logoutButton,
            monthTextColor: themeStyle.logoutButton,
            textMonthFontWeight: '600',
            textDayFontSize: 16,
            textMonthFontSize: 18,
          }}
          style={styles.calendar}
        />
      </View>

      {/* Sessions Header with Count */}
      <View style={styles.sessionsHeaderContainer}>
        <View style={styles.sessionsHeaderLeft}>
          <Ionicons name="time-outline" size={20} color={themeStyle.text} />
          <Text style={[styles.sessionsTitle, { color: themeStyle.text }]}>
            Sessions for {new Date(selectedDate).toLocaleDateString('en-US', { 
              weekday: 'long',
              month: 'long', 
              day: 'numeric' 
            })}
          </Text>
        </View>
        <View style={[styles.sessionCount, { backgroundColor: themeStyle.button }]}>
          <Text style={styles.sessionCountText}>
            {sessionsForDate.length}
          </Text>
        </View>
      </View>

      {/* Enhanced Sessions List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeStyle.button} />
          <Text style={[styles.loadingText, { color: themeStyle.label }]}>
            Loading sessions...
          </Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.sessionsList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.sessionsScrollContent}
        >
          {sessionsForDate.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <Ionicons name="calendar-clear-outline" size={64} color={themeStyle.label} />
              <Text style={[styles.emptyStateTitle, { color: themeStyle.text }]}>
                No Sessions Scheduled
              </Text>
              <Text style={[styles.emptyStateSubtitle, { color: themeStyle.label }]}>
                Your calendar is clear for this date
              </Text>
            </View>
          ) : (
            sessionsForDate.map((session: CalendarSession, index: number) => (
              <View
                key={session.id}
                style={[
                  styles.sessionCard,
                  { 
                    backgroundColor: themeStyle.dashboardcard,
                    shadowColor: themeStyle.text,
                  }
                ]}
              >
                <View style={styles.sessionCardHeader}>
                  <View style={styles.sessionCardLeft}>
                    <View style={styles.sessionTimeContainer}>
                      <Ionicons name="time-outline" size={16} color={themeStyle.button} />
                      <Text style={[styles.sessionTime, { color: themeStyle.text }]}>
                        {formatTime(session.session_date)}
                      </Text>
                    </View>
                    <Text style={[styles.sessionPatientName, { color: themeStyle.text }]}>
                      {session.patient_name}
                    </Text>
                  </View>
                  
                  <View style={[
                    styles.sessionStatus, 
                    getStatusStyle(session.status),
                    { borderWidth: 1 }
                  ]}>
                    <Ionicons 
                      name={getStatusIcon(session.status)} 
                      size={14} 
                      color="white" 
                      style={styles.statusIcon}
                    />
                    <Text style={styles.statusText}>
                      {session.status.toLowerCase().replace('_', ' ')}
                    </Text>
                  </View>
                </View>

                <View style={styles.sessionDetails}>
                  <View style={styles.sessionDetailRow}>
                    <Ionicons name="medical-outline" size={14} color={themeStyle.button} />
                    <Text style={[styles.sessionDetailText, { color: themeStyle.label }]}>
                      {session.session_type}
                    </Text>
                  </View>
                  
                  <View style={styles.sessionDetailRow}>
                    <Ionicons name="location-outline" size={14} color={themeStyle.button} />
                    <Text style={[styles.sessionDetailText, { color: themeStyle.label }]}>
                      {session.location}
                    </Text>
                  </View>
                  
                  <View style={styles.sessionDetailRow}>
                    <Ionicons name="hourglass-outline" size={14} color={themeStyle.button} />
                    <Text style={[styles.sessionDetailText, { color: themeStyle.label }]}>
                      {session.duration_minutes} minutes
                    </Text>
                  </View>
                </View>

                <TouchableOpacity 
                  style={[styles.sessionActionButton, { 
                    backgroundColor: `${themeStyle.button}15`,
                    borderColor: themeStyle.button 
                  }]}
                  onPress={() => handleViewDetails(session.id, session.patient_name)}
                >
                  <Text style={[styles.sessionActionText, { color: themeStyle.button }]}>
                    View Details
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={themeStyle.button} />
                </TouchableOpacity>
              </View>
            ))
          )}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

export default SessionsCalendar

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '400',
    marginTop: 2,
  },
  calendarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: 'transparent',
  },
  calendar: {
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  sessionsHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(82, 79, 133, 0.1)',
  },
  sessionsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sessionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    letterSpacing: 0.3,
  },
  sessionCount: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  sessionCountText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '500',
  },
  sessionsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sessionsScrollContent: {
    paddingBottom: 20,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  sessionCard: {
    borderRadius: 16,
    marginBottom: 16,
    padding: 20,
    elevation: 3,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(82, 79, 133, 0.1)',
  },
  sessionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  sessionCardLeft: {
    flex: 1,
  },
  sessionTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sessionTime: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  sessionPatientName: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  sessionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginLeft: 12,
  },
  statusIcon: {
    marginRight: 4,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  sessionDetails: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(82, 79, 133, 0.1)',
    paddingTop: 16,
    marginBottom: 16,
  },
  sessionDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sessionDetailText: {
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
  },
  sessionActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
  },
  sessionActionText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  bottomSpacer: {
    height: 40,
  },
  // Legacy styles (keeping for backward compatibility)
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: 50,
    backgroundColor: '#00B894',
  },
  backText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  sessionsHeader: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  noSessionsText: {
    textAlign: 'center',
    marginTop: 20,
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 1,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionName: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusUpcoming: {
    backgroundColor: '#0984E3',
  },
  statusCompleted: {
    backgroundColor: '#00B894',
  },
  statusCancelled: {
    backgroundColor: '#D63031',
  },
  statusUnknown: {
    backgroundColor: '#636E72',
  },
})

