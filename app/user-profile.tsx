import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Animated,
  ImageBackground,
  FlatList,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
  Modal,
  DeviceEventEmitter,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { BlurView } from 'expo-blur';
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Heart,
  Share2,
  MessageCircle,
  Award,
  Bell,
  Calendar,
  Link,
  UserPlus,
  LayoutGrid,
  Bookmark,
  Clock,
  Settings,
  Lock,
  Eye,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Grid,
  List,
  Edit3,
  X,
  Film,
  Play,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSanityAuth } from './hooks/useSanityAuth';
import { usePointsStore } from '@/store/usePointsStore';
import { getSanityClient, urlFor } from '@/tunnel-ad-main/services/postService';
import Svg, { Path } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Tunnel verification mark component
const TunnelVerifiedMark = ({ size = 10 }) => (
  <Svg width={size * 1.5} height={size * 1.5} viewBox="0 0 24 24" fill="none">
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

// User type definition
interface UserData {
  id: string;
  name: string;
  username: string;
  avatar: string;
  email?: string;
  phone?: string;
  isVerified: boolean;
  isBlueVerified?: boolean;
  bio?: string;
  location?: string;
  memberSince?: string;
  points?: number;
  followers?: number;
  following?: number;
  posts?: number;
  likesCount?: number;
  interests?: string[];
  badges?: { id: string; name: string; icon: string }[];
}

// Post type
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

// Add new component for typing animation to the top of the file
const TypingAnimatedText = ({ text, style, delay = 50 }: { text: string, style: any, delay?: number }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  
  useEffect(() => {
    if (!text) return;
    
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, delay);
      
      return () => clearTimeout(timeout);
    }
  }, [currentIndex, text, delay]);
  
  useEffect(() => {
    // Reset animation when text changes
    setDisplayedText('');
    setCurrentIndex(0);
  }, [text]);
  
  return <Text style={style}>{displayedText}</Text>;
};

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user: currentUser } = useSanityAuth();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  
  // State
  const [userData, setUserData] = useState<UserData | null>(null);
  const [userPosts, setUserPosts] = useState<PostData[]>([]);
  const [userVideos, setUserVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [videosLoading, setVideosLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [following, setFollowing] = useState(false);
  const [viewType, setViewType] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState<'posts' | 'saved' | 'tagged' | 'videos'>('posts');
  
  // Followers state
  const [followers, setFollowers] = useState<UserData[]>([]);
  const [followersLoading, setFollowersLoading] = useState(false);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  
  // Animation values
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerHeightValue = windowWidth > 768 ? 350 : 300;
  const collapsedHeaderHeight = windowWidth > 768 ? 120 : 100; // Increased from 100/80
  const headerHeight = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [headerHeightValue, collapsedHeaderHeight],
    extrapolate: 'clamp'
  });
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 1],
    extrapolate: 'clamp'
  });
  const imageOpacity = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [1, 0],
    extrapolate: 'clamp'
  });

  // Responsive values
  const avatarSize = windowWidth > 768 ? 120 : windowWidth >= 414 ? 100 : 80;
  const headerAvatarSize = windowWidth > 768 ? 40 : 32;
  const nameTextSize = windowWidth > 768 ? 28 : windowWidth >= 414 ? 24 : 20;
  const contentPadding = windowWidth > 768 ? 24 : 16;
  
  // Grid sizing - adjust columns based on screen width
  const gridColumns = windowWidth > 768 ? 2 : 1;
  const itemGap = windowWidth > 768 ? 8 : 4;
  const itemWidth = (windowWidth - (gridColumns + 1) * itemGap) / gridColumns;
  const columnKey = windowWidth > 768 ? 'columns-2' : 'columns-1'; // Update key prop
  const fixedNumColumns = 2; // 2 items per row for videos and posts
  
  // Load user data
  useEffect(() => {
    if (id) {
      fetchUserData();
      fetchUserPosts();
      fetchUserVideos();
    }
  }, [id]);

  // Add a live points update listener - placed after initial data fetching useEffect
  useEffect(() => {
    // Listen for points earned events from videos
    const pointsEarnedListener = DeviceEventEmitter.addListener('POINTS_EARNED', (event) => {
      console.log('User Profile: POINTS_EARNED event received:', event);
      
      if (!userData) return;
      
      // If the event has verified data from Sanity, update immediately
      if (event.verifiedFromSanity && event.newTotal !== undefined) {
        console.log(`User Profile: Updating points to ${event.newTotal} from Sanity verification`);
        
        // Update the userData state with new points
        setUserData(prevData => {
          if (!prevData) return null;
          return {
            ...prevData,
            points: event.newTotal
          };
        });
      } 
      // Otherwise increment by the earned amount
      else if (event.amount) {
        console.log(`User Profile: Incrementing points by ${event.amount}`);
        
        // Update userData with incremented points
        setUserData(prevData => {
          if (!prevData) return null;
          const currentPoints = prevData.points || 0;
          return {
            ...prevData,
            points: currentPoints + event.amount
          };
        });
      }
      
      // Refresh user data in the background to ensure latest points
      refreshUserData(false);
    });
    
    return () => {
      pointsEarnedListener.remove();
    };
  }, [userData]);

  // Modify the fetchUserData function to properly check the following status
  const fetchUserData = async () => {
    try {
      setLoading(true);
      
      // Get client from service
      const client = getSanityClient();
      if (!client) {
        console.error('Failed to get Sanity client');
        return;
      }
      
      // Fetch from Sanity directly
      const userDetail = await client.fetch(`
        *[_type == "user" && _id == $userId][0] {
          _id,
          username,
          firstName,
          lastName,
          email,
          phone,
          location,
          points,
          createdAt,
          "avatar": profile.avatar,
          "bio": profile.bio,
          "interests": profile.interests,
          "isVerified": username == "admin" || username == "moderator",
          "isBlueVerified": isBlueVerified,
          "postsCount": count(*[_type == "post" && author._ref == $userId]),
          "likesCount": count(*[_type == "like" && user._ref == $userId]),
          "followersCount": count(*[_type == "follow" && following._ref == $userId]),
          "followingCount": count(*[_type == "follow" && follower._ref == $userId])
        }
      `, { userId: id });
      
      if (!userDetail) {
        console.warn(`No user found with ID: ${id}`);
        return;
      }
      
      // Format the user data
      const formattedUser: UserData = {
        id: userDetail._id || id as string,
        name: userDetail.firstName && userDetail.lastName 
          ? `${userDetail.firstName} ${userDetail.lastName}`.trim() 
          : userDetail.username || 'User',
        username: userDetail.username ? `@${userDetail.username}` : '@user',
        avatar: userDetail.avatar ? urlFor(userDetail.avatar).url() : 'https://randomuser.me/api/portraits/lego/1.jpg',
        email: userDetail.email,
        phone: userDetail.phone,
        isVerified: userDetail.isVerified || false,
        isBlueVerified: userDetail.isBlueVerified || false,
        bio: userDetail.bio || "No bio provided",
        interests: userDetail.interests || [],
        location: userDetail.location || 'Unknown location',
        posts: userDetail.postsCount || 0,
        likesCount: userDetail.likesCount || 0,
        followers: userDetail.followersCount || 0,
        following: userDetail.followingCount || 0,
        memberSince: userDetail.createdAt 
          ? formatDate(userDetail.createdAt) 
          : 'June 2022',
        points: userDetail.points || 0,
        badges: generateBadges(userDetail)
      };
      
      setUserData(formattedUser);
      
      // Check if current user is following this user - Important fix for persistence
      if (currentUser?._id) {
        try {
          // Use a direct count query for better performance
          const isFollowingResult = await client.fetch(`
            count(*[_type == "follow" && follower._ref == $currentUserId && following._ref == $userId]) > 0
          `, { 
            currentUserId: currentUser._id,
            userId: id 
          });
          
          console.log('Follow status check result:', isFollowingResult);
          setFollowing(isFollowingResult || false);
        } catch (followError) {
          console.error('Error checking follow status:', followError);
          setFollowing(false);
        }
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Also add a useEffect to ensure we recheck the follow status when currentUser changes
  useEffect(() => {
    if (currentUser?._id && id) {
      // Check follow status if we have both logged in user and profile user IDs
      const checkFollowStatus = async () => {
        try {
          const client = getSanityClient();
          if (!client) return;
          
          const isFollowingResult = await client.fetch(`
            count(*[_type == "follow" && follower._ref == $currentUserId && following._ref == $userId]) > 0
          `, { 
            currentUserId: currentUser._id,
            userId: id 
          });
          
          console.log('Follow status updated:', isFollowingResult);
          setFollowing(isFollowingResult || false);
        } catch (err) {
          console.error('Error checking follow status on user change:', err);
        }
      };
      
      checkFollowStatus();
    }
  }, [currentUser, id]);

  // Fetch user posts
  const fetchUserPosts = async () => {
    try {
      setPostsLoading(true);
      
      const client = getSanityClient();
      if (!client) {
        console.error('Failed to get Sanity client');
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
        userId: id,
        currentUserId: currentUser?._id || ''
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
              return urlFor(img).url();
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
            avatar: post.author?.avatar ? urlFor(post.author.avatar).url() : 'https://randomuser.me/api/portraits/men/32.jpg',
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
      setRefreshing(false);
    }
  };

  // Add this new function after fetchUserPosts
  const fetchUserVideos = async () => {
    if (!id) return;
    
    try {
      setVideosLoading(true);
      
      // Query to get videos by user ID - using author._ref instead of userId
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
      
      const client = getSanityClient();
      const videos = await client.fetch(query, { 
        userId: id,
        currentUserId: currentUser?._id || ''
      });
      
      // Process videos data to match VideoFeed format
      const processedVideos = videos.map((video: any) => {
        // Debug log for video thumbnails
        console.log('Video from Sanity:', { 
          id: video._id, 
          thumbURL: video.thumbnailUrl,
          type: video.type,
          orientation: video.videoOrientation
        });
        
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
          author: video.author || userData?.name || 'Unknown',
          authorId: video.authorId || id,
          authorAvatar: video.authorAvatar ? urlFor(video.authorAvatar).url() : userData?.avatar,
          isVerified: video.isVerified || false,
          isBlueVerified: video.isBlueVerified || false,
          thumbnail: video.thumbnailUrl || '',
          timeAgo: calculateTimeAgo(video.createdAt),
          hasLiked: video.hasLiked || false
        };
      });
      
      setUserVideos(processedVideos);
      console.log(`Loaded ${processedVideos.length} videos for user ${id}`);
    } catch (error) {
      console.error('Error fetching user videos:', error);
    } finally {
      setVideosLoading(false);
    }
  };

  // Modify the handleRefresh function to refresh points specifically
  const handleRefresh = () => {
    setRefreshing(true);
    refreshUserData(true);
  };
  
  // Create a dedicated function to refresh user data with latest points
  const refreshUserData = async (showLoadingUI = true) => {
    if (showLoadingUI) {
      setRefreshing(true);
      setLoading(true);
    }
    
    try {
      // Execute all data fetches in parallel
      await Promise.all([
        fetchUserData(),
        fetchUserPosts(),
        fetchUserVideos()
      ]);
      
      // Make sure we have the user ID
      if (!id) {
        console.error('No user ID available for refresh');
        return;
      }
      
      // Get client from service
      const client = getSanityClient();
      if (!client) {
        console.error('Failed to get Sanity client for refreshing user data');
        return;
      }
      
      // Fetch latest user data from Sanity including points
      const userDetail = await client.fetch(`
        *[_type == "user" && _id == $userId][0] {
          _id,
          username,
          firstName,
          lastName,
          email,
          phone,
          location,
          points,
          createdAt,
          "avatar": profile.avatar,
          "bio": profile.bio,
          "interests": profile.interests,
          "isVerified": username == "admin" || username == "moderator",
          "isBlueVerified": isBlueVerified,
          "postsCount": count(*[_type == "post" && author._ref == $userId]),
          "likesCount": count(*[_type == "like" && user._ref == $userId]),
          "followersCount": count(*[_type == "follow" && following._ref == $userId]),
          "followingCount": count(*[_type == "follow" && follower._ref == $userId])
        }
      `, { userId: id });
      
      if (userDetail) {
        console.log("Refreshed user data with latest points:", userDetail.points);
        
        // Format the user data with latest points
        const formattedUser: UserData = {
          id: userDetail._id,
          name: userDetail.firstName && userDetail.lastName 
            ? `${userDetail.firstName} ${userDetail.lastName}`.trim() 
            : userDetail.username || 'User',
          username: userDetail.username ? `@${userDetail.username}` : '@user',
          avatar: userDetail.avatar ? urlFor(userDetail.avatar).url() : 'https://randomuser.me/api/portraits/lego/1.jpg',
          email: userDetail.email,
          phone: userDetail.phone,
          isVerified: userDetail.isVerified || false,
          isBlueVerified: userDetail.isBlueVerified || false,
          bio: userDetail.bio || "No bio provided",
          interests: userDetail.interests || [],
          location: userDetail.location || 'Unknown location',
          posts: userDetail.postsCount || 0,
          likesCount: userDetail.likesCount || 0,
          followers: userDetail.followersCount || 0,
          following: userDetail.followingCount || 0,
          memberSince: userDetail.createdAt 
            ? formatDate(userDetail.createdAt) 
            : 'June 2022',
          points: userDetail.points || 0,
          badges: generateBadges(userDetail)
        };
        
        // Update user data with fresh info
        setUserData(formattedUser);
      }
    } catch (error) {
      console.error('Error refreshing user data with latest points:', error);
    } finally {
      if (showLoadingUI) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  // Modify the handleFollowToggle function to update UI immediately before the API call completes
  const handleFollowToggle = useCallback(async () => {
    if (!currentUser || !id) return;
    
    try {
      // Immediately update UI to show toggle action
      setFollowing(prevState => !prevState);
      
      // Immediately update followers count to reflect the change
      setUserData(prevData => {
        if (!prevData) return null;
        const followersDelta = following ? -1 : 1; // Decrease if unfollowing, increase if following
        return {
          ...prevData,
          followers: (prevData.followers || 0) + followersDelta
        };
      });
      
      const client = getSanityClient();
      if (!client) return;
      
      if (!following) { // Was previously not following, now following
        // Follow user
        await client.create({
          _type: 'follow',
          follower: { _type: 'reference', _ref: currentUser._id },
          following: { _type: 'reference', _ref: id as string },
          createdAt: new Date().toISOString()
        });
      } else { // Was previously following, now unfollowing
        // Unfollow user
        await client.delete({
          query: `*[_type == "follow" && follower._ref == $currentUserId && following._ref == $userId][0]`,
          params: { currentUserId: currentUser._id, userId: id }
        });
      }
      
      // If API call fails, we'll reset to actual data in the catch block
      
      // For a smoother UX, don't refresh entire profile data which can cause UI flicker
      // Just let the local state update handle the immediate feedback
    } catch (error) {
      console.error('Error toggling follow status:', error);
      
      // If there was an error, revert UI changes
      setFollowing(prevState => !prevState);
      
      // Revert followers count as well
      setUserData(prevData => {
        if (!prevData) return null;
        const followersDelta = following ? 1 : -1; // Restore previous count
        return {
          ...prevData,
          followers: (prevData.followers || 0) + followersDelta
        };
      });
      
      // Show error toast or message
      // If you have a toast notification system, you could use it here
    }
  }, [currentUser, id, following]);

  // Format date helper
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } catch {
      return 'Unknown date';
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

  // Generate badges helper
  const generateBadges = (user: any) => {
    const badges = [];
    
    // Early adopter badge
    if (user.createdAt && new Date(user.createdAt) < new Date('2023-01-01')) {
      badges.push({ id: 'early', name: 'Early Adopter', icon: '🚀' });
    }
    
    // Content creator badge
    if (user.postsCount && user.postsCount > 5) {
      badges.push({ id: 'creator', name: 'Content Creator', icon: '✍️' });
    }
    
    // Verified account badge
    if (user.isVerified || user.isBlueVerified) {
      badges.push({ id: 'verified', name: 'Verified Account', icon: '✓' });
    }
    
    // Points master badge
    if (user.points && user.points > 100) {
      badges.push({ id: 'points', name: 'Points Master', icon: '🏆' });
    }
    
    // Add default badge if none
    if (badges.length === 0) {
      badges.push({ id: 'member', name: 'Community Member', icon: '👋' });
    }
    
    return badges;
  };

  // Render post grid item with responsive dimensions
  const renderGridItem = ({ item }: { item: PostData }) => {
    // Calculate width based on fixed number of columns
    const calculatedWidth = (windowWidth - (fixedNumColumns + 1) * itemGap) / fixedNumColumns;
    
    return (
      <Pressable 
        style={[
          styles.gridItem, 
          { 
            width: calculatedWidth, 
            height: calculatedWidth,
            margin: itemGap / 2
          }
        ]}
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
          <View style={[
            styles.gridItemTextOnly, 
            { 
              width: calculatedWidth, 
              height: calculatedWidth,
              padding: windowWidth > 768 ? 12 : 8
            }
          ]}>
            <Text 
              style={[
                styles.gridItemContent, 
                windowWidth > 768 ? { fontSize: 14, lineHeight: 20 } : undefined
              ]}
              numberOfLines={4}
            >
              {item.content}
            </Text>
          </View>
        )}
        
        {/* Multiple images indicator */}
        {item.images && item.images.length > 1 && (
          <View style={[
            styles.multipleImagesIndicator,
            windowWidth > 768 ? { padding: 4 } : undefined
          ]}>
            <LayoutGrid size={windowWidth > 768 ? 16 : 12} color="white" />
          </View>
        )}
      </Pressable>
    );
  };
  
  // Render post list item
  const renderListItem = ({ item }: { item: PostData }) => {
    return (
      <View style={styles.listItem}>
        {/* User info */}
        <View style={styles.listItemHeader}>
          <Image 
            source={{ uri: item.user.avatar }} 
            style={styles.listItemAvatar} 
          />
          <View style={styles.listItemUserInfo}>
            <View style={styles.listItemUserNameRow}>
              <Text style={styles.listItemUserName}>{item.user.name}</Text>
            </View>
            <View style={styles.listItemSubheaderRow}>
              <Text style={styles.listItemUsername}>{item.user.username}</Text>
              <Text style={styles.listItemTimeAgo}> • {item.timeAgo}</Text>
            </View>
          </View>
        </View>
        
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
                    style={[styles.listItemMultipleImage, { width: windowWidth - 32 }]}
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

  // Fetch followers function
  const fetchFollowers = async () => {
    if (!id) return;
    
    try {
      setFollowersLoading(true);
      
      const client = getSanityClient();
      if (!client) {
        console.error('Failed to get Sanity client');
        return;
      }
      
      // Fetch users who are following this user
      const followersData = await client.fetch(`
        *[_type == "follow" && following._ref == $userId] {
          "follower": follower->{
            _id,
            username,
            firstName,
            lastName,
            "avatar": profile.avatar,
            "isVerified": username == "admin" || username == "moderator",
            "isBlueVerified": defined(isBlueVerified) && isBlueVerified == true
          }
        }
      `, { userId: id });
      
      // Format followers data
      const formattedFollowers = followersData.map((item: any) => {
        const follower = item.follower;
        if (!follower) return null;
        
        return {
          id: follower._id,
          name: follower.firstName && follower.lastName 
            ? `${follower.firstName} ${follower.lastName}`.trim() 
            : follower.username || 'User',
          username: follower.username ? `@${follower.username}` : '@user',
          avatar: follower.avatar ? urlFor(follower.avatar).url() : 'https://randomuser.me/api/portraits/lego/1.jpg',
          isVerified: follower.isVerified || false,
          isBlueVerified: follower.isBlueVerified || false
        };
      }).filter(Boolean);
      
      setFollowers(formattedFollowers);
    } catch (error) {
      console.error('Error fetching followers:', error);
    } finally {
      setFollowersLoading(false);
    }
  };
  
  // Handle follower click
  const handleFollowerPress = (followerId: string) => {
    router.push({
      pathname: "/user-profile" as any,
      params: { id: followerId }
    });
    setShowFollowersModal(false);
  };

  // Function to open followers modal
  const openFollowersModal = () => {
    fetchFollowers();
    setShowFollowersModal(true);
  };

  // Loading state
  if (loading && !userData) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <ActivityIndicator size="large" color="#1877F2" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  const isMyProfile = currentUser?._id === id;

  // Function to render video items in grid view
  const renderVideoGridItem = ({ item }: { item: any }) => {
    // Calculate fixed width based on number of columns
    const calculatedWidth = (windowWidth - (fixedNumColumns + 1) * itemGap) / fixedNumColumns;
    
    return (
      <Pressable 
        style={[
          styles.gridItem,
          {
            width: calculatedWidth,
            margin: itemGap / 2,
            aspectRatio: 0.68, // Make cards slightly taller
            borderRadius: 10,
            overflow: 'hidden',
            backgroundColor: '#111',
            marginBottom: 16
          }
        ]}
        onPress={() => router.push({
          pathname: '/video-detail',
          params: { id: item.id }
        } as any)}
      >
        <View style={{
          flex: 1,
          overflow: 'hidden',
        }}>
          {/* Thumbnail section */}
          <View style={{
            height: '72%', // Slightly increase thumbnail height
            width: '100%', 
            backgroundColor: '#222',
            position: 'relative',
          }}>
            {item.thumbnail ? (
              <Image 
                source={{ uri: item.thumbnail }} 
                style={{
                  width: '100%',
                  height: '100%',
                }}
                resizeMode="cover"
              />
            ) : (
              <View style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Film size={30} color="#666" />
              </View>
            )}
            
            {/* Play button overlay */}
            <View style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0,0,0,0.3)',
            }}>
              <View style={{
                width: 48, // Larger play button
                height: 48,
                borderRadius: 24,
                backgroundColor: 'rgba(24, 119, 242, 0.9)',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Play size={24} color="#FFF" />
              </View>
            </View>
          </View>
          
          {/* Video info section */}
          <View style={{
            padding: 14,
            height: '28%',
            backgroundColor: '#111',
            justifyContent: 'center',
          }}>
            <Text 
              style={{
                color: 'white',
                fontSize: 16, // Larger text
                fontFamily: 'Inter_600SemiBold',
                marginBottom: 6,
              }}
              numberOfLines={1}
            >
              {item.title || 'Untitled Video'}
            </Text>
            <Text style={{
              color: '#888',
              fontSize: 14, // Larger time text
              fontFamily: 'Inter_400Regular',
            }}>{item.timeAgo}</Text>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: 0 }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* Animated header */}
      <Animated.View 
        style={[
          styles.header,
          { 
            height: headerHeight,
            opacity: headerOpacity,
            zIndex: 100
          }
        ]}
      >
        <BlurView intensity={100} style={StyleSheet.absoluteFill} /> {/* Increased blur intensity from 80 to 100 */}
        <View style={[styles.headerContent, windowWidth > 768 && styles.tabletHeaderContent, {paddingTop: Platform.OS === 'ios' ? 55 : 25}]}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
            hitSlop={20}
          >
            <ArrowLeft color="white" size={windowWidth > 768 ? 28 : 24} />
          </Pressable>
          
          {userData && (
            <View style={[styles.headerUserInfo, {flex: 1, paddingHorizontal: 12}]}>
              <Image 
                source={{ uri: userData.avatar }} 
                style={[styles.headerAvatar, { width: headerAvatarSize, height: headerAvatarSize, borderRadius: headerAvatarSize/2 }]} 
              />
              <View style={[styles.headerTextContainer, { flex: 1, flexShrink: 1, paddingHorizontal: 8 }]}>
                <View style={styles.headerNameContainer}>
                  <Text style={[styles.headerName, windowWidth > 768 && styles.tabletHeaderText, { flexShrink: 1 }]} numberOfLines={1} ellipsizeMode="tail">
                    {userData?.name || 'User'}
                  </Text>
                  {(userData?.isVerified || userData?.isBlueVerified) && (
                    <View style={{ marginLeft: 4 }}>
                      <TunnelVerifiedMark size={windowWidth > 768 ? 14 : 12} />
                    </View>
                  )}
                </View>
                <Text style={[styles.headerUsername, windowWidth > 768 && { fontSize: 14 }]}>{userData.username}</Text>
              </View>
            </View>
          )}
          
          <Pressable
            style={styles.moreButton}
            onPress={() => {}}
            hitSlop={20}
          >
            <MoreHorizontal color="white" size={windowWidth > 768 ? 28 : 24} />
          </Pressable>
        </View>
      </Animated.View>
      
      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { 
            paddingHorizontal: windowWidth > 768 ? 20 : 0,
            paddingTop: 0, // No top padding to allow content to flow under status bar
            paddingBottom: 60, // Increased bottom padding for better scrolling experience
            marginTop: Platform.OS === 'android' ? -(StatusBar.currentHeight || 0) : 0 // Status bar compensation only on Android
          }
        ]}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#1877F2"
            colors={["#1877F2"]}
            progressViewOffset={headerHeightValue}
          />
        }
      >
        {/* Cover photo and profile section */}
        <Animated.View 
          style={[
            styles.coverContainer,
            { 
              opacity: imageOpacity,
              height: windowWidth > 768 ? 480 : 440,
              marginTop: 0,
              marginBottom: 10,
              top: 0,
              left: 0,
              right: 0,
              backgroundColor: '#000', // Solid black background only
            }
          ]}
        >
          {/* Add solid black background */}
          <View style={[styles.coverBackground, { 
            ...StyleSheet.absoluteFillObject,
            backgroundColor: '#000',
          }]} />
          
          {/* Remove gradient for top half */}
          
          <View style={[
            styles.profileSection, 
            { 
              marginTop: windowWidth > 768 ? 110 : 90,
              paddingHorizontal: contentPadding,
              paddingBottom: 120,
              backgroundColor: 'transparent',
              zIndex: 2, // Ensure content appears above gradient and background
            }
          ]}>
            <View style={[styles.avatarContainer, { flexDirection: 'row', alignItems: 'center' }]}>
              <Image 
                source={{ uri: userData?.avatar }} 
                style={[
                  styles.avatar, 
                  { 
                    width: avatarSize, 
                    height: avatarSize, 
                    borderRadius: avatarSize/2,
                    borderWidth: 3,
                    borderColor: '#1877F2'
                  }
                ]}
              />
              <View style={{ marginLeft: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={[styles.userName, { 
                    fontSize: windowWidth > 768 ? 26 : 22, 
                    color: 'white',
                    fontFamily: 'Inter_700Bold'
                  }]}>{userData?.name}</Text>
                  {(userData?.isVerified || userData?.isBlueVerified) && (
                    <View style={{ marginLeft: -3 }}>
                      <TunnelVerifiedMark size={windowWidth > 768 ? 20 : 18} />
                    </View>
                  )}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={[styles.userUsername, { 
                    fontSize: windowWidth > 768 ? 18 : 16, 
                    color: '#AAA',
                    fontFamily: 'Inter_500Medium'
                  }]}>{userData?.username}</Text>
                </View>
              </View>
            </View>
            
            <View style={[styles.userInfoContainer, windowWidth > 768 && { paddingHorizontal: 16 }]}>
              {/* Remove duplicate name and username and just keep bio section */}
              {userData?.bio && (
                <Text 
                  style={[
                    styles.userBio, 
                    windowWidth > 768 && { fontSize: 16, lineHeight: 24 },
                    { 
                      marginTop: 12, 
                      marginBottom: 16,
                      color: '#FFF',
                      backgroundColor: 'transparent', // Removed background
                      padding: 12,
                      borderRadius: 0, // Removed border radius
                      borderWidth: 0, // Removed border
                    }
                  ]}
                >
                  {userData.bio}
                </Text>
              )}
              
              {/* Location and join date */}
              <View style={styles.userMetaContainer}>
                {userData?.location && (
                  <View style={styles.userMetaItem}>
                    <MapPin size={windowWidth > 768 ? 16 : 14} color="#888" />
                    <Text style={[styles.userMetaText, windowWidth > 768 && { fontSize: 15 }]}>{userData.location}</Text>
                  </View>
                )}
                
                {userData?.phone && (
                  <View style={styles.userMetaItem}>
                    <Phone size={windowWidth > 768 ? 16 : 14} color="#888" />
                    <Text style={[styles.userMetaText, windowWidth > 768 && { fontSize: 15 }]}>{userData.phone}</Text>
                  </View>
                )}
                
                <View style={styles.userMetaItem}>
                  <Calendar size={windowWidth > 768 ? 16 : 14} color="#888" />
                  <Text style={[styles.userMetaText, windowWidth > 768 && { fontSize: 15 }]}>
                    Joined {userData?.memberSince}
                  </Text>
                </View>
                
                {userData?.interests && userData.interests.length > 0 && (
                  <View style={styles.userMetaItem}>
                    <Award size={windowWidth > 768 ? 16 : 14} color="#888" />
                    <Text style={[styles.userMetaText, windowWidth > 768 && { fontSize: 15 }]}>
                      Interests: {userData.interests.slice(0, 3).join(', ')}
                      {userData.interests.length > 3 && ' and more'}
                    </Text>
                  </View>
                )}
              </View>
              
  
              <View style={{
                marginTop: 12,
                marginBottom: 16,
                paddingVertical: 8,
                borderTopWidth: 0.5,
                borderBottomWidth: 0.5,
                borderTopColor: 'rgba(255, 255, 255, 0.1)',
                borderBottomColor: 'rgba(255, 255, 255, 0.1)'
              }}>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                }}>
                  <View style={{ marginRight: 20 }}>
                    <Text>
                      <Text style={{
                        color: 'white',
                        fontSize: windowWidth > 768 ? 18 : 16,
                        fontFamily: 'Inter_700Bold',
                      }}>{userData?.posts || '0'}</Text>
                      <Text style={{
                        color: '#8899A6',
                        fontSize: windowWidth > 768 ? 15 : 13,
                        fontFamily: 'Inter_400Regular',
                      }}> Posts</Text>
                    </Text>
                  </View>
                  
                  <Pressable 
                    style={{ marginRight: 20 }}
                    onPress={() => router.push({
                      pathname: "/following" as any,
                      params: { id: userData?.id }
                    })}
                  >
                    <Text>
                      <Text style={{
                        color: 'white',
                        fontSize: windowWidth > 768 ? 18 : 16,
                        fontFamily: 'Inter_700Bold',
                      }}>{userData?.following || '0'}</Text>
                      <Text style={{
                        color: '#8899A6',
                        fontSize: windowWidth > 768 ? 15 : 13,
                        fontFamily: 'Inter_400Regular',
                      }}> Following</Text>
                    </Text>
                  </Pressable>
                  
                  <Pressable 
                    style={{ marginRight: 20 }}
                    onPress={openFollowersModal}
                  >
                    <Text>
                      <Text style={{
                        color: 'white',
                        fontSize: windowWidth > 768 ? 18 : 16,
                        fontFamily: 'Inter_700Bold',
                      }}>{userData?.followers || '0'}</Text>
                      <Text style={{
                        color: '#8899A6',
                        fontSize: windowWidth > 768 ? 15 : 13,
                        fontFamily: 'Inter_400Regular',
                      }}> Followers</Text>
                    </Text>
                  </Pressable>
                  
                  <View>
                    <Text>
                      <Text style={{
                        color: 'white',
                        fontSize: windowWidth > 768 ? 18 : 16,
                        fontFamily: 'Inter_700Bold',
                      }}>{userData?.likesCount || '0'}</Text>
                      <Text style={{
                        color: '#8899A6',
                        fontSize: windowWidth > 768 ? 15 : 13,
                        fontFamily: 'Inter_400Regular',
                      }}> Likes</Text>
                    </Text>
                  </View>
                </View>
              </View>
              
              {/* Action buttons */}
              <View style={[styles.actionButtons, windowWidth > 768 && { marginTop: 8 }]}>
                {isMyProfile ? (
                  <>
                    <Pressable
                      style={[
                        styles.actionButton, 
                        styles.editProfileButton,
                        windowWidth > 768 && { height: 48 }
                      ]}
                      onPress={() => router.push('/editprofile' as any)}
                    >
                      <Text style={[styles.editProfileText, windowWidth > 768 && { fontSize: 16 }]}>Edit Profile</Text>
                    </Pressable>
                    
                    <Pressable
                      style={[
                        styles.actionButton, 
                        styles.shareButton,
                        windowWidth > 768 && { width: 48, height: 48 }
                      ]}
                      onPress={() => {}}
                    >
                      <Share2 size={windowWidth > 768 ? 22 : 18} color="#FFF" />
                    </Pressable>
                  </>
                ) : (
                  <>
                    <Pressable
                      style={[
                        styles.actionButton, 
                        following ? styles.unfollowButton : styles.followButton,
                        windowWidth > 768 && { height: 48 }
                      ]}
                      onPress={handleFollowToggle}
                    >
                      <Text style={[
                        following ? styles.unfollowText : styles.followText,
                        windowWidth > 768 && { fontSize: 16 }
                      ]}>
                        {following ? 'Following' : 'Follow'}
                      </Text>
                    </Pressable>
                    
                    <Pressable
                      style={[
                        styles.actionButton, 
                        styles.messageButton,
                        windowWidth > 768 && { width: 48, height: 48 }
                      ]}
                      onPress={() => {}}
                    >
                      <MessageCircle size={windowWidth > 768 ? 22 : 18} color="#1877F2" />
                    </Pressable>
                    
                    <Pressable
                      style={[
                        styles.actionButton, 
                        styles.shareButton,
                        windowWidth > 768 && { width: 48, height: 48 }
                      ]}
                      onPress={() => {}}
                    >
                      <Share2 size={windowWidth > 768 ? 22 : 18} color="#FFF" />
                    </Pressable>
                  </>
                )}
              </View>
            </View>
          </View>
        </Animated.View>
        
        {/* Content tabs */}
        <View style={styles.tabsContainer}>
          <View style={styles.tabsRow}>
            <Pressable
              style={[
                styles.tabButton,
                activeTab === 'posts' && styles.activeTabButton,
                windowWidth > 768 && { paddingVertical: 16 }
              ]}
              onPress={() => setActiveTab('posts')}
            >
              <LayoutGrid 
                size={windowWidth > 768 ? 22 : 18} 
                color={activeTab === 'posts' ? '#1877F2' : '#888'} 
              />
              <Text style={[
                styles.tabText,
                activeTab === 'posts' && styles.activeTabText,
                windowWidth > 768 && { fontSize: 16, marginLeft: 8 }
              ]}>
                Posts
              </Text>
            </Pressable>
            
            {/* Add Videos tab */}
            <Pressable
              style={[
                styles.tabButton,
                activeTab === 'videos' && styles.activeTabButton,
                windowWidth > 768 && { paddingVertical: 16 }
              ]}
              onPress={() => setActiveTab('videos')}
            >
              <Film 
                size={windowWidth > 768 ? 22 : 18} 
                color={activeTab === 'videos' ? '#1877F2' : '#888'} 
              />
              <Text style={[
                styles.tabText,
                activeTab === 'videos' && styles.activeTabText,
                windowWidth > 768 && { fontSize: 16, marginLeft: 8 }
              ]}>
                Videos
              </Text>
            </Pressable>
            
            <Pressable
              style={[
                styles.tabButton,
                activeTab === 'saved' && styles.activeTabButton,
                windowWidth > 768 && { paddingVertical: 16 }
              ]}
              onPress={() => setActiveTab('saved')}
            >
              <Bookmark 
                size={windowWidth > 768 ? 22 : 18} 
                color={activeTab === 'saved' ? '#1877F2' : '#888'} 
              />
              <Text style={[
                styles.tabText,
                activeTab === 'saved' && styles.activeTabText,
                windowWidth > 768 && { fontSize: 16, marginLeft: 8 }
              ]}>
                Saved
              </Text>
            </Pressable>
            
            <Pressable
              style={[
                styles.tabButton,
                activeTab === 'tagged' && styles.activeTabButton,
                windowWidth > 768 && { paddingVertical: 16 }
              ]}
              onPress={() => setActiveTab('tagged')}
            >
              <UserPlus 
                size={windowWidth > 768 ? 22 : 18} 
                color={activeTab === 'tagged' ? '#1877F2' : '#888'} 
              />
              <Text style={[
                styles.tabText,
                activeTab === 'tagged' && styles.activeTabText,
                windowWidth > 768 && { fontSize: 16, marginLeft: 8 }
              ]}>
                Tagged
              </Text>
            </Pressable>
          </View>
          
          {/* Tab indicator line */}
          <View style={styles.tabIndicatorContainer}>
            <Animated.View 
              style={[
                styles.tabIndicator,
                {
                  left: activeTab === 'posts' ? '0%' : 
                        activeTab === 'videos' ? '25%' :
                        activeTab === 'saved' ? '50%' : '75%',
                  height: windowWidth > 768 ? 4 : 3,
                  width: '25%',
                  opacity: activeTab === 'posts' ? 0 : 1 // Hide indicator for Posts tab
                }
              ]}
            />
          </View>
          
          {/* View type toggle - moved outside tab container and made smaller */}
          {activeTab === 'posts' && (
            <View style={{
              flexDirection: 'row',
              backgroundColor: 'rgba(0,0,0,0.7)',
              borderRadius: 6,
              padding: 2,
              marginHorizontal: 16,
              marginTop: 12,
              width: 140,
              alignSelf: 'center',
              zIndex: 10,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.1)',
            }}>
              <Pressable
                style={{
                  flex: 1,
                  paddingVertical: 6,
                  paddingHorizontal: 6,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: viewType === 'grid' ? 'rgba(24, 119, 242, 0.8)' : 'transparent',
                  borderRadius: 4
                }}
                onPress={() => setViewType('grid')}
              >
                <Grid 
                  size={16} 
                  color={viewType === 'grid' ? '#FFFFFF' : '#888'} 
                />
                <Text style={{
                  color: viewType === 'grid' ? '#FFFFFF' : '#888',
                  marginLeft: 4,
                  fontFamily: 'Inter_500Medium',
                  fontSize: 12
                }}>Grid</Text>
              </Pressable>
              
              <Pressable
                style={{
                  flex: 1,
                  paddingVertical: 6,
                  paddingHorizontal: 6,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: viewType === 'list' ? 'rgba(24, 119, 242, 0.8)' : 'transparent',
                  borderRadius: 4
                }}
                onPress={() => setViewType('list')}
              >
                <List 
                  size={16} 
                  color={viewType === 'list' ? '#FFFFFF' : '#888'} 
                />
                <Text style={{
                  color: viewType === 'list' ? '#FFFFFF' : '#888',
                  marginLeft: 4,
                  fontFamily: 'Inter_500Medium',
                  fontSize: 12
                }}>List</Text>
              </Pressable>
            </View>
          )}
        </View>
        
        {/* Posts loading indicator */}
        {postsLoading && activeTab === 'posts' && (
          <View style={styles.postsLoadingContainer}>
            <ActivityIndicator size={windowWidth > 768 ? "large" : "small"} color="#1877F2" />
            <Text style={[styles.postsLoadingText, windowWidth > 768 && { fontSize: 18 }]}>Loading posts...</Text>
          </View>
        )}
        
        {/* Videos loading indicator */}
        {videosLoading && activeTab === 'videos' && (
          <View style={styles.postsLoadingContainer}>
            <ActivityIndicator size={windowWidth > 768 ? "large" : "small"} color="#1877F2" />
            <Text style={[styles.postsLoadingText, windowWidth > 768 && { fontSize: 18 }]}>Loading videos...</Text>
          </View>
        )}
        
        {/* Content display */}
        {!postsLoading && (
          <View style={styles.contentDisplay}>
            {activeTab === 'posts' && userPosts.length > 0 ? (
              viewType === 'grid' ? (
                <FlatList
                  data={userPosts}
                  numColumns={fixedNumColumns}
                  key={columnKey}
                  renderItem={renderGridItem}
                  keyExtractor={item => item.id}
                  scrollEnabled={false}
                  contentContainerStyle={[
                    styles.gridContainer,
                    { paddingHorizontal: itemGap, paddingTop: 16, paddingBottom: 32 }
                  ]}
                  columnWrapperStyle={{ 
                    justifyContent: 'space-between', 
                    marginBottom: 20,
                    paddingHorizontal: itemGap / 2
                  }}
                />
              ) : (
                <FlatList
                  data={userPosts}
                  renderItem={renderListItem}
                  keyExtractor={item => item.id}
                  scrollEnabled={false}
                  contentContainerStyle={[
                    styles.listContainer,
                    { paddingHorizontal: contentPadding }
                  ]}
                />
              )
            ) : activeTab === 'videos' && !videosLoading ? (
              userVideos.length > 0 ? (
                <FlatList
                  data={userVideos}
                  numColumns={fixedNumColumns}
                  key={`videos-${columnKey}`}
                  renderItem={renderVideoGridItem}
                  keyExtractor={item => item.id}
                  scrollEnabled={false}
                  contentContainerStyle={[
                    styles.gridContainer,
                    { paddingHorizontal: itemGap, paddingTop: 16, paddingBottom: 32 }
                  ]}
                  columnWrapperStyle={{ 
                    justifyContent: 'space-between', 
                    marginBottom: 20,
                    paddingHorizontal: itemGap / 2
                  }}
                />
              ) : (
                <View style={[
                  styles.emptyStateContainer,
                  windowWidth > 768 && { padding: 40 }
                ]}>
                  <Film size={windowWidth > 768 ? 60 : 40} color="#333" />
                  <Text style={[styles.emptyStateTitle, windowWidth > 768 && { fontSize: 24 }]}>No Videos Yet</Text>
                  <Text style={[
                    styles.emptyStateText,
                    windowWidth > 768 && { fontSize: 18, marginBottom: 30 }
                  ]}>
                    {isMyProfile 
                      ? "You haven't uploaded any videos yet. Your videos will appear here."
                      : `${userData?.name} hasn't uploaded any videos yet.`}
                  </Text>
                  {isMyProfile ? (
                    <Pressable
                      style={[
                        styles.emptyStateButton,
                        windowWidth > 768 && { 
                          padding: 20,
                          borderRadius: 12
                        }
                      ]}
                      onPress={() => router.push('/video-upload' as any)}
                    >
                      <Text style={[styles.emptyStateButtonText, windowWidth > 768 && { fontSize: 18 }]}>Upload Video</Text>
                    </Pressable>
                  ) : null}
                </View>
              )
            ) : (
              // Empty state content maintained from before
              <View style={[
                styles.contentPlaceholder,
                { paddingHorizontal: contentPadding }
              ]}>
                {activeTab === 'posts' && !postsLoading && userPosts.length === 0 && (
                  <View style={[
                    styles.emptyStateContainer,
                    windowWidth > 768 && { padding: 40 }
                  ]}>
                    <Award size={windowWidth > 768 ? 60 : 40} color="#333" />
                    <Text style={[styles.emptyStateTitle, windowWidth > 768 && { fontSize: 24 }]}>No Posts Yet</Text>
                    <Text style={[
                      styles.emptyStateText,
                      windowWidth > 768 && { fontSize: 18, marginBottom: 30 }
                    ]}>
                      {isMyProfile 
                        ? "You haven't shared any posts yet. Your posts will appear here."
                        : `${userData?.name} hasn't shared any posts yet.`}
                    </Text>
                    {isMyProfile ? (
                      <Pressable
                        style={[
                          styles.emptyStateButton,
                          windowWidth > 768 && { 
                            padding: 20,
                            borderRadius: 12
                          }
                        ]}
                        onPress={() => router.push('/newsfeed-upload' as any)}
                      >
                        <Text style={[styles.emptyStateButtonText, windowWidth > 768 && { fontSize: 18 }]}>Create Post</Text>
                      </Pressable>
                    ) : null}
                  </View>
                )}
                
                {activeTab === 'saved' && (
                  <View style={[
                    styles.emptyStateContainer,
                    windowWidth > 768 && { padding: 40 }
                  ]}>
                    <Bookmark size={windowWidth > 768 ? 60 : 40} color="#333" />
                    <Text style={[styles.emptyStateTitle, windowWidth > 768 && { fontSize: 24 }]}>No Saved Posts</Text>
                    <Text style={[
                      styles.emptyStateText,
                      windowWidth > 768 && { fontSize: 18 }
                    ]}>
                      {isMyProfile 
                        ? "You haven't saved any posts yet. Tap the bookmark icon on posts to save them."
                        : "Saved posts are only visible to you"}
                    </Text>
                  </View>
                )}
                
                {activeTab === 'tagged' && (
                  <View style={[
                    styles.emptyStateContainer,
                    windowWidth > 768 && { padding: 40 }
                  ]}>
                    <UserPlus size={windowWidth > 768 ? 60 : 40} color="#333" />
                    <Text style={[styles.emptyStateTitle, windowWidth > 768 && { fontSize: 24 }]}>No Tagged Posts</Text>
                    <Text style={[
                      styles.emptyStateText,
                      windowWidth > 768 && { fontSize: 18 }
                    ]}>
                      {isMyProfile 
                        ? "You haven't been tagged in any posts yet."
                        : `${userData?.name} hasn't been tagged in any posts yet.`}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}
      </Animated.ScrollView>

      {/* Followers Modal */}
      <Modal
        visible={showFollowersModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFollowersModal(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={90} style={StyleSheet.absoluteFill} />
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Followers</Text>
              <Pressable
                style={styles.modalCloseButton}
                onPress={() => setShowFollowersModal(false)}
              >
                <X size={24} color="#FFF" />
              </Pressable>
            </View>

            {followersLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#1877F2" />
                <Text style={styles.loadingText}>Loading followers...</Text>
              </View>
            ) : followers.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No followers yet</Text>
              </View>
            ) : (
              <FlatList
                data={followers}
                keyExtractor={(item, index) => `follower-${item.id}-${index}`}
                renderItem={({ item }) => (
                  <Pressable
                    style={styles.followerItem}
                    onPress={() => handleFollowerPress(item.id)}
                  >
                    <Image source={{ uri: item.avatar }} style={styles.followerAvatar} />
                    <View style={styles.followerInfo}>
                      <View style={styles.followerNameRow}>
                        <Text style={styles.followerName}>{item.name}</Text>
                        {(item.isVerified || item.isBlueVerified) && (
                          <View style={styles.verifiedBadgeSmall}>
                            <TunnelVerifiedMark size={12} />
                          </View>
                        )}
                      </View>
                      <Text style={styles.followerUsername}>{item.username}</Text>
                    </View>
                    <View style={styles.followerActionContainer}>
                      <ChevronRight size={18} color="#888" />
                    </View>
                  </Pressable>
                )}
                contentContainerStyle={styles.followersList}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#FFF',
    marginTop: 12,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  // Tablet-specific styles
  tabletText: {
    fontSize: 14,
  },
  tabletHeaderText: {
    fontSize: 18,
  },
  tabletHeaderContent: {
    paddingTop: 60,
    paddingBottom: 16,
  },
  // Header styles
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: '#1877F2',
  },
  headerTextContainer: {
    flexDirection: 'column',
  },
  headerNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerName: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  headerUsername: {
    color: '#AAA',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  moreButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Scroll view
  scrollView: {
    flex: 1,
    zIndex: 1, 
    marginTop: 0, // Remove margin to allow content to reach top of screen
  },
  scrollContent: {
    paddingBottom: 30, // Increased bottom padding
  },
  // Cover and profile section
  coverContainer: {
    backgroundColor: '#111',
    position: 'relative',
    borderRadius: 0,
    overflow: 'hidden',
    marginTop: 0, // Ensure no margin at top
    top: 0,
    left: 0,
    right: 0,
  },
  coverGradient: {
    ...StyleSheet.absoluteFillObject,
    top: 0, // Ensure it starts from the very top
  },
  coverBackground: {
    ...StyleSheet.absoluteFillObject,
    top: 0,
    backgroundColor: '#000',
  },
  profileSection: {
    marginTop: 110,
    paddingHorizontal: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#1877F2',
  },
  userInfoContainer: {
    marginBottom: 20,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    color: 'white',
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    marginRight: 8,
  },
  userUsername: {
    color: '#999',
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    marginBottom: 8,
  },
  userBio: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginTop: 12,
    marginBottom: 16,
    lineHeight: 20,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  userMetaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  userMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  userMetaText: {
    color: '#999',
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginLeft: 4,
  },
  // Stats
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 12, 
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(24, 119, 242, 0.1)', // Enhanced background color
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(24, 119, 242, 0.3)', // Brighter border color
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2, // Add elevation for better visibility on Android
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.2)', // More visible divider
  },
  statValue: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  statLabel: {
    color: '#BBB', // Lighter color for better visibility
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 4,
  },
  // Action buttons
  actionButtons: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  actionButton: {
    height: 40,
    borderRadius: 8, // Reduced from 20 to 8 for less roundness
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginRight: 8,
  },
  followButton: {
    backgroundColor: '#1877F2',
    flex: 1,
  },
  unfollowButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#666',
    flex: 1,
  },
  messageButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    width: 40,
    paddingHorizontal: 0,
  },
  shareButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    width: 40,
    paddingHorizontal: 0,
  },
  editProfileButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#666',
    flex: 1,
  },
  followText: {
    color: 'white',
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  unfollowText: {
    color: '#999',
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  editProfileText: {
    color: '#999',
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  // Content display
  contentDisplay: {
    flex: 1,
  },
  // Grid view
  gridContainer: {
    paddingHorizontal: 1,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 4,
  },
  gridItem: {
    margin: 1,
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 6, // Add rounded corners
  },
  gridItemImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  gridItemTextOnly: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(24, 119, 242, 0.1)',
    padding: 8,
    borderRadius: 6, // Add rounded corners
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 4,
    padding: 2,
  },
  
  // List view
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 8, // Added padding to separate from tabs
    paddingBottom: 16,
  },
  listItem: {
    backgroundColor: '#111',
    borderRadius: 12,
    marginBottom: 16, // Increased margin between list items
    overflow: 'hidden',
    padding: 16, // Increased padding inside list items
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  listItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  listItemAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  listItemUserInfo: {
    flex: 1,
  },
  listItemUserNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listItemUserName: {
    color: 'white',
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  listItemSubheaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  listItemUsername: {
    color: '#888',
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  listItemTimeAgo: {
    color: '#666',
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  listItemContent: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
    marginBottom: 12,
  },
  listItemImagesContainer: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#0A0A0A', // Added background color for image containers
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
    marginBottom: 12,
  },
  listItemLocationText: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginLeft: 4,
  },
  listItemActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  listItemActionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listItemAction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  listItemActionText: {
    color: '#888',
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginLeft: 4,
  },
  // Posts loading indicator
  postsLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  postsLoadingText: {
    color: '#999',
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    marginTop: 12,
  },
  // Empty state styles
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 40, // Add margin to separate from tabs
  },
  emptyStateTitle: {
    color: '#FFF',
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    marginBottom: 12,
  },
  emptyStateText: {
    color: '#999',
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyStateButton: {
    backgroundColor: '#1877F2',
    padding: 16,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  contentPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // User information section
  userInfoSection: {
    marginBottom: 20,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(24, 119, 242, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(24, 119, 242, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginTop: 20
  },
  userInfoHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  editInfoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(24, 119, 242, 0.1)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(24, 119, 242, 0.2)',
  },
  editInfoButtonText: {
    color: '#1877F2',
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    marginLeft: 4,
  },
  infoItemsContainer: {
    marginTop: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  infoItemText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    marginLeft: 12,
    flex: 1,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 12,
  },
  interestsSection: {
    marginBottom: 24,
    paddingHorizontal: 16,
    marginTop: 12,
    backgroundColor: 'rgba(24, 119, 242, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(24, 119, 242, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  tagItem: {
    backgroundColor: 'rgba(24, 119, 242, 0.1)',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(24, 119, 242, 0.2)',
  },
  tagText: {
    color: '#1877F2',
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  // Tabs
  tabsContainer: {
    backgroundColor: '#111',
    position: 'relative',
    marginBottom: 1,
    marginTop: 15,
    zIndex: 5,
    paddingBottom: 8, // Add padding to prevent indicator from reaching bottom
  },
  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  activeTabButton: {
    // Only add bottom color if not Posts tab
    borderBottomColor: '#1877F2',
    borderBottomWidth: 0, // Remove default border
  },
  tabText: {
    color: '#888',
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    marginLeft: 6,
  },
  activeTabText: {
    color: '#1877F2',
  },
  activeTabTextPosts: {
    color: '#1877F2',
  },
  tabIndicatorContainer: {
    position: 'absolute',
    bottom: 8, // Adjust to match the padding of tabsContainer
    left: 0,
    right: 0,
    height: 4,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    width: '25%', // Change from 33.33% to 25% for 4 tabs
    height: 3,
    backgroundColor: '#1877F2',
  },
  viewToggleContainer: {
    position: 'absolute',
    top: 6,
    right: 16,
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    overflow: 'hidden',
    zIndex: 10,
  },
  viewToggleButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  activeViewToggle: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  socialStatsSection: {
    marginTop: -20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(24, 119, 242, 0.2)',
    backgroundColor: 'rgba(24, 119, 242, 0.05)',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  socialStatsTitle: {
    color: '#1877F2',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 16,
    textAlign: 'center',
  },
  socialStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  socialStatItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  socialStatIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  socialStatTextContainer: {
    flex: 1,
  },
  socialStatValue: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
  socialStatLabel: {
    color: '#999',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  userNameDetailsSection: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(24, 119, 242, 0.2)',
    paddingTop: 16,
  },
  userNameDetailsSectionTitle: {
    color: '#1877F2',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 12,
  },
  nameDetailsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  nameDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  nameDetailsLabel: {
    color: '#888',
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    width: 80,
  },
  nameDetailsValue: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    flex: 1,
  },
  bioDetailsRow: {
    marginTop: 6,
  },
  bioDetailsValue: {
    color: 'white',
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    marginTop: 4,
    lineHeight: 20,
  },
  smallVerifiedBadge: {
    marginLeft: 6,
  },
  verifiedBadge: {
    width: 20,
    height: 20,
    borderRadius: 0,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  blueVerifiedBadge: {
    backgroundColor: 'transparent',
    color: '#1877F2',
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
  verificationBadges: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nameBadgeContainer: {
    backgroundColor: 'transparent',
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Follower modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    backgroundColor: '#111',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
  },
  modalCloseButton: {
    padding: 8,
  },
  followersList: {
    paddingHorizontal: 16,
  },
  followerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  followerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#333',
  },
  followerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  followerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  followerName: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  followerUsername: {
    color: '#888',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  followerActionContainer: {
    paddingRight: 8,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  verifiedBadgeSmall: {
    marginLeft: 6,
  },
  videoContainer: {
    flex: 1,
    aspectRatio: 0.9,
  
  },
  thumbnailContainer: {
    position: 'relative',
    height: '70%',
    backgroundColor: '#222',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(24, 119, 242, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoInfo: {
    padding: 8,
    height: '30%',
  },
  videoTitle: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    marginBottom: 2,
  },
  videoTime: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  socialStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%'
  },
  socialStatText: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
}); 