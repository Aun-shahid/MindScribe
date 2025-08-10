// app/utils/therapistQRCode.ts
import { Dimensions } from 'react-native';
import { TherapistQRInfo, QRCodeDisplayData, QRInstruction } from '../types/therapist';

const { width } = Dimensions.get('window');

export const calculateQRSize = (): number => {
  return Math.min(width * 0.6, 220);
};

export const generateShareMessage = (therapistInfo: TherapistQRInfo): string => {
  const clinicPart = therapistInfo.clinic_name ? `Clinic: ${therapistInfo.clinic_name}\n` : '';
  
  return `Connect to me as your therapist!\n\nTherapist: ${therapistInfo.therapist_name}\nSpecialization: ${therapistInfo.specialization}\n${clinicPart}Therapist PIN: ${therapistInfo.therapist_pin}\n\nScan the QR code or enter this PIN in the patient app to connect.`;
};

export const getQRInstructions = (): QRInstruction[] => {
  return [
    {
      step: 1,
      text: 'Patient opens the TherapEase app',
      icon: '📱'
    },
    {
      step: 2,
      text: 'They scan this QR code or enter your PIN',
      icon: '📷'
    },
    {
      step: 3,
      text: 'Connection is established automatically',
      icon: '✅'
    }
  ];
};

export const formatPatientCount = (count: number): string => {
  if (count === 0) return 'No connected patients';
  if (count === 1) return '1 connected patient';
  return `${count} connected patients`;
};

export const validateTherapistInfo = (data: any): TherapistQRInfo | null => {
  if (!data || !data.therapist_pin) {
    return null;
  }

  return {
    therapist_pin: data.therapist_pin,
    therapist_id: data.therapist_id || '',
    therapist_name: data.therapist_name || 'Unknown Therapist',
    specialization: data.specialization || 'General Therapy',
    clinic_name: data.clinic_name || '',
    patient_count: typeof data.patient_count === 'number' ? data.patient_count : 0
  };
};

export const getErrorMessage = (error: any): string => {
  if (error.response?.status === 403) {
    return 'Only therapists can access this feature.';
  } else if (error.response?.status === 404) {
    return 'Therapist profile not found. Please contact support.';
  } else if (error.response?.status === 401) {
    return 'Please log in again to access this feature.';
  }
  
  return 'Failed to load QR code. Please try again.';
};

export const createQRDisplayData = (therapistInfo: TherapistQRInfo): QRCodeDisplayData => {
  return {
    qrSize: calculateQRSize(),
    shareMessage: generateShareMessage(therapistInfo),
    instructions: getQRInstructions()
  };
};
