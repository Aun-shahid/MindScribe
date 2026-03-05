

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
const { width, height } = Dimensions.get('window');
const screenWidth = Dimensions.get('window').width;

export default function Welcome() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {/* <Image
          source={require('../../assets/images/brain.png')}
          style={styles.logo}
          resizeMode="contain"
        /> */}
     <FontAwesome5
  name="brain"
  size={45}
  color="#FFFFFF"
  style={{ marginTop: 17 }}
/>
        <Text style={styles.title}>
          <Text style={{ color: '#FFFFFF' }}>Mind</Text><Text style={{ color: '#B8A8E6' }}>Scribe</Text>
        </Text>
      </View>

      <Image
        source={require('../../assets/images/land9.png')}
        style={styles.bgImage}
        resizeMode="contain"
      />

      <TouchableOpacity
        style={styles.btn}
        onPress={async () => {
          await AsyncStorage.setItem('selected_role', 'patient');
          router.push('../onboarding/patientintro1');
        }}
      >
        <Text style={styles.btnLabel}>
          Get Started
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 80,
    backgroundColor: '#342949',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 52,
    height: 52,
    marginTop: 10,
  },
  title: {
    fontSize: 38,
    fontWeight: '800',
    marginTop: 10,
    marginLeft: 10,
    color: '#FFFFFF',
  },
  bgImage: {
    width: '100%',
    height: '85%',
    marginTop:-10,
    marginBottom: -40,
    shadowColor: '#111',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    padding: 20,
  },


  btn: {
    width: 400,
    borderRadius: 50,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    backgroundColor: '#A78BFA',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 4,
  },
  btnLabel: {
    fontSize: 27,
    fontWeight: '400',
    color: '#FFFFFF',
  },
});


