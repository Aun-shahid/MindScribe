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

import React, { useEffect, useState } from 'react'
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert
} from 'react-native'
import { useTheme } from '../contexts/ThemeContext'
import { useRouter } from 'expo-router'
import { Calendar } from 'react-native-calendars'
import api from '../utils/api'

type SessionType = {
  id: string
  patient_name: string
  session_date: string
  status: string
  session_type: string
  location: string
  duration_minutes: number
}

const SessionsCalendar = () => {
  const { themeStyle } = useTheme()
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  )
  const [sessions, setSessions] = useState<SessionType[]>([])
  const [loading, setLoading] = useState(false)

  const fetchSessions = async (date: string) => {
    try {
      setLoading(true)
      const response = await api.get(`/therapy_sessions/sessions/?date=${date}&limit=50`)
      if (response.data && Array.isArray(response.data.sessions)) {
        const mapped = response.data.sessions.map((s: any) => ({
          id: s.id,
          patient_name: s.patient_name || 'Unknown',
          session_date: s.session_date || 'Unknown',
          status: s.status || 'UNKNOWN',
          session_type: s.session_type || 'General',
          location: s.location || 'Unknown',
          duration_minutes: s.duration_minutes || 0,
        }))
        setSessions(mapped)
      } else {
        setSessions([])
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error)
      Alert.alert('Error', 'Could not load sessions.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSessions(selectedDate)
  }, [selectedDate])

  const getStatusStyle = (status: string) => {
    switch (status.toUpperCase()) {
      case 'IN_PROGRESS':
      case 'REQUESTED':
      case 'SCHEDULED':
        return styles.statusUpcoming
      case 'COMPLETED':
        return styles.statusCompleted
      case 'CANCELLED':
        return styles.statusCancelled
      default:
        return styles.statusUnknown
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeStyle.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sessions Calendar</Text>
        <View style={{ width: 24 }} />
      </View>

      <Calendar
        onDayPress={(day) => setSelectedDate(day.dateString)}
        markedDates={{
          [selectedDate]: { selected: true, selectedColor: '#00B894' }
        }}
        theme={{
          backgroundColor: themeStyle.background,
          calendarBackground: themeStyle.background,
          textSectionTitleColor: themeStyle.text,
          selectedDayBackgroundColor: '#00B894',
          selectedDayTextColor: '#ffffff',
          dayTextColor: themeStyle.text,
          todayTextColor: '#00B894',
          arrowColor: '#00B894',
          monthTextColor: themeStyle.text,
        }}
      />

      <View style={styles.sessionsHeader}>
        <Text style={[styles.sessionsTitle, { color: themeStyle.text }]}>
          Sessions for {new Date(selectedDate).toLocaleDateString()}
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeStyle.text} />
        </View>
      ) : (
        <ScrollView style={styles.sessionsList}>
          {sessions.length === 0 ? (
            <Text style={[styles.noSessionsText, { color: themeStyle.label }]}>
              No sessions scheduled.
            </Text>
          ) : (
            sessions.map((session) => (
              <View
                key={session.id}
                style={[
                  styles.sessionItem,
                  { backgroundColor: themeStyle.dashboardcard }
                ]}
              >
                <View style={styles.sessionInfo}>
                  <Text style={[styles.sessionName, { color: themeStyle.text }]}>
                    {session.patient_name}
                  </Text>
                  <Text style={[styles.sessionTime, { color: themeStyle.label }]}>
                    Type: {session.session_type}
                  </Text>
                  <Text style={[styles.sessionTime, { color: themeStyle.label }]}>
                    Location: {session.location}
                  </Text>
                   <Text style={[styles.sessionTime, { color: themeStyle.label }]}>
                    Duration: {session.duration_minutes} minutes
                  </Text>
                </View>
                <View style={[styles.sessionStatus, getStatusStyle(session.status)]}>
                  <Text style={styles.statusText}>{session.status.toLowerCase()}</Text>
                </View>
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  sessionsHeader: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  sessionsTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 20,
  },
  sessionsList: {
    paddingHorizontal: 20,
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
  sessionTime: {
    fontSize: 14,
  },
  sessionStatus: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
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
  bottomSpacer: {
    height: 40,
  },
})

