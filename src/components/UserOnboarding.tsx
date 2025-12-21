import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { UserProfile } from '@/types';
import WebApp from '@twa-dev/sdk';

interface UserOnboardingProps {
    userId: string;
    onComplete: (profile: UserProfile) => void;
}

export const UserOnboarding = ({ userId, onComplete }: UserOnboardingProps) => {
    const defaultName = WebApp.initDataUnsafe?.user?.first_name || '';
    const defaultSurname = WebApp.initDataUnsafe?.user?.last_name || '';

    const [firstName, setFirstName] = useState(defaultName);
    const [lastName, setLastName] = useState(defaultSurname);
    const [phone, setPhone] = useState('+7 ');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!firstName.trim()) {
            setError('Пожалуйста, введите имя');
            return;
        }
        if (!phone.trim()) {
            setError('Пожалуйста, введите номер телефона');
            return;
        }

        setLoading(true);
        try {
            const profile: UserProfile = {
                id: userId,
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                phone: phone.trim(),
                createdAt: Date.now(),
                telegramId: WebApp.initDataUnsafe?.user?.id || (import.meta.env.DEV ? 123456789 : undefined),
                username: WebApp.initDataUnsafe?.user?.username || (import.meta.env.DEV ? 'test_user' : undefined)
            };

            // Allow parent to handle saving (to keep logic clean)
            await onComplete(profile);

        } catch (err: any) {
            console.error('Onboarding save error:', err);
            const errorMessage = err?.message || err?.code || 'Неизвестная ошибка';
            setError(`Ошибка сохранения: ${errorMessage}. Попробуйте снова.`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-sky-50 p-4">
            <Card className="w-full max-w-md border-none shadow-xl shadow-sky-100">
                <CardHeader className="text-center pb-2 pt-0 px-0">
                    <div className="w-full mb-1">
                        <img
                            src="/brand_header.png"
                            alt="Салон красоты Ирина"
                            className="w-full h-auto object-cover rounded-t-xl"
                        />
                    </div>
                    {/* Title removed as it is in the image */}
                    <CardTitle className="text-2xl font-bold text-gray-900 mt-2">Давайте знакомиться!</CardTitle>
                    <CardDescription className="text-gray-500 text-base mt-2 px-6">
                        Чтобы мастера знали, как к вам обращаться, заполните небольшую анкету.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="firstName">Имя <span className="text-red-500">*</span></Label>
                            <Input
                                id="firstName"
                                placeholder="Иван"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                className="h-12 text-lg active:scale-100 focus:scale-100"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="lastName">Фамилия</Label>
                            <Input
                                id="lastName"
                                placeholder="Иванов"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                className="h-12 text-lg"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone">Номер телефона <span className="text-red-500">*</span></Label>
                            <Input
                                id="phone"
                                type="tel"
                                placeholder="+7 999 000-00-00"
                                value={phone}
                                onChange={(e) => {
                                    let val = e.target.value;
                                    if (!val.startsWith('+7 ')) {
                                        val = '+7 ' + val.replace(/^\+7\s?/, '');
                                    }
                                    setPhone(val);
                                }}
                                className="h-12 text-lg"
                            />
                            <p className="text-xs text-gray-400">
                                Мы не передаем ваш номер третьим лицам.
                            </p>
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-12 btn-gradient text-lg font-bold mt-6"
                            disabled={loading}
                        >
                            {loading ? 'Сохранение...' : 'Продолжить'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};
