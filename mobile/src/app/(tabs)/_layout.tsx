import { NativeTabs } from 'expo-router/native-tabs';
import { colors, fonts } from '@/theme';
export default function TabLayout() {
  return (
    <NativeTabs
      tintColor={colors.red}
      backgroundColor={colors.background}
      labelStyle={{ fontFamily: fonts.medium, fontSize: 11 }}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
        <NativeTabs.Trigger.Label>Accueil</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="wallet">
        <NativeTabs.Trigger.Icon sf="wallet.bifold" md="account_balance_wallet" />
        <NativeTabs.Trigger.Label>Portefeuille</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="rides">
        <NativeTabs.Trigger.Icon sf={{ default: 'car', selected: 'car.fill' }} md="local_taxi" />
        <NativeTabs.Trigger.Label>Courses</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="assistant">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'waveform.circle', selected: 'waveform.circle.fill' }}
          md="graphic_eq"
        />
        <NativeTabs.Trigger.Label>Assistant</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Icon sf="person" md="person" />
        <NativeTabs.Trigger.Label>Profil</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
