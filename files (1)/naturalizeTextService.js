// naturalizeTextService.js
// 生成済み・手書き問わず、下書きテキストの「AI感」を消して自然な文章に書き直す
// PostGenerationServiceの出力をさらに磨きたい時や、手動で書いた投稿の
// 添削に使う想定

const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY;
const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

/**
 * 下書きテキストを自然な文章にリファインする
 * @param {string} draftText - 元の下書き（AI感が残っている文章）
 * @param {"threads" | "room"} [style] - 投稿の種類でトーン調整を変える
 * @returns {Promise<{ before: string, after: string, changes: string[] }>}
 */
export async function naturalizeText(draftText, style = "threads") {
  const styleNote =
    style === "room"
      ? "楽天Room説明文なので、購買を後押しする自然な熱量は残しつつ整える"
      : "Threads投稿なので、宣伝色をできるだけ消し日常のつぶやきに近づける";

  const prompt = `
以下の文章の「AI感」を消して、人間が実体験ベースで書いたように自然にリライトしてください。
${styleNote}。

【NGパターン（見つけたら必ず直す）】
- 「〜についてご紹介します」「〜はいかがでしょうか」等の説明・営業口調
- 特徴の箇条書きをそのまま文章化しただけの羅列
- 「ぜひ」「おすすめです」「便利です」の多用
- 毎文が同じ長さ・同じリズムで単調
- 絵文字で毎回締める、絵文字が3個以上

【直し方】
- 話し言葉・体言止め・軽い省略を混ぜる
- 小さな本音（迷い・不満・驚き）を一言足す
- 具体的な時間帯や状況（例:「朝バタバタしてる時」）を一つ入れる
- 特徴は1〜2個に絞り、体験談に混ぜ込む

【元の文章】
${draftText}

出力は必ず以下のJSON形式のみ（前置き不要）:
{
  "before": "元の文章そのまま",
  "after": "リライト後の文章",
  "changes": ["直した点を短く箇条書きで2〜4個"]
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
    throw new Error("リライト結果のJSONパースに失敗しました: " + rawText);
  }
}
