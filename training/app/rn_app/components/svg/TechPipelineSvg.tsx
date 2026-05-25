import React from 'react';
import Svg, { Defs, LinearGradient, Stop, Rect, Circle, Path, G, Ellipse, Line, Polygon } from 'react-native-svg';
import { colors } from '../../theme';

type Props = { width?: number; height?: number };

/**
 * Tech pipeline illustration for the About page.
 * Shows a stylized flow: Camera → Neural Net → Results.
 */
export default function TechPipelineSvg({ width = 320, height = 180 }: Props) {
    return (
        <Svg width={width} height={height} viewBox="0 0 320 180">
            <Defs>
                <LinearGradient id="nodeGrad1" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0" stopColor="#6366F1" stopOpacity="0.25" />
                    <Stop offset="1" stopColor="#8B5CF6" stopOpacity="0.1" />
                </LinearGradient>
                <LinearGradient id="nodeGrad2" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0" stopColor="#10B981" stopOpacity="0.25" />
                    <Stop offset="1" stopColor="#059669" stopOpacity="0.1" />
                </LinearGradient>
                <LinearGradient id="nodeGrad3" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0" stopColor="#F59E0B" stopOpacity="0.25" />
                    <Stop offset="1" stopColor="#D97706" stopOpacity="0.1" />
                </LinearGradient>
                <LinearGradient id="arrowGrad" x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0" stopColor="#8B5CF6" stopOpacity="0.6" />
                    <Stop offset="1" stopColor="#10B981" stopOpacity="0.6" />
                </LinearGradient>
                <LinearGradient id="bgGlow" x1="0.5" y1="0" x2="0.5" y2="1">
                    <Stop offset="0" stopColor="#6366F1" stopOpacity="0.08" />
                    <Stop offset="1" stopColor="#6366F1" stopOpacity="0" />
                </LinearGradient>
            </Defs>

            {/* Background glow */}
            <Ellipse cx="160" cy="90" rx="155" ry="85" fill="url(#bgGlow)" />

            {/* ── Node 1: Camera / Input ── */}
            <G transform="translate(30, 50)">
                <Rect width="72" height="72" rx="16" fill="url(#nodeGrad1)" stroke="#6366F1" strokeWidth="1" strokeOpacity="0.3" />
                {/* Camera icon */}
                <G transform="translate(18, 18)">
                    <Rect x="0" y="8" width="36" height="26" rx="4" fill="none" stroke="#8B5CF6" strokeWidth="1.5" />
                    <Circle cx="18" cy="21" r="8" fill="none" stroke="#8B5CF6" strokeWidth="1.5" />
                    <Circle cx="18" cy="21" r="3" fill="#8B5CF6" fillOpacity="0.3" />
                    <Rect x="10" y="5" width="16" height="6" rx="2" fill="none" stroke="#8B5CF6" strokeWidth="1" />
                </G>
                {/* Label */}
                <Rect x="4" y="76" width="64" height="18" rx="9" fill="#6366F1" fillOpacity="0.15" />
            </G>

            {/* ── Arrow 1 ── */}
            <G>
                <Line x1="108" y1="86" x2="120" y2="86" stroke="#8B5CF6" strokeWidth="1.5" strokeOpacity="0.5" />
                <Line x1="120" y1="86" x2="136" y2="86" stroke="#8B5CF6" strokeWidth="1.5" strokeOpacity="0.5" strokeDasharray="3 2" />
                {/* Arrowhead */}
                <Polygon points="133,82 140,86 133,90" fill="#8B5CF6" fillOpacity="0.5" />
                {/* Data dots flowing */}
                <Circle cx="114" cy="86" r="2" fill="#8B5CF6" opacity="0.7" />
                <Circle cx="124" cy="86" r="1.5" fill="#8B5CF6" opacity="0.5" />
            </G>

            {/* ── Node 2: Neural Network / YOLO ── */}
            <G transform="translate(140, 40)">
                <Rect width="80" height="80" rx="16" fill="url(#nodeGrad2)" stroke="#10B981" strokeWidth="1" strokeOpacity="0.3" />
                {/* Neural network icon — nodes + connections */}
                <G transform="translate(16, 14)">
                    {/* Input layer */}
                    <Circle cx="4" cy="10" r="4" fill="none" stroke="#10B981" strokeWidth="1.2" />
                    <Circle cx="4" cy="26" r="4" fill="none" stroke="#10B981" strokeWidth="1.2" />
                    <Circle cx="4" cy="42" r="4" fill="none" stroke="#10B981" strokeWidth="1.2" />
                    {/* Hidden layer */}
                    <Circle cx="24" cy="14" r="4" fill="#10B981" fillOpacity="0.3" stroke="#10B981" strokeWidth="1.2" />
                    <Circle cx="24" cy="30" r="4" fill="#10B981" fillOpacity="0.3" stroke="#10B981" strokeWidth="1.2" />
                    <Circle cx="24" cy="46" r="4" fill="#10B981" fillOpacity="0.3" stroke="#10B981" strokeWidth="1.2" />
                    {/* Output layer */}
                    <Circle cx="44" cy="18" r="4" fill="#10B981" fillOpacity="0.5" stroke="#10B981" strokeWidth="1.2" />
                    <Circle cx="44" cy="38" r="4" fill="#10B981" fillOpacity="0.5" stroke="#10B981" strokeWidth="1.2" />
                    {/* Connections */}
                    <Line x1="8" y1="10" x2="20" y2="14" stroke="#10B981" strokeWidth="0.6" strokeOpacity="0.4" />
                    <Line x1="8" y1="10" x2="20" y2="30" stroke="#10B981" strokeWidth="0.6" strokeOpacity="0.3" />
                    <Line x1="8" y1="26" x2="20" y2="14" stroke="#10B981" strokeWidth="0.6" strokeOpacity="0.3" />
                    <Line x1="8" y1="26" x2="20" y2="30" stroke="#10B981" strokeWidth="0.6" strokeOpacity="0.4" />
                    <Line x1="8" y1="26" x2="20" y2="46" stroke="#10B981" strokeWidth="0.6" strokeOpacity="0.3" />
                    <Line x1="8" y1="42" x2="20" y2="30" stroke="#10B981" strokeWidth="0.6" strokeOpacity="0.3" />
                    <Line x1="8" y1="42" x2="20" y2="46" stroke="#10B981" strokeWidth="0.6" strokeOpacity="0.4" />
                    <Line x1="28" y1="14" x2="40" y2="18" stroke="#10B981" strokeWidth="0.6" strokeOpacity="0.5" />
                    <Line x1="28" y1="14" x2="40" y2="38" stroke="#10B981" strokeWidth="0.6" strokeOpacity="0.3" />
                    <Line x1="28" y1="30" x2="40" y2="18" stroke="#10B981" strokeWidth="0.6" strokeOpacity="0.4" />
                    <Line x1="28" y1="30" x2="40" y2="38" stroke="#10B981" strokeWidth="0.6" strokeOpacity="0.4" />
                    <Line x1="28" y1="46" x2="40" y2="18" stroke="#10B981" strokeWidth="0.6" strokeOpacity="0.3" />
                    <Line x1="28" y1="46" x2="40" y2="38" stroke="#10B981" strokeWidth="0.6" strokeOpacity="0.5" />
                </G>
                {/* Label */}
                <Rect x="8" y="84" width="64" height="18" rx="9" fill="#10B981" fillOpacity="0.15" />
            </G>

            {/* ── Arrow 2 ── */}
            <G>
                <Line x1="226" y1="80" x2="238" y2="80" stroke="#10B981" strokeWidth="1.5" strokeOpacity="0.5" />
                <Line x1="238" y1="80" x2="252" y2="80" stroke="#10B981" strokeWidth="1.5" strokeOpacity="0.5" strokeDasharray="3 2" />
                <Polygon points="249,76 256,80 249,84" fill="#10B981" fillOpacity="0.5" />
                <Circle cx="232" cy="80" r="2" fill="#10B981" opacity="0.7" />
                <Circle cx="242" cy="80" r="1.5" fill="#10B981" opacity="0.5" />
            </G>

            {/* ── Node 3: Results / Output ── */}
            <G transform="translate(256, 44)">
                <Rect width="56" height="72" rx="12" fill="url(#nodeGrad3)" stroke="#F59E0B" strokeWidth="1" strokeOpacity="0.3" />
                {/* Results icon — checklist */}
                <G transform="translate(12, 12)">
                    {/* Line items */}
                    <Rect x="0" y="0" width="32" height="4" rx="2" fill="#F59E0B" fillOpacity="0.5" />
                    <Rect x="0" y="10" width="26" height="4" rx="2" fill="#F59E0B" fillOpacity="0.4" />
                    <Rect x="0" y="20" width="30" height="4" rx="2" fill="#F59E0B" fillOpacity="0.35" />
                    <Rect x="0" y="30" width="20" height="4" rx="2" fill="#F59E0B" fillOpacity="0.3" />
                    {/* Dollar sign */}
                    <G transform="translate(10, 38)">
                        <Path d="M4 0 L4 14 M0 3 Q0 0 4 0 Q8 0 8 3 Q8 6 4 7 Q0 8 0 11 Q0 14 4 14 Q8 14 8 11" stroke="#F59E0B" strokeWidth="1.2" fill="none" strokeOpacity="0.6" />
                    </G>
                </G>
                {/* Label */}
                <Rect x="-2" y="76" width="60" height="18" rx="9" fill="#F59E0B" fillOpacity="0.15" />
            </G>

            {/* ── Decorative particles ── */}
            <Circle cx="20" cy="20" r="2" fill="#8B5CF6" opacity="0.3" />
            <Circle cx="300" cy="30" r="2.5" fill="#F59E0B" opacity="0.3" />
            <Circle cx="160" cy="10" r="1.5" fill="#10B981" opacity="0.4" />
            <Circle cx="80" cy="160" r="2" fill="#6366F1" opacity="0.25" />
            <Circle cx="280" cy="165" r="1.5" fill="#10B981" opacity="0.3" />
        </Svg>
    );
}
