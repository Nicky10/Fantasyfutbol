import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { playerPortrait } from '@/src/lib/portraits';
import { colors, positionColor, radius, space } from '@/src/theme';

export function Screen({
  children,
  refreshing,
  onRefresh,
  padded = true,
}: {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  padded?: boolean;
}) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.scroll, padded && { paddingHorizontal: space.md, paddingBottom: 108 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={colors.lime} />
          ) : undefined
        }>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Title({ children, size = 34 }: { children: ReactNode; size?: number }) {
  return <Text style={[styles.title, { fontSize: size }]}>{children}</Text>;
}

export function Subtitle({ children }: { children: ReactNode }) {
  return <Text style={styles.subtitle}>{children}</Text>;
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Pill({
  label,
  tone = 'muted',
}: {
  label: string;
  tone?: 'muted' | 'lime' | 'danger' | 'pos' | Positionish;
}) {
  const bg =
    tone === 'lime'
      ? colors.limeSoft
      : tone === 'danger'
        ? 'rgba(255,77,109,0.16)'
        : isPosition(tone)
          ? positionColor(tone) + '33'
          : 'rgba(255,255,255,0.06)';
  const fg =
    tone === 'lime'
      ? colors.lime
      : tone === 'danger'
        ? colors.danger
        : isPosition(tone)
          ? positionColor(tone)
          : colors.muted;
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.pillText, { color: fg }]}>{label}</Text>
    </View>
  );
}

type Positionish = 'GK' | 'DEF' | 'MID' | 'ATK' | 'SUB';
const isPosition = (value: string): value is Positionish =>
  ['GK', 'DEF', 'MID', 'ATK', 'SUB'].includes(value);

export function Avatar({
  name,
  position,
  size = 52,
  captain,
  playerId,
}: {
  name: string;
  position: string;
  size?: number;
  captain?: boolean;
  playerId?: string;
}) {
  const photo = playerPortrait(playerId) || playerPortrait(name);
  return (
    <View style={{ width: size, height: size }}>
      <View
        style={[
          styles.avatar,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: positionColor(position),
          },
        ]}>
        {photo ? (
          <Image
            source={photo}
            style={{ width: size, height: size, borderRadius: size / 2 }}
            contentFit="cover"
            cachePolicy="disk"
            recyclingKey={playerId || name}
            allowDownscaling
            transition={0}
          />
        ) : (
          <Text style={[styles.avatarText, { fontSize: size * 0.36 }]}>
            {name.slice(0, 2).toUpperCase()}
          </Text>
        )}
      </View>
      {captain ? (
        <View style={styles.captainBadge}>
          <Text style={styles.captainText}>C</Text>
        </View>
      ) : null}
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Pressable onPress={onPress} disabled={disabled || loading} style={{ opacity: disabled ? 0.45 : 1 }}>
      <LinearGradient colors={[colors.lime, '#B6E012']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cta}>
        {loading ? <ActivityIndicator color="#111" /> : <Text style={styles.ctaText}>{label}</Text>}
      </LinearGradient>
    </Pressable>
  );
}

export function GhostButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.ghost}>
      <Text style={styles.ghostText}>{label}</Text>
    </Pressable>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <Card>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.subtitle}>{body}</Text>
    </Card>
  );
}

export function LoadingBlock() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.lime} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingTop: 8 },
  title: {
    color: colors.text,
    fontFamily: 'BebasNeue_400Regular',
    letterSpacing: 0.6,
    lineHeight: 36,
  },
  subtitle: { color: colors.muted, fontFamily: 'DMSans_400Regular', fontSize: 14, lineHeight: 20 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: space.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full },
  pillText: { fontFamily: 'DMSans_700Bold', fontSize: 11, letterSpacing: 0.4 },
  avatar: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarText: { color: '#111', fontFamily: 'BebasNeue_400Regular' },
  captainBadge: {
    position: 'absolute',
    right: -4,
    top: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captainText: { color: '#111', fontFamily: 'DMSans_700Bold', fontSize: 10 },
  cta: { borderRadius: radius.md, paddingVertical: 16, alignItems: 'center' },
  ctaText: { color: '#111318', fontFamily: 'DMSans_700Bold', fontSize: 16 },
  ghost: {
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  ghostText: { color: colors.text, fontFamily: 'DMSans_700Bold' },
  emptyTitle: { color: colors.text, fontFamily: 'DMSans_700Bold', fontSize: 16, marginBottom: 6 },
  loading: { paddingVertical: 40, alignItems: 'center' },
});
