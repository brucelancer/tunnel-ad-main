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
  useWindowDimensions,
  DeviceEventEmitter,
  Alert
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack, useFocusEffect } from 'expo-router';
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
import { eventEmitter } from './utils/eventEmitter';

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
    _ref?: string;
    _id: string;
    username?: string;
    name?: string;
    avatar?: string;
    isVerified?: boolean;
    firstName?: string;
    lastName?: string;
  };
  recipient: {
    _ref: string;
    _id?: string;
  };
  attachments?: Array<{
    _key: string;
    url: string;
    type: 'image' | 'video' | 'audio' | 'file';
  }>;
  seen: boolean;
  isTemp?: boolean;
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
  
  // Redirect to conversations if no ID provided
  useEffect(() => {
    if (!id) {
      router.replace("/conversations" as any);
    }
  }, [id, router]);
  
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
      ] | order(_createdAt desc)[0]`;
      
      const params = { 
        currentUserId: currentUser._id,
        recipientId: id
      };
      
      const subscription = client.listen(query, params).subscribe(update => {
        if (update.type === 'mutation' && update.result) {
          const newMessage = update.result;
          
          // Check if this is a new message (create mutation)
          if (update.transition === 'appear') {
            console.log('New message received in real-time');

            // Fetch the full message details
            client.fetch(`
              *[_type == "message" && _id == $messageId][0] {
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
            `, { messageId: newMessage._id })
              .then(fullMessage => {
                if (fullMessage) {
                  setMessages(prevMessages => {
                    // Check if message already exists to avoid duplicates
                    const exists = prevMessages.some(m => m._id === fullMessage._id);
                    if (!exists) {
                      // Add the new message and sort by creation date
                      
                      // If the message is from the other user, emit notification event
                      if (fullMessage.sender._id === id) {
                        // Only emit event if the user is not currently viewing this chat
                        // Check if the app is not focused on this chat screen
                        DeviceEventEmitter.emit('NEW_CHAT_MESSAGE', {
                          senderId: fullMessage.sender._id,
                          senderName: fullMessage.sender.name || fullMessage.sender.username,
                          messageId: fullMessage._id,
                          text: fullMessage.text
                        });
                      }
                      
                      return [...prevMessages, fullMessage].sort((a, b) => 
                        new Date(a._createdAt).getTime() - new Date(b._createdAt).getTime()
                      );
                    }
                    return prevMessages;
                  });
                  
                  // If the message is from the other user, mark it as seen
                  if (fullMessage.sender._id === id) {
                    markMessagesAsSeen();
                  }
                  
                  // Scroll to bottom on new message
                  setTimeout(() => {
                    flatListRef.current?.scrollToEnd({ animated: true });
                  }, 100);
                }
              })
              .catch(error => {
                console.error('Error fetching full message:', error);
              });
          } 
          // If a message was updated (e.g. marked as seen)
          else if (update.transition === 'update') {
            console.log('Message updated in real-time');
            
            // Update the message in our state
            setMessages(prevMessages => 
              prevMessages.map(msg => 
                msg._id === newMessage._id 
                  ? { ...msg, seen: newMessage.seen } 
                  : msg
              )
            );
          }
        }
      });
      
      // Mark messages as seen
      markMessagesAsSeen();
      
      return () => {
        subscription.unsubscribe();
      };
    }
  }, [currentUser, id]);
  
  // Clear notifications when chat screen is in focus
  useFocusEffect(
    useCallback(() => {
      // When this screen comes into focus, clear message notifications
      DeviceEventEmitter.emit('CHAT_MESSAGES_READ');
      
      // Also mark any unread messages as seen
      markMessagesAsSeen();
      
      return () => {
        // Component is unfocused
      };
    }, [])
  );
  
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
    if (!currentUser?._id || !id) return;
    
    try {
      // Find unseen messages from the recipient
      const unseenMessages = messages.filter(
        msg => msg.sender._id === id && !msg.seen
      );
      
      if (unseenMessages.length === 0) return;
      
      console.log(`Marking ${unseenMessages.length} messages as seen`);
      
      // Update local state first for immediate UI feedback
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg.sender._id === id && !msg.seen
            ? { ...msg, seen: true }
            : msg
        )
      );
      
      // Notify that messages have been read
      DeviceEventEmitter.emit('CHAT_MESSAGES_READ');
      
      // Make API call to update messages on the server
      const client = getSanityClient();
      if (client) {
        const transaction = client.transaction();
        
        unseenMessages.forEach(message => {
          transaction.patch(message._id, {
            set: { seen: true }
          });
        });
        
        await transaction.commit();
        console.log('Messages marked as seen on server');
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
      
      // Get the current message text and clear the input immediately
      const currentText = messageText.trim();
      setMessageText('');
      
      // Create a truly unique ID for temp message using timestamp + random string
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      
      // Get current timestamp for consistent usage
      const now = new Date();
      const timestamp = now.toISOString();
      
      // Create the message document
      const newMessage = {
        _type: 'message',
        text: currentText,
        sender: {
          _type: 'reference',
          _ref: currentUser._id
        },
        recipient: {
          _type: 'reference',
          _ref: id
        },
        seen: false,
        _createdAt: timestamp
      };
      
      // Create a temporary message for immediate display
      const tempMessage = {
        _id: tempId,
        _createdAt: timestamp,
        text: currentText,
        sender: {
          _id: currentUser._id,
          username: currentUser.username,
          firstName: currentUser.firstName,
          lastName: currentUser.lastName,
          avatar: currentUser.profile?.avatar
        },
        recipient: {
          _ref: id
        },
        seen: false,
        isTemp: true // Flag to identify temporary messages
      };
      
      // Add temp message to state for immediate feedback
      setMessages(prevMessages => [...prevMessages, tempMessage].sort((a, b) => 
        new Date(a._createdAt).getTime() - new Date(b._createdAt).getTime()
      ));
      
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
      
      // Add to Sanity
      const result = await client.create(newMessage);
      
      if (result && result._id) {
        console.log('Message sent successfully:', result._id);
        
        // Replace the temp message with the confirmed one
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg._id === tempId ? 
            {
              ...tempMessage,
              _id: result._id,
              isTemp: false
            } : msg
          )
        );
        
        // Force a manual update to the conversation list by creating a synthetic
        // conversation update that will trigger the correct conversation to appear at the top
        // This helps with the immediate update of the conversation list
        const conversationUpdate = {
          type: 'mutation',
          result: {
            _id: result._id,
            _type: 'message',
            text: currentText,
            sender: { _id: currentUser._id },
            recipient: { _id: id },
            _createdAt: timestamp,
            seen: false
          },
          documentId: result._id
        };
        
        // Use our custom eventEmitter instead of chatEventEmitter
        eventEmitter.emit('message-sent', conversationUpdate);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Remove temp message on error
      setMessages(prevMessages => 
        prevMessages.filter(msg => !msg.isTemp)
      );
      
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
    const isTemp = message.isTemp === true;
    
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
          isFromMe ? styles.myMessageBubble : styles.theirMessageBubble,
          isTemp && styles.tempMessageBubble
        ]}>
          <Text style={[
            styles.messageText,
            isFromMe ? styles.myMessageText : styles.theirMessageText,
            isTemp && styles.tempMessageText
          ]}>
            {message.text}
          </Text>
          
          <View style={styles.messageFooter}>
            <Text style={[
              styles.messageTime,
              isFromMe ? styles.myMessageTime : styles.theirMessageTime
            ]}>
              {getFormattedTime(message._createdAt)}
            </Text>
            
            {isFromMe && (
              <View style={styles.messageStatusContainer}>
                {isTemp ? (
                  <ActivityIndicator size={10} color="rgba(255,255,255,0.5)" />
                ) : (
                  <Text style={styles.messageSeenStatus}>
                    {message.seen ? '• Seen' : '• Delivered'}
                  </Text>
                )}
              </View>
            )}
          </View>
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
        keyExtractor={(item) => `date_group_${item.date}`}
        renderItem={({ item: group, index: groupIndex }) => (
          <View key={`group_${groupIndex}_${group.date}`}>
            {renderDateHeader(group.date)}
            <FlatList
              data={group.messages}
              keyExtractor={(item, index) => {
                // Ensure each message has a truly unique key
                if (item.isTemp) {
                  // For temporary messages, use the temporary ID which includes timestamp
                  return `temp_${item._id}_${index}`;
                }
                // For real messages, combine ID with index and timestamp for guaranteed uniqueness
                return `msg_${item._id}_${groupIndex}_${index}_${new Date(item._createdAt).getTime()}`;
              }}
              renderItem={renderMessage}
              scrollEnabled={false}
              extraData={currentUser?._id} // Re-render if current user changes
              removeClippedSubviews={false}
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
  
  // Add a test function to simulate receiving a message
  const simulateIncomingMessage = () => {
    // Generate a random message ID
    const fakeMessageId = `test-${Date.now()}`;
    
    // Emit a fake message notification event
    DeviceEventEmitter.emit('NEW_CHAT_MESSAGE', {
      senderId: id || 'unknown',
      senderName: recipient?.name || 'Test User',
      messageId: fakeMessageId,
      text: 'This is a test message'
    });
    
    // Show an alert to confirm the test was sent
    Alert.alert(
      'Test Notification Sent',
      'Check the floating action button for the notification badge.',
      [{ text: 'OK' }]
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
        
        {/* Test button - only visible in development */}
        {__DEV__ && (
          <Pressable 
            style={styles.testButton}
            onPress={simulateIncomingMessage}
          >
            <Text style={styles.testButtonText}>Test Notification</Text>
          </Pressable>
        )}
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
  tempMessageBubble: {
    backgroundColor: 'rgba(24,119,242,0.3)',
  },
  tempMessageText: {
    color: 'rgba(255,255,255,0.7)',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 2,
  },
  messageStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  testButton: {
    backgroundColor: '#1877F2',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  testButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
}); 