import { useState, useEffect } from 'react';

import { getMasters, MOCK_MASTERS } from '@/services/mockData'; // In real app, update via API
import { Master, WorkingHours } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch'; // Assuming we have switch or need to use checkbox

import { Button } from '@/components/ui/button';

import { Save } from 'lucide-react';

const DAYS_OF_WEEK = [
    { id: 1, name: 'Понедельник' },
    { id: 2, name: 'Вторник' },
    { id: 3, name: 'Среда' },
    { id: 4, name: 'Четверг' },
    { id: 5, name: 'Пятница' },
    { id: 6, name: 'Суббота' },
    { id: 0, name: 'Воскресенье' }
];

export const AdminScheduleSettings = () => {
    // For now, we assume single master or selecting the first one
    const [master, setMaster] = useState<Master | null>(null);
    const [workingHours, setWorkingHours] = useState<WorkingHours>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadMaster = async () => {
            const masters = await getMasters();
            if (masters.length > 0) {
                setMaster(masters[0]);
                if (masters[0].workingHours) {
                    setWorkingHours(masters[0].workingHours);
                } else {
                    // Default init if empty
                    const initial: WorkingHours = {};
                    DAYS_OF_WEEK.forEach(d => {
                        initial[d.id] = { start: '10:00', end: '20:00', isDayOff: d.id === 0 };
                    });
                    setWorkingHours(initial);
                }
            }
            setLoading(false);
        };
        loadMaster();
    }, []);

    const handleTimeChange = (dayId: number, field: 'start' | 'end', value: string) => {
        setWorkingHours(prev => ({
            ...prev,
            [dayId]: { ...prev[dayId], [field]: value }
        }));
    };

    const handleDayOffToggle = (dayId: number, checked: boolean) => {
        setWorkingHours(prev => ({
            ...prev,
            [dayId]: { ...prev[dayId], isDayOff: checked }
        }));
    };

    const saveSettings = () => {
        console.log('Saving settings:', workingHours);
        // In a real app, this would call an API/Store action
        // For now, we update the local reference in mockData (hacky but works for demo)
        if (master) {
            const masterRef = MOCK_MASTERS.find(m => m.id === master.id);
            if (masterRef) {
                masterRef.workingHours = workingHours;
                alert('Настройки графика сохранены!');
            }
        }
    };

    if (loading) return <div>Загрузка...</div>;

    return (
        <div className="space-y-6">
            <Card className="bg-white text-gray-900 border-gray-200 shadow-sm">
                <CardHeader>
                    <CardTitle>Режим работы (по дням недели)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {DAYS_OF_WEEK.map(day => {
                        const schedule = workingHours[day.id] || { start: '10:00', end: '20:00', isDayOff: false };
                        return (
                            <div key={day.id} className="grid grid-cols-12 gap-y-3 sm:gap-4 items-center py-4 border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors px-2 rounded-lg">
                                {/* Day Name */}
                                <div className="col-span-12 sm:col-span-3 font-medium text-gray-900">
                                    {day.name}
                                </div>

                                {/* Day Off Switch */}
                                <div className="col-span-5 sm:col-span-4 flex items-center gap-2">
                                    <Switch
                                        id={`day-off-${day.id}`}
                                        checked={!schedule.isDayOff} // Switch is "Is Working?" effectively, or easier logic: "Work" vs "Off"
                                        onCheckedChange={(checked) => handleDayOffToggle(day.id, !checked)}
                                        className="data-[state=checked]:bg-green-500"
                                    />
                                    <Label htmlFor={`day-off-${day.id}`} className="cursor-pointer text-sm text-gray-600 select-none">
                                        {schedule.isDayOff ? 'Выходной' : 'Рабочий'}
                                    </Label>
                                </div>

                                {/* Time Inputs */}
                                <div className="col-span-7 sm:col-span-5 flex justify-end">
                                    {!schedule.isDayOff ? (
                                        <div className="flex items-center gap-2">
                                            <div className="relative">
                                                <Input
                                                    type="time"
                                                    value={schedule.start}
                                                    onChange={(e) => handleTimeChange(day.id, 'start', e.target.value)}
                                                    className="w-24 h-9 text-sm border-gray-300 focus:border-pink-500 focus:ring-pink-500"
                                                />
                                            </div>
                                            <span className="text-gray-400 font-medium">-</span>
                                            <div className="relative">
                                                <Input
                                                    type="time"
                                                    value={schedule.end}
                                                    onChange={(e) => handleTimeChange(day.id, 'end', e.target.value)}
                                                    className="w-24 h-9 text-sm border-gray-300 focus:border-pink-500 focus:ring-pink-500"
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <span className="text-xs text-gray-400 font-medium uppercase tracking-wider bg-gray-100 px-3 py-1 rounded-full">
                                            Нет записи
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    <Button onClick={saveSettings} className="w-full mt-6 bg-pink-600 hover:bg-pink-700 text-white shadow-md shadow-pink-200 py-6 text-lg font-medium transition-all active:scale-[0.98]">
                        <Save className="w-5 h-5 mr-3" />
                        Сохранить график работы
                    </Button>
                </CardContent>
            </Card>

            <div className="text-sm text-gray-500 bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                <div className="text-blue-500 text-xl">ℹ️</div>
                <div>
                    <p className="font-medium text-blue-900">Инструкция</p>
                    <p className="mt-1">Включите переключатель, чтобы сделать день рабочим. Укажите время начала и окончания приема.</p>
                </div>
            </div>
        </div>
    );
};
