import { createClient } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Create a Sanity client directly
const projectId = process.env.SANITY_PROJECT_ID || '21is7976';
const dataset = process.env.SANITY_DATASET || 'production';
const token = process.env.SANITY_API_TOKEN || 'skfYBXlqcVRszR6D3U2X3hPAMKupissIjK6LehFgtmYRkavBwU49tXYqryhOliJ7mclzM38VivW4vz75T6edrwsmwGPwgFEHxgANwxVnFNDFBq9pWjLhSd6dfB4yJNbVbgfkKlkocZ1VgYpd2ldczW64WNhqiTkclddkAxaTinVBhF9NMme0';

// Initialize the client directly in this file
const client = createClient({
  projectId,
  dataset,
  useCdn: false,
  apiVersion: '2023-03-01',
  token
});

// Storage keys
const READ_NOTIFICATIONS_KEY = 'tunnel_read_notifications';
const USER_DATA_KEY = 'tunnel_user_data';

// Helper for image URLs
const builder = imageUrlBuilder(client);
export const urlFor = (source) => {
  return builder.image(source).url();
};

// Helper function to get image URL from a Sanity image object or direct URI
const getImageUrl = (imageData) => {
  // If it's already a string URI, use it directly
  if (typeof imageData === 'string') {
    return imageData;
  }
  // If it's a Sanity image object with an asset, convert it to URL
  else if (imageData && imageData.asset) {
    return urlFor(imageData);
  }
  return null;
};

// Object to keep track of read notifications
let readNotificationsCache = {};

// Helper to get current user ID
const getCurrentUserId = async () => {
  try {
    // Try different storage keys for user data
    const storageKeys = [USER_DATA_KEY, 'userData', 'user', 'sanityUser'];
    let userData = null;
    
    for (const key of storageKeys) {
      try {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          userData = JSON.parse(data);
          if (userData && userData._id) {
            console.log(`[NotifService] Found user ID in storage key: ${key}`, userData._id);
            return userData._id;
          }
        }
      } catch (e) {
        console.log(`[NotifService] Error reading from key ${key}:`, e);
      }
    }
    
    console.warn('[NotifService] Could not find user ID in any storage location');
    return null;
  } catch (error) {
    console.error('[NotifService] Error getting current user ID:', error);
    return null;
  }
};

// Load read notifications on initialization
const initializeReadNotifications = async () => {
  try {
    console.log('[NotifService] Initializing read notifications cache');
    const savedReadNotifications = await AsyncStorage.getItem(READ_NOTIFICATIONS_KEY);
    
    if (savedReadNotifications) {
      readNotificationsCache = JSON.parse(savedReadNotifications);
      console.log('[NotifService] Loaded read notifications from storage, count:', Object.keys(readNotificationsCache).length);
    } else {
      console.log('[NotifService] No saved read notifications found');
    }
  } catch (error) {
    console.error('[NotifService] Error loading read notifications from storage:', error);
  }
};

// Run initialization
initializeReadNotifications();

/**
 * Fetch notifications for a specific user
 * @param {string} userId - The user ID to fetch notifications for
 * @returns {Promise<Array>} - Array of notification objects
 */
