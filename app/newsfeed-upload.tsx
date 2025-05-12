import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Image,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  useWindowDimensions,
  ActivityIndicator,
  Alert,
  BackHandler,
  DeviceEventEmitter,
  Modal,
  TouchableOpacity,
  Dimensions
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { usePreventRemove } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import {
  Image as ImageIcon,
  Camera,
  MapPin,
  X,
  ArrowLeft,
  Send,
  User,
  UserCircle,
  Hash,
  AtSign,
  Plus,
  LogIn,
  LayoutGrid,
  Columns
} from 'lucide-react-native';
import { usePostFeed } from '@/app/hooks/usePostFeed';
import { useSanityAuth } from '@/app/hooks/useSanityAuth';
import AuthScreen from './components/AuthScreen';
import * as sanityAuthService from '../tunnel-ad-main/services/sanityAuthService';
import Svg, { Path } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Add the blue verified mark component
const TunnelBlueVerifiedMark = ({ size = 10 }) => {
  // Calculate a responsive size based on screen width
  const responsiveSize = SCREEN_WIDTH * 0.03 > 12 ? SCREEN_WIDTH * 0.03 : 12;
  
  return (
    <Svg 
      width={responsiveSize * 1.8} 
      height={responsiveSize * 1.8} 
      viewBox="0 0 24 24" 
      fill="none"
    >
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
};

export default function NewsfeedUpload() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [postText, setPostText] = useState('');
  const [loading, setLoading] = useState(false);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [location, setLocation] = useState('');
  const [showAuthOverlay, setShowAuthOverlay] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [userAvatarUri, setUserAvatarUri] = useState<string | null>(null);
  const [layoutMode, setLayoutMode] = useState<'slide' | 'grid'>('slide');
  
  // Add state for image viewer modal
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Get Sanity hooks
  const { createPost } = usePostFeed();
  const { user } = useSanityAuth();

  // Check authentication when component mounts and process avatar
  useEffect(() => {
    if (!user) {
      console.log('No user authenticated for post upload');
      return;
    }
    
    // Process user avatar
    if (user.profile?.avatar) {
      // If it's already a string URL, use it directly
      if (typeof user.profile.avatar === 'string') {
        setUserAvatarUri(user.profile.avatar);
      }
      // If it's a Sanity image reference, convert it to a URL
      else if (user.profile.avatar?.asset && sanityAuthService.urlFor) {
        try {
          const imageUrl = sanityAuthService.urlFor(user.profile.avatar).url();
          console.log('Processed user avatar URL:', imageUrl);
          setUserAvatarUri(imageUrl);
        } catch (error) {
          console.error('Error processing avatar URL:', error);
        }
      }
    } else {
      console.log('User has no avatar set');
      setUserAvatarUri(null);
    }
  }, [user]);

  const handlePickImage = async () => {
    // Check for authentication first
    if (!user) {
      showLoginPrompt();
      return;
    }
    
    // Check if we've already reached the maximum of 4 images
    if (attachments.length >= 4) {
      Alert.alert('Maximum Images', 'You can only upload a maximum of 4 images per post.');
      return;
    }
    
    try {
      const remainingSlots = 4 - attachments.length;
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
        allowsMultipleSelection: true,
        selectionLimit: remainingSlots
      });

      if (!result.canceled && result.assets.length > 0) {
        const newAttachments = [...attachments];
        const availableSpace = 4 - newAttachments.length;
        
        // Only add up to the remaining slots
        const assetsToAdd = result.assets.slice(0, availableSpace);
        
        if (assetsToAdd.length < result.assets.length) {
          Alert.alert('Some images not added', `Only ${assetsToAdd.length} images were added. Maximum of 4 images reached.`);
        }
        
        setAttachments([...newAttachments, ...assetsToAdd.map(asset => asset.uri)]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
    }
  };

  const handleTakePhoto = async () => {
    // Check for authentication first
    if (!user) {
      showLoginPrompt();
      return;
    }
    
    // Check if we've already reached the maximum of 4 images
    if (attachments.length >= 4) {
      Alert.alert('Maximum Images', 'You can only upload a maximum of 4 images per post.');
      return;
    }
    
    try {
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      
      if (cameraPermission.status !== 'granted') {
        Alert.alert('Permission denied', 'We need camera permissions to take a photo!');
        return;
      }
      
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled) {
        setAttachments([...attachments, result.assets[0].uri]);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  // Show login prompt
  const showLoginPrompt = () => {
    Alert.alert(
      'Login Required',
      'You need to be logged in to create posts.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Login', 
          onPress: () => setShowAuthOverlay(true)
        }
      ]
    );
  };

  // Handle successful authentication
  const handleAuthenticated = () => {
    setShowAuthOverlay(false);
    // Keep the user on this screen to continue creating their post
  };

  // Function to get the user's current location
  const getCurrentLocation = async () => {
    // Check for authentication first
    if (!user) {
      showLoginPrompt();
      return;
    }
    
    setIsGettingLocation(true);
    
    try {
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'We need location permissions to share your location.');
        setIsGettingLocation(false);
        return;
      }
      
      // Get current position
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      const { latitude, longitude } = position.coords;
      
      // Use reverse geocoding to get a readable address
      const addressResponse = await Location.reverseGeocodeAsync({
        latitude,
        longitude
      });
      
      if (addressResponse && addressResponse.length > 0) {
        const address = addressResponse[0];
        
        // Create a readable location string
        let locationString = '';
        
        if (address.name) {
          locationString += address.name;
        }
        
        if (address.city) {
          locationString += locationString ? `, ${address.city}` : address.city;
        } else if (address.region) {
          locationString += locationString ? `, ${address.region}` : address.region;
        }
        
        if (address.country && !locationString.includes(address.country)) {
          locationString += locationString ? `, ${address.country}` : address.country;
        }
        
        // If we couldn't build a nice address, fallback to coordinates
        if (!locationString) {
          locationString = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        }
        
        setLocation(locationString);
        console.log('Location set:', locationString);
      } else {
        // Fallback to raw coordinates if reverse geocoding fails
        setLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
      }
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to get your location. Please try again.');
    } finally {
      setIsGettingLocation(false);
    }
  };

  const handleSubmit = async () => {
    // Check for authentication first
    if (!user) {
      showLoginPrompt();
      return;
    }
    
    if (!postText.trim() && attachments.length === 0) {
      Alert.alert('Error', 'Please add some text or attach media to your post.');
      return;
    }

    setLoading(true);
    
    try {
      // If we have createPost from our hook and user is logged in
      if (createPost && user) {
        console.log(`Submitting post with ${attachments.length} images and location: ${location || 'none'}`);
        console.log(`Layout mode for 4 images: ${layoutMode}`);
        
        // Show upload progress for longer uploads with images
        let progressMessage = 'Uploading...';
        if (attachments.length > 0) {
          progressMessage = 'Uploading media (this may take a moment)...';
          // Show a toast or some UI indication here
        }
        
        // Create post content with metadata for layout preference
        const enhancedContent = attachments.length === 4 
          ? `${postText}\n\n<!-- layoutMode:${layoutMode} -->`
          : postText;
        
        // Create the post with location data and layout preference in metadata
        // Make sure to keep the layout metadata only in content, not in location
        await createPost(enhancedContent, location, attachments);
        
        // Clear form after successful upload immediately
        setPostText('');
        setAttachments([]);
        setLocation('');
        setLayoutMode('slide'); // Reset layout mode to default
        
        // Show success indicator and emit refresh event
        DeviceEventEmitter.emit('REFRESH_FEED');
        
        // Show success message
        Alert.alert('Success', 'Your post has been shared!', [
          { 
            text: 'View Post', 
            onPress: () => {
              // Navigate to home tab - this should show the feed due to our event listener
              router.replace("/(tabs)/" as any);
            }
          }
        ]);
      } else {
        // Fallback to mock upload for demo
        setTimeout(() => {
          setLoading(false);
          
          // Clear form after successful upload immediately
          setPostText('');
          setAttachments([]);
          setLocation('');
          setLayoutMode('slide'); // Reset layout mode to default
          
          // Emit event to refresh feed
          DeviceEventEmitter.emit('REFRESH_FEED');
          
          Alert.alert('Success', 'Your post has been shared (demo mode)!', [
            { 
              text: 'View Post', 
              onPress: () => {
                // Navigate to home tab
                router.replace("/(tabs)/" as any);
              }
            }
          ]);
        }, 1500);
      }
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Error', 'Failed to create post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Render layout switcher for 4 images
  const renderLayoutSwitcher = () => {
    if (attachments.length !== 4) return null;

    return (
      <View style={styles.layoutSwitcherContainer}>
        <Text style={styles.layoutSwitcherTitle}>Choose layout:</Text>
        <View style={styles.layoutOptions}>
          <Pressable 
            style={[
              styles.layoutOption, 
              layoutMode === 'slide' && styles.layoutOptionSelected
            ]}
            onPress={() => setLayoutMode('slide')}
          >
            <Columns size={22} color={layoutMode === 'slide' ? "#0070F3" : "#777"} />
            <Text style={[
              styles.layoutOptionText,
              layoutMode === 'slide' && styles.layoutOptionTextSelected
            ]}>
              Slide View
            </Text>
          </Pressable>
          
          <Pressable 
            style={[
              styles.layoutOption, 
              layoutMode === 'grid' && styles.layoutOptionSelected
            ]}
            onPress={() => setLayoutMode('grid')}
          >
            <LayoutGrid size={22} color={layoutMode === 'grid' ? "#0070F3" : "#777"} />
            <Text style={[
              styles.layoutOptionText,
              layoutMode === 'grid' && styles.layoutOptionTextSelected
            ]}>
              Grid View
            </Text>
          </Pressable>
        </View>
      </View>
    );
  };

  // Render a preview of the grid layout
  const renderGridPreview = () => {
    if (attachments.length !== 4 || layoutMode !== 'grid') return null;

    return (
      <View style={styles.gridPreviewContainer}>
        <Text style={styles.previewTitle}>Grid View Preview</Text>
        <View style={styles.gridPreview}>
          <View style={styles.gridPreviewRow}>
            <Pressable 
              onPress={() => handleImagePress(attachments[0], 0)} 
              style={({ pressed }) => [
                styles.gridPreviewImageContainer,
                pressed && styles.attachmentImagePressed
              ]}
            >
              <Image source={{ uri: attachments[0] }} style={styles.gridPreviewImage} />
            </Pressable>
            <Pressable 
              onPress={() => handleImagePress(attachments[1], 1)} 
              style={({ pressed }) => [
                styles.gridPreviewImageContainer,
                pressed && styles.attachmentImagePressed
              ]}
            >
              <Image source={{ uri: attachments[1] }} style={styles.gridPreviewImage} />
            </Pressable>
          </View>
          <View style={styles.gridPreviewRow}>
            <Pressable 
              onPress={() => handleImagePress(attachments[2], 2)} 
              style={({ pressed }) => [
                styles.gridPreviewImageContainer,
                pressed && styles.attachmentImagePressed
              ]}
            >
              <Image source={{ uri: attachments[2] }} style={styles.gridPreviewImage} />
            </Pressable>
            <Pressable 
              onPress={() => handleImagePress(attachments[3], 3)} 
              style={({ pressed }) => [
                styles.gridPreviewImageContainer,
                pressed && styles.attachmentImagePressed
              ]}
            >
              <Image source={{ uri: attachments[3] }} style={styles.gridPreviewImage} />
            </Pressable>
          </View>
        </View>
        <Text style={styles.previewNote}>
          All 4 images will be displayed in a grid when others view your post.
        </Text>
      </View>
    );
  };

  // Check if user has unsaved content
  const hasUnsavedContent = useCallback(() => {
    return postText.trim().length > 0 || attachments.length > 0;
  }, [postText, attachments]);

  // Common confirmation dialog for discarding post
  const showDiscardConfirmation = (onDiscard: () => void) => {
    Alert.alert(
      'Discard Post?',
      'You have unsaved content. Are you sure you want to leave and discard this post?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Discard', 
          style: 'destructive',
          onPress: onDiscard
        }
      ]
    );
  };

  // Use React Navigation's prevention system to block all kinds of navigations
  usePreventRemove(
    hasUnsavedContent(), // Only prevent navigation if we have content
    () => {
      // Return a promise that resolves when the user makes a decision
      return new Promise((resolve) => {
        showDiscardConfirmation(() => {
          // If they confirm discard, resolve the promise to allow navigation
          resolve(true);
        });
      });
    }
  );

  // Handle back button press with confirmation if needed
  const handleBackPress = () => {
    if (hasUnsavedContent()) {
      showDiscardConfirmation(() => router.back());
    } else {
      router.back();
    }
  };

  // Handle hardware back button press on Android
  useEffect(() => {
    const backAction = () => {
      if (hasUnsavedContent()) {
        showDiscardConfirmation(() => router.back());
        return true; // Prevent default behavior
      }
      // Let the default back action happen (go back)
      return false;
    };

    // Add event listener for hardware back press
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    // Clean up event listener on component unmount
    return () => backHandler.remove();
  }, [hasUnsavedContent]);

  // Add function to handle image press
  const handleImagePress = (uri: string, index: number) => {
    setCurrentImage(uri);
    setCurrentImageIndex(index);
    setImageViewerVisible(true);
  };
  
  // Navigate to next image
  const handleNextImage = () => {
    if (currentImageIndex < attachments.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
      setCurrentImage(attachments[currentImageIndex + 1]);
    }
  };
  
  // Navigate to previous image
  const handlePrevImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
      setCurrentImage(attachments[currentImageIndex - 1]);
    }
  };
  
  // Close image viewer
  const closeImageViewer = () => {
    setImageViewerVisible(false);
  };

  // If auth overlay is shown, display the AuthScreen
  if (showAuthOverlay) {
    return <AuthScreen onAuthenticated={handleAuthenticated} />;
  }

  // Show login prompt banner if not authenticated
  const renderLoginPrompt = () => {
    if (!user) {
      return (
        <Pressable 
          style={styles.loginPrompt}
          onPress={showLoginPrompt}
        >
          <LogIn size={20} color="white" />
          <Text style={styles.loginPromptText}>
            Login to create posts
          </Text>
        </Pressable>
      );
    }
    return null;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBackPress} style={styles.backButton}>
          <ArrowLeft size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Create Post</Text>
        <Pressable 
          style={[
            styles.submitButton, 
            (!postText.trim() && attachments.length === 0 || !user) && styles.submitButtonDisabled
          ]} 
          onPress={handleSubmit}
          disabled={loading || (!postText.trim() && attachments.length === 0) || !user}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Send size={24} color="#fff" />
          )}
        </Pressable>
      </View>
      
      {/* Login prompt banner */}
      {renderLoginPrompt()}
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoidView}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
        >
          {/* User info */}
          <View style={styles.userInfoContainer}>
            {userAvatarUri ? (
              <Image 
                source={{ uri: userAvatarUri }} 
                style={styles.userAvatar} 
              />
            ) : (
              <View style={styles.userAvatarPlaceholder}>
                <UserCircle size={40} color="#888" />
              </View>
            )}
            <View style={styles.userTextContainer}>
              <View style={styles.usernameContainer}>
                <Text style={styles.userName}>{user ? user.username || '@user' : 'You'}</Text>
                {user?.isBlueVerified && (
                  <View style={styles.blueVerifiedBadge}>
                    <TunnelBlueVerifiedMark size={14} />
                  </View>
                )}
              </View>
              <View style={styles.privacySelector}>
                <Text style={styles.privacyText}>Public</Text>
              </View>
            </View>
          </View>
          
          {/* Post text input */}
          <TextInput
            style={styles.postInput}
            placeholder={user ? "What's on your mind?" : "Login to share your thoughts..."}
            placeholderTextColor="#888"
            multiline
            value={postText}
            onChangeText={setPostText}
            editable={!!user}
            autoFocus={!!user}
          />
          
          {/* Layout switcher for 4 images */}
          {renderLayoutSwitcher()}
          
          {/* Grid preview for 4 images in grid mode */}
          {renderGridPreview()}
          
          {/* Attachments preview */}
          {attachments.length > 0 && (
            <View style={styles.attachmentsContainer}>
              {/* Add counter for selected images */}
              <View style={styles.attachmentsCounter}>
                <Text style={styles.attachmentsCounterText}>
                  {attachments.length}/4 images selected
                  {attachments.length === 4 && ' (maximum)'}
                </Text>
              </View>
              
              {/* Only render standard preview if not in grid preview mode */}
              {!(attachments.length === 4 && layoutMode === 'grid') && attachments.map((uri, index) => (
                <View key={index} style={styles.attachmentWrapper}>
                  <Pressable 
                    onPress={() => handleImagePress(uri, index)}
                    style={({ pressed }) => [
                      styles.attachmentImageContainer,
                      pressed && styles.attachmentImagePressed
                    ]}
                  >
                    <Image source={{ uri }} style={styles.attachmentImage} />
                  </Pressable>
                  <Pressable 
                    style={styles.removeAttachmentButton}
                    onPress={() => handleRemoveAttachment(index)}
                  >
                    <LinearGradient
                      colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.7)']}
                      style={styles.removeButtonGradient}
                    >
                      <X size={16} color="#fff" />
                    </LinearGradient>
                  </Pressable>
                </View>
              ))}
              
              {attachments.length < 4 && (
                <Pressable 
                  style={styles.addMoreAttachmentsButton}
                  onPress={handlePickImage}
                >
                  <Plus size={24} color="#0070F3" />
                  <Text style={styles.addMoreButtonText}>
                    Add {attachments.length === 3 ? 'one more' : 'more'}
                  </Text>
                </Pressable>
              )}
            </View>
          )}
          
          {/* Location input */}
          {location ? (
            <View style={styles.locationContainer}>
              <MapPin size={16} color="#0070F3" />
              <Text style={styles.locationText}>{location}</Text>
              <Pressable 
                style={styles.removeLocationButton}
                onPress={() => setLocation('')}
              >
                <X size={14} color="#888" />
              </Pressable>
            </View>
          ) : null}
          
          {/* Tags input (for hashtags, mentions, etc.) */}
          <View style={styles.tagsContainer}>
            <View style={styles.tagSuggestion}>
              <Hash size={16} color="#0070F3" />
              <Text style={styles.tagSuggestionText}>Add hashtags</Text>
            </View>
            
            <View style={styles.tagSuggestion}>
              <AtSign size={16} color="#0070F3" />
              <Text style={styles.tagSuggestionText}>Mention people</Text>
            </View>
          </View>
          
          {/* Attachment buttons */}
          <View style={styles.actionButtonsContainer}>
            <View style={styles.actionHeaderRow}>
              <Text style={styles.actionSectionTitle}>Add to your post</Text>
              <Text style={styles.imageCountInfo}>
                {attachments.length > 0 ? 
                  `${attachments.length}/4 images` : 
                  'Up to 4 images allowed'}
              </Text>
            </View>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Pressable 
                style={[
                  styles.actionButton,
                  attachments.length >= 4 && styles.actionButtonDisabled
                ]}
                onPress={handlePickImage}
                disabled={attachments.length >= 4}
              >
                <LinearGradient
                  colors={[
                    attachments.length >= 4 ? 'rgba(150,150,150,0.1)' : 'rgba(0,112,243,0.1)', 
                    attachments.length >= 4 ? 'rgba(150,150,150,0.2)' : 'rgba(0,112,243,0.2)'
                  ]}
                  style={styles.actionButtonGradient}
                >
                  <ImageIcon size={24} color={attachments.length >= 4 ? '#888' : '#0070F3'} />
                  <Text style={[
                    styles.actionButtonText, 
                    attachments.length >= 4 && styles.actionButtonTextDisabled
                  ]}>
                    Photo {attachments.length >= 4 ? '(4/4)' : ''}
                  </Text>
                </LinearGradient>
              </Pressable>
              
              <Pressable 
                style={[
                  styles.actionButton,
                  attachments.length >= 4 && styles.actionButtonDisabled
                ]}
                onPress={handleTakePhoto}
                disabled={attachments.length >= 4}
              >
                <LinearGradient
                  colors={[
                    attachments.length >= 4 ? 'rgba(150,150,150,0.1)' : 'rgba(255,59,48,0.1)', 
                    attachments.length >= 4 ? 'rgba(150,150,150,0.2)' : 'rgba(255,59,48,0.2)'
                  ]}
                  style={styles.actionButtonGradient}
                >
                  <Camera size={24} color={attachments.length >= 4 ? '#888' : '#FF3B30'} />
                  <Text style={[
                    styles.actionButtonText, 
                    { color: attachments.length >= 4 ? '#888' : '#FF3B30' }
                  ]}>
                    Camera {attachments.length >= 4 ? '(4/4)' : ''}
                  </Text>
                </LinearGradient>
              </Pressable>
              
              <Pressable 
                style={styles.actionButton}
                onPress={getCurrentLocation}
                disabled={isGettingLocation}
              >
                <LinearGradient
                  colors={['rgba(0,223,216,0.1)', 'rgba(0,223,216,0.2)']}
                  style={styles.actionButtonGradient}
                >
                  {isGettingLocation ? (
                    <ActivityIndicator size="small" color="#00DFD8" />
                  ) : (
                    <MapPin size={24} color="#00DFD8" />
                  )}
                  <Text style={[styles.actionButtonText, { color: '#00DFD8' }]}>
                    {isGettingLocation ? 'Getting location...' : 'Location'}
                  </Text>
                </LinearGradient>
              </Pressable>
            </ScrollView>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      
      {/* Image Viewer Modal */}
      <Modal
        visible={imageViewerVisible}
        transparent={true}
        onRequestClose={closeImageViewer}
        animationType="fade"
      >
        <Pressable 
          style={styles.modalContainer} 
          onPress={closeImageViewer}
        >
          <View style={styles.modalBackdrop} />
          <Pressable 
            style={styles.imageViewerContent}
            onPress={(e) => e.stopPropagation()} // Prevent taps on image from closing modal
          >
            {/* Close button */}
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={closeImageViewer}
            >
              <X size={24} color="#fff" />
            </TouchableOpacity>
            
            {/* Image counter */}
            {attachments.length > 1 && (
              <View style={styles.imageCounter}>
                <Text style={styles.imageCounterText}>
                  {currentImageIndex + 1} / {attachments.length}
                </Text>
              </View>
            )}
            
            {/* Main image */}
            {currentImage && (
              <Image 
                source={{ uri: currentImage }} 
                style={styles.fullScreenImage}
                resizeMode="contain"
              />
            )}
            
            {/* Navigation buttons (only show if more than one image) */}
            {attachments.length > 1 && (
              <>
                {currentImageIndex > 0 && (
                  <TouchableOpacity 
                    style={[styles.navButton, styles.leftNavButton]}
                    onPress={handlePrevImage}
                  >
                    <ArrowLeft size={24} color="#fff" />
                  </TouchableOpacity>
                )}
                
                {currentImageIndex < attachments.length - 1 && (
                  <TouchableOpacity 
                    style={[styles.navButton, styles.rightNavButton]}
                    onPress={handleNextImage}
                  >
                    <ArrowLeft size={24} color="#fff" style={{ transform: [{ rotate: '180deg' }] }} />
                  </TouchableOpacity>
                )}
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  keyboardAvoidView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
  },
  submitButton: {
    width: 40,
    height: 40,
    backgroundColor: '#0070F3',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  submitButtonDisabled: {
    backgroundColor: 'rgba(0,112,243,0.5)',
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  userTextContainer: {
    marginLeft: 12,
  },
  usernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  blueVerifiedBadge: {
    marginLeft: 5,
  },
  privacySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
  },
  privacyText: {
    color: '#aaa',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  postInput: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Inter_400Regular',
    marginBottom: 16,
    lineHeight: 24,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  attachmentsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    marginHorizontal: -4,
  },
  attachmentWrapper: {
    width: '48%',
    aspectRatio: 1,
    margin: '1%',
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  attachmentImageContainer: {
    overflow: 'hidden',
    borderRadius: 8,
  },
  attachmentImagePressed: {
    opacity: 0.8,
  },
  attachmentImage: {
    width: '100%',
    height: undefined,
    aspectRatio: 1,
    borderRadius: 8,
  },
  removeAttachmentButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  removeButtonGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMoreAttachmentsButton: {
    width: '48%',
    aspectRatio: 1,
    margin: '1%',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,112,243,0.3)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,112,243,0.05)',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(0,112,243,0.1)',
    borderRadius: 8,
    marginBottom: 16,
  },
  locationText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginLeft: 8,
    flex: 1,
  },
  removeLocationButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  tagSuggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,112,243,0.1)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  tagSuggestionText: {
    color: '#0070F3',
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    marginLeft: 4,
  },
  actionButtonsContainer: {
    marginTop: 8,
  },
  actionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  actionSectionTitle: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  imageCountInfo: {
    color: '#777',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  actionButton: {
    marginRight: 10,
    marginBottom: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  actionButtonText: {
    color: '#0070F3',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    marginLeft: 8,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333',
  },
  userAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,112,243,0.2)',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,112,243,0.3)',
  },
  loginPromptText: {
    color: 'white',
    fontSize: 16,
    marginLeft: 10,
    fontFamily: 'Inter_500Medium',
  },
  layoutSwitcherContainer: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
  },
  layoutSwitcherTitle: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 12,
  },
  layoutOptions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  layoutOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  layoutOptionSelected: {
    borderColor: '#0070F3',
    backgroundColor: 'rgba(0,112,243,0.1)',
  },
  layoutOptionText: {
    color: '#777',
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    marginLeft: 8,
  },
  layoutOptionTextSelected: {
    color: '#0070F3',
    fontFamily: 'Inter_600SemiBold',
  },
  gridPreviewContainer: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
  },
  gridPreview: {
    width: '100%',
    height: 200,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 1.5,
    overflow: 'hidden',
  },
  gridPreviewRow: {
    flexDirection: 'row',
    width: '100%',
    height: '50%',
  },
  gridPreviewImage: {
    width: '50%',
    height: '100%',
    margin: 1,
    borderRadius: 2,
  },
  previewTitle: {
    color: '#0070F3',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 8,
  },
  previewNote: {
    color: '#777',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginTop: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  imageViewerContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height * 0.7,
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageCounter: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 15,
  },
  imageCounterText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -20,
  },
  leftNavButton: {
    left: 20,
  },
  rightNavButton: {
    right: 20,
  },
  gridPreviewImageContainer: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    borderRadius: 2,
  },
  attachmentsCounter: {
    width: '100%',
    paddingHorizontal: 8,
    paddingVertical: 8,
    marginBottom: 8,
    backgroundColor: 'rgba(0, 70, 250, 0.1)',
    borderRadius: 8,
    alignItems: 'center',
  },
  attachmentsCounterText: {
    color: '#0070F3',
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  addMoreButtonText: {
    color: '#0070F3',
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    marginLeft: 8,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonTextDisabled: {
    color: '#888',
  },
}); 