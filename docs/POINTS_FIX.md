# Points Discrepancy Fix Guide

This document explains how to fix discrepancies between points displayed in the app and points stored in Sanity.

## Background

There is an issue where the points showing in the app and Sanity can get out of sync. If the app shows 879 points but Sanity shows a different value (like 874 or 10), we need to update Sanity to match the app.

## Fixing Options

There are three ways to fix this issue:

### Option 1: Using the Admin Fix Points Page (Recommended when dev server is running)

1. Start your development server if it's not already running:
   ```
   npm run dev
   ```

2. Navigate to the Admin Dashboard at:
   ```
   http://localhost:3333/admin
   ```

3. Click on "Fix User Points"

4. Enter the user's ID (found in the URL of the user profile in Sanity Studio)

5. Enter the correct points value (879 in this case)

6. Click "Update Points" and verify that the update was successful

### Option 2: Using the Direct Sanity Fix Script (Recommended when dev server is not running)

This option directly updates Sanity without requiring the development server to be running:

1. Run the direct fix script:
   ```
   npm run fix-points-direct
   ```

2. The script will automatically:
   - Find the user with ID "MBs86ihGgxetNe5QowItmT" (tunnel)
   - Show current points in Sanity
   - Update the points to 879
   - Verify the update was successful

### Option 3: Using the Command Line Script with Dev Server

1. Make sure you have Node.js installed

2. Start your development server if it's not already running:
   ```
   npm run dev
   ```

3. Run the fix-points.js script with the user ID and correct points value:
   ```
   node scripts/fix-points.js <user_id> 879
   ```
   
   Replace `<user_id>` with the actual user ID (found in the URL of the user profile in Sanity Studio)

4. The script will show you the current points, update them to the new value, and verify the update.

## Verifying the Fix

After running any of these methods, you can verify the fix by:

1. Checking the user profile in the app - it should show 879 points

2. Checking the user in Sanity Studio - it should now show 879 points

3. If needed, you can use the GET endpoint to verify (if dev server is running):
   ```
   GET http://localhost:3333/api/debug-user?userId=<user_id>
   ```

## Preventing Future Discrepancies

To prevent this issue in the future:

1. When adding or subtracting points, always use the dedicated API endpoints or services

2. Avoid directly modifying the points field in Sanity Studio

3. If a discrepancy is detected, use the tools provided in this document to fix it 