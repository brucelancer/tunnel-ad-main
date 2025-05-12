import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  TextInput,
  FlatList,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Share as RNShare,
  ScrollView,
  useWindowDimensions,
  Alert,
  Modal,
  StatusBar as RNStatusBar,
  PanResponder,
  Keyboard,
  Easing,
  DeviceEventEmitter,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { 
  Heart, 
  Bookmark, 
  MessageCircle, 
  Share2, 
  Award, 
  ArrowLeft, 
  Send,
  MoreHorizontal,
  ThumbsUp,
  MapPin,
  UserCircle,
  CheckCircle,
  Trash2,
  AlertCircle,
  X,
  ZoomIn,
  ZoomOut,
  Smile,
  ChevronDown,
} from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { usePointsStore } from '@/store/usePointsStore';
// Import Sanity services
import { 
  getPostById, 
  toggleLikePost, 
  addComment, 
  toggleSavePost, 
  awardPoints,
  urlFor,
  getSanityClient 
} from '@/tunnel-ad-main/services/postService';
import { useSanityAuth } from '@/app/hooks/useSanityAuth';
import { usePostFeed } from '@/app/hooks/usePostFeed';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Import the StickyCommentInput component
import StickyCommentInput from '@/components/StickyCommentInput';

// Custom Verification Badge Component (using the same implementation as in Feed.tsx)
const TunnelVerifiedMark = ({ size = 10 }) => {
  const { width: windowWidth } = useWindowDimensions();
  
  // Make the badge size responsive to screen width
  const responsiveSize = Math.max(size, windowWidth * 0.025);
  
  return (
    <Svg width={responsiveSize * 1.5} height={responsiveSize * 1.5} viewBox="0 0 24 24" fill="none">
      {/* Simpler jagged/notched circle background */}
      <Path 
        d="M12 2L14 5.1L17.5 3.5L17 7.3L21 8L18.9 11L21 14L17 14.7L17.5 18.5L14 16.9L12 20L10 16.9L6.5 18.5L7 14.7L3 14L5.1 11L3 8L7 7.3L6.5 3.5L10 5.1L12 2Z" 
        fill="#1877F2" 
      />
      {/* Checkmark */}
      <Path 
        d="M10 13.17l-2.59-2.58L6 12l4 4 8-8-1.41-1.42L10 13.17z" 
        fill="#FFFFFF" 
        strokeWidth="0"
      />
    </Svg>
  );
};

// Mock data for the post details
const POST_DETAILS: PostWithRestrictions = {
  id: '1',
  user: {
    id: 'user1',
    name: 'Sarah Johnson',
    username: '@dancepro',
    avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
    isVerified: true,
    isBlueVerified: false
  },
  content: "Just learned these amazing new dance moves at today's workshop! Can't wait to practice more and share with everyone. The instructor was incredible and taught us some advanced choreography that I've been wanting to learn for months.",
  images: ['https://images.unsplash.com/photo-1519682337058-a94d519337bc'],
  location: 'Dance Studio 55, New York',
  timeAgo: '15 minutes ago',
  likes: 243,
  comments: 42,
  points: 28,
  hasLiked: false,
  hasSaved: false,
  commentRestrictions: {
    restricted: false,
    allowedUsers: []
  }
};

// Define a type for the comment
interface Comment {
  id: string;
  text: string;
  timeAgo?: string;
  likes?: number;
  createdAt?: string;
  _key?: string;
  _createdAt?: string;
  parentComment?: string | null;
  parentCommentId?: string | null;
  user?: {
    id: string;
    name: string;
    username: string;
    avatar: string;
    isVerified: boolean;
    isBlueVerified?: boolean;
  };
  // For Sanity data structure compatibility
  author?: {
    _id?: string;
    id?: string;
    name?: string;
    username?: string;
    avatar?: string;
    isVerified?: boolean;
    isBlueVerified?: boolean;
  };
}

// Add this after the imports but before the component declaration
interface PostWithRestrictions {
  id: any;
  _id?: any;
  content: any;
  location: any;
  timeAgo: any;
  likes: any;
  comments: any;
  points: any;
  hasLiked: any;
  hasSaved: any;
  user: {
    id: any;
    _id?: any;
    name: any;
    username: string;
    avatar: string;
    isVerified: any;
    isBlueVerified: any;
  };
  images: string[];
  rawComments?: any; // Make optional
  commentRestrictions?: {
    restricted: boolean;
    allowedUsers: string[];
  };
}

