import { useEffect, useState } from 'react';
import { useBookingStore } from '@/store/bookingStore';
import { Appointment } from '@/types';
import { getUsers, getUserAppointments, MOCK_SERVICES } from '@/services/mockData';
import { format, addMinutes, parse, isAfter, isSameDay, parseISO, startOfDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { CalendarDays, Clock, User as UserIcon, ArrowRight, Phone, MessageCircle } from 'lucide-react';
import { ManualBookingForm } from './ManualBookingForm';

export const AdminSchedule = () => {
    const { appointments, setAppointments, users, setUsers } = useBookingStore();
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined); // Start with NO selection

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            const [fetchedUsers, fetchedAppointments] = await Promise.all([
                getUsers(),
                getUserAppointments()
            ]);

            // Sync with store
            if (useBookingStore.getState().users.length === 0) setUsers(fetchedUsers);
            if (useBookingStore.getState().appointments.length === 0) setAppointments(fetchedAppointments);

            setLoading(false);
        };
        loadData();
    }, [setAppointments, setUsers]);

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
        }).sort((a, b) => a.timeSlot.localeCompare(b.timeSlot))
        : [];

    // Get upcoming appointments (future only, sorted by date then time)
    const upcomingAppointments = appointments
        .filter(app => {
            const appDate = parseISO(app.date);
            return isAfter(startOfDay(appDate), startOfDay(new Date())) || isSameDay(appDate, new Date());
        })
        .filter(app => app.status !== 'cancelled')
        .sort((a, b) => {
            const dateCompare = a.date.localeCompare(b.date);
            return dateCompare !== 0 ? dateCompare : a.timeSlot.localeCompare(b.timeSlot);
        })
        .slice(0, 5); // Show up to 5 upcoming

    // Identify days with appointments
    const busyDays = appointments.map(app => new Date(app.date));

    // CSS for custom calendar styling
    const calendarStyles = `
        .rdp-day { border-radius: 8px; margin: 1px; font-weight: 600; font-size: 16px; }
        .rdp-day_today { font-weight: bold; border: 2px solid #3b82f6; }
        .rdp-day_selected { background-color: #fce7f3 !important; border-color: #db2777 !important; color: #be185d !important; }
        .rdp-day_outside { border-color: transparent; opacity: 0.5; }
    `;

    // Render a single appointment card
    const renderAppointmentCard = (app: Appointment, showDate: boolean = false) => {
        const client = getClient(app.clientId);
        const service = getService(app.serviceId);
        const timeRange = getFormattedTimeRange(app.timeSlot, app.serviceId);
        const appDate = new Date(app.date);

        return (
            <Card key={app.id} className="bg-white border-l-4 border-l-pink-500 border-y-0 border-r-0 text-gray-900 shadow-sm hover:shadow-md transition-all">
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
                                <Clock className="w-4 h-4 text-pink-500" />
                                {timeRange}
                            </div>
                            <div className="text-sm text-pink-600 font-medium ml-6">
                                {service ? service.title : 'Неизвестная услуга'}
                            </div>
                        </div>
                        <div className={`px-2 py-1 rounded text-xs font-bold ${app.status === 'confirmed' ? 'bg-green-500/20 text-green-600' :
                            app.status === 'cancelled' ? 'bg-red-500/20 text-red-500' :
                                'bg-yellow-500/20 text-yellow-600'
                            }`}>
                            {app.status === 'confirmed' ? 'Подтверждено' :
                                app.status === 'cancelled' ? 'Отменено' : 'Ожидание'}
                        </div>
                    </div>

                    <div className="flex flex-col gap-1 mt-3 pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-2 text-sm text-gray-700 font-medium">
                            <UserIcon className="w-4 h-4 text-gray-400" />
                            {client ? client.name : `ID: ${app.clientId}`}
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
                            {client.tgId && (
                                <a
                                    href={`tg://user?id=${client.tgId}`}
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
            <style>{calendarStyles}</style>

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
                    className="rounded-md border-none w-full mx-auto flex justify-center text-gray-900"
                    modifiers={{
                        busy: busyDays,
                        weekend: { dayOfWeek: [0, 6] }
                    }}
                    modifiersClassNames={{
                        weekend: "bg-red-50 text-red-900",
                        busy: "bg-green-100 text-green-900 border-2 border-green-400"
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
        </div>
    );
};
