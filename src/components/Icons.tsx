import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

/**
 * Stroke icon set ported from the mockup — one consistent 24x24 grid,
 * 1.8 stroke, round caps/joins. No emoji anywhere in the app chrome.
 */

export interface IconProps {
  size?: number;
  color: string;
  strokeWidth?: number;
}

function Base({
  size = 21,
  color,
  strokeWidth = 1.8,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </Svg>
  );
}

export const HomeIcon = (p: IconProps) => (
  <Base {...p}>
    <Path d="M3 11l9-8 9 8" />
    <Path d="M5 9.5V21h14V9.5" />
  </Base>
);

export const ProfileIcon = (p: IconProps) => (
  <Base {...p}>
    <Circle cx={12} cy={8} r={3.6} />
    <Path d="M4.5 20.5c.8-3.6 3.9-5.5 7.5-5.5s6.7 1.9 7.5 5.5" />
  </Base>
);

export const ContactsIcon = (p: IconProps) => (
  <Base {...p}>
    <Path d="M5 3.5h3.2l1.8 4.4-2.2 1.5a12.5 12.5 0 006 6l1.5-2.2 4.4 1.8V18a2.5 2.5 0 01-2.7 2.5A17 17 0 012.5 6.2 2.5 2.5 0 015 3.5z" />
  </Base>
);

export const ShieldIcon = (p: IconProps) => (
  <Base {...p}>
    <Path d="M12 3l7.5 2.8V11c0 4.8-3.2 8.4-7.5 10-4.3-1.6-7.5-5.2-7.5-10V5.8z" />
  </Base>
);

export const ChecklistIcon = (p: IconProps) => (
  <Base {...p}>
    <Path d="M10 6.5h10" />
    <Path d="M10 12h10" />
    <Path d="M10 17.5h10" />
    <Path d="M4 6.5l1.2 1.2 2.3-2.3" />
    <Path d="M4 12l1.2 1.2 2.3-2.3" />
    <Path d="M4 17.5l1.2 1.2 2.3-2.3" />
  </Base>
);

export const TargetIcon = (p: IconProps) => (
  <Base {...p}>
    <Circle cx={12} cy={12} r={8.5} />
    <Circle cx={12} cy={12} r={4.7} />
    <Circle cx={12} cy={12} r={1.4} fill={p.color} stroke="none" />
  </Base>
);

export const BarsIcon = (p: IconProps) => (
  <Base {...p}>
    <Path d="M3.5 20.5h17" />
    <Path d="M7 20v-9" />
    <Path d="M12 20V4.5" />
    <Path d="M17 20v-6" />
  </Base>
);

export const ClockIcon = (p: IconProps) => (
  <Base {...p}>
    <Circle cx={12} cy={12} r={8.5} />
    <Path d="M12 7.5V12l3.2 1.9" />
  </Base>
);

export const ChatIcon = (p: IconProps) => (
  <Base {...p}>
    <Path d="M4 5.5h16V16H9l-5 4.5z" />
  </Base>
);

export const AdminIcon = (p: IconProps) => (
  <Base {...p}>
    <Path d="M12 3l7.5 2.8V11c0 4.8-3.2 8.4-7.5 10-4.3-1.6-7.5-5.2-7.5-10V5.8z" />
    <Path d="M8.8 12l2.2 2.2 4.2-4.4" />
  </Base>
);

export const SettingsIcon = (p: IconProps) => (
  <Base {...p}>
    <Path d="M4 7h8.5" />
    <Path d="M17.5 7H20" />
    <Circle cx={15} cy={7} r={2.2} />
    <Path d="M4 15.5h3" />
    <Path d="M11.5 15.5H20" />
    <Circle cx={9} cy={15.5} r={2.2} />
  </Base>
);

export const SignOutIcon = (p: IconProps) => (
  <Base {...p}>
    <Path d="M14 4H7a2 2 0 00-2 2v12a2 2 0 002 2h7" />
    <Path d="M17 8l4 4-4 4" />
    <Path d="M21 12H10" />
  </Base>
);

export const MenuIcon = (p: IconProps) => (
  <Base {...p} strokeWidth={2}>
    <Path d="M4 6.5h16" />
    <Path d="M4 12h16" />
    <Path d="M4 17.5h16" />
  </Base>
);
