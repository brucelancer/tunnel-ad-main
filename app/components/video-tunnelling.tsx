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
  ScrollView,
  StatusBar,
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
  ChevronRight,
  ChevronLeft,
  Check,
  Type,
  FileText,
  Video as VideoIcon,
  HelpCircle,
  Star,
  Trophy,
  Users,
  TrendingUp,
  Camera,
} from 'lucide-react-native';
import { Video, ResizeMode } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import ScreenContainer from './ScreenContainer';
import * as videoService from '../../tunnel-ad-main/services/videoService';
import { useSanityAuth } from '../hooks/useSanityAuth';
import * as FileSystem from 'expo-file-system';
import * as VideoThumbnails from 'expo-video-thumbnails';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type ContentType = 'ad' | 'personal';
type VideoOrientation = 'horizontal' | 'vertical';

// Define the steps of the video upload process
type UploadStep = 
  | 'SELECT_TYPE'       // Step 1: Choose between personal video or ad
  | 'SELECT_VIDEO'      // Step 2: Upload video or provide link
  | 'ADD_DETAILS'       // Step 3: Add title, description
  | 'ADD_THUMBNAIL'     // Step 4: Add or generate thumbnail
  | 'PREVIEW'           // Step 5: Preview the final result
  | 'UPLOADING';        // Final step: Uploading in progress

interface VideoTunnellingProps {
  onSubmit?: (data: any) => void;
}

