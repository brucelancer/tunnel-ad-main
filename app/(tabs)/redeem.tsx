import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Dimensions,
  StatusBar,
  Alert,
  TextInput,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { usePoints } from '@/hooks/usePoints';
import Animated, {
  useAnimatedStyle,
  interpolate,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { 
  Gift, 
  ChevronRight, 
  Ticket, 
  Coffee, 
  ShoppingBag, 
  Music2,
  Wallet,
} from 'lucide-react-native';
import GiftCardScreen from '../giftcard';
import WithdrawCashScreen from '../withdraw-cash';
import ScreenContainer from '../components/ScreenContainer';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Tab = 'giftcards' | 'withdraw';

function RedeemScreen() {
  const { points } = usePoints();
  const [activeTab, setActiveTab] = useState<Tab>('giftcards');
  const scrollY = useSharedValue(0);

  const headerOpacity = useAnimatedStyle(() => ({
    opacity: withTiming(interpolate(
      scrollY.value,
      [0, 50, 100],
      [0, 0.5, 1],
      'clamp'
    ), { duration: 200 }),
  }));

  const renderTab = (tab: Tab, icon: React.ReactNode, label: string) => (
    <Pressable
      style={[styles.tab, activeTab === tab && styles.activeTab]}
      onPress={() => setActiveTab(tab)}
    >
      {icon}
      <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
        {label}
      </Text>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <Animated.View style={[styles.header, headerOpacity]}>
        <BlurView intensity={100} style={StyleSheet.absoluteFill} />
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Redeem</Text>
        </View>
      </Animated.View>

      {/* Points Balance */}
      <View style={styles.balanceSection}>
        <Text style={styles.balanceLabel}>Available Points</Text>
        <Text style={styles.balanceValue}>{points}</Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabBar}>
        {renderTab(
          'giftcards',
          <Gift size={20} color={activeTab === 'giftcards' ? '#1877F2' : '#888'} />,
          'Gift Cards'
        )}
        {renderTab(
          'withdraw',
          <Wallet size={20} color={activeTab === 'withdraw' ? '#1877F2' : '#888'} />,
          'Withdraw'
        )}
      </View>

      {/* Tab Content */}
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={{ 
          ...styles.scrollContent,
          paddingBottom: 120 
        }}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'giftcards' ? <GiftCardScreen /> : <WithdrawCashScreen />}
      </ScrollView>
    </View>
  );
}

export default RedeemScreen;

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
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 10,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
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
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 15,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#111',
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeTab: {
    backgroundColor: 'rgba(24, 119, 242, 0.1)',
    borderColor: '#1877F2',
  },
  tabText: {
    color: '#888',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  activeTabText: {
    color: '#1877F2',
  },
  tabContent: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
}); 