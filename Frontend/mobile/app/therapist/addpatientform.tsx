import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  ScrollView, 
  SafeAreaView
} from 'react-native'
import React from 'react'
import { router } from 'expo-router'
import { useTheme } from '../contexts/ThemeContext'
import { useAddPatientForm } from '../hooks/useTherapist'
import { QRCodeSection } from '../components/addPatient/QRCodeSection'
import { FormInput } from '../components/form/FormInput'
import { OptionButton } from '../components/form/OptionButton'
import { 
  WEEK_DAYS, 
  GENDER_OPTIONS, 
  SESSION_FREQUENCY_OPTIONS, 
  LANGUAGE_OPTIONS 
} from '../utils/addPatientForm'

const AddPatientForm = () => {
  const { themeStyle } = useTheme()
  
  const {
    submitting,
    therapistPin,
    therapistInfo,
    loadingPin,
    newPatient,
    updatePatient,
    toggleDay,
    handleCreatePatient,
  } = useAddPatientForm()

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
          <Text style={[styles.saveButton, { color: submitting ? themeStyle.label : '#49467E' }]}>
            {submitting ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.formContainer}>
        {/* QR Code Section */}
        <QRCodeSection
          loadingPin={loadingPin}
          therapistPin={therapistPin}
          therapistInfo={therapistInfo}
          themeStyle={themeStyle}
        />

        {/* Basic Information */}
        <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>Basic Information</Text>
        
        <View style={styles.inputRow}>
          <FormInput
            placeholder="First Name *"
            value={newPatient.first_name}
            onChangeText={(text) => updatePatient('first_name', text)}
            themeStyle={themeStyle}
            containerStyle={styles.halfInput}
          />
          <FormInput
            placeholder="Last Name *"
            value={newPatient.last_name}
            onChangeText={(text) => updatePatient('last_name', text)}
            themeStyle={themeStyle}
            containerStyle={styles.halfInput}
          />
        </View>

        <FormInput
          placeholder="Email"
          value={newPatient.email}
          onChangeText={(text) => updatePatient('email', text)}
          keyboardType="email-address"
          themeStyle={themeStyle}
        />

        <FormInput
          placeholder="Phone Number *"
          value={newPatient.phone_number}
          onChangeText={(text) => updatePatient('phone_number', text)}
          keyboardType="phone-pad"
          themeStyle={themeStyle}
        />

        <FormInput
          placeholder="Date of Birth (YYYY-MM-DD)"
          value={newPatient.date_of_birth}
          onChangeText={(text) => updatePatient('date_of_birth', text)}
          themeStyle={themeStyle}
        />

        {/* Gender Selection */}
        <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>Gender</Text>
        <View style={styles.optionsContainer}>
          {GENDER_OPTIONS.map((gender) => (
            <OptionButton
              key={gender.value}
              label={gender.label}
              selected={newPatient.gender === gender.value}
              onPress={() => updatePatient('gender', gender.value)}
            />
          ))}
        </View>

        {/* Therapy Information */}
        <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>Therapy Information</Text>
        
        <FormInput
          placeholder="Primary Concern"
          value={newPatient.primary_concern}
          onChangeText={(text) => updatePatient('primary_concern', text)}
          multiline
          numberOfLines={3}
          themeStyle={themeStyle}
          inputStyle={styles.textArea}
        />

        <FormInput
          placeholder="Therapy Start Date (YYYY-MM-DD)"
          value={newPatient.therapy_start_date}
          onChangeText={(text) => updatePatient('therapy_start_date', text)}
          themeStyle={themeStyle}
        />

        {/* Session Frequency */}
        <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>Session Frequency</Text>
        <View style={styles.optionsContainer}>
          {SESSION_FREQUENCY_OPTIONS.map((freq) => (
            <OptionButton
              key={freq.value}
              label={freq.label}
              selected={newPatient.session_frequency === freq.value}
              onPress={() => updatePatient('session_frequency', freq.value)}
            />
          ))}
        </View>

        {/* Preferred Session Days */}
        <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>Preferred Session Days</Text>
        <View style={styles.daysContainer}>
          {WEEK_DAYS.map((day) => (
            <OptionButton
              key={day}
              label={day.substring(0, 3)}
              selected={newPatient.preferred_session_days.includes(day)}
              onPress={() => toggleDay(day)}
              containerStyle={styles.dayButton}
              selectedStyle={styles.dayButtonSelected}
            />
          ))}
        </View>

        {/* Emergency Contact */}
        <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>Emergency Contact</Text>
        
        <FormInput
          placeholder="Emergency Contact Name"
          value={newPatient.emergency_contact_name}
          onChangeText={(text) => updatePatient('emergency_contact_name', text)}
          themeStyle={themeStyle}
        />

        <FormInput
          placeholder="Emergency Contact Phone"
          value={newPatient.emergency_contact_phone}
          onChangeText={(text) => updatePatient('emergency_contact_phone', text)}
          keyboardType="phone-pad"
          themeStyle={themeStyle}
        />

        {/* Address Information */}
        <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>Address Information</Text>
        
        <FormInput
          placeholder="Complete Address"
          value={newPatient.address}
          onChangeText={(text) => updatePatient('address', text)}
          multiline
          numberOfLines={3}
          themeStyle={themeStyle}
          inputStyle={styles.textArea}
        />

        {/* Medical Information */}
        <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>Medical Information</Text>
        
        <FormInput
          placeholder="Medical History"
          value={newPatient.medical_history}
          onChangeText={(text) => updatePatient('medical_history', text)}
          multiline
          numberOfLines={3}
          themeStyle={themeStyle}
          inputStyle={styles.textArea}
        />

        <FormInput
          placeholder="Current Medications"
          value={newPatient.current_medications}
          onChangeText={(text) => updatePatient('current_medications', text)}
          multiline
          numberOfLines={3}
          themeStyle={themeStyle}
          inputStyle={styles.textArea}
        />

        {/* Preferred Language */}
        <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>Preferred Language</Text>
        <View style={styles.optionsContainer}>
          {LANGUAGE_OPTIONS.map((lang) => (
            <OptionButton
              key={lang.value}
              label={lang.label}
              selected={newPatient.preferred_language === lang.value}
              onPress={() => updatePatient('preferred_language', lang.value)}
            />
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
    paddingHorizontal: 24,
    paddingVertical: 20,
    paddingTop: 60,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(73, 70, 126, 0.1)',
    backgroundColor: 'rgba(73, 70, 126, 0.02)',
  },
  cancelButton: {
    fontSize: 16,
    fontWeight: '500',
    opacity: 0.8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
    marginTop: 24,
    letterSpacing: 0.3,
    color: '#49467E',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 16,
  },
  input: {
    height: 52,
    borderRadius: 16,
    paddingHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(73, 70, 126, 0.15)',
    backgroundColor: 'rgba(73, 70, 126, 0.02)',
    fontSize: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  halfInput: {
    flex: 1,
  },
  textArea: {
    height: 100,
    paddingTop: 20,
    textAlignVertical: 'top',
    lineHeight: 22,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 28,
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 28,
  },
  dayButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dayButtonSelected: {
    backgroundColor: '#49467E',
    borderColor: '#49467E',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  dayButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    letterSpacing: 0.2,
  },
  dayButtonTextSelected: {
    color: 'white',
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 28,
  },
  genderButton: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  genderButtonSelected: {
    backgroundColor: '#49467E',
    borderColor: '#49467E',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  genderButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
    letterSpacing: 0.2,
  },
  genderButtonTextSelected: {
    color: 'white',
  },
  formSpacer: {
    height: 80,
  },
  // QR Code Styles
  qrSection: {
    backgroundColor: 'rgba(73, 70, 126, 0.05)',
    borderRadius: 20,
    padding: 28,
    marginBottom: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(73, 70, 126, 0.1)',
  },
  qrTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
    color: '#49467E',
    letterSpacing: 0.3,
  },
  qrSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.7,
    lineHeight: 22,
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  qrLoading: {
    padding: 24,
    alignItems: 'center',
  },
  qrLoadingText: {
    fontSize: 15,
    fontWeight: '500',
    opacity: 0.7,
  },
  qrCodeWrapper: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  qrPinText: {
    marginTop: 12,
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '600',
    color: '#49467E',
    opacity: 0.8,
  },
  qrError: {
    padding: 24,
    alignItems: 'center',
  },
  qrErrorText: {
    fontSize: 15,
    textAlign: 'center',
    color: '#d32f2f',
    fontWeight: '500',
  },
  therapistInfoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(73, 70, 126, 0.08)',
  },
  therapistName: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
    color: '#49467E',
    letterSpacing: 0.2,
  },
  therapistDetails: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 3,
    opacity: 0.7,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(73, 70, 126, 0.15)',
    width: '100%',
    marginTop: 24,
  },
})

export default AddPatientForm
