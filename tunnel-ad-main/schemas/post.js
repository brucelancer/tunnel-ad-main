export default {
  name: 'post',
  title: 'Post',
  type: 'document',
  fields: [
    {
      name: 'content',
      title: 'Content',
      type: 'text',
      validation: Rule => Rule.required()
    },
    {
      name: 'images',
      title: 'Images',
      type: 'array',
      of: [{ type: 'image', options: { hotspot: true } }]
    },
    {
      name: 'location',
      title: 'Location',
      type: 'string'
    },
    {
      name: 'author',
      title: 'Author',
      type: 'reference',
      to: [{ type: 'user' }],
      validation: Rule => Rule.required()
    },
    {
      name: 'likes',
      title: 'Likes',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'user' }] }],
      initialValue: []
    },
    {
      name: 'likesCount',
      title: 'Likes Count',
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
          fields: [
            {
              name: 'text',
              type: 'text',
              title: 'Comment Text'
            },
            {
              name: 'author',
              type: 'reference',
              to: [{ type: 'user' }],
              title: 'Comment Author'
            },
            {
              name: 'createdAt',
              type: 'datetime',
              title: 'Created At',
              initialValue: () => new Date().toISOString()
            },
            {
              name: 'likes',
              type: 'array',
              of: [{ type: 'reference', to: [{ type: 'user' }] }],
              title: 'Comment Likes',
              initialValue: []
            }
          ]
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
      name: 'savedBy',
      title: 'Saved By',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'user' }] }],
      initialValue: []
    },
    {
      name: 'points',
      title: 'Points',
      type: 'number',
      initialValue: 0
    },
    {
      name: 'pointsAwardedBy',
      title: 'Points Awarded By',
      type: 'array',
      of: [{ type: 'pointsAwarded' }],
      initialValue: [],
      options: {
        layout: 'grid'
      }
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
      title: 'content',
      author: 'author.username',
      media: 'images.0'
    },
    prepare({ title, author, media }) {
      return {
        title: title?.substring(0, 50) || 'No content',
        subtitle: author ? `By ${author}` : 'Unknown author',
        media
      };
    }
  }
} 