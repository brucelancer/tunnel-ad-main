import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Dimensions,
  Image,
  Animated,
  StatusBar,
  Switch,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  Modal,
  TouchableOpacity,
  Alert,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { usePoints } from '../../hooks/usePoints';
import { useReactions } from '../../hooks/useReactions';
import { DeviceEventEmitter } from 'react-native';
import { 
  Settings, 
  Award, 
  Clock, 
  Heart, 
  BarChart2,
  ChevronRight,
  Bell,
  Moon,
  Shield,
  HelpCircle,
  Mail,
  Phone,
  MapPin,
  ChevronDown,
  LogOut,
  User,
  X,
  ZoomIn,
  ZoomOut,
  List,
  Grid,
  MessageCircle,
  Bookmark,
  Film,
  Play,
  PieChart,
} from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { useRouter, useFocusEffect } from 'expo-router';
import ScreenContainer from '../components/ScreenContainer';
import AuthScreen from '../components/AuthScreen';
import { useSanityAuth } from '../hooks/useSanityAuth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as sanityAuthService from '../../tunnel-ad-main/services/sanityAuthService';
import { createClient } from '@sanity/client';
import Svg, { Path } from 'react-native-svg';

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

// ======= IMPORTANT: Log whenever user data changes =======
const logUserDataChanges = (userData: any, source: string) => {
  console.log(`PROFILE: User data updated from ${source}:`, 
    userData ? 
    `ID: ${userData._id}, Username: ${userData.username}, Auth: true` : 
    'No user data (null)'
  );
};

const BADGES = [
  {
    id: '1',
    name: 'Early Bird',
    description: 'One of the first to join',
    icon: '🌅',
  },
  {
    id: '2',
    name: 'Knowledge Seeker',
    description: 'Read 5 articles',
    icon: '📚',
  },
  {
    id: '3',
    name: 'Video Master',
    description: 'Watched 10 videos',
    icon: '🎥',
  },
  {
    id: '4',
    name: 'Social Butterfly',
    description: 'Shared 3 times',
    icon: '🦋',
  },
];

const FAQ_ITEMS = [
  {
    question: 'How do I earn points?',
    answer: 'You can earn points by watching videos (10 points), reading articles (5 points), daily login (20 points), and sharing content (5 points).',
  },
  {
    question: 'How can I redeem my points?',
    answer: 'Visit the Redeem tab to convert your points to cash or choose from available rewards.',
  },
  {
    question: 'When do points expire?',
    answer: 'Points never expire! You can accumulate them as long as you want.',
  },
];

interface PostData {
  id: string;
  user: {
    id: string;
    name: string;
    username: string;
    avatar: string;
    isVerified: boolean;
    isBlueVerified?: boolean;
  };
  content: string;
  images: string[];
  location?: string;
  timeAgo: string;
  likes: number;
  comments: number;
  points: number;
  hasLiked: boolean;
  hasSaved: boolean;
}

