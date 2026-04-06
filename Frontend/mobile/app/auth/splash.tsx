

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';


const screenWidth = Dimensions.get('window').width;


export default function Splash() {

  const { themeStyle } = useTheme();
 
  

  return (
    <View style={[styles.container, { backgroundColor: themeStyle.background }]}>
        
        <Text style={[styles.subheading, { color: themeStyle.title }]}>Continue as</Text>


        <TouchableOpacity style={[styles.card, { backgroundColor: themeStyle.card }]}
          onPress={async () => {
            await AsyncStorage.setItem('selected_role', 'therapist');
            router.push('../onboarding/therapistintro1');
          }}>

          <Image
        source={require('../../assets/images/therap.jpg')} // Replace with your image
        style={styles.bgImage}
        resizeMode="contain"
      />
            <View style={styles.labelCont}>
            <Text style={styles.label}>Therapist</Text>
            </View>
            {/* <Text style={styles.lbl}>"Manage Patients, sessions and AI-powered Insights"</Text> */}


        </TouchableOpacity>

        <TouchableOpacity style={[styles.card, { backgroundColor: themeStyle.card }]}
        onPress={async()=>{await AsyncStorage.setItem('selected_role','patient');
          router.push('../onboarding/patientintro1');
        }}>

          <Image
          source={require('../../assets/images/pat.png')}
          style={styles.bgImage}
          resizeMode='contain'
          ></Image>
          <View style={styles.labelCont}>
            <Text style={styles.label}>Patient</Text>
            </View>

        </TouchableOpacity>

      
      

      
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    //justifyContent: 'center',
    alignItems: 'center',
    paddingTop:80
  },

  bgImage: {
    width:'140%',
    height:210,
    marginBottom:10,
    shadowColor: '#111',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    padding: 20,
    
   
    
  },

  card:{
    width: screenWidth *0.8,
     backgroundColor:"#F9F9F9",
    padding:20,
    marginBottom:30,
    elevation:9,
     shadowOffset: { width: 0, height: 3 },
     borderRadius:20,
     alignItems:'center',
     height:screenWidth *0.8,
     shadowColor:'#000',
     shadowOpacity:0.4,
     

    
    

  },


  subheading: {
    fontSize: 39,
    fontWeight: '600',
    marginBottom: 45,
    color: '#4B4B4B',
    textShadowColor: '#00000040',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 4,
  },

  labelCont:{
   backgroundColor:'#524f85',
   paddingVertical:10,
   paddingHorizontal:30,
   borderRadius:50,
   width:200,
   alignItems:'center',
   marginTop:20,

  },

  label:{
    color:'white',
    fontSize:22,
    fontWeight:700,
    //color: '#4B4B4B',
    textShadowColor: '#00000040',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 4,
    //marginBottom:15

  },
  lbl:{
    fontSize:18,
    textAlign:"center",
    fontWeight:500,
    marginBottom:15
  }

  
});





