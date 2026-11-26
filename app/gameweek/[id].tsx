import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { chipMultiplier } from '@/src/api/scoring';
import { Avatar, Card, Pill, Screen, Subtitle, Title } from '@/src/components/ui';
import { pickFor, useLeague } from '@/src/context/LeagueContext';
import { chipLabel, signed } from '@/src/lib/format';
import { colors, space } from '@/src/theme';

export default function GameweekScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, me } = useLeague();
  const gw = data?.gameweeks.find((g) => g.id === id);
  const pick = pickFor(data, me?.id || null, id);

  const rows = useMemo(() => {
    if (!data || !pick) return [];
    return pick.playerIds.map((playerId) => {
      const player = data.players.find((p) => p.id === playerId);
      const score = data.computed.playerGameweekPoints.find(
        (row) => row.gameweekId === id && row.playerId === playerId,
      );
      const raw = score?.points ?? 0;
      const multi = chipMultiplier(pick.chip, playerId === pick.captainId);
      return {
        player,
        playerId,
        raw,
        multi,
        total: raw * multi,
        breakdown: score?.breakdown || [],
        captain: playerId === pick.captainId,
      };
    });
  }, [data, id, pick]);

  const total = rows.reduce((sum, row) => sum + row.total, 0);

  if (!data || !gw) {
    return (
      <Screen>
        <Title>Missing gameweek</Title>
      </Screen>
    );
  }

  const scoreline =
    gw.goalsFor != null && gw.goalsAgainst != null
      ? `${gw.goalsFor} – ${gw.goalsAgainst}`
      : 'Score TBD';

  return (
    <Screen>
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <Title size={36}>{gw.name}</Title>
          <Subtitle>
            vs {gw.opponent || 'TBD'} · {gw.venue || 'Home'} · {scoreline}
          </Subtitle>
        </View>
        <Pill label={gw.status.toUpperCase()} tone={gw.status === 'finished' ? 'lime' : 'muted'} />
      </View>

      <Card style={styles.totalCard}>
        <Text style={styles.kicker}>{me ? `${me.name.toUpperCase()}'S SQUAD` : 'YOUR SQUAD'}</Text>
        <Text style={styles.total}>{signed(total)}</Text>
        <Subtitle>
          {pick
            ? `${pick.playerIds.length} players · ${chipLabel(pick.chip)}`
            : 'You did not save a squad for this gameweek.'}
        </Subtitle>
      </Card>

      <Title size={26}>Picked players</Title>
      <View style={{ gap: 10, marginTop: 10 }}>
        {!pick ? (
          <Card>
            <Subtitle>No squad on the sheet for this date.</Subtitle>
          </Card>
        ) : (
          rows.map((row) => {
            const player = row.player;
            if (!player) return null;
            return (
              <Pressable key={row.playerId} onPress={() => router.push(`/player/${player.id}`)}>
                <Card>
                  <View style={styles.playerHead}>
                    <Avatar
                      name={player.name}
                      position={player.position}
                      playerId={player.id}
                      size={48}
                      captain={row.captain}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.playerName}>{player.name}</Text>
                      <Subtitle>
                        {player.position}
                        {row.captain ? ` · Captain ×${row.multi}` : ''}
                      </Subtitle>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.playerPts}>{signed(row.total)}</Text>
                      {row.multi > 1 ? (
                        <Text style={styles.rawPts}>{signed(row.raw)} ×{row.multi}</Text>
                      ) : null}
                    </View>
                  </View>
                  {row.breakdown.length ? (
                    <View style={{ marginTop: 10, gap: 4 }}>
                      {row.breakdown.map((item, index) => (
                        <Text key={`${row.playerId}-${item.label}-${index}`} style={styles.break}>
                          {item.label}  {signed(item.value)}
                        </Text>
                      ))}
                    </View>
                  ) : (
                    <Text style={[styles.break, { marginTop: 8 }]}>No points this match</Text>
                  )}
                </Card>
              </Pressable>
            );
          })
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: space.md },
  totalCard: { marginBottom: space.lg },
  kicker: { color: colors.lime, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1.4, fontSize: 16 },
  total: { color: colors.text, fontFamily: 'BebasNeue_400Regular', fontSize: 48, lineHeight: 50, marginTop: 4 },
  playerHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  playerName: { color: colors.text, fontFamily: 'DMSans_700Bold', fontSize: 16 },
  playerPts: { color: colors.lime, fontFamily: 'BebasNeue_400Regular', fontSize: 28, lineHeight: 30 },
  rawPts: { color: colors.muted, fontFamily: 'DMSans_400Regular', fontSize: 12, marginTop: 2 },
  break: { color: colors.muted, fontFamily: 'DMSans_400Regular', fontSize: 13 },
});
