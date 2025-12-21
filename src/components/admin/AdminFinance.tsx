import { useState, useMemo } from 'react';
import { useBookingStore } from '@/store/bookingStore';
import { format, isSameDay, isSameMonth, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet, TrendingUp, Calendar as CalendarIcon, Filter } from 'lucide-react';
import { Appointment } from '@/types';

type Period = 'day' | 'month' | 'all';

export const AdminFinance = () => {
    const { appointments, users } = useBookingStore();
    const [period, setPeriod] = useState<Period>('day');
    const [selectedDate, setSelectedDate] = useState(new Date());

    const completedAppointments = useMemo(() =>
        appointments.filter(app => app.status === 'completed'),
        [appointments]
    );

    const filteredAppointments = useMemo(() => {
        return completedAppointments.filter(app => {
            const appDate = parseISO(app.date);
            if (period === 'day') {
                return isSameDay(appDate, selectedDate);
            }
            if (period === 'month') {
                return isSameMonth(appDate, selectedDate);
            }
            return true;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [completedAppointments, period, selectedDate]);

    const totalRevenue = useMemo(() =>
        filteredAppointments.reduce((sum, app) => sum + (app.finalPrice || app.price || 0), 0),
        [filteredAppointments]
    );

    const getClientName = (id: string) => {
        const user = users.find(u => u.id === id);
        return user?.firstName || 'Клиент';
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Header / Filter */}
            <div className="flex flex-col gap-4">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Wallet className="w-6 h-6 text-pink-500" />
                    Финансы
                </h2>

                <div className="flex gap-2 bg-white p-1 rounded-xl border border-gray-100 shadow-sm w-fit">
                    <Button
                        variant={period === 'day' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setPeriod('day')}
                        className={period === 'day' ? 'bg-pink-500 hover:bg-pink-600' : ''}
                    >
                        День
                    </Button>
                    <Button
                        variant={period === 'month' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setPeriod('month')}
                        className={period === 'month' ? 'bg-pink-500 hover:bg-pink-600' : ''}
                    >
                        Месяц
                    </Button>
                    <Button
                        variant={period === 'all' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setPeriod('all')}
                        className={period === 'all' ? 'bg-pink-500 hover:bg-pink-600' : ''}
                    >
                        Всё время
                    </Button>
                </div>
            </div>

            {/* Total Card */}
            <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white border-none shadow-lg shadow-green-500/20">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-green-100 font-medium">Общая выручка</p>
                        <TrendingUp className="w-5 h-5 text-green-100" />
                    </div>
                    <div className="text-4xl font-bold">
                        {totalRevenue.toLocaleString('ru-RU')} ₽
                    </div>
                    <div className="text-sm text-green-100 mt-2 opacity-80">
                        {period === 'day' && `За ${format(selectedDate, 'd MMMM', { locale: ru })}`}
                        {period === 'month' && `За ${format(selectedDate, 'MMMM yyyy', { locale: ru })}`}
                        {period === 'all' && 'За весь период'}
                    </div>
                </CardContent>
            </Card>

            {/* Transactions List */}
            <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <ListIcon className="w-4 h-4 text-gray-400" />
                    История операций ({filteredAppointments.length})
                </h3>

                <div className="space-y-3">
                    {filteredAppointments.length === 0 ? (
                        <div className="text-center py-10 text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
                            Нет операций за этот период
                        </div>
                    ) : (
                        filteredAppointments.map(app => (
                            <Card key={app.id} className="bg-white border-gray-100 shadow-sm">
                                <CardContent className="p-4 flex justify-between items-center">
                                    <div>
                                        <div className="font-medium text-gray-900">
                                            {getClientName(app.clientId)}
                                        </div>
                                        <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                                            <CalendarIcon className="w-3 h-3" />
                                            {format(parseISO(app.date), 'd MMM', { locale: ru })}
                                            <span>•</span>
                                            {app.timeSlot}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-green-600">
                                            +{(app.finalPrice || app.price).toLocaleString('ru-RU')} ₽
                                        </div>
                                        {app.finalPrice && app.finalPrice !== app.price && (
                                            <div className="text-xs text-gray-400 line-through">
                                                {app.price} ₽
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

// Helper Icon
function ListIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <line x1="8" x2="21" y1="6" y2="6" />
            <line x1="8" x2="21" y1="12" y2="12" />
            <line x1="8" x2="21" y1="18" y2="18" />
            <line x1="3" x2="3.01" y1="6" y2="6" />
            <line x1="3" x2="3.01" y1="12" y2="12" />
            <line x1="3" x2="3.01" y1="18" y2="18" />
        </svg>
    )
}
