import React from 'react';
import { Heart } from 'lucide-react';

export const LoadingScreen = () => (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-[#fff7e6] to-[#ffedcc] animate-in fade-in duration-500">
        <div className="relative mb-8">
            <div className="w-24 h-24 bg-gradient-to-br from-amber-400 to-amber-600 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-amber-500/40 animate-pulse">
                <Heart className="w-12 h-12 fill-current" />
            </div>
            <div className="absolute -top-4 -right-4 w-8 h-8 bg-amber-200 rounded-full blur-xl animate-bounce" />
        </div>
        <div className="text-center space-y-3">
            <h2 className="text-2xl font-bold text-amber-900 tracking-tight">琥珀の輝きを集めています...</h2>
            <p className="text-amber-700/60 text-sm font-medium animate-pulse">あなたの「生きた証」を準備中</p>
        </div>
        <div className="mt-12 flex gap-2">
            <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce"></div>
        </div>
    </div>
);
