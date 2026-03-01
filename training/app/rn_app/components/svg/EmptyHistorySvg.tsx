import React from 'react';
import Svg, { Defs, LinearGradient, Stop, Rect, Circle, Path, G, Ellipse, Line } from 'react-native-svg';

type Props = { width?: number; height?: number };

/**
 * Empty-state illustration for the History page.
 * A ghost/transparent bill with a clock overlay, conveying "no history yet".
 */
export default function EmptyHistorySvg({ width = 200, height = 160 }: Props) {
    return (
        <Svg width={width} height={height} viewBox="0 0 200 160">
            <Defs>
                <LinearGradient id="eh_bg" x1="0.5" y1="0" x2="0.5" y2="1">
                    <Stop offset="0" stopColor="#6366F1" stopOpacity="0.08" />
                    <Stop offset="1" stopColor="#6366F1" stopOpacity="0" />
                </LinearGradient>
            </Defs>

            <Ellipse cx="100" cy="80" rx="90" ry="70" fill="url(#eh_bg)" />

            {/* Ghost bill stack */}
            <G transform="translate(50, 30) rotate(-3)">
                <Rect width="100" height="55" rx="5" fill="#334155" fillOpacity="0.3" stroke="#475569" strokeWidth="1" strokeOpacity="0.3" strokeDasharray="4 3" />
                <Rect x="5" y="5" width="90" height="45" rx="3" fill="none" stroke="#475569" strokeOpacity="0.2" strokeWidth="0.6" />
                <Circle cx="50" cy="27" r="12" fill="#475569" fillOpacity="0.15" />
                <Circle cx="50" cy="27" r="7" fill="#475569" fillOpacity="0.1" />
                {/* Dollar sign ghost */}
                <Path d="M48 20 L48 34 M44 23 Q44 20 48 20 Q52 20 52 23 Q52 26 48 27 Q44 28 44 31 Q44 34 48 34 Q52 34 52 31" stroke="#475569" strokeWidth="1" fill="none" strokeOpacity="0.3" />
            </G>

            {/* Second ghost bill behind */}
            <G transform="translate(55, 38) rotate(2)">
                <Rect width="90" height="48" rx="4" fill="#334155" fillOpacity="0.15" stroke="#475569" strokeWidth="0.8" strokeOpacity="0.2" strokeDasharray="4 3" />
            </G>

            {/* Clock overlay */}
            <G transform="translate(120, 60)">
                <Circle cx="0" cy="0" r="22" fill="#1E293B" fillOpacity="0.8" stroke="#8B5CF6" strokeWidth="1.5" strokeOpacity="0.5" />
                <Circle cx="0" cy="0" r="18" fill="none" stroke="#8B5CF6" strokeWidth="0.5" strokeOpacity="0.3" />
                {/* Hour marks */}
                {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
                    <Line
                        key={deg}
                        x1={Math.cos((deg * Math.PI) / 180) * 15}
                        y1={Math.sin((deg * Math.PI) / 180) * 15}
                        x2={Math.cos((deg * Math.PI) / 180) * 17}
                        y2={Math.sin((deg * Math.PI) / 180) * 17}
                        stroke="#8B5CF6"
                        strokeWidth={deg % 90 === 0 ? 1.5 : 0.8}
                        strokeOpacity="0.5"
                    />
                ))}
                {/* Hands */}
                <Line x1="0" y1="0" x2="0" y2="-10" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.7" />
                <Line x1="0" y1="0" x2="8" y2="-3" stroke="#8B5CF6" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.5" />
                <Circle cx="0" cy="0" r="2" fill="#8B5CF6" fillOpacity="0.6" />
            </G>

            {/* Dashed path connecting bills to clock */}
            <Path d="M120 85 Q130 100 115 110" fill="none" stroke="#475569" strokeWidth="1" strokeDasharray="3 3" strokeOpacity="0.3" />

            {/* Particles */}
            <Circle cx="30" cy="20" r="2" fill="#8B5CF6" opacity="0.2" />
            <Circle cx="170" cy="25" r="1.5" fill="#6366F1" opacity="0.25" />
            <Circle cx="25" cy="130" r="2" fill="#475569" opacity="0.2" />
            <Circle cx="180" cy="140" r="1.5" fill="#8B5CF6" opacity="0.2" />
        </Svg>
    );
}
