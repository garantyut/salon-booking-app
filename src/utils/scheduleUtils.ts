import { Appointment, Master, Service } from '@/types';
import { isSameDay, getDay, parseISO, startOfToday, isBefore } from 'date-fns';

/**
 * Checks if a specific date is a "Day Off" for the master.
 */
export const isDayOff = (date: Date, master: Master): boolean => {
    if (!master.workingHours) return false;
    const dayOfWeek = getDay(date); // 0 = Sunday
    const schedule = master.workingHours[dayOfWeek];
    return schedule?.isDayOff ?? false;
};

/**
 * Helper: Converts "HH:mm" string to minutes from midnight.
 */
export const timeToMins = (time: string): number => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
};

/**
 * Helper: Converts minutes from midnight to "HH:mm" string.
 */
export const curMinsToTime = (mins: number): string => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}:${m.toString().padStart(2, '0')}`;
}

/**
 * Checks if a specific time slot is busy given a date and duration.
 */
export const checkSlotAvailability = (
    date: Date,
    startTime: string,
    durationMinutes: number,
    appointments: Appointment[],
    services: Service[],
    bufferMinutes: number = 0
): boolean => {
    const slotStart = timeToMins(startTime);
    const slotEnd = slotStart + durationMinutes;

    // Filter appointments for this day
    const dayApps = appointments.filter(app =>
        app.status !== 'cancelled' && isSameDay(parseISO(app.date), date)
    );

    // Check collision with each appointment
    for (const app of dayApps) {
        const appStart = timeToMins(app.timeSlot);
        const service = services.find(s => s.id === app.serviceId);
        const appDuration = service ? service.duration : 60;
        const appEnd = appStart + appDuration;

        // Simple strict overlap check: (StartA < EndB) and (EndA > StartB)
        if (date && isSameDay(date, parseISO(app.date))) {
            if (slotStart < appEnd && appStart < slotEnd) {
                return false; // Collision
            }
        }
    }
    return true;
};

/**
 * Generates available time slots for a specific date.
 */
export const generateTimeSlots = (
    date: Date,
    appointments: Appointment[],
    services: Service[],
    master: Master,
    totalDuration: number = 60 // Duration of the service(s) being booked
): { time: string; available: boolean }[] => {
    if (!master.workingHours) return [];

    const dayOfWeek = getDay(date);
    const schedule = master.workingHours[dayOfWeek];

    if (!schedule || schedule.isDayOff) return [];

    const [startH, startM] = schedule.start.split(':').map(Number);
    const [endH, endM] = schedule.end.split(':').map(Number);

    // Convert generic working hours to minutes
    const workStartMins = startH * 60 + startM;
    const workEndMins = endH * 60 + endM;

    const slots: { time: string; available: boolean }[] = [];
    const now = new Date();
    const isToday = isSameDay(date, now);
    const currentMins = now.getHours() * 60 + now.getMinutes();

    // Iterate every 30 mins
    for (let mins = workStartMins; mins < workEndMins; mins += 30) {
        const timeString = curMinsToTime(mins);
        const slotStartMins = mins;
        const slotEndMins = mins + totalDuration;

        let isAvailable = true;

        // 1. Check if fits in working day
        if (slotEndMins > workEndMins) {
            isAvailable = false;
        }

        // 2. Check if in the past (only for today)
        if (isToday && slotStartMins < currentMins + 30) { // 30 min buffer for "now"
            isAvailable = false;
        }

        // 3. Check overlaps with existing bookings
        if (isAvailable) {
            const available = checkSlotAvailability(date, timeString, totalDuration, appointments, services);
            if (!available) isAvailable = false;
        }

        slots.push({ time: timeString, available: isAvailable });
    }

    return slots;
};


/**
 * Logic to determine if a full day is "Fully Booked" (visually disabled).
 * Usually defined as "No slots available for a minimum standard duration (e.g. 30 or 60 mins)".
 * 
 * NOTE: For the Calendar View, we usually want to know if *ANY* slot is open.
 * We'll assume a standard 60 min service check for "General Availability" 
 * OR we can check 30 mins if that's the minimum atom.
 */
export const isDateFullyBooked = (
    date: Date,
    appointments: Appointment[],
    services: Service[],
    master: Master
): boolean => {
    // Basic checks
    if (!master.workingHours) return false;
    if (isBefore(date, startOfToday())) return false; // Past is handled separately usually, but here we ignore "booked" status for past
    if (isDayOff(date, master)) return false; // Day off is not "Fully Booked" (it's closed)

    // Generate slots for a hypothetical 30 min service (minimum slot)
    // If NO slot is available for even 30 mins, then it's fully booked.
    const slots = generateTimeSlots(date, appointments, services, master, 30);

    // If every slot is unavailable, return true
    return slots.every(s => !s.available);
};
