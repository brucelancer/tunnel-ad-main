export default {
  name: 'video',
  title: 'Video',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: Rule => Rule.required()
    },
    {
      name: 'description',
      title: 'Description',
      type: 'text'
    },
    {
      name: 'author',
      title: 'Author',
      type: 'reference',
      to: [{ type: 'user' }]
    },
    {
      name: 'url',
      title: 'Video URL',
      type: 'url',
      description: 'The URL to the video file'
    },
    {
      name: 'videoFile',
      title: 'Video File',
      type: 'file',
      options: {
        accept: 'video/*'
      }
    },
    {
      name: 'thumbnail',
      title: 'Thumbnail',
      type: 'image',
      options: {
        hotspot: true
      }
    },
    {
      name: 'type',
      title: 'Video Type',
      type: 'string',
      options: {
        list: [
          { title: 'Vertical', value: 'vertical' },
          { title: 'Horizontal', value: 'horizontal' }
        ]
      },
      validation: Rule => Rule.required()
    },
    {
      name: 'contentType',
      title: 'Content Type',
      type: 'string',
      options: {
        list: [
          { title: 'Personal', value: 'personal' },
          { title: 'Advertisement', value: 'ad' }
        ]
      },
      validation: Rule => Rule.required()
    },
    {
      name: 'aspectRatio',
      title: 'Aspect Ratio',
      type: 'number',
      description: 'Width divided by height (e.g., 16/9 = 1.78, 9/16 = 0.56)'
    },
    {
      name: 'points',
      title: 'Points',
      type: 'number',
      initialValue: 10
    },
    {
      name: 'views',
      title: 'Views',
      type: 'number',
      initialValue: 0
    },
    {
      name: 'likes',
      title: 'Likes',
      type: 'number',
      initialValue: 0
    },
    {
      name: 'dislikes',
      title: 'Dislikes',
      type: 'number',
      initialValue: 0
    },
    {
      name: 'comments',
      title: 'Comments',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'comment',
          fields: [
            {
              name: 'text',
              type: 'text',
              title: 'Comment Text',
              validation: Rule => Rule.required()
            },
            {
              name: 'author',
              type: 'reference',
              to: [{ type: 'user' }],
              title: 'Comment Author',
              validation: Rule => Rule.required()
            },
            {
              name: 'createdAt',
              type: 'datetime',
              title: 'Created At',
              initialValue: () => new Date().toISOString()
            },
            {
              name: 'likes',
              type: 'number',
              title: 'Comment Likes',
              initialValue: 0
            },
            {
              name: 'likedBy',
              title: 'Liked By',
              type: 'array',
              of: [{ type: 'reference', to: [{ type: 'user' }] }],
              initialValue: []
            },
            {
              name: 'parent',
              title: 'Parent Comment ID',
              type: 'string',
              description: 'ID of parent comment if this is a reply'
            }
          ],
          preview: {
            select: {
              title: 'text',
              username: 'author.username',
              authorName: 'author.firstName',
              likes: 'likes'
            },
            prepare(selection) {
              const {title, username, authorName, likes} = selection;
              const truncatedText = title ? (title.length > 50 ? title.substring(0, 50) + '...' : title) : 'No text';
              const author = username || authorName || 'Unknown user';
              
              return {
                title: truncatedText,
                subtitle: `By: ${author} • ${likes || 0} likes`
              };
            }
          }
        }
      ],
      initialValue: []
    },
    {
      name: 'commentsCount',
      title: 'Comments Count',
      type: 'number',
      initialValue: 0
    },
    {
      name: 'tags',
      title: 'Tags',
      type: 'array',
      of: [{ type: 'string' }]
    },
    {
      name: 'createdAt',
      title: 'Created At',
      type: 'datetime',
      initialValue: () => new Date().toISOString()
    }
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'description',
      media: 'thumbnail'
    }
  }
} 