import * as ImagePicker from 'expo-image-picker';
import React from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useToast } from '@/components/Toast';
import { useTheme } from '@/theme/ThemeContext';

export interface PickedImage { uri: string; name: string; mime: string; }

/** Row of thumbnails + an "add photo" tile. Controlled by parent. */
export function ImageAttach({ images, onChange, max = 4 }: {
  images: PickedImage[];
  onChange: (imgs: PickedImage[]) => void;
  max?: number;
}) {
  const { theme } = useTheme();
  const toast = useToast();

  const pick = async () => {
    if (images.length >= max) { toast(`Up to ${max} photos`); return; }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { toast('Photo permission needed'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsMultipleSelection: true,
      selectionLimit: max - images.length,
    });
    if (res.canceled) return;
    const picked = res.assets.map((a) => ({
      uri: a.uri,
      name: a.fileName || `photo_${Date.now()}.jpg`,
      mime: a.mimeType || 'image/jpeg',
    }));
    onChange([...images, ...picked].slice(0, max));
  };

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {images.map((img, i) => (
          <View key={i} style={{ position: 'relative' }}>
            <Image source={{ uri: img.uri }} style={{ width: 72, height: 72, borderRadius: 8, backgroundColor: theme.surface2 }} />
            <Pressable
              onPress={() => onChange(images.filter((_, j) => j !== i))}
              style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: theme.miss, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800', lineHeight: 16 }}>×</Text>
            </Pressable>
          </View>
        ))}
        {images.length < max ? (
          <Pressable onPress={pick} style={{ width: 72, height: 72, borderRadius: 8, borderWidth: 1.5, borderStyle: 'dashed', borderColor: theme.line, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: theme.accent, fontSize: 24, lineHeight: 26 }}>+</Text>
            <Text style={{ color: theme.muted, fontSize: 10 }}>Photo</Text>
          </Pressable>
        ) : null}
      </View>
    </ScrollView>
  );
}
