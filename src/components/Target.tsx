import React, { useCallback, useState } from 'react';
import { GestureResponderEvent, LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import Svg, {
  Defs,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Circle,
  Text as SvgText,
} from 'react-native-svg';
import { useTheme } from '@/theme/ThemeContext';
import { RADII } from '@/theme/tokens';
import { Hit, Zone } from '@/store/types';
import { classifyHit } from '@/lib/targetGeometry';

/**
 * USPSA target rendered from Eric's supplied SVG (USPSA_Target.svg,
 * traced from a photograph). The artwork paths are used verbatim; the
 * viewBox is cropped from the original 447x447 canvas to the target
 * silhouette (x 80..367). Tap regions are transparent overlays stacked
 * per zone; the cardboard between the silhouette edge and the dashed
 * outer scoring boundary is the NON-SCORING BORDER and records a miss,
 * as on a real target. Head outside the head A-box scores as C
 * (model tracks A/C/D/miss).
 */

const VIEW_X = 80;
export const TARGET_W = 287;
export const TARGET_H = 447;

// --- artwork paths, verbatim from the SVG ---
const OUTLINE = 'M174 0H273V85.5H323.5L359.5 121.5V357L313 447H133.5L87.5 357V121.5L122.5 85.5H174Z';
const OUTER_BOUNDARY =
  'M188 6.5H258.5Q266.5 6.5 266.5 14.5V92H320.5L353 124.5V354.5L309 440.5H137.5L94 354.5V125L125.5 92H180V14.5Q180 6.5 188 6.5Z';
const C_BODY_OPEN =
  'M179 93.5L142 115.5Q137.5 118 137.5 125V284.5Q137.5 289 139.5 293.5L167.5 354H280.5L307.5 293.5Q309.5 289 309.5 284.5V125Q309.5 119 305 116L268 93.5';
const HEAD_A = { x: 194, y: 20.5, w: 59, h: 31, rx: 7 };
const BODY_A = { x: 180, y: 122, w: 86.5, h: 162.5, rx: 8.5 };

interface Props {
  hits: Hit[];
  onHit: (zone: Zone, x: number, y: number) => void;
  onRemove: (index: number) => void;
}

export function Target({ hits, onHit, onRemove }: Props) {
  const { theme } = useTheme();
  const [size, setSize] = useState({ w: 0, h: 0 });

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ w: width, h: height });
  }, []);

  /**
   * Stage-relative tap coordinates, cross-platform. Native populates
   * locationX/Y; react-native-web mouse events populate offsetX/Y; web
   * touch events need clientX against the element rect. NaN coords were
   * exactly the bug that made markers invisible on web.
   */
  const stageXY = useCallback((e: GestureResponderEvent): { lx: number; ly: number } | null => {
    const ne = e.nativeEvent as unknown as Record<string, unknown>;
    if (typeof ne.locationX === 'number' && Number.isFinite(ne.locationX)) {
      return { lx: ne.locationX as number, ly: ne.locationY as number };
    }
    if (typeof ne.offsetX === 'number' && Number.isFinite(ne.offsetX)) {
      return { lx: ne.offsetX as number, ly: ne.offsetY as number };
    }
    const touch = (ne.changedTouches as { clientX: number; clientY: number }[] | undefined)?.[0];
    const el = (e.currentTarget as unknown as { getBoundingClientRect?: () => DOMRect })
      ?.getBoundingClientRect?.();
    if (touch && el) return { lx: touch.clientX - el.left, ly: touch.clientY - el.top };
    return null;
  }, []);

  const onStagePress = useCallback(
    (e: GestureResponderEvent) => {
      const pt = stageXY(e);
      if (!pt || !size.w || !size.h) return;
      // preserveAspectRatio="xMidYMid meet": uniform scale, centered
      const scale = Math.min(size.w / TARGET_W, size.h / TARGET_H);
      const offX = (size.w - TARGET_W * scale) / 2;
      const offY = (size.h - TARGET_H * scale) / 2;
      const x = VIEW_X + (pt.lx - offX) / scale;
      const y = (pt.ly - offY) / scale;

      // Tapping an existing marker removes it (12-unit touch radius)
      for (let i = hits.length - 1; i >= 0; i--) {
        const h = hits[i];
        if (h.x !== null && h.y !== null && (h.x - x) ** 2 + (h.y - y) ** 2 <= 12 ** 2) {
          onRemove(i);
          return;
        }
      }
      const zone = classifyHit(x, y);
      if (zone) onHit(zone, x, y);
    },
    [stageXY, size, hits, onHit, onRemove],
  );

  const dot: Record<Zone, string> = { A: theme.alpha, C: theme.charlie, D: theme.delta, miss: theme.miss };

  return (
    <View style={[styles.wrap, { backgroundColor: theme.surface, borderColor: theme.line }]}>
      <Pressable style={styles.stage} onLayout={onLayout} onPress={onStagePress}>
        <Svg
          width="100%"
          height="100%"
          viewBox={`${VIEW_X} 0 ${TARGET_W} ${TARGET_H}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <Defs>
            <LinearGradient id="cardboard" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#b98b65" />
              <Stop offset="0.48" stopColor="#c29a74" />
              <Stop offset="1" stopColor="#b88b65" />
            </LinearGradient>
          </Defs>

          {/* --- artwork (from USPSA_Target.svg) --- */}
          <Path d={OUTLINE} fill="url(#cardboard)" stroke="#a77b57" strokeWidth={0.65} />
          <G
            fill="none"
            stroke="#62452f"
            strokeWidth={1.1}
            strokeDasharray="1.65 2.65"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <Path d={OUTER_BOUNDARY} />
            <Rect x={HEAD_A.x} y={HEAD_A.y} width={HEAD_A.w} height={HEAD_A.h} rx={HEAD_A.rx} />
            <Path d={C_BODY_OPEN} />
            <Rect x={BODY_A.x} y={BODY_A.y} width={BODY_A.w} height={BODY_A.h} rx={BODY_A.rx} />
          </G>
          <G fill="#654a34" fontSize={14} textAnchor="middle">
            <SvgText x={223.5} y={41}>A</SvgText>
            <SvgText x={117} y={226}>D</SvgText>
            <SvgText x={157.5} y={226}>C</SvgText>
            <SvgText x={223.5} y={226}>A</SvgText>
            <SvgText x={287.5} y={226}>C</SvgText>
            <SvgText x={335} y={226}>D</SvgText>
          </G>

          {/* --- hit markers (tap handling lives on the stage Pressable) --- */}
          {hits.map((h, i) =>
            h.x === null || h.y === null ? null : (
              <G key={i}>
                <Circle cx={h.x} cy={h.y} r={10} fill={dot[h.zone]} stroke={theme.bg} strokeWidth={2} />
                <SvgText x={h.x} y={h.y + 4} textAnchor="middle" fontSize={11} fontWeight="700" fill={theme.bg}>
                  {h.zone === 'miss' ? 'M' : h.zone}
                </SvgText>
              </G>
            ),
          )}
        </Svg>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderWidth: StyleSheet.hairlineWidth * 2, borderRadius: RADII.card, padding: 14, marginBottom: 14 },
  stage: { width: '100%', aspectRatio: TARGET_W / TARGET_H, alignSelf: 'center', maxWidth: 340 },
});
