import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  Animated,
  StatusBar,
  Pressable,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { usePoints } from '@/hooks/usePoints';
import { 
  DollarSign,
  TrendingUp,
  Clock,
  Bell,
} from 'lucide-react-native';
import ScreenContainer from '../components/ScreenContainer';
import { useRouter } from 'expo-router';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Exchange rate: 100 points = $1
const EXCHANGE_RATE = 100;

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function PointsAboutScreen() {
  const { points, dailyPoints } = usePoints();
  const scrollY = useRef(new Animated.Value(0)).current;
  const cashAvailable = (points / EXCHANGE_RATE).toFixed(2);
  const router = useRouter();
  const unreadNotifications = 3; // This would normally come from a notifications context or API

  // Calculate max points for chart scaling
  const maxPoints = Math.max(...dailyPoints.map(day => day.points), 100); // minimum 100 for scale

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 50, 100],
    outputRange: [0, 0.5, 1],
    extrapolate: 'clamp',
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return DAYS[date.getDay()];
  };

  const renderEarningsChart = () => (
    <View style={styles.chartContainer}>
      <View style={styles.chartHeader}>
        <Text style={styles.chartTitle}>Points Earned This Week</Text>
        <Text style={styles.chartTotal}>
          Total: {dailyPoints.reduce((sum, day) => sum + day.points, 0)}
        </Text>
      </View>
      <View style={styles.chart}>
        {dailyPoints.map((data, index) => {
          const barHeight = (data.points / maxPoints) * 150;
          const isToday = new Date(data.date).toDateString() === new Date().toDateString();
          
          return (
            <View key={data.date} style={styles.barContainer}>
              <View style={styles.barWrapper}>
                <Animated.View 
                  style={[
                    styles.bar, 
                    { 
                      height: barHeight,
                      backgroundColor: isToday ? '#00ff00' : '#1877F2',
                    }
                  ]}
                >
                  <Text style={styles.barValue}>{data.points}</Text>
                </Animated.View>
                {isToday && <View style={styles.todayIndicator} />}
              </View>
              <Text style={[
                styles.barLabel,
                isToday && styles.todayLabel
              ]}>
                {formatDate(data.date)}
              </Text>
            </View>
          );
        })}
      </View>
      <View style={styles.chartGrid}>
        {[0, 1, 2, 3].map((line) => (
          <View 
            key={line} 
            style={[
              styles.gridLine,
              { bottom: (line * 150) / 3 }
            ]} 
          />
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Animated Header */}
      <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
        <BlurView intensity={100} style={StyleSheet.absoluteFill} />
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Points</Text>
          <Pressable 
            style={styles.notificationButton}
            onPress={() => {
              router.push('/screens/notifications');
            }}
          >
            <Bell color="#00ff00" size={24} />
            {unreadNotifications > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadNotifications}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={(event) => {
          const offsetY = event.nativeEvent.contentOffset.y;
          scrollY.setValue(offsetY);
        }}
        scrollEventThrottle={16}
        contentContainerStyle={{
          ...styles.scrollContent,
          paddingBottom: 120,
        }}
        bounces={false}
      >
        {/* Points Balance */}
        <View style={styles.balanceSection}>
          <Text style={styles.balanceLabel}>Available Points</Text>
          <Text style={styles.balanceValue}>{points}</Text>
          
          <Pressable 
            style={styles.notificationButtonLarge}
            onPress={() => {
              router.push('/screens/notifications');
            }}
          >
            <Bell color="#fff" size={20} style={styles.notificationIcon} />
            <Text style={styles.notificationButtonText}>View Notifications</Text>
          </Pressable>
        </View>

        {/* Exchange Rate Info */}
        <View style={styles.infoSection}>
          <View style={styles.exchangeInfo}>
            <View style={styles.exchangeRate}>
              <DollarSign color="#00ff00" size={24} />
              <Text style={styles.exchangeRateText}>
                {EXCHANGE_RATE} Points = $1
              </Text>
            </View>
            <Text style={styles.cashAvailable}>
              Cash value: ${cashAvailable}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.earningInfo}>
            <TrendingUp color="#1877F2" size={24} />
            <View style={styles.earningTextContainer}>
              <Text style={styles.earningTitle}>How to Earn Points</Text>
              <Text style={styles.earningDescription}>
                • Watch videos to halfway: +10 points{'\n'}
                • Read articles: +5 points{'\n'}
                • Daily login bonus: +20 points{'\n'}
                • Share content: +5 points
              </Text>
            </View>
          </View>
        </View>

        {/* Earnings Chart */}
        {renderEarningsChart()}

        {/* Additional Info */}
        <View style={styles.additionalInfo}>
          <Clock size={20} color="#888" />
          <Text style={styles.additionalInfoText}>
            Points are updated in real-time as you engage with content
          </Text>
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
  scrollContent: {
    paddingBottom: 40,
  },
  balanceSection: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 30,
  },
  balanceLabel: {
    color: '#888',
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    marginBottom: 5,
  },
  balanceValue: {
    color: '#00ff00',
    fontSize: 48,
    fontFamily: 'Inter_700Bold',
    marginBottom: 20,
  },
  infoSection: {
    backgroundColor: '#111',
    margin: 20,
    borderRadius: 15,
    padding: 20,
  },
  exchangeInfo: {
    marginBottom: 20,
  },
  exchangeRate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  exchangeRateText: {
    color: '#00ff00',
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
  },
  cashAvailable: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  divider: {
    height: 1,
    backgroundColor: '#222',
    marginVertical: 20,
  },
  earningInfo: {
    flexDirection: 'row',
    gap: 12,
  },
  earningTextContainer: {
    flex: 1,
  },
  earningTitle: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 8,
  },
  earningDescription: {
    color: '#888',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 22,
  },
  chartContainer: {
    margin: 20,
    backgroundColor: '#111',
    borderRadius: 15,
    padding: 20,
    position: 'relative',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  chartTitle: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
  },
  chartTotal: {
    color: '#00ff00',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 180,
    zIndex: 1,
  },
  chartGrid: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 40,
    height: 150,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  barContainer: {
    alignItems: 'center',
    flex: 1,
  },
  barWrapper: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 150,
  },
  bar: {
    width: 30,
    backgroundColor: '#1877F2',
    borderRadius: 15,
    justifyContent: 'flex-start',
    paddingTop: 8,
    minHeight: 30,
  },
  barValue: {
    color: 'white',
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
  },
  barLabel: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 8,
  },
  todayLabel: {
    color: '#00ff00',
    fontFamily: 'Inter_600SemiBold',
  },
  todayIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00ff00',
    position: 'absolute',
    bottom: -12,
  },
  additionalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
    backgroundColor: '#111',
    padding: 15,
    borderRadius: 12,
  },
  additionalInfoText: {
    color: '#888',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    flex: 1,
  },
  notificationButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#111',
    position: 'relative',
  },
  notificationButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1877F2',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    width: '80%',
    marginTop: 10,
  },
  notificationIcon: {
    marginRight: 8,
  },
  notificationButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FF3366',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#000',
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
  },
}); 