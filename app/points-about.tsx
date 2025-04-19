import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  Animated,
  StatusBar,
} from 'react-native';
import { BlurView } from 'expo-blur';
import {BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { usePoints } from '@/hooks/usePoints';
import { 
  DollarSign,
  TrendingUp,
  Clock,
  ArrowLeft
} from 'lucide-react-native';
import { useRouter } from 'expo-router';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Exchange rate: 100 points = $1
const EXCHANGE_RATE = 100;

const EARNINGS_DATA = [
  { day: 'Mon', points: 150 },
  { day: 'Tue', points: 300 },
  { day: 'Wed', points: 200 },
  { day: 'Thu', points: 450 },
  { day: 'Fri', points: 280 },
  { day: 'Sat', points: 600 },
  { day: 'Sun', points: 350 },
];

export default function PointsAboutScreen() {
  const { points } = usePoints();
  const router = useRouter();
  const scrollY = useRef(new Animated.Value(0)).current;
  const maxPoints = Math.max(...EARNINGS_DATA.map(data => data.points));
  const cashAvailable = (points / EXCHANGE_RATE).toFixed(2);

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 50, 100],
    outputRange: [0, 0.5, 1],
    extrapolate: 'clamp',
  });

  const renderEarningsChart = () => (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Points Earned This Week</Text>
      <View style={styles.chart}>
        {EARNINGS_DATA.map((data, index) => {
          const barHeight = (data.points / maxPoints) * 150;
          return (
            <View key={data.day} style={styles.barContainer}>
              <View style={[styles.bar, { height: barHeight }]}>
                <Text style={styles.barValue}>{data.points}</Text>
              </View>
              <Text style={styles.barLabel}>{data.day}</Text>
            </View>
          );
        })}
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
          <ArrowLeft 
            color="white" 
            size={24} 
            style={styles.backButton}
            onPress={() => router.back()}
          />
          <Text style={styles.headerTitle}>Points</Text>
          <View style={styles.placeholder} />
        </View>
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={(event) => {
          const offsetY = event.nativeEvent.contentOffset.y;
          scrollY.setValue(offsetY);
        }}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
        bounces={false}
      >
        {/* Points Balance */}
        <View style={styles.balanceSection}>
          <Text style={styles.balanceLabel}>Available Points</Text>
          <Text style={styles.balanceValue}>{points}</Text>
        </View>
          <BannerAd
          unitId={TestIds.BANNER}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          requestOptions={{
            requestNonPersonalizedAdsOnly: true,
            networkExtras: {
              collapsible: "bottom",
            },
          }}
          
          />
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
    paddingTop: 40,
  },
  backButton: {
    padding: 8,
  },
  placeholder: {
    width: 40,
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
  },
  chartTitle: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 20,
  },
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 180,
  },
  barContainer: {
    alignItems: 'center',
    flex: 1,
  },
  bar: {
    width: 30,
    backgroundColor: '#1877F2',
    borderRadius: 15,
    justifyContent: 'flex-start',
    paddingTop: 8,
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
}); 