// import { useEffect } from 'react';
// import {
//   View,
//   Text,
//   ScrollView,
//   StyleSheet,
//   SafeAreaView,
//   ActivityIndicator,
//   TouchableOpacity,
// } from 'react-native';
// import { useAuthContext } from '../contexts/AuthContext';
// import { useTheme } from '../contexts/ThemeContext';

// export default function PatientProfile() {
//   const { 
//     profile, 
//     profileLoading, 
//     error, 
//     fetchProfile, 
//     logout 
//   } = useAuthContext();

//   const { theme, themeStyle, toggleTheme } = useTheme();

//   // Debug profile verification fields
//   useEffect(() => {
//     if (profile) {
//       console.log('🔍 PATIENT PROFILE VERIFICATION DEBUG:');
//       console.log('  - profile.is_verified:', profile.is_verified);
//       console.log('  - profile.email_verified:', (profile as any).email_verified);
//       console.log('  - profile.verified:', (profile as any).verified);
//       console.log('  - Complete profile object:', JSON.stringify(profile, null, 2));
//     }
//   }, [profile]);

//   useEffect(() => {
//     fetchProfile();
//   }, [fetchProfile]);

//   const handleLogout = async () => {
//     try {
//       await logout();
//     } catch (e: any) {
//       console.log('Logout error:', e?.message);
//     }
//   };

//   if (profileLoading) {
//     return (
//       <View style={[styles.loadingContainer, { backgroundColor: themeStyle.background }] }>
//         <ActivityIndicator size="large" color={themeStyle.text} />
//         <Text style={[styles.loadingText, { color: themeStyle.label }]}>Fetching your profile...</Text>
//       </View>
//     );
//   }

//   return (
//     <SafeAreaView style={[styles.wrapper, { backgroundColor: themeStyle.background }] }>
//       <TouchableOpacity
//         style={{ alignSelf: 'flex-end', margin: 16, padding: 8, backgroundColor: themeStyle.button, borderRadius: 8 }}
//         onPress={toggleTheme}
//       >
//         <Text style={{ color: themeStyle.buttonText, fontWeight: '600' }}>
//           Switch to {theme === 'dark' ? 'Light' : 'Dark'} Mode
//         </Text>
//       </TouchableOpacity>
//       <ScrollView contentContainerStyle={styles.container}>
//         <Text style={[styles.title, { color: themeStyle.title }]}>👤 Your Profile</Text>
//         {profile ? (
//           <>
//             <View style={[styles.infoBox, { borderBottomColor: themeStyle.border }] }>
//               <Text style={[styles.label, { color: themeStyle.label }]}>ID:</Text>
//               <Text style={[styles.value, { color: themeStyle.text }]}>{profile.id}</Text>
//             </View>
//             <View style={[styles.infoBox, { borderBottomColor: themeStyle.border }] }>
//               <Text style={[styles.label, { color: themeStyle.label }]}>Name:</Text>
//               <Text style={[styles.value, { color: themeStyle.text }]}>{profile.first_name} {profile.last_name}</Text>
//             </View>
//             <View style={[styles.infoBox, { borderBottomColor: themeStyle.border }] }>
//               <Text style={[styles.label, { color: themeStyle.label }]}>Email:</Text>
//               <Text style={[styles.value, { color: themeStyle.text }]}>{profile.email}</Text>
//             </View>
//             <View style={[styles.infoBox, { borderBottomColor: themeStyle.border }] }>
//               <Text style={[styles.label, { color: themeStyle.label }]}>User Type:</Text>
//               <Text style={[styles.value, { color: themeStyle.text }]}>{profile.user_type}</Text>
//             </View>
//             <View style={[styles.infoBox, { borderBottomColor: themeStyle.border }] }>
//               <Text style={[styles.label, { color: themeStyle.label }]}>Verified:</Text>
//               <Text style={[styles.value, { color: themeStyle.text }]}>
//                 {(profile as any).email_verified || profile.is_verified ? 'Yes' : 'No'}
//               </Text>
//             </View>
//             <TouchableOpacity style={[styles.logoutButton, { backgroundColor: themeStyle.logoutButton }]} onPress={handleLogout}>
//               <Text style={[styles.logoutText, { color: themeStyle.logoutText }]}>Logout</Text>
//             </TouchableOpacity>
//           </>
//         ) : (
//           <Text style={[styles.errorText, { color: themeStyle.error }]}>⚠️ Failed to load profile. Please try again.</Text>
//         )}
//       </ScrollView>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   wrapper: {
//     flex: 1,
//     // backgroundColor set dynamically
//   },
//   container: {
//     padding: 24,
//     justifyContent: 'center',
//   },
//   title: {
//     fontSize: 28,
//     fontWeight: '700',
//     // color set dynamically
//     textAlign: 'center',
//     marginBottom: 20,
//   },
//   infoBox: {
//     marginBottom: 16,
//     // borderBottomColor set dynamically
//     borderBottomWidth: 1,
//     paddingBottom: 8,
//   },
//   label: {
//     fontSize: 14,
//     fontWeight: '600',
//     // color set dynamically
//   },
//   value: {
//     fontSize: 16,
//     // color set dynamically
//   },
//   logoutButton: {
//     // backgroundColor set dynamically
//     paddingVertical: 14,
//     borderRadius: 10,
//     alignItems: 'center',
//     marginTop: 30,
//     elevation: 2,
//   },
//   logoutText: {
//     color: '#fff',
//     fontSize: 16,
//     fontWeight: '600',
//   },
//   errorText: {
//     // color set dynamically
//     textAlign: 'center',
//     fontSize: 16,
//     marginTop: 20,
//   },
//   loadingContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   loadingText: {
//     marginTop: 10,
//     fontSize: 16,
//     // color set dynamically
//   },
// });
import { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useAuthContext } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

