import { useState, useEffect } from 'react';

/**
 * useResponsiveLayout — Hook para detecção de breakpoints e capacidades do dispositivo.
 * Otimizado para performance com ResizeObserver.
 */

export function useResponsiveLayout() {
    const [config, setConfig] = useState({
        mode: 'desktop',
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isUltrawide: false,
        isTouchDevice: false,
        isLandscape: false,
        screenWidth: 1200,
        screenHeight: 800,
        pixelRatio: 1,
        prefersReducedMotion: false,
        prefersDarkMode: true
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;

        function getConfig() {
            const w = window.innerWidth;
            const h = window.innerHeight;
            const isLandscape = w > h;
            
            let mode = 'desktop';
            if (w < 768) mode = 'mobile';
            else if (w < 1024 && !isLandscape) mode = 'tablet_portrait';
            else if (w < 1024) mode = 'tablet_landscape';
            else if (w < 2560) mode = 'desktop';
            else mode = 'ultrawide';

            return {
                mode,
                isMobile: w < 768,
                isTablet: w >= 768 && w < 1024,
                isDesktop: w >= 1024 && w < 2560,
                isUltrawide: w >= 2560,
                isTouchDevice: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
                isLandscape,
                screenWidth: w,
                screenHeight: h,
                pixelRatio: window.devicePixelRatio || 1,
                prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
                prefersDarkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,
            };
        }

        const handleResize = () => setConfig(getConfig());
        
        // Inicializar
        handleResize();

        // Observer para mudanças de tamanho (mais eficiente que 'resize')
        const observer = new ResizeObserver(handleResize);
        observer.observe(document.documentElement);

        // Listeners para orientação e tema
        const orientationQuery = window.matchMedia('(orientation: landscape)');
        const themeQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        orientationQuery.addEventListener('change', handleResize);
        themeQuery.addEventListener('change', handleResize);

        return () => {
            observer.disconnect();
            orientationQuery.removeEventListener('change', handleResize);
            themeQuery.removeEventListener('change', handleResize);
        };
    }, []);

    return config;
}
