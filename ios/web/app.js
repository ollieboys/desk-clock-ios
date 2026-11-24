/* 桌面时钟 —— 界面逻辑 */
(function () {
  'use strict';
  var A = window.Almanac;
  var COLOR_HEX = { '白色': '#efe9dc', '绿色': '#4f9a72', '红色': '#c85a4e', '黄色': '#dfb64f', '黑色': '#3b3733' };
  var EV_KEY = 'wnl.events.v1';
  var $ = function (id) { return document.getElementById(id); };
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var today = new Date();
  var view = { y: today.getFullYear(), m: today.getMonth() + 1 };
  var selected = null;

  /* ================= 法定节假日（据国务院办公厅通知：国办发明电〔2025〕7号、〔2026〕10号） ================= */
  var HOLIDAY = {};
  var WORKDAY = {};
  function mark(dates, name) { dates.forEach(function (d) { HOLIDAY[d] = name; }); }
  function work(dates, name) { dates.forEach(function (d) { WORKDAY[d] = name || '调休上班'; }); }
  function days(y, m, a, b) { var r = []; for (var d = a; d <= b; d++) r.push(y + '-' + pad(m) + '-' + pad(d)); return r; }
  // 2026
  mark(days(2026, 1, 1, 3), '元旦');
  mark(days(2026, 2, 15, 23), '春节');
  mark(days(2026, 4, 4, 6), '清明');
  mark(days(2026, 5, 1, 5), '劳动节');
  mark(days(2026, 6, 19, 21), '端午');
  mark(days(2026, 9, 25, 27), '中秋');
  mark(days(2026, 10, 1, 7), '国庆');
  work(['2026-01-04', '2026-02-14', '2026-02-28', '2026-05-09', '2026-09-20', '2026-10-10']);
  // 2027
  mark(days(2027, 1, 1, 3), '元旦');
  mark(days(2027, 2, 5, 13), '春节');
  mark(days(2027, 4, 3, 5), '清明');
  mark(days(2027, 5, 1, 5), '劳动节');
  mark(days(2027, 6, 9, 9), '端午');
  mark(days(2027, 9, 15, 15), '中秋');
  mark(days(2027, 10, 1, 7), '国庆');
  work(['2027-01-31', '2027-02-14', '2027-05-08', '2027-09-26', '2027-10-09']);

  /* ================= 家人农历生日 / 祭日（农历月、日） ================= */
  var L_FAMILY = [
    { m: 1, d: 4, name: '太爷爷祭日', kind: '祭' },
    { m: 1, d: 5, name: '母亲生日', kind: '生' },
    { m: 1, d: 22, name: '儿子生日（农历）', kind: '生' },
    { m: 1, d: 30, name: '本人生日（农历）', kind: '生' },
    { m: 2, d: 7, name: '岳父生日', kind: '生' },
    { m: 3, d: 13, name: '奶奶祭日', kind: '祭' },
    { m: 5, d: 28, name: '佛诞日', kind: '佛' },
    { m: 6, d: 5, name: '大奶奶祭日', kind: '祭' },
    { m: 6, d: 19, name: '父亲祭日', kind: '祭' },
    { m: 7, d: 13, name: '老婆生日（农历）', kind: '生' },
    { m: 7, d: 28, name: '太奶奶祭日', kind: '祭' },
    { m: 9, d: 10, name: '爷爷祭日', kind: '祭' },
    { m: 10, d: 14, name: '岳母生日', kind: '生' },
    { m: 10, d: 28, name: '佛诞日', kind: '佛' }
  ];
  /* 阳历生日 */
  var S_FAMILY = [
    { m: 2, d: 16, name: '儿子生日（阳历）' },
    { m: 2, d: 26, name: '本人生日（阳历）' },
    { m: 8, d: 23, name: '老婆生日（阳历）' }
  ];

  function loadEvents() { try { return JSON.parse(localStorage.getItem(EV_KEY) || '[]'); } catch (e) { return []; } }
  function saveEvents() { try { localStorage.setItem(EV_KEY, JSON.stringify(events)); } catch (e) { } }
  var events = loadEvents();

  function ymd(y, m, d) { return y + '-' + pad(m) + '-' + pad(d); }
  function todayYmd() { return ymd(today.getFullYear(), today.getMonth() + 1, today.getDate()); }
  function parseYmd(s) { var p = s.split('-').map(Number); return { y: p[0], m: p[1], d: p[2] }; }
  function addDays(dt, n) { return new Date(dt.getTime() + n * 86400000); }
  function isLastLunarDay(y, m, d) {
    var nx = addDays(new Date(Date.UTC(y, m - 1, d)), 1);
    var l = A.lunarDate(nx.getUTCFullYear(), nx.getUTCMonth() + 1, nx.getUTCDate());
    return l.day === 1;
  }

  /* 某日的农历纪念（含正月三十无此日时落到廿九） */
  function lunarFamily(y, m, d) {
    var l = A.lunarDate(y, m, d), out = [];
    if (l.isLeap) return out;
    L_FAMILY.forEach(function (f) {
      if (f.m !== l.month) return;
      if (l.day === f.d) out.push({ name: f.name, kind: f.kind, exact: true });
      else if (f.d > l.day && isLastLunarDay(y, m, d) && l.day >= 29) {
        out.push({ name: f.name, kind: f.kind, exact: false, note: '本月无三十，提前' });
      }
    });
    return out;
  }
  function solarFamily(y, m, d) {
    return S_FAMILY.filter(function (f) { return f.m === m && f.d === d; }).map(function (f) {
      return { name: f.name, kind: '生' };
    });
  }
  function holidayOf(y, m, d) {
    var k = ymd(y, m, d);
    if (HOLIDAY[k]) return { type: 'holiday', name: HOLIDAY[k] };
    if (WORKDAY[k]) return { type: 'work', name: WORKDAY[k] };
    return null;
  }

  function gaugeYear(y, m, d) {
    var lichun = 4;
    for (var i = 1; i <= 28; i++) { if (A.termOf(y, 2, i) === '立春') { lichun = i; break; } }
    var yy = (m < 2 || (m === 2 && d < lichun)) ? y - 1 : y;
    return A.gz60[((yy - 1984) % 60 + 60) % 60];
  }

  /* ================= 生日 / 佛诞 提醒（前一天 12:00、当天 10:00） ================= */
  var REMIND_KEY = 'wnl.reminded.v1';
  function loadReminded() { try { return JSON.parse(localStorage.getItem(REMIND_KEY) || '{}'); } catch (e) { return {}; } }
  function saveReminded(o) { try { localStorage.setItem(REMIND_KEY, JSON.stringify(o)); } catch (e) { } }
  // 计算某天的生日/佛诞（农历 + 阳历）
  function dayReminders(dt) {
    var y = dt.getFullYear(), m = dt.getMonth() + 1, d = dt.getDate(), out = [];
    var l = A.lunarDate(y, m, d);
    if (!l.isLeap) {
      L_FAMILY.forEach(function (f) {
        if (f.m === l.month && l.day === f.d) out.push({ name: f.name, lunar: l.monthName + l.dayName, kind: f.kind });
      });
    }
    S_FAMILY.forEach(function (f) {
      if (f.m === m && f.d === d) out.push({ name: f.name, lunar: m + '月' + d + '日', kind: '生' });
    });
    return out;
  }
  function checkReminders() {
    var now = new Date(), done = loadReminded(), changed = false;
    for (var off = 0; off <= 2; off++) {
      var day = addDays(now, off);
      var list = dayReminders(day);
      list.forEach(function (ev) {
        var y = day.getFullYear(), m = day.getMonth() + 1, d = day.getDate();
        var prev = addDays(day, -1);
        var extra = ev.kind === '祭' ? ' · 祭日' : ev.kind === '佛' ? ' · 佛诞' : ' · 生日快乐';
        var slots = [
          { at: new Date(prev.getFullYear(), prev.getMonth(), prev.getDate(), 12, 0, 0), key: 'p:' + y + m + d + ':' + ev.name, title: '明天是「' + ev.name + '」', body: ev.lunar + extra },
          { at: new Date(y, m - 1, d, 10, 0, 0), key: 't:' + y + m + d + ':' + ev.name, title: '今天是「' + ev.name + '」', body: ev.lunar + extra }
        ];
        slots.forEach(function (s) {
          if (done[s.key]) return;
          var diff = now - s.at;
          if (diff >= 0 && diff < 6 * 3600 * 1000) {
            done[s.key] = 1; changed = true;
            if (Date.now() - lastNativeTs > 120000) fireReminder(s.title, s.body);
          }
        });
      });
    }
    if (changed) saveReminded(done);
  }
  var remindTimer = null, lastNativeTs = 0;
  function buildAlarmSchedule(daysAhead) {
    var now = new Date(), out = [];
    for (var i = 0; i < daysAhead; i++) {
      var day = addDays(now, i), evs = dayReminders(day);
      evs.forEach(function (ev) {
        var y = day.getFullYear(), m = day.getMonth() + 1, d = day.getDate();
        var prev = addDays(day, -1);
        var extra = ev.kind === '祭' ? ' · 祭日' : ev.kind === '佛' ? ' · 佛诞' : ' · 生日快乐';
        var slots = [
          { at: new Date(prev.getFullYear(), prev.getMonth(), prev.getDate(), 12, 0, 0), title: '明天是「' + ev.name + '」', body: ev.lunar + extra },
          { at: new Date(y, m - 1, d, 10, 0, 0), title: '今天是「' + ev.name + '」', body: ev.lunar + extra }
        ];
        slots.forEach(function (sl) { if (sl.at > now) out.push(sl); });
      });
    }
    // 自定义提醒（事件里勾了“到点提醒”且带时间）
    events.forEach(function (e) {
      if (!e.remind || !e.time) return;
      var p = parseYmd(e.date), hm = e.time.split(':');
      var at = new Date(p.y, p.m - 1, p.d, +hm[0] || 0, +hm[1] || 0, 0);
      if (at > now) out.push({ at: at, title: '提醒：' + e.title, body: p.m + '月' + p.d + '日 ' + e.time });
    });
    out.sort(function (a, b) { return a.at - b.at; });
    return out.slice(0, iOSBridge ? 60 : 100);
  }
  function syncAlarms() {
    var list = buildAlarmSchedule(400);
    var lines = list.map(function (x) { return x.at.getTime() + '|' + x.title + '|' + x.body; });
    try {
      if (window.AndroidBridge && window.AndroidBridge.scheduleReminders) {
        window.AndroidBridge.scheduleReminders(lines.join('\n'));
      } else if (iOSBridge) {
        iOSBridge.postMessage({ type: 'schedule', payload: lines });
      }
    } catch (e) { }
  }
  function fireReminder(title, body) {
    var ov = $('remind');
    if (ov) {
      $('remindTitle').textContent = title;
      $('remindBody').textContent = body;
      $('remindTime').textContent = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      ov.classList.add('show');
      if (remindTimer) clearTimeout(remindTimer);
      remindTimer = setTimeout(function () { ov.classList.remove('show'); }, 60000);
    }
    chime(); chime();
    try {
      if (window.AndroidBridge && window.AndroidBridge.remind) window.AndroidBridge.remind(title, body);
      else if (iOSBridge) iOSBridge.postMessage({ type: 'remind', title: title, body: body });
    } catch (e) { }
  }

  /* ================= 报时 ================= */
  var iOSBridge = (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.clock) || null;
  function isIOS() { return !!iOSBridge; }
  var AC = null, chimeOn = true, lastChime = '';
  function audioCtx() {
    if (!AC) {
      try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; }
    }
    if (AC && AC.state === 'suspended') { try { AC.resume(); } catch (e) { } }
    return AC;
  }
  function chime() {
    if (!chimeOn) return;
    var ctx = audioCtx(); if (!ctx) return;
    var t0 = ctx.currentTime;
    [[880, 0], [988, 0.5], [784, 1.0]].forEach(function (p) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = p[0];
      g.gain.setValueAtTime(0.0001, t0 + p[1]);
      g.gain.exponentialRampToValueAtTime(0.30, t0 + p[1] + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + p[1] + 1.4);
      o.connect(g); g.connect(ctx.destination);
      o.start(t0 + p[1]); o.stop(t0 + p[1] + 1.5);
    });
  }
  document.addEventListener('pointerdown', function () { audioCtx(); }, { passive: true });

  /* ================= 桌面时钟 ================= */
  function renderClock() {
    var n = new Date();
    var y = n.getFullYear(), m = n.getMonth() + 1, d = n.getDate();
    var inf = A.info(y, m, d);
    $('cYear').textContent = y;
    $('cMonth').textContent = m + '月';
    $('cDay').textContent = d;
    $('cWeek').textContent = inf.weekName;
    $('cLunar').textContent = '农历' + inf.lunar.monthName + inf.lunar.dayName;
    $('cPillars').textContent = gaugeYear(y, m, d) + '年 · ' + inf.monthGz + '月 · ' + inf.dayGz + '日';

    var mk = [];
    var hd = holidayOf(y, m, d);
    if (hd) mk.push('<span class="chip ' + (hd.type === 'holiday' ? 'red' : 'brown') + '">' +
      (hd.type === 'holiday' ? hd.name + '·假' : '调休上班') + '</span>');
    if (inf.term) mk.push('<span class="chip gold">' + inf.term + '</span>');
    if (inf.fest && !hd) mk.push('<span class="chip gold">' + inf.fest + '</span>');
    if (inf.lunarFest) mk.push('<span class="chip gold">' + inf.lunarFest + '</span>');
    lunarFamily(y, m, d).forEach(function (f) {
      mk.push('<span class="chip ' + (f.kind === '祭' ? 'purple' : f.kind === '佛' ? 'brown' : 'gold') + '">' + f.name + '</span>');
    });
    solarFamily(y, m, d).forEach(function (f) { mk.push('<span class="chip gold">' + f.name + '</span>'); });
    mk.push('<span class="chip ' + (inf.starLuck === '吉' ? 'gold' : '') + '">' +
      (inf.starLuck === '吉' ? '★' : '') + inf.star + ' · ' + inf.starLuck + '</span>');
    if (inf.hongsha) mk.push('<span class="chip red">红煞</span>');
    if (inf.touxiu === '大') mk.push('<span class="chip green">大偷修</span>');
    if (inf.touxiu === '小') mk.push('<span class="chip green">小偷修</span>');
    if (inf.sili === '离') mk.push('<span class="chip purple">四离</span>');
    if (inf.sili === '绝') mk.push('<span class="chip purple">四绝</span>');
    $('cMarks').innerHTML = mk.join('');
    $('cWear').innerHTML = '<span class="sw" style="background:' + COLOR_HEX[inf.color] + '"></span>' +
      '宜穿 ' + inf.color + '（' + inf.wuxing + '日 · ' + inf.dayGz[1] + '支）';

    // 节气倒计时
    var nt = A.nextTerm(y, m, d);
    if (nt) {
      var target = new Date(nt.y, nt.m - 1, nt.d);
      var base = new Date(y, m - 1, d);
      var diff = Math.round((target - base) / 86400000);
      var txt = diff === 0 ? '就在今天' : diff === 1 ? '明天' : diff + ' 天';
      $('cTerm').innerHTML = '距 <b>' + nt.name + '</b> 还有 <b>' + txt + '</b>' +
        '　·　' + nt.m + '/' + nt.d + ' 周' + ['日', '一', '二', '三', '四', '五', '六'][target.getDay()];
    }
    renderEvents();
  }

  function upcoming(daysAhead) {
    var out = [];
    var base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    for (var i = 0; i < daysAhead; i++) {
      var dt = addDays(base, i);
      var y = dt.getFullYear(), m = dt.getMonth() + 1, d = dt.getDate();
      var inf = A.info(y, m, d);
      var hd = holidayOf(y, m, d);
      if (hd && hd.type === 'holiday') {
        if (!(i > 0 && HOLIDAY[ymd(dt.getFullYear(), dt.getMonth() + 1, d - 1)] === hd.name)) {
          var end = d;
          while (HOLIDAY[ymd(y, m, end + 1)] === hd.name) end++;
          out.push({ dt: dt, tag: '假', name: hd.name + '假期' + (end > d ? '（至 ' + (m) + '/' + end + '）' : ''), cls: 'red' });
        }
      } else if (hd && hd.type === 'work') {
        out.push({ dt: dt, tag: '班', name: '调休上班', cls: 'brown' });
      }
      if (inf.term) out.push({ dt: dt, tag: '节气', name: inf.term, cls: 'gold' });
      if (inf.fest) out.push({ dt: dt, tag: '节日', name: inf.fest, cls: 'gold' });
      if (inf.lunarFest) out.push({ dt: dt, tag: '农历', name: inf.lunarFest, cls: 'gold' });
      lunarFamily(y, m, d).forEach(function (f) {
        out.push({ dt: dt, tag: f.kind === '祭' ? '祭日' : f.kind === '佛' ? '佛诞' : '生日', name: f.name + (f.exact ? '' : '（廿九）'), cls: f.kind === '祭' ? 'purple' : 'gold' });
      });
      solarFamily(y, m, d).forEach(function (f) { out.push({ dt: dt, tag: '生日', name: f.name, cls: 'gold' }); });
    }
    events.forEach(function (e) {
      var p = parseYmd(e.date);
      var dt = new Date(p.y, p.m - 1, p.d);
      var diff = Math.round((dt - base) / 86400000);
      if (diff >= 0 && diff < daysAhead) out.push({ dt: dt, tag: e.time || '事件', name: e.title, user: true, cls: '' });
    });
    out.sort(function (a, b) {
      var d = a.dt - b.dt; if (d) return d;
      return (a.user ? 0 : 1) - (b.user ? 0 : 1);
    });
    return out.slice(0, 12);
  }

  function renderEvents() {
    var list = upcoming(21), html = '';
    var t0 = todayYmd();
    list.forEach(function (e) {
      var k = ymd(e.dt.getFullYear(), e.dt.getMonth() + 1, e.dt.getDate());
      var label = (k === t0 ? '今天' : (e.dt.getMonth() + 1) + '/' + e.dt.getDate() +
        ' 周' + ['日', '一', '二', '三', '四', '五', '六'][e.dt.getDay()]);
      html += '<li class="' + (k === t0 ? 'today' : '') + '"><span class="t">' + label +
        '</span><span class="n">' + esc(e.name) + '</span><span class="k ' + (e.cls || '') + '">' + esc(e.tag) + '</span></li>';
    });
    $('cEvents').innerHTML = html || '<div class="empty">近三周无节庆与自建事件</div>';
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function tick() {
    var n = new Date();
    $('cHm').textContent = pad(n.getHours()) + ':' + pad(n.getMinutes());
    $('cSec').textContent = ':' + pad(n.getSeconds());
    // 7–22 点整点报时
    if (n.getMinutes() === 0 && n.getSeconds() === 0) {
      var h = n.getHours();
      var key = n.getFullYear() + pad(n.getMonth() + 1) + pad(n.getDate()) + pad(h);
      if (h >= 7 && h <= 22 && lastChime !== key) { lastChime = key; chime(); }
    }
    if (n.getDate() !== today.getDate() || n.getMonth() !== today.getMonth()) {
      today = n; renderClock();
      if (window.AndroidBridge && window.AndroidBridge.scheduleReminders) syncAlarms();
    }
    if (n.getSeconds() % 20 === 0) checkReminders();
  }
  setInterval(tick, 1000);

  /* ================= 月历 ================= */
  var WD = ['日', '一', '二', '三', '四', '五', '六'];
  function renderMonth() {
    var cells = A.monthMatrix(view.y, view.m);
    var useGrid = !!(window.CSS && window.CSS.supports && window.CSS.supports('display', 'grid'));
    var wdFlat = WD.map(function (w, i) {
      return '<div class="wd' + (i === 0 ? ' sun' : '') + '">' + w + '</div>';
    }).join('');
    var head = useGrid ? wdFlat : '<div class="whead">' + wdFlat + '</div>';
    var t0 = todayYmd(), cellHtmls = [];
    for (var i = 0; i < 42; i++) {
      var c = cells[i];
      if (!c) { cellHtmls.push('<div class="cell out"></div>'); continue; }
      var inf = A.info(c.y, c.m, c.d);
      var hd = holidayOf(c.y, c.m, c.d);
      var fam = lunarFamily(c.y, c.m, c.d).length + solarFamily(c.y, c.m, c.d).length;
      var cls = 'cell' + (c.out ? ' out' : '') + (ymd(c.y, c.m, c.d) === t0 ? ' today' : '') +
        (inf.week === 0 ? ' sun' : '') + (hd && hd.type === 'holiday' ? ' holiday' : '') +
        (hd && hd.type === 'work' ? ' work' : '');
      var dots = '';
      if (inf.hongsha) dots += '<i style="background:#cf5b4f"></i>';
      if (inf.touxiu) dots += '<i style="background:#5f9f7b"></i>';
      if (inf.sili) dots += '<i style="background:#9a7fc0"></i>';
      if (fam) dots += '<i style="background:#d9b45c"></i>';
      var lunarTxt = inf.lunar.day === 1 ? inf.lunar.monthName : inf.lunar.dayName;
      cellHtmls.push('<div class="' + cls + '" data-y="' + c.y + '" data-m="' + c.m + '" data-d="' + c.d + '">' +
        (inf.starLuck === '吉' ? '<span class="star">★</span>' : '') +
        '<div class="n">' + c.d + '</div>' +
        '<div class="l">' + lunarTxt + '</div>' +
        '<div class="g">' + inf.dayGz + '</div>' +
        (hd && hd.type === 'holiday' ? '<div class="hn">' + esc(hd.name) + '</div>' : '') +
        (dots ? '<div class="b">' + dots + '</div>' : '') +
        '<div class="wear" style="background:' + COLOR_HEX[inf.color] + '"></div>' +
        '</div>');
    }
    var body = '';
    if (useGrid) {
      body = cellHtmls.join('');
    } else {
      for (var r0 = 0; r0 < 42; r0 += 7) {
        body += '<div class="wrow">' + cellHtmls.slice(r0, r0 + 7).join('') + '</div>';
      }
    }
    $('calGrid').innerHTML = head + body;
    var f0 = A.info(view.y, view.m, 1), l0 = A.info(view.y, view.m, A.daysInMonth(view.y, view.m));
    var lm1 = f0.lunar.monthName, lm2 = l0.lunar.monthName;
    var mzs = [f0.monthGz];
    for (var dd = 2; dd <= A.daysInMonth(view.y, view.m); dd++) {
      var mm = A.info(view.y, view.m, dd).monthGz;
      if (mm !== mzs[mzs.length - 1]) mzs.push(mm);
    }
    $('calTitle').textContent = view.y + ' 年 ' + view.m + ' 月';
    $('calSub').textContent = '农历' + (lm1 === lm2 ? lm1 : lm1 + '—' + lm2) + ' · 月建 ' + mzs.join('→');
    var good = 0, hs = 0, tx = 0, sj = 0, hol = 0;
    for (var d2 = 1; d2 <= A.daysInMonth(view.y, view.m); d2++) {
      var x = A.info(view.y, view.m, d2);
      if (x.starLuck === '吉') good++;
      if (x.hongsha) hs++;
      if (x.touxiu) tx++;
      if (x.sili) sj++;
      var hd2 = holidayOf(view.y, view.m, d2);
      if (hd2 && hd2.type === 'holiday') hol++;
    }
    $('calFootInfo').textContent = '吉星 ' + good + ' · 红煞 ' + hs + ' · 偷修 ' + tx +
      ' · 四离四绝 ' + sj + ' · 法定假日 ' + hol;
    Array.prototype.forEach.call($('calGrid').querySelectorAll('.cell'), function (el) {
      el.addEventListener('click', function () {
        openDay(+el.dataset.y, +el.dataset.m, +el.dataset.d);
      });
    });
  }

  function openDay(y, m, d) {
    selected = { y: y, m: m, d: d };
    var inf = A.info(y, m, d);
    var hd = holidayOf(y, m, d);
    var fam = lunarFamily(y, m, d).concat(solarFamily(y, m, d));
    var rows = [
      ['公历', y + '-' + pad(m) + '-' + pad(d) + ' ' + inf.weekName],
      ['农历', inf.lunar.monthName + inf.lunar.dayName + (inf.lunar.isLeap ? '（闰月）' : '')],
      ['年干支', gaugeYear(y, m, d)],
      ['月干支', inf.monthGz + '月'],
      ['日干支', inf.dayGz + '日'],
      ['节气', inf.term || '—'],
      ['金符九星', (inf.starLuck === '吉' ? '★' : '') + inf.star + '（' + inf.starAlias + '·' + inf.starLuck + '）'],
      ['红煞', inf.hongsha || '—'],
      ['偷修', inf.touxiu ? inf.touxiu + '偷修' : '—'],
      ['四离四绝', inf.sili === '离' ? '四离' : inf.sili === '绝' ? '四绝' : '—'],
      ['穿衣', inf.color + '（' + inf.wuxing + '日）'],
      ['法定节假日', hd ? (hd.type === 'holiday' ? hd.name + '假期（休）' : '调休上班（班）') : '—'],
      ['生日/纪念', fam.length ? fam.map(function (f) { return f.name + (f.exact === false ? '（廿九）' : ''); }).join('、') : '—']
    ];
    var mine = events.filter(function (e) { return e.date === ymd(y, m, d); });
    var html = '<h3>' + m + ' 月 ' + d + ' 日 <span class="close" onclick="document.getElementById(\'sheet\').classList.remove(\'open\')">关闭</span></h3>' +
      '<div class="lunar-big">' + inf.lunar.monthName + inf.lunar.dayName + ' · ' + inf.weekName +
      (hd && hd.type === 'holiday' ? ' · ' + hd.name + '假期' : '') + '</div>' +
      '<div class="kv">' + rows.map(function (r) {
        return '<div><span>' + r[0] + '</span><span>' + esc(r[1]) + '</span></div>';
      }).join('') + '</div>';
    if (mine.length) {
      html += '<div class="evlist">' + mine.map(function (e) {
        return '<div><span>' + (e.time || '全天') + '　' + esc(e.title) + '</span>' +
          '<span class="del" data-id="' + e.id + '">删除</span></div>';
      }).join('') + '</div>';
    }
    html += '<div class="row"><button id="sheetAdd">在此日加事件</button></div>';
    $('sheetIn').innerHTML = html;
    $('sheet').classList.add('open');
    $('sheetAdd').onclick = function () { $('sheet').classList.remove('open'); openAdd(ymd(y, m, d)); };
    Array.prototype.forEach.call($('sheetIn').querySelectorAll('.del'), function (el) {
      el.onclick = function () {
        events = events.filter(function (e) { return e.id !== el.dataset.id; });
        saveEvents(); openDay(y, m, d); renderClock();
      };
    });
  }

  /* ================= 加事件 ================= */
  function openAdd(dateStr) {
    $('evDate').value = dateStr || (selected ? ymd(selected.y, selected.m, selected.d) : todayYmd());
    $('evTime').value = '';
    $('evTitle').value = '';
    renderEvList();
    $('addSheet').classList.add('open');
    setTimeout(function () { $('evTitle').focus(); }, 120);
  }
  function renderEvList() {
    var list = events.slice().sort(function (a, b) { return (a.date + (a.time || '')) < (b.date + (b.time || '')) ? -1 : 1; });
    $('evList').innerHTML = list.length ? list.map(function (e) {
      var p = parseYmd(e.date);
      return '<div><span>' + p.m + '/' + p.d + ' ' + (e.time || '') + '　' + esc(e.title) +
        (e.remind ? ' 🔔' : '') + '</span><span class="del" data-id="' + e.id + '">删除</span></div>';
    }).join('') : '<div style="color:#7d7466;font-size:2.3vmin;padding:1vmin 0">暂无自建事件</div>';
    Array.prototype.forEach.call($('evList').querySelectorAll('.del'), function (el) {
      el.onclick = function () {
        events = events.filter(function (e) { return e.id !== el.dataset.id; });
        saveEvents(); renderEvList(); renderClock();
      };
    });
  }
  $('evSave').onclick = function () {
    var date = $('evDate').value, title = $('evTitle').value.trim();
    if (!date || !title) { $('evTitle').focus(); return; }
    var tm = $('evTime').value || '';
    var rm = $('evRemind') ? $('evRemind').checked : false;
    events.push({ id: 'e' + Date.now(), date: date, time: tm, title: title, remind: rm && !!tm });
    saveEvents(); $('addSheet').classList.remove('open'); renderClock();
    if (selected) openDay(selected.y, selected.m, selected.d);
  };
  $('evCancel').onclick = function () { $('addSheet').classList.remove('open'); };

  /* ================= 视图切换 ================= */
  function showClock() {
    $('calView').classList.remove('active'); $('clockView').classList.add('active');
    renderClock();
  }
  function showCal() {
    $('clockView').classList.remove('active'); $('calView').classList.add('active');
    renderMonth();
  }
  $('btnCal').onclick = showCal;
  $('backClock').onclick = showClock;
  $('btnAdd').onclick = function () { openAdd(todayYmd()); };
  $('todayBtn').onclick = function () {
    view = { y: today.getFullYear(), m: today.getMonth() + 1 }; renderMonth();
  };
  $('prevM').onclick = function () { view.m--; if (view.m < 1) { view.m = 12; view.y--; } renderMonth(); };
  $('nextM').onclick = function () { view.m++; if (view.m > 12) { view.m = 1; view.y++; } renderMonth(); };
  $('sheet').onclick = function (e) { if (e.target === this) this.classList.remove('open'); };
  $('addSheet').onclick = function (e) { if (e.target === this) this.classList.remove('open'); };

  /* 深浅色切换 */
  var THEME_KEY = 'wnl.theme';
  var theme = window.__FORCE_THEME || 'dark';
  try { theme = window.__FORCE_THEME || localStorage.getItem(THEME_KEY) || 'dark'; } catch (e) { }
  var btnTheme = $('btnTheme');
  function paintTheme() {
    if (document.body) document.body.classList.toggle('light', theme === 'light');
    btnTheme.textContent = theme === 'light' ? '深色' : '浅色';
  }
  btnTheme.onclick = function () {
    theme = theme === 'light' ? 'dark' : 'light';
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) { }
    paintTheme();
  };
  paintTheme();

  var btnChime = $('btnChime');
  function paintChime() {
    btnChime.textContent = chimeOn ? '报时 开' : '报时 关';
    btnChime.className = chimeOn ? 'on' : 'off';
  }
  btnChime.onclick = function () { chimeOn = !chimeOn; paintChime(); if (chimeOn) { audioCtx(); chime(); } };
  paintChime();

  window.appBack = function () {
    if ($('addSheet').classList.contains('open')) { $('addSheet').classList.remove('open'); return true; }
    if ($('sheet').classList.contains('open')) { $('sheet').classList.remove('open'); return true; }
    if ($('calView').classList.contains('active')) { showClock(); return true; }
    return false;
  };

  var qm = /ym=(\d{4})-(\d{1,2})/.exec(location.search || '');
  if (qm) view = { y: +qm[1], m: +qm[2] };
  var boot = $('boot'), errBox = $('err');
  if (errBox) errBox.style.display = 'none';
  window.onerror = function (msg, url, line) {
    if (errBox) {
      errBox.style.display = 'block';
      errBox.textContent = '脚本错误：' + msg + '  (' + (url || '').split('/').pop() + ':' + line + ')';
    }
    return false;
  };
  window.__alarmList = buildAlarmSchedule;
  window.__syncAlarms = function () { syncAlarms(); };
  window.__testRemind = fireReminder;
  window.__showReminder = function (t, b) { lastNativeTs = Date.now(); fireReminder(t, b); };
  renderClock(); tick();
  if ((window.AndroidBridge && window.AndroidBridge.scheduleReminders) || iOSBridge) syncAlarms();
  checkReminders();
  if ('serviceWorker' in navigator && /^https?:/.test(location.protocol)) {
    navigator.serviceWorker.register('sw.js').catch(function () { });
  }
  if (boot) boot.style.display = 'none';
  if (window.__FORCE_CAL || location.hash === '#cal' || qm) showCal();
})();
