import { useEffect, useState, useRef } from 'react';
import WebApp from '@twa-dev/sdk';
import { useBookingStore } from '@/store/bookingStore';
import { getServices } from '@/services/mockData';
import { ServiceList } from '@/components/ServiceList';
import { MasterList } from '@/components/MasterList';
import { BookingCalendar } from '@/components/BookingCalendar';
import { CartSummary } from '@/components/CartSummary';
import { UserAppointments } from '@/components/UserAppointments';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { Toaster } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Sparkles } from 'lucide-react';

enum Step {
    SELECT_SERVICE = 0,
    SELECT_MASTER = 1,
    CART_REVIEW = 2,
    SELECT_DATE = 3,
    SUCCESS = 4,
    ADMIN_DASHBOARD = 99 // Admin Mode
}

function App() {
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
    const isBookingRef = useRef(false); // Ref for immediate synchronous lock

    // Initial Data Load
    useEffect(() => {
        WebApp.expand(); // Force full screen on iOS

        // Load services into store if empty (so Admin has something to edit)
        if (services.length === 0) {
            getServices().then(setServices);
        }
    }, [services.length, setServices]);

    // Back Button Logic
    const handleBack = () => {
        if (step === Step.SELECT_DATE) setStep(Step.CART_REVIEW);
        else if (step === Step.CART_REVIEW) setStep(Step.SELECT_SERVICE);
        else if (step === Step.SELECT_MASTER) setStep(Step.SELECT_SERVICE);
        else if (step === Step.SUCCESS) {
            reset();
            setStep(Step.SELECT_SERVICE);
        }
        else if (step === Step.ADMIN_DASHBOARD) {
            setStep(Step.SELECT_SERVICE);
        }
    };

    useEffect(() => {
        if (step > 0 && step !== Step.SUCCESS && step !== Step.ADMIN_DASHBOARD) {
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
            const newAppointments: import('@/types').Appointment[] = cart.map(item => ({
                id: '', // Will be set by Firestore
                clientId: clientId,
                masterId: item.master ? item.master.id : 'master-1',
                serviceId: item.service.id,
                date: selectedDate.toISOString(),
                timeSlot: selectedTimeSlot,
                status: 'confirmed',
                createdAt: Date.now()
            }));

            // Persist to Real Backend (Firestore)
            const { addAppointment } = await import('@/services/firebaseService');

            const savedAppointments: import('@/types').Appointment[] = [];
            for (const app of newAppointments) {
                // Remove empty ID before sending, Firestore generates it
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
            WebApp.MainButton.hide();
        } catch (error) {
            console.error("Booking failed", error);
        } finally {
            isBookingRef.current = false;
            setIsBookingState(false);
        }
    };

    // If Admin Mode
    if (step === Step.ADMIN_DASHBOARD) {
        return (
            <div className="min-h-screen flex items-center justify-center py-4 sm:py-8 px-4 font-sans text-gray-900">
                <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl shadow-black/20 overflow-hidden min-h-[85vh] sm:h-[850px] relative z-10 flex flex-col">
                    <AdminDashboard onLogout={() => setStep(Step.SELECT_SERVICE)} />
                </div>
                <Toaster position="top-center" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center py-4 sm:py-8 px-4 font-sans">
            <div className="w-full max-w-md bg-sky-100 rounded-[2.5rem] shadow-2xl shadow-black/20 overflow-hidden min-h-[85vh] sm:h-[850px] relative z-10 text-gray-900 flex flex-col">

                {/* Header: Salon Irina */}
                {step !== Step.SUCCESS && (
                    <div className="flex flex-col items-center justify-center pt-8 pb-6 space-y-2 bg-gradient-to-b from-pink-50/50 to-white">
                        <h1 className="text-5xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-rose-400 drop-shadow-sm pb-1">
                            Ирина
                        </h1>
                        <div className="flex items-center gap-3 text-sm font-medium uppercase tracking-[0.2em] text-gray-400">
                            <Sparkles className="w-4 h-4 text-pink-400" />
                            Салон красоты
                            <Sparkles className="w-4 h-4 text-pink-400" />
                        </div>
                    </div>
                )}

                {/* Admin Toggle (Temporary for testing) */}
                {step === Step.SELECT_SERVICE && (
                    <div className="absolute top-6 right-6 z-50">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-gray-300 hover:text-pink-600 hover:bg-pink-50 transition-all"
                            onClick={() => setStep(Step.ADMIN_DASHBOARD)}
                        >
                            <ShieldCheck className="w-5 h-5" />
                        </Button>
                    </div>
                )}

                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto p-6 pb-24 scrollbar-hide">
                    {step === Step.SELECT_SERVICE && (
                        <div className="space-y-8 animate-in fade-in duration-500">
                            <UserAppointments onReschedule={() => setStep(Step.SELECT_DATE)} />
                            <ServiceList onServiceSelect={(s) => { setDraftService(s); setStep(Step.SELECT_MASTER); }} />
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
                            {isBookingState ? "ОБРАБОТКА..." : (reschedulingId ? "ПЕРЕНЕСТИ ЗАПИСЬ" : "ЗАПИСАТЬСЯ")}
                        </Button>
                    </div>
                )}
            </div>
            <Toaster position="top-center" />
        </div>
    );
}

export default App;
