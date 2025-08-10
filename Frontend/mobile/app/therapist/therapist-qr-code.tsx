import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { useTherapistQRCode } from '../hooks/useTherapist';
import { calculateQRSize, formatPatientCount, getQRInstructions } from '../utils/therapistQRCode';
import QRCode from 'react-native-qrcode-svg';

const TherapistQRCode = () => {
  const { themeStyle } = useTheme();
  const {
    loading,
    error,
    therapistInfo,
    handleShare,
    handleRefresh
  } = useTherapistQRCode();

  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: themeStyle.background }]}>
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={[styles.backButton, { color: themeStyle.text }]}>← Back</Text>
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: themeStyle.text }]}>
        Patient Connection
      </Text>
      <TouchableOpacity onPress={handleShare}>
        <Text style={[styles.shareButton, { color: '#007AFF' }]}>Share</Text>
      </TouchableOpacity>
    </View>
  );

  const renderLoadingState = () => (
    <SafeAreaView style={[styles.container, { backgroundColor: themeStyle.background }]}>
      {renderHeader()}
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={[styles.loadingText, { color: themeStyle.label }]}>
          Loading your QR code...
        </Text>
      </View>
    </SafeAreaView>
  );

  const renderErrorState = () => (
    <SafeAreaView style={[styles.container, { backgroundColor: themeStyle.background }]}>
      {renderHeader()}
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={[styles.errorText, { color: themeStyle.text }]}>
          {error || 'Failed to load QR code'}
        </Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={handleRefresh}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  const renderTherapistInfo = () => (
    <View style={[styles.infoCard, { backgroundColor: themeStyle.dashboardcard }]}>
      <View style={styles.therapistIcon}>
        <Text style={styles.iconText}>👨‍⚕️</Text>
      </View>
      <Text style={[styles.therapistName, { color: themeStyle.text }]}>
        {therapistInfo!.therapist_name}
      </Text>
      <Text style={[styles.specialization, { color: themeStyle.label }]}>
        {therapistInfo!.specialization}
      </Text>
      {therapistInfo!.clinic_name && (
        <Text style={[styles.clinic, { color: themeStyle.label }]}>
          {therapistInfo!.clinic_name}
        </Text>
      )}
      <Text style={[styles.patientCount, { color: themeStyle.label }]}>
        {formatPatientCount(therapistInfo!.patient_count)}
      </Text>
    </View>
  );

  const renderQRCodeSection = () => (
    <View style={[styles.qrSection, { backgroundColor: themeStyle.dashboardcard }]}>
      <Text style={[styles.qrTitle, { color: themeStyle.text }]}>
        Patient Connection QR Code
      </Text>
      <Text style={[styles.qrSubtitle, { color: themeStyle.label }]}>
        Show this QR code to patients who want to connect with you
      </Text>

      <View style={styles.qrContainer}>
        <QRCode
          value={therapistInfo!.therapist_pin}
          size={calculateQRSize()}
          backgroundColor="white"
          color="black"
          logoBackgroundColor="transparent"
        />
      </View>

      <View style={styles.pinInfo}>
        <Text style={[styles.pinLabel, { color: themeStyle.label }]}>
          Therapist PIN
        </Text>
        <Text style={[styles.pinValue, { color: themeStyle.text }]}>
          {therapistInfo!.therapist_pin}
        </Text>
        <Text style={[styles.pinNote, { color: themeStyle.label }]}>
          Patients can also enter this PIN manually if they cannot scan the QR code
        </Text>
      </View>
    </View>
  );

  const renderInstructions = () => {
    const instructions = getQRInstructions();
    
    return (
      <View style={[styles.instructionsCard, { backgroundColor: themeStyle.dashboardcard }]}>
        <Text style={[styles.instructionsTitle, { color: themeStyle.text }]}>
          How patients connect:
        </Text>
        {instructions.map((instruction) => (
          <View key={instruction.step} style={styles.instruction}>
            <Text style={styles.stepNumber}>{instruction.step}</Text>
            <Text style={[styles.stepText, { color: themeStyle.label }]}>
              {instruction.text}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const renderRefreshButton = () => (
    <TouchableOpacity 
      style={styles.refreshButton}
      onPress={handleRefresh}
    >
      <Text style={styles.refreshButtonText}>🔄 Refresh QR Code</Text>
    </TouchableOpacity>
  );

  const renderMainContent = () => (
    <SafeAreaView style={[styles.container, { backgroundColor: themeStyle.background }]}>
      {renderHeader()}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {renderTherapistInfo()}
        {renderQRCodeSection()}
        {renderInstructions()}
        {renderRefreshButton()}
      </ScrollView>
    </SafeAreaView>
  );

  if (loading) {
    return renderLoadingState();
  }

  if (error || !therapistInfo) {
    return renderErrorState();
  }

  return renderMainContent();
};

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
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  backButton: {
    fontSize: 16,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  shareButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorIcon: {
    fontSize: 50,
    marginBottom: 15,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  infoCard: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  therapistIcon: {
    marginBottom: 10,
  },
  iconText: {
    fontSize: 40,
  },
  therapistName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
  },
  specialization: {
    fontSize: 16,
    marginBottom: 5,
    textAlign: 'center',
  },
  clinic: {
    fontSize: 14,
    marginBottom: 5,
    textAlign: 'center',
  },
  patientCount: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  qrSection: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  qrTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 5,
    textAlign: 'center',
  },
  qrSubtitle: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  qrContainer: {
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  pinInfo: {
    alignItems: 'center',
  },
  pinLabel: {
    fontSize: 14,
    marginBottom: 5,
  },
  pinValue: {
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 10,
    fontFamily: 'monospace',
  },
  pinNote: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  instructionsCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
  },
  instruction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  stepNumber: {
    backgroundColor: '#007AFF',
    color: 'white',
    width: 24,
    height: 24,
    borderRadius: 12,
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 12,
    fontWeight: 'bold',
    marginRight: 12,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  refreshButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  refreshButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
});

export default TherapistQRCode;
