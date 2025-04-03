import { getSanityClient, urlFor } from './postService'

// Fetch comments for a video from the video document
export const fetchComments = async (videoId) => {
  try {
    const client = getSanityClient();
    
    // Query for the video with all its comments
    const query = `*[_type == "video" && _id == $videoId][0] {
      _id,
      comments[] {
        _key,
        text,
        createdAt,
        likes,
        "author": author->{
          _id,
          username,
          firstName,
          lastName,
          "avatar": profile.avatar,
          "isVerified": username == "admin" || username == "moderator",
          "isBlueVerified": defined(isBlueVerified) && isBlueVerified == true
        },
        "likedBy": likedBy[]._ref,
        parent
      }
    }`;
    
    const result = await client.fetch(query, { videoId });
    
    if (!result || !result.comments) {
      return [];
    }
    
    // Process comments to ensure proper format for the app
    const comments = result.comments || [];
    
    // Separate top-level comments and replies
    const topLevelComments = comments.filter(comment => !comment.parent);
    const replies = comments.filter(comment => comment.parent);
    
    // Map replies to their parent comments
    return topLevelComments.map(comment => ({
      id: comment._key,
      text: comment.text,
      user: {
        id: comment.author?._id || '',
        username: comment.author?.username || 'Unknown User',
        avatar: comment.author?.avatar ? urlFor(comment.author.avatar).url() : null,
        isVerified: comment.author?.isVerified || comment.author?.isBlueVerified || false,
      },
      createdAt: comment.createdAt,
      likes: comment.likes || 0,
      hasLiked: comment.likedBy && comment.likedBy.includes(comment.author?._id),
      replies: replies
        .filter(reply => reply.parent === comment._key)
        .map(reply => ({
          id: reply._key,
          text: reply.text,
          user: {
            id: reply.author?._id || '',
            username: reply.author?.username || 'Unknown User',
            avatar: reply.author?.avatar ? urlFor(reply.author.avatar).url() : null,
            isVerified: reply.author?.isVerified || reply.author?.isBlueVerified || false,
          },
          createdAt: reply.createdAt,
          likes: reply.likes || 0,
          hasLiked: reply.likedBy && reply.likedBy.includes(reply.author?._id),
        }))
    })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // Sort newest first
  } catch (error) {
    console.error('Error fetching comments:', error);
    return [];
  }
};

// Add a new comment to a video
export const addComment = async (videoId, userId, text, parentCommentId = null) => {
  try {
    const client = getSanityClient();
    
    // First, fetch the current state of the video document
    const videoDoc = await client.fetch(`
      *[_type == "video" && _id == $videoId][0]{
        comments,
        commentsCount
      }
    `, { videoId });
    
    if (!videoDoc) {
      throw new Error('Video not found');
    }
    
    // Prepare the comment object - don't set _type property as it's inferred from the array definition
    const comment = {
      text,
      author: {
        _type: 'reference',
        _ref: userId
      },
      createdAt: new Date().toISOString(),
      likes: 0,
      likedBy: []
    };
    
    // Add parent reference if this is a reply
    if (parentCommentId) {
      comment.parent = parentCommentId;
    }
    
    // Calculate the new comment count
    // If commentsCount doesn't exist or comments array doesn't exist, start at 0
    const currentCount = videoDoc.commentsCount !== undefined 
      ? videoDoc.commentsCount 
      : (videoDoc.comments ? videoDoc.comments.length : 0);
    const newCount = currentCount + 1;
    
    // Add the comment and set the comment count explicitly
    const result = await client
      .patch(videoId)
      .setIfMissing({ comments: [] })
      .append('comments', [comment])
      .set({ commentsCount: newCount })
      .commit({ autoGenerateArrayKeys: true });
    
    // Extract the generated key for the new comment
    const addedComment = result.comments[result.comments.length - 1];
    const commentKey = addedComment._key;
    
    // Fetch the user details for the response
    const user = await client.fetch(
      `*[_type == "user" && _id == $userId][0]{
        _id,
        username,
        firstName,
        lastName,
        "avatar": profile.avatar,
        "isVerified": username == "admin" || username == "moderator",
        "isBlueVerified": defined(isBlueVerified) && isBlueVerified == true
      }`,
      { userId }
    );
    
    // Return the formatted comment for immediate UI update
    return {
      id: commentKey,
      text,
      user: {
        id: user._id,
        username: user.username || 'Unknown User',
        avatar: user.avatar ? urlFor(user.avatar).url() : null,
        isVerified: user.isVerified || user.isBlueVerified || false,
      },
      createdAt: comment.createdAt,
      likes: 0,
      hasLiked: false,
      replies: []
    };
  } catch (error) {
    console.error('Error adding comment:', error);
    throw error;
  }
};

// Like or unlike a comment within a video
export const toggleLikeComment = async (commentId, userId, videoId) => {
  try {
    const client = getSanityClient();
    
    // First, get the video document and check if the user has already liked this comment
    const result = await client.fetch(
      `*[_type == "video" && _id == $videoId][0] {
        "comment": comments[_key == $commentId][0] {
          _key,
          likes,
          "likedBy": likedBy[]._ref
        }
      }`,
      { videoId, commentId }
    );
    
    if (!result || !result.comment) {
      throw new Error('Comment not found');
    }
    
    const comment = result.comment;
    
    // Check if user has already liked
    const hasLiked = comment.likedBy && comment.likedBy.includes(userId);
    
    // Calculate new likes count
    const currentLikes = comment.likes || 0;
    const newLikes = hasLiked ? Math.max(0, currentLikes - 1) : currentLikes + 1;
    
    if (hasLiked) {
      // Unlike: remove user ID and set new likes count
      await client
        .patch(videoId)
        .unset([`comments[_key == "${commentId}"].likedBy[_ref == "${userId}"]`])
        .set({ [`comments[_key == "${commentId}"].likes`]: newLikes })
        .commit();
    } else {
      // Like: add user ID and set new likes count
      await client
        .patch(videoId)
        .setIfMissing({ [`comments[_key == "${commentId}"].likedBy`]: [] })
        .append(`comments[_key == "${commentId}"].likedBy`, [{ _type: 'reference', _ref: userId }])
        .set({ [`comments[_key == "${commentId}"].likes`]: newLikes })
        .commit();
    }
    
    // Return the updated like status
    return {
      id: commentId,
      likes: newLikes,
      hasLiked: !hasLiked
    };
  } catch (error) {
    console.error('Error toggling comment like:', error);
    throw error;
  }
};

// Get comment count for a video
export const getCommentCount = async (videoId) => {
  try {
    const client = getSanityClient();
    
    // Get both the commentsCount field and the actual comments array
    const result = await client.fetch(
      `*[_type == "video" && _id == $videoId][0]{
        commentsCount,
        "commentsArray": comments
      }`,
      { videoId }
    );
    
    if (!result) {
      return 0;
    }
    
    // If commentsCount is defined, use it
    if (result.commentsCount !== undefined) {
      return result.commentsCount;
    }
    
    // Otherwise count the comments array
    const actualCount = result.commentsArray ? result.commentsArray.length : 0;
    
    // Update the document with the correct count for future use
    if (actualCount > 0) {
      await client
        .patch(videoId)
        .set({ commentsCount: actualCount })
        .commit();
    }
    
    return actualCount;
  } catch (error) {
    console.error('Error getting comment count:', error);
    return 0;
  }
};

// Delete a comment (including all replies)
export const deleteComment = async (commentId, userId, videoId) => {
  try {
    const client = getSanityClient();
    
    // Get the video document with author information, the target comment, and any replies
    const result = await client.fetch(
      `*[_type == "video" && _id == $videoId][0] {
        commentsCount,
        "videoAuthorId": author._ref,
        "comment": comments[_key == $commentId][0] {
          "authorId": author._ref
        },
        "replies": comments[parent == $commentId]._key
      }`,
      { videoId, commentId }
    );
    
    if (!result || !result.comment) {
      throw new Error('Comment not found');
    }
    
    // Check permissions:
    // 1. Users can delete their own comments
    // 2. Video owners can delete any comment on their video
    const isCommentAuthor = result.comment.authorId === userId;
    const isVideoAuthor = result.videoAuthorId === userId;
    
    if (!isCommentAuthor && !isVideoAuthor) {
      throw new Error('Unauthorized to delete this comment. Only the comment author or video owner can delete comments.');
    }
    
    // Count how many comments we'll delete (the comment itself + all replies)
    const deleteCount = 1 + (result.replies ? result.replies.length : 0);
    
    // Prepare the unset operations
    const unsetPaths = [`comments[_key == "${commentId}"]`];
    
    // Add paths for replies if any
    if (result.replies && result.replies.length > 0) {
      result.replies.forEach(replyKey => {
        unsetPaths.push(`comments[_key == "${replyKey}"]`);
      });
    }
    
    // If commentsCount is undefined, set it first based on existing comments
    if (result.commentsCount === undefined) {
      // Count existing comments
      const allComments = await client.fetch(
        `*[_type == "video" && _id == $videoId][0].comments`,
        { videoId }
      );
      
      const currentCount = allComments ? allComments.length : 0;
      
      // Set commentsCount first
      await client
        .patch(videoId)
        .set({ commentsCount: currentCount })
        .commit();
      
      // If there are too few comments to delete, adjust deleteCount
      if (currentCount < deleteCount) {
        console.warn(`Attempted to delete ${deleteCount} comments but only ${currentCount} exist`);
        // Delete all comments if necessary
        if (currentCount === 0) {
          return { success: true }; // Nothing to delete
        }
      }
    }
    
    // Delete the comment and all its replies, and decrease the comment count safely
    const patch = client.patch(videoId).unset(unsetPaths);
    
    // Only decrement if commentsCount exists and is sufficient
    if (result.commentsCount !== undefined && result.commentsCount >= deleteCount) {
      patch.dec({ commentsCount: deleteCount });
    } else if (result.commentsCount !== undefined) {
      // If we have fewer comments than we're trying to delete, set to 0
      patch.set({ commentsCount: 0 });
    }
    
    await patch.commit();
    
    return { 
      success: true,
      deletedBy: isVideoAuthor ? 'videoAuthor' : 'commentAuthor'
    };
  } catch (error) {
    console.error('Error deleting comment:', error);
    throw error;
  }
};

export default {
  fetchComments,
  addComment,
  toggleLikeComment,
  getCommentCount,
  deleteComment
}; 