import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Video, ResizeMode } from 'expo-av';
import {
  ArrowLeft,
  MessageCircle,
  Heart,
  Send,
  Smile,
  MoreHorizontal,
  Share2,
  ChevronDown,
  X,
} from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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

// Comment interface
interface Comment {
  id: string;
  text: string;
  user: {
    id: string;
    username: string;
    avatar?: string;
    isVerified?: boolean;
  };
  createdAt: string;
  likes: number;
  hasLiked?: boolean;
  replies?: Comment[];
}

// Mock data for comments
const MOCK_COMMENTS: Comment[] = [
  {
    id: '1',
    text: 'This video is amazing! The choreography is incredible 🔥',
    user: {
      id: 'user1',
      username: 'dancefan2023',
      avatar: 'https://randomuser.me/api/portraits/women/1.jpg',
      isVerified: false,
    },
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    likes: 24,
    hasLiked: false,
  },
  {
    id: '2',
    text: 'Love the music choice for this routine! Anyone know the song name?',
    user: {
      id: 'user2',
      username: 'musiclover',
      avatar: 'https://randomuser.me/api/portraits/men/2.jpg',
      isVerified: true,
    },
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
    likes: 56,
    hasLiked: true,
  },
  {
    id: '3',
    text: 'I tried to learn this dance but it\'s so hard! Any tips?',
    user: {
      id: 'user3',
      username: 'beginner_dancer',
      avatar: 'https://randomuser.me/api/portraits/women/3.jpg',
      isVerified: false,
    },
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
    likes: 8,
    hasLiked: false,
  },
  {
    id: '4',
    text: 'Just shared this with my dance group, we\'re definitely going to try this!',
    user: {
      id: 'user4',
      username: 'dance_instructor',
      avatar: 'https://randomuser.me/api/portraits/men/4.jpg',
      isVerified: true,
    },
    createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45 minutes ago
    likes: 32,
    hasLiked: false,
  },
  {
    id: '5',
    text: 'Your dance style is so unique, I can always recognize your videos! Keep it up 👏',
    user: {
      id: 'user5',
      username: 'dance_critic',
      avatar: 'https://randomuser.me/api/portraits/women/5.jpg',
      isVerified: false,
    },
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    likes: 41,
    hasLiked: false,
  },
  {
    id: '6',
    text: 'The lighting in this video is perfect, what setup are you using?',
    user: {
      id: 'user6',
      username: 'filmmaker',
      avatar: 'https://randomuser.me/api/portraits/men/6.jpg',
      isVerified: false,
    },
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
    likes: 17,
    hasLiked: true,
  },
  {
    id: '7',
    text: 'This just popped up in my feed and now I can\'t stop watching it on repeat!',
    user: {
      id: 'user7',
      username: 'new_follower',
      avatar: 'https://randomuser.me/api/portraits/women/7.jpg',
      isVerified: false,
    },
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
    likes: 9,
    hasLiked: false,
  },
  {
    id: '8',
    text: 'Does anyone know where I can find more tutorials like this?',
    user: {
      id: 'user8',
      username: 'learning_to_dance',
      avatar: 'https://randomuser.me/api/portraits/men/8.jpg',
      isVerified: false,
    },
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), // 8 hours ago
    likes: 5,
    hasLiked: false,
  }
];

