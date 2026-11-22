import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import type { Href } from 'expo-router';
import { StoreProvider, useStore } from '@/lib/store';
import { RoleProvider, useRole } from '@/lib/role-store';
import { PassengerProvider, usePassenger } from '@/lib/passenger-store';
import { SupportProvider } from '@/lib/support-store';
import { RidesProvider } from '@/lib/rides-store';
import { homeFor } from '@/lib/roles';
import { colors, fonts } from '@/theme';

void SplashScreen.preventAutoHideAsync().catch(() => {});

// Header titles, grouped by who may open the screen. Add a route file and its title together.

/** Driver-only screens. The driver tab bar `(tabs)` is registered separately. */
const driverScreens: Record<string, string> = {
  // Collect a payment
  amount: 'Encaisser un paiement',
  'qr/[id]': 'Paiement',
  'received/[id]': 'Paiement reçu',
  'transaction/[id]': 'Détail du paiement',
  // Wallet
  withdraw: 'Retirer · سحب',
  'withdrawal/[id]': 'Votre retrait',
  history: 'Historique',
  owner: 'Versement propriétaire',
  // Rides, earnings, coverage
  'job/[id]': 'Course',
  demand: 'Demande prévue',
  earnings: 'Mes gains',
  coverage: 'Couverture sociale',
  statements: 'Relevés',
  // Account
  services: 'Services & offres',
  fuel: 'Avance carburant',
  notifications: 'Notifications',
  settings: 'Préférences',
  // Sign-up
  welcome: 'Bienvenue',
  'sign-in': 'Se connecter',
  sms: 'Étape 1 sur 3',
  documents: 'Mes documents',
  'payout-setup': 'Étape 3 sur 3',
  verification: 'Votre inscription',
};

/**
 * Passenger screens once logged in, opened on top of the passenger tab bar `(passenger)`
 * (Accueil, Scanner, Reçus, Profil).
 */
const passengerScreens: Record<string, string> = {
  'passenger/cards': 'Mes cartes',
  'passenger/edit-profile': 'Modifier mon profil',
  'passenger/add-card': 'Ajouter une carte',
  'passenger/request': 'Demander un taxi',
  'passenger/ride/[id]': 'Ma course',
  'passenger/book': 'Réserver',
  'passenger/booking/[id]': 'Réservation',
  'passenger/wallet': 'Solde TapTaxi',
  'passenger/topup': 'Recharger',
  'passenger/gift': 'Offrir une course',
  'passenger/notifications': 'Notifications',
  'passenger/trip/[id]': 'Détail de la course',
  'passenger/support-chat': 'Assistant support',
};

/** Passenger login. `passenger/login` has no header (it is the first screen). */
const passengerLoginScreens: Record<string, string> = {
  'passenger/code': 'Vérification',
};

/**
 * Screens anyone may open. A passenger's phone camera can open a payment link
 * (`pay/[id]`) at any time, even before choosing a role.
 */
const sharedScreens: Record<string, string> = {
  'pay/[id]': 'Paiement passager',
  'receipt/[id]': 'Votre reçu',
  'my-payments': 'Mes paiements',
  'expired/[id]': 'Code expiré',
  help: 'Aide et assistance',
  'requests/new': 'Contacter le support',
  'requests/[id]': 'Ma demande',
  why: 'Pourquoi TapTaxi',
  fees: 'Nos frais',
};

const screen = (name: string, title: string) => (
  <Stack.Screen
    key={name}
    name={name}
    options={{
      title,
      ...(name === 'settings'
        ? { presentation: 'formSheet', sheetGrabberVisible: true, sheetAllowedDetents: [0.65, 1] }
        : {}),
    }}
  />
);

export default function Root() {
  const [loaded, error] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });
  useEffect(() => {
    if (loaded || error) void SplashScreen.hideAsync();
  }, [loaded, error]);
  if (!loaded && !error) return null;
  return (
    <StoreProvider>
      <RoleProvider>
        <PassengerProvider>
          <SupportProvider>
            <RidesProvider>
              <StatusBar style="dark" />
              <RootStack />
            </RidesProvider>
          </SupportProvider>
        </PassengerProvider>
      </RoleProvider>
    </StoreProvider>
  );
}

/**
 * Each group is only reachable by its role. When the role changes (chosen, switched or
 * logged out), the screen that became off-limits redirects to that role's home.
 */
function RootStack() {
  const { role } = useRole();
  const { state } = useStore();
  const { passenger } = usePassenger();
  const signedIn = !!passenger.account;
  // Right after choosing "driver", a driver who has not signed up starts at sign-up;
  // anywhere else, an off-limits screen just leads back to the role's main home.
  const firstHome = homeFor(role, {
    driverOnboarded: state.onboarded,
    passengerSignedIn: signedIn,
  }) as Href;
  const home = homeFor(role, { driverOnboarded: true, passengerSignedIn: signedIn }) as Href;
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.ink,
        headerTitleStyle: { fontFamily: fonts.semibold, fontSize: 15 },
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Protected guard={role === 'driver'} redirectTo={home}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        {Object.entries(driverScreens).map(([name, title]) => screen(name, title))}
      </Stack.Protected>
      <Stack.Protected guard={role === 'passenger' && signedIn} redirectTo={home}>
        <Stack.Screen name="(passenger)" options={{ headerShown: false }} />
        {Object.entries(passengerScreens).map(([name, title]) => screen(name, title))}
      </Stack.Protected>
      <Stack.Protected guard={role === 'passenger' && !signedIn} redirectTo={home}>
        <Stack.Screen name="passenger/login" options={{ headerShown: false }} />
        {Object.entries(passengerLoginScreens).map(([name, title]) => screen(name, title))}
      </Stack.Protected>
      <Stack.Protected guard={role === null} redirectTo={firstHome}>
        <Stack.Screen name="choose-role" options={{ headerShown: false }} />
      </Stack.Protected>
      {Object.entries(sharedScreens).map(([name, title]) => screen(name, title))}
    </Stack>
  );
}
