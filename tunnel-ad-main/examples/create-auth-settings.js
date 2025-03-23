/**
 * Example script to programmatically create the authSettings document in Sanity
 * 
 * To use this script:
 * 1. Save this file as create-auth-settings.js
 * 2. Run with Node.js: node create-auth-settings.js
 */

// Import the Sanity client
import { createClient } from '@sanity/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create the Sanity client
const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET || 'production',
  token: process.env.SANITY_AUTH_TOKEN,
  useCdn: false,
  apiVersion: '2023-03-01',
});

// Define the auth settings document
const authSettingsDoc = {
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
  }
};

// Function to create or update the auth settings document
async function createOrUpdateAuthSettings() {
  try {
    // Check if the document already exists
    const existingDoc = await client.getDocument('authSettings');
    
    if (existingDoc) {
      console.log('Auth settings document already exists. Updating...');
      const updatedDoc = await client
        .patch('authSettings')
        .set(authSettingsDoc)
        .commit();
      console.log('Updated auth settings document:', updatedDoc._id);
    } else {
      console.log('Creating new auth settings document...');
      const createdDoc = await client.create(authSettingsDoc);
      console.log('Created auth settings document:', createdDoc._id);
    }
  } catch (error) {
    if (error.statusCode === 404) {
      // Document not found, create a new one
      console.log('Creating new auth settings document...');
      const createdDoc = await client.create(authSettingsDoc);
      console.log('Created auth settings document:', createdDoc._id);
    } else {
      console.error('Error creating/updating auth settings:', error);
    }
  }
}

// Execute the function
createOrUpdateAuthSettings()
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  }); 