import * as Crypto from 'expo-crypto';

/** Short uppercase reference shown to users, e.g. "3F9A1C02". */
export const uid = () => Crypto.randomUUID().slice(0, 8).toUpperCase();
