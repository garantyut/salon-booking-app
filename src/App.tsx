import { useEffect, useState, useRef } from 'react';
import WebApp from '@twa-dev/sdk';
import { useBookingStore } from '@/store/bookingStore';
import { getServices } from '@/services/mockData';
import { getAdminTelegramIds } from '@/services/firebaseService';
import { ServiceList } from '@/components/ServiceList';
import { MasterList } from '@/components/MasterList';
import { BookingCalendar } from '@/components/BookingCalendar';
import { CartSummary } from '@/components/CartSummary';
import { UserAppointments } from '@/components/UserAppointments';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { Toaster } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { SalonProvider, useSalon } from '@/contexts/SalonContext';
import { Sparkles, Send } from 'lucide-react';

enum Step {
    SELECT_SERVICE = 0,
    SELECT_MASTER = 1,
    CART_REVIEW = 2,
    SELECT_DATE = 3,
    SUCCESS = 4,
}

type UserRole = 'loading' | 'not_telegram' | 'admin' | 'client';

function InnerApp() {
    const {
        cart,
        selectedDate,
        selectedTimeSlot,
        reset,
        reschedulingId,
        rescheduleAppointment,
        services,
        setServices
    } = useBookingStore();

    const [step, setStep] = useState<Step>(Step.SELECT_SERVICE);
    const [draftService, setDraftService] = useState<import('@/types').Service | null>(null);
    const [isBookingState, setIsBookingState] = useState(false);
    const isBookingRef = useRef(false);

    // Role-based access control
    const [userRole, setUserRole] = useState<UserRole>('loading');
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const { loading: configLoading, config } = useSalon();

    // Initial Data Load & Role Detection
    useEffect(() => {
        const detectRole = async () => {
            // Check if running inside Telegram
            const tgUser = WebApp.initDataUnsafe?.user;

            // Bypass for local development
            if (!tgUser && import.meta.env.DEV) {
                console.log("Dev mode: Mocking Telegram User");
                setCurrentUserId('dev-user-123');
                setUserRole('client'); // Default to client for dev
                // If you want to test admin, change this to 'admin' or add a toggle

                // Allow admin role testing via URL param ?role=admin
                const params = new URLSearchParams(window.location.search);
                if (params.get('role') === 'admin') {
                    setUserRole('admin');
                }
                return;
            }

            if (!tgUser || !tgUser.id) {
                setUserRole('not_telegram');
                return;
            }

            WebApp.expand(); // Force full screen on iOS
            setCurrentUserId(tgUser.id.toString());

            // Load admin IDs from Firebase
            const adminIds = await getAdminTelegramIds();

            if (adminIds.includes(tgUser.id.toString())) {
                setUserRole('admin');
            } else {
                setUserRole('client');
            }
        };

        detectRole();
    }, []);

    // Load services when config is available
    useEffect(() => {
        if (services.length === 0 && config?.salon_id) {
            getServices(config.salon_id).then(setServices);
        }
    }, [services.length, setServices, config]);

    // Back Button Logic
    const handleBack = () => {
        if (step === Step.SELECT_DATE) setStep(Step.CART_REVIEW);
        else if (step === Step.CART_REVIEW) setStep(Step.SELECT_SERVICE);
        else if (step === Step.SELECT_MASTER) setStep(Step.SELECT_SERVICE);
        else if (step === Step.SUCCESS) {
            reset();
            setStep(Step.SELECT_SERVICE);
        }
    };

    useEffect(() => {
        if (step > 0 && step !== Step.SUCCESS) {
            WebApp.BackButton.show();
            WebApp.BackButton.onClick(handleBack);
        } else {
            WebApp.BackButton.hide();
        }
        return () => { WebApp.BackButton.offClick(handleBack); };
    }, [step]);

    const handleBooking = async () => {
        if (isBookingRef.current) return;
        isBookingRef.current = true;
        setIsBookingState(true); // Update UI

        try {
            if (reschedulingId) {
                if (!selectedDate || !selectedTimeSlot) return;
                // TODO: Implement real rescheduling backend logic
                rescheduleAppointment(reschedulingId, selectedDate, selectedTimeSlot);
                setStep(Step.SUCCESS);
                return;
            }

            if (cart.length === 0 || !selectedDate || !selectedTimeSlot) return;

            // Get Real User ID from Telegram
            const tgUser = WebApp.initDataUnsafe?.user;
            const clientId = tgUser ? tgUser.id.toString() : 'user-guest-' + Math.random().toString(36).substr(2, 5);

            // Create appointments from cart
            // Helper to add minutes to "HH:mm"
            const addMinutes = (time: string, minsToAdd: number) => {
                const [h, m] = time.split(':').map(Number);
                const totalMins = h * 60 + m + minsToAdd;
                const newH = Math.floor(totalMins / 60);
                const newM = totalMins % 60;
                return `${newH}:${newM.toString().padStart(2, '0')}`;
            };

            // Calculate start times for each service in sequence
            let currentStartTime = selectedTimeSlot;
            const newAppointments: import('@/types').Appointment[] = cart.map(item => {
                const appointment = {
                    id: '', // Will be set by Firestore
                    clientId: clientId,
                    masterId: item.master ? item.master.id : 'master-1',
                    serviceId: item.service.id,
                    date: selectedDate.toISOString(),
                    timeSlot: currentStartTime,
                    status: 'confirmed' as const,
                    createdAt: Date.now()
                };

                // Update start time for the NEXT appointment
                currentStartTime = addMinutes(currentStartTime, item.service.duration);

                return appointment;
            });

            // Persist to Real Backend (Firestore)
            const { addAppointment } = await import('@/services/firebaseService');

            const savedAppointments: import('@/types').Appointment[] = [];

            // DEV MODE: Skip Firestore (unless forced via ?force_prod=true)
            const urlParams = new URLSearchParams(window.location.search);
            const forceProd = urlParams.get('force_prod') === 'true';

            if (import.meta.env.DEV && !forceProd) {
                console.log("Dev Mode: Skipping Firestore write");
                for (const app of newAppointments) {
                    savedAppointments.push({ ...app, id: 'dev-id-' + Math.random() });
                }
                // Simulate delay
                await new Promise(r => setTimeout(r, 1000));
            }
            else {
                // PRODUCTION: Real Firestore
                for (const app of newAppointments) {
                    // Remove empty ID before sending, Firestore generates it
                    const { id, ...appData } = app;
                    const newId = await addAppointment(appData);
                    savedAppointments.push({ ...app, id: newId });
                }
            }

            // Update local store immediately (optimistic UI) keeping previous history
            useBookingStore.setState(state => ({
                appointments: [...state.appointments, ...savedAppointments],
                cart: [], // Clear cart after booking
            }));

            setStep(Step.SUCCESS);
            WebApp.MainButton.hide();
        } catch (error) {
            console.error("Booking failed", error);
            // @ts-ignore
            import("sonner").then(({ toast }) => toast.error(`Ошибка записи: ${error.message || "Неизвестная ошибка"}`));
        } finally {
            isBookingRef.current = false;
            setIsBookingState(false);
        }
    };

    // Loading State
    if (userRole === 'loading' || configLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-100 to-sky-100">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500">Загрузка...</p>
                </div>
            </div>
        );
    }

    // Not in Telegram
    if (userRole === 'not_telegram') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-100 to-sky-100 px-6">
                <div className="text-center max-w-sm">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-sky-400 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                        <Send className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Откройте в Telegram</h1>
                    <p className="text-gray-500 mb-6">
                        Это приложение работает только внутри Telegram. Найдите нашего бота и откройте приложение оттуда.
                    </p>
                    <Button
                        className="btn-gradient px-8"
                        onClick={() => window.open('https://t.me/your_bot_name', '_blank')}
                    >
                        Открыть Telegram
                    </Button>
                </div>
            </div>
        );
    }

    // Admin View - ONLY AdminDashboard
    if (userRole === 'admin') {
        return (
            <div className="min-h-screen flex items-center justify-center py-4 sm:py-8 px-4 font-sans text-gray-900">
                <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl shadow-black/20 overflow-hidden min-h-[85vh] sm:h-[850px] relative z-10 flex flex-col">
                    <AdminDashboard onLogout={() => { }} />
                </div>
                <Toaster position="top-center" />
            </div>
        );
    }

    // Client View - No admin button visible
    return (
        <div className="min-h-screen flex items-center justify-center py-4 sm:py-8 px-4 font-sans">
            <div className="w-full max-w-md bg-sky-100 rounded-[2.5rem] shadow-2xl shadow-black/20 overflow-hidden min-h-[85vh] sm:h-[850px] relative z-10 text-gray-900 flex flex-col">

                {/* Header: Dynamic Salon Branding */}
                {step !== Step.SUCCESS && (
                    <div className="flex flex-col items-center justify-center pt-8 pb-6 space-y-2 bg-gradient-to-b from-white/50 to-white">
                        <h1
                            className="text-4xl px-4 text-center font-serif font-bold text-transparent bg-clip-text drop-shadow-sm pb-1"
                            style={{
                                backgroundImage: `linear-gradient(to right, ${config?.brand.primary_color}, ${config?.brand.secondary_color})`
                            }}
                        >
                            {config?.brand.name}
                        </h1>
                    </div>
                )}

                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto p-6 pb-24 scrollbar-hide">
                    {step === Step.SELECT_SERVICE && (
                        <div className="space-y-8 animate-in fade-in duration-500">
                            <UserAppointments onReschedule={() => setStep(Step.SELECT_DATE)} />

                            {/* Feature: Extra Button */}
                            {config?.features.extra_button.enabled && (
                                <div className="px-1">
                                    <Button
                                        variant="outline"
                                        className="w-full border-green-200 text-green-700 bg-green-50 hover:bg-green-100 hover:text-green-800"
                                        onClick={() => config.features.extra_button.url && window.open(config.features.extra_button.url, '_blank')}
                                    >
                                        <Send className="w-4 h-4 mr-2" />
                                        {config.features.extra_button.text}
                                    </Button>
                                </div>
                            )}

                            <ServiceList onServiceSelect={(s) => { setDraftService(s); setStep(Step.SELECT_MASTER); }} />

                            {/* Contacts Footer */}
                            <div className="pt-8 pb-4 text-center text-sm text-gray-500 space-y-1">
                                {config?.contacts.phone && <p>{config.contacts.phone}</p>}
                                {config?.contacts.address && <p>{config.contacts.address}</p>}
                            </div>
                        </div>
                    )}

                    {step === Step.SELECT_MASTER && draftService && (
                        <MasterList service={draftService} onMasterSelect={() => setStep(Step.CART_REVIEW)} />
                    )}

                    {step === Step.CART_REVIEW && (
                        <CartSummary
                            onAddMore={() => setStep(Step.SELECT_SERVICE)}
                            onProceed={() => setStep(Step.SELECT_DATE)}
                        />
                    )}

                    {step === Step.SELECT_DATE && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-2 pl-1">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-gray-500 hover:text-pink-600 hover:bg-pink-50 rounded-full"
                                    onClick={() => {
                                        if (reschedulingId) {
                                            useBookingStore.getState().cancelRescheduling();
                                            setStep(Step.SELECT_SERVICE);
                                        } else {
                                            handleBack();
                                        }
                                    }}
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                </Button>
                                <h2 className="text-xl font-bold text-gray-800">
                                    {reschedulingId ? 'Выберите новую дату' : 'Дата и время'}
                                </h2>
                            </div>

                            <BookingCalendar />
                        </div>
                    )}

                    {step === Step.SUCCESS && (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-6 animate-in zoom-in-95 duration-500 pb-20">
                            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-4 shadow-lg shadow-green-500/20">
                                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                            </div>
                            <div>
                                <h2 className="text-3xl font-bold text-gray-900 mb-2">Вы записаны!</h2>
                                <p className="text-gray-500 text-lg">
                                    Ждем вас {selectedDate?.toLocaleDateString()} в <span className="text-gray-900 font-semibold">{selectedTimeSlot}</span>
                                </p>
                            </div>

                            <div className="w-full max-w-xs pt-10 space-y-3">
                                <Button
                                    variant="outline"
                                    className="w-full h-12 border-gray-200 text-gray-700 hover:bg-gray-50"
                                    onClick={() => {
                                        reset();
                                        setStep(Step.SELECT_SERVICE);
                                    }}
                                >
                                    Вернуться к услугам
                                </Button>
                                <Button
                                    variant="ghost"
                                    className="w-full text-gray-400 hover:text-gray-600"
                                    onClick={() => WebApp.close()}
                                >
                                    Закрыть приложение
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Fixed Bottom Action Button for Calendar Step */}
                {step === Step.SELECT_DATE && selectedDate && selectedTimeSlot && (
                    <div className="absolute bottom-6 left-6 right-6 z-50 animate-in slide-in-from-bottom-4">
                        <Button
                            className="w-full btn-gradient h-14 text-xl font-bold rounded-2xl shadow-xl shadow-pink-500/20"
                            onClick={handleBooking}
                            disabled={isBookingState}
                        >
                            {isBookingState ? "ОБРАБОТКА..." : (reschedulingId ? "ПЕРЕНЕСТИ ЗАПИСЬ" : (config?.texts.book_button || "ЗАПИСАТЬСЯ"))}
                        </Button>
                    </div>
                )}
            </div>
            <Toaster position="top-center" />
        </div>
    );
}


function App() {
    return (
        <SalonProvider>
            <InnerApp />
        </SalonProvider>
    );
}

export default App;