export const fetchUserNotifications = async (userId) => {
  try {
    if (!userId) {
      console.error('[NotifService] No userId provided to fetchUserNotifications');
      return [];
    }
    
    console.log(`[NotifService] Fetching notifications for user: ${userId}`);
    
    // Try to refresh the cache from AsyncStorage
    try {
      const savedReadNotifications = await AsyncStorage.getItem(READ_NOTIFICATIONS_KEY);
      if (savedReadNotifications) {
        readNotificationsCache = JSON.parse(savedReadNotifications);
        console.log('[NotifService] Refreshed read notifications cache, count:', Object.keys(readNotificationsCache).length);
      }
    } catch (error) {
      console.error('[NotifService] Error refreshing notification cache:', error);
    }

    // Calculate the date for "last 30 days"
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Construct a GROQ query that fetches:
    // 1. Posts liked by other users where current user is the author (post likes)
    // 2. Comments on posts where current user is the author (post comments)
    // 3. Videos liked by other users where current user is the author (video likes)
    // 4. Comments on videos where current user is the author (video comments)
    // All limited to the last 30 days
    const query = `{
      "postLikes": *[_type == "post" && author._ref == $userId] {
        _id,
        title,
        content,
        "snippet": content[0..50],
        "likedBy": likes[]{
          _ref,
          _key,
          _createdAt
        },
        "likedByUsers": likes[]->{ 
          _id, 
          firstName, 
          lastName, 
          username,
          "avatar": profile.avatar
        }
      },
      "postComments": *[_type == "post" && author._ref == $userId] {
        _id,
        title,
        content,
        "snippet": content[0..50],
        "comments": comments[] {
          _key,
          text,
          _createdAt,
          author->{ 
            _id, 
            firstName, 
            lastName, 
            username,
            "avatar": profile.avatar
          }
        }
      },
      "videoLikes": *[_type == "video" && author._ref == $userId] {
        _id,
        title,
        thumbnail,
        "likedBy": likedBy[]{
          _ref,
          _key,
          _createdAt
        },
        "likedByUsers": likedBy[]->{ 
          _id, 
          firstName, 
          lastName, 
          username,
          "avatar": profile.avatar
        }
      },
      "videoComments": *[_type == "video" && author._ref == $userId] {
        _id,
        title,
        thumbnail,
        "comments": comments[] {
          _key,
          text,
          _createdAt,
          author->{ 
            _id, 
            firstName, 
            lastName, 
            username,
            "avatar": profile.avatar
          }
        }
      }
    }`;

    const results = await client.fetch(query, { userId });
    console.log('[NotifService] Fetched notification data from Sanity');
    
    // Process and combine all notification types
    let notifications = [];
    
    // Helper function to generate notification ID
    const generateNotificationId = (type, contentId, userId, key) => {
      return `${type}-${contentId}-${userId || 'unknown'}-${key || 'unknown'}`;
    };

    // Process post likes
    if (results.postLikes) {
      // Group likes by post to show multiple likers in one notification
      const postLikesMap = new Map(); // Map of postId -> notification data
      
      results.postLikes.forEach(post => {
        if (post.likedByUsers && post.likedByUsers.length > 0) {
          // Get all likes for this post
          const likers = post.likedByUsers.map(user => {
            // Find the corresponding like entry with the key and creation date
            const likeEntry = post.likedBy.find(like => like._ref === user._id);
            
            // Process avatar URL
            const avatarUrl = getImageUrl(user.avatar);
            
            return {
              userId: user._id,
              username: user.username,
              firstName: user.firstName,
              lastName: user.lastName,
              avatar: avatarUrl,
              createdAt: likeEntry?._createdAt || new Date().toISOString(),
              key: likeEntry?._key,
              isVerified: user.isVerified || false,
              isBlueVerified: user.isBlueVerified || false
            };
          });
          
          // Sort by most recent first
          likers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          
          // Create or update group notification
          const notificationId = `post-likes-group-${post._id}`;
          const latestLiker = likers[0];
          
          postLikesMap.set(notificationId, {
            id: notificationId,
            type: 'like',
            title: likers.length > 1 ? 'Multiple likes on your post' : 'New like on your post',
            message: likers.length > 1 
              ? `${latestLiker.firstName || latestLiker.username || 'Someone'} and ${likers.length - 1} others liked your post`
              : `${latestLiker.firstName || latestLiker.username || 'Someone'} liked your post`,
            contentSnippet: post.snippet || post.content || 'Your post',
            contentId: post._id,
            contentType: 'post',
            senderId: latestLiker.userId,
            senderName: latestLiker.firstName && latestLiker.lastName ? 
              `${latestLiker.firstName} ${latestLiker.lastName}` : latestLiker.username || 'Unknown User',
            username: latestLiker.username || 'user',
            avatar: latestLiker.avatar,
            time: formatTimeAgo(latestLiker.createdAt || new Date()),
            createdAt: latestLiker.createdAt || new Date().toISOString(),
            read: false,
            isVerified: latestLiker.isVerified || false,
            isBlueVerified: latestLiker.isBlueVerified || false,
            groupMembers: likers.map(liker => ({
              id: liker.userId,
              name: liker.firstName && liker.lastName ? 
                `${liker.firstName} ${liker.lastName}` : liker.username || 'Unknown User',
              username: liker.username || 'user',
              avatar: liker.avatar,
              isVerified: liker.isVerified || false,
              isBlueVerified: liker.isBlueVerified || false
            }))
          });
        }
      });
      
      // Add all grouped post like notifications
      notifications = [...notifications, ...Array.from(postLikesMap.values())];
    }
    
    // Process post comments
    if (results.postComments) {
      // Group comments by post to show multiple commenters in one notification
      const postCommentsMap = new Map(); // Map of postId -> notification data
      
      results.postComments.forEach(post => {
        if (post.comments && post.comments.length > 0) {
          // Get all commenters for this post
          const commenters = post.comments.map(comment => {
            if (!comment.author) return null;
            
            // Process avatar URL
            const avatarUrl = getImageUrl(comment.author.avatar);
            
            return {
              userId: comment.author._id,
              username: comment.author.username,
              firstName: comment.author.firstName,
              lastName: comment.author.lastName,
              avatar: avatarUrl,
              text: comment.text,
              createdAt: comment._createdAt || new Date().toISOString(),
              key: comment._key,
              isVerified: comment.author.isVerified || false,
              isBlueVerified: comment.author.isBlueVerified || false
            };
          }).filter(c => c !== null);
          
          // Sort by most recent first
          commenters.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          
          // Create or update group notification
          const notificationId = `post-comments-group-${post._id}`;
          const latestCommenter = commenters[0];
          
          postCommentsMap.set(notificationId, {
            id: notificationId,
            type: 'comment',
            title: commenters.length > 1 ? 'Multiple comments on your post' : 'New comment on your post',
            message: commenters.length > 1 
              ? `${latestCommenter.firstName || latestCommenter.username || 'Someone'} and ${commenters.length - 1} others commented on your post`
              : `${latestCommenter.firstName || latestCommenter.username || 'Someone'} commented: "${latestCommenter.text.substring(0, 50)}${latestCommenter.text.length > 50 ? '...' : ''}"`,
            contentSnippet: post.snippet || post.content || 'Your post',
            contentId: post._id,
            contentType: 'post',
            senderId: latestCommenter.userId,
            senderName: latestCommenter.firstName && latestCommenter.lastName ? 
              `${latestCommenter.firstName} ${latestCommenter.lastName}` : latestCommenter.username || 'Unknown User',
            username: latestCommenter.username || 'user',
            avatar: latestCommenter.avatar,
            time: formatTimeAgo(latestCommenter.createdAt || new Date()),
            createdAt: latestCommenter.createdAt || new Date().toISOString(),
            read: false,
            isVerified: latestCommenter.isVerified || false,
            isBlueVerified: latestCommenter.isBlueVerified || false,
            groupMembers: commenters.map(commenter => ({
              id: commenter.userId,
              name: commenter.firstName && commenter.lastName ? 
                `${commenter.firstName} ${commenter.lastName}` : commenter.username || 'Unknown User',
              username: commenter.username || 'user',
              avatar: commenter.avatar,
              isVerified: commenter.isVerified || false,
              isBlueVerified: commenter.isBlueVerified || false
            }))
          });
        }
      });
      
      // Add all grouped post comment notifications
      notifications = [...notifications, ...Array.from(postCommentsMap.values())];
    }
    
    // Process video likes
    if (results.videoLikes) {
      // Group likes by video to show multiple likers in one notification
      const videoLikesMap = new Map(); // Map of videoId -> notification data
      
      results.videoLikes.forEach(video => {
        if (video.likedByUsers && video.likedByUsers.length > 0) {
          // Get all likes for this video
          const likers = video.likedByUsers.map(user => {
            // Find the corresponding like entry with the key and creation date
            const likeEntry = video.likedBy.find(like => like._ref === user._id);
            
            // Process avatar URL
            const avatarUrl = getImageUrl(user.avatar);
            
            return {
              userId: user._id,
              username: user.username,
              firstName: user.firstName,
              lastName: user.lastName,
              avatar: avatarUrl,
              createdAt: likeEntry?._createdAt || new Date().toISOString(),
              key: likeEntry?._key,
              isVerified: user.isVerified || false,
              isBlueVerified: user.isBlueVerified || false
            };
          });
          
          // Sort by most recent first
          likers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          
          // Create or update group notification
          const notificationId = `video-likes-group-${video._id}`;
          const latestLiker = likers[0];
          
          // Process thumbnail URL if it's a Sanity reference
          const thumbnailUrl = getImageUrl(video.thumbnail);
          
          videoLikesMap.set(notificationId, {
            id: notificationId,
            type: 'like',
            title: likers.length > 1 ? 'Multiple likes on your video' : 'New like on your video',
            message: likers.length > 1 
              ? `${latestLiker.firstName || latestLiker.username || 'Someone'} and ${likers.length - 1} others liked your video`
              : `${latestLiker.firstName || latestLiker.username || 'Someone'} liked your video`,
            contentImage: thumbnailUrl,
            videoTitle: video.title || 'Your video',
            contentId: video._id,
            contentType: 'video',
            senderId: latestLiker.userId,
            senderName: latestLiker.firstName && latestLiker.lastName ? 
              `${latestLiker.firstName} ${latestLiker.lastName}` : latestLiker.username || 'Unknown User',
            username: latestLiker.username || 'user',
            avatar: latestLiker.avatar,
            time: formatTimeAgo(latestLiker.createdAt || new Date()),
            createdAt: latestLiker.createdAt || new Date().toISOString(),
            read: false,
            isVerified: latestLiker.isVerified || false,
            isBlueVerified: latestLiker.isBlueVerified || false,
            groupMembers: likers.map(liker => ({
              id: liker.userId,
              name: liker.firstName && liker.lastName ? 
                `${liker.firstName} ${liker.lastName}` : liker.username || 'Unknown User',
              username: liker.username || 'user',
              avatar: liker.avatar,
              isVerified: liker.isVerified || false,
              isBlueVerified: liker.isBlueVerified || false
            }))
          });
        }
      });
      
      // Add all grouped video like notifications
      notifications = [...notifications, ...Array.from(videoLikesMap.values())];
    }
    
    // Process video comments
    if (results.videoComments) {
      // Group comments by video to show multiple commenters in one notification
      const videoCommentsMap = new Map(); // Map of videoId -> notification data
      
      results.videoComments.forEach(video => {
        if (video.comments && video.comments.length > 0) {
          // Get all commenters for this video
          const commenters = video.comments.map(comment => {
            if (!comment.author) return null;
            
            // Process avatar URL
            const avatarUrl = getImageUrl(comment.author.avatar);
            
            return {
              userId: comment.author._id,
              username: comment.author.username,
              firstName: comment.author.firstName,
              lastName: comment.author.lastName,
              avatar: avatarUrl,
              text: comment.text,
              createdAt: comment._createdAt || new Date().toISOString(),
              key: comment._key,
              isVerified: comment.author.isVerified || false,
              isBlueVerified: comment.author.isBlueVerified || false
            };
          }).filter(c => c !== null);
          
          // Sort by most recent first
          commenters.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          
          // Create or update group notification
          const notificationId = `video-comments-group-${video._id}`;
          const latestCommenter = commenters[0];
          
          // Process thumbnail URL if it's a Sanity reference
          const thumbnailUrl = getImageUrl(video.thumbnail);
          
          videoCommentsMap.set(notificationId, {
            id: notificationId,
            type: 'comment',
            title: commenters.length > 1 ? 'Multiple comments on your video' : 'New comment on your video',
            message: commenters.length > 1 
              ? `${latestCommenter.firstName || latestCommenter.username || 'Someone'} and ${commenters.length - 1} others commented on your video`
              : `${latestCommenter.firstName || latestCommenter.username || 'Someone'} commented: "${latestCommenter.text.substring(0, 50)}${latestCommenter.text.length > 50 ? '...' : ''}"`,
            contentImage: thumbnailUrl,
            videoTitle: video.title || 'Your video',
            contentId: video._id,
            contentType: 'video',
            senderId: latestCommenter.userId,
            senderName: latestCommenter.firstName && latestCommenter.lastName ? 
              `${latestCommenter.firstName} ${latestCommenter.lastName}` : latestCommenter.username || 'Unknown User',
            username: latestCommenter.username || 'user',
            avatar: latestCommenter.avatar,
            time: formatTimeAgo(latestCommenter.createdAt || new Date()),
            createdAt: latestCommenter.createdAt || new Date().toISOString(),
            read: false,
            isVerified: latestCommenter.isVerified || false,
            isBlueVerified: latestCommenter.isBlueVerified || false,
            groupMembers: commenters.map(commenter => ({
              id: commenter.userId,
              name: commenter.firstName && commenter.lastName ? 
                `${commenter.firstName} ${commenter.lastName}` : commenter.username || 'Unknown User',
              username: commenter.username || 'user',
              avatar: commenter.avatar,
              isVerified: commenter.isVerified || false,
              isBlueVerified: commenter.isBlueVerified || false
            }))
          });
        }
      });
      
      // Add all grouped video comment notifications
      notifications = [...notifications, ...Array.from(videoCommentsMap.values())];
    }

    console.log(`[NotifService] Total notifications before read check: ${notifications.length}`);
    
    // Check read status from cache for each notification
    notifications = notifications.map(notification => {
      const userReadKey = `${userId}_${notification.id}`;
      const isRead = !!readNotificationsCache[userReadKey];
      if (isRead) {
        console.log(`[NotifService] Notification marked as read: ${notification.id}`);
      }
      return {
        ...notification,
        read: isRead
      };
    });

    // Sort notifications by date (newest first)
    notifications.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    console.log(`[NotifService] Returning ${notifications.length} notifications, unread count: ${notifications.filter(n => !n.read).length}`);
    return notifications;
  } catch (error) {
    console.error('[NotifService] Error fetching user notifications:', error);
    return [];
  }
};

