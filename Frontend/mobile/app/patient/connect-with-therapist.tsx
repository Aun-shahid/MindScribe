import React, { useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Platform, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useTheme } from '../contexts/ThemeContext';
import PatientService from '../services/patient.service';
import { useAuthContext } from '../contexts/AuthContext';
import { router } from 'expo-router';

export default function ConnectWithTherapist() {
  const { themeStyle, colors } = useTheme();
  const { fetchProfile } = useAuthContext();

  const [therapistPin, setTherapistPin] = useState<string>('');
  const [connectMessage, setConnectMessage] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    if (!therapistPin || therapistPin.trim().length === 0) {
      Alert.alert('Enter PIN', 'Please enter the therapist PIN or scan the QR code');
      return;
    }
    try {
      setLoading(true);
      const res = await PatientService.connectTherapist(therapistPin.trim(), connectMessage.trim());
      Alert.alert('Request Sent', 'Connection request created. Your therapist must approve it.');
      // optionally refresh profile
      try { await fetchProfile(); } catch (e) { /* ignore */ }
      router.back();
    } catch (err: any) {
      console.error('[Connect] error', err);
      const respData = err?.response?.data;
      if (respData && (respData.detail === 'You are already connected to this therapist.' || (typeof respData === 'string' && respData.includes('already connected')))) {
        try { await fetchProfile(); } catch (e) {}
        Alert.alert('Connected', 'You are already connected to this therapist.');
        router.back();
        return;
      }
      const msg = respData || err?.message || 'Failed to send connection request';
      Alert.alert('Error', String(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.wrapper, { backgroundColor: themeStyle.background, paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 32) : 16 }]}>
      <View style={[styles.headerRow, { paddingTop: 8 }] }>
        <TouchableOpacity
          style={[
            styles.backButton,
            { left: 8, top: Platform.OS === 'android' ? 2 : 4 },
          ]}
          onPress={() => router.back()}
        >
          <FontAwesome name="arrow-left" size={16} color={themeStyle.title} />
        </TouchableOpacity>
        <Text style={styles.headerTitleLarge}>
          <Text style={styles.headerBlue}>Connect with </Text>
          <Text style={styles.headerOrange}>Your Therapist</Text>
        </Text>
      </View>

      
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.hint, { color: themeStyle.label }]}>Scan the QR code provided by your therapist or enter the code manually</Text>

        <View style={styles.connectCard}>
          <LinearGradient
            colors={[ '#FFB6B6', '#FF9F6B']}
            start={[0, 0]}
            end={[1, 1]}
            style={styles.qrCircle}
          >
            <FontAwesome name="qrcode" size={40} color={'#fff'} />
          </LinearGradient>
          <Text style={[styles.cardTitle, { color: themeStyle.title, marginTop: 12 }]}>Scan QR Code</Text>
          <Text style={[styles.cardSubtitle, { color: themeStyle.label, marginTop: 6 }]}>Open camera to scan</Text>
        </View>

        <View style={[styles.dividerRow, { marginVertical: 20 }] }>
          <View style={styles.line} />
          <Text style={[styles.dividerText, { color: themeStyle.label }]}>or enter manually</Text>
          <View style={styles.line} />
        </View>

        <Text style={[styles.inputLabel, { color: themeStyle.label, marginTop: 4 }]}>Therapist Code</Text>
        <TextInput
          value={therapistPin}
          onChangeText={setTherapistPin}
          placeholder="Enter code"
          placeholderTextColor={themeStyle.placeholder}
          style={[styles.input, { color: themeStyle.text }]}
        />

        <Text style={[styles.inputLabel, { color: themeStyle.label, marginTop: 8 }]}>Message (Optional)</Text>
        <TextInput
          value={connectMessage}
          onChangeText={setConnectMessage}
          placeholder="Introduce yourself to your therapist..."
          placeholderTextColor={themeStyle.placeholder}
          style={[styles.textArea, { borderColor: '#e0dfe8', color: themeStyle.text }]}
          multiline
        />

        <TouchableOpacity style={{ marginTop: 22 }} onPress={handleConnect} activeOpacity={0.9}>
          <LinearGradient
            colors={['#FF7A7A', '#6FD8BE']}
            start={[0, 0]}
            end={[1, 1]}
            style={styles.primaryBtn}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <FontAwesome name="send" size={16} color="#fff" style={{ marginRight: 10 }} />
              <Text style={styles.primaryBtnText}>{loading ? 'Sending...' : 'Connect with Therapist'}</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={{ marginTop: 10, alignItems: 'center' }} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={[styles.skipText, { color: themeStyle.title }]}>Skip for now</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 0, minHeight: 64, position: 'relative' },
  backButton: { position: 'absolute', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)', shadowColor: '#000', shadowOpacity: 0.03, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 1 },
  headerTitleLarge: { fontSize: 26, fontWeight: '800', marginLeft: 0, color: '#524f85', marginTop: 28, textAlign: 'center' },
  headerBlue: { color: '#524f85' },
  headerOrange: { color: '#FF9F6B' },
  container: { paddingVertical: 28 },
  hint: { marginBottom: 12 },
  connectCard: { backgroundColor: '#fff', borderRadius: 18, padding: 22, alignItems: 'center', marginBottom: 18, shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 12 }, shadowRadius: 24, elevation: 6 },
  qrCircle: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  cardSubtitle: { fontSize: 13 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 14 },
  line: { flex: 1, height: 1, backgroundColor: '#E6E6EA' },
  dividerText: { marginHorizontal: 12, fontSize: 13 },
  inputLabel: { fontSize: 14, marginBottom: 6 },
  input: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#eee', shadowColor: '#000', shadowOpacity: 0.03, shadowOffset: { width: 0, height: 6 }, shadowRadius: 10, elevation: 2 },
  textArea: { borderWidth: 1, borderRadius: 10, padding: 12, height: 110, textAlignVertical: 'top', backgroundColor: '#fff', borderColor: '#eee', shadowColor: '#000', shadowOpacity: 0.03, shadowOffset: { width: 0, height: 6 }, shadowRadius: 8, elevation: 2 },
  primaryBtn: { paddingVertical: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 10 }, shadowRadius: 18, elevation: 4 },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  secondaryBtn: { paddingVertical: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 8 }, shadowRadius: 12, elevation: 3 },
  secondaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  skipText: { fontSize: 13, fontWeight: '700' },
    
});
