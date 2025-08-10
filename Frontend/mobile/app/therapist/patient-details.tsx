import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import React from 'react'
import { router, useLocalSearchParams } from 'expo-router'
import { useTheme } from '../contexts/ThemeContext'
import { usePatientDetails } from '../hooks/useTherapist'
import { THERAPIST_MESSAGES } from '../constants/messages'
import { InfoField } from '../components/InfoField'
import { InfoSection } from '../components/InfoSection'
import {
  formatDate,
  formatPhoneNumber,
  formatGender,
  formatPreferredDays,
  formatPreferredLanguage,
  shouldShowTherapyInfo,
  shouldShowEmergencyContact,
  shouldShowPreferredDays,
} from '../utils/patientDetails'

const PatientDetails = () => {
  const { themeStyle } = useTheme()
  const { patientId } = useLocalSearchParams()
  
  const { patient, loading, handleStartSession } = usePatientDetails(patientId)

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeStyle.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#49467E" />
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
            style={[styles.errorBackButton, { backgroundColor: themeStyle.logoutButton }]}
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
      <View style={[styles.header, { backgroundColor: '#49467E' }]}>
        <TouchableOpacity onPress={() => router.push('./patients')} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Patient Details</Text>
        <TouchableOpacity onPress={handleStartSession} style={styles.sessionButton}>
          <Text style={styles.sessionText}>Start Session</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Basic Information */}
        <InfoSection title={THERAPIST_MESSAGES.PATIENT_DETAILS_BASIC_INFO} themeStyle={themeStyle}>
          <InfoField 
            label={THERAPIST_MESSAGES.PATIENT_DETAILS_FULL_NAME} 
            value={patient.full_name} 
            themeStyle={themeStyle} 
          />
          <InfoField 
            label={THERAPIST_MESSAGES.PATIENT_DETAILS_EMAIL} 
            value={patient.email} 
            themeStyle={themeStyle} 
          />
          <InfoField 
            label={THERAPIST_MESSAGES.PATIENT_DETAILS_PHONE} 
            value={formatPhoneNumber(patient.phone_number)} 
            themeStyle={themeStyle} 
          />
          <InfoField 
            label={THERAPIST_MESSAGES.PATIENT_DETAILS_DOB} 
            value={formatDate(patient.date_of_birth)} 
            themeStyle={themeStyle} 
          />
          <InfoField 
            label={THERAPIST_MESSAGES.PATIENT_DETAILS_GENDER} 
            value={formatGender(patient.gender)} 
            themeStyle={themeStyle} 
          />
        </InfoSection>

        {/* Therapy Information */}
        {shouldShowTherapyInfo(patient) && (
          <InfoSection title={THERAPIST_MESSAGES.PATIENT_DETAILS_THERAPY_INFO} themeStyle={themeStyle}>
            {patient.patient_profile?.primary_concern && (
              <InfoField 
                label={THERAPIST_MESSAGES.PATIENT_DETAILS_PRIMARY_CONCERN} 
                value={patient.patient_profile.primary_concern} 
                themeStyle={themeStyle} 
              />
            )}
            {patient.patient_profile?.therapy_start_date && (
              <InfoField 
                label={THERAPIST_MESSAGES.PATIENT_DETAILS_THERAPY_START} 
                value={formatDate(patient.patient_profile.therapy_start_date)} 
                themeStyle={themeStyle} 
              />
            )}
            {patient.patient_profile?.session_frequency && (
              <InfoField 
                label={THERAPIST_MESSAGES.PATIENT_DETAILS_SESSION_FREQUENCY} 
                value={patient.patient_profile.session_frequency} 
                themeStyle={themeStyle} 
              />
            )}
          </InfoSection>
        )}

        {/* Emergency Contact */}
        {shouldShowEmergencyContact(patient) && (
          <InfoSection title={THERAPIST_MESSAGES.PATIENT_DETAILS_EMERGENCY_CONTACT} themeStyle={themeStyle}>
            {patient.patient_profile?.emergency_contact_name && (
              <InfoField 
                label={THERAPIST_MESSAGES.PATIENT_DETAILS_EMERGENCY_NAME} 
                value={patient.patient_profile.emergency_contact_name} 
                themeStyle={themeStyle} 
              />
            )}
            {patient.patient_profile?.emergency_contact_phone && (
              <InfoField 
                label={THERAPIST_MESSAGES.PATIENT_DETAILS_PHONE} 
                value={patient.patient_profile.emergency_contact_phone} 
                themeStyle={themeStyle} 
              />
            )}
          </InfoSection>
        )}

        {/* Additional Information */}
        <InfoSection title={THERAPIST_MESSAGES.PATIENT_DETAILS_ADDITIONAL_INFO} themeStyle={themeStyle}>
          <InfoField 
            label={THERAPIST_MESSAGES.PATIENT_DETAILS_PREFERRED_LANGUAGE} 
            value={formatPreferredLanguage(patient.patient_profile?.preferred_language)} 
            themeStyle={themeStyle} 
          />
          {shouldShowPreferredDays(patient) && (
            <InfoField 
              label={THERAPIST_MESSAGES.PATIENT_DETAILS_PREFERRED_DAYS} 
              value={formatPreferredDays(patient.patient_profile?.preferred_session_days)} 
              themeStyle={themeStyle} 
              isColumn={true}
            />
          )}
        </InfoSection>

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
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 0.3,
  },
  sessionButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
  },
  sessionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '500',
    opacity: 0.7,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 20,
    marginBottom: 24,
    textAlign: 'center',
    fontWeight: '600',
  },
  errorBackButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  bottomSpacer: {
    height: 40,
  },
})
