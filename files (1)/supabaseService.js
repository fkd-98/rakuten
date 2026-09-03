// supabaseService.js
// 商品情報＋生成済み投稿をSupabaseのproducts/postsテーブルに保存する
//
// ※ 既存のsupabaseClient.jsをそのままimportして使う想定です。
//   パスやexport方法が違う場合は1行目のimportだけ調整してください。
// ※ カラム名は既存の5テーブル構成（products, posts, post_schedules,
//   post_results, affiliate_performance）を踏まえた一般的な想定です。
//   実際のカラム名と違う場合は教えてください、合わせて修正します。

import { supabase } from "../lib/supabaseClient";

/**
 * 商品を保存し、生成済み投稿(Threads/Room)もセットで保存する
 * @param {{
 *   productName: string,
 *   category: string,
 *   features: string[],
 *   priceRangeHint: string,
 *   memo: string,
 *   imageUrl?: string
 * }} productInfo
 * @param {{ threadsPost: string, roomDescription: string }} generatedPost
 * @returns {Promise<{ productId: string, postId: string }>}
 */
export async function saveProductAndPost(productInfo, generatedPost) {
  // 1. 商品を保存
  const { data: productData, error: productError } = await supabase
    .from("products")
    .insert({
      name: productInfo.productName,
      category: productInfo.category,
      features: productInfo.features,
      price_range_hint: productInfo.priceRangeHint,
      pain_point_memo: productInfo.memo,
      image_url: productInfo.imageUrl ?? null,
    })
    .select()
    .single();

  if (productError) {
    throw new Error(`商品の保存に失敗しました: ${productError.message}`);
  }

  // 2. 投稿を保存
  const { data: postData, error: postError } = await supabase
    .from("posts")
    .insert({
      product_id: productData.id,
      threads_content: generatedPost.threadsPost,
      room_content: generatedPost.roomDescription,
      status: "draft", // 生成直後は下書き扱い。確認後に'ready'等へ更新する想定
    })
    .select()
    .single();

  if (postError) {
    throw new Error(`投稿の保存に失敗しました: ${postError.message}`);
  }

  return { productId: productData.id, postId: postData.id };
}
