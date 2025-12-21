import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { SalonConfig } from '@/types/salon';
import { fetchSalonConfig } from '@/services/salonConfig';

interface SalonContextType {
    config: SalonConfig | null;
    loading: boolean;
    error: string | null;
}

const SalonContext = createContext<SalonContextType | undefined>(undefined);

export const SalonProvider = ({ children }: { children: ReactNode }) => {
    const [config, setConfig] = useState<SalonConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const initSalon = async () => {
            try {
                // 1. Determine Salon ID from URL Search Params
                const params = new URLSearchParams(window.location.search);
                let salonId = params.get('salon');

                if (!salonId) {
                    // 2. Fallback to subdomain check
                    const host = window.location.hostname;
                    const parts = host.split('.');
                    // e.g. irina.example.com -> parts[0] is irina
                    // ignore 'www' or 'app' or localhost
                    if (parts.length > 2 && parts[0] !== 'www' && parts[0] !== 'app') {
                        salonId = parts[0];
                    }
                }

                // 3. Fallback to default (for development/testing) if still empty
                if (!salonId || salonId === 'localhost' || salonId.startsWith('192.168')) {
                    console.warn('No salon_id found, defaulting to "irina" for dev purposes');
                    salonId = 'irina';
                }

                const data = await fetchSalonConfig(salonId);
                if (!data) {
                    setError(`Salon config not found for ID: ${salonId}`);
                } else {
                    setConfig(data);
                }
            } catch (err) {
                setError('Failed to load salon configuration');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        initSalon();
    }, []);

    // Apply branding when config changes
    useEffect(() => {
        if (config?.brand) {
            const root = document.documentElement;
            const { primary_color, secondary_color, background_color } = config.brand;

            // Update Standard CSS Variables (hex)
            root.style.setProperty('--primary-color-hex', primary_color);
            root.style.setProperty('--secondary-color-hex', secondary_color);
            root.style.setProperty('--background-color-hex', background_color);

            // Map to Shadcn / Tailwind variables if possible
            // Note: Converting Hex to HSL in JS is complex without a library, 
            // so we might need a utility or just rely on hex variables if we change tailwind config.
            // For now, we update the variables we saw in index.css and button.tsx

            // Telegram Theme Mocking / Overriding
            root.style.setProperty('--tg-theme-button-color', primary_color);
            root.style.setProperty('--tg-theme-button-text-color', '#FFFFFF'); // Assuming white text on primary
            root.style.setProperty('--tg-theme-bg-color', background_color);
            root.style.setProperty('--tg-theme-text-color', secondary_color); // Use secondary as text color or specific text field

            // Also update standard variables used in index.css if they accept simple colors
            // root.style.setProperty('--primary', ...); // index.css uses HSL, so this might break if we pass Hex.
            // We will skip HSL updates for now and rely on tg-theme vars which button uses.
        }
    }, [config]);

    return (
        <SalonContext.Provider value={{ config, loading, error }}>
            {children}
        </SalonContext.Provider>
    );
};

export const useSalon = () => {
    const context = useContext(SalonContext);
    if (context === undefined) {
        throw new Error('useSalon must be used within a SalonProvider');
    }
    return context;
};
