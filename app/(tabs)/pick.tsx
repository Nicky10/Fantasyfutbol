import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Pitch } from '@/src/components/Pitch';
import { Avatar, Card, Pill, PrimaryButton, Screen, Subtitle, Title } from '@/src/components/ui';
import { chipsRemaining, currentGameweek, lastCaptain, pickFor, useLeague } from '@/src/context/LeagueContext';
import { countdown, deadlineLabel, money } from '@/src/lib/format';
import { pickLockAt, picksOpen, squadLimits, validatePicks } from '@/src/api/scoring';
import type { Chip, Player } from '@/src/api/types';
import { colors, space } from '@/src/theme';

export default function PickScreen() {
  const { data, me, savePicks, refreshing, refresh } = useLeague();
  const gw = currentGameweek(data);
  const existing = pickFor(data, me?.id || null, gw?.id);
  const bannedCaptain = lastCaptain(data, me?.id || null, gw?.id);
  const remaining = chipsRemaining(data, me?.id || null);

  const [playerIds, setPlayerIds] = useState<string[]>(existing?.playerIds || []);
  const [captainId, setCaptainId] = useState(existing?.captainId || '');
  const [chip, setChip] = useState<Chip>(existing?.chip || 'none');
  const [pickerIndex, setPickerIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existing) {
      setPlayerIds(existing.playerIds);
      setCaptainId(existing.captainId);
      setChip(existing.chip);
    }
  }, [existing?.submittedAt]);

  const limits = squadLimits(
    chip,
    data?.config.budget ?? 3,
    data?.config.squadSize ?? 4,
    data?.config.benchBoostBudget ?? 4,
    data?.config.benchBoostSize ?? 5,
  );

  const slots = useMemo(() => {
    const list = playerIds.map((id) => data?.players.find((p) => p.id === id) || null);
    while (list.length < limits.size) list.push(null);
    return list.slice(0, limits.size);
  }, [playerIds, data?.players, limits.size]);

  if (!data || !me || !gw) {
    return (
      <Screen>
        <Title>Pick team</Title>
        <Subtitle>No gameweek is open yet.</Subtitle>
      </Screen>
    );
  }

  const cost = slots.reduce((sum, p) => sum + (p?.price || 0), 0);
  const check = validatePicks({
    managerId: me.id,
    gameweekId: gw.id,
    playerIds: playerIds.slice(0, limits.size),
    captainId,
    chip,
    players: data.players,
    gameweeks: data.gameweeks,
    picks: data.picks,
    budget: data.config.budget,
    squadSize: data.config.squadSize,
    benchBoostBudget: data.config.benchBoostBudget,
    benchBoostSize: data.config.benchBoostSize,
  });

  const onSelect = (player: Player) => {
    if (pickerIndex === null) return;
    const next = slots.map((p) => p?.id || '');
    next[pickerIndex] = player.id;
    const trimmed = next.filter(Boolean);
    setPlayerIds(trimmed);
    if (!trimmed.includes(captainId)) setCaptainId(player.id);
    setPickerIndex(null);
    Haptics.selectionAsync();
  };

  const toggleChip = (next: Chip) => {
    const available = next === 'none' || remaining[next] || existing?.chip === next;
    if (!available) {
      Alert.alert('Chip already used', 'Each chip can be played once per season.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setChip((cur) => (cur === next ? 'none' : next));
    if (next === 'none' || (chip === 'bench_boost' && next !== 'bench_boost')) {
      setPlayerIds((ids) => ids.slice(0, data.config.squadSize));
    }
  };

  const onSave = async () => {
    if (!check.ok) {
      Alert.alert('Team not valid', check.errors.join('\n'));
      return;
    }
    setSaving(true);
    try {
      await savePicks({
        gameweekId: gw.id,
        playerIds: playerIds.slice(0, limits.size),
        captainId,
        chip,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Squad saved',
        `${gw.name} is on the sheet. You can keep editing until kickoff${pickLockAt(gw) ? ` (${deadlineLabel(pickLockAt(gw))})` : ''}.`,
      );
    } catch (err) {
      Alert.alert('Could not save', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  const taken = new Set(playerIds);
  const available = data.players.filter((p) => p.active && p.id !== me.id && !taken.has(p.id));

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Title>Pick team</Title>
      <Subtitle>
        {gw.name} vs {gw.opponent || 'TBD'} · {money(limits.budget - cost)} remaining
        {pickLockAt(gw) ? ` · locks ${countdown(pickLockAt(gw))}` : ''}
      </Subtitle>

      <View style={styles.budgetBar}>
        <View style={[styles.budgetFill, { width: `${Math.min(100, (cost / limits.budget) * 100)}%` }]} />
      </View>
      <Text style={styles.budgetText}>
        {money(cost)} / {money(limits.budget)} · {playerIds.length}/{limits.size} selected
      </Text>

      <Pitch
        slots={slots}
        captainId={captainId}
        onPressSlot={picksOpen(gw) ? setPickerIndex : undefined}
      />

      <View style={styles.chipRow}>
        <ChipButton
          label="Triple Captain"
          detail="Captain scores x3"
          active={chip === 'triple_captain'}
          used={!remaining.triple_captain && existing?.chip !== 'triple_captain'}
          onPress={() => toggleChip('triple_captain')}
        />
        <ChipButton
          label="Bench Boost"
          detail={`5 players · ${money(data.config.benchBoostBudget)}`}
          active={chip === 'bench_boost'}
          used={!remaining.bench_boost && existing?.chip !== 'bench_boost'}
          onPress={() => toggleChip('bench_boost')}
        />
      </View>

      <Card style={{ marginTop: space.md }}>
        <Text style={styles.section}>Captain</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {slots.filter(Boolean).map((player) => (
            <Pressable
              key={player!.id}
              onPress={() => {
                setCaptainId(player!.id);
                Haptics.selectionAsync();
              }}
              style={[
                styles.capBtn,
                captainId === player!.id && styles.capBtnOn,
                bannedCaptain === player!.id && styles.capBtnBan,
              ]}>
              <Text style={styles.capText}>
                {player!.name}
                {bannedCaptain === player!.id ? ' · last week' : ''}
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>

      {check.errors.length ? (
        <Card style={{ marginTop: space.md, borderColor: 'rgba(255,77,109,0.35)' }}>
          {check.errors.map((err, index) => (
            <Text key={`${index}-${err}`} style={styles.error}>
              {err}
            </Text>
          ))}
        </Card>
      ) : (
        <Card style={{ marginTop: space.md }}>
          <Subtitle>
            Looks legal. You can update this squad until kickoff
            {pickLockAt(gw) ? ` (${deadlineLabel(pickLockAt(gw))})` : ''}.
          </Subtitle>
        </Card>
      )}

      <View style={{ marginTop: space.md }}>
        <PrimaryButton
          label={picksOpen(gw) ? 'Save squad' : 'Squad locked'}
          onPress={onSave}
          loading={saving}
          disabled={!check.ok || !picksOpen(gw)}
        />
      </View>

      <Modal visible={pickerIndex !== null} animationType="slide" transparent>
        <View style={styles.sheetWrap}>
          <View style={styles.sheet}>
            <View style={styles.sheetHead}>
              <Title size={28}>Add player</Title>
              <Pressable onPress={() => setPickerIndex(null)}>
                <Text style={styles.link}>Close</Text>
              </Pressable>
            </View>
            <Subtitle>You cannot pick yourself. Sub is the guest slot.</Subtitle>
            <ScrollView style={{ marginTop: 12, maxHeight: 420 }} contentContainerStyle={{ gap: 8 }}>
              {available.map((player) => (
                <Pressable key={player.id} onPress={() => onSelect(player)} style={styles.row}>
                  <Avatar name={player.name} position={player.position} size={44} playerId={player.id} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowName}>{player.name}</Text>
                    <Text style={styles.rowMeta}>
                      {player.position} · {money(player.price)}
                    </Text>
                  </View>
                  <Pill label={player.position} tone={player.position} />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function ChipButton({
  label,
  detail,
  active,
  used,
  onPress,
}: {
  label: string;
  detail: string;
  active: boolean;
  used: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipOn, used && { opacity: 0.45 }]}>
      <Text style={[styles.chipLabel, active && { color: '#111' }]}>{label}</Text>
      <Text style={[styles.chipDetail, active && { color: '#333' }]}>{used ? 'Already used' : detail}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  budgetBar: {
    height: 8,
    borderRadius: 8,
    backgroundColor: colors.card,
    overflow: 'hidden',
    marginTop: 12,
    marginBottom: 8,
  },
  budgetFill: { height: '100%', backgroundColor: colors.lime },
  budgetText: { color: colors.muted, fontFamily: 'DMSans_400Regular', marginBottom: 12 },
  chipRow: { flexDirection: 'row', gap: 10, marginTop: space.md },
  chip: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipOn: { backgroundColor: colors.lime, borderColor: colors.lime },
  chipLabel: { color: colors.text, fontFamily: 'DMSans_700Bold' },
  chipDetail: { color: colors.muted, fontFamily: 'DMSans_400Regular', fontSize: 12, marginTop: 4 },
  section: { color: colors.text, fontFamily: 'DMSans_700Bold', marginBottom: 8 },
  capBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.line,
  },
  capBtnOn: { backgroundColor: colors.limeSoft, borderColor: colors.lime },
  capBtnBan: { borderColor: colors.danger },
  capText: { color: colors.text, fontFamily: 'DMSans_700Bold', fontSize: 12 },
  error: { color: colors.danger, fontFamily: 'DMSans_400Regular', marginBottom: 4 },
  sheetWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    maxHeight: '80%',
  },
  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  link: { color: colors.lime, fontFamily: 'DMSans_700Bold' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    padding: 10,
    borderRadius: 16,
  },
  rowName: { color: colors.text, fontFamily: 'DMSans_700Bold' },
  rowMeta: { color: colors.muted, fontFamily: 'DMSans_400Regular', fontSize: 12 },
});
