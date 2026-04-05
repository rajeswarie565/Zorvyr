/* Zorvyn dashboard — single-file script (store, utils, charts, UI) */
(function () {
  'use strict';

  // ——— Store ———
  var STORAGE_KEY = 'zorvyn-finance-v1';

  function defaultTransactions() {
    return [
      { id: 't1', date: '2026-01-05', description: 'Salary', category: 'Salary', type: 'income', amount: 4200 },
      { id: 't2', date: '2026-01-08', description: 'Rent payment', category: 'Housing', type: 'expense', amount: 1400 },
      { id: 't3', date: '2026-01-10', description: 'Groceries', category: 'Food', type: 'expense', amount: 186.42 },
      { id: 't4', date: '2026-01-12', description: 'Freelance project', category: 'Freelance', type: 'income', amount: 850 },
      { id: 't5', date: '2026-01-15', description: 'Utilities', category: 'Utilities', type: 'expense', amount: 112.3 },
      { id: 't6', date: '2026-01-18', description: 'Dining out', category: 'Food', type: 'expense', amount: 64.5 },
      { id: 't7', date: '2026-01-22', description: 'Transport', category: 'Transport', type: 'expense', amount: 45 },
      { id: 't8', date: '2026-02-01', description: 'Salary', category: 'Salary', type: 'income', amount: 4200 },
      { id: 't9', date: '2026-02-03', description: 'Gym membership', category: 'Health', type: 'expense', amount: 49.99 },
      { id: 't10', date: '2026-02-07', description: 'Online shopping', category: 'Shopping', type: 'expense', amount: 203.75 },
      { id: 't11', date: '2026-02-10', description: 'Rent payment', category: 'Housing', type: 'expense', amount: 1400 },
      { id: 't12', date: '2026-02-14', description: 'Coffee & snacks', category: 'Food', type: 'expense', amount: 38.2 },
      { id: 't13', date: '2026-02-20', description: 'Side gig', category: 'Freelance', type: 'income', amount: 320 },
      { id: 't14', date: '2026-03-01', description: 'Salary', category: 'Salary', type: 'income', amount: 4200 },
      { id: 't15', date: '2026-03-04', description: 'Insurance', category: 'Insurance', type: 'expense', amount: 128 },
    ];
  }

  function loadPersisted() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function persist(state) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          transactions: state.transactions,
          role: state.role,
          theme: state.theme,
          openingBalance: state.openingBalance,
        })
      );
    } catch (e) {}
  }

  var persisted = loadPersisted();
  var initialState = {
    openingBalance: persisted && persisted.openingBalance != null ? persisted.openingBalance : 2500,
    transactions:
      persisted && Array.isArray(persisted.transactions) && persisted.transactions.length
        ? persisted.transactions
        : defaultTransactions(),
    role: persisted && persisted.role === 'admin' ? 'admin' : 'viewer',
    theme: persisted && persisted.theme === 'dark' ? 'dark' : 'light',
    filters: { search: '', type: 'all', category: 'all', sort: 'date-desc' },
  };

  var listeners = new Set();

  function getState() {
    return initialState;
  }

  function subscribe(fn) {
    listeners.add(fn);
    return function () {
      listeners.delete(fn);
    };
  }

  function notify() {
    persist(initialState);
    listeners.forEach(function (fn) {
      fn(initialState);
    });
  }

  function setRole(role) {
    initialState.role = role === 'admin' ? 'admin' : 'viewer';
    notify();
  }

  function setTheme(theme) {
    initialState.theme = theme === 'dark' ? 'dark' : 'light';
    notify();
  }

  function setFilter(key, value) {
    if (key in initialState.filters) {
      initialState.filters[key] = value;
      notify();
    }
  }

  function resetFilters() {
    initialState.filters = { search: '', type: 'all', category: 'all', sort: 'date-desc' };
    notify();
  }

  function addTransaction(row) {
    var id = 't' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
    initialState.transactions.push({
      id: id,
      date: row.date,
      description: row.description.trim(),
      category: row.category.trim(),
      type: row.type,
      amount: Number(row.amount),
    });
    notify();
    return id;
  }

  function updateTransaction(id, row) {
    var i = initialState.transactions.findIndex(function (t) {
      return t.id === id;
    });
    if (i === -1) return false;
    initialState.transactions[i] = Object.assign({}, initialState.transactions[i], {
      date: row.date,
      description: row.description.trim(),
      category: row.category.trim(),
      type: row.type,
      amount: Number(row.amount),
    });
    notify();
    return true;
  }

  function deleteTransaction(id) {
    var len = initialState.transactions.length;
    initialState.transactions = initialState.transactions.filter(function (t) {
      return t.id !== id;
    });
    if (initialState.transactions.length !== len) notify();
  }

  function setTransactions(list) {
    initialState.transactions = list.map(function (t) {
      return Object.assign({}, t);
    });
    notify();
  }

  // ——— Utils ———
  function formatMoney(n) {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);
  }

  function formatDate(iso) {
    if (!iso) return '—';
    var d = new Date(iso + 'T12:00:00');
    return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).format(d);
  }

  function uniqueCategories(transactions) {
    var s = new Set();
    transactions.forEach(function (t) {
      s.add(t.category);
    });
    return Array.from(s).sort(function (a, b) {
      return a.localeCompare(b);
    });
  }

  function filterAndSort(transactions, filters) {
    var list = transactions.slice();
    var q = (filters.search || '').trim().toLowerCase();
    if (q) {
      list = list.filter(function (t) {
        return (
          t.description.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          t.type.toLowerCase().includes(q)
        );
      });
    }
    if (filters.type === 'income' || filters.type === 'expense') {
      list = list.filter(function (t) {
        return t.type === filters.type;
      });
    }
    if (filters.category && filters.category !== 'all') {
      list = list.filter(function (t) {
        return t.category === filters.category;
      });
    }
    var sort = filters.sort || 'date-desc';
    list.sort(function (a, b) {
      if (sort === 'date-asc' || sort === 'date-desc') {
        var cmp = a.date.localeCompare(b.date);
        return sort === 'date-asc' ? cmp : -cmp;
      }
      if (sort === 'amount-asc' || sort === 'amount-desc') {
        var c = a.amount - b.amount;
        return sort === 'amount-asc' ? c : -c;
      }
      return 0;
    });
    return list;
  }

  function computeTotals(transactions, openingBalance) {
    var income = 0;
    var expenses = 0;
    transactions.forEach(function (t) {
      if (t.type === 'income') income += t.amount;
      else expenses += t.amount;
    });
    return { income: income, expenses: expenses, balance: openingBalance + income - expenses, openingBalance: openingBalance };
  }

  function expenseByCategory(transactions) {
    var map = new Map();
    transactions.forEach(function (t) {
      if (t.type !== 'expense') return;
      map.set(t.category, (map.get(t.category) || 0) + t.amount);
    });
    return Array.from(map.entries()).sort(function (a, b) {
      return b[1] - a[1];
    });
  }

  function balanceSeries(transactions, openingBalance) {
    if (!transactions.length) {
      return { points: [], minY: openingBalance, maxY: openingBalance, openingBalance: openingBalance };
    }
    var sorted = transactions.slice().sort(function (a, b) {
      return a.date.localeCompare(b.date) || a.id.localeCompare(b.id);
    });
    var byDay = new Map();
    sorted.forEach(function (t) {
      var net = t.type === 'income' ? t.amount : -t.amount;
      byDay.set(t.date, (byDay.get(t.date) || 0) + net);
    });
    var days = Array.from(byDay.keys()).sort();
    var run = openingBalance;
    var points = days.map(function (date) {
      run += byDay.get(date);
      return { date: date, balance: run };
    });
    var balances = [openingBalance].concat(points.map(function (p) { return p.balance; }));
    return {
      points: points,
      minY: Math.min.apply(null, balances),
      maxY: Math.max.apply(null, balances),
      openingBalance: openingBalance,
    };
  }

  function computeInsights(transactions, openingBalance) {
    var insights = [];
    var totals = computeTotals(transactions, openingBalance);
    var income = totals.income;
    var expenses = totals.expenses;
    var byCat = expenseByCategory(transactions);

    if (byCat.length) {
      var topCat = byCat[0][0];
      var topAmt = byCat[0][1];
      insights.push({
        title: 'Highest spending category',
        body:
          topCat +
          ' accounts for ' +
          formatMoney(topAmt) +
          ' in expenses (' +
          (((topAmt / expenses) * 100) || 0).toFixed(0) +
          '% of total expenses).',
      });
    } else {
      insights.push({
        title: 'Highest spending category',
        body: 'No expense transactions yet — add expenses to see a category leader.',
      });
    }

    var byMonth = new Map();
    transactions.forEach(function (t) {
      var m = t.date.slice(0, 7);
      if (!byMonth.has(m)) byMonth.set(m, { income: 0, expense: 0 });
      var bucket = byMonth.get(m);
      if (t.type === 'income') bucket.income += t.amount;
      else bucket.expense += t.amount;
    });
    var months = Array.from(byMonth.keys()).sort();
    if (months.length >= 2) {
      var last = months[months.length - 1];
      var prev = months[months.length - 2];
      var netLast = byMonth.get(last).income - byMonth.get(last).expense;
      var netPrev = byMonth.get(prev).income - byMonth.get(prev).expense;
      var diff = netLast - netPrev;
      insights.push({
        title: 'Monthly comparison',
        body:
          'Net cash flow in ' +
          last +
          ' was ' +
          formatMoney(netLast) +
          ' vs ' +
          formatMoney(netPrev) +
          ' in ' +
          prev +
          ' — ' +
          (diff >= 0 ? 'stronger' : 'weaker') +
          ' month-over-month.',
      });
    } else {
      insights.push({
        title: 'Monthly comparison',
        body: 'Need activity across at least two months to compare net cash flow.',
      });
    }

    if (income > 0) {
      var savingsRate = ((income - expenses) / income) * 100;
      insights.push({
        title: 'Savings rate',
        body: 'Rough savings rate (income minus expenses over all data): ' + savingsRate.toFixed(1) + '%.',
      });
    } else {
      insights.push({
        title: 'Savings rate',
        body: 'Add income transactions to estimate a savings rate.',
      });
    }

    return insights;
  }

  function downloadBlob(filename, mime, text) {
    var blob = new Blob([text], { type: mime });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function transactionsToCsv(transactions) {
    var headers = ['id', 'date', 'description', 'category', 'type', 'amount'];
    function esc(v) {
      return '"' + String(v).replace(/"/g, '""') + '"';
    }
    var rows = transactions.map(function (t) {
      return headers.map(function (h) {
        return esc(t[h]);
      }).join(',');
    });
    return [headers.join(',')].concat(rows).join('\n');
  }

  // ——— Mock API (embedded payload — no extra file) ———
  var MOCK_API_PAYLOAD = [
    { id: 'm1', date: '2026-01-03', description: 'Consulting', category: 'Freelance', type: 'income', amount: 1200 },
    { id: 'm2', date: '2026-01-10', description: 'Rent', category: 'Housing', type: 'expense', amount: 1100 },
    { id: 'm3', date: '2026-01-12', description: 'Groceries', category: 'Food', type: 'expense', amount: 95.5 },
    { id: 'm4', date: '2026-01-20', description: 'Salary', category: 'Salary', type: 'income', amount: 3800 },
    { id: 'm5', date: '2026-02-05', description: 'Entertainment', category: 'Leisure', type: 'expense', amount: 142 },
    { id: 'm6', date: '2026-02-14', description: 'Utilities', category: 'Utilities', type: 'expense', amount: 88.2 },
  ];

  function fetchMockTransactions() {
    var latencyMs = 450 + Math.floor(Math.random() * 350);
    return new Promise(function (resolve) {
      setTimeout(function () {
        resolve(MOCK_API_PAYLOAD.map(function (t) { return Object.assign({}, t); }));
      }, latencyMs);
    });
  }

  // ——— Charts ———
  var PALETTE = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--chart-6)'];

  function renderBalanceTrend(el, series) {
    el.innerHTML = '';
    if (!series.points.length) {
      el.innerHTML =
        '<div class="chart-empty"><p>No transaction history to plot.</p><p class="muted">Add transactions to see your balance trend.</p></div>';
      return;
    }

    var W = 560;
    var H = 200;
    var padL = 48;
    var padR = 16;
    var padT = 12;
    var padB = 28;
    var innerW = W - padL - padR;
    var innerH = H - padT - padB;
    var points = series.points;
    var openingBalance = series.openingBalance;
    var allY = [openingBalance].concat(points.map(function (p) { return p.balance; }));
    var yMin = Math.min.apply(null, allY);
    var yMax = Math.max.apply(null, allY);
    if (yMin === yMax) {
      yMin -= 1;
      yMax += 1;
    }

    var xCount = points.length + 1;
    function xAt(i) {
      return padL + (i / Math.max(xCount - 1, 1)) * innerW;
    }
    function yAt(v) {
      return padT + innerH - ((v - yMin) / (yMax - yMin)) * innerH;
    }

    var pathPts = [];
    pathPts.push({ x: xAt(0), y: yAt(openingBalance), date: '' });
    points.forEach(function (p, i) {
      pathPts.push({ x: xAt(i + 1), y: yAt(p.balance), date: p.date });
    });

    var d = pathPts
      .map(function (pt, i) {
        return (i === 0 ? 'M' : 'L') + ' ' + pt.x.toFixed(1) + ' ' + pt.y.toFixed(1);
      })
      .join(' ');
    var areaD =
      d +
      ' L ' +
      pathPts[pathPts.length - 1].x.toFixed(1) +
      ' ' +
      (padT + innerH).toFixed(1) +
      ' L ' +
      pathPts[0].x.toFixed(1) +
      ' ' +
      (padT + innerH).toFixed(1) +
      ' Z';

    var svgNS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('class', 'chart-svg');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Balance trend line chart');

    var defs = document.createElementNS(svgNS, 'defs');
    var grad = document.createElementNS(svgNS, 'linearGradient');
    grad.setAttribute('id', 'balance-fill');
    grad.setAttribute('x1', '0');
    grad.setAttribute('y1', '0');
    grad.setAttribute('x2', '0');
    grad.setAttribute('y2', '1');
    var s1 = document.createElementNS(svgNS, 'stop');
    s1.setAttribute('offset', '0%');
    s1.setAttribute('stop-color', 'currentColor');
    s1.setAttribute('stop-opacity', '0.18');
    var s2 = document.createElementNS(svgNS, 'stop');
    s2.setAttribute('offset', '100%');
    s2.setAttribute('stop-color', 'currentColor');
    s2.setAttribute('stop-opacity', '0.02');
    grad.appendChild(s1);
    grad.appendChild(s2);
    defs.appendChild(grad);
    svg.appendChild(defs);

    var area = document.createElementNS(svgNS, 'path');
    area.setAttribute('d', areaD);
    area.setAttribute('fill', 'url(#balance-fill)');
    area.setAttribute('class', 'chart-area');

    var line = document.createElementNS(svgNS, 'path');
    line.setAttribute('d', d);
    line.setAttribute('fill', 'none');
    line.setAttribute('stroke', 'currentColor');
    line.setAttribute('stroke-width', '2');
    line.setAttribute('stroke-linecap', 'round');
    line.setAttribute('stroke-linejoin', 'round');
    line.setAttribute('class', 'chart-line');

    svg.appendChild(area);
    svg.appendChild(line);

    pathPts.forEach(function (pt, idx) {
      var bal = idx === 0 ? openingBalance : points[idx - 1].balance;
      var c = document.createElementNS(svgNS, 'circle');
      c.setAttribute('cx', String(pt.x));
      c.setAttribute('cy', String(pt.y));
      c.setAttribute('r', '3.5');
      c.setAttribute('class', 'chart-dot');
      var title = document.createElementNS(svgNS, 'title');
      title.textContent = (pt.date || 'Start') + ': ' + formatMoney(bal);
      c.appendChild(title);
      svg.appendChild(c);
    });

    var labelLow = document.createElementNS(svgNS, 'text');
    labelLow.setAttribute('x', '4');
    labelLow.setAttribute('y', String(padT + innerH));
    labelLow.setAttribute('class', 'chart-axis-text');
    labelLow.textContent = formatMoney(yMin);

    var labelHigh = document.createElementNS(svgNS, 'text');
    labelHigh.setAttribute('x', '4');
    labelHigh.setAttribute('y', String(padT + 10));
    labelHigh.setAttribute('class', 'chart-axis-text');
    labelHigh.textContent = formatMoney(yMax);

    svg.appendChild(labelLow);
    svg.appendChild(labelHigh);
    el.appendChild(svg);
  }

  function renderCategoryBreakdown(el, pairs) {
    el.innerHTML = '';
    if (!pairs.length) {
      el.innerHTML =
        '<div class="chart-empty"><p>No expenses to break down.</p><p class="muted">Expense transactions will appear here by category.</p></div>';
      return;
    }

    var max = pairs[0][1];
    var wrap = document.createElement('div');
    wrap.className = 'bar-chart';

    pairs.forEach(function (pair, i) {
      var cat = pair[0];
      var amt = pair[1];
      var row = document.createElement('div');
      row.className = 'bar-row';
      var label = document.createElement('span');
      label.className = 'bar-label';
      label.textContent = cat;
      var track = document.createElement('div');
      track.className = 'bar-track';
      var fill = document.createElement('div');
      fill.className = 'bar-fill';
      fill.style.width = (amt / max) * 100 + '%';
      fill.style.background = PALETTE[i % PALETTE.length];
      var val = document.createElement('span');
      val.className = 'bar-value';
      val.textContent = formatMoney(amt);
      track.appendChild(fill);
      row.appendChild(label);
      row.appendChild(track);
      row.appendChild(val);
      wrap.appendChild(row);
    });

    el.appendChild(wrap);
  }

  // ——— UI ———
  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    var btn = document.getElementById('theme-toggle');
    if (btn) btn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
  }

  function applyRole(role) {
    document.body.dataset.role = role;
    var select = document.getElementById('role-select');
    if (select) select.value = role;
    var banner = document.getElementById('role-banner');
    if (banner) {
      banner.textContent =
        role === 'admin'
          ? 'Admin: you can add, edit, and delete transactions and export data.'
          : 'Viewer: read-only access. Switch role to Admin to manage transactions.';
    }
  }

  function renderSummary(state) {
    var el = document.getElementById('summary-cards');
    if (!el) return;
    var t = computeTotals(state.transactions, state.openingBalance);
    var hasData = state.transactions.length > 0;
    el.innerHTML =
      '<article class="summary-card"><p class="summary-card-label">Total balance</p><p class="summary-card-value">' +
      (hasData || state.openingBalance ? formatMoney(t.balance) : '—') +
      '</p><p class="card-sub" style="margin-top:0.5rem">Opening ' +
      formatMoney(t.openingBalance) +
      ' + net flow</p></article>' +
      '<article class="summary-card"><p class="summary-card-label">Income</p><p class="summary-card-value summary-card-value--income">' +
      (hasData ? formatMoney(t.income) : '—') +
      '</p></article>' +
      '<article class="summary-card"><p class="summary-card-label">Expenses</p><p class="summary-card-value summary-card-value--expense">' +
      (hasData ? formatMoney(t.expenses) : '—') +
      '</p></article>';
  }

  function renderDashboardCharts(state) {
    var trendEl = document.getElementById('chart-balance-trend');
    var catEl = document.getElementById('chart-category-breakdown');
    if (!trendEl || !catEl) return;
    renderBalanceTrend(trendEl, balanceSeries(state.transactions, state.openingBalance));
    renderCategoryBreakdown(catEl, expenseByCategory(state.transactions));
  }

  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  }

  function escapeAttr(s) {
    return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  }

  function fillCategorySelect(state) {
    var sel = document.getElementById('filter-category');
    if (!sel) return;
    var cats = uniqueCategories(state.transactions);
    var current = state.filters.category;
    sel.innerHTML =
      '<option value="all">All categories</option>' +
      cats
        .map(function (c) {
          return '<option value="' + escapeAttr(c) + '">' + escapeHtml(c) + '</option>';
        })
        .join('');
    if (current === 'all' || cats.indexOf(current) !== -1) sel.value = current;
    else sel.value = 'all';
  }

  function fillDatalist(state) {
    var dl = document.getElementById('category-suggestions');
    if (!dl) return;
    dl.innerHTML = uniqueCategories(state.transactions)
      .map(function (c) {
        return '<option value="' + escapeAttr(c) + '"></option>';
      })
      .join('');
  }

  function renderTransactionsTable(state) {
    var tbody = document.getElementById('transactions-body');
    var empty = document.getElementById('transactions-empty');
    var table = document.getElementById('transactions-table');
    if (!tbody || !empty || !table) return;

    var list = filterAndSort(state.transactions, state.filters);
    tbody.innerHTML = '';

    if (!state.transactions.length) {
      table.hidden = true;
      empty.hidden = false;
      empty.querySelector('p').textContent = 'No transactions yet.';
      return;
    }

    if (!list.length) {
      table.hidden = true;
      empty.hidden = false;
      empty.querySelector('p').textContent = 'No transactions match your filters.';
      return;
    }

    table.hidden = false;
    empty.hidden = true;

    var isAdmin = state.role === 'admin';
    list.forEach(function (t) {
      var tr = document.createElement('tr');
      var amtClass = t.type === 'income' ? 'summary-card-value--income' : 'summary-card-value--expense';
      var sign = t.type === 'income' ? '+' : '−';
      tr.innerHTML =
        '<td>' +
        formatDate(t.date) +
        '</td><td>' +
        escapeHtml(t.description) +
        '</td><td>' +
        escapeHtml(t.category) +
        '</td><td><span class="badge badge--' +
        t.type +
        '">' +
        t.type +
        '</span></td><td class="numeric ' +
        amtClass +
        '">' +
        sign +
        formatMoney(t.amount) +
        '</td>';
      if (isAdmin) {
        var td = document.createElement('td');
        td.className = 'admin-only';
        var edit = document.createElement('button');
        edit.type = 'button';
        edit.className = 'btn-table';
        edit.textContent = 'Edit';
        edit.addEventListener('click', function () {
          openModal(t);
        });
        var del = document.createElement('button');
        del.type = 'button';
        del.className = 'btn-table btn-table--danger';
        del.textContent = 'Delete';
        del.addEventListener('click', function () {
          if (confirm('Delete this transaction?')) deleteTransaction(t.id);
        });
        td.appendChild(edit);
        td.appendChild(del);
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    });
  }

  function renderInsights(state) {
    var ul = document.getElementById('insights-list');
    if (!ul) return;
    var items = computeInsights(state.transactions, state.openingBalance);
    ul.innerHTML = items
      .map(function (i) {
        return (
          '<li class="insight-card"><h3>' +
          escapeHtml(i.title) +
          '</h3><p>' +
          escapeHtml(i.body) +
          '</p></li>'
        );
      })
      .join('');
  }

  function syncFilterInputs(state) {
    var search = document.getElementById('filter-search');
    var type = document.getElementById('filter-type');
    var sort = document.getElementById('filter-sort');
    if (search && search !== document.activeElement) search.value = state.filters.search;
    if (type) type.value = state.filters.type;
    if (sort) sort.value = state.filters.sort;
  }

  function showSection(id) {
    document.querySelectorAll('.section').forEach(function (s) {
      var visible = s.id === 'section-' + id;
      s.classList.toggle('is-visible', visible);
      s.hidden = !visible;
    });
    document.querySelectorAll('.nav-tab').forEach(function (t) {
      t.classList.toggle('is-active', t.dataset.section === id);
    });
  }

  function openModal(tx) {
    var modal = document.getElementById('modal-transaction');
    var backdrop = document.getElementById('modal-backdrop');
    var title = document.getElementById('modal-title');
    var formId = document.getElementById('form-id');
    var date = document.getElementById('form-date');
    var desc = document.getElementById('form-description');
    var cat = document.getElementById('form-category');
    var type = document.getElementById('form-type');
    var amount = document.getElementById('form-amount');
    if (!modal || !backdrop || !title || !formId || !date || !desc || !cat || !type || !amount) return;

    title.textContent = tx ? 'Edit transaction' : 'Add transaction';
    formId.value = tx && tx.id ? tx.id : '';
    date.value = tx && tx.date ? tx.date : new Date().toISOString().slice(0, 10);
    desc.value = tx && tx.description ? tx.description : '';
    cat.value = tx && tx.category ? tx.category : '';
    type.value = tx && tx.type ? tx.type : 'expense';
    amount.value = tx ? String(tx.amount) : '';

    backdrop.hidden = false;
    backdrop.setAttribute('aria-hidden', 'false');
    modal.showModal();
    date.focus();
  }

  function closeModal() {
    var modal = document.getElementById('modal-transaction');
    var backdrop = document.getElementById('modal-backdrop');
    if (modal && modal.open) modal.close();
    if (backdrop) {
      backdrop.hidden = true;
      backdrop.setAttribute('aria-hidden', 'true');
    }
  }

  function debounce(fn, ms) {
    var t;
    return function (val) {
      clearTimeout(t);
      t = setTimeout(function () {
        fn(val);
      }, ms);
    };
  }

  function todayStamp() {
    return new Date().toISOString().slice(0, 10);
  }

  function render(state) {
    applyTheme(state.theme);
    applyRole(state.role);
    renderSummary(state);
    renderDashboardCharts(state);
    fillCategorySelect(state);
    fillDatalist(state);
    syncFilterInputs(state);
    renderTransactionsTable(state);
    renderInsights(state);
  }

  function wireEvents() {
    var roleSel = document.getElementById('role-select');
    if (roleSel)
      roleSel.addEventListener('change', function (e) {
        setRole(e.target.value);
      });

    var themeBtn = document.getElementById('theme-toggle');
    if (themeBtn)
      themeBtn.addEventListener('click', function () {
        var s = getState();
        setTheme(s.theme === 'dark' ? 'light' : 'dark');
      });

    document.querySelectorAll('.nav-tab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        showSection(btn.dataset.section || 'dashboard');
      });
    });

    var debouncedSearch = debounce(function (val) {
      setFilter('search', val);
    }, 200);
    var searchEl = document.getElementById('filter-search');
    if (searchEl)
      searchEl.addEventListener('input', function (e) {
        debouncedSearch(e.target.value);
      });

    var typeEl = document.getElementById('filter-type');
    if (typeEl)
      typeEl.addEventListener('change', function (e) {
        setFilter('type', e.target.value);
      });

    var catEl = document.getElementById('filter-category');
    if (catEl)
      catEl.addEventListener('change', function (e) {
        setFilter('category', e.target.value);
      });

    var sortEl = document.getElementById('filter-sort');
    if (sortEl)
      sortEl.addEventListener('change', function (e) {
        setFilter('sort', e.target.value);
      });

    var clearBtn = document.getElementById('btn-clear-filters');
    if (clearBtn) clearBtn.addEventListener('click', resetFilters);

    var addBtn = document.getElementById('btn-add-transaction');
    if (addBtn) addBtn.addEventListener('click', function () { openModal(null); });

    var cancelBtn = document.getElementById('modal-cancel');
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    var backdropEl = document.getElementById('modal-backdrop');
    if (backdropEl) backdropEl.addEventListener('click', closeModal);

    var formTx = document.getElementById('form-transaction');
    if (formTx)
      formTx.addEventListener('submit', function (e) {
        e.preventDefault();
        var date = document.getElementById('form-date').value;
        var description = document.getElementById('form-description').value;
        var category = document.getElementById('form-category').value;
        var type = document.getElementById('form-type').value;
        var amt = parseFloat(document.getElementById('form-amount').value);
        if (!date || !description.trim() || !category.trim() || !amt || amt <= 0) return;

        var row = {
          date: date,
          description: description,
          category: category,
          type: type === 'income' ? 'income' : 'expense',
          amount: amt,
        };
        var id = document.getElementById('form-id').value;
        if (id) updateTransaction(id, row);
        else addTransaction(row);
        closeModal();
      });

    var csvBtn = document.getElementById('btn-export-csv');
    if (csvBtn)
      csvBtn.addEventListener('click', function () {
        var s = getState();
        downloadBlob('zorvyn-transactions-' + todayStamp() + '.csv', 'text/csv;charset=utf-8', transactionsToCsv(s.transactions));
      });

    var jsonBtn = document.getElementById('btn-export-json');
    if (jsonBtn)
      jsonBtn.addEventListener('click', function () {
        var s = getState();
        downloadBlob(
          'zorvyn-transactions-' + todayStamp() + '.json',
          'application/json',
          JSON.stringify(s.transactions, null, 2)
        );
      });

    var mockBtn = document.getElementById('btn-mock-api');
    if (mockBtn)
      mockBtn.addEventListener('click', function () {
        mockBtn.disabled = true;
        var label = mockBtn.textContent;
        mockBtn.textContent = 'Loading…';
        fetchMockTransactions()
          .then(function (rows) {
            setTransactions(rows);
          })
          .catch(function (e) {
            console.error(e);
          })
          .finally(function () {
            mockBtn.disabled = false;
            mockBtn.textContent = label;
          });
      });

    var dialogEl = document.getElementById('modal-transaction');
    if (dialogEl)
      dialogEl.addEventListener('cancel', function (e) {
        e.preventDefault();
        closeModal();
      });
  }

  function init() {
    wireEvents();
    render(getState());
    subscribe(render);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
