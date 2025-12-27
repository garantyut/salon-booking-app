import { useState, useEffect } from 'react';
import { AdminServices } from './AdminServices';
import { AdminSchedule } from './AdminSchedule';
import { AdminScheduleSettings } from './AdminScheduleSettings';
import { AdminClients } from './AdminClients';
import { AdminFinance } from './AdminFinance';
import { Calendar, Users, List, Settings, LogOut, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBookingStore } from '@/store/bookingStore';
import { getProAppointments } from '@/services/directusService';
import { useSalon } from '@/contexts/SalonContext';

interface AdminDashboardProps {
    onLogout: () => void;
}

type AdminTab = 'schedule' | 'services' | 'clients' | 'settings' | 'finance';

export const AdminDashboard = ({ onLogout }: AdminDashboardProps) => {
    const [activeTab, setActiveTab] = useState<AdminTab>('schedule');
    const { setAppointments } = useBookingStore();
    const { config } = useSalon();

    useEffect(() => {
        getProAppointments().then(setAppointments);
    }, [setAppointments]);

    return (
        <div className="h-full flex flex-col relative bg-sky-100">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 p-6 sticky top-0 z-10 flex justify-between items-center shadow-sm">
                <div>
                    <h1 className="text-lg font-bold text-gray-900">{config?.texts.admin_title || 'Кабинет Мастера'}</h1>
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        <p className="text-xs text-gray-500">Online</p>
                    </div>
                </div>
                <Button variant="ghost" size="icon" onClick={onLogout} className="text-gray-400 hover:text-red-600 hover:bg-red-50">
                    <LogOut className="w-5 h-5" />
                </Button>
            </div>

            {/* Content Area - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 pb-24 scrollbar-hide">
                {activeTab === 'services' && <AdminServices />}
                {activeTab === 'schedule' && <AdminSchedule />}
                {activeTab === 'finance' && <AdminFinance />}
                {activeTab === 'settings' && <AdminScheduleSettings />}
                {activeTab === 'clients' && <AdminClients />}
            </div>

            {/* Bottom Navigation - Absolute to container */}
            <div className="absolute bottom-6 left-6 right-6 bg-white border border-gray-200 rounded-2xl p-2 flex justify-between shadow-xl shadow-gray-200/50 z-50 overflow-x-auto">
                <Button
                    variant="ghost"
                    className={`flex flex-col items-center gap-1 h-auto py-2 px-1 min-w-[60px] ${activeTab === 'schedule' ? 'text-pink-600 bg-pink-50' : 'text-gray-400 hover:text-gray-600'}`}
                    onClick={() => setActiveTab('schedule')}
                >
                    <Calendar className="w-5 h-5" />
                    <span className="text-[10px]">Расписание</span>
                </Button>

                <Button
                    variant="ghost"
                    className={`flex flex-col items-center gap-1 h-auto py-2 px-1 min-w-[60px] ${activeTab === 'clients' ? 'text-pink-600 bg-pink-50' : 'text-gray-400 hover:text-gray-600'}`}
                    onClick={() => setActiveTab('clients')}
                >
                    <Users className="w-5 h-5" />
                    <span className="text-[10px]">Клиенты</span>
                </Button>

                <Button
                    variant="ghost"
                    className={`flex flex-col items-center gap-1 h-auto py-2 px-1 min-w-[60px] ${activeTab === 'finance' ? 'text-pink-600 bg-pink-50' : 'text-gray-400 hover:text-gray-600'}`}
                    onClick={() => setActiveTab('finance')}
                >
                    <Wallet className="w-5 h-5" />
                    <span className="text-[10px]">Финансы</span>
                </Button>

                <Button
                    variant="ghost"
                    className={`flex flex-col items-center gap-1 h-auto py-2 px-1 min-w-[60px] ${activeTab === 'services' ? 'text-pink-600 bg-pink-50' : 'text-gray-400 hover:text-gray-600'}`}
                    onClick={() => setActiveTab('services')}
                >
                    <List className="w-5 h-5" />
                    <span className="text-[10px]">Услуги</span>
                </Button>

                <Button
                    variant="ghost"
                    className={`flex flex-col items-center gap-1 h-auto py-2 px-1 min-w-[60px] ${activeTab === 'settings' ? 'text-pink-600 bg-pink-50' : 'text-gray-400 hover:text-gray-600'}`}
                    onClick={() => setActiveTab('settings')}
                >
                    <Settings className="w-5 h-5" />
                    <span className="text-[10px]">График</span>
                </Button>
            </div>
        </div>
    );
};
