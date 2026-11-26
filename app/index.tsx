import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar, LoadingBlock, Pill, Screen, Subtitle, Title } from '@/src/components/ui';
import { useLeague } from '@/src/context/LeagueContext';
import { colors, space } from '@/src/theme';

export default function LoginScreen() {
  const { ready, data, managerId, picking, setManager } = useLeague();

  useEffect(() => {
    if (ready && managerId && !picking) router.replace('/(tabs)');
  }, [ready, managerId, picking]);

  const managers = useMemo(
    () => (data?.players || []).filter((p) => !p.isSub && p.active),
    [data],
  );

  const onPick = (id: string) => {
    setManager(id);
    router.replace('/(tabs)');
  };

  return (
    <Screen>
      <View style={styles.heroWrap}>
        <Image
          source={require('../assets/images/team-logo.png')}
          style={styles.hero}
          contentFit="cover"
          cachePolicy="disk"
        />
        <LinearGradient colors={['rgba(7,9,13,0.15)', '#07090D']} style={StyleSheet.absoluteFill} />
        <View style={styles.heroCopy}>
          <Pill label={data?.demo ? 'DEMO MODE' : 'SEASON 2026'} tone="lime" />
          <Title size={48}>DARK TEAM</Title>
          <Text style={styles.tag}>Fantasy League</Text>
        </View>
      </View>

      <Title size={28}>Who are you?</Title>
      <Subtitle>Pick yourself. You cannot select your own name in the weekly squad.</Subtitle>

      {!ready || !data ? (
        <LoadingBlock />
      ) : (
        <View style={{ gap: 12, marginTop: 14 }}>
          {managers.map((player) => (
            <Pressable key={player.id} onPress={() => onPick(player.id)} style={styles.player}>
              <Avatar name={player.name} position={player.position} playerId={player.id} />
              <View style={{ flex: 1 }}>
                <Text style={styles.playerName}>{player.name}</Text>
                <Text style={styles.playerMeta}>
                  {player.position} · #{player.shirt}
                </Text>
              </View>
              <Pill label={player.position} tone={player.position} />
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroWrap: { height: 280, borderRadius: 28, overflow: 'hidden', marginBottom: space.lg },
  hero: { width: '100%', height: '100%' },
  heroCopy: { position: 'absolute', left: 18, right: 18, bottom: 16, gap: 4 },
  tag: {
    color: colors.lime,
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 22,
    letterSpacing: 2,
  },
  player: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  playerName: { color: colors.text, fontFamily: 'DMSans_700Bold', fontSize: 16 },
  playerMeta: { color: colors.muted, fontFamily: 'DMSans_400Regular', fontSize: 13, marginTop: 2 },
});
