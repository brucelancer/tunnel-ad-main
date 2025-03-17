import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  TextInput,
  Image,
  StatusBar,
  Alert,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Globe,
  Lock,
  Eye,
  EyeOff,
  Camera,
  Shield,
  Bell,
  UserCircle,
  ChevronRight,
} from 'lucide-react-native';

export default function UserDetailScreen() {
  const router = useRouter();
  const [isPublicProfile, setIsPublicProfile] = useState(true);
  const [showLocation, setShowLocation] = useState(true);
  const [showEmail, setShowEmail] = useState(false);
  const [showPhone, setShowPhone] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const [userInfo, setUserInfo] = useState({
    name: 'John Doe',
    username: '@tunnel',
    email: 'user@example.com',
    phone: '+1 234 567 8900',
    location: 'New York, USA',
  });

  const handleSave = () => {
    setIsEditing(false);
    Alert.alert('Success', 'Profile information updated successfully');
  };

  const renderSection = (title: string, children: React.ReactNode) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>
        {children}
      </View>
    </View>
  );

  const renderPrivacyToggle = (
    title: string,
    description: string,
    value: boolean,
    onValueChange: (value: boolean) => void
  ) => (
    <View style={styles.privacyItem}>
      <View style={styles.privacyItemLeft}>
        <Text style={styles.privacyTitle}>{title}</Text>
        <Text style={styles.privacyDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#333', true: '#1877F2' }}
        thumbColor="white"
      />
    </View>
  );

  const renderInfoField = (
    icon: React.ReactNode,
    label: string,
    value: string,
    isPrivate: boolean
  ) => (
    <View style={styles.infoField}>
      <View style={styles.infoFieldLeft}>
        {icon}
        <View>
          <Text style={styles.infoLabel}>{label}</Text>
          {isEditing ? (
            <TextInput
              style={styles.infoInput}
              value={value}
              onChangeText={(text) => 
                setUserInfo(prev => ({ ...prev, [label.toLowerCase()]: text }))
              }
              placeholderTextColor="#666"
            />
          ) : (
            <Text style={styles.infoValue}>{value}</Text>
          )}
        </View>
      </View>
      {isPrivate && <Lock color="#888" size={16} />}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <BlurView intensity={100} style={StyleSheet.absoluteFill} />
        <View style={styles.headerContent}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
            hitSlop={20}
          >
            <ArrowLeft color="white" size={24} />
          </Pressable>
          <Text style={styles.headerTitle}>Privacy & Profile</Text>
          <Pressable
            style={styles.editButton}
            onPress={() => isEditing ? handleSave() : setIsEditing(true)}
          >
            <Text style={styles.editButtonText}>
              {isEditing ? 'Save' : 'Edit'}
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileImageSection}>
          <View style={styles.profileImageContainer}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=1000&auto=format&fit=crop' }}
              style={styles.profileImage}
            />
            {isEditing && (
              <Pressable style={styles.cameraButton}>
                <Camera color="white" size={20} />
              </Pressable>
            )}
          </View>
          <Text style={styles.profileName}>{userInfo.name}</Text>
          <Text style={styles.profileUsername}>{userInfo.username}</Text>
        </View>

        {renderSection('Personal Information',
          <>
            {renderInfoField(
              <Mail color="#1877F2" size={20} />,
              'Email',
              userInfo.email,
              !showEmail
            )}
            {renderInfoField(
              <Phone color="#1877F2" size={20} />,
              'Phone',
              userInfo.phone,
              !showPhone
            )}
            {renderInfoField(
              <MapPin color="#1877F2" size={20} />,
              'Location',
              userInfo.location,
              !showLocation
            )}
          </>
        )}

        {renderSection('Privacy Settings',
          <>
            {renderPrivacyToggle(
              'Public Profile',
              'Allow others to view your profile',
              isPublicProfile,
              setIsPublicProfile
            )}
            {renderPrivacyToggle(
              'Show Location',
              'Display your location on your profile',
              showLocation,
              setShowLocation
            )}
            {renderPrivacyToggle(
              'Show Email',
              'Display your email on your profile',
              showEmail,
              setShowEmail
            )}
            {renderPrivacyToggle(
              'Show Phone Number',
              'Display your phone number on your profile',
              showPhone,
              setShowPhone
            )}
          </>
        )}

        {renderSection('Security',
          <Pressable
            style={styles.securityButton}
            onPress={() => Alert.alert('Coming Soon', 'This feature will be available soon!')}
          >
            <View style={styles.securityButtonLeft}>
              <Lock color="#1877F2" size={24} />
              <View>
                <Text style={styles.securityButtonTitle}>Change Password</Text>
                <Text style={styles.securityButtonSubtitle}>
                  Last changed 3 months ago
                </Text>
              </View>
            </View>
            <ChevronRight color="#888" size={20} />
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  header: {
    height: 90,
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  backButton: {
    width: 24,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#1877F2',
    borderRadius: 15,
  },
  editButtonText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  profileImageSection: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#1877F2',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#1877F2',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'black',
  },
  profileName: {
    color: 'white',
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    marginBottom: 5,
  },
  profileUsername: {
    color: '#888',
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    color: '#888',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 15,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionContent: {
    backgroundColor: '#111',
    borderRadius: 15,
    overflow: 'hidden',
  },
  infoField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  infoFieldLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  infoLabel: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginBottom: 4,
  },
  infoValue: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
  },
  infoInput: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    padding: 0,
    margin: 0,
  },
  privacyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  privacyItemLeft: {
    flex: 1,
    marginRight: 15,
  },
  privacyTitle: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    marginBottom: 4,
  },
  privacyDescription: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  securityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
  },
  securityButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  securityButtonTitle: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
  },
  securityButtonSubtitle: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
}); 