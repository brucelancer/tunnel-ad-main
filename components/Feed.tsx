import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Image, 
  Pressable, 
  Dimensions, 
  ActivityIndicator,
  Animated,
  Share,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  useWindowDimensions,
  Modal,
  TouchableWithoutFeedback,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
  TouchableOpacity,
  DeviceEventEmitter,
  Alert,
  Keyboard
} from 'react-native';
import { usePointsStore } from '@/store/usePointsStore';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Heart, 
  Bookmark, 
  MessageCircle, 
  Share2, 
  Award, 
  Image as ImageIcon, 
  Send,
  MoreVertical,
  Camera,
  ThumbsUp,
  MapPin,
  UserCircle,
  Check,
  BadgeCheck,
  X,
  Clock,
  AlertTriangle,
  Play // Add Play icon for videos
} from 'lucide-react-native';
import { usePostFeed } from '@/app/hooks/usePostFeed';
import { PinchGestureHandler, State, GestureHandlerRootView } from 'react-native-gesture-handler';
import { urlFor, getSanityClient } from '@/tunnel-ad-main/services/postService';
import Svg, { Path } from 'react-native-svg';
import * as sanityAuthService from '@/tunnel-ad-main/services/sanityAuthService';
import FloatingActionButton from './FloatingActionButton';
import { eventEmitter } from '../app/utils/eventEmitter';
// Import videoService to fetch videos
import videoService from '@/tunnel-ad-main/services/videoService.js';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Add VideoItem interface to match VideoFeed component
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

// Extend the user type to include isBlueVerified
interface UserData {
  id: string;
  name: string;
  username: string;
  avatar: string;
  isVerified: boolean;
  isBlueVerified?: boolean; // Optional property for blue verification mark
  bio?: string;
  joinDate?: string;
  location?: string;
}

