window.I18N = {
  ko: {
    appTitle: "자금집행 - 중국법인 자금현황 모니터링 시스템",
    langName: "한국어",
    navAdmin: "본사용: 관리자 화면",
    navDashboard: "← 통합 대시보드",
    backBtn: "← 뒤로",

    moduleName: "자금집행",
    navSecMain: "조회",
    navSecAdmin: "관리",
    navQuery: "자금현황 조회",
    navCash: "자금 현황",
    navAdminShort: "관리자 화면",

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

    // 산출근거 / 대사(對査)
    reconHeading: "산출근거 및 BS·CF 대사",
    reconDesc: "기초·기말잔액은 지점이 제출한 재무상태표(BS)의 현금성자산(현금+은행예금+기타화폐성자산), 순증감은 현금흐름표의 CF-56에서 가져옵니다. 본사 수기 확정값은 참고용이며 계산에 쓰지 않습니다.",
    colSource: "산출근거",
    srcBsPrev: "전월 BS",
    srcCfOpening: "당월 CF 기초(CF-58+60)",
    srcNone: "자료없음",
    srcCf56: "CF-56",
    srcCalc: "유입−유출+환율",
    colBsBeginning: "전월 BS 현금 (CNY)",
    colBsEnding: "당월 BS 현금 (CNY)",
    colCfOpening: "CF 기초 (CF-58+60)",
    colCfEnding: "CF 기말 (CF-57+59)",
    colCfNet: "CF 순증감 (CF-56)",
    colCfCalc: "검산 (유입−유출+환율)",
    colComputedEnding: "기초+순증감 (CNY)",
    colDiffOpening: "기초 차이",
    colDiffEnding: "기말 차이",
    colDiffIdentity: "항등식 차이",
    colDiffCfNet: "CF 검산차이",
    colOffice: "지점",
    colStatus: "상태",
    officeTotal: "법인 합계",
    notSubmitted: "미제출",
    bsNotSubmitted: "BS 미제출",
    cfNotSubmitted: "CF 미제출",
    statusOk: "일치",
    statusMismatch: "불일치",
    statusPending: "판정보류",
    manualEndingCny: "본사 수기확정 (참고)",
    manualDiffNote: "※ 본사 수기확정값이 BS 기말과 {diff} 만큼 다릅니다.",
    reconAllOk: "이번 달은 모든 법인의 BS와 CF가 일치합니다.",
    reconHint: "차이가 0이 아닌 행은 BS와 CF가 서로 다른 말을 하고 있다는 뜻입니다. 해당 지점에 확인이 필요합니다. 한쪽이 아직 미제출이면 판정을 보류합니다.",

    dividendHeading: "배당가능금액",
    dividendDesc: "직전 사업연도말 기준 이익잉여금(미분배이익잉여금 + 당기순이익)입니다. 세무·외환 절차 전 이론치이며 실제 송금가능액과 다릅니다.",
    dividendBase: "기준시점",
    dividendSource: "읽은 BS",
    dividendMethodDirect: "기준월 BS 직접 조회",
    dividendMethodBackcast: "{ym} BS에서 역산",
    dividendMethodNodata: "BS 자료 없음",
    dividendBackcastNote: "기준월({base}) BS가 아직 입력되지 않아 {src} 자료로 역산했습니다. 역산식: {src} BS(미분배이익잉여금 + 당기순이익) − PL 당기순이익 누계.",
    dividendRetained: "미분배이익잉여금",
    dividendNetIncome: "당기순이익",
    dividendPlCum: "(−) PL 순이익 누계",
    dividendAccountMissing: "⚠ 이익잉여금 계정을 찾을 수 없습니다. 회계관리에서 계정과목이 교체된 것 같습니다. 본사 담당자에게 알려주세요.",
    dividendCarried: "전년 결산 결전 완료",
    dividendNotCarried: "전년 결산 결전 전",
    dividendCarryUnknown: "결전 여부 확인 불가",

    adminHeading: "[본사용] 자금집행 관리자 화면",
    adminDesc: "접근키(system_admin 또는 finance)로 법인별 보유시재를 확정/수정하고, 차입금을 관리하며, 전체 법인 통합현황을 확인할 수 있습니다.",
    adminKeyLabel: "접근키",
    adminCorp: "법인",
    adminYm: "년월",
    adminFetch: "불러오기",
    adminFetchFail: "조회에 실패했습니다. 접근키를 확인해주세요.",
    adminKeyRequired: "접근키를 먼저 입력해주세요.",

    cashSaveBtn: "이 값으로 확정저장",
    cashSaveSuccess: "저장되었습니다. 기초/기말잔액은 지점이 제출한 BS에서 계산되며, 이 값은 참고기록으로만 남습니다.",
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
    navDashboard: "← 开始页面",
    backBtn: "← 返回",

    moduleName: "资金执行",
    navSecMain: "查询",
    navSecAdmin: "管理",
    navQuery: "资金状况查询",
    navCash: "资金状况",
    navAdminShort: "管理员页面",

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

    // 计算依据 / 对账
    reconHeading: "计算依据及资产负债表·现金流量表对账",
    reconDesc: "期初·期末余额取自各分公司提交的资产负债表(BS)货币资金(现金+银行存款+其他货币资金)，净变动取自现金流量表第56行。总部手动确认值仅供参考，不参与计算。",
    colSource: "计算依据",
    srcBsPrev: "上月BS",
    srcCfOpening: "本月CF期初(第58+60行)",
    srcNone: "无资料",
    srcCf56: "CF第56行",
    srcCalc: "流入−流出+汇率",
    colBsBeginning: "上月BS货币资金 (CNY)",
    colBsEnding: "本月BS货币资金 (CNY)",
    colCfOpening: "CF期初 (第58+60行)",
    colCfEnding: "CF期末 (第57+59行)",
    colCfNet: "CF净变动 (第56行)",
    colCfCalc: "验算 (流入−流出+汇率)",
    colComputedEnding: "期初+净变动 (CNY)",
    colDiffOpening: "期初差异",
    colDiffEnding: "期末差异",
    colDiffIdentity: "恒等式差异",
    colDiffCfNet: "CF验算差异",
    colOffice: "分公司",
    colStatus: "状态",
    officeTotal: "法人合计",
    notSubmitted: "未提交",
    bsNotSubmitted: "BS未提交",
    cfNotSubmitted: "CF未提交",
    statusOk: "一致",
    statusMismatch: "不一致",
    statusPending: "暂缓判定",
    manualEndingCny: "总部手动确认 (参考)",
    manualDiffNote: "※ 总部手动确认值与BS期末相差 {diff}。",
    reconAllOk: "本月全部法人的BS与CF一致。",
    reconHint: "差异不为0的行表示BS与CF口径不符，需向该分公司确认。若有一方尚未提交，则暂缓判定。",

    dividendHeading: "可分配利润",
    dividendDesc: "按上一会计年度末计算的留存收益（未分配利润 + 本年利润）。这是办理税务·外汇手续前的理论值，与实际可汇出金额不同。",
    dividendBase: "基准时点",
    dividendSource: "所取BS",
    dividendMethodDirect: "直接读取基准月BS",
    dividendMethodBackcast: "由{ym}的BS倒推",
    dividendMethodNodata: "无BS资料",
    dividendBackcastNote: "基准月({base})的BS尚未录入，因此依据{src}的资料倒推。倒推公式：{src} BS(未分配利润 + 本年利润) − PL净利润累计。",
    dividendRetained: "未分配利润",
    dividendNetIncome: "本年利润",
    dividendPlCum: "(−) PL净利润累计",
    dividendAccountMissing: "⚠ 未找到留存收益科目。会计管理的科目表可能已更换，请通知总部负责人。",
    dividendCarried: "上年度已结转",
    dividendNotCarried: "上年度尚未结转",
    dividendCarryUnknown: "无法确认结转状态",

    adminHeading: "【总部用】资金执行管理员页面",
    adminDesc: "使用接入密钥（system_admin 或 finance）确认/修改各法人的库存资金，管理借款，并查看全法人汇总状况。",
    adminKeyLabel: "接入密钥",
    adminCorp: "法人",
    adminYm: "年月",
    adminFetch: "加载",
    adminFetchFail: "查询失败，请检查接入密钥。",
    adminKeyRequired: "请先输入接入密钥。",

    cashSaveBtn: "确认保存该数值",
    cashSaveSuccess: "已保存。期初/期末余额依据各分公司提交的BS计算，该数值仅作为参考记录保留。",
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
