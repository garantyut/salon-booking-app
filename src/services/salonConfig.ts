import { SalonConfig } from '@/types/salon';

const MOCK_CONFIGS: Record<string, SalonConfig> = {
    'irina': {
        salon_id: 'irina',
        brand: {
            name: 'Салон красоты Ирина',
            logo_url: '', // Empty for now, or use a placeholder
            primary_color: '#E91E63',
            secondary_color: '#111827',
            background_color: '#FFFFFF'
        },
        texts: {
            book_button: 'Записаться',
            cancel_button: 'Отменить запись',
            admin_title: 'Админка'
        },
        features: {
            online_payment: false,
            promo_codes: false,
            reviews: true,
            extra_button: {
                enabled: false, // User feedback: WhatsApp button inside Telegram might be redundant
                text: 'Написать в WhatsApp',
                url: 'https://wa.me/79991234567'
            }
        },
        contacts: {
            phone: '+7 (999) 123-45-67',
            address: 'г. Красноярск, ул. Ленина 1',
            instagram: 'https://instagram.com/irina_salon'
        },
        timezone: 'Asia/Krasnoyarsk'
    },
    'barber007': {
        salon_id: 'barber007',
        brand: {
            name: 'Barbershop 007',
            logo_url: '',
            primary_color: '#000000',
            secondary_color: '#FFFFFF',
            background_color: '#1A1A1A'
        },
        texts: {
            book_button: 'Записаться на стрижку',
            cancel_button: 'Отмена',
            admin_title: 'Панель управления'
        },
        features: {
            online_payment: true,
            promo_codes: true,
            reviews: false,
            extra_button: {
                enabled: false,
                text: '',
                url: ''
            }
        },
        contacts: {
            phone: '+7 (900) 007-00-07',
            address: 'г. Москва, ул. Тверская 7',
            instagram: 'https://instagram.com/barber007'
        },
        timezone: 'Europe/Moscow'
    }
};

export const fetchSalonConfig = async (salonId: string): Promise<SalonConfig | null> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    return MOCK_CONFIGS[salonId] || null;
};
