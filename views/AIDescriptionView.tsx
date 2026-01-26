
import React, { useState, useEffect } from 'react';
import { Bot, ChevronDown, Sparkles, Clipboard, LoaderCircle, AlertCircle, Send, Layout } from 'lucide-react';
import { ProductSKU } from '../lib/types';
import { GoogleGenAI } from "@google/genai";

interface AIDescriptionViewProps {
    skus: ProductSKU[];
}

export const AIDescriptionView = ({ skus }: AIDescriptionViewProps) => {
    const [selectedSkuId, setSelectedSkuId] = useState<string>('');
    const [sellingPoints, setSellingPoints] = useState('');
    const [platform, setPlatform] = useState('京东/淘宝');
    const [tone, setTone] = useState('专业严谨');
    const [generatedDescription, setGeneratedDescription] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [copyButtonText, setCopyButtonText] = useState('复制文案');

    useEffect(() => {
        if (selectedSkuId) {
            const sku = skus.find(s => s.id === selectedSkuId);
            if (sku) {
                const autoSellingPoints = [
                    sku.name,
                    sku.model,
                    sku.configuration,
                    `${sku.brand}品牌`,
                ].filter(Boolean).join('；');
                setSellingPoints(autoSellingPoints);
            }
        }
    }, [selectedSkuId, skus]);
    
    const handleGenerate = async () => {
        if (!sellingPoints) {
            setError('核心卖点不能为空。');
            return;
        }
        setIsLoading(true);
        setError('');
        
        try {
            const sku = skus.find(s => s.id === selectedSkuId);
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const prompt = `
                作为一名顶尖电商运营专家，请为以下产品创作一份[${platform}]平台的销售文案。
                
                产品基本信息:
                - 名称: ${sku?.name || '未指定'}
                - 品牌: ${sku?.brand || '未指定'}
                - 核心参数: ${sku?.configuration || '未指定'}
                
                核心卖点: ${sellingPoints}
                文案语调: ${tone}
                
                要求:
                1. 如果是小红书风格，请多使用表情符号，分段清晰，带上热门标签。
                2. 如果是京东/淘宝风格，请突出产品规格，采用结构化的参数列表+情感化文案。
                3. 文案要极具感染力，直击用户痛点。
                
                直接输出文案内容，不要有任何开场白。
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
            });

            setGeneratedDescription(response.text || '');
        } catch (err: any) {
            setError(`文案启航失败: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(generatedDescription);
        setCopyButtonText('已存入剪贴板');
        setTimeout(() => setCopyButtonText('复制文案'), 2000);
    };

    return (
        <div className="p-8 max-w-[1400px] mx-auto animate-fadeIn">
            <div className="mb-10">
                <h1 className="text-3xl font-black text-slate-800 tracking-tight">云舟 · AI文案实验室</h1>
                <p className="text-slate-500 mt-2 font-bold text-xs tracking-widest uppercase">Smart Content Generation Engine</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Control Panel */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-6">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">1. 挂载商品资产</label>
                            <div className="relative">
                                <select 
                                    value={selectedSkuId} 
                                    onChange={e => setSelectedSkuId(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 outline-none focus:border-[#70AD47] appearance-none shadow-sm"
                                >
                                    <option value="">-- 选择SKU库中的资产 --</option>
                                    {skus.map(sku => <option key={sku.id} value={sku.id}>{sku.name}</option>)}
                                </select>
                                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">2. 目标平台</label>
                            <div className="grid grid-cols-2 gap-2">
                                {['京东/淘宝', '小红书', '抖音短视频', '详情页长文'].map(p => (
                                    <button 
                                        key={p} 
                                        onClick={() => setPlatform(p)}
                                        className={`py-2 text-[10px] font-black rounded-lg border-2 transition-all ${platform === p ? 'bg-slate-800 border-slate-800 text-white shadow-md' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200 hover:bg-slate-50'}`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">3. 核心卖点 & 钩子</label>
                            <textarea
                                value={sellingPoints}
                                onChange={e => setSellingPoints(e.target.value)}
                                placeholder="输入产品的独特优势..."
                                className="w-full h-32 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-700 outline-none focus:border-[#70AD47] resize-none shadow-inner"
                            />
                        </div>

                        <button 
                            onClick={handleGenerate} 
                            disabled={isLoading}
                            className="w-full py-4 rounded-2xl bg-[#70AD47] text-white font-black text-sm hover:bg-[#5da035] shadow-lg shadow-[#70AD47]/20 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {isLoading ? <LoaderCircle size={18} className="animate-spin" /> : <Sparkles size={18} />}
                            立即启航文案
                        </button>
                    </div>
                </div>

                {/* Output Panel - Background Changed to White */}
                <div className="lg:col-span-8">
                    <div className="bg-white rounded-[40px] p-10 h-full flex flex-col shadow-xl border border-slate-100 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 text-slate-50 opacity-100 pointer-events-none">
                            <Layout size={200} className="text-slate-100 group-hover:text-brand/10 transition-colors duration-700" />
                        </div>
                        
                        <div className="relative z-10 flex justify-between items-center mb-8">
                            <h3 className="text-slate-900 font-black flex items-center gap-2">
                                <div className="p-2 bg-brand/10 rounded-xl">
                                    <Bot size={20} className="text-[#70AD47]" />
                                </div>
                                云舟 AI 创作结果
                            </h3>
                            {generatedDescription && (
                                <button onClick={handleCopy} className="px-6 py-2.5 rounded-xl bg-brand text-white font-black text-xs hover:bg-[#5da035] shadow-lg shadow-brand/20 transition-all active:scale-95">
                                    <Clipboard size={14} className="inline mr-2" />
                                    {copyButtonText}
                                </button>
                            )}
                        </div>

                        <div className="relative z-10 flex-1 bg-slate-50 rounded-[32px] p-8 border border-slate-100 overflow-y-auto no-scrollbar shadow-inner">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                    <div className="w-12 h-1 bg-brand animate-pulse rounded-full mb-4"></div>
                                    <p className="text-xs font-black uppercase tracking-widest text-slate-300">AI Brainstorming...</p>
                                </div>
                            ) : error ? (
                                <div className="flex flex-col items-center justify-center h-full text-rose-400">
                                    <AlertCircle size={32} className="mb-4" />
                                    <p className="text-xs font-bold">{error}</p>
                                </div>
                            ) : generatedDescription ? (
                                <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap font-bold selection:bg-brand/20">
                                    {generatedDescription}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-300">
                                    <div className="w-16 h-16 rounded-3xl bg-white shadow-sm flex items-center justify-center mb-6 text-slate-100">
                                        <Send size={32} />
                                    </div>
                                    <p className="text-xs font-black uppercase tracking-widest">等待创意指令</p>
                                    <p className="text-[10px] mt-2 font-bold opacity-60 italic">填写左侧参数，释放 AI 灵感</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
