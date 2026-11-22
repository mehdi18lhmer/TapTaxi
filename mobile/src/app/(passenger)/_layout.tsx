import { NativeTabs } from 'expo-router/native-tabs';
import { colors, fonts } from '@/theme';

/**
 * Passenger bottom navigation bar, same style as the driver's (app/(tabs)/_layout.tsx).
 * Only reachable by a logged-in passenger.
 */
export default function PassengerTabs() {
  return (
    <NativeTabs
      tintColor={colors.red}
      backgroundColor={colors.background}
      labelStyle={{ fontFamily: fonts.medium, fontSize: 11 }}
    >
      <NativeTabs.Trigger name="passenger">
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
        <NativeTabs.Trigger.Label>Accueil</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="scan">
        <NativeTabs.Trigger.Icon sf="qrcode.viewfinder" md="qr_code_scanner" />
        <NativeTabs.Trigger.Label>Scanner</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="receipts">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'clock.arrow.circlepath', selected: 'clock.arrow.circlepath' }}
          md="history"
        />
        <NativeTabs.Trigger.Label>Courses</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="assistance">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'questionmark.bubble', selected: 'questionmark.bubble.fill' }}
          md="support_agent"
        />
        <NativeTabs.Trigger.Label>Support</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="account">
        <NativeTabs.Trigger.Icon sf={{ default: 'person', selected: 'person.fill' }} md="person" />
        <NativeTabs.Trigger.Label>Profil</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
