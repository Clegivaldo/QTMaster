import { useState, useCallback } from 'react';
import { PageSettings, BackgroundImageSettings } from '../components/EditorLayoutProfissional/components/Modals/PageSettingsModal';

interface UsePageSettingsReturn {
  pageSettings: PageSettings;
  backgroundImage: BackgroundImageSettings | null;
  updatePageSettings: (settings: PageSettings) => void;
  updateBackgroundImage: (image: BackgroundImageSettings | null) => void;
  getPageSize: () => { width: number; height: number };
  getPageBounds: () => { minX: number; maxX: number; minY: number; maxY: number };
  resetToDefaults: () => void;
}

const DEFAULT_PAGE_SETTINGS: PageSettings = {
  size: 'A4',
  orientation: 'portrait',
  margins: { top: 20, right: 20, bottom: 20, left: 20 },
  backgroundColor: '#ffffff',
  showMargins: true
};

const PAGE_SIZES = {
  A4: { width: 210, height: 297 },
  A3: { width: 297, height: 420 },
  Letter: { width: 216, height: 279 },
  Legal: { width: 216, height: 356 }
};

export const usePageSettings = (initialSettings?: PageSettings, initialBackgroundImage?: BackgroundImageSettings | null): UsePageSettingsReturn => {
  const [pageSettings, setPageSettings] = useState<PageSettings>(initialSettings || DEFAULT_PAGE_SETTINGS);
  const [backgroundImage, setBackgroundImage] = useState<BackgroundImageSettings | null>(initialBackgroundImage || null);

  const updatePageSettings = useCallback((settings: PageSettings) => {
    setPageSettings(settings);
  }, []);

  const updateBackgroundImage = useCallback((image: BackgroundImageSettings | null) => {
    // Limpar URL anterior se for blob
    if (backgroundImage?.url.startsWith('blob:') && image?.url !== backgroundImage.url) {
      URL.revokeObjectURL(backgroundImage.url);
    }
    setBackgroundImage(image);
  }, [backgroundImage]);

  const getPageSize = useCallback((): { width: number; height: number } => {
    let size;
    
    if (pageSettings.size === 'Custom' && pageSettings.customSize) {
      size = pageSettings.customSize;
    } else {
      // pageSettings.size may include 'Custom' which isn't a key of PAGE_SIZES
      size = PAGE_SIZES[pageSettings.size as keyof typeof PAGE_SIZES] || PAGE_SIZES.A4;
    }
    
    // Aplicar orientação
    if (pageSettings.orientation === 'landscape') {
      return { width: size.height, height: size.width };
    }
    
    return size;
  }, [pageSettings]);

  const getPageBounds = useCallback(() => {
    const pageSize = getPageSize();
    const margins = pageSettings.margins;
    
    return {
      minX: margins.left,
      maxX: pageSize.width - margins.right,
      minY: margins.top,
      maxY: pageSize.height - margins.bottom
    };
  }, [pageSettings, getPageSize]);

  const resetToDefaults = useCallback(() => {
    setPageSettings(DEFAULT_PAGE_SETTINGS);
    if (backgroundImage?.url.startsWith('blob:')) {
      URL.revokeObjectURL(backgroundImage.url);
    }
    setBackgroundImage(null);
  }, [backgroundImage]);

  return {
    pageSettings,
    backgroundImage,
    updatePageSettings,
    updateBackgroundImage,
    getPageSize,
    getPageBounds,
    resetToDefaults
  };
};