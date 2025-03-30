# Password Reset Flow

This document outlines the password reset flow implemented in the Tunnel app.

## Overview

The password reset flow allows users to recover their accounts when they've forgotten their passwords. The process is as follows:

1. User requests a password reset from the Forgot Password screen
2. System generates a unique token and stores it in Sanity with an expiration date
3. System sends an email to the user with a password reset link containing the token
4. User clicks the link and is taken to the Reset Password screen
5. User enters a new password
6. System verifies the token and updates the user's password

## Technical Implementation

### Sanity Schema

We use two Sanity schemas to manage this process:

1. `user` - Stores user credentials and profile information
2. `passwordReset` - Stores the password reset tokens with expiration dates

The `passwordReset` schema contains:
- `email` - The user's email address
- `token` - A unique token for the reset
- `createdAt` - When the reset was requested
- `expiresAt` - When the token expires (typically 1 hour after creation)
- `isUsed` - Whether the token has been used
- `user` - Reference to the user document

### API Functions

The following functions handle the password reset flow:

1. `requestPasswordReset(email)` - Creates a reset token and sends an email
2. `resetPassword(token, newPassword)` - Validates the token and updates the password

### Frontend Components

The frontend implements these screens:

1. `ForgotPasswordScreen.tsx` - Allows users to request a password reset
2. `ResetPasswordScreen.tsx` - Allows users to set a new password using the token

## Security Considerations

- Password reset tokens expire after 1 hour
- Tokens can only be used once
- For privacy reasons, the system does not reveal whether an email exists in the database
- All password reset links are sent via email only to the account owner's address

## Future Improvements

- Add rate limiting to prevent abuse
- Implement password strength requirements during reset
- Add multi-factor authentication option for password resets 