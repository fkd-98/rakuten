// postingScheduleGuard.js
// スレッズのアカウントを守るための「投稿間隔・投稿比率」チェックロジック
// post_schedulesテーブルの既存投稿履歴と照らし合わせて使う想定

/**
 * @typedef {Object} ScheduledPost
 * @property {string} postedAt - ISO日時文字列
 * @property {"affiliate" | "non_affiliate"} type - アフィリエイト投稿か非アフィ投稿か
 */

const RULES = {
  minIntervalMinutes: 90, // 同一アカウントでの最短投稿間隔（分）
  maxPostsPerDay: 6, // 1日の最大投稿数
  maxAffiliatePostsPerDay: 2, // 1日の最大アフィ投稿数
  minNonAffiliateRatio: 0.5, // 非アフィ投稿の最低比率（1日単位）
};

/**
 * 新しい投稿を今すぐ・この種類で投稿してよいかチェックする
 * @param {ScheduledPost[]} todaysPosts - 今日すでに投稿済みの一覧（新しい順でなくてOK）
 * @param {"affiliate" | "non_affiliate"} newPostType - これから投稿するタイプ
 * @param {Date} [now] - 判定基準時刻（テスト用、省略時は現在時刻）
 * @returns {{ ok: boolean, reasons: string[], suggestedEarliestTime: Date | null }}
 */
export function checkPostingSafety(todaysPosts, newPostType, now = new Date()) {
  const reasons = [];

  // 1. 直近投稿からの間隔チェック
  const sorted = [...todaysPosts].sort(
    (a, b) => new Date(b.postedAt) - new Date(a.postedAt)
  );
  const lastPost = sorted[0];
  let suggestedEarliestTime = null;

  if (lastPost) {
    const diffMinutes = (now - new Date(lastPost.postedAt)) / 60000;
    if (diffMinutes < RULES.minIntervalMinutes) {
      reasons.push(
        `直近の投稿から${Math.round(diffMinutes)}分しか経っていません（最短${RULES.minIntervalMinutes}分あける）`
      );
      suggestedEarliestTime = new Date(
        new Date(lastPost.postedAt).getTime() + RULES.minIntervalMinutes * 60000
      );
    }
  }

  // 2. 1日の投稿数チェック
  if (todaysPosts.length >= RULES.maxPostsPerDay) {
    reasons.push(`今日すでに${todaysPosts.length}件投稿済みです（上限${RULES.maxPostsPerDay}件）`);
  }

  // 3. アフィリエイト投稿数チェック
  const affiliateCount = todaysPosts.filter((p) => p.type === "affiliate").length;
  if (newPostType === "affiliate" && affiliateCount >= RULES.maxAffiliatePostsPerDay) {
    reasons.push(
      `今日のアフィリエイト投稿は上限（${RULES.maxAffiliatePostsPerDay}件）に達しています`
    );
  }

  // 4. 非アフィ比率チェック（アフィ投稿しようとしている場合のみ警告）
  const totalAfterThis = todaysPosts.length + 1;
  const affiliateAfterThis = affiliateCount + (newPostType === "affiliate" ? 1 : 0);
  const nonAffiliateRatioAfterThis = 1 - affiliateAfterThis / totalAfterThis;
  if (newPostType === "affiliate" && nonAffiliateRatioAfterThis < RULES.minNonAffiliateRatio) {
    reasons.push(
      `アフィ投稿の比率が高くなりすぎます（非アフィ比率が${Math.round(
        nonAffiliateRatioAfterThis * 100
      )}%に低下）。先に日常投稿を挟むのがおすすめです`
    );
  }

  return { ok: reasons.length === 0, reasons, suggestedEarliestTime };
}

/**
 * 1日の投稿スケジュール案を生成する（朝・昼・夜に分散、アフィと非アフィを混在）
 * @param {number} affiliateCount - 今日投稿したいアフィ投稿数
 * @param {number} nonAffiliateCount - 今日投稿したい非アフィ投稿数
 * @param {Date} [baseDate] - 基準日（省略時は今日）
 * @returns {{ time: string, type: "affiliate" | "non_affiliate" }[]}
 */
export function suggestDailySchedule(affiliateCount, nonAffiliateCount, baseDate = new Date()) {
  const slots = [
    { hour: 7, label: "朝" },
    { hour: 12, label: "昼" },
    { hour: 18, label: "夕方" },
    { hour: 21, label: "夜" },
  ];

  const posts = [
    ...Array(affiliateCount).fill("affiliate"),
    ...Array(nonAffiliateCount).fill("non_affiliate"),
  ];

  // アフィと非アフィが連続しすぎないよう交互寄りに並べ替え
  posts.sort((a, b) => (a === b ? 0 : a === "non_affiliate" ? -1 : 1));

  return posts.slice(0, slots.length).map((type, i) => {
    const d = new Date(baseDate);
    d.setHours(slots[i].hour, 0, 0, 0);
    return { time: `${slots[i].label}（${slots[i].hour}:00頃）`, type };
  });
}
