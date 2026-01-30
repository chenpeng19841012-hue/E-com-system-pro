
import React, { useEffect, useState } from 'react';
import { 
    LayoutGrid, 
    Search, 
    Package, 
    Database, 
    TrendingUp,
    Calculator,
    DollarSign,
    PackagePlus,
    FileText,
    Sparkles,
    CloudSync,
    ChevronRight,
    ChevronLeft,
    Compass,
    Binoculars,
    MessageSquare,
    Image as ImageIcon,
    Layers,
    Wifi,
    WifiOff
} from 'lucide-react';
import { View } from '../lib/types';
import { DB } from '../lib/db';

const SidebarItem = ({ icon, label, active, onClick, collapsed }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void, collapsed: boolean }) => (
    <button 
        onClick={onClick}
        className={`w-full flex items-center transition-all duration-200 rounded-xl mb-1 group border-none outline-none ${collapsed ? 'justify-center p-3' : 'gap-3 px-4 py-2.5'} ${
            active 
            ? 'bg-brand text-white shadow-md' 
            : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
        }`}
    >
        <div className={`shrink-0 ${active ? 'scale-110' : 'group-hover:scale-110'} transition-transform`}>
            {icon}
        </div>
        {!collapsed && (
            <span className="text-[13px] font-bold tracking-tight truncate flex-1 text-left">
                {label}
            </span>
        )}
    </button>
);

const SectionLabel = ({ label, collapsed }: { label: string, collapsed: boolean }) => (
    !collapsed ? (
        <div className="px-4 pt-6 pb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
            <div className="w-1 h-1 bg-slate-600 rounded-full"></div>
            {label}
        </div>
    ) : (
        <div className="h-6 flex items-center justify-center opacity-20 py-4">
             <div className="w-6 h-[1px] bg-slate-500"></div>
        </div>
    )
);

export const Sidebar = ({ currentView, setCurrentView, isSidebarCollapsed, setIsSidebarCollapsed }: {
    currentView: View;
    setCurrentView: (view: View) => void;
    isSidebarCollapsed: boolean;
    setIsSidebarCollapsed: (collapsed: boolean) => void;
}) => {
    const [cloudStatus, setCloudStatus] = useState<'connected' | 'offline'>('offline');

    useEffect(() => {
        const checkCloud = async () => {
            const config = await DB.loadConfig('cloud_sync_config', null);
            if (config && config.url && config.key) {
                setCloudStatus('connected');
            } else {
                setCloudStatus('offline');
            }
        };
        checkCloud();
        // Simple polling to check status periodically
        const interval = setInterval(checkCloud, 10000);
        return () => clearInterval(interval);
    }, []);

    return (
        <aside className={`${isSidebarCollapsed ? 'w-20' : 'w-64'} bg-navy h-full flex flex-col shrink-0 transition-all duration-300 ease-in-out z-50 relative`}>
            
            {/* Logo Area */}
            <div className={`h-24 flex items-center transition-all duration-300 ${isSidebarCollapsed ? 'justify-center' : 'px-6'}`}>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-brand/30">
                        <Compass className="text-white" size={22} />
                    </div>
                    {!isSidebarCollapsed && (
                        <div className="flex flex-col">
                            <span className="font-black text-xl text-slate-50 tracking-tighter leading-none">云舟</span>
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Intelligence Hub</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Menu Items Container */}
            <div className="flex-1 px-4 py-2 overflow-y-auto no-scrollbar">
                <SectionLabel label="战略指挥" collapsed={isSidebarCollapsed} />
                <SidebarItem collapsed={isSidebarCollapsed} icon={<LayoutGrid size={18} />} label="AI 仪表盘" active={currentView === 'dashboard'} onClick={() => setCurrentView('dashboard')} />
                <SidebarItem collapsed={isSidebarCollapsed} icon={<Search size={18} />} label="战略沙盘" active={currentView === 'multiquery'} onClick={() => setCurrentView('multiquery')} />
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
                <SidebarItem collapsed={isSidebarCollapsed} icon={<Package size={18} />} label="SKU资产" active={currentView === 'products'} onClick={() => setCurrentView('products')} />
                <SidebarItem collapsed={isSidebarCollapsed} icon={<Layers size={18} />} label="底层治理" active={currentView === 'data-experience'} onClick={() => setCurrentView('data-experience')} />
                <SidebarItem collapsed={isSidebarCollapsed} icon={<CloudSync size={18} />} label="云端同步" active={currentView === 'cloud-sync'} onClick={() => setCurrentView('cloud-sync')} />
                <SidebarItem collapsed={isSidebarCollapsed} icon={<Database size={18} />} label="数据中心" active={currentView === 'data-center'} onClick={() => setCurrentView('data-center')} />
            </div>

            {/* Profile Footer with Cloud Status */}
            <div className="p-4 border-t border-white/5">
                <div className={`flex items-center transition-all ${isSidebarCollapsed ? 'justify-center' : 'gap-3 px-2'} py-3 rounded-xl hover:bg-white/5 cursor-pointer group`}>
                    <div className="relative">
                        <div className="w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center font-black text-brand text-[10px] shrink-0 border border-brand/20">M1</div>
                        {/* Cloud Status Dot */}
                        <div className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-navy flex items-center justify-center ${cloudStatus === 'connected' ? 'bg-green-500' : 'bg-slate-500'}`} title={cloudStatus === 'connected' ? "云端已连接" : "离线模式"}>
                            {cloudStatus === 'connected' ? <Wifi size={8} className="text-white" /> : <WifiOff size={8} className="text-white" />}
                        </div>
                    </div>
                    {!isSidebarCollapsed && (
                      <div className="flex-1 min-w-0">
                          <div className="text-xs font-black text-slate-200 truncate">梧桐翁</div>
                           <div className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter flex items-center gap-1">
                               System Master
                           </div>
                      </div>
                    )}
                </div>
            </div>
        </aside>
    );
};
