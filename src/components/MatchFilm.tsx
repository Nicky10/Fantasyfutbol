import * as WebBrowser from 'expo-web-browser';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { youtubeId } from '@/src/lib/youtube';
import { colors, radius } from '@/src/theme';

export function MatchFilm({
  title,
  youtubeUrl,
}: {
  title: string;
  youtubeUrl?: string | null;
}) {
  const id = youtubeId(youtubeUrl);
  const watchUrl = id ? `https://www.youtube.com/watch?v=${id}` : '';

  const openFilm = () => {
    if (!watchUrl) return;
    WebBrowser.openBrowserAsync(watchUrl, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
      controlsColor: '#D8F830',
      toolbarColor: '#07090D',
    });
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.kicker}>{title}</Text>
      {id ? (
        <Pressable onPress={openFilm} style={styles.play}>
          <View style={styles.playBtn}>
            <Text style={styles.playIcon}>▶</Text>
          </View>
          <Text style={styles.playLabel}>Watch match film</Text>
          <Text style={styles.playHint}>Opens in the app</Text>
        </Pressable>
      ) : (
        <View style={styles.soon}>
          <Text style={styles.soonLabel}>Coming soon</Text>
          <Text style={styles.soonBody}>The match film appears here once the YouTube link is added to Gameweeks.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.line,
  },
  kicker: {
    color: colors.lime,
    fontFamily: 'BebasNeue_400Regular',
    letterSpacing: 1.4,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  play: {
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  playBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: { color: '#111', fontSize: 22, marginLeft: 3 },
  playLabel: { color: colors.text, fontFamily: 'DMSans_700Bold', fontSize: 16 },
  playHint: { color: colors.muted, fontFamily: 'DMSans_400Regular', fontSize: 12 },
  soon: {
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  soonLabel: {
    color: colors.text,
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 32,
    letterSpacing: 1,
  },
  soonBody: {
    color: colors.muted,
    fontFamily: 'DMSans_400Regular',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
});
