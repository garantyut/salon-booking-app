
import { db } from '../firebase';
import {
    collection,
    getDocs,
    addDoc,
    query,
    where,
    doc,
    updateDoc,
    serverTimestamp,
    orderBy,
    deleteDoc
} from 'firebase/firestore';
import { Service, Master, Appointment, User } from '@/types';

// Collection References
const servicesRef = collection(db, 'services');
const mastersRef = collection(db, 'masters');
const appointmentsRef = collection(db, 'appointments');
const usersRef = collection(db, 'users');

// Services
export const getServices = async (): Promise<Service[]> => {
    const snapshot = await getDocs(servicesRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service));
};

// Masters
export const getMasters = async (): Promise<Master[]> => {
    const snapshot = await getDocs(mastersRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Master));
};

// Appointments
// Appointments
export const getProAppointments = async (): Promise<Appointment[]> => {
    // DEV MODE: Mock persistence
    if (import.meta.env.DEV && !new URLSearchParams(window.location.search).get('force_prod')) {
        const stored = localStorage.getItem('dev_appointments');
        return stored ? JSON.parse(stored) : [];
    }

    // For Admin: Get all appointments
    const q = query(appointmentsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
};

export const getUserAppointments = async (userId: string): Promise<Appointment[]> => {
    // DEV MODE: Mock persistence
    if (import.meta.env.DEV && !new URLSearchParams(window.location.search).get('force_prod')) {
        const stored = localStorage.getItem('dev_appointments');
        const all: Appointment[] = stored ? JSON.parse(stored) : [];
        return all.filter(a => a.clientId === userId).sort((a, b) => b.createdAt - a.createdAt);
    }

    // For Client: Get only their appointments
    // Note: This requires an index in Firestore. If it fails initially, check console for index creation link.
    const q = query(appointmentsRef, where('clientId', '==', userId));
    const snapshot = await getDocs(q);
    // Sort client side effectively since composite index might be missing
    return snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Appointment))
        .sort((a, b) => b.createdAt - a.createdAt);
};

export const addAppointment = async (appointment: Omit<Appointment, 'id'>): Promise<string> => {
    // DEV MODE: Mock persistence
    if (import.meta.env.DEV && !new URLSearchParams(window.location.search).get('force_prod')) {
        const stored = localStorage.getItem('dev_appointments');
        const all: Appointment[] = stored ? JSON.parse(stored) : [];
        const newId = 'dev-app-' + Date.now();
        // @ts-ignore
        const newApp: Appointment = { ...appointment, id: newId };
        all.push(newApp);
        localStorage.setItem('dev_appointments', JSON.stringify(all));
        return newId;
    }

    const docRef = await addDoc(appointmentsRef, {
        ...appointment,
        createdAt: Date.now() // Ensure we use number for consistent sorting for now, or use serverTimestamp() later
    });
    return docRef.id;
};

// Users
export const getUsers = async (): Promise<import('@/types').UserProfile[]> => {
    // DEV MODE
    if (import.meta.env.DEV && !new URLSearchParams(window.location.search).get('force_prod')) {
        const stored = localStorage.getItem('dev_users');
        return stored ? JSON.parse(stored) : [];
    }

    // PROD
    const snapshot = await getDocs(usersRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as import('@/types').UserProfile));
};

export const getUserProfile = async (userId: string): Promise<import('@/types').UserProfile | null> => {
    // DEV MODE
    if (import.meta.env.DEV && !new URLSearchParams(window.location.search).get('force_prod')) {
        const stored = localStorage.getItem('dev_users');
        const all: import('@/types').UserProfile[] = stored ? JSON.parse(stored) : [];
        return all.find(u => u.id === userId) || null;
    }

    try {
        const userDocRef = doc(db, 'users', userId);

        const docSnap = await import('firebase/firestore').then(m => m.getDoc(userDocRef));

        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as import('@/types').UserProfile;
        }
        return null;
    } catch (error) {
        console.error("Error fetching user profile:", error);
        return null;
    }
};

export const saveUserProfile = async (profile: import('@/types').UserProfile): Promise<void> => {
    // DEV MODE
    if (import.meta.env.DEV) {
        // Double check we aren't forcing prod
        const params = new URLSearchParams(window.location.search);
        if (params.get('force_prod') !== 'true') {
            console.log("Dev Mode: Saving to LocalStorage", profile);
            const stored = localStorage.getItem('dev_users');
            let all: import('@/types').UserProfile[] = stored ? JSON.parse(stored) : [];

            // Check if exists
            const existingIndex = all.findIndex(u => u.id === profile.id);
            if (existingIndex >= 0) {
                all[existingIndex] = { ...all[existingIndex], ...profile };
            } else {
                all.push(profile);
            }

            localStorage.setItem('dev_users', JSON.stringify(all));
            // Simulate delay
            await new Promise(r => setTimeout(r, 500));
            return;
        }
    }

    try {
        const { setDoc, doc } = await import('firebase/firestore');
        await setDoc(doc(db, 'users', profile.id), {
            ...profile,
            updatedAt: Date.now()
        }, { merge: true });
    } catch (error) {
        console.error("Error saving user profile:", error);
        throw error;
    }
};

// Config
export const getAdminTelegramIds = async (): Promise<string[]> => {
    try {
        const docSnap = await getDocs(query(collection(db, 'config')));
        // Try to get from settings document
        const settingsDoc = docSnap.docs.find(d => d.id === 'settings');
        if (settingsDoc) {
            const data = settingsDoc.data();
            return data.adminTelegramIds || [];
        }
        return [];
    } catch (error) {
        console.error("Failed to fetch admin IDs", error);
        return [];
    }
};

export const deleteAppointment = async (appointmentId: string): Promise<void> => {
    // DEV MODE
    if (import.meta.env.DEV && !new URLSearchParams(window.location.search).get('force_prod')) {
        const stored = localStorage.getItem('dev_appointments');
        if (stored) {
            const all: Appointment[] = JSON.parse(stored);
            const filtered = all.filter(a => a.id !== appointmentId);
            localStorage.setItem('dev_appointments', JSON.stringify(filtered));
        }
        return;
    }

    // PROD
    await deleteDoc(doc(db, 'appointments', appointmentId));
};

export const updateAppointment = async (id: string, updates: Partial<Appointment>): Promise<void> => {
    // DEV MODE
    if (import.meta.env.DEV && !new URLSearchParams(window.location.search).get('force_prod')) {
        const stored = localStorage.getItem('dev_appointments');
        if (stored) {
            const all: Appointment[] = JSON.parse(stored);
            const index = all.findIndex(a => a.id === id);
            if (index !== -1) {
                all[index] = { ...all[index], ...updates };
                localStorage.setItem('dev_appointments', JSON.stringify(all));
            }
        }
        return;
    }

    // PROD
    const appRef = doc(db, 'appointments', id);
    // @ts-ignore
    await updateDoc(appRef, updates);
};
