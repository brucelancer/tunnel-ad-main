import React from 'react';
import { View, StyleSheet } from 'react-native';
import Feed from '@/components/Feed';

export default function FeedTabScreen() {
  return (
    <View style={styles.container}>
      <Feed />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
}); 