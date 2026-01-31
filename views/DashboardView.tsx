
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
    TrendingUp, ShoppingBag, Activity, CreditCard, Target, 
    ArrowUp, ArrowDown, Sparkles, Bot as BotIcon, ChevronRight, 
    ShieldAlert, PackageSearch, Flame, DatabaseZap, 
    Star, CalendarX, X, MousePointer2, SearchCode, ChevronLeft,
    AlertTriangle, TrendingDown, Layers, Ban, Zap, UploadCloud,
    History, Store, Truck, Wifi, Clock, CalendarDays, Stethoscope, Binary,
    ListFilter, Calculator, Microscope, LayoutGrid, Search, FileText,
    DollarSign, PackagePlus, Binoculars, ImageIcon, MessageSquare, Package, Database, CloudSync, CheckSquare, ShieldCheck, CheckCircle2
} from 'lucide-react';
import { DB } from '../lib/db';
import { ProductSKU, Shop, View } from '../lib/types';
import { getSkuIdentifier } from '../lib/helpers';
import { getTodayInBeijingString, generateDateRange } from '../lib/time';

type RangeType = 'realtime' | 'yesterday' | '7d' | '30d' | 'custom';
type MetricKey = 'gmv' | 'ca' | 'spend' | 'roi';

interface MetricPoint { current: number; previous: number; }
interface MetricGroup { total: MetricPoint; self: MetricPoint; pop: MetricPoint; }
interface DailyRecord { date: string; self: number; pop: number; total: number; }

interface Diagnosis {
    id: string;
    type: 'asset' | 'stock_severe' | 'stock_warning' | 'explosive' | 'data_gap' | 'high_potential' | 'low_roi' | 'new_sku' | 'data_integrity' | 'stale_inventory';
    title: string;
    desc: string;
    details: Record<string, string | number>;
    severity: 'critical' | 'warning' | 'info' | 'success';
}

const formatVal = (v: number, isFloat = false) => isFloat ? v.toFixed(2) : Math.round(v).toLocaleString();

