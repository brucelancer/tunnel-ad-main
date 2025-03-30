# Real-Time Chat Implementation

This document outlines the real-time chat functionality implemented in the Tunnel app.

## Overview

The real-time chat system allows users to send and receive messages instantly without requiring manual refreshes. The implementation uses Sanity's real-time listener API to subscribe to changes in the database.

## Key Components

### Chat Screen (`app/chat.tsx`)

The chat screen implementation features:

1. **Real-time message subscription**: Uses Sanity's `listen` API to subscribe to new messages between the current user and their chat partner.
2. **Optimistic UI updates**: When a user sends a message, it appears immediately in the UI as a "temporary" message with a visual indicator, before being confirmed by the server.
3. **Message seen status**: Messages are automatically marked as seen when viewed, with real-time updates to the seen status.
4. **Auto-scrolling**: The chat automatically scrolls to the latest message when new content arrives.

### Conversations Screen (`app/conversations.tsx`)

The conversations list implementation features:

1. **Real-time conversation updates**: When new messages arrive, the conversation list updates immediately without requiring a manual refresh.
2. **Unread message counters**: Unread message counts update in real-time as new messages arrive.
3. **Recent activity indicators**: Recently active conversations are highlighted and sorted to the top of the list.
4. **Delivery status indicators**: Messages show different indicators for "sending", "delivered", and "seen" states.

## Technical Implementation

### Sanity Real-Time Listeners

We use two types of listeners:

1. **Message listeners**: Subscribe to changes in message documents that involve the current user.
   ```javascript
   const messageQuery = `*[_type == "message" && (sender._ref == $userId || recipient._ref == $userId)]`;
   ```

2. **Conversation listeners**: Subscribe to changes in conversation documents that involve the current user.
   ```javascript
   const conversationQuery = `*[_type == "conversation" && references($userId)]`;
   ```

### Optimistic UI Updates

When a user sends a message:

1. A temporary message is immediately added to the UI with an `isTemp` flag.
2. The message is sent to Sanity in the background.
3. Upon successful save, the temporary message is replaced with the confirmed message.
4. If an error occurs, the temporary message is removed and an error is displayed.

### Message Delivery Status

Messages have three states:
- **Sending**: Shown with a loading indicator
- **Delivered**: Shown with "Delivered" text
- **Seen**: Shown with "Seen" text and a blue checkmark

## Usage

The real-time functionality works automatically when using the chat features. There's no need for manual refreshing to see new messages or updates to conversations.

## Error Handling

The implementation includes error handling for:
- Failed message sends
- Connection interruptions
- Invalid message formats

If a real-time update fails, the system will fall back to manual refresh capabilities to ensure users can still access their messages.

## Future Improvements

Potential improvements to the real-time chat system:
- Offline message queue for poor connectivity situations
- Read receipts with timestamps
- Typing indicators
- Message reactions 