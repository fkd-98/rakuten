// postGenerationService.js
// 商品情報から「悩み共感→解決型」のThreads投稿とRakuten Room説明文を同時生成する

const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY;
const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

/**
 * 商品情報から投稿文一式を生成
 * @param {{
 *   productName: string,
 *   category: string,
 *   features: string[],
 *   priceRangeHint: string,
 *   memo: string
 * }} productInfo - 画像解析結果（+必要ならユーザーが追記したメモ）
 * @param {string} [userMemo] - ユーザーが追加した一言メモ（実体験など、任意）
 * @returns {Promise<{ threadsPost: string, roomDescription: string }>}
 */
export async function generatePostFromProduct(productInfo, userMemo = "") {
  const prompt = `
あなたは楽天アフィリエイト×Threads運用の専門家です。
以下の商品情報をもとに、2種類の文章を生成してください。

【商品情報】
商品名: ${productInfo.productName}
カテゴリ: ${productInfo.category}
特徴: ${productInfo.features?.join("、")}
想定価格帯: ${productInfo.priceRangeHint}
想定される悩み: ${productInfo.memo}
ユーザーの一言メモ: ${userMemo || "なし"}

【生成ルール】
1. threadsPost:
   - フォーマットは「悩み共感→解決型」
   - 冒頭は読み手の悩み・あるあるへの共感から始める
   - 商品の宣伝色は極力出さず、日常のつぶやきに近いトーン
   - 文末に軽く商品への言及を入れるが、売り込み感は出さない
   - 絵文字は使いすぎない（0〜2個程度）
   - 200〜300文字程度

2. roomDescription:
   - 冒頭はセール・クーポンなどのお得情報フックから始める
   - 商品の特徴・メリットを簡潔に紹介
   - 購買を後押しする一文で締める
   - 150〜250文字程度

出力は必ず以下のJSON形式のみ（前置き・説明文は不要）:
{
  "threadsPost": "...",
  "roomDescription": "..."
}
`;

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const cleaned = rawText.replace(/```json|```/g, "").trim();

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    throw new Error("投稿生成のJSONパースに失敗しました: " + rawText);
  }
}
