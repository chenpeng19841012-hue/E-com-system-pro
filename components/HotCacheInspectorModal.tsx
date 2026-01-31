import React from 'react';
import { X, Zap, Database } from 'lucide-react';

export const HotCacheInspectorModal = ({ isOpen, onClose, data }: { isOpen: boolean, onClose: () => void, data: any[] }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-navy/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-fadeIn" onClick={onClose}>
            <div 
                className="bg-white rounded-[40px] shadow-2xl w-full max-w-4xl p-10 m-4 max-h-[90vh] flex flex-col border border-slate-200" 
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center mb-8 shrink-0 border-b border-slate-100 pb-6">
                    <div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            <Zap size={24} className="text-brand" /> 内存加速缓存 (Hot Cache)
                        </h3>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">
                            In-Memory Aggregated Data Inspector
                        </p>
                    </div>
                    <button onClick={onClose} className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all shadow-sm"><X size={24} /></button>
                </div>
                
                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 -mr-4">
                    <div className="p-8 bg-slate-50/50 rounded-[32px] border border-slate-100 shadow-inner">
                        <h4 className="text-sm font-black text-slate-800 uppercase mb-4 flex items-center gap-2">
                            <Database size={16} className="text-brand"/> 预聚合数据快照 ({data.length} 条)
                        </h4>
                        <div className="overflow-y-auto max-h-96 custom-scrollbar pr-4 -mr-4 rounded-xl">
                             <table className="w-full text-xs table-auto">
                                <thead className="sticky top-0 bg-slate-50/80 backdrop-blur-sm">
                                    <tr className="text-slate-400 font-black uppercase tracking-widest text-left">
                                        <th className="p-3">日期</th>
                                        <th className="p-3">SKU</th>
                                        <th className="p-3">SKU 名称</th>
                                        <th className="p-3 text-right">GMV</th>
                                        <th className="p-3 text-right">CA</th>
                                        <th className="p-3 text-right">UV</th>
                                        <th className="p-3 text-right">花费</th>
                                        <th className="p-3 text-right">ROI</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {data.length > 0 ? data.map((row, i) => (
                                        <tr key={i} className="hover:bg-slate-100/50 transition-colors font-mono">
                                            <td className="p-3 font-bold text-slate-600">{row.date}</td>
                                            <td className="p-3 font-bold text-slate-800 truncate max-w-[150px]">{row.sku}</td>
                                            <td className="p-3 text-slate-500 truncate max-w-[200px] font-sans font-bold">{row.skuName}</td>
                                            <td className="p-3 text-right text-slate-600">¥{Math.round(row.gmv).toLocaleString()}</td>
                                            <td className="p-3 text-right text-slate-600">{Math.round(row.ca)}</td>
                                            <td className="p-3 text-right text-slate-600">{Math.round(row.uv)}</td>
                                            <td className="p-3 text-right text-amber-600">¥{Math.round(row.spend).toLocaleString()}</td>
                                            <td className="p-3 text-right font-black text-brand">{row.roi.toFixed(2)}</td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={8} className="text-center p-10 text-slate-400 font-bold">内存缓存为空</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
