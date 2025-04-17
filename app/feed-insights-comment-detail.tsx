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
  Platform,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import { useLocalSearchParams, useRouter, router } from 'expo-router';
import { 
  ArrowLeft, 
  Heart, 
  MessageCircle, 
  ChevronRight,
  Search,
  X,
  Trash2,
  AlertTriangle,
  UserCircle,
  Send,
} from 'lucide-react-native';
import { useSanityAuth } from '../app/hooks/useSanityAuth';
import * as postService from '@/tunnel-ad-main/services/postService';
import { createClient } from '@sanity/client';
import { DeviceEventEmitter } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, formatDistance } from 'date-fns';

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
  isCurrentUser?: boolean;
}

// Add a fallback token for admin operations
const SANITY_API_TOKEN = 'skfYBXlqcVRszR6D3U2X3hPAMKupissIjK6LehFgtmYRkavBwU49tXYqryhOliJ7mclzM38VivW4vz75T6edrwsmwGPwgFEHxgANwxVnFNDFBq9pWjLhSd6dfB4yJNbVbgfkKlkocZ1VgYpd2ldczW64WNhqiTkclddkAxaTinVBhF9NMme0';

export default function FeedInsightsCommentDetail() {
  const params = useLocalSearchParams();
  const postId = params.postId as string;
  const postContent = params.postContent as string;
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
  const [postOwnerId, setPostOwnerId] = useState<string | null>(null);
  const [currentUserToken, setCurrentUserToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'users'>('all');
  const [filteredComments, setFilteredComments] = useState<Comment[]>([]);
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [commentsRestricted, setCommentsRestricted] = useState(false);
  const [allowedCommentUsers, setAllowedCommentUsers] = useState<string[]>([]);
  const [isToggleCommentsLoading, setIsToggleCommentsLoading] = useState(false);

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
    setActiveTab('all'); // Reset to 'all' tab when loading new post
    setSelectedUser(null); // Reset selected user
    fetchComments();
  }, [postId]);

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

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Add listener for comment restriction changes from other screens
  useEffect(() => {
    const restrictionChangeListener = DeviceEventEmitter.addListener(
      'COMMENT_RESTRICTIONS_CHANGED',
      (data) => {
        // Check if this update is for the current post
        if (data.postId === postId) {
          console.log('Received comment restriction update from another screen:', data);
          
          // Update the UI with the new restrictions
          setCommentsRestricted(data.restricted);
          setAllowedCommentUsers(data.allowedUsers || []);
        }
      }
    );
    
    // Clean up the listener on unmount
    return () => {
      restrictionChangeListener.remove();
    };
  }, [postId]);

  // Handle back button press
  const handleBackPress = () => {
    router.back();
  };

  const fetchComments = async () => {
    try {
      setLoading(true);
      
      // Fetch comments for the post and also get the post owner ID
      const postData = await sanityClient.fetch(`
        *[_type == "post" && _id == $postId][0] {
          "authorId": author->_id,
          commentRestrictions,
          "comments": comments[] {
            _key,
            text,
            createdAt,
            _createdAt,
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
      `, { postId });
      
      // Save the post owner ID
      if (postData?.authorId) {
        setPostOwnerId(postData.authorId);
      }
      
      // Set comment restrictions
      if (postData?.commentRestrictions) {
        setCommentsRestricted(!!postData.commentRestrictions.restricted);
        setAllowedCommentUsers(postData.commentRestrictions.allowedUsers || []);
      } else {
        setCommentsRestricted(false);
        setAllowedCommentUsers([]);
      }
      
      // Process comments
      if (postData?.comments && postData.comments.length > 0) {
        const processedComments = postData.comments.map((comment: any) => ({
          id: comment._key,
          text: comment.text || '',
          createdAt: comment.createdAt || comment._createdAt || new Date().toISOString(),
          user: {
            id: comment.user?._id || 'unknown',
            username: comment.user?.username || 
                    (comment.user?.firstName ? 
                      `${comment.user.firstName} ${comment.user.lastName || ''}` : 
                      'Unknown User'),
            avatar: comment.user?.avatar ? 
                  postService.urlFor(comment.user.avatar).url() : 
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
        
        // Convert map to array and sort by comment count (highest first)
        const usersList = Array.from(userMap.values()).sort((a, b) => b.count - a.count);
        setUsersList(usersList);
        setFilteredUsers(usersList);
      } else {
        // No comments found
        setComments([]);
        setFilteredComments([]);
        setUsersList([]);
        setFilteredUsers([]);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
      // Show error state
      setComments([]);
      setFilteredComments([]);
      setUsersList([]);
      setFilteredUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // Format relative time for comments (e.g. "2 hours ago")
  const formatRelativeTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        return 'Recently';
      }
      
      // Format the date using date-fns
      return formatDistance(date, now, { addSuffix: true });
    } catch (e) {
      console.error('Error formatting date:', e);
      return 'Recently';
    }
  };

  // Get comments for a specific user
  const getUserComments = () => {
    if (!selectedUser) return [];
    return comments.filter(comment => comment.user.id === selectedUser);
  };

  // Check if the current user can delete a comment
  const canDeleteComment = (): boolean => {
    // If no user is logged in, they can't delete anything
    if (!user) return false;
    
    // Current user is the post owner or admin
    const isAdmin = user.username === 'admin' || user.username === 'moderator';
    const isPostOwner = user._id === postOwnerId;
    
    return isAdmin || isPostOwner;
  };

  // Handle delete comment action
  const handleDeleteComment = (commentId: string) => {
    setCommentToDelete(commentId);
    setConfirmDeleteVisible(true);
  };

  // Confirm and execute comment deletion
  const confirmDeleteComment = async () => {
    if (!commentToDelete || !currentUserToken) return;
    
    try {
      setDeleteLoading(true);
      
      // Create authenticated client with token
      const authenticatedClient = createClient({
        projectId: '21is7976',
        dataset: 'production',
        token: currentUserToken || SANITY_API_TOKEN, // Use user token or fallback to admin token
        useCdn: false,
        apiVersion: '2023-03-01'
      });
      
      // First, fetch the current post document
      const post = await authenticatedClient.fetch(
        `*[_type == "post" && _id == $postId][0]`,
        { postId }
      );
      
      if (!post) {
        throw new Error('Post not found');
      }
      
      // Filter out the comment to delete
      const updatedComments = (post.comments || []).filter(
        (comment: any) => comment._key !== commentToDelete
      );
      
      // Update the post with filtered comments
      await authenticatedClient
        .patch(postId)
        .set({ comments: updatedComments })
        .commit();
      
      // Update local state
      setComments(prevComments => 
        prevComments.filter(comment => comment.id !== commentToDelete)
      );
      setFilteredComments(prevFiltered => 
        prevFiltered.filter(comment => comment.id !== commentToDelete)
      );
      
      // If in user view, update the user's comment count or remove if this was their last comment
      if (selectedUser) {
        const userUpdatedComments = getUserComments().filter(
          comment => comment.id !== commentToDelete
        );
        
        if (userUpdatedComments.length === 0) {
          // This was the user's last comment, go back to all users view
          setSelectedUser(null);
          setActiveTab('users');
        }
      }
      
      // Update users list
      setUsersList(prevUsers => {
        const commentToDeleteData = comments.find(c => c.id === commentToDelete);
        if (!commentToDeleteData) return prevUsers;
        
        const userId = commentToDeleteData.user.id;
        return prevUsers.map(u => {
          if (u.id !== userId) return u;
          
          // Decrement count and remove comment text
          const updatedUser = { ...u, count: u.count - 1 };
          if (updatedUser.commentTexts) {
            updatedUser.commentTexts = updatedUser.commentTexts.filter(
              text => text !== commentToDeleteData.text
            );
          }
          
          return updatedUser;
        }).filter(u => u.count > 0); // Remove users with no comments
      });
      
      // Show success message
      DeviceEventEmitter.emit('SHOW_TOAST', { 
        message: 'Comment deleted successfully', 
        type: 'success' 
      });
    } catch (error) {
      console.error('Error deleting comment:', error);
      DeviceEventEmitter.emit('SHOW_TOAST', { 
        message: 'Failed to delete comment', 
        type: 'error' 
      });
    } finally {
      setDeleteLoading(false);
      setConfirmDeleteVisible(false);
      setCommentToDelete(null);
    }
  };

  // Add this function after confirmDeleteComment
  const toggleCommentRestrictions = async (restricted: boolean) => {
    // Only post owner or admin can toggle comment restrictions
    if (!(user && (user._id === postOwnerId || user.username === 'admin' || user.username === 'moderator'))) {
      Alert.alert("Unauthorized", "Only the post owner can change comment restrictions.");
      return;
    }
    
    setIsToggleCommentsLoading(true);
    
    try {
      // Optimistic UI update
      setCommentsRestricted(restricted);
      
      // If restricting comments and no users are allowed, at least allow the post owner
      if (restricted && allowedCommentUsers.length === 0 && postOwnerId) {
        setAllowedCommentUsers([postOwnerId]);
      }
      
      // Create authenticated client with token
      const authenticatedClient = createClient({
        projectId: '21is7976',
        dataset: 'production',
        token: currentUserToken || SANITY_API_TOKEN,
        useCdn: false,
        apiVersion: '2023-03-01'
      });
      
      // Update the post with comment restrictions
      await authenticatedClient
        .patch(postId)
        .set({ 
          commentRestrictions: {
            _type: 'object',
            restricted: restricted,
            allowedUsers: restricted ? 
              (allowedCommentUsers.length > 0 ? allowedCommentUsers : (postOwnerId ? [postOwnerId] : [])) : 
              []
          }
        })
        .commit();
      
      // Also emit an event that other screens can listen for
      DeviceEventEmitter.emit('COMMENT_RESTRICTIONS_CHANGED', {
        postId,
        restricted,
        allowedUsers: restricted ? 
          (allowedCommentUsers.length > 0 ? allowedCommentUsers : (postOwnerId ? [postOwnerId] : [])) : 
          []
      });
      
      Alert.alert('Success', `Comments are now ${restricted ? 'closed' : 'open to everyone'}`);
    } catch (err) {
      console.error('Error updating comment restrictions:', err);
      
      // Revert optimistic update if failed
      setCommentsRestricted(!restricted);
      
      Alert.alert('Error', 'Failed to update comment settings. Please try again.');
    } finally {
      setIsToggleCommentsLoading(false);
    }
  };

  // Add this function to check if the user is the post owner
  const isUserPostOwner = (): boolean => {
    return !!user && !!postOwnerId && user._id === postOwnerId;
  };

  // Navigate to user profile
  const handleViewProfile = (userId: string) => {
    if (!userId) return;
    // Navigate to user-profile screen with the id param
    router.push({
      pathname: `/user-profile` as any,
      params: { id: userId }
    });
  };

  // Add this new function after handleViewProfile
  const handleReplyToComment = (comment: Comment) => {
    if (!comment || !comment.id) return;
    
    // Navigate to the post detail screen with reply information
    router.push({
      pathname: `/feedpost-detail` as any,
      params: { 
        id: postId,
        showComments: 'true',
        replyToUser: comment.user.username,
        replyToCommentId: comment.id
      }
    });
  };

  // Add this function after handleReplyToComment
  const handleViewPostDetail = () => {
    // Navigate to the post detail screen without reply parameters
    router.push({
      pathname: `/feedpost-detail` as any,
      params: { 
        id: postId
      }
    });
  };

  const handleStartReply = (comment: Comment) => {
    setReplyingTo(comment);
    // Remove @ if it exists in the username
    const username = comment.user.username.startsWith('@') 
      ? comment.user.username.substring(1) 
      : comment.user.username;
    setReplyText(`@${username} `);
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setReplyText('');
  };

  const submitReply = async () => {
    if (!replyingTo || !replyText.trim() || !user) {
      return;
    }
    
    setIsSubmittingReply(true);
    
    try {
      // Get authenticated client
      const authenticatedClient = createClient({
        projectId: '21is7976',
        dataset: 'production',
        token: currentUserToken || SANITY_API_TOKEN,
        useCdn: false,
        apiVersion: '2023-03-01'
      });
      
      // First, fetch the current post document
      const post = await authenticatedClient.fetch(
        `*[_type == "post" && _id == $postId][0]`,
        { postId }
      );
      
      if (!post) {
        throw new Error('Post not found');
      }
      
      // Create a new comment with parent reference
      const newComment = {
        _type: 'comment',
        _key: `comment_${new Date().getTime()}`,
        text: replyText,
        createdAt: new Date().toISOString(),
        author: {
          _type: 'reference',
          _ref: user._id
        },
        likes: 0,
        parentComment: replyingTo.id // Set the parent comment reference
      };
      
      // Add the new comment to the post's comments array
      const updatedComments = [...(post.comments || []), newComment];
      
      // Update the post with the new comment
      await authenticatedClient
        .patch(postId)
        .set({ comments: updatedComments })
        .commit();
      
      // Show success message
      DeviceEventEmitter.emit('SHOW_TOAST', { 
        message: 'Reply posted successfully', 
        type: 'success' 
      });
      
      // Reset state
      setReplyingTo(null);
      setReplyText('');
      
      // Refresh comments to show the new reply
      fetchComments();
    } catch (error) {
      console.error('Error posting reply:', error);
      DeviceEventEmitter.emit('SHOW_TOAST', { 
        message: 'Failed to post reply', 
        type: 'error' 
      });
    } finally {
      setIsSubmittingReply(false);
    }
  };

  // Render all comments
  const renderAllComments = () => {
    return (
      <FlatList
        data={filteredComments}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isCommentByCurrentUser = user && 
            item.user.id === (user as any)?._id;
          const canDelete = canDeleteComment() || isCommentByCurrentUser;
          
          return (
            <View style={styles.commentItem}>
              <TouchableOpacity
                onPress={() => handleViewProfile(item.user.id)}
              >
                <Image 
                  source={item.user.avatar ? {uri: item.user.avatar} : require('../assets/images/default-avatar.jpg')}
                  style={styles.commentAvatar}
                />
              </TouchableOpacity>
              <View style={styles.commentContent}>
                <View style={styles.commentHeader}>
                  <TouchableOpacity 
                    onPress={() => handleViewProfile(item.user.id)}
                    style={styles.usernameContainer}
                  >
                    <Text style={styles.commentUserName}>
                      {item.user.username.startsWith('@') ? item.user.username.substring(1) : item.user.username}
                    </Text>
                  </TouchableOpacity>
                  {item.user.isVerified && (
                    <View style={styles.verifiedBadgeContainer}>
                      <TunnelVerifiedMark size={16} />
                    </View>
                  )}
                  {isCommentByCurrentUser && (
                    <View style={styles.youBadge}>
                      <Text style={styles.youBadgeText}>YOU</Text>
                    </View>
                  )}
                  <Text style={styles.commentTime}>{formatRelativeTime(item.createdAt)}</Text>
                  {canDelete && (
                    <TouchableOpacity 
                      style={styles.deleteButton}
                      onPress={() => handleDeleteComment(item.id)}
                    >
                      <Trash2 color="#FF3B30" size={16} />
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={styles.commentText}>{item.text}</Text>
                <View style={styles.commentActions}>
                  <TouchableOpacity style={styles.commentAction}>
                    <Heart color="#9b9b9b" size={14} style={styles.actionIcon} />
                    <Text style={styles.commentActionText}>Like</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.commentAction}
                    onPress={() => handleStartReply(item)}
                  >
                    <MessageCircle color="#9b9b9b" size={14} style={styles.actionIcon} />
                    <Text style={styles.commentActionText}>Reply</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        }}
        ListHeaderComponent={
          <View>
            <View style={styles.commentsHeader}>
              <View style={styles.tabs}>
                <TouchableOpacity 
                  style={[styles.tab, activeTab === 'all' && styles.activeTab]}
                  onPress={() => setActiveTab('all')}
                >
                  <Text style={[
                    styles.tabText, 
                    activeTab === 'all' && styles.activeTabText
                  ]}>
                    All Comments
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.tab, activeTab === 'users' && styles.activeTab]}
                  onPress={() => setActiveTab('users')}
                >
                  <Text style={[
                    styles.tabText, 
                    activeTab === 'users' && styles.activeTabText
                  ]}>
                    Users
                  </Text>
                </TouchableOpacity>
              </View>
              
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
              
              {searchQuery.length > 0 && filteredComments.length === 0 && (
                <View style={styles.noResultsContainer}>
                  <Text style={styles.noResultsText}>No comments found matching "{searchQuery}"</Text>
                </View>
              )}
              
              {/* Comments count */}
              <View style={styles.commentsCountContainer}>
                <View>
                  <Text style={styles.commentsTitle}>Post Comments</Text>
                  <Text style={styles.commentsSubtitle}>
                    {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
                  </Text>
                </View>
                <TouchableOpacity 
                  onPress={handleViewPostDetail}
                  style={styles.viewPostButton}
                >
                  <Text style={styles.viewPostText}>View Post</Text>
                </TouchableOpacity>
              </View>
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

  // Render users who have commented
  const renderUsersList = () => {
    return (
      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isCurrentUser = user && item.id === user._id;
          return (
            <TouchableOpacity 
              style={[styles.userItem, isCurrentUser && styles.currentUserItem]}
              onPress={() => {
                setSelectedUser(item.id);
                setActiveTab('all');
              }}
            >
              <TouchableOpacity 
                onPress={() => handleViewProfile(item.id)}
                style={styles.userAvatarContainer}
              >
                <Image 
                  source={item.avatar ? {uri: item.avatar} : require('../assets/images/default-avatar.jpg')}
                  style={styles.userAvatar}
                />
              </TouchableOpacity>
              <View style={styles.userInfo}>
                <View style={styles.userNameContainer}>
                  <TouchableOpacity 
                    style={styles.usernameContainer}
                    onPress={() => handleViewProfile(item.id)}
                  >
                    <Text style={styles.username}>
                      {item.username}
                    </Text>
                    {item.isVerified && (
                      <View style={styles.verifiedBadgeContainer}>
                        <TunnelVerifiedMark size={16} />
                      </View>
                    )}
                  </TouchableOpacity>
                
                  {isCurrentUser && (
                    <View style={styles.userYouBadge}>
                      <Text style={styles.youBadgeText}>You</Text>
                    </View>
                  )}
                </View>
                
                <View style={styles.commentInfo}>
                  <MessageCircle color="#1877F2" size={14} />
                  <Text style={styles.commentCount}>
                    {item.count} {item.count === 1 ? 'comment' : 'comments'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.viewCommentsButton}>
                <Text style={styles.viewCommentsText}>View</Text>
                <ChevronRight color="#1877F2" size={16} />
              </View>
            </TouchableOpacity>
          );
        }}
        ListHeaderComponent={
          <View>
            <View style={styles.usersHeader}>
              <View style={styles.tabs}>
                <TouchableOpacity 
                  style={[styles.tab, activeTab === 'all' && styles.activeTab]}
                  onPress={() => setActiveTab('all')}
                >
                  <Text style={[
                    styles.tabText, 
                    activeTab === 'all' && styles.activeTabText
                  ]}>
                    All Comments
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.tab, activeTab === 'users' && styles.activeTab]}
                  onPress={() => setActiveTab('users')}
                >
                  <Text style={[
                    styles.tabText, 
                    activeTab === 'users' && styles.activeTabText
                  ]}>
                    Users
                  </Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.searchContainer}>
                <View style={styles.searchIconContainer}>
                  <Search color="#888" size={18} />
                </View>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search users..."
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
                  <Text style={styles.noResultsText}>No users found matching "{searchQuery}"</Text>
                </View>
              )}
              
              {/* Users count */}
              <View style={styles.commentsCountContainer}>
                <View>
                  <Text style={styles.commentsTitle}>Users who commented</Text>
                  <Text style={styles.commentsSubtitle}>
                    {usersList.length} {usersList.length === 1 ? 'user' : 'users'} left {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
                  </Text>
                </View>
                <TouchableOpacity 
                  onPress={handleViewPostDetail}
                  style={styles.viewPostButton}
                >
                  <Text style={styles.viewPostText}>View Post</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.usersListContent}
        ListEmptyComponent={
          searchQuery.length > 0 ? null : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>No commenters found</Text>
            </View>
          )
        }
      />
    );
  };

  // Render comments from a specific user
  const renderUserComments = () => {
    const userComments = getUserComments();
    const userDetail = usersList.find(u => u.id === selectedUser);
    
    return (
      <FlatList
        data={userComments}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isCommentByCurrentUser = user && 
            item.user.id === (user as any)?._id;
          const canDelete = canDeleteComment() || isCommentByCurrentUser;
          
          return (
            <View style={styles.commentItem}>
              <TouchableOpacity
                onPress={() => handleViewProfile(item.user.id)}
              >
                <Image 
                  source={item.user.avatar ? {uri: item.user.avatar} : require('../assets/images/default-avatar.jpg')}
                  style={styles.commentAvatar}
                />
              </TouchableOpacity>
              <View style={styles.commentContent}>
                <View style={styles.commentHeader}>
                  <TouchableOpacity 
                    onPress={() => handleViewProfile(item.user.id)}
                    style={styles.usernameContainer}
                  >
                    <Text style={styles.commentUserName}>
                      {item.user.username.startsWith('@') ? item.user.username.substring(1) : item.user.username}
                    </Text>
                  </TouchableOpacity>
                  {item.user.isVerified && (
                    <View style={styles.verifiedBadgeContainer}>
                      <TunnelVerifiedMark size={16} />
                    </View>
                  )}
                  {isCommentByCurrentUser && (
                    <View style={styles.youBadge}>
                      <Text style={styles.youBadgeText}>YOU</Text>
                    </View>
                  )}
                  <Text style={styles.commentTime}>{formatRelativeTime(item.createdAt)}</Text>
                  {canDelete && (
                    <TouchableOpacity 
                      style={styles.deleteButton}
                      onPress={() => handleDeleteComment(item.id)}
                    >
                      <Trash2 color="#FF3B30" size={16} />
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={styles.commentText}>{item.text}</Text>
                <View style={styles.commentActions}>
                  <TouchableOpacity style={styles.commentAction}>
                    <Heart color="#9b9b9b" size={14} style={styles.actionIcon} />
                    <Text style={styles.commentActionText}>Like</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.commentAction}
                    onPress={() => handleStartReply(item)}
                  >
                    <MessageCircle color="#9b9b9b" size={14} style={styles.actionIcon} />
                    <Text style={styles.commentActionText}>Reply</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        }}
        ListHeaderComponent={
          <View>
            <View style={styles.userCommentsHeader}>
              <TouchableOpacity 
                style={styles.backToUsersButton}
                onPress={() => {
                  setSelectedUser(null);
                  setActiveTab('users');
                }}
              >
                <ArrowLeft color="#1877F2" size={16} />
                <Text style={styles.backToUsersText}>Back to Users</Text>
              </TouchableOpacity>
              
              <View style={styles.selectedUserInfo}>
                <TouchableOpacity 
                  onPress={() => handleViewProfile(selectedUser || '')}
                >
                  <Image 
                    source={userDetail?.avatar ? {uri: userDetail.avatar} : require('../assets/images/default-avatar.jpg')}
                    style={styles.selectedUserAvatar}
                  />
                </TouchableOpacity>
                <View style={styles.selectedUserDetails}>
                  <TouchableOpacity 
                    onPress={() => handleViewProfile(selectedUser || '')}
                    style={styles.selectedUserNameRow}
                  >
                    <Text style={styles.selectedUserName}>{userDetail?.username}</Text>
                    {userDetail?.isVerified && (
                      <View style={styles.verifiedBadgeContainer}>
                        <TunnelVerifiedMark size={16} />
                      </View>
                    )}
                  </TouchableOpacity>
                  <Text style={styles.selectedUserCommentCount}>
                    {userDetail?.count || 0} {userDetail?.count === 1 ? 'comment' : 'comments'}
                  </Text>
                </View>
                <TouchableOpacity 
                  onPress={handleViewPostDetail}
                  style={styles.viewPostButton}
                >
                  <Text style={styles.viewPostText}>View Post</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.commentsListContent}
        ListEmptyComponent={
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>No comments found for this user</Text>
          </View>
        }
      />
    );
  };

  // Render the main content
  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1877F2" />
          <Text style={styles.loadingText}>Loading comments...</Text>
        </View>
      );
    }

    if (selectedUser) {
      return renderUserComments();
    }

    return activeTab === 'all' ? renderAllComments() : renderUsersList();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
            <ArrowLeft color="#FFF" size={24} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>
              {selectedUser 
                ? 'User Comments' 
                : (activeTab === 'all' ? 'Comments Detail' : 'Commenters')}
            </Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>{postContent}</Text>
          </View>
          {(isUserPostOwner() || (user && (user.username === 'admin' || user.username === 'moderator'))) && (
            <TouchableOpacity 
              onPress={() => {
                Alert.alert(
                  "Comment Settings",
                  "Do you want to change comment visibility?",
                  [
                    {
                      text: commentsRestricted ? "Open Comments" : "Close Comments",
                      onPress: () => toggleCommentRestrictions(!commentsRestricted)
                    },
                    {
                      text: "Cancel",
                      style: "cancel"
                    }
                  ]
                )
              }}
              disabled={isToggleCommentsLoading}
              style={[
                styles.commentToggleButton,
                { backgroundColor: commentsRestricted ? '#FF3B30' : '#1877F2' }
              ]}
            >
              <MessageCircle color="#FFF" size={20} />
              {isToggleCommentsLoading ? (
                <ActivityIndicator size="small" color="#FFF" style={{marginLeft: 4}} />
              ) : (
                <Text style={styles.commentToggleText}>
                  {commentsRestricted ? "Closed" : "Open"}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
        
        {/* Comment restriction status */}
        {commentsRestricted && (
          <View style={styles.restrictionBanner}>
            <AlertTriangle color="#FF3B30" size={16} />
            <Text style={styles.restrictionText}>
              Comments are closed by the post owner
            </Text>
          </View>
        )}
      </View>
      
      {/* Main content */}
      <View style={styles.content}>
        {renderContent()}
      </View>
      
      {/* Delete confirmation modal */}
      <Modal
        visible={confirmDeleteVisible}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <AlertTriangle color="#FF3B30" size={24} />
              <Text style={styles.modalTitle}>Delete Comment</Text>
            </View>
            
            <Text style={styles.modalText}>
              Are you sure you want to delete this comment? This action cannot be undone.
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => {
                  setConfirmDeleteVisible(false);
                  setCommentToDelete(null);
                }}
                disabled={deleteLoading}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalDeleteButton}
                onPress={confirmDeleteComment}
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.modalDeleteButtonText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Reply Input */}
      {replyingTo && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
          style={[
            styles.replyInputContainer,
            keyboardVisible && Platform.OS === 'android' && { position: 'absolute', bottom: 0, left: 0, right: 0 }
          ]}
        >
          <View style={styles.replyingToBar}>
            <Text style={styles.replyingToText}>
              Replying to <Text style={styles.replyingToUsername}>@{replyingTo.user.username}</Text>
            </Text>
            <TouchableOpacity onPress={cancelReply} style={styles.cancelReplyButton}>
              <X color="#9b9b9b" size={16} />
            </TouchableOpacity>
          </View>
          <View style={styles.replyInputWrapper}>
            {user && user.profile?.avatar ? (
              <Image 
                source={{ uri: user.profile.avatar }} 
                style={styles.replyAvatar} 
              />
            ) : (
              <View style={styles.replyAvatarPlaceholder}>
                <UserCircle size={18} color="#666" />
              </View>
            )}
            <TextInput
              style={styles.replyTextInput}
              placeholder="Add a reply..."
              placeholderTextColor="#777"
              value={replyText}
              onChangeText={setReplyText}
              multiline
              autoFocus
            />
            <TouchableOpacity 
              style={[
                styles.replySendButton, 
                !replyText.trim() && styles.replySendButtonDisabled
              ]} 
              onPress={submitReply}
              disabled={!replyText.trim() || isSubmittingReply}
            >
              {isSubmittingReply ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Send size={18} color={replyText.trim() ? "#fff" : "#555"} />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  safeArea: {
    backgroundColor: '#000',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    backgroundColor: '#000',
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  headerSubtitle: {
    color: '#ccc',
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
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 16,
  },
  commentsHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    backgroundColor: '#111',
  },
  usersHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    backgroundColor: '#111',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    backgroundColor: '#111',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#fff',
  },
  tabText: {
    color: '#9b9b9b',
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#fff',
  },
  tabContent: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    backgroundColor: '#222',
    borderRadius: 8,
    alignItems: 'center',
    paddingHorizontal: 12,
    marginVertical: 8,
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
    padding: 4,
  },
  noResultsContainer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  noResultsText: {
    color: '#888',
    fontSize: 14,
  },
  commentsListContent: {
    paddingBottom: 24,
    backgroundColor: '#000',
  },
  usersListContent: {
    paddingBottom: 24,
    backgroundColor: '#000',
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  usernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 6,
    flexWrap: 'wrap',
    flex: 1,
  },
  commentUserName: {
    color: '#fff',
    fontWeight: '600',
    marginRight: 0,
    flexShrink: 1,
  },
  commentTime: {
    color: '#9b9b9b',
    fontSize: 12,
    marginLeft: 'auto',
    marginRight: 8,
  },
  commentText: {
    color: '#fff',
    marginBottom: 12,
    lineHeight: 30,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
  commentActions: {
    flexDirection: 'row',
    marginTop: 4,
  },
  commentAction: {
    marginRight: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentActionText: {
    color: '#9b9b9b',
    fontSize: 12,
    fontWeight: '500',
  },
  youBadge: {
    backgroundColor: '#1877F2',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 8,
  },
  youBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  deleteButton: {
    padding: 4,
  },
  actionIcon: {
    marginRight: 4,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  currentUserItem: {
    backgroundColor: 'rgba(24,119,242,0.1)',
  },
  userAvatarContainer: {
    marginRight: 12,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  userInfo: {
    flex: 1,
  },
  commentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  commentCount: {
    color: '#ccc',
    fontSize: 12,
    marginLeft: 4,
  },
  viewCommentsButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewCommentsText: {
    color: '#1877F2',
    fontSize: 14,
    marginRight: 4,
  },
  noDataContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noDataText: {
    color: '#888',
    fontSize: 16,
  },
  userCommentsHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    backgroundColor: '#111',
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
    justifyContent: 'space-between',
    backgroundColor: '#222',
    borderRadius: 12,
    padding: 12,
  },
  selectedUserAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  selectedUserDetails: {
    flex: 1,
  },
  selectedUserNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedUserName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 0,
  },
  selectedUserCommentCount: {
    color: '#ccc',
    fontSize: 12,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '80%',
    backgroundColor: '#222',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
  modalText: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalCancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444',
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  modalDeleteButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#FF3B30',
    flex: 1,
    marginLeft: 8,
    alignItems: 'center',
  },
  modalDeleteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  commentsCountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    backgroundColor: '#222',
    borderRadius: 8,
    marginTop: 8,
  },
  commentsTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  commentsSubtitle: {
    color: '#ccc',
    fontSize: 12,
  },
  username: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 0,
  },
  userNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    
  },
  userYouBadge: {
    backgroundColor: '#1877F2',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
    alignSelf: 'flex-start',
  },
  viewPostButton: {
    backgroundColor: '#1877F2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewPostText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  replyInputContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    backgroundColor: '#111',
    paddingBottom: Platform.OS === 'ios' ? 10 : 5,
    width: '100%',
    zIndex: 10,
  },
  replyingToBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  replyingToText: {
    color: '#9b9b9b',
    fontSize: 14,
  },
  replyingToUsername: {
    color: '#1877F2',
    fontWeight: '600',
  },
  cancelReplyButton: {
    padding: 8,
  },
  replyInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  replyAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  replyAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  replyTextInput: {
    flex: 1,
    backgroundColor: '#222',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: 'white',
    fontSize: 15,
    lineHeight: 20,
    maxHeight: 120,
    fontFamily: 'Inter_400Regular',
  },
  replySendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1877F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  replySendButtonDisabled: {
    backgroundColor: '#222',
  },
  verifiedBadgeContainer: {
    marginLeft: 1,
    marginRight: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 8,
  },
  commentToggleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  restrictionBanner: {
    padding: 12,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 59, 48, 0.3)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  restrictionText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
}); 