
import React from 'react';
import { Binoculars, ShieldAlert, Zap, Bot, Target, Search, BarChart3, Globe } from 'lucide-react';

export const AICompetitorMonitoringView = () => (
  <div className="p-8 max-w-[1600px] mx-auto animate-fadeIn space-y-10">
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">AI 竞品监控中心</h1>
            <p className="text-slate-500 mt-2 font-bold text-xs tracking-widest uppercase">Competitive Intelligence System</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 border border-amber-100">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">神经模型训练中</span>
        </div>
    </div>
    
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 bg-white rounded-[40px] p-12 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#70AD47]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            
            <div className="w-24 h-24 bg-slate-50 rounded-3xl flex items-center justify-center mb-8 shadow-inner group-hover:rotate-6 transition-transform duration-500">
                <Binoculars size={48} className="text-brand" />
            </div>
            <h3 className="text-3xl font-black text-slate-900 mb-4">知己知彼，百战不殆</h3>
            <p className="text-slate-400 text-sm font-bold max-w-lg leading-relaxed mb-12">
                本模块正在集成多路分布式爬虫与 Gemini 3.0 视觉识别引擎。
                未来将为您实时锁定竞对 SKU 价格异动、促销力度以及流量去向。
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
                <FeatureCard icon={<Target size={20} />} title="价格雷达" desc="7×24h 监控全网同款 SKU 标价与到手价变化。" />
                <FeatureCard icon={<Globe size={20} />} title="流量穿透" desc="利用大模型分析竞品主要流量来源（搜索/推荐/站外）。" />
                <FeatureCard icon={<Bot size={20} />} title="AI 策应" desc="识别竞品营销动作后，自动生成防守或反击建议。" />
            </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
            <div className="bg-navy rounded-[40px] p-8 shadow-2xl flex flex-col justify-between overflow-hidden relative group h-full">
                <div className="absolute top-0 right-0 p-4 opacity-5 scale-150 rotate-12 group-hover:rotate-45 transition-transform duration-700">
                    <Target size={200} className="text-white" />
                </div>
                
                <div className="relative z-10">
                    <div className="bg-brand/20 text-brand px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] mb-6 w-fit">Release Q1 2026</div>
                    <h2 className="text-white text-4xl font-black leading-[1.1] tracking-tight">
                        定义下一代<br/>
                        <span className="text-brand">对手透视</span>系统
                    </h2>
                    <p className="text-slate-400 text-xs mt-6 font-bold leading-relaxed">
                        我们将打破电商平台间的数据壁垒，将竞争对手的每一个运营细节数字化。让您的运营决策不再盲人摸象。
                    </p>
                </div>

                <div className="relative z-10 mt-12 pt-8 border-t border-white/5">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex -space-x-2">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="w-8 h-8 rounded-full border-2 border-navy bg-slate-700 flex items-center justify-center overflow-hidden">
                                     <div className="w-full h-full bg-brand/10 text-brand flex items-center justify-center text-[10px] font-black italic">User</div>
                                </div>
                            ))}
                        </div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">+128 种子用户测试中</span>
                    </div>
                    <button className="w-full py-4 bg-brand text-white rounded-2xl font-black text-xs hover:bg-[#5da035] transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand/20">
                        立即申请 Beta 测试资格
                    </button>
                </div>
            </div>
        </div>
    </div>
  </div>
);

const FeatureCard = ({ icon, title, desc }: { icon: any, title: string, desc: string }) => (
    <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100 text-left hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all cursor-default group/card">
        <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center text-brand mb-4 group-hover/card:scale-110 transition-transform">
            {icon}
        </div>
        <h4 className="text-sm font-black text-slate-800 mb-2">{title}</h4>
        <p className="text-[10px] text-slate-500 font-bold leading-relaxed">{desc}</p>
    </div>
);
