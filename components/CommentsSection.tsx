import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Animated,
  Image,
  StyleSheet,
  Dimensions,
  Platform,
  Keyboard,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ActivityIndicator,
  Alert,
  Easing
} from 'react-native';
import { useComments, Comment } from '../app/hooks/useComments';
import { useSanityAuth } from '../app/hooks/useSanityAuth';
import { TunnelVerifiedMark } from './shared/TunnelVerifiedMark'; 
import { X, Heart, MessageCircle, Smile, Send } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Helper function to format time ago for comments
export const formatTimeAgo = (dateString: string) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (seconds < 60) {
    return seconds === 1 ? '1 second ago' : `${seconds} seconds ago`;
  }
  
  if (minutes < 60) {
    return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
  }
  
  if (hours < 24) {
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  }
  
  if (days < 7) {
    return days === 1 ? '1 day ago' : `${days} days ago`;
  }
  
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  }
  
  const months = Math.floor(days / 30);
  if (months < 12) {
    return months === 1 ? '1 month ago' : `${months} months ago`;
  }
  
  const years = Math.floor(days / 365);
  return `${years}y ago`;
};

// Component for rendering a single comment
interface CommentItemProps {
  comment: Comment; 
  onLike: (id: string) => void;
}

const CommentItem = ({ comment, onLike }: CommentItemProps) => {
  const [showReplies, setShowReplies] = useState(false);
  
  return (
    <View style={styles.commentItem}>
      <Image 
        source={{ uri: comment.user.avatar || 'https://via.placeholder.com/40' }} 
        style={styles.avatar} 
      />
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <Text style={styles.username}>{comment.user.username}</Text>
          {comment.user.isVerified && (
            <View style={{ marginLeft: 4 }}>
              <TunnelVerifiedMark size={12} />
            </View>
          )}
        </View>
        <Text style={styles.commentText}>{comment.text}</Text>
        <View style={styles.commentActions}>
          <Text style={styles.timeAgo}>{formatTimeAgo(comment.createdAt)}</Text>
          <Pressable style={styles.replyButton}>
            <Text style={styles.replyText}>Reply</Text>
          </Pressable>
        </View>
        
        <View style={styles.likesContainer}>
          <Pressable 
            style={styles.likeButton} 
            onPress={() => onLike(comment.id)}
          >
            <Heart 
              size={20} 
              color={comment.hasLiked ? '#FF4D67' : 'rgba(255, 255, 255, 0.6)'} 
              fill={comment.hasLiked ? '#FF4D67' : 'transparent'} 
            />
          </Pressable>
          <Text style={[
            styles.likeCount,
            comment.hasLiked && styles.likedCount
          ]}>
            {comment.likes}
          </Text>
        </View>
        
        {comment.replies && comment.replies.length > 0 && (
          <>
            <Pressable 
              onPress={() => setShowReplies(!showReplies)}
              style={{ marginTop: 8, marginLeft: 8 }}
            >
              <Text style={{ color: '#1877F2', fontSize: 13 }}>
                {showReplies ? 'Hide replies' : `View ${comment.replies.length} ${comment.replies.length === 1 ? 'reply' : 'replies'}`}
              </Text>
            </Pressable>
            
            {showReplies && (
              <View style={styles.repliesContainer}>
                {comment.replies.map(reply => (
                  <CommentItem 
                    key={reply.id} 
                    comment={reply} 
                    onLike={onLike} 
                  />
                ))}
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
};

// Comments panel component
interface CommentsSectionProps {
  videoId: string;
  visible: boolean;
  onClose: () => void;
  isFullScreen?: boolean;
}

const CommentsSection: React.FC<CommentsSectionProps> = ({
  videoId,
  visible,
  onClose,
  isFullScreen = false
}) => {
  const { 
    comments, 
    commentCount, 
    isLoading, 
    loadComments, 
    submitComment, 
    likeComment 
  } = useComments(videoId);
  
  const [newComment, setNewComment] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  
  const { user } = useSanityAuth();
  
  const panelAnimation = useRef(new Animated.Value(visible ? 0 : SCREEN_HEIGHT)).current;
  const backdropAnimation = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollPositionRef = useRef(0);
  const hasUserScrolled = useRef(false);
  const inputRef = useRef<TextInput>(null);
  
  // Track completion to prevent reopening
  const isFirstRender = useRef(true);
  const isAnimatingRef = useRef(false);
  
  // Load comments when the panel becomes visible
  useEffect(() => {
    if (visible && videoId) {
      loadComments();
    }
  }, [visible, videoId, loadComments]);
  
  // Add keyboard event listeners with improved scroll behavior
  useEffect(() => {
    function onKeyboardShow(e: any) {
      const keyboardHeight = e.endCoordinates.height;
      setKeyboardHeight(keyboardHeight);
      setIsKeyboardVisible(true);
      
      // Only auto-scroll if input is focused and user hasn't manually scrolled
      if (isInputFocused && !hasUserScrolled.current) {
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    }
    
    function onKeyboardHide() {
      setIsKeyboardVisible(false);
      setKeyboardHeight(0);
    }
    
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      onKeyboardShow
    );
    
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      onKeyboardHide
    );
    
    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, [isInputFocused]);
  
  // Save current scroll position when user scrolls with proper type
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentScrollPosition = event.nativeEvent.contentOffset.y;
    scrollPositionRef.current = currentScrollPosition;
    
    // Check if user has scrolled up from bottom
    const layoutHeight = event.nativeEvent.layoutMeasurement.height;
    const contentHeight = event.nativeEvent.contentSize.height;
    const isScrolledToBottom = contentHeight - currentScrollPosition - layoutHeight < 20;
    
    hasUserScrolled.current = !isScrolledToBottom;
  };
  
  // Handle input focus/blur
  const handleInputFocus = () => {
    setIsInputFocused(true);
  };
  
  const handleInputBlur = () => {
    setIsInputFocused(false);
  };
  
  // Reset closing state when visibility changes
  useEffect(() => {
    if (visible) {
      setIsClosing(false); // Reset closing state when panel becomes visible
    }
  }, [visible]);
  
  // Separate animation configuration for opening and closing
  const openConfig = {
    friction: 22,     // Less friction for smoother opening
    tension: 70,      // Higher tension for more springiness
    velocity: 8       // Initial velocity
  };

  const closeConfig = {
    friction: 25,     // More friction for less bouncing when closing
    tension: 90,      // Higher tension for faster initial movement
    velocity: 10      // Higher initial velocity for quicker response
  };
  
  // Update animations when visibility changes
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    
    if (visible) {
      isAnimatingRef.current = true;
      
      Animated.spring(panelAnimation, {
        toValue: 0,
        useNativeDriver: true,
        ...openConfig
      }).start(() => {
        isAnimatingRef.current = false;
      });
      
      Animated.timing(backdropAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic)
      }).start();
    }
  }, [visible, panelAnimation, backdropAnimation, openConfig]);
  
  // Function to properly handle closing
  const handleClose = () => {
    // Don't close if already closing or in progress
    if (isClosing || isAnimatingRef.current) return;
    
    setIsClosing(true);
    Keyboard.dismiss();
    
    // Use faster timing animation for closing
    isAnimatingRef.current = true;
    
    // Run both animations together
    Animated.timing(panelAnimation, {
      toValue: SCREEN_HEIGHT,
      duration: 200,
      useNativeDriver: true,
      easing: Easing.cubic
    }).start(() => {
      isAnimatingRef.current = false;
      onClose();
    });
    
    Animated.timing(backdropAnimation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
      easing: Easing.cubic
    }).start();
  };
  
  // Handle visibility changes to trigger closing animation
  useEffect(() => {
    if (!visible && !isClosing && !isFirstRender.current) {
      handleClose();
    }
  }, [visible]);
  
  const handleSubmitComment = async () => {
    if (!newComment.trim() || !user) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      await submitComment(newComment);
      setNewComment('');
      
      // Scroll to the top since newest comments appear at the top
      setTimeout(() => {
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollTo({ y: 0, animated: true });
        }
      }, 100);
    } catch (error) {
      console.error('Error submitting comment:', error);
      Alert.alert('Error', 'Failed to post your comment. Please try again.');
    }
  };
  
  const focusInput = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };
  
  return (
    <>
      {/* Always render backdrop when visible or closing, with animated opacity */}
      {(visible || isClosing) && (
        <Animated.View 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 999,
            opacity: backdropAnimation,
          }}
        >
          <Pressable 
            style={{ width: '100%', height: '100%' }}
            onPress={handleClose}
          />
        </Animated.View>
      )}
      <Animated.View 
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: SCREEN_HEIGHT * 0.7,
          backgroundColor: '#121212',
          zIndex: 1050,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          elevation: 25,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.3,
          shadowRadius: 10,
          transform: [{ translateY: panelAnimation }]
        }}
      >
        <View style={{ flex: 1 }}>
          {/* Header */}
          <View style={{
            alignItems: 'center',
            paddingTop: 12,
            paddingBottom: 16,
            borderBottomWidth: 1,
            borderBottomColor: 'rgba(255, 255, 255, 0.08)',
            position: 'relative',
          }}>
            <View style={{
              width: 36,
              height: 5,
              backgroundColor: 'rgba(255, 255, 255, 0.3)',
              borderRadius: 3,
              marginBottom: 10,
              alignSelf: 'center',
            }} />
            <Text style={{
              fontSize: 16,
              fontWeight: 'bold',
              color: 'white',
              textAlign: 'center',
            }}>
              {commentCount || '0'} comments
            </Text>
            <Pressable onPress={handleClose} style={{
              padding: 8,
              position: 'absolute',
              right: 8,
              zIndex: 1,
            }}>
              <X color="white" size={22} />
            </Pressable>
          </View>
          
          {/* Comments list - adjusts size based on keyboard visibility */}
          <View style={{ 
            flex: 1, 
            marginBottom: isKeyboardVisible ? keyboardHeight - (Platform.OS === 'ios' ? 30 : 60) : 0 
          }}>
            {isLoading ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#1877F2" />
                <Text style={{ color: '#888', marginTop: 16 }}>Loading comments...</Text>
              </View>
            ) : (
              <ScrollView
                ref={scrollViewRef}
                showsVerticalScrollIndicator={true}
                bounces={true}
                contentContainerStyle={{
                  padding: 16,
                  paddingBottom: 150,
                  flexGrow: 1,
                }}
                persistentScrollbar={true}
                keyboardShouldPersistTaps="handled"
                onScroll={handleScroll}
                scrollEventThrottle={16}
              >
                {comments.length > 0 ? (
                  comments.map(comment => (
                    <CommentItem 
                      key={comment.id} 
                      comment={comment} 
                      onLike={likeComment} 
                    />
                  ))
                ) : (
                  <View style={{
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingTop: 60,
                  }}>
                    <MessageCircle color="#888" size={40} />
                    <Text style={{
                      fontSize: 16,
                      fontWeight: 'bold',
                      color: '#888',
                      marginTop: 16,
                    }}>No comments yet</Text>
                    <Text style={{
                      fontSize: 14,
                      color: '#666',
                      marginTop: 8,
                    }}>Be the first to comment</Text>
                  </View>
                )}
              </ScrollView>
            )}
            
            {/* Add padding at the bottom to ensure space for the input */}
            <View style={{ height: 100 }} />
          </View>
          
          {/* Input bar - TikTok style keyboard tracking */}
          <View style={{
            position: 'absolute',
            bottom: isKeyboardVisible ? keyboardHeight : (isFullScreen ? 0 : 80),
            left: 0,
            right: 0,
            backgroundColor: '#1A1A1A',
            borderTopWidth: 1,
            borderTopColor: 'rgba(255, 255, 255, 0.08)',
            paddingVertical: 12,
            paddingHorizontal: 12,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.2,
            shadowRadius: 3,
            elevation: 10,
            flexDirection: 'row',
            alignItems: 'center',
          }}>
            <Pressable style={{ padding: 8 }} onPress={focusInput}>
              <Smile color="#888" size={24} />
            </Pressable>
            <TextInput
              ref={inputRef}
              style={{
                flex: 1,
                backgroundColor: '#2A2A2A',
                borderRadius: 24,
                paddingHorizontal: 16,
                paddingVertical: 10,
                color: 'white',
                fontSize: 14,
                maxHeight: 100,
                marginHorizontal: 8,
              }}
              placeholder="Add a comment..."
              placeholderTextColor="#777"
              value={newComment}
              onChangeText={setNewComment}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              multiline
              maxLength={500}
              returnKeyType="default"
            />
            <Pressable 
              onPress={handleSubmitComment}
              disabled={!newComment.trim()} 
              style={{ 
                padding: 8,
                opacity: newComment.trim() ? 1 : 0.5
              }}
            >
              <Send color={newComment.trim() ? "#1877F2" : "#555"} size={24} />
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  commentItem: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
    position: 'relative',
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  username: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
    marginRight: 4,
  },
  verifiedBadge: {
    marginLeft: 4,
  },
  commentText: {
    fontSize: 14,
    color: 'white',
    lineHeight: 20,
    marginBottom: 6,
    paddingRight: 40,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  timeAgo: {
    fontSize: 12,
    color: '#888',
    marginRight: 16,
  },
  replyButton: {
    padding: 2,
  },
  replyText: {
    fontSize: 12,
    color: '#888',
  },
  likesContainer: {
    position: 'absolute',
    right: 0,
    top: 8,
    alignItems: 'center',
  },
  likeButton: {
    padding: 4,
  },
  likeCount: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  likedCount: {
    color: '#FF4D67',
  },
  repliesContainer: {
    marginTop: 8,
    marginLeft: 20,
    paddingLeft: 16,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.1)',
  },
});

export default CommentsSection; 