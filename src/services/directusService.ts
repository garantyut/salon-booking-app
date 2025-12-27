/**
 * Directus Service - Replaces Firebase Service
 * All data operations go through Directus REST API
 */

import { client, getImageUrl } from '@/lib/directus';
import { readItems, readItem, createItem, updateItem, deleteItem } from '@directus/sdk';
import type { Service, Appointment } from '@/types';
import type { UserProfile } from '@/types';

// ============ SERVICES ============

export const getServices = async (): Promise<Service[]> => {
    try {
        const data = await client.request(readItems('services'));
        return (data as any[]).map((item) => ({
            id: String(item.id),
            title: item.title,
            price: item.price,
            duration: item.duration,
            category: item.category,
            image: item.image ? getImageUrl(item.image) : null
        }));
    } catch (error) {
        console.error('Error fetching services:', error);
        return [];
    }
};

// ============ USERS ============

export const getUsers = async (): Promise<UserProfile[]> => {
    try {
        const data = await client.request(readItems('users'));
        return (data as any[]).map((item) => ({
            id: String(item.id),
            firstName: item.first_name,
            lastName: item.last_name,
            phone: item.phone || '',
            createdAt: new Date(item.date_created).getTime(),
            telegramId: item.telegram_id
        }));
    } catch (error) {
        console.error('Error fetching users:', error);
        return [];
    }
};

export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
        // Search by telegram_id
        const data = await client.request(
            readItems('users', {
                filter: { telegram_id: { _eq: userId } },
                limit: 1
            })
        );

        if ((data as any[]).length === 0) return null;

        const item = (data as any[])[0];
        return {
            id: String(item.id),
            firstName: item.first_name,
            lastName: item.last_name,
            phone: item.phone || '',
            createdAt: new Date(item.date_created).getTime(),
            telegramId: item.telegram_id
        };
    } catch (error) {
        console.error('Error fetching user profile:', error);
        return null;
    }
};

export const saveUserProfile = async (profile: UserProfile): Promise<void> => {
    try {
        console.log('Saving user profile:', profile);

        // Validate required fields
        if (!profile.id) {
            throw new Error('User ID (telegram_id) is required');
        }
        if (!profile.firstName) {
            throw new Error('First name is required');
        }

        // Check if user exists
        const existing = await getUserProfile(profile.id);
        console.log('Existing user:', existing);

        const userData = {
            telegram_id: profile.id,
            first_name: profile.firstName,
            last_name: profile.lastName || 'Не указано', // Directus may require this
            phone: profile.phone || ''
        };

        console.log('Sending to Directus:', userData);

        if (existing) {
            // Update existing user - find by telegram_id first
            const users = await client.request(
                readItems('users', {
                    filter: { telegram_id: { _eq: profile.id } },
                    limit: 1
                })
            );
            if ((users as any[]).length > 0) {
                const directusId = (users as any[])[0].id;
                console.log('Updating user with Directus ID:', directusId);
                await client.request(updateItem('users', directusId, userData));
            }
        } else {
            // Create new user
            console.log('Creating new user');
            const result = await client.request(createItem('users', userData));
            console.log('User created:', result);
        }
    } catch (error: any) {
        console.error('Error saving user profile:', error);
        // Provide more detailed error message
        if (error?.errors) {
            console.error('Directus errors:', JSON.stringify(error.errors, null, 2));
            throw new Error(error.errors[0]?.message || 'Ошибка Directus');
        }
        throw error;
    }
};

// ============ APPOINTMENTS ============

export const getProAppointments = async (): Promise<Appointment[]> => {
    try {
        const data = await client.request(
            readItems('appointments', {
                sort: ['-date_created']
            })
        );
        return (data as any[]).map(mapAppointment);
    } catch (error) {
        console.error('Error fetching appointments:', error);
        return [];
    }
};

export const getUserAppointments = async (userId: string): Promise<Appointment[]> => {
    try {
        const data = await client.request(
            readItems('appointments', {
                filter: { client_id: { _eq: userId } },
                sort: ['-date_created']
            })
        );
        return (data as any[]).map(mapAppointment);
    } catch (error) {
        console.error('Error fetching user appointments:', error);
        return [];
    }
};

export const addAppointment = async (appointment: Omit<Appointment, 'id'>): Promise<string> => {
    try {
        const appointmentData = {
            client_id: appointment.clientId,
            service_id: appointment.serviceId,
            master_id: appointment.masterId || null,
            date: appointment.date,
            time_slot: appointment.timeSlot,
            status: appointment.status || 'confirmed',
            notes: appointment.notes || null,
            price: appointment.price || 0
        };

        const result = await client.request(createItem('appointments', appointmentData));
        return String((result as any).id);
    } catch (error) {
        console.error('Error adding appointment:', error);
        throw error;
    }
};

export const updateAppointment = async (id: string, updates: Partial<Appointment>): Promise<void> => {
    try {
        const updateData: any = {};
        if (updates.date) updateData.date = updates.date;
        if (updates.timeSlot) updateData.time_slot = updates.timeSlot;
        if (updates.status) updateData.status = updates.status;
        if (updates.notes !== undefined) updateData.notes = updates.notes;

        await client.request(updateItem('appointments', id, updateData));
    } catch (error) {
        console.error('Error updating appointment:', error);
        throw error;
    }
};

export const deleteAppointment = async (id: string): Promise<void> => {
    try {
        await client.request(deleteItem('appointments', id));
    } catch (error) {
        console.error('Error deleting appointment:', error);
        throw error;
    }
};

// Helper to map Directus appointment to app format
const mapAppointment = (item: any): Appointment => ({
    id: String(item.id),
    clientId: String(item.client_id),
    serviceId: String(item.service_id),
    masterId: item.master_id ? String(item.master_id) : '',
    date: item.date,
    timeSlot: item.time_slot,
    status: item.status as Appointment['status'],
    createdAt: new Date(item.date_created).getTime(),
    notes: item.notes || '',
    price: item.price || 0
});

// ============ CONFIG ============

export const getAdminTelegramIds = async (): Promise<string[]> => {
    try {
        const data = await client.request(
            readItems('settings', {
                filter: { key: { _eq: 'admin_telegram_ids' } },
                limit: 1
            })
        );

        if ((data as any[]).length === 0) return [];

        const value = (data as any[])[0].value;
        // Value could be JSON array or already parsed
        if (Array.isArray(value)) return value.map(String);
        if (typeof value === 'string') {
            try {
                return JSON.parse(value).map(String);
            } catch {
                return [];
            }
        }
        return [];
    } catch (error) {
        console.error('Error fetching admin IDs:', error);
        return [];
    }
};
