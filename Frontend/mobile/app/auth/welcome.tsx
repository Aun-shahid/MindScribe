

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { router } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
const { width, height } = Dimensions.get('window');
const screenWidth = Dimensions.get('window').width;

export default function Welcome() {
  const { themeStyle } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: themeStyle.background }]}>
      <View style={styles.header}>
        {/* <Image
          source={require('../../assets/images/brain.png')}
          style={styles.logo}
          resizeMode="contain"
        /> */}
     <FontAwesome5
  name="brain"
  size={45}
  color={themeStyle.title}
  style={{ marginTop: 17 }} // adjust the number as needed
/>



        <Text
          style={[styles.title, { color: themeStyle.title }]}
        >
          MindScribe
        </Text>
      </View>

      <Image
        source={require('../../assets/images/finalbg.png')}
        style={styles.bgImage}
        resizeMode="contain"
      />

      <TouchableOpacity
        style={[styles.btn, { backgroundColor: themeStyle.button }]}
        onPress={() => {
          router.push('./splash');
        }}
      >
        <Text style={[styles.btnLabel, { color: themeStyle.buttonText }]}>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 85,
    height: 95,
  },
  title: {
    fontSize: 38,
    fontWeight: '800',
    marginTop: 10,
    marginLeft: 10,
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
  },
  btnLabel: {
    fontSize: 27,
    fontWeight: '400',
  },
});


