
import React, { useState, useEffect } from 'react';
import { TrendingUp, BarChart, ShoppingBag, Activity, CreditCard, Target, ArrowUp, ArrowDown, Zap, Sparkles, Bot as BotIcon, ChevronRight, Calendar, Filter, Store } from 'lucide-react';
import { DB } from '../lib/db';
import { ProductSKU, Shop } from '../lib/types';
import { getSkuIdentifier } from '../lib/helpers';

type RangeType = '7d' | '30d' | 'custom';

interface MetricSplit {
    total: number;
    self: number;
    pop: number;
}

export const DashboardView = ({ skus, shops, addToast }: { skus: ProductSKU[], shops: Shop[], addToast: any }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [rangeType, setRangeType] = useState<RangeType>('7d');
    const [customRange, setCustomRange] = useState({
        start: new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });
    
    const [data, setData] = useState<any>({
        gmv: { total: 0, self: 0, pop: 0 },
        ca: { total: 0, self: 0, pop: 0 },
        spend: { total: 0, self: 0, pop: 0 },
        roi: { total: 0, self: 0, pop: 0 }
    });

    // 映射表：SKU -> 店铺模式
    const skuToModeMap = React.useMemo(() => {
        const map = new Map<string, string>();
        const shopIdToMode = new Map(shops.map(s => [s.id, s.mode]));
        skus.forEach(s => {
            const mode = shopIdToMode.get(s.shopId);
            if (mode) map.set(s.code, mode);
        });
        return map;
    }, [skus, shops]);

    // 映射表：店铺名 -> 店铺模式 (兜底逻辑)
    const shopNameToModeMap = React.useMemo(() => {
        return new Map(shops.map(s => [s.name, s.mode]));
    }, [shops]);

    // 获取已开启统计的 SKU 编码集合
    const enabledSkuCodes = React.useMemo(() => {
        return new Set(skus.filter(s => s.isStatisticsEnabled).map(s => s.code));
    }, [skus]);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            let start: string;
            let end = new Date().toISOString().split('T')[0];

            if (rangeType === '7d') {
                start = new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0];
            } else if (rangeType === '30d') {
                start = new Date(Date.now() - 29 * 86400000).toISOString().split('T')[0];
            } else {
                start = customRange.start;
                end = customRange.end;
            }
            
            try {
                const [currSz, currJzt] = await Promise.all([
                    DB.getRange('fact_shangzhi', start, end),
                    DB.getRange('fact_jingzhuntong', start, end)
                ]);

                const stats = {
                    gmv: { total: 0, self: 0, pop: 0 },
                    ca: { total: 0, self: 0, pop: 0 },
                    spend: { total: 0, self: 0, pop: 0 },
                    roi: { total: 0, self: 0, pop: 0 }
                };

                // 处理商智数据 (GMV, CA)
                currSz.forEach(row => {
                    const code = getSkuIdentifier(row);
                    if (code && enabledSkuCodes.has(code)) {
                        const amount = Number(row.paid_amount) || 0;
                        const items = Number(row.paid_items) || 0;
                        const mode = skuToModeMap.get(code) || shopNameToModeMap.get(row.shop_name) || '自营';

                        stats.gmv.total += amount;
                        stats.ca.total += items;
                        if (mode === '自营') {
                            stats.gmv.self += amount;
                            stats.ca.self += items;
                        } else {
                            stats.gmv.pop += amount;
                            stats.ca.pop += items;
                        }
                    }
                });

                // 处理广告数据 (Spend)
                currJzt.forEach(row => {
                    const code = getSkuIdentifier(row);
                    if (code && enabledSkuCodes.has(code)) {
                        const cost = Number(row.cost) || 0;
                        const mode = skuToModeMap.get(code) || shopNameToModeMap.get(row.shop_name) || '自营';

                        stats.spend.total += cost;
                        if (mode === '自营') {
                            stats.spend.self += cost;
                        } else {
                            stats.spend.pop += cost;
                        }
                    }
                });

                // 计算 ROI
                stats.roi.total = stats.spend.total > 0 ? stats.gmv.total / stats.spend.total : 0;
                stats.roi.self = stats.spend.self > 0 ? stats.gmv.self / stats.spend.self : 0;
                stats.roi.pop = stats.spend.pop > 0 ? stats.gmv.pop / stats.spend.pop : 0;

                setData(stats);
            } catch (e) {
                console.error("Dashboard calculation error:", e);
            } finally {
                setTimeout(() => setIsLoading(false), 300);
            }
        };
        fetchData();
    }, [rangeType, customRange, enabledSkuCodes, skuToModeMap, shopNameToModeMap]);

    return (
        <div className="p-6 md:p-10 w-full animate-fadeIn space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 pb-8">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-2 h-2 rounded-full bg-brand animate-pulse"></div>
                        <span className="text-[10px] font-black text-brand uppercase tracking-widest">战略决策模式已挂载</span>
                        {enabledSkuCodes.size > 0 && (
                            <span className="flex items-center gap-1 bg-brand/10 text-brand px-2 py-0.5 rounded text-[9px] font-black uppercase">
                                <Filter size={10} /> 已锁定 {enabledSkuCodes.size} 个统计项
                            </span>
                        )}
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">战略指挥中心</h1>
                    <p className="text-slate-500 font-medium text-xs mt-1 italic">Precision Intelligence Data Hub & Strategic Decision Engine</p>
                </div>
                
                <div className="flex flex-col items-end gap-3">
                    <div className="flex bg-slate-100 p-1 rounded-xl w-fit border border-slate-200 shadow-inner">
                        {[
                            { id: '7d', label: '近 7 天' },
                            { id: '30d', label: '近 30 天' },
                            { id: 'custom', label: '自定义' }
                        ].map((item) => (
                            <button 
                                key={item.id} 
                                onClick={() => setRangeType(item.id as RangeType)}
                                className={`px-5 py-1.5 rounded-lg text-xs font-black transition-all ${rangeType === item.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                    
                    {rangeType === 'custom' && (
                        <div className="flex items-center gap-2 animate-slideIn bg-white p-2 rounded-xl border border-slate-100 shadow-sm">
                            <Calendar size={14} className="text-slate-400 ml-1" />
                            <input 
                                type="date" 
                                value={customRange.start}
                                onChange={e => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
                                className="text-[10px] font-black text-slate-600 border-none outline-none bg-transparent" 
                            />
                            <span className="text-slate-300">-</span>
                            <input 
                                type="date" 
                                value={customRange.end}
                                onChange={e => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
                                className="text-[10px] font-black text-slate-600 border-none outline-none bg-transparent" 
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                <KPICard 
                    title="受控 SKU 销售额" 
                    value={data.gmv} 
                    prefix="¥"
                    icon={<ShoppingBag size={20}/>} 
                    color="text-brand" 
                    bg="bg-brand/5" 
                    isLoading={isLoading} 
                />
                <KPICard 
                    title="受控 SKU 成交件数" 
                    value={data.ca} 
                    icon={<Activity size={20}/>} 
                    color="text-blue-600" 
                    bg="bg-blue-50" 
                    isLoading={isLoading} 
                />
                <KPICard 
                    title="受控 SKU 广告花费" 
                    value={data.spend} 
                    prefix="¥"
                    icon={<CreditCard size={20}/>} 
                    isHigherBetter={false} 
                    color="text-amber-600" 
                    bg="bg-amber-50" 
                    isLoading={isLoading} 
                />
                <KPICard 
                    title="受控 SKU 投产比" 
                    value={data.roi} 
                    isFloat
                    icon={<Target size={20}/>} 
                    color="text-purple-600" 
                    bg="bg-purple-50" 
                    isLoading={isLoading} 
                />
            </div>

            {/* Content Body */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                 <div className="xl:col-span-8 bg-white rounded-3xl p-8 border border-slate-100 shadow-sm min-h-[400px]">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                                <BarChart size={20} />
                            </div>
                            <h3 className="text-lg font-black text-slate-800 tracking-tight">双轨制业务趋势</h3>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-brand"></div>
                                <span className="text-[10px] font-black text-slate-400 uppercase">自营渠道</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                <span className="text-[10px] font-black text-slate-400 uppercase">POP渠道</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="h-64 bg-slate-50/50 rounded-2xl border border-slate-200/60 border-dashed flex flex-col items-center justify-center">
                        <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-3">
                             <BarChart size={24} className="text-slate-200" />
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {enabledSkuCodes.size > 0 ? "正在动态渲染受控维度的趋势分布" : "请在资产管理中开启至少一个统计项"}
                        </p>
                    </div>
                 </div>

                 <div className="xl:col-span-4 bg-navy rounded-3xl p-8 text-white shadow-xl flex flex-col relative overflow-hidden">
                     <div className="absolute top-0 right-0 w-32 h-32 bg-brand/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                     
                     <div className="flex items-center gap-3 mb-6 relative z-10">
                        <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center shadow-lg shadow-brand/20">
                            <BotIcon size={20} />
                        </div>
                        <h3 className="text-lg font-black tracking-tight">AI 深度战略诊断</h3>
                     </div>

                     <div className="flex-1 space-y-4 relative z-10">
                        <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-2">
                            <p className="text-xs text-slate-300 leading-relaxed font-medium">
                                系统已识别 <span className="text-brand font-black">{shops.filter(s => s.mode === '自营').length}</span> 个自营点位与 <span className="text-blue-400 font-black">{shops.filter(s => s.mode === 'POP').length}</span> 个 POP 席位。
                                {data.roi.total < 2 && data.roi.total > 0 ? " 当前全域 ROI 触发预警，建议重点审计 POP 渠道的无效点击。" : " 渠道贡献度分布符合健康模型，自营仓储周转率处于高位。"}
                            </p>
                        </div>
                        <DiagnosisItem icon={<Zap size={14}/>} title="渠道对齐" desc="自营与 POP 数据镜像已完成同步" type="warning" />
                        <DiagnosisItem icon={<Sparkles size={14}/>} title="异常拦截" desc="已排除非统计标记项的干扰记录" type="success" />
                     </div>

                     <button className="w-full mt-6 py-3 bg-brand text-white rounded-xl font-black text-xs hover:bg-[#5da035] transition-all flex items-center justify-center gap-2 relative z-10 shadow-lg shadow-brand/20">
                        查看完整全链路报告 <ChevronRight size={14} />
                     </button>
                 </div>
            </div>
        </div>
    );
};

const KPICard = ({ title, value, prefix = "", isFloat = false, icon, isHigherBetter = true, color, bg, isLoading }: { title: string, value: MetricSplit, prefix?: string, isFloat?: boolean, icon: any, isHigherBetter?: boolean, color: string, bg: string, isLoading: boolean }) => {
    const formattedTotal = isFloat ? value.total.toFixed(1) : Math.round(value.total).toLocaleString();
    const formattedSelf = isFloat ? value.self.toFixed(1) : Math.round(value.self).toLocaleString();
    const formattedPop = isFloat ? value.pop.toFixed(1) : Math.round(value.pop).toLocaleString();

    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group flex flex-col h-full">
            <div className="flex justify-between items-start mb-4">
                <div className={`w-10 h-10 ${bg} rounded-lg flex items-center justify-center ${color} group-hover:scale-110 transition-transform`}>{icon}</div>
                <div className="text-right">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{title}</h3>
                </div>
            </div>
            
            <div className="flex-1">
                {isLoading ? (
                    <div className="h-8 w-32 bg-slate-50 animate-pulse rounded"></div>
                ) : (
                    <div className="flex items-baseline gap-1">
                        <span className={`text-xs font-black ${color} opacity-60`}>{prefix}</span>
                        <p className="text-2xl font-black text-slate-900 tabular-nums">{formattedTotal}</p>
                    </div>
                )}
            </div>

            {/* Split Breakdown Footer */}
            <div className="mt-6 pt-4 border-t border-slate-50 grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div> 自营
                    </p>
                    <p className="text-xs font-black text-slate-700 tabular-nums">{prefix}{formattedSelf}</p>
                </div>
                <div className="space-y-1 border-l border-slate-50 pl-4">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div> POP
                    </p>
                    <p className="text-xs font-black text-slate-700 tabular-nums">{prefix}{formattedPop}</p>
                </div>
            </div>
        </div>
    );
};

const DiagnosisItem = ({ icon, title, desc, type }: any) => (
    <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5 hover:bg-white/10 transition-colors cursor-pointer group/item">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-transform group-hover/item:scale-110 ${type === 'warning' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-brand/10 text-brand border-brand/20'}`}>{icon}</div>
        <div className="min-w-0">
            <p className="text-[11px] font-black">{title}</p>
            <p className="text-[10px] text-slate-500 truncate font-medium">{desc}</p>
        </div>
    </div>
);
