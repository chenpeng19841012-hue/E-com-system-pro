
import React from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { ToastProps } from '../lib/types';

export const ToastContainer = ({ toasts }: { toasts: ToastProps[] }) => {
    return (
        <div className="absolute bottom-8 right-8 flex flex-col gap-2 z-50 pointer-events-none">
            {toasts.map(t => (
                <div key={t.id} className={`bg-white border-l-4 ${t.type === 'success' ? 'border-[#70AD47]' : 'border-rose-500'} shadow-lg rounded-r-lg p-4 flex items-start gap-3 w-96 animate-slideIn pointer-events-auto`}>
                    {t.type === 'success' ? <CheckCircle2 size={20} className="text-[#70AD47] shrink-0" /> : <AlertCircle size={20} className="text-rose-500 shrink-0" />}
                    <div>
                        <h4 className="text-sm font-bold text-slate-800">{t.title}</h4>
                        <p className="text-xs text-slate-500 mt-1 whitespace-pre-wrap">{t.message}</p>
                    </div>
                </div>
            ))}
        </div>
    );
};
