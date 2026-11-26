import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card, Screen, Subtitle, Title } from '@/src/components/ui';
import { useLeague } from '@/src/context/LeagueContext';
import { colors, space } from '@/src/theme';

export default function RulesScreen() {
  const { data } = useLeague();

  return (
    <Screen>
      <Title>Rules</Title>
      <Subtitle>Dark Team house rules, same as the league sheet.</Subtitle>

      <Card style={{ marginTop: space.md, gap: 8 }}>
        <Text style={styles.h}>Squad</Text>
        <Bullet>Budget ${data?.config.budget ?? 3}.0 for 4 players.</Bullet>
        <Bullet>You cannot pick yourself.</Bullet>
        <Bullet>One captain. Captain points are doubled.</Bullet>
        <Bullet>You cannot captain the same player two weeks in a row.</Bullet>
        <Bullet>Unlimited transfers until kickoff. That time lives in the deadline column.</Bullet>
        <Bullet>Recommended: change at least half the squad each week.</Bullet>
      </Card>

      <Card style={{ marginTop: space.md, gap: 8 }}>
        <Text style={styles.h}>Chips · once each</Text>
        <Bullet>Triple Captain: captain scores x3 instead of x2.</Bullet>
        <Bullet>Bench Boost: budget becomes $4.0 and you pick 5 players.</Bullet>
      </Card>

      <Card style={{ marginTop: space.md }}>
        <Text style={styles.h}>Position scoring</Text>
        <View style={styles.table}>
          <Row cells={['Pos', 'G', 'A', 'DC / pt', 'CS', 'In-field', 'Conc.']} head />
          {(data?.scoring || []).map((row) => (
            <Row
              key={row.position}
              cells={[
                row.position,
                String(row.goalPts),
                String(row.assistPts),
                String(row.dcPerPoint),
                String(row.cleanSheetPts),
                String(row.inFieldGoalBonus),
                String(row.concedePerMinus),
              ]}
            />
          ))}
        </View>
        <Subtitle>
          DC points are floor(def cons ÷ DC per point). In-field is a bonus on top of regular goal points. Goals
          conceded: −1 every N team goals.
        </Subtitle>
      </Card>

      <Card style={{ marginTop: space.md, gap: 8 }}>
        <Text style={styles.h}>Other scoring</Text>
        {(data?.bonuses || []).map((b) => (
          <Bullet key={b.event}>
            {b.notes}: {b.points > 0 ? `+${b.points}` : b.points}
          </Bullet>
        ))}
      </Card>
    </Screen>
  );
}

function Bullet({ children }: { children: ReactNode }) {
  return <Text style={styles.bullet}>•  {children}</Text>;
}

function Row({ cells, head }: { cells: string[]; head?: boolean }) {
  return (
    <View style={styles.tr}>
      {cells.map((cell, index) => (
        <Text key={`${head ? 'h' : 'c'}-${index}-${cell}`} style={[styles.td, head && styles.th]}>
          {cell}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  h: { color: colors.text, fontFamily: 'DMSans_700Bold', fontSize: 16 },
  bullet: { color: colors.muted, fontFamily: 'DMSans_400Regular', lineHeight: 22 },
  table: { marginVertical: 10, gap: 6 },
  tr: { flexDirection: 'row' },
  td: { flex: 1, color: colors.text, fontFamily: 'DMSans_400Regular', fontSize: 11 },
  th: { color: colors.lime, fontFamily: 'DMSans_700Bold' },
});
