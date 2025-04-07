import React, { useState, useRef, useEffect, useCallback, useContext, MutableRefObject, memo, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  Pressable,
  Share,
  ViewToken,
  Animated,
  DeviceEventEmitter,
  AppState,
  AppStateStatus,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  StatusBar,
  SafeAreaView,
  Image,
  Vibration,
  TextInput,
  PanResponder,
  KeyboardAvoidingView,
  Keyboard,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Easing,
  Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Video, ResizeMode, Audio } from 'expo-av';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { 
  Play, 
  Share2, 
  CheckCircle, 
  ThumbsUp, 
  ThumbsDown, 
  Lock, 
  PlayCircle, 
  RefreshCw, 
  Crown, 
  Maximize, 
  Minimize,
  Search,
  Coins,
  MessageCircle,
  Send,
  Heart,
  ChevronLeft,
  Plus,
  Smile,
  Trash,
  X,
  ChevronUp,
  Trash2,
  Eye,
  ExternalLink,
} from 'lucide-react-native';
import { usePoints } from '../hooks/usePoints';
import { useReactions } from '../hooks/useReactions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as videoService from '../tunnel-ad-main/services/videoService';
import { useSanityAuth } from '../app/hooks/useSanityAuth';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { getSanityClient, urlFor } from '@/tunnel-ad-main/services/postService';
import { fetchComments, addComment, toggleLikeComment, getCommentCount, deleteComment } from '@/tunnel-ad-main/services/commentService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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

// Add a blue verified mark variant
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

// Use full screen height
const HEADER_HEIGHT = (isFullScreen: boolean): number => isFullScreen ? 0 : 50;
const BOTTOM_NAV_HEIGHT = 0;
const AVAILABLE_HEIGHT = SCREEN_HEIGHT;
// Get status bar height for proper safe area handling
const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0;

// Header tab options


type VideoType = 'vertical' | 'horizontal';

interface VideoItem {
  id: string;
  url: string;
  title: string;
  author: string;
  description: string;
  points: number;
  type: VideoType;
  aspectRatio?: number;
  thumbnail?: string;
  views?: number;
  likes?: number;
  dislikes?: number;
  comments?: number;
  authorId?: string;
  authorAvatar?: string;
  isVerified?: boolean;
  isBlueVerified?: boolean;
}

interface VideoItemProps {
  item: VideoItem;
  isCurrentVideo: boolean;
  onVideoRef: (id: string, ref: any) => void;
  isLocked?: boolean;
  autoScroll: boolean;
  toggleAutoScroll: () => void;
  autoScrollPulse: Animated.Value;
  showPremiumAd: boolean;
  isTabFocused: boolean;
  isFullScreen?: boolean;
  toggleFullScreen?: () => void;
  router: any;
  forceCloseComments?: boolean;
  onCommentsOpened?: () => void;
  onCommentsClosed?: () => void;
}

interface VideoRefs {
  [key: string]: {
    current: any;
    getLastPosition: () => number;
    resetPosition: () => void;
  };
}

interface ViewableItemsInfo {
  viewableItems: Array<ViewToken>;
  changed: Array<ViewToken>;
}

// Comment interface for the comments section
interface Comment {
  id: string;
  text: string;
  user: {
    id: string;
    username: string;
    avatar?: string | null;
    isVerified?: boolean;
  };
  createdAt: string;
  likes: number;
  hasLiked?: boolean;
  replies?: Comment[];
}

// Mock data for comments - in a real app this would come from an API
// const MOCK_COMMENTS: Comment[] = [
//   {
//     id: '1',
//     text: 'This video is amazing! The choreography is incredible 🔥',
//     user: {
//       id: 'user1',
//       username: 'dancefan2023',
//       avatar: 'https://randomuser.me/api/portraits/women/1.jpg',
//       isVerified: false,
//     },
//     createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
//     likes: 24,
//     hasLiked: false,
//   },
//   {
//     id: '2',
//     text: 'Love the music choice for this routine! Anyone know the song name?',
//     user: {
//       id: 'user2',
//       username: 'musiclover',
//       avatar: 'https://randomuser.me/api/portraits/men/2.jpg',
//       isVerified: true,
//     },
//     createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
//     likes: 56,
//     hasLiked: true,
//   },
//   {
//     id: '3',
//     text: 'I tried to learn this dance but it\'s so hard! Any tips?',
//     user: {
//       id: 'user3',
//       username: 'beginner_dancer',
//       avatar: 'https://randomuser.me/api/portraits/women/3.jpg',
//       isVerified: false,
//     },
//     createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
//     likes: 8,
//     hasLiked: false,
//   },
//   {
//     id: '4',
//     text: 'Just shared this with my dance group, we\'re definitely going to try this!',
//     user: {
//       id: 'user4',
//       username: 'dance_instructor',
//       avatar: 'https://randomuser.me/api/portraits/men/4.jpg',
//       isVerified: true,
//     },
//     createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45 minutes ago
//     likes: 32,
//     hasLiked: false,
//   },
//   {
//     id: '5',
//     text: 'Your dance style is so unique, I can always recognize your videos! Keep it up 👏',
//     user: {
//       id: 'user5',
//       username: 'dance_critic',
//       avatar: 'https://randomuser.me/api/portraits/women/5.jpg',
//       isVerified: false,
//     },
//     createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
//     likes: 41,
//     hasLiked: false,
//   },
//   {
//     id: '6',
//     text: 'The lighting in this video is perfect, what setup are you using?',
//     user: {
//       id: 'user6',
//       username: 'filmmaker',
//       avatar: 'https://randomuser.me/api/portraits/men/6.jpg',
//       isVerified: false,
//     },
//     createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
//     likes: 17,
//     hasLiked: true,
//   },
//   {
//     id: '7',
//     text: 'This just popped up in my feed and now I can\'t stop watching it on repeat!',
//     user: {
//       id: 'user7',
//       username: 'new_follower',
//       avatar: 'https://randomuser.me/api/portraits/women/7.jpg',
//       isVerified: false,
//     },
//     createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
//     likes: 9,
//     hasLiked: false,
//   },
//   {
//     id: '8',
//     text: 'Does anyone know where I can find more tutorials like this?',
//     user: {
//       id: 'user8',
//       username: 'learning_to_dance',
//       avatar: 'https://randomuser.me/api/portraits/men/8.jpg',
//       isVerified: false,
//     },
//     createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), // 8 hours ago
//     likes: 5,
//     hasLiked: false,
//   }
// ];

// Helper function to calculate time ago for comments
const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  
  const years = Math.floor(days / 365);
  return `${years}y ago`;
};

