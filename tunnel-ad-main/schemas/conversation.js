export default {
  name: 'conversation',
  title: 'Conversation',
  type: 'document',
  fields: [
    {
      name: 'participants',
      title: 'Participants',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'user' }] }],
      validation: Rule => Rule.required().min(2).max(2)
    },
    {
      name: 'lastMessage',
      title: 'Last Message',
      type: 'reference',
      to: [{ type: 'message' }]
    },
    {
      name: 'unreadCount',
      title: 'Unread Count',
      type: 'object',
      fields: [
        {
          name: 'user1',
          title: 'User 1 Unread',
          type: 'number',
          initialValue: 0
        },
        {
          name: 'user2',
          title: 'User 2 Unread',
          type: 'number',
          initialValue: 0
        }
      ]
    },
    {
      name: 'isActive',
      title: 'Is Active',
      type: 'boolean',
      initialValue: true
    },
    {
      name: 'createdAt',
      title: 'Created At',
      type: 'datetime',
      initialValue: () => new Date().toISOString()
    },
    {
      name: 'updatedAt',
      title: 'Updated At',
      type: 'datetime',
      initialValue: () => new Date().toISOString()
    }
  ],
  preview: {
    select: {
      participant1: 'participants.0.username',
      participant2: 'participants.1.username',
      lastMessage: 'lastMessage.text'
    },
    prepare({ participant1, participant2, lastMessage }) {
      return {
        title: participant1 && participant2 
          ? `Conversation between ${participant1} and ${participant2}` 
          : 'Incomplete conversation',
        subtitle: lastMessage 
          ? lastMessage.substring(0, 50) + (lastMessage.length > 50 ? '...' : '') 
          : 'No messages'
      };
    }
  }
} 