import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { 
  ArrowLeft, 
  Heart, 
  MessageCircle, 
  ChevronRight,
  Search,
  X,
  Trash2,
  AlertTriangle,
} from 'lucide-react-native';
import { useSanityAuth } from '../app/hooks/useSanityAuth';
import * as videoService from '@/tunnel-ad-main/services/videoService';
import { createClient } from '@sanity/client';
import { DeviceEventEmitter } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Initialize Sanity client for direct queries - but we'll authenticate it later
const sanityClient = createClient({
  projectId: '21is7976',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-03-01'
});

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

interface CommentUser {
  id: string;
  username: string;
  avatar: string | null;
  isVerified: boolean;
  count: number;
  commentTexts?: string[]; // Store comment texts for search
}

interface Comment {
  id: string;
  text: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    avatar: string | null;
    isVerified: boolean;
  };
  likes: number;
}

// Add a fallback token for admin operations
const SANITY_API_TOKEN = 'skfYBXlqcVRszR6D3U2X3hPAMKupissIjK6LehFgtmYRkavBwU49tXYqryhOliJ7mclzM38VivW4vz75T6edrwsmwGPwgFEHxgANwxVnFNDFBq9pWjLhSd6dfB4yJNbVbgfkKlkocZ1VgYpd2ldczW64WNhqiTkclddkAxaTinVBhF9NMme0';