// Extend the post data interface to use the updated user type
interface PostData {
  id: string;
  user: UserData;
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

// Mock data for the social feed
const FEED_POSTS: PostData[] = [
  {
    id: '1',
    user: {
      id: 'user1',
      name: 'Sarah Johnson',
      username: '@dancepro',
      avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
      isVerified: true
    },
    content: "Just learned these amazing new dance moves at today's workshop! Can't wait to practice more and share with everyone.",
    images: ['https://images.unsplash.com/photo-1519682337058-a94d519337bc'],
    location: 'Dance Studio 55, New York',
    timeAgo: '15 minutes ago',
    likes: 243,
    comments: 42,
    points: 28,
    hasLiked: false,
    hasSaved: false
  },
  {
    id: '2',
    user: {
      id: 'user2',
      name: 'Mike Chen',
      username: '@musicinsider',
      avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
      isVerified: false
    },
    content: "The latest music tech I'm exploring is mind-blowing! Virtual instruments that respond to your emotions? The future is here!",
    images: [
      'https://images.unsplash.com/photo-1518609878373-06d740f60d8b',
      'https://images.unsplash.com/photo-1511379938547-c1f69419868d'
    ],
    location: 'Tech Music Conference',
    timeAgo: '2 hours ago',
    likes: 189,
    comments: 23,
    points: 15,
    hasLiked: false,
    hasSaved: false
  },
  {
    id: '3',
    user: {
      id: 'user3',
      name: 'Min Thu',
      username: '@myanmarculture',
      avatar: 'https://randomuser.me/api/portraits/women/68.jpg',
      isVerified: true
    },
    content: "Visited Shwedagon Pagoda today at sunset. The golden stupa shimmers with divine beauty as the sun sets. A sacred place that embodies Myanmar's spiritual heritage. ✨🙏",
    images: [
      'https://res.cloudinary.com/rainforest-cruises/images/c_fill,g_auto/f_auto,q_auto/w_1120,h_650/v1623088422/Shwedagon-Pagoda-Guide-Sunset/Shwedagon-Pagoda-Guide-Sunset.jpg'
    ],
    location: 'Shwedagon Pagoda, Yangon',
    timeAgo: '1 day ago',
    likes: 319,
    comments: 47,
    points: 35,
    hasLiked: false,
    hasSaved: false
  },
  {
    id: '4',
    user: {
      id: 'user4',
      name: 'Alex Rivera',
      username: '@streetlife',
      avatar: 'https://randomuser.me/api/portraits/men/75.jpg',
      isVerified: false
    },
    content: "No photos today, just a thought: Music isn't just what you hear, it's what you feel. The rhythm of the city, the beat of footsteps, the melody of conversations - it's all music if you listen closely.",
    images: [],
    location: '',
    timeAgo: '3 hours ago',
    likes: 98,
    comments: 12,
    points: 8,
    hasLiked: false,
    hasSaved: false
  }
];

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

// User Profile Popup component
interface UserProfilePopupProps {
  visible: boolean;
  onClose: () => void;
  userData: UserData | null;
}

// Extended user data interface for detailed profile
interface DetailedUserData extends UserData {
  posts?: number;
  followers?: number;
  following?: number;
  badges?: { id: string; name: string; icon: string }[];
  joinDate?: string;
  memberSince?: string;
  points?: number;
  bio?: string;
  interests?: string[];
  likesCount?: number;
}

const UserProfilePopup = ({ visible, onClose, userData }: UserProfilePopupProps) => {
  const [loading, setLoading] = useState(false);
  const [following, setFollowing] = useState(false);
  const [detailedUser, setDetailedUser] = useState<DetailedUserData | null>(null);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const router = useRouter();
  const { user: currentUser } = usePostFeed();

  // Animation values
  const slideAnim = useRef(new Animated.Value(windowHeight)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // Fetch detailed user data
  const fetchUserDetails = useCallback(async (userId: string) => {
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
          "likesCount": count(*[_type == "like" && user._ref == $userId])
        }
      `, { userId });
      
      if (!userDetail) {
        console.warn(`No user found with ID: ${userId}`);
        return;
      }
      
      console.log('Fetched user details:', JSON.stringify(userDetail, null, 2));
      
      // Format the user data
      const formattedUser: DetailedUserData = {
        id: userDetail._id || userId,
        name: userDetail.firstName && userDetail.lastName 
          ? `${userDetail.firstName} ${userDetail.lastName}`.trim() 
          : userDetail.username || 'User',
        username: userDetail.username ? `@${userDetail.username}` : '@user',
        avatar: userDetail.avatar ? urlFor(userDetail.avatar).url() : 'https://randomuser.me/api/portraits/lego/1.jpg',
        isVerified: userDetail.isVerified || false,
        isBlueVerified: userDetail.isBlueVerified || false,
        bio: userDetail.bio || "No bio provided",
        interests: userDetail.interests || [],
        location: userDetail.location || 'Unknown location',
        posts: userDetail.postsCount || 0,
        likesCount: userDetail.likesCount || 0,
        followers: Math.floor(Math.random() * 100) + 20, // Placeholder
        following: Math.floor(Math.random() * 50) + 10, // Placeholder
        memberSince: userDetail.createdAt 
          ? formatDate(userDetail.createdAt) 
          : 'June 2022',
        points: userDetail.points || 0,
        badges: generateBadges(userDetail)
      };
      
      console.log('Formatted user data:', JSON.stringify(formattedUser, null, 2));
      setDetailedUser(formattedUser);
    } catch (error) {
      console.error('Error fetching user details:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Format date for member since display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } catch {
      return 'Unknown date';
    }
  };

  // Generate badges based on user activity
  const generateBadges = (user: any) => {
    const badges = [];
    
    // Early adopter badge
    if (user.createdAt && new Date(user.createdAt) < new Date('2023-01-01')) {
      badges.push({ id: 'early', name: 'Early Adopter', icon: '🚀' });
    }
    
    // Content creator badge
    if (user.postsCount && user.postsCount > 10) {
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

  useEffect(() => {
    if (visible && userData) {
      // Fetch detailed user data when popup becomes visible
      fetchUserDetails(userData.id);
      
      // Start animations when modal becomes visible
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 12,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset animations when modal is hidden
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: windowHeight,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, userData, windowHeight]);

  // Handle view full profile
  const handleViewFullProfile = useCallback(() => {
    if (userData) {
      onClose();
      // Navigate to full profile
      router.push({
        pathname: "/user-profile" as any,
        params: { id: userData.id }
      });
    }
  }, [userData, router]);

  // Handle follow/unfollow
  const handleFollowToggle = useCallback(() => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setFollowing(!following);
      setLoading(false);
    }, 800);
  }, [following]);

  // Pan responder for swipe to dismiss
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          // Only allow downward swiping
          slideAnim.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100 || gestureState.vy > 1) {
          // If swiped down far enough or with enough velocity, close the modal
          onClose();
        } else {
          // Otherwise snap back to open position
          Animated.spring(slideAnim, {
            toValue: 0,
            tension: 50,
            friction: 12,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  // Use detailed user data if available, otherwise fall back to basic data
  const displayUser = detailedUser || userData;
  
  if (!displayUser) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.popupModalContainer}>
        {/* Backdrop - touchable to dismiss */}
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View 
            style={[
              styles.popupBackdrop,
              { opacity: backdropOpacity }
            ]} 
          />
        </TouchableWithoutFeedback>
        
        {/* Profile Card */}
        <Animated.View 
          style={[
            styles.profilePopupCard,
            { 
              transform: [{ translateY: slideAnim }],
              maxWidth: windowWidth > 500 ? 500 : '100%',
              width: windowWidth > 500 ? 500 : windowWidth,
            }
          ]}
          {...panResponder.panHandlers}
        >
          {/* Handle for pull-down interaction */}
          <View style={styles.popupHandle} />
          
          {/* Header with close button */}
          <View style={styles.popupHeader}>
            <Text style={styles.popupTitle}>Profile</Text>
            <TouchableOpacity 
              style={styles.popupCloseButton}
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={22} color="#888" />
            </TouchableOpacity>
          </View>
          
          {loading && (
            <View style={styles.popupLoading}>
              <ActivityIndicator size="large" color="#0070F3" />
            </View>
          )}
          
          {!loading && (
            <ScrollView 
              style={styles.popupScrollView}
              contentContainerStyle={styles.popupContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Profile header with image, name, verification */}
              <View style={styles.popupProfileHeader}>
                <Image 
                  source={{ uri: displayUser.avatar }} 
                  style={styles.popupProfileImage}
                />
                <View style={styles.popupProfileInfo}>
                  <View style={styles.popupNameContainer}>
                    <Text style={styles.popupProfileName}>{displayUser.name}</Text>
                    {(displayUser.isVerified || displayUser.isBlueVerified) && (
                      <View style={[
                        styles.popupVerifiedBadge, 
                        displayUser.isBlueVerified && styles.popupBlueVerifiedBadge
                      ]}>
                        <TunnelVerifiedMark size={20} />
                      </View>
                    )}
                  </View>
                  <Text style={styles.popupProfileUsername}>{displayUser.username}</Text>
                </View>
              </View>
              
              {/* Stats section */}
              <View style={styles.popupStatsSection}>
                <View style={styles.statItem}>
                  <Heart size={16} color="#FF3B30" />
                  <Text style={styles.statValue}>{detailedUser?.likesCount || '0'}</Text>
                  <Text style={styles.statLabel}>Likes</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <MessageCircle size={16} color="#0070F3" />
                  <Text style={styles.statValue}>{detailedUser?.posts || '0'}</Text>
                  <Text style={styles.statLabel}>Posts</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Award size={16} color="#FFD700" />
                  <Text style={styles.statValue}>{detailedUser?.points || '0'}</Text>
                  <Text style={styles.statLabel}>Points</Text>
                </View>
              </View>
              
              {/* Bio section */}
              <View style={styles.popupBioSection}>
                <Text style={styles.popupBioText}>
                  {detailedUser?.bio || displayUser.bio || "This user hasn't added a bio yet."}
                </Text>
              </View>
              
              {/* Interests section if available */}
              {detailedUser?.interests && detailedUser.interests.length > 0 && (
                <View style={styles.popupInterestsContainer}>
                  {detailedUser.interests.map((interest, index) => (
                    <View key={index} style={styles.popupInterestTag}>
                      <Text style={styles.popupInterestText}>{interest}</Text>
                    </View>
                  ))}
                </View>
              )}
              
              {/* User details */}
              {displayUser.location && (
                <View style={styles.popupInfoItem}>
                  <MapPin size={16} color="#0070F3" />
                  <Text style={styles.popupInfoText}>{displayUser.location}</Text>
                </View>
              )}
              
              {/* Member since */}
              <View style={styles.popupInfoItem}>
                <Clock size={16} color="#0070F3" />
                <Text style={styles.popupInfoText}>
                  Member since {detailedUser?.memberSince || displayUser.joinDate || "June 2022"}
                </Text>
              </View>
              
              {/* Badges - using real data if available */}
              <View style={styles.popupBadgesSection}>
                <Text style={styles.popupSectionTitle}>Badges</Text>
                <ScrollView 
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.popupBadgesList}
                >
                  {detailedUser?.badges ? (
                    detailedUser.badges.map((badge, index) => (
                      <View key={index} style={styles.popupBadge}>
                        <Text style={styles.popupBadgeIcon}>{badge.icon}</Text>
                        <Text style={styles.popupBadgeName}>{badge.name}</Text>
                      </View>
                    ))
                  ) : (
                    <>
                      <View style={styles.popupBadge}>
                        <Text style={styles.popupBadgeIcon}>🌟</Text>
                        <Text style={styles.popupBadgeName}>Top Creator</Text>
                      </View>
                      <View style={styles.popupBadge}>
                        <Text style={styles.popupBadgeIcon}>💯</Text>
                        <Text style={styles.popupBadgeName}>100 Posts</Text>
                      </View>
                      <View style={styles.popupBadge}>
                        <Text style={styles.popupBadgeIcon}>🏆</Text>
                        <Text style={styles.popupBadgeName}>Trendsetter</Text>
                      </View>
                    </>
                  )}
                </ScrollView>
              </View>
            </ScrollView>
          )}
          
          {/* Action buttons */}
          <View style={styles.popupActionsContainer}>
            <TouchableOpacity
              style={[
                styles.popupActionButton, 
                following ? styles.unfollowButton : styles.followButton
              ]}
              onPress={handleFollowToggle}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={following ? styles.unfollowButtonText : styles.followButtonText}>
                  {following ? 'Following' : 'Follow'}
                </Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.popupActionButton, styles.messageButton]}
              onPress={() => {
                onClose();
                if (displayUser) {
                  // Emit an event to update unread count in the FloatingChatButton
                  eventEmitter.emit('messages-seen');
                  
                  router.push({
                    pathname: "/chat" as any,
                    params: { id: displayUser.id }
                  });
                }
              }}
            >
              <Text style={styles.messageButtonText}>Message</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.popupActionButton, styles.viewProfileButton]}
              onPress={handleViewFullProfile}
            >
              <Text style={styles.viewProfileButtonText}>View Full Profile</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

// Add interfaces for component props
interface PostActionsMenuProps {
  visible: boolean;
  onClose: () => void;
  onReport: () => void;
  onDelete: () => void;
  canDelete: boolean;
  isOwnPost: boolean; // Add this new prop
}

// Add a menu modal component for post actions
const PostActionsMenu: React.FC<PostActionsMenuProps> = ({ visible, onClose, onReport, onDelete, canDelete, isOwnPost }) => {
  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.menuModalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.menuModalContent}>
              {/* Only show the Report Post option if it's not the user's own post */}
              {!isOwnPost && (
                <Pressable 
                  style={styles.menuItem}
                  onPress={onReport}
                >
                  <Text style={styles.menuItemText}>Report Post</Text>
                </Pressable>
              )}
              
              {canDelete && (
                <Pressable 
                  style={[styles.menuItem, styles.deleteMenuItem]}
                  onPress={onDelete}
                >
                  <Text style={styles.deleteMenuItemText}>Delete Post</Text>
                </Pressable>
              )}
              
              <Pressable 
                style={[styles.menuItem, styles.cancelMenuItem]}
                onPress={onClose}
              >
                <Text style={styles.menuItemText}>Cancel</Text>
              </Pressable>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// Type the expected user object from useSanityAuth
interface SanityUser {
  _id: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  points?: number;
  profile?: {
    avatar?: any;
    bio?: string;
    interests?: string[];
  };
  isVerified?: boolean;
  isBlueVerified?: boolean;
}

// Before the submitReport function, add this interface:
interface ReportDocument {
  _type: string;
  post: { 
    _type: string; 
    _ref: string;
  };
  reason: string;
  status: string;
  createdAt: string;
  reportedBy?: { 
    _type: string; 
    _ref: string;
  };
}

// After the UserData interface, add a combined FeedItem type definition
interface FeedItem extends PostData {
  type?: 'post' | 'video';
  videoData?: VideoItem;
}

export default function Feed() {
  const [posts, setPosts] = useState<typeof FEED_POSTS>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [imageIndexes, setImageIndexes] = useState<{[key: string]: number}>({});
  const [likedPosts, setLikedPosts] = useState<{[key: string]: boolean}>({});
  const [savedPosts, setSavedPosts] = useState<{[key: string]: boolean}>({});
  const [awardedPosts, setAwardedPosts] = useState<{[key: string]: number}>({});
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scale, setScale] = useState(new Animated.Value(1));
  const [currentScale, setCurrentScale] = useState(1);
  const [postInput, setPostInput] = useState('');
  const [postImages, setPostImages] = useState<string[]>([]);
  const [postLocation, setPostLocation] = useState('');
  const [createPostVisible, setCreatePostVisible] = useState(false);
  
  // Add state for videos
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  
  // State for menu actions
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string>('');
  
  // Use the post feed hook for Sanity data
  const { 
    posts: sanityPosts, 
    loading, 
    refreshing: hookRefreshing,
    handleRefresh: handleSanityRefresh,
    handleLike: handleSanityLike,
    handleSave: handleSanitySave,
    handleAwardPoints: handleSanityAwardPoints,
    createPost,
    user
  } = usePostFeed();

  const { addPoints } = usePointsStore();
  const router = useRouter();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const scrollY = useRef(new Animated.Value(0)).current;
  
  // Image viewer modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentPostImages, setCurrentPostImages] = useState<string[]>([]);

  // Animation values for zooming and panning
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  
  // Create a base scale value for the initial scale
  const baseScale = useRef(new Animated.Value(1)).current;
  // Create a pinch scale value for the current pinch gesture
  const pinchScale = useRef(new Animated.Value(1)).current;
  // Combined scale for the image
  const combinedScale = Animated.multiply(baseScale, pinchScale);

  // Handle pinch gesture end - incorporate pinch scale into base scale
  const onPinchEnd = () => {
    // Get current values
    let currentPinchScale = 1;
    let currentBaseScale = 1;
    
    // Extract current values using listeners
    const pinchListener = pinchScale.addListener(({ value }) => {
      currentPinchScale = value;
    });
    const baseListener = baseScale.addListener(({ value }) => {
      currentBaseScale = value;
    });
    
    // Remove listeners
    pinchScale.removeListener(pinchListener);
    baseScale.removeListener(baseListener);
    
    // Update base scale with the combined scale
    baseScale.setValue(currentBaseScale * currentPinchScale);
    // Reset pinch scale
    pinchScale.setValue(1);
  };

  // Add horizontal swipe gesture handling for image navigation
  const imageSwipeX = useRef(new Animated.Value(0)).current;
  const swipeDistance = useRef(0);
  const currentScaleValue = useRef(1);

  // Add listener to track scale
  useEffect(() => {
    const scaleListener = combinedScale.addListener(({value}) => {
      currentScaleValue.current = value;
    });
    
    return () => {
      combinedScale.removeListener(scaleListener);
    };
  }, []);
  
  // Image viewer swipe pan responder
  const imageSwipePanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => {
        // Only handle horizontal swipes when not zoomed in
        return Math.abs(gesture.dx) > Math.abs(gesture.dy) && 
               currentScaleValue.current <= 1.1;
      },
      onPanResponderGrant: () => {
        // Store the current swipe position
        swipeDistance.current = 0;
      },
      onPanResponderMove: (_, gesture) => {
        // Only allow horizontal swiping if not zoomed in
        if (currentScaleValue.current <= 1.1) {
          swipeDistance.current = gesture.dx;
          imageSwipeX.setValue(gesture.dx);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        // Determine if the swipe was significant enough to change images
        const { dx, vx } = gesture;
        
        if (currentScaleValue.current <= 1.1 && 
            (Math.abs(dx) > SCREEN_WIDTH / 3 || Math.abs(vx) > 0.5)) {
          // Significant swipe - change image
          if (dx > 0 && currentImageIndex > 0) {
            // Swipe right - show previous image
            setCurrentImageIndex(prevIndex => prevIndex - 1);
          } else if (dx < 0 && currentImageIndex < currentPostImages.length - 1) {
            // Swipe left - show next image
            setCurrentImageIndex(prevIndex => prevIndex + 1);
          } else {
            // Reset position with animation
            Animated.spring(imageSwipeX, {
              toValue: 0,
              friction: 5,
              tension: 40,
              useNativeDriver: true
            }).start();
          }
        } else {
          // Reset position with animation
          Animated.spring(imageSwipeX, {
            toValue: 0,
            friction: 5,
            tension: 40,
            useNativeDriver: true
          }).start();
        }
      }
    })
  ).current;

  // Create a pan responder for the viewer with panning and double-tap
  const viewerPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        // Store initial pan values
        let xOffset = 0;
        let yOffset = 0;
        
        translateX.addListener(({ value }) => {
          xOffset = value;
        });
        translateY.addListener(({ value }) => {
          yOffset = value;
        });
        
        translateX.setOffset(xOffset);
        translateY.setOffset(yOffset);
        translateX.setValue(0);
        translateY.setValue(0);
      },
      onPanResponderMove: (_, gesture) => {
        // Only allow panning if zoomed in
        if (currentScaleValue.current > 1.1) {
          // Update pan position
          translateX.setValue(gesture.dx);
          translateY.setValue(gesture.dy);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        // Apply offset to value
        translateX.flattenOffset();
        translateY.flattenOffset();
        
        // Detect swipe to dismiss
        if (Math.abs(gesture.dy) > 100 && Math.abs(gesture.vy) > 0.5 && currentScaleValue.current <= 1.1) {
          setModalVisible(false);
        }
      },
      onPanResponderTerminate: () => {
        // Reset on termination
        translateX.flattenOffset();
        translateY.flattenOffset();
      },
    })
  ).current;

  // Reset zoom and pan values when modal is closed or when image changes
  useEffect(() => {
    if (!modalVisible) {
      // Reset to initial state when modal is closed
      baseScale.setValue(1);
      pinchScale.setValue(1);
      translateX.setValue(0);
      translateY.setValue(0);
      imageSwipeX.setValue(0);
    }
  }, [modalVisible, currentImageIndex]);

  // Handler for pinch gesture (zooming)
  const onPinchGestureEvent = Animated.event(
    [{ nativeEvent: { scale: pinchScale } }],
    { useNativeDriver: true }
  );

  // Handler for double tap (reset zoom)
  const lastTap = useRef(0);
  const handleImagePress = (imageUri: string, allImages: string[], initialIndex: number) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    
    if (modalVisible) {
      // In the modal, handle double tap to reset zoom
      if (now - lastTap.current < DOUBLE_TAP_DELAY) {
        // Double tap detected
        baseScale.setValue(1);
        pinchScale.setValue(1);
        translateX.setValue(0);
        translateY.setValue(0);
      }
      lastTap.current = now;
    } else {
      // Opening the modal with the selected image
      setCurrentPostImages(allImages);
      setCurrentImageIndex(initialIndex);
      setSelectedImage(allImages[initialIndex]);
      setModalVisible(true);
    }
  };

  // Function to handle image swiping by updating the current index
  const handleSwipe = (direction: 'left' | 'right') => {
    if (direction === 'left' && currentImageIndex < currentPostImages.length - 1) {
      // Next image
      setSelectedImage(currentPostImages[currentImageIndex + 1]);
      setCurrentImageIndex(prevIndex => {
        const newIndex = prevIndex + 1;
        
        // Reset position immediately after changing image
        imageSwipeX.setValue(-SCREEN_WIDTH * 0.5);
        
        // Animate back to center
        Animated.spring(imageSwipeX, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true
        }).start();
        
        return newIndex;
      });
    } else if (direction === 'right' && currentImageIndex > 0) {
      // Previous image
      setSelectedImage(currentPostImages[currentImageIndex - 1]);
      setCurrentImageIndex(prevIndex => {
        const newIndex = prevIndex - 1;
        
        // Reset position immediately after changing image
        imageSwipeX.setValue(SCREEN_WIDTH * 0.5);
        
        // Animate back to center
        Animated.spring(imageSwipeX, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true
        }).start();
        
        return newIndex;
      });
    }
  };

  // Fetch videos from Sanity
  const fetchVideos = useCallback(async () => {
    try {
      setLoadingVideos(true);
      const fetchedVideos = await videoService.fetchVideos(5); // Fetch just 5 videos for feed
      setVideos(fetchedVideos);
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setLoadingVideos(false);
    }
  }, []);

  // Initial load of posts and videos
  useEffect(() => {
    if (sanityPosts && sanityPosts.length > 0) {
      setPosts(sanityPosts);
    }
    
    // Fetch videos when component mounts
    fetchVideos();
  }, [sanityPosts, fetchVideos]);

  // Calculate responsive dimensions
  const isTablet = windowWidth > 768;
  const isLargePhone = windowWidth > 428;
  const cardWidth = isTablet ? Math.min((windowWidth * 0.5) - 40, 500) : windowWidth - 32;
  const imageHeight = calculateImageHeight(windowWidth, windowHeight, isTablet);

  function calculateImageHeight(width: number, height: number, isTablet: boolean) {
    // For tablets in landscape, use shorter height to avoid images being too tall
    if (isTablet && width > height) {
      return height * 0.4;
    }
    // For tall phones, limit the image height
    if (width < 500 && height > 700) {
      return width * 0.6;
    }
    // Default ratio
    return width * 0.55;
  }

  // Handle refresh - also refresh videos
  const handleRefresh = () => {
    if (user) {
      // Use Sanity refresh if user is authenticated
      handleSanityRefresh();
    } else {
      // Use local refresh for demo
      setRefreshing(true);
      setTimeout(() => {
        // Simulate fetching new content
        const newPost = {
          id: `refresh-${Date.now()}`,
          user: {
            id: 'user5',
            name: 'Taylor Swift',
            username: '@taylorswift',
            avatar: 'https://randomuser.me/api/portraits/women/90.jpg',
            isVerified: true
          },
          content: "Just dropped a new song! Check it out on my profile. #NewMusic #SwiftiesForever",
          images: ['https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae'],
          location: 'Recording Studio',
          timeAgo: 'Just now',
          likes: 0,
          comments: 0,
          points: 0,
          hasLiked: false,
          hasSaved: false
        };
        
        setPosts([newPost, ...posts]);
        setRefreshing(false);
      }, 1500);
    }
    
    // Also refresh videos
    fetchVideos();
  };

  // Navigate to video feed with the selected video
  const navigateToVideoFeed = (video: VideoItem) => {
    // Navigate to the correct video screen path based on the app structure
    router.push({
      pathname: "/video-detail" as any,
      params: { 
        id: video.id,
        autoPlay: 'true'
      }
    });
  };

  // Handle post interactions using Sanity (if user is authenticated) or local state
  const handlePostPress = (post: any) => {
    // Navigate to post detail
    router.push({
      pathname: "/feedpost-detail" as any,
      params: { id: post.id }
    });
  };

  const handleLike = (id: string) => {
    if (user) {
      // Use Sanity like functionality if user is authenticated
      handleSanityLike(id);
    } else {
      // Use local state for demo purposes
      setLikedPosts(prev => {
        const newState = {
          ...prev,
          [id]: !prev[id]
        };
        
        // Update post likes count
        setPosts(currentPosts => 
          currentPosts.map(post => {
            if (post.id === id) {
              return {
                ...post,
                likes: newState[id] ? post.likes + 1 : post.likes - 1,
                hasLiked: newState[id]
              };
            }
            return post;
          })
        );
        
        // Award points for engagement
        if (!prev[id]) {
          addPoints(1);
        }
        
        return newState;
      });
    }
  };

  const handleSave = (id: string) => {
    if (user) {
      // Use Sanity save functionality if user is authenticated
      handleSanitySave(id);
    } else {
      // Use local state for demo purposes
      setSavedPosts(prev => {
        const newState = {
          ...prev,
          [id]: !prev[id]
        };
        
        // Update post saved state
        setPosts(currentPosts => 
          currentPosts.map(post => {
            if (post.id === id) {
              return {
                ...post,
                hasSaved: newState[id]
              };
            }
            return post;
          })
        );
        
        return newState;
      });
    }
  };

  const handleAwardPoints = (id: string, points: number) => {
    if (user) {
      // Use Sanity points functionality if user is authenticated
      handleSanityAwardPoints(id, points);
    } else {
      // Use local state for demo purposes
      setPosts(currentPosts => 
        currentPosts.map(post => {
          if (post.id === id) {
            return {
              ...post,
              points: post.points + points
            };
          }
          return post;
        })
      );
      
      // Subtract points from user
      addPoints(-points);
    }
  };

  // Handle post creation - using Sanity if authenticated
  const handlePostSubmit = async () => {
    if (!postInput.trim()) return;
    
    if (user) {
      // Use Sanity create post functionality
      await createPost(postInput);
      setPostInput('');
    } else {
      // Add new post to the local feed for demo purposes
      const newPost = {
        id: `temp-${Date.now()}`,
        user: {
          id: 'currentUser',
          name: 'You',
          username: '@me',
          avatar: 'https://randomuser.me/api/portraits/men/85.jpg',
          isVerified: false,
          isBlueVerified: false
        },
        content: postInput,
        images: [],
        location: '',
        timeAgo: 'Just now',
        likes: 0,
        comments: 0,
        points: 0,
        hasLiked: false,
        hasSaved: false
      };
      
      setPosts([newPost, ...posts]);
      setPostInput('');
      addPoints(5); // Award points for posting
    }
  };

  const handleShare = async (post: typeof FEED_POSTS[0]) => {
    try {
      const result = await Share.share({
        message: `${post.user.name} posted: ${post.content}`,
        title: 'Check out this post!',
      });
      
      if (result.action === Share.sharedAction) {
        addPoints(2);
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleComment = (id: string) => {
    // Navigate to comments section of post detail
    router.push({
      pathname: "/feedpost-detail" as any,
      params: { id, showComments: "true" }
    });
  };

  // User profile popup state
  const [profilePopupVisible, setProfilePopupVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);

  // Handle user profile press
  const handleUserProfile = (userId: string) => {
    // Find the user data from posts
    const post = posts.find(post => post.user.id === userId);
    if (post) {
      setSelectedUser(post.user);
      setProfilePopupVisible(true);
    } else {
      // Fallback to navigating to user profile page
      router.push({
        pathname: "/user-profile" as any,
        params: { id: userId }
      });
    }
  };

  // Add listener to scale value
  useEffect(() => {
    const scaleListener = scale.addListener(({ value }) => {
      setCurrentScale(value);
    });
    
    return () => {
      scale.removeListener(scaleListener);
    };
  }, []);

  // Handle double tap to zoom
  const handleDoubleTap = () => {
    // Toggle between zoomed in and zoomed out
    Animated.spring(scale, {
      toValue: currentScale > 1.5 ? 1 : 2,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  // REFRESH_FEED event setup
  useEffect(() => {
    const handleRefreshEvent = () => {
      console.log('REFRESH_FEED event received');
      if (user) {
        console.log('Authenticated user, refreshing posts from Sanity');
        handleSanityRefresh();
      } else {
        console.log('Demo mode, refreshing with mock data');
        // For demo mode, manually trigger refresh
        setRefreshing(true);
        
        // Create a temporary post to show immediate feedback
        const tempPost = {
          id: `new-post-${Date.now()}`,
          user: {
            id: 'currentUser',
            name: 'You',
            username: '@me',
            avatar: 'https://randomuser.me/api/portraits/men/85.jpg',
            isVerified: false,
            isBlueVerified: false
          },
          content: "Just posted new content!",
          images: [],
          location: '',
          timeAgo: 'Just now',
          likes: 0,
          comments: 0,
          points: 0,
          hasLiked: false,
          hasSaved: false
        };
        
        // Add the temporary post until real data loads
        setPosts(current => [tempPost, ...current]);
      }
      
      // Trigger visual refresh
      handleRefresh();
    };

    console.log('Setting up REFRESH_FEED event listener');
    DeviceEventEmitter.addListener('REFRESH_FEED', handleRefreshEvent);

    return () => {
      console.log('Removing REFRESH_FEED event listener');
      DeviceEventEmitter.removeAllListeners('REFRESH_FEED');
    };
  }, [user, handleSanityRefresh, handleRefresh]);

  // Handle post menu
  const handleShowMenu = (postId: string) => {
    setSelectedPostId(postId);
    setMenuVisible(true);
  };

  const handleCloseMenu = () => {
    setMenuVisible(false);
  };

  // Handle report - navigate to dedicated report page
  const handleReport = () => {
    setMenuVisible(false);
    // Navigate to dedicated report page passing the post ID
    router.push({
      pathname: "/report" as any,
      params: { postId: selectedPostId }
    });
  };

  // Handle delete post
  const handleDeletePost = async () => {
    setMenuVisible(false);
    
    // Ensure we have a valid selectedPostId
    if (!selectedPostId) {
      console.error('No post ID selected for deletion');
      return;
    }
    
    // Confirm deletion
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: async () => {
            try {
              const selectedPost = posts.find(post => post.id === selectedPostId);
              if (!selectedPost) return;
              
              if (getSanityClient && user) {
                const client = getSanityClient();
                
                // Delete the post from Sanity - selectedPostId is now a string
                await client.delete(selectedPostId);
                
                // Update the local state to remove the post
                setPosts(currentPosts => 
                  currentPosts.filter(post => post.id !== selectedPostId)
                );
                
                // Refresh the feed to make sure it's updated
                handleSanityRefresh();
                
                Alert.alert('Success', 'Your post has been deleted.');
              } else {
                // Demo mode
                setPosts(currentPosts => 
                  currentPosts.filter(post => post.id !== selectedPostId)
                );
                
                Alert.alert('Post Deleted (Demo)', 'In the full app, this post would be removed from the database.');
              }
            } catch (error) {
              console.error('Error deleting post:', error);
              Alert.alert('Error', 'Failed to delete post. Please try again.');
            }
          }
        }
      ]
    );
  };

  // Update rendering of post cards to include menu button
  const renderPostCard = ({ item }: { item: typeof FEED_POSTS[0] }) => {
    const isLiked = likedPosts[item.id] || item.hasLiked;
    const isSaved = savedPosts[item.id] || item.hasSaved;
    const isVerified = item.user.isVerified || item.user.isBlueVerified;
    
    // Check if this post belongs to the current user safely
    const isOwnPost = user && user._id && user._id === item.user.id;
    
    return (
      <View style={[styles.postContainer, { width: cardWidth }]}>
        {/* User info row */}
        <Pressable 
          style={styles.userContainer}
          onPress={() => handleUserProfile(item.user.id)}
        >
          <Image 
            source={{ uri: item.user.avatar }} 
            style={styles.userAvatar} 
          />
          <View style={styles.userInfo}>
            <View style={styles.nameContainer}>
              <Text style={styles.userName}>{item.user.name}</Text>
              {isVerified && (
                <View style={[styles.verifiedBadge, item.user.isBlueVerified && styles.blueVerifiedBadge]}>
                  <TunnelVerifiedMark size={14} />
                </View>
              )}
            </View>
            <View style={styles.userHandleContainer}>
              <Text style={styles.userHandle}>{item.user.username}</Text>
              <Text style={styles.timeAgo}> • {item.timeAgo}</Text>
            </View>
          </View>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Pressable 
              style={styles.moreButton} 
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
              onPress={() => handleShowMenu(item.id)}
            >
              <MoreVertical size={16} color="#888" />
            </Pressable>
          </View>
        </Pressable>
        
        {/* Post content */}
        <Pressable onPress={() => handlePostPress(item)}>
          <Text style={styles.postContent}>{item.content}</Text>
        </Pressable>
        
        {/* Location */}
        {item.location ? (
          <View style={styles.locationContainer}>
            <MapPin size={12} color="#888" />
            <Text style={styles.locationText}>{item.location}</Text>
          </View>
        ) : null}
        
        {/* Images - use exact same implementation as feedpost-detail but add tap to zoom */}
        {item.images.length > 0 && (
          <View style={styles.imageContainer}>
            {/* Grid layout for exactly 4 images */}
            {item.images.length === 4 ? (
              <View style={styles.gridContainer}>
                <View style={styles.gridRow}>
                  <Pressable 
                    style={styles.gridItem}
                    onPress={() => handleImagePress(item.images[0], item.images, 0)}
                  >
                    <Image
                      source={{ uri: item.images[0] }}
                      style={styles.gridImage}
                    />
                  </Pressable>
                  <Pressable 
                    style={styles.gridItem}
                    onPress={() => handleImagePress(item.images[1], item.images, 1)}
                  >
                    <Image
                      source={{ uri: item.images[1] }}
                      style={styles.gridImage}
                    />
                  </Pressable>
                </View>
                <View style={styles.gridRow}>
                  <Pressable 
                    style={styles.gridItem}
                    onPress={() => handleImagePress(item.images[2], item.images, 2)}
                  >
                    <Image
                      source={{ uri: item.images[2] }}
                      style={styles.gridImage}
                    />
                  </Pressable>
                  <Pressable 
                    style={styles.gridItem}
                    onPress={() => handleImagePress(item.images[3], item.images, 3)}
                  >
                    <Image
                      source={{ uri: item.images[3] }}
                      style={styles.gridImage}
                    />
                  </Pressable>
                </View>
              </View>
            ) : (
              // Original horizontal scroll for 1-3 images
              <FlatList
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                data={item.images}
                keyExtractor={(_, index) => `image-${index}`}
                renderItem={({ item: image, index }) => (
                  <View style={{ width: cardWidth }}>
                    <Pressable 
                      onPress={() => handleImagePress(image, item.images, index)}
                    >
                      <Image
                        source={{ uri: image }}
                        style={styles.image}
                      />
                    </Pressable>
                  </View>
                )}
                onMomentumScrollEnd={(e) => {
                  const offset = e.nativeEvent.contentOffset.x;
                  const index = Math.round(offset / cardWidth);
                  setImageIndexes(prev => ({...prev, [item.id]: index}));
                }}
              />
            )}
            
            {/* Dots indicator for multi-image posts with horizontal scrolling (not for grid) */}
            {item.images.length > 1 && item.images.length !== 4 && (
              <View style={styles.dotsContainer}>
                {item.images.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.dot,
                      (imageIndexes[item.id] === undefined ? index === 0 : index === imageIndexes[item.id]) && styles.activeDot
                    ]}
                  />
                ))}
              </View>
            )}
            
            {/* Points badge */}
            <View style={styles.pointsBadgeContainer}>
              <View style={styles.pointsBadge}>
                <Award size={14} color="#FFD700" />
                <Text style={styles.pointsText}>{item.points} pts</Text>
              </View>
            </View>
          </View>
        )}
        
        {/* Engagement actions */}
        <View style={styles.actionsContainer}>
          <View style={styles.actionGroup}>
            <Pressable 
              style={styles.actionButton} 
              onPress={() => handleLike(item.id)}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
            >
              <Heart 
                size={20} 
                color={isLiked ? '#FF3B30' : '#888'} 
                fill={isLiked ? '#FF3B30' : 'transparent'} 
              />
              <Text style={[styles.actionText, isLiked ? styles.actionTextActive : null]}>
                {item.likes}
              </Text>
            </Pressable>
            
            <Pressable 
              style={styles.actionButton}
              onPress={() => handleComment(item.id)} 
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
            >
              <MessageCircle size={20} color="#888" />
              <Text style={styles.actionText}>{item.comments}</Text>
            </Pressable>
            
            <Pressable 
              style={styles.actionButton}
              onPress={() => handleShare(item)}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
            >
              <Share2 size={20} color="#888" />
            </Pressable>
            
            <Pressable 
              style={styles.actionButton}
              onPress={() => {
                // Emit an event to update unread count in the FloatingChatButton
                // This is preemptive as messages will be marked as seen on the chat screen
                eventEmitter.emit('messages-seen');
                
                router.push({
                  pathname: "/chat" as any,
                  params: { id: item.user.id }
                });
              }}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
            >
              <Send size={20} color="#888" />
            </Pressable>
          </View>
          
          <View style={styles.actionGroup}>
            <Pressable 
              style={styles.actionButton} 
              onPress={() => handleAwardPoints(item.id, 1)}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
            >
              <Award size={20} color="#FFD700" />
            </Pressable>
            
            <Pressable 
              style={styles.actionButton} 
              onPress={() => handleSave(item.id)}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
            >
              <Bookmark 
                size={20} 
                color={isSaved ? '#0070F3' : '#888'} 
                fill={isSaved ? '#0070F3' : 'transparent'} 
              />
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  // Add navigateToCreatePost function from FloatingActionButton
  const navigateToCreatePost = () => {
    router.push("/newsfeed-upload" as any);
  };
  
  // Create post component
  const CreatePostComponent = () => (
    <View style={[styles.createPostContainer, { width: cardWidth }]}>
      <View style={styles.createPostHeader}>
        {/* Show actual user avatar if available, otherwise show placeholder */}
        {user && user.profile?.avatar ? (
          <Image 
            source={{ uri: urlFor(user.profile.avatar).url() }} 
            style={styles.currentUserAvatar} 
          />
        ) : (
          <View style={[styles.currentUserAvatar, styles.placeholderAvatar]}>
            <UserCircle size={20} color="#666" />
          </View>
        )}
        <Pressable
          style={styles.postInputContainer}
          onPress={navigateToCreatePost}
        >
          <View style={styles.postInput}>
            <Text style={styles.postInputPlaceholder}>What's on your mind?</Text>
          </View>
        </Pressable>
      </View>
      
      <View style={styles.createPostActions}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.createPostButtonsScroll}>
          <View style={styles.createPostButtons}>
            <Pressable 
              style={styles.mediaButton} 
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
              onPress={navigateToCreatePost}
            >
              <ImageIcon size={16} color="#0070F3" />
              <Text style={styles.mediaButtonText}>Photo</Text>
            </Pressable>
            
            <Pressable 
              style={styles.mediaButton} 
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
              onPress={navigateToCreatePost}
            >
              <Camera size={16} color="#0070F3" />
              <Text style={styles.mediaButtonText}>Camera</Text>
            </Pressable>
          </View>
        </ScrollView>
        
        <Pressable 
          style={styles.postButton}
          onPress={navigateToCreatePost}
        >
          <Text style={styles.postButtonText}>Post</Text>
        </Pressable>
      </View>
    </View>
  );

  // Animated header based on scroll position
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // Determine number of columns based on screen size
  const numColumns = isTablet ? 2 : 1;

  // Render video card component
  const renderVideoCard = ({ item }: { item: VideoItem }) => {
    // Get thumbnail URL prioritizing the thumbnail from Sanity, or use a fallback
    const thumbnailUrl = item.thumbnail || 
                         `https://i.imgur.com/${item.type === 'horizontal' ? '8LWOKjz' : '6kYnVGf'}.png`;
    
    return (
      <View style={[styles.postContainer, { width: cardWidth }]}>
        {/* Video author info */}
        <View style={styles.userContainer}>
          <Image 
            source={{ uri: item.authorAvatar || 'https://randomuser.me/api/portraits/lego/1.jpg' }} 
            style={styles.userAvatar} 
          />
          <View style={styles.userInfo}>
            <View style={styles.nameContainer}>
              <Text style={styles.userName}>{item.author || 'Unknown Author'}</Text>
              {(item.isVerified || item.isBlueVerified) && (
                <View style={[styles.verifiedBadge, item.isBlueVerified && styles.blueVerifiedBadge]}>
                  <TunnelVerifiedMark size={14} />
                </View>
              )}
            </View>
            <Text style={styles.userHandle}>Posted a video</Text>
          </View>
        </View>
        
        {/* Video preview */}
        <Pressable onPress={() => navigateToVideoFeed(item)}>
          <View style={styles.videoPreviewContainer}>
            <Image 
              source={{ uri: thumbnailUrl }} 
              style={styles.videoThumbnail} 
            />
            <View style={styles.videoPlayButton}>
              <Play color="white" size={40} fill="white" />
            </View>
            <View style={styles.videoDurationBadge}>
              <Text style={styles.videoDurationText}>Video</Text>
            </View>
          </View>
          
          <Text style={styles.videoTitle}>{item.title || 'Untitled Video'}</Text>
          <Text style={styles.videoDescription} numberOfLines={2}>{item.description || 'No description'}</Text>
        </Pressable>
        
        {/* Video stats */}
        <View style={styles.actionsContainer}>
          <View style={styles.actionGroup}>
            <View style={styles.actionButton}>
              <ThumbsUp size={20} color="#888" />
              <Text style={styles.actionText}>{item.likes || 0}</Text>
            </View>
            <View style={styles.actionButton}>
              <MessageCircle size={20} color="#888" />
              <Text style={styles.actionText}>{item.comments || 0}</Text>
            </View>
            <Pressable 
              style={styles.actionButton}
              onPress={() => navigateToVideoFeed(item)}
            >
              <Play size={20} color="#1877F2" fill="#1877F2" />
              <Text style={[styles.actionText, { color: '#1877F2' }]}>Watch</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  // Create a combined feed of posts and videos
  const combinedFeed = useMemo(() => {
    let combined: FeedItem[] = [...posts];
    
    // Insert videos at regular intervals
    videos.forEach((video, index) => {
      const position = Math.min((index + 1) * 2, combined.length);
      combined.splice(position, 0, { 
        id: `video-${video.id}`, 
        type: 'video',
        videoData: video,
        // Add required PostData properties with defaults
        user: {
          id: video.authorId || 'unknown',
          name: video.author || 'Unknown Author',
          username: '@' + (video.author || 'unknown').toLowerCase().replace(/\s+/g, ''),
          avatar: video.authorAvatar || 'https://randomuser.me/api/portraits/lego/1.jpg',
          isVerified: video.isVerified || false,
          isBlueVerified: video.isBlueVerified || false
        },
        content: video.description || '',
        images: [video.thumbnail || ''],
        timeAgo: 'Recently',
        likes: video.likes || 0,
        comments: video.comments || 0,
        points: video.points || 0,
        hasLiked: false,
        hasSaved: false
      });
    });
    
    return combined;
  }, [posts, videos]);

  // Render item for FlatList
  const renderFeedItem = ({ item }: { item: any }) => {
    if (item.type === 'video') {
      return renderVideoCard({ item: item.videoData });
    } else {
      return renderPostCard({ item });
    }
  };

  // Add variables to track scroll position
  const lastScrollY = useRef(0);
  const scrollDirection = useRef<'up' | 'down'>('up');
  const scrollThreshold = 10; // Minimum scroll distance to trigger direction change
  
  // Update the onScroll handler
  const handleScroll = (event: any) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    
    // Determine scroll direction and emit event when direction changes
    if (currentScrollY > lastScrollY.current + scrollThreshold) {
      // Scrolling down
      if (scrollDirection.current !== 'down') {
        scrollDirection.current = 'down';
        DeviceEventEmitter.emit('FEED_SCROLL', { direction: 'down' });
      }
    } else if (currentScrollY < lastScrollY.current - scrollThreshold) {
      // Scrolling up
      if (scrollDirection.current !== 'up') {
        scrollDirection.current = 'up';
        DeviceEventEmitter.emit('FEED_SCROLL', { direction: 'up' });
      }
    }
    
    // Update last scroll position
    lastScrollY.current = currentScrollY;
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <Animated.FlatList
        data={combinedFeed}
        renderItem={renderFeedItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          isTablet && styles.tabletListContent
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { 
            useNativeDriver: true,
            listener: handleScroll  // Add scroll listener
          }
        )}
        refreshing={refreshing || hookRefreshing}
        onRefresh={handleRefresh}
        ListHeaderComponent={CreatePostComponent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <ActivityIndicator size="large" color="#0070F3" />
            <Text style={styles.emptyText}>Loading content...</Text>
          </View>
        }
        key={isTablet ? 'grid' : 'list'}
        numColumns={numColumns}
        columnWrapperStyle={isTablet ? styles.columnWrapper : undefined}
      />
      
      {/* Image Viewer Modal with FlatList for improved scrolling */}
      <Modal
        visible={modalVisible}
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
        animationType="fade"
      >
        <Pressable 
          style={styles.modalContainer} 
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalBackdrop} />
          
          <Pressable 
            style={styles.gestureContainer}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <Pressable 
              style={styles.closeButton} 
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </Pressable>
            
            {currentPostImages.length > 0 && (
              <GestureHandlerRootView style={styles.imageViewerContent}>
                <FlatList
                  data={currentPostImages}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  initialScrollIndex={currentImageIndex}
                  scrollEnabled={currentScaleValue.current <= 1.1}
                  getItemLayout={(data, index) => ({
                    length: SCREEN_WIDTH,
                    offset: SCREEN_WIDTH * index,
                    index,
                  })}
                  onMomentumScrollEnd={(e) => {
                    const newIndex = Math.floor(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                    if (newIndex !== currentImageIndex) {
                      setSelectedImage(currentPostImages[newIndex]);
                      setCurrentImageIndex(newIndex);
                      
                      // Reset zoom and pan when changing images
                      baseScale.setValue(1);
                      pinchScale.setValue(1);
                      translateX.setValue(0);
                      translateY.setValue(0);
                    }
                  }}
                  renderItem={({ item, index }) => (
                    <View 
                      style={{ width: SCREEN_WIDTH, height: '100%' }}
                      {...(currentScaleValue.current > 1.1 ? viewerPanResponder.panHandlers : {})}
                    >
                      <PinchGestureHandler
                        onGestureEvent={onPinchGestureEvent}
                        onHandlerStateChange={({ nativeEvent }) => {
                          if (nativeEvent.oldState === State.ACTIVE) {
                            onPinchEnd();
                          }
                        }}
                      >
                        <Animated.View 
                          style={[styles.pinchableView, { width: SCREEN_WIDTH }]}
                        >
                          <TouchableWithoutFeedback 
                            onPress={() => {
                              const now = Date.now();
                              const DOUBLE_TAP_DELAY = 300;
                              
                              // Handle double tap to zoom
                              if (now - lastTap.current < DOUBLE_TAP_DELAY) {
                                if (currentScaleValue.current > 1.5) {
                                  // Reset zoom if already zoomed in
                                  baseScale.setValue(1);
                                  pinchScale.setValue(1);
                                  translateX.setValue(0);
                                  translateY.setValue(0);
                                } else {
                                  // Zoom in to 2.5x at the center
                                  baseScale.setValue(2.5);
                                }
                              } else {
                                // Add a subtle touch feedback
                                Animated.sequence([
                                  Animated.timing(baseScale, {
                                    toValue: currentScaleValue.current * 0.95,
                                    duration: 100,
                                    useNativeDriver: true
                                  }),
                                  Animated.timing(baseScale, {
                                    toValue: currentScaleValue.current,
                                    duration: 100,
                                    useNativeDriver: true
                                  })
                                ]).start();
                              }
                              
                              lastTap.current = now;
                            }}
                          >
                            <Animated.Image
                              source={{ uri: item }}
                              style={[
                                styles.modalImage,
                                {
                                  transform: [
                                    { scale: combinedScale },
                                    { translateX },
                                    { translateY },
                                  ],
                                },
                              ]}
                              resizeMode="contain"
                            />
                          </TouchableWithoutFeedback>
                        </Animated.View>
                      </PinchGestureHandler>
                    </View>
                  )}
                  keyExtractor={(item, index) => `modal-image-${index}`}
                  ref={(ref) => {
                    if (ref && currentImageIndex > 0) {
                      ref.scrollToIndex({ index: currentImageIndex, animated: false });
                    }
                  }}
                />
                
                {/* Image counter */}
                {currentPostImages.length > 1 && (
                  <View style={styles.imageCounter}>
                    <Text style={styles.imageCounterText}>
                      {currentImageIndex + 1} / {currentPostImages.length}
                    </Text>
                  </View>
                )}
              </GestureHandlerRootView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
      
      {/* User Profile Popup */}
      <UserProfilePopup 
        visible={profilePopupVisible}
        onClose={() => setProfilePopupVisible(false)}
        userData={selectedUser}
      />
      
      {/* Post actions menu */}
      <PostActionsMenu
        visible={menuVisible}
        onClose={handleCloseMenu}
        onReport={handleReport}
        onDelete={handleDeletePost}
        canDelete={user && selectedPostId !== '' ? posts.find(p => p.id === selectedPostId)?.user.id === user._id : false}
        isOwnPost={user && selectedPostId !== '' ? posts.find(p => p.id === selectedPostId)?.user.id === user._id : false}
      />
      
      {/* Add FloatingActionButton */}
      <FloatingActionButton />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  listContent: {
    paddingBottom: 80,
    paddingTop: Platform.OS === 'ios' ? 30 : 10,
    paddingHorizontal: 8,
    alignItems: 'center'
  },
  tabletListContent: {
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  columnWrapper: {
    justifyContent: 'space-around',
    width: '100%',
  },
  // Create post styling
  createPostContainer: {
    backgroundColor: '#111',
    borderRadius: 16,
    margin: 16,
    padding: 16,
    alignSelf: 'center',
    maxWidth: 700,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  createPostHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  currentUserAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  postInputContainer: {
    flex: 1,
    position: 'relative',
  },
  postInput: {
    flex: 1,
    color: '#888',
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    minHeight: 50,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 16,
    paddingRight: 40,
    justifyContent: 'center',
  },
  postInputPlaceholder: {
    color: '#888',
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  createPostActions: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  createPostButtonsScroll: {
    flex: 1,
  },
  createPostButtons: {
    flexDirection: 'row',
  },
  mediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0,112,243,0.1)',
    borderRadius: 20,
  },
  mediaButtonText: {
    color: '#0070F3',
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    marginLeft: 6,
  },
  postButton: {
    backgroundColor: '#0070F3',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postButtonDisabled: {
    backgroundColor: 'rgba(0,112,243,0.5)',
  },
  postButtonText: {
    color: 'white',
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  // Post card styling
  postContainer: {
    marginVertical: 8,
    marginHorizontal: 8,
    backgroundColor: '#111',
    borderRadius: 16,
    overflow: 'hidden',
    alignSelf: 'center',
    maxWidth: 700,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  userContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 10,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  userHandleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifiedBadge: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blueVerifiedBadge: {
    backgroundColor: 'transparent',
  },
  userHandle: {
    color: '#777',
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  timeAgo: {
    color: '#666',
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  moreButton: {
    padding: 8,
    marginLeft: 4,
  },
  postContent: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    lineHeight: 22,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  locationText: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginLeft: 4,
  },
  // Updated image styling
  imageContainer: {
    width: '100%',
    position: 'relative',
    marginBottom: 16,
  },
  image: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
    borderRadius: 16,
    marginHorizontal: 0,
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
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginLeft: 6,
  },
  actionTextActive: {
    color: '#FF3B30',
  },
  // Empty state
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    marginTop: 16,
  },
  // Add modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'transparent',
    position: 'relative',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.9)',
  },
  gestureContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    // This ensures this container doesn't block touches to the backdrop
    backgroundColor: 'transparent',
  },
  imageViewer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinchableView: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    marginTop: -25,
  },
  leftNavButton: {
    left: 20,
  },
  rightNavButton: {
    right: 20,
  },
  navButtonText: {
    color: 'white',
    fontSize: 30,
    fontWeight: 'bold',
  },
  imageCounter: {
    position: 'absolute',
    bottom: 40,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
  },
  imageCounterText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  placeholderAvatar: {
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridContainer: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    width: '100%',
    height: 350,
    borderRadius: 12,
    overflow: 'hidden',
    padding: 1.5,
    marginBottom: 8,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    height: '49.5%',
  },
  gridItem: {
    width: '49.5%',
    height: '100%',
    borderWidth: 0,
    borderColor: 'transparent',
    margin: 1,
    borderRadius: 2,
    overflow: 'hidden',
  },
  gridImage: {
    width: '100%',
    height: '100%',
    borderRadius: 0,
  },
  // User Profile Popup Styles
  popupModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  popupBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  profilePopupCard: {
    backgroundColor: '#111',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20, // Extra padding for iOS
  },
  popupHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#333',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  popupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  popupTitle: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
  },
  popupCloseButton: {
    padding: 5,
  },
  popupScrollView: {
    maxHeight: '100%',
  },
  popupContent: {
    paddingBottom: 20,
  },
  popupProfileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 15,
  },
  popupProfileImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: '#1877F2',
  },
  popupProfileInfo: {
    marginLeft: 15,
    flex: 1,
  },
  popupNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  popupProfileName: {
    color: 'white',
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    marginRight: 8,
  },
  popupProfileUsername: {
    color: '#888',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  popupStatsSection: {
    flexDirection: 'row',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#222',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    marginTop: 5,
  },
  statLabel: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#222',
  },
  popupBioSection: {
    padding: 20,
    paddingBottom: 15,
  },
  popupBioText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
  },
  popupInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  popupInfoText: {
    color: '#ccc',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginLeft: 10,
  },
  popupBadgesSection: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 10,
  },
  popupSectionTitle: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 10,
  },
  popupBadgesList: {
    paddingBottom: 5,
    paddingRight: 20,
  },
  popupBadge: {
    alignItems: 'center',
    marginRight: 20,
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 10,
    width: 90,
  },
  popupBadgeIcon: {
    fontSize: 24,
    marginBottom: 5,
  },
  popupBadgeName: {
    color: 'white',
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
  },
  popupActionsContainer: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#222',
    gap: 10,
  },
  popupActionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followButton: {
    backgroundColor: '#0070F3',
  },
  unfollowButton: {
    backgroundColor: '#222',
    borderWidth: 1,
    borderColor: '#0070F3',
  },
  followButtonText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  unfollowButtonText: {
    color: '#0070F3',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  messageButton: {
    backgroundColor: '#222',
    borderWidth: 1,
    borderColor: '#0070F3',
  },
  messageButtonText: {
    color: '#0070F3',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  viewProfileButton: {
    backgroundColor: '#222',
    borderWidth: 1,
    borderColor: '#333',
  },
  viewProfileButtonText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  popupLoading: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popupInterestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    marginBottom: 15,
    marginTop: -5,
  },
  popupInterestTag: {
    backgroundColor: '#1E1E1E',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  popupInterestText: {
    color: '#0070F3',
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  // Separate styles for popup verification badges
  popupVerifiedBadge: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popupBlueVerifiedBadge: {
    backgroundColor: 'transparent',
  },
  // Menu styles
  menuModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuModalContent: {
    width: '80%',
    backgroundColor: '#222',
    borderRadius: 16,
    padding: 8,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  menuItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  menuItemText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
  },
  deleteMenuItem: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,0,0,0.1)',
  },
  deleteMenuItemText: {
    color: '#FF3B30',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
  },
  cancelMenuItem: {
    borderBottomWidth: 0,
  },
  // Add video related styles
  videoPreviewContainer: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  videoPlayButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -20 }, { translateY: -20 }],
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoDurationBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  videoDurationText: {
    color: 'white',
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  videoTitle: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 6,
    paddingHorizontal: 16,
  },
  videoDescription: {
    color: '#BBB',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  imageViewerContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 