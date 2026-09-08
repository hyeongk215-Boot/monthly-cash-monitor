// ===== 이 파일만 수정하면 됩니다 =====
window.APP_CONFIG = {
  // 관리부 ERP 전용 Supabase 프로젝트 (회계관리/예산관리와 동일, 접대비와는 별도).
  SUPABASE_URL: "https://pobpxmqobeqrvuncobnh.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_bMGDHv8z9Shw1IJ39Wj10w_0O3G2g6U",

  // 법인 목록 (회계관리 config.js와 동일)
  CORPORATIONS: [
    { ko: "YJC 포워딩", zh: "裕佳昌 货代" },
    { ko: "상해물류센터", zh: "上海 物流中心" },
    { ko: "흥아물류", zh: "兴亚物流" },
    { ko: "윤봉물류", zh: "润峰物流" },
    { ko: "청도 CY", zh: "青岛 CY" },
    { ko: "창씽 CY", zh: "长兴 CY" }
  ],

  // 캐시풀링(매일 마감 후 은행잔고가 본사로 자동 송금) 적용 법인 - ko 값 기준
  CASH_POOLED_CORPORATIONS: ["YJC 포워딩", "흥아물류"]
};
