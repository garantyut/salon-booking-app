import { useEffect } from 'react';
import { useSalon } from '@/contexts/SalonContext';
import { useBookingStore } from '@/store/bookingStore';
import { getUserAppointments } from '@/services/directusService';
import { MOCK_SERVICES } from '@/services/mockData';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Clock, Scissors, Pencil, Trash2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface UserAppointmentsProps {
    onReschedule: () => void;
    userId: string;
}

export const UserAppointments = ({ onReschedule, userId }: UserAppointmentsProps) => {
    const { appointments, setAppointments, cancelAppointment, startRescheduling } = useBookingStore();
    const { config } = useSalon();

    useEffect(() => {
        // Only load if empty to preserve local edits during session
        if (appointments.length === 0 && userId) {
            getUserAppointments(userId).then(setAppointments);
        }
    }, [setAppointments, appointments.length, userId]);

    if (appointments.length === 0) return null;

    // Helpers to find service/master details (since appointment only stores IDs)
    const getService = (id: string) => MOCK_SERVICES.find(s => s.id === id);
    // const getMaster = (id: string) => MOCK_MASTERS.find(m => m.id === id);

    const now = new Date('2025-12-15'); // Simulating current date to match mock data context
    // In real app use: const now = new Date();

    const upcoming = appointments
        .filter(a => new Date(a.date) >= now)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const history = appointments
        .filter(a => new Date(a.date) < now)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 2); // Show only last 2

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            {upcoming.length > 0 && (
                <div className="space-y-3">
                    <h2 className="text-xl font-bold text-gray-900 border-l-4 border-green-500 pl-3">
                        Ближайшая запись
                    </h2>
                    {upcoming.map(app => {
                        const service = getService(app.serviceId);
                        return (
                            <Card key={app.id} className="relative overflow-hidden bg-white border border-green-100 shadow-sm">
                                <div className="absolute top-0 left-0 w-1 h-full bg-green-500" />
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h3 className="font-bold text-lg text-gray-900 leading-tight">{service?.title}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Calendar className="w-5 h-5 text-green-500" />
                                                <span className="text-lg font-bold text-gray-700">
                                                    {format(new Date(app.date), 'd MMMM', { locale: ru })}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <div className="flex items-center gap-1">
                                                <Clock className="w-6 h-6 text-green-600" />
                                                <span className="text-3xl font-black text-green-600 leading-none">
                                                    {app.timeSlot}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mb-4" /> {/* Spacer */}

                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1 h-8 border-gray-200 text-gray-600 hover:bg-green-50 hover:text-green-600"
                                            onClick={() => {
                                                if (startRescheduling) {
                                                    startRescheduling(app.id);
                                                    onReschedule();
                                                }
                                            }}
                                        >
                                            <Pencil className="w-3 h-3 mr-2" />
                                            Изменить
                                        </Button>

                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 border-gray-200 text-red-400 hover:bg-red-50 hover:text-red-500"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="bg-white border-gray-200 text-gray-900 w-[90%] rounded-xl">
                                                <DialogHeader>
                                                    <DialogTitle>Отменить запись?</DialogTitle>
                                                    <DialogDescription className="text-gray-500">
                                                        Вы уверены, что хотите отменить запись на {format(new Date(app.date), 'd MMMM', { locale: ru })} в {app.timeSlot}?
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <DialogFooter className="flex-row gap-2 justify-end">
                                                    <DialogClose asChild>
                                                        <Button variant="outline" className="bg-transparent border-gray-200 text-gray-600 mt-0">
                                                            Нет, оставить
                                                        </Button>
                                                    </DialogClose>
                                                    <Button
                                                        variant="destructive"
                                                        className="bg-red-500 hover:bg-red-600 border-none text-white"
                                                        onClick={() => cancelAppointment && cancelAppointment(app.id)}
                                                    >
                                                        Да, отменить
                                                    </Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {history.length > 0 && (
                <div className="space-y-3">
                    <h2 className="text-lg font-bold text-gray-400 pl-1">
                        История посещений
                    </h2>
                    <div className="space-y-2">
                        {history.map(app => {
                            const service = getService(app.serviceId);
                            return (
                                <Card key={app.id} className="bg-white border text-gray-900 opacity-75 hover:opacity-100 transition-opacity">
                                    <CardContent className="p-3">
                                        <div className="flex justify-between items-center mb-2">
                                            <div>
                                                <div className="font-medium text-gray-800">{service?.title}</div>
                                                <div className="text-xs text-gray-400 flex items-center gap-2 mt-1">
                                                    <span>{format(new Date(app.date), 'd MMM yyyy', { locale: ru })}</span>
                                                </div>
                                            </div>
                                            <div className="p-2 bg-gray-100 rounded-full">
                                                <Scissors className="w-4 h-4 text-gray-400" />
                                            </div>
                                        </div>
                                        {app.notes && (
                                            <div className="mt-2 pt-2 border-t border-gray-100">
                                                <div className="flex gap-2 items-start text-xs text-gray-500">
                                                    <AlertCircle className="w-3 h-3 mt-0.5 text-pink-500" />
                                                    <span className="italic">{app.notes}</span>
                                                </div>
                                            </div>
                                        )}

                                        {config?.features.reviews && (
                                            <div className="mt-2 pt-2 border-t border-gray-100 text-center">
                                                <Button variant="link" className="text-xs h-auto p-0 text-pink-500">
                                                    Оставить отзыв
                                                </Button>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};