// Component for rendering a single comment
const CommentItem = ({ 
  comment, 
  onLike, 
  onDelete, 
  canDelete
}: { 
  comment: Comment, 
  onLike: (id: string) => void, 
  onDelete: (id: string) => void,
  canDelete: boolean
}) => {
  const [showReplies, setShowReplies] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  
  return (
    <View style={{
      flexDirection: 'row',
      marginBottom: 20,
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    }}>
      <Image 
        source={{ uri: comment.user.avatar || 'https://via.placeholder.com/40' }} 
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          marginRight: 12,
        }} 
      />
      <View style={{
        flex: 1,
      }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 4,
        }}>
          <Text style={{
            fontSize: 14,
            fontWeight: 'bold',
            color: 'white',
          }}>{comment.user.username}</Text>
          {comment.user.isVerified && (
            <View style={{
              marginLeft: 4,
            }}>
              <TunnelVerifiedMark size={12} />
            </View>
          )}
          
          {canDelete && (
            <Pressable 
              onPress={() => onDelete(comment.id)} 
              style={styles.deleteButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Trash2 size={16} color="#FF4D67" />
            </Pressable>
          )}
        </View>
        <Text style={{
          fontSize: 14,
          color: 'white',
          lineHeight: 20,
          marginBottom: 6,
        }}>{comment.text}</Text>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
        }}>
          <Text style={{
            fontSize: 12,
            color: '#888',
            marginRight: 16,
          }}>{formatTimeAgo(comment.createdAt)}</Text>
          
          <Pressable style={{
            padding: 4,
            marginRight: 16,
          }}>
            <Text style={{
              fontSize: 12,
              color: '#888',
            }}>Reply</Text>
          </Pressable>
          
          <Pressable 
            style={{
              padding: 4,
              flexDirection: 'row',
              alignItems: 'center',
            }} 
            onPress={() => onLike(comment.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Heart 
              size={16} 
              color={comment.hasLiked ? '#FF4D67' : 'rgba(255, 255, 255, 0.6)'} 
              fill={comment.hasLiked ? '#FF4D67' : 'transparent'} 
            />
            <Text style={{
              fontSize: 12,
              color: comment.hasLiked ? '#FF4D67' : 'rgba(255, 255, 255, 0.6)',
              marginLeft: 4,
            }}>
              {comment.likes}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

// Comments panel component
interface CommentsSectionProps {
  videoId: string;
  visible: boolean;
  onClose: () => void;
  commentCount: number;
  router: any;
  isFullScreen?: boolean;
  videoAuthorId?: string;
  onCommentCountChange?: (count: number) => void;
}

const CommentsSection: React.FC<CommentsSectionProps> = ({ 
  videoId, 
  visible, 
  onClose,
  commentCount: initialCommentCount,
  router,
  isFullScreen = false,
  videoAuthorId,
  onCommentCountChange
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [localCommentCount, setLocalCommentCount] = useState(initialCommentCount);
  const [newComment, setNewComment] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const { user } = useSanityAuth();
  
  // Update local count when prop changes
  useEffect(() => {
    setLocalCommentCount(initialCommentCount);
  }, [initialCommentCount]);
  
  // Add the deleteComment function
  const handleDeleteComment = async (commentId: string) => {
    if (!user || !user._id || !videoId) {
      console.warn('User not authenticated or video ID missing');
      return;
    }
    
    // Confirm deletion
    Alert.alert(
      "Delete Comment", 
      "Are you sure you want to delete this comment?", 
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setIsDeleting(true);
            try {
              // Optimistically update the UI
              setComments(prevComments => 
                prevComments.filter(comment => comment.id !== commentId)
              );
              
              // Update comment count immediately
              const newCount = Math.max(0, localCommentCount - 1);
              setLocalCommentCount(newCount);
              
              // Notify parent component of the updated count
              onCommentCountChange?.(newCount);
              
              // Call API to delete the comment
              await deleteComment(commentId, user._id, videoId);
              
              // Haptic feedback for successful deletion
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
              console.error('Error deleting comment:', error);
              // If there was an error, reload all comments
              loadComments();
              // Haptic feedback for error
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert('Error', 'Failed to delete the comment. Please try again.');
            } finally {
              setIsDeleting(false);
            }
          }
        }
      ]
    );
  };
  
  // Check if the current user can delete a specific comment
  const canDeleteComment = (commentAuthorId: string): boolean => {
    if (!user || !user._id) return false;
    
    // User can delete their own comments or comments on their videos
    return user._id === commentAuthorId || user._id === videoAuthorId;
  };
  
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
  }, [visible, videoId]);
  
  // Load comments from Sanity
  const loadComments = async () => {
    if (!videoId) return;
    
    setIsLoading(true);
    try {
      const fetchedComments = await fetchComments(videoId);
      setComments(fetchedComments);
      
      // Update the local comment count based on the number of fetched comments
      const newCount = fetchedComments.length;
      setLocalCommentCount(newCount);
      
      // Notify parent component of the updated count
      onCommentCountChange?.(newCount);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Update commentCount when comments change
  useEffect(() => {
    const updateCommentCount = async () => {
      if (videoId) {
        const count = await getCommentCount(videoId);
        // This would typically update the parent component, but for now
        // we'll just log it as we're using props for commentCount
        console.log('Updated comment count:', count);
      }
    };
    
    updateCommentCount();
  }, [comments.length, videoId]);
  
  // Add keyboard event listeners with improved scroll behavior
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setIsKeyboardVisible(true);
        setKeyboardHeight(e.endCoordinates.height);
        
        // Don't scroll to bottom if user has manually scrolled up
        if (isInputFocused && !hasUserScrolled.current) {
          // Delay slightly to ensure layout is complete
          setTimeout(() => {
            if (scrollViewRef.current) {
              // Scroll to last comment only if not scrolled up
              scrollViewRef.current.scrollToEnd({ animated: true });
            }
          }, 100);
        }
      }
    );
    
    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setIsKeyboardVisible(false);
        setKeyboardHeight(0);
        
        // When keyboard closes, restore previous scroll position if available
        if (scrollViewRef.current && scrollPositionRef.current > 0 && hasUserScrolled.current) {
          setTimeout(() => {
            scrollViewRef.current?.scrollTo({ 
              y: scrollPositionRef.current, 
              animated: false 
            });
          }, 500);
        }
      }
    );
    
    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, [isInputFocused, hasUserScrolled.current]);
  
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
    
    // Never auto-scroll when focusing input if the user has scrolled up
    // The keyboard event will take care of scrolling if needed
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
  
  // Update animation with different parameters for open/close, including backdrop
  useEffect(() => {
    // Skip on first render to avoid unwanted animations
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    
    // Prevent multiple animations from running simultaneously
    if (isAnimatingRef.current) return;
    
    if (visible && !isClosing) {
      isAnimatingRef.current = true;
      // Opening animation - smoother with slight bounce
      Animated.parallel([
        Animated.spring(panelAnimation, {
          toValue: 0,
          useNativeDriver: true,
          ...openConfig
        }),
        Animated.timing(backdropAnimation, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true
        })
      ]).start(() => {
        isAnimatingRef.current = false;
      });
    }
  }, [visible, isClosing, panelAnimation, backdropAnimation]);

  // Replace the onClose function with a faster version
  const handleClose = () => {
    // If already closing or animating, don't trigger another close
    if (isClosing || isAnimatingRef.current || !visible) return;
    
    // Set closing state first
    setIsClosing(true);
    isAnimatingRef.current = true;
    
    // Dismiss keyboard first for smoother animation
    Keyboard.dismiss();
    
    // Use a faster animation for closing - run backdrop and panel animations in parallel
    Animated.parallel([
      Animated.timing(panelAnimation, {
        toValue: SCREEN_HEIGHT,
        duration: 200, // Even faster for better sync
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnimation, {
        toValue: 0,
        duration: 200, // Match duration with panel
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      })
    ]).start(() => {
      // Call the original onClose after animation completes
      onClose();
      setIsClosing(false);
      isAnimatingRef.current = false;
    });
  };
  
  // Handle visibility changes to trigger closing animation
  useEffect(() => {
    if (!visible && !isClosing && !isFirstRender.current) {
      handleClose();
    }
  }, [visible]);
  
  const handleLikeComment = async (commentId: string) => {
    if (!user || !user._id) {
      console.warn('User not authenticated');
      return;
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    try {
      // First update UI optimistically
      setComments(prevComments => 
        prevComments.map(comment => 
          comment.id === commentId 
            ? { 
                ...comment, 
                hasLiked: !comment.hasLiked,
                likes: comment.hasLiked ? comment.likes - 1 : comment.likes + 1 
              } 
            : comment
        )
      );
      
      // Then persist the change to Sanity - make sure videoId is passed
      const result = await toggleLikeComment(commentId, user._id, videoId);
      
      // If something went wrong, revert to the actual state from the server
      if (!result) {
        loadComments(); // Reload comments to get the correct state
      }
    } catch (error) {
      console.error('Error liking comment:', error);
      loadComments(); // Reload on error to ensure UI is consistent
    }
  };
  
  const handleSubmitComment = async () => {
    if (!newComment.trim() || !user || !user._id) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      // Add the comment to Sanity
      const newCommentObj = await addComment(videoId, user._id, newComment);
      
      // Update local state with the new comment
      setComments(prevComments => [newCommentObj, ...prevComments]);
      setNewComment('');
      
      // Update comment count immediately
      const newCount = localCommentCount + 1;
      setLocalCommentCount(newCount);
      
      // Notify parent component of the updated count
      onCommentCountChange?.(newCount);
      
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
              {localCommentCount} comments
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
                      onLike={handleLikeComment} 
                      onDelete={handleDeleteComment}
                      canDelete={canDeleteComment(comment.user.id)}
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
          </View>
          
          {/* Input bar - TikTok style keyboard tracking */}
          <View style={{
            position: 'absolute',
            bottom: isKeyboardVisible ? keyboardHeight : (isFullScreen ? 10 : 90),
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

// Define a complete commentStyles object with all necessary styles
const commentStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.55,
    backgroundColor: '#121212',
    zIndex: 1000,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 999,
  },
  keyboardAvoidingView: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  commentsContainer: {
    flex: 1,
    marginBottom: 2,
    // Add a subtle bottom border to better separate from input area
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  header: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    position: 'relative',
  },
  dragHandle: {
    width: 36,
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
    marginBottom: 10,
    alignSelf: 'center',
  },
  backButton: {
    padding: 8,
    position: 'absolute',
    right: 8,
    zIndex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  commentsList: {
    padding: 16,
    paddingBottom: 120, // Increased padding to ensure enough space when keyboard appears
    minHeight: SCREEN_HEIGHT * 0.35, // Minimum height to make scrolling obvious
    flexGrow: 1, // Added to ensure the ScrollView can grow and be scrollable
  },
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#1A1A1A',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingBottom: Platform.OS === 'ios' ? 30 : 12,
  },
  emojiButton: {
    padding: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#2A2A2A',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: 'white',
    fontSize: 14,
    maxHeight: 100,
    marginHorizontal: 8,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1877F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#2a2a2a',
  },
  emptyCommentsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyCommentsText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#888',
    marginTop: 16,
  },
  emptyCommentsSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  headerRight: {
    width: 40,
  },
  scrollIndicator: {
    position: 'absolute',
    right: 4,
    width: 4,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
  },
  deleteButton: {
    padding: 4,
    marginLeft: 8,
  },
});

const VideoItemComponent = memo(({
  item, 
  isCurrentVideo, 
  onVideoRef, 
  isLocked = false, 
  autoScroll, 
  toggleAutoScroll, 
  autoScrollPulse,
  showPremiumAd,
  isTabFocused,
  isFullScreen = false,
  toggleFullScreen,
  router,
  forceCloseComments = false,
  onCommentsOpened,
  onCommentsClosed
}: VideoItemProps): JSX.Element => {
  const { addPoints, hasWatchedVideo } = usePoints();
  const { getVideoReactions, updateReaction, loadReactions } = useReactions();
  
  // Add state variables here
  const [hasEarnedPoints, setHasEarnedPoints] = useState(false);
  const [showPointsAnimation, setShowPointsAnimation] = useState(false);
  const [showButtons, setShowButtons] = useState(false);
  const [showStaticPoints, setShowStaticPoints] = useState(true);
  const [videoSize, setVideoSize] = useState({ width: 0, height: 0 });
  const [remainingTime, setRemainingTime] = useState<string | null>('');
  const [showComments, setShowComments] = useState(false);
  const [isTabActive, setIsTabActive] = useState(true);
  const [reactions, setReactions] = useState({ likes: 0, dislikes: 0, userAction: null as null | 'like' | 'dislike' });
  const [hasDiscoveredComments, setHasDiscoveredComments] = useState(false);
  const [viewCounted, setViewCounted] = useState(false); // Track if this view has been counted
  // Add status state variable
  const [status, setStatus] = useState<any>(null);
  const [commentCount, setCommentCount] = useState(0);
  // Add fullscreen mode state (0: regular, 1: minimal UI, 2: video only)
  const [fullscreenMode, setFullscreenMode] = useState(0);
  
  const videoRef = useRef<any>(null);
  const pointsAnimation = useRef(new Animated.Value(0)).current;
  const pointsScale = useRef(new Animated.Value(1)).current;
  const hasShownAnimationRef = useRef(false);
  const lastPositionRef = useRef<number>(0);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  
  // Create pan responder for horizontal swiping
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt, gestureState) => {
        // Only handle pan gestures when comments are not open
        return !showComments;
      },
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only respond to vertical gestures
        const isVerticalSwipe = Math.abs(gestureState.dy) > Math.abs(gestureState.dx * 2);
        
        // When comments are open, only handle swipes from the top area or header
        if (showComments) {
          // Let the nested PanResponder in CommentsSection handle this
          return false;
        }
        
        // When comments are closed, respond to upward swipes
        return isVerticalSwipe && !showComments && gestureState.dy < 0;
      },
      onPanResponderMove: (evt, gestureState) => {
        // If swiping up while comments are closed, allow opening
        if (!showComments && gestureState.dy < 0) {
          slideAnim.setValue(SCREEN_HEIGHT + gestureState.dy);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (!showComments) {
          // If swiped up far enough, open comments
          if (gestureState.dy < -SCREEN_HEIGHT / 6) {
            openComments();
          } else {
            // Otherwise snap back to closed state
            Animated.spring(slideAnim, {
              toValue: SCREEN_HEIGHT,
              useNativeDriver: true,
              friction: 19,
              tension: 75
            }).start();
          }
        }
      },
    })
  ).current;
  
  // Update openComments for bottom slide-up animation
  const openComments = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setHasDiscoveredComments(true);
    setShowComments(true);
    // Notify parent that comments are open
    onCommentsOpened?.();
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      friction: 19,
      tension: 75,
      velocity: 10
    }).start();
  };
  
  // Update closeComments for bottom slide-down animation
  const closeComments = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Set showComments to false immediately to prevent reopening
    setShowComments(false);
    // Notify parent that comments are closed
    onCommentsClosed?.();
  };

  // Listen for tab state changes
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('VIDEO_TAB_STATE', (event) => {
      setIsTabActive(event.isActive);
      
      // Immediately pause and mute the video when tab becomes inactive
      if (!event.isActive && videoRef.current) {
        videoRef.current.pauseAsync().catch(() => {});
        videoRef.current.setIsMutedAsync(true).catch(() => {});
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Configure audio to play in silent mode
  useEffect(() => {
    const configureAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          interruptionModeIOS: 1, // DoNotMix
          interruptionModeAndroid: 1, // DoNotMix
          shouldDuckAndroid: false,
        });
      } catch (error) {
        console.error('Failed to configure audio:', error);
      }
    };
    
    configureAudio();
  }, []);

  // Load reactions when component mounts or becomes current
  useEffect(() => {
    if (isCurrentVideo) {
      loadReactions();
    }
  }, [isCurrentVideo, loadReactions]);

  // Update reactions when they change in storage
  useEffect(() => {
    const updateLocalReactions = () => {
      const updatedReactions = getVideoReactions(item.id);
      setReactions(updatedReactions);
    };

    // Initial load
    updateLocalReactions();
    
    const subscription = DeviceEventEmitter.addListener('REACTIONS_UPDATED', (event) => {
      if (event?.type === 'reset' || (event?.type === 'update' && event?.videoId === item.id)) {
        updateLocalReactions();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [item.id, getVideoReactions]);

  // Reset state when points are updated (including reset)
  const resetState = () => {
    setHasEarnedPoints(false);
    setShowPointsAnimation(false);
    setShowStaticPoints(false);
    pointsAnimation.setValue(0);
    pointsScale.setValue(1);
    hasShownAnimationRef.current = false;
    // Reset video progress
    if (videoRef.current) {
      videoRef.current.setPositionAsync(0);
    }
  };

  // Check watched status whenever it might change
  useEffect(() => {
    const isWatched = hasWatchedVideo(item.id);
    setHasEarnedPoints(isWatched);
    // Show static points only if not watched yet
    setShowStaticPoints(!isWatched);
  }, [hasWatchedVideo, item.id]);

  useEffect(() => {
    onVideoRef(item.id, {
      current: videoRef.current,
      getLastPosition: () => lastPositionRef.current,
      resetPosition: () => { lastPositionRef.current = 0; }
    });
    
    // Listen for points reset
    const subscription = DeviceEventEmitter.addListener('POINTS_UPDATED', (event) => {
      if (event?.type === 'reset') {
        resetState();
        lastPositionRef.current = 0;
      }
    });

    return () => {
      subscription.remove();
    };
  }, [item.id, onVideoRef]);

  // Always stop videos when they're no longer current
  useEffect(() => {
    if (!isCurrentVideo && videoRef.current) {
      // Fully stop the video when it's no longer the current one
      videoRef.current.stopAsync().catch(() => {});
      videoRef.current.setIsMutedAsync(true).catch(() => {});
    } else if (isCurrentVideo && isTabActive && videoRef.current) {
      // Only start playing when this becomes the current video
      videoRef.current.playAsync().catch(() => {});
      videoRef.current.setIsMutedAsync(false).catch(() => {});
    }
  }, [isCurrentVideo, isTabActive]);

  // Ensure current refs are passed to parent
  useEffect(() => {
    // Update the reference any time videoRef changes
    if (videoRef.current) {
      onVideoRef(item.id, {
        current: videoRef.current,
        getLastPosition: () => lastPositionRef.current,
        resetPosition: () => { lastPositionRef.current = 0; }
      });
    }
  });

  // Additional effect to fully stop video when no longer active
  useEffect(() => {
    return () => {
      if (videoRef.current) {
        try {
          videoRef.current.stopAsync();
          videoRef.current.unloadAsync();
        } catch (e) {
          // Ignore errors during cleanup
        }
      }
    };
  }, []);

  // Replace the existing useEffect that responds to isCurrentVideo & isTabActive changes
  useEffect(() => {
    if (isCurrentVideo && isTabActive && isTabFocused) {
      // Only play and unmute if the video is current AND tab is active AND focused
      if (videoRef.current) {
        const playVideo = async () => {
          try {
            // Get current status
            const status = await videoRef.current.getStatusAsync();
            
            // Different handling based on whether it's preloaded
            if (!status.isLoaded) {
              // Not loaded yet, load it
              await videoRef.current.loadAsync(
                { uri: item.url },
                { shouldPlay: false, isMuted: true }
              );
              // Add a short delay to ensure it's ready
              await new Promise(resolve => setTimeout(resolve, 30));
            }
            
            // First set volume to 0
            await videoRef.current.setVolumeAsync(0);
            // Then unmute 
            await videoRef.current.setIsMutedAsync(false);
            // Start playing
            await videoRef.current.playAsync();
            // Gradually increase volume for smooth transition
            for (let vol = 0.1; vol <= 1; vol += 0.1) {
              await videoRef.current.setVolumeAsync(vol);
              await new Promise(resolve => setTimeout(resolve, 20));
            }
          } catch (error) {
            console.error('Error playing video:', error);
            // Fallback attempt if the smooth approach fails
            try {
              await videoRef.current.setIsMutedAsync(false);
              await videoRef.current.playAsync();
            } catch (e) {
              console.error('Fallback play also failed:', e);
            }
          }
        };
        
        // Small delay to ensure smooth transitions
        const playTimer = setTimeout(playVideo, 50);
        return () => clearTimeout(playTimer);
      }
    } else {
      // Stop and mute videos that are not visible or when tab is not active/focused
      if (videoRef.current) {
        const cleanup = async () => {
          try {
            // First mute to avoid sound cutoff
            await videoRef.current.setVolumeAsync(0);
            await videoRef.current.setIsMutedAsync(true);
            // Then stop
            await videoRef.current.stopAsync();
          } catch (e) {
            console.error('Error during video cleanup:', e);
            // Fallback
            try {
              videoRef.current.setIsMutedAsync(true);
              videoRef.current.stopAsync();
            } catch (err) {
              // Ignore additional errors
            }
          }
        };
        
        cleanup();
        setShowButtons(false);
      }
    }
  }, [isCurrentVideo, isTabActive, isTabFocused, item.url]);

  // Update the handlePlaybackStatusUpdate function to track view count at halfway point
  const handlePlaybackStatusUpdate = async (status: any) => {
    setStatus(status);
    
    // Track view count when user watches at least halfway through the video
    if (status.isLoaded && 
        status.positionMillis && 
        status.durationMillis && 
        isCurrentVideo && 
        !viewCounted) {
      
      // Check if user has watched at least 50% of the video
      if (status.positionMillis >= status.durationMillis * 0.5) {
        // Mark this view as counted to prevent duplicate counts
        setViewCounted(true);
        
        try {
          // Update view count in Sanity
          await videoService.updateVideoStats(item.id, { views: 1 });
          
          // Update local count for immediate UI feedback
          item.views = (item.views || 0) + 1;
          
          console.log('View count updated for video:', item.id);
        } catch (error) {
          console.error('Failed to update view count:', error);
        }
      }
    }
    
    // Detect video completion - enable auto-scroll while still looping
    if (status.didJustFinish) {
      console.log('Video finished, autoScroll:', autoScroll, 'isCurrentVideo:', isCurrentVideo, 'showPremiumAd:', showPremiumAd);
      
      // Emit event that video has ended - always emit this regardless of previous watch status
      DeviceEventEmitter.emit('VIDEO_ENDED', { videoId: item.id });
      
      // Only trigger auto-scroll if premium ad is not showing and auto-scroll is enabled
      if (autoScroll && isCurrentVideo && !showPremiumAd) {
        console.log('Emitting AUTO_SCROLL_NEXT event');
        // Add a small delay to ensure premium ad check is complete
        setTimeout(() => {
          if (!showPremiumAd) {
            DeviceEventEmitter.emit('AUTO_SCROLL_NEXT', { fromVideo: item.id });
          }
        }, 100);
      }
      
      // When video ends completely, we'll reset the viewCounted state
      // This allows the view to be counted again if they replay the video
      setViewCounted(false);
    }
    
    // Update points earning logic
    const requiredWatchTime = Math.min(status?.durationMillis || 0, 30000); // Cap at 30 seconds
    lastPositionRef.current = status?.positionMillis || 0;
    
    if (status?.isPlaying && 
        isCurrentVideo && 
        !hasEarnedPoints && 
        status?.positionMillis >= requiredWatchTime && 
        !hasShownAnimationRef.current) {
      
      hasShownAnimationRef.current = true;
      
      // Vibrate to provide feedback
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (e) {
          console.log('Haptics not supported');
        }
      }
      
      // Show points animation
      animatePoints();
      
      // Mark video as watched
      await addPoints(item.points, item.id);
      
      // Update points balance
      DeviceEventEmitter.emit('POINTS_EARNED', { 
        amount: item.points, 
        source: 'video', 
        videoId: item.id 
      });
      
      // Hide the static countdown after points earned
      setShowStaticPoints(false);
    }
    
    // Check for showing playback controls
    if (status?.isPlaying === false && lastPositionRef.current > 0) {
      // Show buttons when video is paused by user (not on initial load)
      setShowButtons(true);
    } else {
      setShowButtons(false);
    }
    
    // Update countdown timer
    if (!hasEarnedPoints && status?.isPlaying && requiredWatchTime > 0) {
      const remaining = Math.max(0, requiredWatchTime - (status?.positionMillis || 0));
      const seconds = Math.ceil(remaining / 1000);
      setRemainingTime(`${seconds}s`);
    } else if (hasEarnedPoints || !status?.isPlaying) {
      setRemainingTime(null);
    }
  };

  // Animation for showing points earned
  const animatePoints = () => {
    pointsAnimation.setValue(0);
    pointsScale.setValue(1);

    Animated.sequence([
      Animated.timing(pointsAnimation, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
        Animated.timing(pointsScale, {
        toValue: 1.2,
        duration: 200,
          useNativeDriver: true,
      })
    ]).start(() => {
      setTimeout(() => {
        setShowPointsAnimation(false); // Hide animation after a delay
      }, 500);
    });
  };
  
  // Modify the calculateVideoDimensions function to use this constant
  const calculateVideoDimensions = () => {
    const isVertical = item.type === 'vertical';
    const aspectRatio = item.aspectRatio || (isVertical ? 9/16 : 16/9);
    
    if (isVertical) {
      // For vertical videos, use COVER to fill the entire screen
      // This is how TikTok and YouTube Shorts display videos
        return {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
          resizeMode: ResizeMode.COVER,
        marginTop: 0
      };
    } else {
      // Horizontal video
      const maxWidth = SCREEN_WIDTH;
      const height = maxWidth / aspectRatio;
      return {
        width: maxWidth,
        height: Math.min(height, AVAILABLE_HEIGHT),
        resizeMode: ResizeMode.CONTAIN,
        marginTop: 0
      };
    }
  };

  const { width, height, resizeMode, marginTop } = calculateVideoDimensions();

  const onLoad = (status: any) => {
    if (status.isLoaded && status.naturalSize) {
      setVideoSize({
        width: status.naturalSize.width,
        height: status.naturalSize.height,
      });
    }
  };

  const onShare = async () => {
    try {
      await Share.share({
        message: `${item.title} - Check out this video! ${item.url}`,
        url: item.url,
        title: item.title,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const onReplay = async () => {
    if (videoRef.current) {
      await videoRef.current.setPositionAsync(0);
      await videoRef.current.playAsync();
      setShowButtons(false);
    }
  };

  // Add function to format view count with K, M abbreviations
  const formatCount = (count: number): string => {
    if (!count) return '0';
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1) + 'M';
    } else if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'K';
    }
    return count.toString();
  };

  const handleWatchFull = async () => {
    if (videoRef.current) {
      await videoRef.current.stopAsync();
    }
    
    // Increment view count
    try {
      await videoService.updateVideoStats(item.id, { views: 1 });
    } catch (error) {
      console.error('Error incrementing view count:', error);
    }
    
    router.push({
      pathname: '/video-detail' as any,
      params: { id: item.id }
    });
  };

  const handleLike = async () => {
    const newAction = reactions.userAction === 'like' ? null : 'like';
    setReactions({
      ...reactions,
      userAction: newAction,
      likes: newAction === 'like' ? reactions.likes + 1 : reactions.likes - 1
    });
  };

  const handleDislike = async () => {
    const newAction = reactions.userAction === 'dislike' ? null : 'dislike';
    setReactions({
      ...reactions,
      userAction: newAction,
      dislikes: newAction === 'dislike' ? reactions.dislikes + 1 : reactions.dislikes - 1
    });
  };

  // Add special styles for horizontal video info content positioning
  const getContentPositionStyles = () => {
    // Set different margin values based on fullscreen mode
    const bottomMargin = isFullScreen ? SCREEN_HEIGHT * 0.04 : SCREEN_HEIGHT * 0.14;
    
    // Add extra style adjustments for fullscreen mode
    const fullscreenAdjustments = isFullScreen ? {
      // For author info, add better visibility and position
      videoInfoStyle: {
        bottom: Platform.OS === 'ios' ? 20 : 10,
        marginBottom: bottomMargin,
      },
      // For action buttons, adjust positioning
      actionButtonsStyle: {
        bottom: Platform.OS === 'ios' ? 20 : 10,
        marginBottom: bottomMargin,
        gap: SCREEN_HEIGHT * 0.035
      }
    } : {
      videoInfoStyle: {
        marginBottom: bottomMargin,
      },
      actionButtonsStyle: {
        marginBottom: bottomMargin
      }
    };
    
    if (item.type === 'horizontal') {
      return {
        videoInfoStyle: {
          position: 'absolute' as const,
          bottom: 0,
          left: SCREEN_WIDTH * 0.05,
          width: SCREEN_WIDTH * 0.65,
          zIndex: 10,
          ...fullscreenAdjustments.videoInfoStyle,
        },
        actionButtonsStyle: {
          position: 'absolute' as const,
          bottom: 0,
          right: SCREEN_WIDTH * 0.05,
          zIndex: 10,
          ...fullscreenAdjustments.actionButtonsStyle,
        }
      };
    }
    
    return {
      videoInfoStyle: {
        position: 'absolute' as const,
        bottom: 0,
        left: SCREEN_WIDTH * 0.05,
        width: SCREEN_WIDTH * 0.65,
        zIndex: 10,
        ...fullscreenAdjustments.videoInfoStyle,
      },
      actionButtonsStyle: {
        position: 'absolute' as const,
        bottom: 0,
        right: SCREEN_WIDTH * 0.05,
        zIndex: 10,
        ...fullscreenAdjustments.actionButtonsStyle,
      }
    };
  };

  const { videoInfoStyle, actionButtonsStyle } = getContentPositionStyles();

  // Add effect to respond to the forceCloseComments prop
  useEffect(() => {
    if (forceCloseComments && showComments) {
      console.log('Force closing comments for video:', item.id);
      closeComments();
    }
  }, [forceCloseComments, item.id, showComments]);

  // Load comment count when component mounts or becomes current
  useEffect(() => {
    if (isCurrentVideo) {
      loadCommentCount();
    }
  }, [isCurrentVideo, item.id]);

  // Function to fetch comment count from Sanity
  const loadCommentCount = async (directCount?: number) => {
    try {
      if (directCount !== undefined) {
        // If a direct count is provided (from CommentsSection), use it directly
        setCommentCount(directCount);
        return;
      }
      
      if (!item || !item.id) return;
      const count = await getCommentCount(item.id);
      setCommentCount(count);
    } catch (error) {
      console.error('Error loading comment count:', error);
    }
  };

  // Listen for reset fullscreen mode event
  useEffect(() => {
    // When toggling fullscreen off, reset the fullscreen mode
    if (!isFullScreen) {
      setFullscreenMode(0);
    }

    // Listen for events to reset fullscreen mode
    const resetSubscription = DeviceEventEmitter.addListener('RESET_FULLSCREEN_MODE', () => {
      setFullscreenMode(0);
    });

    return () => {
      resetSubscription.remove();
    };
  }, [isFullScreen]);

  return (
    <View style={[
      styles.videoContainer,
      item.type === 'vertical' ? styles.verticalContainer : styles.horizontalContainer
    ]}>
      <Animated.View 
        style={[
          styles.videoWrapper,
          // Remove the transform since we're no longer sliding content
          // { transform: [{ translateX: slideAnim }] }
        ]}
        {...(isCurrentVideo ? panResponder.panHandlers : {})}
      >
        {/* Video component */}
        <View style={item.type === 'vertical' ? styles.verticalVideoWrapper : styles.horizontalVideoWrapper}>
          <Video
            ref={videoRef}
            source={{ uri: item.url }}
            style={[styles.video, { width, height }]}
            resizeMode={resizeMode}
            isLooping={true}
            onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
            onLoad={onLoad}
            useNativeControls={false}
            shouldPlay={isCurrentVideo && isTabActive && !isLocked && !showPremiumAd && isTabFocused}
            isMuted={!isCurrentVideo || !isTabActive || isLocked || !isTabFocused}
            volume={1.0}
            progressUpdateIntervalMillis={500}
          />
        </View>
      
        {/* UI Overlay with SafeAreaView for better positioning */}
        <SafeAreaView style={[
          styles.overlay,
          item.type === 'vertical' ? styles.verticalOverlay : styles.horizontalOverlay
        ]}>
          {/* Show author info and description only in mode 0 when fullscreen */}
          {(!isFullScreen || (isFullScreen && fullscreenMode === 0)) && (
            <View style={[styles.videoInfo, videoInfoStyle]}>
              {/* Author info */}
              <View style={styles.authorContainer}>
                {item.authorAvatar ? (
                  <Image 
                    source={{ uri: item.authorAvatar }} 
                    style={styles.authorAvatar} 
                  />
                ) : (
                  <View style={styles.authorAvatarPlaceholder} />
                )}
                <View style={styles.authorNameContainer}>
                  <Text 
                    style={[
                      styles.author,
                      // Enhance text visibility in fullscreen mode
                      isFullScreen && {
                        fontSize: SCREEN_WIDTH * 0.05,
                        textShadowColor: 'rgba(0,0,0,0.7)',
                        textShadowRadius: 5
                      }
                    ]} 
                    numberOfLines={1} 
                    ellipsizeMode="tail"
                  >
                    {item.author}
                  </Text>
                  {/* Show verification badge if applicable */}
                  {(item.isVerified || item.isBlueVerified) && (
                    <View style={styles.authorVerifiedBadge}>
                      {item.isBlueVerified ? (
                        <TunnelBlueVerifiedMark size={Math.max(15, SCREEN_WIDTH * 0.04)} />
                      ) : (
                        <TunnelVerifiedMark size={Math.max(12, SCREEN_WIDTH * 0.03)} />
                      )}
                    </View>
                  )}
                </View>
                {remainingTime && !hasEarnedPoints && (
                  <View style={styles.countdownWrapper}>
                    <View style={styles.countdownDot} />
                    <Text style={styles.inlineCountdown}>
                      <Text style={styles.countdownLabel}>WATCH </Text>
                      {remainingTime}
                    </Text>
                  </View>
                )}
              </View>
              
              {/* Video description with enhanced visibility in fullscreen */}
              <Text 
                style={[
                  styles.description,
                  isFullScreen && {
                    fontSize: SCREEN_WIDTH * 0.04,
                    textShadowColor: 'rgba(0,0,0,0.7)',
                    textShadowRadius: 5
                  }
                ]}
                numberOfLines={isFullScreen ? 3 : 2} 
                ellipsizeMode="tail"
              >
                {item.description}
              </Text>
                
              {/* Always show fullscreen button */}
              <View style={styles.buttonRow}>
                {(!isFullScreen || fullscreenMode === 0) && (
                  <>
                    <View style={styles.statsContainer}>
                      <Eye 
                        color="white" 
                        size={SCREEN_WIDTH * 0.04} 
                        opacity={0.9}
                      />
                      <Text style={styles.viewCountText}>
                        {formatCount(item.views || 0)}
                      </Text>
                    </View>
                    <Pressable style={styles.watchFullIconButton} onPress={handleWatchFull}>
                      <ExternalLink color="white" size={SCREEN_WIDTH * 0.05} opacity={0.9} />
                    </Pressable>
                  </>
                )}
                <Pressable 
                  style={styles.fullScreenButton} 
                  onPress={() => {
                    if (isFullScreen) {
                      // Toggle between fullscreen modes
                      setFullscreenMode((prev) => (prev === 0 ? 1 : 0));
                    } else {
                      // Enter fullscreen
                      toggleFullScreen?.();
                      setFullscreenMode(0);
                    }
                  }}
                >
                  {isFullScreen ? 
                    <Minimize color="white" size={SCREEN_WIDTH * 0.05} /> : 
                    <Maximize color="white" size={SCREEN_WIDTH * 0.05} />
                  }
                </Pressable>
              </View>
            </View>
          )}
          
          {/* Show action buttons only in mode 0 when fullscreen */}
          {(!isFullScreen || (isFullScreen && fullscreenMode === 0)) && (
            <View style={[
              styles.actionButtons, 
              actionButtonsStyle,
              isFullScreen && {
                bottom: Platform.OS === 'ios' ? 20 : 10,
                gap: SCREEN_HEIGHT * 0.035
              }
            ]}>
              <View style={styles.likeContainer}>
                <Pressable onPress={handleLike} style={styles.actionButton}>
                  <ThumbsUp 
                    color={reactions.userAction === 'like' ? '#1877F2' : 'white'} 
                    fill={reactions.userAction === 'like' ? '#1877F2' : 'transparent'}
                    size={Math.max(Math.min(videoSize.height * 0.06, SCREEN_WIDTH * 0.08), 24)} 
                  />
                  <Text style={[styles.actionCount, reactions.userAction === 'like' && styles.activeCount]}>
                    {reactions.likes}
                  </Text>
                </Pressable>

                {/* Comment button */}
                <View style={styles.commentButtonContainer}>
                  <Pressable 
                    onPress={() => {
                      setHasDiscoveredComments(true);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      openComments();
                    }}
                    style={styles.commentButton}
                  >
                    <View style={styles.commentIconContainer}>
                      <MessageCircle 
                        color="white" 
                        size={Math.max(Math.min(videoSize.height * 0.055, SCREEN_WIDTH * 0.08), 24)} 
                      />
                    </View>
                    <Text style={styles.actionCount}>{commentCount}</Text>
                  </Pressable>
                  {!hasDiscoveredComments && (
                    <View style={styles.discoveryDot} />
                  )}
                </View>

                {/* Share button */}
                <Pressable onPress={onShare} style={styles.shareButton}>
                  <Share2 
                    color="white" 
                    size={Math.max(Math.min(videoSize.height * 0.06, SCREEN_WIDTH * 0.08), 24)} 
                  />
                </Pressable>
                
                {/* Auto-scroll button */}
                <Pressable 
                  style={[
                    styles.autoScrollButton,
                    autoScroll && styles.autoScrollButtonActive
                  ]} 
                  onPress={toggleAutoScroll}
                >
                  <PlayCircle 
                    color={autoScroll ? '#1877F2' : 'white'} 
                    fill={autoScroll ? 'rgba(24, 119, 242, 0.3)' : 'transparent'}
                    size={Math.max(Math.min(videoSize.height * 0.06, SCREEN_WIDTH * 0.08), 24)} 
                  />
                  <Text style={[
                    styles.actionCount, 
                    autoScroll ? styles.activeCount : null
                  ]}>
                    Auto
                  </Text>
                </Pressable>
              </View>
            
              <View style={styles.watchedContainer}>
                {hasEarnedPoints && <CheckCircle color="#00ff00" size={SCREEN_WIDTH * 0.06} />}
                {showStaticPoints && !showPointsAnimation && (
                  <View style={styles.staticPoints}>
                    <Text style={styles.staticPointsText}>+10 P</Text>
                  </View>
                )}
                {showPointsAnimation && (
                  <Animated.View
                    style={[
                      styles.pointsEarned,
                      {
                        transform: [
                          { translateY: pointsAnimation.interpolate({
                            inputRange: [0, 75, 150],
                            outputRange: [0, -75, -150],
                            extrapolate: 'clamp'
                          })},
                          { scale: pointsScale }
                        ],
                        opacity: pointsAnimation.interpolate({
                          inputRange: [0, 75, 150],
                          outputRange: [1, 1, 0],
                          extrapolate: 'clamp'
                        })
                      }
                    ]}
                  >
                    <Text style={styles.earnedPointsText}>+{item.points} 🎉</Text>
                  </Animated.View>
                )}
              </View>
            </View>
          )}
          
          {/* Fullscreen mode 1: Minimal UI - Only show the fullscreen button at the bottom right */}
          {isFullScreen && fullscreenMode === 1 && (
            <View style={{
              position: 'absolute',
              bottom: 20,
              right: 20,
              backgroundColor: 'rgba(0,0,0,0.5)',
              borderRadius: 25,
              padding: 10,
            }}>
              <Pressable 
                onPress={() => {
                  toggleFullScreen?.();
                  setFullscreenMode(0);
                }}
              >
                <Minimize color="white" size={SCREEN_WIDTH * 0.05} />
              </Pressable>
            </View>
          )}
        </SafeAreaView>
        
        {showButtons && (
          <View style={styles.buttonPopup}>
            <Text style={styles.popupHeader}>Video paused ⏸️</Text>
            <Pressable style={styles.replayButton} onPress={onReplay}>
              <Text style={styles.replayButtonText}>Re-play</Text>
            </Pressable>
          </View>
        )}
      </Animated.View>
      
      {/* Comments section */}
      <CommentsSection 
        videoId={item.id}
        visible={showComments}
        onClose={closeComments}
        commentCount={commentCount}
        router={router}
        isFullScreen={isFullScreen}
        videoAuthorId={item.authorId}
        onCommentCountChange={loadCommentCount}
      />
      
      {/* Lock overlay when premium alert is shown */}
      {isLocked && isCurrentVideo && (
        <View style={styles.lockOverlay}>
          <Lock color="white" size={SCREEN_WIDTH * 0.1} />
        </View>
      )}
    </View>
  );
});

// Add interface for TopHeader props
interface TopHeaderProps {
  activeTab: number;
  onTabPress: (tab: string, index: number) => void;
  isFullScreen: boolean;
  points?: number;
  onAddPress: () => void;
  onSearchPress: () => void;
}

// Add a new TopHeader component for navigation
const TopHeader: React.FC<TopHeaderProps> = ({ 
  activeTab, 
  onTabPress, 
  isFullScreen,
  points = 0,
  onAddPress,
  onSearchPress
}) => {
  if (isFullScreen) return null;
  
  return (
    <SafeAreaView style={styles.headerContainer}>
      <View style={styles.headerContent}>
        {/* Left side - Title */}
        <Text style={styles.headerTitle}>tunnel</Text>
        
        {/* Right side - Icons */}
        <View style={styles.headerRightButtons}>
          {/* Add button */}
          <Pressable
            style={styles.headerIconButton}
            onPress={onAddPress}
          >
            <Plus size={24} color="#1877F2" />
          </Pressable>
          
          {/* Search button */}
          <Pressable
            style={styles.headerIconButton}
            onPress={onSearchPress}
          >
            <Search size={24} color="#1877F2" />
          </Pressable>
          
          {/* Points display */}
          <Pressable
            style={styles.pointsButton}
            onPress={() => onTabPress('Points', 2)}
          >
            <Coins size={20} color="#FFD700" />
            <Text style={styles.pointsText}>{points}</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
};

// Rename SwipeIndicator to CommentsIndicator and update to show swipe-up gesture
const CommentsIndicator = () => null;

export default function VideoFeed() {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [lastVideoId, setLastVideoId] = useState<string | null | undefined>(null);
  const [hasMoreVideos, setHasMoreVideos] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [showLockedVideo, setShowLockedVideo] = useState(false);
  const [showAutoScrollModal, setShowAutoScrollModal] = useState(false);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(false);
  const [showPremiumAd, setShowPremiumAd] = useState(false);
  const [watchedVideosCount, setWatchedVideosCount] = useState(0);
  const [isTabFocused, setIsTabFocused] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [activeHeaderTab, setActiveHeaderTab] = useState(0);
  const [forceCloseCommentsFlags, setForceCloseCommentsFlags] = useState<Record<string, boolean>>({});
  // Add state for tracking if any comments section is open
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  
  // Get route params if any - for playing a specific video from Feed
  const { initialVideoId, autoPlay } = useLocalSearchParams<{ initialVideoId?: string; autoPlay?: string }>();

  const { user } = useSanityAuth();
  const router = useRouter();
  
  // Add handler functions here, before any conditional returns
  // Handler functions for the header actions
  const handleAddPress = useCallback(() => {
    // Navigate to the tunnelling screen for uploading new videos
    router.push('/components/video-tunnelling' as any);
  }, [router]);

  const handleSearchPress = useCallback(() => {
    // Navigate to the search screen
    router.push('/search' as any);
  }, [router]);
  
  // Animation values
  const premiumModalScale = useRef(new Animated.Value(0.3)).current;
  const premiumModalOpacity = useRef(new Animated.Value(0)).current;
  
  const flatListRef = useRef<FlatList>(null);
  const videoRefs = useRef<VideoRefs>({});
  const initRef = useRef(false);
  const premiumAdRef = useRef(false);
  const viewConfigRef = useRef({ 
    itemVisiblePercentThreshold: 70,
    minimumViewTime: 500
  });
  
  // IMPORTANT: Define all refs and callback hooks BEFORE any conditional returns
  // to avoid "Rendered more hooks than during the previous render" error
  const preloadedVideos = useRef<Set<string>>(new Set());
  const autoScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoScrollPulse = useRef(new Animated.Value(1)).current;
  
  // Add state for showing refresh indicator
  const [showRefreshIndicator, setShowRefreshIndicator] = useState(false);
  const refreshIndicatorOpacity = useRef(new Animated.Value(0)).current;
  
  // Define all callbacks before any conditional code
  const toggleAutoScroll = useCallback(() => {
    const newValue = !isAutoScrollEnabled;
    setIsAutoScrollEnabled(newValue);
    setShowAutoScrollModal(false);
    
    // Save preference to AsyncStorage
    try {
      AsyncStorage.setItem('autoScrollEnabled', newValue ? 'true' : 'false');
    } catch (err) {
      console.error('Error saving auto-scroll preference:', err);
    }
    
    if (newValue) {
      // Show toast or some indication that auto-scroll is enabled
      console.log('Auto-scroll enabled');
    }
  }, [isAutoScrollEnabled]);
  
  const toggleFullScreen = useCallback(() => {
    setIsFullScreen(prev => {
      const newValue = !prev;
      // Notify the system about fullscreen change
      DeviceEventEmitter.emit('TOGGLE_FULL_SCREEN', { isFullScreen: newValue });
      
      // Update status bar appearance based on fullscreen state
      if (Platform.OS === 'android') {
        StatusBar.setTranslucent(true);
        // Hide status bar in fullscreen mode on Android
        if (newValue) {
          StatusBar.setHidden(true);
        } else {
          StatusBar.setHidden(false);
          // Emit an event to reset fullscreen mode when exiting fullscreen
          DeviceEventEmitter.emit('RESET_FULLSCREEN_MODE', {});
        }
      }
      
      // If there's a tab layout/bottom navigation, let the parent component know to hide it
      // (This event will be handled in the parent navigation component)
      DeviceEventEmitter.emit('HIDE_BOTTOM_TABS', { hidden: newValue });
      
      return newValue;
    });
  }, []);
  
  // Function to show the refresh indicator with animation
  const showRefreshFeedback = useCallback(() => {
    setShowRefreshIndicator(true);
    refreshIndicatorOpacity.setValue(0);
    
    Animated.sequence([
      Animated.timing(refreshIndicatorOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true
      }),
      Animated.delay(800),
      Animated.timing(refreshIndicatorOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      })
    ]).start(() => {
      setShowRefreshIndicator(false);
    });
  }, [refreshIndicatorOpacity]);
  
  // Add function to find index of a video by ID
  const findVideoIndexById = useCallback((videoId: string | undefined) => {
    if (!videoId) return -1;
    return videos.findIndex(video => video.id === videoId);
  }, [videos]);
  
  // Add useEffect to handle initialVideoId from params
  useEffect(() => {
    if (initialVideoId && videos.length > 0) {
      const index = findVideoIndexById(initialVideoId);
      if (index !== -1) {
        console.log(`Scrolling to video with ID: ${initialVideoId} at index: ${index}`);
      setCurrentVideoIndex(index);
        
        // Scroll to the specified video
        if (flatListRef.current) {
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({
              index: index,
              animated: true,
              viewPosition: 0.5
            });
          }, 300);
        }
      } else {
        console.log(`Video with ID: ${initialVideoId} not found in loaded videos`);
        // If the video isn't in the current list, try to load it specifically
        loadSpecificVideo(initialVideoId);
      }
    }
  }, [initialVideoId, videos, findVideoIndexById]);
  
  // Add a function to load a specific video by ID
  const loadSpecificVideo = useCallback(async (videoId: string) => {
    try {
      setIsLoading(true);
      console.log(`Loading specific video with ID: ${videoId}`);
      
      // Query for videos and then filter client-side for the specific video
      const allVideos = await videoService.fetchVideos(20, null);
      
      // Find the specific video with our ID
      const specificVideo = allVideos.find((video: VideoItem) => video.id === videoId);
      
      if (specificVideo) {
        // Add this video at the beginning of the list if not already present
        setVideos(prev => {
          // Check if video already exists to avoid duplicates
          const exists = prev.some(v => v.id === specificVideo.id);
          if (exists) return prev;
          return [specificVideo, ...prev];
        });
        
        // Set this as the current video
        setCurrentVideoIndex(0);
      } else {
        console.error(`Video with ID: ${videoId} not found`);
      }
    } catch (error) {
      console.error(`Error loading specific video: ${error}`);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Enhanced loadVideos function with visual feedback
  const loadVideos = useCallback(async (refresh = false) => {
    if (loadingMore && !refresh) return;
    
    // Show refresh indicator for refreshes only (not initial load or pagination)
    if (refresh && videos.length > 0) {
      showRefreshFeedback();
    }
    
    try {
      setLoadingMore(true);
      if (refresh) {
        setIsLoading(true);
        setVideos([]);
        setLastVideoId(null);
        setCurrentVideoIndex(0);
        // Reset hasMoreVideos when refreshing
        setHasMoreVideos(true);
      }
      
      // Skip loading if we've already determined there are no more videos
      if (!refresh && !hasMoreVideos) {
        console.log('No more videos to load');
        setLoadingMore(false);
        setRefreshing(false);
        setIsLoading(false);
        return;
      }
      
      // Create a wrapper to handle the type mismatch
      const getVideos = async () => {
        if (refresh || !lastVideoId) {
          return await videoService.fetchVideos(20, null);
        } else {
          // Type assertion to any to bypass TypeScript's type checking
          const id = lastVideoId as any;
          return await videoService.fetchVideos(20, id);
        }
      };
      
      const result = await getVideos();
      
      // If result is undefined, null, or empty array, there are no more videos
      if (!result || result.length === 0) {
        console.log('No more videos available');
        setHasMoreVideos(false);
        setLoadingMore(false);
        setRefreshing(false);
        setIsLoading(false);
        return;
      }
      
      if (refresh) {
        setVideos(result);
      } else {
        setVideos(prev => [...prev, ...result]);
      }
      
      // Only update lastVideoId if we have results
      if (result.length > 0) {
        setLastVideoId(result[result.length - 1].id);
        
        // If we got fewer videos than requested, we're at the end
        if (result.length < 20) {
          console.log('Reached end of video list');
          setHasMoreVideos(false);
        }
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading videos:', error);
      // Don't try to load more videos after an error
      setHasMoreVideos(false);
    } finally {
      setLoadingMore(false);
      setRefreshing(false);
      setIsLoading(false);
    }
  }, [lastVideoId, hasMoreVideos, loadingMore, videos.length, showRefreshFeedback]);
  
  const preloadVideo = useCallback(async (videoId: string, videoUrl: string) => {
    // Skip if already preloaded
    if (preloadedVideos.current.has(videoId)) return;
    
    try {
      if (videoRefs.current[videoId] && videoRefs.current[videoId].current) {
        console.log(`Preloading video: ${videoId}`);
        // Load the video but don't play it
        await videoRefs.current[videoId].current.loadAsync(
          { uri: videoUrl },
          { shouldPlay: false, isMuted: true },
          false
        );
        // Mark as preloaded
        preloadedVideos.current.add(videoId);
        console.log(`Successfully preloaded video: ${videoId}`);
      }
    } catch (error) {
      console.error(`Error preloading video ${videoId}:`, error);
    }
  }, []);
  
  const stopVideoWithAudioFade = useCallback(async (videoId: string) => {
    if (!videoRefs.current[videoId] || !videoRefs.current[videoId].current) return;
    
    try {
      const videoRef = videoRefs.current[videoId].current;
      // First mute the video to avoid sound cutoff
      await videoRef.setVolumeAsync(0);
      // Then stop it
      await videoRef.stopAsync();
      // Reset volume for next time
      await videoRef.setVolumeAsync(1);
    } catch (error) {
      console.error(`Error stopping video ${videoId} with audio fade:`, error);
      // Fallback to direct stop if fading fails
      try {
        videoRefs.current[videoId].current.stopAsync();
      } catch (e) {
        // Ignore second error
      }
    }
  }, []);
  
  // Define all effects before any conditional returns
  // Set status bar configuration for immersive experience - moved outside of conditional renders
  // IMPORTANT: This hook must be called in the same order on every render to avoid the
  // "Rendered more hooks than during the previous render" error
  useEffect(() => {
    // Make status bar transparent for immersive experience
    StatusBar.setBarStyle('light-content');
    if (Platform.OS === 'android') {
      StatusBar.setTranslucent(true);
      StatusBar.setBackgroundColor('transparent');
    }
    
    // Listen for fullscreen changes to adjust status bar
    const subscription = DeviceEventEmitter.addListener('TOGGLE_FULL_SCREEN', (event) => {
      if (event?.isFullScreen) {
        if (Platform.OS === 'android') {
          StatusBar.setHidden(true);
        }
      } else {
        if (Platform.OS === 'android') {
          StatusBar.setHidden(false);
        }
      }
    });
    
    return () => {
      // Reset on unmount if needed
      if (Platform.OS === 'android') {
        StatusBar.setTranslucent(false);
        StatusBar.setBackgroundColor('#000');
        StatusBar.setHidden(false);
      }
      subscription.remove();
    };
  }, []);
  
  // Handle Video refs
  const handleVideoRef = (id: string, ref: any) => {
    // Remove old ref if it exists before assigning new one to clean up properly
    if (videoRefs.current[id] && videoRefs.current[id].current && ref.current !== videoRefs.current[id].current) {
      try {
        videoRefs.current[id].current.stopAsync();
        videoRefs.current[id].current.unloadAsync();
      } catch (e) {
        // Ignore errors during cleanup
      }
    }
    videoRefs.current[id] = ref;
  };
  
  // Preload initial videos once they're loaded - MOVED UP before any conditional returns
  useEffect(() => {
    if (videos.length > 0 && !isLoading) {
      // Preload the first few videos for immediate playback
      for (let i = 0; i < Math.min(3, videos.length); i++) {
        preloadVideo(videos[i].id, videos[i].url);
      }
    }
  }, [videos, isLoading, preloadVideo]);
  
  // Track when user watches videos and show premium ad after 2 videos
  useEffect(() => {
    const handleVideoEnded = (event: any) => {
      setWatchedVideosCount(prevCount => {
        const newCount = prevCount + 1;
        console.log('Videos watched:', newCount);
        
        // Show premium ad after user watches 2 videos
        if (newCount % 2 === 0 && !premiumAdRef.current) {
          premiumAdRef.current = true;
          setShowPremiumAd(true);
          
          // Disable auto-scroll while premium ad is showing
          // This is a temporary override that will be restored when the ad is closed
          if (isAutoScrollEnabled) {
            console.log('Temporarily suspending auto-scroll while premium ad is showing');
          }
          
          // Pause all videos
          Object.values(videoRefs.current).forEach(videoRef => {
            if (videoRef && videoRef.current) {
              videoRef.current.pauseAsync().catch(() => {});
            }
          });
          
          // Animate premium modal in
          premiumModalScale.setValue(0.3);
          premiumModalOpacity.setValue(0);
          
          Animated.parallel([
            Animated.spring(premiumModalScale, {
              toValue: 1,
              tension: 50,
              friction: 7,
              useNativeDriver: true
            }),
            Animated.timing(premiumModalOpacity, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true
            })
          ]).start();
        }
        
        return newCount;
      });
    };
    
    const subscription = DeviceEventEmitter.addListener('VIDEO_ENDED', handleVideoEnded);
    
    return () => {
      subscription.remove();
    };
  }, [premiumModalScale, premiumModalOpacity, isAutoScrollEnabled]);
  
  // Listen for auto-scroll events - prevent scrolling when premium ad is visible
  useEffect(() => {
    const handleAutoScroll = (event: any) => {
      console.log('Received AUTO_SCROLL_NEXT event', event, 'currentIndex:', currentVideoIndex, 'videos.length:', videos.length);
      
      // Don't process auto-scroll if premium ad is showing
      if (showPremiumAd) {
        console.log('Blocking auto-scroll because premium ad is showing');
        // Ensure current video stays paused
        const currentVideo = videos[currentVideoIndex];
        if (currentVideo && videoRefs.current[currentVideo.id] && videoRefs.current[currentVideo.id].current) {
          videoRefs.current[currentVideo.id].current.pauseAsync().catch(() => {});
        }
        return;
      }
      
      // Calculate next index and ensure it's valid
      const nextIndex = currentVideoIndex + 1;
      
      if (flatListRef.current && videos.length > nextIndex) {
        console.log('Scrolling to next video, index:', nextIndex);
        try {
          // Ensure the scroll is limited to exactly one video
          flatListRef.current.scrollToIndex({
            index: nextIndex,
            animated: true,
            viewPosition: 0
          });
        } catch (error) {
          console.error('Error scrolling to next video:', error);
          
          // Fallback approach if the first method fails
          setTimeout(() => {
            if (flatListRef.current && !showPremiumAd) {
              try {
                flatListRef.current.scrollToOffset({
                  offset: nextIndex * AVAILABLE_HEIGHT,
            animated: true
          });
              } catch (e) {
                console.error('Fallback scroll failed too:', e);
              }
            }
          }, 100);
        }
      } else {
        console.log('Cannot auto-scroll: no more videos or flatList ref missing');
      }
    };

    const subscription = DeviceEventEmitter.addListener('AUTO_SCROLL_NEXT', handleAutoScroll);

    return () => {
      subscription.remove();
    };
  }, [currentVideoIndex, videos.length, showPremiumAd]);
  
  // Initial load and setting retrieval
  useEffect(() => {
    const loadInitialData = async () => {
    if (!initRef.current) {
        // Load auto-scroll preference
        try {
          const savedAutoScroll = await AsyncStorage.getItem('autoScrollEnabled');
          if (savedAutoScroll === 'true') {
            setIsAutoScrollEnabled(true);
            console.log('Auto-scroll enabled from saved preference');
          }
        } catch (err) {
          console.error('Error loading auto-scroll preference:', err);
        }
        
        // Load videos
      loadVideos(true);
      initRef.current = true;
    }
    };
    
    loadInitialData();
  }, [loadVideos]);
  
  // Configure auto-scroll animation
  useEffect(() => {
    const pulsateAnimation = () => {
      Animated.sequence([
        Animated.timing(autoScrollPulse, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true
        }),
        Animated.timing(autoScrollPulse, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true
        })
      ]).start(() => pulsateAnimation());
    };
    
    pulsateAnimation();
    
    return () => {
      autoScrollPulse.stopAnimation();
    };
  }, [autoScrollPulse]);
  
  // Use useFocusEffect to handle tab focus changes - MOVED UP before any conditional returns
  useFocusEffect(
    useCallback(() => {
      console.log('Tab focused');
      setIsTabFocused(true);
      
      // Resume current video when tab is focused
      const currentVideo = videos[currentVideoIndex];
      if (currentVideo && videoRefs.current[currentVideo.id] && videoRefs.current[currentVideo.id].current) {
        videoRefs.current[currentVideo.id].current.playAsync().catch(() => {});
        videoRefs.current[currentVideo.id].current.setIsMutedAsync(false).catch(() => {});
      }

      return () => {
        console.log('Tab unfocused');
        setIsTabFocused(false);
        
        // Pause all videos and mute them when tab loses focus
        Object.values(videoRefs.current).forEach(videoRef => {
          if (videoRef && videoRef.current) {
            videoRef.current.pauseAsync().catch(() => {});
            videoRef.current.setIsMutedAsync(true).catch(() => {});
          }
        });
      };
    }, [currentVideoIndex, videos])
  );
  
  const onViewableItemsChangedRef = useRef((info: ViewableItemsInfo) => {
    if (info.viewableItems.length > 0) {
      const index = info.viewableItems[0].index ?? 0;
      console.log('Changed to video index:', index);
      
      // If changing to a different video, force close comments on previous video
      if (index !== currentVideoIndex && videos.length > 0) {
        const prevVideo = videos[currentVideoIndex];
        if (prevVideo) {
          // Set flag to force close comments for the video we're leaving
          setForceCloseCommentsFlags(prev => ({
            ...prev,
            [prevVideo.id]: true
          }));
          
          // Reset the flag after a short delay
          setTimeout(() => {
            setForceCloseCommentsFlags(prev => ({
              ...prev,
              [prevVideo.id]: false
            }));
          }, 500);
        }
        
        // Immediately stop previous video with audio fade
        if (prevVideo && videoRefs.current[prevVideo.id] && videoRefs.current[prevVideo.id].current) {
          // Use our audio fade function instead of direct stopAsync
          stopVideoWithAudioFade(prevVideo.id);
        }
        
        // Preload upcoming videos (next 2)
        for (let i = 1; i <= 2; i++) {
          const nextVideoIndex = index + i;
          if (videos.length > nextVideoIndex) {
            const nextVideo = videos[nextVideoIndex];
            if (nextVideo) {
              preloadVideo(nextVideo.id, nextVideo.url);
            }
          }
        }
      }
      
      setCurrentVideoIndex(index);
    }
  });
  
  // Reset video position helper function
  const resetVideoPosition = (videoId: string) => {
    const videoRef = videoRefs.current[videoId];
    if (videoRef && typeof videoRef.resetPosition === 'function') {
      videoRef.resetPosition();
    }
  };
  
  // Load more videos when reaching the end
  const handleEndReached = () => {
    // Only load more if:
    // 1. We're not already loading more videos
    // 2. We have more videos to load according to hasMoreVideos flag
    // 3. We have at least one video loaded 
    if (!loadingMore && hasMoreVideos && videos.length > 0) {
      console.log('End of list reached, loading more videos...');
      loadVideos();
    } else if (!hasMoreVideos && videos.length > 0) {
      // Show a toast or message that we've reached the end
      console.log('You have reached the end of available videos');
    }
  };
  
  // Add pull-to-refresh functionality
  const handleRefresh = () => {
    loadVideos(true);
  };
  
  // Handle header tab navigation
  const handleTabPress = (tab: string, index: number) => {
    // If Videos tab is pressed, always refresh videos
    if (tab === 'Videos') {
      console.log('Videos tab pressed, refreshing videos...');
      loadVideos(true);
      setActiveHeaderTab(index);
      return;
    }
    
    setActiveHeaderTab(index);
    
    // Navigate to the appropriate screen based on the tab
    if (tab === 'Videos') {
      // Already on videos screen
      return;
    }
    
    // Create pathname object for router navigation
    const routeMap: Record<string, string> = {
      'Feed': '/(tabs)/feed',  // Updated to use tab structure for Feed
      'Points': '/(tabs)/points-about',
      'Search': '/search'
    };
    
    const path = routeMap[tab];
    if (path) {
      router.push(path as any);
    }
  };
  
  // Handle closing premium ad with different behaviors
  const handleClosePremiumAd = (shouldAdvanceToNextVideo: boolean = false) => {
    // Animate modal out
    Animated.parallel([
      Animated.timing(premiumModalScale, {
        toValue: 0.3,
        duration: 200,
        useNativeDriver: true
      }),
      Animated.timing(premiumModalOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      })
    ]).start(() => {
      setShowPremiumAd(false);
      premiumAdRef.current = false;
      
      if (shouldAdvanceToNextVideo) {
        // Advance to the next video
        const nextIndex = currentVideoIndex + 1;
        if (nextIndex < videos.length) {
          // Wait a brief moment before scrolling to ensure modal is fully closed
          setTimeout(() => {
            if (flatListRef.current) {
              // Preload the next video if possible
              const nextVideo = videos[nextIndex];
              if (nextVideo && !preloadedVideos.current.has(nextVideo.id)) {
                try {
                  if (videoRefs.current[nextVideo.id] && 
                      videoRefs.current[nextVideo.id].current) {
                    videoRefs.current[nextVideo.id].current.loadAsync(
                      { uri: nextVideo.url },
                      { shouldPlay: false, isMuted: true },
                      false
                    ).catch(() => {
                      console.log('Error preloading video');
                    });
                    
                    // Mark as preloaded
                    preloadedVideos.current.add(nextVideo.id);
                  }
                } catch (error) {
                  console.error('Error in preload:', error);
                }
              }
              
              // Scroll to the next video
              flatListRef.current.scrollToIndex({
                index: nextIndex,
                animated: true,
                viewPosition: 0
              });
              
              // Start playing the next video after a delay to ensure it's visible
              setTimeout(() => {
                const nextVideo = videos[nextIndex];
                if (nextVideo && videoRefs.current[nextVideo.id] && videoRefs.current[nextVideo.id].current) {
                  videoRefs.current[nextVideo.id].current.playAsync()
                    .catch(() => console.log('Error playing next video'));
                }
              }, 500); // Wait slightly longer than scroll animation
            }
          }, 300);
        }
      } else {
        // Resume current video after ad is closed
      const currentVideo = videos[currentVideoIndex];
      if (currentVideo && videoRefs.current[currentVideo.id] && videoRefs.current[currentVideo.id].current) {
        videoRefs.current[currentVideo.id].current.playAsync().catch(() => {});
        }
      }
    });
  };

  // Separate handlers for modal events to maintain correct types
  const handleModalRequestClose = () => {
    handleClosePremiumAd(false);
  };

  const handleOverlayPress = () => {
    handleClosePremiumAd(false);
  };

  const handleSubscribePress = () => {
    handleClosePremiumAd(false);
  };

  // Continue watching should NOT advance to next video
  const handleContinueWatchingPress = () => {
    // Close the premium ad without advancing to next video
    handleClosePremiumAd(false);
  };
  
  // Track the last time home tab was tapped for double-tap detection
  const lastHomeTapRef = useRef<number>(0);
  
  // Listen for tab press events to detect double-tapping on home tab
  useEffect(() => {
    const tabPressListener = DeviceEventEmitter.addListener('TAB_PRESS', (event) => {
      if (event?.tabName === 'index') { // 'index' is the home tab
        const now = Date.now();
        const timeSinceLastTap = now - lastHomeTapRef.current;
        
        // If last tap was less than 500ms ago, treat as double-tap
        if (timeSinceLastTap < 500 && timeSinceLastTap > 0) {
          console.log('Home tab double-tapped, refreshing videos...');
          loadVideos(true);
          
          // Vibrate to provide feedback (optional)
          if (Platform.OS === 'ios' || Platform.OS === 'android') {
            try {
              // @ts-ignore - Vibration is available on both platforms
              Vibration.vibrate(50);
            } catch (e) {
              console.log('Vibration not supported');
            }
          }
        }
        
        lastHomeTapRef.current = now;
      }
    });

      return () => {
      tabPressListener.remove();
    };
  }, [loadVideos]);
  
  // Also listen specifically for HOME_TAB_PRESSED events
  useEffect(() => {
    const homeTabPressListener = DeviceEventEmitter.addListener('HOME_TAB_PRESSED', () => {
      // Only refresh if:
      // 1. We're on the home screen (activeHeaderTab === 0)
      // 2. The tab is focused
      // 3. We're not in fullscreen mode
      if (activeHeaderTab === 0 && isTabFocused && !isFullScreen) {
        console.log('Home tab pressed while active on home screen, refreshing videos...');
        loadVideos(true);
      }
    });
    
    return () => {
      homeTabPressListener.remove();
    };
  }, [loadVideos, activeHeaderTab, isTabFocused, isFullScreen]);
  
  // Add handlers to update comments open/closed state
  const handleCommentsOpened = useCallback(() => {
    setIsCommentsOpen(true);
  }, []);

  const handleCommentsClosed = useCallback(() => {
    setIsCommentsOpen(false);
  }, []);
  
  // Render video item
  const renderVideo = ({ item, index }: { item: VideoItem; index: number }) => (
    <VideoItemComponent
      key={item.id}
      item={item}
      isCurrentVideo={index === currentVideoIndex}
      onVideoRef={handleVideoRef}
      isLocked={showLockedVideo && index > 1}
      autoScroll={isAutoScrollEnabled}
      toggleAutoScroll={toggleAutoScroll}
      autoScrollPulse={autoScrollPulse}
      showPremiumAd={showPremiumAd}
      isTabFocused={isTabFocused}
      isFullScreen={isFullScreen}
      toggleFullScreen={toggleFullScreen}
      router={router}
      forceCloseComments={forceCloseCommentsFlags[item.id] || false}
      onCommentsOpened={handleCommentsOpened}
      onCommentsClosed={handleCommentsClosed}
    />
  );
  
  // Render loading state
  if (isLoading && videos.length === 0) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#0070F3" />
        <Text style={styles.loadingText}>Loading videos...</Text>
      </View>
    );
  }
  
  return (
    <View style={[
      styles.container,
      isFullScreen && styles.fullScreenContainer
    ]}>
      {/* Header with navigation tabs */}
      <TopHeader 
        activeTab={activeHeaderTab} 
        onTabPress={handleTabPress} 
        isFullScreen={isFullScreen}
        points={user?.points || 0}
        onAddPress={handleAddPress}
        onSearchPress={handleSearchPress}
      />
      
      <FlatList
        ref={flatListRef}
        data={videos}
        renderItem={renderVideo}
        keyExtractor={(item) => item.id}
        pagingEnabled
        snapToInterval={AVAILABLE_HEIGHT}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChangedRef.current}
        viewabilityConfig={{
          itemVisiblePercentThreshold: 50,  // Only use this threshold setting
          waitForInteraction: false
        }}
        initialNumToRender={3}
        maxToRenderPerBatch={2}
        windowSize={5} // Increased to ensure more videos are rendered in memory
        removeClippedSubviews={false} // Changed to false to prevent video unloading issues
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        snapToAlignment="start"
        bounces={false}
        disableIntervalMomentum={true}
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
          autoscrollToTopThreshold: 10,
        }}
        ListFooterComponent={
          loadingMore ? (
          <View style={styles.loadMoreContainer}>
            <ActivityIndicator size="small" color="#0070F3" />
            <Text style={styles.loadMoreText}>Loading more videos...</Text>
          </View>
          ) : !hasMoreVideos && videos.length > 0 ? (
            <View style={styles.endOfListContainer}>
              <Text style={styles.endOfListText}>You've seen all available videos</Text>
              <Pressable style={styles.refreshButton} onPress={() => loadVideos(true)}>
                <RefreshCw color="#fff" size={20} />
                <Text style={styles.refreshButtonText}>Refresh for new content</Text>
              </Pressable>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No videos found</Text>
            <Pressable style={styles.refreshButton} onPress={() => loadVideos(true)}>
              <RefreshCw color="#fff" size={20} />
              <Text style={styles.refreshButtonText}>Refresh</Text>
            </Pressable>
          </View>
        }
        scrollEnabled={!isCommentsOpen}  // Add this line
      />
      
      {/* Show spinner when loading more videos */}
      {loadingMore && videos.length > 0 && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#0070F3" />
        </View>
      )}
      
      {/* Refresh indicator that appears when refreshing through tab navigation */}
      {showRefreshIndicator && (
        <Animated.View 
          style={[
            styles.refreshIndicator,
            { opacity: refreshIndicatorOpacity }
          ]}
        >
          <RefreshCw color="#fff" size={24} />
          <Text style={styles.refreshIndicatorText}>Refreshing videos...</Text>
        </Animated.View>
      )}
      
      {/* Premium subscription advertisement */}
      {showPremiumAd && (
        <Modal
          animationType="none"
          transparent={true}
          visible={showPremiumAd}
          onRequestClose={handleModalRequestClose}
          statusBarTranslucent={true}
        >
          <Pressable 
            style={styles.premiumModalOverlay}
            onPress={handleOverlayPress}
          >
            <Animated.View 
              style={[
                styles.premiumModalContent,
                {
                  transform: [{ scale: premiumModalScale }],
                  opacity: premiumModalOpacity
                }
              ]}
            >
              <Pressable onPress={(e) => e.stopPropagation()}>
                <LinearGradient
                  colors={['#1a1a2e', '#16213e', '#0f3460']}
                  style={styles.premiumGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.premiumHeader}>
                    <View style={styles.premiumCrownContainer}>
                      <Crown color="#ffb703" size={SCREEN_WIDTH * 0.06} fill="#ffb703" />
                    </View>
                    <Text style={styles.premiumModalTitle}>Upgrade to Premium</Text>
                  </View>
                  
                  <View style={styles.premiumModalIconContainer}>
                    <View style={styles.premiumIconCircle}>
                      <PlayCircle 
                        color="#1877F2" 
                        size={Math.min(SCREEN_WIDTH * 0.15, SCREEN_HEIGHT * 0.08)} 
                        fill="rgba(24, 119, 242, 0.2)" 
                      />
                    </View>
                  </View>
                  
                  <Text style={styles.premiumModalHeading}>Enjoy an Ad-Free Experience</Text>
                  
                  <ScrollView 
                    style={styles.premiumScrollView}
                    contentContainerStyle={styles.premiumScrollContent}
                    showsVerticalScrollIndicator={false}
                    scrollEventThrottle={16}
                    decelerationRate="fast"
                    bounces={false}
                  >
                    <View style={styles.premiumFeaturesList}>
                      <View style={styles.premiumFeatureItem}>
                        <View style={styles.premiumCheckCircle}>
                          <CheckCircle color="#1877F2" size={SCREEN_WIDTH * 0.04} />
                        </View>
                        <Text style={styles.premiumFeatureText}>Unlimited video streaming</Text>
                      </View>
                      
                      <View style={styles.premiumFeatureItem}>
                        <View style={styles.premiumCheckCircle}>
                          <CheckCircle color="#1877F2" size={SCREEN_WIDTH * 0.04} />
                        </View>
                        <Text style={styles.premiumFeatureText}>No interruptions</Text>
                      </View>
                      
                      <View style={styles.premiumFeatureItem}>
                        <View style={styles.premiumCheckCircle}>
                          <CheckCircle color="#1877F2" size={SCREEN_WIDTH * 0.04} />
                        </View>
                        <Text style={styles.premiumFeatureText}>HD video quality</Text>
                      </View>
                      
                      <View style={styles.premiumFeatureItem}>
                        <View style={styles.premiumCheckCircle}>
                          <CheckCircle color="#1877F2" size={SCREEN_WIDTH * 0.04} />
                        </View>
                        <Text style={styles.premiumFeatureText}>Download videos for offline viewing</Text>
                      </View>
                    </View>
                    
                    <View style={styles.premiumPriceSection}>
                      <Text style={styles.premiumPriceLabel}>Starting at</Text>
                      <View style={styles.premiumPriceRow}>
                        <Text style={styles.premiumPriceAmount}>$4.99</Text>
                        <Text style={styles.premiumPricePeriod}>/month</Text>
                      </View>
                    </View>
                  </ScrollView>
                  
                  <View style={styles.premiumButtonsContainer}>
                    <LinearGradient
                      colors={['#1877F2', '#0056D1']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.premiumSubscribeButton}
                    >
                      <Pressable 
                        style={({ pressed }) => [
                          styles.premiumSubscribeButtonContent,
                          pressed && styles.premiumButtonPressed
                        ]}
                        onPress={handleSubscribePress}
                        android_ripple={{ color: 'rgba(255, 255, 255, 0.2)' }}
                      >
                        <Text style={styles.premiumSubscribeButtonText}>Subscribe Now</Text>
                      </Pressable>
                    </LinearGradient>
                    
                    <Pressable 
                      style={({ pressed }) => [
                        styles.premiumContinueButton,
                        pressed && styles.premiumButtonPressed
                      ]}
                      onPress={handleContinueWatchingPress}
                      android_ripple={{ color: 'rgba(255, 255, 255, 0.1)' }}
                    >
                      <Text style={styles.premiumContinueButtonText}>Continue Watching</Text>
                    </Pressable>
                  </View>
                </LinearGradient>
              </Pressable>
            </Animated.View>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  fullScreenContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    elevation: 1000,
  },
  // Add header styles
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: 'transparent',
    paddingTop: Platform.OS === 'ios' ? 0 : STATUS_BAR_HEIGHT,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 50,
  },
  // Add new styles for header elements
  headerTitle: {
    color: '#FFF',
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.3,
  },
  headerRightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(24, 119, 242, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  pointsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(24, 119, 242, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 10,
  },
  pointsText: {
    color: '#FFD700',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    marginLeft: 5,
  },
  
  // Keep existing tab styles for compatibility with other parts of the app
  headerTab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    position: 'relative',
  },
  headerTabText: {
    color: '#888',
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
  },
  headerTabTextActive: {
    color: '#1877F2',
    fontFamily: 'Inter_600SemiBold',
  },
  headerTabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    right: 16,
    height: 3,
    backgroundColor: '#1877F2',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  videoContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#000',
  },
  verticalContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#000',
  },
  horizontalContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  video: {
    backgroundColor: '#000',
  },
  horizontalVideoWrapper: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  verticalVideoWrapper: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#000',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  verticalOverlay: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20, // Safe area bottom padding
  },
  horizontalOverlay: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  videoInfo: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 80 : 60,
    left: SCREEN_WIDTH * 0.05,
    width: SCREEN_WIDTH * 0.65,
  },
  authorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SCREEN_HEIGHT * 0.01,
  },
  authorAvatar: {
    width: SCREEN_WIDTH * 0.1,
    height: SCREEN_WIDTH * 0.1,
    borderRadius: SCREEN_WIDTH * 0.05,
    marginRight: SCREEN_WIDTH * 0.02,
  },
  authorAvatarPlaceholder: {
    width: SCREEN_WIDTH * 0.1,
    height: SCREEN_WIDTH * 0.1,
    borderRadius: SCREEN_WIDTH * 0.05,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginRight: SCREEN_WIDTH * 0.02,
  },
  authorNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  authorVerifiedBadge: {
    marginLeft: 4,
    marginBottom: Platform.OS === 'ios' ? 2 : 0,
  },
  author: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginRight: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowRadius: 3,
  },
  description: {
    color: 'white',
    fontSize: SCREEN_WIDTH * 0.035,
    marginBottom: SCREEN_HEIGHT * 0.015,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
  },
  viewCountText: {
    color: 'white',
    fontSize: 13,
    marginLeft: 4,
    fontFamily: 'Inter_400Regular',
  },
  watchFullIconButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 16,
    padding: 8,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  watchFullButton: {
    display: 'none', // Hide the old button
  },
  watchFullButtonText: {
    display: 'none', // Hide the old button text
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#0070F3',
    fontSize: 16,
    marginTop: 10,
  },
  loadMoreContainer: {
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadMoreText: {
    color: '#AAA',
    marginTop: 8,
  },
  emptyContainer: {
    height: AVAILABLE_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#AAA',
    fontSize: 16,
    marginBottom: 16,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 10,
  },
  refreshButtonText: {
    color: '#AAA',
    fontSize: 14,
    marginLeft: 10,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtons: {
    position: 'absolute',
    right: SCREEN_WIDTH * 0.05,
    bottom: 0,
    alignItems: 'center',
    gap: SCREEN_HEIGHT * 0.025,
  },
  likeContainer: {
    alignItems: 'center',
    gap: SCREEN_HEIGHT * 0.02,
    marginBottom: SCREEN_HEIGHT * 0.01,
  },
  actionButton: {
    alignItems: 'center',
    gap: 4,
  },
  actionCount: {
    color: 'white',
    fontSize: SCREEN_WIDTH * 0.035,
    fontFamily: 'Inter_600SemiBold',
  },
  activeCount: {
    color: '#1877F2',
  },
  shareButton: {
    padding: SCREEN_WIDTH * 0.015,
  },
  points: {
    color: '#00ff00',
    fontSize: SCREEN_WIDTH * 0.04,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
  },
  buttonPopup: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -SCREEN_WIDTH * 0.4 }, { translateY: -100 }],
    width: SCREEN_WIDTH * 0.8,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  popupHeader: {
    color: 'white',
    fontSize: 16,
    marginBottom: 15,
  },
  replayButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
  },
  replayButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  watchedContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  pointsEarned: {
    position: 'absolute',
    top: -50,
    alignSelf: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 25,
    minWidth: 90,
    alignItems: 'center',
  },
  earnedPointsText: {
    color: '#00ff00',
    fontSize: 15,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowRadius: 3,
  },
  staticPoints: {
    position: 'absolute',
    top: -12,
    right: -50,
    width: 100,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  staticPointsText: {
    color: '#00ff00',
    fontSize: 15,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowRadius: 3,
  },
  autoScrollButton: {
    alignItems: 'center',
    marginTop: SCREEN_HEIGHT * 0.02,
    gap: 4
  },
  autoScrollButtonActive: {
    backgroundColor: 'transparent',
  },
  autoScrollText: {
    color: 'white',
    fontSize: SCREEN_WIDTH * 0.03,
    fontFamily: 'Inter_600SemiBold',
    marginTop: 2,
  },
  autoScrollTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 2,
  },
  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockedText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  countdownWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(24, 119, 242, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(24, 119, 242, 0.4)',
    gap: 8,
  },
  countdownDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1877F2',
    opacity: 0.9,
  },
  inlineCountdown: {
    color: '#1877F2',
    fontSize: SCREEN_WIDTH * 0.034,
    fontFamily: 'Inter_600SemiBold',
  },
  countdownLabel: {
    color: '#1877F2',
    fontSize: SCREEN_WIDTH * 0.03,
    fontFamily: 'Inter_400Regular',
    opacity: 0.85,
    letterSpacing: 0.5,
  },
  premiumModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingHorizontal: SCREEN_WIDTH * 0.05,
  },
  premiumModalContent: {
    width: Math.min(SCREEN_WIDTH * 0.9, 400),
    maxHeight: Math.min(SCREEN_HEIGHT * 0.8, 700),
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: '#1877F2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  premiumGradient: {
    padding: SCREEN_WIDTH * 0.06,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SCREEN_HEIGHT * 0.02,
    width: '100%',
  },
  premiumCrownContainer: {
    backgroundColor: 'rgba(255, 183, 3, 0.2)',
    borderRadius: 15,
    padding: 8,
    marginRight: 10,
  },
  premiumModalTitle: {
    color: 'white',
    fontSize: Math.min(SCREEN_WIDTH * 0.06, 28),
    fontWeight: 'bold',
    textAlign: 'center',
  },
  premiumModalIconContainer: {
    marginBottom: SCREEN_HEIGHT * 0.02,
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumIconCircle: {
    backgroundColor: 'rgba(24, 119, 242, 0.1)',
    borderRadius: 50,
    padding: 15,
    borderWidth: 2,
    borderColor: '#1877F2',
  },
  premiumModalHeading: {
    color: 'white',
    fontSize: Math.min(SCREEN_WIDTH * 0.045, 22),
    fontWeight: 'bold',
    marginBottom: SCREEN_HEIGHT * 0.02,
    textAlign: 'center',
  },
  premiumScrollView: {
    width: '100%',
    maxHeight: Math.min(SCREEN_HEIGHT * 0.35, 300),
  },
  premiumScrollContent: {
    paddingBottom: 15,
    paddingHorizontal: 5,
  },
  premiumFeaturesList: {
    width: '100%',
    marginBottom: SCREEN_HEIGHT * 0.02,
    paddingHorizontal: 5,
  },
  premiumFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  premiumCheckCircle: {
    backgroundColor: 'rgba(24, 119, 242, 0.2)',
    borderRadius: 20,
    padding: 5,
    marginRight: 15,
  },
  premiumFeatureText: {
    color: 'white',
    fontSize: Math.min(SCREEN_WIDTH * 0.04, 18),
    fontWeight: '500',
    flexShrink: 1,
  },
  premiumPriceSection: {
    alignItems: 'center',
    marginBottom: SCREEN_HEIGHT * 0.02,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    width: '100%',
  },
  premiumPriceLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: Math.min(SCREEN_WIDTH * 0.035, 16),
    marginBottom: 5,
  },
  premiumPriceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  premiumPriceAmount: {
    color: 'white',
    fontSize: Math.min(SCREEN_WIDTH * 0.08, 36),
    fontWeight: 'bold',
  },
  premiumPricePeriod: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: Math.min(SCREEN_WIDTH * 0.035, 16),
    marginBottom: 8,
    marginLeft: 2,
  },
  premiumButtonsContainer: {
    width: '100%',
    marginTop: SCREEN_HEIGHT * 0.01,
  },
  premiumSubscribeButton: {
    borderRadius: 30,
    width: '100%',
    marginBottom: 15,
    shadowColor: '#1877F2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 3,
  },
  premiumSubscribeButtonContent: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: Math.max(SCREEN_HEIGHT * 0.015, 12),
    paddingHorizontal: 25,
  },
  premiumButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }]
  },
  premiumSubscribeButtonText: {
    color: 'white',
    fontSize: Math.min(SCREEN_WIDTH * 0.045, 20),
    fontWeight: 'bold',
  },
  premiumContinueButton: {
    backgroundColor: 'transparent',
    paddingVertical: Math.max(SCREEN_HEIGHT * 0.015, 12),
    paddingHorizontal: 25,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  premiumContinueButtonText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: Math.min(SCREEN_WIDTH * 0.04, 18),
    fontWeight: '500',
  },
  fullscreenOverlay: {
    paddingBottom: Platform.OS === 'ios' ? 34 : 20, // Safe area bottom padding
  },
  fullscreenVideoInfo: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 80 : 60,
    left: SCREEN_WIDTH * 0.05,
    width: SCREEN_WIDTH * 0.65,
  },
  fullscreenAuthorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: SCREEN_HEIGHT * 0.01,
  },
  fullscreenAuthorText: {
    color: 'white',
    fontSize: SCREEN_WIDTH * 0.045,
    fontWeight: 'bold',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  fullscreenDescription: {
    color: 'white',
    fontSize: SCREEN_WIDTH * 0.035,
    marginBottom: SCREEN_HEIGHT * 0.015,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  fullscreenActionButtons: {
    position: 'absolute',
    right: SCREEN_WIDTH * 0.05,
    bottom: 0,
    alignItems: 'center',
    gap: SCREEN_HEIGHT * 0.025,
  },
  endOfListContainer: {
    padding: 40,
    justifyContent: 'center',
    alignItems: 'center',
    height: 200,
  },
  endOfListText: {
    color: '#AAA',
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  refreshIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    flexDirection: 'row',
    zIndex: 999,
  },
  refreshIndicatorText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  videoWrapper: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  
  commentButton: {
    alignItems: 'center',
    marginBottom: 16,
  },

  
  indicatorIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  
  indicatorText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  commentButtonContainer: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: 16,
  },
  discoveryDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1877F2',
  },
  indicatorArrow: {
    marginTop: 2,
  },
  commentIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  swipeUpIndicatorContainer: {
    position: 'absolute',
    bottom: 110,
    alignSelf: 'center',
    zIndex: 50,
  },
  swipeUpIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  swipeUpText: {
    color: 'white',
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '500',
  },
  deleteButton: {
    marginLeft: 'auto',
    padding: 6,
    backgroundColor: 'rgba(255, 77, 103, 0.1)',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreenButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    padding: 8,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});