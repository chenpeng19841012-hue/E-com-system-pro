import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MessageCircle, Bot, ChevronDown, Sparkles, LoaderCircle, AlertCircle, Clipboard, UserCircle, Brain, Search, Plus, Trash2, Edit3, BookOpen, Send, X, CheckCircle2, Zap, RefreshCw, Box, Target, History, Info } from 'lucide-react';
import { ProductSKU, Shop, KnowledgeBaseItem } from '../lib/types';
import { callQwen } from '../lib/ai';
import { DB } from '../lib/db';

export const AIAssistantView = ({ skus, shops, addToast }: { skus: ProductSKU[], shops: Shop[], addToast: any }) => {
    const [activeTab, setActiveTab] = useState<'chat' | 'viki'>('chat');
    
    const [selectedSkuId, setSelectedSkuId] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    const [question, setQuestion] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [history, setHistory] = useState<{role: 'user' | 'ai', content: string}[]>([]);

    const [vikiItems, setVikiItems] = useState<KnowledgeBaseItem[]>([]);
    const [vikiSearch, setVikiSearch] = useState('');
    const [isVikiModalOpen, setIsVikiModalOpen] = useState(false);
    const [editingViki, setEditingViki] = useState<KnowledgeBaseItem | null>(null);

    useEffect(() => {
        const loadViki = async () => {
            const items = await DB.loadConfig('dim_viki_kb', []);
            setVikiItems(items);
        };
        loadViki();
        
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) setIsSearchOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredSkus = useMemo(() => {
        const lower = searchTerm.toLowerCase().trim();
        if (!lower) return skus.slice(0, 8);
        return skus.filter(s => s.code.toLowerCase().includes(lower) || s.name.toLowerCase().includes(lower)).slice(0, 10);
    }, [skus, searchTerm]);

    const selectedSku = useMemo(() => skus.find(s => s.id === selectedSkuId), [skus, selectedSkuId]);

    const filteredViki = useMemo(() => {
        const lower = vikiSearch.toLowerCase().trim();
        if (!lower) return vikiItems;
        return vikiItems.filter(item => item.question.toLowerCase().includes(lower) || item.answer.toLowerCase().includes(lower));
    }, [vikiItems, vikiSearch]);

    const handleAsk = async () => {
        if (!question.trim()) return;
        
        const userMsg = question;
        setQuestion('');
        setHistory(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsLoading(true);
        
        try {
            const matchedViki = vikiItems.find(i => userMsg.includes(i.question) || i.question.includes(userMsg));
            
            const skuContext = selectedSku ? `
                [物理资产详情]
                名称: ${selectedSku.name}
                编码: ${selectedSku.code}
                价格: ¥${selectedSku.sellingPrice || '咨询'}
                配置: ${selectedSku.configuration || '标准配置'}
                配送模式: ${selectedSku.mode || '厂家直发'}
            ` : '通用服务背景';

            const vikiContext = matchedViki ? `[知识库参考应答]: ${matchedViki.answer}` : '';

            const prompt = `
                你是一名金牌电商客服。
                
                ${skuContext}
                ${vikiContext}
                
                提问: "${userMsg}"
                
                要求: 
                1. 语气亲切专业。
                2. 直接输出回复内容。
            `;

            const result = await callQwen(prompt);
            setHistory(prev => [...prev, { role: 'ai', content: result || '由于物理链路波动，无法生成建议回复。' }]);
        } catch (err: any) {
            addToast('error', '服务链路异常', err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveViki = async (data: any) => {
        let newList;
        if (editingViki) {
            newList = vikiItems.map(i => i.id === editingViki.id ? { ...data, id: i.id } : i);
        } else {
            newList = [...vikiItems, { ...data, id: Date.now().toString() }];
        }
        setVikiItems(newList);
        await DB.saveConfig('dim_viki_kb', newList);
        setIsVikiModalOpen(false);
        setEditingViki(null);
        addToast('success', '物理对齐成功', '知识库条目已持久化。');
    };

    const handleDeleteViki = async (id: string) => {
        const newList = vikiItems.filter(i => i.id !== id);
        setVikiItems(newList);
        await DB.saveConfig('dim_viki_kb', newList);
        addToast('success', '已成功移除', '条目已从本地数据库擦除。');
    };

    return (
        <div className="p-8 md:p-12 w-full animate-fadeIn space-y-10 min-h-screen bg-[#F8FAFC]">
            {/* Header - Standardized 3-line format */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 pb-10">
                <div className="space-y-1">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-brand animate-pulse"></div>
                        <span className="text-[10px] font-black text-brand uppercase tracking-[0.3em] leading-none">神经网络服务模型已就绪</span>
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase text-left">智能客服助手</h1>
                    <p className="text-slate-400 font-bold text-sm tracking-wide text-left">Neural Customer Service Engine & Strategy Knowledge Base</p>
                </div>
                <div className="flex bg-slate-200/50 p-1.5 rounded-[22px] shadow-inner border border-slate-200">
                    <button onClick={() => setActiveTab('chat')} className={`px-10 py-3 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${activeTab === 'chat' ? 'bg-white text-slate-900 shadow-xl scale-105' : 'text-slate-500 hover:text-slate-700'}`}><MessageCircle size={14}/> 智能会话工作台</button>
                    <button onClick={() => setActiveTab('viki')} className={`px-10 py-3 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${activeTab === 'viki' ? 'bg-white text-slate-900 shadow-xl scale-105' : 'text-slate-500 hover:text-slate-700'}`}><BookOpen size={14}/> VIKI 物理知识库</button>
                </div>
            </div>

            {activeTab === 'chat' ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-fadeIn">
                    <div className="lg:col-span-4 space-y-8">
                        <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 p-10 space-y-8 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                            
                            <div className="space-y-4 relative z-10" ref={searchRef}>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                    <Target size={14} className="text-brand" /> 1. 挂载物理资产背景
                                </label>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        placeholder="搜索 SKU 或名称..." 
                                        value={selectedSku ? selectedSku.name : searchTerm}
                                        onChange={(e) => {
                                            setSearchTerm(e.target.value);
                                            if (selectedSkuId) setSelectedSkuId('');
                                            setIsSearchOpen(true);
                                        }}
                                        onFocus={() => setIsSearchOpen(true)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-[24px] pl-12 pr-10 py-4 text-sm font-black text-slate-700 outline-none focus:border-brand shadow-inner transition-all" 
                                    />
                                    <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    {selectedSkuId && (
                                        <button onClick={() => { setSelectedSkuId(''); setSearchTerm(''); }} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-rose-500">
                                            <X size={16} />
                                        </button>
                                    )}
                                </div>
                                {isSearchOpen && !selectedSkuId && (
                                    <div className="absolute top-full left-0 w-full mt-2 bg-white border border-slate-200 rounded-[28px] shadow-2xl z-50 p-4 max-h-64 overflow-y-auto no-scrollbar animate-slideIn">
                                        {filteredSkus.length > 0 ? filteredSkus.map(sku => (
                                            <button key={sku.id} onClick={() => { setSelectedSkuId(sku.id); setIsSearchOpen(false); }} className="w-full flex items-center gap-4 p-3 hover:bg-slate-50 rounded-2xl text-left transition-colors group">
                                                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:text-brand transition-all"><Box size={18} /></div>
                                                <div className="min-w-0"><p className="text-xs font-black text-slate-800 truncate">{sku.name}</p><p className="text-[9px] font-mono text-slate-400 mt-0.5">{sku.code}</p></div>
                                            </button>
                                        )) : (
                                            <div className="p-8 text-center text-slate-300 text-[10px] font-black uppercase">未命中物理资产</div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {selectedSku && (
                                <div className="p-8 bg-slate-50 rounded-[32px] border border-slate-100 space-y-5 animate-slideIn">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Info size={14} className="text-brand" /> 资产物理参数看板</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1"><p className="text-[8px] font-black text-slate-400 uppercase">当前标价</p><p className="text-lg font-black text-slate-800 tabular-nums">¥{selectedSku.sellingPrice || '-'}</p></div>
                                        <div className="space-y-1"><p className="text-[8px] font-black text-slate-400 uppercase">配送模式</p><p className="text-[11px] font-black text-brand uppercase">{selectedSku.mode || '未知'}</p></div>
                                    </div>
                                    <div className="space-y-1"><p className="text-[8px] font-black text-slate-400 uppercase">规格摘要</p><p className="text-[10px] font-bold text-slate-600 leading-relaxed italic">{selectedSku.configuration || '暂无记录'}</p></div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="lg:col-span-8 flex flex-col space-y-8">
                        <div className="bg-white rounded-[56px] shadow-sm border border-slate-100 flex-1 flex flex-col min-h-[650px] relative overflow-hidden group/chat">
                            <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(112,173,71,0.02),transparent_70%)] pointer-events-none"></div>
                            
                            <div className="relative z-10 flex items-center justify-between px-12 py-8 border-b border-slate-50 shrink-0">
                                <div className="flex items-center gap-5">
                                    <div className="w-14 h-14 rounded-[24px] bg-slate-50 flex items-center justify-center text-brand shadow-inner">
                                        <Brain size={28} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-800 tracking-tight">神经网络会话区</h3>
                                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">Neural Interaction Stream</p>
                                    </div>
                                </div>
                                <button onClick={() => setHistory([])} className="p-3 rounded-2xl border border-slate-100 text-slate-300 hover:text-slate-600 transition-all"><RefreshCw size={18}/></button>
                            </div>

                            <div className="relative z-10 flex-1 overflow-y-auto px-12 py-10 space-y-8 no-scrollbar scroll-smooth">
                                {history.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-200 gap-6 opacity-30">
                                        <MessageCircle size={64} strokeWidth={1} />
                                        <p className="font-black text-sm uppercase tracking-[0.4em]">Workstation Ready</p>
                                    </div>
                                ) : (
                                    history.map((msg, idx) => (
                                        <div key={idx} className={`flex gap-6 animate-fadeIn ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${msg.role === 'user' ? 'bg-slate-900 text-white' : 'bg-brand text-white'}`}>
                                                {msg.role === 'user' ? <UserCircle size={24} /> : <Bot size={24} />}
                                            </div>
                                            <div className={`max-w-[80%] p-8 rounded-[40px] text-[15px] font-bold leading-relaxed shadow-sm border ${msg.role === 'user' ? 'bg-slate-50 border-slate-100 rounded-tr-none text-slate-600' : 'bg-white border-slate-100 rounded-tl-none text-slate-800'}`}>
                                                {msg.content}
                                                {msg.role === 'ai' && (
                                                    <div className="mt-6 pt-4 border-t border-slate-50 flex justify-end">
                                                        <button onClick={() => { navigator.clipboard.writeText(msg.content); addToast('success', '已复制', '内容已存入剪贴板。'); }} className="text-[10px] font-black text-brand uppercase tracking-widest hover:underline flex items-center gap-2"><Clipboard size={12}/> 复制用于回复</button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                                {isLoading && (
                                    <div className="flex gap-6 animate-pulse">
                                        <div className="w-12 h-12 rounded-2xl bg-brand/20 flex items-center justify-center text-brand shrink-0"><LoaderCircle size={24} className="animate-spin" /></div>
                                        <div className="bg-slate-50 border border-slate-100 px-8 py-6 rounded-[40px] rounded-tl-none"><div className="w-24 h-4 bg-slate-200 rounded-full"></div></div>
                                    </div>
                                )}
                            </div>

                            <div className="p-10 bg-slate-50/50 border-t border-slate-50 relative z-10">
                                <div className="relative group">
                                    <input 
                                        value={question} 
                                        onChange={e => setQuestion(e.target.value)} 
                                        onKeyDown={e => e.key === 'Enter' && handleAsk()} 
                                        placeholder="输入客户反馈或问题..." 
                                        className="w-full bg-white border border-slate-200 rounded-[32px] pl-10 pr-48 py-7 text-sm font-black text-slate-800 outline-none focus:border-brand shadow-xl transition-all" 
                                    />
                                    <button 
                                        onClick={handleAsk} 
                                        disabled={isLoading || !question.trim()} 
                                        className="absolute right-4 top-4 bottom-4 px-12 rounded-[24px] bg-brand text-white font-black text-xs hover:bg-[#5da035] shadow-2xl shadow-brand/20 transition-all active:scale-95 disabled:opacity-30 uppercase tracking-[0.2em] flex items-center justify-center gap-3"
                                    >
                                        {isLoading ? <LoaderCircle size={18} className="animate-spin" /> : <Zap size={18} className="fill-white" />}
                                        获取建议
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-10 animate-fadeIn">
                    <div className="bg-white rounded-[56px] shadow-sm border border-slate-100 p-12 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-brand/5 rounded-full blur-[100px] -translate-y-1/3 translate-x-1/3 pointer-events-none"></div>
                        <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-8 relative z-10">
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 rounded-[24px] bg-slate-900 flex items-center justify-center text-brand shadow-xl">
                                    <BookOpen size={32} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-800 tracking-tight text-left">VIKI 物理知识库管理</h3>
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1 text-left">Grounding Data Architecture</p>
                                </div>
                            </div>
                            <div className="flex gap-4 w-full md:w-auto">
                                <div className="relative flex-1 md:w-80 group">
                                    <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 transition-colors" />
                                    <input placeholder="穿透检索关键词..." value={vikiSearch} onChange={e => setVikiSearch(e.target.value)} className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:border-brand shadow-inner" />
                                </div>
                                <button onClick={() => { setEditingViki(null); setIsVikiModalOpen(true); }} className="px-10 py-4 rounded-2xl bg-brand text-white font-black text-xs hover:bg-[#5da035] shadow-2xl shadow-brand/20 transition-all flex items-center gap-3 uppercase tracking-widest"><Plus size={18}/> 新增物理条目</button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 relative z-10">
                            {filteredViki.length === 0 ? (
                                <div className="col-span-full py-40 text-center opacity-30 italic font-black uppercase tracking-[0.4em] text-slate-300">Awaiting Knowledge Seeds</div>
                            ) : (
                                filteredViki.map(item => (
                                    <div key={item.id} className="bg-white border border-slate-100 rounded-[40px] p-10 shadow-sm hover:shadow-2xl transition-all group flex flex-col justify-between min-h-[320px]">
                                        <div className="space-y-6">
                                            <div className="flex justify-between items-start">
                                                <span className="px-3 py-1 bg-slate-50 text-slate-400 border border-slate-100 rounded-lg text-[9px] font-black uppercase tracking-widest">#{item.category || '通用类'}</span>
                                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => { setEditingViki(item); setIsVikiModalOpen(true); }} className="p-2.5 rounded-xl border border-slate-100 text-slate-400 hover:text-brand transition-all bg-white"><Edit3 size={14}/></button>
                                                    <button onClick={() => handleDeleteViki(item.id)} className="p-2.5 rounded-xl border border-slate-100 text-slate-400 hover:text-rose-500 transition-all bg-white"><Trash2 size={14}/></button>
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <h4 className="text-lg font-black text-slate-900 leading-tight text-left">Q: {item.question}</h4>
                                                <p className="text-xs text-slate-500 font-bold leading-relaxed line-clamp-4 text-left">A: {item.answer}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {isVikiModalOpen && (
                <div className="fixed inset-0 bg-navy/60 backdrop-blur-md z-[110] flex items-center justify-center p-6 animate-fadeIn">
                    <div className="bg-white rounded-[48px] shadow-2xl w-full max-w-2xl p-12 border border-slate-200 relative" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-10 border-b border-slate-50 pb-6 relative z-10">
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase">{editingViki ? '修订知识条目' : '建立物理条目'}</h3>
                            <button onClick={() => setIsVikiModalOpen(false)} className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all"><X size={24} /></button>
                        </div>
                        <div className="space-y-8 relative z-10">
                             <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-left block">业务分类</label>
                                    <input id="viki-cat" defaultValue={editingViki?.category} placeholder="例如：物流政策..." className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black text-slate-800 outline-none focus:border-brand shadow-inner" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-left block">匹配关键词</label>
                                    <input id="viki-q" defaultValue={editingViki?.question} placeholder="匹配逻辑词..." className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black text-slate-800 outline-none focus:border-brand shadow-inner" />
                                </div>
                             </div>
                             <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-left block">标准应答建议</label>
                                <textarea id="viki-a" defaultValue={editingViki?.answer} placeholder="详细回复内容..." className="w-full h-48 bg-slate-50 border border-slate-200 rounded-[32px] px-8 py-6 text-sm font-bold text-slate-700 outline-none focus:border-brand shadow-inner resize-none no-scrollbar" />
                             </div>
                        </div>
                        <div className="flex justify-end gap-4 mt-12 pt-8 border-t border-slate-50 relative z-10">
                            <button onClick={() => setIsVikiModalOpen(false)} className="flex-1 py-5 rounded-[24px] border border-slate-200 text-slate-500 font-black text-xs hover:bg-slate-50 transition-all uppercase">取消</button>
                            <button 
                                onClick={() => handleSaveViki({
                                    category: (document.getElementById('viki-cat') as HTMLInputElement).value,
                                    question: (document.getElementById('viki-q') as HTMLInputElement).value,
                                    answer: (document.getElementById('viki-a') as HTMLTextAreaElement).value
                                })} 
                                className="flex-[2] py-5 rounded-[24px] bg-brand text-white font-black text-xs shadow-2xl shadow-brand/20 transition-all uppercase tracking-widest"
                            >
                                执行物理写入
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};