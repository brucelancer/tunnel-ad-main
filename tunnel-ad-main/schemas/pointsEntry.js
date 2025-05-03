// Schema for pointsEntry type that can be used in pointsHistory arrays
export default {
  name: 'pointsEntry',
  title: 'Points Entry',
  type: 'object',
  fields: [
    {
      name: 'points',
      title: 'Points',
      type: 'number',
      description: 'Number of points earned or spent'
    },
    {
      name: 'source',
      title: 'Source',
      type: 'string',
      description: 'Where the points came from (post, video, etc.)'
    },
    {
      name: 'sourceId',
      title: 'Source ID',
      type: 'string',
      description: 'ID of the source content'
    },
    {
      name: 'earnedAt',
      title: 'Earned At',
      type: 'datetime',
      description: 'When the points were earned',
      initialValue: () => new Date().toISOString()
    }
  ],
  preview: {
    select: {
      points: 'points',
      source: 'source',
      date: 'earnedAt'
    },
    prepare({ points, source, date }) {
      const formattedDate = date ? new Date(date).toLocaleDateString() : '';
      return {
        title: `${points > 0 ? '+' : ''}${points} points`,
        subtitle: `From ${source || 'unknown'} on ${formattedDate}`
      };
    }
  }
} 