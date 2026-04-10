import React from 'react';
import Svg, { Defs, LinearGradient, Stop, Rect, Circle, Path, G, Ellipse, Line } from 'react-native-svg';

type Props = { width?: number; height?: number };

/**
 * Onboarding slide 4: Voice commands — microphone with speech-bubble command chips.
 * Accent colour: indigo / violet (#6366F1).
 */
export default function VoiceCommandsSvg({ width = 260, height = 200 }: Props) {
    const accent = '#6366F1';
    const accentLight = '#818CF8';

    return (
        <Svg width={width} height={height} viewBox="0 0 260 200">
            <Defs>
                <LinearGradient id="vc_bg" x1="0.5" y1="0" x2="0.5" y2="1">
                    <Stop offset="0" stopColor={accent} stopOpacity="0.12" />
                    <Stop offset="1" stopColor={accent} stopOpacity="0" />
                </LinearGradient>
                <LinearGradient id="vc_mic" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0" stopColor={accentLight} stopOpacity="0.4" />
                    <Stop offset="1" stopColor={accent} stopOpacity="0.2" />
                </LinearGradient>
            </Defs>

            {/* Background glow */}
            <Ellipse cx="130" cy="100" rx="118" ry="88" fill="url(#vc_bg)" />

            {/* Microphone body */}
            <G transform="translate(106, 30)">
                {/* Mic capsule */}
                <Rect x="6" y="0" width="36" height="58" rx="18"
                    fill="url(#vc_mic)" stroke={accent} strokeWidth="2" strokeOpacity="0.6" />
                {/* Mic grille lines */}
                <Line x1="13" y1="20" x2="37" y2="20" stroke={accent} strokeWidth="1.2" strokeOpacity="0.35" />
                <Line x1="13" y1="28" x2="37" y2="28" stroke={accent} strokeWidth="1.2" strokeOpacity="0.35" />
                <Line x1="13" y1="36" x2="37" y2="36" stroke={accent} strokeWidth="1.2" strokeOpacity="0.35" />
                {/* Mic stand arc */}
                <Path d="M0 52 Q0 80 24 80 Q48 80 48 52"
                    fill="none" stroke={accent} strokeWidth="2.2" strokeOpacity="0.7" strokeLinecap="round" />
                {/* Stand stem */}
                <Line x1="24" y1="80" x2="24" y2="96" stroke={accent} strokeWidth="2.2" strokeOpacity="0.7" strokeLinecap="round" />
                {/* Base */}
                <Line x1="10" y1="96" x2="38" y2="96" stroke={accent} strokeWidth="2.5" strokeOpacity="0.6" strokeLinecap="round" />
            </G>

            {/* Sound rings around mic */}
            <Circle cx="130" cy="62" r="38" fill="none" stroke={accent} strokeWidth="1.5" strokeOpacity="0.18" />
            <Circle cx="130" cy="62" r="52" fill="none" stroke={accent} strokeWidth="1" strokeOpacity="0.1" />

            {/* Command chips — left */}
            <G transform="translate(18, 58)">
                <Rect width="62" height="26" rx="13"
                    fill={accent} fillOpacity="0.15" stroke={accent} strokeWidth="1.2" strokeOpacity="0.5" />
                {/* "Go Live" label bars */}
                <Rect x="10" y="9" width="20" height="4" rx="2" fill={accent} fillOpacity="0.55" />
                <Rect x="34" y="9" width="18" height="4" rx="2" fill={accent} fillOpacity="0.35" />
            </G>
            <G transform="translate(10, 94)">
                <Rect width="58" height="26" rx="13"
                    fill={accent} fillOpacity="0.12" stroke={accent} strokeWidth="1.2" strokeOpacity="0.4" />
                {/* "Flip" label bar */}
                <Rect x="10" y="9" width="16" height="4" rx="2" fill={accent} fillOpacity="0.45" />
                <Rect x="30" y="9" width="20" height="4" rx="2" fill={accent} fillOpacity="0.25" />
            </G>

            {/* Command chips — right */}
            <G transform="translate(180, 50)">
                <Rect width="62" height="26" rx="13"
                    fill={accent} fillOpacity="0.15" stroke={accent} strokeWidth="1.2" strokeOpacity="0.5" />
                <Rect x="10" y="9" width="14" height="4" rx="2" fill={accent} fillOpacity="0.55" />
                <Rect x="28" y="9" width="24" height="4" rx="2" fill={accent} fillOpacity="0.35" />
            </G>
            <G transform="translate(186, 86)">
                <Rect width="58" height="26" rx="13"
                    fill={accent} fillOpacity="0.12" stroke={accent} strokeWidth="1.2" strokeOpacity="0.4" />
                <Rect x="10" y="9" width="18" height="4" rx="2" fill={accent} fillOpacity="0.45" />
                <Rect x="32" y="9" width="16" height="4" rx="2" fill={accent} fillOpacity="0.25" />
            </G>

            {/* Keyboard shortcut chip at bottom-centre */}
            <G transform="translate(90, 150)">
                <Rect width="80" height="28" rx="7"
                    fill={accent} fillOpacity="0.13" stroke={accent} strokeWidth="1" strokeOpacity="0.45" />
                {/* Key cap shapes */}
                <Rect x="10" y="7" width="14" height="14" rx="3" fill={accent} fillOpacity="0.3" />
                <Rect x="32" y="7" width="14" height="14" rx="3" fill={accent} fillOpacity="0.2" />
                <Rect x="54" y="7" width="14" height="14" rx="3" fill={accent} fillOpacity="0.2" />
            </G>

            {/* Particles */}
            <Circle cx="28"  cy="36"  r="2.5" fill={accent} opacity="0.28" />
            <Circle cx="238" cy="42"  r="2"   fill={accentLight} opacity="0.25" />
            <Circle cx="18"  cy="162" r="1.8" fill={accent} opacity="0.22" />
            <Circle cx="242" cy="168" r="2.5" fill={accentLight} opacity="0.2" />
        </Svg>
    );
}