const getDateKey = (d: string | Date) => {
    if (!d) return 'N/A';
    if (d instanceof Date) return d.toISOString().substring(0, 10);
    return String(d).replace(/\//g, '-').substring(0, 10);
};

const DIAGNOSIS_ICONS: Record<string, { icon: React.ElementType, color: string, bg: string }> = {
    stock_severe: { icon: Flame, color: 'text-rose-500', bg: 'bg-rose-50/50' },
    stock_warning: { icon: ShieldAlert, color: 'text-orange-500', bg: 'bg-orange-50/50' },
    low_roi: { icon: TrendingDown, color: 'text-amber-500', bg: 'bg-amber-50/50' },
    stale_inventory: { icon: PackageSearch, color: 'text-blue-500', bg: 'bg-blue-50/50' },
    data_integrity: { icon: Binary, color: 'text-indigo-500', bg: 'bg-indigo-50/50' },
    default: { icon: ShieldAlert, color: 'text-slate-500', bg: 'bg-slate-100/50' },
};

const DataInspectorModal = ({ 
    isOpen, 
    onClose, 
    rawData,
    dateRange,
    skus
}: { 
    isOpen: boolean, 
    onClose: () => void, 
    rawData: { shangzhi: any[], jingzhuntong: any[] },
    dateRange: { start: string, end: string },
    skus: ProductSKU[]
}) => {
    if (!isOpen) return null;

    const { enabledSkus, enabledSkusMap } = useMemo(() => {
        const enabled = skus.filter(s => s.isStatisticsEnabled);
        const map = new Map(enabled.map(s => [s.code, s]));
        return { enabledSkus: enabled, enabledSkusMap: map };
    }, [skus]);

    const sourceData = useMemo(() => {
        const dataMap = new Map<string, { date: string, sku: string, gmv: number, ca: number, uv: number, spend: number, source: string[] }>();
        
        const processRows = (rows: any[], type: 'shangzhi' | 'jingzhuntong') => {
             rows.forEach((r, i) => {
                const date = getDateKey(r.date);
                if (date < dateRange.start || date > dateRange.end) return;
                
                let sku: string | null = null;
                
                const normalize = (val: any): string | null => {
                    if (val === undefined || val === null) return null;
                    if (typeof val === 'number') return val.toLocaleString('fullwide', { useGrouping: false });
                    const strVal = String(val).trim();
                    if (strVal === '') return null;
                    if (/^[0-9.]+[eE][+-]?\d+$/.test(strVal)) {
                        const num = Number(strVal);
                        if (!isNaN(num)) return num.toLocaleString('fullwide', { useGrouping: false });
                    }
                    return strVal;
                };

                let rawIdentifier: any = null;
                if (type === 'shangzhi') {
                    rawIdentifier = r.sku_code || r.product_id;
                } else { // jingzhuntong
                    rawIdentifier = r.tracked_sku_id;
                    if (rawIdentifier === null || rawIdentifier === undefined || String(rawIdentifier).trim() === '') {
                        rawIdentifier = r.sku_code || r.product_id;
                    }
                }
                const identifiedSku = normalize(rawIdentifier);

                if (identifiedSku && enabledSkusMap.has(identifiedSku)) {
                    sku = identifiedSku;
                }

                if (!sku) return; // If no enabled SKU identifier is found, skip the row.

                // Unique key per source to show distinct raw rows
                const key = `${date}-${sku}-${type}-${i}`;
                const entry = dataMap.get(key) || { date, sku, gmv: 0, ca: 0, uv: 0, spend: 0, source: [] };
                
                if (type === 'shangzhi') {
                    entry.gmv += Number(r.paid_amount) || 0;
                    entry.ca += Number(r.paid_items) || 0;
                    entry.uv += Number(r.uv) || 0;
                    if (!entry.source.includes('商智')) entry.source.push('商智');
                } else { // jingzhuntong
                    entry.spend += Number(r.cost) || 0;
                    if (!entry.source.includes('广告')) entry.source.push('广告');
                }
                
                dataMap.set(key, entry);
            });
        };

        processRows(rawData.shangzhi, 'shangzhi');
        processRows(rawData.jingzhuntong, 'jingzhuntong');

        return Array.from(dataMap.values())
            .filter(d => d.gmv > 0 || d.ca > 0 || d.spend > 0 || d.uv > 0)
            .sort((a, b) => b.date.localeCompare(a.date) || a.sku.localeCompare(b.sku) || a.source[0].localeCompare(b.source[0]));
    }, [rawData, dateRange, enabledSkusMap]);

    const formulas = [
        { metric: 'GMV (成交金额)', formula: 'SUM(商智事实表[paid_amount])', description: '周期内，所有被统计SKU的“成交金额”之和。' },
        { metric: 'CA (成交件数)', formula: 'SUM(商智事实表[paid_items])', description: '周期内，所有被统计SKU的“成交件数”之和。' },
        { metric: 'SPEND (广告花费)', formula: 'SUM(广告事实表[cost])', description: '周期内，所有被统计SKU的“花费”之和。' },
        { metric: 'ROI (投产比)', formula: 'GMV / SPEND', description: '总成交金额除以总广告花费。' },
        { metric: 'CVR (转化率)', formula: 'SUM(paid_users) / SUM(uv)', description: '总成交人数除以总访客数。' },
        { metric: 'CPC (平均点击成本)', formula: 'SUM(cost) / SUM(clicks)', description: '总广告花费除以总点击数。' },
    ];

    return (
        <div className="fixed inset-0 bg-navy/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-fadeIn" onClick={onClose}>
            <div 
                className="bg-white rounded-[40px] shadow-2xl w-full max-w-5xl p-10 m-4 max-h-[90vh] flex flex-col border border-slate-200" 
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center mb-8 shrink-0 border-b border-slate-100 pb-6">
                    <div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            <SearchCode className="text-brand" size={24} /> 链路探测器 · 昊天镜
                        </h3>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">
                            Physical Data Trace & Calculation Inspector
                        </p>
                    </div>
                    <button onClick={onClose} className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all shadow-sm"><X size={24} /></button>
                </div>
                
                {/* Content */}
                <div className="flex-1 overflow-y-auto no-scrollbar pr-2 -mr-4 space-y-8">
                    {/* Upper Part: Source Data */}
                    <div className="p-8 bg-slate-50/50 rounded-[32px] border border-slate-100 shadow-inner flex flex-col">
                        <h4 className="text-sm font-black text-slate-800 uppercase mb-4 flex items-center gap-2"><Database size={16} className="text-brand"/> 源数据物理快照 ({dateRange.start} ~ {dateRange.end})</h4>
                        <div className="overflow-y-auto max-h-72 custom-scrollbar pr-4 -mr-4 rounded-xl">
                            <table className="w-full text-xs table-auto">
                                <thead className="sticky top-0 bg-slate-50/80 backdrop-blur-sm">
                                    <tr className="text-slate-400 font-black uppercase tracking-widest text-left">
                                        <th className="p-3">Date</th>
                                        <th className="p-3">SKU</th>
                                        <th className="p-3 text-right">GMV</th>
                                        <th className="p-3 text-right">CA</th>
                                        <th className="p-3 text-right">访客数</th>
                                        <th className="p-3 text-right">SPEND</th>
                                        <th className="p-3 text-center">Source</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {sourceData.length > 0 ? sourceData.map((row, i) => (
                                        <tr key={i} className="hover:bg-slate-100/50 transition-colors font-mono">
                                            <td className="p-3 font-bold text-slate-600">{row.date}</td>
                                            <td className="p-3 font-bold text-slate-800 truncate max-w-[200px]">{row.sku}</td>
                                            <td className="p-3 text-right text-slate-600">¥{row.gmv.toFixed(2)}</td>
                                            <td className="p-3 text-right text-slate-600">{row.ca}</td>
                                            <td className="p-3 text-right text-slate-600">{row.uv}</td>
                                            <td className="p-3 text-right text-slate-600">¥{row.spend.toFixed(2)}</td>
                                            <td className="p-3 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    {row.source.map(s => (
                                                        <span key={s} className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${s === '商智' ? 'bg-brand/10 text-brand' : 'bg-blue-100 text-blue-600'}`}>{s}</span>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={7} className="text-center p-10 text-slate-400 font-bold">周期内无物理数据记录</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Enabled SKUs */}
                    <div className="p-8 bg-slate-50/50 rounded-[32px] border border-slate-100 shadow-inner flex flex-col">
                        <h4 className="text-sm font-black text-slate-800 uppercase mb-4 flex items-center gap-2"><CheckSquare size={16} className="text-brand"/> 已纳入统计的物理资产 ({enabledSkus.length})</h4>
                        <div className="overflow-y-auto max-h-48 custom-scrollbar pr-4 -mr-4 rounded-xl">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                {enabledSkus.length > 0 ? enabledSkus.map((sku) => (
                                    <div key={sku.id} className="bg-white p-3 rounded-xl border border-slate-100">
                                        <p className="font-mono font-bold text-slate-700 text-[10px] truncate" title={sku.code}>{sku.code}</p>
                                        <p className="text-[9px] text-slate-400 font-medium truncate" title={sku.name}>{sku.name}</p>
                                    </div>
                                )) : (
                                    <p className="col-span-full text-center p-4 text-slate-400 font-bold text-xs">没有资产被标记为“参与统计”</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Data Source Convention */}
                    <div className="p-8 bg-slate-50/50 rounded-[32px] border border-slate-100 shadow-inner">
                        <h4 className="text-sm font-black text-slate-800 uppercase mb-4 flex items-center gap-2">
                            <ShieldCheck size={16} className="text-brand"/> 核心数据源约定
                        </h4>
                        <div className="space-y-4 text-xs font-bold">
                            <div className="p-4 bg-white rounded-xl border border-slate-100">
                                <p className="flex items-center gap-2 font-black text-slate-700">
                                    <ShoppingBag size={14} className="text-brand"/> 权威销售数据 (GMV, CA)
                                </p>
                                <p className="text-slate-500 mt-2 text-[11px] leading-relaxed">
                                    所有核心销售指标，如成交金额(GMV)与成交件数(CA)，其唯一数据源为 <strong>商智事实表 (`fact_shangzhi`)</strong> 中的 `paid_amount` 与 `paid_items` 字段。
                                </p>
                            </div>
                            <div className="p-4 bg-white rounded-xl border border-slate-100">
                                <p className="flex items-center gap-2 font-black text-slate-700">
                                    <CreditCard size={14} className="text-blue-500"/> 权威广告花费 (SPEND)
                                </p>
                                <p className="text-slate-500 mt-2 text-[11px] leading-relaxed">
                                    所有广告花费数据，统一来源于 <strong>广告事实表 (`fact_jingzhuntong`)</strong> 中的 `cost` 字段。
                                </p>
                            </div>
                            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                                <p className="flex items-center gap-2 font-black text-amber-700">
                                    <AlertTriangle size={14}/> 广告平台口径说明
                                </p>
                                <p className="text-amber-600 mt-2 text-[11px] leading-relaxed">
                                    广告事实表本身包含的 `total_order_amount` 等销售相关字段，为广告平台统计口径，仅用于广告归因分析，<strong className="underline">不作为</strong>本控制台核心指标的计算依据，以确保口径一致。
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Formulas */}
                    <div className="p-8 bg-slate-50/50 rounded-[32px] border border-slate-100 shadow-inner">
                        <h4 className="text-sm font-black text-slate-800 uppercase mb-6 flex items-center gap-2"><Calculator size={16} className="text-brand"/> 指标计算公式</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {formulas.map(f => (
                                <div key={f.metric} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm group hover:border-brand/20 transition-all">
                                    <p className="text-xs font-black text-slate-900 mb-2">{f.metric}</p>
                                    <code className="text-[11px] font-mono font-black bg-slate-100 text-brand px-3 py-1.5 rounded-lg inline-block">{f.formula}</code>
                                    <p className="text-[10px] text-slate-400 mt-3 font-bold leading-relaxed">{f.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const DiagnosisCard: React.FC<{ d: Diagnosis, mode?: 'carousel' | 'list', onClick?: () => void }> = ({ d, mode = 'carousel', onClick }) => {
    const detailEntries = Object.entries(d.details);
    const { icon: Icon, color, bg } = DIAGNOSIS_ICONS[d.type] || DIAGNOSIS_ICONS.default;
    const severityColor = d.severity === 'critical' ? 'text-rose-600' : d.severity === 'warning' ? (d.type === 'stock_warning' ? 'text-orange-600' : 'text-amber-600') : 'text-slate-800';

    return (
        <div 
            onClick={onClick}
            className={`transition-all duration-500 w-full flex border hover:shadow-xl hover:-translate-y-1 ${
                mode === 'carousel' 
                ? `h-[160px] p-6 rounded-[24px] mb-3 flex-col ${bg} border-slate-100` 
                : `p-4 rounded-2xl items-center gap-4 bg-white border-slate-100`
            } ${onClick ? 'cursor-pointer' : ''}`}
        >
             <div className={`flex items-start gap-4 ${mode === 'list' ? 'w-full' : ''}`}>
                <div className="space-y-2.5 overflow-hidden flex-1">
                    {detailEntries.slice(0, mode === 'list' ? 2 : 5).map(([key, value]) => (
                        <div key={key} className="flex items-start text-xs leading-snug">
                            <span className="w-20 shrink-0 text-slate-400 font-bold truncate">{key}：</span>
                            <span className={`font-bold break-words truncate flex items-center ${key === '预警类型' ? severityColor + ' font-black' : 'text-slate-700'}`}>
                                {String(value)}
                                {mode === 'carousel' && key === '预警类型' && <Icon size={14} className={`ml-2 ${color}`} />}
                            </span>
                        </div>
                    ))}
                </div>
                {mode === 'list' && <ChevronRight size={20} className="text-slate-300"/>}
             </div>
        </div>
    );
};

const DiagnosisDetailModal = ({ diagnosis, onClose, onMarkAsHandled }: { diagnosis: Diagnosis | null, onClose: () => void, onMarkAsHandled: () => void }) => {
    if (!diagnosis) return null;

    const { icon: Icon, color, bg } = DIAGNOSIS_ICONS[diagnosis.type] || DIAGNOSIS_ICONS.default;
    const detailEntries = Object.entries(diagnosis.details);
    const severityColor = diagnosis.severity === 'critical' ? 'text-rose-600' : diagnosis.severity === 'warning' ? (diagnosis.type === 'stock_warning' ? 'text-orange-600' : 'text-amber-600') : 'text-slate-800';

    return (
        <div className="fixed inset-0 bg-navy/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-fadeIn" onClick={onClose}>
            <div 
                className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl p-10 m-4 max-h-[90vh] flex flex-col border border-slate-200" 
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-start mb-8 pb-6 border-b border-slate-100">
                    <div className="flex items-center gap-5">
                        <div className={`w-16 h-16 rounded-3xl flex items-center justify-center shrink-0 ${bg} ${color}`}>
                            <Icon size={32} />
                        </div>
                        <div>
                            <h3 className={`text-2xl font-black tracking-tight ${severityColor}`}>{diagnosis.details['预警类型']}</h3>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">AI 审计预警详情</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all shadow-sm"><X size={24} /></button>
                </div>
                
                <div className="flex-1 overflow-y-auto no-scrollbar pr-2 -mr-4 space-y-4">
                    {detailEntries.map(([key, value]) => (
                        <div key={key} className="flex items-start text-sm leading-relaxed">
                            <dt className="w-24 shrink-0 text-slate-400 font-bold">{key}：</dt>
                            <dd className={`flex-1 font-bold break-words flex items-center ${key === '预警类型' ? severityColor : 'text-slate-700'}`}>
                                <span>{String(value)}</span>
                                {key === '预警类型' && <Icon size={16} className={`ml-2 inline-block ${color}`} />}
                            </dd>
                        </div>
                    ))}
                </div>

                <div className="mt-10 pt-8 border-t border-slate-100 flex justify-end">
                    <button 
                        onClick={onMarkAsHandled}
                        className="flex items-center gap-3 px-8 py-3 rounded-2xl bg-brand text-white font-black text-xs hover:bg-[#5da035] shadow-xl shadow-brand/20 transition-all active:scale-95 uppercase tracking-widest"
                    >
                        <CheckCircle2 size={16} /> 标记为已处理
                    </button>
                </div>
            </div>
        </div>
    );
};

const AllDiagnosesModal = ({ isOpen, onClose, diagnoses, onSelect }: { isOpen: boolean, onClose: () => void, diagnoses: Diagnosis[], onSelect: (d: Diagnosis) => void }) => {
    if (!isOpen) return null;

    return (
         <div className="fixed inset-0 bg-navy/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-fadeIn" onClick={onClose}>
            <div 
                className="bg-white rounded-[40px] shadow-2xl w-full max-w-3xl p-10 m-4 max-h-[90vh] flex flex-col border border-slate-200" 
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-8 shrink-0 pb-6 border-b border-slate-100">
                    <div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            <Layers size={24} className="text-brand"/> 全量审计矩阵 ({diagnoses.length})
                        </h3>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Full Audit & Risk Matrix</p>
                    </div>
                    <button onClick={onClose} className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all shadow-sm"><X size={24} /></button>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar pr-2 -mr-4 space-y-3">
                    {diagnoses.map(d => {
                         const { icon: Icon, color, bg } = DIAGNOSIS_ICONS[d.type] || DIAGNOSIS_ICONS.default;
                         const severityColor = d.severity === 'critical' ? 'text-rose-600' : d.severity === 'warning' ? (d.type === 'stock_warning' ? 'text-orange-600' : 'text-amber-600') : 'text-slate-800';
                         return (
                            <div key={d.id} onClick={() => onSelect(d)} className={`w-full flex items-center gap-4 p-4 rounded-2xl border border-slate-100 cursor-pointer hover:shadow-lg hover:border-slate-200 transition-all ${bg}`}>
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-white shadow-sm ${color}`}>
                                    <Icon size={24} />
                                </div>
                                <div className="space-y-1.5 overflow-hidden flex-1">
                                     {Object.entries(d.details).slice(0, 2).map(([key, value]) => (
                                        <div key={key} className="flex items-start text-xs leading-snug">
                                            <span className="w-20 shrink-0 text-slate-400 font-bold truncate">{key}：</span>
                                            <span className={`font-bold break-words truncate ${key === '预警类型' ? severityColor + ' font-black' : 'text-slate-700'}`}>{String(value)}</span>
                                        </div>
                                    ))}
                                </div>
                                <ChevronRight size={20} className="text-slate-300"/>
                            </div>
                         )
                    })}
                </div>
            </div>
        </div>
    );
}


