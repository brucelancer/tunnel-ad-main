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
      title: 'User',
      type: 'reference',
      to: [{ type: 'user' }],
      validation: Rule => Rule.required()
    }
  ],
  preview: {
    select: {
      email: 'email',
      created: 'createdAt',
      used: 'isUsed'
    },
    prepare({ email, created, used }) {
      return {
        title: email,
        subtitle: `Created: ${new Date(created).toLocaleString()} | Used: ${used ? 'Yes' : 'No'}`,
      }
    }
  },
  indexes: [
    { name: 'token', value: [{ path: 'token' }], unique: true }
  ]
} 