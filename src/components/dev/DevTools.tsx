import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bug, User, Shield, RotateCcw } from 'lucide-react';

export const DevTools = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentRole, setCurrentRole] = useState<'client' | 'admin'>('client');

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const role = params.get('role');
        setCurrentRole(role === 'admin' ? 'admin' : 'client');
    }, []);

    const toggleRole = () => {
        const params = new URLSearchParams(window.location.search);
        const newRole = currentRole === 'client' ? 'admin' : 'client';

        if (newRole === 'admin') {
            params.set('role', 'admin');
        } else {
            params.delete('role');
        }

        // Preserve other params if any, but reload to apply
        window.location.search = params.toString();
    };

    const resetApp = () => {
        if (confirm('Сбросить все данные (localStorage)? Это вернет приложение в состояние "как после установки".')) {
            localStorage.clear();
            window.location.href = window.location.pathname; // Reload without params
        }
    };

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
            {isOpen && (
                <div className="bg-white/90 backdrop-blur-md border border-gray-200 p-2 rounded-2xl shadow-2xl flex flex-col gap-2 min-w-[160px] animate-in slide-in-from-right-10">
                    <div className="text-xs font-bold text-gray-400 px-2 uppercase tracking-wider mb-1">
                        Dev Menu
                    </div>

                    <Button
                        variant={currentRole === 'client' ? "default" : "outline"}
                        size="sm"
                        onClick={toggleRole}
                        className="justify-start gap-2 h-9"
                    >
                        {currentRole === 'client' ? <User className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                        {currentRole === 'client' ? 'Switch to Admin' : 'Switch to Client'}
                    </Button>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={resetApp}
                        className="justify-start gap-2 h-9 text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                        <RotateCcw className="w-4 h-4" />
                        Reset All Data
                    </Button>
                </div>
            )}

            <Button
                size="icon"
                className={`rounded-full h-12 w-12 shadow-lg transition-transform ${isOpen ? 'rotate-45 bg-gray-800' : 'bg-black'} hover:bg-gray-800`}
                onClick={() => setIsOpen(!isOpen)}
            >
                {isOpen ? (
                    <span className="text-xl font-bold">+</span>
                ) : (
                    <Bug className="w-6 h-6" />
                )}
            </Button>
        </div>
    );
};
