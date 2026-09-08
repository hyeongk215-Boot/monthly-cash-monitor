(function () {
  var currentLoans = [];
  var aggRows = [];

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

  function renderCash(pos) {
    document.getElementById("beginningCny").textContent = fmt(pos.beginningCny);
    document.getElementById("cfNetChangeCny").textContent = fmt(pos.cfNetChangeCny);
    document.getElementById("endingInput").value = pos.endingCny;
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

  function renderAgg() {
    var body = document.getElementById("aggBody");
    body.innerHTML = "";
    aggRows.forEach(function (row, i) {
      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" + (i + 1) + "</td>" +
        "<td>" + window.corpLabel(row.corp) + "</td>" +
        "<td>" + fmt(row.endingCny) + "</td>" +
        "<td>" + fmt(row.loanBalanceCny) + "</td>" +
        "<td>" + fmt(row.dividendCny) + "</td>";
      body.appendChild(tr);
    });
  }

  function downloadAgg() {
    var header = [t("rowNumberCol"), t("colCorp"), t("endingCny"), t("colBalance"), t("dividendHeading")];
    var aoa = [header];
    aggRows.forEach(function (row, i) {
      aoa.push([i + 1, window.corpLabel(row.corp), row.endingCny, row.loanBalanceCny, row.dividendCny]);
    });
    var ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = [{ wch: 5 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 16 }];
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, getYm());
    window.downloadWorkbook(wb, t("fileNamePrefix") + "_" + getYm() + ".xlsx");
  }

  function loadAggregate(client, key, ym) {
    return client.rpc("get_loans_aggregate", { p_access_key: key }).then(function (loanRes) {
      if (loanRes.error) throw loanRes.error;
      var loanTotals = {};
      (loanRes.data || []).forEach(function (l) {
        loanTotals[l.corp] = (loanTotals[l.corp] || 0) + Number(l.balanceCny);
      });
      return Promise.all(window.APP_CONFIG.CORPORATIONS.map(function (item) {
        return Promise.all([
          client.rpc("get_cash_position", { p_access_key: key, p_corp: item.ko, p_yearmonth: ym }),
          client.rpc("get_dividend_available", { p_access_key: key, p_corp: item.ko, p_yearmonth: ym })
        ]).then(function (results) {
          return {
            corp: item.ko,
            endingCny: results[0].data ? results[0].data.endingCny : 0,
            loanBalanceCny: loanTotals[item.ko] || 0,
            dividendCny: results[1].data || 0
          };
        });
      }));
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

    client.rpc("get_dividend_available", { p_access_key: key, p_corp: corp, p_yearmonth: ym }).then(function (res) {
      if (res.error) throw res.error;
      document.getElementById("dividendValue").textContent = fmt(res.data) + " CNY";
    }).catch(function () { showToast(t("adminFetchFail")); });

    loadAggregate(client, key, ym).then(function (rows) {
      aggRows = rows;
      renderAgg();
    }).catch(function () { showToast(t("adminFetchFail")); });
  }

  document.addEventListener("DOMContentLoaded", function () {
    fillCorp();
    fillYm();
    document.addEventListener("langchange", function () { fillCorp(); fillYm(); renderLoans(); renderAgg(); });
    document.getElementById("fetchBtn").addEventListener("click", fetchData);
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
