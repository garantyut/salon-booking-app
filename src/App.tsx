import { useEffect, useState, useRef } from 'react';
import WebApp from '@twa-dev/sdk';
import { init as initTelegramSDK, viewport, miniApp, backButton } from '@telegram-apps/sdk';
import { useBookingStore } from '@/store/bookingStore';
import { getServices } from '@/lib/directus';
import { getAdminTelegramIds, getUserProfile, saveUserProfile } from '@/services/firebaseService';
import { ServiceList } from '@/components/ServiceList';
import { MasterList } from '@/components/MasterList';
import { BookingCalendar } from '@/components/BookingCalendar';
import { CartSummary } from '@/components/CartSummary';
import { UserAppointments } from '@/components/UserAppointments';
import { UserOnboarding } from '@/components/UserOnboarding';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { Toaster } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { SalonProvider, useSalon } from '@/contexts/SalonContext';
import { Sparkles, Send } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogClose
} from "@/components/ui/dialog";

import { DevTools } from '@/components/dev/DevTools';

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
    const [showCloseConfirm, setShowCloseConfirm] = useState(false);
    const isBookingRef = useRef(false);

    // Role-based access control
    // Role-based access control
    const [userRole, setUserRole] = useState<UserRole>('loading');
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [userProfile, setUserProfile] = useState<import('@/types').UserProfile | null>(null);
    const [customerNote, setCustomerNote] = useState(''); // New state
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

            const userId = tgUser ? tgUser.id.toString() : (localStorage.getItem('salon_guest_id') || 'guest-' + Math.random().toString(36).substr(2, 9));

            if (!tgUser) {
                if (!localStorage.getItem('salon_guest_id')) {
                    localStorage.setItem('salon_guest_id', userId);
                }
                // Guest flow
                console.log("No Telegram user found, defaulting to Guest Client");
            }

            setCurrentUserId(userId);

            // Fetch User Profile
            const profile = await getUserProfile(userId);
            setUserProfile(profile);

            // Telegram Config
            try {
                if (tgUser) {
                    // Initialize new SDK
                    try {
                        initTelegramSDK();

                        // Mount and expand viewport
                        if (viewport.mount.isAvailable()) {
                            await viewport.mount();
                        }
                        if (viewport.expand.isAvailable()) {
                            viewport.expand();
                        }

                        // Request fullscreen for immersive experience
                        if (viewport.requestFullscreen.isAvailable()) {
                            await viewport.requestFullscreen();
                        }

                        // Mount mini app
                        if (miniApp.mount.isAvailable()) {
                            await miniApp.mount();
                        }
                    } catch (sdkErr) {
                        console.warn('New SDK initialization failed, falling back to legacy', sdkErr);
                    }

                    // Legacy fallback
                    WebApp.expand();
                    WebApp.ready();
                    if (WebApp.isVersionAtLeast('6.1')) {
                        WebApp.setHeaderColor('#ffffff');
                        WebApp.setBackgroundColor('#ffffff');
                    }
                }
            } catch (e) {
                console.warn("WebApp configuration failed", e);
            }

            // Load admin IDs from Firebase
            const adminIds = await getAdminTelegramIds();

            if (adminIds.includes(userId)) {
                setUserRole('admin');
            } else {
                setUserRole('client');
            }
        };

        detectRole();
    }, []);

    // Load services from Directus
    useEffect(() => {
        console.log("App: Checking services load", { servicesLen: services.length });

        if (services.length === 0) {
            console.log("App: Loading services from Directus");
            getServices().then(data => {
                console.log("App: Services loaded from Directus:", data);
                setServices(data as import('@/types').Service[]);
            }).catch(err => console.error("App: Service load failed", err));
        }
    }, [services.length, setServices]);

    // Back Button Logic
    const handleBack = () => {
        if (step === Step.SELECT_DATE) setStep(Step.CART_REVIEW);
        else if (step === Step.CART_REVIEW) setStep(Step.SELECT_SERVICE);
        else if (step === Step.SELECT_MASTER) setStep(Step.SELECT_SERVICE);
        else if (step === Step.SUCCESS) {
            reset();
            setCustomerNote('');
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

            // Use the persistent currentUserId
            const clientId = currentUserId || (WebApp.initDataUnsafe?.user?.id.toString()) || 'unknown-user';

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
                    createdAt: Date.now(),
                    price: item.service.price,
                    notes: customerNote
                };

                // Update start time for the NEXT appointment
                currentStartTime = addMinutes(currentStartTime, item.service.duration);

                return appointment;
            });

            // Persist to Real Backend (or LocalStorage in Dev via service)
            const { addAppointment } = await import('@/services/firebaseService');

            const savedAppointments: import('@/types').Appointment[] = [];

            for (const app of newAppointments) {
                // Remove empty ID before sending, Firestore/Service generates it
                const { id, ...appData } = app;
                const newId = await addAppointment(appData);
                savedAppointments.push({ ...app, id: newId });
            }

            // Update local store immediately (optimistic UI) keeping previous history
            useBookingStore.setState(state => ({
                appointments: [...state.appointments, ...savedAppointments],
                cart: [], // Clear cart after booking
            }));

            setStep(Step.SUCCESS);
            setCustomerNote('');
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

    // New User Registration (Onboarding)
    if (userRole === 'client' && !userProfile) {
        return (
            <UserOnboarding
                userId={currentUserId!}
                onComplete={async (profile) => {
                    await saveUserProfile(profile);
                    setUserProfile(profile);
                }}
            />
        );
    }

    // Client View - No admin button visible
    return (
        <div className="min-h-screen bg-sky-100 font-sans text-gray-900">
            {/* FORCE FULL SCREEN, NO CARD */}
            <div className="min-h-screen flex flex-col">

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
                <div className="flex-1 overflow-y-auto p-6 pb-40 scrollbar-hide">
                    {step === Step.SELECT_SERVICE && (
                        <div className="space-y-8 animate-in fade-in duration-500">
                            <UserAppointments
                                onReschedule={() => setStep(Step.SELECT_DATE)}
                                userId={currentUserId || 'guest'}
                            />

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

                            {selectedDate && selectedTimeSlot && (
                                <div className="mt-8 animate-in slide-in-from-bottom-4 space-y-4">
                                    <div className="space-y-2">
                                        <label htmlFor="note" className="text-sm font-medium text-gray-700 block pl-1">
                                            Комментарий к записи (по желанию)
                                        </label>
                                        <textarea
                                            id="note"
                                            value={customerNote}
                                            onChange={(e) => setCustomerNote(e.target.value)}
                                            placeholder="Например: нужна краска Wella, или аллергия на..."
                                            className="w-full rounded-xl border-gray-200 bg-white/50 focus:bg-white focus:ring-pink-500 focus:border-pink-500 p-3 min-h-[80px] text-sm"
                                        />
                                    </div>
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
                    )}

                    {step === Step.SUCCESS && (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-6 animate-in zoom-in-95 duration-500 pb-20">
                            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-4 shadow-lg shadow-green-500/20">
                                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                            </div>
                            <div>
                                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                                    Вы записаны{userProfile?.firstName ? `, ${userProfile.firstName}` : ''}!
                                </h2>
                                <p className="text-gray-500 text-lg">
                                    Ждем вас {selectedDate?.toLocaleDateString()} в <span className="text-gray-900 font-semibold">{selectedTimeSlot}</span>
                                </p>
                            </div>

                            <div className="w-full max-w-xs pt-10 space-y-6">
                                <Button
                                    variant="outline"
                                    className="w-full h-14 border-2 border-gray-900 text-gray-900 font-bold text-lg hover:bg-gray-100 rounded-xl"
                                    onClick={() => {
                                        reset();
                                        setCustomerNote('');
                                        setStep(Step.SELECT_SERVICE);
                                    }}
                                >
                                    Вернуться к услугам
                                </Button>

                                <div className="pt-4">
                                    <Button
                                        variant="ghost"
                                        className="w-full text-gray-400 hover:text-red-500 hover:bg-red-50"
                                        onClick={() => setShowCloseConfirm(true)}
                                    >
                                        Закрыть приложение
                                    </Button>
                                </div>

                                <Dialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
                                    <DialogContent className="bg-white border-gray-200 text-gray-900 w-[90%] rounded-2xl">
                                        <DialogHeader>
                                            <DialogTitle>Закрыть приложение?</DialogTitle>
                                            <DialogDescription className="text-gray-500">
                                                Вы уверены, что хотите выйти?
                                            </DialogDescription>
                                        </DialogHeader>
                                        <DialogFooter className="flex-row gap-2 justify-end">
                                            <Button
                                                variant="outline"
                                                className="bg-transparent border-gray-200 text-gray-600 mt-0 flex-1"
                                                onClick={() => setShowCloseConfirm(false)}
                                            >
                                                Отмена
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                className="bg-red-500 hover:bg-red-600 border-none text-white flex-1"
                                                onClick={() => WebApp.close()}
                                            >
                                                Закрыть
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </div>
                    )}
                </div>

                {/* Fixed Bottom Action Button MOVED UP */}
            </div>
            <Toaster position="top-center" />
        </div>
    );
}


function App() {
    return (
        <SalonProvider>
            <InnerApp />
            {import.meta.env.DEV && <DevTools />}
        </SalonProvider>
    );
}

export default App;
