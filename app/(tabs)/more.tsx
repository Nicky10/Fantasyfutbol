import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar, Card, GhostButton, Screen, Subtitle, Title } from '@/src/components/ui';
import { useLeague } from '@/src/context/LeagueContext';
import { colors, space } from '@/src/theme';

export default function MoreScreen() {
  const { me, data, signOut } = useLeague();

  const leave = () => {
    signOut();
    router.replace('/');
  };

  return (
    <Screen>
      <Title>More</Title>
      {me ? (
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 }}>
          <Avatar name={me.name} position={me.position} playerId={me.id} />
          <View>
            <Text style={styles.name}>{me.name}</Text>
            <Subtitle>
              {me.position} · #{me.shirt} · {data?.demo ? 'demo data' : 'live sheet'}
            </Subtitle>
          </View>
        </Card>
      ) : null}

      <View style={{ marginTop: space.md, gap: 10 }}>
        <Row title="Rules & scoring" body="Budget, chips, points by position" onPress={() => router.push('/rules')} />
        <Row title="Switch player" body="Enter as someone else on Dark Team" onPress={leave} />
      </View>

      <View style={{ marginTop: space.lg }}>
        <GhostButton label="Sign out" onPress={leave} />
      </View>
    </Screen>
  );
}

function Row({ title, body, onPress }: { title: string; body: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <Text style={styles.rowTitle}>{title}</Text>
      <Text style={styles.rowBody}>{body}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  name: { color: colors.text, fontFamily: 'DMSans_700Bold', fontSize: 18 },
  row: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.line,
  },
  rowTitle: { color: colors.text, fontFamily: 'DMSans_700Bold', fontSize: 15 },
  rowBody: { color: colors.muted, fontFamily: 'DMSans_400Regular', marginTop: 4 },
});
