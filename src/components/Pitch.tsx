import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Player } from '@/src/api/types';
import { money } from '@/src/lib/format';
import { playerPortrait } from '@/src/lib/portraits';
import { colors, positionColor } from '@/src/theme';

export function Pitch({
  slots,
  captainId,
  onPressSlot,
}: {
  slots: (Player | null)[];
  captainId?: string;
  onPressSlot?: (index: number) => void;
}) {
  return (
    <LinearGradient colors={[colors.pitch, colors.pitchDeep]} style={styles.pitch}>
      <View style={styles.circle} />
      <View style={styles.mid} />
      <View style={styles.box} />
      <View style={styles.grid}>
        {slots.map((player, index) => {
          const photo = player ? playerPortrait(player.id) || playerPortrait(player.name) : undefined;
          return (
            <Pressable key={`${player?.id || 'empty'}-${index}`} onPress={() => onPressSlot?.(index)} style={styles.slot}>
              <View
                style={[
                  styles.shirt,
                  { backgroundColor: player ? positionColor(player.position) : 'rgba(255,255,255,0.12)' },
                ]}>
                {photo ? (
                  <Image
                    source={photo}
                    style={styles.photo}
                    contentFit="cover"
                    cachePolicy="disk"
                    recyclingKey={player.id}
                    allowDownscaling
                    transition={0}
                  />
                ) : (
                  <Text style={styles.shirtNo}>{player ? player.shirt : '+'}</Text>
                )}
                {player && captainId === player.id ? (
                  <View style={styles.cBadge}>
                    <Text style={styles.cText}>C</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.name} numberOfLines={1}>
                {player ? player.name : 'Empty'}
              </Text>
              <Text style={styles.meta}>{player ? money(player.price) : 'Tap to pick'}</Text>
            </Pressable>
          );
        })}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  pitch: {
    borderRadius: 22,
    minHeight: 250,
    overflow: 'hidden',
    paddingVertical: 22,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(216,248,48,0.18)',
  },
  circle: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: colors.pitchLine,
    alignSelf: 'center',
    top: '38%',
    left: '50%',
    marginLeft: -45,
  },
  mid: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    height: 2,
    backgroundColor: colors.pitchLine,
  },
  box: {
    position: 'absolute',
    left: '22%',
    right: '22%',
    bottom: 12,
    height: 52,
    borderWidth: 2,
    borderColor: colors.pitchLine,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 14,
  },
  slot: { width: '28%', alignItems: 'center' },
  shirt: {
    width: 62,
    height: 62,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photo: { width: '100%', height: '100%' },
  shirtNo: { color: '#111', fontFamily: 'BebasNeue_400Regular', fontSize: 22 },
  name: { color: colors.white, fontFamily: 'DMSans_700Bold', fontSize: 12, marginTop: 6 },
  meta: { color: 'rgba(255,255,255,0.7)', fontFamily: 'DMSans_400Regular', fontSize: 11 },
  cBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.lime,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cText: { color: '#111', fontFamily: 'DMSans_700Bold', fontSize: 10 },
});
