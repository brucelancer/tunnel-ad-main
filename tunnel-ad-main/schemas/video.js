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