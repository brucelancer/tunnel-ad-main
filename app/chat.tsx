import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  Pressable,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Animated,
  Dimensions,
  TouchableOpacity,
  useWindowDimensions
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { BlurView } from 'expo-blur';
import {
  ArrowLeft,
  Send,
  Smile,
  Paperclip,
  MoreVertical,
  Camera,
  Image as ImageIcon,
  Mic,
  Phone,
  Video
} from 'lucide-react-native';
import { useSanityAuth } from './hooks/useSanityAuth';
import { getSanityClient, urlFor } from '@/tunnel-ad-main/services/postService';
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

// Message type
interface Message {
  _id: string;
  _createdAt: string;
  text: string;
  sender: {
    _ref: string;
    _id: string;
    username?: string;
    name?: string;
    avatar?: string;
    isVerified?: boolean;
  };
  recipient: {
    _ref: string;
    _id: string;
  };
  attachments?: Array<{
    _key: string;
    url: string;
    type: 'image' | 'video' | 'audio' | 'file';
  }>;
  seen: boolean;
}

// User type
interface ChatUser {
  _id: string;
  username: string;
  name: string;
  avatar?: string;
  isVerified?: boolean;
  isBlueVerified?: boolean;
  isOnline?: boolean;
  lastSeen?: string;
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user: currentUser } = useSanityAuth();
  const { width: windowWidth } = useWindowDimensions();
  const flatListRef = useRef<FlatList>(null);
  
  // States
  const [recipient, setRecipient] = useState<ChatUser | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  
  // Set up a listener for new messages
  useEffect(() => {
    if (!currentUser?._id || !id) return;
    
    fetchRecipientData();
    fetchMessages();
    
    // Set up realtime listener for new messages
    const client = getSanityClient();
    if (client) {
      const query = `*[_type == "message" && 
        ((sender._ref == $currentUserId && recipient._ref == $recipientId) || 
        (sender._ref == $recipientId && recipient._ref == $currentUserId))
      ] | order(_createdAt desc)`;
      
      const params = { 
        currentUserId: currentUser._id,
        recipientId: id
      };
      
      const subscription = client.listen(query, params).subscribe(update => {
        if (update.type === 'mutation' && update.result) {
          // Refresh messages
          fetchMessages();
        }
      });
      
      // Mark messages as seen
      markMessagesAsSeen();
      
      return () => {
        subscription.unsubscribe();
      };
    }
  }, [currentUser, id]);
  
  // Fetch recipient data
  const fetchRecipientData = async () => {
    try {
      const client = getSanityClient();
      if (!client || !id) return;
      
      const userData = await client.fetch(`
        *[_type == "user" && _id == $userId][0] {
          _id,
          username,
          firstName,
          lastName,
          "avatar": profile.avatar,
          "isVerified": username == "admin" || username == "moderator",
          "isBlueVerified": isBlueVerified,
          "isOnline": coalesce(isOnline, false),
          "lastSeen": lastSeen
        }
      `, { userId: id });
      
      if (userData) {
        setRecipient({
          _id: userData._id,
          username: userData.username || '',
          name: userData.firstName && userData.lastName 
            ? `${userData.firstName} ${userData.lastName}` 
            : userData.username || 'User',
          avatar: userData.avatar ? urlFor(userData.avatar).url() : undefined,
          isVerified: userData.isVerified,
          isBlueVerified: userData.isBlueVerified,
          isOnline: userData.isOnline,
          lastSeen: userData.lastSeen
        });
      }
    } catch (error) {
      console.error('Error fetching recipient data:', error);
    }
  };
  
  // Fetch messages
  const fetchMessages = async () => {
    try {
      setLoading(true);
      
      const client = getSanityClient();
      if (!client || !currentUser?._id || !id) return;
      
      const fetchedMessages = await client.fetch(`
        *[_type == "message" && 
          ((sender._ref == $currentUserId && recipient._ref == $recipientId) || 
          (sender._ref == $recipientId && recipient._ref == $currentUserId))
        ] | order(_createdAt asc) {
          _id,
          _createdAt,
          text,
          "sender": sender->{
            _id,
            username,
            firstName,
            lastName,
            "avatar": profile.avatar,
            "isVerified": username == "admin" || username == "moderator"
          },
          recipient,
          attachments,
          seen
        }
      `, { 
        currentUserId: currentUser._id,
        recipientId: id
      });
      
      setMessages(fetchedMessages);
      
      // Mark messages as seen
      markMessagesAsSeen();
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Mark messages as seen
  const markMessagesAsSeen = async () => {
    try {
      const client = getSanityClient();
      if (!client || !currentUser?._id || !id) return;
      
      // Find all unread messages from recipient
      const unseenMessages = await client.fetch(`
        *[_type == "message" && 
          sender._ref == $recipientId && 
          recipient._ref == $currentUserId && 
          seen == false
        ]._id
      `, { 
        currentUserId: currentUser._id,
        recipientId: id
      });
      
      // Mark all as seen with a transaction
      if (unseenMessages && unseenMessages.length > 0) {
        const transaction = client.transaction();
        
        unseenMessages.forEach((messageId: string) => {
          transaction.patch(messageId, {
            set: { seen: true }
          });
        });
        
        await transaction.commit();
        console.log(`Marked ${unseenMessages.length} messages as seen`);
      }
    } catch (error) {
      console.error('Error marking messages as seen:', error);
    }
  };
  
  // Send a new message
  const sendMessage = async () => {
    if (!messageText.trim() || !currentUser?._id || !id) return;
    
    try {
      setSending(true);
      
      const client = getSanityClient();
      if (!client) return;
      
      // Create the message document
      const newMessage = {
        _type: 'message',
        text: messageText.trim(),
        sender: {
          _type: 'reference',
          _ref: currentUser._id
        },
        recipient: {
          _type: 'reference',
          _ref: id
        },
        seen: false,
        _createdAt: new Date().toISOString()
      };
      
      // Add to Sanity
      const result = await client.create(newMessage);
      
      if (result && result._id) {
        console.log('Message sent successfully:', result._id);
        setMessageText('');
        
        // Scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };
  
  // Get formatted time
  const getFormattedTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Get formatted date
  const getFormattedDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    
    // Check if same day
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    
    // Check if yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    
    // Return formatted date
    return date.toLocaleDateString([], { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    });
  };
  
  // Message groups by date
  const groupMessagesByDate = () => {
    const groups: { date: string, messages: Message[] }[] = [];
    let currentDate = '';
    let currentGroup: Message[] = [];
    
    messages.forEach(message => {
      const messageDate = new Date(message._createdAt).toDateString();
      
      if (messageDate !== currentDate) {
        if (currentGroup.length > 0) {
          groups.push({
            date: currentDate,
            messages: [...currentGroup]
          });
        }
        
        currentDate = messageDate;
        currentGroup = [message];
      } else {
        currentGroup.push(message);
      }
    });
    
    // Add the last group
    if (currentGroup.length > 0) {
      groups.push({
        date: currentDate,
        messages: currentGroup
      });
    }
    
    return groups;
  };
  
  // Render a message bubble
  const renderMessage = ({ item: message }: { item: Message }) => {
    const isFromMe = message.sender._id === currentUser?._id;
    const showAvatar = !isFromMe;
    
    return (
      <View style={[
        styles.messageRow,
        isFromMe ? styles.myMessageRow : styles.theirMessageRow
      ]}>
        {showAvatar ? (
          <Image
            source={{ 
              uri: message.sender.avatar 
                ? typeof message.sender.avatar === 'string' 
                  ? message.sender.avatar 
                  : urlFor(message.sender.avatar).url()
                : 'https://via.placeholder.com/40'
            }}
            style={styles.messageSenderAvatar}
          />
        ) : (
          <View style={styles.emptyAvatar} />
        )}
        
        <View style={[
          styles.messageBubble,
          isFromMe ? styles.myMessageBubble : styles.theirMessageBubble
        ]}>
          <Text style={[
            styles.messageText,
            isFromMe ? styles.myMessageText : styles.theirMessageText
          ]}>
            {message.text}
          </Text>
          
          <Text style={[
            styles.messageTime,
            isFromMe ? styles.myMessageTime : styles.theirMessageTime
          ]}>
            {getFormattedTime(message._createdAt)}
            {isFromMe && (
              <Text style={styles.messageSeenStatus}>
                {' '}{message.seen ? '• Seen' : ''}
              </Text>
            )}
          </Text>
        </View>
      </View>
    );
  };
  
  // Render a date header
  const renderDateHeader = (date: string) => {
    return (
      <View style={styles.dateHeaderContainer}>
        <View style={styles.dateHeaderLine} />
        <Text style={styles.dateHeaderText}>
          {getFormattedDate(date)}
        </Text>
        <View style={styles.dateHeaderLine} />
      </View>
    );
  };
  
  // Render the message groups
  const renderMessageGroups = () => {
    const groups = groupMessagesByDate();
    
    return (
      <FlatList
        ref={flatListRef}
        data={groups}
        keyExtractor={(item) => item.date}
        renderItem={({ item: group }) => (
          <View>
            {renderDateHeader(group.date)}
            <FlatList
              data={group.messages}
              keyExtractor={(item) => item._id}
              renderItem={renderMessage}
              scrollEnabled={false}
            />
          </View>
        )}
        contentContainerStyle={styles.messagesList}
        onLayout={() => {
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: false });
          }, 100);
        }}
      />
    );
  };
  
  if (loading && !recipient) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1877F2" />
        <Text style={styles.loadingText}>Loading conversation...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <StatusBar barStyle="light-content" />
        
        {/* Header */}
        <View style={styles.header}>
          <BlurView intensity={80} style={StyleSheet.absoluteFill} />
          <View style={styles.headerContent}>
            <Pressable
              style={styles.backButton}
              onPress={() => router.back()}
              hitSlop={20}
            >
              <ArrowLeft color="white" size={24} />
            </Pressable>
            
            {recipient && (
              <Pressable 
                style={styles.headerUserInfo}
                onPress={() => router.push({
                  pathname: '/user-profile' as any,
                  params: { id: recipient._id }
                })}
              >
                <Image 
                  source={{ 
                    uri: recipient.avatar || 'https://via.placeholder.com/40'
                  }} 
                  style={styles.headerAvatar} 
                />
                
                <View style={styles.headerUserDetails}>
                  <View style={styles.headerNameContainer}>
                    <Text style={styles.headerName}>{recipient.name}</Text>
                    {recipient.isVerified && (
                      <TunnelVerifiedMark size={12} />
                    )}
                  </View>
                  
                  <Text style={styles.headerStatus}>
                    {recipient.isOnline ? 'Online' : 'Offline'}
                  </Text>
                </View>
              </Pressable>
            )}
            
            <View style={styles.headerActions}>
              <Pressable style={styles.headerAction}>
                <Phone size={20} color="white" />
              </Pressable>
              
              <Pressable style={styles.headerAction}>
                <Video size={20} color="white" />
              </Pressable>
              
              <Pressable style={styles.headerAction}>
                <MoreVertical size={20} color="white" />
              </Pressable>
            </View>
          </View>
        </View>
        
        {/* Messages */}
        <View style={styles.messagesContainer}>
          {loading ? (
            <View style={styles.loadingMessagesContainer}>
              <ActivityIndicator size="small" color="#1877F2" />
              <Text style={styles.loadingMessagesText}>Loading messages...</Text>
            </View>
          ) : messages.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptyText}>
                Start a conversation with {recipient?.name}
              </Text>
            </View>
          ) : (
            renderMessageGroups()
          )}
        </View>
        
        {/* Input */}
        <View style={styles.inputContainer}>
          <View style={styles.inputActions}>
            <Pressable style={styles.inputAction}>
              <Paperclip size={24} color="#AAA" />
            </Pressable>
            
            <Pressable style={styles.inputAction}>
              <Camera size={24} color="#AAA" />
            </Pressable>
            
            <Pressable style={styles.inputAction}>
              <ImageIcon size={24} color="#AAA" />
            </Pressable>
            
            <Pressable style={styles.inputAction}>
              <Mic size={24} color="#AAA" />
            </Pressable>
          </View>
          
          <View style={styles.textInputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="Type a message..."
              placeholderTextColor="#666"
              value={messageText}
              onChangeText={setMessageText}
              multiline
              blurOnSubmit={false}
            />
            
            <Pressable style={styles.emojiButton}>
              <Smile size={24} color="#AAA" />
            </Pressable>
            
            <Pressable 
              style={[
                styles.sendButton,
                (!messageText.trim() || sending) && styles.sendButtonDisabled
              ]}
              onPress={sendMessage}
              disabled={!messageText.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Send size={20} color="white" />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000',
  },
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#FFF',
    marginTop: 12,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  header: {
    height: 60,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerUserInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  headerUserDetails: {
    flexDirection: 'column',
  },
  headerNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerName: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginRight: 5,
  },
  headerStatus: {
    color: '#AAA',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAction: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 5,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 10,
  },
  messagesList: {
    paddingVertical: 20,
  },
  loadingMessagesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingMessagesText: {
    color: '#AAA',
    marginTop: 10,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
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
  },
  dateHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  dateHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  dateHeaderText: {
    color: '#AAA',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginHorizontal: 10,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  myMessageRow: {
    justifyContent: 'flex-end',
  },
  theirMessageRow: {
    justifyContent: 'flex-start',
  },
  messageSenderAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
    alignSelf: 'flex-end',
  },
  emptyAvatar: {
    width: 30,
    marginLeft: 8,
  },
  messageBubble: {
    maxWidth: '70%',
    padding: 12,
    borderRadius: 18,
    marginHorizontal: 4,
  },
  myMessageBubble: {
    backgroundColor: '#1877F2',
    borderBottomRightRadius: 4,
  },
  theirMessageBubble: {
    backgroundColor: '#333',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    marginBottom: 4,
  },
  myMessageText: {
    color: 'white',
  },
  theirMessageText: {
    color: 'white',
  },
  messageTime: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    alignSelf: 'flex-end',
  },
  myMessageTime: {
    color: 'rgba(255,255,255,0.7)',
  },
  theirMessageTime: {
    color: 'rgba(255,255,255,0.7)',
  },
  messageSeenStatus: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
  },
  inputContainer: {
    backgroundColor: '#111',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  inputActions: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  inputAction: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 5,
  },
  textInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
  },
  textInput: {
    flex: 1,
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    maxHeight: 100,
    paddingTop: 8,
    paddingBottom: 8,
  },
  emojiButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1877F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 5,
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(24,119,242,0.5)',
  },
}); 