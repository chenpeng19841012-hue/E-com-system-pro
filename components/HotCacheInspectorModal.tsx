import React from 'react';
import { X, Zap, Database } from 'lucide-react';

export const HotCacheInspectorModal = ({ isOpen, onClose, data }: { isOpen: boolean, onClose: () => void, data: any[] }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-navy/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-fadeIn" onClick={onClose}>
            <div 
                className="bg-white rounded-[40px] shadow-2xl w-full max-w-7xl p-10 m-4 max-h-[90vh] flex flex-col border border-slate-200" 
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
                        <div className="overflow-auto max-h-96 custom-scrollbar pr-4 -mr-4 rounded-xl">
                             <table className="w-full text-xs table-auto min-w-[2500px]">
                                <thead className="sticky top-0 bg-slate-50/80 backdrop-blur-sm">
                                    <tr className="text-slate-400 font-black uppercase tracking-widest text-left">
                                        <th className="p-3 sticky left-0 bg-slate-50/80 z-20 min-w-[100px]">日期</th>
                                        <th className="p-3 sticky left-[100px] bg-slate-50/80 z-20 min-w-[160px]">SKU</th>
                                        <th className="p-3">店铺</th>
                                        <th className="p-3">三级类目</th>
                                        <th className="p-3">广告账户</th>
                                        <th className="p-3 text-right">GMV</th>
                                        <th className="p-3 text-right">CA</th>
                                        <th className="p-3 text-right">UV</th>
                                        <th className="p-3 text-right">PV</th>
                                        <th className="p-3 text-right">成交转化率</th>
                                        <th className="p-3 text-right">成交单量</th>
                                        <th className="p-3 text-right">加购人数</th>
                                        <th className="p-3 text-right">加购件数</th>
                                        <th className="p-3 text-right">花费</th>
                                        <th className="p-3 text-right">展现</th>
                                        <th className="p-3 text-right">点击</th>
                                        <th className="p-3 text-right">直接订单行</th>
                                        <th className="p-3 text-right">直接订单额</th>
                                        <th className="p-3 text-right">间接订单行</th>
                                        <th className="p-3 text-right">间接订单额</th>
                                        <th className="p-3 text-right">总订单行</th>
                                        <th className="p-3 text-right">总订单额</th>
                                        <th className="p-3 text-right">直接加购</th>
                                        <th className="p-3 text-right">间接加购</th>
                                        <th className="p-3 text-right">总加购</th>
                                        <th className="p-3 text-right">ROI</th>
                                        <th className="p-3 text-right">CPC</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {data.length > 0 ? data.map((row, i) => (
                                        <tr key={i} className="hover:bg-slate-100/50 transition-colors group">
                                            <td className="p-3 font-bold text-slate-600 sticky left-0 bg-white group-hover:bg-slate-100/50 z-10 transition-none">{row.date}</td>
                                            <td className="p-3 font-bold text-slate-800 truncate max-w-[150px] sticky left-[100px] bg-white group-hover:bg-slate-100/50 z-10 transition-none">{row.sku}</td>
                                            <td className="p-3 text-slate-500 truncate max-w-[150px] font-sans font-bold">{row.shop_name}</td>
                                            <td className="p-3 text-slate-500 truncate max-w-[150px] font-sans font-bold">{row.category_l3}</td>
                                            <td className="p-3 text-slate-500 truncate max-w-[150px] font-sans font-bold">{row.account_nickname}</td>
                                            <td className="p-3 text-right text-slate-600">¥{Math.round(row.gmv).toLocaleString()}</td>
                                            <td className="p-3 text-right text-slate-600">{Math.round(row.ca)}</td>
                                            <td className="p-3 text-right text-slate-600">{Math.round(row.uv)}</td>
                                            <td className="p-3 text-right text-slate-600">{Math.round(row.pv)}</td>
                                            <td className="p-3 text-right font-black text-rose-600">{(row.cvr * 100).toFixed(2)}%</td>
                                            <td className="p-3 text-right text-slate-600">{Math.round(row.paid_orders)}</td>
                                            <td className="p-3 text-right text-slate-600">{Math.round(row.add_to_cart_users)}</td>
                                            <td className="p-3 text-right text-slate-600">{Math.round(row.add_to_cart_items)}</td>
                                            <td className="p-3 text-right text-amber-600">¥{Math.round(row.spend).toLocaleString()}</td>
                                            <td className="p-3 text-right text-slate-600">{Math.round(row.impressions).toLocaleString()}</td>
                                            <td className="p-3 text-right text-slate-600">{Math.round(row.clicks).toLocaleString()}</td>
                                            <td className="p-3 text-right text-slate-600">{Math.round(row.direct_orders)}</td>
                                            <td className="p-3 text-right text-slate-600">¥{Math.round(row.direct_order_amount).toLocaleString()}</td>
                                            <td className="p-3 text-right text-slate-600">{Math.round(row.indirect_orders)}</td>
                                            <td className="p-3 text-right text-slate-600">¥{Math.round(row.indirect_order_amount).toLocaleString()}</td>
                                            <td className="p-3 text-right text-slate-600">{Math.round(row.total_orders)}</td>
                                            <td className="p-3 text-right text-slate-600">¥{Math.round(row.total_order_amount).toLocaleString()}</td>
                                            <td className="p-3 text-right text-slate-600">{Math.round(row.direct_add_to_cart)}</td>
                                            <td className="p-3 text-right text-slate-600">{Math.round(row.indirect_add_to_cart)}</td>
                                            <td className="p-3 text-right text-slate-600">{Math.round(row.total_add_to_cart)}</td>
                                            <td className="p-3 text-right font-black text-brand">{row.roi.toFixed(2)}</td>
                                            <td className="p-3 text-right font-black text-indigo-600">¥{row.cpc.toFixed(2)}</td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={27} className="text-center p-10 text-slate-400 font-bold">内存缓存为空</td></tr>
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
