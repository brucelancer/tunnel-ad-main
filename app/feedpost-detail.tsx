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
} from 'lucide-react-native';
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

// Mock data for the post details
const POST_DETAILS = {
  id: '1',
  user: {
    id: 'user1',
    name: 'Sarah Johnson',
    username: '@dancepro',
    avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
    isVerified: true
  },
  content: "Just learned these amazing new dance moves at today's workshop! Can't wait to practice more and share with everyone. The instructor was incredible and taught us some advanced choreography that I've been wanting to learn for months.",
  images: ['https://images.unsplash.com/photo-1519682337058-a94d519337bc'],
  location: 'Dance Studio 55, New York',
  timeAgo: '15 minutes ago',
  likes: 243,
  comments: 42,
  points: 28,
  hasLiked: false,
  hasSaved: false
};

// Mock comments data
const COMMENTS = [
  {
    id: 'c1',
    user: {
      id: 'user2',
      name: 'Mike Chen',
      username: '@musicinsider',
      avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
      isVerified: false
    },
    text: 'Looking great! Which dance style is this?',
    timeAgo: '10 minutes ago',
    likes: 12,
    createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    _createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString()
  },
  {
    id: 'c2',
    user: {
      id: 'user3',
      name: 'Min Thu',
      username: '@myanmarculture',
      avatar: 'https://randomuser.me/api/portraits/women/68.jpg',
      isVerified: true
    },
    text: 'I took a similar workshop last month! The skills you learn really stay with you.',
    timeAgo: '8 minutes ago',
    likes: 5,
    createdAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    _createdAt: new Date(Date.now() - 8 * 60 * 1000).toISOString()
  },
  {
    id: 'c3',
    user: {
      id: 'user4',
      name: 'Alex Rivera',
      username: '@streetlife',
      avatar: 'https://randomuser.me/api/portraits/men/75.jpg',
      isVerified: false
    },
    text: 'That studio has the best instructors in town. I go there every week!',
    timeAgo: '3 minutes ago',
    likes: 3,
    createdAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    _createdAt: new Date(Date.now() - 3 * 60 * 1000).toISOString()
  }
];

// Define a type for the comment
interface Comment {
  id: string;
  text: string;
  timeAgo?: string;
  likes?: number;
  createdAt?: string;
  user?: {
    id: string;
    name: string;
    username: string;
    avatar: string;
    isVerified: boolean;
  };
  // For Sanity data structure compatibility
  _key?: string;
  _createdAt?: string;
  author?: {
    _id?: string;
    id?: string;
    name?: string;
    username?: string;
    avatar?: string;
    isVerified?: boolean;
  };
}

