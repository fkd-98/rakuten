// geminiVisionService.js
// 商品画像をGemini Vision APIに渡し、商品情報を自動抽出するサービス

const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY; // .env等で管理
const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

/**
 * File(画像)をBase64文字列に変換
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * 商品画像を解析し、構造化データを返す
 * @param {File} imageFile - アップロードされた商品画像
 * @returns {Promise<{
 *   productName: string,
 *   category: string,
 *   features: string[],
 *   priceRangeHint: string,
 *   memo: string
 * }>}
 */
export async function analyzeProductImage(imageFile) {
  const base64Data = await fileToBase64(imageFile);

  const prompt = `
あなたは楽天アフィリエイト用の商品分析アシスタントです。
添付された商品画像を見て、以下の項目をJSON形式のみで出力してください（前置き・説明文は一切不要）。

{
  "productName": "商品名の推定（ブランド名含む、わかる範囲で具体的に）",
  "category": "商品カテゴリ（例: キッチン家電, ベビー用品, 収納グッズ など）",
  "features": ["特徴1", "特徴2", "特徴3"],
  "priceRangeHint": "想定価格帯（例: 3000〜5000円）",
  "memo": "この商品を使う親世代のユーザーが感じそうな悩み・不安を1文で"
}
`;

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: imageFile.type,
                data: base64Data,
              },
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  // ```json ``` のようなコードフェンスを除去してからパース
  const cleaned = rawText.replace(/```json|```/g, "").trim();

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    throw new Error("Gemini応答のJSONパースに失敗しました: " + rawText);
  }
}
