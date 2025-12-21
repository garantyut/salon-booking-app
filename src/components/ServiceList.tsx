import { useState } from 'react';
import { useBookingStore } from '@/store/bookingStore';
import { Service } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, ChevronRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ServiceListProps {
    onServiceSelect: (service: Service) => void;
}

export const ServiceList = ({ onServiceSelect }: ServiceListProps) => {
    const { services } = useBookingStore();
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    // Services are loaded in App.tsx, so we just use them here.
    const loading = services.length === 0;

    // Use categories from actual data
    const categories = Array.from(new Set(services.map(s => s.category)));

    const categoryNames: Record<string, string> = {
        mens: 'Мужские',
        womens: 'Женские',
        kids: 'Детские',
        coloring: 'Окрашивание',
        styling: 'Укладка'
    };

    const categorySubtitles: Record<string, string> = {
        mens: 'Стрижки, бороды, уход',
        womens: 'Стрижки, укладки, лечение',
        kids: 'Модные стрижки для детей',
        coloring: 'Сложное окрашивание, тонирование',
        styling: 'Вечерние и повседневные образы'
    };

    if (loading) return <div className="p-4 text-center text-gray-500">Загрузка услуг...</div>;

    // View: List of Services in Selected Category
    if (selectedCategory) {
        const categoryServices = services.filter(s => s.category === selectedCategory);

        return (
            <div className="space-y-4 animate-in slide-in-from-right-8 duration-300">
                <div className="flex items-center gap-2 mb-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="-ml-2 h-8 w-8 text-gray-500 hover:text-gray-900 hover:bg-black/5"
                        onClick={() => setSelectedCategory(null)}
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <h2 className="text-xl font-bold text-gray-900">
                        {categoryNames[selectedCategory] || selectedCategory}
                    </h2>
                </div>

                <div className="grid gap-3">
                    {categoryServices.map(service => (
                        <Card
                            key={service.id}
                            className="bg-white border border-gray-100 shadow-sm cursor-pointer transition-all active:scale-[0.98] hover:shadow-md hover:border-pink-200"
                            onClick={() => onServiceSelect(service)}
                        >
                            <CardContent className="p-4 flex justify-between items-center text-gray-900">
                                <div>
                                    <div className="font-bold text-lg text-gray-800">{service.title}</div>
                                    <div className="text-sm text-gray-500 flex items-center gap-1 mt-1 font-medium">
                                        <Clock className="w-3.5 h-3.5 text-pink-400" /> {service.duration} мин
                                    </div>
                                </div>
                                <div className="font-bold text-pink-600 bg-pink-50 px-3 py-1 rounded-full">
                                    {service.price} ₽
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    // View: Categories List (Main Menu)
    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xl font-bold text-gray-900">
                Выберите категорию
            </h2>

            <div className="grid gap-3">
                {categories.map(category => (
                    <Card
                        key={category}
                        className="bg-white border border-gray-100 shadow-sm cursor-pointer group hover:bg-gray-50 transition-all active:scale-[0.98] hover:shadow-md hover:border-pink-200"
                        onClick={() => setSelectedCategory(category)}
                    >
                        <CardContent className="p-5 flex justify-between items-center text-gray-900">
                            <div>
                                <h3 className="text-lg font-bold uppercase tracking-wide text-gray-800">
                                    {categoryNames[category] || category}
                                </h3>
                                <p className="text-xs text-gray-500 mt-1 font-medium">
                                    {categorySubtitles[category] || 'Перейти к услугам'}
                                </p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-pink-500 transition-colors" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
};
