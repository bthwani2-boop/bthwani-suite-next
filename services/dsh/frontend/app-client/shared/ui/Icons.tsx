import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

export function SearchIcon({ color }: { readonly color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Circle cx="11" cy="11" r="7" stroke={color} strokeWidth={2} />
      <Path d="M16.5 16.5L21 21" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function CartIcon({ color }: { readonly color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      <Path d="M3 6h18" stroke={color} strokeWidth={2} />
      <Path d="M16 10a4 4 0 01-8 0" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function ShareIcon({ color }: { readonly color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M16 6l-4-4-4 4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M12 2v13" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}
