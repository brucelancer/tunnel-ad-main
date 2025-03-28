export default {
  name: 'message',
  title: 'Message',
  type: 'document',
  fields: [
    {
      name: 'text',
      title: 'Message Text',
      type: 'text',
      validation: Rule => Rule.required()
    },
    {
      name: 'sender',
      title: 'Sender',
      type: 'reference',
      to: [{ type: 'user' }],
      validation: Rule => Rule.required()
    },
    {
      name: 'recipient',
      title: 'Recipient',
      type: 'reference',
      to: [{ type: 'user' }],
      validation: Rule => Rule.required()
    },
    {
      name: 'attachments',
      title: 'Attachments',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            {
              name: 'type',
              title: 'Type',
              type: 'string',
              options: {
                list: [
                  { title: 'Image', value: 'image' },
                  { title: 'Video', value: 'video' },
                  { title: 'Audio', value: 'audio' },
                  { title: 'File', value: 'file' },
                ]
              }
            },
            {
              name: 'file',
              title: 'File',
              type: 'file'
            },
            {
              name: 'url',
              title: 'URL',
              type: 'url'
            }
          ]
        }
      ]
    },
    {
      name: 'seen',
      title: 'Seen',
      type: 'boolean',
      initialValue: false
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
      title: 'text',
      sender: 'sender.username',
      recipient: 'recipient.username'
    },
    prepare({ title, sender, recipient }) {
      return {
        title: title?.substring(0, 50) || 'No message content',
        subtitle: sender && recipient ? `From ${sender} to ${recipient}` : 'Unknown users'
      };
    }
  }
} 