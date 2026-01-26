
import React, { useState } from 'react';
import { MessageCircle, Bot, ChevronDown, Sparkles, LoaderCircle, AlertCircle, Clipboard, UserCircle, ShieldCheck } from 'lucide-react';
import { ProductSKU, Shop } from '../lib/types';
import { GoogleGenAI } from "@google/genai";

export const AIAssistantView = ({ skus, shops }: { skus: ProductSKU[], shops: Shop[] }) => {
    const [selectedSkuId, setSelectedSkuId] = useState<string>('');
    const [question, setQuestion] = useState('');
    const [response, setResponse] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleAsk = async () => {
        if (!question) return;
        setIsLoading(true);
        setError('');
        
        try {
            const sku = skus.find(s => s.id === selectedSkuId);
            const shop = shops.find(sh => sh.id === sku?.shopId);
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

            const context = sku ? `
                当前咨询商品: ${sku.name}
                规格配置: ${sku.configuration}
                价格: 前台价¥${sku.sellingPrice}, 促销价¥${sku.promoPrice}
                库存: 入仓${sku.warehouseStock}件, 厂直${sku.factoryStock}件
                所属店铺: ${shop?.name} (${shop?.mode})
            ` : '通用咨询';

            const prompt = `
                你现在是“云舟”系统的首席金牌客服。
                
                业务背景: ${context}
                
                客户问题: "${question}"
                
                指令:
                1. 语气要礼貌、专业、热情。
                2. 必须根据提供的业务背景准确回答，严禁编造库存或价格。
                3. 如果问题涉及价格优惠，要表现出愿意为客户申请的态度。
                4. 回复要简练，多用短句。
                
                直接输出回复话术。
            `;

            const result = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
            });

            setResponse(result.text || '');
        } catch (err: any) {
            setError(`客服大脑暂时掉线: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-[1200px] mx-auto animate-fadeIn">
            <div className="mb-10">
                <h1 className="text-3xl font-black text-slate-800 tracking-tight">智能客服助手</h1>
                <p className="text-slate-500 mt-2 font-bold text-xs tracking-widest uppercase">AI-Powered CS Copilot</p>
            </div>

            <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden flex flex-col h-[700px]">
                {/* Header */}
                <div className="bg-slate-50 px-8 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#70AD47] rounded-full flex items-center justify-center text-white shadow-lg shadow-[#70AD47]/20">
                            <Bot size={20} />
                        </div>
                        <div>
                            <p className="text-sm font-black text-slate-800">云舟金牌客服 AI</p>
                            <p className="text-[10px] text-green-600 font-bold flex items-center gap-1">
                                <ShieldCheck size={10} /> 实时资产同步已开启
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase">当前关联商品:</label>
                        <select 
                            value={selectedSkuId} 
                            onChange={e => setSelectedSkuId(e.target.value)}
                            className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 outline-none focus:border-[#70AD47]"
                        >
                            <option value="">通用模式</option>
                            {skus.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/30">
                    {question && (
                        <div className="flex justify-end gap-3">
                            <div className="bg-slate-800 text-white px-5 py-3 rounded-2xl rounded-tr-none text-sm font-medium shadow-sm max-w-[70%]">
                                {question}
                            </div>
                            <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-400">
                                <UserCircle size={20} />
                            </div>
                        </div>
                    )}
                    
                    {isLoading ? (
                        <div className="flex gap-3 animate-pulse">
                            <div className="w-8 h-8 bg-[#70AD47]/20 rounded-full"></div>
                            <div className="bg-white border border-slate-100 px-5 py-3 rounded-2xl rounded-tl-none w-32 h-10"></div>
                        </div>
                    ) : response ? (
                        <div className="flex gap-3 animate-fadeIn">
                            <div className="w-8 h-8 bg-[#70AD47] rounded-full flex items-center justify-center text-white shrink-0">
                                <Bot size={16} />
                            </div>
                            <div className="bg-white border border-slate-100 px-5 py-3 rounded-2xl rounded-tl-none text-sm font-bold text-slate-700 shadow-sm max-w-[80%] leading-relaxed">
                                {response}
                                <button 
                                    onClick={() => {navigator.clipboard.writeText(response);}}
                                    className="block mt-3 text-[10px] text-[#70AD47] hover:underline"
                                >
                                    点击复制回复话术
                                </button>
                            </div>
                        </div>
                    ) : null}

                    {error && (
                        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-500 text-xs font-bold text-center">
                            {error}
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-6 bg-white border-t border-slate-100">
                    <div className="relative flex items-center">
                        <input 
                            value={question}
                            onChange={e => setQuestion(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAsk()}
                            placeholder="在此输入客户提出的问题，AI 将根据 SKU 资产库生成回复..."
                            className="w-full pl-6 pr-32 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-[#70AD47]"
                        />
                        <button 
                            onClick={handleAsk}
                            disabled={isLoading || !question}
                            className="absolute right-2 bg-[#70AD47] text-white px-6 py-2.5 rounded-xl font-black text-xs hover:bg-[#5da035] transition-all disabled:opacity-50 flex items-center gap-2"
                        >
                            {isLoading ? <LoaderCircle size={14} className="animate-spin" /> : <Sparkles size={14} />}
                            获取建议
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