export default function ProfileScreen() {
  const { points, resetPoints } = usePoints();
  const { resetReactions } = useReactions();
  const [displayPoints, setDisplayPoints] = useState(points);
  const scrollY = useRef(new Animated.Value(0)).current;
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageScale, setImageScale] = useState(1);
  const lastTapTimeRef = useRef(0);
  const [viewType, setViewType] = useState<'grid' | 'list'>('grid');
  const [userPosts, setUserPosts] = useState<PostData[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'videos'>('posts');
  const [userVideos, setUserVideos] = useState<any[]>([]);
  const [videosLoading, setVideosLoading] = useState(false);
  
  // Get user data from Sanity auth hook
  const { user, logout } = useSanityAuth();
  
  // Add local state to cache user data for display
  const [userDisplay, setUserDisplay] = useState<any>(null);

  useEffect(() => {
    setDisplayPoints(points);
  }, [points]);

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('POINTS_UPDATED', (event) => {
      if (event?.type === 'reset') {
        setDisplayPoints(0);
        animatePointsReset();
      } else if (event?.type === 'earned') {
        animatePointsEarned();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Listen for auth state changes and for direct user updates
  useEffect(() => {
    if (user) {
      console.log("Profile screen received user data from useSanityAuth:", user);
      logUserDataChanges(user, "useSanityAuth hook");
      
      // Update authenticated state
      setIsAuthenticated(true);
      
      // Cache user data in local state for display
      setUserDisplay(user);
      
      // Update points display
      if (user.points !== undefined) {
        setDisplayPoints(user.points);
      }
    } else {
      console.log("No user data in useSanityAuth hook");
      // Don't set isAuthenticated to false here, as we might still be loading
      // Check storage before deciding there's no user
      refreshUserData();
    }
    
    // Listen for AUTH_STATE_CHANGED events
    const subscription = DeviceEventEmitter.addListener('AUTH_STATE_CHANGED', (event) => {
      console.log("Profile screen received AUTH_STATE_CHANGED event:", event);
      
      // Update authentication state if it's provided
      if (event?.isAuthenticated !== undefined) {
        console.log("Setting isAuthenticated to:", event.isAuthenticated);
        setIsAuthenticated(event.isAuthenticated);
      }
      
      // If user data was included in the event, use it directly
      if (event?.userData) {
        console.log("Using user data from event in profile screen:", event.userData);
        logUserDataChanges(event.userData, "AUTH_STATE_CHANGED event");
        
        // Cache user data in local state for display
        setUserDisplay(event.userData);
        
        // Update points if different
        if (event.userData.points !== undefined) {
          setDisplayPoints(event.userData.points);
        }
      } else if (event?.isAuthenticated === false) {
        // Clear cached user data when logged out
        setUserDisplay(null);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [user]);

  // Improve the refreshUserData function to also update points
  const refreshUserData = async () => {
    setRefreshing(true);
    
    try {
      // If we have the user ID, fetch fresh data
      if (user?._id) {
        console.log("Refreshing user data from Sanity...");
        
        // Correct Sanity configuration with proper project ID and dataset
        const client = createClient({
          projectId: '21is7976', // Updated to the correct project ID
          dataset: 'production',
          useCdn: true,
          apiVersion: '2021-10-21',
        });
        
        if (!client) {
          console.error("Failed to get Sanity client");
          return;
        }
        
        // Fetch the latest user data including points
        const freshUserData = await client.fetch(`
          *[_type == "user" && _id == $userId][0] {
            _id,
            username,
            firstName,
            lastName,
            email,
            points,
            profile,
            isBlueVerified
          }
        `, { userId: user._id });
        
        if (freshUserData) {
          console.log("Received fresh user data from Sanity:", freshUserData);
          
          // Update points display if available
          if (freshUserData.points !== undefined) {
            console.log(`Updating points display to ${freshUserData.points} from refresh`);
            setDisplayPoints(freshUserData.points);
          }
          
          // Update the cached user display data
          setUserDisplay(freshUserData);
        }
      } else {
        console.log("Can't refresh: User is not logged in or no user ID available");
      }
      
      // Fetch user posts if needed
      if (isAuthenticated && user?._id) {
        fetchUserPosts();
      }
    } catch (error) {
      console.error("Error refreshing user data:", error);
    } finally {
      setRefreshing(false);
    }
  };

  // Add event listeners after refreshUserData is defined
  useEffect(() => {
    // Set up the listener for points earned from videos
    const pointsEarnedListener = DeviceEventEmitter.addListener('POINTS_EARNED', (event) => {
      console.log('Profile: POINTS_EARNED event received:', event);
      
      // Handle verified points updates from Sanity
      if (event.verifiedFromSanity && event.newTotal !== undefined) {
        // Update points with the exact total from Sanity
        console.log(`Profile: Updating points display to ${event.newTotal} from Sanity verification`);
        setDisplayPoints(event.newTotal);
        
        // Show animation for better user experience
        animatePointsEarned();
      } 
      // Handle incremental points updates
      else if (event.amount) {
        console.log(`Profile: Incrementing points by ${event.amount}`);
        setDisplayPoints(current => current + event.amount);
        animatePointsEarned();
      }
    });
    
    // Also listen for general POINTS_UPDATED events
    const pointsUpdatedListener = DeviceEventEmitter.addListener('POINTS_UPDATED', (event) => {
      console.log('Profile: POINTS_UPDATED event received:', event);
      
      if (event?.type === 'earned') {
        // When points are earned, refresh from Sanity to get the latest total
        refreshUserData();
      }
    });
    
    // Clean up on unmount
    return () => {
      pointsEarnedListener.remove();
      pointsUpdatedListener.remove();
    };
  }, [refreshUserData]);

  const animatePointsEarned = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.2,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const animatePointsReset = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleResetAll = async () => {
    if (!showResetConfirm) {
      setShowResetConfirm(true);
      setTimeout(() => setShowResetConfirm(false), 3000); // Hide after 3 seconds
      return;
    }
    await Promise.all([
      resetPoints(),
      resetReactions()
    ]);
    setShowResetConfirm(false);
  };

  const handleLogout = async () => {
    try {
      // Call the logout function from the hook
      await logout();
      
      // Clear local state immediately before event emission
      setIsAuthenticated(false);
      
      // Clear from AsyncStorage directly for redundancy
      await AsyncStorage.removeItem('user');
      
      // Emit auth state change event
      DeviceEventEmitter.emit('AUTH_STATE_CHANGED', { 
        isAuthenticated: false,
        userData: null
      });
      
      console.log('User logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleEditProfile = () => {
    // Navigate to edit profile screen
    router.push('/editprofile' as any);
  };

  const onRefresh = useCallback(() => {
    refreshUserData();
  }, []);

  // Call refreshUserData when component mounts to ensure latest data
  useEffect(() => {
    refreshUserData();
  }, []);

  // Refresh data when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('Profile screen is focused, refreshing data...');
      refreshUserData();
      return () => {
        // Clean up or actions to take when screen loses focus
      };
    }, [])
  );

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 50, 100],
    outputRange: [0, 0.5, 1],
    extrapolate: 'clamp',
  });

  const headerTranslate = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [-90, 0],
    extrapolate: 'clamp',
  });

  // Function to get image URL from a Sanity image object or direct URI
  const getImageUrl = (imageData: any): string | undefined => {
    // If it's a string URI, use it directly
    if (typeof imageData === 'string') {
      return imageData;
    }
    // If it's a Sanity image object, convert it to URL
    else if (imageData && imageData.asset) {
      return sanityAuthService.urlFor(imageData).url();
    }
    return undefined;
  };

  const renderStatCard = (icon: React.ReactNode, title: string, value: string | number) => (
    <View style={styles.statCard}>
      <View style={styles.statIconContainer}>
        {icon}
      </View>
      <View style={styles.statInfo}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
      </View>
    </View>
  );

  const renderBadge = ({ item }: { item: typeof BADGES[0] }) => (
    <View style={styles.badge}>
      <Text style={styles.badgeIcon}>{item.icon}</Text>
      <Text style={styles.badgeName}>{item.name}</Text>
      <Text style={styles.badgeDescription}>{item.description}</Text>
    </View>
  );

  const renderSettingItem = (
    icon: React.ReactNode,
    title: string,
    value?: React.ReactNode,
    onPress?: () => void
  ) => (
    <Pressable
      style={styles.settingItem}
      onPress={onPress}
      android_ripple={{ color: 'rgba(255, 255, 255, 0.1)' }}
    >
      <View style={styles.settingLeft}>
        {icon}
        <Text style={styles.settingTitle}>{title}</Text>
      </View>
      {value || <ChevronRight color="#888" size={20} />}
    </Pressable>
  );

  const renderFaqItem = (question: string, answer: string) => (
    <Pressable
      key={question}
      style={styles.faqItem}
      onPress={() => setExpandedFaq(expandedFaq === question ? null : question)}
    >
      <View style={styles.faqHeader}>
        <Text style={styles.faqQuestion}>{question}</Text>
        <ChevronDown
          color="#888"
          size={20}
          style={[
            styles.faqIcon,
            { transform: [{ rotate: expandedFaq === question ? '180deg' : '0deg' }] }
          ]}
        />
      </View>
      {expandedFaq === question && (
        <Text style={styles.faqAnswer}>{answer}</Text>
      )}
    </Pressable>
  );

  const handleNavigateToSettings = () => {
    router.push('/settings' as any);
  };

  const handleNavigateToPrivacy = () => {
    router.push('/settings' as any);
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    scrollY.setValue(offsetY);
  };

  // Function to handle zoom in
  const handleZoomIn = () => {
    setImageScale(prev => Math.min(prev + 0.5, 3)); // Max zoom 3x
  };
  
  // Function to handle zoom out
  const handleZoomOut = () => {
    setImageScale(prev => Math.max(prev - 0.5, 1)); // Min zoom 1x
  };

  // Handle double tap to zoom in/out
  const handleDoubleTap = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    
    if (now - lastTapTimeRef.current < DOUBLE_TAP_DELAY) {
      // Double tap detected
      if (imageScale > 1) {
        // If already zoomed in, zoom out to normal
        setImageScale(1);
      } else {
        // If at normal zoom, zoom in to 2x
        setImageScale(2);
      }
    }
    lastTapTimeRef.current = now;
  };

  // Fetch user posts - would be called in useEffect after user data is loaded
  const fetchUserPosts = async () => {
    if (!userDisplay || !userDisplay._id) return;
    
    try {
      setPostsLoading(true);
      
      // Create a Sanity client directly using createClient
      const client = createClient({
        projectId: '21is7976',
        dataset: 'production',
        useCdn: false,
        apiVersion: '2023-03-01'
      });
      
      if (!client) {
        console.error('Failed to create Sanity client');
        return;
      }
      
      const userPostsData = await client.fetch(`
        *[_type == "post" && author._ref == $userId] | order(createdAt desc) {
          _id,
          content,
          location,
          createdAt,
          likesCount,
          commentsCount,
          points,
          "hasLiked": count(likes[_ref == $currentUserId]) > 0,
          "hasSaved": count(savedBy[_ref == $currentUserId]) > 0,
          "author": author->{
            _id,
            username,
            firstName,
            lastName,
            "avatar": profile.avatar,
            "isVerified": username == "admin" || username == "moderator",
            "isBlueVerified": defined(isBlueVerified) && isBlueVerified == true
          },
          images
        }
      `, { 
        userId: userDisplay._id,
        currentUserId: userDisplay._id || ''
      });
      
      // Format posts
      const formattedPosts = userPostsData.map((post: any) => {
        // Handle image URLs
        let imageUrls: string[] = [];
        if (post.images && post.images.length > 0) {
          imageUrls = post.images.map((img: any) => {
            if (typeof img === 'string') {
              return img;
            } else if (img.url) {
              return img.url;
            } else if (img.asset && img.asset._ref) {
              // Use the sanityAuthService.urlFor function
              return sanityAuthService.urlFor(img).url();
            }
            return '';
          }).filter((url: string) => url);
        }
        
        return {
          id: post._id,
          content: post.content || '',
          location: post.location || '',
          timeAgo: calculateTimeAgo(post.createdAt),
          likes: post.likesCount || 0,
          comments: post.commentsCount || 0,
          points: post.points || 0,
          hasLiked: post.hasLiked || false,
          hasSaved: post.hasSaved || false,
          user: {
            id: post.author?._id || 'unknown',
            name: post.author?.username || (post.author?.firstName ? `${post.author.firstName} ${post.author.lastName || ''}` : 'Unknown User'),
            username: '@' + (post.author?.username || 'unknown'),
            // Use the sanityAuthService.urlFor function
            avatar: post.author?.avatar ? sanityAuthService.urlFor(post.author.avatar).url() : 'https://randomuser.me/api/portraits/men/32.jpg',
            isVerified: post.author?.isVerified || false,
            isBlueVerified: post.author?.isBlueVerified || false
          },
          images: imageUrls,
        };
      });
      
      setUserPosts(formattedPosts);
    } catch (error) {
      console.error('Error fetching user posts:', error);
    } finally {
      setPostsLoading(false);
    }
  };

  // Calculate time ago helper
  const calculateTimeAgo = (dateString: string) => {
    if (!dateString) return 'Recently';
    
    const date = new Date(dateString);
    const now = new Date();
    const secondsAgo = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (secondsAgo < 60) return 'Just now';
    const minutesAgo = Math.floor(secondsAgo / 60);
    if (minutesAgo < 60) return `${minutesAgo}m ago`;
    const hoursAgo = Math.floor(minutesAgo / 60);
    if (hoursAgo < 24) return `${hoursAgo}h ago`;
    const daysAgo = Math.floor(hoursAgo / 24);
    if (daysAgo < 30) return `${daysAgo}d ago`;
    const monthsAgo = Math.floor(daysAgo / 30);
    if (monthsAgo < 12) return `${monthsAgo}mo ago`;
    return `${Math.floor(monthsAgo / 12)}y ago`;
  };

  // Fetch videos when user data is loaded
  useEffect(() => {
    if (userDisplay && userDisplay._id) {
      fetchUserPosts();
      fetchUserVideos();
    }
  }, [userDisplay]);

  // Toggle view type between grid and list
  const toggleViewType = () => {
    setViewType(viewType === 'grid' ? 'list' : 'grid');
  };

  // Render post grid item
  const renderGridItem = ({ item }: { item: PostData }) => {
    return (
      <Pressable 
        style={styles.gridItem}
        onPress={() => router.push({
          pathname: "/feedpost-detail" as any,
          params: { id: item.id }
        })}
      >
        {item.images && item.images.length > 0 ? (
          <Image 
            source={{ uri: item.images[0] }}
            style={styles.gridItemImage}
          />
        ) : (
          <View style={styles.gridItemTextOnly}>
            <Text 
              style={styles.gridItemContent}
              numberOfLines={4}
            >
              {item.content}
            </Text>
          </View>
        )}
        
        {/* Multiple images indicator */}
        {item.images && item.images.length > 1 && (
          <View style={styles.multipleImagesIndicator}>
            <Text style={styles.multipleImagesText}>+{item.images.length - 1}</Text>
          </View>
        )}
      </Pressable>
    );
  };
  
  // Render post list item
  const renderListItem = ({ item }: { item: PostData }) => {
    return (
      <View style={styles.listItem}>
        {/* Content */}
        <Text style={styles.listItemContent}>{item.content}</Text>
        
        {/* Images */}
        {item.images && item.images.length > 0 && (
          <View style={styles.listItemImagesContainer}>
            {item.images.length === 1 ? (
              <Image 
                source={{ uri: item.images[0] }}
                style={styles.listItemSingleImage}
              />
            ) : (
              <FlatList
                data={item.images}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(_, index) => `image-${index}`}
                renderItem={({ item: imageUri }) => (
                  <Image 
                    source={{ uri: imageUri }}
                    style={[styles.listItemMultipleImage, { width: SCREEN_WIDTH - 32 }]}
                  />
                )}
              />
            )}
          </View>
        )}
        
        {/* Location */}
        {item.location && (
          <View style={styles.listItemLocation}>
            <MapPin size={12} color="#888" />
            <Text style={styles.listItemLocationText}>{item.location}</Text>
          </View>
        )}
        
        {/* Actions */}
        <View style={styles.listItemActions}>
          <View style={styles.listItemActionGroup}>
            <View style={styles.listItemAction}>
              <Heart 
                size={16} 
                color={item.hasLiked ? '#FF3B30' : '#888'} 
                fill={item.hasLiked ? '#FF3B30' : 'transparent'} 
              />
              <Text style={styles.listItemActionText}>{item.likes}</Text>
            </View>
            
            <View style={styles.listItemAction}>
              <MessageCircle size={16} color="#888" />
              <Text style={styles.listItemActionText}>{item.comments}</Text>
            </View>
            
            <View style={styles.listItemAction}>
              <Award size={16} color="#FFD700" />
              <Text style={styles.listItemActionText}>{item.points}</Text>
            </View>
          </View>
          
          <View style={styles.listItemAction}>
            <Bookmark 
              size={16} 
              color={item.hasSaved ? '#1877F2' : '#888'} 
              fill={item.hasSaved ? '#1877F2' : 'transparent'} 
            />
          </View>
        </View>
      </View>
    );
  };

  // Fetch user videos
  const fetchUserVideos = async () => {
    if (!userDisplay || !userDisplay._id) return;
    
    try {
      setVideosLoading(true);
      
      // Create a Sanity client directly using createClient
      const client = createClient({
        projectId: '21is7976',
        dataset: 'production',
        useCdn: false,
        apiVersion: '2023-03-01'
      });
      
      if (!client) {
        console.error('Failed to create Sanity client');
        return;
      }
      
      // Query to get videos by user ID
      const query = `*[_type == "video" && author._ref == $userId] | order(createdAt desc) {
        _id,
        title,
        description,
        url,
        "videoUrl": videoFile.asset->url,
        type,
        contentType,
        aspectRatio,
        points,
        views,
        likes,
        dislikes,
        "author": author->username,
        "authorId": author->_id,
        "authorAvatar": author->profile.avatar,
        "isVerified": author->username == "admin" || author->username == "moderator",
        "isBlueVerified": author->isBlueVerified,
        "thumbnailUrl": thumbnail.asset->url,
        createdAt,
        "hasLiked": count(likedBy[_ref == $currentUserId]) > 0
      }`;
      
      const videos = await client.fetch(query, { 
        userId: userDisplay._id,
        currentUserId: userDisplay._id || ''
      });
      
      // Process videos data
      const processedVideos = videos.map((video: any) => {
        return {
          id: video._id,
          title: video.title || 'Untitled Video',
          description: video.description || '',
          url: video.videoUrl || video.url || '',
          type: video.type || 'horizontal',
          aspectRatio: video.aspectRatio || (video.type === 'horizontal' ? 16/9 : 9/16),
          points: video.points || 0,
          views: video.views || 0,
          likes: video.likes || 0,
          dislikes: video.dislikes || 0,
          author: video.author || "Unknown",
          authorId: video.authorId || userDisplay._id,
          authorAvatar: video.authorAvatar ? sanityAuthService.urlFor(video.authorAvatar).url() : null,
          isVerified: video.isVerified || false,
          isBlueVerified: video.isBlueVerified || false,
          thumbnail: video.thumbnailUrl || '',
          timeAgo: calculateTimeAgo(video.createdAt),
          hasLiked: video.hasLiked || false
        };
      });
      
      setUserVideos(processedVideos);
      console.log(`Loaded ${processedVideos.length} videos for user`);
    } catch (error) {
      console.error('Error fetching user videos:', error);
    } finally {
      setVideosLoading(false);
    }
  };

  // Render video grid item
  const renderVideoGridItem = ({ item }: { item: any }) => {
    return (
      <Pressable 
        style={styles.gridItem}
        onPress={() => router.push({
          pathname: '/video-detail',
          params: { id: item.id }
        } as any)}
      >
        <View style={styles.videoGridItem}>
          {/* Thumbnail section */}
          <View style={styles.videoThumbnailContainer}>
            {item.thumbnail ? (
              <Image 
                source={{ uri: item.thumbnail }} 
                style={styles.videoThumbnail}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.videoPlaceholder}>
                <Film size={24} color="#666" />
              </View>
            )}
            
            {/* Play button overlay */}
            <View style={styles.videoPlayOverlay}>
              <View style={styles.videoPlayButton}>
                <Play size={20} color="#FFF" />
              </View>
            </View>
          </View>
          
          {/* Video info section */}
          <View style={styles.videoInfo}>
            <Text 
              style={styles.videoTitle}
              numberOfLines={1}
            >
              {item.title || 'Untitled Video'}
            </Text>
            <Text style={styles.videoTimeAgo}>{item.timeAgo}</Text>
          </View>
        </View>
      </Pressable>
    );
  };

  // If not authenticated, show the auth screen
  if (!isAuthenticated) {
    return <AuthScreen onAuthenticated={() => setIsAuthenticated(true)} />;
  }

  // Safe access to user data for display
  const profileData = userDisplay || {};
  const userProfile = profileData.profile || {};
  
  // Add the UserPopup component to display user details in a popup
  const UserPopup = ({ visible, user, onClose }: { visible: boolean, user: any, onClose: () => void }) => {
    if (!visible) return null;
    
    return (
      <Modal
        transparent={true}
        visible={visible}
        onRequestClose={onClose}
        animationType="fade"
      >
        <Pressable style={styles.modalOverlay} onPress={onClose}>
          <Pressable 
            style={styles.userPopup}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.userPopupHeader}>
              <View style={styles.userPopupRow}>
                <Image 
                  source={{ uri: user?.avatar ? getImageUrl(user.avatar) : 'https://randomuser.me/api/portraits/men/32.jpg' }}
                  style={styles.userPopupAvatar}
                />
                <View style={styles.userPopupInfo}>
                  <View style={styles.userPopupNameRow}>
                    <Text style={styles.userPopupName}>
                      {user?.username || 'User'}
                    </Text>
                    {(user?.isVerified || user?.isBlueVerified) && (
                      <View style={styles.popupVerifiedBadge}>
                        <TunnelVerifiedMark size={16} />
                      </View>
                    )}
                  </View>
                  <Text style={styles.userPopupUsername}>
                    {user?.firstName && user?.lastName 
                      ? `${user.firstName} ${user.lastName}` 
                      : '@' + (user?.username || 'user')}
                  </Text>
                </View>
              </View>
              <Pressable style={styles.userPopupCloseButton} onPress={onClose}>
                <X size={20} color="#888" />
              </Pressable>
            </View>
            
            <View style={styles.userPopupBody}>
              {user?.bio && (
                <Text style={styles.userPopupBio}>{user.bio}</Text>
              )}
              
              <View style={styles.userPopupStats}>
                <View style={styles.userPopupStat}>
                  <Text style={styles.userPopupStatValue}>{user?.posts || '0'}</Text>
                  <Text style={styles.userPopupStatLabel}>Posts</Text>
                </View>
                <View style={styles.userPopupStat}>
                  <Text style={styles.userPopupStatValue}>{user?.followers || '0'}</Text>
                  <Text style={styles.userPopupStatLabel}>Followers</Text>
                </View>
                <View style={styles.userPopupStat}>
                  <Text style={styles.userPopupStatValue}>{user?.following || '0'}</Text>
                  <Text style={styles.userPopupStatLabel}>Following</Text>
                </View>
              </View>
              
              <Pressable
                style={styles.userPopupViewButton}
                onPress={() => {
                  onClose();
                  router.push({
                    pathname: "/user-profile" as any,
                    params: { id: user._id }
                  });
                }}
              >
                <Text style={styles.userPopupViewButtonText}>View Profile</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    );
  };

  // Add this function to handle Insights navigation
  const handleNavigateToInsights = () => {
    router.push({
      pathname: '/insights-userprofile' as any,
      params: { userId: user?._id }
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Animated Header - empty, just blur background */}
      <Animated.View style={[
        styles.header,
        {
          opacity: headerOpacity,
          transform: [{ translateY: headerTranslate }]
        }
      ]}>
        <BlurView intensity={100} style={StyleSheet.absoluteFill} />
      </Animated.View>

      {/* Image Full View Modal */}
      <Modal
        visible={showImageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setImageScale(1); // Reset zoom when closing
          setShowImageModal(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={90} style={StyleSheet.absoluteFill} />
          <TouchableOpacity 
            style={styles.modalCloseArea}
            activeOpacity={1}
            onPress={() => {
              setImageScale(1); // Reset zoom when closing
              setShowImageModal(false);
            }}
          >
            <View style={styles.modalImageContainer}>
              <TouchableOpacity
                activeOpacity={1}
                onPress={(e: any) => {
                  e.stopPropagation();
                  handleDoubleTap();
                }}
              >
                {userProfile?.avatar && (
                  <Image
                    source={{ uri: getImageUrl(userProfile.avatar) }}
                    style={[
                      styles.modalImage,
                      { transform: [{ scale: imageScale }] }
                    ]}
                    resizeMode="contain"
                  />
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
          
          {/* Zoom status indicator */}
          {imageScale > 1 ? (
            <View style={styles.zoomIndicator}>
              <Text style={styles.zoomText}>{Math.round(imageScale * 100)}%</Text>
            </View>
          ) : null}
          
          {/* Close button */}
          <TouchableOpacity 
            style={styles.modalCloseButton}
            onPress={() => {
              setImageScale(1); // Reset zoom when closing
              setShowImageModal(false);
            }}
          >
            <X color="white" size={24} />
          </TouchableOpacity>
          
          {/* Zoom controls */}
          <View style={styles.zoomControls}>
            <TouchableOpacity 
              style={styles.zoomButton} 
              onPress={handleZoomIn}
            >
              <ZoomIn color="white" size={24} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.zoomButton}
              onPress={handleZoomOut}
              disabled={imageScale <= 1}
            >
              <ZoomOut 
                color={imageScale <= 1 ? "#666" : "white"} 
                size={24} 
              />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#0070F3"
            colors={["#0070F3"]}
            progressBackgroundColor="#111"
          />
        }
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <Pressable 
            onPress={() => userProfile?.avatar && setShowImageModal(true)}
            style={styles.profileImageContainer}
            android_ripple={{ color: 'rgba(0, 112, 243, 0.2)', foreground: true }}
          >
            {userProfile?.avatar ? (
              <>
                <Image
                  source={{ uri: getImageUrl(userProfile.avatar) }}
                  style={styles.profileImage}
                />
                <View style={styles.profileImageOverlay}>
                  <ZoomIn color="white" size={24} />
                </View>
              </>
            ) : (
              <View style={styles.avatarPlaceholder}>
                <User size={40} color="#0070F3" />
              </View>
            )}
          </Pressable>
          <View style={styles.nameAndVerificationContainer}>
            <Text style={styles.profileName}>
              {profileData?.username || 'User'}
            </Text>
            {(profileData?.isVerified || profileData?.isBlueVerified) && (
              <View style={[
                styles.blueVerifiedContainer,
                { backgroundColor: profileData?.isBlueVerified ? 'rgba(24, 119, 242, 0.1)' : 'rgba(0, 0, 0, 0.1)' }
              ]}>
                <TunnelVerifiedMark size={18} />
              </View>
            )}
          </View>
          
          {/* Full Name Display */}
          {(profileData?.firstName || profileData?.lastName) && (
            <View style={styles.fullNameContainer}>
              <Text style={styles.fullNameText}>
                {`${profileData?.firstName || ''} ${profileData?.lastName || ''}`.trim()}
              </Text>
            </View>
          )}
          
          {profileData?.location && (
            <View style={styles.locationContainer}>
              <MapPin size={14} color="#888" />
              <Text style={styles.locationText}>{profileData.location}</Text>
            </View>
          )}
          
          {profileData?.phone && (
            <View style={styles.phoneContainer}>
              <Phone size={14} color="#888" />
              <Text style={styles.phoneText}>{profileData.phone}</Text>
            </View>
          )}
          
          <View style={styles.pointsContainer}>
            <Text style={styles.pointsLabel}>Your Points</Text>
            <Animated.Text
              style={[
                styles.pointsValue,
                { transform: [{ scale: scaleAnim }] }
              ]}
            >
              {profileData?.points || displayPoints}
            </Animated.Text>
          </View>
        </View>

        {/* User Bio Section */}
        {userProfile?.bio && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <View style={styles.bioContainer}>
              <Text style={styles.bioText}>{userProfile.bio}</Text>
            </View>
          </View>
        )}

        {/* User Interests Section */}
        {userProfile?.interests && userProfile.interests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Interests</Text>
            <View style={styles.interestsContainer}>
              {userProfile.interests.map((interest: string, index: number) => (
                <View key={index} style={styles.interestTag}>
                  <Text style={styles.interestText}>{interest}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
        
        {/* User Content Section */}
        <View style={styles.section}>
          <View style={styles.contentHeader}>
            <Text style={styles.sectionTitle}>Your Content</Text>
            
            {/* Add content type tabs */}
            <View style={styles.contentTabs}>
              <Pressable 
                style={[
                  styles.tabButton,
                  activeTab === 'posts' && styles.activeTabButton
                ]}
                onPress={() => setActiveTab('posts')}
              >
                <Text style={[
                  styles.tabText,
                  activeTab === 'posts' && styles.activeTabText
                ]}>Posts</Text>
              </Pressable>
              
              <Pressable 
                style={[
                  styles.tabButton,
                  activeTab === 'videos' && styles.activeTabButton
                ]}
                onPress={() => setActiveTab('videos')}
              >
                <Text style={[
                  styles.tabText,
                  activeTab === 'videos' && styles.activeTabText
                ]}>Videos</Text>
              </Pressable>
            </View>
            
            <Pressable 
              style={styles.viewToggleButton}
              onPress={toggleViewType}
            >
              {viewType === 'grid' ? (
                <List size={20} color="#0070F3" />
              ) : (
                <Grid size={20} color="#0070F3" />
              )}
            </Pressable>
          </View>
          
          {/* Posts Tab Content */}
          {activeTab === 'posts' && (
            <>
              {postsLoading ? (
                <View style={styles.loadingContentContainer}>
                  <ActivityIndicator size="small" color="#0070F3" />
                  <Text style={styles.loadingContentText}>Loading your content...</Text>
                </View>
              ) : userPosts.length === 0 ? (
                <View style={styles.emptyContentContainer}>
                  <Award size={40} color="#333" />
                  <Text style={styles.emptyContentTitle}>No Posts Yet</Text>
                  <Text style={styles.emptyContentText}>
                    You haven't shared any posts yet. Your posts will appear here.
                  </Text>
                  <Pressable
                    style={styles.createPostButton}
                    onPress={() => router.push('/newsfeed-upload' as any)}
                  >
                    <Text style={styles.createPostButtonText}>Create Post</Text>
                  </Pressable>
                </View>
              ) : (
                viewType === 'grid' ? (
                  <FlatList
                    key="grid"
                    data={userPosts}
                    numColumns={3}
                    renderItem={renderGridItem}
                    keyExtractor={item => item.id}
                    scrollEnabled={false}
                    contentContainerStyle={styles.gridContainer}
                  />
                ) : (
                  <FlatList
                    key="list"
                    data={userPosts}
                    numColumns={1}
                    renderItem={renderListItem}
                    keyExtractor={item => item.id}
                    scrollEnabled={false}
                    contentContainerStyle={styles.listContainer}
                  />
                )
              )}
            </>
          )}
          
          {/* Videos Tab Content */}
          {activeTab === 'videos' && (
            <>
              {videosLoading ? (
                <View style={styles.loadingContentContainer}>
                  <ActivityIndicator size="small" color="#0070F3" />
                  <Text style={styles.loadingContentText}>Loading your videos...</Text>
                </View>
              ) : userVideos && userVideos.length > 0 ? (
                <FlatList
                  key="videos-grid"
                  data={userVideos}
                  numColumns={3}
                  renderItem={renderVideoGridItem}
                  keyExtractor={item => item.id}
                  scrollEnabled={false}
                  contentContainerStyle={styles.gridContainer}
                />
              ) : (
                <View style={styles.emptyContentContainer}>
                  <Film size={40} color="#333" />
                  <Text style={styles.emptyContentTitle}>No Videos Yet</Text>
                  <Text style={styles.emptyContentText}>
                    You haven't uploaded any videos yet. Your videos will appear here.
                  </Text>
                  <Pressable
                    style={styles.createPostButton}
                    onPress={() => router.push('/video-upload' as any)}
                  >
                    <Text style={styles.createPostButtonText}>Upload Video</Text>
                  </Pressable>
                </View>
              )}
            </>
          )}
        </View>

        {/* Privacy Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy Settings</Text>
          <Pressable 
            style={styles.privacyCard}
            onPress={() => router.push('/privacy-settings' as any)}
          >
            <View style={styles.privacyHeader}>
              <View style={styles.privacyIconContainer}>
                <Shield color="#0070F3" size={20} />
              </View>
              <Text style={styles.privacyTitle}>Manage Privacy Preferences</Text>
              <ChevronRight color="#888" size={18} />
            </View>
            <Text style={styles.privacyDescription}>
              Control what information is visible to others and how your data is used
            </Text>
          </Pressable>
        </View>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <View style={styles.statsRow}>
            {renderStatCard(
              <Award color="#0070F3" size={24} />,
              'Badges',
              profileData?.badges?.length || '4'
            )}
            {renderStatCard(
              <Clock color="#0070F3" size={24} />,
              'Days Active',
              profileData?.daysActive || (profileData?.createdAt ? 
                Math.ceil((new Date().getTime() - new Date(profileData.createdAt).getTime()) / (1000 * 60 * 60 * 24)).toString() : 
                '12')
            )}
          </View>
          <View style={styles.statsRow}>
            {renderStatCard(
              <Heart color="#0070F3" size={24} />,
              'Likes Given',
              profileData?.likesGiven || '27'
            )}
            {renderStatCard(
              <BarChart2 color="#0070F3" size={24} />,
              'Rank',
              profileData?.rank || (profileData?.points && profileData.points > 500 ? 'Gold' : profileData?.points && profileData.points > 100 ? 'Silver' : 'Bronze')
            )}
          </View>
        </View>

        {/* Badges Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Badges</Text>
          {profileData?.badges && profileData.badges.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.badgesContainer}
            >
              {profileData.badges.map((badge: { id: string; icon: string; name: string; description: string }) => (
                <View key={badge.id} style={styles.badge}>
                  <Text style={styles.badgeIcon}>{badge.icon}</Text>
                  <Text style={styles.badgeName}>{badge.name}</Text>
                  <Text style={styles.badgeDescription}>{badge.description}</Text>
                </View>
              ))}
            </ScrollView>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.badgesContainer}
            >
              {BADGES.map((badge) => (
                <View key={badge.id} style={styles.badge}>
                  <Text style={styles.badgeIcon}>{badge.icon}</Text>
                  <Text style={styles.badgeName}>{badge.name}</Text>
                  <Text style={styles.badgeDescription}>{badge.description}</Text>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <View style={styles.settingsContainer}>
            {renderSettingItem(
              <User color="#0070F3" size={20} />,
              'Edit Profile',
              undefined,
              handleEditProfile
            )}
            {renderSettingItem(
              <BarChart2 color="#0070F3" size={20} />,
              'Content Insights',
              undefined,
              handleNavigateToInsights
            )}
            {renderSettingItem(
              <Bell color="#0070F3" size={20} />,
              'Notifications',
              <Switch
                value={true}
                onValueChange={() => {}}
                trackColor={{ false: '#3e3e3e', true: 'rgba(0,112,243,0.3)' }}
                thumbColor={true ? '#0070F3' : '#f4f3f4'}
              />
            )}
            {renderSettingItem(
              <Moon color="#0070F3" size={20} />,
              'Dark Mode',
              <Switch
                value={true}
                onValueChange={() => {}}
                trackColor={{ false: '#3e3e3e', true: 'rgba(0,112,243,0.3)' }}
                thumbColor={true ? '#0070F3' : '#f4f3f4'}
              />
            )}
            {renderSettingItem(
              <Settings color="#0070F3" size={20} />,
              'Settings',
              undefined,
              handleNavigateToPrivacy
            )}
            {renderSettingItem(
              <HelpCircle color="#0070F3" size={20} />,
              'Help & Support',
              undefined,
              () => {}
            )}
            {renderSettingItem(
              <LogOut color="#FF3B30" size={20} />,
              'Logout',
              undefined,
              handleLogout
            )}
          </View>
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>FAQ</Text>
          <View style={styles.faqContainer}>
            {FAQ_ITEMS.map((item) => (
              <Pressable
                key={item.question}
                style={styles.faqItem}
                onPress={() => setExpandedFaq(expandedFaq === item.question ? null : item.question)}
              >
                <View style={styles.faqHeader}>
                  <Text style={styles.faqQuestion}>{item.question}</Text>
                  <ChevronDown
                    color="#888"
                    size={20}
                    style={[
                      styles.faqIcon,
                      { transform: [{ rotate: expandedFaq === item.question ? '180deg' : '0deg' }] }
                    ]}
                  />
                </View>
                {expandedFaq === item.question && (
                  <Text style={styles.faqAnswer}>{item.answer}</Text>
                )}
              </Pressable>
            ))}
          </View>
        </View>

        {/* Debug Section */}
        <View style={styles.debugSection}>
          <Pressable
            style={[styles.debugButton]}
            onPress={() => {
              // Display user ID and authentication details
              if (userDisplay) {
                Alert.alert(
                  'User Details',
                  `ID: ${userDisplay._id}\nEmail: ${userDisplay.email}\nCreated: ${userDisplay.createdAt ? new Date(userDisplay.createdAt).toLocaleString() : 'N/A'}\nProfile: ${userDisplay.profile ? 'Yes' : 'No'}\nAvatar: ${userDisplay.profile?.avatar ? 'Yes' : 'No'}\nHook User: ${user ? 'Available' : 'Not Available'}`,
                  [{ text: 'OK' }]
                );
              } else {
                Alert.alert('No User', 'No user is currently logged in or data is incomplete');
              }
            }}
          >
            <Text style={styles.resetButtonText}>
              Show User Details (Debug)
            </Text>
          </Pressable>
          
          <Pressable
            style={[styles.debugButton, {marginTop: 10, backgroundColor: '#555'}]}
            onPress={async () => {
              try {
                // Directly check AsyncStorage
                const userStr = await AsyncStorage.getItem('sanity_user');
                Alert.alert(
                  'Storage Check',
                  userStr ? 
                    `Found user in storage:\n${userStr.substring(0, 150)}...` : 
                    'No user data in AsyncStorage',
                  [{ text: 'OK' }]
                );
              } catch (e) {
                Alert.alert('Error', 'Failed to check storage: ' + e);
              }
            }}
          >
            <Text style={styles.resetButtonText}>
              Check Storage (Debug)
            </Text>
          </Pressable>
          
          <Pressable
            style={[
              styles.resetButton,
              showResetConfirm && styles.resetButtonConfirm
            ]}
            onPress={handleResetAll}
          >
            <Text style={styles.resetButtonText}>
              {showResetConfirm ? 'Confirm Reset' : 'Reset All Data (Debug)'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 90,
    zIndex: 100,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
  },
  profileHeader: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 30,
  },
  profileImageContainer: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#1877F2',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  profileImageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0,
  },
  nameAndVerificationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  profileName: {
    color: 'white',
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
  },
  verificationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  blueVerifiedContainer: {
    marginLeft: 8,
  },
  verifiedContainer: {
    marginLeft: 8,
  },
  profileUsername: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    opacity: 0.8,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    marginBottom: 10,
  },
  locationText: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginLeft: 5,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  phoneText: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginLeft: 5,
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
  },
  pointsLabel: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    opacity: 0.8,
  },
  pointsValue: {
    color: '#00ff00',
    fontSize: 32,
    fontFamily: 'Inter_700Bold',
  },
  statsSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 15,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 15,
  },
  badgesContainer: {
    paddingRight: 20,
    gap: 15,
  },
  badge: {
    backgroundColor: '#111',
    borderRadius: 15,
    padding: 15,
    width: SCREEN_WIDTH * 0.4,
    alignItems: 'center',
  },
  badgeIcon: {
    fontSize: 32,
    marginBottom: 10,
  },
  badgeName: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 5,
    textAlign: 'center',
  },
  badgeDescription: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  settingsContainer: {
    gap: 10,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingTitle: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  scrollView: {
    paddingBottom: 40,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  contactContainer: {
    backgroundColor: '#111',
    borderRadius: 15,
    overflow: 'hidden',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  contactTextContainer: {
    marginLeft: 10,
  },
  contactLabel: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  contactValue: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  faqContainer: {
    backgroundColor: '#111',
    borderRadius: 15,
    overflow: 'hidden',
  },
  faqItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    flex: 1,
  },
  faqAnswer: {
    color: '#888',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginTop: 10,
    lineHeight: 20,
  },
  faqIcon: {
    marginLeft: 10,
  },
  debugSection: {
    padding: 20,
    paddingBottom: 40,
  },
  resetButton: {
    backgroundColor: '#1E1E1E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 12,
    gap: 10,
  },
  resetButtonConfirm: {
    backgroundColor: '#FF3B30',
  },
  resetButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  settingsButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statCard: {
    backgroundColor: '#111',
    borderRadius: 15,
    padding: 15,
    width: SCREEN_WIDTH * 0.42,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 112, 243, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statInfo: {
    alignItems: 'center',
  },
  statValue: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    marginBottom: 4,
  },
  statTitle: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(0,112,243,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#1877F2',
  },
  bioContainer: {
    backgroundColor: '#111',
    borderRadius: 15,
    padding: 15,
  },
  bioText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  interestTag: {
    backgroundColor: '#111',
    borderRadius: 15,
    padding: 5,
  },
  interestText: {
    color: 'white',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalCloseArea: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImageContainer: {
    width: SCREEN_WIDTH * 0.9,
    height: SCREEN_HEIGHT * 0.7,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  modalImage: {
    width: SCREEN_WIDTH * 0.9,
    height: SCREEN_HEIGHT * 0.7,
  },
  modalCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomControls: {
    position: 'absolute',
    bottom: 50,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  zoomButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomIndicator: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 8,
    borderRadius: 12,
  },
  zoomText: {
    color: 'white',
    fontSize: 14,
  },
  debugButton: {
    backgroundColor: '#333',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 12,
    gap: 10,
    marginTop: 10,
  },
  contentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  contentTabs: {
    flexDirection: 'row',
    marginRight: 8,
    // Add any necessary adjustments to accommodate 3 tabs
  },
  tabButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 4, // Adjust spacing between tabs
    // Add any necessary adjustments
  },
  activeTabButton: {
    borderBottomWidth: 2,
    borderBottomColor: '#0070F3',
  },
  tabText: {
    fontSize: 14,
    color: '#777',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#0070F3',
    fontWeight: '600',
  },
  viewToggleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 112, 243, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContentContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContentText: {
    color: '#888',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginTop: 10,
  },
  emptyContentContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111',
    borderRadius: 15,
  },
  emptyContentTitle: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    marginTop: 15,
    marginBottom: 8,
  },
  emptyContentText: {
    color: '#888',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginBottom: 20,
  },
  createPostButton: {
    backgroundColor: '#0070F3',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  createPostButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  gridItem: {
    width: (SCREEN_WIDTH - 50) / 3,
    height: (SCREEN_WIDTH - 50) / 3,
    margin: 5,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  gridItemImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  gridItemTextOnly: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
    backgroundColor: 'rgba(0, 112, 243, 0.1)',
  },
  gridItemContent: {
    color: 'white',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  multipleImagesIndicator: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 10,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  multipleImagesText: {
    color: 'white',
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
  },
  listContainer: {
    marginTop: 10,
  },
  listItem: {
    backgroundColor: '#111',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
  },
  listItemContent: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
    marginBottom: 10,
  },
  listItemImagesContainer: {
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 10,
  },
  listItemSingleImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  listItemMultipleImage: {
    height: 200,
    resizeMode: 'cover',
  },
  listItemLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  listItemLocationText: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginLeft: 5,
  },
  listItemActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  listItemActionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listItemAction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  listItemActionText: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginLeft: 5,
  },
  privacyCard: {
    backgroundColor: '#111',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
  },
  privacyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  privacyIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 112, 243, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  privacyTitle: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  privacyDescription: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 5,
  },
  fullNameContainer: {
    marginTop: 5,
    marginBottom: 10,
  },
  fullNameText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  userPopup: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    width: SCREEN_WIDTH * 0.9,
    maxHeight: SCREEN_HEIGHT * 0.7,
  },
  userPopupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  userPopupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userPopupAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  userPopupInfo: {
    flexDirection: 'column',
  },
  userPopupNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userPopupName: {
    color: 'black',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  popupVerifiedBadge: {
    marginLeft: 5,
    backgroundColor: 'rgba(24, 119, 242, 0.1)',
    borderRadius: 10,
    padding: 2,
  },
  userPopupUsername: {
    color: 'black',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  userPopupBody: {
    marginBottom: 15,
  },
  userPopupBio: {
    color: 'black',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginBottom: 10,
  },
  userPopupStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 15,
  },
  userPopupStat: {
    alignItems: 'center',
  },
  userPopupStatValue: {
    color: 'black',
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
  userPopupStatLabel: {
    color: 'black',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  userPopupViewButton: {
    backgroundColor: '#0070F3',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
    marginTop: 10,
  },
  userPopupViewButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  userPopupCloseButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoGridItem: {
    height: '100%',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  videoThumbnailContainer: {
    height: '70%',
    width: '100%', 
    backgroundColor: '#222',
    position: 'relative',
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
  },
  videoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoPlayOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  videoPlayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,112,243,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoInfo: {
    padding: 10,
    height: '30%',
    justifyContent: 'center',
  },
  videoTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  videoTimeAgo: {
    color: '#888',
    fontSize: 12,
  },
  insightsContainer: {
    marginTop: 12,
    backgroundColor: '#111',
    borderRadius: 12,
    overflow: 'hidden',
  },
  insightsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#111',
  },
  insightsIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 112, 243, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  insightsButtonContent: {
    flex: 1,
  },
  insightsButtonTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  insightsButtonText: {
    color: '#ccc',
    fontSize: 12,
  },
});