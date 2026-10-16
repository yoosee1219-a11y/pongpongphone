/* 퐁퐁폰 관리자 - 서버 없이 GitHub Contents API 로 data/*.js 를 직접 수정
   - 바닐라 JS, 외부 스크립트 없음
   - core: 순수 로직(인코딩 · 파일 파싱/생성 · API 클라이언트). node 테스트에서도 재사용
   - UI: document 가 있을 때만 실행 */
(function(root){
  'use strict';

  /* ==========================================================
     core (순수 로직)
     ========================================================== */
  var core = {};
  core.DEFAULTS = { owner:'yoosee1219-a11y', repo:'pongpongphone', branch:'main' };
  core.FILES = {
    products: { path:'data/products.js', key:'products', label:'상품', message:'관리자: 상품 수정' },
    buyback:  { path:'data/buyback.js',  key:'buyback',  label:'매입시세', message:'관리자: 매입시세 수정' },
    plans:    { path:'data/plans.js',    key:'plans',    label:'요금제', message:'관리자: 요금제 수정' }
  };
  core.EMPTY = {
    products: function(){ return []; },
    buyback: function(){ return { updatedAt:'', items:[] }; },
    plans: function(){ return { mvno:[], prepaid:[] }; }
  };
  core.IMAGE_DIR = 'images/products';

  core.utf8ToB64 = function(str){
    var bytes = new TextEncoder().encode(str), bin = '';
    for (var i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  };
  core.b64ToUtf8 = function(b64){
    var bin = atob(String(b64 || '').replace(/\s/g, '')), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder('utf-8').decode(bytes);
  };
  /* data/*.js 텍스트에서 `window.PPP.<key> = ` 뒤 JSON 부분만 파싱 */
  core.parseDataFile = function(text, key){
    var re = new RegExp('window\\.PPP\\.' + key + '\\s*=\\s*');
    var m = re.exec(text);
    if (!m) throw new Error('파일 형식을 알 수 없습니다 (window.PPP.' + key + ' 없음)');
    var start = m.index + m[0].length;
    var end = text.lastIndexOf(';');
    var json = text.slice(start, end > start ? end : text.length).trim();
    return JSON.parse(json);
  };
  core.buildDataFile = function(key, data){
    return 'window.PPP = window.PPP || {};\nwindow.PPP.' + key + ' = ' + JSON.stringify(data, null, 2) + ';\n';
  };
  core.encPath = function(p){ return String(p).split('/').map(encodeURIComponent).join('/'); };
  core.errorMessage = function(status, json){
    var detail = json && json.message ? ' (' + json.message + ')' : '';
    switch (status) {
      case 401: return '토큰이 올바르지 않거나 만료되었습니다. 토큰을 다시 확인해 주세요.';
      case 403: return '권한이 부족합니다. 토큰의 Contents 권한이 Read and write 인지, 요청 한도를 넘지 않았는지 확인해 주세요.' + detail;
      case 404: return '저장소나 파일을 찾을 수 없습니다. 저장소 설정(owner/repo/branch)과 토큰의 저장소 접근 권한을 확인해 주세요.';
      case 409: case 422: return '다른 곳에서 먼저 수정되었습니다. 새로고침으로 최신 내용을 불러온 뒤 다시 수정해 주세요.' + detail;
      default: return '요청에 실패했습니다 (HTTP ' + status + ').' + detail;
    }
  };
  core.makeClient = function(cfg, fetchImpl){
    var f = fetchImpl || (typeof fetch !== 'undefined' ? fetch.bind(root) : null);
    if (!f) throw new Error('fetch 를 사용할 수 없습니다');
    var base = 'https://api.github.com/repos/' + encodeURIComponent(cfg.owner) + '/' + encodeURIComponent(cfg.repo);
    var headers = function(json){
      var h = { 'Accept':'application/vnd.github+json', 'Authorization':'Bearer ' + cfg.token, 'X-GitHub-Api-Version':'2022-11-28' };
      if (json) h['Content-Type'] = 'application/json';
      return h;
    };
    var fail = function(r){ var e = new Error(core.errorMessage(r.status, r.json)); e.status = r.status; return e; };
    var req = function(method, url, body){
      return f(url, { method:method, headers:headers(!!body), body: body ? JSON.stringify(body) : undefined, cache:'no-store' })
        .then(function(r){ return r.text().then(function(t){ var j = null; try { j = t ? JSON.parse(t) : null; } catch (e) {} return { status:r.status, ok:r.ok, json:j }; }); });
    };
    var contentsUrl = function(path, withRef){ return base + '/contents/' + core.encPath(path) + (withRef ? ('?ref=' + encodeURIComponent(cfg.branch)) : ''); };
    return {
      verify: function(){ return req('GET', base).then(function(r){ if (!r.ok) throw fail(r); return { fullName:r.json && r.json.full_name, permissions:r.json && r.json.permissions }; }); },
      getFile: function(path){
        return req('GET', contentsUrl(path, true)).then(function(r){
          if (r.status === 404) return null;
          if (!r.ok) throw fail(r);
          return { sha:r.json.sha, text:core.b64ToUtf8(r.json.content || ''), size:r.json.size };
        });
      },
      getSha: function(path){
        return req('GET', contentsUrl(path, true)).then(function(r){ if (r.status === 404) return null; if (!r.ok) throw fail(r); return r.json.sha; });
      },
      putFile: function(path, contentB64, message, sha){
        var body = { message:message, content:contentB64, branch:cfg.branch };
        if (sha) body.sha = sha;
        return req('PUT', contentsUrl(path, false), body).then(function(r){
          if (!r.ok) throw fail(r);
          return { sha:r.json && r.json.content && r.json.content.sha, commit:r.json && r.json.commit && r.json.commit.sha };
        });
      }
    };
  };
  /* 불러오기: 파일이 없으면 빈 기본값(missing=true) */
  core.loadData = function(client, key){
    var file = core.FILES[key];
    return client.getFile(file.path).then(function(f){
      if (!f) return { sha:null, data:core.EMPTY[key](), missing:true };
      return { sha:f.sha, data:core.parseDataFile(f.text, file.key), missing:false };
    });
  };
  /* 저장: 최신 sha 조회 -> PUT. 반환값에 payload 요약 포함(테스트용) */
  core.saveData = function(client, key, data, message){
    var file = core.FILES[key];
    var text = core.buildDataFile(file.key, data);
    var b64 = core.utf8ToB64(text);
    return client.getSha(file.path).then(function(sha){
      return client.putFile(file.path, b64, message || file.message, sha).then(function(res){
        return { sha:res.sha, commit:res.commit, prevSha:sha, text:text, base64:b64, bytes:new TextEncoder().encode(text).length };
      });
    });
  };
  core.uploadImage = function(client, path, b64, message){
    return client.getSha(path).then(function(sha){ return client.putFile(path, b64, message || ('관리자: 상품 사진 업로드 ' + path), sha); });
  };
  core.newId = function(prefix){ return prefix + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); };
  core.toNum = function(v){ if (v === '' || v == null) return null; var n = Number(String(v).replace(/[^\d.-]/g, '')); return isNaN(n) ? null : n; };
  core.splitTags = function(v){ return Array.isArray(v) ? v : String(v || '').split(/[,\n]/).map(function(s){ return s.trim(); }).filter(Boolean); };
  core.nextImageName = function(id, images){
    var max = 0; (images || []).forEach(function(p){ var m = String(p).match(new RegExp(id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '-(\\d+)\\.jpg$')); if (m) max = Math.max(max, Number(m[1])); });
    return core.IMAGE_DIR + '/' + id + '-' + (max + 1) + '.jpg';
  };

  /* 스키마: 사장님 라벨 기준. path 는 점 표기(prices.S) 가능 */
  core.SCHEMA = {
    products: {
      title:'상품', idPrefix:'p',
      fields:[
        { key:'name', label:'상품명', type:'text', req:true, ph:'예: 갤럭시 S23 256GB 크림', full:true },
        { key:'brand', label:'제조사', type:'select', opts:['삼성','애플','기타'], req:true },
        { key:'category', label:'분류', type:'select', opts:['폰','태블릿','워치'], req:true },
        { key:'storage', label:'용량', type:'text', ph:'예: 256GB' },
        { key:'color', label:'색상', type:'text', ph:'예: 크림' },
        { key:'grade', label:'등급', type:'select', opts:['S','A','B'], req:true },
        { key:'status', label:'상태', type:'select', opts:['판매중','예약중','판매완료','숨김'], req:true },
        { key:'price', label:'판매가 (원)', type:'number', req:true, ph:'숫자만, 예: 350000' },
        { key:'originalPrice', label:'정가 (원, 선택)', type:'number', ph:'할인 전 가격. 없으면 비워 두기' },
        { key:'createdAt', label:'등록일', type:'date', req:true },
        { key:'badges', label:'배지 (쉼표로 구분)', type:'tags', ph:'예: 무료배송, 검수완료, 배터리 교체' },
        { key:'images', label:'사진 (선택 즉시 업로드, 첫 사진이 대표)', type:'images', full:true },
        { key:'description', label:'상태 설명', type:'textarea', ph:'기스 위치, 배터리 성능, 구성품 등 고객이 알아야 할 내용', full:true }
      ],
      defaults: function(){ return { id:core.newId('p'), name:'', brand:'삼성', category:'폰', storage:'', color:'', grade:'A', price:null, originalPrice:null, images:[], badges:['무료배송'], status:'숨김', description:'', createdAt:new Date().toISOString().slice(0, 10) }; }
    },
    buyback: {
      title:'매입 모델', idPrefix:'bb',
      fields:[
        { key:'name', label:'모델명', type:'text', req:true, ph:'예: 갤럭시 S24 울트라', full:true },
        { key:'brand', label:'제조사', type:'select', opts:['삼성','애플','기타'], req:true },
        { key:'storage', label:'기준 용량', type:'text', ph:'예: 256GB' },
        { key:'prices.S', label:'S등급 매입가 (원)', type:'number', req:true },
        { key:'prices.A', label:'A등급 매입가 (원)', type:'number', req:true },
        { key:'prices.B', label:'B등급 매입가 (원)', type:'number', req:true },
        { key:'note', label:'메모 (사이트에 작게 표시)', type:'text', ph:'예: 예시' }
      ],
      defaults: function(){ return { id:core.newId('bb'), brand:'삼성', name:'', storage:'', prices:{ S:null, A:null, B:null }, note:'예시' }; }
    },
    mvno: {
      title:'알뜰폰 요금제', idPrefix:'m',
      fields:[
        { key:'name', label:'요금제명', type:'text', req:true, ph:'예: LTE 15GB+', full:true },
        { key:'network', label:'통신망', type:'select', opts:['SKT','KT','LGU+'], req:true },
        { key:'monthly', label:'월 요금 (원)', type:'number', req:true },
        { key:'promoMonthly', label:'할인 요금 (원, 선택)', type:'number', ph:'프로모션 중일 때만' },
        { key:'promoMonths', label:'할인 개월 수 (선택)', type:'number', ph:'예: 7' },
        { key:'data', label:'데이터', type:'text', req:true, ph:'예: 15GB + 3Mbps' },
        { key:'call', label:'통화', type:'text', ph:'예: 100분 또는 기본제공' },
        { key:'sms', label:'문자', type:'text', ph:'예: 100건 또는 기본제공' },
        { key:'badges', label:'배지 (쉼표로 구분, "추천" 이면 메인에 노출)', type:'tags', ph:'예: 추천' },
        { key:'note', label:'메모', type:'text', ph:'예: 소진 시 차단', full:true }
      ],
      defaults: function(){ return { id:core.newId('m'), name:'', network:'KT', monthly:null, promoMonthly:null, promoMonths:null, data:'', call:'기본제공', sms:'기본제공', badges:[], note:'' }; }
    },
    prepaid: {
      title:'선불폰 요금', idPrefix:'pp',
      fields:[
        { key:'name', label:'요금제명', type:'text', req:true, ph:'예: 선불 데이터 10GB', full:true },
        { key:'network', label:'통신망', type:'select', opts:['SKT','KT','LGU+'], req:true },
        { key:'price', label:'요금 (원)', type:'number', req:true },
        { key:'period', label:'사용기간', type:'text', ph:'예: 30일' },
        { key:'data', label:'데이터', type:'text', ph:'예: 10GB' },
        { key:'call', label:'음성', type:'text', ph:'예: 50분' },
        { key:'note', label:'메모', type:'text', full:true }
      ],
      defaults: function(){ return { id:core.newId('pp'), network:'SKT', name:'', price:null, period:'30일', data:'', call:'', note:'' }; }
    }
  };
  core.getPath = function(obj, path){ return path.split('.').reduce(function(o, k){ return o == null ? undefined : o[k]; }, obj); };
  core.setPath = function(obj, path, val){ var ks = path.split('.'), o = obj; for (var i = 0; i < ks.length - 1; i++) { if (o[ks[i]] == null || typeof o[ks[i]] !== 'object') o[ks[i]] = {}; o = o[ks[i]]; } o[ks[ks.length - 1]] = val; };
  core.validate = function(kind, item){
    var errs = [];
    core.SCHEMA[kind].fields.forEach(function(f){
      var v = core.getPath(item, f.key);
      if (f.type === 'number') {
        if (f.req && (v == null || v === '')) errs.push(f.label + ' 은(는) 필수입니다.');
        else if (v != null && v !== '' && (typeof v !== 'number' || isNaN(v) || v < 0)) errs.push(f.label + ' 은(는) 0 이상의 숫자여야 합니다.');
      } else if (f.req && (v == null || String(v).trim() === '' || (Array.isArray(v) && !v.length))) errs.push(f.label + ' 은(는) 필수입니다.');
      if (f.type === 'date' && v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) errs.push(f.label + ' 형식은 YYYY-MM-DD 입니다.');
    });
    return errs;
  };

  root.PPPAdminCore = core;
  if (typeof module !== 'undefined' && module.exports) module.exports = core;

  /* ==========================================================
     UI (브라우저에서만)
     ========================================================== */
  if (typeof document === 'undefined' || !document.getElementById('loginView')) return;

  var $ = function(s, r){ return (r || document).querySelector(s); };
  var $$ = function(s, r){ return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var won = function(n){ return n == null || n === '' ? '-' : Number(n).toLocaleString('ko-KR'); };
  var el = function(tag, attrs, children){
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function(k){
      if (k === 'class') n.className = attrs[k];
      else if (k === 'text') n.textContent = attrs[k];
      else if (k === 'html') n.innerHTML = attrs[k];
      else if (k.indexOf('on') === 0) n.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] != null && attrs[k] !== false) n.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
    });
    (children || []).forEach(function(c){ if (c == null) return; n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  };
  var icon = function(id){ var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('class', 'ic'); s.innerHTML = '<use href="#' + id + '"/>'; return s; };

  var TOKEN_KEY = 'ppp_admin_token', CFG_KEY = 'ppp_admin_cfg';
  var store = {
    getToken: function(){ try { return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; } },
    setToken: function(t, remember){ try { sessionStorage.removeItem(TOKEN_KEY); localStorage.removeItem(TOKEN_KEY); (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, t); } catch (e) {} },
    clearToken: function(){ try { sessionStorage.removeItem(TOKEN_KEY); localStorage.removeItem(TOKEN_KEY); } catch (e) {} },
    getCfg: function(){ try { return Object.assign({}, core.DEFAULTS, JSON.parse(localStorage.getItem(CFG_KEY) || '{}')); } catch (e) { return Object.assign({}, core.DEFAULTS); } },
    setCfg: function(c){ try { localStorage.setItem(CFG_KEY, JSON.stringify({ owner:c.owner, repo:c.repo, branch:c.branch })); } catch (e) {} }
  };

  var state = { cfg:null, client:null, data:{}, sha:{}, dirty:{ products:false, buyback:false, plans:false }, tab:'products', busy:false };
  var previews = {}; /* 업로드 직후 미리보기용 data URL (path -> dataUrl) */

  /* ---------- 토스트 ---------- */
  var toastTimer;
  var toast = function(msg, kind){
    var t = $('#toast'); t.textContent = msg; t.className = 'admin-toast show ' + (kind || '');
    clearTimeout(toastTimer); toastTimer = setTimeout(function(){ t.classList.remove('show'); }, kind === 'err' ? 6000 : 3500);
  };

  /* ---------- 로그인 ---------- */
  var loginView = $('#loginView'), appView = $('#appView');
  var cfg0 = store.getCfg();
  $('#ownerInput').value = cfg0.owner; $('#repoInput').value = cfg0.repo; $('#branchInput').value = cfg0.branch;
  var showLoginErr = function(msg){ var e = $('#loginErr'); e.textContent = msg; e.hidden = !msg; };

  var enter = function(token, remember){
    var cfg = { owner:$('#ownerInput').value.trim() || core.DEFAULTS.owner, repo:$('#repoInput').value.trim() || core.DEFAULTS.repo, branch:$('#branchInput').value.trim() || core.DEFAULTS.branch, token:token };
    var btn = $('#loginBtn'); btn.disabled = true; btn.textContent = '확인 중...'; showLoginErr('');
    var client = core.makeClient(cfg);
    return client.verify().then(function(info){
      if (info.permissions && info.permissions.push === false) throw new Error('이 토큰은 읽기만 가능합니다. Contents 권한을 Read and write 로 바꿔 주세요.');
      state.cfg = cfg; state.client = client; store.setCfg(cfg); store.setToken(token, remember);
      $('#repoLabel').textContent = cfg.owner + '/' + cfg.repo + ' @ ' + cfg.branch;
      loginView.hidden = true; appView.hidden = false;
      return loadAll();
    }).catch(function(err){
      store.clearToken();
      showLoginErr(err && err.message ? err.message : '입장에 실패했습니다.');
    }).then(function(){ btn.disabled = false; btn.textContent = '입장하기'; });
  };
  $('#loginForm').addEventListener('submit', function(e){
    e.preventDefault();
    var t = $('#tokenInput').value.trim();
    if (!t) { showLoginErr('토큰을 입력해 주세요.'); return; }
    enter(t, $('#rememberChk').checked).then(function(){ $('#tokenInput').value = ''; });
  });
  $('#logoutBtn').addEventListener('click', function(){
    if (anyDirty() && !confirm('저장하지 않은 변경이 있습니다. 그래도 로그아웃할까요?')) return;
    store.clearToken(); state.cfg = null; state.client = null; state.data = {}; state.sha = {}; state.dirty = { products:false, buyback:false, plans:false };
    appView.hidden = true; loginView.hidden = false; $('#adminMain').innerHTML = ''; updateDirtyUI();
    toast('로그아웃했습니다. 토큰을 삭제했습니다.');
  });

  /* ---------- 데이터 로드 ---------- */
  var anyDirty = function(){ return state.dirty.products || state.dirty.buyback || state.dirty.plans; };
  var setDirty = function(key, v){ state.dirty[key] = v !== false; updateDirtyUI(); };
  var updateDirtyUI = function(){
    $$('[data-atab]').forEach(function(b){ b.classList.toggle('dirty', !!state.dirty[b.getAttribute('data-atab')]); });
    $$('[data-dirty]').forEach(function(s){ s.classList.toggle('show', !!state.dirty[s.getAttribute('data-dirty')]); });
  };
  window.addEventListener('beforeunload', function(e){ if (anyDirty()) { e.preventDefault(); e.returnValue = ''; } });

  var loadAll = function(){
    var keys = ['products', 'buyback', 'plans'];
    toast('데이터를 불러오는 중...');
    return Promise.all(keys.map(function(k){ return core.loadData(state.client, k); })).then(function(res){
      res.forEach(function(r, i){ state.data[keys[i]] = r.data; state.sha[keys[i]] = r.sha; state.dirty[keys[i]] = false; });
      renderAll(); updateDirtyUI();
      var missing = res.filter(function(r){ return r.missing; }).length;
      toast(missing ? '불러왔습니다. (파일 ' + missing + '개는 아직 없어 빈 상태로 시작합니다)' : '불러왔습니다.', 'ok');
    }).catch(function(err){ toast('불러오기 실패: ' + err.message, 'err'); });
  };
  var reload = function(key){
    if (state.dirty[key] && !confirm('저장하지 않은 변경이 사라집니다. 다시 불러올까요?')) return;
    core.loadData(state.client, key).then(function(r){ state.data[key] = r.data; state.sha[key] = r.sha; setDirty(key, false); renderPanel(key); toast('다시 불러왔습니다.', 'ok'); })
      .catch(function(err){ toast('불러오기 실패: ' + err.message, 'err'); });
  };

  /* ---------- 저장 ---------- */
  var save = function(key){
    if (state.busy) return;
    var data = state.data[key];
    /* 저장 전 전체 유효성 */
    var lists = key === 'products' ? [['products', data]] : key === 'buyback' ? [['buyback', data.items]] : [['mvno', data.mvno], ['prepaid', data.prepaid]];
    for (var li = 0; li < lists.length; li++) {
      var kind = lists[li][0], arr = lists[li][1];
      for (var i = 0; i < arr.length; i++) { var errs = core.validate(kind, arr[i]); if (errs.length) { toast((arr[i].name || (i + 1) + '번째 항목') + ': ' + errs[0], 'err'); return; } }
    }
    state.busy = true; setSaving(key, true);
    core.saveData(state.client, key, data, core.FILES[key].message).then(function(res){
      state.sha[key] = res.sha; setDirty(key, false);
      toast('저장됨. 1~2분 뒤 사이트에 반영됩니다.', 'ok');
    }).catch(function(err){
      toast((err.status === 409 || err.status === 422) ? '다른 곳에서 수정됨. 새로고침 후 다시 시도해 주세요.' : ('저장 실패: ' + err.message), 'err');
    }).then(function(){ state.busy = false; setSaving(key, false); });
  };
  var setSaving = function(key, on){ $$('[data-save="' + key + '"]').forEach(function(b){ b.disabled = on; b.textContent = on ? '저장 중...' : '저장하기'; }); };

  /* ---------- 패널 렌더 ---------- */
  var main = $('#adminMain');
  var renderAll = function(){ main.innerHTML = ''; ['products', 'buyback', 'plans'].forEach(function(k){ main.appendChild(buildPanel(k)); }); showTab(state.tab); };
  var renderPanel = function(key){ var old = $('[data-apanel="' + key + '"]', main); var fresh = buildPanel(key); if (old) main.replaceChild(fresh, old); else main.appendChild(fresh); showTab(state.tab); };
  var showTab = function(key){
    state.tab = key;
    $$('[data-atab]').forEach(function(b){ b.classList.toggle('on', b.getAttribute('data-atab') === key); });
    $$('[data-apanel]', main).forEach(function(p){ p.classList.toggle('on', p.getAttribute('data-apanel') === key); });
  };
  $$('[data-atab]').forEach(function(b){ b.addEventListener('click', function(){ showTab(b.getAttribute('data-atab')); }); });

  var bar = function(title, key, extra, isSub){
    var h = el(isSub ? 'h3' : 'h2', { text:title });
    var kids = [h];
    if (!isSub) kids.push(el('span', { class:'admin-dirty', 'data-dirty':key, text:'저장 안 됨' }));
    kids = kids.concat(extra || []);
    if (!isSub) {
      kids.push(el('button', { class:'admin-btn', type:'button', onclick:function(){ reload(key); } }, [icon('i-refresh'), '다시 불러오기']));
      kids.push(el('button', { class:'admin-btn primary', type:'button', 'data-save':key, onclick:function(){ save(key); } }, ['저장하기']));
    }
    return el('div', { class:'admin-bar' }, kids);
  };
  var addBtn = function(label, fn){ return el('button', { class:'admin-btn pink', type:'button', onclick:fn }, [icon('i-plus'), label]); };

  var buildPanel = function(key){
    var p = el('section', { class:'admin-panel', 'data-apanel':key });
    if (key === 'products') {
      p.appendChild(bar('상품 (내폰사기)', key, [addBtn('상품 추가', function(){ openEditor('products', null); })]));
      p.appendChild(el('p', { class:'admin-hint', text:'상태가 "판매중"인 상품만 사이트에 보입니다. "숨김"은 사이트에 안 나오고, "판매완료"는 회색으로 표시됩니다. 사진은 선택하는 즉시 GitHub에 올라가며, 상품 내용은 "저장하기"를 눌러야 반영됩니다.' }));
      p.appendChild(productsTable());
    } else if (key === 'buyback') {
      p.appendChild(bar('매입시세 (내폰팔기)', key, [addBtn('모델 추가', function(){ openEditor('buyback', null); })]));
      p.appendChild(el('p', { class:'admin-hint', text:'위에서부터 10개가 메인 화면 "예시 매입가 TOP 10"에 나옵니다. 순서는 위/아래 버튼으로 바꾸세요. 사이트에는 S등급 가격이 대표로 표시됩니다.' }));
      var upd = el('input', { type:'text', value:state.data.buyback.updatedAt || '', placeholder:'예: 2026-10' });
      upd.addEventListener('input', function(){ state.data.buyback.updatedAt = upd.value.trim(); setDirty('buyback'); });
      p.appendChild(el('div', { class:'admin-inline' }, [el('b', { text:'시세 기준월' }), upd, el('span', { text:'(내폰팔기 페이지에 "2026-10 기준"처럼 표시)' })]));
      p.appendChild(buybackTable());
    } else {
      p.appendChild(bar('요금제 (알뜰폰 · 선불폰)', key, []));
      p.appendChild(el('p', { class:'admin-hint', text:'알뜰폰 요금제에 배지 "추천"을 넣으면 메인 화면 요금제 TOP과 히어로 카드에 우선 노출됩니다. 선불폰 요금은 통신망별 탭에 자동으로 나뉘어 표시됩니다.' }));
      var s1 = el('div', { class:'admin-sub' }, [bar('알뜰폰 요금제 (' + state.data.plans.mvno.length + '개)', key, [addBtn('요금제 추가', function(){ openEditor('mvno', null); })], true), mvnoTable()]);
      var s2 = el('div', { class:'admin-sub' }, [bar('선불폰 요금 (' + state.data.plans.prepaid.length + '개)', key, [addBtn('요금 추가', function(){ openEditor('prepaid', null); })], true), prepaidTable()]);
      p.appendChild(s1); p.appendChild(s2);
    }
    return p;
  };

  /* 공통 행 액션 (수정/위/아래/삭제) */
  var listOf = function(kind){ return kind === 'products' ? state.data.products : kind === 'buyback' ? state.data.buyback.items : state.data.plans[kind]; };
  var fileOf = function(kind){ return kind === 'products' ? 'products' : kind === 'buyback' ? 'buyback' : 'plans'; };
  var actions = function(kind, idx){
    var arr = listOf(kind);
    var move = function(d){ var j = idx + d; if (j < 0 || j >= arr.length) return; var t = arr[idx]; arr[idx] = arr[j]; arr[j] = t; setDirty(fileOf(kind)); renderPanel(fileOf(kind)); };
    return el('td', { class:'acts' }, [
      el('button', { class:'admin-btn sm', type:'button', title:'위로', 'aria-label':'위로', disabled: idx === 0, onclick:function(){ move(-1); } }, [icon('i-chev-up')]),
      el('button', { class:'admin-btn sm', type:'button', title:'아래로', 'aria-label':'아래로', disabled: idx === arr.length - 1, onclick:function(){ move(1); } }, [icon('i-chev-down')]),
      el('button', { class:'admin-btn sm', type:'button', onclick:function(){ openEditor(kind, idx); } }, [icon('i-edit'), '수정']),
      el('button', { class:'admin-btn sm danger', type:'button', onclick:function(){ if (!confirm('"' + (arr[idx].name || '이 항목') + '" 을(를) 삭제할까요? 저장하기를 눌러야 확정됩니다.')) return; arr.splice(idx, 1); setDirty(fileOf(kind)); renderPanel(fileOf(kind)); } }, [icon('i-trash'), '삭제'])
    ]);
  };
  var table = function(heads, rows, emptyMsg){
    var thead = el('thead', null, [el('tr', null, heads.map(function(h){ return el('th', { text:h }); }))]);
    var tbody = el('tbody', null, rows.length ? rows : [el('tr', { class:'empty-row' }, [el('td', { colspan:heads.length, text:emptyMsg })])]);
    return el('div', { class:'admin-tblwrap' }, [el('table', { class:'admin-tbl' }, [thead, tbody])]);
  };
  var imgSrc = function(path){ return previews[path] || path; };
  var statusClass = { '판매중':'st-on', '예약중':'st-res', '판매완료':'st-sold', '숨김':'st-hide' };

  var productsTable = function(){
    var rows = state.data.products.map(function(p, i){
      var th = p.images && p.images.length ? el('img', { class:'thumb', src:imgSrc(p.images[0]), alt:'' }) : el('span', { class:'thumb none' }, [icon('i-image')]);
      var sel = el('select', { class:'inline' }, ['판매중', '예약중', '판매완료', '숨김'].map(function(s){ var o = el('option', { value:s, text:s }); if (s === p.status) o.selected = true; return o; }));
      sel.addEventListener('change', function(){ p.status = sel.value; setDirty('products'); sel.className = 'inline ' + (statusClass[p.status] || ''); });
      sel.className = 'inline ' + (statusClass[p.status] || '');
      var g = el('span', { class:'g ' + String(p.grade || '').toLowerCase(), text:p.grade || '' });
      return el('tr', null, [
        el('td', null, [th]),
        el('td', { class:'name' }, [p.name || '(이름 없음)', el('small', { text:[p.brand, p.category, p.storage, p.color].filter(Boolean).join(' · ') })]),
        el('td', null, [g]),
        el('td', { class:'num', text:won(p.price) + '원' }),
        el('td', null, [sel]),
        el('td', { class:'admin-badges' }, (p.badges || []).map(function(b){ return el('span', { text:b }); })),
        el('td', { text:(p.images || []).length + '장' }),
        el('td', { text:p.createdAt || '' }),
        actions('products', i)
      ]);
    });
    return table(['사진', '상품명', '등급', '판매가', '상태', '배지', '사진 수', '등록일', '관리'], rows, '아직 상품이 없습니다. "상품 추가"를 눌러 첫 상품을 올려 보세요.');
  };
  var buybackTable = function(){
    var rows = state.data.buyback.items.map(function(b, i){
      return el('tr', null, [
        el('td', { text:String(i + 1) + (i < 10 ? ' (TOP)' : '') }),
        el('td', { class:'name' }, [b.name || '(이름 없음)', el('small', { text:[b.brand, b.storage].filter(Boolean).join(' · ') })]),
        el('td', { class:'num', text:won(b.prices && b.prices.S) }),
        el('td', { class:'num', text:won(b.prices && b.prices.A) }),
        el('td', { class:'num', text:won(b.prices && b.prices.B) }),
        el('td', { text:b.note || '' }),
        actions('buyback', i)
      ]);
    });
    return table(['순서', '모델명', 'S등급', 'A등급', 'B등급', '메모', '관리'], rows, '아직 매입 모델이 없습니다. "모델 추가"를 눌러 주세요.');
  };
  var mvnoTable = function(){
    var rows = state.data.plans.mvno.map(function(p, i){
      return el('tr', null, [
        el('td', { text:p.network || '' }),
        el('td', { class:'name' }, [p.name || '(이름 없음)', el('small', { text:[p.data, p.call ? '통화 ' + p.call : '', p.sms ? '문자 ' + p.sms : ''].filter(Boolean).join(' · ') })]),
        el('td', { class:'num', text:won(p.monthly) + '원' }),
        el('td', { class:'num', text:p.promoMonthly ? (won(p.promoMonthly) + '원' + (p.promoMonths ? ' / ' + p.promoMonths + '개월' : '')) : '-' }),
        el('td', { class:'admin-badges' }, (p.badges || []).map(function(b){ return el('span', { text:b }); })),
        el('td', { text:p.note || '' }),
        actions('mvno', i)
      ]);
    });
    return table(['통신망', '요금제명', '월 요금', '할인', '배지', '메모', '관리'], rows, '아직 알뜰폰 요금제가 없습니다.');
  };
  var prepaidTable = function(){
    var rows = state.data.plans.prepaid.map(function(p, i){
      return el('tr', null, [
        el('td', { text:p.network || '' }),
        el('td', { class:'name' }, [p.name || '(이름 없음)', el('small', { text:[p.data ? '데이터 ' + p.data : '', p.call ? '음성 ' + p.call : '', p.period].filter(Boolean).join(' · ') })]),
        el('td', { class:'num', text:won(p.price) + '원' }),
        el('td', { text:p.period || '' }),
        el('td', { text:p.note || '' }),
        actions('prepaid', i)
      ]);
    });
    return table(['통신망', '요금제명', '요금', '기간', '메모', '관리'], rows, '아직 선불폰 요금이 없습니다.');
  };

  /* ---------- 편집 모달 ---------- */
  var modal = $('#editModal'), editBody = $('#editBody'), editTitle = $('#editTitle');
  var editing = null; /* { kind, idx, draft } */
  var openEditor = function(kind, idx){
    var schema = core.SCHEMA[kind];
    var src = idx == null ? schema.defaults() : JSON.parse(JSON.stringify(listOf(kind)[idx]));
    editing = { kind:kind, idx:idx, draft:src, inputs:{} };
    editTitle.textContent = (idx == null ? schema.title + ' 추가' : schema.title + ' 수정') + (src.name ? ' - ' + src.name : '');
    editBody.innerHTML = '';
    var grid = el('div', { class:'admin-form-grid' });
    schema.fields.forEach(function(f){
      var wrap = el('label', { class:'admin-field' + (f.full ? ' full' : '') });
      wrap.appendChild(el('span', null, [f.label, f.req ? el('em', { class:'req', text:' *' }) : null]));
      var v = core.getPath(src, f.key), input;
      if (f.type === 'select') {
        input = el('select', null, f.opts.map(function(o){ var op = el('option', { value:o, text:o }); if (o === v) op.selected = true; return op; }));
      } else if (f.type === 'textarea') {
        input = el('textarea', { placeholder:f.ph || '' }); input.value = v || '';
      } else if (f.type === 'images') {
        wrap = el('div', { class:'admin-field full' }, [el('span', { text:f.label })]);
        wrap.appendChild(imagesEditor());
        grid.appendChild(wrap); return;
      } else {
        input = el('input', { type: f.type === 'number' ? 'text' : f.type === 'date' ? 'date' : 'text', placeholder:f.ph || '', inputmode: f.type === 'number' ? 'numeric' : null });
        input.value = f.type === 'tags' ? (v || []).join(', ') : (v == null ? '' : v);
      }
      input.setAttribute('data-key', f.key);
      editing.inputs[f.key] = input;
      wrap.appendChild(input);
      if (f.type === 'number') wrap.appendChild(el('small', { text:'숫자만 입력 (콤마 없이)' }));
      grid.appendChild(wrap);
    });
    editBody.appendChild(grid);
    editBody.appendChild(el('p', { class:'admin-form-err', id:'editErr', hidden:true }));
    modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden';
    var first = $('input,select,textarea', editBody); if (first) first.focus();
  };
  var closeEditor = function(){ modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; editing = null; };
  $$('[data-eclose]', modal).forEach(function(b){ b.addEventListener('click', closeEditor); });
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && modal.classList.contains('open')) closeEditor(); });

  var readDraft = function(){
    var schema = core.SCHEMA[editing.kind], d = editing.draft;
    schema.fields.forEach(function(f){
      var input = editing.inputs[f.key]; if (!input) return;
      input.classList.remove('bad');
      var raw = input.value;
      if (f.type === 'number') core.setPath(d, f.key, core.toNum(raw));
      else if (f.type === 'tags') core.setPath(d, f.key, core.splitTags(raw));
      else core.setPath(d, f.key, String(raw).trim());
    });
    return d;
  };
  $('#editApply').addEventListener('click', function(){
    if (!editing) return;
    var d = readDraft();
    var errs = core.validate(editing.kind, d);
    var errBox = $('#editErr');
    if (errs.length) {
      errBox.textContent = errs.join(' '); errBox.hidden = false;
      core.SCHEMA[editing.kind].fields.forEach(function(f){ var v = core.getPath(d, f.key); var bad = f.req && (v == null || v === '' || (Array.isArray(v) && !v.length)); if (bad && editing.inputs[f.key]) editing.inputs[f.key].classList.add('bad'); });
      return;
    }
    var arr = listOf(editing.kind);
    if (editing.idx == null) arr.push(d); else arr[editing.idx] = d;
    setDirty(fileOf(editing.kind));
    var file = fileOf(editing.kind);
    closeEditor(); renderPanel(file);
    toast('적용했습니다. 사이트에 올리려면 "저장하기"를 눌러 주세요.');
  });

  /* ---------- 사진 업로드 (canvas 리사이즈 -> base64 PUT) ---------- */
  var resizeImage = function(file, maxSide, quality){
    return new Promise(function(resolve, reject){
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function(){
        var w = img.naturalWidth, h = img.naturalHeight, s = Math.min(1, maxSide / Math.max(w, h));
        var cw = Math.max(1, Math.round(w * s)), ch = Math.max(1, Math.round(h * s));
        var c = document.createElement('canvas'); c.width = cw; c.height = ch;
        var ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cw, ch); ctx.drawImage(img, 0, 0, cw, ch);
        URL.revokeObjectURL(url);
        var dataUrl = c.toDataURL('image/jpeg', quality);
        resolve({ dataUrl:dataUrl, base64:dataUrl.split(',')[1], width:cw, height:ch });
      };
      img.onerror = function(){ URL.revokeObjectURL(url); reject(new Error('이미지 파일을 읽을 수 없습니다: ' + file.name)); };
      img.src = url;
    });
  };
  var imagesEditor = function(){
    var box = el('div', { class:'admin-imgs' });
    var draw = function(){
      box.innerHTML = '';
      var imgs = editing.draft.images || (editing.draft.images = []);
      imgs.forEach(function(p, i){
        var item = el('div', { class:'admin-img' + (i === 0 ? ' first' : '') }, [
          el('img', { src:imgSrc(p), alt:'상품 사진 ' + (i + 1) }),
          el('button', { class:'del', type:'button', title:'목록에서 제거', 'aria-label':'사진 제거', onclick:function(){ imgs.splice(i, 1); draw(); } }, [icon('i-close')]),
          el('div', { class:'mv' }, [
            el('button', { type:'button', title:'앞으로', text:'<', disabled:i === 0, onclick:function(){ var t = imgs[i - 1]; imgs[i - 1] = imgs[i]; imgs[i] = t; draw(); } }),
            el('button', { type:'button', title:'뒤로', text:'>', disabled:i === imgs.length - 1, onclick:function(){ var t = imgs[i + 1]; imgs[i + 1] = imgs[i]; imgs[i] = t; draw(); } })
          ])
        ]);
        box.appendChild(item);
      });
      var up = el('label', { class:'admin-img up' }, ['사진 추가', el('input', { type:'file', accept:'image/*', multiple:true })]);
      var fileInput = $('input', up);
      fileInput.addEventListener('change', function(){
        var files = Array.prototype.slice.call(fileInput.files || []); if (!files.length) return;
        up.classList.add('busy'); up.firstChild.textContent = '올리는 중...';
        var chain = Promise.resolve();
        files.forEach(function(f){
          chain = chain.then(function(){ return resizeImage(f, 1200, 0.85); }).then(function(r){
            var path = core.nextImageName(editing.draft.id, imgs);
            return core.uploadImage(state.client, path, r.base64).then(function(){ previews[path] = r.dataUrl; imgs.push(path); draw(); });
          });
        });
        chain.then(function(){ toast('사진 ' + files.length + '장을 올렸습니다. 상품 내용은 "적용" 후 "저장하기"를 눌러야 반영됩니다.', 'ok'); })
          .catch(function(err){ toast('사진 업로드 실패: ' + err.message, 'err'); draw(); });
      });
      box.appendChild(up);
      box.appendChild(el('small', { style:'flex-basis:100%;color:var(--sub);font-weight:400', text:'긴 변 1200px, JPEG 로 자동 축소해서 올립니다. 제거한 사진 파일은 저장소에 남지만 사이트에는 보이지 않습니다.' }));
    };
    draw();
    return box;
  };

  /* ---------- 자동 입장 (저장된 토큰) ---------- */
  var saved = store.getToken();
  if (saved) { $('#rememberChk').checked = !!localStorage.getItem(TOKEN_KEY); enter(saved, $('#rememberChk').checked); }
})(typeof window !== 'undefined' ? window : globalThis);
