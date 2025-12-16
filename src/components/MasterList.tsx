import { useEffect, useState, useRef } from 'react';
import { useBookingStore } from '@/store/bookingStore';
import { getMasters } from '@/services/mockData';
import { Master, Service } from '@/types';
import { Card, CardContent } from '@/components/ui/card';

interface MasterListProps {
    service: Service;
    onMasterSelect: () => void;
}

export const MasterList = ({ service, onMasterSelect }: MasterListProps) => {
    const { addToCart } = useBookingStore();
    const [masters, setMasters] = useState<Master[]>([]);
    const [loading, setLoading] = useState(true);

    const hasAutoSelected = useRef(false);

    useEffect(() => {
        let isMounted = true;
        getMasters().then((data) => {
            if (!isMounted) return;

            // Filter masters who perform the selected service
            const relevantMasters = data.filter(m =>
                service && (
                    m.specializations.includes(service.id) ||
                    m.specializations.includes(service.category)
                )
            );
            setMasters(relevantMasters);
            setLoading(false);

            // Auto-select if only one master
            if (relevantMasters.length === 1 && !hasAutoSelected.current) {
                hasAutoSelected.current = true;
                addToCart(service, relevantMasters[0]);
                onMasterSelect();
            }
        });

        return () => { isMounted = false; };
    }, [service, addToCart, onMasterSelect]);

    if (!service) return null;

    return (
        <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
            <h2 className="text-xl font-bold text-gradient">Выберите мастера</h2>
            <div className="text-sm text-gray-400 -mt-4">для услуги "{service.title}"</div>

            {loading ? <div className="text-white">Загрузка мастеров...</div> : (
                <div className="grid grid-cols-2 gap-4">
                    {masters.map(master => (
                        <Card
                            key={master.id}
                            className="glass-card border-none cursor-pointer transition-all active:scale-95 overflow-hidden group hover:ring-2 hover:ring-blue-400"
                            onClick={() => {
                                addToCart(service, master);
                                onMasterSelect();
                            }}
                        >
                            <div className="aspect-square w-full bg-gray-800 relative overflow-hidden">
                                <img
                                    src={master.photoUrl}
                                    alt={master.name}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                            </div>
                            <CardContent className="p-3 text-center text-white relative">
                                <span className="font-medium">{master.name}</span>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};
