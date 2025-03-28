import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Image,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  TouchableOpacity,
  Platform,
  StatusBar
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSanityAuth } from '../hooks/useSanityAuth';
import { getSanityClient, urlFor } from '@/tunnel-ad-main/services/postService';
import { Search, User, CheckCheck, Settings, Plus, Video, Phone } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';

// Tunnel verification mark component
const TunnelVerifiedMark = ({ size = 10 }) => (
  <Svg width={size * 1.5} height={size * 1.5} viewBox="0 0 24 24" fill="none">
    <Path 
      d="M12 2L14 5.1L17.5 3.5L17 7.3L21 8L18.9 11L21 14L17 14.7L17.5 18.5L14 16.9L12 20L10 16.9L6.5 18.5L7 14.7L3 14L5.1 11L3 8L7 7.3L6.5 3.5L10 5.1L12 2Z" 
      fill="#1877F2" 
    />
    <Path 
      d="M10 13.17l-2.59-2.58L6 12l4 4 8-8-1.41-1.42L10 13.17z" 
      fill="#FFFFFF" 
      strokeWidth="0"
    />
  </Svg>
);

// Types
interface Conversation {
  _id: string;
  participants: Array<{
    _id: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
    isVerified?: boolean;
    isBlueVerified?: boolean;
    isOnline?: boolean;
  }>;
  lastMessage?: {
    _id?: string;
    text: string;
    sender?: { _id: string };
    _createdAt: string;
    seen?: boolean;
  };
  unreadCount?: {
    user1?: number;
    user2?: number;
  };
  _createdAt: string;
  _updatedAt: string;
}

interface UserContact {
  _id: string;
  name?: string;
  username?: string;
  profile?: {
    avatar?: string;
  };
  isOnline?: boolean;
  isVerified?: boolean;
  isBlueVerified?: boolean;
}

// Direct message interface
interface DirectMessage {
  _id: string;
  text: string;
  _createdAt: string;
  sender: {
    _ref: string;
    _id?: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
    isVerified?: boolean;
    isBlueVerified?: boolean;
  };
  recipient: {
    _ref: string;
    _id?: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
    isVerified?: boolean;
    isBlueVerified?: boolean;
  };
  seen?: boolean;
}

interface MessagePartner {
  otherUserId: string;
  _createdAt: string;
}

