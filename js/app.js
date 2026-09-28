/* ============================================
   App Router & Interactions
   Cyber Notes: Clean Knowledge & Comprehensive Cheat Sheets
   ============================================ */
(function () {
  'use strict';

  var currentView = 'dashboard';
  var currentFilters = {};

  function mc() { return document.getElementById('mainContent'); }

  function closeMobileMenu() {
    var menu = document.getElementById('navMenu');
    var burger = document.getElementById('navHamburger');
    var backdrop = document.getElementById('navBackdrop');
    if (menu && menu.classList.contains('open')) {
      menu.classList.remove('open');
      if (burger) {
        burger.classList.remove('active');
        burger.setAttribute('aria-expanded', 'false');
      }
      if (backdrop) backdrop.classList.remove('active');
    }
  }

  function toggleMobileMenu() {
    var menu = document.getElementById('navMenu');
    var burger = document.getElementById('navHamburger');
    var backdrop = document.getElementById('navBackdrop');
    if (!menu) return;
    var isOpen = menu.classList.toggle('open');
    if (burger) {
      burger.classList.toggle('active', isOpen);
      burger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    }
    if (backdrop) backdrop.classList.toggle('active', isOpen);
  }

  /* ══════════════════════════════════════════
     NAVIGATION
     ══════════════════════════════════════════ */
  function navigate(view, params) {
    closeMobileMenu();
    params = params || {};
    currentView = view;
    currentFilters = params;

    // Update active nav button
    document.querySelectorAll('.nav-btn[data-view]').forEach(function (btn) {
      var v = btn.getAttribute('data-view');
      var isActive = (v === view)
        || (v === 'knowledge' && view === 'know-detail')
        || (v === 'entries' && (view === 'create' || view === 'edit'));
      btn.classList.toggle('active', isActive);
    });

    render();
    if (typeof window.scrollTo === 'function') {
      try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) { window.scrollTo(0, 0); }
    }
  }

  /* ══════════════════════════════════════════
     RENDER DISPATCHER
     ══════════════════════════════════════════ */
  function render() {
    var container = mc();
    if (!container) return;

    switch (currentView) {
      case 'dashboard':
        Components.renderDashboard(container);
        break;

      case 'knowledge':
        Components.renderKnowledge(container, currentFilters);
        attachKnowledgeSearch();
        break;

      case 'know-detail':
        Components.renderKnowledgeDetail(container, currentFilters.id, currentFilters.isDoc);
        break;

      case 'cheatsheets':
        Components.renderCheatSheets(container, currentFilters);
        attachCheatSheetSearch();
        break;

      case 'entries':
        Components.renderEntries(container, currentFilters);
        attachArchiveFilters();
        break;

      case 'create':
        Components.renderEntryForm(container);
        attachEntryForm();
        break;

      case 'edit':
        Components.renderEntryForm(container, currentFilters.id);
        attachEntryForm();
        break;

      case 'categories':
        Components.renderCategories(container);
        break;

      case 'backup':
        Components.renderBackup(container);
        attachBackup();
        break;

      default:
        Components.renderDashboard(container);
    }
  }

  /* ══════════════════════════════════════════
     SEARCH LISTENERS
     ══════════════════════════════════════════ */
  function attachKnowledgeSearch() {
    var s = document.getElementById('knowSearchInput');
    if (s) {
      s.addEventListener('input', Utils.debounce(function () {
        currentFilters.search = s.value;
        Components.renderKnowledge(mc(), currentFilters);
        attachKnowledgeSearch();
        var re = document.getElementById('knowSearchInput');
        if (re) { re.focus(); re.setSelectionRange(re.value.length, re.value.length); }
      }, 160));
    }
  }

  function attachCheatSheetSearch() {
    var s = document.getElementById('csSearchInput');
    if (s) {
      s.addEventListener('input', Utils.debounce(function () {
        currentFilters.search = s.value;
        Components.renderCheatSheets(mc(), currentFilters);
        attachCheatSheetSearch();
        var re = document.getElementById('csSearchInput');
        if (re) { re.focus(); re.setSelectionRange(re.value.length, re.value.length); }
      }, 160));
    }
  }

  function attachArchiveFilters() {
    var s = document.getElementById('archiveSearchInput');
    var cat = document.getElementById('archiveCatFilter');
    var typ = document.getElementById('archiveTypeFilter');

    var update = Utils.debounce(function () {
      currentFilters = {
        search: s ? s.value : '',
        categoryId: cat ? cat.value : '',
        type: typ ? typ.value : ''
      };
      Components.renderEntries(mc(), currentFilters);
      attachArchiveFilters();
      var re = document.getElementById('archiveSearchInput');
      if (re && currentFilters.search) {
        re.focus();
        re.setSelectionRange(re.value.length, re.value.length);
      }
    }, 160);

    if (s) s.addEventListener('input', update);
    if (cat) cat.addEventListener('change', update);
    if (typ) typ.addEventListener('change', update);
  }

  function attachEntryForm() {
    var form = document.getElementById('entryForm');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var id = document.getElementById('entryId').value;
      var data = {
        type: document.getElementById('entryType').value,
        title: document.getElementById('entryTitle').value,
        categoryId: document.getElementById('entryCategory').value,
        content: document.getElementById('entryContent').value,
        code: document.getElementById('entryCode').value,
        notes: document.getElementById('entryNotes').value,
        tags: document.getElementById('entryTags').value
          .split(',').map(function (t) { return t.trim(); }).filter(Boolean),
        pinned: document.getElementById('entryPinned').checked
      };

      if (!data.title) {
        Utils.showToast('Vui lòng nhập tiêu đề.', 'danger');
        return;
      }

      if (id) {
        Store.updateEntry(id, data);
        Utils.showToast('Đã cập nhật ghi chú.');
      } else {
        Store.addEntry(data);
        Utils.showToast('Đã thêm ghi chú mới vào kho.');
      }
      navigate('entries');
    });
  }

  function attachBackup() {
    var input = document.getElementById('importFile');
    if (input) {
      input.addEventListener('change', function (e) {
        var file = e.target.files && e.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function (ev) {
          if (Store.importData(ev.target.result)) {
            Utils.showToast('Nhập dữ liệu thành công!');
            navigate('dashboard');
          } else {
            alert('File JSON không hợp lệ.');
          }
        };
        reader.readAsText(file);
        e.target.value = '';
      });
    }
  }

  /* ══════════════════════════════════════════
     GLOBAL CLICK DELEGATION
     ══════════════════════════════════════════ */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-action]');
    if (!btn) return;

    if (btn.closest('summary')) { e.preventDefault(); }

    var action = btn.getAttribute('data-action');
    var id = btn.getAttribute('data-id');

    switch (action) {
      case 'navigate':
        var view = btn.getAttribute('data-view');
        var cat = btn.getAttribute('data-cat');
        var tool = btn.getAttribute('data-tool');
        navigate(view, { categoryId: cat, tool: tool });
        break;

      case 'know-filter':
        var knowCat = btn.getAttribute('data-cat');
        navigate('knowledge', { category: knowCat, search: currentFilters.search || '' });
        break;

      case 'know-view':
        var isDoc = btn.getAttribute('data-is-doc') === '1';
        navigate('know-detail', { id: id, isDoc: isDoc });
        break;

      case 'cs-tool-filter':
        var csTool = btn.getAttribute('data-tool');
        navigate('cheatsheets', { tool: csTool, search: currentFilters.search || '' });
        break;

      case 'copy':
        var code = btn.getAttribute('data-code');
        Utils.copyToClipboard(code).then(function () {
          var orig = btn.textContent;
          btn.textContent = 'Đã sao chép';
          btn.classList.add('copied');
          setTimeout(function () {
            btn.textContent = orig;
            btn.classList.remove('copied');
          }, 1400);
          Utils.showToast('Đã sao chép vào clipboard.');
        });
        break;

      case 'pin':
        var p = Store.togglePin(id);
        Utils.showToast(p ? 'Đã ghim lên đầu.' : 'Đã bỏ ghim.');
        render();
        break;

      case 'edit':
        navigate('edit', { id: id });
        break;

      case 'delete':
        var entry = Store.getEntry(id);
        if (entry && confirm('Xác nhận xóa "' + entry.title + '"?')) {
          Store.deleteEntry(id);
          Utils.showToast('Đã xóa ghi chú.');
          render();
        }
        break;

      case 'view-category':
        navigate('entries', { categoryId: id });
        break;

      case 'restore-standard':
        if (confirm('Khôi phục toàn bộ ghi chú của bạn về bản chuẩn hóa mới nhất (Đầy đủ Cheat Sheets & Payloads)?')) {
          Store.resetToStandardized();
          Utils.showToast('Đã khôi phục dữ liệu chuẩn hóa thành công!');
          navigate('dashboard');
        }
        break;

      case 'export':
        var blob = new Blob([Store.exportData()], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'cyber_notes_' + new Date().toISOString().slice(0, 10) + '.json';
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
        Utils.showToast('Đã tải xuống file JSON.');
        break;

      case 'toggle-menu':
        toggleMobileMenu();
        break;

      case 'close-menu':
        closeMobileMenu();
        break;

      case 'mobile-search':
        closeMobileMenu();
        navigate('cheatsheets');
        setTimeout(function () {
          var s = document.getElementById('csSearchInput');
          if (s) {
            s.focus();
            try { s.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
          }
        }, 120);
        break;
    }
  });

  // Close mobile menu when clicking outside navbar and backdrop
  document.addEventListener('click', function (e) {
    if (!e.target.closest('#topNavbar') && !e.target.closest('#navBackdrop')) {
      closeMobileMenu();
    }
  });

  /* ══════════════════════════════════════════
     KEYBOARD SHORTCUT
     ══════════════════════════════════════════ */
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      if (currentView !== 'entries' && currentView !== 'cheatsheets' && currentView !== 'knowledge') {
        navigate('cheatsheets');
      }
      setTimeout(function () {
        var s = document.getElementById('csSearchInput') || document.getElementById('knowSearchInput') || document.getElementById('archiveSearchInput');
        if (s) s.focus();
      }, 50);
    }
  });

  /* ══════════════════════════════════════════
     CLOUD SYNC LISTENER
     ══════════════════════════════════════════ */
  window.addEventListener('store:synced', function (e) {
    // Quietly refresh active view when cloud DB data arrives
    render();
  });

  /* ══════════════════════════════════════════
     INIT
     ══════════════════════════════════════════ */
  Store.init();
  navigate('dashboard');

})();

