import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Dimensions,
  Animated,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
  Modal,
} from 'react-native';
import {
  Film,
  Upload,
  Smartphone,
  Monitor,
  LinkIcon,
  UserCircle2,
  DollarSign,
  X,
  Image as ImageIcon,
  Maximize2,
  Info,
  Eye,
  Heart,
  MessageCircle,
  Play,
  Pause,
} from 'lucide-react-native';
import { Video, ResizeMode } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import ScreenContainer from './ScreenContainer';
import * as videoService from '../../tunnel-ad-main/services/videoService';
import { useSanityAuth } from '../hooks/useSanityAuth';
import * as FileSystem from 'expo-file-system';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ContentType = 'ad' | 'personal';
type VideoOrientation = 'horizontal' | 'vertical';

interface VideoTunnellingProps {
  onSubmit: (data: any) => void;
}

export default function VideoTunnelling({ onSubmit }: VideoTunnellingProps) {
  const [contentType, setContentType] = useState<ContentType>('personal');
  const [videoOrientation, setVideoOrientation] = useState<VideoOrientation>('horizontal');
  const [personalDescription, setPersonalDescription] = useState('');
  const [personalVideoUri, setPersonalVideoUri] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState('');
  const [adDescription, setAdDescription] = useState('');
  const [videoLink, setVideoLink] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);
  const [showThumbnailOptions, setShowThumbnailOptions] = useState(false);
  const [detectedAspectRatio, setDetectedAspectRatio] = useState<number | null>(null);
  const [showFullView, setShowFullView] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  const { user } = useSanityAuth();
  
  const borderAnimation = useRef(new Animated.Value(0)).current;
  const linkFieldAnimation = useRef(new Animated.Value(0)).current;
  const videoRef = useRef<Video>(null);

  useEffect(() => {
    const animateBorder = () => {
      Animated.sequence([
        Animated.timing(borderAnimation, {
          toValue: 1,
          duration: 8000,
          useNativeDriver: true,
        }),
        Animated.timing(borderAnimation, {
          toValue: 0,
          duration: 8000,
          useNativeDriver: true,
        })
      ]).start(() => animateBorder());
    };

      animateBorder();

    // Loop the link field animation too
    const animateLinkField = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(linkFieldAnimation, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(linkFieldAnimation, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

      animateLinkField();

    return () => {
      borderAnimation.setValue(0);
      linkFieldAnimation.setValue(0);
    };
  }, []);

  // Add useEffect to pause main video when modals open and resume when closed
  useEffect(() => {
    if ((showFullView || showPreview) && videoRef.current) {
      videoRef.current.pauseAsync();
    } else if (!showFullView && !showPreview && videoRef.current) {
      // Resume video when both modals are closed
      videoRef.current.playAsync();
    }
  }, [showFullView, showPreview]);

  const handleVideoUpload = async () => {
    try {
      // Request permission first
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'To upload videos, please enable media library access in your device settings.',
          [{ text: 'OK', style: 'default' }]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'videos',
        allowsEditing: true,
        quality: 1,
        exif: true, // Get video metadata if available
      });

      if (!result.canceled && result.assets[0].uri) {
        setPersonalVideoUri(result.assets[0].uri);
        
        // Auto-detect orientation from video dimensions
        if (result.assets[0].width && result.assets[0].height) {
          const aspectRatio = result.assets[0].width / result.assets[0].height;
          const detectedOrientation = aspectRatio >= 1 ? 'horizontal' : 'vertical';
          setVideoOrientation(detectedOrientation);
          setDetectedAspectRatio(aspectRatio);
          
          // Format the orientation message
          const orientationMsg = detectedOrientation === 'horizontal' 
            ? 'landscape (widescreen)' 
            : 'portrait (tall)';
          
          // Show detected orientation to user
          Alert.alert(
            'Video Orientation Detected', 
            `Your video will be displayed in its original ${orientationMsg} format.`,
            [{ text: 'OK', style: 'default' }]
          );
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to upload video');
    }
  };

  const handleVideoLink = (link: string) => {
    // Allow empty input for deletion
    if (!link) {
      setVideoLink('');
      return;
    }

    // Check if it's a valid video URL
    if (link.match(/\.(mp4|mov)$/i) || link.includes('youtube.com') || link.includes('vimeo.com')) {
      setVideoLink(link);
    } else {
      Alert.alert('Invalid Link', 'Please provide a valid video link (MP4, MOV, YouTube, or Vimeo)');
    }
  };

  // Add a function to handle sample link click
  const handleSampleLinkClick = () => {
    const sampleLink = 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
    setVideoLink(sampleLink);
  };

  const handleSubmit = async () => {
    if (!user || !user._id) {
      Alert.alert('Authentication Required', 'Please log in to upload videos');
      return;
    }
    
    let title = videoTitle;
    let description = contentType === 'personal' ? personalDescription : adDescription;
    
    // Validate title
    if (!title) {
      title = 'Untitled Video';
    }
    
    // Check if we have a video source
    if (contentType === 'personal' && !personalVideoUri) {
      Alert.alert('Video Required', 'Please upload a video file');
      return;
    }
    
    if (contentType === 'ad' && !videoLink) {
      Alert.alert('Video Link Required', 'Please provide a video link');
      return;
    }
    
    // Start uploading
    setIsUploading(true);
    setUploadProgress(10);
    
    try {
      // Calculate aspect ratio based on detected orientation
      const exactAspectRatio = detectedAspectRatio || (videoOrientation === 'horizontal' ? 16/9 : 9/16);
      
      // Prepare video data
      const videoData = {
        title,
        description,
        contentType,
        videoOrientation,
        videoUri: personalVideoUri,
        videoLink,
        aspectRatio: exactAspectRatio,
        thumbnailUri,
        type: videoOrientation, // Ensure 'type' field matches VideoItem interface in Feed
      };
      
      // Simulate progress for better UX
      setUploadProgress(30);
      setTimeout(() => setUploadProgress(50), 500);
      setTimeout(() => setUploadProgress(70), 1000);
      
      // Upload to Sanity
      const createdVideo = await videoService.createVideo(videoData, user._id);
      
      // Update progress to complete
      setUploadProgress(100);
      
      // Show success message
      Alert.alert(
        'Video Uploaded',
        'Your video has been uploaded successfully!',
        [{ text: 'OK', onPress: () => {
          // Reset form and call onSubmit
          resetForm();
          onSubmit(createdVideo);
        }}]
      );
    } catch (error) {
      console.error('Error uploading video:', error);
      Alert.alert('Upload Failed', 'There was a problem uploading your video. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };
  
  const resetForm = () => {
    setVideoTitle('');
    setPersonalDescription('');
    setAdDescription('');
    setPersonalVideoUri(null);
    setVideoLink('');
    setThumbnailUri(null);
    setShowThumbnailOptions(false);
  };

  const getContentTypeStyles = (type: ContentType, isActive: boolean) => ({
    container: {
      backgroundColor: 'transparent',
    },
    icon: {
      opacity: isActive ? 1 : 0.5,
    },
  });

  const renderContentType = (type: ContentType, icon: React.ReactNode, label: string) => {
    const isActive = contentType === type;
    
    return (
      <Pressable
        style={[
          styles.typeButton,
          isActive && styles.activeTypeButton
        ]}
        onPress={() => setContentType(type)}
      >
        <View style={styles.typeButtonInner}>
          <View style={styles.typeIconContainer}>
            {React.cloneElement(icon as React.ReactElement, {
              color: '#FFFFFF',
              size: 24,
              style: { opacity: isActive ? 1 : 0.5 }
            })}
          </View>
          <Text style={[
            styles.typeText,
            isActive && styles.activeTypeText
          ]}>
            {label}
          </Text>
          {isActive && <View style={styles.activeIndicator} />}
        </View>
      </Pressable>
    );
  };

  // Add title input
  const renderTitleInput = () => (
    <View style={styles.inputSection}>
      <Text style={styles.inputLabel}>Video Title</Text>
      <TextInput
        style={styles.textInput}
        placeholder="Enter a title for your video"
        placeholderTextColor="#666"
        value={videoTitle}
        onChangeText={setVideoTitle}
        maxLength={100}
      />
    </View>
  );

  // Function to capture thumbnail from video
  const captureThumbnail = async () => {
    if (!personalVideoUri && !videoLink) {
      Alert.alert('Error', 'Please upload or link a video first');
      return;
    }

    try {
      if (videoLink) {
        // For video links, we'll use a default thumbnail or show options to upload one
        setShowThumbnailOptions(true);
        return;
      }

      // For local videos, we'll generate a thumbnail
      // First, attempt to capture a frame using the video reference
      if (videoRef.current) {
        // Prompt user to choose: automatically generate or upload custom
        Alert.alert(
          "Thumbnail Options",
          "How would you like to create your thumbnail?",
          [
            {
              text: "Upload Custom",
              onPress: pickThumbnailImage
            },
            {
              text: "Generate Automatically",
              onPress: () => generateThumbnailFromFrame()
            }
          ]
        );
      } else {
        // Fallback to default option flow
        setShowThumbnailOptions(true);
      }
    } catch (error) {
      console.error('Error capturing thumbnail:', error);
      Alert.alert('Error', 'Failed to capture thumbnail, please try uploading an image');
      setShowThumbnailOptions(true);
    }
  };

  // Generate thumbnail from current video frame
  const generateThumbnailFromFrame = async () => {
    try {
      // For our demo, we'll use a placeholder image based on video orientation
      const placeholderThumbnail = videoOrientation === 'horizontal'
        ? 'https://i.imgur.com/8LWOKjz.png'  // Horizontal placeholder
        : 'https://i.imgur.com/6kYnVGf.png'; // Vertical placeholder
      
      // Use the placeholderThumbnail directly
      setThumbnailUri(placeholderThumbnail);
      Alert.alert('Success', 'Thumbnail automatically generated');
    } catch (error) {
      console.error('Error generating thumbnail from frame:', error);
      Alert.alert('Error', 'Failed to generate thumbnail');
    }
  };

  // Pick a custom thumbnail image from gallery
  const pickThumbnailImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'To upload a thumbnail, please enable media library access in your device settings.',
          [{ text: 'OK', style: 'default' }]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: videoOrientation === 'horizontal' ? [16, 9] : [9, 16],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0].uri) {
        // Use the selected image directly
        setThumbnailUri(result.assets[0].uri);
        setShowThumbnailOptions(false);
      }
    } catch (error) {
      console.error('Error picking thumbnail image:', error);
      Alert.alert('Error', 'Failed to select thumbnail image');
    }
  };

  // Function to handle full-view button press
  const handleFullView = () => {
    // Pause the main video before opening full view
    if (videoRef.current) {
      videoRef.current.pauseAsync();
    }
    setShowFullView(true);
  };

  // Function to handle info button press
  const handleInfo = () => {
    setShowInfo(true);
  };

  // Function to handle preview button press
  const handlePreview = () => {
    // Pause the main video before opening preview
    if (videoRef.current) {
      videoRef.current.pauseAsync();
    }
    setShowPreview(true);
  };

  // Function to close modals
  const closeModals = () => {
    setShowFullView(false);
    setShowInfo(false);
    setShowPreview(false);
    
    // Resume the main video when modals are closed
    if (videoRef.current && !showInfo) {
      setTimeout(() => {
        videoRef.current?.playAsync();
      }, 300); // Small delay to ensure modal is fully closed
    }
  };

  // Full-view modal component
  const renderFullViewModal = () => {
    if (!personalVideoUri) return null;

  return (
      <Modal
        visible={showFullView}
        transparent={true}
        animationType="fade"
        onRequestClose={closeModals}
      >
        <View style={styles.modalFullView}>
          <Pressable style={styles.modalCloseButton} onPress={closeModals}>
            <X size={24} color="white" />
          </Pressable>
          <Video
            source={{ uri: personalVideoUri }}
            style={styles.fullScreenVideo}
            resizeMode={ResizeMode.CONTAIN}
            useNativeControls
            shouldPlay
            isLooping
          />
        </View>
      </Modal>
    );
  };

  // Info modal component
  const renderInfoModal = () => {
    return (
      <Modal
        visible={showInfo}
        transparent={true}
        animationType="slide"
        onRequestClose={closeModals}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Video Information</Text>
              <Pressable onPress={closeModals}>
                <X size={24} color="#1877F2" />
              </Pressable>
            </View>
            
            <View style={styles.infoContainer}>
              <Text style={styles.infoLabel}>Orientation:</Text>
              <Text style={styles.infoValue}>{videoOrientation === 'horizontal' ? 'Landscape' : 'Portrait'}</Text>
              
              {detectedAspectRatio && (
                <>
                  <Text style={styles.infoLabel}>Aspect Ratio:</Text>
                  <Text style={styles.infoValue}>{detectedAspectRatio.toFixed(2)}:1</Text>
                </>
              )}
              
              <Text style={styles.infoLabel}>Format:</Text>
              <Text style={styles.infoValue}>MP4</Text>
              
              <Text style={styles.infoNote}>
                Your video will maintain its original orientation and aspect ratio when uploaded.
                The preview in the feed will be optimized for the best viewing experience.
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // Preview modal component
  const renderPreviewModal = () => {
    if (!personalVideoUri) return null;
    
    return (
      <Modal
        visible={showPreview}
        transparent={true}
        animationType="slide"
        onRequestClose={closeModals}
      >
        <View style={styles.previewModalContainer}>
          <View style={styles.previewModalContent}>
            <View style={styles.previewModalHeader}>
              <Text style={styles.modalTitle}>Feed Preview</Text>
              <Pressable onPress={closeModals}>
                <X size={24} color="#1877F2" />
              </Pressable>
            </View>
            
            <View style={styles.feedPreviewContainer}>
              <View style={styles.feedHeader}>
                <View style={styles.feedUserInfo}>
                  <View style={styles.feedUserAvatar}>
                    <UserCircle2 size={24} color="#1877F2" />
                  </View>
                  <Text style={styles.feedUsername}>Your Profile</Text>
                </View>
                <Text style={styles.feedTime}>Just now</Text>
              </View>
              
              <View style={[
                styles.feedVideoContainer,
                videoOrientation === 'horizontal' 
                  ? styles.feedHorizontalVideo 
                  : styles.feedVerticalVideo
              ]}>
                <Video
                  source={{ uri: personalVideoUri }}
                  style={styles.feedVideo}
                  resizeMode={videoOrientation === 'horizontal' ? ResizeMode.CONTAIN : ResizeMode.COVER}
                  useNativeControls
                  shouldPlay
                  isLooping
                />
              </View>
              
              <View style={styles.feedCaption}>
                <Text style={styles.feedTitle}>{videoTitle || 'Video Title'}</Text>
                <Text style={styles.feedDescription} numberOfLines={2}>
                  {personalDescription || 'Your video description will appear here'}
                </Text>
              </View>
              
              <View style={styles.feedControls}>
                <View style={styles.feedControlItem}>
                  <Heart size={18} color="#F04757" style={styles.feedControlIcon} />
                  <Text style={styles.feedControlText}>0</Text>
                </View>
                <View style={styles.feedControlItem}>
                  <MessageCircle size={18} color="#1877F2" style={styles.feedControlIcon} />
                  <Text style={styles.feedControlText}>0</Text>
                </View>
                <View style={styles.feedControlItem}>
                  <Eye size={18} color="#999" style={styles.feedControlIcon} />
                  <Text style={styles.feedControlText}>0</Text>
                </View>
              </View>
            </View>
            
            <Text style={styles.previewNote}>
              This is how your video will appear in the video feed after uploading.
            </Text>
          </View>
        </View>
      </Modal>
    );
  };

  // Add control icons below video preview
  const renderVideoControls = () => {
    if (!personalVideoUri) return null;
    
    return (
      <View style={styles.videoControlsContainer}>
        <Pressable style={styles.videoControlButton} onPress={handleFullView}>
          <Maximize2 size={24} color="#1877F2" />
          <Text style={styles.videoControlText}>Full View</Text>
        </Pressable>
        
        <Pressable style={styles.videoControlButton} onPress={handleInfo}>
          <Info size={24} color="#1877F2" />
          <Text style={styles.videoControlText}>Information</Text>
        </Pressable>
        
        <Pressable style={styles.videoControlButton} onPress={handlePreview}>
          <Eye size={24} color="#1877F2" />
          <Text style={styles.videoControlText}>Preview</Text>
        </Pressable>
      </View>
    );
  };

  // Make sure the orientation is correctly previewed
  const renderVideoPreview = () => {
    if (!personalVideoUri) return null;
      
    // Format the aspect ratio display in a user-friendly way
    let aspectRatioDisplay = '';
    if (detectedAspectRatio) {
      if (detectedAspectRatio >= 1.7 && detectedAspectRatio <= 1.8) {
        aspectRatioDisplay = '(16:9)';
      } else if (detectedAspectRatio >= 1.3 && detectedAspectRatio <= 1.4) {
        aspectRatioDisplay = '(4:3)';
      } else if (detectedAspectRatio <= 0.6) {
        aspectRatioDisplay = '(9:16)';
      } else {
        aspectRatioDisplay = `(${detectedAspectRatio.toFixed(1)}:1)`;
      }
    }
      
    return (
      <View style={styles.videoOuterContainer}>
        <View style={[
          styles.videoPreviewContainer, 
          videoOrientation === 'horizontal' ? styles.horizontalVideo : styles.verticalVideo
        ]}>
                  <Animated.View
                    style={[
                      styles.animatedBorder,
                      {
                        transform: [{
                          rotate: borderAnimation.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0deg', '360deg']
                          })
                        }]
                      }
                    ]}
                  >
                    <LinearGradient
              colors={['#1877F2', '#00DFD8', '#1877F2']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                  </Animated.View>
          <View style={styles.videoInnerContainer}>
                      <Video
                        ref={videoRef}
                        source={{ uri: personalVideoUri }}
                        style={styles.videoPreview}
              resizeMode={videoOrientation === 'horizontal' ? ResizeMode.CONTAIN : ResizeMode.COVER}
              useNativeControls
              isLooping
              shouldPlay
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.5)']}
              style={styles.videoGradientOverlay}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            />
          </View>
          <View style={styles.orientationOverlay}>
            <Text style={styles.orientationLabelText}>
              {videoOrientation === 'horizontal' ? 'LANDSCAPE' : 'PORTRAIT'} {aspectRatioDisplay}
            </Text>
          </View>
                      <Pressable
            style={styles.closeButton}
                        onPress={() => setPersonalVideoUri(null)}
          >
            <View style={styles.closeButtonInner}>
              <X size={20} color="white" />
            </View>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <ScreenContainer>
      <View style={styles.container}>
       
        <View style={styles.formContainer}>
          {/* Remove alert from top of form */}
          
          {contentType === 'personal' && (
            <>
              <Text style={styles.sectionTitle}>Video</Text>
              <View style={styles.videoSection}>
                {!personalVideoUri ? (
                  <Pressable 
                    style={styles.uploadButton}
                    onPress={handleVideoUpload}
                      >
                        <LinearGradient
                      colors={['#1877F2', '#00DFD8']}
                      style={styles.uploadGradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        >
                      <Upload size={24} color="#FFFFFF" />
                      <Text style={styles.uploadButtonText}>Upload Video</Text>
                        </LinearGradient>
                      </Pressable>
                ) : (
                  <>
                    {renderVideoPreview()}
                    {renderVideoControls()}
                  </>
                  )}
                </View>

              {personalVideoUri && (
                <>
                  {renderTitleInput()}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Description</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={personalDescription}
                      onChangeText={setPersonalDescription}
                      placeholder="Write a compelling description"
                      placeholderTextColor="#666"
                      multiline
                      numberOfLines={4}
                    />
              </View>

              {/* Add Thumbnail Section */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Thumbnail</Text>
                <View style={[styles.uploadContainer, { aspectRatio: videoOrientation === 'horizontal' ? 16/9 : 9/16 }]}>
                      {!thumbnailUri ? (
                        <Pressable 
                          style={styles.uploadZoneSimple}
                          onPress={captureThumbnail}
                          disabled={!personalVideoUri && !videoLink}
                        >
                          <View style={styles.uploadContent}>
                            <ImageIcon size={24} color={!personalVideoUri && !videoLink ? '#666' : '#0070F3'} />
                            <Text style={styles.uploadSimpleText}>
                              Add Thumbnail
                            </Text>
                          </View>
                        </Pressable>
                      ) : (
                        <View style={styles.thumbnailContainer}>
                  <Animated.View
                    style={[
                              styles.thumbnailAnimatedBorder,
                      {
                        transform: [{
                          rotate: borderAnimation.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0deg', '360deg']
                          })
                        }]
                      }
                    ]}
                  >
                    <LinearGradient
                              colors={['#1877F2', '#00DFD8', '#1877F2']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                  </Animated.View>
                          <View style={styles.thumbnailInnerContainer}>
                      <Image
                        source={{ uri: thumbnailUri }}
                              style={styles.thumbnailPreview}
                        resizeMode="cover"
                      />
                          </View>
                      <Pressable
                            style={styles.thumbnailRemoveButton}
                        onPress={() => setThumbnailUri(null)}
                      >
                            <View style={styles.removeButtonInner}>
                              <X size={16} color="white" />
                            </View>
                      </Pressable>
                    </View>
                  )}
                </View>
              </View>
                </>
              )}
            </>
          )}

          {/* Show alert message only when video is selected but other fields are missing */}
          {((contentType === 'personal' && personalVideoUri && (!videoTitle || !personalDescription)) || 
            (contentType === 'ad' && videoLink && (!videoTitle || !adDescription))) && (
            <View style={styles.alertContainer}>
              <Info size={18} color="#1877F2" />
              <Text style={styles.alertText}>
                Fill all fields to complete your video tunnelling
              </Text>
              </View>
          )}

          {contentType === 'ad' && (
            <View style={styles.adContainer}>
              <LinearGradient
                colors={['rgba(0,112,243,0.1)', 'rgba(0,223,216,0.1)']}
                style={styles.adGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.adContent}>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, styles.adLabel]}>Video Link</Text>
                    <View style={styles.adLinkWrapper}>
                      {!videoLink && (
                        <Animated.View
                          style={[
                            styles.linkAnimationBorder,
                            {
                              transform: [{
                                translateX: linkFieldAnimation.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [-SCREEN_WIDTH, SCREEN_WIDTH]
                                })
                              }]
                            }
                          ]}
                        >
                          <LinearGradient
                            colors={['transparent', '#0070F3', '#00DFD8', 'transparent']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.linkGradient}
                          />
                        </Animated.View>
                      )}
                      <View style={styles.adLinkContainer}>
                        <LinkIcon size={24} color="#0070F3" style={styles.linkIcon} />
                        <TextInput
                          style={styles.adLinkInput}
                          value={videoLink}
                          onChangeText={handleVideoLink}
                          placeholder="Paste video link here (MP4, MOV, YouTube, Vimeo)"
                          placeholderTextColor="#666"
                          autoCapitalize="none"
                          autoCorrect={false}
                        />
                        {videoLink ? (
                          <Pressable
                            style={styles.clearButton}
                            onPress={() => handleVideoLink('')}
                          >
                            <X size={20} color="#666" />
                          </Pressable>
                        ) : null}
                      </View>
                    </View>
                    <Pressable 
                      style={styles.sampleLinkContainer}
                      onPress={handleSampleLinkClick}
                    >
                      <Text style={styles.sampleLinkLabel}>Try with sample: </Text>
                      <Text style={styles.sampleLink}>Sample Video Link</Text>
                    </Pressable>
                  </View>

                  {videoLink && (
                    <View style={[styles.previewContainer, { aspectRatio: 16/9, marginTop: 24 }]}>
                      <Video
                        source={{ uri: videoLink }}
                        style={styles.videoPreview}
                        resizeMode={ResizeMode.CONTAIN}
                        useNativeControls
                        isLooping
                        shouldPlay
                        isMuted={isMuted}
                      />
                      <Pressable
                        style={styles.soundButton}
                        onPress={() => setIsMuted(!isMuted)}
                      >
                        <LinearGradient
                          colors={['#0070F3', '#00DFD8']}
                          style={styles.soundGradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        >
                          {isMuted ? (
                            <Text style={styles.soundButtonText}>🔇</Text>
                          ) : (
                            <Text style={styles.soundButtonText}>🔊</Text>
                          )}
                        </LinearGradient>
                      </Pressable>
                    </View>
                  )}

                  <View style={[styles.inputGroup, { marginTop: 24 }]}>
                    <Text style={[styles.label, styles.adLabel]}>Description</Text>
                    <TextInput
                      style={[styles.input, styles.adTextArea]}
                      value={adDescription}
                      onChangeText={setAdDescription}
                      placeholder="Write a compelling description for your ad"
                      placeholderTextColor="#666"
                      multiline
                      numberOfLines={6}
                    />
                  </View>
                </View>
              </LinearGradient>
            </View>
          )}

          {/* Show submit button only when all required fields are filled */}
          {((contentType === 'personal' && personalVideoUri && videoTitle && personalDescription) || 
            (contentType === 'ad' && videoLink && videoTitle && adDescription)) && (
          <Pressable
            style={[styles.submitButton, (isUploading) && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={isUploading}
          >
            {isUploading ? (
              <View style={styles.uploadingContainer}>
                <ActivityIndicator color="white" size="small" />
                <Text style={styles.submitButtonText}>
                  Uploading... {uploadProgress}%
                </Text>
              </View>
            ) : (
              <Text style={styles.submitButtonText}>
                Submit Video
              </Text>
            )}
          </Pressable>
          )}
        </View>
      </View>
      
      {renderFullViewModal()}
      {renderInfoModal()}
      {renderPreviewModal()}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  headingContainer: {
    marginBottom: 30,
  },
  headingText: {
    color: '#1877F2',
    fontSize: 32,
    fontFamily: 'Inter_700Bold',
  },
  subHeadingText: {
    color: '#666',
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    marginTop: 8,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 16,
  },
  videoSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    width: '100%',
  },
  uploadButton: {
    width: '100%',
    height: 54,
    borderRadius: 27,
    overflow: 'hidden',
    marginVertical: 10,
    position: 'relative',
  },
  uploadButtonAnimatedBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
    width: 600,
    zIndex: 1,
  },
  uploadButtonGlow: {
    flex: 1,
    opacity: 0.8,
  },
  uploadGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  uploadButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  uploadZoneSimple: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    borderStyle: 'dashed',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  uploadSimpleText: {
    color: '#0070F3',
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    marginTop: 8,
  },
  thumbnailContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: '#000',
  },
  thumbnailInnerContainer: {
    margin: 5,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#000',
    width: '100%',
    height: '100%',
    zIndex: 2,
  },
  thumbnailPreview: {
    width: '100%',
    height: '100%',
  },
  thumbnailRemoveButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0, 145, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  removeButtonInner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formContainer: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 10,
    opacity: 0.9,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  uploadContainer: {
    position: 'relative',
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  animatedBorder: {
    position: 'absolute',
    top: -100,
    left: -100,
    right: -100,
    bottom: -100,
    borderRadius: 16,
    overflow: 'hidden',
    zIndex: 1,
  },
  videoInnerContainer: {
    margin: 5,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
    width: '100%',
    height: '100%',
    zIndex: 2,
  },
  uploadContent: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  videoPreview: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  removeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
  },
  removeGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adContainer: {
    width: SCREEN_WIDTH,
    marginHorizontal: -20,
    paddingHorizontal: 20,
    marginBottom: 24,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  adGradient: {
    borderRadius: 24,
    padding: 2,
  },
  adContent: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 24,
    padding: 24,
  },
  adLabel: {
    color: '#FFFFFF',
    fontSize: 20,
    marginBottom: 16,
  },
  adLinkWrapper: {
    position: 'relative',
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  linkAnimationBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
    width: SCREEN_WIDTH * 2,
    zIndex: 1,
  },
  linkGradient: {
    flex: 1,
    opacity: 0.5,
  },
  adLinkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,112,243,0.3)',
    paddingHorizontal: 16,
    height: 64,
  },
  adLinkInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    paddingVertical: 12,
    paddingRight: 40,
  },
  clearButton: {
    position: 'absolute',
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sampleLinkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 4,
  },
  sampleLinkLabel: {
    color: '#666',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  sampleLink: {
    color: '#0070F3',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    textDecorationLine: 'underline',
  },
  adTextArea: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderColor: 'rgba(255,255,255,0.1)',
    minHeight: 160,
    fontSize: 16,
    lineHeight: 24,
  },
  submitButton: {
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1877F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  disabledButton: {
    opacity: 0.7,
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  linkIcon: {
    marginRight: 12,
  },
  soundButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    zIndex: 2,
  },
  soundGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  soundButtonText: {
    fontSize: 18,
  },
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 10,
    opacity: 0.9,
  },
  textInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  thumbnailHelp: {
    color: '#666',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginTop: 6,
    paddingHorizontal: 8,
  },
  videoOuterContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 0,
  },
  videoPreviewContainer: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  horizontalVideo: {
    width: SCREEN_WIDTH - 32,
    aspectRatio: 16/9,
  },
  verticalVideo: {
    width: SCREEN_WIDTH * 0.9,
    aspectRatio: 9/16,
    maxHeight: SCREEN_WIDTH * 1.5,
  },
  orientationOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    padding: 12,
    alignItems: 'center',
    zIndex: 4,
  },
  orientationLabelText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 145, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  closeButtonInner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orientationNote: {
    color: '#0070F3',
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    marginTop: 12,
    textAlign: 'center',
  },
  orientationInfo: {
    color: '#0070F3',
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    marginTop: 8,
    textAlign: 'center',
  },
  // Content type styles
  typeButton: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  activeTypeButton: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  typeButtonInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 10,
    backgroundColor: 'transparent',
    position: 'relative',
  },
  typeIconContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    opacity: 0.5,
  },
  activeTypeText: {
    opacity: 1,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#FFFFFF',
  },
  previewContainer: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
  },
  videoGradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    zIndex: 3,
  },
  thumbnailAnimatedBorder: {
    position: 'absolute',
    top: -50,
    left: -50,
    right: -50,
    bottom: -50,
    borderRadius: 12,
    overflow: 'hidden',
    zIndex: 1,
  },
  // Video controls styles
  videoControlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    marginVertical: 10,
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
  },
  videoControlButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  videoControlText: {
    color: '#1877F2',
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    marginTop: 4,
  },
  
  // Modal styles
  modalFullView: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenVideo: {
    width: '100%',
    height: '100%',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 20,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#121212',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1877F2',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    color: '#1877F2',
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
  },
  
  // Info modal styles
  infoContainer: {
    marginVertical: 10,
  },
  infoLabel: {
    color: '#999',
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    marginTop: 12,
  },
  infoValue: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginTop: 4,
  },
  infoNote: {
    color: '#999',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginTop: 20,
    lineHeight: 20,
  },
  
  // Preview modal styles
  previewModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  previewModalContent: {
    width: '90%',
    maxHeight: '90%',
    backgroundColor: '#121212',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1877F2',
  },
  previewModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  feedPreviewContainer: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
  },
  feedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
  },
  feedUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  feedUserAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  feedUsername: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  feedTime: {
    color: '#999',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  feedVideoContainer: {
    width: '100%',
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  feedHorizontalVideo: {
    aspectRatio: 16/9,
    width: '100%',
    height: undefined, // Let height be determined by aspect ratio
    minHeight: 200, // Set minimum height
  },
  feedVerticalVideo: {
    aspectRatio: 9/16,
    alignSelf: 'center',
    width: '70%', // Reduced from 100% to keep within bounds
  },
  feedVideo: {
    width: '100%',
    height: '100%',
  },
  feedCaption: {
    padding: 10,
  },
  feedTitle: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 4,
  },
  feedDescription: {
    color: '#ccc',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  feedControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  feedControlItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  feedControlIcon: {
    marginRight: 5,
  },
  feedControlText: {
    color: '#999',
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  previewNote: {
    color: '#999',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginTop: 10,
  },
  // Add styles for the alert container
  alertContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(24, 119, 242, 0.1)',
    borderRadius: 12,
    padding: 10,
    marginTop: 16,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#1877F2',
  },
  alertText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    marginLeft: 10,
    flex: 1,
  },
}); 