export default function PostDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { width: windowWidth } = useWindowDimensions();
  const { addPoints } = usePointsStore();
  const { user, loading, updateUserData } = useSanityAuth();
  const { getPost } = usePostFeed();
  
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
  const [post, setPost] = useState(POST_DETAILS);
  const [comments, setComments] = useState(COMMENTS);
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
  
  // Animations
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 60, 90],
    outputRange: [0, 0.7, 1],
    extrapolate: 'clamp',
  });
  
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
        setPost(postData);
        
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
              if (comment.likes) {
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
                user: {
                  id: commentAuthor._id || 'unknown',
                  name: authorName,
                  username: commentAuthor.username ? `@${commentAuthor.username}` : '@user',
                  avatar: commentAuthor.avatar || 
                         (commentAuthor.profile?.avatar ? urlFor(commentAuthor.profile.avatar).url() : 'https://via.placeholder.com/150'),
                  isVerified: commentAuthor.isVerified || false
                }
              };
            });
            
            // Sort comments by creation date (newest first)
            processedComments.sort((a: any, b: any) => {
              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });
            
            console.log(`Processed ${processedComments.length} comments for UI`);
            setComments(processedComments);
          } else if (COMMENTS.length > 0) {
            console.log("No comments from Sanity, using mock data");
            setComments(COMMENTS);
          } else {
            console.log("No comments available");
            setComments([]);
          }
        } catch (commentError) {
          console.error("Error processing comments:", commentError);
          console.log("Using mock comments due to error");
          setComments(COMMENTS);
        }
        
        setIsLiked(postData.hasLiked || false);
        setIsSaved(postData.hasSaved || false);
        
        // Subscribe to real-time updates after initial fetch
        subscribeToComments(postData._id || postData.id);
      } else {
        // Fallback to mock data if post not found in Sanity
        console.log('Post not found in Sanity, using mock data');
        setError(null);
        // Make sure we use mock comments
        setComments(COMMENTS);
      }
    } catch (err) {
      console.error('Error fetching post:', err);
      // Using mock data as fallback
      console.log('Using mock data due to error');
      setComments(COMMENTS);
      setError(null);
    } finally {
      setIsLoading(false);
      
      // Auto-focus on comments if requested
      if (params.showComments === 'true') {
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
        points
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
                    if (comment.likes) {
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
                      user: {
                        id: commentAuthor._id || 'unknown',
                        name: authorName,
                        username: commentAuthor.username ? `@${commentAuthor.username}` : '@user',
                        avatar: commentAuthor.avatar || 
                               (commentAuthor.profile?.avatar ? urlFor(commentAuthor.profile.avatar).url() : 'https://via.placeholder.com/150'),
                        isVerified: commentAuthor.isVerified || false
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
  }, [params.id, user]); // Add user as dependency to refetch when user changes
  
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
  
  const handleCommentSubmit = async () => {
    if (!commentText.trim()) return;
    
    // Require authentication
    if (!user || !user._id) {
      Alert.alert("Authentication Required", "Please log in to comment on posts.");
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
      isVerified: false
    };

    // Create new comment with proper type
    const newComment = {
      id: tempId,
      _key: tempId, // Add _key for Sanity compatibility
      user: author,
      text: commentText,
      timeAgo: 'Just now',
      likes: 0,
      createdAt: new Date().toISOString(), // Add this for consistency with other comments
      _createdAt: new Date().toISOString() // Add this as well for Sanity format consistency
    };
    
    // Optimistic UI update - use try/catch to avoid any iteration issues
    try {
      setComments(prevComments => {
        // Safe array creation to avoid iterator issues
        const updatedComments = Array.isArray(prevComments) ? [newComment, ...prevComments] : [newComment];
        return updatedComments;
      });
      
      setPost(prev => ({
        ...prev,
        comments: prev.comments + 1
      }));
      setCommentText('');
      
      // Award points for commenting
      addPoints(2);
    } catch (uiError) {
      console.error("Error updating UI optimistically:", uiError);
    }
    
    try {
      console.log(`User ${user._id} adding comment to post ${(post as any)._id || post.id}`);
      const result = await addComment(
        (post as any)._id || post.id, 
        commentText,
        user._id
      );
      console.log("Comment added successfully:", result);
      
      // The real-time subscription will handle updating the comment list
      // No need to manually update it here
    } catch (err) {
      console.error('Error adding comment:', err);
      
      // Remove the temporary comment if it fails - use try/catch for safety
      try {
        setComments(prevComments => {
          // Safely filter without relying on iterator methods
          if (!Array.isArray(prevComments)) return [];
          return prevComments.filter(c => c && c.id !== tempId);
        });
        
        setPost(prev => ({
          ...prev,
          comments: Math.max(0, prev.comments - 1) // Ensure we don't go below 0
        }));
        
        // Refund the points
        addPoints(-2);
      } catch (revertError) {
        console.error("Error reverting UI update:", revertError);
      }
      
      Alert.alert("Error", "Failed to add comment. Please try again.");
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
          ? { ...comment, likes: comment.likes + 1 } 
          : comment
      )
    );
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
        isVerified: comment.author.isVerified || false
      } : {
        id: 'unknown',
        name: 'Unknown User',
        username: 'user',
        avatar: 'https://via.placeholder.com/150',
        isVerified: false
      });

      console.log('Comment user data:', commentUser);

      return (
        <View style={styles.commentItem}>
          <Pressable 
            style={styles.commentAvatarContainer}
            onPress={() => handleUserProfile(commentUser.id)}
            hitSlop={5}
          >
            {commentUser.avatar ? (
              <Image 
                source={{ uri: commentUser.avatar }} 
                style={styles.commentAvatar} 
              />
            ) : (
              <View style={[styles.commentAvatar, styles.placeholderAvatar]}>
                <UserCircle size={16} color="#666" />
              </View>
            )}
          </Pressable>
          
          <View style={styles.commentContent}>
            <View style={styles.commentHeader}>
              <View style={styles.commentUserInfo}>
                <Text style={styles.commentUserName}>
                  {commentUser.username || commentUser.name || 'Unknown User'}
                  {commentUser.isVerified && (
                    <View style={styles.commentVerifiedBadge}>
                      <ThumbsUp size={6} color="#fff" />
                    </View>
                  )}
                </Text>
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
                  setCommentText(`@${commentUser.username || 'user'} `);
                  setShowCommentsInput(true);
                }}
              >
                <MessageCircle size={14} color="#888" />
                <Text style={styles.commentActionText}>Reply</Text>
              </Pressable>
            </View>
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
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
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
        data={[1]} // Just need one item to render our content
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
                  {post.user?.isVerified && (
                    <View style={styles.verifiedBadge}>
                      <ThumbsUp size={8} color="#fff" />
                    </View>
                  )}
                </View>
                <View style={styles.userHandleContainer}>
                  <Text style={styles.userHandle}>{post.user?.username || '@unknown'}</Text>
                  <Text style={styles.timeAgo}> • {post.timeAgo}</Text>
                </View>
              </View>
              <Pressable style={styles.moreButton} hitSlop={10}>
                <MoreHorizontal size={18} color="#888" />
              </Pressable>
            </Pressable>
            
            {/* Post content */}
            <Text style={styles.postContent}>{post.content}</Text>
            
            {/* Location */}
            {post.location ? (
              <View style={styles.locationContainer}>
                <MapPin size={12} color="#888" />
                <Text style={styles.locationText}>{post.location}</Text>
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
                  renderItem={({ item: image }) => (
                    <Image
                      source={{ uri: image }}
                      style={[
                        styles.image,
                        { width: windowWidth > 700 ? 700 : windowWidth - 32 }
                      ]}
                    />
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
                <Pressable 
                  style={styles.actionButton} 
                  onPress={handleAwardPoints}
                  hitSlop={10}
                >
                  <Award size={22} color="#FFD700" />
                </Pressable>
                
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
            
            {/* Comments section */}
            <View style={styles.commentsContainer}>
              <View style={styles.commentsHeader}>
                <Text style={styles.commentsHeaderText}>Comments ({post.comments})</Text>
              </View>
              
              {/* Comment Input */}
              <View style={styles.commentInputContainer}>
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
                <TextInput
                  style={styles.commentInput}
                  placeholder={user ? "Add a comment..." : "Login to comment..."}
                  placeholderTextColor="#666"
                  value={commentText}
                  onChangeText={setCommentText}
                  multiline
                  autoFocus={showCommentsInput}
                  editable={!!user}
                />
                {user ? (
                  <Pressable 
                    style={[
                      styles.sendButton,
                      !commentText.trim() && styles.sendButtonDisabled
                    ]} 
                    onPress={handleCommentSubmit}
                    disabled={!commentText.trim()}
                  >
                    <Send size={20} color={commentText.trim() ? '#0070F3' : '#444'} />
                  </Pressable>
                ) : (
                  <Pressable 
                    style={styles.loginPromptButton}
                    onPress={() => Alert.alert(
                      "Authentication Required", 
                      "You need to login to comment. Would you like to go to the login screen?",
                      [
                        {text: "Cancel", style: "cancel"},
                        {text: "Login", onPress: () => router.push('/login' as any)}
                      ]
                    )}
                  >
                    <Text style={styles.loginPromptText}>Login</Text>
                  </Pressable>
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
                    scrollEnabled={false} // Important to avoid nesting scrollable views
                    nestedScrollEnabled={false}
                    initialNumToRender={10}
                    maxToRenderPerBatch={5}
                  />
                </>
              ) : (
                <>
                  <Text style={styles.noCommentsText}>No comments yet. Be the first to comment!</Text>
                </>
              )}
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContent: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
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
    lineHeight: 25,
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
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    marginBottom: 20,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  commentInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    minHeight: 36,
    maxHeight: 100,
    padding: 0,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,112,243,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  
  // Comment
  commentItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  commentAvatarContainer: {
    marginRight: 12,
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
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
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
    lineHeight: 22,
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
  noCommentsText: {
    color: '#888',
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    marginTop: 16,
  },
  loginPromptButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,112,243,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginPromptText: {
    color: '#0070F3',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  debugText: {
    color: '#888',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginBottom: 16,
  },
  commentsTitle: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
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
}); 