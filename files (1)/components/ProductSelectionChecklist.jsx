// ProductSelectionChecklist.jsx
// 楽天商品ページの情報を入力すると、選定スコアと判定を即座に表示するチェックリスト

import { useState } from "react";
import { scoreProductCandidate } from "../services/productSelectionCriteria";

const initialState = {
  commissionRate: "",
  price: "",
  reviewCount: "",
  reviewAverage: "",
  rankingPosition: "",
  isSeasonalNow: false,
  hasCoupon: false,
};

export default function ProductSelectionChecklist() {
  const [form, setForm] = useState(initialState);
  const [result, setResult] = useState(null);

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleCheck = () => {
    const parsed = {
      commissionRate: Number(form.commissionRate) || 0,
      price: Number(form.price) || 0,
      reviewCount: Number(form.reviewCount) || 0,
      reviewAverage: Number(form.reviewAverage) || 0,
      rankingPosition: Number(form.rankingPosition) || 999,
      isSeasonalNow: form.isSeasonalNow,
      hasCoupon: form.hasCoupon,
    };
    setResult(scoreProductCandidate(parsed));
  };

  const fields = [
    { key: "commissionRate", label: "報酬率（%）", type: "number" },
    { key: "price", label: "価格（円）", type: "number" },
    { key: "reviewCount", label: "レビュー件数", type: "number" },
    { key: "reviewAverage", label: "レビュー平均点（1〜5）", type: "number" },
    { key: "rankingPosition", label: "ジャンル内ランキング順位", type: "number" },
  ];

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: 16 }}>
      <h3 style={{ marginBottom: 12 }}>商品選定チェック</h3>

      {fields.map((f) => (
        <div key={f.key} style={{ marginBottom: 10 }}>
          <label style={{ display: "block", marginBottom: 4, fontSize: 14 }}>
            {f.label}
          </label>
          <input
            type={f.type}
            value={form[f.key]}
            onChange={(e) => update(f.key, e.target.value)}
            style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
          />
        </div>
      ))}

      <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <input
          type="checkbox"
          checked={form.isSeasonalNow}
          onChange={(e) => update("isSeasonalNow", e.target.checked)}
        />
        今の季節に需要がある
      </label>

      <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <input
          type="checkbox"
          checked={form.hasCoupon}
          onChange={(e) => update("hasCoupon", e.target.checked)}
        />
        クーポン／セール中
      </label>

      <button
        onClick={handleCheck}
        style={{
          padding: "10px 20px",
          borderRadius: 6,
          background: "#d4af37",
          color: "#fff",
          border: "none",
        }}
      >
        スコアを見る
      </button>

      {result && (
        <div
          style={{
            marginTop: 20,
            padding: 16,
            borderRadius: 8,
            background: "#fdf8ee",
            border: "1px solid #eee0c0",
          }}
        >
          <p style={{ fontSize: 20, fontWeight: "bold" }}>
            {result.score}点 — {result.verdict}
          </p>
          <ul style={{ marginTop: 8, paddingLeft: 20, fontSize: 14, color: "#555" }}>
            <li>報酬率: {result.breakdown.commission}点</li>
            <li>価格帯: {result.breakdown.priceRange}点</li>
            <li>レビュー実績: {result.breakdown.reviews}点</li>
            <li>ランキング: {result.breakdown.ranking}点</li>
            <li>季節性: {result.breakdown.seasonality}点</li>
            <li>クーポン/セール: {result.breakdown.promotion}点</li>
          </ul>
        </div>
      )}
    </div>
  );
}
