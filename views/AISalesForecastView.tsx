import React, { useState } from 'react';
import { TrendingUp, Bot, ChevronDown, Sparkles, LoaderCircle, AlertCircle, CalendarDays, BarChartHorizontalBig } from 'lucide-react';
import { ProductSKU } from '../lib/types';
import { getSkuIdentifier } from '../lib/helpers';

interface AISalesForecastViewProps {
    skus: ProductSKU[];
    shangzhiData: any[];
}

interface Forecast {
    date: string;
    predicted_sales: number;
}

interface ForecastResult {
    summary: string;
    analysis: string;
    forecast: Forecast[];
}

export const AISalesForecastView = ({ skus, shangzhiData }: AISalesForecastViewProps) => {
    const [selectedSkuId, setSelectedSkuId] = useState<string>('');
    const [forecastDays, setForecastDays] = useState<number>(7);
    const [influencingFactors, setInfluencingFactors] = useState('');
    const [forecastResult, setForecastResult] = useState<ForecastResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleGenerate = async () => {
        if (!selectedSkuId) {
            setError('请先选择一个SKU。');
            return;
        }
        setIsLoading(true);
        setError('');
        setForecastResult(null);

        try {
            const sku = skus.find(s => s.id === selectedSkuId);
            if (!sku) {
                throw new Error("未找到指定的SKU信息。");
            }
            
            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
            const startDateStr = ninetyDaysAgo.toISOString().split('T')[0];

            const historicalData = shangzhiData
                .filter(row => getSkuIdentifier(row) === sku.code && row.date >= startDateStr)
                .map(row => ({ date: row.date, sales: Number(row.paid_items) || 0 }))
                .sort((a, b) => a.date.localeCompare(b.date));
            
            if (historicalData.length < 7) {
                 throw new Error("用于预测的历史销售数据不足 (需要至少7天)。");
            }

            const historicalDataCsv = "Date,Sales\n" + historicalData.map(d => `${d.date},${d.sales}`).join('\n');
            const today = new Date().toISOString().split('T')[0];
            
            const prompt = `
                作为一名顶尖的电商数据科学家，请根据以下信息，预测一个SKU未来的销量。

                **任务:**
                1. 分析提供的历史销售数据，识别趋势、周期性和异常值。
                2. 结合“营销变量”中提到的未来事件，对销量进行调整。
                3. 生成未来 ${forecastDays} 天的每日销量预测。
                4. 提供一个简短的预测总结和一段专业的洞察分析。
                5. 必须以指定的JSON格式返回结果，不包含任何多余的解释性文本或Markdown标记。

                **JSON返回格式:**
                {
                  "summary": "一句话总结周期内的总预测销量。",
                  "analysis": "一段专业的洞察分析，解释你的预测逻辑，例如历史趋势如何延续，营销变量如何影响预测结果等。",
                  "forecast": [
                    { "date": "YYYY-MM-DD", "predicted_sales": <整数> }
                  ]
                }

                **输入信息:**

                **1. 历史销售数据 (过去90天，格式: CSV):**
                \`\`\`csv
                ${historicalDataCsv}
                \`\`\`

                **2. 预测周期:**
                - 开始日期: ${today}
                - 预测天数: ${forecastDays}

                **3. 营销变量 (可能影响销量的未来事件):**
                ${influencingFactors || '无特殊事件'}

                请开始预测。
            `;
            
            const requestBody = {
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                }
            };

            const apiResponse = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });

            if (!apiResponse.ok) {
                const errorData = await apiResponse.json();
                throw new Error(errorData.error || 'API request failed');
            }
            
            const responseData = await apiResponse.json();
            const resultText = responseData.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') ?? '';
            const resultJson = JSON.parse(resultText.trim()) as ForecastResult;
            setForecastResult(resultJson);

        } catch (err: any) {
            console.error(err);
             let errorMessage = `预测失败: ${err.message || '未知错误'}`;
            if (err.message.includes('JSON')) {
                errorMessage = "AI返回的格式不正确，请稍后重试。";
            }
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };
    
    const totalPredictedSales = forecastResult?.forecast.reduce((sum, item) => sum + item.predicted_sales, 0) || 0;
    const averageDailySales = totalPredictedSales / (forecastResult?.forecast.length || 1);

    return (
        <div className="p-8 max-w-[1600px] mx-auto animate-fadeIn">
            <div className="mb-8">
                <h1 className="text-3xl font-black text-slate-800 tracking-tight">AI 销售预测</h1>
                <p className="text-slate-500 mt-2 font-bold text-xs tracking-widest uppercase">GEMINI-POWERED SALES FORECASTING</p>
            </div>

             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Input Panel */}
                <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-6 self-start">
                    <div>
                        <label className="block text-sm font-bold text-slate-600 mb-2">1. 选择要预测的SKU *</label>
                        <div className="relative">
                           <select 
                                value={selectedSkuId} 
                                onChange={e => setSelectedSkuId(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-3 text-sm font-medium text-slate-700 outline-none focus:border-[#70AD47] appearance-none"
                            >
                                <option value="">选择一个SKU...</option>
                                {skus.map(sku => <option key={sku.id} value={sku.id}>{sku.name} ({sku.code})</option>)}
                            </select>
                            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-600 mb-2">2. 选择预测周期</label>
                        <div className="grid grid-cols-3 gap-2">
                            {[7, 14, 30].map(days => (
                                <button key={days} onClick={() => setForecastDays(days)} className={`px-4 py-2 text-xs font-bold rounded-lg border-2 transition-all ${forecastDays === days ? 'bg-[#70AD47] border-[#70AD47] text-white' : 'bg-slate-50 border-slate-100 text-slate-500 hover:border-[#70AD47]'}`}>{`未来${days}天`}</button>
                            ))}
                        </div>
                    </div>

                     <div>
                        <label className="block text-sm font-bold text-slate-600 mb-2">3. 输入营销变量 (可选)</label>
                        <textarea
                            value={influencingFactors}
                            onChange={e => setInfluencingFactors(e.target.value)}
                            placeholder="例如：618大促从6月1日开始；产品将在6月5日进行站内推广。"
                            className="w-full h-24 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-700 outline-none focus:border-[#70AD47] resize-y"
                        ></textarea>
                    </div>

                    <div className="pt-6 border-t border-slate-100">
                         <button 
                            onClick={handleGenerate} 
                            disabled={isLoading}
                            className="w-full py-4 rounded-lg bg-[#70AD47] text-white font-bold text-sm hover:bg-[#5da035] shadow-lg shadow-[#70AD47]/20 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:bg-slate-300 disabled:shadow-none disabled:cursor-not-allowed">
                            {isLoading ? <><LoaderCircle size={16} className="animate-spin" /> 正在预测...</> : <><TrendingUp size={16} /> 生成预测报告</>}
                        </button>
                    </div>
                </div>

                {/* Output Panel */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-8 flex flex-col min-h-[500px]">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-6">
                        <Bot size={18} className="text-[#70AD47]" />
                        AI 预测报告
                    </h3>
                    
                    <div className="flex-1">
                        {isLoading ? (
                             <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                <LoaderCircle size={32} className="animate-spin mb-4" />
                                <p className="font-bold">AI正在分析历史数据并生成预测...</p>
                            </div>
                        ) : error ? (
                            <div className="flex flex-col items-center justify-center h-full text-rose-500 bg-rose-50 rounded-lg p-4">
                                <AlertCircle size={32} className="mb-4" />
                                <p className="font-bold text-sm text-center">{error}</p>
                            </div>
                        ) : forecastResult ? (
                            <div className="space-y-8">
                                <div>
                                    <h4 className="font-bold text-sm text-slate-500 mb-3 uppercase tracking-wider">AI 洞察分析</h4>
                                    <div className="bg-slate-50/70 rounded-lg p-4 text-slate-600 text-sm leading-relaxed border border-slate-200/50">
                                        <p className="font-bold text-slate-700 mb-2">“{forecastResult.summary}”</p>
                                        <p>{forecastResult.analysis}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-50/70 rounded-lg p-4 border border-slate-200/50">
                                        <h4 className="text-xs font-bold text-slate-400">总预测销量</h4>
                                        <p className="text-2xl font-black text-slate-800 mt-1">{totalPredictedSales.toLocaleString()} <span className="text-sm font-bold text-slate-400">件</span></p>
                                    </div>
                                     <div className="bg-slate-50/70 rounded-lg p-4 border border-slate-200/50">
                                        <h4 className="text-xs font-bold text-slate-400">日均销量</h4>
                                        <p className="text-2xl font-black text-slate-800 mt-1">{averageDailySales.toFixed(1)} <span className="text-sm font-bold text-slate-400">件/天</span></p>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm text-slate-500 mb-3 uppercase tracking-wider">每日销量明细</h4>
                                    <div className="max-h-64 overflow-y-auto pr-2">
                                        <ul className="space-y-2">
                                            {forecastResult.forecast.map(item => (
                                                <li key={item.date} className="flex justify-between items-center bg-slate-50/70 p-3 rounded-lg border border-slate-200/50 text-sm">
                                                    <span className="font-bold text-slate-700 flex items-center gap-2"><CalendarDays size={14} className="text-slate-400" /> {item.date}</span>
                                                    <span className="font-black text-[#70AD47]">{item.predicted_sales.toLocaleString()} 件</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-300">
                                <BarChartHorizontalBig size={48} className="mb-4 opacity-50" />
                                <p className="font-bold text-center">请在左侧配置参数，<br/>生成您的专属销售预测报告</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};