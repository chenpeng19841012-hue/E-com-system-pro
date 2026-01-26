# 云舟 (Yunzhou) | 智能电商全链路运营指挥中心

> **"轻舟已过万重山"** —— 搭载 Gemini AI 的新一代电商私有化智能运营系统。

## 🚢 系统愿景
**云舟 (Yunzhou)** 是一款专为高阶电商团队设计的“数据+AI”双驱动作战系统。它打破了传统 BI 报表只看不做的局限，通过**本地 IndexedDB 存储**保障核心数据主权，并深度集成 **Google Gemini 3.0** 模型，实现了从数据清洗、利润穿透、销售预测到文案/视觉生成的一站式闭环。

---

## 🏗️ 核心架构逻辑 (Architecture)

### 1. 数据资产私有化 (Local-First)
*   **本地手术室**: 核心业务数据存储在浏览器本地的 `IndexedDB` 中，绝不上云，彻底规避平台接口数据外泄风险。
*   **云端镜像**: 系统并不使用 Supabase 的 PostgreSQL Tables。同步是通过 **Supabase Storage** 实现的，数据以加密 JSON 镜像形式存储在名为 `backups` 的 Bucket 中。

### 2. AI 指标穿透技术 (AI-Driven Insight)
*   **双轨匹配**: 利用 AI 模糊匹配技术，将混乱的原始 Excel 表头自动映射至系统标准化字段。
*   **物理层治理**: 用户可直接对手工上传的错误数据进行物理级删除或修正。

---

## 🚀 Supabase 配置说明 (必看)
1.  **Project URL & Anon Key**: 在控制台 Project Settings -> API 中获取。
2.  **Storage 设置**: 
    *   在 Supabase 左侧菜单进入 **Storage**。
    *   创建一个名为 **`backups`** 的新 Bucket。
    *   将该 Bucket 设置为 **Public** (以便于跨设备通过 API 访问)。
    *   **注意**: 数据库面板会显示 `0 Tables`，这是正常的，因为数据存储在 Storage 的文件镜像中。

---

## 🛠️ 模块阵列 (Feature Matrix)
... (保持原内容)