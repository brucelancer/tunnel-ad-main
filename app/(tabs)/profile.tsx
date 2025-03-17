import React, { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import ScreenContainer from '../components/ScreenContainer';
import AuthScreen from '../components/AuthScreen';

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

  // Listen for auth state changes
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('AUTH_STATE_CHANGED', (event) => {
      if (event?.isAuthenticated !== undefined) {
        setIsAuthenticated(event.isAuthenticated);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

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

  const handleLogout = () => {
    // Emit auth state change event
    DeviceEventEmitter.emit('AUTH_STATE_CHANGED', { isAuthenticated: false });
  };

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

  // If not authenticated, show the auth screen
  if (!isAuthenticated) {
    return <AuthScreen onAuthenticated={() => setIsAuthenticated(true)} />;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Animated Header */}
      <Animated.View style={[
        styles.header,
        {
          opacity: headerOpacity,
          transform: [{ translateY: headerTranslate }]
        }
      ]}>
        <BlurView intensity={100} style={StyleSheet.absoluteFill} />
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Profile</Text>
          <Pressable
            style={styles.settingsButton}
            onPress={handleNavigateToSettings}
            hitSlop={20}
          >
            <Settings color="white" size={24} />
          </Pressable>
        </View>
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <Image
            source={{ uri: 'https://randomuser.me/api/portraits/men/32.jpg' }}
            style={styles.profileImage}
          />
          <Text style={styles.profileName}>John Doe</Text>
          <Text style={styles.profileUsername}>@johndoe</Text>
          
          <View style={styles.pointsContainer}>
            <Text style={styles.pointsLabel}>Your Points</Text>
            <Animated.Text
              style={[
                styles.pointsValue,
                { transform: [{ scale: scaleAnim }] }
              ]}
            >
              {displayPoints}
            </Animated.Text>
          </View>
        </View>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <View style={styles.statsRow}>
            {renderStatCard(
              <Award color="#0070F3" size={24} />,
              'Badges',
              '4'
            )}
            {renderStatCard(
              <Clock color="#0070F3" size={24} />,
              'Days Active',
              '12'
            )}
          </View>
          <View style={styles.statsRow}>
            {renderStatCard(
              <Heart color="#0070F3" size={24} />,
              'Likes Given',
              '27'
            )}
            {renderStatCard(
              <BarChart2 color="#0070F3" size={24} />,
              'Rank',
              'Gold'
            )}
          </View>
        </View>

        {/* Badges Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Badges</Text>
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
        </View>

        {/* Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <View style={styles.settingsContainer}>
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

        {/* Contact Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <View style={styles.contactContainer}>
            <View key="email" style={styles.contactItem}>
              <Mail color="#0070F3" size={20} />
              <Text style={styles.contactText}>john.doe@example.com</Text>
            </View>
            <View key="phone" style={styles.contactItem}>
              <Phone color="#0070F3" size={20} />
              <Text style={styles.contactText}>+1 (555) 123-4567</Text>
            </View>
            <View key="location" style={styles.contactItem}>
              <MapPin color="#0070F3" size={20} />
              <Text style={styles.contactText}>San Francisco, CA</Text>
            </View>
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
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#1877F2',
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
  contactText: {
    color: '#888',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginLeft: 10,
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
});