export default function InsightsCommentDetail() {
  const params = useLocalSearchParams();
  const videoId = params.videoId as string;
  const videoTitle = params.videoTitle as string;
  const router = useRouter();
  const { user } = useSanityAuth();
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<Comment[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [usersList, setUsersList] = useState<CommentUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<CommentUser[]>([]);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [videoOwnerId, setVideoOwnerId] = useState<string | null>(null);
  const [currentUserToken, setCurrentUserToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'users'>('all');
  const [filteredComments, setFilteredComments] = useState<Comment[]>([]);

  // Try to get the token on component mount
  useEffect(() => {
    const fetchToken = async () => {
      try {
        // Try to get token directly from AsyncStorage
        const tokenKeys = ['sanity_token', 'sanityToken', 'auth_token'];
        for (const key of tokenKeys) {
          const token = await AsyncStorage.getItem(key);
          if (token) {
            console.log(`Found authentication token with key: ${key}`);
            setCurrentUserToken(token);
            return;
          }
        }
        
        // Try getting user object with token
        const userStr = await AsyncStorage.getItem('sanity_user');
        if (userStr) {
          const userData = JSON.parse(userStr);
          if (userData && userData.token) {
            console.log('Found token in user data object');
            setCurrentUserToken(userData.token);
            return;
          }
        }
      } catch (error) {
        console.error('Error fetching token:', error);
      }
    };
    
    fetchToken();
  }, []);

  useEffect(() => {
    setActiveTab('all'); // Reset to 'all' tab when loading new video
    setSelectedUser(null); // Reset selected user
    fetchComments();
  }, [videoId]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredComments(comments);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = comments.filter(comment => 
        comment.text.toLowerCase().includes(query) || 
        comment.user.username.toLowerCase().includes(query)
      );
      setFilteredComments(filtered);
    }
  }, [searchQuery, comments]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers(usersList);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = usersList.filter(user => 
        user.username.toLowerCase().includes(query) || 
        (user.commentTexts && user.commentTexts.some(text => 
          text.toLowerCase().includes(query)
        ))
      );
      setFilteredUsers(filtered);
    }
  }, [searchQuery, usersList]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      
      // Fetch comments for the video and also get the video owner ID
      const videoData = await sanityClient.fetch(`
        *[_type == "video" && _id == $videoId][0] {
          "authorId": author->_id,
          "comments": comments[] {
            _key,
            text,
            createdAt,
            likes,
            "user": author-> {
              _id,
              username,
              firstName,
              lastName,
              "avatar": profile.avatar,
              "isVerified": username == "admin" || username == "moderator" || defined(isBlueVerified)
            }
          }
        }
      `, { videoId });
      
      // Save the video owner ID
      if (videoData?.authorId) {
        setVideoOwnerId(videoData.authorId);
      }
      
      // Process comments
      if (videoData?.comments && videoData.comments.length > 0) {
        const processedComments = videoData.comments.map((comment: any) => ({
          id: comment._key,
          text: comment.text || '',
          createdAt: comment.createdAt || new Date().toISOString(),
          user: {
            id: comment.user?._id || 'unknown',
            username: comment.user?.username || 
                    (comment.user?.firstName ? 
                      `${comment.user.firstName} ${comment.user.lastName || ''}` : 
                      'Unknown User'),
            avatar: comment.user?.avatar ? 
                  videoService.urlFor(comment.user.avatar).url() : 
                  null,
            isVerified: comment.user?.isVerified || false
          },
          likes: comment.likes || 0
        }));
        
        // Sort by date (newest first)
        processedComments.sort((a: any, b: any) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        
        setComments(processedComments);
        setFilteredComments(processedComments);
        
        // Process users list
        const userMap = new Map<string, CommentUser>();
        processedComments.forEach((comment: Comment) => {
          const userId = comment.user.id;
          if (userMap.has(userId)) {
            const userData = userMap.get(userId)!;
            userData.count += 1;
            
            // Store comment text for search functionality
            if (!userData.commentTexts) {
              userData.commentTexts = [];
            }
            if (comment.text && comment.text.trim()) {
              userData.commentTexts.push(comment.text.trim());
            }
            
            userMap.set(userId, userData);
          } else {
            const commentTexts = comment.text && comment.text.trim() ? [comment.text.trim()] : [];
            userMap.set(userId, {
              id: comment.user.id,
              username: comment.user.username,
              avatar: comment.user.avatar,
              isVerified: comment.user.isVerified,
              count: 1,
              commentTexts
            });
          }
        });
        
        // Convert to array and sort by comment count
        const users = Array.from(userMap.values())
          .sort((a, b) => b.count - a.count);
        
        setUsersList(users);
        setFilteredUsers(users);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  // Format relative time for comments
  const formatRelativeTime = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    const diffMonth = Math.floor(diffDay / 30);
    const diffYear = Math.floor(diffMonth / 12);
    
    if (diffYear > 0) return `${diffYear}y ago`;
    if (diffMonth > 0) return `${diffMonth}mo ago`;
    if (diffDay > 0) return `${diffDay}d ago`;
    if (diffHour > 0) return `${diffHour}h ago`;
    if (diffMin > 0) return `${diffMin}m ago`;
    return 'Just now';
  };

  // Helper to get comments for selected user
  const getUserComments = () => {
    if (!selectedUser) return [];
    return comments.filter(comment => comment.user.id === selectedUser);
  };

  // Check if current user is the video owner or admin
  const canDeleteComment = (): boolean => {
    if (!user || !user._id) return false;
    
    // User is video owner or admin/moderator
    return user._id === videoOwnerId || 
           user.username === 'admin' || 
           user.username === 'moderator';
  };

  // Handle delete comment confirmation
  const handleDeleteComment = (commentId: string) => {
    setCommentToDelete(commentId);
    setConfirmDeleteVisible(true);
  };

  // Execute the actual delete operation
  const confirmDeleteComment = async () => {
    if (!commentToDelete) return;
    
    setDeleteLoading(true);
    try {
      // Use the cached token if available
      let token = currentUserToken;
      
      // If no cached token, try to get it from storage
      if (!token) {
        try {
          // Try different storage keys
          const tokenKeys = ['sanity_token', 'sanityToken', 'auth_token'];
          for (const key of tokenKeys) {
            const storedToken = await AsyncStorage.getItem(key);
            if (storedToken) {
              token = storedToken;
              console.log(`Found token with key: ${key}`);
              break;
            }
          }
          
          // Alternatively, try to get user data which might contain token
          if (!token) {
            const userStr = await AsyncStorage.getItem('sanity_user');
            if (userStr) {
              const userData = JSON.parse(userStr);
              if (userData && userData.token) {
                token = userData.token;
                console.log('Found token in user data');
              }
            }
          }
        } catch (e) {
          console.error('Error retrieving token:', e);
        }
      }
      
      // If still no token, use the fallback admin token
      if (!token) {
        console.log('Using admin fallback token');
        token = SANITY_API_TOKEN;
      }
      
      // Create authenticated client with token
      console.log('Creating authenticated client for delete operation');
      const authClient = createClient({
        projectId: '21is7976',
        dataset: 'production',
        useCdn: false,
        apiVersion: '2023-03-01',
        token
      });
      
      // Use the authenticated client to remove comment from the video
      const result = await authClient.patch(videoId)
        .unset([`comments[_key=="${commentToDelete}"]`])
        .commit();
      
      console.log('Delete operation result:', result);
      
      // Optimistically update UI
      const updatedComments = comments.filter(c => c.id !== commentToDelete);
      setComments(updatedComments);
      
      // Update users list if needed
      if (updatedComments.length === 0) {
        setUsersList([]);
        setFilteredUsers([]);
      } else {
        // Recalculate user counts
        const userMap = new Map<string, CommentUser>();
        updatedComments.forEach((comment: Comment) => {
          const userId = comment.user.id;
          if (userMap.has(userId)) {
            const userData = userMap.get(userId)!;
            userData.count += 1;
            
            // Store comment text for search functionality
            if (!userData.commentTexts) {
              userData.commentTexts = [];
            }
            if (comment.text && comment.text.trim()) {
              userData.commentTexts.push(comment.text.trim());
            }
            
            userMap.set(userId, userData);
          } else {
            const commentTexts = comment.text && comment.text.trim() ? [comment.text.trim()] : [];
            userMap.set(userId, {
              id: comment.user.id,
              username: comment.user.username,
              avatar: comment.user.avatar,
              isVerified: comment.user.isVerified,
              count: 1,
              commentTexts
            });
          }
        });
        
        // Convert to array and sort by comment count
        const users = Array.from(userMap.values())
          .sort((a, b) => b.count - a.count);
        
        setUsersList(users);
        setFilteredUsers(users);
      }
      
      // Show success toast
      DeviceEventEmitter.emit('SHOW_TOAST', {
        message: 'Comment deleted successfully',
        type: 'success'
      });
      
      // If we deleted all comments from a specific user, go back to users list
      if (selectedUser) {
        const userStillHasComments = updatedComments.some(c => c.user.id === selectedUser);
        if (!userStillHasComments) {
          setSelectedUser(null);
        }
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      
      // Show a more specific error message
      let errorMessage = 'Failed to delete comment';
      if (error instanceof Error) {
        if (error.message.includes('permission')) {
          errorMessage = 'You do not have permission to delete this comment';
        } else if (error.message.includes('Authentication')) {
          errorMessage = 'Please sign in again to delete comments';
        }
      }
      
      DeviceEventEmitter.emit('SHOW_TOAST', {
        message: errorMessage,
        type: 'error'
      });
    } finally {
      setDeleteLoading(false);
      setConfirmDeleteVisible(false);
      setCommentToDelete(null);
    }
  };

  // Render the all comments view
  const renderAllComments = () => {
    const isVideoOwner = canDeleteComment();
    
    return (
      <FlatList
        data={filteredComments}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.commentItem}>
            <View style={styles.commentUserRow}>
              <TouchableOpacity 
                style={styles.commentUserTouchable}
                onPress={() => router.push({
                  pathname: "/user-profile",
                  params: { id: item.user.id }
                } as any)}
              >
                <Image 
                  source={{ 
                    uri: item.user.avatar || 'https://randomuser.me/api/portraits/lego/1.jpg' 
                  }} 
                  style={styles.commentAvatarSmall} 
                />
                <View style={styles.commentUserDetails}>
                  <View style={styles.userNameContainer}>
                    <Text style={styles.commentUsername}>{item.user.username}</Text>
                    {item.user.isVerified && <TunnelVerifiedMark size={12} />}
                    <View style={styles.profileLinkIndicator}>
                      <Text style={styles.profileLinkText}>View Profile</Text>
                    </View>
                  </View>
                  <Text style={styles.commentTime}>
                    {formatRelativeTime(item.createdAt)}
                  </Text>
                </View>
              </TouchableOpacity>
              
              {isVideoOwner && (
                <TouchableOpacity 
                  style={styles.deleteButton}
                  onPress={() => handleDeleteComment(item.id)}
                >
                  <Trash2 size={16} color="#FF3B30" />
                </TouchableOpacity>
              )}
            </View>
            
            <Text style={styles.commentText}>{item.text}</Text>
            
            <View style={styles.commentActions}>
              <View style={styles.commentAction}>
                <Heart size={14} color="#888" />
                <Text style={styles.commentActionText}>{item.likes}</Text>
              </View>
              
              <TouchableOpacity 
                style={styles.replyButton}
                onPress={() => {
                  DeviceEventEmitter.emit('SHOW_TOAST', {
                    message: 'Reply feature coming soon',
                    type: 'info'
                  });
                }}
              >
                <Text style={styles.replyButtonText}>Reply</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListHeaderComponent={
          <View>
            {/* Tabs */}
            <View style={styles.tabsContainer}>
              <TouchableOpacity 
                style={[
                  styles.tab, 
                  activeTab === 'all' && styles.activeTab
                ]}
                onPress={() => setActiveTab('all')}
              >
                <Text style={[
                  styles.tabText,
                  activeTab === 'all' && styles.activeTabText
                ]}>All Comments</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.tab, 
                  activeTab === 'users' && styles.activeTab
                ]}
                onPress={() => setActiveTab('users')}
              >
                <Text style={[
                  styles.tabText,
                  activeTab === 'users' && styles.activeTabText
                ]}>By User</Text>
              </TouchableOpacity>
            </View>
            
            {/* Search */}
            <View style={styles.searchContainer}>
              <View style={styles.searchIconContainer}>
                <Search color="#888" size={18} />
              </View>
              <TextInput
                style={styles.searchInput}
                placeholder="Search comments..."
                placeholderTextColor="#666"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity 
                  style={styles.clearButton}
                  onPress={() => setSearchQuery('')}
                >
                  <X color="#888" size={16} />
                </TouchableOpacity>
              )}
            </View>
            
            {/* No results message */}
            {searchQuery.length > 0 && filteredComments.length === 0 && (
              <View style={styles.noResultsContainer}>
                <Text style={styles.noResultsText}>No comments found matching "{searchQuery}"</Text>
              </View>
            )}
            
            {/* Comments count */}
            <View style={styles.commentsHeader}>
              <Text style={styles.commentsTitle}>Video Comments</Text>
              <Text style={styles.commentsSubtitle}>
                {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
              </Text>
            </View>
          </View>
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.commentsListContent}
        ListEmptyComponent={
          searchQuery.length > 0 ? null : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>No comments found</Text>
            </View>
          )
        }
      />
    );
  };

  // Update the existing renderUsersList to include tabs
  const renderUsersList = () => {
    return (
      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          // Check if there's a search query match in the comments
          let matchingComment = '';
          if (searchQuery && searchQuery.trim() !== '' && item.commentTexts && item.commentTexts.length > 0) {
            const query = searchQuery.toLowerCase();
            
            // Find first comment containing the search query
            const matchedComment = item.commentTexts.find(text => 
              text.toLowerCase().includes(query)
            );
            
            if (matchedComment) {
              // Create a snippet with the matching text
              const matchIndex = matchedComment.toLowerCase().indexOf(query);
              const startIndex = Math.max(0, matchIndex - 15);
              const endIndex = Math.min(matchedComment.length, matchIndex + searchQuery.length + 15);
              
              matchingComment = startIndex > 0 ? '...' : '';
              matchingComment += matchedComment.substring(startIndex, endIndex);
              matchingComment += endIndex < matchedComment.length ? '...' : '';
            }
          }
          
          return (
            <TouchableOpacity 
              style={styles.commentUserItem}
              onPress={() => setSelectedUser(item.id)}
            >
              <TouchableOpacity
                style={styles.userProfileLink}
                onPress={() => router.push({
                  pathname: "/user-profile",
                  params: { id: item.id }
                } as any)}
              >
                <Image 
                  source={{ 
                    uri: item.avatar || 'https://randomuser.me/api/portraits/lego/1.jpg' 
                  }} 
                  style={styles.commentAvatar} 
                />
                
                <View style={styles.commentUserInfo}>
                  <View style={styles.userNameContainer}>
                    <Text style={styles.commentUsername}>{item.username}</Text>
                    {item.isVerified && <TunnelVerifiedMark size={12} />}
                    <View style={styles.profileLinkIndicator}>
                      <Text style={styles.profileLinkText}>View Profile</Text>
                    </View>
                  </View>
                  <Text style={styles.commentCountText}>
                    {item.count} {item.count === 1 ? 'comment' : 'comments'}
                  </Text>
                  
                  {/* Show matching comment text if found */}
                  {matchingComment ? (
                    <Text style={styles.matchedCommentText} numberOfLines={1}>
                      <Text style={styles.matchLabel}>Matched: </Text>
                      {matchingComment}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
              
              <View style={styles.userDetailButton}>
                <ChevronRight color="#888" size={18} />
              </View>
            </TouchableOpacity>
          );
        }}
        ListHeaderComponent={
          <View>
            {/* Tabs */}
            <View style={styles.tabsContainer}>
              <TouchableOpacity 
                style={[
                  styles.tab, 
                  activeTab === 'all' && styles.activeTab
                ]}
                onPress={() => setActiveTab('all')}
              >
                <Text style={[
                  styles.tabText,
                  activeTab === 'all' && styles.activeTabText
                ]}>All Comments</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.tab, 
                  activeTab === 'users' && styles.activeTab
                ]}
                onPress={() => setActiveTab('users')}
              >
                <Text style={[
                  styles.tabText,
                  activeTab === 'users' && styles.activeTabText
                ]}>By User</Text>
              </TouchableOpacity>
            </View>
            
            {/* Search */}
            <View style={styles.searchContainer}>
              <View style={styles.searchIconContainer}>
                <Search color="#888" size={18} />
              </View>
              <TextInput
                style={styles.searchInput}
                placeholder="Search users or comments..."
                placeholderTextColor="#666"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity 
                  style={styles.clearButton}
                  onPress={() => setSearchQuery('')}
                >
                  <X color="#888" size={16} />
                </TouchableOpacity>
              )}
            </View>
            
            {searchQuery.length > 0 && filteredUsers.length === 0 && (
              <View style={styles.noResultsContainer}>
                <Text style={styles.noResultsText}>No users or comments found matching "{searchQuery}"</Text>
              </View>
            )}
            
            <View style={styles.commentsHeader}>
              <Text style={styles.commentsTitle}>Users who commented</Text>
              <Text style={styles.commentsSubtitle}>
                {usersList.length} {usersList.length === 1 ? 'user' : 'users'} left {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
              </Text>
            </View>
          </View>
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.commentsListContent}
        ListEmptyComponent={
          searchQuery.length > 0 ? null : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>No users found</Text>
            </View>
          )
        }
      />
    );
  };

  // Render the comments for a selected user
  const renderUserComments = () => {
    const userComments = getUserComments();
    const userDetails = userComments[0]?.user;
    const isVideoOwner = canDeleteComment();
    
    return (
      <FlatList
        data={userComments}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.commentItem}>
            <View style={styles.commentContent}>
              <View style={styles.commentHeader}>
                <Text style={styles.commentTime}>
                  {formatRelativeTime(item.createdAt)}
                </Text>
                
                {isVideoOwner && (
                  <TouchableOpacity 
                    style={styles.deleteButton}
                    onPress={() => handleDeleteComment(item.id)}
                  >
                    <Trash2 size={16} color="#FF3B30" />
                  </TouchableOpacity>
                )}
              </View>
              
              <Text style={styles.commentText}>{item.text}</Text>
              
              <View style={styles.commentActions}>
                <View style={styles.commentAction}>
                  <Heart size={14} color="#888" />
                  <Text style={styles.commentActionText}>{item.likes}</Text>
                </View>
                
                <TouchableOpacity 
                  style={styles.replyButton}
                  onPress={() => {
                    DeviceEventEmitter.emit('SHOW_TOAST', {
                      message: 'Reply feature coming soon',
                      type: 'info'
                    });
                  }}
                >
                  <Text style={styles.replyButtonText}>Reply</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
        ListHeaderComponent={
          <View style={styles.userCommentsHeader}>
            <TouchableOpacity 
              style={styles.backToUsersButton}
              onPress={() => setSelectedUser(null)}
            >
              <ArrowLeft color="#1877F2" size={18} />
              <Text style={styles.backToUsersText}>All Users</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.selectedUserInfo}
              onPress={() => {
                if (userDetails && userDetails.id) {
                  router.push({
                    pathname: "/user-profile",
                    params: { id: userDetails.id }
                  } as any);
                }
              }}
            >
              <Image 
                source={{ 
                  uri: userDetails?.avatar || 'https://randomuser.me/api/portraits/lego/1.jpg' 
                }} 
                style={styles.selectedUserAvatar} 
              />
              <View style={styles.selectedUserNameContainer}>
                <Text style={styles.selectedUserName}>{userDetails?.username}</Text>
                {userDetails?.isVerified && <TunnelVerifiedMark size={14} />}
              </View>
              <Text style={styles.selectedUserCommentsCount}>
                {userComments.length} {userComments.length === 1 ? 'comment' : 'comments'}
              </Text>
            </TouchableOpacity>
          </View>
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.commentsListContent}
      />
    );
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1877F2" />
        <Text style={styles.loadingText}>Loading comments...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft color="#FFF" size={24} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Comment Details</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>{videoTitle}</Text>
          </View>
          <View style={styles.headerRight} />
        </View>
      </SafeAreaView>
      
      {/* Empty state if no comments */}
      {comments.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MessageCircle color="#333" size={40} />
          <Text style={styles.emptyText}>No Comments Yet</Text>
          <Text style={styles.emptySubtext}>
            Comments on your video will appear here.
          </Text>
        </View>
      ) : (
        // Content based on selection
        selectedUser ? 
          renderUserComments() : 
          (activeTab === 'all' ? renderAllComments() : renderUsersList())
      )}
      
      {/* Delete Confirmation Modal */}
      <Modal
        visible={confirmDeleteVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setConfirmDeleteVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModal}>
            <View style={styles.deleteModalIcon}>
              <AlertTriangle size={30} color="#FF3B30" />
            </View>
            <Text style={styles.deleteModalTitle}>Delete Comment</Text>
            <Text style={styles.deleteModalText}>
              Are you sure you want to delete this comment? This action cannot be undone.
            </Text>
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setConfirmDeleteVisible(false)}
                disabled={deleteLoading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.confirmDeleteButton}
                onPress={confirmDeleteComment}
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.confirmDeleteText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  safeArea: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    zIndex: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  headerSubtitle: {
    color: '#999',
    fontSize: 12,
    marginTop: 2,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 16,
  },
  commentsHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 8,
  },
  commentsTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  commentsSubtitle: {
    color: '#888',
    fontSize: 14,
  },
  commentsListContent: {
    paddingBottom: 20,
  },
  commentUserItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  commentAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  commentUserInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  userNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentUsername: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 6,
  },
  commentCountText: {
    color: '#999',
    fontSize: 14,
  },
  userDetailButton: {
    padding: 8,
  },
  userCommentsHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backToUsersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backToUsersText: {
    color: '#1877F2',
    fontSize: 14,
    marginLeft: 4,
  },
  selectedUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedUserAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  selectedUserNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedUserName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 6,
  },
  selectedUserCommentsCount: {
    color: '#888',
    fontSize: 12,
    marginLeft: 'auto',
  },
  commentItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentTime: {
    color: '#888',
    fontSize: 12,
  },
  commentText: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 12,
  },
  commentActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  commentAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentActionText: {
    color: '#888',
    fontSize: 12,
    marginLeft: 4,
  },
  replyButton: {
    padding: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    backgroundColor: 'rgba(24, 119, 242, 0.1)',
  },
  replyButtonText: {
    color: '#1877F2',
    fontSize: 12,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    maxWidth: '70%',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 12,
    marginHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchIconContainer: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    color: '#fff',
    fontSize: 16,
  },
  clearButton: {
    padding: 8,
  },
  noResultsContainer: {
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  noResultsText: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
  },
  noDataContainer: {
    padding: 24,
    alignItems: 'center',
  },
  noDataText: {
    color: '#999',
    fontSize: 16,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    width: 36,
    height: 36,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  deleteModal: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxWidth: 340,
    alignItems: 'center',
  },
  deleteModalIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  deleteModalTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  deleteModalText: {
    color: '#CCC',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  cancelButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
  },
  confirmDeleteButton: {
    flex: 1,
    backgroundColor: '#FF3B30',
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    marginLeft: 8,
  },
  confirmDeleteText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
  },
  matchedCommentText: {
    color: '#888',
    fontSize: 12,
    marginTop: 5,
    fontStyle: 'italic',
  },
  matchLabel: {
    color: '#1877F2',
    fontWeight: '600',
  },
  tabsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#1877F2',
  },
  tabText: {
    color: '#999',
    fontSize: 16,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#1877F2',
    fontWeight: '600',
  },
  commentUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    justifyContent: 'space-between',
  },
  commentAvatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  commentUserDetails: {
    flex: 1,
  },
  commentUserTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 0.9,
    marginRight: 4,
  },
  userProfileLink: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileLinkIndicator: {
    backgroundColor: 'rgba(24, 119, 242, 0.1)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    marginLeft: 10,
  },
  profileLinkText: {
    color: '#1877F2',
    fontSize: 10,
    fontWeight: '500',
  },
}); 