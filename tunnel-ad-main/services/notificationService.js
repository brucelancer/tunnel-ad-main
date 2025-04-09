import { createClient } from '@sanity/client';

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

/**
 * Fetch notifications for a specific user
 * @param {string} userId - The user ID to fetch notifications for
 * @returns {Promise<Array>} - Array of notification objects
 */
export const fetchUserNotifications = async (userId) => {
  try {
    if (!userId) {
      console.error('No userId provided to fetchUserNotifications');
      return [];
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
    
    // Process and combine all notification types
    let notifications = [];
    
    // Process post likes
    if (results.postLikes) {
      results.postLikes.forEach(post => {
        if (post.likedByUsers && post.likedByUsers.length > 0) {
          post.likedByUsers.forEach(user => {
            // Find the corresponding like entry with the key and creation date
            const likeEntry = post.likedBy.find(like => like._ref === user._id);
            if (likeEntry) {
              notifications.push({
                id: `post-like-${post._id}-${user._id}-${likeEntry._key}`,
                type: 'like',
                title: 'New like on your post',
                message: `${user.firstName || user.username || 'Someone'} liked your post`,
                contentSnippet: post.snippet || post.content || 'Your post',
                contentId: post._id,
                contentType: 'post',
                senderId: user._id,
                senderName: user.firstName && user.lastName ? 
                  `${user.firstName} ${user.lastName}` : user.username || 'Unknown User',
                username: user.username || 'user',
                avatar: user.avatar,
                time: formatTimeAgo(likeEntry._createdAt || new Date()),
                createdAt: likeEntry._createdAt || new Date().toISOString(),
                read: false,
                isVerified: user.isVerified || false,
                isBlueVerified: user.isBlueVerified || false
              });
            }
          });
        }
      });
    }
    
    // Process post comments
    if (results.postComments) {
      results.postComments.forEach(post => {
        if (post.comments && post.comments.length > 0) {
          post.comments.forEach(comment => {
            if (comment.author) {
              notifications.push({
                id: `post-comment-${post._id}-${comment._key}`,
                type: 'comment',
                title: 'New comment on your post',
                message: `${comment.author.firstName || comment.author.username || 'Someone'} commented: "${comment.text.substring(0, 50)}${comment.text.length > 50 ? '...' : ''}"`,
                contentSnippet: post.snippet || post.content || 'Your post',
                contentId: post._id,
                contentType: 'post',
                senderId: comment.author._id,
                senderName: comment.author.firstName && comment.author.lastName ? 
                  `${comment.author.firstName} ${comment.author.lastName}` : comment.author.username || 'Unknown User',
                username: comment.author.username || 'user',
                avatar: comment.author.avatar,
                time: formatTimeAgo(comment._createdAt || new Date()),
                createdAt: comment._createdAt || new Date().toISOString(),
                read: false,
                isVerified: comment.author.isVerified || false,
                isBlueVerified: comment.author.isBlueVerified || false
              });
            }
          });
        }
      });
    }
    
    // Process video likes
    if (results.videoLikes) {
      results.videoLikes.forEach(video => {
        if (video.likedByUsers && video.likedByUsers.length > 0) {
          video.likedByUsers.forEach(user => {
            // Find the corresponding like entry with the key and creation date
            const likeEntry = video.likedBy.find(like => like._ref === user._id);
            if (likeEntry) {
              notifications.push({
                id: `video-like-${video._id}-${user._id}-${likeEntry._key}`,
                type: 'like',
                title: 'New like on your video',
                message: `${user.firstName || user.username || 'Someone'} liked your video`,
                contentImage: video.thumbnail,
                videoTitle: video.title || 'Your video',
                contentId: video._id,
                contentType: 'video',
                senderId: user._id,
                senderName: user.firstName && user.lastName ? 
                  `${user.firstName} ${user.lastName}` : user.username || 'Unknown User',
                username: user.username || 'user',
                avatar: user.avatar,
                time: formatTimeAgo(likeEntry._createdAt || new Date()),
                createdAt: likeEntry._createdAt || new Date().toISOString(),
                read: false,
                isVerified: user.isVerified || false,
                isBlueVerified: user.isBlueVerified || false
              });
            }
          });
        }
      });
    }
    
    // Process video comments
    if (results.videoComments) {
      results.videoComments.forEach(video => {
        if (video.comments && video.comments.length > 0) {
          video.comments.forEach(comment => {
            if (comment.author) {
              notifications.push({
                id: `video-comment-${video._id}-${comment._key}`,
                type: 'comment',
                title: 'New comment on your video',
                message: `${comment.author.firstName || comment.author.username || 'Someone'} commented: "${comment.text.substring(0, 50)}${comment.text.length > 50 ? '...' : ''}"`,
                contentImage: video.thumbnail,
                videoTitle: video.title || 'Your video',
                contentId: video._id,
                contentType: 'video',
                senderId: comment.author._id,
                senderName: comment.author.firstName && comment.author.lastName ? 
                  `${comment.author.firstName} ${comment.author.lastName}` : comment.author.username || 'Unknown User',
                username: comment.author.username || 'user',
                avatar: comment.author.avatar,
                time: formatTimeAgo(comment._createdAt || new Date()),
                createdAt: comment._createdAt || new Date().toISOString(),
                read: false,
                isVerified: comment.author.isVerified || false,
                isBlueVerified: comment.author.isBlueVerified || false
              });
            }
          });
        }
      });
    }
    
    // Sort notifications by date (newest first)
    notifications.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    return notifications;
  } catch (error) {
    console.error('Error fetching user notifications:', error);
    return [];
  }
};

/**
 * Mark a notification as read
 * @param {string} notificationId - The notification ID to mark as read
 * @returns {Promise<boolean>} - Success status
 */
export const markNotificationAsRead = async (notificationId) => {
  // In a real implementation, this would update read status in Sanity
  // For now, we'll just return success
  return true;
};

/**
 * Mark all notifications as read for a user
 * @param {string} userId - The user ID to mark all notifications as read for
 * @returns {Promise<boolean>} - Success status
 */
export const markAllNotificationsAsRead = async (userId) => {
  // In a real implementation, this would update read status for all notifications in Sanity
  // For now, we'll just return success
  return true;
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