/**
 * Mark a notification as read
 * @param {string} notificationId - The notification ID to mark as read
 * @returns {Promise<boolean>} - Success status
 */
export const markNotificationAsRead = async (notificationId) => {
  try {
    console.log(`[NotifService] Marking notification as read: ${notificationId}`);
    
    // Get current user ID
    const userId = await getCurrentUserId();
    
    if (!userId) {
      console.warn('[NotifService] No user ID found, cannot mark notification as read');
      return false;
    }
    
    // Create a key that includes user ID to avoid conflicts
    const userReadKey = `${userId}_${notificationId}`;
    console.log(`[NotifService] Generated user read key: ${userReadKey}`);
    
    // Save the read status to cache
    readNotificationsCache[userReadKey] = true;
    
    // Save to AsyncStorage
    try {
      await AsyncStorage.setItem(READ_NOTIFICATIONS_KEY, JSON.stringify(readNotificationsCache));
      console.log(`[NotifService] Saved read status to AsyncStorage, cache size: ${Object.keys(readNotificationsCache).length}`);
      
      // Debug: verify the data was saved
      const savedData = await AsyncStorage.getItem(READ_NOTIFICATIONS_KEY);
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        console.log(`[NotifService] Verified read notifications in storage: ${Object.keys(parsedData).length} items, has key: ${!!parsedData[userReadKey]}`);
      }
    } catch (error) {
      console.error('[NotifService] Error saving read notifications to storage:', error);
    }
    
    return true;
  } catch (error) {
    console.error('[NotifService] Error marking notification as read:', error);
    return false;
  }
};

