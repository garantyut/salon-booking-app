export interface Service {
    id: string;
    title: string;
    price: number;
    duration: number; // in minutes
    category: string; // broadened from union type for flexibility
}

export interface WorkingHours {
    [dayOfWeek: number]: {
        start: string; // "09:00"
        end: string;   // "18:00"
        isDayOff: boolean;
    };
}

export interface ScheduleException {
    date: string; // YYYY-MM-DD
    isDayOff: boolean;
    start?: string;
    end?: string;
    note?: string;
}

export interface Master {
    id: string;
    name: string;
    photoUrl: string;
    specializations: string[]; // Service IDs or Categories
    workingHours?: WorkingHours;
    exceptions?: ScheduleException[];
}

export interface Appointment {
    id: string;
    clientId: string;
    masterId: string;
    serviceId: string;
    date: string; // ISO Date String YYYY-MM-DD
    timeSlot: string; // HH:mm
    status: 'pending' | 'confirmed' | 'cancelled';
    notes?: string; // Master's notes (e.g. formula used)
    createdAt: number;
}

export interface User {
    id: string; // Added for internal linking
    tgId: number;
    name: string;
    phone?: string;
    history: string[]; // Appointment IDs
}

export interface TimeSlot {
    time: string;
    available: boolean;
}
