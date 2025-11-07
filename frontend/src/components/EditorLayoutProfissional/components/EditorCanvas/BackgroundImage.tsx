import React from 'react';
import { BackgroundImageSettings } from '../Modals/PageSettingsModal';

interface BackgroundImageProps {
  backgroundImage: BackgroundImageSettings;
  pageSize: { width: number; height: number };
  zoom: number;
  className?: string;
}

const BackgroundImage: React.FC<BackgroundImageProps> = ({
  backgroundImage,
  pageSize,
  zoom,
  className = ''
}) => {
  // Converter mm para pixels (assumindo 96 DPI)
  const mmToPx = (mm: number) => (mm * 96) / 25.4 * zoom;
  
  const pageWidthPx = mmToPx(pageSize.width);
  const pageHeightPx = mmToPx(pageSize.height);

  const getBackgroundSize = () => {
    switch (backgroundImage.repeat) {
      case 'no-repeat':
        return 'cover';
      case 'repeat':
      case 'repeat-x':
      case 'repeat-y':
      default:
        return 'auto';
    }
  };

  const getBackgroundPosition = () => {
    switch (backgroundImage.position) {
      case 'top-left':
        return 'top left';
      case 'top-right':
        return 'top right';
      case 'bottom-left':
        return 'bottom left';
      case 'bottom-right':
        return 'bottom right';
      case 'center':
      default:
        return 'center';
    }
  };

  return (
    <div
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{
        width: pageWidthPx,
        height: pageHeightPx,
        backgroundImage: `url(${backgroundImage.url})`,
        backgroundRepeat: backgroundImage.repeat,
        backgroundPosition: getBackgroundPosition(),
        backgroundSize: getBackgroundSize(),
        opacity: backgroundImage.opacity,
        zIndex: -1 // Ficar atrás de todos os elementos
      }}
    />
  );
};

export default BackgroundImage;