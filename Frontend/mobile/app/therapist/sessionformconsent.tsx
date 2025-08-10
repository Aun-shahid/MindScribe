import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  TextInput
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { useSessionConsent } from '../hooks/useTherapist';

const SessionFormConsent = () => {
  const { themeStyle } = useTheme();
  const { patientId, patientName, isNewPatient } = useLocalSearchParams();
  
  const {
    submitting,
    consentData,
    patientName: displayPatientName,
    updateField,
    handleDurationChange,
    handleFeeChange,
    toggleCheckbox,
    handleConsentAndStartSession,
    handleBack
  } = useSessionConsent({
    patientId: patientId as string,
    patientName: patientName as string,
    isNewPatient: isNewPatient as string
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeStyle.background }]}>
      <View style={[styles.header, { backgroundColor: '#49467E' }]}>
        <TouchableOpacity onPress={handleBack} style={styles.closeButton}>
          <Text style={styles.closeText}>×</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Session Consent & Setup</Text>
        <View style={{ width: 44 }} />
      </View>
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>
          Session Information
        </Text>
        
        <Text style={[styles.patientInfo, { color: themeStyle.label }]}>
          Patient: {displayPatientName}
        </Text>

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
              onChangeText={handleDurationChange}
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
          onChangeText={(text) => updateField('location', text)}
          placeholder="Office, Room 101"
          placeholderTextColor={themeStyle.label}
        />

        <Text style={[styles.inputLabel, { color: themeStyle.text }]}>Session Goals *</Text>
        <TextInput
          style={[styles.input, styles.textArea, { backgroundColor: themeStyle.dashboardcard, color: themeStyle.text, borderColor: themeStyle.border }]}
          value={consentData.patient_goals}
          onChangeText={(text) => updateField('patient_goals', text)}
          placeholder="What do you hope to accomplish in this session?"
          placeholderTextColor={themeStyle.label}
          multiline
        />

        <Text style={[styles.inputLabel, { color: themeStyle.text }]}>Fee Charged</Text>
        <TextInput
          style={[styles.input, { backgroundColor: themeStyle.dashboardcard, color: themeStyle.text, borderColor: themeStyle.border }]}
          value={consentData.fee_charged.toString()}
          onChangeText={handleFeeChange}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor={themeStyle.label}
        />

        <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>
          Consent & Permissions
        </Text>

        <TouchableOpacity
          style={[styles.checkboxContainer, { borderColor: themeStyle.border }]}
          onPress={() => toggleCheckbox('is_online')}
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
          onPress={() => toggleCheckbox('consent_recording')}
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
          onPress={() => toggleCheckbox('consent_ai_analysis')}
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

        <View style={styles.buttons}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={handleBack}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.confirmButton]}
            onPress={handleConsentAndStartSession}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.confirmButtonText}>Start Session</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.formSpacer} />
      </ScrollView>
    </SafeAreaView>
  )
}

export default SessionFormConsent

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
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 24,
    marginTop: 28,
    color: '#49467E',
    letterSpacing: 0.3,
  },
  patientInfo: {
    fontSize: 18,
    marginBottom: 28,
    fontWeight: '600',
    backgroundColor: 'rgba(73, 70, 126, 0.05)',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(73, 70, 126, 0.1)',
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 16,
  },
  halfInput: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    marginTop: 16,
    color: '#49467E',
    letterSpacing: 0.2,
  },
  input: {
    borderWidth: 1.5,
    borderColor: 'rgba(73, 70, 126, 0.15)',
    backgroundColor: 'rgba(73, 70, 126, 0.02)',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: 20,
    lineHeight: 22,
  },
  pickerContainer: {
    borderWidth: 1.5,
    borderColor: 'rgba(73, 70, 126, 0.15)',
    backgroundColor: 'rgba(73, 70, 126, 0.02)',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  pickerText: {
    fontSize: 16,
    textTransform: 'capitalize',
    fontWeight: '500',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(73, 70, 126, 0.02)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(73, 70, 126, 0.1)',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#49467E',
    borderRadius: 6,
    marginRight: 16,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  checkboxChecked: {
    backgroundColor: '#49467E',
    borderColor: '#49467E',
  },
  checkmark: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
  checkboxLabel: {
    fontSize: 15,
    flex: 1,
    lineHeight: 22,
    fontWeight: '500',
  },
  consentNote: {
    fontSize: 13,
    marginTop: 20,
    fontStyle: 'italic',
    lineHeight: 20,
    backgroundColor: 'rgba(73, 70, 126, 0.05)',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#49467E',
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 40,
    paddingHorizontal: 0,
    gap: 16,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cancelButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: 'rgba(73, 70, 126, 0.2)',
  },
  cancelButtonText: {
    color: '#49467E',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.3,
  },
  confirmButton: {
    backgroundColor: '#49467E',
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.3,
  },
  formSpacer: {
    height: 60,
  },
})
