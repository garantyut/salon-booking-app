import { useState } from 'react';
import { useBookingStore } from '@/store/bookingStore';
import { Appointment } from '@/types';
import { MOCK_SERVICES, MOCK_MASTERS, addAppointmentMock } from '@/services/mockData';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
// Card imports removed - using Dialog instead
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Plus, Save, X } from 'lucide-react';

interface ManualBookingFormProps {
    onSuccess?: () => void;
}

export const ManualBookingForm = ({ onSuccess }: ManualBookingFormProps) => {
    const { addAppointment } = useBookingStore();
    const [open, setOpen] = useState(false);

    // Form state
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
    const [selectedTime, setSelectedTime] = useState<string>('');
    const [selectedService, setSelectedService] = useState<string>('');
    const [clientName, setClientName] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    const resetForm = () => {
        setSelectedDate(undefined);
        setSelectedTime('');
        setSelectedService('');
        setClientName('');
        setClientPhone('');
        setNotes('');
    };

    // Generate time slots (10:00 - 20:00)
    const timeSlots: string[] = [];
    for (let h = 10; h < 20; h++) {
        timeSlots.push(`${h}:00`);
        timeSlots.push(`${h}:30`);
    }

    const handleSubmit = async () => {
        if (!selectedDate || !selectedTime || !selectedService || !clientName) {
            alert('Заполните все обязательные поля');
            return;
        }

        setSaving(true);

        // Create a "manual" user ID (for phone-only clients)
        const manualClientId = `manual-${Date.now()}`;

        const newAppointment: Appointment = {
            id: `app-manual-${Date.now()}`,
            clientId: manualClientId,
            masterId: MOCK_MASTERS[0]?.id || 'master-1',
            serviceId: selectedService,
            date: format(selectedDate, 'yyyy-MM-dd'),
            timeSlot: selectedTime,
            status: 'confirmed',
            notes: `[Ручная запись] ${clientName}${clientPhone ? ` | ${clientPhone}` : ''}${notes ? ` | ${notes}` : ''}`,
            createdAt: Date.now()
        };

        // Add to store
        addAppointment(newAppointment);

        // Also add to mock backend
        await addAppointmentMock(newAppointment);

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
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Новая запись</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 pt-4">
                    {/* Client Name */}
                    <div className="space-y-2">
                        <Label htmlFor="clientName">Имя клиента *</Label>
                        <Input
                            id="clientName"
                            placeholder="Введите имя клиента"
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value)}
                        />
                    </div>

                    {/* Client Phone */}
                    <div className="space-y-2">
                        <Label htmlFor="clientPhone">Телефон</Label>
                        <Input
                            id="clientPhone"
                            type="tel"
                            placeholder="+7 999 123 45 67"
                            value={clientPhone}
                            onChange={(e) => setClientPhone(e.target.value)}
                        />
                    </div>

                    {/* Date Selection - MOVED UP */}
                    <div className="space-y-2">
                        <Label>Дата *</Label>
                        <div className="border rounded-lg p-2 bg-white relative z-10">
                            <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={setSelectedDate}
                                locale={ru}
                                className="mx-auto"
                                disabled={(date) => date < new Date()}
                            />
                        </div>
                        {selectedDate && (
                            <p className="text-sm text-pink-600 font-medium">
                                Выбрано: {format(selectedDate, 'd MMMM, EEEE', { locale: ru })}
                            </p>
                        )}
                    </div>

                    {/* Time Selection - MOVED UP */}
                    <div className="space-y-2">
                        <Label>Время *</Label>
                        <Select value={selectedTime} onValueChange={setSelectedTime}>
                            <SelectTrigger>
                                <SelectValue placeholder="Выберите время" />
                            </SelectTrigger>
                            <SelectContent position="popper" className="z-50">
                                {timeSlots.map(time => (
                                    <SelectItem key={time} value={time}>
                                        {time}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Service Selection - MOVED DOWN */}
                    <div className="space-y-2">
                        <Label>Услуга *</Label>
                        <Select value={selectedService} onValueChange={setSelectedService}>
                            <SelectTrigger>
                                <SelectValue placeholder="Выберите услугу" />
                            </SelectTrigger>
                            <SelectContent position="popper" className="z-50">
                                {MOCK_SERVICES.map(service => (
                                    <SelectItem key={service.id} value={service.id}>
                                        {service.title} — {service.price}₽
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label htmlFor="notes">Заметки</Label>
                        <Input
                            id="notes"
                            placeholder="Доп. информация (опционально)"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-4">
                        <DialogClose asChild>
                            <Button variant="outline" className="flex-1">
                                <X className="w-4 h-4 mr-2" />
                                Отмена
                            </Button>
                        </DialogClose>
                        <Button
                            onClick={handleSubmit}
                            disabled={saving || !selectedDate || !selectedTime || !selectedService || !clientName}
                            className="flex-1 bg-pink-600 hover:bg-pink-700"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {saving ? 'Сохранение...' : 'Сохранить'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
