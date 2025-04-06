import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, ActivityIndicator, ScrollView, Image, FlatList, TextInput, KeyboardAvoidingView, Platform, TouchableOpacity, Alert, Animated } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { usePointsStore } from '@/store/usePointsStore';
import { ArrowLeft, Volume2, VolumeX, ChevronRight, Send, Heart, MessageCircle, Trash2, RefreshCw } from 'lucide-react-native';
import * as videoService from '@/tunnel-ad-main/services/videoService';
import { fetchComments, addComment, toggleLikeComment, getCommentCount, deleteComment } from '@/tunnel-ad-main/services/commentService';
import { useSanityAuth } from '../app/hooks/useSanityAuth';
import Svg, { Path } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

// Define VideoItem interface to match the one in VideoFeed.tsx
interface VideoItem {
  id: string;
  url: string;
  title: string;
  author: string;
  description: string;
  points: number;
  type: 'vertical' | 'horizontal';
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

// Format time ago for comments
const formatTimeAgo = (dateString: string): string => {
  if (!dateString) return 'Just now';
  
  const date = new Date(dateString);
  const now = new Date();
  const secondsAgo = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (secondsAgo < 60) {
    return 'Just now';
  }
  
  const minutesAgo = Math.floor(secondsAgo / 60);
  if (minutesAgo < 60) {
    return `${minutesAgo}m ago`;
  }
  
  const hoursAgo = Math.floor(minutesAgo / 60);
  if (hoursAgo < 24) {
    return `${hoursAgo}h ago`;
  }
  
  const daysAgo = Math.floor(hoursAgo / 24);
  if (daysAgo < 7) {
    return `${daysAgo}d ago`;
  }
  
  return date.toLocaleDateString();
};

// Format view count with K and M suffixes
const formatViewCount = (count: number): string => {
  if (!count && count !== 0) return '0';
  
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  
  return count.toString();
};

// Recommendation Item Component
const RecommendationItem = ({ item, onPress }: { item: VideoItem, onPress: () => void }) => {
  return (
    <Pressable onPress={onPress} style={styles.recommendationItem}>
      <View style={styles.thumbnailContainer}>
        <Image 
          source={{ uri: item.thumbnail || 'https://i.imgur.com/8LWOKjz.png' }} 
          style={styles.thumbnail} 
          resizeMode="cover"
        />
        {item.views && (
          <View style={styles.viewsTag}>
            <Text style={styles.viewsText}>{formatViewCount(item.views)} views</Text>
          </View>
        )}
      </View>
      <Text style={styles.recommendationTitle} numberOfLines={2}>{item.title}</Text>
      <Text style={styles.recommendationAuthor}>{item.author}</Text>
    </Pressable>
  );
};

// Comment Item Component
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
  // Function to confirm deletion
  const confirmDelete = () => {
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
          onPress: () => onDelete(comment.id),
          style: "destructive"
        }
      ]
    );
  };

  return (
    <View style={styles.commentItem}>
      <Image 
        source={{ uri: comment.user.avatar || 'https://via.placeholder.com/40' }}
        style={styles.commentAvatar}
      />
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <View style={styles.commentUser}>
            <Text style={styles.commentUsername}>{comment.user.username}</Text>
            {comment.user.isVerified && (
              <View style={styles.commentVerified}>
                <TunnelVerifiedMark size={10} />
              </View>
            )}
          </View>
          <Text style={styles.commentTime}>{formatTimeAgo(comment.createdAt)}</Text>
        </View>
        <Text style={styles.commentText}>{comment.text}</Text>
        <View style={styles.commentActions}>
          <Pressable 
            style={[styles.commentAction, comment.hasLiked && styles.commentActionActive]} 
            onPress={() => onLike(comment.id)}
          >
            <Heart 
              size={14} 
              color={comment.hasLiked ? "#1877F2" : "#999"} 
              fill={comment.hasLiked ? "#1877F2" : "transparent"} 
            />
            <Text 
              style={[
                styles.commentActionText, 
                comment.hasLiked && styles.commentActionTextActive
              ]}
            >
              {comment.likes || 0}
            </Text>
          </Pressable>
          
          {canDelete && (
            <Pressable 
              style={styles.commentAction} 
              onPress={confirmDelete}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Trash2 size={14} color="#999" />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
};

export default function VideoDetailScreen() {
  const video = useRef<Video>(null);
  const [status, setStatus] = useState<AVPlaybackStatus | null>(null);
  const [hasEarnedPoints, setHasEarnedPoints] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [videoData, setVideoData] = useState<VideoItem | null>(null);
  const [recommendedVideos, setRecommendedVideos] = useState<VideoItem[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentCount, setCommentCount] = useState(0);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isVideoEnded, setIsVideoEnded] = useState(false);
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { points, addPoints } = usePointsStore();
  const [displayPoints, setDisplayPoints] = useState(points); // Local state for display
  const scrollViewRef = useRef<ScrollView>(null);
  const { user: currentUser } = useSanityAuth();
  const commentInputRef = useRef<TextInput>(null);
  
  // Add state to track showing user info
  const [showUserInfo, setShowUserInfo] = useState(false);
  // Track scroll position with animated value
  const scrollY = useRef(new Animated.Value(0)).current;
  
  // Handle scroll events
  const handleScroll = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.y;
    const videoHeight = getVideoHeight().height;
    // Show user info when scrolled 80% through the video
    setShowUserInfo(scrollPosition > videoHeight * 0.5);
  };
  
  // Get animation values based on video height
  const getAnimationValues = () => {
    const videoHeight = getVideoHeight().height;
    return {
      startHide: videoHeight * 0.5,
      endHide: videoHeight * 0.7,
      startShow: videoHeight * 0.6,
      endShow: videoHeight * 0.8,
      offset: Math.min(videoHeight * 0.2, 100) // Smaller offset for smoother animations
    };
  };

  // Configure animated scroll event
  const animatedScrollEvent = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: false }
  );

  // Fetch video data based on the ID parameter
  useEffect(() => {
    const fetchVideoData = async () => {
      if (!id) return;
      
      try {
        setIsLoading(true);
        // Query for videos and find the one matching our ID
        const videos = await videoService.fetchVideos(20, null);
        const video = videos.find((v: VideoItem) => v.id === id);
        
        if (video) {
          setVideoData(video);
          // Fetch recommendations (excluding current video)
          const recommendations = videos
            .filter((v: VideoItem) => v.id !== id)
            .slice(0, 4); // Limit to 4 recommendations (for 2x2 grid)
          setRecommendedVideos(recommendations);
          
          // Fetch comments for this video
          loadComments(video.id);
          
          // Update video view count
          if (video.id) {
            try {
              // Increment views by 1
              const success = await videoService.updateVideoStats(video.id, { views: 1 });
              if (success) {
                console.log('Successfully updated view count for video:', video.id);
              } else {
                console.warn('Failed to update view count, but continuing playback');
              }
            } catch (error) {
              console.error('Error updating view count:', error);
              // Continue execution even if view count update fails
              // This ensures the video still plays even if stats can't be updated
            }
          }
        } else {
          console.error(`Video with ID ${id} not found`);
        }
      } catch (error) {
        console.error('Error fetching video data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchVideoData();
    
    // Cleanup function to stop and unload video when component unmounts
    return () => {
      if (video.current) {
        video.current.pauseAsync()
          .then(() => video.current?.unloadAsync())
          .catch(err => console.log('Error cleaning up video:', err));
      }
    };
  }, [id]);

  // Load comments for the video
  const loadComments = async (videoId: string) => {
    try {
      setIsLoadingComments(true);
      const commentsData = await fetchComments(videoId);
      setComments(commentsData || []);
      
      // Set initial comment count
      setCommentCount(commentsData?.length || 0);
      
      // Also update in videoData for consistency
      if (videoData) {
        setVideoData(prev => prev ? {...prev, comments: commentsData?.length || 0} : null);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setIsLoadingComments(false);
    }
  };

  // Function to check if user can delete a comment
  const canDeleteComment = (commentAuthorId: string): boolean => {
    if (!currentUser) return false;
    
    // User can delete their own comment or comments on their videos
    return (
      commentAuthorId === currentUser._id || 
      (videoData?.authorId === currentUser._id)
    );
  };

  // Handle liking a comment
  const handleLikeComment = async (commentId: string) => {
    if (!currentUser || !videoData?.id) {
      // Handle not logged in state or missing videoId
      if (!currentUser) router.push('/login' as any);
      return;
    }
    
    try {
      // Pass parameters in correct order: commentId, userId, videoId
      await toggleLikeComment(commentId, currentUser._id, videoData.id);
      
      // Update UI optimistically
      setComments(prevComments => 
        prevComments.map(comment => {
          if (comment.id === commentId) {
            const hasLiked = !comment.hasLiked;
            return {
              ...comment,
              hasLiked,
              likes: hasLiked 
                ? (comment.likes || 0) + 1 
                : Math.max(0, (comment.likes || 0) - 1)
            };
          }
          return comment;
        })
      );
    } catch (error) {
      console.error('Error liking comment:', error);
    }
  };

  // Handle deleting a comment
  const handleDeleteComment = async (commentId: string) => {
    if (!videoData?.id || !currentUser?._id) {
      console.error('Cannot delete comment: Video ID or User ID is undefined');
      return;
    }
    
    try {
      // Pass parameters in correct order: commentId, userId, videoId
      await deleteComment(commentId, currentUser._id, videoData.id);
      
      // Update UI
      setComments(prevComments => 
        prevComments.filter(comment => comment.id !== commentId)
      );
      
      // Update comment count immediately in state
      setCommentCount(prev => Math.max(0, prev - 1));
      
      // Also update in videoData for consistency
      setVideoData(prev => prev ? {...prev, comments: Math.max(0, (prev.comments || 0) - 1)} : null);
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  // Handle submitting a new comment
  const handleSubmitComment = async () => {
    if (!newComment.trim() || !currentUser?._id) return;
    
    // Check if videoData and videoData.id exist before proceeding
    if (!videoData?.id) {
      console.error('Cannot add comment: Video ID is undefined');
      return;
    }
    
    try {
      // Call addComment with parameters in the right order: videoId, userId, text
      const comment = await addComment(
        videoData.id,
        currentUser._id,
        newComment.trim()
      );
      
      if (comment) {
        // Add the new comment to the list
        setComments(prevComments => [comment, ...prevComments]);
        
        // Clear the input
        setNewComment('');
        
        // Update comment count immediately in state
        setCommentCount(prev => prev + 1);
        
        // Also update in videoData for consistency
        setVideoData(prev => prev ? {...prev, comments: (prev.comments || 0) + 1} : null);
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  useEffect(() => {
    if (!status || !status.isLoaded || hasEarnedPoints || !videoData) return;

    const isFinished =
      status.didJustFinish ||
      (status.durationMillis && status.positionMillis >= status.durationMillis - 100);

    if (isFinished) {
      console.log('Video completed. Current points:', points);
      const pointsToAdd = videoData.points || 10;
      addPoints(pointsToAdd);
      setHasEarnedPoints(true);
      setDisplayPoints(points + pointsToAdd); // Force local update
      console.log('Points added. New total should be:', points + pointsToAdd);
    }
  }, [status, hasEarnedPoints, addPoints, points, videoData]);

  const handlePlaybackStatusUpdate = (newStatus: AVPlaybackStatus) => {
    setStatus(newStatus);
    if (newStatus.isLoaded) {
      // Check if video has ended
      if (newStatus.didJustFinish) {
        setIsVideoEnded(true);
      }
      
      console.log(
        `Position: ${newStatus.positionMillis}/${newStatus.durationMillis}, Finished: ${newStatus.didJustFinish}`
      );
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    video.current?.setIsMutedAsync(!isMuted);
  };

  const handleRecommendationPress = (videoId: string) => {
    // Stop current video playback before navigation
    if (video.current) {
      // Pause the video
      video.current.pauseAsync()
        .then(() => {
          // Unload video resources if possible to stop audio completely
          video.current?.unloadAsync()
            .catch(err => console.log('Error unloading video:', err));
          
          // Then navigate to the new video
          router.push(`/video-detail?id=${videoId}` as any);
        })
        .catch(err => {
          console.log('Error pausing video:', err);
          // If error, still try to navigate
          router.push(`/video-detail?id=${videoId}` as any);
        });
    } else {
      // If video ref isn't available, just navigate
      router.push(`/video-detail?id=${videoId}` as any);
    }
  };

  // Calculate video height based on orientation and screen size
  const getVideoHeight = () => {
    if (!videoData) return { height: height * 0.7 };
    
    // Get device dimensions and account for status bar and header
    const headerHeight = 100; // Approximate header height
    const availableHeight = height - headerHeight;
    
    if (videoData.type === 'horizontal') {
      // For horizontal videos, ensure they take more space
      return { height: Math.max(width * (9/16), availableHeight * 0.75) };
    } else {
      // For vertical videos, use full available height
      return { height: availableHeight * 0.9 };
    }
  };

  // Check if video is playing
  const isVideoPlaying = () => {
    if (status && status.isLoaded) {
      // In Expo AV, there is no direct isPlaying flag, so we use didJustFinish and check if position is advancing
      return !status.didJustFinish && !isVideoEnded;
    }
    return false;
  };

  // Handle restarting the video
  const handleRestartVideo = () => {
    if (video.current) {
      // Reset playback position to beginning
      video.current.setPositionAsync(0)
        .then(() => {
          // Play the video again
          video.current?.playAsync()
            .then(() => {
              setIsVideoEnded(false);
            })
            .catch(err => console.log('Error playing video:', err));
        })
        .catch(err => console.log('Error setting position:', err));
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#1877F2" />
        <Text style={styles.loadingText}>Loading video...</Text>
      </View>
    );
  }

  if (!videoData) {
    return (
      <View style={[styles.container, styles.errorContainer]}>
        <Text style={styles.errorText}>Video not found</Text>
        <Pressable onPress={() => router.back()} style={styles.backToFeedButton}>
          <Text style={styles.backToFeedText}>Back to Feed</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.header}>
        <Pressable 
          onPress={() => {
            // Stop video before navigating back
            if (video.current) {
              video.current.pauseAsync()
                .then(() => {
                  video.current?.unloadAsync()
                    .catch(err => console.log('Error unloading video:', err));
                  router.back();
                })
                .catch(err => {
                  console.log('Error pausing video:', err);
                  router.back();
                });
            } else {
              router.back();
            }
          }} 
          style={styles.backButton}
        >
          <ArrowLeft color="white" size={24} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
          {videoData.title}
        </Text>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        onScroll={(event) => {
          // Use both handlers
          animatedScrollEvent(event);
          handleScroll(event);
        }}
        scrollEventThrottle={16}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View style={[styles.videoContainer, getVideoHeight()]}>
          <Video
            ref={video}
            style={styles.video}
            source={{ uri: videoData.url }}
            useNativeControls={false}
            resizeMode={videoData.type === 'vertical' ? ResizeMode.COVER : ResizeMode.CONTAIN}
            isLooping={false}
            onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
            isMuted={isMuted}
            shouldPlay
          />

          {/* Enhanced video controls with better positioning */}
          <View style={styles.videoOverlay}>
            {/* Bottom controls - keeping only mute button */}
            <View style={styles.bottomControls}>
              <Pressable onPress={toggleMute} style={styles.muteButton}>
                {isMuted ? <VolumeX color="white" size={22} /> : <Volume2 color="white" size={22} />}
              </Pressable>
            </View>
          </View>

          {/* Video progress bar - moved to top edge */}
          {status?.isLoaded && (
            <View style={styles.progressBarContainer}>
              <View 
                style={[
                  styles.progressBar, 
                  { 
                    width: `${status.positionMillis / (status.durationMillis || 1) * 100}%` 
                  }
                ]} 
              />
            </View>
          )}

          {/* Restart overlay when video ends */}
          {isVideoEnded && (
            <View style={styles.restartOverlay}>
              <Pressable 
                onPress={handleRestartVideo} 
                style={styles.restartButton}
              >
                <RefreshCw color="white" size={40} />
                <Text style={styles.restartText}>Restart Video</Text>
              </Pressable>
            </View>
          )}
        </View>

        <Animated.View style={[
          styles.info,
          {
            transform: [{ 
              translateY: scrollY.interpolate({
                inputRange: [0, getAnimationValues().startHide, getAnimationValues().endHide],
                outputRange: [getAnimationValues().offset, 0, 0],
                extrapolate: 'clamp'
              })
            }],
            opacity: scrollY.interpolate({
              inputRange: [0, getAnimationValues().startShow, getAnimationValues().endShow],
              outputRange: [0, 0.7, 1],
              extrapolate: 'clamp'
            }),
            position: 'relative',
            zIndex: 100
          }
        ]}>
          {/* Author info with avatar and verification */}
          <View style={styles.authorContainer}>
            <Image 
              source={{ uri: videoData.authorAvatar || 'https://via.placeholder.com/40' }} 
              style={styles.authorAvatar} 
            />
            <View style={styles.authorInfo}>
              <View style={styles.authorNameRow}>
        <Text style={styles.author} numberOfLines={1} ellipsizeMode="tail">
          {videoData.author}
        </Text>
                {(videoData.isVerified || videoData.isBlueVerified) && (
                  <TunnelVerifiedMark size={14} />
                )}
              </View>
              {videoData.description && (
                <Text style={styles.description} numberOfLines={3} ellipsizeMode="tail">
                  {videoData.description}
                </Text>
              )}
            </View>
          </View>
          
        {hasEarnedPoints && (
          <Text style={styles.earnedPoints} numberOfLines={1} ellipsizeMode="tail">
            +{videoData.points} points earned! Total: {displayPoints}
          </Text>
        )}
        {!hasEarnedPoints && status?.isLoaded && (
          <Text style={styles.watchPrompt} numberOfLines={2} ellipsizeMode="tail">
              Watch the full video to earn {videoData.points || 10} points!
          </Text>
        )}
        </Animated.View>

        {/* Video stats section */}
        <Animated.View style={[
          styles.statsContainer,
          {
            transform: [{ 
              translateY: scrollY.interpolate({
                inputRange: [0, getAnimationValues().startHide, getAnimationValues().endHide],
                outputRange: [getAnimationValues().offset, 0, 0],
                extrapolate: 'clamp'
              })
            }],
            opacity: scrollY.interpolate({
              inputRange: [0, getAnimationValues().startShow, getAnimationValues().endShow],
              outputRange: [0, 0.7, 1],
              extrapolate: 'clamp'
            })
          }
        ]}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatViewCount(videoData.views || 0)}</Text>
            <Text style={styles.statLabel}>Views</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatViewCount(videoData.likes || 0)}</Text>
            <Text style={styles.statLabel}>Likes</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatViewCount(videoData.comments || 0)}</Text>
            <Text style={styles.statLabel}>Comments</Text>
          </View>
        </Animated.View>

        {/* Comments section */}
        <Animated.View style={[
          styles.commentsSection,
          {
            transform: [{ 
              translateY: scrollY.interpolate({
                inputRange: [0, getAnimationValues().startHide, getAnimationValues().endHide],
                outputRange: [getAnimationValues().offset, 0, 0],
                extrapolate: 'clamp'
              })
            }],
            opacity: scrollY.interpolate({
              inputRange: [0, getAnimationValues().startShow, getAnimationValues().endShow],
              outputRange: [0, 0.7, 1],
              extrapolate: 'clamp'
            })
          }
        ]}>
          <View style={styles.commentsHeader}>
            <View style={styles.commentsTitleContainer}>
              <MessageCircle size={18} color="#1877F2" />
              <Text style={styles.commentsTitle}>Comments</Text>
            </View>
            <View style={styles.commentCountContainer}>
              <Text style={styles.commentsCount}>{formatViewCount(commentCount)}</Text>
            </View>
          </View>
          
          {/* Comments list */}
          {isLoadingComments ? (
            <View style={styles.commentsLoading}>
              <ActivityIndicator size="small" color="#1877F2" />
              <Text style={styles.commentsLoadingText}>Loading comments...</Text>
            </View>
          ) : comments.length === 0 ? (
            <View style={styles.emptyComments}>
              <Text style={styles.emptyCommentsText}>No comments yet</Text>
              <Text style={styles.emptyCommentsText}>Be the first to comment!</Text>
            </View>
          ) : (
            <FlatList
              data={comments}
              renderItem={({ item }) => (
                <CommentItem 
                  comment={item}
                  onLike={handleLikeComment}
                  onDelete={handleDeleteComment}
                  canDelete={canDeleteComment(item.user.id)}
                />
              )}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.commentsList}
              scrollEnabled={false} // Disable scrolling within this list since we're in a ScrollView
              ListFooterComponent={comments.length > 0 ? (
                <Text style={styles.commentsLoadingText}>
                  <ChevronRight size={14} color="#999" /> Scroll to see all {comments.length} comments
                </Text>
              ) : null}
            />
          )}
          
          {/* Add comment input */}
          <View style={styles.addCommentContainer}>
            <Image 
              source={{ uri: currentUser?.profile?.avatar ? currentUser.profile.avatar : 'https://via.placeholder.com/40' }}
              style={styles.commentInputAvatar}
            />
            <View style={styles.commentInputContainer}>
              <TextInput
                ref={commentInputRef}
                style={styles.commentInput}
                placeholder="Add a comment..."
                placeholderTextColor="#999"
                value={newComment}
                onChangeText={setNewComment}
                multiline
                maxLength={500}
              />
              <TouchableOpacity 
                style={[
                  styles.sendButton,
                  !newComment.trim() && styles.sendButtonDisabled
                ]} 
                onPress={handleSubmitComment}
                disabled={!newComment.trim()}
              >
                <Send size={18} color={newComment.trim() ? "#1877F2" : "#666"} />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {/* Recommendations section - always visible, 2 videos per row */}
        <Animated.View 
          style={[
            styles.recommendationsSection,
            {
              transform: [{ 
                translateY: scrollY.interpolate({
                  inputRange: [0, getAnimationValues().startHide, getAnimationValues().endHide],
                  outputRange: [getAnimationValues().offset, 0, 0],
                  extrapolate: 'clamp'
                })
              }],
              opacity: scrollY.interpolate({
                inputRange: [0, getAnimationValues().startShow, getAnimationValues().endShow],
                outputRange: [0, 0.7, 1],
                extrapolate: 'clamp'
              })
            }
          ]}
        >
          <View style={styles.recommendationsHeader}>
            <Text style={styles.recommendationsTitle}>Recommended Videos</Text>
            <Pressable 
              onPress={() => {
                // Stop current video before navigating
                if (video.current) {
                  video.current.pauseAsync()
                    .then(() => {
                      video.current?.unloadAsync()
                        .catch(err => console.log('Error unloading video:', err));
                      router.push("/" as any);
                    })
                    .catch(err => {
                      console.log('Error pausing video:', err);
                      router.push("/" as any);
                    });
                } else {
                  router.push("/" as any);
                }
              }}
            >
              <Text style={styles.seeAllText}>See All <ChevronRight size={14} color="#1877F2" /></Text>
            </Pressable>
          </View>
          
          <View style={styles.recommendationsGrid}>
            {recommendedVideos.map((item) => (
              <RecommendationItem 
                key={item.id} 
                item={item} 
                onPress={() => handleRecommendationPress(item.id)} 
              />
            ))}
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  scrollContainer: {
    flex: 1,
  },
  videoContainer: {
    width: '100%',
    position: 'relative',
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(50, 50, 50, 0.5)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    zIndex: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(50, 50, 50, 0.3)',
  },
  backButton: {
    marginRight: 15,
    padding: 5,
  },
  title: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    flex: 1,
    maxWidth: width * 0.7,
  },
  video: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  bottomControls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  muteButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 10,
    borderRadius: 50,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBarContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: 10,
  },
  progressBar: {
    backgroundColor: '#1877F2',
    height: '100%',
  },
  info: {
    padding: 20,
    backgroundColor: 'rgba(22, 22, 22, 1)',
    width: '100%',
  },
  authorContainer: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  authorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#333',
  },
  authorInfo: {
    marginLeft: 12,
    flex: 1,
  },
  authorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  author: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    marginRight: 8,
  },
  earnedPoints: {
    color: '#00ff00',
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    maxWidth: '85%',
    marginTop: 10,
  },
  watchPrompt: {
    color: '#888',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    maxWidth: '85%',
    marginTop: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    marginTop: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  errorText: {
    color: 'white',
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 30,
    textAlign: 'center',
  },
  backToFeedButton: {
    backgroundColor: '#1877F2',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  backToFeedText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  description: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    maxWidth: '100%',
  },
  // Video Stats Section
  statsContainer: {
    flexDirection: 'row',
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(30, 30, 30, 1)',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(50, 50, 50, 0.5)',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  statLabel: {
    color: '#999',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginTop: 5,
  },
  // Comments section
  commentsSection: {
    backgroundColor: 'rgba(22, 22, 22, 1)',
    paddingTop: 20,
    paddingBottom: 16,
  },
  commentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  commentsTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentsTitle: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    marginLeft: 8,
  },
  commentCountContainer: {
    backgroundColor: 'rgba(24, 119, 242, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentsCount: {
    color: '#1877F2',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  commentsLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  commentsLoadingText: {
    color: '#999',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginTop: 10,
  },
  emptyComments: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyCommentsText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 8,
  },
  commentsList: {
    paddingHorizontal: 16,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#333',
  },
  commentContent: {
    flex: 1,
    marginLeft: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentUser: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentUsername: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  commentVerified: {
    marginLeft: 4,
  },
  commentTime: {
    color: '#999',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  commentText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
    marginBottom: 8,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentAction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  commentActionActive: {
    opacity: 1,
  },
  commentActionText: {
    color: '#999',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginLeft: 4,
  },
  commentActionTextActive: {
    color: '#1877F2',
  },
  addCommentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(50, 50, 50, 0.5)',
    marginTop: 10,
  },
  commentInputAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#333',
  },
  commentInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(40, 40, 40, 1)',
    borderRadius: 20,
    marginLeft: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  commentInput: {
    flex: 1,
    color: 'white',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    maxHeight: 80,
    padding: 0,
  },
  sendButton: {
    padding: 6,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  // Recommendations Section
  recommendationsSection: {
    backgroundColor: 'rgba(22, 22, 22, 1)',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  recommendationsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  recommendationsTitle: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  seeAllText: {
    color: '#1877F2',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    flexDirection: 'row',
    alignItems: 'center',
  },
  recommendationsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  recommendationItem: {
    width: '48%',
    marginBottom: 16,
    backgroundColor: 'rgba(35, 35, 35, 1)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  thumbnailContainer: {
    width: '100%',
    height: 100,
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  viewsTag: {
    position: 'absolute',
    right: 5,
    bottom: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  viewsText: {
    color: 'white',
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
  },
  recommendationTitle: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    padding: 8,
    paddingBottom: 4,
  },
  recommendationAuthor: {
    color: '#999',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  restartOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  restartButton: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  restartText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginTop: 10,
  },
});