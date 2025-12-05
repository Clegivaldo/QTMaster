import React from 'react';

interface MarginGuidesProps {
    margins: {
        top: number;
        right: number;
        bottom: number;
        left: number;
    };
    pageWidth: number;
    pageHeight: number;
    showGuides?: boolean;
}

/**
 * Visual margin guides overlay for the editor canvas.
 * Displays dashed lines indicating where content margins are.
 */
export const MarginGuides: React.FC<MarginGuidesProps> = ({
    margins,
    pageWidth,
    pageHeight,
    showGuides = true,
}) => {
    if (!showGuides) return null;

    // Convert mm to pixels (assuming ~3.78 px/mm at 96 DPI)
    const pxPerMm = 3.78;
    const topPx = margins.top * pxPerMm;
    const rightPx = margins.right * pxPerMm;
    const bottomPx = margins.bottom * pxPerMm;
    const leftPx = margins.left * pxPerMm;

    const guideStyle = {
        position: 'absolute' as const,
        borderColor: 'rgba(59, 130, 246, 0.3)',
        borderStyle: 'dashed',
        pointerEvents: 'none' as const,
        zIndex: 10,
    };

    return (
        <>
            {/* Top margin line */}
            <div
                style={{
                    ...guideStyle,
                    top: topPx,
                    left: 0,
                    right: 0,
                    borderTopWidth: 1,
                }}
            />
            {/* Bottom margin line */}
            <div
                style={{
                    ...guideStyle,
                    bottom: bottomPx,
                    left: 0,
                    right: 0,
                    borderBottomWidth: 1,
                }}
            />
            {/* Left margin line */}
            <div
                style={{
                    ...guideStyle,
                    top: 0,
                    bottom: 0,
                    left: leftPx,
                    borderLeftWidth: 1,
                }}
            />
            {/* Right margin line */}
            <div
                style={{
                    ...guideStyle,
                    top: 0,
                    bottom: 0,
                    right: rightPx,
                    borderRightWidth: 1,
                }}
            />
            {/* Corner labels */}
            <div
                style={{
                    position: 'absolute',
                    top: 2,
                    left: leftPx + 4,
                    fontSize: '9px',
                    color: 'rgba(59, 130, 246, 0.6)',
                    pointerEvents: 'none',
                    zIndex: 11,
                }}
            >
                {margins.top}mm
            </div>
            <div
                style={{
                    position: 'absolute',
                    top: topPx + 4,
                    left: 2,
                    fontSize: '9px',
                    color: 'rgba(59, 130, 246, 0.6)',
                    pointerEvents: 'none',
                    zIndex: 11,
                    writingMode: 'vertical-rl',
                    transform: 'rotate(180deg)',
                }}
            >
                {margins.left}mm
            </div>
        </>
    );
};

export default MarginGuides;
