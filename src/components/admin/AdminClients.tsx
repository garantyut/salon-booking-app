import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useBookingStore } from '@/store/bookingStore';
import { getUsers } from '@/services/firebaseService';
import { Phone, User, CalendarDays, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export const AdminClients = () => {
    const { users, setUsers } = useBookingStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadUsers = async () => {
            try {
                // If users are already in store, maybe don't reload? 
                // But for admin freshness, let's reload.
                const data = await getUsers();
                setUsers(data);
            } catch (err) {
                console.error("Failed to load users", err);
            } finally {
                setLoading(false);
            }
        };
        loadUsers();
    }, [setUsers]);

    const filteredUsers = users.filter(user => {
        const fullSearch = ((user.firstName || '') + ' ' + (user.lastName || '') + ' ' + (user.phone || '')).toLowerCase();
        return fullSearch.includes(searchTerm.toLowerCase());
    });

    return (
        <div className="space-y-4">
            <div className="sticky top-0 bg-sky-100 pb-2 pt-1 z-10">
                <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Поиск по имени или телефону..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 bg-white border-none shadow-sm h-10"
                    />
                </div>
            </div>

            {loading ? (
                <div className="text-center py-10 text-gray-400">Загрузка клиентов...</div>
            ) : filteredUsers.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                    {searchTerm ? 'Ничего не найдено' : 'Клиентов пока нет'}
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredUsers.map((user) => (
                        <Card key={user.id} className="border-none shadow-sm hover:shadow-md transition-shadow">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center text-pink-600 font-bold shrink-0">
                                        {user.firstName?.[0] || '?'}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">{user.firstName} {user.lastName}</h3>
                                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                            <CalendarDays className="w-3 h-3" />
                                            <span>
                                                {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Неизвестно'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <Button
                                    size="icon"
                                    variant="outline"
                                    className="h-10 w-10 rounded-full border-green-200 text-green-600 bg-green-50 hover:bg-green-100 hover:text-green-700"
                                    onClick={() => window.open(`tel:${user.phone}`)}
                                >
                                    <Phone className="w-4 h-4" />
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};
