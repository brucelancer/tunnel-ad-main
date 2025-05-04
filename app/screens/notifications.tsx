import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Dimensions, 
  TouchableOpacity, 
  Animated,
  Pressable,
  FlatList
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Bell, 
  Wallet, 
  Clock, 
  ChevronRight, 
  ArrowUpRight, 
  ArrowDownRight, 
  DollarSign,
  ChevronDown,
  Plus,
  Heart,
  MessageCircle
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
// Replace the import for usePoints with a local implementation
// import { usePoints } from '../hooks/usePoints';

// Mock implementation of usePoints hook
const usePoints = () => {
  return {
    points: 850,
    dailyPoints: [
      { date: '2023-06-01', points: 30 },
      { date: '2023-06-02', points: 45 },
      { date: '2023-06-03', points: 20 },
      { date: '2023-06-04', points: 65 },
      { date: '2023-06-05', points: 25 },
      { date: '2023-06-06', points: 10 },
      { date: '2023-06-07', points: 40 },
    ]
  };
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type NotificationType = 'points' | 'system' | 'social' | 'like' | 'comment';
type TabType = 'notifications' | 'history' | 'withdraw';

interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  time: string; // For backwards compatibility
  timestamp: Date; // Actual timestamp
  read: boolean;
}

interface PointsTransaction {
  id: number;
  type: 'earned' | 'used' | 'expired';
  amount: number;
  description: string;
  date: string;
}

interface WithdrawalMethod {
  id: string;
  name: string;
  icon: string;
  minAmount: number;
  processingTime: string;
}

// Format the timestamp into a readable format
const formatTimestamp = (timestamp: Date): string => {
  const now = new Date();
  const diff = now.getTime() - timestamp.getTime();
  
  // Less than 24 hours - show time only
  if (diff < 24 * 60 * 60 * 1000) {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } 
  // Less than a week - show day of week and time
  else if (diff < 7 * 24 * 60 * 60 * 1000) {
    return timestamp.toLocaleDateString([], { weekday: 'short' }) + ' ' + 
           timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } 
  // Older - show full date
  else {
    return timestamp.toLocaleDateString([], { 
      month: 'short', 
      day: 'numeric',
      year: timestamp.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    }) + ' ' + timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
};

// Function to get time ago string (for backwards compatibility)
const getTimeAgo = (timestamp: Date): string => {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - timestamp.getTime()) / 1000);
  
  if (seconds < 60) return 'Just now';
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  
  return `${Math.floor(days / 7)} weeks ago`;
};

