
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
    orderBy
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
export const getProAppointments = async (): Promise<Appointment[]> => {
    // For Admin: Get all appointments
    const q = query(appointmentsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
};

export const getUserAppointments = async (userId: string): Promise<Appointment[]> => {
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
    const docRef = await addDoc(appointmentsRef, {
        ...appointment,
        createdAt: Date.now() // Ensure we use number for consistent sorting for now, or use serverTimestamp() later
    });
    return docRef.id;
};

// Users
export const saveUser = async (user: User): Promise<void> => {
    // In a real app we might update specific fields, here we just want to ensure user exists
    // Ideally use setDoc with { merge: true } but for now we trust the flow
    // Simplified for MVP: Check existence not implemented here, assumed handled upstream or simple 'add'
    // To keep it simple: We won't strictly "auth" users yet, just trusting the Telegram ID passed in Appointment
};

// Config
export const getAdminTelegramIds = async (): Promise<string[]> => {
    try {
        const configRef = doc(db, 'config', 'settings');
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