export default function PatientProfile() {
  const { profile, profileLoading, error, fetchProfile, logout } = useAuthContext();
  const { theme, themeStyle, toggleTheme } = useTheme();

  // Fetch profile on mount
  useEffect(() => {
    fetchProfile();
  }, []);

  // Debug logs (optional)
  useEffect(() => {
    if (profile) {
      console.log('🔍 PATIENT PROFILE DEBUG');
      console.log(JSON.stringify(profile, null, 2));
    }
  }, [profile]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e: any) {
      console.log('Logout error:', e?.message);
    }
  };

  if (profileLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: themeStyle.background }]}>
        <ActivityIndicator size="large" color={themeStyle.text} />
        <Text style={[styles.loadingText, { color: themeStyle.label }]}>Fetching your profile...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.wrapper, { backgroundColor: themeStyle.background }]}>
      {/* Theme Toggle Button */}
      <TouchableOpacity
        style={[styles.themeToggle, { backgroundColor: themeStyle.button }]}
        onPress={toggleTheme}
      >
        <Text style={[styles.themeToggleText, { color: themeStyle.buttonText }]}>
          Switch to {theme === 'dark' ? 'Light' : 'Dark'} Mode
        </Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.title, { color: themeStyle.title }]}>👤 Your Profile</Text>

        {profile ? (
          <>
            <ProfileField label="ID" value={profile.id} themeStyle={themeStyle} />
            <ProfileField
              label="Name"
              value={`${profile.first_name} ${profile.last_name}`}
              themeStyle={themeStyle}
            />
            <ProfileField label="Email" value={profile.email} themeStyle={themeStyle} />
            <ProfileField label="User Type" value={profile.user_type} themeStyle={themeStyle} />
            <ProfileField
              label="Verified"
              value={(profile as any).email_verified || profile.is_verified ? 'Yes' : 'No'}
              themeStyle={themeStyle}
            />

            <TouchableOpacity
              style={[styles.logoutButton, { backgroundColor: themeStyle.logoutButton }]}
              onPress={handleLogout}
            >
              <Text style={[styles.logoutText, { color: themeStyle.logoutText }]}>Logout</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={[styles.errorText, { color: themeStyle.error }]}>
            ⚠️ Failed to load profile. Please try again.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ProfileField({
  label,
  value,
  themeStyle,
}: {
  label: string;
  value: string;
  themeStyle: any;
}) {
  return (
    <View style={[styles.infoBox, { borderBottomColor: themeStyle.border }]}>
      <Text style={[styles.label, { color: themeStyle.label }]}>{label}:</Text>
      <Text style={[styles.value, { color: themeStyle.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  container: {
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
  },
  infoBox: {
    marginBottom: 16,
    borderBottomWidth: 1,
    paddingBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  value: {
    fontSize: 16,
  },
  themeToggle: {
    alignSelf: 'flex-end',
    marginTop: 50,
    padding: 8,
    borderRadius: 8,
  },
  themeToggleText: {
    fontWeight: '600',
  },
  logoutButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 30,
    elevation: 2,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    textAlign: 'center',
    fontSize: 16,
    marginTop: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
});
