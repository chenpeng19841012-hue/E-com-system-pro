
import React from 'react';
import { X, AlertCircle } from 'lucide-react';

export const ConfirmModal = ({ isOpen, title, children, onConfirm, onCancel, confirmText = '确认', confirmButtonClass = 'bg-[#70AD47] hover:bg-[#5da035] shadow-[#70AD47]/20' }: any) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fadeIn" onClick={onCancel}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 m-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 flex items-center justify-center bg-amber-100 rounded-full text-amber-500 shrink-0">
                            <AlertCircle size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">{title}</h3>
                        </div>
                    </div>
                    <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>
                <div className="text-slate-600 text-sm leading-relaxed ml-13">
                    {children}
                </div>
                <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-slate-100">
                    <button onClick={onCancel} className="px-6 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors">
                        取消
                    </button>
                    <button onClick={onConfirm} className={`px-6 py-2.5 rounded-lg text-white font-bold text-sm shadow-lg transition-all active:scale-95 ${confirmButtonClass}`}>
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};
