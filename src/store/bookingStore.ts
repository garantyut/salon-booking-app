import { create } from 'zustand';
import { Service, Master, Appointment } from '@/types';

export interface CartItem {
    id: string;
    service: Service;
    master: Master | null;
}

interface BookingState {
    cart: CartItem[];
    selectedDate: Date | undefined;
    selectedTimeSlot: string | null;

    // New: User History
    // New: User History
    appointments: Appointment[];
    setAppointments: (apps: Appointment[]) => void;
    addAppointment: (app: Appointment) => void;
    cancelAppointment: (id: string) => void;
    rescheduleAppointment: (id: string, newDate: Date, newTime: string) => void;

    // Rescheduling state
    reschedulingId: string | null;
    startRescheduling: (id: string) => void;
    cancelRescheduling: () => void;

    // Services Management
    services: Service[];
    setServices: (services: Service[]) => void;
    addService: (service: Service) => void;
    updateService: (service: Service) => void;
    deleteService: (id: string) => void;

    addToCart: (service: Service, master: Master | null) => void;
    removeFromCart: (itemId: string) => void;
    clearCart: () => void;

    setDate: (date: Date | undefined) => void;
    setTimeSlot: (time: string | null) => void;
    reset: () => void;

    getTotalDuration: () => number;
    getTotalPrice: () => number;

    users: import('@/types').User[];
    setUsers: (users: import('@/types').User[]) => void;
}

export const useBookingStore = create<BookingState>((set, get) => ({
    cart: [],
    selectedDate: undefined,
    selectedTimeSlot: null,
    appointments: [],
    reschedulingId: null,
    services: [], // Initial empty, loaded from mock

    setServices: (services) => set({ services }),

    addService: (service) => set((state) => ({
        services: [...state.services, service]
    })),

    updateService: (updatedService) => set((state) => ({
        services: state.services.map(s => s.id === updatedService.id ? updatedService : s)
    })),

    deleteService: (id) => set((state) => ({
        services: state.services.filter(s => s.id !== id)
    })),

    setAppointments: (apps) => set({ appointments: apps }),

    addAppointment: (app) => set((state) => ({
        appointments: [...state.appointments, app]
    })),

    cancelAppointment: (id) => set((state) => ({
        appointments: state.appointments.filter(a => a.id !== id)
    })),

    rescheduleAppointment: (id, newDate, newTime) => set((state) => ({
        appointments: state.appointments.map(a =>
            a.id === id ? {
                ...a,
                date: newDate.toISOString(),
                timeSlot: newTime
            } : a
        ),
        reschedulingId: null,
        selectedDate: undefined,
        selectedTimeSlot: null
    })),

    startRescheduling: (id) => set({ reschedulingId: id }),
    cancelRescheduling: () => set({ reschedulingId: null }),

    addToCart: (service, master) => set((state) => ({
        cart: [...state.cart, {
            id: Date.now().toString() + Math.random(),
            service,
            master
        }]
    })),

    removeFromCart: (itemId) => set((state) => ({
        cart: state.cart.filter(item => item.id !== itemId)
    })),

    clearCart: () => set({ cart: [] }),

    setDate: (date) => set({ selectedDate: date }),
    setTimeSlot: (time) => set({ selectedTimeSlot: time }),

    reset: () => set({
        cart: [],
        selectedDate: undefined,
        selectedTimeSlot: null,
        reschedulingId: null
    }),

    getTotalDuration: () => {
        const { cart } = get();
        return cart.reduce((total, item) => total + item.service.duration, 0);
    },

    getTotalPrice: () => {
        const { cart } = get();
        return cart.reduce((total, item) => total + item.service.price, 0);
    },

    // Users (for Admin)
    users: [],
    setUsers: (users) => set({ users })
}));
