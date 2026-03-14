// Consent and QR Code types
export interface ConsentData {
  patient_id: string;
  therapist_id: string;
  consent_given: boolean;
  consent_date: string;
  ip_address?: string;
}

export interface QRCodeData {
  therapist_id: string;
  session_id?: string;
  generated_at: string;
  expires_at: string;
}

// Error types
export interface TherapistError {
  message: string;
  code?: string;
  details?: Record<string, string[]>;
}

// QR Code related types
export interface TherapistQRInfo {
  therapist_pin: string;
  therapist_id: string;
  therapist_name: string;
  specialization: string;
  clinic_name: string;
  patient_count: number;
}

export interface QRCodeDisplayData {
  qrSize: number;
  shareMessage: string;
  instructions: QRInstruction[];
}

export interface QRInstruction {
  step: number;
  text: string;
  icon?: string;
}

export interface QRCodeState {
  loading: boolean;
  error: string | null;
  therapistInfo: TherapistQRInfo | null;
}

// Profile related types
export interface ProfileFieldData {
  label: string;
  value: string;
}

export interface TherapistProfileData {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  user_type: string;
  email_verified?: boolean;
  is_verified?: boolean;
}

export interface ProfileState {
  profile: TherapistProfileData | null;
  loading: boolean;
  error: string | null;
}

export interface ProfileActions {
  handleLogout: () => Promise<void>;
  handleThemeToggle: () => void;
  refetchProfile: () => void;
}

// Connection Request types
export interface ConnectionRequest {
  id: string;
  patient_name: string;
  patient_email: string;
  phone_number?: string;
  requested_at: string;
  status: 'pending' | 'accepted' | 'merged' | 'rejected';
  patient_id?: string;
}

export interface ConnectionRequestResponse {
  id: string;
  patient_name: string;
  patient_email: string;
  phone_number?: string;
  requested_at: string;
  status: string;
  patient_id?: string;
}

export interface AcceptConnectionRequest {
  action: 'accept_new' | 'merge';
  merge_patient_id?: string;
}

export interface TherapistPinData {
  therapist_pin: string;
  therapist_name?: string;
  specialization?: string;
  clinic_name?: string;
  patient_count?: number;
}

export interface TherapistPinResponse {
  therapist_pin: string;
  therapist_name?: string;
  specialization?: string;
  clinic_name?: string;
  patient_count?: number;
}