import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Link } from 'expo-router';

export default function AdminIndexPage() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Admin Dashboard</Text>
      
      <View style={styles.card}>
        <Text style={styles.subtitle}>Admin Tools</Text>
        
        <View style={styles.list}>
          <View style={styles.listItem}>
            <Pressable onPress={() => {}}>
              <Text style={styles.linkText}>Fix User Points</Text>
            </Pressable>
            <Text style={styles.description}>
              Update user points to correct discrepancies between app and Sanity
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  list: {
    gap: 8,
  },
  listItem: {
    marginBottom: 8,
  },
  link: {
    marginTop: 4,
    marginBottom: 4,
  },
  linkText: {
    color: '#3b82f6',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
}); 