import { useState, useEffect } from 'react';

interface BreakpointConfig {
  sm: number;
  md: number;
  lg: number;
  xl: number;
  '2xl': number;
}

const defaultBreakpoints: BreakpointConfig = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

export const useResponsive = (breakpoints: Partial<BreakpointConfig> = {}) => {
  const config = { ...defaultBreakpoints, ...breakpoints };
  
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowSize.width < config.sm;
  const isTablet = windowSize.width >= config.sm && windowSize.width < config.lg;
  const isDesktop = windowSize.width >= config.lg;
  const isLargeDesktop = windowSize.width >= config.xl;

  const breakpoint = (() => {
    if (windowSize.width >= config['2xl']) return '2xl';
    if (windowSize.width >= config.xl) return 'xl';
    if (windowSize.width >= config.lg) return 'lg';
    if (windowSize.width >= config.md) return 'md';
    if (windowSize.width >= config.sm) return 'sm';
    return 'xs';
  })();

  const isBreakpoint = (bp: keyof BreakpointConfig | 'xs') => {
    if (bp === 'xs') return windowSize.width < config.sm;
    return windowSize.width >= config[bp];
  };

  const isBreakpointOnly = (bp: keyof BreakpointConfig | 'xs') => {
    if (bp === 'xs') return windowSize.width < config.sm;
    if (bp === '2xl') return windowSize.width >= config['2xl'];
    
    const bpKeys = Object.keys(config) as (keyof BreakpointConfig)[];
    const currentIndex = bpKeys.indexOf(bp);
    const nextBp = bpKeys[currentIndex + 1];
    
    return windowSize.width >= config[bp] && 
           (nextBp ? windowSize.width < config[nextBp] : true);
  };

  const getColumnsForBreakpoint = (columns: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    '2xl'?: number;
  }) => {
    if (windowSize.width >= config['2xl'] && columns['2xl']) return columns['2xl'];
    if (windowSize.width >= config.xl && columns.xl) return columns.xl;
    if (windowSize.width >= config.lg && columns.lg) return columns.lg;
    if (windowSize.width >= config.md && columns.md) return columns.md;
    if (windowSize.width >= config.sm && columns.sm) return columns.sm;
    return columns.xs || 1;
  };

  return {
    windowSize,
    isMobile,
    isTablet,
    isDesktop,
    isLargeDesktop,
    breakpoint,
    isBreakpoint,
    isBreakpointOnly,
    getColumnsForBreakpoint,
  };
};

export const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);

  return matches;
};

// Predefined media queries
export const useIsMobile = () => useMediaQuery('(max-width: 639px)');
export const useIsTablet = () => useMediaQuery('(min-width: 640px) and (max-width: 1023px)');
export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)');
export const useIsLargeScreen = () => useMediaQuery('(min-width: 1280px)');

// Touch device detection
export const useIsTouchDevice = () => {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    const checkTouch = () => {
      setIsTouch(
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        // @ts-ignore
        navigator.msMaxTouchPoints > 0
      );
    };

    checkTouch();
  }, []);

  return isTouch;
};

// Orientation detection
export const useOrientation = () => {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  useEffect(() => {
    const updateOrientation = () => {
      setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
    };

    updateOrientation();
    window.addEventListener('resize', updateOrientation);
    window.addEventListener('orientationchange', updateOrientation);

    return () => {
      window.removeEventListener('resize', updateOrientation);
      window.removeEventListener('orientationchange', updateOrientation);
    };
  }, []);

  return orientation;
};

// Safe area detection for mobile devices
export const useSafeArea = () => {
  const [safeArea, setSafeArea] = useState({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  });

  useEffect(() => {
    const updateSafeArea = () => {
      const computedStyle = getComputedStyle(document.documentElement);
      setSafeArea({
        top: parseInt(computedStyle.getPropertyValue('--safe-area-inset-top') || '0'),
        right: parseInt(computedStyle.getPropertyValue('--safe-area-inset-right') || '0'),
        bottom: parseInt(computedStyle.getPropertyValue('--safe-area-inset-bottom') || '0'),
        left: parseInt(computedStyle.getPropertyValue('--safe-area-inset-left') || '0'),
      });
    };

    updateSafeArea();
    window.addEventListener('resize', updateSafeArea);
    window.addEventListener('orientationchange', updateSafeArea);

    return () => {
      window.removeEventListener('resize', updateSafeArea);
      window.removeEventListener('orientationchange', updateSafeArea);
    };
  }, []);

  return safeArea;
};