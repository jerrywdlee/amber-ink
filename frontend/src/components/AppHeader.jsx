import { Heart, Zap, MessageCircle, ChevronLeft, Gem } from 'lucide-react';

export const AppHeader = ({ mode, regType, setRegType, setMode }) => {
    const config = {
        jewelryBox: {
            icon: <Gem className="w-6 h-6" />,
            title: '琥珀の宝石箱',
            subtitle: 'Memory Sanctuary'
        },
        companion: {
            icon: <MessageCircle className="w-6 h-6" />,
            title: '琥珀との語らい',
            subtitle: 'Amber with You'
        },
        default: {
            icon: <Heart className="w-6 h-6 fill-current" />,
            title: 'Amber Ink',
            subtitle: "Preserving Life's Glow"
        }
    };

    const branding = config[mode] || config.default;

    return (
        <header className="flex items-center justify-between mb-8 pt-4 relative z-10 px-1">
            <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-500/30">
                    {branding.icon}
                </div>
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-amber-900 leading-none">
                        {branding.title}
                    </h1>
                    <p className="text-[10px] text-amber-700/70 font-medium uppercase tracking-widest mt-1">
                        {branding.subtitle}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-2">
                {mode === 'registration' && (
                    <button
                        onClick={() => setRegType(regType === 'chat' ? 'form' : 'chat')}
                        className="p-2 bg-white/50 backdrop-blur-md rounded-full border border-white/50 text-amber-700 shadow-sm"
                    >
                        {regType === 'chat' ? <Zap className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />}
                    </button>
                )}
                {(mode === 'companion' || mode === 'jewelryBox') && (
                    <button
                        onClick={() => setMode('dashboard')}
                        className="p-2 bg-white/50 backdrop-blur-md rounded-full border border-white/50 text-amber-700 shadow-sm active:scale-95 transition-transform"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                )}
            </div>
        </header>
    );
};
