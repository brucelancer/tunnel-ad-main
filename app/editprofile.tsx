import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Image,
  StatusBar,
  Alert,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  User,
  Camera,
  Save,
  Edit3,
} from 'lucide-react-native';
import { useSanityAuth } from './hooks/useSanityAuth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as sanityAuthService from '../tunnel-ad-main/services/sanityAuthService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Define an interface for our user info state
interface UserInfo {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phone: string;
  location: string;
  bio: string;
  interests: string[];
  password: string;
  confirmPassword: string;
}

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, loading } = useSanityAuth();
  const [isEditing, setIsEditing] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  
  // Create user info state from current user data
  const [userInfo, setUserInfo] = useState<UserInfo>({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    phone: '',
    location: '',
    bio: '',
    interests: [],
    password: '',
    confirmPassword: '',
  });

  // Load user data when component mounts
  useEffect(() => {
    if (user) {
      setUserInfo({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        username: user.username || '',
        email: user.email || '',
        phone: user.phone || '',
        location: user.location || '',
        bio: user.profile?.bio || '',
        interests: user.profile?.interests || [],
        password: '',
        confirmPassword: '',
      });
      
      // Set initial profile image from user data
      if (user.profile?.avatar) {
        // If it's already a string URI, use it directly
        if (typeof user.profile.avatar === 'string') {
          setProfileImage(user.profile.avatar);
        } 
        // If it's a Sanity image object, convert it to URL
        else if (user.profile.avatar && user.profile.avatar.asset) {
          // Use the Sanity urlFor helper to get the image URL
          const imageUrl = sanityAuthService.urlFor(user.profile.avatar).url();
          setProfileImage(imageUrl);
        }
      }
    }
  }, [user]);

  // Function to pick an image from the gallery
  const pickImage = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow access to your photo library to change your profile picture.');
        return;
      }
      
      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });
      
      if (!result.canceled) {
        console.log('Image selected:', result.assets[0].uri);
        setProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };
  
  // Function to take a photo with the camera
  const takePhoto = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow access to your camera to take a profile picture.');
        return;
      }
      
      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });
      
      if (!result.canceled) {
        console.log('Photo taken:', result.assets[0].uri);
        setProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  // Function to show image selection options
  const showImageOptions = () => {
    Alert.alert(
      'Change Profile Picture',
      'Choose an option',
      [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Library', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    setPasswordError('');
    
    try {
      // Password validation logic
      if (userInfo.password || userInfo.confirmPassword) {
        // Ensure both password fields are filled
        if (!userInfo.password || !userInfo.confirmPassword) {
          setPasswordError('Both password fields must be filled');
          setIsSaving(false);
          return;
        }
        
        // Check if passwords match
        if (userInfo.password !== userInfo.confirmPassword) {
          setPasswordError('Passwords do not match');
          setIsSaving(false);
          return;
        }
        
        // Basic password strength validation
        if (userInfo.password.length < 8) {
          setPasswordError('Password must be at least 8 characters');
          setIsSaving(false);
          return;
        }
      }
      
      if (!user || !user._id) {
        throw new Error('User data is missing');
      }
      
      // Prepare user data to update
      const updatedUserData = {
        firstName: userInfo.firstName,
        lastName: userInfo.lastName,
        username: userInfo.username,
        email: userInfo.email,
        phone: userInfo.phone,
        location: userInfo.location,
        bio: userInfo.bio,
        interests: userInfo.interests,
        password: userInfo.password || undefined,
      };
      
      let imageToUpload: string | null = null;
      // Only include the image if it's different from the current one
      if (profileImage && profileImage !== user.profile?.avatar) {
        imageToUpload = profileImage;
      }
      
      console.log('Updating user in Sanity...');
      
      // Call the Sanity service to update the user profile
      const updatedUser = await sanityAuthService.updateUserProfile(
        user._id,
        updatedUserData,
        // Cast the image to any to bypass TypeScript constraints
        // This is safe because we know the service can handle string values
        imageToUpload as any
      );
      
      console.log('User updated in Sanity:', updatedUser);
      
      // Save to AsyncStorage too for local state
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Notify the app that user data has changed with the complete updated user object
      DeviceEventEmitter.emit('AUTH_STATE_CHANGED', { 
        isAuthenticated: true,
        userData: updatedUser 
      });
      
      // Short delay before navigation to ensure events are processed
      setTimeout(() => {
        Alert.alert('Success', 'Profile information updated successfully');
        router.back();
      }, 300);
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to update profile information');
    } finally {
      setIsSaving(false);
    }
  };

  const renderSection = (title: string, children: React.ReactNode) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>
        {children}
      </View>
    </View>
  );

  const renderInfoField = (
    icon: React.ReactNode,
    label: string,
    key: string,
    value: string,
  ) => (
    <View style={styles.infoField}>
      <View style={styles.infoFieldLeft}>
        {icon}
        <View>
          <Text style={styles.infoLabel}>{label}</Text>
          <TextInput
            style={styles.infoInput}
            value={value}
            onChangeText={(text) => 
              setUserInfo(prev => ({ ...prev, [key]: text }))
            }
            placeholderTextColor="#666"
          />
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#0070F3" />
        <Text style={styles.loadingText}>Loading profile data...</Text>
      </View>
    );
  }

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
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <Pressable
            style={styles.saveButton}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Save color="white" size={20} />
            )}
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
            {profileImage ? (
              <Image
                source={{ uri: profileImage }}
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <User size={40} color="#0070F3" />
              </View>
            )}
            <Pressable style={styles.cameraButton} onPress={showImageOptions}>
              <Camera color="white" size={20} />
            </Pressable>
          </View>
          <Text style={styles.profileName}>
            {userInfo.firstName && userInfo.lastName 
              ? `${userInfo.firstName} ${userInfo.lastName}` 
              : userInfo.username || 'User'}
          </Text>
          <Text style={styles.profileUsername}>@{userInfo.username || 'username'}</Text>
        </View>

        {renderSection('Personal Information',
          <>
            {renderInfoField(
              <User color="#1877F2" size={20} />,
              'First Name',
              'firstName',
              userInfo.firstName
            )}
            {renderInfoField(
              <User color="#1877F2" size={20} />,
              'Last Name',
              'lastName',
              userInfo.lastName
            )}
            {renderInfoField(
              <Mail color="#1877F2" size={20} />,
              'Email',
              'email',
              userInfo.email
            )}
            {renderInfoField(
              <Phone color="#1877F2" size={20} />,
              'Phone',
              'phone',
              userInfo.phone
            )}
            {renderInfoField(
              <MapPin color="#1877F2" size={20} />,
              'Location',
              'location',
              userInfo.location
            )}
          </>
        )}

        {renderSection('Profile Information',
          <>
            <View style={styles.bioField}>
              <Text style={styles.bioLabel}>Bio</Text>
              <TextInput
                style={styles.bioInput}
                value={userInfo.bio}
                onChangeText={(text) => 
                  setUserInfo(prev => ({ ...prev, bio: text }))
                }
                multiline
                numberOfLines={4}
                placeholderTextColor="#666"
                placeholder="Tell us about yourself..."
              />
            </View>
            <View style={styles.interestsField}>
              <Text style={styles.interestsLabel}>Interests (comma separated)</Text>
              <TextInput
                style={styles.interestsInput}
                value={userInfo.interests.join(', ')}
                onChangeText={(text) => 
                  setUserInfo(prev => ({ 
                    ...prev, 
                    interests: text.split(',').map(item => item.trim()).filter(item => item)
                  }))
                }
                placeholderTextColor="#666"
                placeholder="tech, travel, music, etc."
              />
            </View>
          </>
        )}

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput 
              style={styles.input}
              value={userInfo.email}
              onChangeText={(text) => setUserInfo({...userInfo, email: text})}
              placeholder="Email"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Phone</Text>
            <TextInput 
              style={styles.input}
              value={userInfo.phone}
              onChangeText={(text) => setUserInfo({...userInfo, phone: text})}
              placeholder="Phone Number"
              keyboardType="phone-pad"
            />
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Location</Text>
            <TextInput 
              style={styles.input}
              value={userInfo.location}
              onChangeText={(text) => setUserInfo({...userInfo, location: text})}
              placeholder="Location"
            />
          </View>
        </View>

        {/* Password Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Password</Text>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>New Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput 
                style={[styles.input, styles.passwordInput]}
                value={userInfo.password}
                onChangeText={(text) => setUserInfo({...userInfo, password: text})}
                placeholder="New Password"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity 
                style={styles.passwordVisibilityButton} 
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text>{showPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput 
                style={[styles.input, styles.passwordInput]}
                value={userInfo.confirmPassword}
                onChangeText={(text) => setUserInfo({...userInfo, confirmPassword: text})}
                placeholder="Confirm Password"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity 
                style={styles.passwordVisibilityButton} 
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text>{showPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>
          </View>
          {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
          {user?.needsPasswordReset && (
            <Text style={styles.noteText}>Please set your password as this is your first login</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    marginTop: 20,
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
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
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
  },
  saveButton: {
    width: 40,
    height: 40,
    backgroundColor: '#0070F3',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
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
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(0,112,243,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
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
    marginBottom: 20,
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
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
    flex: 1,
  },
  infoLabel: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    marginLeft: 10,
  },
  infoInput: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    marginLeft: 10,
    padding: 0,
    marginTop: 4,
  },
  bioField: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  bioLabel: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    marginBottom: 8,
  },
  bioInput: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    padding: 10,
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  interestsField: {
    padding: 15,
  },
  interestsLabel: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    marginBottom: 8,
  },
  interestsInput: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    padding: 10,
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
  },
  inputContainer: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  label: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    marginBottom: 8,
  },
  input: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    padding: 0,
    marginTop: 4,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
  },
  passwordVisibilityButton: {
    padding: 10,
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 8,
    padding: 0,
    marginLeft: 15,
  },
  noteText: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 8,
    padding: 0,
    marginLeft: 15,
    marginBottom: 15,
  },
}); 