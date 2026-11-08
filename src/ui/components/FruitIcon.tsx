import { BlendColor, Canvas, Group, Paint, Picture } from '@shopify/react-native-skia';
import { useMemo } from 'react';

import { ART_R, fruitPicture } from '../../render/fruitArt';

type Props = { level: number; size: number; silhouette?: boolean };

/** Static fruit drawn from the same cached SkPicture the game uses. */
export function FruitIcon({ level, size, silhouette }: Props) {
  const pic = useMemo(() => fruitPicture(level), [level]);
  const s = (size / 2 / ART_R) * 0.78; // leave headroom for stems/crowns
  return (
    <Canvas style={{ width: size, height: size }}>
      <Group
        transform={[{ translateX: size / 2 }, { translateY: size / 2 + size * 0.06 }, { scale: s }]}
        layer={
          silhouette ? (
            <Paint opacity={0.5}>
              <BlendColor color="#4A2D5E" mode="srcIn" />
            </Paint>
          ) : undefined
        }
      >
        <Picture picture={pic} />
      </Group>
    </Canvas>
  );
}
