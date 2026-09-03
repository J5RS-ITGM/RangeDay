import React, { useCallback, useState } from 'react';
import { GestureResponderEvent, LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Path, Text as SvgText } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeContext';
import { RADII } from '@/theme/tokens';
import { Hit, Zone } from '@/store/types';

export const TARGET_W = 460;
export const TARGET_H = 760;

/** Zone paths from the mockup, in a 460×760 viewBox. Order = paint order. */
const ZONES: { zone: Exclude<Zone, 'miss'>; d: string; sw: number }[] = [
  {
    zone: 'D',
    sw: 3,
    d: 'M40,300 L40,232 Q40,214 58,210 L402,210 Q420,214 420,232 L420,300 Q420,470 380,560 Q345,632 230,690 Q115,632 80,560 Q40,470 40,300 Z',
  },
  {
    zone: 'C',
    sw: 2,
    d: 'M96,300 L96,258 Q96,250 104,250 L356,250 Q364,250 364,258 L364,300 Q364,430 336,505 Q312,560 230,600 Q148,560 124,505 Q96,430 96,300 Z',
  },
  {
    zone: 'A',
    sw: 2,
    d: 'M170,300 L170,262 L290,262 L290,300 Q290,412 272,470 Q254,522 230,540 Q206,522 188,470 Q170,412 170,300 Z',
  },
  {
    zone: 'C',
    sw: 2.5,
    d: 'M150,150 Q150,70 230,70 Q310,70 310,150 L310,196 Q310,204 302,204 L158,204 Q150,204 150,196 Z',
  },
  { zone: 'A', sw: 2, d: 'M186,150 Q186,104 230,104 Q274,104 274,150 L274,190 L186,190 Z' },
];

interface Props {
  hits: Hit[];
  onHit: (zone: Exclude<Zone, 'miss'>, x: number, y: number) => void;
  onRemove: (index: number) => void;
}

/**
 * Touch handling: each zone Path gets its own onPress so hit-testing is
 * done by the SVG layer (including the head/body overlap). We convert the
 * press location from view pixels to target-space using the measured
 * layout size. Tapping an existing marker removes it.
 */
export function Target({ hits, onHit, onRemove }: Props) {
  const { theme } = useTheme();
  const [size, setSize] = useState({ w: 0, h: 0 });

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ w: width, h: height });
  }, []);

  const toTarget = useCallback(
    (e: GestureResponderEvent) => {
      if (!size.w || !size.h) return null;
      // preserveAspectRatio="xMidYMid meet": uniform scale, centered
      const scale = Math.min(size.w / TARGET_W, size.h / TARGET_H);
      const offX = (size.w - TARGET_W * scale) / 2;
      const offY = (size.h - TARGET_H * scale) / 2;
      const { locationX, locationY } = e.nativeEvent;
      return { x: (locationX - offX) / scale, y: (locationY - offY) / scale };
    },
    [size],
  );

  const fill: Record<Exclude<Zone, 'miss'>, string> = { A: theme.tgtA, C: theme.tgtC, D: theme.tgtD };
  const dot: Record<Zone, string> = { A: theme.alpha, C: theme.charlie, D: theme.delta, miss: theme.miss };

  return (
    <View style={[styles.wrap, { backgroundColor: theme.surface, borderColor: theme.line }]}>
      <View style={styles.stage} onLayout={onLayout}>
        <Svg width="100%" height="100%" viewBox={`0 0 ${TARGET_W} ${TARGET_H}`} preserveAspectRatio="xMidYMid meet">
          {ZONES.map((z, i) => (
            <Path
              key={i}
              d={z.d}
              fill={fill[z.zone]}
              stroke={theme.tgtLine}
              strokeWidth={z.sw}
              onPress={(e) => {
                const p = toTarget(e);
                if (p) onHit(z.zone, p.x, p.y);
              }}
            />
          ))}
          <SvgText x={225} y={420} textAnchor="middle" fontSize={34} fontWeight="700" fill={theme.tgtLine} opacity={0.28}>A</SvgText>
          <SvgText x={100} y={440} textAnchor="middle" fontSize={22} fontWeight="700" fill={theme.tgtLine} opacity={0.28}>C</SvgText>
          <SvgText x={34} y={480} textAnchor="middle" fontSize={22} fontWeight="700" fill={theme.tgtLine} opacity={0.25}>D</SvgText>
          <SvgText x={225} y={122} textAnchor="middle" fontSize={18} fontWeight="700" fill={theme.tgtLine} opacity={0.28}>A</SvgText>

          {hits.map((h, i) =>
            h.x === null || h.y === null ? null : (
              <G key={i} onPress={() => onRemove(i)}>
                <Circle cx={h.x} cy={h.y} r={15} fill={dot[h.zone]} stroke={theme.bg} strokeWidth={2.5} />
                <SvgText x={h.x} y={h.y + 6} textAnchor="middle" fontSize={17} fontWeight="700" fill={theme.bg}>
                  {h.zone}
                </SvgText>
              </G>
            ),
          )}
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderWidth: StyleSheet.hairlineWidth * 2, borderRadius: RADII.card, padding: 14, marginBottom: 14 },
  stage: { width: '100%', aspectRatio: TARGET_W / TARGET_H },
});
