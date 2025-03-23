/**
 * Script to migrate users from the old schema to the new schema
 * 
 * This script will:
 * 1. Find all users without a profile object
 * 2. Create a profile object for them using profileImage, bio, etc.
 * 3. Update the user document with the new structure
 * 
 * Run with: node scripts/migrate-users.js
 */

import { createClient } from '@sanity/client';

// Initialize Sanity client
const client = createClient({
  projectId: '21is7976',
  dataset: 'production',
  apiVersion: '2023-03-01',
  token: 'skfYBXlqcVRszR6D3U2X3hPAMKupissIjK6LehFgtmYRkavBwU49tXYqryhOliJ7mclzM38VivW4vz75T6edrwsmwGPwgFEHxgANwxVnFNDFBq9pWjLhSd6dfB4yJNbVbgfkKlkocZ1VgYpd2ldczW64WNhqiTkclddkAxaTinVBhF9NMme0',
  useCdn: false,
});

async function migrateUsers() {
  try {
    console.log('Starting user migration...');

    // Find all users without a profile object or with old fields
    const users = await client.fetch(`*[_type == "user" && (
      !defined(profile) || 
      defined(profileImage) || 
      defined(bio)
    )]`);

    console.log(`Found ${users.length} users to migrate`);

    // Perform migration for each user
    for (const user of users) {
      console.log(`Migrating user: ${user.username || user.email}`);

      // Prepare profile object
      const profile = {
        // Use existing profile or create new one
        ...(user.profile || {}),
        // Move avatar from profileImage if it exists
        ...(user.profileImage && { avatar: user.profileImage }),
        // Move bio if it exists
        ...(user.bio && { bio: user.bio }),
        // Initialize interests if not present
        interests: user.profile?.interests || []
      };

      // Update the user document
      await client
        .patch(user._id)
        .set({ profile })
        .unset(['profileImage', 'bio']) // Remove old fields
        .commit();

      console.log(`Successfully migrated user: ${user.username || user.email}`);
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

// Execute the migration
migrateUsers(); 