/* 퐁퐁폰 공통 스크립트 - 바닐라 JS, 의존성 없음 */
(function(){
  'use strict';
  var $ = function(s, r){ return (r || document).querySelector(s); };
  var $$ = function(s, r){ return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

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

  var heroCar = $('#heroCar'); if (heroCar) new Carousel(heroCar, { center:true, autoplay:2600 });
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
