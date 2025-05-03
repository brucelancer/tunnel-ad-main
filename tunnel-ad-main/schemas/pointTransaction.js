export default {
  name: 'pointTransaction',
  title: 'Point Transaction',
  type: 'document',
  fields: [
    {
      name: 'user',
      title: 'User',
      type: 'reference',
      to: [{ type: 'user' }],
      description: 'User who received or spent the points'
    },
    {
      name: 'points',
      title: 'Points',
      type: 'number',
      description: 'Number of points in this transaction (positive for received, negative for spent)'
    },
    {
      name: 'transactionType',
      title: 'Transaction Type',
      type: 'string',
      options: {
        list: [
          { title: 'Claim', value: 'claim' },
          { title: 'Award', value: 'award' },
          { title: 'Spend', value: 'spend' },
          { title: 'System', value: 'system' }
        ]
      }
    },
    {
      name: 'source',
      title: 'Source',
      type: 'reference',
      to: [
        { type: 'post' },
        { type: 'video' }
      ],
      description: 'Source of the points (post or video)'
    },
    {
      name: 'createdAt',
      title: 'Created At',
      type: 'datetime',
      initialValue: () => new Date().toISOString()
    },
    {
      name: 'description',
      title: 'Description',
      type: 'string',
      description: 'Optional description of the transaction'
    }
  ],
  preview: {
    select: {
      user: 'user.username',
      points: 'points',
      type: 'transactionType',
      date: 'createdAt'
    },
    prepare({ user, points, type, date }) {
      const formattedDate = date ? new Date(date).toLocaleDateString() : '';
      return {
        title: `${user || 'User'}: ${points > 0 ? '+' : ''}${points} points`,
        subtitle: `${type || 'Transaction'} on ${formattedDate}`
      };
    }
  }
} 