const SubValueTrend = ({ current, previous, isHigherBetter = true }: { current: number, previous: number, isHigherBetter?: boolean }) => {
    if (previous === 0 && current === 0) return null;
    let chg = 0;
    if (previous === 0) {
        chg = 100;
    } else {
        chg = ((current - previous) / previous) * 100;
    }
    const isGood = (chg >= 0 && isHigherBetter) || (chg < 0 && !isHigherBetter);
    return (
        <div className={`flex items-center gap-0.5 font-black text-[10px] mt-0.5 ${isGood ? 'text-green-500' : 'text-rose-500'}`}>
            {chg >= 0 ? <ArrowUp size={8} strokeWidth={4}/> : <ArrowDown size={8} strokeWidth={4}/>}
            <span className="tabular-nums">{Math.abs(chg).toFixed(1)}%</span>
        </div>
    );
};

const KPICard = ({ title, value, prefix = "", isFloat = false, icon, isHigherBetter = true, color, bg, isActive, onClick }: any) => {
    let chg = 0;
    if (value.total.previous === 0 && value.total.current === 0) chg = 0;
    else if (value.total.previous === 0) chg = 100;
    else chg = ((value.total.current - value.total.previous) / value.total.previous) * 100;

    const isGood = (chg >= 0 && isHigherBetter) || (chg < 0 && !isHigherBetter);

    return (
        <button onClick={onClick} className={`bg-white rounded-[28px] border-2 text-left transition-all duration-500 flex flex-col overflow-hidden relative active:scale-95 ${isActive ? 'border-brand shadow-xl scale-[1.02] ring-4 ring-brand/5' : 'border-slate-100 shadow-sm hover:shadow-lg hover:border-slate-200'}`}>
            <div className="p-5 flex-1 space-y-3">
                <div className="flex justify-between items-start">
                    <div className={`w-10 h-10 ${bg} rounded-[14px] flex items-center justify-center ${color} shadow-inner`}>{icon}</div>
                    <div className="text-right">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">{title}</h3>
                        <div className={`px-2 py-0.5 rounded-lg inline-flex items-center gap-1 ${isGood ? 'bg-green-50 text-green-600' : 'bg-rose-50 text-rose-600'}`}>
                            {chg >= 0 ? <ArrowUp size={8} strokeWidth={4}/> : <ArrowDown size={8} strokeWidth={4}/>}
                            <span className="text-[9px] font-black tabular-nums">{Math.abs(chg).toFixed(1)}%</span>
                        </div>
                    </div>
                </div>
                <p className="text-4xl font-black text-slate-900 tabular-nums tracking-tighter">{prefix}{formatVal(value.total.current, isFloat)}</p>
            </div>
            <div className={`px-5 py-4 border-t-2 grid grid-cols-2 gap-4 ${isActive ? 'bg-brand/5 border-brand/10' : 'bg-slate-50 border-slate-100'}`}>
                <div>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">自营</span>
                    <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span className="text-xs font-black text-slate-700">{prefix}{formatVal(value.self.current, isFloat)}</span>
                        <SubValueTrend current={value.self.current} previous={value.self.previous} isHigherBetter={isHigherBetter} />
                    </div>
                </div>
                <div className="border-l border-slate-200 pl-4">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">POP</span>
                    <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span className="text-xs font-black text-slate-700">{prefix}{formatVal(value.pop.current, isFloat)}</span>
                        <SubValueTrend current={value.pop.current} previous={value.pop.previous} isHigherBetter={isHigherBetter} />
                    </div>
                </div>
            </div>
        </button>
    );
};

