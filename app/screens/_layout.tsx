import { Stack } from 'expo-router';
import React from 'react';

export default function ScreensLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="subscriptions"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="notifications"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
} 