import { useEffect, useState } from 'react';
import { useBookingStore } from '@/store/bookingStore';
import { Appointment } from '@/types';
import { getUsers, getProAppointments, deleteAppointment, updateAppointment } from '@/services/directusService';
import { MOCK_SERVICES } from '@/services/mockData';
import { format, addMinutes, parse, isAfter, isSameDay, parseISO, startOfDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import { MOCK_MASTERS } from '@/services/mockData';
import { isDayOff, isDateFullyBooked } from '@/utils/scheduleUtils';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { CalendarDays, Clock, User as UserIcon, ArrowRight, Phone, MessageCircle, Trash2, CheckCircle, Wallet } from 'lucide-react';
import { ManualBookingForm } from './ManualBookingForm';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export const AdminSchedule = () => {
    const { appointments, setAppointments, users, setUsers, cancelAppointment, updateAppointment: updateAppStore } = useBookingStore();
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined); // Start with NO selection
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);
    const [itemToComplete, setItemToComplete] = useState<Appointment | null>(null);
    const [completionPrice, setCompletionPrice] = useState<string>('');

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            const [fetchedUsers, fetchedAppointments] = await Promise.all([
                getUsers(),
                getProAppointments()
            ]);

            // Sync with store
            if (useBookingStore.getState().users.length === 0) setUsers(fetchedUsers as any);
            if (useBookingStore.getState().appointments.length === 0) setAppointments(fetchedAppointments);

            setLoading(false);
        };
        loadData();
    }, [setAppointments, setUsers]);

    const handleDeleteConfirm = async () => {
        if (!itemToDelete) return;
        try {
            await deleteAppointment(itemToDelete);
            cancelAppointment(itemToDelete);
            setItemToDelete(null);
        } catch (error) {
            console.error("Failed to delete", error);
            alert("Не удалось удалить запись");
        }
    };

    const handleCompleteConfirm = async () => {
        if (!itemToComplete) return;
        // Ensure finalPrice is a number. Fallback to existing price if parsing fails.
        const parsedPrice = parseInt(completionPrice.replace(/\D/g, ''));
        const finalPrice = isNaN(parsedPrice) ? (itemToComplete.price || 0) : parsedPrice;

        try {
            await updateAppointment(itemToComplete.id, {
                status: 'completed',
                finalPrice
            });
            updateAppStore(itemToComplete.id, { status: 'completed', finalPrice });
            setItemToComplete(null);
        } catch (error) {
            console.error("Failed to complete", error);
            alert("Не удалось завершить запись");
        }
    };

    const getClient = (clientId: string) => users.find(u => u.id === clientId);

    const getService = (serviceId: string) => MOCK_SERVICES.find(s => s.id === serviceId);

    const getFormattedTimeRange = (startTime: string, serviceId: string) => {
        const service = getService(serviceId);
        if (!service) return startTime;

        try {
            const start = parse(startTime, 'HH:mm', new Date());
            const end = addMinutes(start, service.duration);
            return `${startTime} - ${format(end, 'HH:mm')}`;
        } catch (e) {
            return startTime;
        }
    };

    const today = new Date();

    // Filter appointments for the selected date
    const dailyAppointments = selectedDate
        ? appointments.filter(app => {
            return format(new Date(app.date), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
        }).sort((a, b) => {
            const isFinishedA = a.status === 'completed' || a.status === 'cancelled';
            const isFinishedB = b.status === 'completed' || b.status === 'cancelled';
            if (isFinishedA !== isFinishedB) {
                return isFinishedA ? 1 : -1; // Finished goes to bottom
            }
            return a.timeSlot.localeCompare(b.timeSlot);
        })
        : [];

    // Get upcoming appointments (future only, sorted by date then time)
    const upcomingAppointments = appointments
        .filter(app => {
            const appDate = parseISO(app.date);
            return isAfter(startOfDay(appDate), startOfDay(new Date())) || isSameDay(appDate, new Date());
        })
        .filter(app => app.status !== 'cancelled')
        .sort((a, b) => {
            // Sort completed to bottom
            const isFinishedA = a.status === 'completed';
            const isFinishedB = b.status === 'completed';
            if (isFinishedA !== isFinishedB) return isFinishedA ? 1 : -1;

            const dateCompare = a.date.localeCompare(b.date);
            return dateCompare !== 0 ? dateCompare : a.timeSlot.localeCompare(b.timeSlot);
        })
        .slice(0, 5); // Show up to 5 upcoming

    // Identify days with appointments
    const busyDays = appointments.map(app => new Date(app.date));

    // Render a single appointment card
    const renderAppointmentCard = (app: Appointment, showDate: boolean = false) => {
        const client = getClient(app.clientId);
        const service = getService(app.serviceId);
        const timeRange = getFormattedTimeRange(app.timeSlot, app.serviceId);
        const appDate = new Date(app.date);

        return (
            <Card key={app.id} className={`border-l-4 border-y-0 border-r-0 shadow-sm hover:shadow-md transition-all ${app.status === 'completed' ? 'bg-gray-50 border-gray-400' : 'bg-white border-pink-500'
                }`}>
                <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            {showDate && (
                                <div className="text-xs text-pink-600 font-medium mb-1 flex items-center gap-1">
                                    <CalendarDays className="w-3 h-3" />
                                    {format(appDate, 'd MMMM, EEEE', { locale: ru })}
                                </div>
                            )}
                            <div className="font-bold text-lg flex items-center gap-2">
                                <Clock className={`w-4 h-4 ${app.status === 'completed' ? 'text-gray-400' : 'text-pink-500'}`} />
                                {timeRange}
                            </div>
                            <div className="text-sm text-pink-600 font-medium ml-6">
                                {service ? service.title : 'Неизвестная услуга'}
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            {/* Status Badge: Show only if NOT confirmed (button replaces it) */}
                            {app.status !== 'confirmed' && (
                                <div className={`px-2 py-1 rounded text-xs font-bold ${app.status === 'cancelled' ? 'bg-red-500/20 text-red-500' :
                                    app.status === 'completed' ? 'bg-blue-500/20 text-blue-600' :
                                        'bg-yellow-500/20 text-yellow-600'
                                    }`}>
                                    {app.status === 'cancelled' ? 'Отменено' :
                                        app.status === 'completed' ? 'Завершено' : 'Ожидание'}
                                </div>
                            )}

                            <div className="flex gap-1">
                                {app.status === 'confirmed' && (
                                    <button
                                        onClick={() => {
                                            setItemToComplete(app);
                                            // Fallback to service price if app.price is missing
                                            const defaultPrice = app.price || app.finalPrice || (service ? service.price : 0);
                                            setCompletionPrice(defaultPrice.toString());
                                        }}
                                        className="flex items-center gap-2 px-3 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-lg transition-all shadow-sm hover:shadow active:scale-95 mr-2"
                                        title="Завершить и рассчитать"
                                    >
                                        <CheckCircle className="w-4 h-4" />
                                        <span className="text-xs font-bold uppercase tracking-wide">Завершить</span>
                                    </button>
                                )}
                                <button
                                    onClick={() => setItemToDelete(app.id)}
                                    className="p-1.5 bg-red-50 text-red-500 hover:bg-red-100 rounded-full transition-colors"
                                    title="Удалить запись"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-1 mt-3 pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-2 text-sm text-gray-700 font-medium">
                            <UserIcon className="w-4 h-4 text-gray-400" />
                            {/* @ts-ignore - handling runtime UserProfile which differs from User type */}
                            {(client?.name || `${client?.firstName || ''} ${client?.lastName || ''}`).trim() || `ID: ${app.clientId}`}
                        </div>
                        {client?.phone && (
                            <div className="flex items-center gap-2 text-xs text-gray-500 ml-6">
                                <span className="tracking-wider">{client.phone}</span>
                            </div>
                        )}
                    </div>

                    {/* Contact Actions */}
                    {client && (
                        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                            {/* @ts-ignore */}
                            {(client.telegramId || client.tgId) && (
                                <a
                                    // @ts-ignore
                                    href={`tg://user?id=${client.telegramId || client.tgId}`}
                                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
                                >
                                    <MessageCircle className="w-4 h-4" />
                                    Написать
                                </a>
                            )}
                            {client.phone && (
                                <a
                                    href={`tel:${client.phone.replace(/\s/g, '')}`}
                                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
                                >
                                    <Phone className="w-4 h-4" />
                                    Позвонить
                                </a>
                            )}
                        </div>
                    )}

                    {app.notes && (
                        <div className="mt-2 text-xs text-gray-500 italic bg-gray-50 p-2 rounded">
                            "{app.notes}"
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    };

    if (loading) {
        return <div className="text-center text-gray-500 mt-10">Загрузка расписания...</div>;
    }

    // Determine what to show: specific day's appointments OR upcoming appointments
    const showUpcoming = !selectedDate || dailyAppointments.length === 0;

    return (
        <div className="space-y-6 animate-in fade-in">


            {/* Today's Date Header */}
            <div className="text-center">
                <p className="text-sm text-gray-500">Сегодня</p>
                <h2 className="text-2xl font-bold text-gray-900">
                    {format(today, 'd MMMM, EEEE', { locale: ru })}
                </h2>
            </div>

            {/* Manual Booking Button */}
            <ManualBookingForm />

            {/* Calendar */}
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    locale={ru}
                    className="rounded-md border-none w-full mx-auto text-gray-900"
                    disabled={(date) => isDayOff(date, MOCK_MASTERS[0])}
                    modifiers={{
                        busy: (date) => isDateFullyBooked(date, appointments, MOCK_SERVICES, MOCK_MASTERS[0]),
                        weekend: { dayOfWeek: [0, 6] }
                    }}
                    modifiersClassNames={{
                        weekend: "bg-red-50 text-red-900",
                        busy: "strikethrough-bold bg-green-100 text-green-900 border-2 border-green-400"
                    }}
                />
            </div>

            {/* Appointments Section */}
            <div>
                {showUpcoming ? (
                    <>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <ArrowRight className="w-5 h-5 text-pink-500" />
                            Ближайшие записи
                        </h3>

                        {upcomingAppointments.length === 0 ? (
                            <div className="text-center text-gray-500 py-8 bg-white rounded-xl border border-dashed border-green-200 bg-green-50/30">
                                <p className="font-medium text-green-700">Нет предстоящих записей</p>
                                <p className="text-xs text-green-600/70 mt-1">Клиенты пока не записались</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {upcomingAppointments.map(app => renderAppointmentCard(app, true))}
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">
                            {format(selectedDate, 'd MMMM', { locale: ru })}
                        </h3>

                        <div className="space-y-3">
                            {dailyAppointments.map(app => renderAppointmentCard(app, false))}
                        </div>
                    </>
                )}
            </div>

            <Dialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Удаление записи</DialogTitle>
                        <DialogDescription>
                            Вы уверены, что хотите удалить эту запись? Это действие нельзя отменить.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setItemToDelete(null)}>Отмена</Button>
                        <Button variant="destructive" onClick={handleDeleteConfirm}>Удалить</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!itemToComplete} onOpenChange={(open) => !open && setItemToComplete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Завершение услуги</DialogTitle>
                        <DialogDescription>
                            Подтвердите выполнение услуги и итоговую сумму.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="price" className="text-right">
                                Сумма
                            </Label>
                            <Input
                                id="price"
                                value={completionPrice}
                                onChange={(e) => setCompletionPrice(e.target.value)}
                                className="col-span-3"
                                type="number"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setItemToComplete(null)}>Отмена</Button>
                        <Button className="bg-green-600 hover:bg-green-700 w-full sm:w-auto" onClick={handleCompleteConfirm}>
                            <Wallet className="w-4 h-4 mr-2" />
                            Закрыть заказ
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
