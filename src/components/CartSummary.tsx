import { useBookingStore } from '@/store/bookingStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Plus, Clock, Tag } from 'lucide-react';
import { useSalon } from '@/contexts/SalonContext';

interface CartSummaryProps {
    onAddMore: () => void;
    onProceed: () => void;
}

export const CartSummary = ({ onAddMore, onProceed }: CartSummaryProps) => {
    const { cart, removeFromCart, getTotalPrice, getTotalDuration } = useBookingStore();
    const { config } = useSalon();

    if (cart.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4 animate-in fade-in duration-500">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center">
                    <Clock className="w-8 h-8 text-gray-500" />
                </div>
                <h2 className="text-xl font-bold text-gray-400">Корзина пуста</h2>
                <Button
                    variant="outline"
                    onClick={onAddMore}
                    className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                >
                    Перейти к услугам
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="-ml-2 h-8 w-8 text-gray-400 hover:text-white" onClick={onAddMore}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </Button>
                <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">
                    Ваш заказ
                </h2>
            </div>

            <div className="space-y-3">
                {cart.map((item, index) => (
                    <Card key={item.id} className="bg-white border border-gray-100 text-gray-900 relative overflow-hidden group shadow-sm">
                        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-cyan-400" />
                        <CardContent className="p-4 flex justify-between items-center">
                            <div>
                                <div className="font-bold text-lg text-gray-900">{item.service.title}</div>
                                <div className="text-sm text-gray-500 font-medium flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                                    {item.service.duration} мин
                                    {item.master && <span className="ml-2 text-gray-400">• {item.master.name}</span>}
                                </div>
                                <div className="text-xs text-gray-400 mt-1 font-semibold uppercase tracking-wider">Клиент {index + 1}</div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <span className="font-extrabold text-xl text-gray-900">{item.service.price} ₽</span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50"
                                    onClick={() => removeFromCart(item.id)}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card className="bg-gray-50 border border-gray-200">
                <CardContent className="p-4 flex justify-between items-center">
                    <div>
                        <div className="text-xs uppercase font-bold text-gray-400 tracking-wider">Итого время</div>
                        <div className="font-bold text-gray-900">{getTotalDuration()} мин</div>
                    </div>
                    <div className="text-right">
                        <div className="text-xs uppercase font-bold text-gray-400 tracking-wider">Итого сумма</div>
                        <div className="font-black text-2xl text-blue-600">{getTotalPrice()} ₽</div>
                    </div>
                </CardContent>
            </Card>

            {
                config?.features.promo_codes && (
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Промокод"
                            className="flex-1 px-3 py-2 rounded-md border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                        />
                        <Button variant="outline" size="sm" className="text-pink-600 border-pink-200 hover:bg-pink-50">
                            <Tag className="w-4 h-4 mr-1" />
                            Применить
                        </Button>
                    </div>
                )
            }

            <div className="flex gap-3 pt-4">
                <Button
                    variant="outline"
                    className="flex-1 border-blue-500/50 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300"
                    onClick={onAddMore}
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Добавить услугу
                </Button>
                <Button
                    className="flex-[2] btn-gradient text-white font-bold"
                    onClick={onProceed}
                >
                    Выбрать время
                </Button>
            </div>
        </div >
    );
};
