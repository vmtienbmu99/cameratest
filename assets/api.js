function getParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name) || '';
}

function getApiUrl() {
  const url = window.BMU_CONFIG && window.BMU_CONFIG.API_URL ? String(window.BMU_CONFIG.API_URL).trim() : '';
  if (!url || url.indexOf('DAN_LINK_WEB_APP') !== -1) {
    throw new Error('Chưa cấu hình API_URL trong assets/config.js');
  }
  return url.replace(/\?.*$/, '');
}

function jsonp(action, params) {
  return new Promise(function(resolve, reject) {
    let apiUrl;
    try {
      apiUrl = getApiUrl();
    } catch (err) {
      reject(err);
      return;
    }

    const callbackName = 'bmu_cb_' + Date.now() + '_' + Math.floor(Math.random() * 1000000);
    const url = new URL(apiUrl);

    params = params || {};
    params.mode = 'api';
    params.action = action;
    params.callback = callbackName;

    Object.keys(params).forEach(function(key) {
      url.searchParams.set(key, params[key]);
    });

    const script = document.createElement('script');
    let timer = null;

    window[callbackName] = function(data) {
      cleanup();
      resolve(data);
    };

    script.onerror = function() {
      cleanup();
      reject(new Error('Không gọi được Apps Script API. Kiểm tra API_URL, quyền truy cập Web App và đăng nhập email trường.'));
    };

    timer = setTimeout(function() {
      cleanup();
      reject(new Error('Quá thời gian chờ Apps Script API. Có thể chưa đăng nhập email trường hoặc Web App chưa cho phép truy cập.'));
    }, 25000);

    function cleanup() {
      if (timer) clearTimeout(timer);
      try { delete window[callbackName]; } catch (e) { window[callbackName] = undefined; }
      if (script.parentNode) script.parentNode.removeChild(script);
    }

    script.src = url.toString();
    document.body.appendChild(script);
  });
}

function postToAppsScript(action, data) {
  return new Promise(function(resolve) {
    let apiUrl;
    try {
      apiUrl = getApiUrl();
    } catch (err) {
      resolve({ ok:false, message: err.message });
      return;
    }

    const requestId = 'req_' + Date.now() + '_' + Math.floor(Math.random() * 1000000);
    const iframeName = 'bmu_post_iframe_' + requestId;

    const iframe = document.createElement('iframe');
    iframe.name = iframeName;
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = apiUrl;
    form.target = iframeName;
    form.style.display = 'none';

    appendInput(form, 'action', action);
    appendInput(form, 'requestId', requestId);

    Object.keys(data || {}).forEach(function(key) {
      appendInput(form, key, data[key]);
    });

    let done = false;
    const timer = setTimeout(function() {
      if (done) return;
      done = true;
      cleanup();
      resolve({ ok:false, message:'Quá thời gian chờ Apps Script phản hồi. Kiểm tra đăng nhập email trường và quyền Web App.' });
    }, 45000);

    function receiveMessage(event) {
      const res = typeof event.data === 'string' ? safeJsonParse(event.data) : event.data;
      if (!res || res.requestId !== requestId) return;

      if (done) return;
      done = true;
      clearTimeout(timer);
      cleanup();
      resolve(res);
    }

    function cleanup() {
      window.removeEventListener('message', receiveMessage);
      setTimeout(function() {
        if (form.parentNode) form.parentNode.removeChild(form);
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }, 300);
    }

    window.addEventListener('message', receiveMessage);
    document.body.appendChild(form);
    form.submit();
  });
}

function appendInput(form, name, value) {
  const input = document.createElement('input');
  input.type = 'hidden';
  input.name = name;
  input.value = value == null ? '' : String(value);
  form.appendChild(input);
}

function safeJsonParse(str) {
  try { return JSON.parse(str); } catch (err) { return null; }
}

function esc(str) {
  return String(str == null ? '' : str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;');
}

function setHtml(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text == null ? '' : String(text);
}

function badge(status) {
  const s = String(status || '');
  const lower = s.toLowerCase();
  let cls = 'badge-primary';
  if (lower.includes('đang mở') || lower.includes('da mo') || lower.includes('đã điểm danh')) cls = 'badge-success';
  if (lower.includes('chưa') || lower.includes('chua') || lower.includes('đủ')) cls = 'badge-warning';
  if (lower.includes('đóng') || lower.includes('dong') || lower.includes('không')) cls = 'badge-danger';
  return '<span class="badge ' + cls + '">' + esc(s) + '</span>';
}