const MainTrendVisual = ({ data, metricKey, errorMessage }: { data: DailyRecord[], metricKey: MetricKey, errorMessage?: string }) => {
    const [hoverIndex, setHoverIndex] = useState<number | null>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const width = 1000; const height = 240; const padding = { top: 20, right: 30, bottom: 30, left: 50 };
    const maxVal = Math.max(...data.map(d => Math.max(d.self, d.pop)), 0.1) * 1.2;
    
    const getX = (i: number) => {
        if (data.length <= 1) return width / 2;
        return padding.left + (i / (data.length - 1)) * (width - padding.left - padding.right);
    };
    
    const getY = (v: number) => height - padding.bottom - (v / maxVal) * (height - padding.top - padding.bottom);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!svgRef.current || data.length === 0) return;
        if (data.length === 1) { setHoverIndex(0); return; }
        
        const rect = svgRef.current.getBoundingClientRect();
        const mouseX = ((e.clientX - rect.left) / rect.width) * width;
        const index = Math.round(((mouseX - padding.left) / (width - padding.left - padding.right)) * (data.length - 1));
        if (index >= 0 && index < data.length) setHoverIndex(index);
    };

    if (errorMessage) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 opacity-50">
                <CalendarX size={48} className="mb-4" strokeWidth={1}/>
                <p className="text-xs font-black uppercase tracking-widest">{errorMessage}</p>
            </div>
        );
    }

    if (data.length === 0) return (
        <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 opacity-50">
            <Activity size={48} className="mb-4" strokeWidth={1}/>
            <p className="text-xs font-black uppercase tracking-widest">No Data Signal</p>
        </div>
    );

    if (data.length === 1) {
        return (
            <div className="w-full h-full relative group/canvas flex items-center justify-center">
                <div className="bg-slate-50 px-8 py-6 rounded-3xl border border-slate-100 flex gap-8 items-center">
                    <div className="text-center">
                        <p className="text-[10px] font-black text-brand uppercase tracking-widest mb-1">自营</p>
                        <p className="text-2xl font-black text-slate-900 tabular-nums">{metricKey==='gmv'||metricKey==='spend'?'¥':''}{formatVal(data[0].self, metricKey==='roi')}</p>
                    </div>
                    <div className="w-px h-8 bg-slate-200"></div>
                    <div className="text-center">
                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">POP</p>
                        <p className="text-2xl font-black text-slate-900 tabular-nums">{metricKey==='gmv'||metricKey==='spend'?'¥':''}{formatVal(data[0].pop, metricKey==='roi')}</p>
                    </div>
                </div>
                <p className="absolute bottom-4 text-[9px] font-black text-slate-300 uppercase tracking-widest">Single Day Snapshot: {data[0].date}</p>
            </div>
        );
    }

    const selfPoints = data.map((d, i) => `${getX(i)},${getY(d.self)}`).join(' L ');
    const popPoints = data.map((d, i) => `${getX(i)},${getY(d.pop)}`).join(' L ');

    return (
        <div className="w-full h-full relative group/canvas flex items-center justify-center">
            <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible cursor-crosshair" onMouseMove={handleMouseMove} onMouseLeave={() => setHoverIndex(null)}>
                <defs>
                    <linearGradient id="gSelf" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#70AD47" stopOpacity="0.2"/><stop offset="100%" stopColor="#70AD47" stopOpacity="0"/></linearGradient>
                    <linearGradient id="gPop" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3B82F6" stopOpacity="0.2"/><stop offset="100%" stopColor="#3B82F6" stopOpacity="0"/></linearGradient>
                </defs>
                
                {[0, 0.25, 0.5, 0.75, 1].map(p => (
                    <line key={p} x1={padding.left} y1={getY(maxVal * p / 1.2)} x2={width-padding.right} y2={getY(maxVal * p / 1.2)} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="5 5" />
                ))}

                {data.map((d, i) => (
                    <text key={i} x={getX(i)} y={height - 10} textAnchor="middle" fontSize="9" fill={hoverIndex === i ? "#020617" : "#94a3b8"} fontWeight="900" className="transition-colors uppercase font-black" style={{ opacity: data.length > 20 && i % 3 !== 0 && i !== data.length-1 ? 0 : 1 }}>
                        {d.date.split('-').slice(1).join('/')}
                    </text>
                ))}

                <path d={`M ${getX(0)},${height-padding.bottom} L ${selfPoints} L ${getX(data.length-1)},${height-padding.bottom} Z`} fill="url(#gSelf)" className="transition-all duration-500" />
                <path d={`M ${getX(0)},${height-padding.bottom} L ${popPoints} L ${getX(data.length-1)},${height-padding.bottom} Z`} fill="url(#gPop)" className="transition-all duration-500" />
                <path d={`M ${selfPoints}`} fill="none" stroke="#70AD47" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d={`M ${popPoints}`} fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                {hoverIndex !== null && (
                    <g className="animate-fadeIn">
                        <line x1={getX(hoverIndex)} y1={padding.top} x2={getX(hoverIndex)} y2={height-padding.bottom} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="6 4" />
                        <circle cx={getX(hoverIndex)} cy={getY(data[hoverIndex].self)} r="5" fill="#70AD47" stroke="white" strokeWidth="2" className="shadow-lg" />
                        <circle cx={getX(hoverIndex)} cy={getY(data[hoverIndex].pop)} r="5" fill="#3B82F6" stroke="white" strokeWidth="2" className="shadow-lg" />
                    </g>
                )}
            </svg>

            {hoverIndex !== null && (
                <div className="absolute bg-slate-900/95 backdrop-blur text-white p-4 rounded-2xl shadow-2xl z-[100] pointer-events-none transition-all duration-200 border border-white/10" style={{ left: `${(getX(hoverIndex)/width)*100}%`, top: '30%', transform: `translate(${hoverIndex > data.length/2 ? '-110%' : '10%'}, -50%)` }}>
                    <p className="text-[9px] font-black text-slate-400 mb-2 border-b border-white/10 pb-1.5 uppercase tracking-widest">{data[hoverIndex].date}</p>
                    <div className="space-y-2">
                        <div className="flex justify-between gap-10 items-center">
                            <span className="text-[9px] font-bold text-slate-300 uppercase flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-brand"></div>自营</span>
                            <span className="text-[10px] font-black tabular-nums">{metricKey==='gmv'||metricKey==='spend'?'¥':''}{formatVal(data[hoverIndex].self, metricKey==='roi')}</span>
                        </div>
                        <div className="flex justify-between gap-10 items-center">
                            <span className="text-[9px] font-bold text-slate-300 uppercase flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>POP</span>
                            <span className="text-[10px] font-black tabular-nums">{metricKey==='gmv'||metricKey==='spend'?'¥':''}{formatVal(data[hoverIndex].pop, metricKey==='roi')}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export const DashboardView = ({ setCurrentView, skus, shops, factStats, addToast, setHeaderControls }: { setCurrentView: (view: View) => void, skus: ProductSKU[], shops: Shop[], factStats?: any, addToast: any, setHeaderControls: (node: React.ReactNode) => void }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [activeMetric, setActiveMetric] = useState<MetricKey>('gmv');
    const [rangeType, setRangeType] = useState<RangeType>('7d');
    
    const [dataAnchorDate, setDataAnchorDate] = useState<string>(getTodayInBeijingString());
    const [isDataStale, setIsDataStale] = useState(false);
    const [isDebugOpen, setIsDebugOpen] = useState(false);
    const [viewRange, setViewRange] = useState({start: '', end: ''});
    
    const [debugRawData, setDebugRawData] = useState<{shangzhi: any[], jingzhuntong: any[]}>({ shangzhi: [], jingzhuntong: [] });

    const [customRange, setCustomRange] = useState({
        start: generateDateRange(getTodayInBeijingString(), 14)[0],
        end: getTodayInBeijingString()
    });
    
    const [data, setData] = useState<Record<MetricKey, MetricGroup>>({
        gmv: { total: {current: 0, previous: 0}, self: {current: 0, previous: 0}, pop: {current: 0, previous: 0} },
        ca: { total: {current: 0, previous: 0}, self: {current: 0, previous: 0}, pop: {current: 0, previous: 0} },
        spend: { total: {current: 0, previous: 0}, self: {current: 0, previous: 0}, pop: {current: 0, previous: 0} },
        roi: { total: {current: 0, previous: 0}, self: {current: 0, previous: 0}, pop: {current: 0, previous: 0} }
    });

    const [trends, setTrends] = useState<DailyRecord[]>([]);
    const [trendErrorMessage, setTrendErrorMessage] = useState('');
    const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
    const [diagOffset, setDiagOffset] = useState(0);

    // New states for modals
    const [selectedDiagnosis, setSelectedDiagnosis] = useState<Diagnosis | null>(null);
    const [isAllDiagnosesModalOpen, setIsAllDiagnosesModalOpen] = useState(false);

    const systemVersion = 'v6.1.19001';

    useEffect(() => {
        setHeaderControls(
            <button onClick={() => setIsDebugOpen(true)} title="链路探测器" className="flex items-center justify-center w-10 h-10 bg-white rounded-full border-2 border-slate-200 text-slate-500 hover:text-brand hover:border-brand/50 transition-all shadow-sm">
                <SearchCode size={18} />
            </button>
        );
        return () => setHeaderControls(null); // Cleanup on unmount
    }, [setHeaderControls, setIsDebugOpen]);

    const handleMarkAsHandled = (id: string) => {
        setDiagnoses(prev => prev.filter(d => d.id !== id));
        setSelectedDiagnosis(null);
        addToast('success', '状态更新', '该预警已处理，将不再提示。');
    };

    useEffect(() => {
        if (factStats?.shangzhi?.latestDate && factStats.shangzhi.latestDate !== 'N/A') {
            const latestDataDate = factStats.shangzhi.latestDate;
            const today = getTodayInBeijingString();
            setDataAnchorDate(latestDataDate);
            if (latestDataDate < today) {
                setIsDataStale(true);
            }
        }
    }, [factStats]);

    const { enabledSkusMap } = useMemo(() => {
        const enabled = new Map<string, ProductSKU>();
        skus.forEach(s => { 
            const code = s.code.trim();
            if (s.isStatisticsEnabled) {
                enabled.set(code, s); 
            }
        });
        return { enabledSkusMap: enabled };
    }, [skus]);

    const shopIdToMode = useMemo(() => new Map(shops.map(s => [s.id, s.mode])), [shops]);
    const shopMap = useMemo(() => new Map(shops.map(s => [s.id, s])), [shops]);

    useEffect(() => {
        if (diagnoses.length <= 2) { setDiagOffset(0); return; }
        const timer = setInterval(() => { setDiagOffset(prev => (prev + 1) % diagnoses.length); }, 5000);
        return () => clearInterval(timer);
    }, [diagnoses.length]);

    const fetchData = async () => {
        setIsLoading(true);
        setTrendErrorMessage('');

        const anchorStr = dataAnchorDate;
        const windowDays = 60;
        const windowRange = generateDateRange(anchorStr, windowDays);
        const windowStart = windowRange.length > 0 ? windowRange[0] : anchorStr;

        // FIX: Explicitly type enabledSkuCodes as string[] to resolve type inference issue.
        const enabledSkuCodes = Array.from(enabledSkusMap.keys());
        if (enabledSkuCodes.length === 0) {
            addToast('warning', '无统计资产', '请在 SKU 资产中心勾选需要统计的 SKU。');
            setData({ gmv: { total: {current: 0, previous: 0}, self: {current: 0, previous: 0}, pop: {current: 0, previous: 0} }, ca: { total: {current: 0, previous: 0}, self: {current: 0, previous: 0}, pop: {current: 0, previous: 0} }, spend: { total: {current: 0, previous: 0}, self: {current: 0, previous: 0}, pop: {current: 0, previous: 0} }, roi: { total: {current: 0, previous: 0}, self: {current: 0, previous: 0}, pop: {current: 0, previous: 0} }});
            setTrends([]);
            setDiagnoses([]);
            setIsLoading(false);
            return;
        }

        try {
            const [allSz, allJzt] = await Promise.all([
                DB.getRange('fact_shangzhi', windowStart, anchorStr, enabledSkuCodes as string[]),
                DB.getRange('fact_jingzhuntong', windowStart, anchorStr, enabledSkuCodes as string[]),
            ]);
            
            setDebugRawData({ shangzhi: allSz, jingzhuntong: allJzt });

            let currentPeriodKeys: string[];
            let previousPeriodKeys: string[];
            let daysInPeriod: number;

            if (rangeType === 'realtime') {
                daysInPeriod = 1;
                currentPeriodKeys = [anchorStr];
                const prevRange = generateDateRange(anchorStr, 2);
                previousPeriodKeys = prevRange.length > 1 ? [prevRange[0]] : [];
            } else if (rangeType === 'yesterday') {
                daysInPeriod = 1;
                // 核心修正：昨日严格参照北京时间的日历昨天，而非数据锚点
                const todayBeijing = getTodayInBeijingString();
                const yesterdayRange = generateDateRange(todayBeijing, 2);
                
                currentPeriodKeys = yesterdayRange.length > 1 ? [yesterdayRange[0]] : [];
        
                if (currentPeriodKeys.length > 0) {
                    const dayBeforeYesterdayRange = generateDateRange(currentPeriodKeys[0], 2);
                    previousPeriodKeys = dayBeforeYesterdayRange.length > 1 ? [dayBeforeYesterdayRange[0]] : [];
                } else {
                     previousPeriodKeys = [];
                }
            } else if (rangeType === 'custom') {
                 const diffTime = Math.abs(new Date(customRange.end).getTime() - new Date(customRange.start).getTime());
                 daysInPeriod = Math.ceil(diffTime / 86400000) + 1;
                 currentPeriodKeys = generateDateRange(customRange.end, daysInPeriod);
                 const prevEnd = generateDateRange(customRange.start, 2)[0];
                 previousPeriodKeys = generateDateRange(prevEnd, daysInPeriod);
            } else {
                const daysMap: Record<string, number> = { '7d': 7, '30d': 30 };
                daysInPeriod = daysMap[rangeType] || 7;
                currentPeriodKeys = generateDateRange(anchorStr, daysInPeriod);
                
                const currentPeriodStartDate = currentPeriodKeys[0];
                const prevPeriodEndDate = generateDateRange(currentPeriodStartDate, 2)[0];
                previousPeriodKeys = generateDateRange(prevPeriodEndDate, daysInPeriod);
            }
            
            setViewRange({ start: currentPeriodKeys[0], end: currentPeriodKeys[currentPeriodKeys.length - 1] });

            const currentPeriodSet = new Set(currentPeriodKeys);
            const previousPeriodSet = new Set(previousPeriodKeys);

            const processStats = (szData: any[], jztData: any[]) => {
                const curr = { gmv: { total: 0, self: 0, pop: 0 }, ca: { total: 0, self: 0, pop: 0 }, spend: { total: 0, self: 0, pop: 0 } };
                const prev = { gmv: { total: 0, self: 0, pop: 0 }, ca: { total: 0, self: 0, pop: 0 }, spend: { total: 0, self: 0, pop: 0 } };

                const processRow = (row: any, targetPeriod: 'curr' | 'prev', type: 'sz' | 'jzt') => {
                    const normalize = (val: any): string | null => {
                        if (val === undefined || val === null) return null;
                        if (typeof val === 'number') return val.toLocaleString('fullwide', { useGrouping: false });
                        const strVal = String(val).trim();
                        if (strVal === '') return null;
                        if (/^[0-9.]+[eE][+-]?\d+$/.test(strVal)) {
                            const num = Number(strVal);
                            if (!isNaN(num)) return num.toLocaleString('fullwide', { useGrouping: false });
                        }
                        return strVal;
                    };
    
                    let rawIdentifier: any = null;
                    if (type === 'sz') {
                        rawIdentifier = row.sku_code || row.product_id;
                    } else { // 'jzt'
                        rawIdentifier = row.tracked_sku_id;
                        if (rawIdentifier === null || rawIdentifier === undefined || String(rawIdentifier).trim() === '') {
                            rawIdentifier = row.sku_code || row.product_id;
                        }
                    }
                    const code = normalize(rawIdentifier);

                    if (!code || !enabledSkusMap.has(code)) return;
                    const skuConfig = enabledSkusMap.get(code)!;
                    
                    const shopMode = shopIdToMode.get(skuConfig.shopId) || 'POP';
                    const stats = targetPeriod === 'curr' ? curr : prev;

                    if (type === 'sz') {
                        const val = Number(row.paid_amount) || 0;
                        const items = Number(row.paid_items) || 0;
                        stats.gmv.total += val;
                        stats.ca.total += items;
                        if (['自营', '入仓'].includes(shopMode)) {
                            stats.gmv.self += val;
                            stats.ca.self += items;
                        } else {
                            stats.gmv.pop += val;
                            stats.ca.pop += items;
                        }
                    } else { // jzt
                        const cost = Number(row.cost) || 0;
                        stats.spend.total += cost;
                        if (['自营', '入仓'].includes(shopMode)) {
                            stats.spend.self += cost;
                        } else {
                            stats.spend.pop += cost;
                        }
                    }
                };
                
                szData.forEach(r => {
                    const dateKey = getDateKey(r.date);
                    if (currentPeriodSet.has(dateKey)) processRow(r, 'curr', 'sz');
                    else if (previousPeriodSet.has(dateKey)) processRow(r, 'prev', 'sz');
                });
                jztData.forEach(r => {
                    const dateKey = getDateKey(r.date);
                    if (currentPeriodSet.has(dateKey)) processRow(r, 'curr', 'jzt');
                    else if (previousPeriodSet.has(dateKey)) processRow(r, 'prev', 'jzt');
                });

                return { curr, prev };
            };
            
            const { curr, prev } = processStats(allSz, allJzt);

            setData({
                gmv: { total: { current: curr.gmv.total, previous: prev.gmv.total }, self: { current: curr.gmv.self, previous: prev.gmv.self }, pop: { current: curr.gmv.pop, previous: prev.gmv.pop } },
                ca: { total: { current: curr.ca.total, previous: prev.ca.total }, self: { current: curr.ca.self, previous: prev.ca.self }, pop: { current: curr.ca.pop, previous: prev.ca.pop } },
                spend: { total: { current: curr.spend.total, previous: prev.spend.total }, self: { current: curr.spend.self, previous: prev.spend.self }, pop: { current: curr.spend.pop, previous: prev.spend.pop } },
                roi: { 
                    total: { current: curr.spend.total > 0 ? curr.gmv.total / curr.spend.total : 0, previous: prev.spend.total > 0 ? prev.gmv.total / prev.spend.total : 0 },
                    self: { current: curr.spend.self > 0 ? curr.gmv.self / curr.spend.self : 0, previous: prev.spend.self > 0 ? prev.gmv.self / prev.spend.self : 0 },
                    pop: { current: curr.spend.pop > 0 ? curr.gmv.pop / curr.spend.pop : 0, previous: prev.spend.pop > 0 ? prev.gmv.pop / prev.spend.pop : 0 }
                }
            });

            // Trend Data Calculation
            const dailyAgg: Record<string, { date: string, selfGmv: number, popGmv: number, selfCa: number, popCa: number, selfSpend: number, popSpend: number }> = {};
            currentPeriodKeys.forEach(ds => {
                dailyAgg[ds] = { date: ds, selfGmv: 0, popGmv: 0, selfCa: 0, popCa: 0, selfSpend: 0, popSpend: 0 };
            });

            const currentSz = allSz.filter(r => currentPeriodSet.has(getDateKey(r.date)));
            const currentJzt = allJzt.filter(r => currentPeriodSet.has(getDateKey(r.date)));

            currentSz.forEach(r => {
                const dateKey = getDateKey(r.date);
                if (!dailyAgg[dateKey]) return; 
                let code: string | null = null;
                const skuCode = r.sku_code ? String(r.sku_code).trim() : null;
                if (skuCode && enabledSkusMap.has(skuCode)) {
                    code = skuCode;
                } else {
                    const productId = r.product_id ? String(r.product_id).trim() : null;
                    if (productId && enabledSkusMap.has(productId)) code = productId;
                }
                if (!code) return;
                const skuConfig = enabledSkusMap.get(code)!;
                const shopMode = shopIdToMode.get(skuConfig.shopId) || 'POP';
                const gmv = Number(r.paid_amount) || 0;
                const ca = Number(r.paid_items) || 0;
                if (['自营', '入仓'].includes(shopMode)) { dailyAgg[dateKey].selfGmv += gmv; dailyAgg[dateKey].selfCa += ca; } 
                else { dailyAgg[dateKey].popGmv += gmv; dailyAgg[dateKey].popCa += ca; }
            });
            currentJzt.forEach(r => {
                const dateKey = getDateKey(r.date);
                if (!dailyAgg[dateKey]) return;
                const code = getSkuIdentifier(r)?.trim();
                if (!code || !enabledSkusMap.has(code)) return;
                const skuConfig = enabledSkusMap.get(code)!;
                const shopMode = shopIdToMode.get(skuConfig.shopId) || 'POP';
                const spend = Number(r.cost) || 0;
                if (['自营', '入仓'].includes(shopMode)) { dailyAgg[dateKey].selfSpend += spend; } 
                else { dailyAgg[dateKey].popSpend += spend; }
            });

            const trendRecords = Object.values(dailyAgg).map(d => {
                let selfVal = 0, popVal = 0;
                switch(activeMetric) {
                    case 'gmv': selfVal = d.selfGmv; popVal = d.popGmv; break;
                    case 'ca': selfVal = d.selfCa; popVal = d.popCa; break;
                    case 'spend': selfVal = d.selfSpend; popVal = d.popSpend; break;
                    case 'roi': 
                        selfVal = d.selfSpend > 0 ? d.selfGmv / d.selfSpend : 0;
                        popVal = d.popSpend > 0 ? d.popGmv / d.popSpend : 0;
                        break;
                }
                return { date: d.date, self: selfVal, pop: popVal, total: selfVal + popVal };
            });
            
            if ((rangeType === 'yesterday' || rangeType === 'realtime') && currentSz.length === 0 && currentJzt.length === 0) {
                 const dateStr = currentPeriodKeys[0];
                 setTrendErrorMessage(`未上传 ${dateStr} 数据`);
            }

            setTrends(trendRecords.sort((a, b) => a.date.localeCompare(b.date)));

            // AI Diagnosis (using current period data)
            const diag: Diagnosis[] = [];
            const last7DaysStart = generateDateRange(anchorStr, 7)[0];
            const last15DaysStart = generateDateRange(anchorStr, 15)[0];

            const skuAnalysisMap = new Map<string, { sku: ProductSKU; sales7d: number; sales15d: number; revenue: number; cost: number; }>();
            
            allSz.forEach((r: any) => {
                let code: string | null = null;
                const skuCode = r.sku_code ? String(r.sku_code).trim() : null;
                if (skuCode && enabledSkusMap.has(skuCode)) {
                    code = skuCode;
                } else {
                    const productId = r.product_id ? String(r.product_id).trim() : null;
                    if (productId && enabledSkusMap.has(productId)) code = productId;
                }
                if (!code) return;
                
                const skuConfig = enabledSkusMap.get(code);
                if (skuConfig) {
                    let entry = skuAnalysisMap.get(skuConfig.code) || { sku: skuConfig, sales7d: 0, sales15d: 0, revenue: 0, cost: 0 };
                    const sales = Number(r.paid_items) || 0;
                    if (r.date >= last7DaysStart) entry.sales7d += sales;
                    if (r.date >= last15DaysStart) entry.sales15d += sales;
                    entry.revenue += Number(r.paid_amount) || 0;
                    skuAnalysisMap.set(skuConfig.code, entry);
                }
            });
            allJzt.forEach((r: any) => {
                const code = getSkuIdentifier(r);
                const skuConfig = code ? enabledSkusMap.get(code) : undefined;
                if (skuConfig && skuAnalysisMap.has(skuConfig.code)) {
                    let entry = skuAnalysisMap.get(skuConfig.code)!;
                    entry.cost += Number(r.cost) || 0;
                }
            });

            for (const [code, skuData] of skuAnalysisMap.entries()) {
                const { sku, sales7d, sales15d, revenue, cost } = skuData;
                const totalStock = (sku.warehouseStock || 0) + (sku.factoryStock || 0);
                const skuIdentifier = `${sku.code} | ${sku.model || sku.name}`;
                const shopName = shopMap.get(sku.shopId)?.name || 'N/A';
                
                if (sales7d > 10 && totalStock < sales7d) {
                    diag.push({ 
                        id: `stock_severe_${code}`, 
                        type: 'stock_severe', 
                        title: '断货高危预警', 
                        desc: ``,
                        details: { 
                            '预警类型': '断货高危预警',
                            '店铺': shopName,
                            'SKU|型号': skuIdentifier,
                            '预警原因': `根据近7日CA销售(${sales7d}件)，当前总库存(${totalStock}件)已不足。`,
                            '解决建议': '建议立即启动补货流程，联系供应商或调拨库存。'
                        }, 
                        severity: 'critical' 
                    });
                } else if (sales15d > 20 && totalStock < sales15d) {
                    diag.push({ 
                        id: `stock_warning_${code}`, 
                        type: 'stock_warning', 
                        title: '普通断货预警', 
                        desc: ``,
                        details: { 
                            '预警类型': '普通断货预警',
                            '店铺': shopName,
                            'SKU|型号': skuIdentifier,
                            '预警原因': `根据近15日CA销售(${sales15d}件)，当前总库存(${totalStock}件)已不满足安全库存。`,
                            '解决建议': '建议关注并准备补货计划。'
                        }, 
                        severity: 'warning' 
                    });
                }

                if (cost > 300 && (revenue / cost) < 1.2 && revenue > 0) {
                    diag.push({ 
                        id: `roi_${code}`, 
                        type: 'low_roi', 
                        title: '广告投放亏损', 
                        desc: ``,
                        details: {
                            '预警类型': '广告投放亏损',
                            '店铺': shopName,
                            'SKU|型号': skuIdentifier,
                            '预警原因': `周期内广告花费 ¥${Math.round(cost)}，产出 ¥${Math.round(revenue)}，ROI(${(revenue / cost).toFixed(2)})过低。`,
                            '解决建议': '检查广告关键词和落地页，考虑降低出价或暂停低效计划。'
                        }, 
                        severity: 'warning' 
                    });
                }
                if (totalStock > 100 && sales7d < 5 && totalStock > sales7d * 10) {
                     diag.push({ 
                        id: `stale_${code}`, 
                        type: 'stale_inventory', 
                        title: '呆滞库存风险', 
                        desc: ``,
                        details: {
                            '预警类型': '呆滞库存风险',
                            '店铺': shopName,
                            'SKU|型号': skuIdentifier,
                            '预警原因': `库存量高(${totalStock}) 但近7日销量低(${sales7d})，库存周转率过低。`,
                            '解决建议': '考虑促销清仓或捆绑销售，优化库存结构。'
                        }, 
                        severity: 'info' 
                    });
                }
            }
            
            // 新增：数据链路完整性诊断
            const integrityIssues: string[] = [];
            const checkedSkus = new Set<string>();

            const checkIntegrity = (rows: any[]) => {
                rows.forEach(r => {
                    const skuCode = getSkuIdentifier(r);
                    if (skuCode && enabledSkusMap.has(skuCode) && !checkedSkus.has(skuCode)) {
                        if (!r.shop_name) {
                            integrityIssues.push(skuCode);
                            checkedSkus.add(skuCode);
                        }
                    }
                });
            };
            checkIntegrity(allSz);
            checkIntegrity(allJzt);

            if (integrityIssues.length > 0) {
                diag.push({
                    id: `data_integrity_${integrityIssues[0]}`,
                    type: 'data_integrity',
                    title: '数据链路不完整',
                    desc: '',
                    details: {
                        '预警类型': '数据链路不完整',
                        '影响资产': `${integrityIssues.slice(0, 2).join(', ')}${integrityIssues.length > 2 ? ` 等 ${integrityIssues.length} 个 SKU` : ''}`,
                        '预警原因': '部分物理事实行缺少店铺归属，可能导致聚合数据不准。',
                        '解决建议': '请前往【底层治理】->【物理清洗】，执行“资产归属校准”修复。'
                    },
                    severity: 'warning'
                });
            }

            setDiagnoses(diag);
            setDiagOffset(0);

        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [rangeType, customRange, activeMetric, enabledSkusMap, shopIdToMode, dataAnchorDate]); 

    return (
        <div className="p-8 md:p-12 w-full animate-fadeIn space-y-8 min-h-screen bg-[#F8FAFC]">
            
            <DiagnosisDetailModal 
                diagnosis={selectedDiagnosis} 
                onClose={() => setSelectedDiagnosis(null)} 
                onMarkAsHandled={() => selectedDiagnosis && handleMarkAsHandled(selectedDiagnosis.id)}
            />
            <AllDiagnosesModal 
                isOpen={isAllDiagnosesModalOpen}
                onClose={() => setIsAllDiagnosesModalOpen(false)}
                diagnoses={diagnoses}
                onSelect={(d) => {
                    setIsAllDiagnosesModalOpen(false);
                    setSelectedDiagnosis(d);
                }}
            />

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-slate-200 pb-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-brand animate-pulse"></div>
                            <span className="text-[10px] font-black text-brand uppercase tracking-widest leading-none">系统版本：{systemVersion}</span>
                        </div>
                        {isDataStale && (
                            <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 rounded-lg border border-amber-200 animate-fadeIn">
                                <Clock size={10} className="text-amber-600" />
                                <span className="text-[9px] font-black text-amber-700 uppercase tracking-widest leading-none">
                                    数据尚未更新 (Latest: {dataAnchorDate})
                                </span>
                            </div>
                        )}
                        {!isDataStale && (
                             <div className="flex items-center gap-2 px-2 py-1 bg-slate-100 rounded-lg border border-slate-200">
                                <History size={10} className="text-slate-500" />
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">
                                    智能回溯: {dataAnchorDate}
                                </span>
                            </div>
                        )}
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">战略指挥控制台</h1>
                    <p className="text-slate-400 font-bold text-sm tracking-wide">Strategic Performance Intelligence & AI Dashboard</p>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="flex bg-slate-200/50 p-1.5 rounded-[22px] shadow-inner border border-slate-200">
                        {[
                            {id:'realtime', l:'实时', icon: Wifi, disabled: true, title: '实时物理链路尚未建立'}, 
                            {id:'yesterday', l:'昨日', icon: History},
                            {id:'7d', l:'近7天'},
                            {id:'30d', l:'近30天'},
                            {id:'custom', l:'自定义'}
                        ].map(i => (
                            <button 
                                key={i.id} 
                                onClick={() => !i.disabled && setRangeType(i.id as RangeType)} 
                                className={`px-5 py-3 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${rangeType === i.id ? 'bg-white text-slate-900 shadow-xl scale-105' : 'text-slate-500'} ${i.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:text-slate-700'}`}
                                disabled={i.disabled}
                                title={i.title || ''}
                            >
                                {i.icon && <i.icon size={12} className={rangeType === i.id ? 'text-brand' : 'opacity-50'} />}
                                {i.l}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-2">
                <KPICard isActive={activeMetric === 'gmv'} onClick={() => setActiveMetric('gmv')} title="GMV" value={data.gmv} prefix="¥" icon={<ShoppingBag size={18}/>} color="text-brand" bg="bg-brand/5" />
                <KPICard isActive={activeMetric === 'ca'} onClick={() => setActiveMetric('ca')} title="CA" value={data.ca} icon={<Activity size={18}/>} color="text-blue-600" bg="bg-blue-50" />
                <KPICard isActive={activeMetric === 'spend'} onClick={() => setActiveMetric('spend')} title="SPEND" value={data.spend} prefix="¥" icon={<CreditCard size={18}/>} isHigherBetter={false} color="text-amber-600" bg="bg-amber-50" />
                <KPICard isActive={activeMetric === 'roi'} onClick={() => setActiveMetric('roi')} title="ROI" value={data.roi} isFloat icon={<Target size={18}/>} color="text-purple-600" bg="bg-purple-50" />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                <div className="xl:col-span-8 bg-white rounded-[40px] p-6 shadow-sm border-2 border-slate-100 flex flex-col relative overflow-hidden group/chart h-[420px]">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-[14px] bg-slate-50 flex items-center justify-center text-brand border border-slate-100 shadow-inner group-hover/chart:rotate-6 transition-transform">
                                <TrendingUp size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-800 tracking-tight uppercase">{activeMetric} 增长拓扑流</h3>
                                <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] mt-0.5">Physical Performance Stream</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-brand shadow-lg shadow-brand/20"></div><span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">自营资产</span></div>
                            <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-lg shadow-blue-500/20"></div><span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">POP 店铺</span></div>
                        </div>
                    </div>
                    <div className="flex-1 w-full">
                         <MainTrendVisual data={trends} metricKey={activeMetric} errorMessage={trendErrorMessage} />
                    </div>
                </div>

                <div className="xl:col-span-4 bg-white rounded-[40px] p-6 shadow-xl border-2 border-slate-100 flex flex-col relative overflow-hidden group/diag h-[420px]">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 rounded-full blur-[80px] -translate-y-1/3 translate-x-1/3"></div>
                    <div className="flex items-center gap-4 mb-4 relative z-10 shrink-0">
                        <div className="w-10 h-10 rounded-[14px] bg-brand flex items-center justify-center shadow-2xl shadow-brand/30 border border-white/20 group-hover/diag:scale-110 transition-transform duration-500"><BotIcon size={20} className="text-white" /></div>
                        <div>
                            <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">AI 战略诊断室 <Sparkles size={14} className="text-brand animate-pulse" /></h3>
                            <p className="text-[9px] text-slate-400 font-black uppercase mt-0.5 tracking-widest leading-none">Neural Decision Intelligence</p>
                        </div>
                    </div>
                    <div className="flex-1 relative mb-4 overflow-hidden mask-linear-fade">
                        {diagnoses.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center bg-slate-50/50 rounded-[32px] border border-dashed border-slate-200 p-8 text-center opacity-40">
                                <DatabaseZap size={32} className="text-slate-300 mb-3" />
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">物理链路平稳，系统暂无风险</p>
                            </div>
                        ) : (
                            <div className="transition-transform duration-700 ease-in-out h-full" style={{ transform: `translateY(-${(diagOffset * 172)}px)` }}>
                                <div className="flex flex-col">
                                    {diagnoses.map((d, i) => (
                                        <div key={d.id} className="h-[160px] mb-3 shrink-0">
                                            <DiagnosisCard d={d} mode="carousel" onClick={() => setSelectedDiagnosis(d)} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <button onClick={() => setIsAllDiagnosesModalOpen(true)} className="w-full relative z-10 py-3.5 bg-slate-900 text-white rounded-[18px] font-black text-[10px] hover:bg-black transition-all flex items-center justify-center gap-2 shadow-xl active:scale-95 uppercase tracking-[0.2em] mt-auto shrink-0">查看全量审计矩阵 <ChevronRight size={12} /></button>
                </div>
            </div>

             <DataInspectorModal 
                isOpen={isDebugOpen} 
                onClose={() => setIsDebugOpen(false)} 
                rawData={debugRawData} 
                dateRange={viewRange}
                skus={skus}
            />
        </div>
    );
};
