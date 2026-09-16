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
