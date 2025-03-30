// Report schema for content moderation
export default {
  name: 'report',
  title: 'Content Reports',
  type: 'document',
  fields: [
    {
      name: 'post',
      title: 'Reported Post',
      type: 'reference',
      to: [{ type: 'post' }],
      description: 'The post that was reported',
      validation: Rule => Rule.required()
    },
    {
      name: 'reportedBy',
      title: 'Reported By',
      type: 'reference',
      to: [{ type: 'user' }],
      description: 'The user who reported this content'
    },
    {
      name: 'reason',
      title: 'Report Reason',
      type: 'text',
      description: 'Why the user reported this content',
      validation: Rule => Rule.required().min(10)
    },
    {
      name: 'status',
      title: 'Report Status',
      type: 'string',
      options: {
        list: [
          { title: 'Pending Review', value: 'pending' },
          { title: 'Under Investigation', value: 'investigating' },
          { title: 'Action Taken', value: 'actioned' },
          { title: 'Rejected', value: 'rejected' }
        ]
      },
      initialValue: 'pending',
      validation: Rule => Rule.required()
    },
    {
      name: 'moderatorNotes',
      title: 'Moderator Notes',
      type: 'text',
      description: 'Notes from the moderation team about this report'
    },
    {
      name: 'createdAt',
      title: 'Report Date',
      type: 'datetime',
      validation: Rule => Rule.required()
    },
    {
      name: 'updatedAt',
      title: 'Last Updated',
      type: 'datetime'
    }
  ],
  preview: {
    select: {
      reason: 'reason',
      status: 'status',
      username: 'reportedBy.username',
      date: 'createdAt'
    },
    prepare({ reason, status, username, date }) {
      const shortenedReason = reason ? (reason.length > 30 ? reason.substring(0, 30) + '...' : reason) : 'No reason provided';
      return {
        title: shortenedReason,
        subtitle: `Status: ${status || 'pending'} | ${username ? `Reported by: ${username}` : 'Anonymous'} | ${date ? new Date(date).toLocaleDateString() : 'Unknown date'}`
      }
    }
  },
  orderings: [
    {
      title: 'Report Date, New',
      name: 'reportDateDesc',
      by: [
        { field: 'createdAt', direction: 'desc' }
      ]
    },
    {
      title: 'Status',
      name: 'reportStatus',
      by: [
        { field: 'status', direction: 'asc' },
        { field: 'createdAt', direction: 'desc' }
      ]
    }
  ]
} 