/**
 * Mark all notifications as read for a user
 * @param {string} userId - The user ID to mark all notifications as read for
 * @returns {Promise<boolean>} - Success status
 */
export const markAllNotificationsAsRead = async (userId) => {
  try {
    if (!userId) {
      // Try to get userId if not provided
      userId = await getCurrentUserId();
      if (!userId) {
        console.warn('[NotifService] No user ID provided or found, cannot mark all notifications as read');
        return false;
      }
    }
    
    console.log(`[NotifService] Marking all notifications as read for user: ${userId}`);
    
    // Fetch all notifications for this user
    const notifications = await fetchUserNotifications(userId);
    console.log(`[NotifService] Found ${notifications.length} notifications to mark as read`);
    
    // Mark each notification as read
    for (const notification of notifications) {
      const userReadKey = `${userId}_${notification.id}`;
      readNotificationsCache[userReadKey] = true;
    }
    
    // Save to AsyncStorage
    try {
      await AsyncStorage.setItem(READ_NOTIFICATIONS_KEY, JSON.stringify(readNotificationsCache));
      console.log(`[NotifService] Saved all read statuses to AsyncStorage, cache size: ${Object.keys(readNotificationsCache).length}`);
    } catch (error) {
      console.error('[NotifService] Error saving read notifications to storage:', error);
    }
    
    return true;
  } catch (error) {
    console.error('[NotifService] Error marking all notifications as read:', error);
    return false;
  }
};

/**
 * Format a date to a relative time (e.g., "2 hours ago")
 * @param {string | Date} date - The date to format
 * @returns {string} - Formatted relative time
 */
const formatTimeAgo = (date) => {
  if (!date) return 'Recently';
  
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);
  
  if (seconds < 60) {
    return 'Just now';
  }
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  }
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  }
  
  const days = Math.floor(hours / 24);
  if (days < 30) {
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  }
  
  const months = Math.floor(days / 30);
  if (months < 12) {
    return `${months} ${months === 1 ? 'month' : 'months'} ago`;
  }
  
  const years = Math.floor(months / 12);
  return `${years} ${years === 1 ? 'year' : 'years'} ago`;
}; 