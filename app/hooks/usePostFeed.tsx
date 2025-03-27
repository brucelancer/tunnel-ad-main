// Format a Sanity post to match our app's structure
const formatPost = (post: any): any => {
  // Extract user information from the author
  const author = post.author || {};
  const authorName = author.username || 
                   `${author.firstName || ''} ${author.lastName || ''}`.trim() || 
                   'Unknown User';
  
  // Format the post object
  return {
    id: post._id,
    user: {
      id: author._id || 'unknown-user',
      name: `${author.firstName || ''} ${author.lastName || ''}`.trim() || authorName,
      username: author.username ? `@${author.username}` : '@user',
      avatar: author.avatar ? urlFor(author.avatar).url() : 'https://via.placeholder.com/150',
      isVerified: author.isVerified || false,
      isBlueVerified: author.isBlueVerified || false
    },
    content: post.content || '',
    images: getImageUrls(post.images),
    location: post.location || '',
    timeAgo: post.timeAgo || 'Recently',
    likes: post.likesCount || 0,
    comments: post.commentsCount || 0,
    points: post.points || 0,
    hasLiked: post.hasLiked || false,
    hasSaved: post.hasSaved || false,
    rawComments: post.comments || []
  };
}; 