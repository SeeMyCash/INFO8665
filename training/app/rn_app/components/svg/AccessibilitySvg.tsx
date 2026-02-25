import React from 'react';
import Svg, { Defs, LinearGradient, Stop, Rect, Circle, Path, G, Ellipse, Line } from 'react-native-svg';

type Props = { width?: number; height?: number };

/**
 * Accessibility-themed SVG for the About page.
 * Shows a hand holding a phone with speech/sound waves emanating.
 */
export default function AccessibilitySvg({ width = 200, height = 140 }: Props) {
    return (
        <Svg width={width} height={height} viewBox="0 0 200 140">
            <Defs>
                <LinearGradient id="phoneGrad" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor="#6366F1" stopOpacity="0.2" />
                    <Stop offset="1" stopColor="#8B5CF6" stopOpacity="0.1" />
                </LinearGradient>
                <LinearGradient id="waveGrad" x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0" stopColor="#F59E0B" stopOpacity="0.6" />
                    <Stop offset="1" stopColor="#F59E0B" stopOpacity="0" />
                </LinearGradient>
            </Defs>

            {/* Background glow */}
            <Ellipse cx="100" cy="70" rx="90" ry="65" fill="#8B5CF6" fillOpacity="0.04" />

            {/* Phone body */}
            <G transform="translate(60, 15)">
                <Rect width="50" height="90" rx="8" fill="url(#phoneGrad)" stroke="#8B5CF6" strokeWidth="1.2" strokeOpacity="0.4" />
                {/* Screen */}
                <Rect x="4" y="12" width="42" height="62" rx="3" fill="#0F172A" fillOpacity="0.5" stroke="#8B5CF6" strokeWidth="0.6" strokeOpacity="0.2" />
                {/* Camera dot */}
                <Circle cx="25" cy="7" r="2" fill="#8B5CF6" fillOpacity="0.3" />
                {/* Home indicator */}
                <Rect x="17" y="80" width="16" height="3" rx="1.5" fill="#8B5CF6" fillOpacity="0.2" />
                {/* Bill on screen */}
                <G transform="translate(8, 24)">
                    <Rect width="34" height="20" rx="2" fill="#10B981" fillOpacity="0.35" />
                    <Rect x="2" y="2" width="30" height="16" rx="1" fill="none" stroke="#FFF" strokeWidth="0.5" strokeOpacity="0.2" />
                    <Circle cx="17" cy="10" r="4" fill="#FFF" fillOpacity="0.1" />
                </G>
                {/* Detection box on screen */}
                <Rect x="6" y="22" width="38" height="24" rx="2" fill="none" stroke="#10B981" strokeWidth="1" strokeDasharray="2 2" strokeOpacity="0.5" />
                {/* Result text on screen */}
                <Rect x="8" y="52" width="24" height="3" rx="1.5" fill="#FFF" fillOpacity="0.2" />
                <Rect x="8" y="58" width="18" height="3" rx="1.5" fill="#10B981" fillOpacity="0.3" />
                <Rect x="8" y="64" width="28" height="3" rx="1.5" fill="#FFF" fillOpacity="0.15" />
            </G>

            {/* ── Sound waves (TTS output) ── */}
            <G transform="translate(115, 40)">
                {/* Wave arcs */}
                <Path d="M0 20 Q8 10 0 0" fill="none" stroke="#F59E0B" strokeWidth="1.5" strokeOpacity="0.6" strokeLinecap="round" />
                <Path d="M8 25 Q20 10 8 -5" fill="none" stroke="#F59E0B" strokeWidth="1.5" strokeOpacity="0.45" strokeLinecap="round" />
                <Path d="M16 30 Q32 10 16 -10" fill="none" stroke="#F59E0B" strokeWidth="1.5" strokeOpacity="0.3" strokeLinecap="round" />
                <Path d="M24 34 Q44 10 24 -14" fill="none" stroke="#F59E0B" strokeWidth="1.2" strokeOpacity="0.2" strokeLinecap="round" />
            </G>

            {/* ── "$20" floating text ── */}
            <G transform="translate(145, 60)">
                <Rect x="-2" y="-2" width="34" height="18" rx="9" fill="#F59E0B" fillOpacity="0.15" stroke="#F59E0B" strokeWidth="0.8" strokeOpacity="0.3" />
            </G>

            {/* ── Accessibility icon (person) ── */}
            <G transform="translate(25, 35)">
                <Circle cx="15" cy="5" r="5" fill="none" stroke="#8B5CF6" strokeWidth="1.2" strokeOpacity="0.5" />
                <Line x1="15" y1="10" x2="15" y2="35" stroke="#8B5CF6" strokeWidth="1.2" strokeOpacity="0.5" />
                <Line x1="5" y1="20" x2="25" y2="20" stroke="#8B5CF6" strokeWidth="1.2" strokeOpacity="0.5" />
                <Line x1="15" y1="35" x2="5" y2="50" stroke="#8B5CF6" strokeWidth="1.2" strokeOpacity="0.5" />
                <Line x1="15" y1="35" x2="25" y2="50" stroke="#8B5CF6" strokeWidth="1.2" strokeOpacity="0.5" />
            </G>

            {/* Particles */}
            <Circle cx="15" cy="15" r="1.5" fill="#8B5CF6" opacity="0.3" />
            <Circle cx="185" cy="25" r="2" fill="#F59E0B" opacity="0.3" />
            <Circle cx="170" cy="120" r="1.5" fill="#10B981" opacity="0.3" />
        </Svg>
    );
}