export default function ConversationsMainScreen() {
  const router = useRouter();
  const { user: currentUser } = useSanityAuth();
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('Conversations');
  const [recentContacts, setRecentContacts] = useState<UserContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  
  // Load conversations
  const loadConversations = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    
    try {
      const client = getSanityClient();
      if (!client) {
        setLoading(false);
        setRefreshing(false);
        return;
      }
      
      // Fetch conversations where the current user is a participant
      const fetchedConversations = await client.fetch(`
        *[_type == "conversation" && references($userId)] {
          _id,
          participants[]->{
            _id,
            username,
            firstName,
            lastName,
            "avatar": profile.avatar,
            "isVerified": username == "tunnelmoney",
            "isBlueVerified": username == "tunnelmoney" || username == "tunnelapp"
          },
          "lastMessage": *[_type == "message" && references(^._id)] | order(_createdAt desc)[0] {
            _id,
            text,
            _createdAt,
            sender->{_id},
            seen
          },
          "unreadCount": {
            "user1": count(*[_type == "message" && references(^._id) && recipient._ref == $userId && !seen]),
            "user2": count(*[_type == "message" && references(^._id) && sender._ref == $userId && !seen])
          },
          _createdAt,
          _updatedAt
        } | order(_updatedAt desc)
      `, { userId: currentUser?._id || '' });
      
      console.log(`Loaded ${fetchedConversations.length} conversations`);
      
      // Fetch direct messages that might not be part of a conversation
      const directMessages = await client.fetch(`
        *[_type == "message" && (sender._ref == $userId || recipient._ref == $userId) && !defined(conversation)] {
          _id,
          text,
          _createdAt,
          sender->{
            _id,
            username,
            firstName,
            lastName,
            "avatar": profile.avatar,
            "isVerified": username == "tunnelmoney",
            "isBlueVerified": username == "tunnelmoney" || username == "tunnelapp"
          },
          recipient->{
            _id,
            username,
            firstName,
            lastName,
            "avatar": profile.avatar,
            "isVerified": username == "tunnelmoney",
            "isBlueVerified": username == "tunnelmoney" || username == "tunnelapp"
          },
          seen
        } | order(_createdAt desc)
      `, { userId: currentUser?._id || '' });
      
      console.log(`Loaded ${directMessages?.length || 0} direct messages`);
      
      // Convert direct messages to conversation-like format
      const messageConversations = directMessages?.reduce((acc: Conversation[], message: DirectMessage) => {
        // Create a unique ID for this "conversation"
        const otherUser = message.sender?._id === currentUser?._id ? message.recipient : message.sender;
        if (!otherUser?._id || !currentUser?._id) return acc; // Skip if we can't create a valid ID
        
        const conversationId = `dm-${currentUser?._id}-${otherUser?._id}`;
        
        // Check if we already added this conversation
        const existingIndex = acc.findIndex((c: Conversation) => c._id === conversationId);
        
        if (existingIndex >= 0) {
          // Update existing if the message is newer
          const existing = acc[existingIndex];
          if (!existing.lastMessage || new Date(message._createdAt) > new Date(existing.lastMessage._createdAt)) {
            existing.lastMessage = {
              _id: message._id,
              text: message.text,
              _createdAt: message._createdAt,
              sender: { _id: message.sender?._id || '' },
              seen: message.seen
            };
          }
          return acc;
        }
        
        // Create a new conversation-like object
        acc.push({
          _id: conversationId,
          participants: [
            {
              _id: currentUser?._id || '',
              username: currentUser?.username || '',
              firstName: currentUser?.firstName || '',
              lastName: currentUser?.lastName || '',
              avatar: currentUser?.profile?.avatar,
              isVerified: currentUser?.username === "tunnelmoney",
              isBlueVerified: currentUser?.username === "tunnelmoney" || currentUser?.username === "tunnelapp",
              isOnline: true
            },
            {
              _id: otherUser?._id || '',
              username: otherUser?.username || '',
              firstName: otherUser?.firstName || '',
              lastName: otherUser?.lastName || '',
              avatar: otherUser?.avatar,
              isVerified: otherUser?.isVerified,
              isBlueVerified: otherUser?.isBlueVerified,
              isOnline: Math.random() > 0.5 // Demo purposes only, replace with actual online status
            }
          ],
          lastMessage: {
            _id: message._id,
            text: message.text,
            _createdAt: message._createdAt,
            sender: { _id: message.sender?._id || '' },
            seen: message.seen
          },
          unreadCount: {
            user1: message.recipient?._id === currentUser?._id && !message.seen ? 1 : 0,
            user2: message.sender?._id === currentUser?._id && !message.seen ? 1 : 0
          },
          _createdAt: message._createdAt,
          _updatedAt: message._createdAt
        });
        return acc;
      }, []) || [];
      
      // Combine both sources and sort by updatedAt
      const allConversations = [
        ...(fetchedConversations || []),
        ...(messageConversations || [])
      ].sort((a, b) => new Date(b._updatedAt).getTime() - new Date(a._updatedAt).getTime());
      
      // Filter out duplicates based on participants
      const uniqueConversations = allConversations.filter((conversation, index, self) => {
        const otherUser = getOtherUser(conversation);
        const firstIndex = self.findIndex(c => getOtherUser(c)._id === otherUser._id);
        return firstIndex === index;
      });
      
      setConversations(uniqueConversations || []);
      
      // Also fetch recent contacts for quick access
      await loadRecentContacts();
      
      // Process unread messages for notifications
      processUnreadMessages(uniqueConversations, setTotalUnreadCount);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Load recent contacts
  const loadRecentContacts = async () => {
    try {
      setLoadingContacts(true);
      if (!currentUser?._id) return;
      
      const client = getSanityClient();
      if (!client) return;
      
      // Find users who have exchanged messages with the current user
      const messagePartners = await client.fetch(`
        *[_type == "message" && (sender._ref == $userId || recipient._ref == $userId)] {
          "otherUserId": select(
            sender._ref == $userId => recipient._ref,
            recipient._ref == $userId => sender._ref
          ),
          _createdAt
        } | order(_createdAt desc)
      `, { userId: currentUser?._id || '' });
      
      // Get unique user IDs from message partners
      const uniqueUserIds = [...new Set(messagePartners.map((msg: MessagePartner) => msg.otherUserId))].slice(0, 10);
      
      if (uniqueUserIds.length === 0) {
        // Fallback to recent users if no message partners found
        const recentUsers = await client.fetch(`
          *[_type == "user" && _id != $userId][0...10] {
            _id,
            username,
            firstName,
            lastName,
            "profile": {
              "avatar": profile.avatar
            },
            "isVerified": username == "tunnelmoney",
            "isBlueVerified": username == "tunnelmoney" || username == "tunnelapp",
            "avatar": profile.avatar,
            "isVerified": username == "admin" || username == "moderator",
            "isBlueVerified": isBlueVerified,
            "isOnline": coalesce(isOnline, false)
          }
        `, { userId: currentUser._id });
        
        setRecentContacts(recentUsers || []);
        return;
      }
      
      // Fetch user details for the message partners
      const partnerDetails = await client.fetch(`
        *[_type == "user" && _id in $userIds] {
          _id,
          username,
          firstName,
          lastName,
          "profile": {
            "avatar": profile.avatar
          },
          "isVerified": username == "tunnelmoney",
          "isBlueVerified": username == "tunnelmoney" || username == "tunnelapp",
          "isOnline": coalesce(isOnline, false)
        }
      `, { userIds: uniqueUserIds });
      
      setRecentContacts(partnerDetails || []);
    } catch (error) {
      console.error('Error loading recent contacts:', error);
    } finally {
      setLoadingContacts(false);
    }
  };
  
  // Initial load
  useEffect(() => {
    loadConversations();
    
    // Listen for new messages in real-time
    const client = getSanityClient();
    if (client && currentUser) {
      const subscription = client
        .listen('*[_type == "conversation" && references($userId)]', { userId: currentUser._id })
        .subscribe(() => {
          // Refresh the conversation list when a change occurs
          loadConversations();
        });
      
      return () => subscription.unsubscribe();
    }
  }, [currentUser]);
  
  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    loadConversations();
  };
  
  // Calculate time ago
  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) {
      return 'Just now';
    }
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes}m ago`;
    }
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours}h ago`;
    }
    
    const days = Math.floor(hours / 24);
    if (days < 7) {
      return `${days}d ago`;
    }
    
    // If older than a week, show the date
    return date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric' 
    });
  };
  
  // Get the other user in conversation (not the current user)
  const getOtherUser = (conversation: Conversation) => {
    if (!currentUser || !currentUser._id) return conversation.participants[0];
    return conversation.participants.find(p => p._id !== currentUser._id) || conversation.participants[0];
  };
  
  // Get user's display name
  const getUserDisplayName = (user: UserContact | null): string => {
    if (!user) return "Unknown User";
    return user.name || user.username || "Unknown User";
  };
  
  // Get unread count for current user
  const getUnreadCount = (conversation: Conversation): number => {
    if (!conversation.unreadCount) return 0;
    if (!currentUser) return 0;
    
    // Find which user position the current user is in
    const isUser1 = conversation.participants[0]?._id === currentUser._id;
    return isUser1 ? conversation.unreadCount.user1 || 0 : conversation.unreadCount.user2 || 0;
  };
  
  // Get total unread count across all conversations
  const getTotalUnreadCount = () => {
    if (!conversations.length) return 0;
    return conversations.reduce((total, conv) => total + getUnreadCount(conv), 0);
  };
  
  // Navigate to chat
  const handleChatPress = (conversation: Conversation) => {
    const otherUser = getOtherUser(conversation);
    router.push({
      pathname: "/chat" as any,
      params: { id: otherUser._id }
    });
  };

  // Start chat with a contact
  const handleContactPress = (user: UserContact) => {
    router.push({
      pathname: "/chat" as any,
      params: { id: user._id }
    });
  };
  
  // Navigate to video call
  const handleVideoCall = (user: UserContact) => {
    // Implement video call functionality
    alert(`Video call with ${getUserDisplayName(user)} coming soon!`);
  };
  
  // Navigate to audio call
  const handleAudioCall = (user: UserContact) => {
    // Implement audio call functionality
    alert(`Audio call with ${getUserDisplayName(user)} coming soon!`);
  };
  
  // New message
  const handleNewMessage = () => {
    // Navigate to user list/contacts screen
    router.push({
      pathname: "/screens/user-list" as any,
      params: { action: "message" }
    });
  };
  
  // Handle tab change
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    
    // Navigate to appropriate screens based on tab
    if (tab === 'Videos') {
      router.push("/redeem" as any);
    } else if (tab === 'Feed') {
      router.push("/" as any);
    }
  };
  
  // Render a conversation list item
  const renderConversationItem = ({ item }: { item: Conversation }) => {
    const otherUser = getOtherUser(item);
    const unreadCount = getUnreadCount(item);
    const isLastMessageFromUser = item.lastMessage?.sender?._id === currentUser?._id;
    
    return (
      <Pressable
        style={styles.conversationItem}
        onPress={() => handleChatPress(item)}
      >
        {/* User avatar */}
        <View style={styles.avatarContainer}>
          {otherUser.avatar ? (
            <Image
              source={{ 
                uri: typeof otherUser.avatar === 'string' 
                  ? otherUser.avatar 
                  : urlFor(otherUser.avatar).url()
              }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, styles.noAvatar]}>
              <User size={20} color="#fff" />
            </View>
          )}
          {otherUser.isOnline && (
            <View style={styles.onlineIndicator} />
          )}
        </View>
        
        {/* Message content */}
        <View style={styles.messageContent}>
          <View style={styles.messageHeader}>
            <View style={styles.nameContainer}>
              <Text 
                style={[
                  styles.userName, 
                  unreadCount > 0 && styles.unreadUserName
                ]}
                numberOfLines={1}
              >
                {getUserDisplayName(otherUser)}
              </Text>
              {otherUser.isVerified && (
                <TunnelVerifiedMark size={12} />
              )}
            </View>
            
            <Text style={styles.timeAgo}>
              {item.lastMessage ? getTimeAgo(item.lastMessage._createdAt) : ''}
            </Text>
          </View>
          
          <View style={styles.messagePreviewContainer}>
            <Text 
              style={[
                styles.messagePreview,
                unreadCount > 0 && styles.unreadMessagePreview
              ]}
              numberOfLines={1}
            >
              {isLastMessageFromUser && (
                <Text style={styles.youText}>You: </Text>
              )}
              {item.lastMessage?.text || 'Start a conversation'}
            </Text>
            
            <View style={styles.messageStatus}>
              {isLastMessageFromUser && item.lastMessage?.seen && (
                <CheckCheck size={16} color="#1877F2" />
              )}
              
              {unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadCount}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </Pressable>
    );
  };
  
  // Render a recent contact item
  const renderRecentContactItem = ({ item }: { item: UserContact }) => {
    return (
      <View style={styles.contactItem}>
        <TouchableOpacity
          style={styles.contactAvatarContainer}
          onPress={() => handleContactPress(item)}
        >
          {item.profile?.avatar ? (
            <Image
              source={{ 
                uri: typeof item.profile.avatar === 'string' 
                  ? item.profile.avatar 
                  : urlFor(item.profile.avatar).url()
              }}
              style={styles.contactAvatar}
            />
          ) : (
            <View style={[styles.contactAvatar, styles.noContactAvatar]}>
              <User size={16} color="#fff" />
            </View>
          )}
          {item.isOnline && (
            <View style={styles.contactOnlineIndicator} />
          )}
        </TouchableOpacity>
        
        <Text 
          style={styles.contactName}
          numberOfLines={1}
        >
          {getUserDisplayName(item)}
        </Text>
        
        <View style={styles.contactActions}>
          <TouchableOpacity
            style={styles.contactAction}
            onPress={() => handleAudioCall(item)}
          >
            <Phone size={16} color="#1877F2" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.contactAction}
            onPress={() => handleVideoCall(item)}
          >
            <Video size={16} color="#1877F2" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };
  
  // Process unread messages for notifications
  const processUnreadMessages = (
    conversations: Conversation[], 
    setTotalUnread: React.Dispatch<React.SetStateAction<number>>
  ) => {
    const total = conversations.reduce((sum: number, conv: Conversation) => {
      if (!conv.unreadCount) return sum;
      const unreadUser1 = conv.unreadCount.user1 || 0;
      const unreadUser2 = conv.unreadCount.user2 || 0;
      return sum + unreadUser1 + unreadUser2;
    }, 0);
    setTotalUnread(total);
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Messages</Text>
          <View style={styles.headerActions}>
            <Pressable 
              style={styles.headerAction}
              onPress={() => router.push("/settings" as any)}
            >
              <Settings size={22} color="white" />
            </Pressable>
          </View>
        </View>
        
        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <Pressable
            style={[
              styles.tab,
              activeTab === 'Videos' && styles.activeTab
            ]}
            onPress={() => handleTabChange('Videos')}
          >
            <Text style={[
              styles.tabText,
              activeTab === 'Videos' && styles.activeTabText
            ]}>
              Videos
            </Text>
          </Pressable>
          
          <Pressable
            style={[
              styles.tab,
              activeTab === 'Feed' && styles.activeTab
            ]}
            onPress={() => handleTabChange('Feed')}
          >
            <Text style={[
              styles.tabText,
              activeTab === 'Feed' && styles.activeTabText
            ]}>
              Feed
            </Text>
          </Pressable>
          
          <Pressable
            style={[
              styles.tab,
              activeTab === 'Conversations' && styles.activeTab
            ]}
            onPress={() => setActiveTab('Conversations')}
          >
            <Text style={[
              styles.tabText,
              activeTab === 'Conversations' && styles.activeTabText
            ]}>
              Messages
              {getTotalUnreadCount() > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>
                    {getTotalUnreadCount()}
                  </Text>
                </View>
              )}
            </Text>
          </Pressable>
        </View>
      </View>
      
      {/* Search box */}
      <View style={styles.searchContainer}>
        <Pressable
          style={styles.searchBox}
          onPress={() => router.push("/search" as any)}
        >
          <Search size={20} color="#888" />
          <Text style={styles.searchPlaceholder}>Search messages</Text>
        </Pressable>
      </View>
      
      {/* Recent contacts horizontal list */}
      {!loading && recentContacts.length > 0 && (
        <View style={styles.recentContactsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Contacts</Text>
            <Pressable onPress={handleNewMessage}>
              <Text style={styles.sectionAction}>See All</Text>
            </Pressable>
          </View>
          
          <FlatList
            horizontal
            data={recentContacts}
            renderItem={renderRecentContactItem}
            keyExtractor={(item) => item._id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recentContactsList}
            ListEmptyComponent={loadingContacts ? (
              <ActivityIndicator size="small" color="#1877F2" />
            ) : null}
          />
        </View>
      )}
      
      {/* Conversations list */}
      {loading && conversations.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1877F2" />
          <Text style={styles.loadingText}>Loading conversations...</Text>
        </View>
      ) : (
        <View style={styles.conversationsSection}>
          <Text style={styles.sectionTitle}>All Messages</Text>
          <FlatList
            data={conversations}
            renderItem={renderConversationItem}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor="#1877F2"
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>No messages yet</Text>
                <Text style={styles.emptyText}>
                  Start a conversation by tapping the + button
                </Text>
                <TouchableOpacity 
                  style={styles.startChatButton}
                  onPress={handleNewMessage}
                >
                  <Text style={styles.startChatButtonText}>Start New Chat</Text>
                </TouchableOpacity>
              </View>
            }
          />
        </View>
      )}
      
      {/* Floating action button */}
      <TouchableOpacity 
        style={styles.floatingButton}
        onPress={handleNewMessage}
      >
        <Plus color="white" size={24} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    paddingTop: Platform.OS === 'ios' ? 0 : 40,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    height: 50,
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerAction: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 16,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#1877F2',
  },
  tabText: {
    color: '#888',
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
  },
  activeTabText: {
    color: 'white',
    fontFamily: 'Inter_600SemiBold',
  },
  tabBadge: {
    backgroundColor: '#1877F2',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 5,
  },
  tabBadgeText: {
    color: 'white',
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
  },
  searchContainer: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  searchPlaceholder: {
    color: '#888',
    fontSize: 16,
    marginLeft: 10,
    fontFamily: 'Inter_400Regular',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  loadingText: {
    color: '#AAA',
    marginTop: 12,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  recentContactsSection: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#AAA',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionAction: {
    color: '#1877F2',
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  recentContactsList: {
    paddingHorizontal: 16,
  },
  contactItem: {
    alignItems: 'center',
    marginRight: 20,
    width: 60,
  },
  contactAvatarContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  contactAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#1877F2',
  },
  noContactAvatar: {
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactOnlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#000',
  },
  contactName: {
    color: 'white',
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
    width: 60,
    marginBottom: 8,
  },
  contactActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  contactAction: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(24,119,242,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  conversationsSection: {
    flex: 1,
    paddingTop: 16,
  },
  listContainer: {
    paddingBottom: 100, // Extra padding to account for tab bar
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  noAvatar: {
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#000',
  },
  messageContent: {
    flex: 1,
    justifyContent: 'center',
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userName: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    marginRight: 5,
    flex: 1,
  },
  unreadUserName: {
    fontFamily: 'Inter_700Bold',
  },
  timeAgo: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  messagePreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  messagePreview: {
    color: '#AAA',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    flex: 1,
  },
  unreadMessagePreview: {
    color: 'white',
    fontFamily: 'Inter_500Medium',
  },
  youText: {
    color: '#888',
  },
  messageStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  unreadBadge: {
    backgroundColor: '#1877F2',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadCount: {
    color: 'white',
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 80,
  },
  emptyTitle: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 8,
  },
  emptyText: {
    color: '#AAA',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginBottom: 24,
  },
  startChatButton: {
    backgroundColor: '#1877F2',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  startChatButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1877F2',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#1877F2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
}); 