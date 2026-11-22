import { useState } from 'react';
import { Alert, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Badge,
  Button,
  Card,
  Detail,
  Empty,
  Input,
  Row,
  Screen,
  Stack,
  Txt,
} from '@/components/ui';
import { dateLabel } from '@/lib/model';
import { addMessage, categoryLabel, closeRequest, statusLabel } from '@/lib/support';
import { useSupport } from '@/lib/support-store';
import { colors as c, radius, space } from '@/theme';

/** One support request: the conversation, a reply box, and "close". */
export function RequestDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { support, update } = useSupport();
  const [reply, setReply] = useState('');
  const [error, setError] = useState<string | undefined>();
  const request = support.requests.find((r) => r.id === id);

  if (!request)
    return (
      <Screen center>
        <Empty
          title="Demande introuvable"
          body="Elle a peut-être été créée sur un autre appareil."
        />
        <Button title="Retour" onPress={() => router.back()} />
      </Screen>
    );
  const closed = request.status === 'closed';

  return (
    <Screen>
      <Stack gap={space.xs}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt variant="small">
            {request.id} · {categoryLabel[request.category]}
          </Txt>
          <Badge neutral={request.status !== 'answered'}>{statusLabel[request.status]}</Badge>
        </Row>
        <Txt variant="heading">{request.subject}</Txt>
      </Stack>
      {request.paymentId && (
        <Card>
          <Detail label="Paiement concerné" value={`TT-${request.paymentId}`} />
        </Card>
      )}

      {request.messages.map((m) => {
        const mine = m.from === 'me';
        return (
          <View
            key={m.id}
            style={{
              alignSelf: mine ? 'flex-end' : 'flex-start',
              maxWidth: '88%',
              backgroundColor: mine ? c.red : c.surface,
              borderRadius: radius.lg,
              borderBottomRightRadius: mine ? 4 : radius.lg,
              borderBottomLeftRadius: mine ? radius.lg : 4,
              padding: space.md,
              gap: space.xs,
            }}
          >
            <Txt variant="small" style={{ color: mine ? c.redSoft : c.muted }}>
              {mine ? 'Vous' : m.automatic ? 'TapTaxi · réponse automatique' : 'Équipe TapTaxi'} ·{' '}
              {dateLabel(m.at, {
                hour: '2-digit',
                minute: '2-digit',
                day: 'numeric',
                month: 'short',
              })}
            </Txt>
            <Txt selectable style={{ color: mine ? c.surface : c.ink }}>
              {m.body}
            </Txt>
          </View>
        );
      })}

      {closed ? (
        <Card>
          <Txt variant="caption">Cette demande est fermée.</Txt>
          <Button
            title="Nouvelle demande"
            variant="secondary"
            onPress={() => router.replace('/requests/new')}
          />
        </Card>
      ) : (
        <>
          <Input
            label="Ajouter un message"
            value={reply}
            onChangeText={(v) => {
              setReply(v);
              setError(undefined);
            }}
            placeholder="Une précision, une référence…"
            multiline
            textAlignVertical="top"
            style={{ minHeight: 90 }}
            error={error}
          />
          <Button
            title="Envoyer"
            icon="arrow"
            disabled={!reply.trim()}
            onPress={() => {
              try {
                const next = addMessage(support, request.id, reply);
                void update(() => next).then((ok) => ok && setReply(''));
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Message refusé.');
              }
            }}
          />
          <Button
            title="Mon problème est résolu"
            variant="ghost"
            onPress={() =>
              Alert.alert(
                'Fermer cette demande ?',
                'Vous pourrez en créer une nouvelle si besoin.',
                [
                  { text: 'Annuler', style: 'cancel' },
                  {
                    text: 'Fermer',
                    onPress: () => void update((s) => closeRequest(s, request.id)),
                  },
                ],
              )
            }
          />
        </>
      )}
    </Screen>
  );
}
