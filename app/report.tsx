import React from 'react';
import { View, StyleSheet } from 'react-native';
import ReportScreen from './components/ReportScreen';

export default function ReportPage() {
  return (
    <View style={styles.container}>
      <ReportScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
}); 