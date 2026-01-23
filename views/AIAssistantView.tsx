import React, { useState } from 'react';
import { MessageCircle, Bot, ChevronDown, Sparkles, LoaderCircle, AlertCircle, Clipboard } from 'lucide-react';
import { ProductSKU, Shop } from '../lib/types';

interface AIAssistantViewProps {
    skus: ProductSKU[];
    shops: Shop[];
}

export const AIAssistantView = ({ skus, shops }: AIAssistantViewProps) => {
    const [selectedSkuId, setSelectedSkuId] = useState<string>('');
    const [customerQuestion, setCustomerQuestion] = useState('');
    const [responseTone, setResponseTone] = useState('友好&有帮助');
    const [generatedResponse, setGeneratedResponse] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [copyButtonText, setCopyButtonText] = useState('复制回复');

    const handleGenerate = async () => {
        if (!customerQuestion) {
            setError('客户问题不能为空。');
            return;
        }
        setIsLoading(true);
        setError('');
        setGeneratedResponse('');

        try {
            const sku = skus.find(s => s.id === selectedSkuId);
            const shop = sku ? shops.find(sh => sh.id === sku.shopId) : null;

            const prompt = `
                作为一名资深、耐心且专业的电商客服代表，你的任务是根据提供的商品信息，准确、清晰地回答客户的问题。

                **客服准则:**
                1.  **信息准确性:** 只能使用“商品信息”中提供的数据进行回答。如果信息不存在，必须明确告知客户“关于您咨询的[具体问题点]，我需要进一步查询确认”，然后引导客户等待或联系更高级别的支持。绝不允许猜测或编造信息。
                2.  **语气风格:** 严格按照指定的“回复语调”进行沟通。
                3.  **简洁清晰:** 回答应直截了当，易于理解。

                ---

                **商品信息:**
                -   **商品名称:** ${sku?.name || '未选定商品'}
                -   **SKU编码:** ${sku?.code || 'N/A'}
                -   **品牌:** ${sku?.brand || 'N/A'}
                -   **型号:** ${sku?.model || 'N/A'}
                -   **核心配置:** ${sku?.configuration || 'N/A'}
                -   **品类:** ${sku?.category || 'N/A'}
                -   **所属店铺:** ${shop?.name || 'N/A'}
                -   **销售状态:** ${sku?.status || 'N/A'}
                -   **销售模式:** ${sku?.mode || 'N/A'}
                -   **前台售价:** ${sku?.sellingPrice ? `¥${sku.sellingPrice.toFixed(2)}` : '请以页面价格为准'}
                -   **促销价:** ${sku?.promoPrice ? `¥${sku.promoPrice.toFixed(2)}` : '暂无特别促销价'}
                -   **入仓库存:** ${sku?.warehouseStock !== undefined ? `${sku.warehouseStock} 件` : '需要查询'}
                -   **厂直库存:** ${sku?.factoryStock !== undefined ? `${sku.factoryStock} 件` : '需要查询'}
                -   **总库存:** ${sku ? `${(sku.warehouseStock || 0) + (sku.factoryStock || 0)} 件` : '需要查询'}
                -   **广告状态:** ${sku?.advertisingStatus || 'N/A'}

                ---

                **客户问题:**
                "${customerQuestion}"

                **回复语调:**
                ${responseTone}

                ---

                请直接生成你作为客服的回复内容。
            `;
            
            const requestBody = {
                model: 'gemini-3-flash-preview',
                contents: prompt,
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
            const text = responseData.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') ?? '';
            setGeneratedResponse(text.trim());

        } catch (err: any) {
            console.error(err);
            setError(`回复生成失败: ${err.message || '请检查API Key或网络连接'}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(generatedResponse);
        setCopyButtonText('复制成功!');
        setTimeout(() => setCopyButtonText('复制回复'), 2000);
    };

    return (
        <div className="p-8 max-w-[1600px] mx-auto animate-fadeIn">
            <div className="mb-8">
                <h1 className="text-3xl font-black text-slate-800 tracking-tight">AI智能客服助手</h1>
                <p className="text-slate-500 mt-2 font-bold text-xs tracking-widest uppercase">AI-POWERED CUSTOMER SERVICE ASSISTANT</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Input Panel */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-600 mb-2">1. 关联商品 (可选)</label>
                         <div className="relative">
                           <select 
                                value={selectedSkuId} 
                                onChange={e => setSelectedSkuId(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-3 text-sm font-medium text-slate-700 outline-none focus:border-[#70AD47] appearance-none"
                            >
                                <option value="">通用问题 (不关联特定商品)</option>
                                {skus.map(sku => <option key={sku.id} value={sku.id}>{sku.name} ({sku.code})</option>)}
                            </select>
                            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-600 mb-2">2. 输入客户问题 *</label>
                        <textarea
                            value={customerQuestion}
                            onChange={e => setCustomerQuestion(e.target.value)}
                            placeholder="例如：这款电脑有现货吗？什么时候能发货？"
                            className="w-full h-32 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-700 outline-none focus:border-[#70AD47] resize-y"
                        ></textarea>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-600 mb-2">3. 选择回复语调</label>
                        <div className="grid grid-cols-3 gap-2">
                            {['友好&有帮助', '专业&简洁', '共情&关怀'].map(item => (
                                <button key={item} onClick={() => setResponseTone(item)} className={`px-4 py-2 text-xs font-bold rounded-lg border-2 transition-all ${responseTone === item ? 'bg-[#70AD47] border-[#70AD47] text-white' : 'bg-slate-50 border-slate-100 text-slate-500 hover:border-[#70AD47]'}`}>{item}</button>
                            ))}
                        </div>
                    </div>
                    
                    <div className="pt-6 border-t border-slate-100">
                         <button 
                            onClick={handleGenerate} 
                            disabled={isLoading}
                            className="w-full py-4 rounded-lg bg-[#70AD47] text-white font-bold text-sm hover:bg-[#5da035] shadow-lg shadow-[#70AD47]/20 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:bg-slate-300 disabled:shadow-none disabled:cursor-not-allowed">
                            {isLoading ? <><LoaderCircle size={16} className="animate-spin" /> 正在生成...</> : <><Sparkles size={16} className="fill-white"/> 生成回复建议</>}
                        </button>
                    </div>
                </div>

                {/* Output Panel */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <Bot size={18} className="text-[#70AD47]" />
                            AI 回复建议
                        </h3>
                         {generatedResponse && (
                            <button onClick={handleCopy} className="flex items-center gap-2 px-4 py-1.5 rounded-lg border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-colors">
                                <Clipboard size={14} /> {copyButtonText}
                            </button>
                         )}
                    </div>
                    
                    <div className="flex-1 bg-slate-50/70 rounded-lg p-6 overflow-y-auto">
                        {isLoading ? (
                             <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                <LoaderCircle size={32} className="animate-spin mb-4" />
                                <p className="font-bold">AI客服正在思考中...</p>
                            </div>
                        ) : error ? (
                            <div className="flex flex-col items-center justify-center h-full text-rose-500 bg-rose-50 rounded-lg p-4">
                                <AlertCircle size={32} className="mb-4" />
                                <p className="font-bold text-sm text-center">{error}</p>
                            </div>
                        ) : generatedResponse ? (
                            <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                                {generatedResponse}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-300">
                                <MessageCircle size={48} className="mb-4 opacity-50" />
                                <p className="font-bold text-center">输入客户问题，<br/>让AI助您一臂之力</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};