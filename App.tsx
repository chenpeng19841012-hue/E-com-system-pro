
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, CloudSync as SyncIcon } from 'lucide-react';

import { Sidebar } from './components/Sidebar';
import { ToastContainer } from './components/Toast';
import { DashboardView } from './views/DashboardView';
import { MultiQueryView } from './views/MultiQueryView';
import { ReportsView } from './views/ReportsView';
import { SKUManagementView } from './views/SKUManagementView';
import { DataExperienceView } from './views/DataExperienceView';
import { DataCenterView } from './views/DataCenterView';
import { CloudSyncView } from './views/CloudSyncView';
import { AIProfitAnalyticsView } from './views/AIProfitAnalyticsView';
import { AISmartReplenishmentView } from './views/AISmartReplenishmentView';
import { AIQuotingView } from './views/AIQuotingView';
import { AIDescriptionView } from './views/AIDescriptionView';
import { AISalesForecastView } from './views/AISalesForecastView';
import { AIAssistantView } from './views/AIAssistantView';
import { AIAdImageView } from './views/AIAdImageView';
import { SystemSnapshotView } from './views/SystemSnapshotView';
import { AICompetitorMonitoringView } from './views/AICompetitorMonitoringView';

import { View, TableType, ToastProps, Shop, ProductSKU, CustomerServiceAgent, UploadHistory, QuotingData, SkuList, SnapshotSettings, MonitoredCompetitorShop, CompetitorGroup } from './lib/types';
import { DB } from './lib/db';
import { parseExcelFile } from './lib/excel';
import { INITIAL_SHANGZHI_SCHEMA, INITIAL_JINGZHUNTONG_SCHEMA, INITIAL_CUSTOMER_SERVICE_SCHEMA } from './lib/schemas';

const INITIAL_QUOTING_DATA: QuotingData = {
    "prices": {
        "主机": { "TSK-C3 I5-13400": 2700.0, "TSK-C3 I5-14500": 3300.0 },
        "内存": { "8G DDR5": 450.0, "16G DDR5": 1000.0 }
    },
    "settings": { "margin": 1.15 },
    "discounts": [{ "min_qty": 10, "rate": 0.98 }]
};

