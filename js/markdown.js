/* ============================================
   Markdown Renderer — tối giản, không thư viện
   Hỗ trợ: heading, bold, italic, code block,
           inline code, table, blockquote,
           list (ul/ol), hr, paragraph
   ============================================ */
(function () {
  'use strict';

  var Markdown = {};

  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* Inline formatting — chạy SAU esc() */
  function inline(text) {
    var codes = [];
    /* 1. Trích xuất inline code và thay thế bằng placeholder để bảo vệ không bị format bold/italic */
    var protectedText = text.replace(/`([^`]+)`/g, function (match, codeContent) {
      codes.push('<code class="md-inline-code">' + codeContent + '</code>');
      return '\u0001' + (codes.length - 1) + '\u0002';
    });

    /* 2. Format bold/italic trên phần text còn lại */
    var rendered = protectedText
      /* Bold + Italic */
      .replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>')
      /* Bold */
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^a-zA-Z0-9])__([^_]+)__(?=$|[^a-zA-Z0-9])/g, '$1<strong>$2</strong>')
      /* Italic */
      .replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
      .replace(/(^|[^a-zA-Z0-9])_([^_]+)_(?=$|[^a-zA-Z0-9])/g, '$1<em>$2</em>');

    /* 3. Phục hồi lại các inline code từ placeholder */
    rendered = rendered.replace(/\u0001(\d+)\u0002/g, function (match, index) {
      return codes[parseInt(index, 10)];
    });

    return rendered;
  }

  /* Kiểm tra một dòng có phải separator của table không */
  function isTableSep(line) {
    return /^\|[\s\-:|]+\|/.test(line);
  }

  /* Tạo ID từ text heading để dùng làm anchor */
  var slugCounts = {};
  function slugify(text) {
    var s = (text || '').toLowerCase()
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
      .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
      .replace(/[ìíịỉĩ]/g, 'i')
      .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
      .replace(/[ùúụủũưừứựửữ]/g, 'u')
      .replace(/[ỳýỵỷỹ]/g, 'y')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/[\s-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    /* Handle duplicates */
    if (!slugCounts[s]) { slugCounts[s] = 0; }
    var count = slugCounts[s]++;
    return count === 0 ? s : s + '-' + count;
  }

  Markdown.render = function (text) {
    if (!text) return '';
    slugCounts = {}; /* reset per-render */

    var lines = text.split('\n');
    var html = '';
    var i = 0;
    var inUl = false, inOl = false, inBq = false, inTable = false, tableBodyOpen = false;

    function closeUl()    { if (inUl) { html += '</ul>'; inUl = false; } }
    function closeOl()    { if (inOl) { html += '</ol>'; inOl = false; } }
    function closeBq()    { if (inBq) { html += '</blockquote>'; inBq = false; } }
    function closeTable() {
      if (inTable) {
        if (tableBodyOpen) html += '</tbody>';
        html += '</table></div>';
        inTable = false; tableBodyOpen = false;
      }
    }
    function closeLists() { closeUl(); closeOl(); }
    function closeAll()   { closeLists(); closeBq(); closeTable(); }

    while (i < lines.length) {
      var line = lines[i];

      /* ---- Fenced Code Block ---- */
      if (/^```/.test(line)) {
        closeAll();
        var lang = line.slice(3).trim();
        var codeLines = [];
        i++;
        while (i < lines.length && !/^```/.test(lines[i])) {
          codeLines.push(esc(lines[i]));
          i++;
        }
        html += '<div class="md-code-block">'
          + (lang ? '<div class="md-code-lang">' + esc(lang) + '</div>' : '')
          + '<pre><code>' + codeLines.join('\n') + '</code></pre>'
          + '</div>';
        i++; continue;
      }

      /* ---- Heading ---- */
      var hm = line.match(/^(#{1,6})\s+(.+)/);
      if (hm) {
        closeAll();
        var lv = hm[1].length;
        var headingId = slugify(hm[2].replace(/\*\*|__/g, ''));
        html += '<h' + lv + ' id="' + headingId + '" class="md-h md-h' + lv + '">' + inline(esc(hm[2])) + '</h' + lv + '>';
        i++; continue;
      }

      /* ---- Horizontal Rule ---- */
      if (/^(\-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
        closeAll();
        html += '<hr class="md-hr">';
        i++; continue;
      }

      /* ---- Blockquote ---- */
      if (/^>\s?/.test(line)) {
        closeLists(); closeTable();
        if (!inBq) { html += '<blockquote class="md-blockquote">'; inBq = true; }
        html += '<p>' + inline(esc(line.replace(/^>\s?/, ''))) + '</p>';
        i++; continue;
      } else {
        closeBq();
      }

      /* ---- Table ---- */
      if (/^\|/.test(line)) {
        closeLists();
        if (isTableSep(line)) {
          /* separator row → đóng thead mở tbody */
          if (inTable && !tableBodyOpen) {
            html += '</thead><tbody>';
            tableBodyOpen = true;
          }
          i++; continue;
        }
        var safeLine = line.replace(/\\\|/g, '\u0000');
        var cells = safeLine.split('|');
        /* bỏ phần tử đầu và cuối (thường là rỗng do | ở đầu/cuối) */
        if (cells[0].trim() === '') cells.shift();
        if (cells[cells.length - 1].trim() === '') cells.pop();

        if (!inTable) {
          html += '<div class="md-table-wrap"><table class="md-table"><thead><tr>';
          cells.forEach(function (c) {
            html += '<th>' + inline(esc(c.trim().replace(/\u0000/g, '|'))) + '</th>';
          });
          html += '</tr>';
          inTable = true; tableBodyOpen = false;
        } else if (tableBodyOpen) {
          html += '<tr>';
          cells.forEach(function (c) {
            html += '<td>' + inline(esc(c.trim().replace(/\u0000/g, '|'))) + '</td>';
          });
          html += '</tr>';
        }
        i++; continue;
      } else {
        closeTable();
      }

      /* ---- Unordered list ---- */
      var ulm = line.match(/^[-*+]\s+(.+)/);
      if (ulm) {
        closeOl(); closeBq();
        if (!inUl) { html += '<ul class="md-ul">'; inUl = true; }
        html += '<li>' + inline(esc(ulm[1])) + '</li>';
        i++; continue;
      }

      /* ---- Ordered list ---- */
      var olm = line.match(/^\d+\.\s+(.+)/);
      if (olm) {
        closeUl(); closeBq();
        if (!inOl) { html += '<ol class="md-ol">'; inOl = true; }
        html += '<li>' + inline(esc(olm[1])) + '</li>';
        i++; continue;
      }

      /* ---- Empty line ---- */
      if (line.trim() === '') {
        closeAll();
        i++; continue;
      }

      /* ---- Paragraph ---- */
      closeAll();
      html += '<p class="md-p">' + inline(esc(line)) + '</p>';
      i++;
    }

    closeAll();
    return html;
  };

  window.Markdown = Markdown;
})();
