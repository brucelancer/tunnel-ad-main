import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Pressable,
  Dimensions,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Shield,
  ArrowLeft,
} from 'lucide-react-native';
import { useSanityAuth } from './hooks/useSanityAuth';
import Svg, { Path } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Tunnel verification mark component
const TunnelVerifiedMark = ({ size = 10 }) => (
  <Svg width={size * 1.5} height={size * 1.5} viewBox="0 0 24 24" fill="none">
    <Path 
      d="M12 2L14 5.1L17.5 3.5L17 7.3L21 8L18.9 11L21 14L17 14.7L17.5 18.5L14 16.9L12 20L10 16.9L6.5 18.5L7 14.7L3 14L5.1 11L3 8L7 7.3L6.5 3.5L10 5.1L12 2Z" 
      fill="#1877F2" 
    />
    <Path 
      d="M10 13.17l-2.59-2.58L6 12l4 4 8-8-1.41-1.42L10 13.17z" 
      fill="#FFFFFF" 
      strokeWidth="0"
    />
  </Svg>
);

// Define interface for user profile data
interface ProfileData {
  _id?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  location?: string;
  profile?: {
    avatar?: any;
    bio?: string;
  };
  [key: string]: any; // Allow for additional properties
}

export default function PrivacySettingsScreen() {
  const router = useRouter();
  const { user } = useSanityAuth();
  
  // Safe access to user data for display
  const profileData: ProfileData = user || {};
  
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <Stack.Screen 
        options={{
          headerShown: true,
          title: "Privacy Settings",
          headerStyle: {
            backgroundColor: '#000',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: '600',
          },
          headerLeft: () => (
            <Pressable onPress={() => router.back()}>
              <ArrowLeft color="#fff" size={24} />
            </Pressable>
          ),
        }} 
      />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Privacy Header */}
        <View style={styles.header}>
          <View style={styles.privacyIconContainer}>
            <Shield color="#0070F3" size={32} />
          </View>
          <Text style={styles.headerTitle}>Privacy Settings</Text>
          <Text style={styles.headerDescription}>
            Control what information is visible to others and how your data is used
          </Text>
        </View>
        
        {/* Personal Information Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <User color="#0070F3" size={18} />
            <Text style={styles.sectionTitle}>Personal Information</Text>
          </View>
          
          <View style={styles.contactContainer}>
            {profileData?.firstName && (
              <View style={styles.contactItem}>
                <User color="#0070F3" size={20} />
                <View style={styles.contactTextContainer}>
                  <Text style={styles.contactLabel}>First Name</Text>
                  <Text style={styles.contactValue}>{profileData.firstName}</Text>
                </View>
              </View>
            )}
            {profileData?.lastName && (
              <View style={styles.contactItem}>
                <User color="#0070F3" size={20} />
                <View style={styles.contactTextContainer}>
                  <Text style={styles.contactLabel}>Last Name</Text>
                  <Text style={styles.contactValue}>{profileData.lastName}</Text>
                </View>
              </View>
            )}
            {profileData?.username && (
              <View style={styles.contactItem}>
                <User color="#0070F3" size={20} />
                <View style={styles.contactTextContainer}>
                  <Text style={styles.contactLabel}>Username</Text>
                  <View style={styles.usernameContainer}>
                    <Text style={styles.contactValue}>@{profileData.username}</Text>
                    {profileData?.isBlueVerified && (
                      <View style={styles.badgeContainer}>
                        <TunnelVerifiedMark size={14} />
                      </View>
                    )}
                    {profileData?.isVerified && !profileData?.isBlueVerified && (
                      <View style={styles.badgeContainer}>
                        <TunnelVerifiedMark size={14} />
                      </View>
                    )}
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>
        
        {/* Contact Information Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Mail color="#0070F3" size={18} />
            <Text style={styles.sectionTitle}>Contact Information</Text>
          </View>
          
          <View style={styles.contactContainer}>
            <View key="email" style={styles.contactItem}>
              <Mail color="#0070F3" size={20} />
              <View style={styles.contactTextContainer}>
                <Text style={styles.contactLabel}>Email</Text>
                <Text style={styles.contactValue}>{profileData?.email || 'No email provided'}</Text>
              </View>
            </View>
            <View key="phone" style={styles.contactItem}>
              <Phone color="#0070F3" size={20} />
              <View style={styles.contactTextContainer}>
                <Text style={styles.contactLabel}>Phone</Text>
                <Text style={styles.contactValue}>{profileData?.phone || 'No phone provided'}</Text>
              </View>
            </View>
            <View key="location" style={styles.contactItem}>
              <MapPin color="#0070F3" size={20} />
              <View style={styles.contactTextContainer}>
                <Text style={styles.contactLabel}>Location</Text>
                <Text style={styles.contactValue}>{profileData?.location || 'No location provided'}</Text>
              </View>
            </View>
          </View>
        </View>
        
        {/* Verification Status Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Shield color="#0070F3" size={18} />
            <Text style={styles.sectionTitle}>Verification Status</Text>
          </View>
          
          <View style={styles.contactContainer}>
            <View style={styles.contactItem}>
              {profileData?.isBlueVerified ? (
                <>
                  <View style={styles.verificationIconContainer}>
                    <TunnelVerifiedMark size={20} />
                  </View>
                  <View style={styles.contactTextContainer}>
                    <Text style={styles.contactLabel}>Blue Verified</Text>
                    <Text style={styles.verificationText}>Your account has official blue verification status</Text>
                  </View>
                </>
              ) : profileData?.isVerified ? (
                <>
                  <View style={styles.verificationIconContainer}>
                    <TunnelVerifiedMark size={20} />
                  </View>
                  <View style={styles.contactTextContainer}>
                    <Text style={styles.contactLabel}>Verified Account</Text>
                    <Text style={styles.verificationText}>Your account is verified</Text>
                  </View>
                </>
              ) : (
                <>
                  <Shield color="#555" size={20} />
                  <View style={styles.contactTextContainer}>
                    <Text style={styles.contactLabel}>Not Verified</Text>
                    <Text style={styles.verificationText}>Your account is not verified</Text>
                  </View>
                </>
              )}
            </View>
          </View>
        </View>
        
        {/* Additional Privacy Options */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Shield color="#0070F3" size={18} />
            <Text style={styles.sectionTitle}>Privacy Controls</Text>
          </View>
          
          <View style={styles.privacyOptions}>
            <Pressable style={styles.privacyOption}>
              <Text style={styles.privacyOptionText}>Manage Account Privacy</Text>
            </Pressable>
            <Pressable style={styles.privacyOption}>
              <Text style={styles.privacyOptionText}>Control Data Usage</Text>
            </Pressable>
            <Pressable style={styles.privacyOption}>
              <Text style={styles.privacyOptionText}>Download My Data</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  privacyIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(0, 112, 243, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  headerDescription: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  contactContainer: {
    gap: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  contactTextContainer: {
    flex: 1,
  },
  contactLabel: {
    color: '#888',
    fontSize: 14,
  },
  contactValue: {
    color: 'white',
    fontSize: 16,
    marginTop: 4,
  },
  usernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeContainer: {
    marginLeft: 8,
    padding: 2,
    backgroundColor: 'rgba(0, 112, 243, 0.1)',
    borderRadius: 10,
  },
  verificationIconContainer: {
    marginRight: 8,
  },
  verificationText: {
    color: '#888',
    fontSize: 14,
  },
  privacyOptions: {
    gap: 12,
  },
  privacyOption: {
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
  },
  privacyOptionText: {
    color: '#0070F3',
    fontSize: 16,
    fontWeight: '500',
  },
}); 