import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { colors } from '@/src/theme';

export default function TabLayout() {
  return (
    <NativeTabs
      tintColor={colors.lime}
      iconColor={{ default: colors.faint, selected: colors.lime }}
      labelStyle={{
        default: { color: colors.faint, fontSize: 11, fontWeight: '700' },
        selected: { color: colors.lime, fontSize: 11, fontWeight: '700' },
      }}
      blurEffect="systemUltraThinMaterialDark"
      minimizeBehavior="onScrollDown"
      shadowColor="transparent"
      backgroundColor="rgba(7,9,13,0.28)">
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'bolt', selected: 'bolt.fill' }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="pick">
        <NativeTabs.Trigger.Label>Pick</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'tshirt', selected: 'tshirt.fill' }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="standings">
        <NativeTabs.Trigger.Label>League</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'trophy', selected: 'trophy.fill' }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="stats">
        <NativeTabs.Trigger.Label>Stats</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'chart.bar', selected: 'chart.bar.fill' }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="more">
        <NativeTabs.Trigger.Label>More</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'ellipsis.circle', selected: 'ellipsis.circle.fill' }} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
