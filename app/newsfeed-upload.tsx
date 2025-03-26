import React, { useState } from 'react';
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
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
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
  Plus
} from 'lucide-react-native';
import { usePostFeed } from '@/app/hooks/usePostFeed';
import { useSanityAuth } from '@/app/hooks/useSanityAuth';

export default function NewsfeedUpload() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [postText, setPostText] = useState('');
  const [loading, setLoading] = useState(false);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [location, setLocation] = useState('');
  
  // Get Sanity hooks
  const { createPost } = usePostFeed();
  const { user } = useSanityAuth();

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
        allowsMultipleSelection: true,
        selectionLimit: 4
      });

      if (!result.canceled && result.assets.length > 0) {
        setAttachments([...attachments, ...result.assets.map(asset => asset.uri)]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      
      if (cameraPermission.status !== 'granted') {
        alert('Sorry, we need camera permissions to take a photo!');
        return;
      }
      
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
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

  const handleSubmit = async () => {
    if (!postText.trim() && attachments.length === 0) {
      Alert.alert('Error', 'Please add some text or attach media to your post.');
      return;
    }

    setLoading(true);
    
    try {
      // If we have createPost from our hook and user is logged in
      if (createPost && user) {
        console.log(`Submitting post with ${attachments.length} images and location: ${location || 'none'}`);
        
        // Show upload progress for longer uploads with images
        let progressMessage = 'Uploading...';
        if (attachments.length > 0) {
          progressMessage = 'Uploading media (this may take a moment)...';
          // Show a toast or some UI indication here
        }
        
        // Create the post with location data
        await createPost(postText, location, attachments);
        
        Alert.alert('Success', 'Your post has been shared!', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        // Fallback to mock upload for demo
        setTimeout(() => {
          setLoading(false);
          Alert.alert('Success', 'Your post has been shared (demo mode)!', [
            { text: 'OK', onPress: () => router.back() }
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Create Post</Text>
        <Pressable 
          style={[
            styles.submitButton, 
            (!postText.trim() && attachments.length === 0) && styles.submitButtonDisabled
          ]} 
          onPress={handleSubmit}
          disabled={loading || (!postText.trim() && attachments.length === 0)}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Send size={20} color="#fff" />
          )}
        </Pressable>
      </View>
      
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
            {user?.profile?.avatar ? (
              <Image 
                source={{ uri: user.profile.avatar }} 
                style={styles.userAvatar} 
              />
            ) : (
              <UserCircle size={40} color="#888" />
            )}
            <View style={styles.userTextContainer}>
              <Text style={styles.userName}>{user ? user.username : 'You'}</Text>
              <View style={styles.privacySelector}>
                <Text style={styles.privacyText}>Public</Text>
              </View>
            </View>
          </View>
          
          {/* Post text input */}
          <TextInput
            style={styles.postInput}
            placeholder="What's on your mind?"
            placeholderTextColor="#888"
            multiline
            value={postText}
            onChangeText={setPostText}
            autoFocus
          />
          
          {/* Attachments preview */}
          {attachments.length > 0 && (
            <View style={styles.attachmentsContainer}>
              {attachments.map((uri, index) => (
                <View key={index} style={styles.attachmentWrapper}>
                  <Image source={{ uri }} style={styles.attachmentImage} />
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
            <Text style={styles.actionSectionTitle}>Add to your post</Text>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Pressable 
                style={styles.actionButton}
                onPress={handlePickImage}
              >
                <LinearGradient
                  colors={['rgba(0,112,243,0.1)', 'rgba(0,112,243,0.2)']}
                  style={styles.actionButtonGradient}
                >
                  <ImageIcon size={24} color="#0070F3" />
                  <Text style={styles.actionButtonText}>Photo</Text>
                </LinearGradient>
              </Pressable>
              
              <Pressable 
                style={styles.actionButton}
                onPress={handleTakePhoto}
              >
                <LinearGradient
                  colors={['rgba(255,59,48,0.1)', 'rgba(255,59,48,0.2)']}
                  style={styles.actionButtonGradient}
                >
                  <Camera size={24} color="#FF3B30" />
                  <Text style={[styles.actionButtonText, { color: '#FF3B30' }]}>Camera</Text>
                </LinearGradient>
              </Pressable>
              
              <Pressable 
                style={styles.actionButton}
                onPress={() => setLocation('Current Location')}
              >
                <LinearGradient
                  colors={['rgba(0,223,216,0.1)', 'rgba(0,223,216,0.2)']}
                  style={styles.actionButtonGradient}
                >
                  <MapPin size={24} color="#00DFD8" />
                  <Text style={[styles.actionButtonText, { color: '#00DFD8' }]}>Location</Text>
                </LinearGradient>
              </Pressable>
            </ScrollView>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  userName: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
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
  attachmentImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
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
  actionSectionTitle: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 12,
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
    marginRight: 12,
  },
}); 