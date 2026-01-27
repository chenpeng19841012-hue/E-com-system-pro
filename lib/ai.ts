/**
 * Google Gemini API 统一调度引擎
 */
import { GoogleGenAI } from "@google/genai";

// 安全获取 API KEY
const getApiKey = () => {
    try {
        return process.env.API_KEY || "";
    } catch (e) {
        return "";
    }
};

const ai = new GoogleGenAI({ apiKey: getApiKey() });

export const AI_CONFIG = {
    model: 'gemini-3-flash-preview', 
    imageModel: 'gemini-2.5-flash-image'
};

/**
 * 通用文本生成接口
 */
export async function callQwen(prompt: string, isJson: boolean = false) {
    if (!getApiKey()) {
        throw new Error("物理链路异常：未检测到有效的 API 访问凭证。");
    }
    
    const response = await ai.models.generateContent({
        model: AI_CONFIG.model,
        contents: prompt,
        config: {
            systemInstruction: isJson 
                ? '你是一个专业的数据分析专家，必须严格返回 JSON 对象，不要包含任何 Markdown 标记。' 
                : '你是一个资深的电商战略运营专家。',
            responseMimeType: isJson ? "application/json" : "text/plain"
        }
    });

    return response.text;
}

/**
 * 图像生成调度引擎
 */
export async function generateWanxImage(prompt: string, config?: { aspectRatio?: "1:1" | "3:4" | "4:3" | "9:16" | "16:9" }) {
    if (!getApiKey()) {
        throw new Error("物理链路异常：未检测到有效的 API 访问凭证。");
    }

    const response = await ai.models.generateContent({
        model: AI_CONFIG.imageModel,
        contents: {
            parts: [{ text: prompt }],
        },
        config: {
            imageConfig: {
                aspectRatio: config?.aspectRatio || "1:1"
            }
        }
    });

    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            const base64EncodeString: string = part.inlineData.data;
            return `data:${part.inlineData.mimeType};base64,${base64EncodeString}`;
        }
    }
    
    throw new Error("未能生成图像资产。");
}