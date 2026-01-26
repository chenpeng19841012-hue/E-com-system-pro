
import React from 'react';
import { 
    LayoutGrid, 
    Search, 
    Package, 
    Database, 
    PanelLeftClose, 
    PanelLeftOpen,
    TrendingUp,
    Calculator,
    DollarSign,
    PackagePlus,
    FileText,
    Sparkles,
    CloudSync,
    ChevronRight,
    Compass,
    Binoculars,
    MessageSquare,
    Image as ImageIcon,
    Layers,
    Cpu
} from 'lucide-react';
import { View } from '../lib/types';

const SidebarItem = ({ icon, label, active, onClick, collapsed }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void, collapsed: boolean }) => (
    <button 
        onClick={onClick}
        className={`w-full flex items-center transition-all duration-200 rounded-xl mb-1 ${collapsed ? 'justify-center px-0 py-3' : 'gap-3 px-4 py-3'} ${
            active 
            ? 'bg-brand text-white shadow-lg shadow-brand/20' 
            : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
        }`}
    >
        <div className={`shrink-0 ${active ? 'scale-110' : ''}`}>
            {icon}
        </div>
        {!collapsed && <span className="text-sm font-semibold tracking-tight truncate flex-1 text-left">{label}</span>}
        {!collapsed && active && <ChevronRight size={14} className="opacity-50" />}
    </button>
);

const SectionLabel = ({ label, collapsed }: { label: string, collapsed: boolean }) => (
    !collapsed ? (
        <div className="px-4 pt-6 pb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 flex items-center gap-2">
            <div className="w-1 h-1 bg-slate-700 rounded-full"></div>
            {label}
        </div>
    ) : <div className="h-4"></div>
);

export const Sidebar = ({ currentView, setCurrentView, isSidebarCollapsed, setIsSidebarCollapsed }: {
    currentView: View;
    setCurrentView: (view: View) => void;
    isSidebarCollapsed: boolean;
    setIsSidebarCollapsed: (collapsed: boolean) => void;
}) => {
    return (
        <div className={`${isSidebarCollapsed ? 'w-20' : 'w-64'} bg-[#020617] text-slate-400 flex flex-col shrink-0 transition-all duration-500 ease-in-out border-r border-white/5`}>
            {/* Logo Area */}
            <div className={`h-24 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'px-6'}`}>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-brand/20 group">
                        <Compass className="text-white group-hover:rotate-45 transition-transform duration-500" size={24} />
                    </div>
                    {!isSidebarCollapsed && (
                        <div className="flex flex-col">
                            <span className="font-black text-xl text-slate-50 tracking-tighter">云<span className="text-brand">舟</span></span>
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">Intelligence Hub</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Menu Sections */}
            <div className="px-4 py-2 flex-1 overflow-y-auto no-scrollbar">
                <SectionLabel label="战略指挥" collapsed={isSidebarCollapsed} />
                <SidebarItem collapsed={isSidebarCollapsed} icon={<LayoutGrid size={18} />} label="AI 仪表盘" active={currentView === 'dashboard'} onClick={() => setCurrentView('dashboard')} />
                <SidebarItem collapsed={isSidebarCollapsed} icon={<Search size={18} />} label="多维透视" active={currentView === 'multiquery'} onClick={() => setCurrentView('multiquery')} />
                <SidebarItem collapsed={isSidebarCollapsed} icon={<FileText size={18} />} label="运营报表" active={currentView === 'reports'} onClick={() => setCurrentView('reports')} />

                <SectionLabel label="智慧运营" collapsed={isSidebarCollapsed} />
                <SidebarItem collapsed={isSidebarCollapsed} icon={<DollarSign size={18} />} label="盈利分析" active={currentView === 'ai-profit-analytics'} onClick={() => setCurrentView('ai-profit-analytics')} />
                <SidebarItem collapsed={isSidebarCollapsed} icon={<PackagePlus size={18} />} label="补货策略" active={currentView === 'ai-smart-replenishment'} onClick={() => setCurrentView('ai-smart-replenishment')} />
                <SidebarItem collapsed={isSidebarCollapsed} icon={<Binoculars size={18} />} label="竞品监控" active={currentView === 'ai-competitor-monitoring'} onClick={() => setCurrentView('ai-competitor-monitoring')} />
                <SidebarItem collapsed={isSidebarCollapsed} icon={<TrendingUp size={18} />} label="销售预测" active={currentView === 'ai-sales-forecast'} onClick={() => setCurrentView('ai-sales-forecast')} />

                <SectionLabel label="创作工场" collapsed={isSidebarCollapsed} />
                <SidebarItem collapsed={isSidebarCollapsed} icon={<Sparkles size={18} />} label="文案实验" active={currentView === 'ai-description'} onClick={() => setCurrentView('ai-description')} />
                <SidebarItem collapsed={isSidebarCollapsed} icon={<ImageIcon size={18} />} label="视觉创意" active={currentView === 'ai-ad-image'} onClick={() => setCurrentView('ai-ad-image')} />
                <SidebarItem collapsed={isSidebarCollapsed} icon={<MessageSquare size={18} />} label="智能客服" active={currentView === 'ai-cs-assistant'} onClick={() => setCurrentView('ai-cs-assistant')} />
                <SidebarItem collapsed={isSidebarCollapsed} icon={<Calculator size={18} />} label="智能报价" active={currentView === 'ai-quoting'} onClick={() => setCurrentView('ai-quoting')} />

                <SectionLabel label="数字底座" collapsed={isSidebarCollapsed} />
                <SidebarItem collapsed={isSidebarCollapsed} icon={<Package size={18} />} label="资产名录" active={currentView === 'products'} onClick={() => setCurrentView('products')} />
                <SidebarItem collapsed={isSidebarCollapsed} icon={<Layers size={18} />} label="底层治理" active={currentView === 'data-experience'} onClick={() => setCurrentView('data-experience')} />
                <SidebarItem collapsed={isSidebarCollapsed} icon={<CloudSync size={18} />} label="云端同步" active={currentView === 'cloud-sync'} onClick={() => setCurrentView('cloud-sync')} />
                <SidebarItem collapsed={isSidebarCollapsed} icon={<Database size={18} />} label="数据中心" active={currentView === 'data-center'} onClick={() => setCurrentView('data-center')} />
            </div>

            {/* User Profile */}
            <div className="p-4 border-t border-slate-900 bg-slate-950/50">
                <button 
                  onClick={() => setCurrentView('system-snapshot')}
                  className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3 px-3'} py-3 rounded-2xl transition-all hover:bg-white/5`}
                >
                    <div className="w-9 h-9 rounded-full bg-brand/20 flex items-center justify-center font-black text-brand text-[10px] shrink-0 border border-brand/30">M1</div>
                    {!isSidebarCollapsed && (
                      <div className="flex-1 min-w-0 text-left">
                          <div className="text-xs font-bold text-slate-200 truncate">梧桐翁 (Admin)</div>
                           <div className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">System Master</div>
                      </div>
                    )}
                </button>
            </div>
        </div>
    );
};
