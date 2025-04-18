import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions, DeviceEventEmitter, Animated, Image } from 'react-native';
import { Tabs, useRouter, usePathname } from 'expo-router';
import { Home, Gift, User, Coins, Plus, FileText, Bell } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSanityAuth } from '../hooks/useSanityAuth';
import { urlFor } from '../../tunnel-ad-main/services/postService';

const { width, height } = Dimensions.get('window');

// Define user types to fix TypeScript errors
interface UserProfile {
  avatar?: any;
  bio?: string;
  interests?: string[];
}

interface SanityUser {
  _id: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  profile?: UserProfile;
  [key: string]: any;
}

export default function TabLayout() {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [tabBarVisible, setTabBarVisible] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState('index');
  
  // Get auth user data to access the profile avatar
  const { user } = useSanityAuth();
  // Add local user state to handle live updates
  const [localUser, setLocalUser] = useState<SanityUser | null>(null);
  
  // Update local user when auth user changes
  useEffect(() => {
    if (user) {
      setLocalUser(user);
    } else {
      setLocalUser(null);
    }
  }, [user]);
  
  // Listen for auth state changes to update profile icon immediately
  useEffect(() => {
    const authStateListener = DeviceEventEmitter.addListener(
      'AUTH_STATE_CHANGED',
      (event) => {
        if (event?.isAuthenticated === true && event?.userData) {
          setLocalUser(event.userData);
        } else if (event?.isAuthenticated === false) {
          setLocalUser(null);
        }
      }
    );
    
    return () => {
      authStateListener.remove();
    };
  }, []);
  
  // Add animated value for tab bar
  const tabBarTranslateY = useRef(new Animated.Value(0)).current;
  
  // Function to get avatar URL from user data
  const getAvatarUrl = (userObj: SanityUser | null): string | null => {
    if (userObj?.profile?.avatar) {
      try {
        return urlFor(userObj.profile.avatar).width(80).height(80).url();
      } catch (error) {
        console.log('Error getting avatar URL:', error);
        return null;
      }
    }
    return null;
  };
  
  // Update active tab when pathname changes
  useEffect(() => {
    const tabName = pathname.split('/').pop() || 'index';
    setActiveTab(tabName);
  }, [pathname]);
  
  // Listen for full screen toggle events from VideoFeed
  useEffect(() => {
    const fullScreenListener = DeviceEventEmitter.addListener(
      'TOGGLE_FULL_SCREEN',
      (event) => {
        setIsFullScreen(event.isFullScreen);
      }
    );
    
    return () => {
      fullScreenListener.remove();
    };
  }, []);

  // Listen for tab bar visibility toggle events from Feed
  useEffect(() => {
    const tabBarVisibilityListener = DeviceEventEmitter.addListener(
      'TOGGLE_TAB_BAR',
      (event) => {
        // Check if visibility state should change
        if (event.visible !== tabBarVisible) {
          setTabBarVisible(event.visible);
          
          // Animate the tab bar in/out
          Animated.spring(tabBarTranslateY, {
            toValue: event.visible ? 0 : 150, // Increased value to ensure complete disappearance
            friction: 8,
            tension: 60,
            useNativeDriver: true,
          }).start();
        }
      }
    );
    
    return () => {
      tabBarVisibilityListener.remove();
    };
  }, [tabBarVisible]);

  // Handler for tab press to emit events
  const handleTabPress = useCallback((tabName: string) => {
    // Emit event for double-tap detection
    DeviceEventEmitter.emit('TAB_PRESS', { tabName });
    
    // Only emit HOME_TAB_PRESSED if we're already on the home tab
    if (tabName === 'index' && activeTab === 'index') {
      DeviceEventEmitter.emit('HOME_TAB_PRESSED');
    }
    
    // Show tab bar when any tab is pressed
    if (!tabBarVisible) {
      setTabBarVisible(true);
      Animated.spring(tabBarTranslateY, {
        toValue: 0,
        friction: 8,
        tension: 60,
        useNativeDriver: true,
      }).start();
    }
  }, [activeTab, tabBarVisible]);

  // Render profile tab icon - avatar if logged in, default icon if not
  const renderProfileIcon = ({ color, focused }: { color: string; focused: boolean }) => {
    // Get avatar URL from local user state (for live updates)
    const avatarUrl = getAvatarUrl(localUser);
    
    if (localUser && avatarUrl) {
      return (
        <View style={[styles.avatarContainer, focused && styles.avatarContainerFocused]}>
          <Image
            source={{ uri: avatarUrl }}
            style={styles.avatarImage}
          />
        </View>
      );
    }
    
    // Fallback to default icon
    return <User color={color} size={24} />;
  };

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'rgba(10, 10, 10, 0.95)',
          height: 100,
          paddingTop: 10,
          paddingBottom: 40,
          position: 'absolute',
          bottom: -10,
          left: 0,
          
          right: 0,
          elevation: 0,
          borderTopColor: 'rgba(255, 255, 255, 0.05)',
          borderTopWidth: 1,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.3,
          shadowRadius: 5,
          display: isFullScreen ? 'none' : 'flex', // Hide tab bar in full screen mode
          transform: [{ translateY: tabBarTranslateY }], // Add animation transform
        } as any, // Cast to any to avoid TypeScript errors with animated values
        tabBarActiveTintColor: '#1877F2',
        tabBarInactiveTintColor: '#888',
        tabBarShowLabel: route.name !== 'upload',
        tabBarItemStyle: {
          height: 60,
        },
        tabBarButton: (props) => {
          // Define a wrapper component with proper typing
          return (
            <TouchableOpacity
              accessibilityRole={props.accessibilityRole}
              accessibilityState={props.accessibilityState}
              accessibilityLabel={props.accessibilityLabel}
              testID={props.testID}
              style={props.style}
              onPress={(e) => {
                handleTabPress(route.name);
                props.onPress && props.onPress(e);
              }}
            >
              {props.children}
            </TouchableOpacity>
          );
        },
      })}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Home color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color }) => <FileText color={color} size={24} />,
        }}
      />
        {/* Notifications tab */}
        <Tabs.Screen
        name="notifications"
        options={{
          title: 'Info',
          tabBarIcon: ({ color }) => <Bell color={color} size={24} />,
        }}
      />

      <Tabs.Screen
        name="points-about"
        options={{
          title: 'Points',
          tabBarIcon: ({ color }) => <Coins color={color} size={24} />,
        }}
      />
      
    
      
    
      
      <Tabs.Screen
        name="redeem"
        options={{
          title: 'Redeem',
          tabBarIcon: ({ color }) => <Gift color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: renderProfileIcon,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  floatingButtonWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    bottom: -15,
  },
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  floatingButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(0, 0, 0, 0.2)',
  },
  focusRingContainer: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  focusRing: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    position: 'absolute',
  },
  buttonShadow: {
    position: 'absolute',
    bottom: -5,
    width: 60,
    height: 20,
    backgroundColor: 'transparent',
    borderRadius: 50,
    shadowColor: '#0070F3',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
    zIndex: 1,
  },
  avatarContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarContainerFocused: {
    borderWidth: 2,
    borderColor: '#1877F2',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 15,
  },
});