export default function NotificationsScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('notifications');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const tabScrollX = useRef(new Animated.Value(0)).current;
  const { points } = usePoints();
  const router = useRouter();

  // Sample notifications data
  const notifications: Notification[] = [
    {
      id: 1,
      type: 'points',
      title: 'You earned 10 points!',
      message: 'You watched a video for more than 30 seconds.',
      time: '2 hours ago',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      read: false,
    },
    {
      id: 2,
      type: 'system',
      title: 'New feature available',
      message: 'Check out our new tunnelling feature to create your own content.',
      time: '1 day ago',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      read: true,
    },
    {
      id: 3,
      type: 'social',
      title: 'Your friend joined Tunnel',
      message: 'John Doe just joined Tunnel. Say hello!',
      time: '2 days ago',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      read: true,
    },
    {
      id: 4,
      type: 'like',
      title: 'Someone liked your video',
      message: 'Alice Smith liked your video "Street Dance Performance"',
      time: '3 days ago',
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      read: true,
    },
    {
      id: 5,
      type: 'comment',
      title: 'New comment on your video',
      message: 'Bob Johnson commented: "Amazing performance! How long did you practice?"',
      time: '1 week ago',
      timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
      read: true,
    },
  ];

  // Sample points history data
  const pointsHistory: PointsTransaction[] = [
    {
      id: 1,
      type: 'earned',
      amount: 10,
      description: 'Watched video: "Street Dance Performance"',
      date: '2 hours ago',
    },
    {
      id: 2,
      type: 'earned',
      amount: 20,
      description: 'Daily login bonus',
      date: '1 day ago',
    },
    {
      id: 3,
      type: 'used',
      amount: 500,
      description: 'Redeemed for $5 gift card',
      date: '3 days ago',
    },
    {
      id: 4,
      type: 'earned',
      amount: 5,
      description: 'Liked a video',
      date: '3 days ago',
    },
    {
      id: 5,
      type: 'earned',
      amount: 100,
      description: 'Friend referral: Sarah joined',
      date: '1 week ago',
    },
    {
      id: 6,
      type: 'earned',
      amount: 50,
      description: '7-day streak bonus',
      date: '1 week ago',
    },
    {
      id: 7,
      type: 'expired',
      amount: 30,
      description: 'Promotional points expired',
      date: '2 weeks ago',
    },
  ];

  // Sample withdrawal methods
  const withdrawalMethods: WithdrawalMethod[] = [
    {
      id: 'paypal',
      name: 'PayPal',
      icon: '$',
      minAmount: 500,
      processingTime: '1-2 business days',
    },
    {
      id: 'giftcard',
      name: 'Gift Cards',
      icon: 'G',
      minAmount: 300,
      processingTime: 'Instant',
    },
    {
      id: 'bank',
      name: 'Bank Transfer',
      icon: 'B',
      minAmount: 1000,
      processingTime: '3-5 business days',
    },
  ];

  // FAQ items for withdrawal
  const faqItems = [
    {
      id: 1,
      question: 'How many points do I need to withdraw?',
      answer: 'The minimum withdrawal amount depends on the method you choose. PayPal requires 500 points ($5), gift cards start at 300 points ($3), and bank transfers require 1000 points ($10).',
    },
    {
      id: 2,
      question: 'How long does withdrawal processing take?',
      answer: 'Processing times vary by method: Gift cards are usually instant, PayPal takes 1-2 business days, and bank transfers can take 3-5 business days.',
    },
    {
      id: 3,
      question: 'Can I cancel a withdrawal request?',
      answer: 'You can cancel a withdrawal request if it\'s still in "Processing" status. Once it\'s marked as "Completed," it cannot be reversed.',
    },
  ];

  const renderNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'points':
        return (
          <LinearGradient
            colors={['#00ff00', '#00cc00']}
            style={styles.iconContainer}
          >
            <Text style={styles.iconText}>P</Text>
          </LinearGradient>
        );
      case 'system':
        return (
          <LinearGradient
            colors={['#1877F2', '#0A5DC2']}
            style={styles.iconContainer}
          >
            <Text style={styles.iconText}>S</Text>
          </LinearGradient>
        );
      case 'social':
        return (
          <LinearGradient
            colors={['#FF3366', '#FF0066']}
            style={styles.iconContainer}
          >
            <Text style={styles.iconText}>@</Text>
          </LinearGradient>
        );
      case 'like':
        return (
          <LinearGradient
            colors={['#FF3366', '#FF0066']}
            style={styles.iconContainer}
          >
            <Heart size={16} color="white" />
          </LinearGradient>
        );
      case 'comment':
        return (
          <LinearGradient
            colors={['#1877F2', '#0A5DC2']}
            style={styles.iconContainer}
          >
            <MessageCircle size={16} color="white" />
          </LinearGradient>
        );
      default:
        return (
          <View style={[styles.iconContainer, { backgroundColor: '#555' }]}>
            <Text style={styles.iconText}>N</Text>
          </View>
        );
    }
  };

  const renderPointsHistoryItem = ({ item }: { item: PointsTransaction }) => {
    const isEarned = item.type === 'earned';
    const isExpired = item.type === 'expired';
    
    return (
      <View style={styles.historyItem}>
        <View style={[
          styles.historyIconContainer,
          isEarned ? styles.earnedIcon : isExpired ? styles.expiredIcon : styles.usedIcon
        ]}>
          {isEarned ? (
            <ArrowUpRight size={16} color="white" />
          ) : isExpired ? (
            <Clock size={16} color="white" />
          ) : (
            <ArrowDownRight size={16} color="white" />
          )}
        </View>
        
        <View style={styles.historyContent}>
          <Text style={styles.historyDescription}>{item.description}</Text>
          <Text style={styles.historyDate}>{item.date}</Text>
        </View>
        
        <Text style={[
          styles.historyAmount,
          isEarned ? styles.earnedAmount : isExpired ? styles.expiredAmount : styles.usedAmount
        ]}>
          {isEarned ? '+' : '-'}{item.amount}
        </Text>
      </View>
    );
  };

  const renderWithdrawalMethod = (method: WithdrawalMethod) => (
    <TouchableOpacity 
      key={method.id} 
      style={styles.withdrawalMethod}
      activeOpacity={0.7}
    >
      <View style={styles.withdrawalMethodIcon}>
        <Text style={styles.withdrawalMethodIconText}>{method.icon}</Text>
      </View>
      <View style={styles.withdrawalMethodContent}>
        <Text style={styles.withdrawalMethodName}>{method.name}</Text>
        <Text style={styles.withdrawalMethodDetails}>
          Min: {method.minAmount} points • {method.processingTime}
        </Text>
      </View>
      <ChevronRight size={20} color="#777" />
    </TouchableOpacity>
  );

  const renderFaqItem = (item: typeof faqItems[0]) => {
    const isExpanded = expandedFaq === item.id;
    
    return (
      <Pressable 
        key={item.id} 
        style={styles.faqItem}
        onPress={() => setExpandedFaq(isExpanded ? null : item.id)}
      >
        <View style={styles.faqHeader}>
          <Text style={styles.faqQuestion}>{item.question}</Text>
          <ChevronDown size={20} color="#777" style={[
            styles.faqIcon,
            isExpanded && styles.faqIconExpanded
          ]} />
        </View>
        
        {isExpanded && (
          <Text style={styles.faqAnswer}>{item.answer}</Text>
        )}
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <BlurView intensity={80} style={StyleSheet.absoluteFill} />
        <Text style={styles.headerTitle}>Activity Center</Text>
      </View>

      {/* Points Summary */}
      <View style={styles.pointsSummary}>
        <LinearGradient
          colors={['#171717', '#222']}
          style={styles.pointsSummaryGradient}
        >
          <View style={styles.pointsSummaryContent}>
            <View style={styles.pointsCircle}>
              <Text style={styles.pointsAmount}>{points}</Text>
              <Text style={styles.pointsLabel}>POINTS</Text>
            </View>
            <View style={styles.pointsActions}>
              <TouchableOpacity 
                style={styles.pointsActionButton}
                onPress={() => setActiveTab('history')}
              >
                <Clock size={18} color="#1877F2" />
                <Text style={styles.pointsActionText}>History</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.pointsActionButton}
                onPress={() => setActiveTab('withdraw')}
              >
                <Wallet size={18} color="#1877F2" />
                <Text style={styles.pointsActionText}>Withdraw</Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'notifications' && styles.activeTab]} 
          onPress={() => setActiveTab('notifications')}
        >
          <Bell size={16} color={activeTab === 'notifications' ? "#1877F2" : "#777"} />
          <Text style={[styles.tabText, activeTab === 'notifications' && styles.activeTabText]}>
            Notifications
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'history' && styles.activeTab]} 
          onPress={() => setActiveTab('history')}
        >
          <Clock size={16} color={activeTab === 'history' ? "#1877F2" : "#777"} />
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
            Points History
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'withdraw' && styles.activeTab]} 
          onPress={() => setActiveTab('withdraw')}
        >
          <Wallet size={16} color={activeTab === 'withdraw' ? "#1877F2" : "#777"} />
          <Text style={[styles.tabText, activeTab === 'withdraw' && styles.activeTabText]}>
            Withdraw
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <View style={styles.tabContent}>
        {activeTab === 'notifications' && (
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <View 
                style={[
                  styles.notificationItem,
                  !item.read && styles.unreadNotification
                ]}
              >
                {renderNotificationIcon(item.type)}
                <View style={styles.notificationContent}>
                  <Text style={styles.notificationTitle}>{item.title}</Text>
                  <Text style={styles.notificationMessage}>{item.message}</Text>
                  <View style={styles.timeContainer}>
                    <Text style={styles.notificationTime}>{formatTimestamp(item.timestamp)}</Text>
                    <Text style={styles.relativeTime}>({getTimeAgo(item.timestamp)})</Text>
                  </View>
                </View>
                {!item.read && <View style={styles.unreadDot} />}
              </View>
            )}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          />
        )}
        
        {activeTab === 'history' && (
          <FlatList
            data={pointsHistory}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderPointsHistoryItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <View style={styles.historyHeader}>
                <Text style={styles.historyHeaderTitle}>Recent Activity</Text>
                <Text style={styles.historyHeaderSubtitle}>
                  View your point transactions
                </Text>
              </View>
            }
          />
        )}
        
        {activeTab === 'withdraw' && (
          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.withdrawContent}
          >
            <View style={styles.withdrawBalanceContainer}>
              <LinearGradient
                colors={['#1a4a9e', '#1877F2']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={styles.withdrawBalanceGradient}
              >
                <View style={styles.withdrawBalanceContent}>
                  <View>
                    <Text style={styles.withdrawBalanceLabel}>Available to Withdraw</Text>
                    <Text style={styles.withdrawBalanceValue}>${(points / 100).toFixed(2)}</Text>
                    <Text style={styles.withdrawBalancePoints}>{points} points</Text>
                  </View>
                  <TouchableOpacity style={styles.withdrawButton}>
                    <DollarSign size={18} color="#1877F2" />
                    <Text style={styles.withdrawButtonText}>Withdraw</Text>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>
            
            <Text style={styles.sectionTitle}>Withdrawal History</Text>
            <View style={styles.withdrawalMethodsContainer}>
              {withdrawalMethods.map(renderWithdrawalMethod)}
            </View>
            
            <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
            <View style={styles.faqContainer}>
              {faqItems.map(renderFaqItem)}
            </View>
            
            <TouchableOpacity style={styles.supportButton}>
              <Text style={styles.supportButtonText}>Contact Support</Text>
            </TouchableOpacity>
          </ScrollView>
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
    height: 90,
    justifyContent: 'flex-end',
    paddingBottom: 10,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
  },
  pointsSummary: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  pointsSummaryGradient: {
    padding: 16,
  },
  pointsSummaryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pointsCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1E1E1E',
    borderWidth: 3,
    borderColor: '#1877F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointsAmount: {
    color: '#00ff00',
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
  },
  pointsLabel: {
    color: '#888',
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
    marginTop: 2,
  },
  pointsActions: {
    flexDirection: 'row',
    gap: 12,
  },
  pointsActionButton: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  pointsActionText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  tabContainer: {
    flexDirection: 'row',
    marginTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#1877F2',
  },
  tabText: {
    color: '#777',
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  activeTabText: {
    color: '#1877F2',
    fontFamily: 'Inter_600SemiBold',
  },
  tabContent: {
    flex: 1,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    backgroundColor: '#111',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
  },
  unreadNotification: {
    backgroundColor: '#1A1A1A',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 4,
  },
  notificationMessage: {
    color: '#CCC',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginBottom: 8,
  },
  notificationTime: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  relativeTime: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginLeft: 6,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1877F2',
    alignSelf: 'center',
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 120,
  },
  historyHeader: {
    padding: 16,
    paddingBottom: 8,
  },
  historyHeaderTitle: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    marginBottom: 4,
  },
  historyHeaderSubtitle: {
    color: '#888',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  historyItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#111',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  historyIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  earnedIcon: {
    backgroundColor: '#00AA00',
  },
  usedIcon: {
    backgroundColor: '#1877F2',
  },
  expiredIcon: {
    backgroundColor: '#888',
  },
  historyContent: {
    flex: 1,
  },
  historyDescription: {
    color: 'white',
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    marginBottom: 4,
  },
  historyDate: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  historyAmount: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
  earnedAmount: {
    color: '#00ff00',
  },
  usedAmount: {
    color: '#1877F2',
  },
  expiredAmount: {
    color: '#888',
  },
  withdrawContent: {
    padding: 16,
    paddingBottom: 120,
  },
  withdrawBalanceContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  withdrawBalanceGradient: {
    padding: 20,
  },
  withdrawBalanceContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  withdrawBalanceLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginBottom: 4,
  },
  withdrawBalanceValue: {
    color: 'white',
    fontSize: 32,
    fontFamily: 'Inter_700Bold',
    marginBottom: 4,
  },
  withdrawBalancePoints: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  withdrawButton: {
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  withdrawButtonText: {
    color: '#1877F2',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  sectionTitle: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 16,
  },
  withdrawalMethodsContainer: {
    backgroundColor: '#111',
    borderRadius: 12,
    marginBottom: 24,
  },
  withdrawalMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  withdrawalMethodIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1877F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  withdrawalMethodIconText: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  withdrawalMethodContent: {
    flex: 1,
  },
  withdrawalMethodName: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 2,
  },
  withdrawalMethodDetails: {
    color: '#888',
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  faqContainer: {
    backgroundColor: '#111',
    borderRadius: 12,
    marginBottom: 24,
  },
  faqItem: {
    padding: 16,
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
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    flex: 1,
    paddingRight: 16,
  },
  faqIcon: {
    transform: [{ rotate: '0deg' }],
  },
  faqIconExpanded: {
    transform: [{ rotate: '180deg' }],
  },
  faqAnswer: {
    color: '#BBB',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  supportButton: {
    backgroundColor: 'rgba(24, 119, 242, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(24, 119, 242, 0.3)',
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  supportButtonText: {
    color: '#1877F2',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
}); 