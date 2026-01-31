
import React from 'react';
// FIX: Add 'Info' icon to support info-level toasts
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { ToastProps } from '../lib/types';

export const ToastContainer = ({ toasts }: { toasts: ToastProps[] }) => {
    const getToastStyle = (type: ToastProps['type']) => {
        switch (type) {
            case 'success':
                return {
                    borderColor: 'border-[#70AD47]',
                    icon: <CheckCircle2 size={20} className="text-[#70AD47] shrink-0" />
                };
            case 'info':
                return {
                    borderColor: 'border-blue-500',
                    icon: <Info size={20} className="text-blue-500 shrink-0" />
                };
            case 'error':
            default:
                return {
                    borderColor: 'border-rose-500',
                    icon: <AlertCircle size={20} className="text-rose-500 shrink-0" />
                };
        }
    };

    return (
        <div className="absolute bottom-8 right-8 flex flex-col gap-2 z-50 pointer-events-none">
            {toasts.map(t => {
                const { borderColor, icon } = getToastStyle(t.type);
                return (
                    <div key={t.id} className={`bg-white border-l-4 ${borderColor} shadow-lg rounded-r-lg p-4 flex items-start gap-3 w-96 animate-slideIn pointer-events-auto`}>
                        {icon}
                        <div>
                            <h4 className="text-sm font-bold text-slate-800">{t.title}</h4>
                            <p className="text-xs text-slate-500 mt-1 whitespace-pre-wrap">{t.message}</p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
