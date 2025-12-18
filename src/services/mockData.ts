import { Service, Master, Appointment, User } from '@/types';

// ... existing MOCK_SERVICES and MOCK_MASTERS ...
export const MOCK_SERVICES: Service[] = [
    // Men's
    { id: 'm1', title: 'Мужская стрижка', price: 1500, duration: 45, category: 'mens' },

    // Women's
    { id: 'w1', title: 'Женская стрижка', price: 2500, duration: 60, category: 'womens' },
    { id: 'w2', title: 'Стрижка челки', price: 500, duration: 15, category: 'womens' },

    // Kids
    { id: 'k1', title: 'Детская стрижка', price: 1000, duration: 40, category: 'kids' },

    // Coloring
    { id: 'c1', title: 'Окрашивание волос (один тон)', price: 4000, duration: 120, category: 'coloring' },
    { id: 'c2', title: 'Сложное окрашивание', price: 7000, duration: 240, category: 'coloring' },

    // Styling
    { id: 's1', title: 'Укладка волос', price: 2000, duration: 60, category: 'styling' },
];

export const MOCK_MASTERS: Master[] = [
    {
        id: 'master-1',
        name: 'Ольга',
        photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Olga',
        specializations: ['m1', 'w1', 'w2', 'k1', 'c1', 'c2', 's1'],
        workingHours: {
            1: { start: '10:00', end: '20:00', isDayOff: false }, // Mon
            2: { start: '10:00', end: '20:00', isDayOff: false }, // Tue
            3: { start: '10:00', end: '20:00', isDayOff: false }, // Wed
            4: { start: '10:00', end: '20:00', isDayOff: false }, // Thu
            5: { start: '10:00', end: '20:00', isDayOff: false }, // Fri
            6: { start: '11:00', end: '16:00', isDayOff: false }, // Sat
            0: { start: '10:00', end: '20:00', isDayOff: true }   // Sun
        }
    }
];

// NEW: Mock User Appointments
export const MOCK_APPOINTMENTS: Appointment[] = [
    {
        id: 'app-1',
        clientId: 'user-1',
        masterId: 'master-1',
        serviceId: 'w1',
        date: '2025-12-20', // Upcoming
        timeSlot: '14:30',
        status: 'confirmed',
        createdAt: Date.now()
    },
    {
        id: 'app-2',
        clientId: 'user-1',
        masterId: 'master-1',
        serviceId: 'c1',
        date: '2025-11-15', // Past
        timeSlot: '10:00',
        status: 'confirmed',
        notes: 'Wella Koleston 7/7 + 6% окислитель. Клиент доволен, в следующий раз можно пробовать 7/73.',
        createdAt: Date.now() - 10000000
    },
    {
        id: 'app-3',
        clientId: 'user-1',
        masterId: 'master-1',
        serviceId: 's1',
        date: '2025-10-01', // Past
        timeSlot: '18:00',
        status: 'confirmed',
        createdAt: Date.now() - 20000000
    }
];

// NEW: Mock Users
export const MOCK_USERS: User[] = [
    {
        id: 'user-1', // Matches appointment clientId
        tgId: 123456,
        name: 'Алексей Иванов',
        phone: '+7 900 123 45 67',
        history: ['app-1', 'app-2', 'app-3']
    },
    {
        id: 'user-2',
        tgId: 789012,
        name: 'Мария Петрова',
        phone: '+7 900 987 65 43',
        history: []
    }
];

// Mutable in-memory storage for the session
let services = [...MOCK_SERVICES];
let masters = [...MOCK_MASTERS];
let appointments: Appointment[] = []; // Empty - no fake data
let users = [...MOCK_USERS];

export const getServices = async (salonId?: string): Promise<Service[]> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            if (salonId === 'barber007') {
                resolve(services.filter(s => s.category === 'mens'));
            } else {
                resolve(services);
            }
        }, 300);
    });
};

export const getMasters = async (): Promise<Master[]> => {
    return new Promise((resolve) => setTimeout(() => resolve(masters), 300));
};

export const getUserAppointments = async (): Promise<Appointment[]> => {
    return new Promise((resolve) => setTimeout(() => resolve([...appointments]), 500));
};

export const getUsers = async (): Promise<User[]> => {
    return new Promise((resolve) => setTimeout(() => resolve(users), 300));
};

// Simulate Backend Logic
export const addAppointmentMock = async (appointment: Appointment): Promise<void> => {
    return new Promise((resolve) => {
        appointments.push(appointment);
        setTimeout(resolve, 300);
    });
};

export const cancelAppointmentMock = async (id: string): Promise<void> => {
    return new Promise((resolve) => {
        appointments = appointments.map(a => a.id === id ? { ...a, status: 'cancelled' } : a);
        setTimeout(resolve, 300);
    });
};
