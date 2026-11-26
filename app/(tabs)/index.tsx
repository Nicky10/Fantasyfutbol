import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { MatchFilm } from '@/src/components/MatchFilm';
import { Pitch } from '@/src/components/Pitch';
import { Avatar, Card, LoadingBlock, Pill, Screen, Subtitle, Title } from '@/src/components/ui';
import { chipsRemaining, currentGameweek, pickFor, useLeague } from '@/src/context/LeagueContext';
import { pickLockAt, picksOpen } from '@/src/api/scoring';
import { countdown, deadlineLabel, money, ordinal } from '@/src/lib/format';
import { colors, space } from '@/src/theme';

export default function HomeScreen() {
  const { data, me, refreshing, refresh } = useLeague();
  const gw = currentGameweek(data);
  const pick = pickFor(data, me?.id || null, gw?.id);
  const chips = chipsRemaining(data, me?.id || null);

  const myRow = data?.computed.fantasyStandings.find((row) => row.managerId === me?.id);
  const rank = (data?.computed.fantasyStandings.findIndex((row) => row.managerId === me?.id) ?? -1) + 1;
  const lastFinished = data?.gameweeks.filter((g) => g.status === 'finished').sort((a, b) => b.number - a.number)[0];

  const squad = useMemo(() => {
    const ids = pick?.playerIds || [];
    const players = ids.map((id) => data?.players.find((p) => p.id === id) || null);
    while (players.length < (pick?.chip === 'bench_boost' ? 5 : 4)) players.push(null);
    return players;
  }, [data, pick]);

  if (!data || !me) return <Screen><LoadingBlock /></Screen>;

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Animated.View entering={FadeInDown.springify()} style={styles.top}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
          <Avatar name={me.name} position={me.position} playerId={me.id} size={48} />
          <View>
            <Text style={styles.kicker}>{data.config.leagueName}</Text>
            <Title>Hey, {me.name}</Title>
          </View>
        </View>
        <Pill label={data.demo ? 'DEMO' : 'LIVE'} tone="lime" />
      </Animated.View>

      <View style={styles.scoreRow}>
        <Card style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>Overall</Text>
          <Text style={styles.scoreValue}>{myRow?.totalPoints ?? 0}</Text>
          <Text style={styles.scoreHint}>{rank ? ordinal(rank) : '—'} in the league</Text>
        </Card>
        <Card style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>{gw?.name || 'This GW'}</Text>
          <Text style={styles.scoreValue}>{myRow?.gameweekPoints ?? 0}</Text>
          <Text style={styles.scoreHint}>
            {pick ? (picksOpen(gw) ? 'Squad saved · still editable' : 'Squad locked') : 'No squad yet'}
          </Text>
        </Card>
      </View>

      {gw ? (
        <Card style={{ marginBottom: space.md }}>
          <View style={styles.top}>
            <View style={{ flex: 1 }}>
              <Text style={styles.kicker}>NEXT MATCH</Text>
              <Text style={styles.match}>vs {gw.opponent || 'TBD'}</Text>
              <Subtitle>
                {gw.venue} · kickoff {countdown(pickLockAt(gw))}
                {pickLockAt(gw) ? ` · ${deadlineLabel(pickLockAt(gw))}` : ''}
              </Subtitle>
            </View>
            <Pill label={gw.status.toUpperCase()} tone={gw.status === 'upcoming' ? 'lime' : 'muted'} />
          </View>
        </Card>
      ) : null}

      <View style={styles.top}>
        <Title size={26}>Your squad</Title>
        <Pressable
          onPress={() =>
            router.push(picksOpen(gw) ? '/(tabs)/pick' : `/gameweek/${gw.id}`)
          }>
          <Text style={styles.link}>{picksOpen(gw) ? (pick ? 'Edit' : 'Build team') : 'View points'}</Text>
        </Pressable>
      </View>
      <Pitch
        slots={squad}
        captainId={pick?.captainId}
        onPressSlot={() => router.push(picksOpen(gw) ? '/(tabs)/pick' : `/gameweek/${gw.id}`)}
      />

      <View style={[styles.chipRow, { marginTop: space.md }]}>
        <ChipStatus label="Triple Captain" ready={chips.triple_captain} />
        <ChipStatus label="Bench Boost" ready={chips.bench_boost} />
      </View>

      <View style={{ marginTop: space.md }}>
        <MatchFilm title="Match film" youtubeUrl={gw?.youtubeUrl} />
      </View>

      {lastFinished && lastFinished.id !== gw?.id ? (
        <View style={{ marginTop: space.md, gap: 10 }}>
          <Pressable onPress={() => router.push(`/gameweek/${lastFinished.id}`)}>
            <Card>
              <Text style={styles.kicker}>LAST RESULT</Text>
              <Text style={styles.match}>
                Dark Team {lastFinished.goalsFor ?? '–'} – {lastFinished.goalsAgainst ?? '–'} {lastFinished.opponent}
              </Text>
              <Subtitle>
                {lastFinished.name}
                {myRow ? ` · you scored ${myRow.lastGameweekPoints} pts` : ''}
              </Subtitle>
              <Text style={[styles.link, { marginTop: 8 }]}>Your squad →</Text>
            </Card>
          </Pressable>
          <MatchFilm title="Last match film" youtubeUrl={lastFinished.youtubeUrl} />
        </View>
      ) : null}

      <Card style={{ marginTop: space.md }}>
        <Text style={styles.kicker}>BUDGET RULE</Text>
        <Subtitle>
          {data.config.squadSize} players · {money(data.config.budget)} · cannot pick yourself · captain x2
        </Subtitle>
      </Card>
    </Screen>
  );
}

function ChipStatus({ label, ready }: { label: string; ready: boolean }) {
  return (
    <View style={[styles.chip, { borderColor: ready ? 'rgba(216,248,48,0.35)' : colors.line }]}>
      <Text style={[styles.chipLabel, { color: ready ? colors.lime : colors.muted }]}>{label}</Text>
      <Text style={styles.chipState}>{ready ? 'Available' : 'Used'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  kicker: { color: colors.lime, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1.4, fontSize: 16 },
  scoreRow: { flexDirection: 'row', gap: 10, marginBottom: space.md },
  scoreCard: { flex: 1 },
  scoreLabel: { color: colors.muted, fontFamily: 'DMSans_400Regular', fontSize: 12 },
  scoreValue: { color: colors.text, fontFamily: 'BebasNeue_400Regular', fontSize: 42, lineHeight: 46, marginTop: 4 },
  scoreHint: { color: colors.muted, fontFamily: 'DMSans_400Regular', marginTop: 2 },
  match: { color: colors.text, fontFamily: 'DMSans_700Bold', fontSize: 18, marginTop: 4 },
  link: { color: colors.lime, fontFamily: 'DMSans_700Bold' },
  chipRow: { flexDirection: 'row', gap: 10 },
  chip: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
  },
  chipLabel: { fontFamily: 'DMSans_700Bold', fontSize: 13 },
  chipState: { color: colors.muted, marginTop: 4, fontFamily: 'DMSans_400Regular', fontSize: 12 },
});
