import React from 'react';
import Svg, { Defs, LinearGradient, Stop, Rect, Circle, Path, G, Ellipse, Line } from 'react-native-svg';
import { colors } from '../../theme';

type Props = { width?: number; height?: number };

/**
 * Animated-feel currency scanning hero illustration.
 * Shows a stylized phone scanning banknotes with detection overlays.
 */
export default function CurrencyHeroSvg({ width = 280, height = 220 }: Props) {
    return (
        <Svg width={width} height={height} viewBox="0 0 280 220">
            <Defs>
                <LinearGradient id="cardGrad" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0" stopColor="#6366F1" stopOpacity="0.15" />
                    <Stop offset="1" stopColor="#A855F7" stopOpacity="0.08" />
                </LinearGradient>
                <LinearGradient id="billGrad1" x1="0" y1="0" x2="1" y2="0.5">
                    <Stop offset="0" stopColor="#10B981" />
                    <Stop offset="1" stopColor="#059669" />
                </LinearGradient>
                <LinearGradient id="billGrad2" x1="0" y1="0" x2="1" y2="0.5">
                    <Stop offset="0" stopColor="#8B5CF6" />
                    <Stop offset="1" stopColor="#6366F1" />
                </LinearGradient>
                <LinearGradient id="billGrad3" x1="0" y1="0" x2="1" y2="0.5">
                    <Stop offset="0" stopColor="#3B82F6" />
                    <Stop offset="1" stopColor="#2563EB" />
                </LinearGradient>
                <LinearGradient id="scanLine" x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0" stopColor="#8B5CF6" stopOpacity="0" />
                    <Stop offset="0.5" stopColor="#8B5CF6" stopOpacity="0.8" />
                    <Stop offset="1" stopColor="#8B5CF6" stopOpacity="0" />
                </LinearGradient>
                <LinearGradient id="glowGrad" x1="0.5" y1="0" x2="0.5" y2="1">
                    <Stop offset="0" stopColor="#8B5CF6" stopOpacity="0.3" />
                    <Stop offset="1" stopColor="#8B5CF6" stopOpacity="0" />
                </LinearGradient>
            </Defs>

            {/* Background glow */}
            <Ellipse cx="140" cy="110" rx="130" ry="100" fill="url(#glowGrad)" />

            {/* ── Scattered bills ── */}
            {/* $20 bill (back, tilted) */}
            <G transform="translate(30, 60) rotate(-8)">
                <Rect width="100" height="55" rx="4" fill="url(#billGrad1)" opacity="0.7" />
                <Rect x="6" y="6" width="88" height="43" rx="2" fill="none" stroke="#FFF" strokeOpacity="0.25" strokeWidth="0.8" />
                <Circle cx="20" cy="27" r="10" fill="#FFF" fillOpacity="0.15" />
                <Path d="M14 27 Q17 20 20 27 Q23 34 26 27" stroke="#FFF" strokeOpacity="0.3" strokeWidth="0.8" fill="none" />
                {/* Dollar sign */}
                <Path d="M74 20 L74 34 M70 23 Q70 20 74 20 Q78 20 78 23 Q78 26 74 27 Q70 28 70 31 Q70 34 74 34 Q78 34 78 31" stroke="#FFF" strokeOpacity="0.4" strokeWidth="1" fill="none" />
                <Rect x="60" y="8" width="30" height="10" rx="2" fill="#FFF" fillOpacity="0.08" />
            </G>

            {/* $10 bill (middle) */}
            <G transform="translate(90, 85) rotate(3)">
                <Rect width="100" height="55" rx="4" fill="url(#billGrad2)" opacity="0.8" />
                <Rect x="6" y="6" width="88" height="43" rx="2" fill="none" stroke="#FFF" strokeOpacity="0.25" strokeWidth="0.8" />
                <Circle cx="80" cy="27" r="10" fill="#FFF" fillOpacity="0.15" />
                {/* Maple leaf hint */}
                <Path d="M76 22 L80 17 L84 22 L82 22 L85 27 L83 27 L86 32 L80 29 L74 32 L77 27 L75 27 L78 22 Z" fill="#FFF" fillOpacity="0.2" />
                <Rect x="10" y="8" width="28" height="10" rx="2" fill="#FFF" fillOpacity="0.08" />
            </G>

            {/* $5 bill (front) */}
            <G transform="translate(150, 55) rotate(6)">
                <Rect width="100" height="55" rx="4" fill="url(#billGrad3)" opacity="0.85" />
                <Rect x="6" y="6" width="88" height="43" rx="2" fill="none" stroke="#FFF" strokeOpacity="0.25" strokeWidth="0.8" />
                <Circle cx="50" cy="27" r="12" fill="#FFF" fillOpacity="0.12" />
                <Circle cx="50" cy="27" r="8" fill="#FFF" fillOpacity="0.08" />
                <Rect x="10" y="8" width="22" height="8" rx="2" fill="#FFF" fillOpacity="0.08" />
                <Rect x="68" y="38" width="22" height="8" rx="2" fill="#FFF" fillOpacity="0.08" />
            </G>

            {/* ── Detection bounding boxes ── */}
            {/* Box around $20 */}
            <G transform="translate(30, 60) rotate(-8)">
                <Rect x="-3" y="-3" width="106" height="61" rx="3" fill="none" stroke="#10B981" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.8" />
                {/* Corner brackets */}
                <Path d="M-3 7 L-3 -3 L7 -3" stroke="#10B981" strokeWidth="2.5" fill="none" />
                <Path d="M99 -3 L106 -3 L106 7" stroke="#10B981" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                <Path d="M106 51 L106 58 L99 58" stroke="#10B981" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                <Path d="M7 58 L-3 58 L-3 51" stroke="#10B981" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                {/* Label */}
                <Rect x="-3" y="-16" width="45" height="13" rx="2" fill="#10B981" />
                <Path d="M2 -6 L6 -6" stroke="#FFF" strokeWidth="1.5" />
            </G>

            {/* Box around $10 */}
            <G transform="translate(90, 85) rotate(3)">
                <Rect x="-3" y="-3" width="106" height="61" rx="3" fill="none" stroke="#8B5CF6" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.8" />
                <Path d="M-3 7 L-3 -3 L7 -3" stroke="#8B5CF6" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                <Path d="M99 -3 L106 -3 L106 7" stroke="#8B5CF6" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                <Path d="M106 51 L106 58 L99 58" stroke="#8B5CF6" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                <Path d="M7 58 L-3 58 L-3 51" stroke="#8B5CF6" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                <Rect x="-3" y="-16" width="45" height="13" rx="2" fill="#8B5CF6" />
            </G>

            {/* Box around $5 */}
            <G transform="translate(150, 55) rotate(6)">
                <Rect x="-3" y="-3" width="106" height="61" rx="3" fill="none" stroke="#3B82F6" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.8" />
                <Path d="M-3 7 L-3 -3 L7 -3" stroke="#3B82F6" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                <Path d="M99 -3 L106 -3 L106 7" stroke="#3B82F6" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                <Path d="M106 51 L106 58 L99 58" stroke="#3B82F6" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                <Path d="M7 58 L-3 58 L-3 51" stroke="#3B82F6" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                <Rect x="-3" y="-16" width="45" height="13" rx="2" fill="#3B82F6" />
            </G>

            {/* ── Floating confidence badges ── */}
            <G transform="translate(10, 42)">
                <Rect width="48" height="16" rx="8" fill="#10B981" />
                <Path d="M8 50 L18 50" stroke="#FFF" strokeWidth="1.5" />
            </G>

            <G transform="translate(220, 130)">
                <Rect width="48" height="16" rx="8" fill="#3B82F6" />
            </G>

            {/* ── Scan line effect ── */}
            <Rect x="20" y="108" width="240" height="2" rx="1" fill="url(#scanLine)" />

            {/* ── Floating particles ── */}
            <Circle cx="25" cy="30" r="2" fill="#8B5CF6" opacity="0.4" />
            <Circle cx="260" cy="45" r="3" fill="#10B981" opacity="0.3" />
            <Circle cx="45" cy="180" r="2.5" fill="#3B82F6" opacity="0.35" />
            <Circle cx="240" cy="190" r="2" fill="#F59E0B" opacity="0.3" />
            <Circle cx="140" cy="15" r="1.5" fill="#8B5CF6" opacity="0.5" />
            <Circle cx="200" cy="200" r="1.5" fill="#10B981" opacity="0.4" />
        </Svg>
    );
}
