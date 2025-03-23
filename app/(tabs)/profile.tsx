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
} from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { useRouter, useFocusEffect } from 'expo-router';
import ScreenContainer from '../components/ScreenContainer';
import AuthScreen from '../components/AuthScreen';
import { useSanityAuth } from '../hooks/useSanityAuth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as sanityAuthService from '../../tunnel-ad-main/services/sanityAuthService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
  
  // Get user data from Sanity auth hook
  const { user, logout } = useSanityAuth();

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
      
      // Update authenticated state
      setIsAuthenticated(true);
      
      // Update points display
      if (user.points !== undefined) {
        setDisplayPoints(user.points);
      }
    } else {
      console.log("No user data in useSanityAuth hook");
      setIsAuthenticated(false);
    }
    
    // Listen for AUTH_STATE_CHANGED events
    const subscription = DeviceEventEmitter.addListener('AUTH_STATE_CHANGED', (event) => {
      console.log("Profile screen received AUTH_STATE_CHANGED event:", event);
      
      // Update authentication state if it's provided
      if (event?.isAuthenticated !== undefined) {
        setIsAuthenticated(event.isAuthenticated);
      }
      
      // If user data was included in the event, use it directly
      if (event?.userData) {
        console.log("Using user data from event in profile screen:", event.userData);
        
        // Update points if different
        if (event.userData.points !== undefined) {
          setDisplayPoints(event.userData.points);
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [user]);

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

  // Function to force refresh user data (can be called on focus or pull-to-refresh)
  const refreshUserData = async () => {
    try {
      setRefreshing(true);
      // Force a re-check of user session
      const userString = await AsyncStorage.getItem('user');
      if (userString) {
        const userData = JSON.parse(userString);
        console.log('refreshUserData found user data:', userData);
        
        // Update local authentication state first
        setIsAuthenticated(true);
        
        // Emit event with the user data to force update across components
        DeviceEventEmitter.emit('AUTH_STATE_CHANGED', { 
          isAuthenticated: true,
          userData: userData 
        });
      } else {
        console.log('No user data found in AsyncStorage');
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    } finally {
      setRefreshing(false);
    }
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

  // If not authenticated, show the auth screen
  if (!isAuthenticated) {
    return <AuthScreen onAuthenticated={() => setIsAuthenticated(true)} />;
  }

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
                {user?.profile?.avatar && (
                  <Image
                    source={{ uri: getImageUrl(user.profile.avatar) }}
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
            onPress={() => user?.profile?.avatar && setShowImageModal(true)}
            style={styles.profileImageContainer}
            android_ripple={{ color: 'rgba(0, 112, 243, 0.2)', foreground: true }}
          >
            {user?.profile?.avatar ? (
              <>
                <Image
                  source={{ uri: getImageUrl(user.profile.avatar) }}
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
          <Text style={styles.profileName}>
            {user?.firstName && user.lastName 
              ? `${user.firstName} ${user.lastName}` 
              : user?.username || 'User'}
          </Text>
          <Text style={styles.profileUsername}>
            @{user?.username || 'username'}
          </Text>
          
          <View style={styles.pointsContainer}>
            <Text style={styles.pointsLabel}>Your Points</Text>
            <Animated.Text
              style={[
                styles.pointsValue,
                { transform: [{ scale: scaleAnim }] }
              ]}
            >
              {user?.points || displayPoints}
            </Animated.Text>
          </View>
        </View>

        {/* User Bio Section */}
        {user?.profile?.bio && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <View style={styles.bioContainer}>
              <Text style={styles.bioText}>{user.profile.bio}</Text>
            </View>
          </View>
        )}

        {/* User Interests Section */}
        {user?.profile?.interests && user.profile.interests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Interests</Text>
            <View style={styles.interestsContainer}>
              {user.profile.interests.map((interest: string, index: number) => (
                <View key={index} style={styles.interestTag}>
                  <Text style={styles.interestText}>{interest}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
        
        {/* Personal Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <View style={styles.contactContainer}>
            {user?.firstName && (
              <View style={styles.contactItem}>
                <User color="#0070F3" size={20} />
                <View style={styles.contactTextContainer}>
                  <Text style={styles.contactLabel}>First Name</Text>
                  <Text style={styles.contactValue}>{user.firstName}</Text>
                </View>
              </View>
            )}
            {user?.lastName && (
              <View style={styles.contactItem}>
                <User color="#0070F3" size={20} />
                <View style={styles.contactTextContainer}>
                  <Text style={styles.contactLabel}>Last Name</Text>
                  <Text style={styles.contactValue}>{user.lastName}</Text>
                </View>
              </View>
            )}
            {user?.username && (
              <View style={styles.contactItem}>
                <User color="#0070F3" size={20} />
                <View style={styles.contactTextContainer}>
                  <Text style={styles.contactLabel}>Username</Text>
                  <Text style={styles.contactValue}>@{user.username}</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Contact Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <View style={styles.contactContainer}>
            <View key="email" style={styles.contactItem}>
              <Mail color="#0070F3" size={20} />
              <View style={styles.contactTextContainer}>
                <Text style={styles.contactLabel}>Email</Text>
                <Text style={styles.contactValue}>{user?.email || 'No email provided'}</Text>
              </View>
            </View>
            <View key="phone" style={styles.contactItem}>
              <Phone color="#0070F3" size={20} />
              <View style={styles.contactTextContainer}>
                <Text style={styles.contactLabel}>Phone</Text>
                <Text style={styles.contactValue}>{user?.phone || 'No phone provided'}</Text>
              </View>
            </View>
            <View key="location" style={styles.contactItem}>
              <MapPin color="#0070F3" size={20} />
              <View style={styles.contactTextContainer}>
                <Text style={styles.contactLabel}>Location</Text>
                <Text style={styles.contactValue}>{user?.location || 'No location provided'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <View style={styles.statsRow}>
            {renderStatCard(
              <Award color="#0070F3" size={24} />,
              'Badges',
              user?.badges?.length || '4'
            )}
            {renderStatCard(
              <Clock color="#0070F3" size={24} />,
              'Days Active',
              user?.daysActive || (user?.createdAt ? 
                Math.ceil((new Date().getTime() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)).toString() : 
                '12')
            )}
          </View>
          <View style={styles.statsRow}>
            {renderStatCard(
              <Heart color="#0070F3" size={24} />,
              'Likes Given',
              user?.likesGiven || '27'
            )}
            {renderStatCard(
              <BarChart2 color="#0070F3" size={24} />,
              'Rank',
              user?.rank || (user?.points && user.points > 500 ? 'Gold' : user?.points && user.points > 100 ? 'Silver' : 'Bronze')
            )}
          </View>
        </View>

        {/* Badges Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Badges</Text>
          {user?.badges && user.badges.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.badgesContainer}
            >
              {user.badges.map((badge: { id: string; icon: string; name: string; description: string }) => (
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
          
          {/* Add diagnostic button */}
          <Pressable
            style={[styles.debugButton]}
            onPress={() => {
              // Display user ID and authentication details
              if (user) {
                Alert.alert(
                  'User Details',
                  `ID: ${user._id}\nEmail: ${user.email}\nCreated: ${user.createdAt ? new Date(user.createdAt).toLocaleString() : 'N/A'}\nProfile: ${user.profile ? 'Yes' : 'No'}\nAvatar: ${user.profile?.avatar ? 'Yes' : 'No'}`,
                  [{ text: 'OK' }]
                );
              } else {
                Alert.alert('No User', 'No user is currently logged in');
              }
            }}
          >
            <Text style={styles.resetButtonText}>
              Show User Details (Debug)
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
  profileName: {
    color: 'white',
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    marginBottom: 10,
  },
  profileUsername: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    opacity: 0.8,
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
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
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
});