export const App = () => {
    const [currentView, setCurrentView] = useState<View>('dashboard');
    const [toasts, setToasts] = useState<ToastProps[]>([]);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isAppLoading, setIsAppLoading] = useState(true);
    
    const [schemas, setSchemas] = useState<any>({});
    const [shops, setShops] = useState<Shop[]>([]);
    const [skus, setSkus] = useState<ProductSKU[]>([]);
    const [agents, setAgents] = useState<CustomerServiceAgent[]>([]);
    const [skuLists, setSkuLists] = useState<SkuList[]>([]);
    const [uploadHistory, setUploadHistory] = useState<UploadHistory[]>([]);
    const [quotingData, setQuotingData] = useState<QuotingData>(INITIAL_QUOTING_DATA);
    const [snapshotSettings, setSnapshotSettings] = useState<SnapshotSettings>({ autoSnapshotEnabled: true, retentionDays: 7 });
    const [factTables, setFactTables] = useState<any>({ shangzhi: [], jingzhuntong: [], customer_service: [] });

    // Competitor Monitoring Data
    const [compShops, setCompShops] = useState<MonitoredCompetitorShop[]>([]);
    const [compGroups, setCompGroups] = useState<CompetitorGroup[]>([]);

    const addToast = (type: 'success' | 'error', title: string, message: string) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, type, title, message }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
    };

    const loadMetadata = useCallback(async () => {
        try {
            // 1. 尝试从云端静默同步配置
            await DB.syncPull();

            // 2. 加载本地数据 (此时本地数据已是最新的)
            const [s_shops, s_skus, s_agents, s_skuLists, history, settings, q_data, s_sz, s_jzt, s_cs_schema, s_compShops, s_compGroups] = await Promise.all([
                DB.loadConfig('dim_shops', []),
                DB.loadConfig('dim_skus', []),
                DB.loadConfig('dim_agents', []),
                DB.loadConfig('dim_sku_lists', []),
                DB.loadConfig('upload_history', []),
                DB.loadConfig('snapshot_settings', { autoSnapshotEnabled: true, retentionDays: 7 }),
                DB.loadConfig('quoting_data', INITIAL_QUOTING_DATA),
                DB.loadConfig('schema_shangzhi', INITIAL_SHANGZHI_SCHEMA),
                DB.loadConfig('schema_jingzhuntong', INITIAL_JINGZHUNTONG_SCHEMA),
                DB.loadConfig('schema_customer_service', INITIAL_CUSTOMER_SERVICE_SCHEMA),
                DB.loadConfig('comp_shops', []),
                DB.loadConfig('comp_groups', [])
            ]);
            const [f_sz, f_jzt, f_cs] = await Promise.all([
                DB.getRange('fact_shangzhi', '1970-01-01', '2099-12-31'),
                DB.getRange('fact_jingzhuntong', '1970-01-01', '2099-12-31'),
                DB.getRange('fact_customer_service', '1970-01-01', '2099-12-31')
            ]);
            setShops(s_shops); setSkus(s_skus); setAgents(s_agents); setSkuLists(s_skuLists);
            setUploadHistory(history); setSnapshotSettings(settings); setQuotingData(q_data);
            setSchemas({ shangzhi: s_sz, jingzhuntong: s_jzt, customer_service: s_cs_schema });
            setFactTables({ shangzhi: f_sz, jingzhuntong: f_jzt, customer_service: f_cs });
            setCompShops(s_compShops); setCompGroups(s_compGroups);
        } catch (e) {
            console.error("Initialization failed:", e);
            addToast('error', '系统初始化警告', '部分数据加载失败，正使用本地缓存运行。');
        }
    }, []);

    useEffect(() => { 
        const init = async () => {
            setIsAppLoading(true);
            await loadMetadata();
            setIsAppLoading(false);
        };
        init();

        // 核心：启动 60s 心跳同步，实现“准实时”读一致性
        const heartbeatInterval = setInterval(async () => {
            // 静默拉取，不阻塞 UI
            const hasNewData = await DB.syncPull();
            if (hasNewData) {
                console.log("检测到云端变更，刷新视图...");
                loadMetadata(); // 仅当有新数据时刷新 UI
            }
        }, 60000); 

        return () => clearInterval(heartbeatInterval);
    }, [loadMetadata]);

    const onDeleteRows = async (tableType: TableType, ids: any[]) => {
        try {
            await DB.deleteRows(`fact_${tableType}`, ids);
            // 刷新数据
            const newData = await DB.getRange(`fact_${tableType}`, '1970-01-01', '2099-12-31');
            setFactTables((prev: any) => ({ ...prev, [tableType]: newData }));
        } catch (e) {
            addToast('error', '物理删除失败', '操作数据库时发生错误。');
            throw e;
        }
    };

    // 批量保存维度数据的通用逻辑
    const handleBulkSave = async (key: string, data: any[], type: string) => {
        try {
            await DB.saveConfig(key, data);
            await loadMetadata();
            addToast('success', '同步成功', `已批量更新 ${data.length} 条${type}数据并同步至云端。`);
        } catch (e) {
            addToast('error', '物理写入失败', `无法保存${type}数据到本地库。`);
        }
    };

    const handleUpdateSKU = async (s: ProductSKU) => {
        const n = skus.map(x => x.id === s.id ? s : x);
        await DB.saveConfig('dim_skus', n);
        await loadMetadata();
        return true;
    };

    // 统一数据上传处理器
    const handleUpload = async (file: File, type: TableType, shopId?: string) => {
        return new Promise<void>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const { data } = parseExcelFile(e.target?.result);
                    if (data.length === 0) throw new Error("文件内容为空或格式无法识别");

                    // 数据增强：注入店铺ID和日期
                    const enrichedData = data.map(row => {
                        // 尝试智能修正日期格式
                        if (row['日期'] && typeof row['日期'] === 'number') {
                             const date = new Date((row['日期'] - 25569) * 86400 * 1000);
                             row['date'] = date.toISOString().split('T')[0];
                        } else if (row['日期']) {
                             row['date'] = row['日期'];
                        }
                        
                        // 注入 shopId (如果用户在下拉菜单选了)
                        if (shopId) {
                            const shop = shops.find(s => s.id === shopId);
                            if (shop) row['shop_name'] = shop.name;
                        }
                        return row;
                    });

                    // 写入数据库 (Local + Cloud Background Sync)
                    const tableName = `fact_${type}`;
                    await DB.bulkAdd(tableName, enrichedData);

                    // 记录历史
                    const newHistoryItem: UploadHistory = {
                        id: Date.now().toString(),
                        fileName: file.name,
                        fileSize: (file.size / 1024).toFixed(1) + 'KB',
                        rowCount: data.length,
                        uploadTime: new Date().toLocaleString(),
                        status: '成功',
                        targetTable: type
                    };
                    const updatedHistory = [newHistoryItem, ...uploadHistory];
                    setUploadHistory(updatedHistory);
                    await DB.saveConfig('upload_history', updatedHistory);

                    // 刷新视图
                    await loadMetadata();
                    addToast('success', '全链路同步完成', `已成功解析并上传 ${data.length} 条物理记录，云端正在后台同步。`);
                    resolve();
                } catch (err: any) {
                    addToast('error', '上传失败', err.message);
                    reject(err);
                }
            };
            reader.readAsBinaryString(file);
        });
    };

    const handleBatchUpdate = async (skusToUpdate: string[], shopId: string) => {
        try {
            const shop = shops.find(s => s.id === shopId);
            if (!shop) throw new Error("目标店铺不存在");
            
            const allRows = await DB.getTableRows('fact_shangzhi');
            const updatedRows = [];
            
            for (const row of allRows) {
                const rowSku = row.sku_code || row.product_id;
                if (skusToUpdate.includes(rowSku)) {
                    row.shop_name = shop.name;
                    updatedRows.push(row);
                }
            }
            
            if (updatedRows.length > 0) {
                await DB.bulkAdd('fact_shangzhi', updatedRows);
                await loadMetadata();
                addToast('success', '批量修正完成', `已更新 ${updatedRows.length} 条历史数据的归属店铺。`);
            } else {
                addToast('success', '操作完成', '未发现需要修正的记录。');
            }
        } catch (e: any) {
            addToast('error', '批量更新失败', e.message);
        }
    };

    const renderView = () => {
        if (isAppLoading) return (
            <div className="flex flex-col h-full items-center justify-center text-slate-400 font-black bg-white">
                <SyncIcon size={48} className="mb-4 text-brand animate-spin" />
                <p className="tracking-[0.4em] uppercase text-xs font-black">云舟引擎正在热同步...</p>
                <p className="text-[10px] mt-2 opacity-50">Syncing with Cloud Master Node</p>
            </div>
        );
        
        const commonProps = { skus, shops, agents, schemas, addToast };
        switch (currentView) {
            case 'dashboard': return <DashboardView {...commonProps} />;
            case 'multiquery': return <MultiQueryView {...commonProps} shangzhiData={factTables.shangzhi} jingzhuntongData={factTables.jingzhuntong} />;
            case 'reports': return <ReportsView {...commonProps} factTables={factTables} skuLists={skuLists} onAddNewSkuList={async (l:any) => { const n = [...skuLists, {...l, id: Date.now().toString()}]; setSkuLists(n); await DB.saveConfig('dim_sku_lists', n); return true; }} onUpdateSkuList={async (l:any) => { const n = skuLists.map(x=>x.id===l.id?l:x); setSkuLists(n); await DB.saveConfig('dim_sku_lists', n); return true; }} onDeleteSkuList={(id:any) => { const n = skuLists.filter(x=>x.id!==id); setSkuLists(n); DB.saveConfig('dim_sku_lists', n); }} />;
            case 'data-center': return <DataCenterView onUpload={handleUpload} onBatchUpdate={handleBatchUpdate} history={uploadHistory} factTables={factTables} shops={shops} schemas={schemas} addToast={addToast} />;
            case 'cloud-sync': return <CloudSyncView addToast={addToast} />;
            case 'data-experience': return <DataExperienceView factTables={factTables} schemas={schemas} shops={shops} onClearTable={async (k:any)=>await DB.clearTable(`fact_${k}`)} onDeleteRows={onDeleteRows} onRefreshData={loadMetadata} onUpdateSchema={async (t:any, s:any) => { const ns = {...schemas, [t]: s}; setSchemas(ns); await DB.saveConfig(`schema_${t}`, s); }} addToast={addToast} />;
            case 'products': return (
                <SKUManagementView 
                    {...commonProps} 
                    skuLists={skuLists} 
                    onAddNewSKU={async (s)=> { const n = [...skus, {...s, id: Date.now().toString()}]; await handleBulkSave('dim_skus', n, 'SKU'); return true; }} 
                    onUpdateSKU={handleUpdateSKU} 
                    onDeleteSKU={async (id)=> { const n = skus.filter(x=>x.id!==id); await handleBulkSave('dim_skus', n, 'SKU'); }} 
                    onBulkAddSKUs={async (newList)=> { 
                        const updatedSkus = [...skus];
                        newList.forEach(newItem => {
                            const index = updatedSkus.findIndex(s => s.code === newItem.code);
                            if (index !== -1) {
                                updatedSkus[index] = { ...updatedSkus[index], ...newItem };
                            } else {
                                updatedSkus.push({ ...newItem, id: Math.random().toString(36).substr(2, 9) });
                            }
                        });
                        await handleBulkSave('dim_skus', updatedSkus, 'SKU');
                    }} 
                    onAddNewShop={async (s)=> { const n = [...shops, {...s, id: Date.now().toString()}]; await handleBulkSave('dim_shops', n, '店铺'); return true; }} 
                    onUpdateShop={async (s)=> { const n = shops.map(x=>x.id===s.id?s:x); await handleBulkSave('dim_shops', n, '店铺'); return true; }} 
                    onDeleteShop={async (id)=> { const n = shops.filter(x=>x.id!==id); await handleBulkSave('dim_shops', n, '店铺'); }} 
                    onBulkAddShops={async (newList)=> {
                        const updatedShops = [...shops];
                        newList.forEach(newItem => {
                            const index = updatedShops.findIndex(s => s.name === newItem.name);
                            if (index !== -1) {
                                updatedShops[index] = { ...updatedShops[index], ...newItem };
                            } else {
                                updatedShops.push({ ...newItem, id: Math.random().toString(36).substr(2, 9) });
                            }
                        });
                        await handleBulkSave('dim_shops', updatedShops, '店铺');
                    }}
                    onAddNewAgent={async (s)=> { const n = [...agents, {...s, id: Date.now().toString()}]; await handleBulkSave('dim_agents', n, '客服'); return true; }} 
                    onUpdateAgent={async (s)=> { const n = agents.map(x=>x.id===s.id?s:x); await handleBulkSave('dim_agents', n, '客服'); return true; }} 
                    onDeleteAgent={async (id)=> { const n = agents.filter(x=>x.id!==id); await handleBulkSave('dim_agents', n, '客服'); }}
                    onBulkAddAgents={async (newList)=> {
                        const updatedAgents = [...agents];
                        newList.forEach(newItem => {
                            const index = updatedAgents.findIndex(a => a.account === newItem.account);
                            if (index !== -1) {
                                updatedAgents[index] = { ...updatedAgents[index], ...newItem };
                            } else {
                                updatedAgents.push({ ...newItem, id: Math.random().toString(36).substr(2, 9) });
                            }
                        });
                        await handleBulkSave('dim_agents', updatedAgents, '客服');
                    }}
                    onAddNewSkuList={async (l:any) => { const n = [...skuLists, {...l, id: Date.now().toString()}]; setSkuLists(n); await DB.saveConfig('dim_sku_lists', n); return true; }} 
                    onUpdateSkuList={async (l:any) => { const n = skuLists.map(x=>x.id===l.id?l:x); setSkuLists(n); await DB.saveConfig('dim_sku_lists', n); return true; }} 
                    onDeleteSkuList={(id:any) => { const n = skuLists.filter(x=>x.id!==id); setSkuLists(n); DB.saveConfig('dim_sku_lists', n); }}
                />
            );
            case 'ai-profit-analytics': return <AIProfitAnalyticsView {...commonProps} />;
            case 'ai-smart-replenishment': return <AISmartReplenishmentView shangzhiData={factTables.shangzhi} onUpdateSKU={handleUpdateSKU} {...commonProps} />;
            case 'ai-quoting': return <AIQuotingView quotingData={quotingData} onUpdate={async (d:any) => { setQuotingData(d); await DB.saveConfig('quoting_data', d); }} addToast={addToast} />;
            case 'ai-description': return <AIDescriptionView skus={skus} />;
            case 'ai-sales-forecast': return <AISalesForecastView skus={skus} />;
            case 'ai-cs-assistant': return <AIAssistantView skus={skus} shops={shops} addToast={addToast} />;
            case 'ai-ad-image': return <AIAdImageView skus={skus} />;
            case 'system-snapshot': return <SystemSnapshotView snapshots={[]} settings={snapshotSettings} onUpdateSettings={async (s:any) => { setSnapshotSettings(s); await DB.saveConfig('snapshot_settings', s); }} onCreate={()=>{}} onRestore={()=>{}} onDelete={()=>{}} onImport={()=>{}} addToast={addToast} />;
            case 'ai-competitor-monitoring': return (
                <AICompetitorMonitoringView 
                    compShops={compShops} 
                    compGroups={compGroups} 
                    shangzhiData={factTables.shangzhi}
                    onUpdateCompShops={async (data) => { setCompShops(data); await DB.saveConfig('comp_shops', data); await loadMetadata(); }}
                    onUpdateCompGroups={async (data) => { setCompGroups(data); await DB.saveConfig('comp_groups', data); await loadMetadata(); }}
                    addToast={addToast} 
                />
            );
            default: return <DashboardView {...commonProps} />;
        }
    };

    return (
        <div className="flex flex-row h-screen w-screen bg-[#F8FAFC] font-sans text-slate-800 overflow-hidden">
            <Sidebar currentView={currentView} setCurrentView={setCurrentView} isSidebarCollapsed={isSidebarCollapsed} setIsSidebarCollapsed={setIsSidebarCollapsed} />
            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative border-l border-slate-200">
                <main className="flex-1 overflow-y-auto no-scrollbar relative">
                    {renderView()}
                </main>
                <ToastContainer toasts={toasts} />
            </div>
        </div>
    );
};
