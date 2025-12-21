import { useEffect } from 'react';
import { useBookingStore } from '@/store/bookingStore';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, isSameDay, parseISO, getDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { MOCK_MASTERS } from '@/services/mockData';
import { isDayOff, isDateFullyBooked, generateTimeSlots } from '@/utils/scheduleUtils';

export const BookingCalendar = () => {
    const {
        selectedDate, setDate,
        selectedTimeSlot, setTimeSlot,
        cart, getTotalDuration,
        appointments // Get existing appointments
    } = useBookingStore();

    // Get the master's schedule (assuming single master for now)
    const master = MOCK_MASTERS[0];

    // Helper to check availability using shared Utility
    const checkAvailability = (date: Date) => {
        const { services } = useBookingStore.getState();
        // Check availability for a standard duration (e.g. Total Duration of cart)
        const totalDuration = getTotalDuration();
        const slots = generateTimeSlots(date, appointments, services, master, totalDuration);
        return slots.some(s => s.available);
    };

    // Set default date to Today if not set
    useEffect(() => {
        if (!selectedDate) {
            setDate(new Date());
        }
    }, [selectedDate, setDate]);

    // Clear time slot when date changes to prevent stale selection
    useEffect(() => {
        setTimeSlot(null);
    }, [selectedDate, setTimeSlot]);

    const isFullyBooked = (date: Date) => {
        // Use shared utility for "Fully Booked" check (visual strikethrough)
        const { services } = useBookingStore.getState();
        return isDateFullyBooked(date, appointments, services, master);
    };

    const timeSlots = selectedDate
        ? generateTimeSlots(selectedDate, appointments, useBookingStore.getState().services, master, getTotalDuration())
        : [];

    // CSS for custom calendar styling (Same as AdminSchedule)
    const calendarStyles = `
        .rdp { margin: 0; width: 100% !important; --rdp-cell-size: 50px; }
        
        /* Target standard HTML tags inside the container to bypass specific class names */
        .rdp table { width: 100% !important; max-width: none !important; }
        
        /* Force rows to flex uniformly */
        .rdp tbody tr, .rdp thead tr { 
            display: flex !important; 
            width: 100% !important; 
            justify-content: space-between !important; 
        }
        
        /* Force cells to expand */
        .rdp td, .rdp th { 
            width: 100% !important; 
            flex: 1 !important; 
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
            padding: 0 !important;
        }

        /* Adjust height for day cells */
        .rdp td { height: 54px !important; }

        /* Target the day button broadly */
        .rdp button[name="day"], .rdp-day, .rdp td button {
            width: 100% !important;
            height: 100% !important;
            border-radius: 12px !important;
            font-size: 19px !important;
            font-weight: 600 !important;
        }

        /* Header styling */
        .rdp th {
            font-size: 14px; 
            text-transform: uppercase; 
            color: #9ca3af; 
            font-weight: 500;
            padding-bottom: 8px !important;
            height: auto !important;
        }

        .rdp-caption { 
            display: flex; 
            justify-content: center; 
            width: 100%; 
            position: relative; 
            margin-bottom: 16px; 
        }
        
        .rdp-months { width: 100% !important; justify-content: center; }
        .rdp-month { width: 100% !important; }

        .rdp-day_today { color: #2563eb; }
        /* Override selected style for Client View specifically if needed, but keeping consistent pink/green mix? 
           Actually, the client view uses Green theme in buttons. Admin uses Pink.
           Let's update selected style to match Client Green theme */
        .rdp-day_selected { background-color: #dcfce7 !important; border-color: #22c55e !important; color: #15803d !important; }
        .rdp-day_outside { opacity: 0.3; }
    `;



    return (
        <div className="space-y-6 animate-in slide-in-from-right-8 duration-500 pb-20">
            <style>{calendarStyles}</style>

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

            <div className="relative">
                <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setDate(date)}
                    required
                    disabled={(date: Date) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        // Disable if: Past, Day Off, OR Fully Booked
                        return date < today || isDayOff(date, master) || isFullyBooked(date);
                    }}
                    modifiers={{
                        busy: isFullyBooked
                    }}
                    modifiersClassNames={{
                        busy: 'strikethrough-bold'
                    }}
                    classNames={{
                        // These might be overridden by our heavy CSS above, but let's keep them
                        day_selected: "bg-green-600 text-white hover:bg-green-600 hover:text-white focus:bg-green-600 focus:text-white rounded-full font-bold shadow-md shadow-green-500/20",
                        day_today: "bg-green-100 text-green-700 font-extrabold border-2 border-green-500 rounded-full",
                    }}
                    initialFocus
                    locale={ru}
                    className="rounded-2xl border-none bg-white shadow-xl shadow-gray-200 p-4 w-full"
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
