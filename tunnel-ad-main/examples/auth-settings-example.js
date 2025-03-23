/**
 * Example of a complete authSettings document for Sanity Studio
 * This shows the expected structure that the auth screens look for
 */

const authSettingsExample = {
  _type: 'authSettings',
  _id: 'authSettings',
  
  // Login screen settings
  loginScreen: {
    headerTitle: 'tunnel',
    title: 'Welcome Back',
    subtitle: 'Sign in to continue your journey',
    googleAuthEnabled: true,
    footerText: 'By continuing, you agree to our Terms of Service and Privacy Policy'
  },
  
  // Signup screen settings
  signupScreen: {
    headerTitle: 'tunnel',
    title: 'Create Account',
    subtitle: 'Sign up to start your journey',
    googleAuthEnabled: true,
    footerText: 'By continuing, you agree to our Terms of Service and Privacy Policy'
  },
  
  // Forgot password screen settings
  forgotPasswordScreen: {
    headerTitle: 'tunnel',
    title: 'Reset Password',
    subtitle: 'Enter your email address and we\'ll send you instructions to reset your password',
    successTitle: 'Check Your Email',
    successMessage: 'We\'ve sent password reset instructions to your email address. Please check your inbox.',
    buttonText: 'Send Reset Link',
    resendText: 'Didn\'t receive the email? Send again'
  },
  
  // Password requirements
  passwordRequirements: {
    minLength: 8,
    requireSpecialChar: true,
    requireNumber: true,
    requireUppercase: true
  },
  
  // App branding
  branding: {
    appName: 'tunnel',
    tagline: 'Connect, Share, Earn',
    primaryColor: '#0070F3',
    secondaryColor: '#00DFD8',
    logo: {
      // Reference to an image in Sanity
      _type: 'image',
      asset: {
        _type: 'reference',
        _ref: 'image-...'  // This would be the actual image reference ID in your Sanity studio
      }
    }
  },
  
  // Social auth providers (for future expansion)
  socialAuth: {
    google: {
      enabled: true
    },
    apple: {
      enabled: false
    },
    facebook: {
      enabled: false
    }
  },
  
  // Additional settings
  enableUsernameLogin: true,  // Whether to allow username login in addition to email
  requireEmailVerification: true,  // Whether email verification is required
  loginRedirectPath: '/home',  // Where to redirect after login (for web)
  resetPasswordTokenExpiry: 3600  // How long reset tokens are valid (in seconds)
};

/**
 * To create this document in Sanity Studio:
 * 
 * 1. Navigate to your Sanity Studio
 * 2. Click "Auth Settings" in the sidebar
 * 3. Create a new document with the structure above
 * 4. Set the document _id to "authSettings" (this is the ID that the app looks for)
 * 5. Fill in all the fields as desired
 * 6. Publish the document
 */

export default authSettingsExample; 