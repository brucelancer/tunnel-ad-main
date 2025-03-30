export default {
  name: 'authSettings',
  title: 'Authentication Settings',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Title',
      type: 'string',
      initialValue: 'Authentication Settings',
      readOnly: false,
    },
    {
      name: 'loginScreen',
      title: 'Login Screen Settings',
      type: 'object',
      fields: [
        {
          name: 'headerTitle',
          title: 'Header Title',
          type: 'string',
          initialValue: 'tunnel'
        },
        {
          name: 'title',
          title: 'Title',
          type: 'string',
          initialValue: 'Welcome Back'
        },
        {
          name: 'subtitle',
          title: 'Subtitle',
          type: 'string',
          initialValue: 'Sign in to continue your journey'
        },
        {
          name: 'googleAuthEnabled',
          title: 'Enable Google Authentication',
          type: 'boolean',
          initialValue: true
        },
        {
          name: 'footerText',
          title: 'Footer Text',
          type: 'string',
          initialValue: 'By continuing, you agree to our Terms of Service and Privacy Policy'
        }
      ]
    },
    {
      name: 'signupScreen',
      title: 'Signup Screen Settings',
      type: 'object',
      fields: [
        {
          name: 'headerTitle',
          title: 'Header Title',
          type: 'string',
          initialValue: 'tunnel'
        },
        {
          name: 'title',
          title: 'Title',
          type: 'string',
          initialValue: 'Create Account'
        },
        {
          name: 'subtitle',
          title: 'Subtitle',
          type: 'string',
          initialValue: 'Join our community and start earning'
        },
        {
          name: 'googleAuthEnabled',
          title: 'Enable Google Authentication',
          type: 'boolean',
          initialValue: true
        },
        {
          name: 'footerText',
          title: 'Footer Text',
          type: 'string',
          initialValue: 'By continuing, you agree to our Terms of Service and Privacy Policy'
        }
      ]
    },
    {
      name: 'forgotPasswordScreen',
      title: 'Forgot Password Screen Settings',
      type: 'object',
      fields: [
        {
          name: 'headerTitle',
          title: 'Header Title',
          type: 'string',
          initialValue: 'tunnel'
        },
        {
          name: 'title',
          title: 'Title',
          type: 'string',
          initialValue: 'Reset Password'
        },
        {
          name: 'subtitle',
          title: 'Subtitle',
          type: 'string',
          initialValue: 'Enter your email address and we\'ll send you instructions to reset your password'
        },
        {
          name: 'buttonText',
          title: 'Button Text',
          type: 'string',
          initialValue: 'Send Reset Link'
        },
        {
          name: 'successTitle',
          title: 'Success Title',
          type: 'string',
          initialValue: 'Check Your Email'
        },
        {
          name: 'successMessage',
          title: 'Success Message',
          type: 'string',
          initialValue: 'We\'ve sent password reset instructions to your email address. Please check your inbox.'
        },
        {
          name: 'resendText',
          title: 'Resend Text',
          type: 'string',
          initialValue: 'Didn\'t receive the email? Send again'
        }
      ]
    },
    {
      name: 'passwordRequirements',
      title: 'Password Requirements',
      type: 'object',
      fields: [
        {
          name: 'minLength',
          title: 'Minimum Length',
          type: 'number',
          initialValue: 6
        },
        {
          name: 'requireUppercase',
          title: 'Require Uppercase',
          type: 'boolean',
          initialValue: false
        },
        {
          name: 'requireLowercase',
          title: 'Require Lowercase',
          type: 'boolean',
          initialValue: false
        },
        {
          name: 'requireNumbers',
          title: 'Require Numbers',
          type: 'boolean',
          initialValue: false
        },
        {
          name: 'requireSpecialChars',
          title: 'Require Special Characters',
          type: 'boolean',
          initialValue: false
        }
      ]
    },
    {
      name: 'branding',
      title: 'Branding',
      type: 'object',
      fields: [
        {
          name: 'appName',
          title: 'App Name',
          type: 'string',
          initialValue: 'tunnel'
        },
        {
          name: 'tagline',
          title: 'Tagline',
          type: 'string',
          initialValue: 'Connect, Share, Earn'
        },
        {
          name: 'logo',
          title: 'Logo',
          type: 'image',
          options: {
            hotspot: true
          }
        },
        {
          name: 'primaryColor',
          title: 'Primary Color',
          type: 'string',
          initialValue: '#0070F3'
        },
        {
          name: 'secondaryColor',
          title: 'Secondary Color',
          type: 'string',
          initialValue: '#00DFD8'
        }
      ]
    }
  ],
  preview: {
    select: {
      title: 'title'
    }
  }
} 