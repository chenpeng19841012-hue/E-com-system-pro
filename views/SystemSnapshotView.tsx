import React, { useState } from 'react';
import { Camera, Settings, History, Trash2, ShieldCheck, AlertCircle, FileText } from 'lucide-react';
import { Snapshot, SnapshotSettings } from '../lib/types';
import { ConfirmModal } from '../components/ConfirmModal';

interface SystemSnapshotViewProps {
    snapshots: Snapshot[];
    settings: SnapshotSettings;
    onCreate: () => void;
    onRestore: (id: string) => void;
    onDelete: (id: string) => void;
    onUpdateSettings: (settings: SnapshotSettings) => void;
}

const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export const SystemSnapshotView = ({ snapshots, settings, onCreate, onRestore, onDelete, onUpdateSettings }: SystemSnapshotViewProps) => {
    const [localSettings, setLocalSettings] = useState(settings);
    const [restoreTarget, setRestoreTarget] = useState<Snapshot | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Snapshot | null>(null);

    const handleSettingsChange = <K extends keyof SnapshotSettings>(key: K, value: SnapshotSettings[K]) => {
        setLocalSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleSaveSettings = () => {
        onUpdateSettings(localSettings);
    };

    return (
        <>
            <ConfirmModal
                isOpen={!!restoreTarget}
                title="确认恢复系统快照"
                onConfirm={() => {
                    if (restoreTarget) onRestore(restoreTarget.id);
                    setRestoreTarget(null);
                }}
                onCancel={() => setRestoreTarget(null)}
                confirmText="确认恢复"
                confirmButtonClass="bg-amber-500 hover:bg-amber-600 shadow-amber-500/20"
            >
                <p>您确定要将系统恢复到 <strong className="font-black text-slate-800">{restoreTarget && new Date(restoreTarget.id).toLocaleString()}</strong> 的状态吗?</p>
                <p className="mt-2 text-amber-600 font-bold">此操作将覆盖当前所有数据（事实表、维度表、配置等），且不可撤销。</p>
            </ConfirmModal>

            <ConfirmModal
                isOpen={!!deleteTarget}
                title="确认删除快照"
                onConfirm={() => {
                    if (deleteTarget) onDelete(deleteTarget.id);
                    setDeleteTarget(null);
                }}
                onCancel={() => setDeleteTarget(null)}
                confirmText="确认删除"
                confirmButtonClass="bg-rose-500 hover:bg-rose-600 shadow-rose-500/20"
            >
                <p>您确定要永久删除 <strong className="font-black text-slate-800">{deleteTarget && new Date(deleteTarget.id).toLocaleString()}</strong> 的快照吗？</p>
                <p className="mt-2 text-rose-500 font-bold">此操作不可撤销。</p>
            </ConfirmModal>

            <div className="p-8 max-w-[1600px] mx-auto animate-fadeIn">
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">系统快照中心</h1>
                    <p className="text-slate-500 mt-2 font-bold text-xs tracking-widest uppercase">SYSTEM STATE BACKUP & RESTORE</p>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Settings & Actions Panel */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4"><Settings size={18} className="text-[#70AD47]"/> 快照设置</h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                                    <label htmlFor="auto-snapshot-toggle" className="text-sm font-bold text-slate-600 cursor-pointer">开启自动快照</label>
                                    <div className="relative">
                                        <input 
                                            type="checkbox" 
                                            id="auto-snapshot-toggle"
                                            checked={localSettings.autoSnapshotEnabled} 
                                            onChange={(e) => handleSettingsChange('autoSnapshotEnabled', e.target.checked)} 
                                            className="sr-only peer" />
                                        <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#70AD47]"></div>
                                    </div>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-lg">
                                    <label htmlFor="retention-days" className="block text-sm font-bold text-slate-600 mb-2">快照保留天数</label>
                                    <input 
                                        type="number" 
                                        id="retention-days"
                                        value={localSettings.retentionDays}
                                        onChange={(e) => handleSettingsChange('retentionDays', parseInt(e.target.value, 10) || 1)}
                                        min="1"
                                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#70AD47]"
                                    />
                                    <p className="text-xs text-slate-400 mt-1">系统将自动删除超过此时长的快照。</p>
                                </div>
                            </div>
                             <button onClick={handleSaveSettings} className="w-full mt-6 py-2.5 rounded-lg bg-slate-800 text-white font-bold text-sm hover:bg-slate-700 transition-all">
                                保存设置
                            </button>
                        </div>
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                             <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4"><Camera size={18} className="text-[#70AD47]"/> 手动操作</h3>
                             <button onClick={onCreate} className="w-full py-3 rounded-lg bg-[#70AD47] text-white font-bold text-sm hover:bg-[#5da035] shadow-lg shadow-[#70AD47]/20 flex items-center justify-center gap-2 transition-all active:scale-95">
                                立即创建快照
                            </button>
                        </div>
                    </div>

                    {/* Snapshot List */}
                    <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-6 min-h-[500px]">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4"><History size={18} className="text-[#70AD47]"/> 快照历史记录</h3>
                        <div className="space-y-3">
                            {snapshots.length === 0 ? (
                                <div className="py-20 text-center">
                                    <div className="flex flex-col items-center justify-center text-slate-300">
                                        <Camera size={48} className="mb-4 opacity-50" />
                                        <p className="font-bold">暂无快照记录</p>
                                    </div>
                                </div>
                            ) : (
                                snapshots.map(snapshot => (
                                    <div key={snapshot.id} className="bg-slate-50 border border-slate-200/50 rounded-lg p-4 flex items-center justify-between hover:border-slate-300 transition-colors">
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${snapshot.type === 'manual' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-700'}`}>
                                                    {snapshot.type === 'manual' ? '手动' : '自动'}
                                                </span>
                                                <span className="font-bold text-sm text-slate-700">{new Date(snapshot.id).toLocaleString()}</span>
                                            </div>
                                            <div className="text-xs text-slate-400 mt-1">
                                                <span>大小: {formatBytes(snapshot.size)}</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => setRestoreTarget(snapshot)} className="px-3 py-1.5 rounded-md border border-amber-200 bg-amber-50 text-amber-600 font-bold text-xs hover:bg-amber-100">恢复</button>
                                            <button onClick={() => setDeleteTarget(snapshot)} className="text-rose-500 hover:text-rose-700 p-1.5"><Trash2 size={16}/></button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};
