




















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
  Pressable,
  Dimensions
} from 'react-native'
import React, { useEffect, useState } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../contexts/ThemeContext'
import { router } from 'expo-router'
import { useTherapistSessions } from '../hooks/useTherapist'
import { SessionType } from '../types/therapist'

const { width } = Dimensions.get('window')
const FILTER_OPTIONS = ['ALL', 'COMPLETED', 'IN_PROGRESS', 'CANCELLED']

const SessionsList = () => {
  const { themeStyle } = useTheme()
  const [selectedFilter, setSelectedFilter] = useState('ALL')
  const [isModalVisible, setIsModalVisible] = useState(false)
  
  // Use the custom hook instead of manual state management
  const { sessions, loading, error, updateFilter } = useTherapistSessions({
    status: selectedFilter as any
  })

  const handleFilterSelect = (filter: string) => {
    setSelectedFilter(filter)
    setIsModalVisible(false)
    // Update the hook's filter when user selects a new filter
    updateFilter({ 
      status: filter as any,
      date: new Date().toISOString().split('T')[0] // Today's date
    })
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

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateString
    }
  }

  const getStatusStyle = (status: string) => {
    switch (status.toUpperCase()) {
      case 'COMPLETED':
        return { backgroundColor: '#27AE60', borderColor: '#229954' }
      case 'CANCELLED':
        return { backgroundColor: '#E74C3C', borderColor: '#C0392B' }
      case 'SCHEDULED':
      case 'IN_PROGRESS':
        return { backgroundColor: '#6C5CE7', borderColor: '#5A4FCF' }
      default:
        return { backgroundColor: '#95A5A6', borderColor: '#7F8C8D' }
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case 'COMPLETED':
        return 'checkmark-circle-outline'
      case 'CANCELLED':
        return 'close-circle-outline'
      case 'SCHEDULED':
        return 'calendar-outline'
      case 'IN_PROGRESS':
        return 'play-circle-outline'
      default:
        return 'help-circle-outline'
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeStyle.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: '#524f85' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Today's Sessions</Text>
          <Text style={styles.headerSubtitle}>Professional Schedule</Text>
        </View>
        <TouchableOpacity style={styles.refreshButton}>
          <Ionicons name="refresh-outline" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Filter Section */}
      <View style={styles.filterSection}>
        <View style={styles.filterHeader}>
          <Ionicons name="filter-outline" size={20} color="#524f85" />
          <Text style={[styles.filterLabel, { color: themeStyle.text }]}>Filter Sessions</Text>
        </View>
        <TouchableOpacity 
          onPress={() => setIsModalVisible(true)} 
          style={[styles.filterButton, { borderColor: '#524f85' }]}
        >
          <Text style={[styles.filterText, { color: '#524f85' }]}>{selectedFilter}</Text>
          <Ionicons name="chevron-down" size={16} color="#524f85" />
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
              style={[
                styles.sessionCard,
                { 
                  backgroundColor: themeStyle.dashboardcard,
                  shadowColor: themeStyle.text,
                }
              ]}
            >
              {/* Card Header */}
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <View style={styles.patientInfo}>
                    <Ionicons name="person-circle-outline" size={20} color="#524f85" />
                    <Text style={[styles.patientName, { color: themeStyle.text }]}>
                      {session.patient_name}
                    </Text>
                  </View>
                  <Text style={[styles.therapistName, { color: themeStyle.label }]}>
                    with Dr. {session.therapist_name}
                  </Text>
                </View>
                
                <View style={[
                  styles.statusBadge,
                  getStatusStyle(session.status),
                  { borderWidth: 1 }
                ]}>
                  <Ionicons 
                    name={getStatusIcon(session.status)} 
                    size={12} 
                    color="white" 
                    style={styles.statusIcon}
                  />
                  <Text style={styles.statusText}>
                    {session.status.toLowerCase().replace('_', ' ')}
                  </Text>
                </View>
              </View>

              {/* Session Details */}
              <View style={styles.sessionDetails}>
                <View style={styles.detailRow}>
                  <View style={styles.detailItem}>
                    <Ionicons name="calendar-outline" size={16} color="#524f85" />
                    <Text style={[styles.detailLabel, { color: themeStyle.label }]}>Date & Time</Text>
                  </View>
                  <Text style={[styles.detailValue, { color: themeStyle.text }]}>
                    {formatDate(session.session_date)}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <View style={styles.detailItem}>
                    <Ionicons name="medical-outline" size={16} color="#524f85" />
                    <Text style={[styles.detailLabel, { color: themeStyle.label }]}>Session Type</Text>
                  </View>
                  <Text style={[styles.detailValue, { color: themeStyle.text }]}>
                    {session.session_type.charAt(0).toUpperCase() + session.session_type.slice(1)}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <View style={styles.detailItem}>
                    <Ionicons 
                      name={session.is_online ? "videocam-outline" : "location-outline"} 
                      size={16} 
                      color="#524f85" 
                    />
                    <Text style={[styles.detailLabel, { color: themeStyle.label }]}>Location</Text>
                  </View>
                  <Text style={[styles.detailValue, { color: themeStyle.text }]}>
                    {session.location} {session.is_online ? '(Online)' : '(In-Person)'}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <View style={styles.detailItem}>
                    <Ionicons name="time-outline" size={16} color="#524f85" />
                    <Text style={[styles.detailLabel, { color: themeStyle.label }]}>Duration</Text>
                  </View>
                  <Text style={[styles.detailValue, { color: themeStyle.text }]}>
                    {session.duration_minutes} minutes
                  </Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.cardActions}>
                <TouchableOpacity 
                  style={[styles.viewDetailsButton, { backgroundColor: 'rgba(82, 79, 133, 0.1)' }]}
                  onPress={() => handleViewDetails(session.id, session.patient_name)}
                >
                  <Ionicons name="eye-outline" size={16} color="#524f85" />
                  <Text style={[styles.viewDetailsText, { color: '#524f85' }]}>View Details</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.quickActionButton}>
                  <Ionicons name="ellipsis-horizontal" size={16} color="#524f85" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  // Header Styles
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
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
    fontSize: 20,
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
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Filter Styles
  filterSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(82, 79, 133, 0.1)',
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    letterSpacing: 0.3,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(82, 79, 133, 0.05)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: width * 0.8,
    maxWidth: 300,
    paddingVertical: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
  },
  modalOption: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#524f85',
    textAlign: 'center',
  },

  // Content Styles
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  // Session Card Styles
  sessionCard: {
    borderRadius: 16,
    marginBottom: 20,
    padding: 20,
    elevation: 4,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(82, 79, 133, 0.1)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  cardHeaderLeft: {
    flex: 1,
  },
  patientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  patientName: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
    letterSpacing: 0.3,
  },
  therapistName: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 28,
    fontStyle: 'italic',
  },
  statusBadge: {
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

  // Session Details Styles
  sessionDetails: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(82, 79, 133, 0.1)',
    paddingTop: 16,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
  },

  // Action Buttons Styles
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewDetailsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#524f85',
    marginRight: 12,
  },
  viewDetailsText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  quickActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(82, 79, 133, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#524f85',
  },

  // Loading and Empty States
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
  noSessionsText: {
    textAlign: 'center',
    marginTop: 60,
    fontSize: 18,
    fontWeight: '500',
    lineHeight: 24,
  }
})

export default SessionsList
