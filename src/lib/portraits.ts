import type { ImageSource } from 'expo-image';

const portraits: Record<string, ImageSource> = {
  richi: require('../../assets/images/richi.png'),
  nick: require('../../assets/images/nick.png'),
  shane: require('../../assets/images/shane.png'),
  mario: require('../../assets/images/mario.png'),
  juan: require('../../assets/images/juan.png'),
  nico: require('../../assets/images/nico.png'),
  hiro: require('../../assets/images/hiro.png'),
  bryan: require('../../assets/images/brian.png'),
  brian: require('../../assets/images/brian.png'),
  erwin: require('../../assets/images/erwin.png'),
  julian: require('../../assets/images/julian.png'),
  patrick: require('../../assets/images/patrick.png'),
  ume: require('../../assets/images/ume.png'),
  vidur: require('../../assets/images/vidur.png'),
};

export function playerPortrait(idOrName?: string | null) {
  if (!idOrName) return undefined;
  return portraits[idOrName.trim().toLowerCase()];
}
