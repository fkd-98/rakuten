// productSelectionCriteria.js
// 「売れる商品の見つけ方」を数値化する選定ロジック
// 楽天市場の商品ページ・楽天ランキングで確認できる情報をもとにスコアリングする

/**
 * @typedef {Object} ProductCandidate
 * @property {number} commissionRate - アフィリエイト報酬率（%）
 * @property {number} price - 商品価格（円）
 * @property {number} reviewCount - レビュー件数
 * @property {number} reviewAverage - レビュー平均点（1〜5）
 * @property {number} rankingPosition - ジャンル内ランキング順位（低いほど良い、圏外は999など）
 * @property {boolean} isSeasonalNow - 今の季節に需要があるか
 * @property {boolean} hasCoupon - クーポン/セール中か
 */

/**
 * 商品候補をスコアリングする（100点満点の目安）
 * @param {ProductCandidate} product
 * @returns {{ score: number, breakdown: Record<string, number>, verdict: string }}
 */
export function scoreProductCandidate(product) {
  const breakdown = {};

  // 1. 報酬率（最大25点）: 楽天は1%前後の商品も多いので、3%以上を高評価の基準に
  breakdown.commission =
    product.commissionRate >= 8 ? 25 :
    product.commissionRate >= 5 ? 20 :
    product.commissionRate >= 3 ? 12 :
    product.commissionRate >= 1 ? 5 : 0;

  // 2. 価格帯（最大20点）: 衝動買いされやすい1,500〜6,000円あたりを高評価
  breakdown.priceRange =
    product.price >= 1500 && product.price <= 6000 ? 20 :
    product.price > 6000 && product.price <= 12000 ? 12 :
    product.price < 1500 ? 8 : 5;

  // 3. レビュー実績（最大20点）: 件数×評価で「売れている実績」を見る
  const reviewScore =
    product.reviewCount >= 500 ? 12 :
    product.reviewCount >= 100 ? 9 :
    product.reviewCount >= 20 ? 5 : 1;
  const ratingBonus = product.reviewAverage >= 4.3 ? 8 : product.reviewAverage >= 4.0 ? 5 : 0;
  breakdown.reviews = reviewScore + ratingBonus;

  // 4. ランキング順位（最大15点）: ジャンル内での注目度
  breakdown.ranking =
    product.rankingPosition <= 10 ? 15 :
    product.rankingPosition <= 50 ? 10 :
    product.rankingPosition <= 200 ? 5 : 0;

  // 5. 季節性（最大10点）
  breakdown.seasonality = product.isSeasonalNow ? 10 : 3;

  // 6. クーポン/セール（最大10点）: 投稿の「今すぐ買う理由」になる
  breakdown.promotion = product.hasCoupon ? 10 : 2;

  const score = Object.values(breakdown).reduce((sum, v) => sum + v, 0);

  const verdict =
    score >= 75 ? "◎ 積極的に投稿すべき商品" :
    score >= 55 ? "○ 投稿候補として有力" :
    score >= 35 ? "△ 他の要素と組み合わせれば可" :
    "✕ 優先度は低い";

  return { score, breakdown, verdict };
}

/**
 * 複数の商品候補をスコア順にランキングする
 * @param {ProductCandidate[]} products
 */
export function rankProductCandidates(products) {
  return products
    .map((p) => ({ product: p, ...scoreProductCandidate(p) }))
    .sort((a, b) => b.score - a.score);
}
