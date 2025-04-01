import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions, DeviceEventEmitter } from 'react-native';
import { Tabs, useRouter, usePathname } from 'expo-router';
import { Home, Gift, User, Coins, Plus, FileText } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function TabLayout() {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState('index');
  
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

  // Handler for tab press to emit events
  const handleTabPress = useCallback((tabName: string) => {
    // Emit event for double-tap detection
    DeviceEventEmitter.emit('TAB_PRESS', { tabName });
    
    // Only emit HOME_TAB_PRESSED if we're already on the home tab
    if (tabName === 'index' && activeTab === 'index') {
      DeviceEventEmitter.emit('HOME_TAB_PRESSED');
    }
  }, [activeTab]);

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
          bottom: 0,
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
        },
        tabBarActiveTintColor: '#1877F2',
        tabBarInactiveTintColor: '#888',
        tabBarShowLabel: route.name !== 'tunnelling',
        tabBarItemStyle: {
          height: 60,
        },
        tabBarButton: (props) => (
          <TouchableOpacity
            {...props}
            onPress={(e) => {
              handleTabPress(route.name);
              props.onPress?.(e);
            }}
          />
        ),
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
      <Tabs.Screen
        name="points-about"
        options={{
          title: 'Points',
          tabBarIcon: ({ color }) => <Coins color={color} size={24} />,
        }}
      />
      {/* Tunnelling tab with floating button */}
      <Tabs.Screen
        name="tunnelling"
        options={{
          title: '',
          tabBarIcon: ({ focused }) => (
            <View style={styles.floatingButtonWrapper}>
              <View style={styles.floatingButtonContainer}>
                <LinearGradient
                  colors={['#0070F3', '#00DFD8']}
                  style={styles.floatingButton}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Plus color="#FFFFFF" size={28} />
                </LinearGradient>
                {focused && (
                  <View style={styles.focusRingContainer}>
                    <LinearGradient
                      colors={['rgba(0,112,243,0.5)', 'rgba(0,223,216,0.5)']}
                      style={styles.focusRing}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    />
                  </View>
                )}
              </View>
              <View style={styles.buttonShadow} />
            </View>
          ),
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
          tabBarIcon: ({ color }) => <User color={color} size={24} />,
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
});