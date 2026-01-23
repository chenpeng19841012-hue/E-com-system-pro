
import React from 'react';
import { Rocket, Cpu, Sparkles } from 'lucide-react';

export const AIMarketingCopilotView = () => (
  <div className="p-8 max-w-[1600px] mx-auto animate-fadeIn">
    <div className="mb-8">
      <h1 className="text-3xl font-black text-slate-800 tracking-tight">AI 智能营销官</h1>
      <p className="text-slate-500 mt-2 font-bold text-xs tracking-widest uppercase">AUTO-PILOT MARKETING OPERATIONS</p>
    </div>
    <div className="bg-white rounded-[40px] p-20 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
        <div className="w-24 h-24 bg-indigo-50 rounded-[30px] rotate-12 flex items-center justify-center mb-10 shadow-xl shadow-indigo-100">
            <Rocket size={48} className="text-indigo-500 -rotate-12" />
        </div>
        <h3 className="text-3xl font-black text-slate-800 mb-6">自动巡航，精准营销</h3>
        <p className="text-slate-400 text-sm font-bold max-w-lg leading-relaxed">
            该模块属于“实验工场”系列。我们正在训练针对京东、淘宝算法的广告调优模型。
            <br/>启动后，它将像“自动驾驶”一样接管您的广告投放。
        </p>
        <div className="grid grid-cols-2 gap-4 mt-12 w-full max-w-md">
            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col items-center gap-3">
                <Cpu size={24} className="text-slate-300" />
                <span className="text-[10px] font-black text-slate-400 uppercase">Core Neural Engine</span>
            </div>
            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col items-center gap-3">
                <Sparkles size={24} className="text-slate-300" />
                <span className="text-[10px] font-black text-slate-400 uppercase">Strategy Lab</span>
            </div>
        </div>
    </div>
  </div>
);
