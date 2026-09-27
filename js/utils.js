/* ============================================
   Utility Functions
   CyberSec Range & Knowledge Hub
   ============================================ */
(function () {
  'use strict';

  var Utils = {};

  Utils.generateId = function () {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  };

  Utils.escapeHtml = function (str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  Utils.normalizeText = function (str) {
    if (!str) return '';
    return String(str)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9./_\-\s]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  Utils.orderedSubsequenceMatch = function (query, target) {
    var q = Utils.normalizeText(query).replace(/\s+/g, '');
    var t = Utils.normalizeText(target).replace(/\s+/g, '');
    if (!q) return true;
    var qi = 0;
    for (var i = 0; i < t.length && qi < q.length; i++) {
      if (t[i] === q[qi]) qi++;
    }
    return qi === q.length;
  };

  Utils.fuzzyMatch = function (query, target) {
    if (!query) return true;
    if (!target) return false;
    var qNorm = Utils.normalizeText(query);
    var tNorm = Utils.normalizeText(target);
    if (tNorm.indexOf(qNorm) >= 0) return true;
    return Utils.orderedSubsequenceMatch(qNorm, tNorm);
  };

  Utils.formatDate = function (timestamp) {
    if (!timestamp) return '';
    var d = new Date(timestamp);
    function pad(n) { return String(n).padStart(2, '0'); }
    return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() +
      ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  };

  Utils.debounce = function (fn, delay) {
    var timer;
    return function () {
      var args = arguments;
      var ctx = this;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(ctx, args); }, delay);
    };
  };

  Utils.copyToClipboard = function (text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0;left:-9999px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) { /* ignore */ }
    document.body.removeChild(ta);
    return Promise.resolve();
  };

  Utils.showToast = function (message, type, duration) {
    duration = duration || 2500;
    var container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    var el = document.createElement('div');
    el.className = 'toast' + (type === 'danger' ? ' err' : '');
    if (type === 'danger') {
      el.style.borderColor = 'var(--red)';
      el.style.color = 'var(--red)';
    } else if (type === 'success') {
      el.style.borderColor = 'var(--green)';
      el.style.color = 'var(--green)';
    }
    el.textContent = message;
    container.appendChild(el);

    setTimeout(function () {
      el.style.opacity = '0';
      el.style.transform = 'translateY(10px)';
      el.style.transition = 'all .3s ease';
      setTimeout(function () { el.remove(); }, 300);
    }, duration);
  };

  window.Utils = Utils;
})();
