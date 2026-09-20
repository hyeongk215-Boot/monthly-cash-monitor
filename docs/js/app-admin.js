(function () {
  var currentLoans = [];
  var aggRows = [];
  var reconData = { corpRows: [], officeRows: [] };
  var dividendRows = [];

  function showToast(msg) {
    var el = document.getElementById("toast");
    el.textContent = msg;
    el.classList.add("show");
    setTimeout(function () { el.classList.remove("show"); }, 3000);
  }

  function fmt(n) {
    return Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
  }

  function getKey() { return document.getElementById("adminKey").value; }
  function getCorp() { return document.getElementById("adminCorp").value; }
  function getYm() { return document.getElementById("adminYm").value; }

  function fillCorp() {
    var sel = document.getElementById("adminCorp");
    var prev = sel.value;
    var lang = getLang();
    sel.innerHTML = "";
    window.APP_CONFIG.CORPORATIONS.forEach(function (item) {
      var o = document.createElement("option");
      o.value = item.ko; o.textContent = item[lang] || item.ko;
      sel.appendChild(o);
    });
    if (prev) sel.value = prev;
  }

  function fillYm() {
    var sel = document.getElementById("adminYm");
    var prev = sel.value;
    sel.innerHTML = "";
    window.generateYearMonths().forEach(function (ym) {
      var o = document.createElement("option");
      o.value = ym; o.textContent = ym;
      sel.appendChild(o);
    });
    sel.value = prev || window.defaultYearMonth();
  }

  function fillDividendBase() {
    var sel = document.getElementById("dividendBase");
    var prev = sel.value;
    sel.innerHTML = "";
    window.fiscalYearEnds().forEach(function (ym) {
      var o = document.createElement("option");
      o.value = ym; o.textContent = ym;
      sel.appendChild(o);
    });
    sel.value = prev || window.defaultFiscalYearEnd();
  }

  // 숫자 아래에 그 값이 어디서 왔는지 작게 붙입니다. 기초잔액이 0으로 보일 때
  // "전월 BS 미제출이라 0"인지 "실제로 0"인지 화면에서 바로 구분되게 하려는 것입니다.
  function withSource(value, source) {
    return fmt(value) + "<span class='src-tag'>" + window.fundSourceLabel(source) + "</span>";
  }

  function renderCash(pos) {
    document.getElementById("beginningCny").innerHTML =
      withSource(pos.beginningCny, pos.beginningSource);
    document.getElementById("cfNetChangeCny").innerHTML =
      withSource(pos.cfNetChangeCny, pos.netSource);
    // 수기 확정 입력칸에는 BS 기말을 미리 넣어둡니다. 본사가 굳이 다른 값으로 확정할
    // 이유가 없다면 그대로 저장하면 되고, 다르게 저장하면 대사 표에 차이가 남습니다.
    var suggested = pos.bsEndingCny != null ? pos.bsEndingCny : pos.endingCny;
    document.getElementById("endingInput").value = suggested != null ? suggested : "";
  }

  function saveCash() {
    var client = window.getSupabaseClient();
    var key = getKey();
    if (!client) { showToast(t("cashSaveFail")); return; }
    if (!key) { showToast(t("adminKeyRequired")); return; }
    var value = Number(document.getElementById("endingInput").value) || 0;
    client.rpc("set_cash_position", { p_access_key: key, p_corp: getCorp(), p_yearmonth: getYm(), p_ending_balance_cny: value, p_note: "" }).then(function (res) {
      if (res.error) throw res.error;
      showToast(t("cashSaveSuccess"));
      fetchData();
    }).catch(function () {
      showToast(t("cashSaveFail"));
    });
  }

  function renderLoans() {
    var body = document.getElementById("loansBody");
    body.innerHTML = "";
    if (!currentLoans.length) {
      var tr = document.createElement("tr");
      tr.innerHTML = "<td colspan='7' style='color:var(--muted);'>" + t("noLoans") + "</td>";
      body.appendChild(tr);
      return;
    }
    currentLoans.forEach(function (l) {
      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" + fmt(l.principalCny) + "</td>" +
        "<td>" + fmt(l.balanceCny) + "</td>" +
        "<td>" + (l.interestRate != null ? l.interestRate : "-") + "</td>" +
        "<td>" + (l.startDate || "-") + "</td>" +
        "<td>" + (l.maturityDate || "-") + "</td>" +
        "<td>" + (l.note || "") + "</td>" +
        "<td><button class='btn-secondary edit-loan' data-id='" + l.id + "'>" + t("loanEditBtn") + "</button> " +
        "<button class='btn-danger delete-loan' data-id='" + l.id + "'>" + t("loanDeleteBtn") + "</button></td>";
      body.appendChild(tr);
    });
  }

  function showLoanForm(loan) {
    document.getElementById("loanForm").style.display = "block";
    document.getElementById("loanId").value = loan ? loan.id : "";
    document.getElementById("loanPrincipal").value = loan ? loan.principalCny : "";
    document.getElementById("loanBalance").value = loan ? loan.balanceCny : "";
    document.getElementById("loanRate").value = loan && loan.interestRate != null ? loan.interestRate : "";
    document.getElementById("loanStart").value = loan ? (loan.startDate || "") : "";
    document.getElementById("loanMaturity").value = loan ? (loan.maturityDate || "") : "";
    document.getElementById("loanNote").value = loan ? (loan.note || "") : "";
  }

  function hideLoanForm() {
    document.getElementById("loanForm").style.display = "none";
  }

  function saveLoan() {
    var client = window.getSupabaseClient();
    var key = getKey();
    if (!client) { showToast(t("loanSaveFail")); return; }
    if (!key) { showToast(t("adminKeyRequired")); return; }
    var payload = {
      id: document.getElementById("loanId").value || null,
      corp: getCorp(),
      principalCny: Number(document.getElementById("loanPrincipal").value) || 0,
      balanceCny: Number(document.getElementById("loanBalance").value) || 0,
      interestRate: document.getElementById("loanRate").value === "" ? null : Number(document.getElementById("loanRate").value),
      startDate: document.getElementById("loanStart").value || null,
      maturityDate: document.getElementById("loanMaturity").value || null,
      note: document.getElementById("loanNote").value
    };
    client.rpc("upsert_loan", { p_access_key: key, p_loan: payload }).then(function (res) {
      if (res.error) throw res.error;
      showToast(t("loanSaveSuccess"));
      hideLoanForm();
      fetchData();
    }).catch(function () {
      showToast(t("loanSaveFail"));
    });
  }

  function deleteLoan(id) {
    var client = window.getSupabaseClient();
    var key = getKey();
    if (!client) { showToast(t("loanDeleteFail")); return; }
    if (!key) { showToast(t("adminKeyRequired")); return; }
    if (!confirm(t("loanDeleteConfirm"))) return;
    client.rpc("delete_loan", { p_access_key: key, p_id: Number(id) }).then(function (res) {
      if (res.error) throw res.error;
      showToast(t("loanDeleteSuccess"));
      fetchData();
    }).catch(function () {
      showToast(t("loanDeleteFail"));
    });
  }

  // ===== 산출근거 및 BS·CF 대사 =====
  // 법인 행 아래에 그 법인의 지점 행을 들여써서 붙입니다. 법인 합계만 보면 지점 두 곳의
  // 오차가 서로 상쇄돼 "정상"으로 보일 수 있어서, 지점 단위까지 내려가야 의미가 있습니다.
  function reconRow(row, isOffice) {
    var st = window.fundRowStatus(row);
    var tr = document.createElement("tr");
    tr.className = (isOffice ? "recon-office " : "") + (st.bad ? "recon-bad" : "");
    var label = isOffice
      ? (row.office || t("officeTotal"))
      : window.corpLabel(row.corp);
    tr.innerHTML =
      "<td class='name'>" + label + "</td>" +
      "<td class='num'>" + withSource(row.beginningCny, row.beginningSource) + "</td>" +
      "<td class='num'>" + withSource(row.cfNetChangeCny, row.netSource) + "</td>" +
      "<td class='num'>" + window.fundFmt(row.computedEndingCny) + "</td>" +
      "<td class='num'>" + window.fundFmt(row.bsEndingCny) + "</td>" +
      "<td class='num'>" + window.fundDiffCell(row.diffIdentity) + "</td>" +
      "<td class='num'>" + window.fundDiffCell(row.diffOpening) + "</td>" +
      "<td class='num'>" + window.fundDiffCell(row.diffEnding) + "</td>" +
      "<td><span class='badge " + st.cls + "'>" + st.text + "</span></td>";
    return tr;
  }

  function renderRecon() {
    var body = document.getElementById("reconBody");
    body.innerHTML = "";
    (reconData.corpRows || []).forEach(function (corpRow) {
      body.appendChild(reconRow(corpRow, false));
      (reconData.officeRows || [])
        .filter(function (o) { return o.corp === corpRow.corp; })
        .forEach(function (o) { body.appendChild(reconRow(o, true)); });
    });
    if (!body.children.length) {
      var tr = document.createElement("tr");
      tr.innerHTML = "<td colspan='9' style='color:var(--muted);'>" + t("noData") + "</td>";
      body.appendChild(tr);
    }
  }

  // ===== 배당가능금액 =====
  function renderDividends() {
    var body = document.getElementById("dividendBody");
    var note = document.getElementById("dividendNote");
    body.innerHTML = "";
    var messages = [];

    dividendRows.forEach(function (d) {
      var method = d.method === "direct" ? t("dividendMethodDirect")
        : d.method === "backcast" ? t("dividendMethodBackcast", { ym: d.sourceYearmonth })
        : t("dividendMethodNodata");
      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td class='name'>" + window.corpLabel(d.corp) + "</td>" +
        "<td class='num'>" + window.fundFmt(d.retainedCny) + "</td>" +
        "<td class='num'>" + window.fundFmt(d.netIncomeCny) + "</td>" +
        "<td class='num'>" + window.fundFmt(d.plCumulativeCny) + "</td>" +
        "<td class='num'><b>" + window.fundFmt(d.dividendAvailableCny) + "</b></td>" +
        "<td class='name'>" + (d.sourceYearmonth || "-") +
          "<span class='src-tag'>" + method + "</span></td>";
      body.appendChild(tr);

      if (d.accountMissing) messages.push(t("dividendAccountMissing"));
      if (d.method === "backcast") {
        messages.push(window.corpLabel(d.corp) + ": " +
          t("dividendBackcastNote", { base: d.baseYearmonth, src: d.sourceYearmonth }));
      }
    });

    if (!body.children.length) {
      var tr = document.createElement("tr");
      tr.innerHTML = "<td colspan='6' style='color:var(--muted);'>" + t("noData") + "</td>";
      body.appendChild(tr);
    }

    // 같은 경고가 법인 수만큼 반복되지 않게 중복을 걷어냅니다.
    var unique = messages.filter(function (m, i) { return messages.indexOf(m) === i; });
    note.innerHTML = unique.join("<br>");
    note.style.display = unique.length ? "block" : "none";
  }

  function renderAgg() {
    var body = document.getElementById("aggBody");
    body.innerHTML = "";
    aggRows.forEach(function (row, i) {
      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" + (i + 1) + "</td>" +
        "<td>" + window.corpLabel(row.corp) + "</td>" +
        "<td>" + window.fundFmt(row.endingCny) + "</td>" +
        "<td>" + window.fundFmt(row.loanBalanceCny) + "</td>" +
        "<td>" + window.fundFmt(row.dividendCny) + "</td>";
      body.appendChild(tr);
    });
  }

  // 엑셀은 시트 3장으로 나눕니다. 통합현황만 받아서는 "이 숫자가 어떻게 나왔는지"를
  // 설명할 수 없어서, 산출근거와 배당근거를 같은 파일에 함께 담습니다.
  function downloadAgg() {
    var wb = XLSX.utils.book_new();

    var aoa = [[t("rowNumberCol"), t("colCorp"), t("endingCny"), t("colBalance"), t("dividendHeading")]];
    aggRows.forEach(function (row, i) {
      aoa.push([i + 1, window.corpLabel(row.corp), row.endingCny, row.loanBalanceCny, row.dividendCny]);
    });
    var wsAgg = XLSX.utils.aoa_to_sheet(aoa);
    wsAgg["!cols"] = [{ wch: 5 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, wsAgg, t("aggHeading").substring(0, 28));

    var reconAoa = [[
      t("colCorp"), t("colOffice"), t("beginningCny"), t("colSource"), t("colCfNet"), t("colSource"),
      t("colComputedEnding"), t("colBsEnding"), t("colDiffIdentity"), t("colDiffOpening"),
      t("colDiffEnding"), t("colCfCalc"), t("colDiffCfNet"), t("manualEndingCny"), t("colStatus")
    ]];
    function pushRecon(row, isOffice) {
      reconAoa.push([
        window.corpLabel(row.corp),
        isOffice ? (row.office || "") : t("officeTotal"),
        row.beginningCny, window.fundSourceLabel(row.beginningSource),
        row.cfNetChangeCny, window.fundSourceLabel(row.netSource),
        row.computedEndingCny, row.bsEndingCny,
        row.diffIdentity, row.diffOpening, row.diffEnding,
        row.cfNetCalcCny, row.diffCfNet, row.manualEndingCny,
        window.fundRowStatus(row).text
      ]);
    }
    (reconData.corpRows || []).forEach(function (corpRow) {
      pushRecon(corpRow, false);
      (reconData.officeRows || [])
        .filter(function (o) { return o.corp === corpRow.corp; })
        .forEach(function (o) { pushRecon(o, true); });
    });
    var wsRecon = XLSX.utils.aoa_to_sheet(reconAoa);
    wsRecon["!cols"] = reconAoa[0].map(function () { return { wch: 18 }; });
    XLSX.utils.book_append_sheet(wb, wsRecon, t("reconHeading").substring(0, 28));

    var divAoa = [[
      t("colCorp"), t("dividendBase"), t("dividendSource"), t("dividendRetained"),
      t("dividendNetIncome"), t("dividendPlCum"), t("dividendHeading")
    ]];
    dividendRows.forEach(function (d) {
      divAoa.push([
        window.corpLabel(d.corp), d.baseYearmonth, d.sourceYearmonth,
        d.retainedCny, d.netIncomeCny, d.plCumulativeCny, d.dividendAvailableCny
      ]);
    });
    var wsDiv = XLSX.utils.aoa_to_sheet(divAoa);
    wsDiv["!cols"] = divAoa[0].map(function () { return { wch: 18 }; });
    XLSX.utils.book_append_sheet(wb, wsDiv, t("dividendHeading").substring(0, 28));

    window.downloadWorkbook(wb, t("fileNamePrefix") + "_" + getYm() + ".xlsx");
  }

  function corpList() {
    return window.APP_CONFIG.CORPORATIONS.map(function (item) { return item.ko; });
  }

  // 종전에는 법인마다 get_cash_position + get_dividend_available를 각각 호출해
  // 법인 수 × 2회를 왕복했습니다. 이제 대사는 RPC 한 번으로 전 법인·전 지점을 받습니다.
  function loadRecon(client, key, ym) {
    return client.rpc("get_fund_reconciliation", {
      p_access_key: key, p_yearmonth: ym, p_corps: corpList()
    }).then(function (res) {
      if (res.error) throw res.error;
      reconData = res.data || { corpRows: [], officeRows: [] };
      renderRecon();
      return reconData;
    });
  }

  // 배당은 기준시점(사업연도말)이 법인마다 같아도 읽어오는 BS의 월이 다를 수 있어
  // (법인별로 입력 시작 시점이 다름) 법인별로 호출합니다.
  function loadDividends(client, key, base) {
    return Promise.all(corpList().map(function (corp) {
      return client.rpc("get_dividend_detail", {
        p_access_key: key, p_corp: corp, p_base_yearmonth: base
      }).then(function (res) {
        if (res.error) throw res.error;
        return res.data;
      });
    })).then(function (rows) {
      dividendRows = rows.filter(Boolean);
      renderDividends();
      return dividendRows;
    });
  }

  function loadAggregate(client, key) {
    return client.rpc("get_loans_aggregate", { p_access_key: key }).then(function (loanRes) {
      if (loanRes.error) throw loanRes.error;
      var loanTotals = {};
      (loanRes.data || []).forEach(function (l) {
        loanTotals[l.corp] = (loanTotals[l.corp] || 0) + Number(l.balanceCny);
      });
      var dividendByCorp = {};
      dividendRows.forEach(function (d) { dividendByCorp[d.corp] = d.dividendAvailableCny; });
      var endingByCorp = {};
      (reconData.corpRows || []).forEach(function (r) { endingByCorp[r.corp] = r.endingCny; });

      return corpList().map(function (corp) {
        return {
          corp: corp,
          endingCny: endingByCorp[corp] != null ? endingByCorp[corp] : null,
          loanBalanceCny: loanTotals[corp] || 0,
          dividendCny: dividendByCorp[corp] != null ? dividendByCorp[corp] : null
        };
      });
    });
  }

  function fetchData() {
    var client = window.getSupabaseClient();
    var key = getKey();
    if (!client) { showToast(t("adminFetchFail")); return; }
    if (!key) { showToast(t("adminKeyRequired")); return; }
    var corp = getCorp();
    var ym = getYm();
    document.getElementById("poolingBanner").style.display = window.isCashPooled(corp) ? "block" : "none";

    client.rpc("get_cash_position", { p_access_key: key, p_corp: corp, p_yearmonth: ym }).then(function (res) {
      if (res.error) throw res.error;
      renderCash(res.data);
    }).catch(function () { showToast(t("adminFetchFail")); });

    client.rpc("get_loans", { p_access_key: key, p_corp: corp }).then(function (res) {
      if (res.error) throw res.error;
      currentLoans = res.data || [];
      renderLoans();
    }).catch(function () { showToast(t("adminFetchFail")); });

    // 대사 → 배당 → 통합현황 순으로 이어 붙입니다. 통합현황 표가 앞의 두 결과를
    // 재사용하기 때문에 병렬로 쏘면 빈 표가 그려집니다.
    loadRecon(client, key, ym)
      .then(function () {
        return loadDividends(client, key, document.getElementById("dividendBase").value);
      })
      .then(function () {
        var mine = dividendRows.filter(function (d) { return d.corp === corp; })[0];
        document.getElementById("dividendValue").textContent =
          (mine ? window.fundFmt(mine.dividendAvailableCny) : "-") + " CNY";
        return loadAggregate(client, key);
      })
      .then(function (rows) {
        aggRows = rows;
        renderAgg();
      })
      .catch(function () { showToast(t("adminFetchFail")); });
  }

  document.addEventListener("DOMContentLoaded", function () {
    fillCorp();
    fillYm();
    fillDividendBase();
    document.addEventListener("langchange", function () {
      fillCorp(); fillYm(); renderLoans(); renderAgg(); renderRecon(); renderDividends();
    });
    document.getElementById("fetchBtn").addEventListener("click", fetchData);
    // 기준시점을 바꾸면 배당 관련 표만 다시 읽습니다 (대사 표는 영향 없음).
    document.getElementById("dividendBase").addEventListener("change", function () {
      var client = window.getSupabaseClient();
      var key = getKey();
      if (!client || !key) return;
      loadDividends(client, key, this.value)
        .then(function () {
          var mine = dividendRows.filter(function (d) { return d.corp === getCorp(); })[0];
          document.getElementById("dividendValue").textContent =
            (mine ? window.fundFmt(mine.dividendAvailableCny) : "-") + " CNY";
          return loadAggregate(client, key);
        })
        .then(function (rows) { aggRows = rows; renderAgg(); })
        .catch(function () { showToast(t("adminFetchFail")); });
    });
    document.getElementById("saveCashBtn").addEventListener("click", saveCash);
    document.getElementById("addLoanBtn").addEventListener("click", function () { showLoanForm(null); });
    document.getElementById("loanSaveBtn").addEventListener("click", saveLoan);
    document.getElementById("loanCancelBtn").addEventListener("click", hideLoanForm);
    document.getElementById("loansBody").addEventListener("click", function (e) {
      var editBtn = e.target.closest(".edit-loan");
      var delBtn = e.target.closest(".delete-loan");
      if (editBtn) {
        var loan = currentLoans.filter(function (l) { return String(l.id) === editBtn.dataset.id; })[0];
        if (loan) showLoanForm(loan);
      }
      if (delBtn) deleteLoan(delBtn.dataset.id);
    });
    document.getElementById("downloadBtn").addEventListener("click", downloadAgg);
  });
})();
