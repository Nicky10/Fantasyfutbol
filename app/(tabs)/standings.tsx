import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar, Card, Pill, Screen, Title } from '@/src/components/ui';
import { currentGameweek, useLeague } from '@/src/context/LeagueContext';
import { colors, space } from '@/src/theme';

export default function StandingsScreen() {
  const { data, me, refreshing, refresh } = useLeague();
  const [tab, setTab] = useState<'fantasy' | 'players'>('fantasy');
  const gw = currentGameweek(data);

  const players = useMemo(
    () => (data?.computed.playerSeason || []).slice().sort((a, b) => b.points - a.points || b.goals - a.goals),
    [data],
  );

  if (!data) return null;

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Title>League</Title>
      <View style={styles.switch}>
        <SwitchBtn label="Fantasy" active={tab === 'fantasy'} onPress={() => setTab('fantasy')} />
        <SwitchBtn label="On the pitch" active={tab === 'players'} onPress={() => setTab('players')} />
      </View>

      {tab === 'fantasy' ? (
        <View style={{ gap: 8 }}>
          <Text style={styles.hint}>
            Managers · {gw?.name || 'Season'} points sit beside the overall total
          </Text>
          {data.computed.fantasyStandings.map((row, index) => {
            const mine = row.managerId === me?.id;
            return (
              <Pressable
                key={row.managerId}
                onPress={() => router.push(`/player/${row.managerId}`)}
                style={[styles.row, mine && styles.mine]}>
                <Text style={styles.rank}>{index + 1}</Text>
                <Avatar name={row.name} position={row.position} size={42} playerId={row.managerId} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>
                    {row.name}
                    {mine ? '  ·  you' : ''}
                  </Text>
                  <Text style={styles.meta}>
                    GW {row.gameweekPoints} · {row.picked ? 'squad in' : 'no pick'}
                  </Text>
                </View>
                <Text style={styles.pts}>{row.totalPoints}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          <Text style={styles.hint}>Real match points — goals, assists, DCs, cards, bonuses</Text>
          {players.map((row, index) => (
            <Pressable key={row.playerId} onPress={() => router.push(`/player/${row.playerId}`)} style={styles.row}>
              <Text style={styles.rank}>{index + 1}</Text>
              <Avatar name={row.name} position={row.position} size={42} playerId={row.playerId} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{row.name}</Text>
                <Text style={styles.meta}>
                  {row.goals} G · {row.assists} A · {row.defCons} DC
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.pts}>{row.points}</Text>
                <Pill label={row.position} tone={row.position} />
              </View>
            </Pressable>
          ))}
        </View>
      )}

      <Card style={{ marginTop: space.lg }}>
        <Text style={styles.award}>Still open</Text>
        <Text style={styles.awardBody}>1st, 2nd, weekly top score, last place and worst week — prizes TBD.</Text>
      </Card>
    </Screen>
  );
}

function SwitchBtn({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.sw, active && styles.swOn]}>
      <Text style={[styles.swText, active && { color: '#111' }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  switch: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 4,
    marginVertical: 14,
  },
  sw: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  swOn: { backgroundColor: colors.lime },
  swText: { color: colors.muted, fontFamily: 'DMSans_700Bold' },
  hint: { color: colors.muted, fontFamily: 'DMSans_400Regular', marginBottom: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.line,
  },
  mine: { borderColor: colors.lime },
  rank: { width: 22, color: colors.muted, fontFamily: 'BebasNeue_400Regular', fontSize: 18, textAlign: 'center' },
  name: { color: colors.text, fontFamily: 'DMSans_700Bold' },
  meta: { color: colors.muted, fontFamily: 'DMSans_400Regular', fontSize: 12, marginTop: 2 },
  pts: { color: colors.lime, fontFamily: 'BebasNeue_400Regular', fontSize: 28, lineHeight: 30 },
  award: { color: colors.text, fontFamily: 'DMSans_700Bold', marginBottom: 4 },
  awardBody: { color: colors.muted, fontFamily: 'DMSans_400Regular' },
});
