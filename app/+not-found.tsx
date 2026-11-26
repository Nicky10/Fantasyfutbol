import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/src/theme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Missing' }} />
      <View style={styles.container}>
        <Text style={styles.title}>That screen is gone.</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Back to Dark Team</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: { color: colors.text, fontFamily: 'DMSans_700Bold', fontSize: 20 },
  link: { marginTop: 16 },
  linkText: { color: colors.lime, fontFamily: 'DMSans_700Bold' },
});
