import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import {
  Badge,
  Button,
  Card,
  Divider,
  Heading,
  Icon,
  Info,
  Notice,
  Row,
  Screen,
  Stack,
  Txt,
} from '@/components/ui';
import { dateLabel } from '@/lib/model';
import { useRole } from '@/lib/role-store';
import { categoryLabel, FAQ, requestsFor, statusLabel } from '@/lib/support';
import { useSupport } from '@/lib/support-store';
import { colors as c, radius, space } from '@/theme';

/**
 * "Support" for drivers and passengers: contact the team, follow requests, read the FAQ.
 * `tab`: shown in the bottom bar (own title, no stack header).
 */
export function SupportHome({ tab = false }: { tab?: boolean }) {
  const { role } = useRole();
  const { support } = useSupport();
  const who = role ?? 'passenger';
  const requests = requestsFor(support, who);
  const [open, setOpen] = useState<number | null>(null);

  return (
    <Screen>
      {tab && <Txt variant="title">Support</Txt>}
      <Card dark>
        <Icon name="help" size={30} color={c.red} />
        <Txt variant="heading" style={{ color: c.surface }}>
          On est là pour vous.
        </Txt>
        <Txt variant="caption" style={{ color: c.lightOnDark }}>
          Un souci avec un paiement, {who === 'driver' ? 'un retrait' : 'un reçu'} ou votre compte ?
          Écrivez-nous, nous répondons en français et en arabe.
        </Txt>
        <Button
          title="Contacter le support"
          icon="arrow"
          onPress={() => router.push('/requests/new')}
        />
      </Card>

      <Notice
        icon="chat"
        title={
          who === 'passenger'
            ? 'Assistant support · réponse immédiate'
            : 'Assistant TapTaxi en darija'
        }
        onPress={() => router.push(who === 'passenger' ? '/passenger/support-chat' : '/assistant')}
      >
        {who === 'passenger'
          ? 'Français · العربية · Darija · English. Objet oublié, montant, partage, recharge…'
          : 'Vos gains, l’AMO, le propriétaire, les retraits : demandez en darija.'}
      </Notice>
      <Card style={{ gap: 0, paddingVertical: space.xs }}>
        <View style={{ paddingVertical: space.md }}>
          <Heading title="Mes demandes" />
        </View>
        {requests.length ? (
          requests.map((r, i) => (
            <Pressable
              key={r.id}
              accessibilityRole="button"
              accessibilityLabel={`${r.subject}, ${statusLabel[r.status]}`}
              onPress={() => router.push(`/requests/${r.id}`)}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              {i > 0 && <Divider />}
              <Row style={{ paddingVertical: space.md }}>
                <Stack gap={space.xs} style={{ flex: 1 }}>
                  <Txt variant="headline" style={{ fontSize: 14 }} numberOfLines={1}>
                    {r.subject}
                  </Txt>
                  <Txt variant="caption" style={{ fontSize: 11 }}>
                    {categoryLabel[r.category]} · {r.id} · {dateLabel(r.updatedAt)}
                  </Txt>
                </Stack>
                <Badge neutral={r.status !== 'answered'}>{statusLabel[r.status]}</Badge>
              </Row>
            </Pressable>
          ))
        ) : (
          <Txt variant="caption" style={{ paddingBottom: space.lg }}>
            Aucune demande pour le moment.
          </Txt>
        )}
      </Card>

      <Heading title="Questions fréquentes" />
      {FAQ[who].map(([question, answer], i) => (
        <Pressable
          key={question}
          accessibilityRole="button"
          accessibilityState={{ expanded: open === i }}
          onPress={() => setOpen(open === i ? null : i)}
        >
          <Card style={{ gap: space.sm }}>
            <Row>
              <Txt variant="headline" style={{ flex: 1, fontSize: 14 }}>
                {question}
              </Txt>
              <View style={{ transform: [{ rotate: open === i ? '90deg' : '0deg' }] }}>
                <Icon name="chevron" size={16} color={c.subtle} />
              </View>
            </Row>
            {open === i && <Txt variant="caption">{answer}</Txt>}
          </Card>
        </Pressable>
      ))}
      <View
        style={{
          backgroundColor: c.warm,
          borderRadius: radius.lg,
          padding: space.lg,
        }}
      >
        <Info>
          Démo : vos demandes restent sur cet appareil et reçoivent une réponse automatique. Avec le
          serveur, elles arriveront dans l’espace Support de l’équipe TapTaxi.
        </Info>
      </View>
    </Screen>
  );
}
