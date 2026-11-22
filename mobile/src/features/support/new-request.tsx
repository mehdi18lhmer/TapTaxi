import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Card, Chips, Detail, Heading, Info, Input, Screen, Txt } from '@/components/ui';
import { successFeedback } from '@/lib/haptics';
import { uid } from '@/lib/ids';
import { useRole } from '@/lib/role-store';
import {
  categoriesFor,
  categoryLabel,
  createRequest,
  MAX_MESSAGE,
  promisedReply,
  type RequestCategory,
} from '@/lib/support';
import { useSupport } from '@/lib/support-store';

/**
 * New support request. Opened from Support, or from a receipt's "Signaler un problème"
 * with `paymentId` (and `category=payment`) already filled in.
 */
export function NewRequest() {
  const params = useLocalSearchParams<{ paymentId?: string; category?: string }>();
  const { role } = useRole();
  const { support, update } = useSupport();
  const who = role ?? 'passenger';
  const options = categoriesFor[who];
  const [category, setCategory] = useState<RequestCategory>(
    options.includes(params.category as RequestCategory)
      ? (params.category as RequestCategory)
      : options[0],
  );
  const [subject, setSubject] = useState(
    params.paymentId ? `Problème avec le paiement TT-${params.paymentId}` : '',
  );
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | undefined>();

  const send = async () => {
    let result: ReturnType<typeof createRequest>;
    try {
      result = createRequest(
        support,
        { role: who, category, subject, body, paymentId: params.paymentId },
        `S-${uid().slice(0, 6)}`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Demande incomplète.');
      return;
    }
    if (await update(() => result.state)) {
      void successFeedback();
      router.replace(`/requests/${result.request.id}`);
    }
  };

  return (
    <Screen>
      <Heading title="Sujet" />
      <Chips
        value={category}
        onChange={(v) => setCategory(v as RequestCategory)}
        items={options.map((o) => ({ value: o, label: categoryLabel[o] }))}
      />
      {params.paymentId && (
        <Card>
          <Detail label="Paiement concerné" value={`TT-${params.paymentId}`} strong />
        </Card>
      )}
      <Input
        label="Titre"
        value={subject}
        onChangeText={(v) => {
          setSubject(v);
          setError(undefined);
        }}
        placeholder="Ex. Paiement non reçu"
        maxLength={80}
      />
      <Input
        label="Votre message"
        value={body}
        onChangeText={(v) => {
          setBody(v);
          setError(undefined);
        }}
        placeholder="Expliquez ce qui s’est passé : heure de la course, montant, référence…"
        multiline
        maxLength={MAX_MESSAGE}
        textAlignVertical="top"
        style={{ minHeight: 140 }}
        error={error}
      />
      <Txt variant="caption">Réponse sous {promisedReply(category)} environ.</Txt>
      <Button title="Envoyer la demande" icon="arrow" onPress={() => void send()} />
      <Info>N’indiquez jamais votre numéro de carte complet ni un code reçu par SMS.</Info>
    </Screen>
  );
}
