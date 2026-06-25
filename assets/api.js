(function(){
  const AUTH_KEY = 'BMU_AUTH_TOKEN_V1';
  const EMAIL_KEY = 'BMU_AUTH_EMAIL_V1';
  const STUDENT_KEY = 'BMU_STUDENT_INFO_V1';

  window.getParam = function(name){
    const url = new URL(window.location.href);
    return url.searchParams.get(name) || '';
  };

  window.apiGet = function(action, params){
    return new Promise(function(resolve, reject){
      if (!window.BMU_CONFIG || !window.BMU_CONFIG.API_URL || window.BMU_CONFIG.API_URL.indexOf('DAN_LINK') !== -1) {
        reject(new Error('Chưa cấu hình API_URL trong assets/config.js.'));
        return;
      }

      const callbackName = 'BMU_CB_' + Date.now() + '_' + Math.floor(Math.random() * 1000000);
      const script = document.createElement('script');
      const url = new URL(window.BMU_CONFIG.API_URL);

      params = params || {};
      params.mode = 'api';
      params.action = action;
      params.callback = callbackName;

      Object.keys(params).forEach(function(key){
        url.searchParams.set(key, params[key] == null ? '' : String(params[key]));
      });

      let done = false;
      const timer = setTimeout(function(){
        if (done) return;
        cleanup();
        reject(new Error('Hết thời gian chờ khi gọi Apps Script API.'));
      }, 20000);

      window[callbackName] = function(data){
        if (done) return;
        cleanup();
        resolve(data);
      };

      script.onerror = function(){
        if (done) return;
        cleanup();
        reject(new Error('Không gọi được Apps Script API. Kiểm tra API_URL và quyền truy cập Web App.'));
      };

      function cleanup(){
        done = true;
        clearTimeout(timer);
        try { delete window[callbackName]; } catch(e) { window[callbackName] = undefined; }
        if (script.parentNode) script.parentNode.removeChild(script);
      }

      script.src = url.toString();
      document.body.appendChild(script);
    });
  };

  window.apiPost = function(action, data){
    return new Promise(function(resolve){
      if (!window.BMU_CONFIG || !window.BMU_CONFIG.API_URL || window.BMU_CONFIG.API_URL.indexOf('DAN_LINK') !== -1) {
        resolve({ok:false, message:'Chưa cấu hình API_URL trong assets/config.js.'});
        return;
      }

      const iframeName = 'BMU_POST_' + Date.now() + '_' + Math.floor(Math.random() * 1000000);
      const iframe = document.createElement('iframe');
      iframe.name = iframeName;
      iframe.style.display = 'none';
      document.body.appendChild(iframe);

      const form = document.createElement('form');
      form.method = 'POST';
      form.action = window.BMU_CONFIG.API_URL;
      form.target = iframeName;
      form.style.display = 'none';
      appendInput(form, 'action', action);

      Object.keys(data || {}).forEach(function(key){
        appendInput(form, key, data[key]);
      });

      let finished = false;
      const timer = setTimeout(function(){
        if (finished) return;
        cleanup();
        resolve({ok:false, message:'Hết thời gian chờ phản hồi từ Apps Script.'});
      }, 180000);

      function receiveMessage(event){
        if (finished) return;
        cleanup();
        let res = event.data;
        try {
          if (typeof res === 'string') res = JSON.parse(res);
        } catch(e) {
          res = {ok:false, message:'Không đọc được phản hồi từ Apps Script.'};
        }
        resolve(res);
      }

      function cleanup(){
        finished = true;
        clearTimeout(timer);
        window.removeEventListener('message', receiveMessage);
        setTimeout(function(){
          if (form.parentNode) form.parentNode.removeChild(form);
          if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        }, 200);
      }

      window.addEventListener('message', receiveMessage);
      document.body.appendChild(form);
      form.submit();
    });
  };

  function appendInput(form, name, value){
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value == null ? '' : String(value);
    form.appendChild(input);
  }

  window.saveAuth = function(token, email, student){
    localStorage.setItem(AUTH_KEY, token || '');
    localStorage.setItem(EMAIL_KEY, email || '');
    localStorage.setItem(STUDENT_KEY, JSON.stringify(student || {}));
  };

  window.getAuth = function(){
    let student = {};
    try { student = JSON.parse(localStorage.getItem(STUDENT_KEY) || '{}'); } catch(e) {}
    return {
      token: localStorage.getItem(AUTH_KEY) || '',
      email: localStorage.getItem(EMAIL_KEY) || '',
      student: student
    };
  };

  window.clearAuth = function(){
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(EMAIL_KEY);
    localStorage.removeItem(STUDENT_KEY);
  };

  window.esc = function(str){
    return String(str == null ? '' : str)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#039;');
  };

  window.initials = function(name){
    if (!name) return '?';
    const parts = String(name).trim().split(/\s+/);
    return (parts[parts.length - 1] || '?').charAt(0).toUpperCase();
  };

  window.setBtnLoading = function(btn, text){
    if (!btn) return;
    btn.disabled = true;
    btn.dataset.oldText = btn.innerHTML;
    btn.innerHTML = '<span class="spinner"></span>' + (text || 'Đang xử lý...');
  };

  window.resetBtn = function(btn){
    if (!btn) return;
    btn.disabled = false;
    if (btn.dataset.oldText) btn.innerHTML = btn.dataset.oldText;
  };

  window.showToast = function(message, type){
    type = type || 'info';
    let box = document.getElementById('bmuToast');
    if (!box) {
      box = document.createElement('div');
      box.id = 'bmuToast';
      box.className = 'toast-box';
      document.body.appendChild(box);
    }
    box.className = 'toast-box ' + type;
    box.innerHTML = '<div class="toast-content">' + esc(message || '') + '</div>';
    box.classList.add('show');
    clearTimeout(box._timer);
    box._timer = setTimeout(function(){ box.classList.remove('show'); }, 4500);
  };

  window.showPopup = function(title, message, type){
    type = type || 'info';
    let overlay = document.getElementById('bmuModalOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'bmuModalOverlay';
      overlay.className = 'modal-overlay';
      overlay.innerHTML = '<div class="modal-card"><div id="bmuModalIcon" class="modal-icon"></div><h2 id="bmuModalTitle"></h2><p id="bmuModalMsg"></p><button class="btn" id="bmuModalBtn">Đóng</button></div>';
      document.body.appendChild(overlay);
      overlay.querySelector('#bmuModalBtn').addEventListener('click', function(){ overlay.classList.remove('show'); });
      overlay.addEventListener('click', function(e){ if (e.target === overlay) overlay.classList.remove('show'); });
    }
    const icon = overlay.querySelector('#bmuModalIcon');
    icon.className = 'modal-icon ' + type;
    icon.textContent = type === 'success' ? '✅' : (type === 'danger' ? '⚠️' : 'ℹ️');
    overlay.querySelector('#bmuModalTitle').textContent = title || 'Thông báo';
    overlay.querySelector('#bmuModalMsg').textContent = message || '';
    overlay.classList.add('show');
  };

})();
