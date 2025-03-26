import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Animated, DeviceEventEmitter } from 'react-native';
import { usePoints } from '@/hooks/usePoints';
import VideoFeed from '@/components/VideoFeed';
import Feed from '@/components/Feed';
import { Search } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import ScreenContainer from '../components/ScreenContainer';

export default function HomeScreen() {
  const [activeTab, setActiveTab] = useState<'videos' | 'feed'>('videos');
  const { points } = usePoints();
  const pointsScale = useRef(new Animated.Value(1)).current;
  const [displayPoints, setDisplayPoints] = useState(points);
  const router = useRouter();

  // Update display points when actual points change
  useEffect(() => {
    setDisplayPoints(points);
  }, [points]);

  // Handle points reset and updates
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('POINTS_UPDATED', (event) => {
      if (event?.type === 'reset') {
        // Immediately set display to 0 on reset
        setDisplayPoints(0);
        // Trigger reset animation
        Animated.sequence([
          Animated.timing(pointsScale, {
            toValue: 0.5,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(pointsScale, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      } else if (event?.type === 'earned') {
        // Update display and trigger earn animation
        setDisplayPoints(points);
        Animated.sequence([
          Animated.timing(pointsScale, {
            toValue: 1.5,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(pointsScale, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [points]);

  const handleSearchPress = () => {
    router.push('/search' as any);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>tunnel</Text>
        <View style={styles.rightHeader}>
          <Pressable 
            style={styles.searchContainer}
            onPress={handleSearchPress}
          >
            <Search size={20} color="#888" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search..."
              placeholderTextColor="#888"
              editable={false}
              pointerEvents="none"
            />
          </Pressable>
          <Animated.Text 
            style={[
              styles.points,
              {
                transform: [{ scale: pointsScale }],
                opacity: displayPoints === 0 ? 0.5 : 1
              }
            ]}
          >
            {displayPoints}p
          </Animated.Text>
        </View>
      </View>

      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, activeTab === 'videos' && styles.activeTab]}
          onPress={() => setActiveTab('videos')}
        >
          <Text style={[styles.tabText, activeTab === 'videos' && styles.activeTabText]}>
            Videos
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'feed' && styles.activeTab]}
          onPress={() => setActiveTab('feed')}
        >
          <Text style={[styles.tabText, activeTab === 'feed' && styles.activeTabText]}>
            Feed
          </Text>
        </Pressable>
      </View>

      <View style={[styles.contentContainer, { paddingBottom: 100 }]}>
        {activeTab === 'videos' ? (
          <VideoFeed />
        ) : (
          <Feed />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: 'black',
  },
  logo: {
    color: '#1877F2',
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
  },
  rightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 36,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    color: 'white',
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    width: 120,
    padding: 0,
  },
  points: {
    color: '#00ff00',
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    backgroundColor: 'black',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: 'white',
  },
  tabText: {
    color: '#888',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  activeTabText: {
    color: 'white',
  },
  contentContainer: {
    flex: 1, // Ensures VideoFeed takes up remaining space
  },
});