export default {
  name: 'user',
  title: 'User',
  type: 'document',
  fields: [
    {
      name: 'email',
      title: 'Email',
      type: 'string',
      validation: Rule => Rule.required().email(),
    },
    {
      name: 'username',
      title: 'Username',
      type: 'string',
      validation: Rule => Rule.required(),
    },
    {
      name: 'password',
      title: 'Password',
      type: 'string',
      hidden: true, // Hide in Studio UI for security
    },
    {
      name: 'firstName',
      title: 'First Name',
      type: 'string',
    },
    {
      name: 'lastName',
      title: 'Last Name',
      type: 'string',
    },
    {
      name: 'phone',
      title: 'Phone Number',
      type: 'string',
    },
    {
      name: 'location',
      title: 'Location',
      type: 'string',
    },
    {
      name: 'fullName',
      title: 'Full Name',
      type: 'string',
    },
    {
      name: 'profile',
      title: 'Profile',
      type: 'object',
      fields: [
        {
          name: 'avatar',
          title: 'Avatar',
          type: 'image',
          options: {
            hotspot: true
          }
        },
        {
          name: 'bio',
          title: 'Bio',
          type: 'text',
        },
        {
          name: 'interests',
          title: 'Interests',
          type: 'array',
          of: [{ type: 'string' }]
        }
      ]
    },
    {
      name: 'isActive',
      title: 'Active Status',
      type: 'boolean',
      initialValue: true,
    },
    {
      name: 'accountType',
      title: 'Account Type',
      type: 'string',
      options: {
        list: [
          { title: 'Regular', value: 'regular' },
          { title: 'Creator', value: 'creator' },
          { title: 'Admin', value: 'admin' },
        ],
      },
      initialValue: 'regular',
    },
    {
      name: 'createdAt',
      title: 'Created At',
      type: 'datetime',
      readOnly: false,
    },
    {
      name: 'updatedAt',
      title: 'Updated At',
      type: 'datetime',
    },
    {
      name: 'loginMethod',
      title: 'Login Method',
      type: 'string',
      options: {
        list: [
          { title: 'Email/Password', value: 'email' },
          { title: 'Google', value: 'google' },
        ],
      },
    },
    {
      name: 'points',
      title: 'Points',
      type: 'number',
      initialValue: 0,
    },
    {
      name: 'needsPasswordReset',
      title: 'Needs Password Reset',
      type: 'boolean',
      initialValue: false,
    },
    {
      name: 'isBlueVerified',
      title: 'Blue Verification Mark',
      type: 'boolean',
      description: 'Special blue verification badge for select users',
      initialValue: false,
    }
  ],
  preview: {
    select: {
      title: 'username',
      subtitle: 'email',
      media: 'profile.avatar'
    }
  },
  indexes: [
    { name: 'email', value: [{ path: 'email' }], unique: true },
    { name: 'username', value: [{ path: 'username' }], unique: true }
  ]
} 