




















import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Modal,
  Pressable
} from 'react-native'
import React, { useEffect, useState } from 'react'
import { useTheme } from '../contexts/ThemeContext'
import api from '../utils/api'
import { router } from 'expo-router'

type SessionType = {
  id: string
  therapist_name: string
  patient_name: string
  session_date: string
  location: string
  status: string
  session_type: string
  duration_minutes: number
  is_online: boolean
}

const FILTER_OPTIONS = ['ALL', 'COMPLETED', 'IN_PROGRESS', 'CANCELLED']

const SessionsList = () => {
  const { themeStyle } = useTheme()
  const [sessions, setSessions] = useState<SessionType[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFilter, setSelectedFilter] = useState('ALL')
  const [isModalVisible, setIsModalVisible] = useState(false)

  const fetchSessions = async (status: string) => {
    try {
      setLoading(true)
      
      // Get today's date in YYYY-MM-DD format
      const today = new Date()
      const todayString = today.toISOString().split('T')[0]
      
      // Try with date parameter first
      let endpoint = `/therapy_sessions/sessions/?date=${todayString}`
      if (status !== 'ALL') {
        endpoint += `&status=${status}`
      }

      console.log('Fetching sessions from endpoint:', endpoint)
      console.log('Today\'s date:', todayString)
      
      let response
      let sessionsData = []
      
      try {
        response = await api.get(endpoint)
        console.log('API Response with date:', response.data)
      } catch (dateError) {
        console.log('Date parameter failed, trying without date:', dateError)
        // Fallback: try without date parameter
        let fallbackEndpoint = '/therapy_sessions/sessions/'
        if (status !== 'ALL') {
          fallbackEndpoint += `?status=${status}`
        }
        response = await api.get(fallbackEndpoint)
        console.log('API Response without date:', response.data)
      }
      
      // Handle different possible response structures
      if (response.data) {
        if (Array.isArray(response.data.sessions)) {
          sessionsData = response.data.sessions
        } else if (Array.isArray(response.data)) {
          sessionsData = response.data
        } else if (response.data.results && Array.isArray(response.data.results)) {
          sessionsData = response.data.results
        }
      }
      
      // If we got all sessions, filter by today's date
      if (endpoint.includes('/therapy_sessions/sessions/') && !endpoint.includes('date=')) {
        sessionsData = sessionsData.filter((session: any) => {
          const sessionDate = new Date(session.session_date).toISOString().split('T')[0]
          return sessionDate === todayString
        })
      }
      
      console.log('Final sessions data:', sessionsData)
      setSessions(sessionsData)
      
    } catch (error) {
      console.error('Failed to fetch sessions:', error)
      Alert.alert('Error', 'Failed to load sessions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSessions(selectedFilter)
  }, [selectedFilter])

  const handleFilterSelect = (filter: string) => {
    setSelectedFilter(filter)
    setIsModalVisible(false)
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeStyle.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: '#0984E3' }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Todays Sessions</Text>
        <View style={{ width: 40 }} /> {/* Placeholder for symmetry */}
      </View>

      {/* Filter Dropdown */}
      <View style={styles.filterContainer}>
        <TouchableOpacity onPress={() => setIsModalVisible(true)} style={styles.filterButton}>
          <Text style={styles.filterText}>Filter: {selectedFilter} ⌄</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={isModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {FILTER_OPTIONS.map((option) => (
              <Pressable
                key={option}
                style={({ pressed }) => [
                  styles.modalOption,
                  pressed && { backgroundColor: '#f0f0f0' }
                ]}
                onPress={() => handleFilterSelect(option)}
              >
                <Text style={styles.modalText}>{option}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>

      {/* Session List */}
      <ScrollView style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={themeStyle.text} />
            <Text style={[styles.loadingText, { color: themeStyle.label }]}>Loading sessions...</Text>
          </View>
        ) : sessions.length === 0 ? (
          <Text style={[styles.noSessionsText, { color: themeStyle.label }]}>
            No sessions found for today.
          </Text>
        ) : (
          sessions.map((session) => (
            <View
              key={session.id}
              style={[styles.card, { backgroundColor: themeStyle.dashboardcard }]}
            >
              <Text style={[styles.cardTitle, { color: themeStyle.text }]}>
                {session.patient_name} with {session.therapist_name}
              </Text>
              <Text style={[styles.cardDetail, { color: themeStyle.label }]}>
                Type: {session.session_type.charAt(0).toUpperCase() + session.session_type.slice(1)}
              </Text>
              <Text style={[styles.cardDetail, { color: themeStyle.label }]}>
                Date: {new Date(session.session_date).toLocaleString()}
              </Text>
              <Text style={[styles.cardDetail, { color: themeStyle.label }]}>
                Duration: {session.duration_minutes} minutes
              </Text>
              <Text style={[styles.cardDetail, { color: themeStyle.label }]}>
                Location: {session.location} ({session.is_online ? 'Online' : 'Offline'})
              </Text>
              <Text style={[styles.cardStatus, { color: getStatusColor(session.status) }]}>
                Status: {session.status}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const getStatusColor = (status: string) => {
  switch (status.toUpperCase()) {
    case 'COMPLETED':
      return '#00B894'
    case 'CANCELLED':
      return '#D63031'
    case 'SCHEDULED':
      return '#0984E3'
    default:
      return '#636e72'
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    justifyContent: 'space-between'
  },
  backText: {
    fontSize: 24,
    color: '#fff'
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff'
  },
  content: {
    padding: 16
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8
  },
  filterButton: {
    backgroundColor: '#dfe6e9',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center'
  },
  filterText: {
    fontSize: 16,
    fontWeight: 'bold'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    width: 250,
    paddingVertical: 10
  },
  modalOption: {
    paddingVertical: 12,
    paddingHorizontal: 16
  },
  modalText: {
    fontSize: 16
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4
  },
  cardDetail: {
    fontSize: 14,
    marginBottom: 2
  },
  cardStatus: {
    fontSize: 14,
    marginTop: 8,
    fontWeight: 'bold'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16
  },
  noSessionsText: {
    textAlign: 'center',
    marginTop: 32,
    fontSize: 16
  }
})

export default SessionsList
