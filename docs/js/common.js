// 공통 유틸 함수 모음 (회계관리/예산관리 docs/js/common.js 구조를 재사용/축소)

// ===== Supabase 클라이언트 =====
window.getSupabaseClient = function () {
  var cfg = window.APP_CONFIG;
  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) return null;
  if (!window._supabaseClient) {
    window._supabaseClient = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  }
  return window._supabaseClient;
};

window.MIN_YEARMONTH = "2024-01";

window.generateYearMonths = function (back, forward) {
  back = back == null ? 36 : back;
  forward = forward == null ? 1 : forward;
  var now = new Date();
  var list = [];
  for (var i = -back; i <= forward; i++) {
    var d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    var ym = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
    if (ym < window.MIN_YEARMONTH) continue;
    list.push(ym);
  }
  return list.reverse();
};

window.defaultYearMonth = function () {
  var now = new Date();
  var d = new Date(now.getFullYear(), now.getMonth() - 1, 1); // 전월
  var ym = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
  return ym < window.MIN_YEARMONTH ? window.MIN_YEARMONTH : ym;
};

// "YYYY-MM" 이전 N개월 문자열 목록 (최신월이 마지막)
window.pastYearMonths = function (yearmonth, count) {
  var parts = yearmonth.split("-").map(Number);
  var list = [];
  for (var i = count - 1; i >= 0; i--) {
    var d = new Date(parts[0], parts[1] - 1 - i, 1);
    list.push(d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"));
  }
  return list;
};

// ===== 법인 라벨 =====
function findByKo(list, koValue) {
  for (var i = 0; i < list.length; i++) {
    if (list[i].ko === koValue) return list[i];
  }
  return null;
}
window.corpLabel = function (koValue, lang) {
  var item = findByKo(window.APP_CONFIG.CORPORATIONS, koValue);
  if (!item) return koValue;
  return item[lang || getLang()] || item.ko;
};

window.isCashPooled = function (koValue) {
  return (window.APP_CONFIG.CASH_POOLED_CORPORATIONS || []).indexOf(koValue) !== -1;
};

// ===== 세션 컨텍스트 (법인/년월/접근키/역할) =====
window.saveContext = function (ctx) {
  sessionStorage.setItem("fundContext", JSON.stringify(ctx));
};
window.loadContext = function () {
  var raw = sessionStorage.getItem("fundContext");
  return raw ? JSON.parse(raw) : null;
};
window.clearContext = function () {
  sessionStorage.removeItem("fundContext");
};

window.downloadWorkbook = function (wb, filename) {
  XLSX.writeFile(wb, filename);
};

// ===== 배당 기준시점 후보 (사업연도말) =====
// 배당 결의는 직전 사업연도말 이익잉여금이 기준입니다. MIN_YEARMONTH(2024-01)부터
// 작년까지의 12월을 후보로 내놓고, 직전 연도를 기본값으로 씁니다.
window.fiscalYearEnds = function () {
  var minYear = Number(window.MIN_YEARMONTH.split("-")[0]);
  var lastYear = new Date().getFullYear() - 1;
  var list = [];
  for (var y = lastYear; y >= minYear; y--) list.push(y + "-12");
  return list;
};
window.defaultFiscalYearEnd = function () {
  return window.fiscalYearEnds()[0] || window.MIN_YEARMONTH;
};

// ===== 대사(對査) 표시 유틸 =====
// null과 0을 반드시 구분합니다. null은 "아직 안 냈다", 0은 "냈는데 0"이고,
// 이 둘을 같은 "-"로 뭉개면 미제출 지점이 잔액 0인 지점처럼 보입니다.
window.fundFmt = function (n) {
  if (n === null || n === undefined || n === "") return "-";
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
};

// 금액 오차 허용치. 지점들이 소수점 둘째 자리까지 입력하므로 1전(0.01) 미만은
// 반올림 차이로 보고 일치로 봅니다.
window.FUND_TOLERANCE = 0.01;
window.fundIsZero = function (v) {
  return v !== null && v !== undefined && Math.abs(Number(v)) < window.FUND_TOLERANCE;
};

// 차이값 한 칸: 0이면 초록, 0이 아니면 빨강, 판정불가(null)면 회색 "판정보류"
window.fundDiffCell = function (v) {
  if (v === null || v === undefined) {
    return "<span class='diff-na'>" + t("statusPending") + "</span>";
  }
  var cls = window.fundIsZero(v) ? "diff-ok" : "diff-bad";
  var sign = Number(v) > 0 ? "+" : "";
  return "<span class='" + cls + "'>" + sign + window.fundFmt(v) + "</span>";
};

window.fundSourceLabel = function (src) {
  if (src === "bs_prev") return t("srcBsPrev");
  if (src === "cf_opening") return t("srcCfOpening");
  if (src === "cf56") return t("srcCf56");
  if (src === "calc") return t("srcCalc");
  return t("srcNone");
};

// 한 행의 종합 상태. 미제출이 있으면 판정을 보류하고, 무엇이 빠졌는지 알려줍니다.
window.fundRowStatus = function (row) {
  if (!row.bsSubmitted && !row.cfSubmitted) {
    return { text: t("notSubmitted"), cls: "badge-none", bad: false };
  }
  if (!row.bsSubmitted) return { text: t("bsNotSubmitted"), cls: "badge-important", bad: false };
  if (!row.cfSubmitted) return { text: t("cfNotSubmitted"), cls: "badge-important", bad: false };

  var diffs = [row.diffIdentity, row.diffOpening, row.diffEnding];
  var known = diffs.filter(function (d) { return d !== null && d !== undefined; });
  if (!known.length) return { text: t("statusPending"), cls: "badge-none", bad: false };
  var bad = known.some(function (d) { return !window.fundIsZero(d); });
  return bad
    ? { text: t("statusMismatch"), cls: "badge-special", bad: true }
    : { text: t("statusOk"), cls: "badge-general", bad: false };
};

// ===== 테마(라이트/다크) 토글 =====
// 깜빡임을 막기 위해 <head>의 인라인 스크립트가 data-theme를 먼저 설정하고, 여기서는
// 사이드바의 #themeToggle 버튼에 아이콘과 클릭 동작만 붙입니다.
(function () {
  var MOON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  var SUN = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';

  window.isDarkTheme = function () {
    return document.documentElement.getAttribute("data-theme") === "dark";
  };
  window.applyTheme = function (dark) {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    localStorage.setItem("erpTheme", dark ? "dark" : "light");
    var btn = document.getElementById("themeToggle");
    if (btn) btn.innerHTML = dark ? SUN : MOON;
    document.dispatchEvent(new CustomEvent("themechange", { detail: { dark: dark } }));
  };

  document.addEventListener("DOMContentLoaded", function () {
    var btn = document.getElementById("themeToggle");
    if (!btn) return;
    btn.innerHTML = window.isDarkTheme() ? SUN : MOON;
    btn.addEventListener("click", function () { window.applyTheme(!window.isDarkTheme()); });
  });
})();
