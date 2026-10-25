import type { CSSProperties } from 'react';
import styles from './Skeleton.module.css';

interface SkeletonProps {
  height?: number | string;
  width?: number | string;
  radius?: number;
}

export function Skeleton({ height = 16, width = '100%', radius = 12 }: SkeletonProps) {
  const style: CSSProperties = { height, width, borderRadius: radius };
  return <span className={styles.skeleton} style={style} aria-hidden="true" />;
}
