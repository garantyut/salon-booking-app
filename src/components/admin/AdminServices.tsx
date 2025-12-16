import { useState } from 'react';
import { useBookingStore } from '@/store/bookingStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogClose
} from "@/components/ui/dialog";
import { Service } from '@/types';

export const AdminServices = () => {
    const { services, deleteService, addService, updateService } = useBookingStore();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [editingService, setEditingService] = useState<Service | null>(null);

    // Form State
    const [formData, setFormData] = useState<Partial<Service>>({
        title: '',
        price: 0,
        duration: 60,
        category: 'mens'
    });

    const categories = [
        { id: 'mens', label: 'Мужские' },
        { id: 'womens', label: 'Женские' },
        { id: 'kids', label: 'Детские' },
        { id: 'coloring', label: 'Окрашивание' },
        { id: 'styling', label: 'Укладка' }
    ];

    const handleOpenDialog = (service?: Service) => {
        if (service) {
            setEditingService(service);
            setFormData(service);
        } else {
            setEditingService(null);
            setFormData({
                title: '',
                price: 0,
                duration: 60,
                category: 'mens'
            });
        }
        setIsDialogOpen(true);
    };

    const handleSave = () => {
        if (!formData.title || !formData.price || !formData.duration) return;

        if (editingService) {
            updateService({ ...editingService, ...formData } as Service);
        } else {
            addService({
                id: Date.now().toString(),
                ...formData
            } as Service);
        }
        setIsDialogOpen(false);
    };

    return (
        <div className="space-y-4 animate-in fade-in">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Управление услугами</h2>
                <Button
                    onClick={() => handleOpenDialog()}
                    className="bg-green-500 hover:bg-green-600 text-white rounded-full h-10 w-10 p-0 shadow-lg shadow-green-500/20"
                >
                    <Plus className="w-6 h-6" />
                </Button>
            </div>

            <div className="space-y-3">
                {services.map(service => (
                    <Card key={service.id} className="bg-white border text-gray-900 shadow-sm hover:shadow-md transition-all">
                        <CardContent className="p-4 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-gray-900">{service.title}</h3>
                                <div className="text-sm text-gray-500 mt-1">
                                    {service.price} ₽ • {service.duration} мин
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-gray-400 hover:text-indigo-600 hover:bg-indigo-50"
                                    onClick={() => handleOpenDialog(service)}
                                >
                                    <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-400 hover:text-red-600 hover:bg-red-50"
                                    onClick={() => setDeleteConfirmId(service.id)}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
                <DialogContent className="bg-white border-gray-200 text-gray-900 w-[90%] rounded-xl">
                    <DialogHeader>
                        <DialogTitle>Удалить услугу?</DialogTitle>
                    </DialogHeader>
                    <div className="py-2 text-gray-500">
                        Вы уверены, что хотите удалить эту услугу? Это действие нельзя отменить.
                    </div>
                    <DialogFooter className="flex-row justify-end gap-2">
                        <Button variant="ghost" className="text-gray-500" onClick={() => setDeleteConfirmId(null)}>
                            Отмена
                        </Button>
                        <Button
                            className="bg-red-500 hover:bg-red-600 text-white"
                            onClick={() => {
                                if (deleteConfirmId) {
                                    deleteService(deleteConfirmId);
                                    setDeleteConfirmId(null);
                                }
                            }}
                        >
                            Удалить
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="bg-white border-gray-200 text-gray-900 w-[95%] max-w-md rounded-xl">
                    <DialogHeader>
                        <DialogTitle>{editingService ? 'Редактировать услугу' : 'Новая услуга'}</DialogTitle>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label className="text-gray-700">Название</Label>
                            <Input
                                className="bg-white border-gray-300 text-gray-900"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-gray-700">Цена (₽)</Label>
                                <Input
                                    type="number"
                                    className="bg-white border-gray-300 text-gray-900"
                                    value={formData.price?.toString().replace(/^0+/, '') || ''}
                                    onChange={(e) => setFormData({ ...formData, price: e.target.value ? Number(e.target.value) : 0 })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-gray-700">Время (мин)</Label>
                                <Input
                                    type="number"
                                    className="bg-white border-gray-300 text-gray-900"
                                    value={formData.duration?.toString().replace(/^0+/, '') || ''}
                                    onChange={(e) => setFormData({ ...formData, duration: e.target.value ? Number(e.target.value) : 0 })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-gray-700">Категория</Label>
                            <select
                                className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                            >
                                {categories.map(c => (
                                    <option key={c.id} value={c.id} className="bg-white text-gray-900">{c.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <DialogFooter className="flex-row justify-end gap-2">
                        <DialogClose asChild>
                            <Button variant="ghost" className="text-gray-500 hover:text-gray-900">Отмена</Button>
                        </DialogClose>
                        <Button
                            className="bg-green-500 hover:bg-green-600 text-white"
                            onClick={handleSave}
                        >
                            Сохранить
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
