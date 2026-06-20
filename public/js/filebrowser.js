class FileBrowser {
  constructor(container, onSelect) {
    this.container = container;
    this.onSelect = onSelect;
    this.activePath = null;
  }

  render(files) {
    const tree = this._buildTree(files);
    this.container.innerHTML = '';
    this._renderNode(tree, this.container, '', 0);
  }

  setActive(path) {
    this.activePath = path;
    this.container.querySelectorAll('.tree-file').forEach(el => {
      el.classList.toggle('active', el.dataset.path === path);
    });
  }

  clear() {
    this.container.innerHTML = '';
    this.activePath = null;
  }

  /* Build nested object: { folder: { child: null }, file.md: null } */
  _buildTree(paths) {
    const root = {};
    for (const p of paths) {
      const parts = p.split('/');
      let node = root;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!node[parts[i]]) node[parts[i]] = {};
        node = node[parts[i]];
      }
      node[parts[parts.length - 1]] = null;
    }
    return root;
  }

  _renderNode(node, container, prefix, depth) {
    const entries = Object.entries(node);
    // Folders first, then alphabetical
    entries.sort(([a, av], [b, bv]) => {
      const aDir = av !== null, bDir = bv !== null;
      if (aDir !== bDir) return aDir ? -1 : 1;
      return a.localeCompare(b);
    });

    for (const [name, children] of entries) {
      const fullPath = prefix ? `${prefix}/${name}` : name;

      if (children === null) {
        // File leaf
        const ext = name.includes('.') ? name.split('.').pop() : '';
        const el = document.createElement('div');
        el.className = 'tree-file';
        el.dataset.path = fullPath;
        el.style.setProperty('--depth', depth);
        if (fullPath === this.activePath) el.classList.add('active');
        el.innerHTML = `
          <span class="tree-file-name">${name}</span>
          ${ext ? `<span class="ext-badge">${ext}</span>` : ''}
        `;
        el.addEventListener('click', () => {
          this.setActive(fullPath);
          this.onSelect(fullPath);
        });
        container.appendChild(el);
      } else {
        // Folder
        const folder = document.createElement('div');
        folder.className = 'tree-folder';

        const label = document.createElement('div');
        label.className = 'tree-folder-label open';
        label.style.setProperty('--depth', depth);
        label.innerHTML = `<span class="arrow">▶</span><span>${name}</span>`;
        folder.appendChild(label);

        const kids = document.createElement('div');
        kids.className = 'tree-folder-children';
        folder.appendChild(kids);

        label.addEventListener('click', () => {
          const open = label.classList.toggle('open');
          kids.classList.toggle('hidden', !open);
        });

        this._renderNode(children, kids, fullPath, depth + 1);
        container.appendChild(folder);
      }
    }
  }
}
