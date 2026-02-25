import React from 'react';
import Svg, { Defs, LinearGradient, Stop, Rect, Circle, Path, G, Ellipse, Line, Polygon } from 'react-native-svg';

type Props = { width?: number; height?: number };

/**
 * Onboarding slide 2: Bills being sorted into denomination categories.
 * Shows bills fanning out with classification labels.
 */
export default function ClassifyBillsSvg({ width = 260, height = 200 }: Props) {
    const bills = [
        { x: 35, y: 50, rot: -15, color: '#10B981', label: '$5' },
        { x: 85, y: 40, rot: -5, color: '#8B5CF6', label: '$10' },
        { x: 130, y: 35, rot: 3, color: '#3B82F6', label: '$20' },
        { x: 170, y: 45, rot: 12, color: '#F59E0B', label: '$50' },
    ];

    return (
        <Svg width={width} height={height} viewBox="0 0 260 200">
            <Defs>
                <LinearGradient id="cb_bg" x1="0.5" y1="0" x2="0.5" y2="1">
                    <Stop offset="0" stopColor="#10B981" stopOpacity="0.1" />
                    <Stop offset="1" stopColor="#10B981" stopOpacity="0" />
                </LinearGradient>
            </Defs>

            <Ellipse cx="130" cy="100" rx="120" ry="90" fill="url(#cb_bg)" />

            {/* Classification fan of bills */}
            {bills.map((b, i) => (
                <G key={i} transform={`translate(${b.x}, ${b.y}) rotate(${b.rot})`}>
                    {/* Bill */}
                    <Rect width="70" height="40" rx="3" fill={b.color} opacity="0.75" />
                    <Rect x="3" y="3" width="64" height="34" rx="2" fill="none" stroke="#FFF" strokeOpacity="0.2" strokeWidth="0.6" />
                    <Circle cx="35" cy="20" r="7" fill="#FFF" fillOpacity="0.1" />

                    {/* Classification label badge */}
                    <G transform="translate(18, -12)">
                        <Rect width="34" height="16" rx="8" fill={b.color} />
                        <Rect width="34" height="16" rx="8" fill="#FFF" fillOpacity="0.15" />
                    </G>
                </G>
            ))}

            {/* Confidence bars below */}
            <G transform="translate(50, 140)">
                {bills.map((b, i) => (
                    <G key={i} transform={`translate(${i * 45}, 0)`}>
                        <Rect width="35" height="6" rx="3" fill="#1E293B" />
                        <Rect width={`${25 + Math.random() * 10}`} height="6" rx="3" fill={b.color} opacity="0.8" />
                        <Rect y="10" width="35" height="3" rx="1.5" fill="#FFF" fillOpacity="0.08" />
                    </G>
                ))}
            </G>

            {/* Arrow pointing down to bars */}
            <G transform="translate(125, 115)">
                <Line x1="0" y1="0" x2="0" y2="16" stroke="#10B981" strokeWidth="1.5" strokeOpacity="0.5" />
                <Polygon points="-4,14 0,20 4,14" fill="#10B981" fillOpacity="0.5" />
            </G>

            {/* Check mark */}
            <G transform="translate(210, 50)">
                <Circle cx="0" cy="0" r="14" fill="#10B981" fillOpacity="0.15" />
                <Path d="M-6 0 L-2 4 L6 -4" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </G>

            {/* Floating particles */}
            <Circle cx="20" cy="25" r="2" fill="#10B981" opacity="0.3" />
            <Circle cx="245" cy="35" r="2" fill="#F59E0B" opacity="0.3" />
            <Circle cx="15" cy="170" r="1.5" fill="#8B5CF6" opacity="0.3" />
        </Svg>
    );
}
