/*
 * 历法引擎（与 Python 版规则逐条对齐）
 * 依赖：CALDATA（1900–2100 的节气日序、春节日序、农历月大小）
 */
(function (global) {
  'use strict';
  var GAN = '甲乙丙丁戊己庚辛壬癸';
  var ZHI = '子丑寅卯辰巳午未申酉戌亥';
  var GZ60 = [];
  for (var i = 0; i < 60; i++) GZ60.push(GAN[i % 10] + ZHI[i % 12]);

  var STAR = ['妖星', '惑星', '禾刀', '煞贡', '直星', '卜木', '角己', '人专', '立早'];
  var STAR_LUCK = { '煞贡': '吉', '直星': '吉', '人专': '吉' };
  var STAR_ALIAS = {
    '煞贡': '青龙天德符', '直星': '金柜符', '人专': '六阴金堂符',
    '妖星': '玄武符', '惑星': '朱雀符', '禾刀': '白虎符',
    '卜木': '黑道符', '角己': '太阴符', '立早': '勾陈符'
  };
  var BIG = ['壬子', '癸丑', '丙辰', '丁巳', '戊午', '己未', '庚申', '辛酉'];
  var SMALL = ['壬午', '癸未', '庚子', '辛丑', '戊子', '己丑'];
  var COLOR = {
    '子': '绿色', '亥': '绿色', '寅': '红色', '卯': '红色', '巳': '黄色',
    '午': '黄色', '申': '黑色', '酉': '黑色',
    '丑': '白色', '辰': '白色', '未': '白色', '戌': '白色'
  };
  var WUXING = {
    '寅': '木', '卯': '木', '巳': '火', '午': '火', '申': '金',
    '酉': '金', '亥': '水', '子': '水', '丑': '土', '辰': '土', '未': '土', '戌': '土'
  };
  var TERM = ['小寒', '大寒', '立春', '雨水', '惊蛰', '春分', '清明', '谷雨',
    '立夏', '小满', '芒种', '夏至', '小暑', '大暑', '立秋', '处暑',
    '白露', '秋分', '寒露', '霜降', '立冬', '小雪', '大雪', '冬至'];
  var SI_LI = { '春分': 1, '秋分': 1, '夏至': 1, '冬至': 1 };
  var SI_JUE = { '立春': 1, '立夏': 1, '立秋': 1, '立冬': 1 };
  var LUNAR_MONTH = ['', '正月', '二月', '三月', '四月', '五月', '六月',
    '七月', '八月', '九月', '十月', '冬月', '腊月'];
  var LUNAR_DAY = ['', '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
    '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
    '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];
  var WEEK = ['日', '一', '二', '三', '四', '五', '六'];
  var WEEK_FULL = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

  function isLeapYear(y) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; }
  function daysInYear(y) { return isLeapYear(y) ? 366 : 365; }
  function daysInMonth(y, m) { return [31, isLeapYear(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]; }
  function doy(y, m, d) { return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 86400000) + 1; }
  function jdn(y, m, d) {
    var a = Math.floor((14 - m) / 12), yy = y + 4800 - a, mm = m + 12 * a - 3;
    return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
  }
  function dayGZ(y, m, d) { return GZ60[((jdn(y, m, d) + 49) % 60 + 60) % 60]; }

  function yearData(y) { return CALDATA.term[y - CALDATA.y0] || null; }

  // 某日的节气名（无则 ''）
  function termOf(y, m, d) {
    var t = yearData(y), dd = doy(y, m, d);
    if (!t) return '';
    for (var i = 0; i < 24; i++) if (t[i] === dd) return TERM[i];
    return '';
  }
  // 最近的、在当日或之前的「节」序号（偶数下标）
  function jieIndex(t, dd) {
    var k = 0;
    for (var i = 0; i < 24; i += 2) if (t[i] <= dd) k = i;
    return k;
  }
  function monthGZ(y, m, d) {
    var dd0 = doy(y, m, d), t = yearData(y) || yearData(y - 1) || yearData(y + 1);
    var j = -1;
    for (var k = 0; k < 24; k += 2) if (t[k] <= dd0) j = k;
    var zhi, solarYear;
    if (j < 0) { zhi = 0; solarYear = y - 1; }      // 小寒前：上年大雪起子月
    else { zhi = (j / 2 + 1) % 12; solarYear = dd0 >= t[2] ? y : y - 1; }
    var ygz = ((solarYear - 1984) % 60 + 60) % 60;
    var yearGan = ygz % 10;
    var offset = (zhi - 2 + 12) % 12;
    var gan = (yearGan * 2 + 2 + offset) % 10;
    return { gz: GAN[gan] + ZHI[zhi], zhi: ZHI[zhi], ganIndex: gan };
  }
  function lunarDate(y, m, d) {
    var dd = doy(y, m, d), ly = y;
    var start = CALDATA.lny[y - CALDATA.y0];
    if (dd < start) ly = y - 1;
    var rest = dd - CALDATA.lny[ly - CALDATA.y0];
    if (ly < y) rest += daysInYear(ly);
    var lens = CALDATA.mon[ly - CALDATA.y0], leap = (CALDATA.leap[ly - CALDATA.y0] || 0);
    if (!lens) return { year: ly, month: 0, day: 0, isLeap: false, monthName: '—', dayName: '—' };
    var idx = 0, month = 1, isLeap = false, day = rest + 1;
    while (true) {
      var len = lens[idx] ? 30 : 29;
      if (day <= len) break;
      day -= len;
      idx++;
      if (leap && month === leap && !isLeap) { isLeap = true; }
      else { month++; isLeap = false; }
    }
    return { year: ly, month: month, day: day, isLeap: isLeap, monthName: (isLeap ? '闰' : '') + LUNAR_MONTH[month], dayName: LUNAR_DAY[day] };
  }

  function starOf(dayGz, monthZhi) {
    var off = ('寅申巳亥').indexOf(monthZhi) >= 0 ? 0 : ('子午卯酉').indexOf(monthZhi) >= 0 ? 1 : 2;
    return STAR[(GZ60.indexOf(dayGz) + off) % 9];
  }
  function hongsha(lunarMonth, dayZhi) {
    var cls = [1, 4, 7, 10].indexOf(lunarMonth) >= 0 ? '孟' : [2, 5, 8, 11].indexOf(lunarMonth) >= 0 ? '仲' : '季';
    var need = cls === '孟' ? '酉' : cls === '仲' ? '巳' : '丑';
    return dayZhi === need ? (cls + '月' + need + '日') : '';
  }
  function touxiu(gz) {
    if (BIG.indexOf(gz) >= 0) return '大';
    if (SMALL.indexOf(gz) >= 0) return '小';
    return '';
  }
  function siliSijue(y, m, d) {
    var nx = new Date(Date.UTC(y, m - 1, d) + 86400000);
    var t = termOf(nx.getUTCFullYear(), nx.getUTCMonth() + 1, nx.getUTCDate());
    if (SI_LI[t]) return '离';
    if (SI_JUE[t]) return '绝';
    return '';
  }

  // 公历固定节日与农历节日
  var FEST = { '1-1': '元旦', '2-14': '情人节', '3-8': '妇女节', '5-1': '劳动节', '6-1': '儿童节', '9-10': '教师节', '10-1': '国庆节', '12-25': '圣诞节' };
  var LFEST = { '1-1': '春节', '1-15': '元宵节', '5-5': '端午节', '7-7': '七夕', '8-15': '中秋节', '9-9': '重阳节' };

  function info(y, m, d) {
    var gz = dayGZ(y, m, d);
    var mgz = monthGZ(y, m, d);
    var lu = lunarDate(y, m, d);
    var star = starOf(gz, mgz.zhi);
    var term = termOf(y, m, d);
    var zhi = gz[1];
    var fest = FEST[m + '-' + d] || '';
    var lfest = LFEST[lu.month + '-' + lu.day] || '';
    var nd = new Date(Date.UTC(y, m - 1, d) + 86400000);
    var nlu = lunarDate(nd.getUTCFullYear(), nd.getUTCMonth() + 1, nd.getUTCDate());
    if (nlu.month === 1 && nlu.day === 1) lfest = '除夕';
    if (term === '清明') fest = fest || '清明节';
    return {
      y: y, m: m, d: d, week: new Date(Date.UTC(y, m - 1, d)).getUTCDay(),
      weekName: WEEK_FULL[new Date(Date.UTC(y, m - 1, d)).getUTCDay()],
      dayGz: gz, monthGz: mgz.gz, monthZhi: mgz.zhi,
      lunar: lu,
      star: star, starLuck: STAR_LUCK[star] || '凶', starAlias: STAR_ALIAS[star],
      term: term,
      hongsha: hongsha(lu.month, zhi),
      touxiu: touxiu(gz),
      sili: siliSijue(y, m, d),
      color: COLOR[zhi], wuxing: WUXING[zhi],
      fest: fest, lunarFest: lfest
    };
  }

  // 下一个节气（含当日之后）
  function nextTerm(y, m, d) {
    var dd = doy(y, m, d), t = yearData(y);
    for (var i = 0; i < 24; i++) if (t[i] > dd) return { name: TERM[i], y: y, m: m, d: d + (t[i] - dd), doy: t[i] };
    var t2 = yearData(y + 1);
    return { name: TERM[0], y: y + 1, m: 1, d: t2[0], doy: t2[0] };
  }

  function monthMatrix(y, m) {
    var first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
    var total = daysInMonth(y, m);
    var cells = [];
    for (var i = 0; i < first; i++) {
      var py = m === 1 ? y - 1 : y, pm = m === 1 ? 12 : m - 1;
      cells.push({ out: true, y: py, m: pm, d: daysInMonth(py, pm) - first + i + 1 });
    }
    for (var d = 1; d <= total; d++) cells.push({ out: false, y: y, m: m, d: d });
    while (cells.length % 7) {
      var nd = cells.length - first - total + 1;
      var ny = m === 12 ? y + 1 : y, nm = m === 12 ? 1 : m + 1;
      cells.push({ out: true, y: ny, m: nm, d: nd });
    }
    return cells;
  }

  global.Almanac = {
    info: info, monthMatrix: monthMatrix, nextTerm: nextTerm,
    dayGZ: dayGZ, termOf: termOf, lunarDate: lunarDate,
    STAR: STAR, STAR_LUCK: STAR_LUCK, TERM: TERM, WEEK: WEEK,
    COLOR: COLOR, gz60: GZ60, isLeapYear: isLeapYear, daysInMonth: daysInMonth
  };
  if (typeof module !== 'undefined') module.exports = global.Almanac;
})(typeof globalThis !== 'undefined' ? globalThis : this);
