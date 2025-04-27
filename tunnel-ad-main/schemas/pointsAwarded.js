export default {
  name: 'pointsAwarded',
  title: 'Points Awarded',
  type: 'object',
  fields: [
    {
      name: 'user',
      type: 'reference',
      to: [{ type: 'user' }],
      title: 'User'
    },
    {
      name: 'points',
      type: 'number',
      title: 'Points',
      initialValue: 1
    },
    {
      name: 'awardedAt',
      type: 'datetime',
      title: 'Awarded At',
      initialValue: () => new Date().toISOString()
    }
  ],
  preview: {
    select: {
      title: 'user.username',
      firstName: 'user.firstName',
      lastName: 'user.lastName',
      points: 'points',
      awardedAt: 'awardedAt',
      media: 'user.profile.avatar'
    },
    prepare(selection) {
      const { title, firstName, lastName, points, awardedAt, media } = selection;
      const username = title || (firstName && lastName ? `${firstName} ${lastName}` : 'Unknown user');
      const date = awardedAt ? new Date(awardedAt).toLocaleString() : '';
      
      return {
        title: `${username} awarded ${points || 1} points`,
        subtitle: date,
        media: media
      };
    }
  }
} 