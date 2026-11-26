import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar, Card, Pill, Screen, Subtitle, Title } from '@/src/components/ui';
import { useLeague } from '@/src/context/LeagueContext';
import { money, signed } from '@/src/lib/format';
import { colors, space } from '@/src/theme';

export default function PlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useLeague();
  const player = data?.players.find((p) => p.id === id);
  const season = data?.computed.playerSeason.find((p) => p.playerId === id);
  const history = (data?.computed.playerGameweekPoints || [])
    .filter((row) => row.playerId === id && row.points !== 0)
    .slice()
    .reverse();

  if (!player || !data) {
    return (
      <Screen>
        <Title>Missing player</Title>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.head}>
        <Avatar name={player.name} position={player.position} size={72} playerId={player.id} />
        <View style={{ flex: 1 }}>
          <Title size={36}>{player.name}</Title>
          <Subtitle>
            {player.position} · {money(player.price)}
            {player.isSub ? ' · guest slot' : ''}
          </Subtitle>
        </View>
        <Pill label={player.position} tone={player.position} />
      </View>

      <View style={styles.grid}>
        <Stat label="Points" value={season?.points ?? 0} />
        <Stat label="Goals" value={season?.goals ?? 0} />
        <Stat label="Assists" value={season?.assists ?? 0} />
        <Stat label="Def cons" value={season?.defCons ?? 0} />
        <Stat label="Clean sheets" value={season?.cleanSheets ?? 0} />
        <Stat label="MOTM" value={season?.motm ?? 0} />
      </View>

      <Title size={26}>Gameweeks</Title>
      <View style={{ gap: 8, marginTop: 10 }}>
        {history.length === 0 ? (
          <Card>
            <Subtitle>No scored matches yet for this player.</Subtitle>
          </Card>
        ) : (
          history.map((row) => {
            const gw = data.gameweeks.find((g) => g.id === row.gameweekId);
            return (
              <Pressable key={row.gameweekId} onPress={() => router.push(`/gameweek/${row.gameweekId}`)}>
                <Card>
                  <View style={styles.gwHead}>
                    <Text style={styles.gwName}>{gw?.name || row.gameweekId}</Text>
                    <Text style={styles.gwPts}>{signed(row.points)}</Text>
                  </View>
                  <Subtitle>{gw ? `vs ${gw.opponent || 'TBD'}` : ''}</Subtitle>
                  <View style={{ marginTop: 8, gap: 4 }}>
                    {row.breakdown.map((item, index) => (
                      <Text key={`${row.gameweekId}-${item.label}-${index}`} style={styles.break}>
                        {item.label}  {signed(item.value)}
                      </Text>
                    ))}
                  </View>
                  <Text style={styles.open}>Your squad →</Text>
                </Card>
              </Pressable>
            );
          })
        )}
      </View>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statVal}>{value}</Text>
      <Text style={styles.statLab}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: space.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: space.lg },
  stat: {
    width: '31%',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  statVal: { color: colors.lime, fontFamily: 'BebasNeue_400Regular', fontSize: 28, lineHeight: 30 },
  statLab: { color: colors.muted, fontFamily: 'DMSans_400Regular', fontSize: 12, marginTop: 2 },
  gwHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  gwName: { color: colors.text, fontFamily: 'DMSans_700Bold' },
  gwPts: { color: colors.lime, fontFamily: 'BebasNeue_400Regular', fontSize: 24 },
  break: { color: colors.muted, fontFamily: 'DMSans_400Regular', fontSize: 13 },
  open: { color: colors.lime, fontFamily: 'DMSans_700Bold', fontSize: 13, marginTop: 10 },
});
