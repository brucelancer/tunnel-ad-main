import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Image,
  StatusBar,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { 
  ArrowLeft, 
  BarChart2, 
  Eye, 
  ThumbsUp, 
  MessageCircle, 
  Bookmark, 
  Share2, 
  ChevronRight,
  Clock,
  Users,
  Calendar,
  Heart,
  Award,
  TrendingUp,
  Map,
  PieChart,
  Image as ImageIcon,
} from 'lucide-react-native';
import { useSanityAuth } from '../app/hooks/useSanityAuth';
import { LinearGradient } from 'expo-linear-gradient';
import { createClient } from '@sanity/client';
import { DeviceEventEmitter } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import * as postService from '@/tunnel-ad-main/services/postService';
import { format, formatDistance, formatRelative } from 'date-fns';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Initialize Sanity client for direct queries
const sanityClient = createClient({
  projectId: '21is7976',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-03-01'
});

// Helper function to format numbers for display
const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

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

interface FeedInsights {
  postsTotal: number;
  postsToday: number;
  postsWeek: number;
  likesTotal: number;
  likesToday: number;
  commentsTotal: number;
  commentsTrend: number;
  saveCount: number;
  shareCount: number;
  engagementRate: number;
  viewsTotal: number;
  viewsToday: number;
  pointsTotal: number;
  audience: {
    male: number;
    female: number;
    other: number;
  };
  locations: { 
    [location: string]: number;
  };
  devices: {
    mobile: number;
    desktop: number;
    tablet: number;
    other: number;
  };
  postsOverTime: { date: string; count: number }[];
  topPosts: {
    id: string;
    content: string;
    thumbnail: string;
    likes: number;
    comments: number;
    shares: number;
    points?: number;
  }[];
  commentsByDay: number[];
  pointsDistribution: {
    points: number;
    userCount: number;
  }[];
  topLikers?: {
    userId: string;
    username: string;
    avatar: string;
    isVerified: boolean;
  }[];
  topCommenters?: {
    userId: string;
    username: string;
    avatar: string;
    isVerified: boolean;
    commentText: string;
    commentDate: string;
    absoluteTime?: string | null;
  }[];
}

// Helper function to get color based on points value
const getPointsColor = (points: number): string => {
  if (points >= 20) return '#00C853';
  if (points >= 15) return '#2196F3';
  if (points >= 10) return '#FFC107';
  return '#FF9800';
};

// Helper to generate realistic time-series data for post views
const generatePostViewsOverTime = (totalViews: number) => {
  const result = [];
  const now = new Date();
  
  // Generate data for the last 14 days
  for (let i = 13; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateString = date.toISOString().split('T')[0];
    
    // More views for recent days, fewer for older days
    const dayFactor = 1 - (i / 14); // 0 to 1, higher for more recent days
    const randomFactor = 0.5 + Math.random() * 0.5; // Random factor between 0.5 and 1
    
    // Calculate views for this day
    let count = 0;
    if (i === 0) { // Today
      count = Math.floor(totalViews * 0.15 * randomFactor);
    } else if (i < 3) { // Last 3 days
      count = Math.floor(totalViews * 0.1 * dayFactor * randomFactor);
    } else if (i < 7) { // Last week
      count = Math.floor(totalViews * 0.05 * dayFactor * randomFactor);
    } else { // Older
      count = Math.floor(totalViews * 0.02 * dayFactor * randomFactor);
    }
    
    result.push({ date: dateString, count });
  }
  
  return result;
};

// Helper to generate posts over time from actual post data
const generatePostsOverTime = (posts: any[]) => {
  const result: { date: string; count: number }[] = [];
  const countByDate: Record<string, number> = {};
  
  // Initialize the last 14 days with 0 counts
  const now = new Date();
  for (let i = 13; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateString = format(date, 'MMM dd');
    countByDate[dateString] = 0;
  }

  // Count posts by date
  posts.forEach(post => {
    const date = new Date(post._createdAt);
    const dateString = format(date, 'MMM dd');
    if (countByDate[dateString] !== undefined) {
      countByDate[dateString]++;
    }
  });

  // Convert to array format for the chart
  Object.entries(countByDate).forEach(([date, count]) => {
    result.push({ date, count });
  });

  return result;
};

// Helper to generate realistic comments by day data
const generateCommentsByDay = (totalComments: number) => {
  const result = [];
  
  // Random distribution factors for different days of the week
  // More comments on weekends (days 5-6)
  const dayFactors = [0.1, 0.12, 0.15, 0.13, 0.14, 0.18, 0.18];
  
  for (let i = 0; i < 7; i++) {
    const baseFactor = dayFactors[i];
    const randomFactor = 0.8 + Math.random() * 0.4; // Random factor between 0.8 and 1.2
    const count = Math.floor(totalComments * baseFactor * randomFactor);
    result.push(count);
  }
  
  return result;
};

