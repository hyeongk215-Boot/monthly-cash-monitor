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

  function renderCash(pos) {
    document.getElementById("beginningCny").textContent = fmt(pos.beginningCny);
    document.getElementById("cfNetChangeCny").textContent = fmt(pos.cfNetChangeCny);
    document.getElementById("endingCny").textContent = fmt(pos.endingCny);
    document.getElementById("cashManualNote").style.display = pos.isManual ? "block" : "none";
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

    client.rpc("get_dividend_available", { p_access_key: ctx.accessKey, p_corp: ctx.corp, p_yearmonth: ctx.yearmonth }).then(function (res) {
      if (res.error) throw res.error;
      document.getElementById("dividendValue").textContent = fmt(res.data) + " CNY";
    }).catch(function () { showToast(t("fetchFail")); });
  }

  document.addEventListener("DOMContentLoaded", function () {
    loadAll();
    document.addEventListener("langchange", renderContextBar);
  });
})();
