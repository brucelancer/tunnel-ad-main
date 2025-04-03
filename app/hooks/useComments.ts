import { useState, useCallback, useEffect } from 'react';
import { fetchComments, addComment, toggleLikeComment, getCommentCount, deleteComment } from '@/tunnel-ad-main/services/commentService';
import { useSanityAuth } from './useSanityAuth';

export interface Comment {
  id: string;
  text: string;
  user: {
    id: string;
    username: string;
    avatar?: string | null;
    isVerified?: boolean;
  };
  createdAt: string;
  likes: number;
  hasLiked?: boolean;
  replies?: Comment[];
}

export function useComments(videoId: string, videoAuthorId?: string) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentCount, setCommentCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { user } = useSanityAuth();

  // Load comments for a video
  const loadComments = useCallback(async () => {
    if (!videoId) return;
    
    setIsLoading(true);
    try {
      const fetchedComments = await fetchComments(videoId);
      setComments(fetchedComments);
      // Update count as well
      setCommentCount(fetchedComments.length);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setIsLoading(false);
    }
  }, [videoId]);

  // Get the comment count separately (more efficient for UI that only needs count)
  const loadCommentCount = useCallback(async () => {
    if (!videoId) return;
    
    try {
      const count = await getCommentCount(videoId);
      setCommentCount(count);
      return count;
    } catch (error) {
      console.error('Error loading comment count:', error);
      return 0;
    }
  }, [videoId]);

  // Submit a new comment
  const submitComment = useCallback(async (text: string) => {
    if (!text.trim() || !user || !user._id || !videoId) {
      return null;
    }
    
    try {
      const newComment = await addComment(videoId, user._id, text);
      setComments(prevComments => [newComment, ...prevComments]);
      setCommentCount(prevCount => prevCount + 1);
      return newComment;
    } catch (error) {
      console.error('Error submitting comment:', error);
      return null;
    }
  }, [user, videoId]);

  // Like or unlike a comment
  const likeComment = useCallback(async (commentId: string) => {
    if (!user || !user._id || !videoId) {
      console.warn('User not authenticated or video ID missing');
      return;
    }
    
    try {
      // First update UI optimistically
      setComments(prevComments => 
        prevComments.map(comment => {
          if (comment.id === commentId) {
            return { 
              ...comment, 
              hasLiked: !comment.hasLiked,
              likes: comment.hasLiked ? comment.likes - 1 : comment.likes + 1 
            };
          }
          
          // Also check in replies
          if (comment.replies && comment.replies.length > 0) {
            return {
              ...comment,
              replies: comment.replies.map(reply => {
                if (reply.id === commentId) {
                  return {
                    ...reply,
                    hasLiked: !reply.hasLiked,
                    likes: reply.hasLiked ? reply.likes - 1 : reply.likes + 1
                  };
                }
                return reply;
              })
            };
          }
          
          return comment;
        })
      );
      
      // Then persist the change to Sanity - pass videoId as well
      const result = await toggleLikeComment(commentId, user._id, videoId);
      
      // If something went wrong, revert to the actual state from the server
      if (!result) {
        loadComments(); // Reload comments to get the correct state
      }
    } catch (error) {
      console.error('Error liking comment:', error);
      loadComments(); // Reload on error to ensure UI is consistent
    }
  }, [user, videoId, loadComments]);

  // Delete a comment
  const removeComment = useCallback(async (commentId: string) => {
    if (!user || !user._id || !videoId) {
      console.warn('User not authenticated or video ID missing');
      return false;
    }
    
    setIsDeleting(true);
    try {
      // Update UI optimistically - remove the comment and its replies
      setComments(prevComments => {
        // Handle top-level comment deletion
        if (prevComments.some(c => c.id === commentId)) {
          // Decrement count
          setCommentCount(prev => Math.max(0, prev - 1));
          return prevComments.filter(c => c.id !== commentId);
        }
        
        // Handle reply deletion
        return prevComments.map(comment => {
          if (comment.replies && comment.replies.some(r => r.id === commentId)) {
            // Decrement count
            setCommentCount(prev => Math.max(0, prev - 1)); 
            return {
              ...comment,
              replies: comment.replies.filter(r => r.id !== commentId)
            };
          }
          return comment;
        });
      });
      
      // Call the API to actually delete the comment
      const result = await deleteComment(commentId, user._id, videoId);
      
      // If the deletion failed, reload the comments to restore the correct state
      if (!result || !result.success) {
        loadComments();
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting comment:', error);
      // Reload comments to restore state
      loadComments();
      return false;
    } finally {
      setIsDeleting(false);
    }
  }, [user, videoId, loadComments]);

  // Check if the current user can delete a specific comment
  const canDeleteComment = useCallback((commentAuthorId: string) => {
    if (!user || !user._id) return false;
    
    // User can delete their own comments
    if (commentAuthorId === user._id) return true;
    
    // Video author can delete any comment on their video
    if (videoAuthorId && user._id === videoAuthorId) return true;
    
    return false;
  }, [user, videoAuthorId]);

  // Initial load
  useEffect(() => {
    if (videoId) {
      loadCommentCount();
    }
  }, [videoId, loadCommentCount]);

  return {
    comments,
    commentCount, 
    isLoading,
    isDeleting,
    loadComments,
    loadCommentCount,
    submitComment,
    likeComment,
    removeComment,
    canDeleteComment
  };
} 