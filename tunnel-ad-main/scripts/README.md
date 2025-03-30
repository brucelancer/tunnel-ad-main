# Sanity Data Fix Scripts

This directory contains scripts to help fix data issues in the Sanity database.

## Fix Missing Image Keys Script

The `fixImageKeys.js` script is designed to fix the "Missing keys" error in Sanity Studio for post images. This error occurs when array items in Sanity don't have a unique `_key` property.

### What the Error Looks Like

In Sanity Studio, you might see an error like this:
- "Missing keys"
- "Some items in the list are missing their keys. This must be fixed in order to edit the list."

### How to Use the Script

1. Make sure you have a Sanity API token with write permissions.

2. Create a `.env` file in the root of your project with the following variables:
   ```
   NEXT_PUBLIC_SANITY_PROJECT_ID=your_project_id
   NEXT_PUBLIC_SANITY_DATASET=your_dataset
   SANITY_API_TOKEN=your_token
   ```

3. Install required packages if not already installed:
   ```
   npm install @sanity/client
   ```

4. Run the script:
   ```
   node scripts/fixImageKeys.js
   ```

5. After the script completes successfully, refresh Sanity Studio and try using the "Add missing keys" button.

### What the Script Does

1. Fetches all post documents that have an `images` array.
2. For each post, it checks if any images in the array are missing the `_key` property.
3. Adds a unique `_key` to each image that doesn't have one.
4. Updates the post in Sanity with the fixed images array.

### Prevention

The issue has been fixed in the `postService.js` file to ensure all new image uploads include a `_key` property, preventing this issue from occurring for new posts.

## Troubleshooting

If you continue to see the "Missing keys" error after running the script:

1. Make sure your Sanity API token has write permissions.
2. Verify that the environment variables are correctly set.
3. Check the console output for any errors during script execution.
4. Try running the script again to catch any posts that might have been missed.
5. As a last resort, you can use the "Add missing keys" button in Sanity Studio, which should now work after most keys have been fixed. 