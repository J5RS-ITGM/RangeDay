import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useAuth } from '@/auth/AuthContext';
import { useToast } from '@/components/Toast';
import { Field, Muted, Pill } from '@/components/UI';
import { api } from '@/lib/api';
import { useTheme } from '@/theme/ThemeContext';

/**
 * Time capture for a run. Three ways in, all landing in the same total:
 *  - type the total directly
 *  - enter splits; total = sum (first shot + each split)
 *  - scan a timer photo; OCR suggests the total to confirm
 * The parent owns `time` (string seconds); this component sets it.
 */
export function TimerInput({ time, onTime }: { time: string; onTime: (v: string) => void }) {
  const { theme } = useTheme();
  const { token } = useAuth();
  const toast = useToast();
  const [mode, setMode] = useState<'total' | 'splits'>('total');
  const [splits, setSplits] = useState<string[]>(['']);
  const [scanning, setScanning] = useState(false);
  const [suggestions, setSuggestions] = useState<number[]>([]);

  const sumSplits = (arr: string[]) => {
    const nums = arr.map((x) => parseFloat(x) || 0);
    const total = nums.reduce((a, b) => a + b, 0);
    return total > 0 ? total.toFixed(2) : '';
  };

  const setSplit = (i: number, v: string) => {
    const next = [...splits];
    next[i] = v;
    if (i === next.length - 1 && v.trim()) next.push('');
    setSplits(next);
    onTime(sumSplits(next));
  };
  const removeSplit = (i: number) => {
    const next = splits.filter((_, j) => j !== i);
    const cleaned = next.length ? next : [''];
    setSplits(cleaned);
    onTime(sumSplits(cleaned));
  };

  const scan = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { toast('Photo permission needed'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.9 });
    if (res.canceled) return;
    const a = res.assets[0];
    setScanning(true);
    setSuggestions([]);
    try {
      const r = await api.scanTimer(token!, a.uri, a.fileName || 'timer.jpg', a.mimeType || 'image/jpeg');
      if (r.best == null) { toast('Could not read a time — enter it manually'); }
      else {
        onTime(r.best.toFixed(2));
        setSuggestions(r.candidates);
        toast('Read ' + r.best.toFixed(2) + 's — confirm or correct it');
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Scan failed');
    }
    setScanning(false);
  };

  return (
    <View>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
        <Pill title="Total" quiet={mode !== 'total'} onPress={() => setMode('total')} />
        <Pill title="Splits" quiet={mode !== 'splits'} onPress={() => setMode('splits')} />
        <Pill title={scanning ? 'Reading…' : '📷 Scan timer'} quiet onPress={scanning ? () => {} : scan} />
      </View>

      {mode === 'total' ? (
        <Field label="Time (sec)" value={time} onChangeText={onTime} keyboardType="decimal-pad" placeholder="0.00" />
      ) : (
        <View>
          <Muted style={{ fontSize: 11, marginBottom: 6 }}>First shot, then each split. Total adds them up.</Muted>
          {splits.map((sp, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Field label={i === 0 ? 'First shot' : `Split ${i}`} value={sp} onChangeText={(v) => setSplit(i, v)} keyboardType="decimal-pad" placeholder="0.00" />
              </View>
              {splits.length > 1 && sp.trim() ? (
                <Pressable onPress={() => removeSplit(i)} hitSlop={8} style={{ paddingBottom: 12 }}>
                  <Text style={{ color: theme.miss, fontSize: 18 }}>×</Text>
                </Pressable>
              ) : null}
            </View>
          ))}
          <Muted style={{ fontSize: 12, marginBottom: 12 }}>Total: <Text style={{ color: theme.accent, fontWeight: '700' }}>{time || '0.00'}s</Text></Muted>
        </View>
      )}

      {suggestions.length > 1 ? (
        <View style={{ marginBottom: 12 }}>
          <Muted style={{ fontSize: 11, marginBottom: 4 }}>Other readings — tap if the scan picked wrong:</Muted>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            {suggestions.map((c) => (
              <Pill key={c} title={c.toFixed(2)} quiet onPress={() => onTime(c.toFixed(2))} />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}