export default function PostDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { width: windowWidth } = useWindowDimensions();
  const { addPoints } = usePointsStore();
  const { user, loading, updateUserData } = useSanityAuth();
  const { getPost } = usePostFeed();
  
  // Helper function to clean text content by removing HTML comments
  const cleanContentText = (text: string): string => {
    if (!text) return '';
    // Remove any HTML comments from the text
    return text.replace(/<!--[\s\S]*?-->/g, '').trim();
  };
  
  // Debug authentication state
  useEffect(() => {
    console.log('Auth Debug - PostDetailScreen:', {
      hasUser: !!user,
      userId: user?._id,
      username: user?.username,
      authLoading: loading
    });
    
    // Check if we can find user in storage directly
    const checkStorage = async () => {
      try {
        const userStr = await AsyncStorage.getItem('user');
        const sanityUserStr = await AsyncStorage.getItem('sanity_user');
        console.log('Storage Debug:', {
          hasUserInStorage: !!userStr,
          hasSanityUserInStorage: !!sanityUserStr,
          userLength: userStr ? userStr.length : 0,
          sanityUserLength: sanityUserStr ? sanityUserStr.length : 0
        });
        
        // If user is not available in hook but is in storage, sync it
        if (!user && userStr) {
          try {
            const storedUser = JSON.parse(userStr);
            console.log('Found user in storage but not in hook, syncing:', storedUser._id);
            if (updateUserData && storedUser._id) {
              updateUserData(storedUser);
            } else {
              console.warn('Cannot sync user: updateUserData not available or invalid user data');
            }
          } catch (parseErr) {
            console.error('Error parsing stored user:', parseErr);
          }
        }
      } catch (err) {
        console.error('Error checking storage:', err);
      }
    };
    
    checkStorage();
  }, [user, loading, updateUserData]);
  
  // State
  const [post, setPost] = useState<PostWithRestrictions>(POST_DETAILS);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLiked, setIsLiked] = useState(post.hasLiked);
  const [isSaved, setIsSaved] = useState(post.hasSaved);
  const [commentText, setCommentText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCommentsInput, setShowCommentsInput] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // For real-time updates
  const [isSubscribed, setIsSubscribed] = useState(false);
  const subscriptionRef = useRef<any>(null);
  
  // Add states for comment restrictions and post deletion
  const [isPostAuthor, setIsPostAuthor] = useState(false);
  const [commentsRestricted, setCommentsRestricted] = useState(false);
  const [allowedCommentUsers, setAllowedCommentUsers] = useState<string[]>([]);
  const [isDeletePostModalVisible, setIsDeletePostModalVisible] = useState(false);
  const [isDeletingPost, setIsDeletingPost] = useState(false);
  
  // Animations
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 60, 90],
    outputRange: [0, 0.7, 1],
    extrapolate: 'clamp',
  });
  
  // Add to state
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [imageScale, setImageScale] = useState(1);
  const pinchRef = useRef(new Animated.Value(1)).current;
  
  // Add this variable for tracking slide gesture
  const slideThreshold = 100; // How far user needs to slide to dismiss
  const slidePosition = useRef(new Animated.Value(0)).current;
  
  // Create PanResponder for slide-down gesture
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to vertical gestures
        return Math.abs(gestureState.dy) > Math.abs(gestureState.dx * 3);
      },
      onPanResponderGrant: () => {
        // When the gesture starts, make sure we're not interrupting zoomed view
        if (imageScale > 1.1) {
          return false;
        }
      },
      onPanResponderMove: (_, gestureState) => {
        // Only allow downward movement and only when not zoomed in
        if (gestureState.dy > 0 && imageScale <= 1.1) {
          slidePosition.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        // If the user swiped down far enough, close the modal
        if (gestureState.dy > slideThreshold && imageScale <= 1.1) {
          closeImageViewer();
        }
        
        // Otherwise, animate back to the starting position
        Animated.spring(slidePosition, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    })
  ).current;
  
  // Add this variable for keyboard handling
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  
  // Add this effect for keyboard handling
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);
  
  // Add to the state variables section
  const [replyingTo, setReplyingTo] = useState<{
    id: string,
    username: string,
    _key?: string
  } | null>(null);
  
  // Add this state to track which comment threads are expanded
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  
  // Add at the top with other refs
  const replyAnimations = useRef<Record<string, Animated.Value>>({});
  
  // Get or create animation value for a comment
  const getReplyAnimation = (commentId: string) => {
    const id = commentId || 'default';
    if (!replyAnimations.current[id]) {
      replyAnimations.current[id] = new Animated.Value(0);
    }
    return replyAnimations.current[id];
  };
  
  // Update toggleRepliesVisibility to animate
  const toggleRepliesVisibility = (commentId: string) => {
    const isExpanded = expandedComments[commentId];
    
    // Update state
    setExpandedComments(prev => ({
      ...prev,
      [commentId]: !isExpanded
    }));
    
    // Run animation
    const animation = getReplyAnimation(commentId);
    Animated.timing(animation, {
      toValue: isExpanded ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    }).start();
    
    // Add haptic feedback for a polished feel
    if (Platform.OS !== 'web') {
      try {
        const impactAsync = require('expo-haptics').impactAsync;
        const ImpactFeedbackStyle = require('expo-haptics').ImpactFeedbackStyle;
        impactAsync(ImpactFeedbackStyle.Light);
      } catch (e) {
        // Ignore errors if haptics not available
      }
    }
  };
  
  // Fetch post data from Sanity using the usePostFeed hook
  const fetchPostData = async () => {
    if (!params.id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`Fetching post detail for ID: ${params.id}`);
      // Use the getPost function from usePostFeed
      const postData = await getPost(params.id as string);
      
      if (postData) {
        console.log(`Post data successfully retrieved: ${postData.id}`);
        console.log("Post data structure:", JSON.stringify(postData, null, 2));
        
        // Fetch full post data including comment restrictions directly from Sanity
        try {
          const client = getSanityClient();
          const fullPostData = await client.fetch(
            `*[_type == "post" && _id == $postId][0] {
              _id,
              commentRestrictions
            }`,
            { postId: postData._id || postData.id }
          );
          
          console.log("Full post data with restrictions:", fullPostData);
          
          // Check if comments are restricted
          if (fullPostData && fullPostData.commentRestrictions) {
              setCommentsRestricted(fullPostData.commentRestrictions.restricted || false);
              setAllowedCommentUsers(fullPostData.commentRestrictions.allowedUsers || []);
          }
          
          // Check if the current user is the post author
          if (user && user._id && postData.user && (postData.user.id === user._id || postData.user._id === user._id)) {
            setIsPostAuthor(true);
            console.log("Current user is the post author");
          } else {
            setIsPostAuthor(false);
            console.log("Current user is NOT the post author");
          }
          
          // Set the post data
          setPost({
            ...postData,
            commentRestrictions: fullPostData && fullPostData.commentRestrictions ? 
              fullPostData.commentRestrictions : 
              { restricted: false, allowedUsers: [] }
          });
          
        } catch (err) {
          console.error('Error fetching full post data:', err);
          // Fall back to basic post data
          setPost(postData);
        }
        
        // Safely handle comments
        try {
          // Check for rawComments in the post data first
          const commentsToProcess = postData.rawComments && postData.rawComments.length > 0 
            ? postData.rawComments 
            : postData.comments;
          
          // Log what's in postData.comments
          console.log("Raw comments data:", commentsToProcess);
          console.log("Comments type:", typeof commentsToProcess);
          console.log("Is comments array:", Array.isArray(commentsToProcess));
          
          let processedComments = [];
          
          if (Array.isArray(commentsToProcess) && commentsToProcess.length > 0) {
            console.log(`Processing ${commentsToProcess.length} comments from Sanity`);
            
            // Transform Sanity comments to our format
            processedComments = commentsToProcess.map((comment: any, index: number) => {
              // Make sure we have a valid ID
              const commentId = comment._key || `comment-${index}`;
              
              console.log(`Processing comment ${commentId}, raw data:`, comment);
              
              // Extract author/user info
              const commentAuthor = comment.author || {};
              const authorName = commentAuthor.username || 
                              `${commentAuthor.firstName || ''} ${commentAuthor.lastName || ''}`.trim() || 
                              comment.authorName || 
                              'Unknown User';
              
              // Handle likes - it can be an array or a count
              let likesCount = 0;
              if (comment && comment.likes) {
                if (Array.isArray(comment.likes)) {
                  likesCount = comment.likes.length;
                } else if (typeof comment.likes === 'number') {
                  likesCount = comment.likes;
                }
              }
              
              // Process a timestamp that is guaranteed to be valid
              const processTimestamp = (timestamp: any) => {
                if (!timestamp) return new Date().toISOString();
                try {
                  const date = new Date(timestamp);
                  // Verify we got a valid date
                  return !isNaN(date.getTime()) ? timestamp : new Date().toISOString();
                } catch (e) {
                  console.log('Invalid timestamp format:', timestamp);
                  return new Date().toISOString();
                }
              };

              // Store a valid createdAt timestamp
              const createdAt = processTimestamp(comment._createdAt || comment.createdAt);

              return {
                id: commentId,
                _key: comment._key, // Store original key for reference
                text: comment.text || '',
                timeAgo: comment.timeAgo || calculateTimeAgo(createdAt),
                likes: likesCount,
                createdAt: createdAt,
                _createdAt: createdAt, // Add this for consistency
                parentComment: comment.parentComment || null, // Store the parent comment reference
                parentCommentId: comment.parentComment || null, // Also store as parentCommentId for consistency
                user: {
                  id: commentAuthor._id || 'unknown',
                  name: authorName,
                  username: commentAuthor.username || 'user',
                  avatar: commentAuthor.avatar || 
                         (commentAuthor.profile?.avatar ? urlFor(commentAuthor.profile.avatar).url() : 'https://via.placeholder.com/150'),
                  isVerified: commentAuthor.isVerified || false,
                  isBlueVerified: commentAuthor.isBlueVerified || false
                }
              };
            });
            
            // Sort comments by creation date (newest first)
            processedComments.sort((a: any, b: any) => {
              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });
            
            console.log(`Processed ${processedComments.length} comments for UI`);
            setComments(processedComments);
          } else {
            console.log("No comments available");
            setComments([]);
          }
        } catch (commentError) {
          console.error("Error processing comments:", commentError);
          console.log("No comments set due to error");
          setComments([]);
        }
        
        setIsLiked(postData.hasLiked || false);
        setIsSaved(postData.hasSaved || false);
        
        // Subscribe to real-time updates after initial fetch
        subscribeToComments(postData._id || postData.id);
      } else {
        // Fallback to mock data if post not found in Sanity
        console.log('Post not found in Sanity, using mock data');
        setError(null);
        // Initialize with empty comments
        setComments([]);
      }
    } catch (err) {
      console.error('Error fetching post:', err);
      // Using mock data as fallback
      console.log('Using mock data due to error');
      setComments([]);
      setError(null);
    } finally {
      setIsLoading(false);
      
      // Auto-focus on comments if requested
      if (params.showComments === 'true') {
        setShowCommentsInput(true);
      }
      
      // Add handling for reply parameters
      if (params.replyToUser && params.replyToCommentId) {
        // Set up the reply with the username and comment ID
        setReplyingTo({
          id: params.replyToCommentId as string,
          username: params.replyToUser as string
        });
        
        // Pre-populate the comment field with the @username mention
        setCommentText(`@${params.replyToUser as string} `);
        
        // Show the comment input section
        setShowCommentsInput(true);
      }
    }
  };
  
  // Subscribe to real-time comment updates
  const subscribeToComments = (postId: string) => {
    if (!postId || isSubscribed) return;
    
    try {
      // Get the Sanity client
      const client = getSanityClient();
      
      // Create a GROQ query that listens for changes to the post document
      const query = `*[_type == "post" && _id == $postId] {
        _id,
        comments[] {
          _key,
          text,
          _createdAt,
          authorName,
          likes,
          parentComment,
          author-> {
            _id,
            username,
            firstName,
            lastName,
            profile {
              avatar
            },
            "isVerified": username == "admin" || username == "moderator"
          }
        },
        likesCount,
        commentsCount,
        points,
        commentRestrictions
      }`;
      
      // Subscribe to changes
      subscriptionRef.current = client
        .listen(query, { postId })
        .subscribe({
          next: (update: any) => {
            // Handle incoming update
            console.log('Real-time update received:', update);
            
            if (update.result && update.result.length > 0) {
              const updatedPost = update.result[0];
              
              // Update comment restrictions if changed
              if (updatedPost.commentRestrictions) {
                setCommentsRestricted(updatedPost.commentRestrictions.restricted || false);
                setAllowedCommentUsers(updatedPost.commentRestrictions.allowedUsers || []);
                
                // Update the post state to include comment restrictions
                setPost(prev => ({
                  ...prev,
                  commentRestrictions: updatedPost.commentRestrictions
                }));
              } else {
                setCommentsRestricted(false);
                setAllowedCommentUsers([]);
                
                // Update the post state to remove comment restrictions
                setPost(prev => ({
                  ...prev,
                  commentRestrictions: { restricted: false, allowedUsers: [] }
                }));
              }
              
              // Process comment data to match our format
              if (updatedPost.comments && updatedPost.comments.length > 0) {
                try {
                  console.log("Received real-time update with comments:", updatedPost.comments.length);
                  
                  // Transform Sanity comments to our format - use the same logic as in fetchPostData
                  const processedComments = updatedPost.comments.map((comment: any, index: number) => {
                    // Make sure we have a valid ID
                    const commentId = comment._key || `comment-${index}`;
                    
                    console.log(`Processing RT comment ${commentId}, raw data:`, comment);
                    
                    // Extract author/user info
                    const commentAuthor = comment.author || {};
                    const authorName = commentAuthor.username || 
                                     `${commentAuthor.firstName || ''} ${commentAuthor.lastName || ''}`.trim() || 
                                     comment.authorName || 
                                     'Unknown User';
                    
                    // Handle likes - it can be an array or a count
                    let likesCount = 0;
                    if (comment && comment.likes) {
                      if (Array.isArray(comment.likes)) {
                        likesCount = comment.likes.length;
                      } else if (typeof comment.likes === 'number') {
                        likesCount = comment.likes;
                      }
                    }
                    
                    // Process a timestamp that is guaranteed to be valid
                    const processTimestamp = (timestamp: any) => {
                      if (!timestamp) return new Date().toISOString();
                      try {
                        const date = new Date(timestamp);
                        // Verify we got a valid date
                        return !isNaN(date.getTime()) ? timestamp : new Date().toISOString();
                      } catch (e) {
                        console.log('Invalid timestamp format:', timestamp);
                        return new Date().toISOString();
                      }
                    };

                    // Store a valid createdAt timestamp
                    const createdAt = processTimestamp(comment._createdAt || comment.createdAt);

                    return {
                      id: commentId,
                      _key: comment._key, // Store original key for reference
                      text: comment.text || '',
                      timeAgo: comment.timeAgo || calculateTimeAgo(createdAt),
                      likes: likesCount,
                      createdAt: createdAt,
                      _createdAt: createdAt, // Add this for consistency
                      parentComment: comment.parentComment || null, // Store the parent comment reference
                      parentCommentId: comment.parentComment || null, // Also store as parentCommentId for consistency
                      user: {
                        id: commentAuthor._id || 'unknown',
                        name: authorName,
                        username: commentAuthor.username || 'user',
                        avatar: commentAuthor.avatar || 
                               (commentAuthor.profile?.avatar ? urlFor(commentAuthor.profile.avatar).url() : 'https://via.placeholder.com/150'),
                        isVerified: commentAuthor.isVerified || false,
                        isBlueVerified: commentAuthor.isBlueVerified || false
                      }
                    };
                  });
                  
                  // Sort comments by creation date (newest first)
                  processedComments.sort((a: any, b: any) => {
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                  });
                  
                  console.log(`Processed ${processedComments.length} comments from real-time update`);
                  setComments(processedComments);
                  
                  // Update post data if available
                  if (updatedPost.commentsCount !== undefined) {
                    setPost(prev => ({
                      ...prev,
                      comments: updatedPost.commentsCount
                    }));
                  } else {
                    setPost(prev => ({
                      ...prev,
                      comments: processedComments.length
                    }));
                  }
                } catch (error) {
                  console.error("Error processing comments:", error);
                }
              }
            }
          },
          error: (err: Error) => {
            console.error('Error in real-time subscription:', err);
          }
        });
      
      setIsSubscribed(true);
      console.log('Subscribed to real-time comments for post:', postId);
    } catch (err: any) {
      console.error('Failed to subscribe to real-time updates:', err);
    }
  };
  
  // Calculate how long ago a comment was posted
  const calculateTimeAgo = (timestamp: string) => {
    if (!timestamp) return 'Just now';
    
    try {
      const now = new Date();
      const commentDate = new Date(timestamp);
      
      // Check if date is valid
      if (isNaN(commentDate.getTime())) {
        console.log('Invalid date string:', timestamp);
        return 'Recently';
      }
      
      const seconds = Math.floor((now.getTime() - commentDate.getTime()) / 1000);
      
      if (seconds < 0) return 'Just now'; // Handle future dates
      
      if (seconds < 60) return 'Just now';
      
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
      
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
      
      const days = Math.floor(hours / 24);
      if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
      
      const months = Math.floor(days / 30);
      if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;
      
      const years = Math.floor(months / 12);
      return `${years} year${years === 1 ? '' : 's'} ago`;
    } catch (error) {
      console.error('Error calculating timeAgo:', error, 'for timestamp:', timestamp);
      return 'Recently';
    }
  };
  
  // Clean up subscription when component unmounts
  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        console.log('Unsubscribing from real-time updates');
        subscriptionRef.current.unsubscribe();
        setIsSubscribed(false);
      }
    };
  }, []);
  
  // Effects
  useEffect(() => {
    fetchPostData();
  }, [params.id, user, params.showComments, params.replyToUser, params.replyToCommentId]); // Include user as dependency
  
  // Handlers
  const handleLike = async () => {
    // Require authentication
    if (!user || !user._id) {
      Alert.alert("Authentication Required", "Please log in to like posts.");
      return;
    }

    // Optimistic UI update
    setIsLiked(!isLiked);
    setPost(prev => ({
      ...prev,
      likes: isLiked ? prev.likes - 1 : prev.likes + 1,
      hasLiked: !isLiked
    }));
    
    if (!isLiked) {
      addPoints(1);
    }
    
    // Try to update in Sanity with authenticated user
    try {
      console.log(`User ${user._id} toggling like on post ${(post as any)._id || post.id}`);
      const result = await toggleLikePost((post as any)._id || post.id, user._id);
      console.log("Like toggled successfully:", result);
    } catch (err) {
      console.error('Error liking post:', err);
      // Revert optimistic update if failed
      setIsLiked(isLiked);
      setPost(prev => ({
        ...prev,
        likes: isLiked ? prev.likes : prev.likes - 1,
        hasLiked: isLiked
      }));
      
      if (!isLiked) {
        addPoints(-1); // Refund the point
      }
      
      Alert.alert("Error", "Failed to like post. Please try again.");
    }
  };
  
  const handleSave = async () => {
    // Require authentication
    if (!user || !user._id) {
      Alert.alert("Authentication Required", "Please log in to save posts.");
      return;
    }

    // Optimistic UI update
    setIsSaved(!isSaved);
    setPost(prev => ({
      ...prev,
      hasSaved: !isSaved
    }));
    
    // Try to update in Sanity with authenticated user
    try {
      console.log(`User ${user._id} toggling save on post ${(post as any)._id || post.id}`);
      const result = await toggleSavePost((post as any)._id || post.id, user._id);
      console.log("Save toggled successfully:", result);
    } catch (err) {
      console.error('Error saving post:', err);
      // Revert optimistic update if failed
      setIsSaved(isSaved);
      setPost(prev => ({
        ...prev,
        hasSaved: isSaved
      }));
      
      Alert.alert("Error", "Failed to save post. Please try again.");
    }
  };
  
  const handleShare = async () => {
    try {
      const result = await RNShare.share({
        message: `${post.user.name} posted: ${post.content}`,
        title: 'Check out this post!',
      });
      
      if (result.action === RNShare.sharedAction) {
        addPoints(2);
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };
  
  const handleAwardPoints = async () => {
    if (!user || !user._id) {
      Alert.alert("Authentication Required", "Please log in to award points.");
      return;
    }

    // Optimistic UI update
    setPost(prev => ({
      ...prev,
      points: prev.points + 1
    }));
    
    // Deduct points from user's account
    addPoints(-1);
    
    // Try to update in Sanity with authenticated user
    try {
      console.log(`User ${user._id} awarding points to post ${(post as any)._id || post.id}`);
      await awardPoints((post as any)._id || post.id, 1, user._id);
      console.log("Points awarded successfully");
    } catch (err) {
      console.error('Error awarding points:', err);
      // Revert optimistic update if failed
      setPost(prev => ({
        ...prev,
        points: prev.points - 1
      }));
      addPoints(1); // Refund the point
      Alert.alert("Error", "Failed to award points. Please try again.");
    }
  };
  
  // Helper function to add a comment or reply
  const addCommentOrReply = async (text: string, parentKey?: string) => {
    if (!user || !user._id) return;
    
    try {
      // Get post ID
      const postId = (post as any)._id || post.id;
      
      console.log(`Adding ${parentKey ? 'reply' : 'comment'} to post ${postId}`);
      
      // Log parent info if this is a reply
      if (parentKey) {
        console.log(`This is a reply to comment with key: ${parentKey}`);
      }
      
      // Create a comment object for the Sanity patch operation
      const commentKey = `comment-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      // Create comment object
      const comment = {
        _key: commentKey,
        _type: 'object',
        text: text,
        _createdAt: new Date().toISOString(),
        likes: [],
        author: {
          _type: 'reference',
          _ref: user._id
        }
      };
      
      // Add parent comment reference if this is a reply
      if (parentKey) {
        // @ts-ignore - Add parentComment field
        comment.parentComment = parentKey;
      }
      
      // Get the Sanity client
      const client = getSanityClient();
      
      // Add comment directly using the client
      await client
        .patch(postId)
        .setIfMissing({ comments: [] })
        .append('comments', [comment])
        .inc({ commentsCount: 1 })
        .commit();
      
      console.log('Comment/reply added successfully');
      
      // Clear UI state - the real-time subscription will handle updating the UI
      setCommentText('');
      setReplyingTo(null);
      
      // Award points for commenting
      addPoints(2);
      
      return true;
    } catch (error) {
      console.error('Error adding comment/reply:', error);
      Alert.alert('Error', 'Failed to add comment. Please try again.');
      return false;
    }
  };
  
  // Update the handleCommentSubmit function to use our new helper
  const handleCommentSubmit = async () => {
    if (!commentText.trim()) return;
    
    // Require authentication
    if (!user || !user._id) {
      Alert.alert("Authentication Required", "Please log in to comment on posts.");
      setCommentText('');
      return;
    }
    
    // Check if comments are restricted
    if (commentsRestricted && !canUserComment()) {
      Alert.alert("Comments Closed", "The post owner has closed comments on this post.");
      setCommentText('');
      return;
    }

    // Create unique temp ID for the comment
    const tempId = `temp-${Date.now()}`;
    
    // Create author object from authenticated user using available properties
    const author = {
      id: user._id,
      name: user.username || 'User',
      username: user.username || 'user',
      avatar: user.profile?.avatar ? urlFor(user.profile.avatar).url() : 'https://via.placeholder.com/150',
      isVerified: false,
      isBlueVerified: false
    };

    // Create new comment with proper type for optimistic UI update
    const newComment = {
      id: tempId,
      _key: tempId, // Add _key for Sanity compatibility
      user: author,
      text: commentText,
      timeAgo: 'Just now',
      likes: 0,
      createdAt: new Date().toISOString(),
      _createdAt: new Date().toISOString(),
      parentComment: replyingTo?._key || null,
      parentCommentId: replyingTo?.id || null,
    };
    
    // Optimistic UI update - use try/catch to avoid any iteration issues
    try {
      setComments(prevComments => {
        const updatedComments = Array.isArray(prevComments) ? [newComment, ...prevComments] : [newComment];
        return updatedComments;
      });
      
      setPost(prev => ({
        ...prev,
        comments: prev.comments + 1
      }));
      
      // Call our helper function to add the comment/reply to Sanity
      const success = await addCommentOrReply(
        commentText, 
        replyingTo?._key // Pass parent key if replying
      );
      
      if (!success) {
        // Remove the temporary comment if it fails
        setComments(prevComments => 
          prevComments.filter(c => c.id !== tempId && c._key !== tempId)
        );
        
        setPost(prev => ({
          ...prev,
          comments: Math.max(0, prev.comments - 1)
        }));
        
        // Refund the points
        addPoints(-2);
      }
    } catch (error) {
      console.error('Error in comment submission:', error);
      Alert.alert('Error', 'Failed to add comment. Please try again.');
    }
  };
  
  const handleUserProfile = (userId: string) => {
    router.push({
      pathname: "/user-profile" as any,
      params: { id: userId }
    });
  };
  
  const handleLikeComment = (commentId: string) => {
    setComments(prev => 
      prev.map(comment => 
        comment.id === commentId 
          ? { ...comment, likes: (comment.likes || 0) + 1 } 
          : comment
      )
    );
  };
  
  // Add this function to check if the user can delete a comment
  const canDeleteComment = (commentUserId: string): boolean => {
    if (!user || !user._id) return false;
    
    // Users can delete their own comments
    if (commentUserId === user._id) return true;
    
    // Post owners can delete any comment on their post
    if (user._id === post.user.id) return true;
    
    return false;
  };

  // Add this function to handle the delete comment action
  const handleDeleteComment = (commentId: string) => {
    setCommentToDelete(commentId);
    setIsDeleteModalVisible(true);
  };

  // Add this function to confirm and execute comment deletion
  const confirmDeleteComment = async () => {
    if (!commentToDelete || !user || !user._id) return;
    
    setIsDeleting(true);
    try {
      // Get the Sanity client
      const client = getSanityClient();
      
      // First, fetch the current post document to check permissions
      const postData = await client.fetch(
        `*[_type == "post" && _id == $postId][0] {
          "postAuthorId": author._ref,
          "comment": comments[_key == $commentId][0] {
            "authorId": author._ref
          }
        }`,
        { postId: (post as any)._id || post.id, commentId: commentToDelete }
      );
      
      if (!postData || !postData.comment) {
        throw new Error('Comment not found');
      }
      
      // Check permissions
      const isCommentAuthor = postData.comment.authorId === user._id;
      const isPostAuthor = postData.postAuthorId === user._id;
      
      if (!isCommentAuthor && !isPostAuthor) {
        throw new Error('Unauthorized to delete this comment');
      }
      
      // Filter out the comment to delete
      await client
        .patch((post as any)._id || post.id)
        .unset([`comments[_key == "${commentToDelete}"]`])
        .dec({ commentsCount: 1 })
        .commit();
      
      // Update UI
      setComments(prevComments => 
        prevComments.filter(c => c.id !== commentToDelete && c._key !== commentToDelete)
      );
      
      setPost(prev => ({
        ...prev,
        comments: Math.max(0, prev.comments - 1)
      }));
      
      Alert.alert('Success', 'Comment deleted successfully');
    } catch (err) {
      console.error('Error deleting comment:', err);
      Alert.alert('Error', 'Failed to delete comment. Please try again.');
    } finally {
      setIsDeleting(false);
      setIsDeleteModalVisible(false);
      setCommentToDelete(null);
    }
  };
  
  // Add this function to handle opening the image viewer
  const handleImagePress = (index: number) => {
    setSelectedImageIndex(index);
    setImageScale(1);
    setImageViewerVisible(true);
  };

  // Add this function to handle zooming in/out
  const handleZoom = (zoomIn: boolean) => {
    const newScale = zoomIn ? imageScale + 0.5 : Math.max(0.5, imageScale - 0.5);
    setImageScale(newScale);
  };

  // Add this function to close the image viewer
  const closeImageViewer = () => {
    setImageViewerVisible(false);
    setImageScale(1);
  };
  
  const renderComment = ({ item: comment }: { item: Comment }) => {
    // Add debug output
    console.log('Rendering comment with ID:', comment?.id);
    console.log('Comment timeAgo:', comment?.timeAgo);
    console.log('Comment createdAt:', comment?.createdAt);
    
    // Skip if comment is invalid
    if (!comment || !comment.id) {
      console.log('Invalid comment detected, skipping render:', comment);
      return (
        <View style={styles.commentItem}>
          <View style={styles.commentContent}>
            <Text style={styles.commentText}>Invalid comment data</Text>
          </View>
        </View>
      );
    }
    
    try {
      // Handle both new (user) and legacy (author) formats
      const commentUser = comment.user || (comment.author ? {
        id: comment.author._id || comment.author.id || 'unknown',
        name: comment.author.name || comment.author.username || 'Unknown User',
        username: comment.author.username || 'user',
        avatar: comment.author.avatar || 'https://via.placeholder.com/150',
        isVerified: comment.author.isVerified || false,
        isBlueVerified: comment.author.isBlueVerified || false
      } : {
        id: 'unknown',
        name: 'Unknown User',
        username: 'user',
        avatar: 'https://via.placeholder.com/150',
        isVerified: false,
        isBlueVerified: false
      });

      console.log('Comment user data:', commentUser);

      // Determine if the current user can delete this comment
      const userCanDelete = canDeleteComment(commentUser.id);
      
      // Check if this is a reply to a parent comment
      const isReply = comment.parentCommentId || comment.parentComment;
      
      // Only render top-level comments here (replies will be rendered as children)
      if (isReply) {
        return null;
      }
      
      // Find replies to this comment
      const replies = comments.filter(reply => 
        (reply.parentCommentId === comment.id || reply.parentComment === comment.id || 
         reply.parentCommentId === comment._key || reply.parentComment === comment._key)
      );

      return (
        <View style={styles.commentItem}>
          <Pressable 
            style={{ marginRight: 12 }}
            onPress={() => handleUserProfile(commentUser.id)}
            hitSlop={5}
          >
            {commentUser.avatar ? (
              <Image 
                source={{ uri: commentUser.avatar }} 
                style={{ width: 36, height: 36, borderRadius: 18 }} 
              />
            ) : (
              <View style={{ 
                width: 36, 
                height: 36, 
                borderRadius: 18, 
                backgroundColor: '#333',
                alignItems: 'center', 
                justifyContent: 'center'
              }}>
                <UserCircle size={16} color="#666" />
              </View>
            )}
          </Pressable>
          
          <View style={styles.commentContent}>
            <View style={styles.commentHeader}>
              <View style={styles.commentUserInfo}>
                <Text style={styles.commentUserName}>
                  {(commentUser.username && commentUser.username.startsWith('@') 
                    ? commentUser.username.substring(1) 
                    : commentUser.username) || commentUser.name || 'Unknown User'}
                </Text>
                {(commentUser.isVerified || commentUser.isBlueVerified) && (
                  <View style={styles.verifiedBadgeContainer}>
                    <TunnelVerifiedMark size={16} />
                  </View>
                )}
                {commentUser.id === post.user.id && (
                  <View style={styles.authorBadge}>
                    <Text style={styles.authorBadgeText}>Author</Text>
                  </View>
                )}
              </View>
              <Text style={styles.commentTimeAgo}>
                {typeof comment.timeAgo === 'string' && !comment.timeAgo.includes('NaN') 
                  ? comment.timeAgo 
                  : (comment.createdAt ? calculateTimeAgo(comment.createdAt) : 'Recently')}
              </Text>
            </View>
            <Text style={styles.commentText}>{comment.text}</Text>
            <View style={styles.commentActions}>
              <Pressable 
                style={styles.commentActionButton}
                onPress={() => handleLikeComment(comment.id)}
              >
                <Heart size={14} color="#888" />
                <Text style={styles.commentActionText}>{comment.likes || 0}</Text>
              </Pressable>
              
              <Pressable 
                style={styles.commentActionButton}
                onPress={() => {
                  setReplyingTo({
                    id: comment.id,
                    username: commentUser.username || 'user',
                    _key: comment._key
                  });
                  setCommentText(`@${(commentUser.username && commentUser.username.startsWith('@') 
                    ? commentUser.username.substring(1) 
                    : commentUser.username) || 'user'} `);
                  setShowCommentsInput(true);
                }}
              >
                <MessageCircle size={14} color="#888" />
                <Text style={styles.commentActionText}>Reply</Text>
              </Pressable>
              
              {userCanDelete && (
                <Pressable 
                  style={styles.commentActionButton}
                  onPress={() => {
                    if (comment.id) {
                      handleDeleteComment(comment.id);
                    } else if (comment._key) {
                      handleDeleteComment(comment._key);
                    }
                  }}
                >
                  <Trash2 size={14} color="#888" />
                  <Text style={styles.commentActionText}>Delete</Text>
                </Pressable>
              )}
            </View>
            
            {/* Render replies for this comment */}
            {replies.length > 0 && (
              <View>
                {/* Show/Hide Replies Button with count */}
                <Pressable 
                  style={styles.showRepliesButton}
                  onPress={() => toggleRepliesVisibility(comment.id || comment._key || '')}
                >
                  <View style={styles.repliesCountBadge}>
                    <Text style={styles.repliesCountText}>{replies.length}</Text>
                  </View>
                  <Text style={[
                    styles.showRepliesText,
                    expandedComments[comment.id || comment._key || ''] && styles.showRepliesTextActive
                  ]}>
                    {expandedComments[comment.id || comment._key || ''] 
                      ? 'Hide replies' 
                      : `Show ${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}`}
                  </Text>
                  <Animated.View style={[
                    styles.chevronIcon,
                    {
                      transform: [{ 
                        rotate: getReplyAnimation(comment.id || comment._key || '').interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '180deg']
                        })
                      }]
                    }
                  ]}>
                    <ChevronDown size={16} color="#0070F3" />
                  </Animated.View>
                </Pressable>
                
                {/* Animated replies container */}
                <Animated.View style={[
                  styles.repliesWrapper,
                  {
                    opacity: getReplyAnimation(comment.id || comment._key || ''),
                    transform: [{
                      translateY: getReplyAnimation(comment.id || comment._key || '').interpolate({
                        inputRange: [0, 1],
                        outputRange: [-20, 0]
                      })
                    }, {
                      // Use scaleY instead of height
                      scaleY: getReplyAnimation(comment.id || comment._key || '')
                    }],
                    // Set a fixed height when closed to avoid layout issues
                    display: expandedComments[comment.id || comment._key || ''] ? 'flex' : 'none'
                  }
                ]}>
                  {replies.length > 0 && (
                    <View style={styles.repliesContainer}>
                      {replies.map(reply => (
                        <View key={reply.id || reply._key} style={styles.replyItem}>
                          <Pressable 
                            style={{ marginRight: 8 }}
                            onPress={() => handleUserProfile(reply.user?.id || 'unknown')}
                            hitSlop={5}
                          >
                            {reply.user?.avatar ? (
                              <Image 
                                source={{ uri: reply.user.avatar }} 
                                style={{ width: 28, height: 28, borderRadius: 14 }} 
                              />
                            ) : (
                              <View style={{ 
                                width: 28, 
                                height: 28, 
                                borderRadius: 14, 
                                backgroundColor: '#333',
                                alignItems: 'center', 
                                justifyContent: 'center'
                              }}>
                                <UserCircle size={14} color="#666" />
                              </View>
                            )}
                          </Pressable>
                          
                          <View style={styles.replyContent}>
                            <View style={styles.commentHeader}>
                              <View style={styles.commentUserInfo}>
                                <Text style={styles.replyUserName}>
                                  {(reply.user?.username && reply.user.username.startsWith('@') 
                                    ? reply.user.username.substring(1) 
                                    : reply.user?.username) || reply.user?.name || 'Unknown User'}
                                </Text>
                                {(reply.user?.isVerified || reply.user?.isBlueVerified) && (
                                  <View style={styles.verifiedBadgeContainer}>
                                    <TunnelVerifiedMark size={16} />
                                  </View>
                                )}
                                {reply.user?.id === post.user.id && (
                                  <View style={styles.authorBadge}>
                                    <Text style={[styles.authorBadgeText, { fontSize: 8 }]}>Author</Text>
                                  </View>
                                )}
                              </View>
                              <Text style={styles.replyTimeAgo}>
                                {typeof reply.timeAgo === 'string' && !reply.timeAgo.includes('NaN') 
                                  ? reply.timeAgo 
                                  : (reply.createdAt ? calculateTimeAgo(reply.createdAt) : 'Recently')}
                              </Text>
                            </View>
                            <Text style={styles.replyText}>{reply.text}</Text>
                            <View style={styles.replyActions}>
                              <Pressable 
                                style={styles.commentActionButton}
                                onPress={() => handleLikeComment(reply.id)}
                              >
                                <Heart size={12} color="#888" />
                                <Text style={styles.replyActionText}>{reply.likes || 0}</Text>
                              </Pressable>
                              
                              <Pressable 
                                style={styles.commentActionButton}
                                onPress={() => {
                                  setReplyingTo({
                                    id: comment.id, // Always reply to the parent comment
                                    username: reply.user?.username || 'user',
                                    _key: comment._key
                                  });
                                  setCommentText(`@${(reply.user?.username && reply.user.username.startsWith('@') 
                                    ? reply.user.username.substring(1) 
                                    : reply.user?.username) || 'user'} `);
                                  setShowCommentsInput(true);
                                }}
                              >
                                <MessageCircle size={12} color="#888" />
                                <Text style={styles.replyActionText}>Reply</Text>
                              </Pressable>
                              
                              {canDeleteComment(reply.user?.id || '') && (
                                <Pressable 
                                  style={styles.commentActionButton}
                                  onPress={() => {
                                    if (reply.id) {
                                      handleDeleteComment(reply.id);
                                    } else if (reply._key) {
                                      handleDeleteComment(reply._key);
                                    }
                                  }}
                                >
                                  <Trash2 size={12} color="#888" />
                                  <Text style={styles.replyActionText}>Delete</Text>
                                </Pressable>
                              )}
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </Animated.View>
              </View>
            )}
          </View>
        </View>
      );
    } catch (error) {
      console.error('Error rendering comment:', error, comment);
      return (
        <View style={styles.commentItem}>
          <View style={styles.commentContent}>
            <Text style={styles.commentText}>Error displaying comment</Text>
          </View>
        </View>
      );
    }
  };
  
  // Add these functions after canDeleteComment but before handleDeleteComment

  // Check if the user can comment based on restrictions
  const canUserComment = (): boolean => {
    console.log("Checking if user can comment:", {
      isLoggedIn: !!user && !!user._id,
      userId: user?._id,
      commentsRestricted,
      isPostAuthor,
      allowedUsers: allowedCommentUsers,
      userInAllowedList: user && user._id ? allowedCommentUsers.includes(user._id) : false
    });

    // User must be logged in
    if (!user || !user._id) {
      console.log("User cannot comment: not logged in");
      return false;
    }
    
    // If comments are not restricted, anyone can comment
    if (!commentsRestricted) {
      console.log("User can comment: comments are not restricted");
      return true;
    }
    
    // Post author can always comment
    if (isPostAuthor) {
      console.log("User can comment: is post author");
      return true;
    }
    
    // If comments are restricted, check if user is in allowed list
    const isAllowed = allowedCommentUsers.includes(user._id);
    console.log(`User ${isAllowed ? 'can' : 'cannot'} comment: ${isAllowed ? 'in allowed list' : 'not in allowed list'}`);
    return isAllowed;
  };
  
  // Handle post deletion
  const handleDeletePost = () => {
    // Only post author can delete
    if (!isPostAuthor) return;
    
    setIsDeletePostModalVisible(true);
  };
  
  // Confirm and execute post deletion
  const confirmDeletePost = async () => {
    if (!isPostAuthor || !user || !user._id) return;
    
    setIsDeletingPost(true);
    try {
      // Get the Sanity client
      const client = getSanityClient();
      
      // Delete the post
      await client.delete((post as any)._id || post.id);
      
      Alert.alert('Success', 'Post deleted successfully');
      router.back();
    } catch (err) {
      console.error('Error deleting post:', err);
      Alert.alert('Error', 'Failed to delete post. Please try again.');
    } finally {
      setIsDeletingPost(false);
      setIsDeletePostModalVisible(false);
    }
  };
  
  // Toggle comment restrictions
  const toggleCommentRestrictions = async (restricted: boolean) => {
    if (!isPostAuthor || !user || !user._id) {
      Alert.alert("Unauthorized", "Only the post author can change comment restrictions.");
      return;
    }
    
    // Optimistic UI update first
    setCommentsRestricted(restricted);
    if (restricted && allowedCommentUsers.length === 0) {
      // If restricting comments and no users are allowed, at least allow the author
      setAllowedCommentUsers([user._id]);
    }
    
    setPost(prev => ({
      ...prev,
      commentRestrictions: {
        _type: 'object',  // Explicitly set the type for the object
        restricted: restricted,
        allowedUsers: restricted ? 
          (allowedCommentUsers.length > 0 ? allowedCommentUsers : [user._id]) : 
          []
      }
    }));
    
    try {
      // Get the Sanity client
      const client = getSanityClient();
      
      console.log(`Setting comment restrictions for post ${(post as any)._id || post.id} to: ${restricted}`);
      console.log("Allowed users:", restricted ? 
        (allowedCommentUsers.length > 0 ? allowedCommentUsers : [user._id]) : 
        []);
      
      // Update the post with comment restrictions
      await client
        .patch((post as any)._id || post.id)
        .set({ 
          commentRestrictions: {
            _type: 'object',  // Explicitly set the type for the object
            restricted: restricted,
            allowedUsers: restricted ? 
              (allowedCommentUsers.length > 0 ? allowedCommentUsers : [user._id]) : 
              []
          }
        })
        .commit();
      
      // Emit an event that other screens can listen for
      DeviceEventEmitter.emit('COMMENT_RESTRICTIONS_CHANGED', {
        postId: (post as any)._id || post.id,
        restricted: restricted,
        allowedUsers: restricted ? 
          (allowedCommentUsers.length > 0 ? allowedCommentUsers : [user._id]) : 
          []
      });
      
      console.log('Comment restrictions updated successfully');
      Alert.alert('Success', `Comments are now ${restricted ? 'closed' : 'open to everyone'}`);
    } catch (err) {
      console.error('Error updating comment restrictions:', err);
      
      // Revert optimistic update if failed
      setCommentsRestricted(!restricted);
      
      // Reset post state
      setPost(prev => ({
        ...prev,
        commentRestrictions: {
          restricted: !restricted,
          allowedUsers: !restricted ? [] : (allowedCommentUsers.length > 0 ? allowedCommentUsers : [user._id])
        }
      }));
      
      Alert.alert('Error', 'Failed to update comment settings. Please try again.');
    }
  };
  
  // Add this function with the other action handlers
  const handleReportPost = () => {
    // Navigate to the report screen with the post ID
    router.push({
      pathname: "/report" as any,
      params: { postId: (post as any)._id || post.id }
    });
  };
  
  // Add a listener for comment restriction changes from other screens
  useEffect(() => {
    // Listen for comment restriction changes from other screens
    const restrictionChangeListener = DeviceEventEmitter.addListener(
      'COMMENT_RESTRICTIONS_CHANGED',
      (data) => {
        // Check if this update is for the current post
        if (data.postId === ((post as any)?._id || post?.id)) {
          console.log('Received comment restriction update from another screen:', data);
          
          // Update the UI with the new restrictions
          setCommentsRestricted(data.restricted);
          setAllowedCommentUsers(data.allowedUsers || []);
          
          // Update the post state
          setPost(prev => ({
            ...prev,
            commentRestrictions: {
              restricted: data.restricted,
              allowedUsers: data.allowedUsers || []
            }
          }));
        }
      }
    );
    
    // Clean up the listener on unmount
    return () => {
      restrictionChangeListener.remove();
    };
  }, [post]);  // Depend on the full post object
  
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color="#0070F3" />
        <Text style={styles.loadingText}>Loading post...</Text>
      </View>
    );
  }
  
  return (
    <>
      {/* Main content without KeyboardAvoidingView */}
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar style="light" />
        
        {/* Animated Header */}
        <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
          <View style={styles.headerBackground} />
          <View style={styles.headerContent}>
            <Pressable onPress={() => router.back()} hitSlop={10}>
              <ArrowLeft size={24} color="#fff" />
            </Pressable>
            <Text style={styles.headerTitle}>Post</Text>
            <View style={{ width: 24 }} />
          </View>
        </Animated.View>
        
        <Animated.FlatList
          data={[1]} 
          renderItem={() => (
            <View style={[
              styles.postContainer, 
              { width: windowWidth > 700 ? 700 : windowWidth }
            ]}>
              {/* User info row */}
              <Pressable 
                style={styles.userContainer}
                onPress={() => handleUserProfile(post.user.id)}
              >
                {post.user?.avatar ? (
                  <Image 
                    source={{ uri: post.user.avatar }} 
                    style={styles.userAvatar} 
                  />
                ) : (
                  <View style={[styles.userAvatar, styles.placeholderAvatar]}>
                    <UserCircle size={24} color="#666" />
                  </View>
                )}
                <View style={styles.userInfo}>
                  <View style={styles.nameContainer}>
                    <Text style={styles.userName}>{post.user?.name || 'Unknown User'}</Text>
                    {(post.user?.isVerified || post.user?.isBlueVerified) && (
                      <TunnelVerifiedMark size={16} />
                    )}
                  </View>
                  <View style={styles.userHandleContainer}>
                    <Text style={styles.userHandle}>
                      {post.user?.username && post.user.username.startsWith('@') 
                        ? post.user.username 
                        : `@${post.user?.username || 'unknown'}`}
                    </Text>
                    <Text style={styles.timeAgo}> • {post.timeAgo}</Text>
                  </View>
                </View>
                <Pressable 
                  style={styles.moreButton} 
                  hitSlop={10}
                  onPress={() => {
                    if (isPostAuthor) {
                      // Show options for post author
                      Alert.alert(
                        "Post Options",
                        "Choose an action for this post",
                        [
                          {
                            text: "Delete Post",
                            onPress: handleDeletePost,
                            style: "destructive"
                          },
                          {
                            text: commentsRestricted ? "Open Comments" : "Close Comments",
                            onPress: () => toggleCommentRestrictions(!commentsRestricted)
                          },
                          {
                            text: "Cancel",
                            style: "cancel"
                          }
                        ]
                      );
                    } else {
                      // Show options for non-author users
                      Alert.alert(
                        "Post Options",
                        "Choose an action for this post",
                        [
                          {
                            text: "Report Post",
                            onPress: handleReportPost,
                            style: "destructive"
                          },
                          {
                            text: "Cancel",
                            style: "cancel"
                          }
                        ]
                      );
                    }
                  }}
                >
                  <MoreHorizontal size={18} color="#888" />
                </Pressable>
              </Pressable>
              
              {/* Post content */}
              <Text style={styles.postContent}>{cleanContentText(post.content)}</Text>
              
              {/* Location */}
              {post.location ? (
                <View style={styles.locationContainer}>
                  <MapPin size={12} color="#888" />
                  <Text style={styles.locationText}>{cleanContentText(post.location)}</Text>
                </View>
              ) : null}
              
              {/* Images carousel */}
              {post.images.length > 0 && (
                <View style={styles.imageContainer}>
                  <FlatList
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    data={post.images}
                    keyExtractor={(_, index) => `image-${index}`}
                    renderItem={({ item: image, index }) => (
                      <Pressable
                        onPress={() => handleImagePress(index)}
                        style={styles.imageTouchable}
                      >
                        <Image
                          source={{ uri: image }}
                          style={[
                            styles.image,
                            { width: windowWidth > 700 ? 700 : windowWidth - 32 }
                          ]}
                        />
                      </Pressable>
                    )}
                    onMomentumScrollEnd={(e) => {
                      const offset = e.nativeEvent.contentOffset.x;
                      const index = Math.round(offset / (windowWidth > 700 ? 700 : windowWidth - 32));
                      setImageIndex(index);
                    }}
                  />
                  
                  {/* Dots indicator for multi-image posts */}
                  {post.images.length > 1 && (
                    <View style={styles.dotsContainer}>
                      {post.images.map((_, index) => (
                        <View
                          key={index}
                          style={[
                            styles.dot,
                            index === imageIndex && styles.activeDot
                          ]}
                        />
                      ))}
                    </View>
                  )}
                  
                  {/* Points badge */}
                  <View style={styles.pointsBadgeContainer}>
                    <View style={styles.pointsBadge}>
                      <Award size={14} color="#FFD700" />
                      <Text style={styles.pointsText}>{post.points} pts</Text>
                    </View>
                  </View>
                </View>
              )}
              
              {/* Engagement actions */}
              <View style={styles.actionsContainer}>
                <View style={styles.actionGroup}>
                  <Pressable 
                    style={styles.actionButton} 
                    onPress={handleLike}
                    hitSlop={10}
                  >
                    <Heart 
                      size={22} 
                      color={isLiked ? '#FF3B30' : '#888'} 
                      fill={isLiked ? '#FF3B30' : 'transparent'} 
                    />
                    <Text style={[styles.actionText, isLiked ? styles.actionTextActive : null]}>
                      {post.likes}
                    </Text>
                  </Pressable>
                  
                  <Pressable 
                    style={styles.actionButton}
                    onPress={() => setShowCommentsInput(true)} 
                    hitSlop={10}
                  >
                    <MessageCircle size={22} color="#888" />
                    <Text style={styles.actionText}>{post.comments}</Text>
                  </Pressable>
                  
                  <Pressable 
                    style={styles.actionButton}
                    onPress={handleShare}
                    hitSlop={10}
                  >
                    <Share2 size={22} color="#888" />
                  </Pressable>
                </View>
                
                <View style={styles.actionGroup}>
                  {/* Only show the Give Points button if the user is not the post author */}
                  {!isPostAuthor && (
                  <Pressable 
                    style={styles.actionButton} 
                    onPress={handleAwardPoints}
                    hitSlop={10}
                  >
                    <Award size={22} color="#FFD700" />
                  </Pressable>
                  )}
                  
                  <Pressable 
                    style={styles.actionButton} 
                    onPress={handleSave}
                    hitSlop={10}
                  >
                    <Bookmark 
                      size={22} 
                      color={isSaved ? '#0070F3' : '#888'} 
                      fill={isSaved ? '#0070F3' : 'transparent'} 
                    />
                  </Pressable>
                </View>
              </View>
              
              {/* Comments section with more bottom padding */}
              <View style={styles.commentsContainer}>
                <View style={styles.commentsHeader}>
                  <Text style={styles.commentsHeaderText}>Comments ({post.comments})</Text>
                  
                  {/* Add comments restriction notice right after the header */}
                  {commentsRestricted && (
                    <View style={styles.commentsRestrictionContainer}>
                      <AlertCircle size={18} color="#FF3B30" />
                      <Text style={styles.commentsRestrictionText}>
                        {canUserComment() 
                          ? "Comments are limited to specific users" 
                          : "Comments are closed by post owner"}
                      </Text>
                    </View>
                  )}
                </View>
                
                {/* Comments List */}
                {Array.isArray(comments) && comments.length > 0 ? (
                  <>
                    <Text style={styles.commentsTitle}>Recent Comments ({comments.length})</Text>
                    <FlatList
                      data={comments}
                      renderItem={renderComment}
                      keyExtractor={(item: Comment) => {
                        // Type-safe key extraction with correct properties from the interface
                        // First check for standard ID
                        if (item.id) return `comment-id-${item.id}`;
                        
                        // Check for Sanity-specific key
                        if (item._key) return `comment-key-${item._key}`;
                        
                        // Handle user info using optional chaining
                        const userId = item.user?.id || item.author?._id || item.author?.id || 'unknown';
                        
                        // Get timestamp with fallbacks
                        const timestamp = item.createdAt || item._createdAt || Date.now().toString();
                        
                        // Create a composite key that's guaranteed to be unique
                        return `comment-${userId}-${timestamp}-${Math.random().toString(36).substr(2, 9)}`;
                      }}
                      scrollEnabled={false} 
                      nestedScrollEnabled={false}
                      initialNumToRender={10}
                      maxToRenderPerBatch={5}
                    />
                  </>
                ) : (
                  <View style={styles.noCommentsContainer}>
                    <MessageCircle size={40} color="#333" />
                    <Text style={styles.noCommentsText}>No comments yet</Text>
                    <Text style={styles.noCommentsSubtext}>Be the first to share your thoughts!</Text>
                  </View>
                )}
                
                {/* Bottom padding view */}
                <View
                  style={{
                    height: Platform.OS === 'ios' ? 220 : 250,
                    width: '100%',
                  }}
                />
              </View>
            </View>
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          scrollEventThrottle={16}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
        />
        
        {/* Back Button (Top left, always visible) */}
        <View style={styles.backButtonContainer}>
          <Pressable 
            style={styles.backButton} 
            onPress={() => router.back()}
            hitSlop={10}
          >
            <ArrowLeft size={24} color="#fff" />
          </Pressable>
        </View>
        
        {/* Delete Comment Confirmation Modal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={isDeleteModalVisible}
          onRequestClose={() => setIsDeleteModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <AlertCircle size={24} color="#FF3B30" />
                <Text style={styles.modalTitle}>Delete Comment</Text>
              </View>
              
              <Text style={styles.modalText}>
                Are you sure you want to delete this comment? This action cannot be undone.
              </Text>
              
              <View style={styles.modalButtons}>
                <Pressable
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setIsDeleteModalVisible(false);
                    setCommentToDelete(null);
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
                
                <Pressable
                  style={[styles.modalButton, styles.deleteButton]}
                  onPress={confirmDeleteComment}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>

      {/* TikTok style comment input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
        style={[
          styles.commentInputContainer,
          keyboardVisible && Platform.OS === 'android' && { position: 'relative' }
        ]}
      >
        {replyingTo && (
          <View style={styles.replyingToContainer}>
            <Text style={styles.replyingToText}>
              Replying to <Text style={styles.replyingToUsername}>
                {replyingTo.username.startsWith('@') 
                  ? replyingTo.username 
                  : `@${replyingTo.username}`}
              </Text>
            </Text>
            <Pressable onPress={() => setReplyingTo(null)} style={styles.cancelReplyButton}>
              <X size={16} color="#888" />
            </Pressable>
          </View>
        )}
        <View style={styles.commentInput}>
          {user && user.profile?.avatar ? (
            <Image 
              source={{ uri: urlFor(user.profile.avatar).url() }} 
              style={styles.commentAvatar} 
            />
          ) : (
            <View style={[styles.commentAvatar, styles.placeholderAvatar]}>
              <UserCircle size={18} color="#666" />
            </View>
          )}
          
          {/* Show restriction badge if comments are restricted */}
          {commentsRestricted && (
            <View style={styles.restrictionBadge}>
              <AlertCircle size={12} color="#FF3B30" />
              <Text style={styles.restrictionText}>
                {canUserComment() ? "Limited" : "Closed"}
              </Text>
            </View>
          )}
          
          <TextInput
            style={styles.commentInputField}
            placeholder={
              user 
                ? commentsRestricted && !canUserComment()
                  ? "Comments are closed" 
                  : "Add a comment..." 
                : "Login to comment..."
            }
            placeholderTextColor="#777"
            value={commentText}
            onChangeText={setCommentText}
            multiline
            autoFocus={showCommentsInput}
            editable={user ? (!commentsRestricted || canUserComment()) : false}
            maxLength={500}
            returnKeyType="default"
            onFocus={() => {
              // Check comment restrictions on focus to catch any changes
              console.log("Comment input focused, restrictions status:", {
                commentsRestricted,
                canUserComment: user ? canUserComment() : false,
                allowedUsers: allowedCommentUsers
              });
            }}
          />
          {user ? (
            <Pressable 
              style={[
                styles.commentSendButton, 
                (!commentText.trim() || (commentsRestricted && !canUserComment())) && styles.commentSendButtonDisabled
              ]} 
              onPress={() => {
                // Double-check restrictions before submitting
                if (commentsRestricted && !canUserComment()) {
                  console.log("Blocked comment submission due to restrictions");
                  Alert.alert("Comments Closed", "The post owner has closed comments on this post.");
                  return;
                }
                handleCommentSubmit();
              }}
              disabled={!commentText.trim() || (commentsRestricted && !canUserComment())}
            >
              <Send size={24} color={commentText.trim() && (!commentsRestricted || canUserComment()) ? "#1877F2" : "#555"} />
            </Pressable>
          ) : (
            <Pressable 
              style={styles.loginButton}
              onPress={() => router.push('/login' as any)}
            >
              <Text style={styles.loginButtonText}>Login</Text>
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
      
      {/* Image Viewer Modal */}
      <Modal
        visible={imageViewerVisible}
        transparent={true}
        onRequestClose={closeImageViewer}
        animationType="fade"
      >
        <Animated.View 
          style={[
            styles.imageViewerContainer,
            { transform: [{ translateY: slidePosition }] }
          ]}
          {...panResponder.panHandlers}
        >
          <RNStatusBar hidden />
          <View style={styles.imageViewerHeader}>
            <Pressable onPress={closeImageViewer} style={styles.imageViewerCloseButton}>
              <X size={24} color="#FFF" />
            </Pressable>
            <View style={styles.imageViewerControls}>
              <Pressable 
                onPress={() => handleZoom(false)} 
                style={styles.imageViewerControlButton}
                disabled={imageScale <= 0.5}
              >
                <ZoomOut size={24} color="#FFF" opacity={imageScale <= 0.5 ? 0.5 : 1} />
              </Pressable>
              <Text style={styles.imageViewerScaleText}>{Math.round(imageScale * 100)}%</Text>
              <Pressable 
                onPress={() => handleZoom(true)} 
                style={styles.imageViewerControlButton}
              >
                <ZoomIn size={24} color="#FFF" />
              </Pressable>
            </View>
          </View>
          
          <View style={styles.swipeIndicatorContainer}>
            <View style={styles.swipeIndicator} />
          </View>
          
          <ScrollView 
            contentContainerStyle={styles.imageViewerScrollContent}
            maximumZoomScale={3}
            minimumZoomScale={1}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
          >
            {post.images.length > 0 && selectedImageIndex < post.images.length && (
              <Image
                source={{ uri: post.images[selectedImageIndex] }}
                style={[
                  styles.fullScreenImage,
                  { 
                    width: windowWidth, 
                    height: windowWidth, 
                    transform: [{ scale: imageScale }] 
                  }
                ]}
                resizeMode="contain"
              />
            )}
          </ScrollView>
          
          {post.images.length > 1 && (
            <View style={styles.imageViewerFooter}>
              {post.images.map((_, index) => (
                <Pressable
                  key={index}
                  style={[
                    styles.imageViewerThumbnailContainer,
                    selectedImageIndex === index && styles.imageViewerThumbnailActive
                  ]}
                  onPress={() => setSelectedImageIndex(index)}
                >
                  <Image
                    source={{ uri: post.images[index] }}
                    style={styles.imageViewerThumbnail}
                  />
                </Pressable>
              ))}
            </View>
          )}
        </Animated.View>
      </Modal>
      
      {/* Delete Post Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isDeletePostModalVisible}
        onRequestClose={() => setIsDeletePostModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <AlertCircle size={24} color="#FF3B30" />
              <Text style={styles.modalTitle}>Delete Post</Text>
            </View>
            
            <Text style={styles.modalText}>
              Are you sure you want to delete this post? This action cannot be undone and will remove the post permanently.
            </Text>
            
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setIsDeletePostModalVisible(false);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              
              <Pressable
                style={[styles.modalButton, styles.deleteButton]}
                onPress={confirmDeletePost}
                disabled={isDeletingPost}
              >
                {isDeletingPost ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.deleteButtonText}>Delete</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContent: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 150,
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#888',
    fontSize: 16,
    marginTop: 16,
    fontFamily: 'Inter_400Regular',
  },
  
  // Header
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
    backgroundColor: '#000',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 10,
    paddingHorizontal: 16,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
  },
  backButtonContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 16,
    zIndex: 5,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Post Container
  postContainer: {
    backgroundColor: '#111',
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 40,
    alignSelf: 'center',
  },
  userContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 10,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#333',
  },
  userInfo: {
    marginLeft: 12,
    flex: 1,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  userName: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  userHandleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifiedBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#0070F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  userHandle: {
    color: '#777',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  timeAgo: {
    color: '#666',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  moreButton: {
    padding: 8,
  },
  postContent: {
    color: 'white',
    fontSize: 17,
    fontFamily: 'Inter_400Regular',
    lineHeight: 35, // Increased from 25 for better readability
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  locationText: {
    color: '#888',
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginLeft: 6,
  },
  
  // Image
  imageContainer: {
    width: '100%',
    position: 'relative',
    marginBottom: 16,
  },
  image: {
    height: 300,
    resizeMode: 'cover',
    borderRadius: 16,
    marginHorizontal: 16,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#444',
    marginHorizontal: 3,
  },
  activeDot: {
    backgroundColor: '#0070F3',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  
  // Points badge
  pointsBadgeContainer: {
    position: 'absolute',
    top: 12,
    right: 28,
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
  },
  pointsText: {
    color: '#FFD700',
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    marginLeft: 4,
  },
  
  // Actions
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  actionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  actionText: {
    color: '#888',
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    marginLeft: 6,
  },
  actionTextActive: {
    color: '#FF3B30',
  },
  
  // Comments
  commentsContainer: {
    padding: 16,
  },
  commentsHeader: {
    marginBottom: 16,
  },
  commentsHeaderText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
  },
  commentsTitle: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 16,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  commentAvatarContainer: {
    marginRight: 12,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
    bottom: 20,
  },
  commentContent: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  commentUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  commentUserName: {
    color: 'white',
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    marginRight: 4,
  },
  commentTimeAgo: {
    color: '#666',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  commentText: {
    color: 'white',
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    lineHeight: 30,
  },
  commentActions: {
    flexDirection: 'row',
    marginTop: 8,
  },
  commentActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  commentActionText: {
    color: '#888',
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginLeft: 4,
  },
  commentVerifiedBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#0070F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  placeholderAvatar: {
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    
  },
  noCommentsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 24,
    marginTop: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  noCommentsText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    marginTop: 12,
    marginBottom: 6,
  },
  noCommentsSubtext: {
    color: '#888',
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  debugText: {
    color: '#888',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginBottom: 16,
  },
  authorBadge: {
    backgroundColor: 'rgba(0, 112, 243, 0.8)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
    alignSelf: 'center',
  },
  authorBadgeText: {
    color: 'white',
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
  },
  loginPromptButton: {
    backgroundColor: '#0070F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 8,
  },
  loginPromptText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '80%',
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    marginLeft: 10,
  },
  modalText: {
    color: '#CCC',
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  cancelButtonText: {
    color: '#FFF',
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  deleteButtonText: {
    color: '#FFF',
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
  },
  
  // Image styles
  imageTouchable: {
    position: 'relative',
  },
  
  // Image Viewer styles
  imageViewerContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  imageViewerCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageViewerControlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  imageViewerScaleText: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    marginHorizontal: 8,
  },
  imageViewerScrollContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    resizeMode: 'contain',
  },
  imageViewerFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  imageViewerThumbnailContainer: {
    width: 44,
    height: 44,
    borderRadius: 4,
    marginHorizontal: 4,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  imageViewerThumbnailActive: {
    borderColor: '#0070F3',
  },
  imageViewerThumbnail: {
    width: '100%',
    height: '100%',
  },
  
  // Add swipe indicator styles
  swipeIndicatorContainer: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 12,
    position: 'absolute',
    top: 0,
    zIndex: 20,
  },
  swipeIndicator: {
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
    marginBottom: 8,
  },

  commentInputContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
 
    right: 0,
    backgroundColor: '#1A1A1A',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 32,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 10,
    zIndex: 100,
  },
  commentInput: {
    flexDirection: 'row',
    alignItems: 'center',
    
  },
  commentEmojiButton: {
    padding: 8,
  },
  commentInputField: {
    flex: 1,
    bottom: 20,
    backgroundColor: '#2A2A2A',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: 'white',
    fontSize: 15,
    lineHeight: 22,
    maxHeight: 100,
    marginHorizontal: 8,
    fontFamily: 'Inter_400Regular',
  },
  commentSendButton: {
    padding: 8,
    bottom: 20,
  },
  commentSendButtonDisabled: {
    opacity: 0.5
  },
  loginButton: {
    backgroundColor: '#0070F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 8,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  // Add these reply-related styles
  repliesContainer: {
    marginTop: 12,
    paddingLeft: 16,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(0, 112, 243, 0.3)',
    paddingBottom: 8,
  },
  replyItem: {
    flexDirection: 'row',
    marginBottom: 12,
    opacity: 0.95,
  },
  replyContent: {
    flex: 1,
    backgroundColor: 'rgba(0, 112, 243, 0.08)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 112, 243, 0.15)',
  },
  replyUserName: {
    color: 'white',
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    flexShrink: 1,
    marginRight: 4,
  },
  replyTimeAgo: {
    color: '#666',
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
  },
  replyText: {
    color: 'white',
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    lineHeight: 30,
  },
  replyActions: {
    flexDirection: 'row',
    marginTop: 6,
  },
  replyActionText: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginLeft: 4,
  },
  replyingToContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  replyingToText: {
    color: '#888',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  replyingToUsername: {
    color: '#0070F3',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  cancelReplyButton: {
    padding: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  showRepliesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 6,
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  repliesCountBadge: {
    backgroundColor: 'rgba(0, 112, 243, 0.8)',
    borderRadius: 12,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  repliesCountText: {
    color: 'white',
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  showRepliesText: {
    fontSize: 13,
    color: '#0070F3',
    fontWeight: '500',
    marginLeft: 6,
    fontFamily: 'Inter_500Medium',
  },
  showRepliesTextActive: {
    color: '#FF3B30',
  },
  chevronIcon: {
    marginLeft: 6,
  },
  repliesWrapper: {
    overflow: 'hidden',
    transformOrigin: 'top',
  },
  restrictionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
    position: 'absolute',
    top: -20,
    left: 48,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  restrictionText: {
    color: '#FF3B30',
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    marginLeft: 4,
  },
  commentRestrictionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  commentRestrictionText: {
    color: '#FF3B30',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginLeft: 4,
  },
  verifiedBadgeContainer: {
    marginLeft: 2,
    marginRight: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentsRestrictionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginTop: 8,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.2)',
  },
  commentsRestrictionText: {
    color: '#FF3B30',
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    marginLeft: 10,
    flex: 1,
  },
}); 