import React from 'react';
import Svg, { Defs, LinearGradient, Stop, Rect, Circle, Path, G, Ellipse, Line } from 'react-native-svg';

type Props = { width?: number; height?: number };

/**
 * Error boundary crash illustration.
 * Shows a broken circuit/disconnected plug with warning sparks.
 */
export default function CrashIllustrationSvg({ width = 180, height = 140 }: Props) {
    return (
        <Svg width={width} height={height} viewBox="0 0 180 140">
            <Defs>
                <LinearGradient id="cr_bg" x1="0.5" y1="0" x2="0.5" y2="1">
                    <Stop offset="0" stopColor="#EF4444" stopOpacity="0.08" />
                    <Stop offset="1" stopColor="#EF4444" stopOpacity="0" />
                </LinearGradient>
            </Defs>

            <Ellipse cx="90" cy="70" rx="85" ry="65" fill="url(#cr_bg)" />

            {/* Circuit board base */}
            <G stroke="#334155" strokeWidth="1" strokeOpacity="0.3">
                <Line x1="20" y1="100" x2="60" y2="100" />
                <Line x1="60" y1="100" x2="60" y2="70" />
                <Line x1="120" y1="70" x2="120" y2="100" />
                <Line x1="120" y1="100" x2="160" y2="100" />
                <Circle cx="20" cy="100" r="3" fill="#334155" fillOpacity="0.3" />
                <Circle cx="160" cy="100" r="3" fill="#334155" fillOpacity="0.3" />
            </G>

            {/* Break / gap in circuit */}
            <G transform="translate(70, 55)">
                {/* Left connector */}
                <Rect width="18" height="30" rx="3" fill="#475569" fillOpacity="0.4" stroke="#EF4444" strokeWidth="1" strokeOpacity="0.5" />
                <Rect x="4" y="8" width="3" height="14" rx="1.5" fill="#EF4444" fillOpacity="0.4" />
                <Rect x="10" y="6" width="3" height="18" rx="1.5" fill="#EF4444" fillOpacity="0.4" />

                {/* Gap / break */}
                <G transform="translate(22, 5)">
                    {/* Lightning bolt / spark */}
                    <Path d="M4 0 L0 10 L6 8 L2 18" stroke="#F59E0B" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    <Circle cx="1" cy="5" r="2" fill="#F59E0B" fillOpacity="0.5" />
                    <Circle cx="7" cy="14" r="1.5" fill="#F59E0B" fillOpacity="0.4" />
                </G>

                {/* Right connector (offset/disconnected) */}
                <G transform="translate(32, 3)">
                    <Rect width="18" height="30" rx="3" fill="#475569" fillOpacity="0.4" stroke="#EF4444" strokeWidth="1" strokeOpacity="0.5" />
                    <Rect x="5" y="6" width="3" height="18" rx="1.5" fill="#EF4444" fillOpacity="0.4" />
                    <Rect x="11" y="8" width="3" height="14" rx="1.5" fill="#EF4444" fillOpacity="0.4" />
                </G>
            </G>

            {/* Warning triangle */}
            <G transform="translate(75, 20)">
                <Path d="M15 0 L30 25 L0 25 Z" fill="none" stroke="#EF4444" strokeWidth="1.5" strokeOpacity="0.6" strokeLinejoin="round" />
                <Line x1="15" y1="8" x2="15" y2="17" stroke="#EF4444" strokeWidth="2" strokeOpacity="0.6" strokeLinecap="round" />
                <Circle cx="15" cy="21" r="1.5" fill="#EF4444" fillOpacity="0.6" />
            </G>

            {/* Scattered sparks */}
            <Circle cx="55" cy="45" r="1.5" fill="#F59E0B" opacity="0.5" />
            <Circle cx="130" cy="40" r="2" fill="#F59E0B" opacity="0.4" />
            <Circle cx="65" cy="35" r="1" fill="#EF4444" opacity="0.4" />
            <Circle cx="115" cy="50" r="1" fill="#EF4444" opacity="0.3" />

            {/* X marks */}
            <G transform="translate(40, 30)" stroke="#EF4444" strokeWidth="1.2" strokeOpacity="0.3" strokeLinecap="round">
                <Line x1="-3" y1="-3" x2="3" y2="3" />
                <Line x1="3" y1="-3" x2="-3" y2="3" />
            </G>
            <G transform="translate(145, 55)" stroke="#EF4444" strokeWidth="1.2" strokeOpacity="0.3" strokeLinecap="round">
                <Line x1="-3" y1="-3" x2="3" y2="3" />
                <Line x1="3" y1="-3" x2="-3" y2="3" />
            </G>

            {/* Particles */}
            <Circle cx="15" cy="25" r="2" fill="#EF4444" opacity="0.2" />
            <Circle cx="165" cy="30" r="1.5" fill="#F59E0B" opacity="0.2" />
            <Circle cx="25" cy="120" r="2" fill="#475569" opacity="0.2" />
        </Svg>
    );
}
