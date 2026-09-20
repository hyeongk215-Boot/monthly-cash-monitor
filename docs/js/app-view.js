(function () {
  var ctx = window.loadContext();
  if (!ctx) {
    window.location.href = "index.html";
    return;
  }

  function showToast(msg) {
    var el = document.getElementById("toast");
    el.textContent = msg;
    el.classList.add("show");
    setTimeout(function () { el.classList.remove("show"); }, 3000);
  }

  function fmt(n) {
    return Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
  }

  function renderContextBar() {
    var el = document.getElementById("contextBar");
    el.innerHTML =
      "<span><b>" + t("corp") + "</b>: " + window.corpLabel(ctx.corp) + "</span>" +
      "<span><b>" + t("yearmonth") + "</b>: " + ctx.yearmonth + "</span>";
    document.getElementById("poolingBanner").style.display = window.isCashPooled(ctx.corp) ? "block" : "none";
  }

  // 숫자 아래에 그 값이 어디서 왔는지 작게 붙입니다. 기초잔액이 0으로 보일 때
  // "전월 BS 미제출이라 0"인지 "실제로 0"인지 화면에서 바로 구분되게 하려는 것입니다.
  function withSource(value, source) {
    return window.fundFmt(value) + "<span class='src-tag'>" + window.fundSourceLabel(source) + "</span>";
  }

  function renderCash(pos) {
    document.getElementById("beginningCny").innerHTML = withSource(pos.beginningCny, pos.beginningSource);
    document.getElementById("cfNetChangeCny").innerHTML = withSource(pos.cfNetChangeCny, pos.netSource);
    document.getElementById("endingCny").textContent = window.fundFmt(pos.endingCny);
    document.getElementById("cashManualNote").style.display = pos.isManual ? "block" : "none";
    renderRecon(pos);
  }

  // 산출근거 한 줄 + 일치 여부 칩 3개.
  // 지점 담당자가 "이 숫자 어디서 나왔지?"를 본사에 묻지 않고 스스로 확인할 수 있게 하고,
  // BS와 CF가 어긋나면 본사가 지적하기 전에 지점이 먼저 알아채게 하려는 것입니다.
  function renderRecon(pos) {
    var body = document.getElementById("reconBody");
    body.innerHTML = "";
    var tr = document.createElement("tr");
    tr.innerHTML =
      "<td class='num'>" + window.fundFmt(pos.bsBeginningCny) + "</td>" +
      "<td class='num'>" + window.fundFmt(pos.cfOpeningCny) + "</td>" +
      "<td class='num'>" + window.fundFmt(pos.cfNetReportedCny) + "</td>" +
      "<td class='num'>" + window.fundFmt(pos.cfNetCalcCny) + "</td>" +
      "<td class='num'>" + window.fundFmt(pos.bsEndingCny) + "</td>" +
      "<td class='num'>" + window.fundFmt(pos.cfEndingCny) + "</td>";
    body.appendChild(tr);

    var checks = [
      { label: t("colDiffOpening"), value: pos.diffOpening },
      { label: t("colDiffEnding"), value: pos.diffEnding },
      { label: t("colDiffIdentity"), value: pos.diffIdentity },
      { label: t("colDiffCfNet"), value: pos.diffCfNet }
    ];
    var grid = document.getElementById("reconStatus");
    grid.innerHTML = "";
    checks.forEach(function (c) {
      var div = document.createElement("div");
      // 판정보류(null)는 미제출이라 아직 맞다 틀리다 말할 수 없는 상태입니다.
      // 초록으로 칠하면 "확인됨"으로 오해하므로 중립으로 둡니다.
      var cls = c.value === null || c.value === undefined ? ""
        : (window.fundIsZero(c.value) ? "ok" : "missing");
      div.className = "status-chip " + cls;
      div.innerHTML = c.label + ": " + window.fundDiffCell(c.value);
      grid.appendChild(div);
    });
  }

  function trendArrow(change) {
    if (change > 0) return "<span class='trend-up'>▲</span>";
    if (change < 0) return "<span class='trend-down'>▼</span>";
    return "<span class='trend-flat'>-</span>";
  }

  function renderTrend(rows) {
    var body = document.getElementById("trendBody");
    body.innerHTML = "";
    rows.forEach(function (row, i) {
      var prev = i > 0 ? rows[i - 1] : null;
      var change = prev ? row.endingCny - prev.endingCny : null;
      var pct = (prev && prev.endingCny) ? (change / prev.endingCny * 100) : null;
      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" + row.yearmonth + "</td>" +
        "<td>" + fmt(row.endingCny) + "</td>" +
        "<td>" + (change === null ? t("noData") : trendArrow(change) + " " + fmt(Math.abs(change))) + "</td>" +
        "<td>" + (pct === null ? t("noData") : pct.toFixed(1) + "%") + "</td>";
      body.appendChild(tr);
    });
  }

  function renderLoans(loans) {
    var body = document.getElementById("loansBody");
    body.innerHTML = "";
    if (!loans.length) {
      var tr = document.createElement("tr");
      tr.innerHTML = "<td colspan='6' style='color:var(--muted);'>" + t("noLoans") + "</td>";
      body.appendChild(tr);
      return;
    }
    loans.forEach(function (l) {
      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" + fmt(l.principalCny) + "</td>" +
        "<td>" + fmt(l.balanceCny) + "</td>" +
        "<td>" + (l.interestRate != null ? l.interestRate : "-") + "</td>" +
        "<td>" + (l.startDate || "-") + "</td>" +
        "<td>" + (l.maturityDate || "-") + "</td>" +
        "<td>" + (l.note || "") + "</td>";
      body.appendChild(tr);
    });
  }

  function renderDividend(d) {
    document.getElementById("dividendValue").textContent = window.fundFmt(d.dividendAvailableCny) + " CNY";
    document.getElementById("dividendRetained").textContent = window.fundFmt(d.retainedCny);
    document.getElementById("dividendNetIncome").textContent = window.fundFmt(d.netIncomeCny);

    var notes = [];
    if (d.accountMissing) notes.push(t("dividendAccountMissing"));
    if (d.method === "backcast") {
      notes.push(t("dividendBackcastNote", { base: d.baseYearmonth, src: d.sourceYearmonth }));
    } else if (d.method === "nodata") {
      notes.push(t("dividendMethodNodata"));
    }
    var box = document.getElementById("dividendNote");
    box.innerHTML = notes.join("<br>");
    box.style.display = notes.length ? "block" : "none";
  }

  function loadAll() {
    var client = window.getSupabaseClient();
    if (!client) {
      showToast(t("fetchFail"));
      return;
    }
    renderContextBar();

    client.rpc("get_cash_position", { p_access_key: ctx.accessKey, p_corp: ctx.corp, p_yearmonth: ctx.yearmonth }).then(function (res) {
      if (res.error) throw res.error;
      renderCash(res.data);
    }).catch(function () { showToast(t("fetchFail")); });

    var months = window.pastYearMonths(ctx.yearmonth, 6);
    Promise.all(months.map(function (ym) {
      return client.rpc("get_cash_position", { p_access_key: ctx.accessKey, p_corp: ctx.corp, p_yearmonth: ym }).then(function (res) {
        if (res.error) throw res.error;
        return { yearmonth: ym, endingCny: res.data.endingCny };
      });
    })).then(renderTrend).catch(function () { showToast(t("fetchFail")); });

    client.rpc("get_loans", { p_access_key: ctx.accessKey, p_corp: ctx.corp }).then(function (res) {
      if (res.error) throw res.error;
      renderLoans(res.data || []);
    }).catch(function () { showToast(t("fetchFail")); });

    // 배당 기준은 조회 중인 달이 아니라 직전 사업연도말입니다(배당 결의가 그 기준이라서).
    // 그 달의 BS가 아직 없으면 RPC가 최초 제출월에서 역산하고, 어떻게 구했는지 알려줍니다.
    client.rpc("get_dividend_detail", {
      p_access_key: ctx.accessKey, p_corp: ctx.corp, p_base_yearmonth: window.defaultFiscalYearEnd()
    }).then(function (res) {
      if (res.error) throw res.error;
      renderDividend(res.data || {});
    }).catch(function () { showToast(t("fetchFail")); });
  }

  document.addEventListener("DOMContentLoaded", function () {
    loadAll();
    document.addEventListener("langchange", renderContextBar);
  });
})();