export default function VideoTunnelling({ onSubmit }: VideoTunnellingProps) {
  // Current step in the upload process
  const [currentStep, setCurrentStep] = useState<UploadStep>('SELECT_TYPE');
  
  // Original state variables
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
  
  // Added state for instructions modal
  const [showInstructions, setShowInstructions] = useState(false);
  
  // Step progress animation
  const progressAnimation = useRef(new Animated.Value(0)).current;
  
  const { user } = useSanityAuth();
  
  const borderAnimation = useRef(new Animated.Value(0)).current;
  const linkFieldAnimation = useRef(new Animated.Value(0)).current;
  const videoRef = useRef<Video>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Animation for the header title
  const titleAnimatedValue = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    const startTitleAnimation = () => {
      Animated.loop(
        Animated.timing(titleAnimatedValue, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: false,
        })
      ).start();
    };
    
    startTitleAnimation();
    return () => {
      titleAnimatedValue.stopAnimation();
    };
  }, []);
  
  // Animated color for the title
  const animatedColor = titleAnimatedValue.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: ['#0070F3', '#00A5F3', '#00DFD8', '#00A5F3', '#0070F3']
  });
  
  // Function to reset all form state
  const resetForm = () => {
    setCurrentStep('SELECT_TYPE');
    setContentType('personal');
    setVideoOrientation('horizontal');
    setPersonalDescription('');
    setPersonalVideoUri(null);
    setVideoTitle('');
    setAdDescription('');
    setVideoLink('');
    setIsMuted(false);
    setIsUploading(false);
    setUploadProgress(0);
    setThumbnailUri(null);
    setShowThumbnailOptions(false);
    setDetectedAspectRatio(null);
    setShowFullView(false);
    setShowInfo(false);
    setShowPreview(false);
  };
  
  // Function to pick thumbnail from image library
  const pickThumbnailImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        aspect: videoOrientation === 'horizontal' ? [16, 9] : [9, 16],
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setThumbnailUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking thumbnail image:', error);
      Alert.alert('Error', 'Failed to select thumbnail image');
    }
  };
  
  // Function to generate thumbnail from video frame
  const generateThumbnailFromFrame = async () => {
    try {
      // Use the video URI based on content type
      const videoSource = contentType === 'personal' ? personalVideoUri : videoLink;
      
      if (!videoSource) {
        Alert.alert('Error', 'No video source available');
        return;
      }
      
      // Generate thumbnail at the 1-second mark
      const thumbnail = await VideoThumbnails.getThumbnailAsync(videoSource, {
        time: 1000,
      });
      
      setThumbnailUri(thumbnail.uri);
    } catch (error) {
      console.error('Error generating thumbnail:', error);
      Alert.alert('Error', 'Failed to generate thumbnail from video');
    }
  };
  
  // Helper function to determine if the current step is complete and can proceed
  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 'SELECT_TYPE':
        // Can always proceed from type selection
        return true;
      case 'SELECT_VIDEO':
        // Need either a video file or link depending on content type
        return contentType === 'personal' 
          ? !!personalVideoUri 
          : !!videoLink;
      case 'ADD_DETAILS':
        // Need a title and description
        return !!videoTitle && 
          (contentType === 'personal' 
            ? !!personalDescription 
            : !!adDescription);
      case 'ADD_THUMBNAIL':
        // Thumbnail is optional
        return true;
      case 'PREVIEW':
        // Can always proceed from preview to upload
        return true;
      case 'UPLOADING':
        // Can't proceed during upload
        return false;
    }
  };
  
  // Function to navigate to the next step
  const goToNextStep = () => {
    if (!canProceedToNextStep()) {
      // Show error message appropriate for the current step
      let errorMessage = 'Please complete all required fields before continuing.';
      
      switch (currentStep) {
        case 'SELECT_VIDEO':
          errorMessage = contentType === 'personal'
            ? 'Please select a video from your device.'
            : 'Please enter a valid video link.';
          break;
        case 'ADD_DETAILS':
          errorMessage = 'Please add both a title and description for your video.';
          break;
      }
      
      Alert.alert('Missing Information', errorMessage);
      return;
    }
    
    // Determine the next step
    let nextStep: UploadStep;
    switch (currentStep) {
      case 'SELECT_TYPE':
        nextStep = 'SELECT_VIDEO';
        break;
      case 'SELECT_VIDEO':
        nextStep = 'ADD_DETAILS';
        break;
      case 'ADD_DETAILS':
        nextStep = 'ADD_THUMBNAIL';
        break;
      case 'ADD_THUMBNAIL':
        nextStep = 'PREVIEW';
        break;
      case 'PREVIEW':
        nextStep = 'UPLOADING';
        handleSubmit(); // Start the upload process
        break;
      default:
        return; // Can't go beyond uploading
    }
    
    // Animate the progress indicator
    Animated.timing(progressAnimation, {
      toValue: getProgressValue(nextStep),
      duration: 500,
      useNativeDriver: false,
    }).start();
    
    // Update the current step
    setCurrentStep(nextStep);
  };
  
  // Function to go back to the previous step
  const goToPreviousStep = () => {
    if (currentStep === 'SELECT_TYPE' || currentStep === 'UPLOADING') {
      return; // Can't go back from first step or during upload
    }
    
    // Determine the previous step
    let prevStep: UploadStep;
    switch (currentStep) {
      case 'SELECT_VIDEO':
        prevStep = 'SELECT_TYPE';
        break;
      case 'ADD_DETAILS':
        prevStep = 'SELECT_VIDEO';
        break;
      case 'ADD_THUMBNAIL':
        prevStep = 'ADD_DETAILS';
        break;
      case 'PREVIEW':
        prevStep = 'ADD_THUMBNAIL';
        break;
      default:
        return; // Should never happen
    }
    
    // Animate the progress indicator
    Animated.timing(progressAnimation, {
      toValue: getProgressValue(prevStep),
      duration: 300,
      useNativeDriver: false,
    }).start();
    
    // Update the current step
    setCurrentStep(prevStep);
  };
  
  // Helper function to determine progress percentage for each step
  const getProgressValue = (step: UploadStep): number => {
    switch (step) {
      case 'SELECT_TYPE': return 0;
      case 'SELECT_VIDEO': return 0.25;
      case 'ADD_DETAILS': return 0.5;
      case 'ADD_THUMBNAIL': return 0.75;
      case 'PREVIEW': return 0.9;
      case 'UPLOADING': return 1;
    }
  };
  
  // Update progress indicator when component mounts
  useEffect(() => {
    progressAnimation.setValue(getProgressValue(currentStep));
  }, []);

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
          // Reset form and call onSubmit if it exists
          resetForm();
          if (typeof onSubmit === 'function') {
          onSubmit(createdVideo);
          } else {
            console.log('Video uploaded successfully but no onSubmit handler provided:', createdVideo);
            // If no onSubmit handler provided, we'll just reset the form and navigate to VideoFeed
            try {
              // Navigate to the VideoFeed component
              router.push("/(tabs)" as any);
            } catch (error) {
              console.error('Error navigating to VideoFeed:', error);
              setCurrentStep('SELECT_TYPE');
            }
          }
        }}]
      );
    } catch (error) {
      console.error('Error uploading video:', error);
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

  // Render video preview (completely rewritten with inline styles)
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
      <View style={{
        width: '100%',
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#111',
        marginVertical: 8,
      }}>
        <View style={[
          {
            position: 'relative',
            borderRadius: 16,
            overflow: 'hidden',
            backgroundColor: '#000',
            alignSelf: 'center',
          },
          videoOrientation === 'horizontal' 
            ? { width: '100%', aspectRatio: 16/9 } 
            : { width: '80%', aspectRatio: 9/16, maxHeight: SCREEN_WIDTH }
        ]}>
        <Animated.View
          style={[
              {
                position: 'absolute',
                top: -100,
                left: -100,
                right: -100,
                bottom: -100,
                borderRadius: 16,
                overflow: 'hidden',
                zIndex: 1,
              },
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
          <View style={{
            margin: 5,
            borderRadius: 12,
            overflow: 'hidden',
            backgroundColor: '#000',
            width: '100%',
            height: '100%',
            zIndex: 2,
          }}>
            <Video
              ref={videoRef}
              source={{ uri: personalVideoUri }}
              style={{ width: '100%', height: '100%' }}
              resizeMode={videoOrientation === 'horizontal' ? ResizeMode.CONTAIN : ResizeMode.COVER}
              useNativeControls
              isLooping
              shouldPlay
            />
          <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.5)']}
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: 60,
                zIndex: 3,
              }}
            start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            />
          </View>
          <View style={{
            alignSelf: 'center',
            backgroundColor: 'rgba(24, 119, 242, 0.2)',
            borderRadius: 12,
            paddingVertical: 6,
            paddingHorizontal: 12,
            marginVertical: 12,
          }}>
            <Text style={{
              color: '#1877F2',
              fontSize: 14,
              fontFamily: 'Inter_500Medium',
            }}>
              {videoOrientation === 'horizontal' ? 'LANDSCAPE' : 'PORTRAIT'} {aspectRatioDisplay}
            </Text>
          </View>
                    <Pressable 
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              width: 30,
              height: 30,
              borderRadius: 15,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
            }}
            onPress={() => setPersonalVideoUri(null)}
          >
            <View style={{
              width: '100%',
              height: '100%',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <X size={20} color="white" />
            </View>
        </Pressable>
        </View>
      </View>
    );
  };

  // Function to render instruction items in the help modal
  const renderInstructionItem = (icon: React.ReactNode, title: string, description: string) => (
    <View style={styles.instructionItem}>
                      <LinearGradient
                        colors={['rgba(0,112,243,0.1)', 'rgba(0,223,216,0.1)']}
        style={styles.instructionIcon}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
        {icon}
                      </LinearGradient>
      <View style={styles.instructionText}>
        <Text style={styles.instructionTitle}>{title}</Text>
        <Text style={styles.instructionDescription}>{description}</Text>
      </View>
    </View>
  );

  // Function to scroll to the bottom where the Continue button is
  const scrollToBottom = () => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  };
  
  // Handle recording video with camera
  const openCamera = async () => {
    try {
      // Request camera permission
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Camera Permission Required',
          'To record videos, please enable camera access in your device settings.',
          [{ text: 'OK', style: 'default' }]
        );
        return;
      }
      
      // Launch camera for video recording
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 1,
        videoMaxDuration: 60,
      });
      
      if (!result.canceled && result.assets[0].uri) {
        setPersonalVideoUri(result.assets[0].uri);
        
        // Auto-detect orientation
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
      console.error('Error recording video:', error);
      Alert.alert('Recording Error', 'Failed to record video');
    }
  };
  
  // Get video dimensions
  const getVideoDimensions = async (uri: string): Promise<{ width: number, height: number }> => {
    try {
      const thumbnail = await VideoThumbnails.getThumbnailAsync(uri, {
        time: 1000,
      });
      return { width: thumbnail.width, height: thumbnail.height };
    } catch (error) {
      console.error('Error getting video dimensions:', error);
      return { width: 16, height: 9 }; // Default 16:9 ratio
    }
  };

  return (
    <ScreenContainer>
      <View style={{ width: '100%', flex: 1 }}>
        <StatusBar barStyle="light-content" />
      <View style={styles.container}>
          {/* Header with animated title and help button */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View>
                <Animated.Text style={[styles.headerTitle, { color: animatedColor }]}>
                  Video Tunnelling
                </Animated.Text>
                <Text style={styles.headerSubtitle}>Share your videos and earn points!</Text>
              </View>
              <Pressable
                style={styles.helpButton}
                onPress={() => setShowInstructions(true)}
              >
                <HelpCircle size={24} color="#0070F3" />
              </Pressable>
            </View>
        </View>

          {/* Help Instructions Modal */}
          <Modal
            visible={showInstructions}
            transparent
            animationType="fade"
            onRequestClose={() => setShowInstructions(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                    <LinearGradient
                  colors={['#1A1A1A', '#000000']}
                      style={StyleSheet.absoluteFill}
                    />
                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleContainer}>
                    <Star size={24} color="#0070F3" />
                    <Text style={styles.modalTitle}>How to Earn Points with Videos</Text>
      </View>
                    <Pressable 
                  style={styles.closeButton}
                  onPress={() => setShowInstructions(false)}
                >
                  <X size={24} color="#666" />
                    </Pressable>
                </View>
                
                <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                  {renderInstructionItem(
                    <Film size={24} color="#0070F3" />,
                    "Upload Videos",
                    "Earn 100 points for each video upload. High-quality content can earn bonus points!"
                  )}
                  {renderInstructionItem(
                    <Users size={24} color="#0070F3" />,
                    "Engage Community",
                    "Earn 10 points for each meaningful comment or reaction from other users."
                  )}
                  {renderInstructionItem(
                    <TrendingUp size={24} color="#0070F3" />,
                    "Trending Content",
                    "Double your points when your content reaches trending status!"
                  )}
                  {renderInstructionItem(
                    <Trophy size={24} color="#0070F3" />,
                    "Weekly Rewards",
                    "Top contributors receive exclusive badges and bonus point multipliers."
                  )}
                </ScrollView>

                      <Pressable
                  style={styles.startEarningButton}
                  onPress={() => setShowInstructions(false)}
                      >
                        <LinearGradient
                          colors={['#0070F3', '#00DFD8']}
                    style={styles.startEarningGradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        >
                    <Text style={styles.startEarningText}>Start Earning Now</Text>
                        </LinearGradient>
                      </Pressable>
                    </View>
            </View>
          </Modal>

          {/* Header with progress bar */}
          <View style={styles.progressHeader}>
            {currentStep !== 'SELECT_TYPE' && currentStep !== 'UPLOADING' && (
              <Pressable 
                style={styles.backButton} 
                onPress={goToPreviousStep}
              >
                <ChevronLeft size={24} color="#fff" />
              </Pressable>
            )}
            
            <View style={styles.headerTextContainer}>
              <Text style={styles.progressHeaderTitle}>
                {currentStep === 'SELECT_TYPE' && 'Choose Video Type'}
                {currentStep === 'SELECT_VIDEO' && 'Select Video'}
                {currentStep === 'ADD_DETAILS' && 'Add Details'}
                {currentStep === 'ADD_THUMBNAIL' && 'Add Thumbnail'}
                {currentStep === 'PREVIEW' && 'Preview Video'}
                {currentStep === 'UPLOADING' && 'Uploading Video'}
              </Text>
              <Text style={styles.stepIndicator}>
                {currentStep !== 'UPLOADING' 
                  ? `Step ${getProgressValue(currentStep) * 4 + 1}/5` 
                  : 'Finalizing'}
              </Text>
                </View>
              </View>

          {/* Progress bar */}
          <View style={styles.progressBarContainer}>
                  <Animated.View
                    style={[
                styles.progressBar,
                { width: progressAnimation.interpolate({
                            inputRange: [0, 1],
                  outputRange: ['0%', '100%']
                })}
              ]}
            />
          </View>
          
          {/* Main content area */}
          <ScrollView 
            style={styles.contentScrollView}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            ref={scrollViewRef}
          >
            {/* Step 1: Select Content Type */}
            {currentStep === 'SELECT_TYPE' && (
              <View style={styles.stepContainer}>
                <Text style={styles.stepTitle}>What type of video are you sharing?</Text>
                <Text style={styles.stepDescription}>
                  Choose the option that best describes your content.
                </Text>

                <View style={styles.typeSelectionContainer}>
                  <Pressable
                    style={[
                      styles.typeCard,
                      contentType === 'personal' && styles.selectedTypeCard,
                      { width: '100%' }
                    ]}
                    onPress={() => setContentType('personal')}
                  >
                    <LinearGradient
                    colors={contentType === 'personal' 
                      ? ['#1877F2', '#00DFD8'] 
                      : ['rgba(24, 119, 242, 0.1)', 'rgba(0, 223, 216, 0.1)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    style={[styles.typeCardGradient, { width: '100%' }]}
                  >
                    <View style={styles.typeCardInner}>
                      <View style={styles.typeIconContainer}>
                        <VideoIcon size={32} color={contentType === 'personal' ? '#fff' : '#1877F2'} />
                      </View>
                      <Text style={[
                        styles.typeCardTitle,
                        contentType === 'personal' && styles.selectedTypeCardText
                      ]}>
                        Personal Video
                      </Text>
                      {contentType === 'personal' && (
                        <View style={styles.selectedCheckmark} />
                      )}
                    </View>
                  </LinearGradient>
                </Pressable>
                
                    <Pressable 
                  style={[
                    styles.typeCard,
                    contentType === 'ad' && styles.selectedTypeCard,
                    { width: '100%' }
                  ]}
                  onPress={() => setContentType('ad')}
                    >
                      <LinearGradient
                    colors={contentType === 'ad' 
                      ? ['#1877F2', '#00DFD8'] 
                      : ['rgba(24, 119, 242, 0.1)', 'rgba(0, 223, 216, 0.1)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    style={[styles.typeCardGradient, { width: '100%' }]}
                  >
                    <View style={styles.typeCardInner}>
                      <View style={styles.typeIconContainer}>
                        <LinkIcon size={32} color={contentType === 'ad' ? '#fff' : '#1877F2'} />
                      </View>
                          <Text style={[
                        styles.typeCardTitle,
                        contentType === 'ad' && styles.selectedTypeCardText
                          ]}>
                        Video Link
                          </Text>
                      {contentType === 'ad' && (
                        <View style={styles.selectedCheckmark} />
                      )}
                    </View>
                  </LinearGradient>
                </Pressable>
              </View>
              
              <View style={styles.stepInfoBox}>
                <Info size={20} color="#1877F2" />
                <Text style={styles.stepInfoText}>
                  {contentType === 'personal' 
                    ? 'Upload videos directly from your device. Supported formats include MP4 and MOV.'
                    : 'Share videos via link from YouTube, Vimeo, or direct MP4/MOV file URLs.'}
                          </Text>
                        </View>
              </View>
            )}
            
            {/* Step 2: Select Video */}
            {currentStep === 'SELECT_VIDEO' && (
              <View style={styles.stepContainer}>
                <Text style={styles.stepTitle}>
                  {contentType === 'personal' ? 'Select your video' : 'Enter video link'}
                </Text>
                <Text style={styles.stepDescription}>
                  {contentType === 'personal' 
                    ? 'Choose a video from your device to share.'
                    : 'Paste a link to a video from YouTube, Vimeo, or a direct video file.'}
                </Text>
                
                {/* Personal video upload UI */}
                {contentType === 'personal' && (
                  <View style={styles.videoSelectContainer}>
                    {!personalVideoUri ? (
                      <View style={styles.uploadButtonsContainer}>
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
                            <Upload size={32} color="#FFFFFF" />
                            <Text style={styles.uploadButtonText}>Select from Gallery</Text>
                      </LinearGradient>
                    </Pressable>
                        
                      <Pressable
                          style={styles.uploadButton}
                          onPress={openCamera}
                      >
                        <LinearGradient
                            colors={['rgba(255,59,48,0.1)', 'rgba(255,59,48,0.2)']}
                            style={styles.uploadGradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        >
                            <Camera size={32} color="#FF3B30" />
                            <Text style={[styles.uploadButtonText, { color: '#FF3B30' }]}>Record Video</Text>
                        </LinearGradient>
                      </Pressable>
                    </View>
                    ) : (
                      <View style={styles.videoPreviewCard}>
                        <View style={[
                          styles.videoPreviewContainer,
                          videoOrientation === 'horizontal' ? styles.horizontalVideo : styles.verticalVideo
                        ]}>
                          <Animated.View style={[
                            styles.animatedBorder,
                            {
                              transform: [{
                                rotate: borderAnimation.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: ['0deg', '360deg']
                                })
                              }]
                            }
                          ]}>
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
              
                      <View style={styles.videoInfoBadge}>
                        <Text style={styles.videoInfoText}>
                          {videoOrientation === 'horizontal' ? 'Landscape' : 'Portrait'} 
                          {detectedAspectRatio && ` (${detectedAspectRatio.toFixed(2)}:1)`}
                        </Text>
              </View>
                    </View>
                  )}
                </View>
          )}

              {/* Video link UI */}
          {contentType === 'ad' && (
                <View style={styles.linkInputContainer}>
                  <View style={styles.linkFieldContainer}>
                      {!videoLink && (
                      <Animated.View style={[
                            styles.linkAnimationBorder,
                            {
                              transform: [{
                                translateX: linkFieldAnimation.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [-SCREEN_WIDTH, SCREEN_WIDTH]
                                })
                              }]
                            }
                      ]}>
                          <LinearGradient
                            colors={['transparent', '#0070F3', '#00DFD8', 'transparent']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.linkGradient}
                          />
                        </Animated.View>
                      )}
                    
                    <View style={styles.linkInputWrapper}>
                        <LinkIcon size={24} color="#0070F3" style={styles.linkIcon} />
                        <TextInput
                        style={styles.linkInput}
                          value={videoLink}
                          onChangeText={handleVideoLink}
                        placeholder="Paste video link here (YouTube, Vimeo, MP4)"
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
                    style={styles.sampleLinkButton}
                      onPress={handleSampleLinkClick}
                    >
                    <Text style={styles.sampleLinkText}>Try with sample video</Text>
                    </Pressable>

                  {videoLink && (
                    <View style={styles.linkPreviewContainer}>
                      <Video
                        source={{ uri: videoLink }}
                        style={styles.linkVideoPreview}
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
                    </View>
                  )}

              <View style={styles.stepInfoBox}>
                <Info size={20} color="#1877F2" />
                <Text style={styles.stepInfoText}>
                  {contentType === 'personal' 
                    ? 'Your video will be processed and optimized automatically. No editing required.'
                    : 'Make sure your link is from a supported platform like YouTube or Vimeo.'}
                </Text>
              </View>
            </View>
          )}
          
          {/* Step 3: Add Details */}
          {currentStep === 'ADD_DETAILS' && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>Add video details</Text>
              <Text style={styles.stepDescription}>
                Help others discover your video with a great title and description.
              </Text>
              
              <View style={styles.detailsContainer}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    <Type size={16} color="#1877F2" style={styles.inputIcon} />
                    Video Title
                  </Text>
                    <TextInput
                    style={styles.textInput}
                    placeholder="Enter a title for your video"
                      placeholderTextColor="#666"
                    value={videoTitle}
                    onChangeText={setVideoTitle}
                    maxLength={100}
                  />
                  <Text style={styles.charCounter}>{videoTitle.length}/100</Text>
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    <FileText size={16} color="#1877F2" style={styles.inputIcon} />
                    Description
                  </Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    placeholder="Write a description for your video"
                    placeholderTextColor="#666"
                    value={contentType === 'personal' ? personalDescription : adDescription}
                    onChangeText={contentType === 'personal' ? setPersonalDescription : setAdDescription}
                      multiline
                      numberOfLines={6}
                    textAlignVertical="top"
                    />
                  <Text style={styles.charCounter}>
                    {(contentType === 'personal' ? personalDescription : adDescription).length}/500
                  </Text>
                  </View>
                </View>
              
              <View style={styles.stepInfoBox}>
                <Info size={20} color="#1877F2" />
                <Text style={styles.stepInfoText}>
                  A compelling title and description help your video get discovered and shared.
                </Text>
              </View>
            </View>
          )}

          {/* Step 4: Add Thumbnail */}
          {currentStep === 'ADD_THUMBNAIL' && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>Add a thumbnail</Text>
              <Text style={styles.stepDescription}>
                Choose a thumbnail that represents your video. This is optional.
              </Text>
              
              <View style={styles.thumbnailContainer}>
                <View style={[styles.thumbnailPreviewArea, { aspectRatio: videoOrientation === 'horizontal' ? 16/9 : 9/16 }]}>
                  {!thumbnailUri ? (
          <Pressable
                      style={styles.thumbnailUploadButton}
                      onPress={() => {
                        // Direct call to pickThumbnailImage instead of captureThumbnail
                        if (contentType === 'personal' && !personalVideoUri) {
                          Alert.alert('Error', 'Please upload a video first');
                          return;
                        }
                        if (contentType === 'ad' && !videoLink) {
                          Alert.alert('Error', 'Please provide a video link first');
                          return;
                        }
                        
                        // Show options dialog
                        Alert.alert(
                          "Thumbnail Options",
                          "How would you like to create your thumbnail?",
                          [
                            {
                              text: "Upload from Gallery",
                              onPress: pickThumbnailImage
                            },
                            {
                              text: "Generate Automatically",
                              onPress: generateThumbnailFromFrame
                            }
                          ]
                        );
                      }}
                    >
                      <View style={styles.thumbnailUploadContent}>
                        <ImageIcon size={32} color="#1877F2" />
                        <Text style={styles.thumbnailUploadText}>
                          Add Thumbnail
                </Text>
              </View>
                    </Pressable>
                  ) : (
                    <View style={styles.thumbnailPreviewContainer}>
                      <Animated.View style={[
                        styles.thumbnailAnimatedBorder,
                        {
                          transform: [{
                            rotate: borderAnimation.interpolate({
                              inputRange: [0, 1],
                              outputRange: ['0deg', '360deg']
                            })
                          }]
                        }
                      ]}>
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
                          style={styles.thumbnailImage}
                          resizeMode="cover"
                        />
                      </View>
                      
                      <Pressable 
                        style={styles.removeThumbnailButton}
                        onPress={() => setThumbnailUri(null)}
                      >
                        <View style={styles.removeThumbnailInner}>
                          <X size={16} color="white" />
                        </View>
                      </Pressable>
                    </View>
                  )}
                </View>
                
                <Text style={styles.thumbnailHelpText}>
                  The thumbnail will be displayed in feeds and video listings.
                  {!thumbnailUri && ' If you skip this step, a default thumbnail will be generated.'}
              </Text>
                
                {/* Add extra buttons for clarity */}
                {!thumbnailUri && (
                  <View style={styles.thumbnailOptionsContainer}>
                    <Pressable 
                      style={styles.thumbnailOptionButton}
                      onPress={pickThumbnailImage}
                    >
                      <ImageIcon size={20} color="#1877F2" />
                      <Text style={styles.thumbnailOptionText}>
                        Upload Image
                      </Text>
                    </Pressable>
                    
                    <Pressable 
                      style={styles.thumbnailOptionButton}
                      onPress={generateThumbnailFromFrame}
                    >
                      <Film size={20} color="#1877F2" />
                      <Text style={styles.thumbnailOptionText}>
                        Auto Generate
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
              
              <View style={styles.stepInfoBox}>
                <Info size={20} color="#1877F2" />
                <Text style={styles.stepInfoText}>
                  A great thumbnail can improve your video's click-through rate and visibility.
                </Text>
              </View>
            </View>
          )}
          
          {/* Step 5: Preview */}
          {currentStep === 'PREVIEW' && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>Preview your video</Text>
              <Text style={styles.stepDescription}>
                Review how your video will appear to others.
              </Text>
              
              <View style={styles.previewCard}>
                <View style={styles.previewHeader}>
                  <View style={styles.previewUserInfo}>
                    <View style={styles.previewUserAvatar}>
                      <UserCircle2 size={28} color="#1877F2" />
                    </View>
                    <View>
                      <Text style={styles.previewUserName}>
                        {user?.firstName && user?.lastName 
                          ? `${user.firstName} ${user.lastName}`
                          : user?.username || 'Your Account'}
                      </Text>
                      <Text style={styles.previewTimeago}>Just now</Text>
                    </View>
                  </View>
                </View>
                
                <View style={[
                  styles.previewVideoContainer,
                  videoOrientation === 'horizontal' 
                    ? styles.previewHorizontalVideo 
                    : styles.previewVerticalVideo
                ]}>
                  {contentType === 'personal' && personalVideoUri ? (
                    <Video
                      source={{ uri: personalVideoUri }}
                      style={styles.previewVideo}
                      resizeMode={videoOrientation === 'horizontal' ? ResizeMode.CONTAIN : ResizeMode.COVER}
                      useNativeControls
                      shouldPlay
                      isLooping
                    />
                  ) : videoLink ? (
                    <Video
                      source={{ uri: videoLink }}
                      style={styles.previewVideo}
                      resizeMode={ResizeMode.CONTAIN}
                      useNativeControls
                      shouldPlay
                      isLooping
                    />
                  ) : (
                    <View style={styles.previewPlaceholder}>
                      <Film size={48} color="#333" />
                      <Text style={styles.previewPlaceholderText}>No video selected</Text>
                    </View>
                  )}
                  
                  {thumbnailUri && (
                    <View style={styles.thumbnailOverlay}>
                      <Text style={styles.thumbnailOverlayText}>Custom Thumbnail Set</Text>
                    </View>
                  )}
                </View>
                
                <View style={styles.previewContent}>
                  <Text style={styles.previewTitle}>{videoTitle || 'Video Title'}</Text>
                  <Text style={styles.previewDescription} numberOfLines={3}>
                    {contentType === 'personal' 
                      ? personalDescription || 'No description added'
                      : adDescription || 'No description added'}
                  </Text>
                </View>
                
                <View style={styles.previewMetrics}>
                  <View style={styles.previewMetricItem}>
                    <Heart size={18} color="#888" />
                    <Text style={styles.previewMetricText}>0</Text>
                  </View>
                  <View style={styles.previewMetricItem}>
                    <MessageCircle size={18} color="#888" />
                    <Text style={styles.previewMetricText}>0</Text>
                  </View>
                  <View style={styles.previewMetricItem}>
                    <Eye size={18} color="#888" />
                    <Text style={styles.previewMetricText}>0</Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.stepInfoBox}>
                <Info size={20} color="#1877F2" />
                <Text style={styles.stepInfoText}>
                  This is how your video will appear in feeds. If everything looks good, click 'Upload' to publish.
                </Text>
              </View>
            </View>
          )}
          
          {/* Final Step: Uploading */}
          {currentStep === 'UPLOADING' && (
            <View style={styles.uploadingContainer}>
              <View style={styles.uploadingAnimation}>
                <ActivityIndicator size="large" color="#1877F2" />
              </View>
              
              <Text style={styles.uploadingTitle}>
                Uploading your video...
              </Text>
              
              <View style={styles.uploadProgressContainer}>
                <View style={styles.uploadProgressBar}>
                  <View 
                    style={[
                      styles.uploadProgressFill,
                      { width: `${uploadProgress}%` }
                    ]} 
                  />
                </View>
                <Text style={styles.uploadProgressText}>{uploadProgress}%</Text>
              </View>
              
              <Text style={styles.uploadingDescription}>
                Your video is being processed and uploaded. This may take a few moments depending on the size.
              </Text>
            </View>
          )}
        </ScrollView>
        
        {/* Bottom navigation buttons */}
        {currentStep !== 'UPLOADING' && (
          <View style={styles.bottomBar}>
            {currentStep !== 'SELECT_TYPE' && (
              <Pressable
                style={styles.backButtonBottom}
                onPress={goToPreviousStep}
              >
                <Text style={styles.backButtonText}>Back</Text>
              </Pressable>
            )}
            
            <Pressable
              style={[
                styles.continueButton,
                !canProceedToNextStep() && styles.continueButtonDisabled,
                currentStep === 'SELECT_TYPE' && styles.continueButtonFull
              ]}
              onPress={goToNextStep}
              disabled={!canProceedToNextStep()}
            >
              <Text style={styles.continueButtonText}>
                {currentStep === 'PREVIEW' ? 'Upload' : 'Continue'}
              </Text>
              {currentStep !== 'PREVIEW' && (
                <ChevronRight size={20} color="#fff" />
            )}
          </Pressable>
        </View>
        )}
        
        {/* Full-view modal */}
        {renderFullViewModal()}
        {/* Info modal */}
        {renderInfoModal()}
        {/* Preview modal */}
        {renderPreviewModal()}
        
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0000',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 20,
    width: '100%',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    width: '100%',
    paddingHorizontal: 16,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
  },
  headerSubtitle: {
    color: '#AAA',
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    marginTop: 4,
  },
  helpButton: {
    padding: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 10,
    width: '100%',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTextContainer: {
    flex: 1,
  },
  progressHeaderTitle: {
    color: '#FFF',
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
  },
  stepIndicator: {
    color: '#AAA',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginTop: 4,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 16,
    borderRadius: 2,
    overflow: 'hidden',
    width: '90%',
    alignSelf: 'center',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#1877F2',
    borderRadius: 2,
  },
  contentScrollView: {
    flex: 1,
    width: '100%',
    paddingHorizontal: 0,
  },
  contentContainer: {
    paddingHorizontal: 0,
    paddingBottom: 100, // Extra space for bottom buttons
    width: '100%',
  },
  stepContainer: {
    marginVertical: 16,
    width: '100%',
    paddingHorizontal: 16, // Move padding to the step container level for proper alignment
  },
  stepTitle: {
    color: '#FFF',
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    marginBottom: 8,
  },
  stepDescription: {
    color: '#AAA',
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    marginBottom: 24,
  },
  stepInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(24, 119, 242, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    width: '100%',
  },
  stepInfoText: {
    color: '#AAA',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    flex: 1,
    marginLeft: 12,
  },
  
  // Type selection styles
  typeSelectionContainer: {
    marginVertical: 16,
    width: '100%',
    paddingHorizontal: 0,
  },
  typeCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    width: '100%',
    paddingHorizontal: 0,
  },
  typeCardGradient: {
    padding: 2,
    width: '100%',
  },
  typeCardInner: {
    backgroundColor: '#111',
    borderRadius: 14,
    padding: 20,
    position: 'relative',
    width: '100%',
  },
  typeIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(24, 119, 242, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  typeCardTitle: {
    color: '#FFF',
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 8,
  },
  typeCardDescription: {
    color: '#AAA',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  selectedTypeCard: {
    shadowColor: '#1877F2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  selectedTypeCardText: {
    color: '#FFF',
  },
  selectedCheckmark: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1877F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Video selection styles
  videoSelectContainer: {
    alignItems: 'center',
    width: '100%',
  },
  uploadGradient: {
    padding: 20,
    alignItems: 'center',
    borderRadius: 12,
    width: '100%',
    gap: 8,
  },
  uploadButtonsContainer: {
    width: '100%',
    flexDirection: 'column',
    gap: 16,
  },
  uploadButton: {
    borderRadius: 12,
    overflow: 'hidden',
    width: '100%',
  },
  uploadButtonText: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
  },
  videoPreviewCard: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#111',
    marginVertical: 8,
  },
  videoPreviewContainer: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
    alignSelf: 'center',
  },
  horizontalVideo: {
    width: '100%',
    aspectRatio: 16/9,
  },
  verticalVideo: {
    width: '80%',
    aspectRatio: 9/16,
    maxHeight: SCREEN_WIDTH,
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
  videoPreview: {
    width: '100%',
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
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
  videoInfoBadge: {
    alignSelf: 'center',
    backgroundColor: 'rgba(24, 119, 242, 0.2)',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginVertical: 12,
  },
  videoInfoText: {
    color: '#1877F2',
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  
  // Link input styles
  linkInputContainer: {
    marginVertical: 16,
  },
  linkFieldContainer: {
    position: 'relative',
    marginBottom: 12,
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
  linkInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,112,243,0.3)',
    paddingHorizontal: 16,
    height: 60,
  },
  linkIcon: {
    marginRight: 12,
  },
  linkInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    paddingVertical: 12,
    paddingRight: 40,
  },
  clearButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sampleLinkButton: {
    alignSelf: 'flex-start',
    padding: 8,
    marginBottom: 16,
  },
  sampleLinkText: {
    color: '#1877F2',
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    textDecorationLine: 'underline',
  },
  linkPreviewContainer: {
    width: '100%',
    aspectRatio: 16/9,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
    position: 'relative',
  },
  linkVideoPreview: {
    width: '100%',
    height: '100%',
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
  
  // Details input styles
  detailsContainer: {
    marginVertical: 8,
  },
  inputGroup: {
    marginBottom: 24,
    position: 'relative',
  },
  inputLabel: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputIcon: {
    marginRight: 8,
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
  textArea: {
    height: 150,
    textAlignVertical: 'top',
  },
  charCounter: {
    position: 'absolute',
    bottom: 8,
    right: 12,
    color: '#666',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  
  // Thumbnail styles
  thumbnailContainer: {
    marginVertical: 16,
    alignItems: 'center',
  },
  thumbnailPreviewArea: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  thumbnailUploadButton: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderStyle: 'dashed',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailUploadContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailUploadText: {
    color: '#1877F2',
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    marginTop: 8,
  },
  thumbnailHelpText: {
    color: '#AAA',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    maxWidth: '80%',
  },
  thumbnailPreviewContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: '#000',
  },
  thumbnailAnimatedBorder: {
    position: 'absolute',
    top: -50,
    left: -50,
    right: -50,
    bottom: -50,
    borderRadius: 16,
    overflow: 'hidden',
    zIndex: 1,
  },
  thumbnailInnerContainer: {
    margin: 5,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
    width: '100%',
    height: '100%',
    zIndex: 2,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  removeThumbnailButton: {
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
  removeThumbnailInner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Preview styles
  previewCard: {
    backgroundColor: '#111',
    borderRadius: 16,
    overflow: 'hidden',
    marginVertical: 16,
  },
  previewHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  previewUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewUserAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  previewUserName: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  previewTimeago: {
    color: '#AAA',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 4,
  },
  previewVideoContainer: {
    backgroundColor: '#000',
    position: 'relative',
  },
  previewHorizontalVideo: {
    width: '100%',
    aspectRatio: 16/9,
  },
  previewVerticalVideo: {
    width: '80%',
    aspectRatio: 9/16,
    alignSelf: 'center',
  },
  previewVideo: {
    width: '100%',
    height: '100%',
  },
  previewPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A0A0A',
  },
  previewPlaceholderText: {
    color: '#666',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginTop: 8,
  },
  thumbnailOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  thumbnailOverlayText: {
    color: '#FFF',
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  previewContent: {
    padding: 16,
  },
  previewTitle: {
    color: '#FFF',
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 8,
  },
  previewDescription: {
    color: '#AAA',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  previewMetrics: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  previewMetricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  previewMetricText: {
    color: '#AAA',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginLeft: 6,
  },
  
  // Uploading styles
  uploadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginVertical: 40,
  },
  uploadingAnimation: {
    marginBottom: 24,
  },
  uploadingTitle: {
    color: '#FFF',
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  uploadProgressContainer: {
    width: '100%',
    marginBottom: 24,
  },
  uploadProgressBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  uploadProgressFill: {
    height: '100%',
    backgroundColor: '#1877F2',
  },
  uploadProgressText: {
    color: '#AAA',
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    textAlign: 'right',
  },
  uploadingDescription: {
    color: '#AAA',
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  
  // Bottom navigation
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.9)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 36 : 16,
  },
  backButtonBottom: {
    height: 56,
    paddingHorizontal: 20,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  backButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
  },
  continueButton: {
    flex: 1,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1877F2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  continueButtonFull: {
    width: '100%',
  },
  continueButtonDisabled: {
    backgroundColor: 'rgba(24, 119, 242, 0.5)',
  },
  continueButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginRight: 8,
  },
  
  // Keep existing styles for modals etc.
  modalFullView: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
    maxWidth: SCREEN_WIDTH - 40,
    maxHeight: '80%',
    backgroundColor: '#121212',
    borderRadius: 16,
    overflow: 'hidden',
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
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
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
  videoControlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
  },
  videoControlButton: {
    padding: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  videoControlText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  orientationOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    alignItems: 'center',
    zIndex: 4,
  },
  orientationLabelText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  inputSection: {
    marginBottom: 24,
  },
  videoOuterContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 0,
  },
  videoGradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    zIndex: 3,
  },
  // Additional thumbnail styles
  thumbnailOptionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  thumbnailOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(24, 119, 242, 0.1)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 8,
  },
  thumbnailOptionText: {
    color: '#1877F2',
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    marginLeft: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 16,
  },
  instructionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionText: {
    flex: 1,
  },
  instructionTitle: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 4,
  },
  instructionDescription: {
    color: '#666',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
  },
  startEarningButton: {
    margin: 20,
    borderRadius: 16,
    overflow: 'hidden',
    width: '90%',
    alignSelf: 'center',
  },
  startEarningGradient: {
    padding: 16,
    alignItems: 'center',
  },
  startEarningText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  modalBody: {
    padding: 20,
    maxHeight: '70%',
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 20,
  },
  cameraTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Platform.OS === 'ios' ? 40 : 20,
  },
  cameraButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingIndicator: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,0,0,0.7)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 15,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'white',
    marginRight: 8,
  },
  recordingDurationText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  cameraBottomBar: {
    alignItems: 'center',
    marginBottom: 40,
  },
  recordButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.3)',
    padding: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF3B30',
  },
  stopButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.3)',
    padding: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopButtonInner: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#FF3B30',
  },
}); 