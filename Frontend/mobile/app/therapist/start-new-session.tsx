import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useStartNewSession } from '../hooks/useTherapist';
import { formatPatientDisplayInfo } from '../utils/startNewSession';
import { THERAPIST_MESSAGES } from '../constants/messages';
import QRCode from 'react-native-qrcode-svg';

const StartNewSession = () => {
  const { themeStyle } = useTheme();
  const {
    activeTab,
    loading,
    selectedPatient,
    searchQuery,
    therapistPin,
    qrLoading,
    qrError,
    newPatient,
    filteredPatients,
    setActiveTab,
    setSearchQuery,
    updateNewPatient,
    handlePatientSelect,
    handleStartSession,
    handleCreatePatientAndStartSession,
    retryFetchTherapistPin,
  } = useStartNewSession();

  const renderTabButtons = () => (
    <View style={styles.tabContainer}>
      <TouchableOpacity
        style={[
          styles.tabButton,
          activeTab === 'existing' && styles.activeTab,
          { backgroundColor: activeTab === 'existing' ? themeStyle.button : themeStyle.dashboardcard }
        ]}
        onPress={() => setActiveTab('existing')}
      >
        <Text style={[
          styles.tabText,
          { color: activeTab === 'existing' ? themeStyle.buttonText : themeStyle.text }
        ]}>
          {THERAPIST_MESSAGES.START_NEW_SESSION_EXISTING_TAB}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.tabButton,
          activeTab === 'new' && styles.activeTab,
          { backgroundColor: activeTab === 'new' ? themeStyle.button : themeStyle.dashboardcard }
        ]}
        onPress={() => setActiveTab('new')}
      >
        <Text style={[
          styles.tabText,
          { color: activeTab === 'new' ? themeStyle.buttonText : themeStyle.text }
        ]}>
          {THERAPIST_MESSAGES.START_NEW_SESSION_NEW_TAB}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderPatientSearch = () => (
    <View>
      <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>{THERAPIST_MESSAGES.START_NEW_SESSION_SEARCH_TITLE}</Text>
      <TextInput
        style={[styles.searchInput, { 
          backgroundColor: themeStyle.dashboardcard,
          color: themeStyle.text,
          borderColor: themeStyle.border 
        }]}
        placeholder="Type patient name..."
        placeholderTextColor={themeStyle.label}
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
    </View>
  );

  const renderPatientsList = () => (
    <ScrollView style={styles.patientsList}>
      {filteredPatients.map((patient) => {
        const displayInfo = formatPatientDisplayInfo(patient);
        return (
          <TouchableOpacity
            key={displayInfo.id}
            style={[
              styles.patientItem,
              { 
                backgroundColor: themeStyle.dashboardcard,
                borderColor: selectedPatient?.id === displayInfo.id ? '#49467E' : themeStyle.border
              }
            ]}
            onPress={() => handlePatientSelect(patient)}
          >
            <View style={styles.patientInfo}>
              <Text style={[styles.patientName, { color: themeStyle.text }]}>
                {displayInfo.primaryText}
              </Text>
              <Text style={[styles.patientAge, { color: themeStyle.label }]}>
                {displayInfo.secondaryText}
              </Text>
            </View>
            {selectedPatient?.id === displayInfo.id && (
              <View style={styles.checkmark}>
                <Text style={styles.checkmarkText}>✓</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  const renderExistingPatients = () => (
    <View style={styles.tabContent}>
      <Text style={[styles.subtitle, { color: themeStyle.label }]}>
        Choose an existing patient or add a new one
      </Text>

      {renderPatientSearch()}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#49467E" />
        </View>
      ) : (
        renderPatientsList()
      )}

      {selectedPatient && (
        <TouchableOpacity
          style={[styles.startButton, { backgroundColor: themeStyle.button }]}
          onPress={handleStartSession}
        >
          <Text style={[styles.startButtonText, { color: themeStyle.buttonText }]}>
            Start Session with {selectedPatient.full_name}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderQRCode = () => {
    if (qrLoading) {
      return (
        <View style={styles.qrContainer}>
          <ActivityIndicator size="large" color="#49467E" />
          <Text style={[styles.qrText, { color: themeStyle.label }]}>
            Generating QR Code...
          </Text>
        </View>
      );
    }

    if (qrError) {
      return (
        <View style={styles.qrContainer}>
          <Text style={[styles.qrErrorText, { color: themeStyle.error }]}>
            {qrError}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: themeStyle.button }]}
            onPress={retryFetchTherapistPin}
          >
            <Text style={[styles.retryButtonText, { color: themeStyle.buttonText }]}>
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (therapistPin) {
      return (
        <View style={styles.qrContainer}>
          <QRCode
            value={therapistPin}
            size={200}
            color={themeStyle.text}
            backgroundColor={themeStyle.background}
          />
          <Text style={[styles.qrText, { color: themeStyle.label }]}>
            Patient can scan this QR code to connect
          </Text>
        </View>
      );
    }

    return null;
  };

  const renderNewPatientForm = () => (
    <ScrollView style={styles.formContainer}>
      {/* Basic Information */}
      <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>Basic Information</Text>
      
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, styles.halfInput, { backgroundColor: themeStyle.dashboardcard, color: themeStyle.text }]}
          placeholder="First Name *"
          placeholderTextColor={themeStyle.label}
          value={newPatient.first_name}
          onChangeText={(text) => updateNewPatient('first_name', text)}
        />
        <TextInput
          style={[styles.input, styles.halfInput, { backgroundColor: themeStyle.dashboardcard, color: themeStyle.text }]}
          placeholder="Last Name *"
          placeholderTextColor={themeStyle.label}
          value={newPatient.last_name}
          onChangeText={(text) => updateNewPatient('last_name', text)}
        />
      </View>

      <TextInput
        style={[styles.input, { backgroundColor: themeStyle.dashboardcard, color: themeStyle.text }]}
        placeholder="Email"
        placeholderTextColor={themeStyle.label}
        value={newPatient.email}
        onChangeText={(text) => updateNewPatient('email', text)}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        style={[styles.input, { backgroundColor: themeStyle.dashboardcard, color: themeStyle.text }]}
        placeholder="Phone Number *"
        placeholderTextColor={themeStyle.label}
        value={newPatient.phone_number}
        onChangeText={(text) => updateNewPatient('phone_number', text)}
        keyboardType="phone-pad"
      />

      <TextInput
        style={[styles.input, { backgroundColor: themeStyle.dashboardcard, color: themeStyle.text }]}
        placeholder="Date of Birth (YYYY-MM-DD)"
        placeholderTextColor={themeStyle.label}
        value={newPatient.date_of_birth}
        onChangeText={(text) => updateNewPatient('date_of_birth', text)}
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
            onPress={() => updateNewPatient('gender', gender)}
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
      
      <TextInput
        style={[styles.input, styles.textArea, { backgroundColor: themeStyle.dashboardcard, color: themeStyle.text }]}
        placeholder="Primary Concern"
        placeholderTextColor={themeStyle.label}
        value={newPatient.primary_concern}
        onChangeText={(text) => updateNewPatient('primary_concern', text)}
        multiline
        numberOfLines={3}
      />

      <TextInput
        style={[styles.input, { backgroundColor: themeStyle.dashboardcard, color: themeStyle.text }]}
        placeholder="Therapy Start Date (YYYY-MM-DD)"
        placeholderTextColor={themeStyle.label}
        value={newPatient.therapy_start_date}
        onChangeText={(text) => updateNewPatient('therapy_start_date', text)}
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
            onPress={() => updateNewPatient('session_frequency', freq.value)}
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
        {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
          <TouchableOpacity
            key={day}
            style={[
              styles.dayButton,
              newPatient.preferred_session_days.includes(day) && styles.dayButtonSelected
            ]}
            onPress={() => {
              const currentDays = newPatient.preferred_session_days;
              const newDays = currentDays.includes(day)
                ? currentDays.filter(d => d !== day)
                : [...currentDays, day];
              updateNewPatient('preferred_session_days', newDays);
            }}
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
        onChangeText={(text) => updateNewPatient('emergency_contact_name', text)}
      />

      <TextInput
        style={[styles.input, { backgroundColor: themeStyle.dashboardcard, color: themeStyle.text }]}
        placeholder="Emergency Contact Phone"
        placeholderTextColor={themeStyle.label}
        value={newPatient.emergency_contact_phone}
        onChangeText={(text) => updateNewPatient('emergency_contact_phone', text)}
        keyboardType="phone-pad"
      />

      {/* Address Information */}
      <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>Address Information</Text>
      
      <TextInput
        style={[styles.input, styles.textArea, { backgroundColor: themeStyle.dashboardcard, color: themeStyle.text }]}
        placeholder="Complete Address"
        placeholderTextColor={themeStyle.label}
        value={newPatient.address}
        onChangeText={(text) => updateNewPatient('address', text)}
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
        onChangeText={(text) => updateNewPatient('medical_history', text)}
        multiline
        numberOfLines={3}
      />

      <TextInput
        style={[styles.input, styles.textArea, { backgroundColor: themeStyle.dashboardcard, color: themeStyle.text }]}
        placeholder="Current Medications"
        placeholderTextColor={themeStyle.label}
        value={newPatient.current_medications}
        onChangeText={(text) => updateNewPatient('current_medications', text)}
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
            onPress={() => updateNewPatient('preferred_language', lang.value)}
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

      <TouchableOpacity
        style={[styles.createButton, { backgroundColor: themeStyle.button }]}
        onPress={handleCreatePatientAndStartSession}
      >
        <Text style={[styles.createButtonText, { color: themeStyle.buttonText }]}>
          Create Patient & Start Session
        </Text>
      </TouchableOpacity>

      <View style={styles.formSpacer} />
    </ScrollView>
  );

  const renderNewPatientTab = () => (
    <View style={styles.tabContent}>
      <Text style={[styles.subtitle, { color: themeStyle.label }]}>
        Generate QR code for patient to scan, or fill form manually
      </Text>

      {renderQRCode()}

      {/* <Text style={[styles.orText, { color: themeStyle.label }]}>OR</Text> */}

      <Text style={[styles.formTitle, { color: themeStyle.text }]}>
        Add Patient Information
      </Text>

      {renderNewPatientForm()}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeStyle.background }]}>
      <View style={[styles.header, { backgroundColor: themeStyle.background }]}>
        <Text style={[styles.title, { color: themeStyle.text }]}>
          Start New Session
        </Text>
      </View>

      {renderTabButtons()}

      {activeTab === 'existing' ? renderExistingPatients() : renderNewPatientTab()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    paddingTop: 60,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(73, 70, 126, 0.1)',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: '#49467E',
  },
  tabContainer: {
    flexDirection: 'row',
    margin: 24,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(73, 70, 126, 0.05)',
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
  },
  activeTab: {
    backgroundColor: '#49467E',
    shadowColor: '#49467E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
    opacity: 0.8,
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    marginTop: 24,
    color: '#49467E',
    letterSpacing: 0.3,
  },
  searchInput: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(73, 70, 126, 0.15)',
    backgroundColor: 'rgba(73, 70, 126, 0.02)',
    marginBottom: 24,
    fontSize: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  patientsList: {
    flex: 1,
    marginBottom: 24,
  },
  patientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  patientAge: {
    fontSize: 14,
    opacity: 0.7,
  },
  checkmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#49467E',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#49467E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  checkmarkText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  startButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: '#49467E',
    shadowColor: '#49467E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
    color: 'white',
  },
  qrContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: 'rgba(73, 70, 126, 0.02)',
    borderRadius: 20,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(73, 70, 126, 0.1)',
  },
  qrText: {
    marginTop: 20,
    textAlign: 'center',
    fontSize: 15,
    opacity: 0.8,
    fontWeight: '500',
  },
  qrErrorText: {
    textAlign: 'center',
    fontSize: 16,
    marginBottom: 20,
    fontWeight: '600',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#49467E',
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 0.3,
  },
  orText: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    marginVertical: 32,
    opacity: 0.6,
    letterSpacing: 0.5,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
    color: '#49467E',
    letterSpacing: 0.3,
  },
  formContainer: {
    flex: 1,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 16,
  },
  input: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 20,
    fontSize: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(73, 70, 126, 0.15)',
    backgroundColor: 'rgba(73, 70, 126, 0.02)',
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
  genderContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  genderButton: {
    flex: 1,
    minWidth: 100,
    paddingHorizontal: 20,
    paddingVertical: 14,
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
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    letterSpacing: 0.2,
  },
  genderButtonTextSelected: {
    color: 'white',
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
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
  createButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 16,
    backgroundColor: '#49467E',
    shadowColor: '#49467E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
    color: 'white',
  },
  formSpacer: {
    height: 80,
  },
});

export default StartNewSession;
