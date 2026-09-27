/* ============================================
   UI Components — Clean Cyber Notes Interface
   Minimalist, Functional, No Clutter, No Verbose Subtitles
   ============================================ */
(function () {
  'use strict';

  var Components = {};
  var esc = Utils.escapeHtml;

  /* ══════════════════════════════════════════
     HELPER: Render Entry Card
     ══════════════════════════════════════════ */
  function renderEntryCard(entry) {
    var catName = Store.getCategoryName(entry.categoryId);
    var pinLabel = entry.pinned ? 'Bỏ ghim' : 'Ghim';
    var dateStr = Utils.formatDate(entry.updatedAt);
    var pinnedClass = entry.pinned ? ' pinned' : '';
    var pinIndicator = entry.pinned ? '<span class="pin-badge">[GHIM]</span> ' : '';

    var body = '';
    if (entry.content) {
      body += '<div class="entry-desc">' + esc(entry.content) + '</div>';
    }
    if (entry.code) {
      body += '<div class="code-box">'
        + '<button class="copy-btn" data-action="copy" data-code="' + esc(entry.code) + '">Sao chép</button>'
        + '<pre><code>' + esc(entry.code) + '</code></pre>'
        + '</div>';
    }
    if (entry.notes) {
      body += '<div class="entry-notes"><b>Ghi chú:</b> ' + esc(entry.notes) + '</div>';
    }

    return '<details class="card entry-card' + pinnedClass + '" data-id="' + esc(entry.id) + '">'
      + '<summary class="card-summary">'
        + '<div class="card-title-wrap">'
          + pinIndicator
          + '<span class="card-title">' + esc(entry.title) + '</span>'
          + '<span class="tag-badge">' + esc(catName) + '</span>'
        + '</div>'
        + '<div class="card-actions">'
          + '<button class="btn btn-sm btn-ghost" data-action="pin" data-id="' + esc(entry.id) + '">' + pinLabel + '</button>'
          + '<button class="btn btn-sm btn-secondary" data-action="edit" data-id="' + esc(entry.id) + '">Sửa</button>'
          + '<button class="btn btn-sm btn-ghost" data-action="delete" data-id="' + esc(entry.id) + '">Xóa</button>'
        + '</div>'
      + '</summary>'
      + '<div class="card-body">'
        + body
        + '<div class="card-date">Cập nhật: ' + dateStr + '</div>'
      + '</div>'
    + '</details>';
  }

  /* ══════════════════════════════════════════
     VIEW 1: Dashboard
     Minimalist Clean Layout
     ══════════════════════════════════════════ */
  Components.renderDashboard = function (container) {
    var stats = Store.getStats();
    var allEntries = Store.getEntries();
    var pinned = allEntries.filter(function (e) { return e.pinned; }).slice(0, 6);
    var recent = allEntries.slice(0, 8);

    var html = ''
      + '<div class="page-wrap">'
        + '<div class="dashboard-topbar">'
          + '<h1 class="main-heading">Tổng Quan</h1>'
          + '<button class="btn btn-primary" data-action="navigate" data-view="create">+ Thêm ghi chú</button>'
        + '</div>'

        + '<!-- STATS STRIP -->'
        + '<div class="stats-row">'
          + '<div class="stat-card" data-action="navigate" data-view="cheatsheets">'
            + '<div class="stat-num">' + stats.cheatsheets + '</div>'
            + '<div class="stat-label">Cheat Sheets &amp; Payloads</div>'
          + '</div>'
          + '<div class="stat-card" data-action="navigate" data-view="knowledge">'
            + '<div class="stat-num">' + stats.knowledge + '</div>'
            + '<div class="stat-label">Tài Liệu Chuyên Sâu</div>'
          + '</div>'
          + '<div class="stat-card" data-action="navigate" data-view="entries">'
            + '<div class="stat-num">' + stats.total + '</div>'
            + '<div class="stat-label">Tổng Số Ghi Chú</div>'
          + '</div>'
          + '<div class="stat-card" data-action="navigate" data-view="categories">'
            + '<div class="stat-num">' + stats.categories + '</div>'
            + '<div class="stat-label">Chuyên Mục Chính</div>'
          + '</div>'
        + '</div>';

    if (pinned.length) {
      html += '<div class="section-header-row">'
        + '<h2 class="section-title">Mục Đã Ghim Ưu Tiên</h2>'
        + '<span class="section-meta">' + pinned.length + ' mục</span>'
        + '</div>'
        + '<div class="entry-list">' + pinned.map(renderEntryCard).join('') + '</div>';
    }

    if (recent.length) {
      html += '<div class="section-header-row" style="margin-top:2.2rem;">'
        + '<h2 class="section-title">Ghi Chú Cập Nhật Gần Đây</h2>'
        + '<span class="section-meta"><a href="#" data-action="navigate" data-view="entries" style="color:var(--cyan);">Xem tất cả &rarr;</a></span>'
        + '</div>'
        + '<div class="entry-list">' + recent.map(renderEntryCard).join('') + '</div>';
    }

    html += '</div>';
    container.innerHTML = html;
  };

  /* ══════════════════════════════════════════
     VIEW 2: Knowledge Base (Tài liệu chuyên sâu)
     ══════════════════════════════════════════ */
  Components.renderKnowledge = function (container, filters) {
    filters = filters || {};
    var activeCategory = filters.category || '';
    var items = Store.getKnowledgeItems(filters);

    var allDocs = Store.getKnowledgeItems();
    var catMap = {};
    allDocs.forEach(function (doc) {
      catMap[doc.categoryId] = doc.categoryName || 'Web Pentest';
    });
    var catKeys = Object.keys(catMap);
    var pillsHtml = '';
    if (catKeys.length > 1) {
      var pills = [{ id: '', label: 'Tất cả (' + allDocs.length + ')' }];
      catKeys.forEach(function (k) {
        pills.push({ id: k, label: catMap[k] });
      });
      pillsHtml = '<div class="filter-pills" style="margin-bottom:1rem;">' + pills.map(function (p) {
        var act = activeCategory === p.id ? ' active' : '';
        return '<button class="pill-btn' + act + '" data-action="know-filter" data-cat="' + p.id + '">' + p.label + '</button>';
      }).join('') + '</div>';
    }

    var cardsHtml = '';
    if (!items.length) {
      cardsHtml = '<div class="empty-box">Không tìm thấy tài liệu phù hợp.</div>';
    } else {
      cardsHtml = items.map(function (item) {
        var excerpt = item.description || (item.content ? item.content.slice(0, 160) : '') + '...';
        excerpt = excerpt.replace(/[#`>*_\-|]/g, '').replace(/\s+/g, ' ');
        var tagHtml = (item.tags || []).slice(0, 4).map(function (t) {
          return '<span class="tag-badge">' + esc(t) + '</span>';
        }).join('');

        return '<div class="card know-card" data-action="know-view" data-id="' + esc(item.id) + '" data-is-doc="' + (item.isDoc ? '1' : '0') + '">'
          + '<div class="card-head">'
            + '<h3 class="card-title-text">' + esc(item.title) + '</h3>'
            + '<span class="badge-cat">' + esc(item.categoryName) + '</span>'
          + '</div>'
          + '<p class="card-excerpt">' + esc(excerpt) + '</p>'
          + '<div class="card-foot">'
            + '<div class="tag-wrap">' + tagHtml + '</div>'
            + '<span class="read-more">Đọc chi tiết &rarr;</span>'
          + '</div>'
        + '</div>';
      }).join('');
    }

    var html = ''
      + '<div class="page-wrap">'
        + '<div class="page-header">'
          + '<h1 class="main-heading">Tài Liệu Chuyên Sâu</h1>'
        + '</div>'

        + pillsHtml

        + '<div class="search-wrap" style="margin-bottom:1.5rem;">'
          + '<input type="text" id="knowSearchInput" class="input" placeholder="Tìm kiếm trong tài liệu..." value="' + esc(filters.search || '') + '">'
        + '</div>'

        + '<div class="know-grid">' + cardsHtml + '</div>'
      + '</div>';

    container.innerHTML = html;
  };

  /* ══════════════════════════════════════════
     VIEW 3: Knowledge Article Detail View
     ══════════════════════════════════════════ */
  Components.renderKnowledgeDetail = function (container, id, isDoc) {
    var item = null;
    if (isDoc) {
      item = Store.getDocument(id);
    } else {
      var entry = Store.getEntry(id);
      if (entry) {
        item = {
          title: entry.title,
          categoryName: Store.getCategoryName(entry.categoryId),
          tags: entry.tags,
          content: (entry.content ? entry.content + '\n\n' : '')
            + (entry.code ? '```' + (entry.language || '') + '\n' + entry.code + '\n```\n\n' : '')
            + (entry.notes ? '> **Ghi chú quan trọng:**\n> ' + entry.notes : ''),
          updatedAt: entry.updatedAt
        };
      }
    }

    if (!item) {
      container.innerHTML = '<div class="page-wrap"><div class="empty-box">Không tìm thấy nội dung.</div></div>';
      return;
    }

    var tagsHtml = (item.tags || []).map(function (t) {
      return '<span class="tag-badge">' + esc(t) + '</span>';
    }).join('');

    var html = ''
      + '<div class="page-wrap">'
        + '<button class="back-link" data-action="navigate" data-view="knowledge">&larr; Quay lại danh sách tài liệu</button>'
        + '<div class="article-box">'
          + '<div class="article-header">'
            + '<h1 class="article-title">' + esc(item.title) + '</h1>'
            + (item.categoryName ? '<div class="tag-wrap" style="margin-top:.6rem;"><span class="badge-cat">' + esc(item.categoryName) + '</span>' + tagsHtml + '</div>' : '')
            + '<div class="article-date">Cập nhật: ' + Utils.formatDate(item.updatedAt) + '</div>'
          + '</div>'
          + '<div class="md-body">' + Markdown.render(item.content) + '</div>'
        + '</div>'
      + '</div>';

    container.innerHTML = html;
  };

  /* ══════════════════════════════════════════
     VIEW 4: Cheat Sheets
     ══════════════════════════════════════════ */
  Components.renderCheatSheets = function (container, filters) {
    filters = filters || {};
    var activeTool = filters.tool || '';
    var items = Store.getCheatSheets(filters);

    var pills = [
      { id: '', label: 'Tất cả' },
      { id: 'sqli', label: 'SQL Injection' },
      { id: 'upload', label: 'File Upload Bypass' },
      { id: 'traversal', label: 'Path Traversal & LFI' },
      { id: 'xss', label: 'XSS Payloads' },
      { id: 'rce', label: 'Command Injection & Shells' },
      { id: 'ssrf', label: 'SSRF Payloads' },
      { id: 'nmap', label: 'Nmap & Scanning' },
      { id: 'fuzzing', label: 'Web Fuzzing (ffuf/gobuster)' },
      { id: 'bruteforce', label: 'Password Cracking (hydra/hashcat)' },
      { id: 'privesc', label: 'Privilege Escalation' },
      { id: 'linux', label: 'Linux SysAdmin' },
      { id: 'wazuh', label: 'Wazuh CLI & API' },
      { id: 'frontend', label: 'HTML & CSS' }
    ];

    var pillsHtml = pills.map(function (p) {
      var act = activeTool === p.id ? ' active' : '';
      return '<button class="pill-btn' + act + '" data-action="cs-tool-filter" data-tool="' + p.id + '">' + p.label + '</button>';
    }).join('');

    var cardsHtml = '';
    if (!items.length) {
      cardsHtml = '<div class="empty-box">Không tìm thấy lệnh hoặc payload phù hợp.</div>';
    } else {
      cardsHtml = items.map(function (item) {
        var catName = Store.getCategoryName(item.categoryId);
        var tagsHtml = (item.tags || []).map(function (t) {
          return '<span class="tag-badge">' + esc(t) + '</span>';
        }).join('');

        return '<div class="cs-item-card">'
          + '<div class="cs-item-head">'
            + '<div class="cs-item-title-wrap">'
              + '<h3 class="cs-item-title">' + esc(item.title) + '</h3>'
              + '<span class="badge-lang">' + esc(item.language || catName) + '</span>'
            + '</div>'
            + '<div class="cs-item-tags">' + tagsHtml + '</div>'
          + '</div>'
          + (item.content ? '<p class="cs-item-desc">' + esc(item.content) + '</p>' : '')
          + '<div class="code-box">'
            + '<button class="copy-btn" data-action="copy" data-code="' + esc(item.code) + '">Sao chép</button>'
            + '<pre><code>' + esc(item.code) + '</code></pre>'
          + '</div>'
          + (item.notes ? '<div class="cs-item-notes"><b>Giải thích cú pháp / Cờ tham số:</b> ' + esc(item.notes) + '</div>' : '')
        + '</div>';
      }).join('');
    }

    var html = ''
      + '<div class="page-wrap">'
        + '<div class="page-header">'
          + '<h1 class="main-heading">Cheat Sheets</h1>'
          + '<div class="cs-header-stats">'
            + '<span class="stat-pill">' + items.length + ' mục</span>'
          + '</div>'
        + '</div>'

        + '<div class="filter-pills-wrap">'
          + '<div class="filter-pills">' + pillsHtml + '</div>'
        + '</div>'

        + '<div class="search-wrap">'
          + '<input type="text" id="csSearchInput" class="input" placeholder="Tìm nhanh câu lệnh, payload hoặc cờ tham số..." value="' + esc(filters.search || '') + '">'
        + '</div>'

        + '<div class="cs-list-grid">' + cardsHtml + '</div>'
      + '</div>';

    container.innerHTML = html;
  };

  /* ══════════════════════════════════════════
     VIEW 5: Entries Archive (Tất cả ghi chú)
     ══════════════════════════════════════════ */
  Components.renderEntries = function (container, filters) {
    filters = filters || {};
    var categories = Store.getCategories();
    var entries = Store.getEntries(filters);

    var catOptions = categories.map(function (c) {
      var sel = filters.categoryId === c.id ? ' selected' : '';
      return '<option value="' + esc(c.id) + '"' + sel + '>' + esc(c.name) + '</option>';
    }).join('');

    var html = ''
      + '<div class="page-wrap">'
        + '<div class="page-header">'
          + '<h1 class="main-heading">Tất Cả Ghi Chú</h1>'
          + '<button class="btn btn-primary" data-action="navigate" data-view="create">+ Thêm mới</button>'
        + '</div>'

        + '<div class="search-toolbar-row">'
          + '<input type="text" id="archiveSearchInput" class="input" placeholder="Tìm kiếm ghi chú (Ctrl+K)..." value="' + esc(filters.search || '') + '">'
          + '<select id="archiveTypeFilter" class="input" style="max-width:200px;">'
            + '<option value="">Tất cả loại mục</option>'
            + '<option value="command"' + (filters.type === 'command' ? ' selected' : '') + '>Lệnh / Cheat Sheet</option>'
            + '<option value="knowledge"' + (filters.type === 'knowledge' ? ' selected' : '') + '>Kiến thức / Lý thuyết</option>'
            + '<option value="file"' + (filters.type === 'file' ? ' selected' : '') + '>File cấu hình</option>'
          + '</select>'
          + '<select id="archiveCatFilter" class="input" style="max-width:220px;"><option value="">Tất cả danh mục</option>' + catOptions + '</select>'
        + '</div>';

    if (!entries.length) {
      html += '<div class="empty-box">Không tìm thấy ghi chú nào phù hợp.</div>';
    } else {
      var groupMap = {};
      var groupOrder = [];
      entries.forEach(function (e) {
        if (!groupMap[e.categoryId]) {
          groupMap[e.categoryId] = [];
          groupOrder.push(e.categoryId);
        }
        groupMap[e.categoryId].push(e);
      });

      html += '<div class="entry-groups-wrap">';
      groupOrder.forEach(function (catId) {
        var items = groupMap[catId];
        var catName = Store.getCategoryName(catId);
        html += '<div class="entry-group-block">'
          + '<div class="group-title-row">'
            + '<h3 class="group-title">' + esc(catName) + '</h3>'
            + '<span class="group-count">' + items.length + ' mục</span>'
          + '</div>'
          + '<div class="entry-list">' + items.map(renderEntryCard).join('') + '</div>'
        + '</div>';
      });
      html += '</div>';
    }

    html += '</div>';
    container.innerHTML = html;
  };

  /* ══════════════════════════════════════════
     VIEW 6: Create / Edit Entry Form
     ══════════════════════════════════════════ */
  Components.renderEntryForm = function (container, entryId) {
    var entry = entryId ? Store.getEntry(entryId) : null;
    var isEdit = !!entry;
    var categories = Store.getCategories();
    var tagsStr = entry ? (entry.tags || []).join(', ') : '';

    var catOptions = categories.map(function (c) {
      var sel = entry && entry.categoryId === c.id ? ' selected' : '';
      return '<option value="' + esc(c.id) + '"' + sel + '>' + esc(c.name) + '</option>';
    }).join('');

    var html = ''
      + '<div class="page-wrap" style="max-width:780px;">'
        + '<div class="page-header">'
          + '<h1 class="main-heading">' + (isEdit ? 'Chỉnh Sửa Ghi Chú' : 'Thêm Ghi Chú Mới') + '</h1>'
        + '</div>'

        + '<form id="entryForm" class="form card" style="padding:1.6rem;">'
          + '<input type="hidden" id="entryId" value="' + esc(entry ? entry.id : '') + '">'

          + '<div class="form-row-2">'
            + '<div class="form-field">'
              + '<label for="entryCategory">Danh mục</label>'
              + '<select id="entryCategory" class="input">' + catOptions + '</select>'
            + '</div>'
            + '<div class="form-field">'
              + '<label for="entryType">Loại mục</label>'
              + '<select id="entryType" class="input">'
                + '<option value="command"' + (entry && entry.type === 'command' ? ' selected' : '') + '>Lệnh / Cheat Sheet</option>'
                + '<option value="knowledge"' + (entry && entry.type === 'knowledge' ? ' selected' : '') + '>Kiến thức / Lý thuyết</option>'
                + '<option value="file"' + (entry && entry.type === 'file' ? ' selected' : '') + '>File cấu hình</option>'
              + '</select>'
            + '</div>'
          + '</div>'

          + '<div class="form-field">'
            + '<label for="entryTitle">Tiêu đề ghi chú</label>'
            + '<input type="text" id="entryTitle" class="input" placeholder="Ví dụ: Lệnh tail theo dõi log, Nmap SYN Scan, SQLi Auth Bypass..." value="' + esc(entry ? entry.title : '') + '" required>'
          + '</div>'

          + '<div class="form-field">'
            + '<label for="entryContent">Nội dung giải thích / Chức năng</label>'
            + '<textarea id="entryContent" class="input textarea" placeholder="Mô tả ý nghĩa, nguyên lý hoặc hướng dẫn sử dụng...">' + esc(entry ? entry.content : '') + '</textarea>'
          + '</div>'

          + '<div class="form-field">'
            + '<label for="entryCode">Cú pháp câu lệnh / Payload (nếu có)</label>'
            + '<textarea id="entryCode" class="input textarea code-textarea" placeholder="Nhập câu lệnh hoặc payload...">' + esc(entry ? entry.code : '') + '</textarea>'
          + '</div>'

          + '<div class="form-field">'
            + '<label for="entryNotes">Ghi chú bổ sung / Giải thích flags</label>'
            + '<textarea id="entryNotes" class="input textarea" style="min-height:80px;" placeholder="Lưu ý các cờ tham số hoặc cách phòng vệ...">' + esc(entry ? entry.notes : '') + '</textarea>'
          + '</div>'

          + '<div class="form-row-2">'
            + '<div class="form-field">'
              + '<label for="entryTags">Tags (phân cách bằng dấu phẩy)</label>'
              + '<input type="text" id="entryTags" class="input" placeholder="vd: linux, grep, nmap, sqli" value="' + esc(tagsStr) + '">'
            + '</div>'
            + '<div class="form-field" style="display:flex;align-items:center;padding-top:1.4rem;">'
              + '<label style="display:flex;align-items:center;gap:.6rem;cursor:pointer;">'
                + '<input type="checkbox" id="entryPinned"' + (entry && entry.pinned ? ' checked' : '') + ' style="accent-color:var(--cyan);">'
                + '<span>Ghim lên đầu Dashboard</span>'
              + '</label>'
            + '</div>'
          + '</div>'

          + '<div class="form-actions" style="margin-top:1rem;">'
            + '<button type="submit" class="btn btn-primary">' + (isEdit ? 'Lưu cập nhật' : 'Thêm vào kho') + '</button>'
            + '<button type="button" class="btn btn-ghost" data-action="navigate" data-view="entries">Hủy</button>'
          + '</div>'
        + '</form>'
      + '</div>';

    container.innerHTML = html;
  };

  /* ══════════════════════════════════════════
     VIEW 7: Categories
     ══════════════════════════════════════════ */
  Components.renderCategories = function (container) {
    var categories = Store.getCategories();

    var catCards = categories.map(function (c) {
      var count = Store.getEntries({ categoryId: c.id }).length;
      return '<div class="card" style="display:flex;align-items:center;justify-content:space-between;padding:1.1rem 1.4rem;">'
        + '<div>'
          + '<h4 style="font-weight:600;font-size:1.05rem;color:var(--text-bright);">' + esc(c.name) + '</h4>'
          + '<p style="color:var(--text-secondary);font-size:.85rem;margin-top:.2rem;">' + esc(c.desc || 'Chưa có mô tả') + ' · <b style="color:var(--cyan);">' + count + ' ghi chú</b></p>'
        + '</div>'
        + '<div style="display:flex;gap:.5rem;">'
          + '<button class="btn btn-sm btn-secondary" data-action="view-category" data-id="' + esc(c.id) + '">Xem</button>'
        + '</div>'
      + '</div>';
    }).join('');

    var html = ''
      + '<div class="page-wrap" style="max-width:800px;">'
        + '<div class="page-header">'
          + '<h1 class="main-heading">Danh Mục</h1>'
        + '</div>'
        + '<div style="display:grid;gap:.8rem;">' + catCards + '</div>'
      + '</div>';

    container.innerHTML = html;
  };

  /* ══════════════════════════════════════════
     VIEW 8: Backup & Data
     ══════════════════════════════════════════ */
  Components.renderBackup = function (container) {
    var stats = Store.getStats();

    var html = ''
      + '<div class="page-wrap">'
        + '<div class="page-header">'
          + '<h1 class="main-heading">Sao Lưu &amp; Dữ Liệu</h1>'
        + '</div>'

        + '<div class="stats-row" style="grid-template-columns:1fr 1fr;margin-bottom:1.5rem;">'
          + '<div class="card" style="padding:1.6rem;">'
            + '<h3 style="font-size:1.15rem;color:var(--text-bright);margin-bottom:.5rem;">Khôi phục Dữ liệu Chuẩn Hóa</h3>'
            + '<p style="color:var(--text-secondary);font-size:.88rem;line-height:1.5;margin-bottom:1.2rem;">'
              + 'Khôi phục lại toàn bộ dữ liệu ghi chú và cheat sheets chuẩn hóa ban đầu.'
            + '</p>'
            + '<button class="btn btn-primary" data-action="restore-standard">Khôi phục ngay</button>'
          + '</div>'

          + '<div class="card" style="padding:1.6rem;">'
            + '<h3 style="font-size:1.15rem;color:var(--text-bright);margin-bottom:.5rem;">Xuất File Sao Lưu (JSON)</h3>'
            + '<p style="color:var(--text-secondary);font-size:.88rem;line-height:1.5;margin-bottom:1.2rem;">'
              + 'Tải về file JSON đầy đủ chứa toàn bộ ghi chú và cheat sheets.'
            + '</p>'
            + '<button class="btn btn-cyan" data-action="export">Tải file JSON</button>'
          + '</div>'
        + '</div>'

        + '<div class="card" style="padding:1.6rem;max-width:550px;">'
          + '<h3 style="font-size:1.05rem;color:var(--text-bright);margin-bottom:.4rem;">Nhập dữ liệu từ file</h3>'
          + '<p style="color:var(--text-secondary);font-size:.86rem;margin-bottom:1rem;">Nhập lại dữ liệu từ file sao lưu JSON trước đây.</p>'
          + '<label class="btn btn-secondary" for="importFile">Chọn file JSON</label>'
          + '<input id="importFile" type="file" accept=".json" hidden>'
        + '</div>'
      + '</div>';

    container.innerHTML = html;
  };

  window.Components = Components;
})();
