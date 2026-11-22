// Passenger scans the driver's QR with the camera. Only TapTaxi payment links are accepted
// (see lib/qr.ts); a code can also be typed by hand, e.g. on a simulator without a camera.
import { useCallback, useRef, useState } from 'react';
import { View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useIsFocused } from 'expo-router/react-navigation';
import { CameraView, useCameraPermissions } from 'expo-camera';
import type { BarcodeScanningResult } from 'expo-camera';
import { Button, Card, Icon, Info, Input, Screen, Stack, Txt } from '@/components/ui';
import { paymentIdFromInput, paymentIdFromQr } from '@/lib/qr';
import { tapFeedback } from '@/lib/haptics';
import { colors as c, radius, space } from '@/theme';

export function Scan() {
  const [permission, requestPermission] = useCameraPermissions();
  const [problem, setProblem] = useState<string | null>(null);
  const [manual, setManual] = useState('');
  const [manualError, setManualError] = useState<string | undefined>();
  // The camera reports the same code many times per second; open the payment only once.
  const handled = useRef(false);
  // A tab stays mounted: run the camera only while this tab is on screen,
  // and allow a new scan each time the tab comes back.
  const focused = useIsFocused();
  useFocusEffect(
    useCallback(() => {
      handled.current = false;
      setProblem(null);
    }, []),
  );

  const open = (id: string) => {
    if (handled.current) return;
    handled.current = true;
    void tapFeedback();
    router.push(`/pay/${id}`);
  };

  const onScanned = ({ data }: BarcodeScanningResult) => {
    const id = paymentIdFromQr(data);
    if (id) open(id);
    else setProblem('Ce QR n’est pas un code de paiement TapTaxi. Aucun lien n’a été ouvert.');
  };

  return (
    <Screen>
      <Stack gap={space.xs}>
        <Txt variant="title">Scannez le QR du taxi.</Txt>
        <Txt variant="caption">Visez le code affiché sur le téléphone du chauffeur.</Txt>
      </Stack>

      <View
        style={{
          aspectRatio: 1,
          borderRadius: radius.card,
          borderCurve: 'continuous',
          overflow: 'hidden',
          backgroundColor: c.ink,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {permission?.granted && focused ? (
          <CameraView
            style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={onScanned}
          />
        ) : (
          <Stack gap={space.md} style={{ alignItems: 'center', padding: space.xl }}>
            <Icon name="camera" size={40} color={c.lightOnDark} />
            <Txt variant="caption" style={{ color: c.lightOnDark, textAlign: 'center' }}>
              {permission && !permission.canAskAgain
                ? 'L’accès à la caméra est refusé. Autorisez-le dans les Réglages, ou saisissez le code ci-dessous.'
                : 'TapTaxi a besoin de la caméra pour lire le QR du taxi.'}
            </Txt>
            {(!permission || permission.canAskAgain) && (
              <Button
                title="Autoriser la caméra"
                icon="camera"
                onPress={() => void requestPermission()}
              />
            )}
          </Stack>
        )}
        {/* Viewfinder frame */}
        {permission?.granted && (
          <View
            pointerEvents="none"
            style={{
              width: '62%',
              aspectRatio: 1,
              borderWidth: 3,
              borderColor: c.surface,
              borderRadius: radius.lg,
            }}
          />
        )}
      </View>

      {problem && (
        <Card style={{ backgroundColor: c.redSoft }}>
          <Txt style={{ color: c.red }}>{problem}</Txt>
        </Card>
      )}

      <Card>
        <Txt variant="headline">Pas de caméra ?</Txt>
        <Input
          label="Code affiché sous le QR (ex. #AB12CD34)"
          value={manual}
          onChangeText={(v) => {
            setManual(v);
            setManualError(undefined);
          }}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="#AB12CD34"
          maxLength={13}
          error={manualError}
        />
        <Button
          title="Ouvrir le paiement"
          variant="secondary"
          icon="arrow"
          disabled={!manual.trim()}
          onPress={() => {
            const id = paymentIdFromInput(manual);
            if (id) open(id);
            else setManualError('Code invalide : 4 à 12 lettres ou chiffres.');
          }}
        />
      </Card>
      <Info>Démo : le paiement doit avoir été créé sur cet appareil.</Info>
    </Screen>
  );
}
