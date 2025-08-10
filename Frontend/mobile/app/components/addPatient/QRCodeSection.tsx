// app/components/addPatient/QRCodeSection.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { TherapistPinData } from '../../types/therapist';
import { THERAPIST_MESSAGES } from '../../constants/messages';

interface QRCodeSectionProps {
  loadingPin: boolean;
  therapistPin: string;
  therapistInfo: TherapistPinData | null;
  themeStyle: any;
}

export const QRCodeSection: React.FC<QRCodeSectionProps> = ({
  loadingPin,
  therapistPin,
  therapistInfo,
  themeStyle,
}) => {
  return (
    <View style={styles.qrSection}>
      <Text style={[styles.qrTitle, { color: themeStyle.text }]}>{THERAPIST_MESSAGES.PATIENT_CONNECTION_TITLE}</Text>
      <Text style={[styles.qrSubtitle, { color: themeStyle.label }]}>
        {THERAPIST_MESSAGES.PATIENT_CONNECTION_SUBTITLE}
      </Text>
      
      <View style={styles.qrContainer}>
        {loadingPin ? (
          <View style={styles.qrLoading}>
            <Text style={[styles.qrLoadingText, { color: themeStyle.label }]}>{THERAPIST_MESSAGES.QR_CODE_LOADING}</Text>
          </View>
        ) : therapistPin ? (
          <View style={styles.qrCodeWrapper}>
            <QRCode
              value={therapistPin}
              size={150}
              color="#000000"
              backgroundColor="#FFFFFF"
            />
            <Text style={[styles.qrPinText, { color: themeStyle.label }]}>
              PIN: {therapistPin}
            </Text>
          </View>
        ) : (
          <View style={styles.qrError}>
            <Text style={[styles.qrErrorText, { color: '#FF6B6B' }]}>
              {THERAPIST_MESSAGES.QR_CODE_UNABLE_TO_LOAD}
            </Text>
          </View>
        )}
      </View>
      
      {therapistInfo && (
        <View style={styles.therapistInfoCard}>
          <Text style={[styles.therapistName, { color: themeStyle.text }]}>
            {therapistInfo.therapist_name}
          </Text>
          <Text style={[styles.therapistDetails, { color: themeStyle.label }]}>
            {therapistInfo.specialization}
          </Text>
          {therapistInfo.clinic_name && (
            <Text style={[styles.therapistDetails, { color: themeStyle.label }]}>
              {therapistInfo.clinic_name}
            </Text>
          )}
        </View>
      )}
      
      <View style={styles.divider} />
    </View>
  );
};

const styles = StyleSheet.create({
  qrSection: {
    marginBottom: 24,
  },
  qrTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  qrSubtitle: {
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  qrContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    marginBottom: 16,
  },
  qrLoading: {
    padding: 40,
  },
  qrLoadingText: {
    fontSize: 16,
  },
  qrCodeWrapper: {
    alignItems: 'center',
  },
  qrPinText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
  },
  qrError: {
    padding: 40,
  },
  qrErrorText: {
    fontSize: 16,
    textAlign: 'center',
  },
  therapistInfoCard: {
    backgroundColor: '#f0f0f0',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  therapistName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  therapistDetails: {
    fontSize: 14,
    marginBottom: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginTop: 24,
  },
});
