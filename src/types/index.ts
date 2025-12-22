export interface Service {
    id: string;
    title: string;
    price: number;
    duration: number; // in minutes
    category: string; // Dynamic category from Directus
    description?: string;
    image?: string | null; // Image UUID from Directus
}

export interface Master {
    id: string;
    name: string;
    photoUrl: string;
    specializations: string[]; // Service IDs
    workingHours: WorkingHours;
}

export interface WorkingHours {
    [key: number]: { // 0 = Sunday, 1 = Monday...
        start: string;
        end: string;
        isDayOff: boolean;
    };
}

export interface Appointment {
    id: string;
    clientId: string;
    masterId: string;
    serviceId: string;
    date: string; // ISO Date String
    timeSlot: string; // "14:30"
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
    createdAt: number;
    notes?: string;
    price: number;      // Base price from service
    finalPrice?: number; // Actual paid amount
}

export interface User {
    id: string;
    tgId?: number;
    name: string;
    phone?: string;
    history: string[]; // Appointment IDs
}

export interface UserProfile {
    id: string; // usually tgId as string
    firstName: string;
    lastName?: string;
    phone: string;
    createdAt: number;
    telegramId?: number;
    username?: string; // Telegram username
}
