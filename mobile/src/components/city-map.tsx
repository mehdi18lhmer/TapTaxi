// Stylised map of Casablanca for the demo (no map provider needed): the ocean, main roads,
// the passenger's position, nearby taxis, a route, or demand zones for drivers.
// Coordinates use the 0–100 grid of lib/places.ts.
import { View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { KM_PER_UNIT } from '@/lib/places';
import { colors as c, fonts, radius } from '@/theme';

export interface MapPoint {
  x: number;
  y: number;
}

export interface MapMarker extends MapPoint {
  id: string;
  kind: 'taxi' | 'me' | 'pickup' | 'destination' | 'place';
  label?: string;
  /** Draws the marker larger (the taxi on its way). */
  highlight?: boolean;
}

export interface MapZone extends MapPoint {
  id: string;
  r: number;
  color: string;
  label?: string;
  strong?: boolean;
}

const OCEAN = 'M0 0 L72 0 L70 13 L63 17 L56 14 L48 10 L40 17 L28 23 L16 31 L6 38 L0 41 Z';
const ROADS: [number, number, number, number][] = [
  [30, 24, 49, 62], // Bd Zerktouni
  [44, 18, 56, 44], // Bd d’Anfa
  [42, 48, 33, 98], // Route d’El Jadida
  [64, 21, 82, 46], // Bd Mohammed V
  [20, 32, 70, 22], // Corniche
  [56, 44, 90, 70], // Route de Médiouna
];
const RING = 'M8 58 Q48 86 95 48';
const LABELS: [string, number, number][] = [
  ['Océan Atlantique', 18, 10],
  ['Anfa', 34, 34],
  ['Maârif', 36, 52],
  ['Centre', 57, 37],
  ['Belvédère', 80, 30],
  ['Aïn Chock', 52, 80],
  ['Sidi Maârouf', 22, 86],
];

export function CityMap({
  markers = [],
  zones = [],
  route,
  radiusKm,
  center,
  style,
  height = 260,
  onZonePress,
  showLabels = true,
}: {
  markers?: MapMarker[];
  zones?: MapZone[];
  route?: { from: MapPoint; to: MapPoint };
  /** Circle drawn around `center` (the request radius). */
  radiusKm?: number;
  center?: MapPoint;
  style?: StyleProp<ViewStyle>;
  height?: number;
  onZonePress?: (id: string) => void;
  showLabels?: boolean;
}) {
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="Carte de Casablanca (démo)"
      style={[
        {
          height,
          borderRadius: radius.card,
          borderCurve: 'continuous',
          overflow: 'hidden',
          backgroundColor: '#EFEBE1',
        },
        style,
      ]}
    >
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
        <Rect x={0} y={0} width={100} height={100} fill="#EFEBE1" />
        <Path d={OCEAN} fill="#CFE1E8" />
        {/* Parks */}
        <Rect x={49} y={31} width={6} height={4} rx={1} fill="#DCE8D3" />
        <Rect x={24} y={38} width={7} height={5} rx={1} fill="#DCE8D3" />
        <Path d={RING} stroke="#FFFFFF" strokeWidth={2.2} fill="none" />
        {ROADS.map(([x1, y1, x2, y2], i) => (
          <Line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#FFFFFF"
            strokeWidth={1.4}
            strokeLinecap="round"
          />
        ))}
        {showLabels &&
          LABELS.map(([label, x, y]) => (
            <SvgText
              fontFamily={fonts.medium}
              key={label}
              x={x}
              y={y}
              fontSize={2.6}
              fill="#A19D90"
              textAnchor="middle"
            >
              {label}
            </SvgText>
          ))}
        {zones.map((z) => (
          <G key={z.id} onPress={onZonePress ? () => onZonePress(z.id) : undefined}>
            <Circle cx={z.x} cy={z.y} r={z.r} fill={z.color} opacity={0.42} />
            <Circle cx={z.x} cy={z.y} r={z.r * 0.45} fill={z.color} opacity={0.7} />
            {z.label && (
              <SvgText
                fontFamily={fonts.medium}
                x={z.x}
                y={z.y + z.r + 3}
                fontSize={2.8}
                fontWeight={z.strong ? '700' : '500'}
                fill={c.ink}
                textAnchor="middle"
              >
                {z.label}
              </SvgText>
            )}
          </G>
        ))}
        {center && radiusKm ? (
          <Circle
            cx={center.x}
            cy={center.y}
            r={radiusKm / KM_PER_UNIT}
            fill={c.red}
            fillOpacity={0.08}
            stroke={c.red}
            strokeOpacity={0.5}
            strokeWidth={0.4}
            strokeDasharray="1.2 1"
          />
        ) : null}
        {route && (
          <Line
            x1={route.from.x}
            y1={route.from.y}
            x2={route.to.x}
            y2={Math.min(route.to.y, 98)}
            stroke={c.ink}
            strokeWidth={0.9}
            strokeDasharray="2 1.2"
            strokeLinecap="round"
          />
        )}
        {markers.map((m) => (
          <Marker key={m.id} m={m} />
        ))}
      </Svg>
    </View>
  );
}

function Marker({ m }: { m: MapMarker }) {
  if (m.kind === 'me')
    return (
      <G>
        <Circle cx={m.x} cy={m.y} r={3.4} fill="#2F6BFF" opacity={0.2} />
        <Circle cx={m.x} cy={m.y} r={1.8} fill="#2F6BFF" stroke="#FFFFFF" strokeWidth={0.7} />
      </G>
    );
  if (m.kind === 'taxi') {
    const size = m.highlight ? 5 : 3.8;
    return (
      <G>
        <Rect
          x={m.x - size / 2}
          y={m.y - size / 2}
          width={size}
          height={size}
          rx={1.1}
          fill={c.red}
          stroke="#FFFFFF"
          strokeWidth={0.6}
        />
        <SvgText
          fontFamily={fonts.medium}
          x={m.x}
          y={m.y + size * 0.22}
          fontSize={size * 0.55}
          fontWeight="700"
          fill="#FFFFFF"
          textAnchor="middle"
        >
          T
        </SvgText>
        {m.label && (
          <SvgText
            fontFamily={fonts.medium}
            x={m.x}
            y={m.y - size / 2 - 1}
            fontSize={2.3}
            fill={c.ink}
            textAnchor="middle"
          >
            {m.label}
          </SvgText>
        )}
      </G>
    );
  }
  const color = m.kind === 'destination' ? c.ink : m.kind === 'pickup' ? '#2F6BFF' : c.muted;
  return (
    <G>
      <Circle
        cx={m.x}
        cy={Math.min(m.y, 97)}
        r={m.kind === 'place' ? 1.2 : 2}
        fill={color}
        stroke="#FFFFFF"
        strokeWidth={0.6}
      />
      {m.label && (
        <SvgText
          fontFamily={fonts.medium}
          x={m.x}
          y={Math.min(m.y, 97) - 3}
          fontSize={2.6}
          fontWeight="600"
          fill={c.ink}
          textAnchor="middle"
        >
          {m.label}
        </SvgText>
      )}
    </G>
  );
}
