import React from 'react';
import Svg, { Defs, LinearGradient, Stop, Rect, Circle, Path, G, Ellipse, Line } from 'react-native-svg';

type Props = { width?: number; height?: number };

/**
 * Onboarding slide 3: Speaker/sound announcing a dollar total.
 * Shows a speaker icon with radiating sound waves and a floating "$35" text badge.
 */
export default function AnnounceTotalSvg({ width = 260, height = 200 }: Props) {
    return (
        <Svg width={width} height={height} viewBox="0 0 260 200">
            <Defs>
                <LinearGradient id="at_bg" x1="0.5" y1="0" x2="0.5" y2="1">
                    <Stop offset="0" stopColor="#F59E0B" stopOpacity="0.1" />
                    <Stop offset="1" stopColor="#F59E0B" stopOpacity="0" />
                </LinearGradient>
                <LinearGradient id="at_speaker" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0" stopColor="#F59E0B" stopOpacity="0.3" />
                    <Stop offset="1" stopColor="#D97706" stopOpacity="0.15" />
                </LinearGradient>
            </Defs>

            <Ellipse cx="130" cy="100" rx="120" ry="90" fill="url(#at_bg)" />

            {/* Speaker body */}
            <G transform="translate(60, 55)">
                <Rect width="40" height="50" rx="8" fill="url(#at_speaker)" stroke="#F59E0B" strokeWidth="1.5" strokeOpacity="0.4" />
                {/* Speaker cone */}
                <G transform="translate(8, 10)">
                    <Circle cx="12" cy="15" r="12" fill="none" stroke="#F59E0B" strokeWidth="1.5" strokeOpacity="0.6" />
                    <Circle cx="12" cy="15" r="6" fill="#F59E0B" fillOpacity="0.25" />
                    <Circle cx="12" cy="15" r="2.5" fill="#F59E0B" fillOpacity="0.5" />
                </G>
            </G>

            {/* Sound waves */}
            <G transform="translate(105, 60)">
                <Path d="M0 20 Q12 8 0 -4" fill="none" stroke="#F59E0B" strokeWidth="2" strokeOpacity="0.7" strokeLinecap="round" />
                <Path d="M10 28 Q26 8 10 -12" fill="none" stroke="#F59E0B" strokeWidth="2" strokeOpacity="0.5" strokeLinecap="round" />
                <Path d="M20 36 Q40 8 20 -20" fill="none" stroke="#F59E0B" strokeWidth="1.8" strokeOpacity="0.35" strokeLinecap="round" />
                <Path d="M30 42 Q54 8 30 -26" fill="none" stroke="#F59E0B" strokeWidth="1.5" strokeOpacity="0.2" strokeLinecap="round" />
            </G>

            {/* Floating total badge */}
            <G transform="translate(155, 48)">
                <Rect width="72" height="36" rx="18" fill="#F59E0B" fillOpacity="0.2" stroke="#F59E0B" strokeWidth="1.2" strokeOpacity="0.5" />
                {/* Dollar sign hint */}
                <G transform="translate(14, 8)">
                    <Path d="M4 0 L4 20 M0 4 Q0 0 4 0 Q8 0 8 4 Q8 8 4 10 Q0 12 0 16 Q0 20 4 20 Q8 20 8 16" stroke="#F59E0B" strokeWidth="1.5" fill="none" strokeOpacity="0.7" />
                </G>
                {/* "35" bars hint */}
                <Rect x="30" y="10" width="26" height="5" rx="2.5" fill="#F59E0B" fillOpacity="0.5" />
                <Rect x="30" y="20" width="18" height="4" rx="2" fill="#F59E0B" fillOpacity="0.3" />
            </G>

            {/* Small bills below speaker showing what was counted */}
            <G transform="translate(55, 125)">
                <Rect width="40" height="22" rx="2" fill="#10B981" opacity="0.4" />
                <Rect x="3" y="3" width="34" height="16" rx="1" fill="none" stroke="#FFF" strokeOpacity="0.15" strokeWidth="0.5" />
            </G>
            <G transform="translate(100, 128) rotate(5)">
                <Rect width="40" height="22" rx="2" fill="#8B5CF6" opacity="0.4" />
                <Rect x="3" y="3" width="34" height="16" rx="1" fill="none" stroke="#FFF" strokeOpacity="0.15" strokeWidth="0.5" />
            </G>
            <G transform="translate(145, 125) rotate(-3)">
                <Rect width="40" height="22" rx="2" fill="#3B82F6" opacity="0.4" />
                <Rect x="3" y="3" width="34" height="16" rx="1" fill="none" stroke="#FFF" strokeOpacity="0.15" strokeWidth="0.5" />
            </G>

            {/* Accessibility icon */}
            <G transform="translate(200, 120)" opacity="0.35">
                <Circle cx="8" cy="0" r="4" fill="none" stroke="#F59E0B" strokeWidth="1" />
                <Line x1="8" y1="4" x2="8" y2="20" stroke="#F59E0B" strokeWidth="1" />
                <Line x1="0" y1="10" x2="16" y2="10" stroke="#F59E0B" strokeWidth="1" />
                <Line x1="8" y1="20" x2="2" y2="30" stroke="#F59E0B" strokeWidth="1" />
                <Line x1="8" y1="20" x2="14" y2="30" stroke="#F59E0B" strokeWidth="1" />
            </G>

            {/* Particles */}
            <Circle cx="30" cy="40" r="2" fill="#F59E0B" opacity="0.3" />
            <Circle cx="240" cy="30" r="2.5" fill="#8B5CF6" opacity="0.25" />
            <Circle cx="20" cy="165" r="1.5" fill="#10B981" opacity="0.3" />
            <Circle cx="245" cy="175" r="2" fill="#F59E0B" opacity="0.25" />
        </Svg>
    );
}
