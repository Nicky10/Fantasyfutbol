import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar, Pill, Screen, Title } from '@/src/components/ui';
import { useLeague } from '@/src/context/LeagueContext';
import { colors } from '@/src/theme';

type SortKey = 'points' | 'goals' | 'assists' | 'defCons' | 'form';

export default function StatsScreen() {
  const { data, refreshing, refresh } = useLeague();
  const [sort, setSort] = useState<SortKey>('points');
  const [pos, setPos] = useState<string>('ALL');

  const rows = useMemo(() => {
    const list = (data?.computed.playerSeason || []).filter((p) => (pos === 'ALL' ? true : p.position === pos));
    return list.sort((a, b) => Number(b[sort]) - Number(a[sort]));
  }, [data, sort, pos]);

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Title>Player stats</Title>
      <View style={styles.filters}>
        {['ALL', 'GK', 'DEF', 'MID', 'ATK'].map((value) => (
          <Pressable key={value} onPress={() => setPos(value)} style={[styles.filter, pos === value && styles.filterOn]}>
            <Text style={[styles.filterText, pos === value && { color: '#111' }]}>{value}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.filters}>
        {(['points', 'goals', 'assists', 'defCons', 'form'] as SortKey[]).map((value) => (
          <Pressable key={value} onPress={() => setSort(value)} style={[styles.filter, sort === value && styles.filterOn]}>
            <Text style={[styles.filterText, sort === value && { color: '#111' }]}>
              {value === 'defCons' ? 'DC' : value}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={{ gap: 8, marginTop: 8 }}>
        {rows.map((row) => (
          <Pressable key={row.playerId} onPress={() => router.push(`/player/${row.playerId}`)} style={styles.row}>
            <Avatar name={row.name} position={row.position} size={46} playerId={row.playerId} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{row.name}</Text>
              <View style={styles.statLine}>
                <Mini label="G" value={row.goals} />
                <Mini label="A" value={row.assists} />
                <Mini label="DC" value={row.defCons} />
                <Mini label="CS" value={row.cleanSheets} />
              </View>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <Text style={styles.pts}>{row.points}</Text>
              <Pill label={row.position} tone={row.position} />
            </View>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <Text style={styles.mini}>
      {label} {value}
    </Text>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  filter: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
  },
  filterOn: { backgroundColor: colors.lime, borderColor: colors.lime },
  filterText: { color: colors.muted, fontFamily: 'DMSans_700Bold', fontSize: 12, textTransform: 'uppercase' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  name: { color: colors.text, fontFamily: 'DMSans_700Bold', fontSize: 16 },
  statLine: { flexDirection: 'row', gap: 10, marginTop: 4 },
  mini: { color: colors.muted, fontFamily: 'DMSans_400Regular', fontSize: 12 },
  pts: { color: colors.lime, fontFamily: 'BebasNeue_400Regular', fontSize: 30, lineHeight: 30 },
});
