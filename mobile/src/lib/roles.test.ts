import { describe, expect, it } from 'vitest';
import { homeFor, isRole } from './roles';

const both = (driverOnboarded: boolean, passengerSignedIn: boolean) => ({
  driverOnboarded,
  passengerSignedIn,
});

describe('roles', () => {
  it('sends each role to its own home', () => {
    expect(homeFor(null, both(true, true))).toBe('/choose-role');
    expect(homeFor('driver', both(true, false))).toBe('/');
    expect(homeFor('driver', both(false, true))).toBe('/welcome');
    expect(homeFor('passenger', both(false, true))).toBe('/passenger');
    expect(homeFor('passenger', both(true, false))).toBe('/passenger/login');
  });

  it('accepts only known roles from storage', () => {
    expect(isRole('driver')).toBe(true);
    expect(isRole('passenger')).toBe(true);
    expect(isRole('admin')).toBe(false);
    expect(isRole(null)).toBe(false);
  });
});
