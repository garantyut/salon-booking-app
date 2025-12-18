import { useBookingStore } from '@/store/bookingStore';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, isSameDay, parseISO, getDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { MOCK_MASTERS } from '@/services/mockData';

export const BookingCalendar = () => {
    const {
        selectedDate, setDate,
        selectedTimeSlot, setTimeSlot,
        cart, getTotalDuration,
        appointments // Get existing appointments
    } = useBookingStore();

    // Get the master's schedule (assuming single master for now)
    const master = MOCK_MASTERS[0];
    const workingHours = master?.workingHours;

    // Check if a date is a day off
    const isDayOff = (date: Date) => {
        if (!workingHours) return false; // If no config, assume working
        const dayOfWeek = getDay(date); // 0 = Sunday, 1 = Monday, etc.
        const schedule = workingHours[dayOfWeek];
        return schedule?.isDayOff ?? false;
    };

    // Get working hours for a specific date
    const getWorkingHoursForDate = (date: Date) => {
        if (!workingHours) return { start: '10:00', end: '20:00' }; // Default
        const dayOfWeek = getDay(date);
        const schedule = workingHours[dayOfWeek];
        if (!schedule || schedule.isDayOff) return null;
        return { start: schedule.start, end: schedule.end };
    };

    // Helper to check availability for ANY date
    const checkAvailability = (date: Date) => {
        // 1. Basic checks
        if (!workingHours) return false;
        const dayOfWeek = getDay(date);
        const schedule = workingHours[dayOfWeek];
        if (!schedule || schedule.isDayOff) return false;

        // 2. Parse working hours
        const [startH, startM] = schedule.start.split(':').map(Number);
        const [endH, endM] = schedule.end.split(':').map(Number);
        const workStartMins = startH * 60 + startM;
        const workEndMins = endH * 60 + endM;

        // 3. Get existing appointments for this date
        const dayApps = appointments.filter(a => isSameDay(parseISO(a.date), date));

        // 4. Calculate busy ranges
        const { services } = useBookingStore.getState();
        const busyRanges = dayApps.map(app => {
            const [h, m] = app.timeSlot.split(':').map(Number);
            const start = h * 60 + m;
            const service = services.find(s => s.id === app.serviceId);
            const duration = service ? service.duration : 60;
            return { start, end: start + duration };
        });

        // 5. Check if at least one slot is available
        const requiredDuration = getTotalDuration();

        for (let mins = workStartMins; mins < workEndMins; mins += 30) {
            const startMins = mins;
            const endMins = startMins + requiredDuration;

            // Fits in working day?
            if (endMins > workEndMins) continue;

            // Overlaps with busy?
            let isBusy = false;
            for (const busy of busyRanges) {
                if (startMins < busy.end && busy.start < endMins) {
                    isBusy = true;
                    break;
                }
            }

            if (!isBusy) return true; // Found at least one slot
        }

        return false; // No slots found
    };

    const isFullyBooked = (date: Date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        // Don't mark past days or days off as fully booked (handle via disabled)
        if (date < today || isDayOff(date)) return false;

        // If it's a working day but has NO available slots -> Fully Booked
        return !checkAvailability(date);
    };

    const generateTimeSlots = () => {
        if (!selectedDate) return [];
        // Re-use logic (simplified for selectedDate) implies we could just call checkAvailability 
        // but we need the actual slots array here. Keeping the logic separate or refactoring completely 
        // is safer. For now, I'll keep generateTimeSlots but we could optimize later.
        // Actually, to ensure consistency, let's copy the logic or keep as is since generateTimeSlots returns the ARRAY.

        const hoursConfig = getWorkingHoursForDate(selectedDate);
        if (!hoursConfig) return [];

        // ... (Existing logic below calculates specific slots, effectively same core math)
        // To be safe and minimal change, I will leave generateTimeSlots as is mostly, 
        // relying on checkAvailability for the Calendar visual only.

        // ... (We still need the existing generateTimeSlots function body below this replacement)
        // WAIT: I need to output generateTimeSlots logic too if I'm replacing the block containing it?
        // Ah, the user instruction says "Extract...".
        // I will implement checkAvailability and then leave generateTimeSlots to execute its loop.
        // But for the sake of this tool use, I need to provide the content.

        // Let's copy the body of generateTimeSlots logic for the specific date.

        const slots = [];
        const requiredDuration = getTotalDuration();
        const [startH, startM] = hoursConfig.start.split(':').map(Number);
        const [endH, endM] = hoursConfig.end.split(':').map(Number);
        const workStartMins = startH * 60 + startM;
        const workEndMins = endH * 60 + endM;

        const dayApps = appointments.filter(a => isSameDay(parseISO(a.date), selectedDate));

        // Helper: Time string to minutes
        const toMinutes = (time: string) => {
            const [h, m] = time.split(':').map(Number);
            return h * 60 + m;
        };

        const { services } = useBookingStore.getState();
        const busyRanges = dayApps.map(app => {
            const start = toMinutes(app.timeSlot);
            const service = services.find(s => s.id === app.serviceId);
            const duration = service ? service.duration : 60;
            return { start, end: start + duration };
        });

        for (let mins = workStartMins; mins < workEndMins; mins += 30) {
            const h = Math.floor(mins / 60);
            const m = mins % 60;
            const startMins = mins;
            const endMins = startMins + requiredDuration;
            const timeString = `${h}:${m.toString().padStart(2, '0')}`;

            let isAvailable = true;
            if (endMins > workEndMins) isAvailable = false;

            if (isAvailable) {
                for (const busy of busyRanges) {
                    if (startMins < busy.end && busy.start < endMins) {
                        isAvailable = false;
                        break;
                    }
                }
            }
            slots.push({ time: timeString, available: isAvailable });
        }
        return slots;
    };

    const timeSlots = generateTimeSlots();

    return (
        <div className="space-y-6 animate-in slide-in-from-right-8 duration-500 pb-20">
            <div className="flex flex-col items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                    {selectedDate
                        ? format(selectedDate, 'd MMMM', { locale: ru })
                        : 'Выберите дату'}
                </h2>
                <p className="text-sm text-gray-500">
                    Всего услуг: {cart.length} • {getTotalDuration()} мин
                </p>
            </div>

            <div className="flex justify-center relative">
                <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setDate(date)}
                    required
                    disabled={(date: Date) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        return date < today || isDayOff(date);
                    }}
                    modifiers={{
                        fullyBooked: isFullyBooked
                    }}
                    modifiersClassNames={{
                        fullyBooked: 'bg-red-500 text-white hover:bg-red-500 hover:text-white opacity-100'
                    }}
                    classNames={{
                        day_selected: "bg-green-500 text-white hover:bg-green-600 hover:text-white focus:bg-green-600 focus:text-white"
                    }}
                    initialFocus
                    locale={ru}
                    className="rounded-2xl border-none bg-white shadow-xl shadow-gray-200 p-4 w-full max-w-[320px]"
                />
            </div>

            {selectedDate && (
                <div className="animate-in fade-in slide-in-from-bottom-2">
                    <div className="grid grid-cols-4 gap-2">
                        {timeSlots.map((slot) => (
                            <Button
                                key={slot.time}
                                variant={selectedTimeSlot === slot.time ? "default" : "outline"}
                                className={cn(
                                    "text-sm font-medium transition-all h-10 border-2",
                                    selectedTimeSlot === slot.time
                                        ? "bg-green-600 hover:bg-green-700 text-white border-transparent shadow-lg shadow-green-500/30 scale-105"
                                        : "bg-white text-gray-700 hover:text-green-700",
                                    !slot.available && "opacity-50 cursor-not-allowed border-gray-100 bg-gray-50",
                                    slot.available && selectedTimeSlot !== slot.time && "border-green-500 hover:bg-green-50"
                                )}
                                onClick={() => setTimeSlot(slot.time)}
                                disabled={!slot.available}
                            >
                                {slot.time}
                            </Button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
