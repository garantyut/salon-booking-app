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

    const generateTimeSlots = () => {
        if (!selectedDate) return [];

        // Check if selected day is a day off
        const hoursConfig = getWorkingHoursForDate(selectedDate);
        if (!hoursConfig) {
            return []; // Day off - no slots
        }

        const slots = [];
        const requiredDuration = getTotalDuration(); // in minutes

        // Parse working hours
        const [startH, startM] = hoursConfig.start.split(':').map(Number);
        const [endH, endM] = hoursConfig.end.split(':').map(Number);
        const workStartMins = startH * 60 + startM;
        const workEndMins = endH * 60 + endM;

        const dayApps = appointments.filter(a => isSameDay(parseISO(a.date), selectedDate));

        // Helper: Time string to minutes (e.g., "14:30" -> 870)
        const toMinutes = (time: string) => {
            const [h, m] = time.split(':').map(Number);
            return h * 60 + m;
        };

        // Get MOCK services to calculate durations of existing appointments
        const { services } = useBookingStore.getState();

        const busyRanges = dayApps.map(app => {
            const start = toMinutes(app.timeSlot);
            const service = services.find(s => s.id === app.serviceId);
            const duration = service ? service.duration : 60;
            return { start, end: start + duration };
        });

        // Generate slots based on master's working hours
        for (let mins = workStartMins; mins < workEndMins; mins += 30) {
            const h = Math.floor(mins / 60);
            const m = mins % 60;
            const startMins = mins;
            const endMins = startMins + requiredDuration;
            const timeString = `${h}:${m.toString().padStart(2, '0')}`;

            let isAvailable = true;

            // 1. Check if slot + service duration fits within working hours
            if (endMins > workEndMins) {
                isAvailable = false;
            }

            // 2. Check overlap with existing appointments
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
            <div className="flex flex-col items-center">
                <h2 className="text-xl font-bold text-gray-900">Выберите время</h2>
                <p className="text-sm text-gray-500">
                    Всего услуг: {cart.length} • {getTotalDuration()} мин
                </p>
            </div>

            <div className="flex justify-center">
                <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setDate}
                    disabled={(date: Date) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        return date < today || isDayOff(date);
                    }}
                    initialFocus
                    locale={ru}
                    className="rounded-2xl border-none bg-white shadow-xl shadow-gray-200 p-4 w-full max-w-[320px]"
                />
            </div>

            {selectedDate && (
                <div className="animate-in fade-in slide-in-from-bottom-2">
                    <h3 className="mb-3 font-semibold text-center text-gray-800">
                        {format(selectedDate, 'd MMMM', { locale: ru })}
                    </h3>
                    <div className="grid grid-cols-4 gap-2">
                        {timeSlots.map((slot) => (
                            <Button
                                key={slot.time}
                                variant={selectedTimeSlot === slot.time ? "default" : "outline"}
                                className={cn(
                                    "text-sm font-medium transition-all h-10",
                                    selectedTimeSlot === slot.time
                                        ? "bg-pink-600 hover:bg-pink-700 text-white border-none shadow-lg shadow-pink-500/30 scale-105"
                                        : "hover:border-pink-500/50 hover:text-pink-600 bg-white border-gray-200 text-gray-700"
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
