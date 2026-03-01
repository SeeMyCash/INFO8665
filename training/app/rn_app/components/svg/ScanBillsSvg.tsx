import React from 'react';
import Svg, { Defs, LinearGradient, Stop, Rect, Circle, Path, G, Ellipse, Line } from 'react-native-svg';

type Props = { width?: number; height?: number };

/**
 * Onboarding slide 1: A phone viewfinder scanning banknotes.
 * Shows a stylised camera frame with bills and detection markers.
 */
export default function ScanBillsSvg({ width = 260, height = 200 }: Props) {
    return (
        <Svg width={width} height={height} viewBox="0 0 260 200">
            <Defs>
                <LinearGradient id="sb_bg" x1="0.5" y1="0" x2="0.5" y2="1">
                    <Stop offset="0" stopColor="#8B5CF6" stopOpacity="0.12" />
                    <Stop offset="1" stopColor="#8B5CF6" stopOpacity="0" />
                </LinearGradient>
                <LinearGradient id="sb_bill" x1="0" y1="0" x2="1" y2="0.5">
                    <Stop offset="0" stopColor="#10B981" />
                    <Stop offset="1" stopColor="#059669" />
                </LinearGradient>
            </Defs>

            <Ellipse cx="130" cy="100" rx="120" ry="90" fill="url(#sb_bg)" />

            {/* Phone frame */}
            <Rect x="55" y="15" width="150" height="170" rx="16" fill="none" stroke="#8B5CF6" strokeWidth="2" strokeOpacity="0.4" />
            <Rect x="60" y="30" width="140" height="140" rx="6" fill="#0F172A" fillOpacity="0.4" />

            {/* Camera dot */}
            <Circle cx="130" cy="22" r="3" fill="#8B5CF6" fillOpacity="0.4" />

            {/* Viewfinder corners */}
            <G stroke="#8B5CF6" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.9">
                <Path d="M75 50 L75 38 L87 38" fill="none" />
                <Path d="M185 38 L197 38 L197 50" fill="none" />
                <Path d="M197 148 L197 160 L185 160" fill="none" />
                <Path d="M75 160 L63 160 L63 148" fill="none" />
            </G>

            {/* Bill 1 (centered, tilted) */}
            <G transform="translate(85, 65) rotate(-5)">
                <Rect width="90" height="50" rx="4" fill="url(#sb_bill)" opacity="0.85" />
                <Rect x="5" y="5" width="80" height="40" rx="2" fill="none" stroke="#FFF" strokeOpacity="0.2" strokeWidth="0.7" />
                <Circle cx="45" cy="25" r="10" fill="#FFF" fillOpacity="0.12" />
                <Circle cx="45" cy="25" r="6" fill="#FFF" fillOpacity="0.08" />
                {/* Maple leaf */}
                <Path d="M42 20 L45 15 L48 20 L46 20 L49 25 L47 25 L50 30 L45 27 L40 30 L43 25 L41 25 L44 20 Z" fill="#FFF" fillOpacity="0.18" />
            </G>

            {/* Bill 2 (behind, tilted other way) */}
            <G transform="translate(95, 90) rotate(4)">
                <Rect width="80" height="44" rx="4" fill="#3B82F6" opacity="0.6" />
                <Rect x="4" y="4" width="72" height="36" rx="2" fill="none" stroke="#FFF" strokeOpacity="0.15" strokeWidth="0.6" />
                <Circle cx="40" cy="22" r="8" fill="#FFF" fillOpacity="0.1" />
            </G>

            {/* Detection marker crosshair */}
            <G transform="translate(118, 75)" stroke="#F59E0B" strokeWidth="1.5" strokeOpacity="0.7">
                <Line x1="-6" y1="0" x2="-2" y2="0" />
                <Line x1="2" y1="0" x2="6" y2="0" />
                <Line x1="0" y1="-6" x2="0" y2="-2" />
                <Line x1="0" y1="2" x2="0" y2="6" />
                <Circle cx="0" cy="0" r="8" fill="none" strokeWidth="1" strokeDasharray="2 2" />
            </G>

            {/* Scan line */}
            <Line x1="68" y1="110" x2="192" y2="110" stroke="#8B5CF6" strokeWidth="1.5" strokeOpacity="0.4" strokeDasharray="4 3" />

            {/* Floating particles */}
            <Circle cx="40" cy="30" r="2" fill="#8B5CF6" opacity="0.3" />
            <Circle cx="220" cy="50" r="2.5" fill="#10B981" opacity="0.3" />
            <Circle cx="30" cy="150" r="1.5" fill="#F59E0B" opacity="0.35" />
            <Circle cx="230" cy="170" r="2" fill="#3B82F6" opacity="0.3" />
        </Svg>
    );
}
