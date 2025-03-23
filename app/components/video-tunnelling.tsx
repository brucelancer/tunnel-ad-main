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
} from 'lucide-react-native';
import { Video, ResizeMode } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import ScreenContainer from './ScreenContainer';
import * as videoService from '../../tunnel-ad-main/services/videoService';
import { useSanityAuth } from '../hooks/useSanityAuth';

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
  
  const { user } = useSanityAuth();
  
  const borderAnimation = useRef(new Animated.Value(0)).current;
  const linkFieldAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateBorder = () => {
      Animated.sequence([
        Animated.timing(borderAnimation, {
          toValue: 1,
          duration: 5000,
          useNativeDriver: true,
        }),
        Animated.timing(borderAnimation, {
          toValue: 0,
          duration: 5000,
          useNativeDriver: true,
        })
      ]).start(() => animateBorder());
    };

    if (contentType === 'personal') {
      animateBorder();
    }

    return () => {
      borderAnimation.setValue(0);
    };
  }, [contentType]);

  useEffect(() => {
    // Running light animation for video link field
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

    // Only run animation if we're in ad mode AND there's no text in the input
    if (contentType === 'ad' && !videoLink) {
      animateLinkField();
    } else {
      // Stop animation if there's text
      linkFieldAnimation.setValue(0);
    }

    return () => {
      linkFieldAnimation.setValue(0);
    };
  }, [contentType, videoLink]);

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
      });

      if (!result.canceled && result.assets[0].uri) {
        setPersonalVideoUri(result.assets[0].uri);
        
        // Auto-detect orientation from video dimensions
        if (result.assets[0].width && result.assets[0].height) {
          const aspectRatio = result.assets[0].width / result.assets[0].height;
          setVideoOrientation(aspectRatio >= 1 ? 'horizontal' : 'vertical');
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
      // Prepare video data
      const videoData = {
        title,
        description,
        contentType,
        videoOrientation,
        videoUri: personalVideoUri,
        videoLink,
        aspectRatio: videoOrientation === 'horizontal' ? 16/9 : 9/16,
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
    const typeStyles = getContentTypeStyles(type, isActive);
    
    return (
      <Pressable
        style={[
          styles.contentTypeButton,
          typeStyles.container
        ]}
        onPress={() => setContentType(type)}
      >
        <View style={styles.contentTypeInner}>
          <View style={styles.contentTypeIconContainer}>
            {React.cloneElement(icon as React.ReactElement, {
              color: '#FFFFFF',
              size: 24,
              style: typeStyles.icon
            })}
          </View>
          <Text style={[
            styles.contentTypeText,
            isActive && styles.activeContentTypeText
          ]}>
            {label}
          </Text>
          {isActive && <View style={styles.activeIndicator} />}
        </View>
      </Pressable>
    );
  };

  const renderVideoOrientation = (orientation: VideoOrientation, icon: React.ReactNode, label: string) => (
    <Pressable
      style={styles.orientationButton}
      onPress={() => setVideoOrientation(orientation)}
    >
      <LinearGradient
        colors={videoOrientation === orientation ? ['#0070F3', '#00DFD8'] : ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
        style={[styles.orientationGradient, videoOrientation === orientation && styles.activeOrientationGradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {icon}
        <Text style={[styles.orientationText, videoOrientation === orientation && styles.activeOrientationText]}>
          {label}
        </Text>
      </LinearGradient>
    </Pressable>
  );

  const renderVideoUpload = () => {
    const rotate = borderAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg']
    });

    return (
      <View style={[styles.uploadContainer, { aspectRatio: videoOrientation === 'horizontal' ? 16/9 : 9/16 }]}>
        <Animated.View
          style={[
            styles.animatedBorder,
            {
              transform: [{ rotate }]
            }
          ]}
        >
          <LinearGradient
            colors={['#0070F3', '#00DFD8', '#0070F3']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <Pressable 
          style={styles.uploadZoneNew}
          onPress={handleVideoUpload}
        >
          <LinearGradient
            colors={['rgba(0,112,243,0.1)', 'rgba(0,223,216,0.1)']}
            style={styles.uploadGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.uploadContent}>
              <Upload size={32} color="#0070F3" />
              <Text style={[styles.uploadText, { color: '#0070F3' }]}>Upload Video</Text>
              <Text style={styles.uploadSubtext}>MP4, MOV up to 100MB</Text>
            </View>
          </LinearGradient>
        </Pressable>
      </View>
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

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <View style={styles.contentTypeContainer}>
          {renderContentType(
            'personal',
            <UserCircle2 size={24} color={contentType === 'personal' ? '#fff' : '#666'} />,
            'Personal'
          )}
          {renderContentType(
            'ad',
            <DollarSign size={24} color={contentType === 'ad' ? '#fff' : '#666'} />,
            'Advertisement'
          )}
        </View>

        <View style={styles.formContainer}>
          {renderTitleInput()}
          {contentType === 'personal' && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Video</Text>
                <View style={[styles.uploadContainer, { aspectRatio: videoOrientation === 'horizontal' ? 16/9 : 9/16 }]}>
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
                      colors={['#0070F3', '#00DFD8', '#0070F3']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                  </Animated.View>
                  {!personalVideoUri ? (
                    <Pressable 
                      style={styles.uploadZoneNew}
                      onPress={handleVideoUpload}
                    >
                      <LinearGradient
                        colors={['rgba(0,112,243,0.1)', 'rgba(0,223,216,0.1)']}
                        style={styles.uploadGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <View style={styles.uploadContent}>
                          <Upload size={32} color="#0070F3" />
                          <Text style={[styles.uploadText, { color: '#0070F3' }]}>Upload Video</Text>
                          <Text style={styles.uploadSubtext}>MP4, MOV up to 100MB</Text>
                        </View>
                      </LinearGradient>
                    </Pressable>
                  ) : (
                    <View style={styles.uploadZoneNew}>
                      <Video
                        source={{ uri: personalVideoUri }}
                        style={styles.videoPreview}
                        resizeMode={ResizeMode.COVER}
                      />
                      <Pressable
                        style={styles.removeButton}
                        onPress={() => setPersonalVideoUri(null)}
                      >
                        <LinearGradient
                          colors={['#0070F3', '#00DFD8']}
                          style={styles.removeGradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        >
                          <X size={20} color="white" />
                        </LinearGradient>
                      </Pressable>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Video Orientation</Text>
                <View style={styles.orientationContainer}>
                  {renderVideoOrientation(
                    'horizontal',
                    <Monitor size={20} color={videoOrientation === 'horizontal' ? '#fff' : '#666'} />,
                    'Horizontal'
                  )}
                  {renderVideoOrientation(
                    'vertical',
                    <Smartphone size={20} color={videoOrientation === 'vertical' ? '#fff' : '#666'} />,
                    'Vertical'
                  )}
                </View>
              </View>
              
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
            </>
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
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentTypeContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  contentTypeButton: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  contentTypeInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 10,
    backgroundColor: 'transparent',
    position: 'relative',
  },
  contentTypeIconContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentTypeText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    opacity: 0.5,
  },
  activeContentTypeText: {
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
    top: -50,
    left: -50,
    right: -50,
    bottom: -50,
    borderRadius: 20,
    overflow: 'hidden',
  },
  uploadZoneNew: {
    flex: 1,
    margin: 2,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  uploadGradient: {
    flex: 1,
    padding: 20,
  },
  uploadContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 16,
  },
  uploadText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    marginTop: 12,
  },
  uploadSubtext: {
    color: '#666',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginTop: 6,
  },
  previewContainer: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
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
  orientationContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  orientationButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    overflow: 'hidden',
  },
  orientationGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  activeOrientationGradient: {
    borderColor: '#0070F3',
  },
  orientationText: {
    color: '#666',
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  activeOrientationText: {
    color: '#fff',
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
    marginTop: 32,
    borderRadius: 24,
    overflow: 'hidden',
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
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
    textTransform: 'capitalize',
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
}); 