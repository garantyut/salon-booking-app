import { createDirectus, rest, readItems } from '@directus/sdk';

const DIRECTUS_URL = 'https://db.yuranvpn.ru';

// Типы для коллекций Directus
interface DirectusService {
    id: string;
    title: string;
    price: number;
    duration: number;
    image: string | null;
    category: string;
}

interface DirectusUser {
    id: number;
    telegram_id: string;
    first_name: string;
    last_name: string;
    phone: string;
    date_created: string;
}

interface DirectusAppointment {
    id: number;
    client_id: string;
    service_id: string;
    master_id: string | null;
    date: string;
    time_slot: string;
    status: string;
    notes: string | null;
    price: number;
    date_created: string;
}

interface DirectusSetting {
    id: number;
    key: string;
    value: any;
}

interface DirectusSchema {
    services: DirectusService[];
    users: DirectusUser[];
    appointments: DirectusAppointment[];
    settings: DirectusSetting[];
}

// Клиент для подключения
export const client = createDirectus<DirectusSchema>(DIRECTUS_URL).with(rest());

// Хелпер для получения полной ссылки на картинку
export const getImageUrl = (imageId: string | null): string => {
    if (!imageId) return 'https://placehold.co/600x400/e2e8f0/64748b?text=Услуга';
    return `${DIRECTUS_URL}/assets/${imageId}`;
};

// Получение списка услуг
export const getServices = async (): Promise<DirectusService[]> => {
    try {
        const result = await client.request(readItems('services'));
        return result as DirectusService[];
    } catch (error) {
        console.error('Ошибка при загрузке услуг из Directus:', error);
        return [];
    }
};
