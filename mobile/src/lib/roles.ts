// Who is using the app on this device. Pure rules (no React/Expo) so they can be tested.

export type Role = 'driver' | 'passenger';

export const isRole = (value: unknown): value is Role =>
  value === 'driver' || value === 'passenger';

/**
 * Where each role lands:
 * - driver: home, or the welcome screen if sign-up is not finished
 * - passenger: home, or the login screen if not logged in
 * - no role yet: the "Qui êtes-vous ?" choice
 */
export function homeFor(
  role: Role | null,
  { driverOnboarded, passengerSignedIn }: { driverOnboarded: boolean; passengerSignedIn: boolean },
) {
  if (role === 'driver') return driverOnboarded ? '/' : '/welcome';
  if (role === 'passenger') return passengerSignedIn ? '/passenger' : '/passenger/login';
  return '/choose-role';
}
