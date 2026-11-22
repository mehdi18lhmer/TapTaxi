import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, Stack as RouterStack } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { Button, Card, Icon, Info, Row, Screen, Stack, Txt } from '@/components/ui';
import {
  ACCEPTED_DOCUMENT_TYPES,
  addDocument,
  documentFileError,
  documentProgress,
  REQUIRED_DOCUMENTS,
  type DocumentId,
} from '@/lib/onboarding';
import { useStore } from '@/lib/store';
import { colors as c, radius, space } from '@/theme';
import { StepProgress } from './step-progress';

/**
 * Step 2: the four driver documents. The picked file is only checked (type, size) and then
 * dropped: the demo records that a document was chosen, never the file itself.
 */
export function Documents() {
  const { state, mutate, notify } = useStore();
  const [picking, setPicking] = useState<DocumentId | null>(null);
  const progress = documentProgress(state.documents);
  // Opened from Profil › Mes documents after sign-up: show status, no "continue" step.
  const reviewOnly = state.onboarded;

  const pick = async (id: DocumentId) => {
    setPicking(id);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ACCEPTED_DOCUMENT_TYPES,
        copyToCacheDirectory: false,
        multiple: false,
      });
      if (result.canceled) return;
      const problem = documentFileError(result.assets[0]);
      if (problem) {
        notify(problem);
        return;
      }
      if (await mutate((s) => ({ ...s, documents: addDocument(s.documents, id) })))
        notify('Sélection enregistrée. Le fichier n’est pas conservé ni envoyé.');
    } catch {
      notify('Impossible d’ouvrir vos fichiers. Utilisez les documents de démonstration.');
    } finally {
      setPicking(null);
    }
  };

  return (
    <Screen>
      <RouterStack.Screen options={{ title: reviewOnly ? 'Mes documents' : 'Étape 2 sur 3' }} />
      {!reviewOnly && <StepProgress step={2} />}
      <Stack gap={space.xs}>
        <Txt variant="title">Vos documents.</Txt>
        <Txt variant="caption">Découvrez la vérification des chauffeurs agréés.</Txt>
      </Stack>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt variant="caption">
          {progress.provided} document{progress.provided > 1 ? 's' : ''} sur {progress.total}
        </Txt>
        <Txt variant="headline">{progress.percent} %</Txt>
      </Row>
      <View
        style={{
          height: 8,
          borderRadius: radius.pill,
          backgroundColor: c.line,
          overflow: 'hidden',
        }}
      >
        <View style={{ width: `${progress.percent}%`, height: '100%', backgroundColor: c.green }} />
      </View>

      {REQUIRED_DOCUMENTS.map((doc) => {
        const done = state.documents.includes(doc.id);
        return (
          <Card key={doc.id} style={{ paddingVertical: space.lg }}>
            <Row>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: radius.md,
                  backgroundColor: done ? c.greenSoft : c.background,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name={doc.icon} color={done ? c.green : c.ink} />
              </View>
              <Stack gap={space.xs} style={{ flex: 1 }}>
                <Txt variant="headline" style={{ fontSize: 14 }}>
                  {doc.title}
                </Txt>
                <Txt variant="caption">{done ? 'Ajouté · démonstration' : doc.sub}</Txt>
              </Stack>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={done ? `Remplacer ${doc.title}` : `Ajouter ${doc.title}`}
                disabled={picking !== null}
                onPress={() => void pick(doc.id)}
                style={({ pressed }) => ({
                  width: 44,
                  height: 44,
                  borderRadius: radius.pill,
                  backgroundColor: done ? c.green : c.red,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed || picking === doc.id ? 0.6 : 1,
                })}
              >
                <Icon name={done ? 'check' : 'upload'} color={c.surface} size={20} />
              </Pressable>
            </Row>
          </Card>
        );
      })}

      {!progress.complete && (
        <Button
          title="Utiliser les documents de démonstration"
          variant="secondary"
          onPress={() => {
            void mutate((s) => ({ ...s, documents: REQUIRED_DOCUMENTS.map((d) => d.id) })).then(
              (ok) => ok && notify('Les quatre documents fictifs sont prêts.'),
            );
          }}
        />
      )}
      <Info>
        Aucune pièce d’identité nécessaire : utilisez les documents fictifs. Les fichiers
        sélectionnés ne sont ni conservés ni envoyés.
      </Info>
      {reviewOnly ? (
        <Button title="Retour au profil" variant="secondary" onPress={() => router.back()} />
      ) : (
        <Button
          title="Continuer"
          icon="arrow"
          disabled={!progress.complete}
          onPress={() => router.push('/payout-setup')}
        />
      )}
    </Screen>
  );
}
