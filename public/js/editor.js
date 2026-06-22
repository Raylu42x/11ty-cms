class ContentEditor {
  constructor() {
    this.mde = null;
    this.isDirty = false;
    this._initMDE();
  }

  _initMDE() {
    this.mde = new EasyMDE({
      element: document.getElementById('body-editor'),
      spellChecker: false,
      autofocus: false,
      minHeight: '400px',
      toolbar: [
        'bold',
        'italic',
        'heading-2',
        'heading-3',
        '|',
        'quote',
        'unordered-list',
        'ordered-list',
        '|',
        'link',
        {
          name: 'image',
          action: () => this._requestImagePicker(),
          className: 'fa fa-picture-o',
          title: 'Insert image from media library',
        },
        '|',
        'preview',
        'side-by-side',
        'fullscreen',
      ],
      status: [
        {
          className: 'wordcount',
          defaultValue: (el) => {
            el.innerHTML = '0 words';
          },
          onUpdate: (el) => {
            const val = this.mde.value();
            const n = val.trim() ? val.trim().split(/\s+/).length : 0;
            el.innerHTML = `${n.toLocaleString()} words`;
          },
        },
        'lines',
        'cursor',
      ],
      uploadImage: false,
      autoRefresh: true,
    });

    this.mde.codemirror.on('change', () => {
      this.isDirty = true;
      document.dispatchEvent(new Event('editor:dirty'));
    });
  }

  _requestImagePicker() {
    document.dispatchEvent(
      new CustomEvent('editor:pick-image', {
        detail: (url, alt) => {
          this.mde.codemirror.replaceSelection(`![${alt || ''}](${url})`);
          this.mde.codemirror.focus();
        },
      })
    );
  }

  load(fileData, filePath) {
    this._renderFrontmatter(fileData.frontmatter || {});
    this.mde.value((fileData.body || '').replace(/^\n/, ''));
    document.getElementById('current-file-name').textContent = filePath;
    document.getElementById('editor-empty').hidden = true;
    document.getElementById('editor-content').hidden = false;
    this.isDirty = false;
  }

  unload() {
    document.getElementById('editor-empty').hidden = false;
    document.getElementById('editor-content').hidden = true;
    this.isDirty = false;
  }

  // ── Frontmatter form ───────────────────────────────────────────────────

  _renderFrontmatter(data) {
    const form = document.getElementById('frontmatter-form');
    form.innerHTML = '';
    for (const [key, val] of Object.entries(data)) {
      this._insertRow(form, key, val);
    }
    this._appendAddField(form);
  }

  /* Insert a label+input row pair before the add-field row (or at end). */
  _insertRow(form, key, val, typeHint = null) {
    const addRow = form.querySelector('.fm-add-row');

    const label = document.createElement('div');
    label.className = 'fm-label';
    const labelText = document.createElement('span');
    labelText.textContent = key;
    const rmBtn = document.createElement('button');
    rmBtn.className = 'fm-rm-btn';
    rmBtn.type = 'button';
    rmBtn.title = `Remove "${key}" field`;
    rmBtn.textContent = '×';
    label.appendChild(labelText);
    label.appendChild(rmBtn);

    const cell = document.createElement('div');
    cell.appendChild(this._makeInput(key, val, typeHint));

    // Wire remove: delete both grid cells together
    rmBtn.addEventListener('click', () => {
      label.remove();
      cell.remove();
      this._markDirty();
    });

    if (addRow) {
      form.insertBefore(label, addRow);
      form.insertBefore(cell, addRow);
    } else {
      form.appendChild(label);
      form.appendChild(cell);
    }
  }

  /* Append the "+ Add field" UI row (always last in the grid). */
  _appendAddField(form) {
    const row = document.createElement('div');
    row.className = 'fm-add-row';

    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn-sm btn-ghost';
    addBtn.type = 'button';
    addBtn.textContent = '+ Add field';

    const newFieldUI = document.createElement('div');
    newFieldUI.className = 'fm-new-field';
    newFieldUI.hidden = true;
    newFieldUI.innerHTML = `
      <input type="text" class="fm-new-key" placeholder="field name">
      <select class="fm-new-type">
        <option value="string">text</option>
        <option value="boolean">boolean</option>
        <option value="array">array / tags</option>
        <option value="date">date</option>
        <option value="number">number</option>
      </select>
      <button class="btn btn-sm btn-primary" type="button" data-action="confirm">Add</button>
      <button class="btn btn-sm btn-ghost"    type="button" data-action="cancel">Cancel</button>
    `;
    row.appendChild(addBtn);
    row.appendChild(newFieldUI);
    form.appendChild(row);

    const keyInput = newFieldUI.querySelector('.fm-new-key');
    const typeSelect = newFieldUI.querySelector('.fm-new-type');
    const confirmBtn = newFieldUI.querySelector('[data-action="confirm"]');
    const cancelBtn = newFieldUI.querySelector('[data-action="cancel"]');

    const open = () => {
      addBtn.hidden = true;
      newFieldUI.hidden = false;
      keyInput.focus();
    };
    const close = () => {
      addBtn.hidden = false;
      newFieldUI.hidden = true;
      keyInput.value = '';
    };
    const doAdd = () => {
      const key = keyInput.value.trim();
      if (!key) {
        keyInput.focus();
        return;
      }
      const defaults = { string: '', boolean: false, array: [], date: '', number: 0 };
      this._insertRow(form, key, defaults[typeSelect.value], typeSelect.value);
      close();
      this._markDirty();
    };

    addBtn.addEventListener('click', open);
    confirmBtn.addEventListener('click', doAdd);
    cancelBtn.addEventListener('click', close);
    keyInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doAdd();
      if (e.key === 'Escape') close();
    });
  }

  // ── Input factory ──────────────────────────────────────────────────────

  /* typeHint overrides auto-detection (used when adding new fields). */
  _makeInput(key, val, typeHint = null) {
    const is = (t) => typeHint === t;

    // Boolean
    if (is('boolean') || (typeHint === null && typeof val === 'boolean')) {
      const el = document.createElement('input');
      el.type = 'checkbox';
      el.dataset.fmKey = key;
      el.dataset.fmType = 'boolean';
      el.checked = !!val;
      el.addEventListener('change', () => this._markDirty());
      return el;
    }

    // Array / tags
    if (is('array') || (typeHint === null && Array.isArray(val))) {
      return this._makeTagInput(key, Array.isArray(val) ? val.map(String) : []);
    }

    // Date
    if (
      is('date') ||
      (typeHint === null && (val instanceof Date || this._looksLikeDate(key, val)))
    ) {
      const el = document.createElement('input');
      el.type = 'date';
      el.dataset.fmKey = key;
      el.dataset.fmType = 'date';
      const d = val instanceof Date ? val : new Date(val);
      el.value = !isNaN(d.getTime())
        ? d.toISOString().split('T')[0]
        : typeof val === 'string'
          ? val
          : '';
      el.addEventListener('change', () => this._markDirty());
      return el;
    }

    // Number
    if (is('number') || (typeHint === null && typeof val === 'number')) {
      const el = document.createElement('input');
      el.type = 'number';
      el.dataset.fmKey = key;
      el.dataset.fmType = 'number';
      el.value = val ?? 0;
      el.addEventListener('input', () => this._markDirty());
      return el;
    }

    // String (default)
    const el = document.createElement('input');
    el.type = 'text';
    el.dataset.fmKey = key;
    el.dataset.fmType = 'string';
    el.value = val != null ? String(val) : '';
    el.addEventListener('input', () => this._markDirty());
    return el;
  }

  _looksLikeDate(key, val) {
    if (typeof val !== 'string') return false;
    const dateKeys = ['date', 'created', 'updated', 'published', 'modified'];
    return dateKeys.some((k) => key.toLowerCase().includes(k)) && /^\d{4}-\d{2}-\d{2}/.test(val);
  }

  _makeTagInput(key, tags) {
    const wrap = document.createElement('div');
    wrap.className = 'tag-input-wrap';
    wrap.dataset.fmKey = key;
    wrap.dataset.fmType = 'array';

    const inputEl = document.createElement('input');
    inputEl.type = 'text';
    inputEl.className = 'tag-text-input';
    inputEl.placeholder = 'Add tag…';
    wrap.appendChild(inputEl);

    const addChip = (text) => {
      const chip = document.createElement('span');
      chip.className = 'tag-chip';
      chip.dataset.tag = text;
      chip.textContent = text;
      const rm = document.createElement('button');
      rm.className = 'tag-chip-rm';
      rm.type = 'button';
      rm.textContent = '×';
      rm.addEventListener('click', (e) => {
        e.stopPropagation();
        chip.remove();
        this._markDirty();
      });
      chip.appendChild(rm);
      wrap.insertBefore(chip, inputEl);
    };

    tags.forEach(addChip);

    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        const v = inputEl.value.trim().replace(/,$/, '');
        if (v) {
          addChip(v);
          inputEl.value = '';
          this._markDirty();
        }
      }
      if (e.key === 'Backspace' && !inputEl.value) {
        const last = wrap.querySelector('.tag-chip:last-of-type');
        if (last) {
          last.remove();
          this._markDirty();
        }
      }
    });
    wrap.addEventListener('click', () => inputEl.focus());
    return wrap;
  }

  _markDirty() {
    this.isDirty = true;
    document.dispatchEvent(new Event('editor:dirty'));
  }

  // ── Collect ────────────────────────────────────────────────────────────

  collectFrontmatter() {
    const form = document.getElementById('frontmatter-form');
    const result = {};
    form.querySelectorAll('[data-fm-key]').forEach((el) => {
      const key = el.dataset.fmKey;
      const type = el.dataset.fmType;
      if (type === 'boolean') result[key] = el.checked;
      else if (type === 'array')
        result[key] = [...el.querySelectorAll('.tag-chip')].map((c) => c.dataset.tag);
      else if (type === 'date') result[key] = el.value || null;
      else if (type === 'number') result[key] = el.value !== '' ? Number(el.value) : null;
      else result[key] = el.value;
    });
    return result;
  }

  getBody() {
    return this.mde.value();
  }
  markClean() {
    this.isDirty = false;
  }
}