// Helper function to calculate time ago for comments
const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w`;
  
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;
  
  const years = Math.floor(days / 365);
  return `${years}y`;
};

// Component for rendering a single comment
const CommentItem = ({ comment, onLike }: { comment: Comment, onLike: (id: string) => void }) => {
  const [showReplyInput, setShowReplyInput] = useState(false);
  
  return (
    <View style={styles.commentItem}>
      <Image 
        source={{ uri: comment.user.avatar || 'https://via.placeholder.com/40' }} 
        style={styles.avatar} 
      />
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <Text style={styles.username}>{comment.user.username}</Text>
          {comment.user.isVerified && (
            <View style={styles.verifiedBadge}>
              <TunnelVerifiedMark size={12} />
            </View>
          )}
        </View>
        <Text style={styles.commentText}>{comment.text}</Text>
        <View style={styles.commentActions}>
          <Text style={styles.timeAgo}>{formatTimeAgo(comment.createdAt)}</Text>
          <Pressable style={styles.replyButton} onPress={() => setShowReplyInput(!showReplyInput)}>
            <Text style={styles.replyText}>Reply</Text>
          </Pressable>
        </View>
        
        <Pressable 
          style={styles.likesContainer} 
          onPress={() => onLike(comment.id)}
        >
          <Heart 
            size={20} 
            color={comment.hasLiked ? '#FF4D67' : '#888'} 
            fill={comment.hasLiked ? '#FF4D67' : 'transparent'} 
          />
          {comment.likes > 0 && (
            <Text style={[
              styles.likeCount,
              comment.hasLiked && styles.likedCount
            ]}>
              {comment.likes}
            </Text>
          )}
        </Pressable>
        
        {showReplyInput && (
          <View style={styles.replyInputContainer}>
            <TextInput
              style={styles.replyInput}
              placeholder={`Reply to ${comment.user.username}...`}
              placeholderTextColor="#777"
              autoFocus
            />
          </View>
        )}
      </View>
    </View>
  );
};

// Add emoji picker component and reply functionality
const EMOJI_LIST = ['😀', '❤️', '😂', '😮', '😊', '😁', '🥺'];

export default function VideoCommentsPage() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const videoId = params.id as string;
  
  const [comments, setComments] = useState<Comment[]>(MOCK_COMMENTS);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [videoInfo, setVideoInfo] = useState({
    url: 'https://d23dyxeqlo5psv.cloudfront.net/big_buck_bunny.mp4', // Placeholder
    title: 'Loading...',
    authorName: '',
    authorAvatar: '',
    authorVerified: false,
  });
  
  useEffect(() => {
    // In a real app, this would fetch video details and comments from an API
    if (videoId) {
      setIsLoading(true);
      // Simulate loading
      setTimeout(() => {
        setVideoInfo({
          url: 'https://d23dyxeqlo5psv.cloudfront.net/big_buck_bunny.mp4',
          title: 'Amazing dance routine #dance #trending',
          authorName: 'dance_pro',
          authorAvatar: 'https://randomuser.me/api/portraits/women/44.jpg',
          authorVerified: true,
        });
        setIsLoading(false);
      }, 800);
    }
  }, [videoId]);

  const handleLikeComment = (commentId: string) => {
    setComments(prevComments => 
      prevComments.map(comment => 
        comment.id === commentId 
          ? { 
              ...comment, 
              hasLiked: !comment.hasLiked,
              likes: comment.hasLiked ? comment.likes - 1 : comment.likes + 1 
            } 
          : comment
      )
    );
  };
  
  const handleSubmitComment = () => {
    if (!newComment.trim()) return;
    
    const newCommentObj: Comment = {
      id: `new-${Date.now()}`,
      text: newComment,
      user: {
        id: 'current-user',
        username: 'me',
        avatar: 'https://randomuser.me/api/portraits/men/20.jpg',
        isVerified: false,
      },
      createdAt: new Date().toISOString(),
      likes: 0,
      hasLiked: false,
    };
    
    setComments([newCommentObj, ...comments]);
    setNewComment('');
  };
  
  const goBack = () => {
    router.back();
  };

  const handleShareVideo = () => {
    // Share implementation would go here
  };
  
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Video Preview Section */}
      <View style={styles.videoContainer}>
        <Video
          style={styles.video}
          source={{ uri: videoInfo.url }}
          resizeMode={ResizeMode.COVER}
          shouldPlay
          isMuted={true}
          isLooping
          useNativeControls={false}
        />
        
        {/* Video Overlay with Back Button */}
        <View style={styles.videoOverlay}>
          <Pressable onPress={goBack} style={styles.backButton}>
            <ChevronDown color="white" size={28} />
          </Pressable>
          
          <Pressable onPress={handleShareVideo} style={styles.shareButton}>
            <Share2 color="white" size={24} />
          </Pressable>
        </View>
        
        {/* Video Info */}
        <BlurView intensity={80} style={styles.videoInfoContainer}>
          <View style={styles.videoInfoContent}>
            <Image 
              source={{ uri: videoInfo.authorAvatar || 'https://via.placeholder.com/40' }} 
              style={styles.authorAvatar} 
            />
            <View style={styles.videoTextInfo}>
              <View style={styles.authorInfo}>
                <Text style={styles.authorName}>{videoInfo.authorName}</Text>
                {videoInfo.authorVerified && (
                  <View style={styles.verifiedBadge}>
                    <TunnelVerifiedMark size={12} />
                  </View>
                )}
              </View>
              <Text style={styles.videoTitle} numberOfLines={1}>
                {videoInfo.title}
              </Text>
            </View>
          </View>
        </BlurView>
        
        {/* Gradient Below Video */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 80,
            zIndex: 2
          }}
        />
      </View>
      
      {/* Comments Section */}
      <View style={styles.commentsSection}>
        <View style={styles.commentsHeader}>
          <Text style={styles.commentsCount}>
            {comments.length} comments
          </Text>
          <Pressable onPress={goBack} style={styles.closeButton}>
            <X color="white" size={24} />
          </Pressable>
        </View>
        
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1877F2" />
          </View>
        ) : (
          <FlatList
            data={comments}
            renderItem={({ item }) => <CommentItem comment={item} onLike={handleLikeComment} />}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.commentsList}
            showsVerticalScrollIndicator={false}
            initialNumToRender={5}
            maxToRenderPerBatch={3}
            windowSize={7}
            ListEmptyComponent={
              <View style={styles.emptyCommentsContainer}>
                <MessageCircle color="#888" size={40} />
                <Text style={styles.emptyCommentsText}>No comments yet</Text>
                <Text style={styles.emptyCommentsSubtext}>Be the first to comment</Text>
              </View>
            }
          />
        )}
      </View>
      
      {/* Comment Input */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <View style={styles.emojiPickerRow}>
          {EMOJI_LIST.map(emoji => (
            <Pressable 
              key={emoji} 
              style={styles.emojiItem}
              onPress={() => setNewComment(prev => prev + emoji)}
            >
              <Text style={styles.emojiText}>{emoji}</Text>
            </Pressable>
          ))}
        </View>
        
        <View style={styles.inputContainer}>
          <Pressable style={styles.emojiButton}>
            <Smile color="#888" size={24} />
          </Pressable>
          <TextInput
            style={styles.input}
            placeholder="Add a comment..."
            placeholderTextColor="#777"
            value={newComment}
            onChangeText={setNewComment}
            multiline
            maxLength={500}
            returnKeyType="default"
          />
          <Pressable 
            style={[
              styles.sendButton,
              !newComment.trim() && styles.sendButtonDisabled
            ]}
            onPress={handleSubmitComment}
            disabled={!newComment.trim()}
          >
            <Send 
              color={newComment.trim() ? '#FFFFFF' : '#666'} 
              size={20} 
              style={{ transform: [{ rotate: '45deg' }] }}
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoContainer: {
    height: SCREEN_HEIGHT * 0.35,
    position: 'relative',
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  videoInfoContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 12,
  },
  videoInfoContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  videoTextInfo: {
    flex: 1,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
  verifiedBadge: {
    marginLeft: 4,
  },
  videoTitle: {
    fontSize: 13,
    color: '#ddd',
    marginTop: 2,
  },
  commentsSection: {
    flex: 1,
    backgroundColor: '#000',
  },
  commentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    position: 'relative',
  },
  commentsCount: {
    fontSize: 17,
    fontWeight: 'bold',
    color: 'white',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentsList: {
    padding: 16,
    paddingBottom: 100,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
    position: 'relative',
  },
  likesContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    alignItems: 'center',
  },
  likeButton: {
    padding: 4,
  },
  likeCount: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
    textAlign: 'center',
  },
  likedCount: {
    color: '#FF4D67',
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  username: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
    marginRight: 4,
  },
  commentText: {
    fontSize: 14,
    color: 'white',
    lineHeight: 20,
    marginBottom: 6,
    paddingRight: 40, // Make space for like button
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeAgo: {
    fontSize: 12,
    color: '#888',
    marginRight: 16,
  },
  replyButton: {
    padding: 2,
  },
  replyText: {
    fontSize: 12,
    color: '#888',
  },
  repliesContainer: {
    marginTop: 12,
    marginLeft: 10,
    paddingLeft: 10,
    borderLeftWidth: 0.5,
    borderLeftColor: 'rgba(255, 255, 255, 0.2)',
  },
  replyItem: {
    flexDirection: 'row',
    marginBottom: 12,
    position: 'relative',
  },
  replyAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
  },
  replyContent: {
    flex: 1,
  },
  replyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  replyUsername: {
    fontSize: 13,
    fontWeight: 'bold',
    color: 'white',
    marginRight: 4,
  },
  replyTextContent: {
    fontSize: 13,
    color: 'white',
    lineHeight: 18,
    marginBottom: 4,
    paddingRight: 30,
  },
  replyActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyTimeAgo: {
    fontSize: 11,
    color: '#888',
    marginRight: 12,
  },
  replyLikeButton: {
    padding: 2,
  },
  replyLikeText: {
    fontSize: 11,
    color: '#888',
  },
  replyLikesContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    alignItems: 'center',
  },
  replyLikeCount: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortText: {
    color: '#1877F2',
    fontSize: 14,
    fontWeight: 'bold',
  },
  keyboardView: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#111',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  emojiPickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 8,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.1)',
    backgroundColor: '#111',
  },
  emojiItem: {
    padding: 8,
    borderRadius: 20,
  },
  emojiText: {
    fontSize: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 32 : 12,
  },
  emojiButton: {
    padding: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#222',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    color: 'white',
    fontSize: 14,
    maxHeight: 100,
    marginHorizontal: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1877F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#222',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCommentsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyCommentsText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#888',
    marginTop: 16,
  },
  emptyCommentsSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  replyInputContainer: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyInput: {
    flex: 1,
    backgroundColor: '#222',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    color: 'white',
    fontSize: 13,
  },
}); 