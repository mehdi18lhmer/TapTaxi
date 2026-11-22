// Reading a scanned QR code. A payment QR holds a link to `pay/<ID>`:
//   taptaxi://pay/AB12CD34                     (development or store build)
//   exp://192.168.1.10:8081/--/pay/AB12CD34    (Expo Go during development)
// Anything else is refused, so a scanned code can never open an arbitrary URL or screen.

const PAYMENT_LINK =
  /^(?:taptaxi:\/\/|exps?:\/\/[A-Za-z0-9.-]+(?::\d{1,5})?\/--\/)pay\/([A-Z0-9]{4,12})$/;

/** Returns the payment ID inside a TapTaxi payment QR, or null for any other code. */
export function paymentIdFromQr(data: string): string | null {
  const match = PAYMENT_LINK.exec(data.trim());
  return match ? match[1] : null;
}

/** A code typed by hand, e.g. "#ab12cd34" → "AB12CD34". */
export function paymentIdFromInput(input: string): string | null {
  const id = input.trim().replace(/^#/, '').toUpperCase();
  return /^[A-Z0-9]{4,12}$/.test(id) ? id : null;
}
