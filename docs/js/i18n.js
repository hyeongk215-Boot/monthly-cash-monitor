window.I18N = {
  ko: {
    appTitle: "자금집행 - 중국법인 자금현황 모니터링 시스템",
    langName: "한국어",
    navAdmin: "본사용: 관리자 화면",
    backBtn: "← 뒤로",

    indexHeading: "자금현황 조회",
    indexDesc: "법인/적용년도월과 접근키를 입력하면 해당 법인의 보유시재·차입금·배당가능금액을 조회할 수 있습니다.",
    corp: "법인",
    yearmonth: "적용년도월",
    accessKeyLabel: "접근키",
    selectPlaceholder: "선택하세요",
    startBtn: "조회하기",
    requiredWarning: "법인, 적용년도월, 접근키를 모두 입력해주세요.",
    invalidKey: "접근키가 올바르지 않습니다. 본사 담당자에게 확인해주세요.",
    keyMismatchBranch: "이 접근키는 {branch} 전용입니다. 법인 선택이 자동으로 변경되었습니다.",
    fetchFail: "조회에 실패했습니다. 접근키를 확인해주세요.",

    poolingBanner: "⚠ 이 법인은 캐시풀링(자금 통합관리) 적용 법인입니다. 표시되는 시재는 본사예치금 성격이며, 개별 은행잔고와 다를 수 있습니다.",

    cashHeading: "보유시재 현황",
    beginningCny: "기초잔액 (CNY)",
    cfNetChangeCny: "이번 달 CF 순증감 (CNY)",
    endingCny: "기말잔액 (CNY)",
    cashManualNote: "※ 본사에서 수기로 확정한 값입니다.",
    trendHeading: "최근 6개월 추이",
    colMonth: "년월",
    colEndingCny: "기말잔액 (CNY)",
    colChangeCny: "전월대비 증감 (CNY)",
    colChangePct: "증감률",
    noData: "-",

    loansHeading: "차입금 현황",
    colPrincipal: "원금 (CNY)",
    colBalance: "현재잔액 (CNY)",
    colInterestRate: "연이율 (%)",
    colStartDate: "실행일",
    colMaturityDate: "만기일",
    colNote: "비고",
    noLoans: "등록된 차입금이 없습니다.",

    dividendHeading: "배당가능금액",
    dividendDesc: "회계관리 재무상태표의 이익잉여금 계정 값을 그대로 표시합니다.",

    adminHeading: "[본사용] 자금집행 관리자 화면",
    adminDesc: "접근키(system_admin 또는 finance)로 법인별 보유시재를 확정/수정하고, 차입금을 관리하며, 전체 법인 통합현황을 확인할 수 있습니다.",
    adminKeyLabel: "접근키",
    adminCorp: "법인",
    adminYm: "년월",
    adminFetch: "불러오기",
    adminFetchFail: "조회에 실패했습니다. 접근키를 확인해주세요.",
    adminKeyRequired: "접근키를 먼저 입력해주세요.",

    cashSaveBtn: "이 값으로 확정저장",
    cashSaveSuccess: "저장되었습니다. 이 값이 다음 달 기초잔액이 됩니다.",
    cashSaveFail: "저장에 실패했습니다.",

    loanAddBtn: "+ 차입금 추가",
    loanEditBtn: "수정",
    loanDeleteBtn: "삭제",
    loanSaveBtn: "저장",
    loanCancelBtn: "취소",
    loanSaveSuccess: "저장되었습니다.",
    loanSaveFail: "저장에 실패했습니다.",
    loanDeleteConfirm: "이 차입금을 삭제하시겠습니까?",
    loanDeleteSuccess: "삭제되었습니다.",
    loanDeleteFail: "삭제에 실패했습니다.",

    aggHeading: "전체 법인 통합현황",
    colCorp: "법인",
    adminDownload: "통합현황 엑셀 다운로드",

    totalRows: "총 항목 수",
    rowNumberCol: "번호",
    fileNamePrefix: "자금현황"
  },
  zh: {
    appTitle: "资金执行 - 中国法人资金状况监控系统",
    langName: "中文",
    navAdmin: "总部用：管理员页面",
    backBtn: "← 返回",

    indexHeading: "资金状况查询",
    indexDesc: "请填写法人/适用年月及接入密钥，即可查询该法人的库存资金、借款及可分配利润。",
    corp: "法人",
    yearmonth: "适用年月",
    accessKeyLabel: "接入密钥",
    selectPlaceholder: "请选择",
    startBtn: "查询",
    requiredWarning: "请填写法人、适用年月和接入密钥。",
    invalidKey: "接入密钥不正确，请向总部负责人确认。",
    keyMismatchBranch: "该接入密钥仅限{branch}使用，已自动切换法人选择。",
    fetchFail: "查询失败，请检查接入密钥。",

    poolingBanner: "⚠ 该法人为现金池管理法人。显示的资金余额为总部存款性质，可能与实际银行余额不同。",

    cashHeading: "库存资金状况",
    beginningCny: "期初余额 (CNY)",
    cfNetChangeCny: "本月现金流净变动 (CNY)",
    endingCny: "期末余额 (CNY)",
    cashManualNote: "※ 该数值为总部手动确认的数值。",
    trendHeading: "近6个月趋势",
    colMonth: "年月",
    colEndingCny: "期末余额 (CNY)",
    colChangeCny: "较上月变动 (CNY)",
    colChangePct: "变动率",
    noData: "-",

    loansHeading: "借款情况",
    colPrincipal: "本金 (CNY)",
    colBalance: "当前余额 (CNY)",
    colInterestRate: "年利率 (%)",
    colStartDate: "起始日",
    colMaturityDate: "到期日",
    colNote: "备注",
    noLoans: "暂无借款记录。",

    dividendHeading: "可分配利润",
    dividendDesc: "直接显示会计管理资产负债表中未分配利润科目的数值。",

    adminHeading: "【总部用】资金执行管理员页面",
    adminDesc: "使用接入密钥（system_admin 或 finance）确认/修改各法人的库存资金，管理借款，并查看全法人汇总状况。",
    adminKeyLabel: "接入密钥",
    adminCorp: "法人",
    adminYm: "年月",
    adminFetch: "加载",
    adminFetchFail: "查询失败，请检查接入密钥。",
    adminKeyRequired: "请先输入接入密钥。",

    cashSaveBtn: "确认保存该数值",
    cashSaveSuccess: "已保存。该数值将作为下月期初余额。",
    cashSaveFail: "保存失败。",

    loanAddBtn: "+ 添加借款",
    loanEditBtn: "编辑",
    loanDeleteBtn: "删除",
    loanSaveBtn: "保存",
    loanCancelBtn: "取消",
    loanSaveSuccess: "已保存。",
    loanSaveFail: "保存失败。",
    loanDeleteConfirm: "确定要删除该借款吗？",
    loanDeleteSuccess: "已删除。",
    loanDeleteFail: "删除失败。",

    aggHeading: "全法人汇总状况",
    colCorp: "法人",
    adminDownload: "下载汇总状况Excel",

    totalRows: "总项目数",
    rowNumberCol: "编号",
    fileNamePrefix: "资金状况"
  }
};

window.getLang = function () {
  return localStorage.getItem("appLang") || "ko";
};
window.setLang = function (lang) {
  localStorage.setItem("appLang", lang);
  applyI18n();
  document.dispatchEvent(new CustomEvent("langchange"));
};
window.t = function (key, vars) {
  var lang = getLang();
  var dict = window.I18N[lang] || window.I18N.ko;
  var str = dict[key] || window.I18N.ko[key] || key;
  if (vars) {
    Object.keys(vars).forEach(function (k) {
      str = str.split("{" + k + "}").join(vars[k]);
    });
  }
  return str;
};
window.applyI18n = function () {
  document.documentElement.lang = getLang();
  document.querySelectorAll("[data-i18n]").forEach(function (el) {
    el.textContent = t(el.getAttribute("data-i18n"));
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
    el.placeholder = t(el.getAttribute("data-i18n-placeholder"));
  });
  document.title = t("appTitle");
  document.querySelectorAll(".lang-btn").forEach(function (btn) {
    btn.classList.toggle("active", btn.dataset.lang === getLang());
  });
};
document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll(".lang-btn").forEach(function (btn) {
    btn.addEventListener("click", function () { setLang(btn.dataset.lang); });
  });
  applyI18n();
});
