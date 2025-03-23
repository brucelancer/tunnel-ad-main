export default {
  name: 'passwordReset',
  title: 'Password Reset',
  type: 'document',
  fields: [
    {
      name: 'email',
      title: 'Email',
      type: 'string',
      validation: Rule => Rule.required().email()
    },
    {
      name: 'token',
      title: 'Reset Token',
      type: 'string',
      validation: Rule => Rule.required()
    },
    {
      name: 'createdAt',
      title: 'Created At',
      type: 'datetime',
      validation: Rule => Rule.required()
    },
    {
      name: 'expiresAt',
      title: 'Expires At',
      type: 'datetime',
      validation: Rule => Rule.required()
    },
    {
      name: 'isUsed',
      title: 'Is Used',
      type: 'boolean',
      initialValue: false
    },
    {
      name: 'usedAt',
      title: 'Used At',
      type: 'datetime'
    },
    {
      name: 'user',
      title: 'User Reference',
      type: 'reference',
      to: [{ type: 'user' }]
    }
  ],
  preview: {
    select: {
      title: 'email',
      subtitle: 'isUsed'
    },
    prepare({ title, subtitle }) {
      return {
        title,
        subtitle: subtitle ? 'Used' : 'Active'
      }
    }
  },
  indexes: [
    { name: 'token', value: [{ path: 'token' }], unique: true }
  ]
} 