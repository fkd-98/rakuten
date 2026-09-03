// ProductImageUpload.jsx
// 商品画像をドラッグ&ドロップ or 選択でアップロードし、Gemini Visionで自動解析するUI

import { useState, useCallback } from "react";
import { analyzeProductImage } from "../services/geminiVisionService";

export default function ProductImageUpload({ onAnalyzed }) {
  const [preview, setPreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const handleFile = useCallback(async (file) => {
    if (!file || !file.type.startsWith("image/")) {
      setError("画像ファイルを選択してください");
      return;
    }

    setError(null);
    setResult(null);
    setPreview(URL.createObjectURL(file));
    setIsAnalyzing(true);

    try {
      const analyzed = await analyzeProductImage(file);
      setResult(analyzed);
      onAnalyzed?.({ ...analyzed, imageFile: file });
    } catch (err) {
      setError(err.message || "解析に失敗しました");
    } finally {
      setIsAnalyzing(false);
    }
  }, [onAnalyzed]);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  return (
    <div style={{ maxWidth: 480, margin: "0 auto" }}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${isDragging ? "#d4af37" : "#ccc"}`,
          borderRadius: 12,
          padding: 32,
          textAlign: "center",
          background: isDragging ? "#fdf8ee" : "#fafafa",
          cursor: "pointer",
        }}
        onClick={() => document.getElementById("product-image-input").click()}
      >
        {preview ? (
          <img
            src={preview}
            alt="preview"
            style={{ maxWidth: "100%", maxHeight: 240, borderRadius: 8 }}
          />
        ) : (
          <p style={{ color: "#888" }}>
            商品画像をドラッグ＆ドロップ、またはタップして選択
          </p>
        )}
        <input
          id="product-image-input"
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>

      {isAnalyzing && (
        <p style={{ marginTop: 12, color: "#d4af37" }}>解析中...</p>
      )}

      {error && (
        <p style={{ marginTop: 12, color: "#c0392b" }}>{error}</p>
      )}

      {result && (
        <div
          style={{
            marginTop: 16,
            padding: 16,
            borderRadius: 8,
            background: "#fdf8ee",
            border: "1px solid #eee0c0",
          }}
        >
          <p><strong>商品名:</strong> {result.productName}</p>
          <p><strong>カテゴリ:</strong> {result.category}</p>
          <p><strong>特徴:</strong> {result.features?.join(" / ")}</p>
          <p><strong>想定価格帯:</strong> {result.priceRangeHint}</p>
          <p><strong>想定される悩み:</strong> {result.memo}</p>
        </div>
      )}
    </div>
  );
}
