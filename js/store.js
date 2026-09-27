/* ============================================
   Data Store — Turso libSQL Cloud & LocalStorage Cache
   Clean Knowledge Base & Comprehensive Cheat Sheets
   ============================================ */
(function () {
  'use strict';

  var STORAGE_KEY = 'cyber_notes_v4';
  var DEFAULT_CAT_ID = 'default';

  // Turso Cloud Database Configuration
  var TURSO_CONFIG = {
    url: 'https://cyber-note-khoadd.aws-ap-northeast-1.turso.io',
    token: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTA1MDA3NTksImlkIjoiMDFhMGUyMjktNGUwMS03NWE5LWFhNWQtMmYzYWQ0MzBmYTg3Iiwia2lkIjoiWXJESXFHeGFDSkRRVHdNMDdmcVgxU25SV1lPblQ5QUhQRmt6SVFoYy1QayIsInJpZCI6IjZlMDY1YjI2LTRlNTgtNDQ2ZC1iMmZjLWJlYjQwMjc4YTIyZSJ9.xMG5RPJoxZ0t0JO6ZjsCUD2JqHFRlibeExBYMEJ_reeRNv31nXp09XTPMW5VV47Wncn5FhKwm9AAc-vt3KbOBw',
    enabled: true
  };

  var state = { version: 4, categories: [], entries: [], documents: [] };
  var Store = {};
  Store.DEFAULT_CAT_ID = DEFAULT_CAT_ID;
  Store.tursoConfig = TURSO_CONFIG;

  /* ---------- Turso HTTP Client ---------- */
  function queryTurso(statements) {
    if (!TURSO_CONFIG.enabled || !TURSO_CONFIG.url || typeof fetch === 'undefined') {
      return Promise.resolve(null);
    }
    var endpoint = TURSO_CONFIG.url.replace(/\/$/, '') + '/v2/pipeline';
    var requests = statements.map(function (s) {
      if (typeof s === 'string') return { type: 'execute', stmt: { sql: s } };
      return { type: 'execute', stmt: s };
    });
    requests.push({ type: 'close' });

    return fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + TURSO_CONFIG.token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ requests: requests })
    }).then(function (res) {
      if (!res.ok) throw new Error('Turso HTTP ' + res.status);
      return res.json();
    });
  }

  function parseResultSet(result) {
    if (!result || !result.cols || !result.rows) return [];
    var colNames = result.cols.map(function (c) { return c.name; });
    return result.rows.map(function (row) {
      var obj = {};
      row.forEach(function (cell, idx) {
        var key = colNames[idx];
        obj[key] = cell ? cell.value : null;
      });
      return obj;
    });
  }

  /* ---------- Normalize Data ---------- */
  function normalize(data) {
    var now = Date.now();

    var categories = (data.categories || []).map(function (c) {
      return {
        id: String(c.id || Utils.generateId()),
        name: String(c.name || '').trim(),
        desc: String(c.desc || '').trim()
      };
    }).filter(function (c) { return c.name; });

    var catIds = {};
    categories.forEach(function (c) { catIds[c.id] = true; });
    var fallbackCatId = categories.length ? categories[0].id : DEFAULT_CAT_ID;

    var entries = (data.entries || []).map(function (e) {
      var isKnow = !!e.isKnowledge || e.type === 'knowledge';
      return {
        id: String(e.id || Utils.generateId()),
        type: ['command', 'file', 'folder', 'knowledge'].indexOf(e.type) >= 0 ? e.type : (isKnow ? 'knowledge' : 'command'),
        title: String(e.title || '').trim(),
        categoryId: catIds[e.categoryId] ? e.categoryId : fallbackCatId,
        language: String(e.language || 'Linux').trim(),
        content: String(e.content || '').trim(),
        code: String(e.code || '').trim(),
        notes: String(e.notes || '').trim(),
        tags: Array.isArray(e.tags) ? e.tags.map(function (t) { return String(t).trim(); }).filter(Boolean) : [],
        pinned: !!e.pinned,
        isKnowledge: isKnow,
        createdAt: Number(e.createdAt) || now,
        updatedAt: Number(e.updatedAt) || now
      };
    }).filter(function (e) { return e.title; });

    var documents = (data.documents || []).map(function (d) {
      return {
        id: String(d.id || Utils.generateId()),
        title: String(d.title || '').trim(),
        description: String(d.description || '').trim(),
        tags: Array.isArray(d.tags) ? d.tags.map(function (t) { return String(t).trim(); }).filter(Boolean) : [],
        content: String(d.content || '').trim(),
        createdAt: Number(d.createdAt) || now,
        updatedAt: Number(d.updatedAt) || now
      };
    }).filter(function (d) { return d.title; });

    return {
      version: 4,
      categories: categories,
      entries: entries,
      documents: documents
    };
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('LocalStorage save error:', e);
    }
  }

  /* ---------- Sync From Turso Cloud ---------- */
  Store.syncFromTurso = function () {
    if (!TURSO_CONFIG.enabled || !TURSO_CONFIG.url) return Promise.resolve(false);

    return queryTurso([
      { sql: 'SELECT * FROM categories;' },
      { sql: 'SELECT * FROM entries ORDER BY pinned DESC, updated_at DESC;' },
      { sql: 'SELECT * FROM documents;' }
    ]).then(function (res) {
      if (!res || !res.results || res.results.length < 3) return false;
      var catsRaw = parseResultSet(res.results[0].response && res.results[0].response.result);
      var entriesRaw = parseResultSet(res.results[1].response && res.results[1].response.result);
      var docsRaw = parseResultSet(res.results[2].response && res.results[2].response.result);

      if (!catsRaw.length && !entriesRaw.length) return false;

      var categories = catsRaw.map(function (c) {
        return {
          id: String(c.id),
          name: String(c.name || '').trim(),
          desc: String(c.desc || '').trim()
        };
      });

      var entries = entriesRaw.map(function (e) {
        var tags = [];
        try { tags = JSON.parse(e.tags || '[]'); } catch (err) { tags = []; }
        var isKnow = e.is_knowledge === 1 || e.is_knowledge === '1' || e.type === 'knowledge';
        return {
          id: String(e.id),
          type: e.type || (isKnow ? 'knowledge' : 'command'),
          title: String(e.title || '').trim(),
          categoryId: e.category_id || 'default',
          language: String(e.language || 'Linux'),
          content: String(e.content || ''),
          code: String(e.code || ''),
          notes: String(e.notes || ''),
          tags: Array.isArray(tags) ? tags : [],
          pinned: e.pinned === 1 || e.pinned === '1',
          isKnowledge: isKnow,
          createdAt: Number(e.created_at) || Date.now(),
          updatedAt: Number(e.updated_at) || Date.now()
        };
      });

      var documents = docsRaw.map(function (d) {
        var tags = [];
        try { tags = JSON.parse(d.tags || '[]'); } catch (err) { tags = []; }
        return {
          id: String(d.id),
          title: String(d.title || '').trim(),
          description: String(d.description || '').trim(),
          tags: Array.isArray(tags) ? tags : [],
          content: String(d.content || ''),
          createdAt: Number(d.created_at) || Date.now(),
          updatedAt: Number(d.updated_at) || Date.now()
        };
      });

      state = {
        version: 4,
        categories: categories,
        entries: entries,
        documents: documents
      };
      save();

      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent('store:synced', { detail: { count: entries.length } }));
      }
      return true;
    }).catch(function (err) {
      console.warn('Turso sync offline or error, using local cached data:', err);
      return false;
    });
  };

  /* ---------- Init Store ---------- */
  Store.init = function () {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (window.SEED_DATA && (!parsed.entries || parsed.entries.length < window.SEED_DATA.entries.length)) {
          state = normalize(window.SEED_DATA);
        } else {
          state = normalize(parsed);
        }
      } else if (window.SEED_DATA) {
        state = normalize(window.SEED_DATA);
      } else {
        state = normalize({ categories: [], entries: [], documents: [] });
      }
      save();
    } catch (e) {
      console.error('Store init error:', e);
      if (window.SEED_DATA) {
        state = normalize(window.SEED_DATA);
      }
      save();
    }

    // Seamlessly sync with Turso cloud in background
    Store.syncFromTurso();
  };

  /* ---------- Categories ---------- */
  Store.getCategories = function () { return state.categories.slice(); };

  Store.getCategory = function (id) {
    return state.categories.find(function (c) { return c.id === id; }) || null;
  };

  Store.getCategoryName = function (id) {
    var c = Store.getCategory(id);
    return c ? c.name : 'Chưa phân loại';
  };

  Store.addCategory = function (data) {
    var cat = {
      id: Utils.generateId(),
      name: String(data.name || '').trim(),
      desc: String(data.desc || '').trim()
    };
    if (!cat.name) return null;
    state.categories.push(cat);
    save();

    // Async sync to Turso
    queryTurso([{
      sql: 'INSERT INTO categories (id, name, desc) VALUES (?, ?, ?);',
      args: [
        { type: 'text', value: cat.id },
        { type: 'text', value: cat.name },
        { type: 'text', value: cat.desc }
      ]
    }]).catch(function (e) { console.error('Turso addCategory error:', e); });

    return cat;
  };

  Store.updateCategory = function (id, data) {
    var idx = -1;
    state.categories.forEach(function (c, i) { if (c.id === id) idx = i; });
    if (idx < 0) return false;

    var newName = String(data.name || '').trim();
    var newDesc = String(data.desc || '').trim();
    if (!newName) return false;

    state.categories[idx].name = newName;
    state.categories[idx].desc = newDesc;
    save();

    // Async sync to Turso
    queryTurso([{
      sql: 'UPDATE categories SET name = ?, desc = ? WHERE id = ?;',
      args: [
        { type: 'text', value: newName },
        { type: 'text', value: newDesc },
        { type: 'text', value: id }
      ]
    }]).catch(function (e) { console.error('Turso updateCategory error:', e); });

    return true;
  };

  Store.deleteCategory = function (id) {
    var idx = -1;
    state.categories.forEach(function (c, i) { if (c.id === id) idx = i; });
    if (idx < 0) return false;

    var fallbackId = state.categories[0] ? state.categories[0].id : DEFAULT_CAT_ID;
    state.entries.forEach(function (e) {
      if (e.categoryId === id) e.categoryId = fallbackId;
    });

    state.categories.splice(idx, 1);
    save();

    // Async sync to Turso
    queryTurso([
      {
        sql: 'UPDATE entries SET category_id = ? WHERE category_id = ?;',
        args: [{ type: 'text', value: fallbackId }, { type: 'text', value: id }]
      },
      {
        sql: 'DELETE FROM categories WHERE id = ?;',
        args: [{ type: 'text', value: id }]
      }
    ]).catch(function (e) { console.error('Turso deleteCategory error:', e); });

    return true;
  };

  /* ---------- Entries (All) ---------- */
  Store.getEntries = function (filters) {
    filters = filters || {};
    var list = state.entries.slice();

    if (filters.categoryId) {
      list = list.filter(function (e) { return e.categoryId === filters.categoryId; });
    }

    if (filters.type) {
      list = list.filter(function (e) { return e.type === filters.type; });
    }

    if (filters.search) {
      var query = filters.search.trim();
      list = list.filter(function (e) {
        return Utils.fuzzyMatch(query, e.title)
          || Utils.fuzzyMatch(query, e.content)
          || Utils.fuzzyMatch(query, e.code)
          || Utils.fuzzyMatch(query, e.notes)
          || e.tags.some(function (t) { return Utils.fuzzyMatch(query, t); });
      });
    }

    list.sort(function (a, b) {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });

    return list;
  };

  Store.getEntry = function (id) {
    return state.entries.find(function (e) { return e.id === id; }) || null;
  };

  Store.addEntry = function (data) {
    var now = Date.now();
    var isKnow = data.type === 'knowledge';
    var entry = {
      id: Utils.generateId(),
      type: ['command', 'file', 'folder', 'knowledge'].indexOf(data.type) >= 0 ? data.type : (isKnow ? 'knowledge' : 'command'),
      title: String(data.title || '').trim(),
      categoryId: data.categoryId || (state.categories[0] ? state.categories[0].id : DEFAULT_CAT_ID),
      language: String(data.language || 'Linux').trim(),
      content: String(data.content || '').trim(),
      code: String(data.code || '').trim(),
      notes: String(data.notes || '').trim(),
      tags: Array.isArray(data.tags) ? data.tags : [],
      pinned: !!data.pinned,
      isKnowledge: isKnow,
      createdAt: now,
      updatedAt: now
    };
    if (!entry.title) return null;
    state.entries.unshift(entry);
    save();

    // Async sync to Turso
    queryTurso([{
      sql: 'INSERT INTO entries (id, type, title, category_id, language, content, code, notes, tags, pinned, is_knowledge, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
      args: [
        { type: 'text', value: entry.id },
        { type: 'text', value: entry.type },
        { type: 'text', value: entry.title },
        { type: 'text', value: entry.categoryId },
        { type: 'text', value: entry.language },
        { type: 'text', value: entry.content },
        { type: 'text', value: entry.code },
        { type: 'text', value: entry.notes },
        { type: 'text', value: JSON.stringify(entry.tags) },
        { type: 'integer', value: entry.pinned ? '1' : '0' },
        { type: 'integer', value: entry.isKnowledge ? '1' : '0' },
        { type: 'integer', value: String(entry.createdAt) },
        { type: 'integer', value: String(entry.updatedAt) }
      ]
    }]).catch(function (e) { console.error('Turso addEntry error:', e); });

    return entry;
  };

  Store.updateEntry = function (id, data) {
    var entry = Store.getEntry(id);
    if (!entry) return false;

    if (data.type) {
      entry.type = data.type;
      entry.isKnowledge = data.type === 'knowledge';
    }
    if (data.title) entry.title = String(data.title).trim();
    if (data.categoryId !== undefined) entry.categoryId = data.categoryId;
    if (data.language !== undefined) entry.language = String(data.language).trim();
    if (data.content !== undefined) entry.content = String(data.content).trim();
    if (data.code !== undefined) entry.code = String(data.code).trim();
    if (data.notes !== undefined) entry.notes = String(data.notes).trim();
    if (Array.isArray(data.tags)) entry.tags = data.tags;
    if (data.pinned !== undefined) entry.pinned = !!data.pinned;
    entry.updatedAt = Date.now();

    save();

    // Async sync to Turso
    queryTurso([{
      sql: 'UPDATE entries SET type=?, title=?, category_id=?, language=?, content=?, code=?, notes=?, tags=?, pinned=?, is_knowledge=?, updated_at=? WHERE id=?;',
      args: [
        { type: 'text', value: entry.type },
        { type: 'text', value: entry.title },
        { type: 'text', value: entry.categoryId },
        { type: 'text', value: entry.language },
        { type: 'text', value: entry.content },
        { type: 'text', value: entry.code },
        { type: 'text', value: entry.notes },
        { type: 'text', value: JSON.stringify(entry.tags) },
        { type: 'integer', value: entry.pinned ? '1' : '0' },
        { type: 'integer', value: entry.isKnowledge ? '1' : '0' },
        { type: 'integer', value: String(entry.updatedAt) },
        { type: 'text', value: id }
      ]
    }]).catch(function (e) { console.error('Turso updateEntry error:', e); });

    return true;
  };

  Store.deleteEntry = function (id) {
    var idx = -1;
    state.entries.forEach(function (e, i) { if (e.id === id) idx = i; });
    if (idx < 0) return false;
    state.entries.splice(idx, 1);
    save();

    // Async sync to Turso
    queryTurso([{
      sql: 'DELETE FROM entries WHERE id = ?;',
      args: [{ type: 'text', value: id }]
    }]).catch(function (e) { console.error('Turso deleteEntry error:', e); });

    return true;
  };

  Store.togglePin = function (id) {
    var entry = Store.getEntry(id);
    if (!entry) return false;
    entry.pinned = !entry.pinned;
    entry.updatedAt = Date.now();
    save();

    // Async sync to Turso
    queryTurso([{
      sql: 'UPDATE entries SET pinned = ?, updated_at = ? WHERE id = ?;',
      args: [
        { type: 'integer', value: entry.pinned ? '1' : '0' },
        { type: 'integer', value: String(entry.updatedAt) },
        { type: 'text', value: id }
      ]
    }]).catch(function (e) { console.error('Turso togglePin error:', e); });

    return entry.pinned;
  };

  /* ---------- Knowledge Items (Long & Complex Documents Only) ---------- */
  Store.getKnowledgeItems = function (filters) {
    filters = filters || {};
    var results = [];

    // Only long, comprehensive documents from tài liệu/ (SQLi, File Upload, Path Traversal)
    state.documents.forEach(function (doc) {
      results.push({
        id: doc.id,
        isDoc: true,
        title: doc.title,
        categoryId: doc.categoryId || 'pentest',
        categoryName: Store.getCategoryName(doc.categoryId || 'pentest') || 'Web Pentest',
        description: doc.description || (doc.content ? doc.content.slice(0, 180) + '...' : ''),
        content: doc.content,
        tags: doc.tags,
        updatedAt: doc.updatedAt
      });
    });

    if (filters.category) {
      results = results.filter(function (item) {
        return item.categoryId === filters.category;
      });
    }

    if (filters.search) {
      var q = filters.search.trim();
      results = results.filter(function (item) {
        return Utils.fuzzyMatch(q, item.title)
          || Utils.fuzzyMatch(q, item.description)
          || (item.tags || []).some(function (t) { return Utils.fuzzyMatch(q, t); });
      });
    }

    return results;
  };

  /* ---------- Cheat Sheets & Payloads ---------- */
  Store.getCheatSheets = function (filters) {
    filters = filters || {};
    var list = state.entries.filter(function (e) {
      return e.code && e.code.trim().length > 0 && !e.isKnowledge;
    });

    if (filters.tool) {
      var t = filters.tool.toLowerCase();
      if (t === 'sqli') {
        list = list.filter(function (e) { return e.tags.includes('sqli') || e.title.toLowerCase().includes('sql'); });
      } else if (t === 'upload') {
        list = list.filter(function (e) { return e.tags.includes('file-upload') || e.title.toLowerCase().includes('upload'); });
      } else if (t === 'traversal') {
        list = list.filter(function (e) { return e.tags.includes('path-traversal') || e.tags.includes('lfi') || e.title.toLowerCase().includes('traversal'); });
      } else if (t === 'xss') {
        list = list.filter(function (e) { return e.tags.includes('xss'); });
      } else if (t === 'rce') {
        list = list.filter(function (e) { return e.tags.includes('command-injection') || e.tags.includes('reverse-shell') || e.tags.includes('rce'); });
      } else if (t === 'ssrf') {
        list = list.filter(function (e) { return e.tags.includes('ssrf'); });
      } else if (t === 'nmap') {
        list = list.filter(function (e) { return e.tags.includes('nmap'); });
      } else if (t === 'fuzzing') {
        list = list.filter(function (e) { return e.tags.includes('ffuf') || e.tags.includes('gobuster'); });
      } else if (t === 'bruteforce') {
        list = list.filter(function (e) { return e.tags.includes('hydra') || e.tags.includes('hashcat') || e.tags.includes('password-cracking'); });
      } else if (t === 'privesc') {
        list = list.filter(function (e) { return e.tags.includes('privilege-escalation') || e.tags.includes('persistence'); });
      } else if (t === 'linux') {
        list = list.filter(function (e) { return e.categoryId === 'linux-system' || e.categoryId === 'linux-file'; });
      } else if (t === 'wazuh') {
        list = list.filter(function (e) { return e.categoryId === 'wazuh'; });
      } else if (t === 'frontend') {
        list = list.filter(function (e) { return e.categoryId === 'html' || e.categoryId === 'css'; });
      }
    }

    if (filters.search) {
      var q = filters.search.trim();
      list = list.filter(function (e) {
        return Utils.fuzzyMatch(q, e.title)
          || Utils.fuzzyMatch(q, e.code)
          || Utils.fuzzyMatch(q, e.content)
          || e.tags.some(function (tag) { return Utils.fuzzyMatch(q, tag); });
      });
    }

    list.sort(function (a, b) {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });

    return list;
  };

  /* ---------- Documents ---------- */
  Store.getDocuments = function () { return state.documents.slice(); };

  Store.getDocument = function (id) {
    return state.documents.find(function (d) { return d.id === id; }) || null;
  };

  /* ---------- Stats & Export/Reset ---------- */
  Store.getStats = function () {
    var knowCount = Store.getKnowledgeItems().length;
    var csCount = Store.getCheatSheets().length;
    return {
      total: state.entries.length,
      knowledge: knowCount,
      cheatsheets: csCount,
      categories: state.categories.length,
      pinned: state.entries.filter(function (e) { return e.pinned; }).length
    };
  };

  Store.exportData = function () {
    return JSON.stringify(state, null, 2);
  };

  Store.importData = function (jsonStr) {
    try {
      var data = JSON.parse(jsonStr);
      state = normalize(data);
      save();
      return true;
    } catch (e) {
      console.error('Import error:', e);
      return false;
    }
  };

  Store.resetToStandardized = function () {
    if (window.SEED_DATA) {
      state = normalize(window.SEED_DATA);
      save();
      return true;
    }
    return false;
  };

  Store.resetData = function () {
    localStorage.removeItem(STORAGE_KEY);
    Store.init();
  };

  window.Store = Store;
})();
