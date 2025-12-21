import { useState, useEffect } from 'react';
import { useBookingStore } from '@/store/bookingStore';
import { Appointment } from '@/types';
import { MOCK_SERVICES, MOCK_MASTERS } from '@/services/mockData';
import { getProAppointments, addAppointment as addAppointmentService } from '@/services/firebaseService';
import { format, startOfToday, isBefore, isSameDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import { isDayOff, isDateFullyBooked, checkSlotAvailability } from '@/utils/scheduleUtils';
import { Calendar } from '@/components/ui/calendar';
// Card imports removed - using Dialog instead
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Plus, Save, X, ArrowLeft, ChevronRight } from 'lucide-react';

interface ManualBookingFormProps {
    onSuccess?: () => void;
}

export const ManualBookingForm = ({ onSuccess }: ManualBookingFormProps) => {
    const { addAppointment, users, appointments, setAppointments } = useBookingStore();
    const [open, setOpen] = useState(false);

    // Master Schedule Logic (Standardized)
    const master = MOCK_MASTERS[0];

    // Refresh data when opening dialog to prevent double booking on stale data
    useEffect(() => {
        if (open) {
            if (!selectedDate) setSelectedDate(new Date()); // Default to today
            getProAppointments().then(setAppointments).catch(console.error);
        }
    }, [open, setAppointments]);

    // Form state
    const [selectedClientId, setSelectedClientId] = useState<string>('new');
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
    const [selectedTime, setSelectedTime] = useState<string>('');
    const [selectedService, setSelectedService] = useState<string>('');
    const [clientName, setClientName] = useState('');
    const [clientSurname, setClientSurname] = useState('');
    const [clientPhone, setClientPhone] = useState('+7 ');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [isSelectingService, setIsSelectingService] = useState(false);

    const resetForm = () => {
        setSelectedClientId('new');
        setSelectedDate(undefined);
        setSelectedTime('');
        setSelectedService('');
        setClientName('');
        setClientPhone('+7 ');
        setNotes('');
        setClientSurname('');
    };

    const getServiceDuration = (serviceId: string) => {
        const s = MOCK_SERVICES.find(srv => srv.id === serviceId);
        return s?.duration || 60; // Default 60 mins
    };

    // Calculate busy slots (Collision Detection)
    const isSlotBusy = (time: string, date: Date | undefined) => {
        if (!date) return false;
        const duration = selectedService ? getServiceDuration(selectedService) : 60;
        // Use shared utility
        return !checkSlotAvailability(date, time, duration, appointments, MOCK_SERVICES);
    };


    // Generate time slots (10:00 - 20:00)
    const timeSlots: string[] = [];
    // Hardcoded loop for UI buttons (could also use generateTimeSlots but we want all buttons for manual override if needed?)
    // Actually, let's keep the hardcoded loop for *displaying* buttons, but check availability.
    // Ideally we should use the master's schedule.
    // Let's rely on master schedule if possible, or keep the hardcoded for now but use shared Busy Check.

    if (master.workingHours) {
        // Use master schedule for start/end
        const dayOfWeek = selectedDate ? selectedDate.getDay() : new Date().getDay();
        const schedule = master.workingHours[dayOfWeek];
        if (schedule && !schedule.isDayOff) {
            const [startH] = schedule.start.split(':').map(Number);
            const [endH] = schedule.end.split(':').map(Number);
            for (let h = startH; h < endH; h++) {
                timeSlots.push(`${h}:00`);
                timeSlots.push(`${h}:30`);
            }
        } else {
            // Fallback or empty if day off
        }
    }
    // Fallback if no date selected yet or something
    if (timeSlots.length === 0) {
        for (let h = 10; h < 20; h++) {
            timeSlots.push(`${h}:00`);
            timeSlots.push(`${h}:30`);
        }
    }


    // Helper to check if a day is fully booked
    const isDayFullyBookedLocal = (day: Date) => {
        return isDateFullyBooked(day, appointments, MOCK_SERVICES, master);
    };

    const handleSubmit = async () => {
        if (!selectedDate) { alert('Выберите дату'); return; }
        if (!selectedTime) { alert('Выберите время'); return; }
        if (!selectedService) { alert('Выберите услугу'); return; }
        if (selectedClientId === 'new' && !clientName) { alert('Введите имя клиента'); return; }

        setSaving(true);

        // Create a "manual" user ID (for phone-only clients)
        const manualClientId = selectedClientId !== 'new' ? selectedClientId : `manual-${Date.now()}`;

        const serviceDetails = MOCK_SERVICES.find(s => s.id === selectedService);
        const fullClientName = `${clientSurname} ${clientName}`.trim();

        const appointmentData = {
            clientId: manualClientId,
            masterId: MOCK_MASTERS[0]?.id || 'master-1',
            serviceId: selectedService,
            date: format(selectedDate, 'yyyy-MM-dd'),
            timeSlot: selectedTime,
            status: 'confirmed' as 'confirmed',
            notes: `[Ручная запись] ${fullClientName}${clientPhone ? ` | ${clientPhone}` : ''}${notes ? ` | ${notes}` : ''}`,
            createdAt: Date.now(),
            price: serviceDetails?.price || 0
        };

        // 1. Save to Backend (Persistence)
        const newId = await addAppointmentService(appointmentData);

        // 2. Add to Local Store (Immediate UI update)
        addAppointment({ ...appointmentData, id: newId });

        // 3. Refresh list just in case (optional, but safer)
        const freshApps = await getProAppointments();
        setAppointments(freshApps);

        setSaving(false);
        setOpen(false);
        resetForm();

        if (onSuccess) {
            onSuccess();
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="w-full bg-pink-600 hover:bg-pink-700 text-white shadow-md shadow-pink-200 py-5 text-base font-medium">
                    <Plus className="w-5 h-5 mr-2" />
                    Добавить запись вручную
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-gray-50/50">
                {isSelectingService ? (
                    <div className="space-y-4 animate-in slide-in-from-right">
                        <div className="flex items-center gap-2 mb-2 pt-2">
                            <Button variant="ghost" size="icon" className="-ml-3 rounded-full" onClick={() => setIsSelectingService(false)}>
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                            <h2 className="font-bold text-lg">Выберите услугу</h2>
                        </div>
                        <div className="space-y-2 pb-4">
                            {MOCK_SERVICES.map(service => (
                                <button
                                    key={service.id}
                                    onClick={() => { setSelectedService(service.id); setIsSelectingService(false); }}
                                    className={`w-full text-left p-4 border rounded-2xl shadow-sm flex justify-between items-center transition-all ${selectedService === service.id
                                        ? 'bg-pink-50 border-pink-500 ring-1 ring-pink-500'
                                        : 'bg-white border-gray-100 hover:border-pink-200'
                                        }`}
                                >
                                    <span className="font-semibold text-gray-900">{service.title}</span>
                                    <span className="font-bold text-pink-600 bg-pink-50 px-2 py-1 rounded-lg">{service.price} ₽</span>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <>
                        <DialogHeader>
                            <DialogTitle>Новая запись</DialogTitle>
                        </DialogHeader>

                        <div className="space-y-8 pt-4 pb-10">
                            {/* 1. Client Section */}
                            <div className="space-y-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                                <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Клиент</Label>
                                <Select
                                    value={selectedClientId}
                                    onValueChange={(val) => {
                                        setSelectedClientId(val);
                                        if (val === 'new') {
                                            setClientName('');
                                            setClientSurname('');
                                            setClientPhone('+7 ');
                                        } else {
                                            const user = users.find(u => u.id === val);
                                            if (user) {
                                                setClientName(user.firstName || '');
                                                setClientSurname((user as any).lastName || '');
                                                setClientPhone(user.phone || '+7 ');
                                            }
                                        }
                                    }}
                                >
                                    <SelectTrigger className="bg-gray-50 border-gray-200">
                                        <SelectValue placeholder="Поиск клиента" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[200px] bg-white z-[100]">
                                        <SelectItem value="new" className="font-medium text-pink-600 border-b pb-2 mb-2">
                                            + Новый клиент
                                        </SelectItem>
                                        {users.filter(u => u.firstName || u.phone).map(u => (
                                            <SelectItem key={u.id} value={u.id}>
                                                {/* Display Name + Surname + Phone */}
                                                <span className="font-medium">{u.firstName} {u.lastName || ''}</span>
                                                <span className="text-gray-400 text-xs ml-2">{u.phone}</span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {selectedClientId === 'new' && (
                                    <div className="space-y-3 animate-in fade-in">
                                        <div className="grid grid-cols-2 gap-3">
                                            <Input
                                                placeholder="Имя"
                                                value={clientName}
                                                onChange={(e) => setClientName(e.target.value)}
                                                className="bg-gray-50"
                                            />
                                            <Input
                                                placeholder="Фамилия"
                                                value={clientSurname}
                                                onChange={(e) => setClientSurname(e.target.value)}
                                                className="bg-gray-50"
                                            />
                                        </div>
                                        <Input
                                            type="tel"
                                            placeholder="Телефон"
                                            value={clientPhone}
                                            onChange={(e) => setClientPhone(e.target.value)}
                                            className="bg-gray-50"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* 2. Service Section */}
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Услуга</Label>
                                <button
                                    onClick={() => setIsSelectingService(true)}
                                    className={`w-full p-4 rounded-xl border text-left flex justify-between items-center transition-all group ${selectedService
                                        ? 'bg-white border-pink-500 shadow-md ring-1 ring-pink-100'
                                        : 'bg-white border-gray-200 hover:border-pink-300'
                                        }`}
                                >
                                    <div className="flex flex-col">
                                        <span className={`text-base ${selectedService ? 'font-bold text-gray-900' : 'font-medium text-gray-500'}`}>
                                            {selectedService
                                                ? MOCK_SERVICES.find(s => s.id === selectedService)?.title
                                                : 'Выберите услугу'}
                                        </span>
                                        {selectedService && (
                                            <span className="text-sm text-pink-600 font-medium mt-1">
                                                {MOCK_SERVICES.find(s => s.id === selectedService)?.price} ₽
                                            </span>
                                        )}
                                    </div>
                                    <ChevronRight className={`w-5 h-5 text-gray-400 group-hover:text-pink-500 transition-colors ${!selectedService && 'animate-pulse'}`} />
                                </button>
                            </div>

                            {/* 3. Date Section */}
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Дата</Label>
                                <div className="border rounded-2xl p-2 bg-white shadow-sm">
                                    <Calendar
                                        mode="single"
                                        selected={selectedDate}
                                        onSelect={setSelectedDate}
                                        locale={ru}
                                        className="mx-auto w-full"
                                        disabled={(date) => isBefore(date, startOfToday()) || isDayOff(date, master) || isDayFullyBookedLocal(date)}
                                        modifiers={{
                                            weekend: { dayOfWeek: [0, 6] },
                                            fullyBooked: isDayFullyBookedLocal
                                        }}
                                        modifiersClassNames={{
                                            weekend: 'text-red-500 font-bold',
                                            fullyBooked: 'strikethrough-bold'
                                        }}
                                        classNames={{
                                            day_today: "bg-green-100 text-green-700 border-2 border-green-500 font-bold hover:bg-green-200",
                                            day_selected: "bg-green-600 text-white hover:bg-green-600 hover:text-white focus:bg-green-600 focus:text-white opacity-100 shadow-md",
                                            day: "h-12 w-full p-0 font-normal aria-selected:opacity-100 hover:bg-green-50 rounded-lg text-lg", // Larger cells
                                            head_cell: "text-muted-foreground rounded-md w-full font-normal text-[0.9rem]",
                                            cell: "h-12 w-full text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
                                            table: "w-full border-collapse space-y-1",
                                            row: "flex w-full mt-2 gap-1"
                                        }}
                                    />
                                </div>
                            </div>

                            {/* 4. Time Section */}
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Время</Label>

                                {/* DEBUG: Show found appointments */}
                                {selectedDate && (
                                    <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800 mb-2">
                                        <strong>Debug (Занято в базе):</strong>
                                        {appointments
                                            .filter(a => isSameDay(new Date(a.date), selectedDate) && a.status !== 'cancelled')
                                            .map(a => ` ${a.timeSlot} (${getServiceDuration(a.serviceId)}мин)`)
                                            .join(', ') || ' Нет записей'}
                                    </div>
                                )}

                                <div className="grid grid-cols-4 gap-2">
                                    {timeSlots.map(time => {
                                        const isBusy = isSlotBusy(time, selectedDate);
                                        const isSelected = selectedTime === time;

                                        return (
                                            <button
                                                key={time}
                                                onClick={() => !isBusy && setSelectedTime(time)}
                                                disabled={isBusy}
                                                className={`py-2 px-1 text-sm font-bold rounded-xl border transition-all duration-200 ${isBusy
                                                    ? 'bg-gray-100 text-gray-300 border-gray-100 cursor-not-allowed decoration-slice line-through opacity-60'
                                                    : isSelected
                                                        ? 'bg-pink-600 text-white border-pink-600 shadow-lg shadow-pink-500/30 transform scale-105 z-10'
                                                        : 'bg-white text-green-700 border-green-500 hover:bg-green-50 hover:shadow-md'
                                                    }`}
                                            >
                                                {time}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* 5. Notes */}
                            <div className="space-y-2">
                                <Label htmlFor="notes" className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Заметки</Label>
                                <Input
                                    id="notes"
                                    placeholder="Доп. информация..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="bg-white rounded-xl"
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-4 border-t border-gray-100 relative">
                                <DialogClose asChild>
                                    <Button variant="ghost" className="flex-1 rounded-xl hover:bg-gray-100">
                                        Отмена
                                    </Button>
                                </DialogClose>
                                <Button
                                    onClick={handleSubmit}
                                    disabled={saving}
                                    className="flex-[2] bg-pink-600 hover:bg-pink-700 text-white rounded-xl shadow-lg shadow-pink-500/20 py-6 text-lg font-bold"
                                >
                                    {saving ? 'Сохранение...' : 'Записать'}
                                </Button>
                                {/* Debug info */}
                                <div className="text-[10px] text-gray-400 absolute bottom-[-20px] left-0 w-full text-center">
                                    Debug: D:{selectedDate ? 'OK' : 'X'} T:{selectedTime ? 'OK' : 'X'} S:{selectedService ? 'OK' : 'X'}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
};
