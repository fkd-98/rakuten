// ProductWorkflow.jsx
// 画像アップロード → Gemini解析 → 投稿生成 → 確認・編集 → Supabase保存
// までを1画面でつなぐワークフロー

import { useState } from "react";
import ProductImageUpload from "./ProductImageUpload";
import { generatePostFromProduct } from "../services/postGenerationService";
import { saveProductAndPost } from "../services/supabaseService";
import { naturalizeText } from "../services/naturalizeTextService";

export default function ProductWorkflow() {
  const [productInfo, setProductInfo] = useState(null);
  const [userMemo, setUserMemo] = useState("");
  const [generatedPost, setGeneratedPost] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [savedResult, setSavedResult] = useState(null);

  // AI感を消すボタンの処理中フラグと、直近の変更点メモ（フィールドごと）
  const [naturalizingField, setNaturalizingField] = useState(null); // "threadsPost" | "roomDescription" | null
  const [naturalizeChanges, setNaturalizeChanges] = useState({});

  const handleAnalyzed = (info) => {
    setProductInfo(info);
    setGeneratedPost(null);
    setSavedResult(null);
  };

  const handleGenerate = async () => {
    if (!productInfo) return;
    setError(null);
    setIsGenerating(true);
    try {
      const post = await generatePostFromProduct(productInfo, userMemo);
      setGeneratedPost(post);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNaturalize = async (field) => {
    if (!generatedPost) return;
    const style = field === "roomDescription" ? "room" : "threads";
    setError(null);
    setNaturalizingField(field);
    try {
      const result = await naturalizeText(generatedPost[field], style);
      setGeneratedPost({ ...generatedPost, [field]: result.after });
      setNaturalizeChanges((prev) => ({ ...prev, [field]: result.changes }));
    } catch (err) {
      setError(err.message);
    } finally {
      setNaturalizingField(null);
    }
  };

  const handleSave = async () => {
    if (!productInfo || !generatedPost) return;
    setError(null);
    setIsSaving(true);
    try {
      const result = await saveProductAndPost(productInfo, generatedPost);
      setSavedResult(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: 16 }}>
      <h2 style={{ marginBottom: 16 }}>商品画像から投稿を作成</h2>

      {/* ステップ1: 画像アップロード＆解析 */}
      <ProductImageUpload onAnalyzed={handleAnalyzed} />

      {/* ステップ2: 任意メモ入力＋投稿生成 */}
      {productInfo && (
        <div style={{ marginTop: 20 }}>
          <label style={{ display: "block", marginBottom: 8 }}>
            使ってみた感想など（任意）
          </label>
          <textarea
            value={userMemo}
            onChange={(e) => setUserMemo(e.target.value)}
            placeholder="例: これ買ってから朝の準備がラクになった"
            style={{ width: "100%", minHeight: 60, padding: 8, borderRadius: 6 }}
          />
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            style={{
              marginTop: 10,
              padding: "10px 20px",
              borderRadius: 6,
              background: "#d4af37",
              color: "#fff",
              border: "none",
            }}
          >
            {isGenerating ? "生成中..." : "投稿を生成する"}
          </button>
        </div>
      )}

      {/* ステップ3: 確認・編集 */}
      {generatedPost && (
        <div style={{ marginTop: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label style={{ display: "block", marginBottom: 6 }}>
              Threads投稿
            </label>
            <button
              onClick={() => handleNaturalize("threadsPost")}
              disabled={naturalizingField === "threadsPost"}
              style={{
                padding: "4px 10px",
                fontSize: 13,
                borderRadius: 6,
                background: "#fff",
                color: "#333",
                border: "1px solid #ccc",
              }}
            >
              {naturalizingField === "threadsPost" ? "調整中..." : "AI感を消す"}
            </button>
          </div>
          <textarea
            value={generatedPost.threadsPost}
            onChange={(e) =>
              setGeneratedPost({ ...generatedPost, threadsPost: e.target.value })
            }
            style={{ width: "100%", minHeight: 100, padding: 8, borderRadius: 6 }}
          />
          {naturalizeChanges.threadsPost && (
            <ul style={{ marginTop: 4, paddingLeft: 20, fontSize: 12, color: "#888" }}>
              {naturalizeChanges.threadsPost.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
            <label style={{ display: "block", marginBottom: 6 }}>
              Rakuten Room説明文
            </label>
            <button
              onClick={() => handleNaturalize("roomDescription")}
              disabled={naturalizingField === "roomDescription"}
              style={{
                padding: "4px 10px",
                fontSize: 13,
                borderRadius: 6,
                background: "#fff",
                color: "#333",
                border: "1px solid #ccc",
              }}
            >
              {naturalizingField === "roomDescription" ? "調整中..." : "AI感を消す"}
            </button>
          </div>
          <textarea
            value={generatedPost.roomDescription}
            onChange={(e) =>
              setGeneratedPost({ ...generatedPost, roomDescription: e.target.value })
            }
            style={{ width: "100%", minHeight: 80, padding: 8, borderRadius: 6 }}
          />
          {naturalizeChanges.roomDescription && (
            <ul style={{ marginTop: 4, paddingLeft: 20, fontSize: 12, color: "#888" }}>
              {naturalizeChanges.roomDescription.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          )}

          <button
            onClick={handleSave}
            disabled={isSaving}
            style={{
              marginTop: 12,
              padding: "10px 20px",
              borderRadius: 6,
              background: "#333",
              color: "#fff",
              border: "none",
            }}
          >
            {isSaving ? "保存中..." : "この内容で保存する"}
          </button>
        </div>
      )}

      {savedResult && (
        <p style={{ marginTop: 16, color: "#2e7d32" }}>
          保存しました（product: {savedResult.productId} / post: {savedResult.postId}）
        </p>
      )}

      {error && <p style={{ marginTop: 16, color: "#c0392b" }}>{error}</p>}
    </div>
  );
}
