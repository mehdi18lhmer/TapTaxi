import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import { dateLabel, methodLabel, money, passengerFeeOf, passengerPaid } from './model';
import type { Transaction } from './model';
const escape = (v: string) =>
  v.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
export async function sharePdf(title: string, items: Transaction[], receipt = false) {
  const total = items.reduce(
    (n, t) => n + (receipt ? passengerPaid(t) : t.kind === 'cash' ? t.fare : t.credit),
    0,
  );
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>@page{margin:24mm 18mm}body{font-family:-apple-system,Arial,sans-serif;color:#121212;font-size:12px}h1{font-size:30px}h1 span{color:#d91e24}h2{font-size:22px}.demo{font-size:9px;color:#8c8a80;letter-spacing:1px}.entry{page-break-inside:avoid;border-top:1px solid #e8e7e0;padding:18px 0}.row{display:flex;justify-content:space-between;gap:18px;margin:8px 0}.muted{color:#777;font-size:10px}.total{font-weight:700;font-size:18px;border-top:2px solid #121212;padding-top:18px;page-break-inside:avoid}footer{font-size:9px;color:#aaa;margin-top:32px}</style></head><body><h1>TapTaxi<span>.</span></h1><p class="demo">DÉMONSTRATION · AUCUNE VALEUR COMPTABLE</p><h2>${escape(title)}</h2><p>Youssef Benali · Petit taxi n° 1287 · Casablanca</p>${items.map((t) => `<section class="entry"><div class="row"><strong>${escape(t.label)} #${escape(t.id)}</strong><strong>${money(receipt ? passengerPaid(t) : t.kind === 'cash' ? t.fare : t.credit)} MAD</strong></div><p class="muted">${escape(dateLabel(t.at, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }))} · ${escape(methodLabel(t.method))}</p>${receipt ? `<div class="row"><span>Compteur</span><span>${money(t.fare)} MAD</span></div><div class="row"><span>Pourboire</span><span>${money(t.tip)} MAD</span></div><div class="row"><span>Frais TapTaxi</span><span>${money(passengerFeeOf(t))} MAD</span></div>` : ''}</section>`).join('')}<div class="row total"><span>${receipt ? 'TOTAL PAYÉ' : 'TOTAL'}</span><span>${money(total)} MAD</span></div><footer>TapTaxi · Document fictif créé sur cet appareil.</footer></body></html>`;
  const result = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(result.uri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: title,
    });
  } else {
    Alert.alert(
      'Partage indisponible',
      'Le partage de fichiers n’est pas disponible sur cet appareil.',
    );
  }
}
