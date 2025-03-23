# Tunnel Authentication with Sanity

This README explains how to use the Sanity authentication setup for the Tunnel app.

## Overview

The authentication system uses Sanity as a backend and provides the following features:

- User registration and login
- Google authentication
- Password reset flow
- Persistent sessions using AsyncStorage
- Customizable UI settings through Sanity Studio

## Setup

### 1. Environment Variables

Create a `.env` file in the root of your project with the following variables:

```
SANITY_AUTH_TOKEN=your_sanity_auth_token
SANITY_PROJECT_ID=your_project_id
SANITY_DATASET=production
```

### 2. Sanity Studio Setup

Make sure you've added the authentication schemas to your Sanity Studio:

- The schemas are located in `schemas/auth/`
- They include: user.js, authSettings.js, and passwordReset.js
- They are imported in the main schema index file

### 3. Create Auth Settings Document

Create an auth settings document in Sanity Studio with customization options for:

- Login screen UI
- Signup screen UI
- Forgot password screen UI
- Password requirements
- App branding

## Usage

### In React Native Components

Import the `useSanityAuth` hook in your components:

```javascript
import { useSanityAuth } from '../hooks/useSanityAuth';

function LoginScreen() {
  const { 
    login, 
    googleLogin, 
    loading, 
    error, 
    authSettings 
  } = useSanityAuth();

  // Use the auth functions and settings in your component
  // ...
}
```

### Available Hook Functions

The `useSanityAuth` hook provides these functions:

- `login(email, password)` - Log in with email and password
- `signup(userData)` - Register a new user
- `googleLogin(googleUserData)` - Authenticate with Google
- `forgotPassword(email)` - Request a password reset
- `resetPassword(token, newPassword)` - Reset password with token
- `logout()` - Log out the current user

### Available Hook States

The hook also provides these state variables:

- `user` - Current user data or null if not logged in
- `loading` - Boolean indicating if an auth operation is in progress
- `error` - Error message from the last operation or null
- `authSettings` - UI settings from Sanity for auth screens
- `isAuthenticated` - Boolean indicating if a user is logged in

## Customizing UI

All UI settings are fetched from Sanity and available through the `authSettings` object:

```javascript
// Example of using authSettings
const { authSettings } = useSanityAuth();

const branding = authSettings?.branding || {
  appName: 'Default App Name',
  primaryColor: '#0070F3'
};

// Use branding in your components
<Text style={{ color: branding.primaryColor }}>
  {branding.appName}
</Text>
```

## Security Considerations

- The password reset flow is designed with security in mind
- Authentication tokens are stored only in environment variables, not in code
- Session data is stored in AsyncStorage using secure practices

## Troubleshooting

If you encounter issues:

1. Check that your Sanity token has correct permissions
2. Verify that the Sanity project ID is correct
3. Check the environment variables are properly loaded
4. Look for error messages in the console

## Permission Issues

If you encounter "Insufficient permissions" errors with your Sanity token, you can enable READ_ONLY_MODE:

1. In your `.env` file, set `READ_ONLY_MODE=true`
2. This will enable a demo mode that doesn't require write permissions
3. In demo mode, users can still log in and explore the app
4. Data will be stored only locally, not in Sanity

When in READ_ONLY_MODE:
- Login will work with any credentials (no server validation)
- User data is only stored locally in AsyncStorage
- Write operations to Sanity are skipped
- You'll see a "Demo Mode" indicator in the UI

To fix permission issues permanently:
1. Create a new token in Sanity Studio with appropriate permissions
2. Grant it read AND write permissions for the necessary datasets
3. Update the `SANITY_AUTH_TOKEN` in your `.env` file

## Further Customization

To customize the authentication flow further:

1. Edit the schemas in `schemas/auth/` to add or modify fields
2. Update the `sanityAuthService.js` file to handle new fields
3. Modify the `useSanityAuth.js` hook to expose new functionality 