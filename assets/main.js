/* 퐁퐁폰 공통 스크립트 - 바닐라 JS, 의존성 없음 */
(function(){
  'use strict';
  var $ = function(s, r){ return (r || document).querySelector(s); };
  var $$ = function(s, r){ return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ==========================================================
     데이터 렌더 (data/*.js 가 window.PPP 에 넣어 둔 값을 DOM에 그림)
     - 하드코딩 마크업 대신 <template> 1개 + 데이터
     - 데이터가 비면 "준비 중" 빈 상태 카드
     ========================================================== */
  var PPP = window.PPP || {};
  var won = function(n){ return (Number(n) || 0).toLocaleString('ko-KR'); };
  var tpl = function(id){ var t = document.getElementById(id); return t && t.content ? t.content.firstElementChild : null; };
  var fill = function(node, sel, text){ var el = sel ? $(sel, node) : node; if (el) el.textContent = text == null ? '' : String(text); return el; };
  var prep = function(host, msg){
    var d = document.createElement('div'); d.className = 'prep'; d.textContent = msg || '준비 중입니다.'; host.appendChild(d); return d;
  };
  var alias = function(s){
    return String(s || '').toLowerCase()
      .replace(/갤럭시/g, 'galaxy').replace(/아이폰/g, 'iphone').replace(/아이패드/g, 'ipad').replace(/울트라/g, 'ultra')
      .replace(/플립/g, 'flip').replace(/폴드/g, 'fold').replace(/프로/g, 'pro').replace(/픽셀/g, 'pixel').replace(/삼성/g, 'samsung').replace(/애플/g, 'apple');
  };
  var productsOnSale = function(){
    return (PPP.products || []).filter(function(p){ return p && p.status !== '숨김'; });
  };
  var recommendedPlans = function(n){
    var all = (PPP.plans && PPP.plans.mvno) || [];
    var rec = all.filter(function(p){ return (p.badges || []).indexOf('추천') !== -1; });
    var out = rec.slice(0, n);
    all.forEach(function(p){ if (out.length < n && out.indexOf(p) === -1) out.push(p); });
    return out;
  };
  var splitData = function(d){
    d = String(d || ''); var i = d.lastIndexOf(' + ');
    if (i !== -1 && /bps/i.test(d.slice(i))) return { main: d.slice(0, i), sub: d.slice(i + 1) };
    return { main: d, sub: '' };
  };
  var dataTier = function(d){
    d = String(d || '');
    if (/무제한|일\s*\d/.test(d)) return 'big';
    var m = d.match(/([\d.]+)\s*(GB|MB)/i); if (!m) return 'small';
    var gb = parseFloat(m[1]) / (m[2].toUpperCase() === 'MB' ? 1024 : 1);
    return gb <= 10 ? 'small' : gb <= 50 ? 'mid' : 'big';
  };
  var netKey = function(n){ return String(n || '').toLowerCase().replace('+', ''); };
  var planGen = function(p){ return (p.network || '') + '망 · ' + (/(^|\s)5G(\s|$)/i.test(p.name || '') ? '5G' : 'LTE'); };
  var planSpec = function(p){
    var c = p.call ? ('통화 ' + p.call) : '', s = p.sms ? ('문자 ' + p.sms) : '';
    return [c, s].filter(Boolean).join(' · ');
  };
  var prepaidDesc = function(p){
    var parts = [];
    if (p.data) parts.push('데이터 ' + p.data);
    if (p.call) parts.push('음성 ' + p.call);
    var s = parts.join(' + ');
    if (p.period) s += (s ? ' · ' : '') + p.period;
    if (p.note) s += (s ? ' · ' : '') + p.note;
    return s;
  };

  /* 히어로 카드 캐러셀 (#heroCar[data-hero="mix"|"buyback"]) */
  (function(){
    var car = $('#heroCar'); if (!car || !car.hasAttribute('data-hero')) return;
    var track = $('.car-track', car), t = tpl('tpl-pcard'); if (!track || !t) return;
    var mode = car.getAttribute('data-hero');
    var items = ((PPP.buyback && PPP.buyback.items) || []).slice(0, mode === 'mix' ? 5 : 8);
    var plans = mode === 'mix' ? recommendedPlans(4) : [];
    var pre = mode === 'mix' ? ((PPP.plans && PPP.plans.prepaid) || []).slice(0, 1) : [];
    var cards = [];
    items.forEach(function(b, i){
      cards.push({ kind:'sell', tag:'내폰팔기 완료', model:b.name, label:'최고 매입가', price:won(b.prices && b.prices.S) + '원', href: mode === 'mix' ? 'sell.html#price' : '#price', i:i });
    });
    plans.forEach(function(p, i){
      cards.push({ kind:'plan', tag:'알뜰폰 개통 완료', model:p.name + ' 요금제', label:'월', price:won(p.promoMonthly || p.monthly) + '원', href:'mvno.html#plans', i:i });
    });
    pre.forEach(function(p){
      cards.push({ kind:'plan', tag:'선불폰 개통 완료', model:p.name + ' 요금제', label:'월', price:won(p.price) + '원', href:'prepaid.html#fee', i:99 });
    });
    if (mode === 'mix') cards.sort(function(a, b){ return a.i - b.i || (a.kind === 'sell' ? -1 : 1); });
    if (!cards.length) { car.hidden = true; return; }
    cards.forEach(function(c){
      var n = t.cloneNode(true); n.href = c.href;
      $('.tag', n).className = 'tag ' + c.kind; fill(n, '.tag', c.tag); fill(n, '.model', c.model);
      $('.fig .ic', n).innerHTML = '<use href="' + (c.kind === 'plan' ? '#i-device-sim' : '#i-device') + '"/>';
      if (c.kind === 'plan') $('.fig .ic', n).classList.add('sim');
      fill(n, '.price .lbl', c.label); fill(n, '.price b', c.price);
      track.appendChild(n);
    });
  })();

  /* 내폰팔기 모델 그리드 (#modelGrid) */
  (function(){
    var grid = $('#modelGrid'), t = tpl('tpl-mcard'); if (!grid || !t) return;
    var items = (PPP.buyback && PPP.buyback.items) || [];
    if (!items.length) { prep(grid, '매입 시세를 준비 중입니다. 모델명과 용량을 카카오톡으로 보내 주시면 바로 안내드립니다.'); grid.classList.add('is-empty'); return; }
    items.forEach(function(b){
      var n = t.cloneNode(true);
      n.setAttribute('data-brand', b.brand || '기타');
      n.setAttribute('data-search', [b.name, b.storage, b.brand, b.note, alias(b.name), alias(b.brand)].join(' ').toLowerCase());
      fill(n, '.brand', b.brand === '기타' && b.note ? b.note.replace(/^예시\s*·\s*/, '') : b.brand);
      fill(n, '.model', b.name); fill(n, '.cap', (b.storage || '') + ' 기준');
      fill(n, '.price b .amt', won(b.prices && b.prices.S) + '원');
      grid.appendChild(n);
    });
    $$('[data-buyback-updated]').forEach(function(el){ el.textContent = (PPP.buyback.updatedAt || '') + ' 기준'; });
  })();

  /* 시세 TOP 랭킹 ([data-rank="buyback"]) */
  (function(){
    var list = $('[data-rank="buyback"]'), t = tpl('tpl-rank-item'); if (!list || !t) return;
    var items = ((PPP.buyback && PPP.buyback.items) || []).slice(0, 10);
    if (!items.length) { list.removeAttribute('data-roll'); var li = document.createElement('li'); li.className = 'prep'; li.textContent = '시세 준비 중'; list.appendChild(li); return; }
    items.forEach(function(b){
      var n = t.cloneNode(true); fill(n, '.name', b.name); fill(n, '.price .amt', won(b.prices && b.prices.S) + '원'); list.appendChild(n);
    });
  })();

  /* 요금제 TOP 랭킹 ([data-rank="plans"]) */
  (function(){
    var list = $('[data-rank="plans"]'), t = tpl('tpl-rank-plan'); if (!list || !t) return;
    var rows = recommendedPlans(4).map(function(p){ var d = splitData(p.data); return { name:p.name, price:'월 ' + won(p.promoMonthly || p.monthly) + '원', sub:(d.main + (d.sub ? ' ' + d.sub : '')) }; });
    ((PPP.plans && PPP.plans.prepaid) || []).slice(0, 2).forEach(function(p){ rows.push({ name:p.name, price:'월 ' + won(p.price) + '원', sub:prepaidDesc({ data:p.data, call:p.call }) }); });
    if (!rows.length) { list.removeAttribute('data-roll'); var li = document.createElement('li'); li.className = 'prep'; li.textContent = '요금제 준비 중'; list.appendChild(li); return; }
    rows.forEach(function(r){ var n = t.cloneNode(true); fill(n, '.name', r.name); fill(n, '.price .amt', r.price); fill(n, '.price small', r.sub); list.appendChild(n); });
  })();

  /* 알뜰폰 요금제 그리드 (#planGrid) */
  (function(){
    var grid = $('#planGrid'), t = tpl('tpl-plan'); if (!grid || !t) return;
    var items = (PPP.plans && PPP.plans.mvno) || [];
    if (!items.length) { prep(grid, '요금제를 준비 중입니다. 원하시는 데이터량을 카카오톡으로 알려 주시면 맞는 요금제를 찾아드립니다.'); grid.classList.add('is-empty'); return; }
    items.forEach(function(p){
      var n = t.cloneNode(true), d = splitData(p.data);
      n.setAttribute('data-tier', dataTier(p.data)); n.setAttribute('data-net', netKey(p.network));
      fill(n, '.net', planGen(p)); fill(n, '.name', p.name);
      fill(n, '.data .main', d.main); fill(n, '.data small', d.sub || p.note || '');
      fill(n, '.spec', planSpec(p));
      var bd = $('.pbadges', n);
      if (bd) { (p.badges || []).forEach(function(b){ var s = document.createElement('span'); s.className = 'pbadge'; s.textContent = b; bd.appendChild(s); }); if (!(p.badges || []).length) bd.remove(); }
      if (p.promoMonthly) { fill(n, '.fee b', '월 ' + won(p.promoMonthly) + '원'); fill(n, '.fee small', p.promoMonths ? (p.promoMonths + '개월 후 월 ' + won(p.monthly) + '원') : ('정가 월 ' + won(p.monthly) + '원')); }
      else { fill(n, '.fee b', '월 ' + won(p.monthly) + '원'); fill(n, '.fee small', '예시 요금'); }
      grid.appendChild(n);
    });
  })();

  /* 선불폰 망별 요금 패널 (#feePanels) */
  (function(){
    var host = $('#feePanels'), tp = tpl('tpl-fee-panel'), ti = tpl('tpl-fee-item'); if (!host || !tp || !ti) return;
    var items = (PPP.plans && PPP.plans.prepaid) || [];
    var nets = [['SKT', 'skt'], ['KT', 'kt'], ['LGU+', 'lgu']];
    nets.forEach(function(nn, idx){
      var p = tp.cloneNode(true); p.setAttribute('data-panel', nn[1]); p.id = 'fee-' + nn[1]; if (idx === 0) p.classList.add('on');
      fill(p, 'h3 .point', nn[0] + '망');
      var ul = $('.fee-list', p);
      var rows = items.filter(function(x){ return netKey(x.network) === nn[1]; });
      if (!rows.length) { var li = document.createElement('li'); li.className = 'prep'; li.textContent = nn[0] + '망 선불 요금은 준비 중입니다. 상담 시 안내드립니다.'; ul.appendChild(li); }
      rows.forEach(function(x){
        var li = ti.cloneNode(true); fill(li, '.nm', x.name); fill(li, '.d', prepaidDesc(x)); fill(li, '.amt .num', won(x.price)); ul.appendChild(li);
      });
      host.appendChild(p);
    });
  })();

  /* 내폰사기 카드 공통 */
  var buyCard = function(p, t){
    var n = t.cloneNode(true);
    n.setAttribute('data-id', p.id);
    n.setAttribute('data-brand', p.brand || '기타'); n.setAttribute('data-category', p.category || '폰');
    n.setAttribute('data-price', p.price || 0); n.setAttribute('data-created', p.createdAt || '');
    var img = $('img', n), sil = $('.sil', n);
    if (p.images && p.images.length) { img.src = p.images[0]; img.alt = p.name || ''; img.hidden = false; if (sil) sil.hidden = true; }
    var g = $('.g', n); if (g) { g.textContent = p.grade || ''; g.className = 'g ' + String(p.grade || '').toLowerCase(); if (!p.grade) g.hidden = true; }
    fill(n, '.bname', p.name); fill(n, '.bprice b', won(p.price));
    var bd = $('.bbadges', n);
    if (p.status === '예약중') { var r = document.createElement('span'); r.className = 'bbadge res'; r.textContent = '예약중'; bd.appendChild(r); }
    (p.badges || []).forEach(function(b){ var s = document.createElement('span'); s.className = 'bbadge'; s.textContent = b; bd.appendChild(s); });
    if (p.status === '판매완료') n.classList.add('sold');
    return n;
  };

  /* 메인 내폰사기 미리보기 (#buyPreview) */
  (function(){
    var sec = $('#buyPreview'), grid = $('#buyPreviewGrid'), t = tpl('tpl-buycard'); if (!sec || !grid || !t) return;
    var items = productsOnSale().filter(function(p){ return p.status === '판매중'; })
      .sort(function(a, b){ return String(b.createdAt || '').localeCompare(String(a.createdAt || '')); }).slice(0, 4);
    if (!items.length) { sec.hidden = true; return; }
    sec.hidden = false;
    items.forEach(function(p){ var n = buyCard(p, t); var a = document.createElement('a'); a.href = 'buy.html#item-' + encodeURIComponent(p.id); a.className = 'bcard-link'; a.appendChild(n); grid.appendChild(a); });
  })();

  /* 내폰사기 페이지 (#buyGrid): 탭 + 가격대 칩 + 정렬 + 상세 모달 */
  (function(){
    var grid = $('#buyGrid'), t = tpl('tpl-buycard'); if (!grid || !t) return;
    var all = productsOnSale();
    var state = { cat:'all', price:'all', sort:'rec', q:'' };
    var cnt = $('#buyCount'), empty = $('#buyEmpty'), noRes = $('#buyNoResult'), tools = $('#buyTools');
    var catOf = function(p){
      if (p.category === '태블릿') return 'tablet'; if (p.category === '워치') return 'watch';
      return p.brand === '애플' ? 'iphone' : p.brand === '삼성' ? 'galaxy' : 'etc';
    };
    var priceOk = function(p){
      var v = Number(p.price) || 0;
      switch (state.price) { case 'p1': return v <= 300000; case 'p2': return v > 300000 && v <= 500000; case 'p3': return v > 500000 && v <= 700000; case 'p4': return v > 700000; default: return true; }
    };
    var statusRank = function(p){ return p.status === '판매완료' ? 1 : 0; };
    var render = function(){
      grid.innerHTML = '';
      var rows = all.filter(function(p){ return (state.cat === 'all' || catOf(p) === state.cat) && priceOk(p); });
      if (state.q) rows = rows.filter(function(p){ return ([p.name, p.brand, p.storage, p.color, alias(p.name)].join(' ').toLowerCase().indexOf(state.q) !== -1); });
      rows.sort(function(a, b){
        var s = statusRank(a) - statusRank(b); if (s) return s;
        if (state.sort === 'low') return (a.price || 0) - (b.price || 0);
        if (state.sort === 'high') return (b.price || 0) - (a.price || 0);
        if (state.sort === 'new') return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
        return 0;
      });
      rows.forEach(function(p){ grid.appendChild(buyCard(p, t)); });
      if (cnt) cnt.innerHTML = '총 <b>' + rows.length + '</b>개';
      if (noRes) noRes.classList.toggle('show', all.length > 0 && rows.length === 0);
    };
    if (!all.length) { if (empty) empty.hidden = false; if (tools) tools.hidden = true; grid.hidden = true; if (cnt) cnt.innerHTML = '총 <b>0</b>개'; }
    else render();

    $$('[data-cat]').forEach(function(b){ b.addEventListener('click', function(){ state.cat = b.getAttribute('data-cat'); $$('[data-cat]').forEach(function(x){ x.classList.toggle('on', x === b); x.setAttribute('aria-selected', x === b ? 'true' : 'false'); }); render(); }); });
    $$('[data-price]').forEach(function(b){ b.addEventListener('click', function(){ state.price = b.getAttribute('data-price'); $$('[data-price]').forEach(function(x){ x.classList.toggle('on', x === b); }); render(); }); });
    var sort = $('#buySort'); if (sort) sort.addEventListener('change', function(){ state.sort = sort.value; render(); });
    var q = $('#buySearch'); if (q) q.addEventListener('input', function(){ state.q = q.value.trim().toLowerCase(); render(); });

    /* 상세 모달 */
    var modal = $('#pmodal'); if (!modal) return;
    var track = $('.pm-track', modal), dots = $('.pm-dots', modal), prevB = $('.pm-prev', modal), nextB = $('.pm-next', modal);
    var cur = 0, total = 0, lastFocus = null;
    var goSlide = function(i){
      if (!total) return; cur = (i + total) % total;
      track.style.transform = 'translateX(' + (-cur * 100) + '%)';
      Array.prototype.forEach.call(dots.children, function(d, k){ d.classList.toggle('on', k === cur); });
    };
    var specRow = function(tb, k, v){ if (!v) return; var tr = document.createElement('tr'); var th = document.createElement('th'); th.textContent = k; var td = document.createElement('td'); td.textContent = v; tr.appendChild(th); tr.appendChild(td); tb.appendChild(tr); };
    var open = function(p){
      lastFocus = document.activeElement;
      track.innerHTML = ''; dots.innerHTML = '';
      var imgs = (p.images && p.images.length) ? p.images : [];
      if (!imgs.length) { var ph = document.createElement('div'); ph.className = 'pm-slide ph'; ph.innerHTML = '<svg class="ic"><use href="#i-device"/></svg><span>사진 준비 중</span>'; track.appendChild(ph); }
      imgs.forEach(function(src, k){
        var s = document.createElement('div'); s.className = 'pm-slide'; var im = document.createElement('img'); im.src = src; im.alt = (p.name || '') + ' 사진 ' + (k + 1); s.appendChild(im); track.appendChild(s);
        var d = document.createElement('button'); d.type = 'button'; d.setAttribute('aria-label', (k + 1) + '번째 사진'); d.addEventListener('click', function(){ goSlide(k); }); dots.appendChild(d);
      });
      total = imgs.length; cur = 0; goSlide(0);
      var nav = total > 1; prevB.hidden = !nav; nextB.hidden = !nav; dots.hidden = !nav;
      var st = $('.pm-status', modal); st.textContent = p.status || '판매중'; st.className = 'pm-status ' + (p.status === '판매완료' ? 'sold' : p.status === '예약중' ? 'res' : 'on');
      fill(modal, '#pmTitle', p.name);
      fill(modal, '.pm-price b', won(p.price) + '원');
      var org = $('.pm-price s', modal); if (p.originalPrice && Number(p.originalPrice) > Number(p.price)) { org.textContent = won(p.originalPrice) + '원'; org.hidden = false; } else org.hidden = true;
      var bd = $('.pm-badges', modal); bd.innerHTML = ''; (p.badges || []).forEach(function(b){ var s = document.createElement('span'); s.className = 'bbadge'; s.textContent = b; bd.appendChild(s); });
      var tb = $('.pm-spec tbody', modal); tb.innerHTML = '';
      specRow(tb, '제조사', p.brand); specRow(tb, '분류', p.category); specRow(tb, '용량', p.storage); specRow(tb, '색상', p.color);
      specRow(tb, '등급', p.grade ? (p.grade + '등급') : ''); specRow(tb, '등록일', p.createdAt);
      fill(modal, '.pm-desc', p.description || '상태 설명은 문의 시 안내드립니다.');
      var gd = $('.pm-grade-desc', modal);
      if (gd) { var gmap = { S:'S등급: 흠집이 거의 없는 새 제품급, 모든 기능 정상', A:'A등급: 미세한 생활 기스 1~2곳, 모든 기능 정상', B:'B등급: 눈에 띄는 기스나 찍힘이 있으나 기능 정상' }; gd.textContent = gmap[p.grade] || ''; gd.hidden = !gmap[p.grade]; }
      var ctas = $('.pm-cta', modal); ctas.classList.toggle('disabled', p.status === '판매완료');
      modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden';
      var cb = $('.pm-close', modal); if (cb) cb.focus();
      if (history.replaceState) history.replaceState(null, '', '#item-' + encodeURIComponent(p.id));
    };
    var close = function(){
      if (!modal.classList.contains('open')) return;
      modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true'); document.body.style.overflow = '';
      if (history.replaceState) history.replaceState(null, '', location.pathname + location.search);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    };
    var byId = function(id){ for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i]; return null; };
    grid.addEventListener('click', function(e){ var c = e.target.closest('[data-id]'); if (!c) return; var p = byId(c.getAttribute('data-id')); if (p) open(p); });
    grid.addEventListener('keydown', function(e){ if (e.key !== 'Enter' && e.key !== ' ') return; var c = e.target.closest('[data-id]'); if (!c) return; e.preventDefault(); var p = byId(c.getAttribute('data-id')); if (p) open(p); });
    $$('[data-mclose]', modal).forEach(function(el){ el.addEventListener('click', close); });
    document.addEventListener('keydown', function(e){ if (e.key === 'Escape') close(); if (modal.classList.contains('open') && total > 1) { if (e.key === 'ArrowLeft') goSlide(cur - 1); if (e.key === 'ArrowRight') goSlide(cur + 1); } });
    prevB.addEventListener('click', function(){ goSlide(cur - 1); }); nextB.addEventListener('click', function(){ goSlide(cur + 1); });
    $$('.pm-cta a', modal).forEach(function(a){ a.addEventListener('click', function(){ close(); }, true); });
    var sx = 0; track.addEventListener('pointerdown', function(e){ sx = e.clientX; });
    track.addEventListener('pointerup', function(e){ var dx = e.clientX - sx; if (Math.abs(dx) > 40) goSlide(cur + (dx < 0 ? 1 : -1)); });
    var openFromHash = function(){ var m = location.hash.match(/^#item-(.+)$/); if (!m) return; var p = byId(decodeURIComponent(m[1])); if (p) open(p); };
    openFromHash();
  })();

  /* ---------- 현재 페이지 메뉴 활성 표시 ---------- */
  var page = document.body.getAttribute('data-page') || '';
  $$('[data-nav]').forEach(function(a){
    var on = a.getAttribute('data-nav') === page;
    a.classList.toggle('on', on);
    if (on) a.setAttribute('aria-current', 'page');
  });

  /* ---------- 캐러셀 (loop + center + autoplay + swipe + dots + arrows) ---------- */
  function Carousel(root, o){
    this.root = root; this.track = $('.car-track', root);
    this.o = Object.assign({ loop:true, center:false, autoplay:0, prev:null, next:null, dots:null }, o || {});
    this.orig = Array.prototype.slice.call(this.track.children); this.n = this.orig.length;
    if (this.o.loop && this.n > 1) {
      var self = this;
      var clone = function(s){ var c = s.cloneNode(true); c.setAttribute('aria-hidden','true'); c.tabIndex = -1; return c; };
      var first = this.track.firstChild;
      this.orig.forEach(function(s){ self.track.insertBefore(clone(s), first); });
      this.orig.forEach(function(s){ self.track.appendChild(clone(s)); });
    }
    this.slides = Array.prototype.slice.call(this.track.children);
    this.i = (this.o.loop && this.n > 1) ? this.n : 0;
    this.buildDots(); this.layout(); this.bind(); this.go(this.i, false);
    if (this.o.autoplay) this.play();
  }
  Carousel.prototype.layout = function(){
    var s = this.slides[0]; this.w = s.getBoundingClientRect().width;
    var cs = getComputedStyle(this.track); this.gap = parseFloat(cs.columnGap || cs.gap) || 0;
    this.vw = this.root.clientWidth; this.off = this.o.center ? (this.vw - this.w) / 2 : 0;
  };
  Carousel.prototype.x = function(i){ return this.off - i * (this.w + this.gap); };
  Carousel.prototype.go = function(i, anim){
    if (!this.o.loop) i = Math.max(0, Math.min(i, this.n - 1));
    this.i = i;
    this.track.style.transition = anim === false ? 'none' : 'transform .5s cubic-bezier(.22,.61,.36,1)';
    this.track.style.transform = 'translate3d(' + this.x(i) + 'px,0,0)';
    if (anim === false) { void this.track.offsetWidth; }
    this.updateDots();
  };
  Carousel.prototype.next = function(){ this.go(this.i + 1); };
  Carousel.prototype.prev = function(){ this.go(this.i - 1); };
  Carousel.prototype.cur = function(){ return ((this.i - (this.o.loop ? this.n : 0)) % this.n + this.n) % this.n; };
  Carousel.prototype.buildDots = function(){
    if (!this.o.dots) return; var self = this; this.o.dots.innerHTML = '';
    for (var k = 0; k < this.n; k++) (function(k){
      var b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', (k + 1) + '번째 배너');
      b.addEventListener('click', function(){ self.go((self.o.loop ? self.n : 0) + k); self.restart(); });
      self.o.dots.appendChild(b);
    })(k);
  };
  Carousel.prototype.updateDots = function(){
    if (!this.o.dots) return; var c = this.cur();
    Array.prototype.forEach.call(this.o.dots.children, function(b, k){ b.classList.toggle('on', k === c); });
  };
  Carousel.prototype.play = function(){ var self = this; this.stop(); this.timer = setInterval(function(){ self.next(); }, this.o.autoplay); };
  Carousel.prototype.stop = function(){ if (this.timer) { clearInterval(this.timer); this.timer = null; } };
  Carousel.prototype.restart = function(){ if (this.o.autoplay) this.play(); };
  Carousel.prototype.bind = function(){
    var self = this, sx = 0, dx = 0, dragging = false, moved = false, base = 0;
    this.track.addEventListener('transitionend', function(e){
      if (e.target !== self.track || !self.o.loop || self.n < 2) return;
      if (self.i >= 2 * self.n) self.go(self.i - self.n, false);
      else if (self.i < self.n) self.go(self.i + self.n, false);
    });
    this.root.addEventListener('pointerdown', function(e){
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      dragging = true; moved = false; sx = e.clientX; dx = 0; base = self.x(self.i);
      self.track.style.transition = 'none'; self.stop();
      try { self.root.setPointerCapture(e.pointerId); } catch (err) {}
    });
    this.root.addEventListener('pointermove', function(e){
      if (!dragging) return; dx = e.clientX - sx;
      if (Math.abs(dx) > 6) moved = true;
      if (moved) self.track.style.transform = 'translate3d(' + (base + dx) + 'px,0,0)';
    });
    var end = function(){
      if (!dragging) return; dragging = false;
      if (moved) { if (dx < -self.w / 4) self.next(); else if (dx > self.w / 4) self.prev(); else self.go(self.i); }
      else self.go(self.i, false);
      self.restart();
    };
    this.root.addEventListener('pointerup', end);
    this.root.addEventListener('pointercancel', end);
    this.root.addEventListener('click', function(e){ if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
    this.root.addEventListener('mouseenter', function(){ self.stop(); });
    this.root.addEventListener('mouseleave', function(){ if (!dragging) self.restart(); });
    if (this.o.prev) this.o.prev.addEventListener('click', function(){ self.prev(); self.restart(); });
    if (this.o.next) this.o.next.addEventListener('click', function(){ self.next(); self.restart(); });
    var rt; window.addEventListener('resize', function(){ clearTimeout(rt); rt = setTimeout(function(){ self.layout(); self.go(self.i, false); }, 120); });
    document.addEventListener('visibilitychange', function(){ document.hidden ? self.stop() : self.restart(); });
  };

  var heroCar = $('#heroCar'); if (heroCar && $('.car-track', heroCar) && $('.car-track', heroCar).children.length) new Carousel(heroCar, { center:true, autoplay:2600 });
  var bannerCar = $('#bannerCar'); if (bannerCar) new Carousel(bannerCar, { autoplay:4500, dots:$('#bannerDots') });
  var reviewCar = $('#reviewCar'); if (reviewCar) new Carousel(reviewCar, { autoplay:0, prev:$('#rvPrev'), next:$('#rvNext') });

  /* ---------- 시세 리스트 세로 자동 롤링 (목록 복제) ---------- */
  $$('[data-roll]').forEach(function(list){
    var items = Array.prototype.slice.call(list.children);
    items.forEach(function(li){ var c = li.cloneNode(true); c.setAttribute('aria-hidden','true'); list.appendChild(c); });
  });

  /* ---------- TOP 버튼 ---------- */
  var topBtn = $('#topBtn');
  if (topBtn) {
    var onScroll = function(){ topBtn.classList.toggle('show', window.scrollY > 300); };
    window.addEventListener('scroll', onScroll, { passive:true }); onScroll();
    topBtn.addEventListener('click', function(){ window.scrollTo({ top:0, behavior:'smooth' }); });
  }

  /* ---------- 모바일 드로어 ---------- */
  var drawer = $('#drawer'), menuBtn = $('#menuBtn');
  if (drawer && menuBtn) {
    var openDrawer = function(){ drawer.classList.add('open'); drawer.setAttribute('aria-hidden','false'); document.body.style.overflow = 'hidden'; };
    var closeDrawer = function(){ drawer.classList.remove('open'); drawer.setAttribute('aria-hidden','true'); document.body.style.overflow = ''; };
    menuBtn.addEventListener('click', openDrawer);
    $$('[data-close]', drawer).forEach(function(el){ el.addEventListener('click', closeDrawer); });
    document.addEventListener('keydown', function(e){ if (e.key === 'Escape') closeDrawer(); });
  }

  /* ---------- 탭 패널 (data-tabs="패널컨테이너id", 버튼 data-tab, 패널 data-panel) ---------- */
  function activateTab(group, key){
    var host = document.getElementById(group.getAttribute('data-tabs'));
    $$('[data-tab]', group).forEach(function(b){
      var on = b.getAttribute('data-tab') === key;
      b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    if (host) $$('[data-panel]', host).forEach(function(p){ p.classList.toggle('on', p.getAttribute('data-panel') === key); });
  }
  $$('[data-tabs]').forEach(function(group){
    $$('[data-tab]', group).forEach(function(b){
      b.addEventListener('click', function(){ activateTab(group, b.getAttribute('data-tab')); });
    });
    var first = $('[data-tab].on', group) || $('[data-tab]', group);
    if (first) activateTab(group, first.getAttribute('data-tab'));
  });
  /* 해시로 특정 패널 열기 (faq.html#faq-mvno 등) */
  function openPanelByHash(){
    var id = location.hash.slice(1); if (!id) return;
    var p = document.getElementById(id); if (!p || !p.hasAttribute('data-panel')) return;
    var host = p.parentElement; while (host && !host.id) host = host.parentElement;
    if (!host) return;
    var group = $('[data-tabs="' + host.id + '"]'); if (group) activateTab(group, p.getAttribute('data-panel'));
  }
  openPanelByHash();
  window.addEventListener('hashchange', openPanelByHash);

  /* ---------- 아코디언 ---------- */
  $$('.acc-btn').forEach(function(btn){
    btn.setAttribute('aria-expanded', btn.parentElement.classList.contains('open') ? 'true' : 'false');
    btn.addEventListener('click', function(){
      var item = btn.parentElement, open = !item.classList.contains('open');
      item.classList.toggle('open', open); btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });

  /* ---------- 카드 필터 (data-filter="그리드id", 버튼 data-fkey/data-fval, 입력 data-search) ---------- */
  $$('[data-filter]').forEach(function(ctl){
    var grid = document.getElementById(ctl.getAttribute('data-filter')); if (!grid) return;
    var cards = $$('[data-card]', grid);
    var empty = $('[data-empty="' + grid.id + '"]');
    var state = {}, q = '';
    var apply = function(){
      var shown = 0;
      cards.forEach(function(c){
        var ok = true;
        Object.keys(state).forEach(function(k){ if (state[k] !== 'all' && c.getAttribute('data-' + k) !== state[k]) ok = false; });
        if (ok && q) ok = (c.getAttribute('data-search') || c.textContent).toLowerCase().indexOf(q) !== -1;
        c.hidden = !ok; if (ok) shown++;
      });
      if (empty) empty.classList.toggle('show', shown === 0);
    };
    $$('[data-fkey]', ctl).forEach(function(b){
      var k = b.getAttribute('data-fkey');
      if (!(k in state)) state[k] = $('[data-fkey="' + k + '"].on', ctl) ? $('[data-fkey="' + k + '"].on', ctl).getAttribute('data-fval') : 'all';
      b.addEventListener('click', function(){
        state[k] = b.getAttribute('data-fval');
        $$('[data-fkey="' + k + '"]', ctl).forEach(function(x){ x.classList.toggle('on', x === b); });
        apply();
      });
    });
    var input = $('[data-search]', ctl);
    if (input) input.addEventListener('input', function(){ q = input.value.trim().toLowerCase(); apply(); });
    apply();
  });

  /* ---------- 같은 페이지 앵커: 고정 헤더 높이 보정, 자리표시 앵커는 이동 안 함 ---------- */
  var hd = $('.hd');
  $$('a[href^="#"]').forEach(function(a){
    a.addEventListener('click', function(e){
      var id = a.getAttribute('href').slice(1); if (!id) return;
      var t = document.getElementById(id);
      if (!t || t === a) { e.preventDefault(); return; }
      e.preventDefault();
      if (t.hasAttribute('data-panel')) { openPanelByHashId(id); }
      var y = t.getBoundingClientRect().top + window.scrollY - (hd ? hd.offsetHeight : 0) - 8;
      window.scrollTo({ top: Math.max(0, y), behavior:'smooth' });
      if (history.replaceState) history.replaceState(null, '', '#' + id);
    });
  });
  function openPanelByHashId(id){
    var p = document.getElementById(id); if (!p) return;
    var host = p.parentElement; while (host && !host.id) host = host.parentElement;
    if (!host) return;
    var group = $('[data-tabs="' + host.id + '"]'); if (group) activateTab(group, p.getAttribute('data-panel'));
  }
})();