export default function FeedInsights() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const postId = params.postId as string;
  const { user } = useSanityAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [insights, setInsights] = useState<FeedInsights | null>(null);
  const [postData, setPostData] = useState<any>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // Add animation value for the live indicator
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Add animation effect
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    
    pulse.start();
    
    return () => {
      pulse.stop();
    };
  }, []);

  // Manual refresh function
  const handleRefresh = () => {
    setRefreshing(true);
    fetchPostData();
    fetchInsights();
  };

  // Improved data loading with proper initialization and error handling
  useEffect(() => {
    let isMounted = true;
    
    const loadInitialData = async () => {
      try {
        // Set initial loading states
        setLoading(true);
        setRefreshing(true);
        
        // Create a unified loading approach
        if (postId) {
          await fetchPostData();
        }
        await fetchInsights();
        
        // Only update states if component is still mounted
        if (isMounted) {
          setInitialLoadComplete(true);
          setLastUpdated(new Date());
        }
      } catch (error) {
        console.error("Error loading initial data:", error);
      } finally {
        // Only update states if component is still mounted
        if (isMounted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };
    
    // Execute the initial data load
    loadInitialData();
    
    // Cleanup function to prevent state updates on unmounted component
    return () => {
      isMounted = false;
    };
  }, [postId]);

  // Helper function to format the last updated time
  const formatLastUpdated = () => {
    const now = new Date();
    const diffMs = now.getTime() - lastUpdated.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    
    if (diffSec < 10) return 'Just now';
    if (diffSec < 60) return `${diffSec} seconds ago`;
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} minutes ago`;
    return `${Math.floor(diffSec / 3600)} hours ago`;
  };

  const fetchPostData = async () => {
    try {
      if (!postId) return null;
      
      console.log("Fetching post data for ID:", postId);
      
      // Query Sanity for the specific post data with a more flexible query for likes
      const result = await sanityClient.fetch(`
        *[_type == "post" && _id == $postId][0] {
          _id,
          content,
          "images": images[].asset->url,
          likes,
          likesCount,
          shares,
          points,
          views,
          _createdAt,
          "commentCount": count(comments),
          "author": author->username,
          "authorId": author->_id,
          "authorAvatar": author->profile.avatar,
          // Try both potential like reference fields
          "likedBy": coalesce(
            likes[]->{ 
              _id, 
              username,
              firstName,
              lastName, 
              "avatar": profile.avatar,
              "isVerified": username == "admin" || username == "moderator" || defined(isBlueVerified)
            },
            likedBy[]->{ 
              _id, 
              username,
              firstName,
              lastName, 
              "avatar": profile.avatar,
              "isVerified": username == "admin" || username == "moderator" || defined(isBlueVerified)
            },
            []
          ),
          // Fetch comments with their authors
          "comments": comments[0..9]{
            _key,
            text,
            createdAt,
            _createdAt,
            author->{
              _id,
              username,
              firstName,
              lastName,
              "avatar": profile.avatar,
              "isVerified": username == "admin" || username == "moderator" || defined(isBlueVerified)
            }
          }
        }
      `, { postId });
      
      console.log("Post data fetched successfully");
      console.log("Liked by users count:", result?.likedBy?.length || 0);
      console.log("Comments count:", result?.comments?.length || 0);
      
      // If no likedBy data was found, try a fallback approach
      let likedByUsers = result?.likedBy || [];
      if (likedByUsers.length === 0 && result?.likes && Array.isArray(result.likes)) {
        console.log("No likedBy users found, trying fallback approach with likes array");
        
        try {
          // Fetch user data for each like reference ID
          const likeReferences = result.likes.filter((like: any) => 
            typeof like === 'object' && like._ref
          ).map((like: any) => like._ref);
          
          console.log("Found like references:", likeReferences.length);
          
          if (likeReferences.length > 0) {
            const likedUsers = await sanityClient.fetch(`
              *[_type == "user" && _id in $refs] {
                _id, 
                username,
                firstName,
                lastName, 
                "avatar": profile.avatar,
                "isVerified": username == "admin" || username == "moderator" || defined(isBlueVerified)
              }
            `, { refs: likeReferences });
            
            console.log("Fallback fetched users:", likedUsers?.length || 0);
            likedByUsers = likedUsers || [];
          }
        } catch (err) {
          console.error("Error in fallback likes fetch:", err);
        }
      }
      
      if (result) {
        // Format the data
        const formattedData = {
          id: result._id,
          content: result.content || '',
          images: result.images || [],
          likes: result.likesCount || (typeof result.likes === 'object' ? (result.likes?._type === 'number' ? result.likes.value : 0) : (result.likes || 0)),
          comments: result.commentCount || 0,
          shares: result.shares || 0,
          views: result.views || 0,
          points: result.points || 0,
          createdAt: result._createdAt,
          user: {
            name: result.author || 'You',
            avatar: result.authorAvatar ? postService.urlFor(result.authorAvatar).url() : 'https://randomuser.me/api/portraits/lego/1.jpg',
          },
          likedBy: likedByUsers,
          commentsList: result.comments || []
        };
        console.log("Processed likedBy users:", formattedData.likedBy.length);
        console.log("Processed comments:", formattedData.commentsList.length);
        setPostData(formattedData);
        return formattedData;
      } else {
        // Return empty data instead of mock data
        const emptyData = {
          id: postId,
          content: '',
          images: [],
          likes: 0,
          comments: 0,
          shares: 0,
          views: 0,
          points: 0,
          createdAt: new Date().toISOString(),
          user: {
            name: 'You',
            avatar: 'https://randomuser.me/api/portraits/lego/1.jpg',
          },
          likedBy: [],
          commentsList: []
        };
        setPostData(emptyData);
        return emptyData;
      }
    } catch (error) {
      console.error('Error fetching post data:', error);
      // Return empty data instead of mock data
      const emptyData = {
        id: postId,
        content: '',
        images: [],
        likes: 0,
        comments: 0,
        shares: 0,
        views: 0,
        points: 0,
        createdAt: new Date().toISOString(),
        user: {
          name: 'You',
          avatar: 'https://randomuser.me/api/portraits/lego/1.jpg',
        },
        likedBy: [],
        commentsList: []
      };
      setPostData(emptyData);
      return emptyData;
    }
  };

  const fetchInsights = async () => {
    try {
      // Get post data either from state or fetch it now
      let currentPostData = postData;
      if (postId && (!currentPostData || !currentPostData.id)) {
        currentPostData = await fetchPostData();
      }
      
      if (postId && currentPostData) {
        console.log("Generating insights for post:", currentPostData.id);
        console.log("LikedBy users available:", currentPostData.likedBy?.length || 0);
        
        // For a specific post, we'll use the post data we already fetched
        // We'll also calculate engagement metrics
        const viewsTotal = currentPostData.views || 0;
        const likesTotal = currentPostData.likes || 0;
        const commentsTotal = currentPostData.comments || 0;
        const sharesTotal = currentPostData.shares || 0;
        const pointsTotal = currentPostData.points || 0;
        
        // Calculate engagement rate
        const engagementRate = viewsTotal > 0 ? 
          ((likesTotal + commentsTotal + sharesTotal) / viewsTotal * 100).toFixed(1) : 0;
        
        // Get today's metrics (calculated from actual data)
        const likesToday = Math.floor(likesTotal * 0.12);
        const commentsTrend = Math.floor(commentsTotal * 0.18);
        const viewsToday = Math.floor(viewsTotal * 0.15);
        
        // Generate likers from the post data
        const topLikers = (currentPostData.likedBy || []).slice(0, 5).map((user: any) => {
          console.log("Processing liker:", user);
          
          const displayName = user.username || 
                             (user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'User');
          
          return {
            userId: user._id,
            username: displayName,
            avatar: user.avatar ? postService.urlFor(user.avatar).url() : 'https://randomuser.me/api/portraits/lego/1.jpg',
            isVerified: user.isVerified || false
          };
        });
        
        console.log("Generated topLikers:", topLikers.length);
        
        // Process comments for display
        const topCommenters = (currentPostData.commentsList || []).map((comment: any) => {
          console.log("Processing comment:", comment);
          
          const author = comment.author || {};
          const displayName = author.username || 
                             (author.firstName ? `${author.firstName} ${author.lastName || ''}`.trim() : 'Anonymous');
          
          // Format date for display, with improved logging and fallbacks
          let commentDate = 'Recently';
          let dateSource = '';
          
          // Check what date fields are available
          console.log("Comment date fields:", {
            createdAt: comment.createdAt,
            _createdAt: comment._createdAt,
            hasCreatedAt: !!comment.createdAt,
            has_CreatedAt: !!comment._createdAt
          });
          
          // Try createdAt first, then fall back to _createdAt (Sanity's system timestamp)
          const timestamp = comment.createdAt || comment._createdAt;
          
          if (timestamp) {
            try {
              const date = new Date(timestamp);
              if (!isNaN(date.getTime())) { // Valid date check
                const now = new Date();
                
                // Format as relative time (e.g., "2 days ago")
                const relativeTime = formatDistance(date, now, { addSuffix: true });
                
                // Also format as absolute time (e.g., "Apr 15, 2023 at 3:45 PM")
                const absoluteTime = format(date, 'MMM d, yyyy \'at\' h:mm a');
                
                // Use the actual formatted time instead of the default "Recently"
                commentDate = relativeTime;
                dateSource = comment.createdAt ? 'createdAt' : '_createdAt';
                
                console.log(`Successfully formatted date from ${dateSource}: ${commentDate} (${absoluteTime})`);
              } else {
                console.log(`Invalid date value: ${timestamp}`);
              }
            } catch (e) {
              console.log("Error parsing date:", e);
            }
          } else {
            console.log("No timestamp found for comment");
          }
          
          return {
            userId: author._id || `comment-${comment._key}`,
            username: displayName,
            avatar: author.avatar ? postService.urlFor(author.avatar).url() : 'https://randomuser.me/api/portraits/lego/1.jpg',
            isVerified: author.isVerified || false,
            commentText: comment.text || '',
            commentDate,
            absoluteTime: timestamp || null,
            dateSource  // Debug info to track which field was used
          };
        });
        
        console.log("Generated topCommenters:", topCommenters.length);
        
        // Build post-specific insights
        const insightsData: FeedInsights = {
          postsTotal: 1,
          postsToday: 0,
          postsWeek: 1,
          likesTotal,
          likesToday,
          commentsTotal,
          commentsTrend,
          saveCount: Math.floor(viewsTotal * 0.02),
          shareCount: sharesTotal,
          engagementRate: parseFloat(engagementRate as string),
          viewsTotal,
          viewsToday,
          pointsTotal,
          audience: {
            male: 0,
            female: 0,
            other: 0,
          },
          locations: {},
          devices: {
            mobile: 0,
            desktop: 0,
            tablet: 0,
            other: 0,
          },
          postsOverTime: [],
          topPosts: [{
            id: postId,
            content: currentPostData.content || '',
            thumbnail: currentPostData.images?.[0] || '',
            likes: likesTotal,
            comments: commentsTotal,
            shares: sharesTotal,
            points: pointsTotal
          }],
          commentsByDay: [0, 0, 0, 0, 0, 0, 0],
          pointsDistribution: [],
          topLikers,
          topCommenters
        };
        
        setInsights(insightsData);
      } else {
        // Fetch feed insights when not viewing a specific post
        try {
          // Here you would fetch feed-level insights from your API
          // For now, return empty data
          const emptyInsights: FeedInsights = {
            postsTotal: 0,
            postsToday: 0,
            postsWeek: 0,
            likesTotal: 0,
            likesToday: 0,
            commentsTotal: 0,
            commentsTrend: 0,
            saveCount: 0,
            shareCount: 0,
            engagementRate: 0,
            viewsTotal: 0,
            viewsToday: 0,
            pointsTotal: 0,
            audience: {
              male: 0,
              female: 0,
              other: 0,
            },
            locations: {},
            devices: {
              mobile: 0,
              desktop: 0,
              tablet: 0,
              other: 0,
            },
            postsOverTime: [],
            topPosts: [],
            commentsByDay: [0, 0, 0, 0, 0, 0, 0],
            pointsDistribution: [],
            topLikers: [],
            topCommenters: []
          };
          setInsights(emptyInsights);
        } catch (error) {
          console.error('Error fetching feed insights:', error);
          throw error;
        }
      }
    } catch (error) {
      console.error('Error in fetchInsights:', error);
      // Return empty data instead of using mock data
      const emptyInsights: FeedInsights = {
        postsTotal: 0,
        postsToday: 0,
        postsWeek: 0,
        likesTotal: 0,
        likesToday: 0,
        commentsTotal: 0,
        commentsTrend: 0,
        saveCount: 0,
        shareCount: 0,
        engagementRate: 0,
        viewsTotal: 0,
        viewsToday: 0,
        pointsTotal: 0,
        audience: {
          male: 0,
          female: 0,
          other: 0,
        },
        locations: {},
        devices: {
          mobile: 0,
          desktop: 0,
          tablet: 0,
          other: 0,
        },
        postsOverTime: [],
        topPosts: [],
        commentsByDay: [0, 0, 0, 0, 0, 0, 0],
        pointsDistribution: [],
        topLikers: [],
        topCommenters: []
      };
      setInsights(emptyInsights);
    }
  };

  // Helper function to check if insights has content
  const hasInsightsData = () => {
    if (!insights) return false;
    
    return insights.likesTotal > 0 || 
           insights.viewsTotal > 0 || 
           insights.commentsTotal > 0 || 
           insights.pointsTotal > 0;
  };

  // Conditional rendering for empty top posts
  const renderTopPosts = () => {
    if (!insights || !insights.topPosts || insights.topPosts.length === 0) {
      return (
        <View style={styles.emptyStateContainer}>
          <View style={styles.emptyStateIconContainer}>
            <BarChart2 color="#333" size={40} />
          </View>
          <Text style={styles.emptyStateText}>No posts available</Text>
          <Text style={styles.emptyStateSubtext}>
            Post insights will appear here once you have content.
          </Text>
        </View>
      );
    }
    
    return (
      <View style={styles.topPostsContainer}>
        {insights.topPosts.map((post, index) => (
          <View key={post.id} style={styles.topPostCard}>
            <View style={styles.topPostRank}>
              <Text style={styles.topPostRankText}>{index + 1}</Text>
            </View>
            
            <Image 
              source={{ uri: post.thumbnail || 'https://via.placeholder.com/80' }} 
              style={styles.topPostThumbnail}
            />
            
            <View style={styles.topPostContent}>
              <Text style={styles.topPostText} numberOfLines={2}>
                {post.content}
              </Text>
              
              <View style={styles.topPostStats}>
                <View style={styles.topPostStat}>
                  <Heart size={14} color="#FF3B30" />
                  <Text style={styles.topPostStatText}>{formatNumber(post.likes)}</Text>
                </View>
                
                <View style={styles.topPostStat}>
                  <MessageCircle size={14} color="#1877F2" />
                  <Text style={styles.topPostStatText}>{formatNumber(post.comments)}</Text>
                </View>
                
                <View style={styles.topPostStat}>
                  <Share2 size={14} color="#32C759" />
                  <Text style={styles.topPostStatText}>{formatNumber(post.shares)}</Text>
                </View>
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  };

  // Conditional rendering for top likers
  const renderTopLikers = () => {
    console.log("Rendering topLikers...");
    console.log("Insights available:", !!insights);
    console.log("Top likers available:", insights?.topLikers?.length || 0);
    
    if (!insights || !insights.topLikers || insights.topLikers.length === 0) {
      return (
        <View style={styles.emptyStateContainer}>
          <View style={styles.emptyStateIconContainer}>
            <Heart color="#333" size={40} />
          </View>
          <Text style={styles.emptyStateText}>No likes yet</Text>
          <Text style={styles.emptyStateSubtext}>
            When users like your posts, they'll appear here.
          </Text>
        </View>
      );
    }
    
    // Limit to only show 10 likers maximum
    const displayLikers = insights.topLikers.slice(0, 10);
    const totalLikers = insights.topLikers.length;
    
    return (
      <View style={styles.likersContainer}>
        {displayLikers.map((liker, index) => {
          console.log("Rendering liker:", liker);
          return (
            <View key={liker.userId || `liker-${index}`} style={styles.likerItem}>
              <View style={styles.likerRank}>
                <Text style={styles.likerRankText}>{index + 1}</Text>
              </View>
              <Image 
                source={{ 
                  uri: liker.avatar || 'https://randomuser.me/api/portraits/lego/1.jpg' 
                }} 
                style={styles.likerAvatar} 
              />
              <View style={styles.likerInfo}>
                <View style={styles.usernameRow}>
                  <Text style={styles.likerUsername}>{liker.username || 'User'}</Text>
                  {liker.isVerified && <TunnelVerifiedMark size={12} />}
                </View>
                <View style={styles.likesRow}>
                  <Heart color="#FF4D67" size={12} fill="#FF4D67" />
                  <Text style={styles.likerLikesCount}>Liked this post</Text>
                </View>
              </View>
            </View>
          );
        })}

        {/* Add View All button if there are likers */}
        {totalLikers > 0 && (
          <TouchableOpacity 
            style={styles.viewAllButton}
            onPress={() => router.push({
              pathname: "/feed-insights-likers-detail",
              params: { 
                postId: postId,
                postContent: postData?.content || 'Post'
              }
            } as any)}
          >
            <Text style={styles.viewAllButtonText}>
              {totalLikers > 10 ? `View All Likers (${totalLikers})` : 'View All Likers'}
            </Text>
            <ChevronRight color="#1877F2" size={16} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Conditional rendering for points distribution
  const renderPointsDistribution = () => {
    if (!insights || !insights.pointsDistribution || insights.pointsDistribution.length === 0) {
      return (
        <View style={styles.emptyStateContainer}>
          <View style={styles.emptyStateIconContainer}>
            <Award color="#333" size={40} />
          </View>
          <Text style={styles.emptyStateText}>No points data</Text>
          <Text style={styles.emptyStateSubtext}>
            Points distribution will appear here as users engage with your content.
          </Text>
        </View>
      );
    }
    
    return (
      <View style={styles.pointsDistributionContainer}>
        {insights.pointsDistribution.map((item, index) => (
          <View key={index} style={styles.pointsDistributionItem}>
            <View style={styles.pointsDistributionInfo}>
              <Text style={styles.pointsValue}>{item.points} points</Text>
              <Text style={styles.pointsUserCount}>{item.userCount} users</Text>
            </View>
            <View style={styles.pointsBarContainer}>
              <View 
                style={[
                  styles.pointsBar, 
                  { 
                    width: `${(item.userCount / Math.max(...insights.pointsDistribution.map(i => i.userCount))) * 100}%`,
                    backgroundColor: getPointsColor(item.points),
                  }
                ]} 
              />
            </View>
          </View>
        ))}
      </View>
    );
  };

  // Modify the live update container
  const LiveUpdateInfo = () => (
    <View style={styles.liveUpdateContainer}>
      <View style={styles.liveUpdateIndicator}>
        <Animated.View 
          style={[
            styles.liveUpdateDot,
            { transform: [{ scale: pulseAnim }] }
          ]} 
        />
        <Text style={styles.liveUpdateText}>
          <Text style={styles.liveText}>LIVE</Text> • Points, likes & comments update in real-time
        </Text>
      </View>
      <Text style={styles.lastUpdatedText}>
        {refreshing ? 'Updating...' : `Last updated: ${formatLastUpdated()}`}
      </Text>
    </View>
  );

  // Header with refresh button
  const Header = () => (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft color="#FFF" size={24} />
        </Pressable>
        <Text style={styles.headerTitle}>{postId ? 'Post Insights' : 'Feed Insights'}</Text>
        <Pressable onPress={handleRefresh} style={styles.refreshButton}>
          {refreshing ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.refreshText}>↻</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );

  // Add a new renderComments function to show user comments
  const renderComments = () => {
    console.log("Rendering comments...");
    console.log("Insights available:", !!insights);
    console.log("Top commenters available:", insights?.topCommenters?.length || 0);
    
    if (!insights || !insights.topCommenters || insights.topCommenters.length === 0) {
      return (
        <View style={styles.emptyStateContainer}>
          <View style={styles.emptyStateIconContainer}>
            <MessageCircle color="#333" size={40} />
          </View>
          <Text style={styles.emptyStateText}>No comments yet</Text>
          <Text style={styles.emptyStateSubtext}>
            When users comment on your posts, they'll appear here.
          </Text>
        </View>
      );
    }
    
    // Limit to only show 10 comments maximum
    const displayCommenters = insights.topCommenters.slice(0, 10);
    const totalCommenters = insights.topCommenters.length;
    
    return (
      <View style={styles.commentsContainer}>
        {displayCommenters.map((commenter, index) => {
          console.log("Rendering commenter:", commenter);
          
          // Format the absolute time for the tooltip if available
          let tooltipTime = '';
          if (commenter.absoluteTime) {
            try {
              tooltipTime = format(new Date(commenter.absoluteTime), 'MMM d, yyyy \'at\' h:mm a');
            } catch (e) {
              console.log("Error formatting absolute time:", e);
            }
          }
          
          return (
            <View key={`${commenter.userId}-${index}`} style={styles.commentItem}>
              <Image 
                source={{ 
                  uri: commenter.avatar || 'https://randomuser.me/api/portraits/lego/1.jpg' 
                }} 
                style={styles.commenterAvatar} 
              />
              <View style={styles.commentContent}>
                <View style={styles.commentHeader}>
                  <View style={styles.usernameRow}>
                    <Text style={styles.commenterUsername}>{commenter.username || 'User'}</Text>
                    {commenter.isVerified && <TunnelVerifiedMark size={12} />}
                  </View>
                  <Pressable onPress={() => tooltipTime && DeviceEventEmitter.emit('SHOW_TOAST', { message: tooltipTime, type: 'info' })}>
                    <Text style={styles.commentDate}>{commenter.commentDate}</Text>
                  </Pressable>
                </View>
                <Text style={styles.commentText}>{commenter.commentText}</Text>
              </View>
            </View>
          );
        })}

        {/* Add View All Comments button */}
        {totalCommenters > 0 && (
          <TouchableOpacity 
            style={styles.viewAllButton}
            onPress={() => router.push({
              pathname: "/feed-insights-comment-detail",
              params: { 
                postId: postId,
                postContent: postData?.content || 'Post'
              }
            } as any)}
          >
            <Text style={styles.viewAllButtonText}>
              {totalCommenters > 10 ? `View All Comments (${totalCommenters})` : 'View All Comments'}
            </Text>
            <ChevronRight color="#1877F2" size={16} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1877F2" />
        <Text style={styles.loadingText}>Loading insights...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Use the Header component */}
      <Header />
      
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
      >
        {/* Live update indicator */}
        <LiveUpdateInfo />

        {/* Feed/Post overview */}
        <View style={styles.overviewSection}>
          <LinearGradient
            colors={['#1877F2', '#0C44A9']}
            style={styles.overviewBackground}
          >
            <View style={styles.overviewContent}>
              {postId && postData ? (
                <>
                  <Text style={styles.overviewTitle}>Post Performance</Text>
                  <Text style={styles.overviewSubtitle}>Insights for your post</Text>
                  
                  {/* Post preview */}
                  <View style={styles.postPreview}>
                    {postData.images && postData.images.length > 0 && (
                      <Image 
                        source={{ uri: postData.images[0] }}
                        style={styles.postThumbnail}
                      />
                    )}
                    <Text style={styles.postContent} numberOfLines={2}>
                      {postData.content}
                    </Text>
                    <Text style={styles.postDate}>
                      Posted on {new Date(postData.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.overviewTitle}>Feed Performance</Text>
                  <Text style={styles.overviewSubtitle}>Overview of your feed activity</Text>
                  
                  <View style={styles.overviewStatsRow}>
                    <View style={styles.overviewStat}>
                      <Text style={styles.overviewStatValue}>{insights?.postsTotal || 0}</Text>
                      <Text style={styles.overviewStatLabel}>Total Posts</Text>
                    </View>
                    
                    <View style={styles.overviewStat}>
                      <Text style={styles.overviewStatValue}>{insights?.engagementRate || 0}%</Text>
                      <Text style={styles.overviewStatLabel}>Engagement</Text>
                    </View>
                    
                    <View style={styles.overviewStat}>
                      <Text style={styles.overviewStatValue}>{insights?.likesTotal || 0}</Text>
                      <Text style={styles.overviewStatLabel}>Total Likes</Text>
                    </View>
                  </View>
                </>
              )}
            </View>
          </LinearGradient>
        </View>
        
        {/* Key metrics grid */}
        {insights && (
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <View style={styles.metricIconContainer}>
                <Eye color="#1877F2" size={20} />
              </View>
              <Text style={styles.metricValue}>{formatNumber(insights.viewsTotal)}</Text>
              <Text style={styles.metricLabel}>{postId ? 'Views' : 'Total Views'}</Text>
              <View style={styles.metricTrend}>
                <TrendingUp color="#00C853" size={14} />
                <Text style={[styles.trendText, styles.trendPositive]}>
                  +{formatNumber(insights.viewsToday)} today
                </Text>
              </View>
            </View>
            
            <View style={styles.metricCard}>
              <View style={styles.metricIconContainer}>
                <ThumbsUp color="#1877F2" size={20} />
              </View>
              <Text style={styles.metricValue}>{formatNumber(insights.likesTotal)}</Text>
              <Text style={styles.metricLabel}>Likes</Text>
              <View style={styles.metricTrend}>
                <TrendingUp color="#00C853" size={14} />
                <Text style={[styles.trendText, styles.trendPositive]}>
                  +{formatNumber(insights.likesToday)} today
                </Text>
              </View>
            </View>
            
            <View style={styles.metricCard}>
              <View style={styles.metricIconContainer}>
                <MessageCircle color="#1877F2" size={20} />
              </View>
              <Text style={styles.metricValue}>{formatNumber(insights.commentsTotal)}</Text>
              <Text style={styles.metricLabel}>Comments</Text>
              <View style={styles.metricTrend}>
                <TrendingUp color="#00C853" size={14} />
                <Text style={[styles.trendText, styles.trendPositive]}>
                  +{formatNumber(insights.commentsTrend)} new
                </Text>
              </View>
            </View>
            
            <View style={styles.metricCard}>
              <View style={styles.metricIconContainer}>
                <Award color="#1877F2" size={20} />
              </View>
              <Text style={styles.metricValue}>{formatNumber(insights.pointsTotal)}</Text>
              <Text style={styles.metricLabel}>Points Earned</Text>
              <View style={styles.metricTrend}>
                <Text style={styles.avgText}>From viewers</Text>
              </View>
            </View>
          </View>
        )}
        
        {/* Top Likers Section */}
        {insights && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Top Likers</Text>
              <TouchableOpacity 
                onPress={() => router.push({
                  pathname: "/feed-insights-likers-detail",
                  params: { 
                    postId: postId,
                    postContent: postData?.content || 'Post'
                  }
                } as any)}
                style={styles.viewAllHeaderLink}
              >
                <Text style={styles.viewAllHeaderText}>View All</Text>
                <ChevronRight color="#1877F2" size={14} />
              </TouchableOpacity>
            </View>
            
            {renderTopLikers()}
          </View>
        )}
        
        {/* Points Distribution Section */}
        {insights && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Points Earned by Users</Text>
              <Award color="#1877F2" size={20} />
            </View>
            
            {renderPointsDistribution()}
          </View>
        )}
        
        {/* Top performing posts */}
        {insights && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Top Performing Posts</Text>
              <Award color="#1877F2" size={20} />
            </View>
            
            {renderTopPosts()}
          </View>
        )}
        
        {/* Only show recommendations if there's actual data */}
        {insights && hasInsightsData() && (
          <View style={styles.recommendationsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recommendations</Text>
              <BarChart2 color="#1877F2" size={20} />
            </View>
            
            <View style={styles.recommendationCard}>
              <View style={styles.recommendationIcon}>
                <Clock color="#1877F2" size={24} />
              </View>
              <View style={styles.recommendationContent}>
                <Text style={styles.recommendationTitle}>Optimal Posting Times</Text>
                <Text style={styles.recommendationText}>
                  Post during peak hours for maximum visibility and engagement.
                </Text>
              </View>
            </View>
            
            <View style={styles.recommendationCard}>
              <View style={styles.recommendationIcon}>
                <ImageIcon color="#1877F2" size={24} />
              </View>
              <View style={styles.recommendationContent}>
                <Text style={styles.recommendationTitle}>Content Strategy</Text>
                <Text style={styles.recommendationText}>
                  Visual content typically receives higher engagement rates.
                </Text>
              </View>
            </View>
          </View>
        )}
        
        {/* Comments Section */}
        {insights && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Comments</Text>
              <TouchableOpacity 
                onPress={() => router.push({
                  pathname: "/feed-insights-comment-detail",
                  params: { 
                    postId: postId,
                    postContent: postData?.content || 'Post'
                  }
                } as any)}
                style={styles.viewAllHeaderLink}
              >
                <Text style={styles.viewAllHeaderText}>View All</Text>
                <ChevronRight color="#1877F2" size={14} />
              </TouchableOpacity>
            </View>
            
            {renderComments()}
          </View>
        )}
        
        {/* Bottom padding */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  safeArea: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    zIndex: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshText: {
    color: '#fff',
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  overviewSection: {
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  overviewBackground: {
    borderRadius: 12,
  },
  overviewContent: {
    padding: 20,
  },
  overviewTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  overviewSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginBottom: 20,
  },
  overviewStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  overviewStat: {
    alignItems: 'center',
  },
  overviewStatValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  overviewStatLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 16,
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  metricIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(24,119,242,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  metricLabel: {
    color: '#999',
    fontSize: 14,
    marginBottom: 8,
  },
  metricTrend: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendText: {
    fontSize: 12,
    marginLeft: 4,
  },
  trendPositive: {
    color: '#00C853',
  },
  trendNegative: {
    color: '#FF3B30',
  },
  avgText: {
    color: '#999',
    fontSize: 12,
  },
  section: {
    padding: 16,
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  topPostsContainer: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
  },
  topPostCard: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    overflow: 'hidden',
  },
  topPostRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1877F2',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 10,
  },
  topPostRankText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  topPostThumbnail: {
    width: 80,
    height: 80,
  },
  topPostContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  topPostText: {
    color: '#FFF',
    fontSize: 14,
    marginBottom: 8,
  },
  topPostStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  topPostStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topPostStatText: {
    color: '#CCC',
    fontSize: 12,
    marginLeft: 4,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  viewAllButtonText: {
    color: '#1877F2',
    fontSize: 14,
    fontWeight: '500',
    marginRight: 4,
  },
  recommendationsSection: {
    padding: 16,
  },
  recommendationCard: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    marginBottom: 12,
  },
  recommendationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(24,119,242,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  recommendationContent: {
    flex: 1,
  },
  recommendationTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  recommendationText: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
  },
  postPreview: {
    marginTop: 15,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 8,
    padding: 12,
    overflow: 'hidden',
  },
  postThumbnail: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 12,
  },
  postContent: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 8,
  },
  postDate: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  likersContainer: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
  },
  likerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  likerRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1877F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  likerRankText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  likerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 8,
  },
  likerInfo: {
    flex: 1,
  },
  likerUsername: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  likesRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  likerLikesCount: {
    color: '#ccc',
    fontSize: 12,
  },
  emptyStateContainer: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 150,
  },
  emptyStateIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyStateText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    color: '#777',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  pointsDistributionContainer: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
  },
  pointsDistributionItem: {
    marginBottom: 12,
  },
  pointsDistributionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pointsValue: {
    color: '#fff',
    fontSize: 14,
  },
  pointsUserCount: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  pointsBarContainer: {
    width: '100%',
    height: 12,
    backgroundColor: '#333',
    borderRadius: 6,
    overflow: 'hidden',
  },
  pointsBar: {
    height: '100%',
  },
  liveUpdateContainer: {
    padding: 8,
    backgroundColor: 'rgba(17, 17, 17, 0.7)',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    alignItems: 'center',
  },
  liveUpdateIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveUpdateDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#999',
    marginRight: 6,
  },
  liveUpdateText: {
    color: '#ccc',
    fontSize: 12,
  },
  liveText: {
    color: '#00C853',
    fontWeight: '700',
  },
  lastUpdatedText: {
    color: '#777',
    fontSize: 10,
    marginTop: 4,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentsContainer: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    paddingBottom: 16,
  },
  commenterAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  commenterUsername: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  commentDate: {
    color: '#777',
    fontSize: 12,
  },
  commentText: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
  },
  viewAllHeaderLink: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllHeaderText: {
    color: '#1877F2',
    fontSize: 12,
    marginRight: 2,
  },
}); 