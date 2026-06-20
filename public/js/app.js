/* Main application controller */
(async () => {

  // ── State ────────────────────────────────────────────────────────────────
  let sites = [];
  let currentSite = null;
  let currentFile = null;          // { path, data }
  let imagePickerCallback = null;
  let allFiles = [];

  // ── Elements ─────────────────────────────────────────────────────────────
  const siteSelect       = document.getElementById('site-select');
  const btnPublish       = document.getElementById('btn-publish');
  const btnPreviewSite   = document.getElementById('btn-preview-site');
  const btnLogout        = document.getElementById('btn-logout');
  const btnNewFile       = document.getElementById('btn-new-file');
  const btnManageSites   = document.getElementById('btn-manage-sites');
  const statusBadge      = document.getElementById('status-badge');
  const fileTreeEl       = document.getElementById('file-tree');
  const sidebarSearch    = document.getElementById('sidebar-search');

  const modalMedia     = document.getElementById('modal-media');
  const btnCloseMedia  = document.getElementById('btn-close-media');
  const mediaBackdrop  = document.getElementById('media-backdrop');
  const mediaGrid      = document.getElementById('media-grid');
  const btnUploadMedia = document.getElementById('btn-upload-media');
  const mediaFileInput = document.getElementById('media-file-input');
  const uploadStatus   = document.getElementById('upload-status');

  const modalNewFile   = document.getElementById('modal-new-file');
  const btnCloseNew    = document.getElementById('btn-close-new-file');
  const newFileBackdrop= document.getElementById('new-file-backdrop');
  const newFilePath    = document.getElementById('new-file-path');
  const newFileError   = document.getElementById('new-file-error');
  const btnCreateFile  = document.getElementById('btn-create-file');

  const btnSave        = document.getElementById('btn-save');
  const btnDeleteFile  = document.getElementById('btn-delete-file');
  const btnRenameFile  = document.getElementById('btn-rename-file');
  const btnHistoryFile = document.getElementById('btn-history-file');

  // ── Submodules ───────────────────────────────────────────────────────────
  const fileBrowser = new FileBrowser(fileTreeEl, openFile);
  const editor = new ContentEditor();

  // ── Toast ────────────────────────────────────────────────────────────────
  let toastTimer = null;
  function toast(msg, type = 'ok') {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = type;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 3000);
  }

  // ── Status badge ─────────────────────────────────────────────────────────
  async function refreshStatus() {
    if (!currentSite) return;
    try {
      const st = await API.get(`/api/sites/${currentSite.id}/status`);
      const n = (st.modified?.length || 0) + (st.created?.length || 0) + (st.deleted?.length || 0);
      if (n > 0) {
        statusBadge.textContent = `${n} unpublished`;
        statusBadge.className = 'status-badge warn';
        statusBadge.hidden = false;
        btnPublish.disabled = false;
      } else {
        statusBadge.hidden = true;
        btnPublish.disabled = true;
      }
    } catch {
      // silent — git status fails if repo not cloned yet
    }
  }

  // ── Boot ─────────────────────────────────────────────────────────────────
  try {
    sites = await API.get('/api/sites');
  } catch (err) {
    toast('Failed to load sites: ' + err.message, 'error');
    return;
  }

  for (const s of sites) {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.name;
    siteSelect.appendChild(opt);
  }

  // ── Site switcher ─────────────────────────────────────────────────────────
  siteSelect.addEventListener('change', async () => {
    const id = siteSelect.value;
    if (!id) {
      currentSite = null;
      fileBrowser.clear();
      editor.unload();
      btnNewFile.disabled = true;
      btnPublish.disabled = true;
      statusBadge.hidden = true;
      btnPreviewSite.hidden = true;
      sidebarSearch.disabled = true;
      sidebarSearch.value = '';
      allFiles = [];
      return;
    }

    currentSite = sites.find(s => s.id === id);
    editor.unload();
    currentFile = null;
    fileBrowser.clear();
    btnNewFile.disabled = false;
    btnPublish.disabled = true;
    sidebarSearch.value = '';
    allFiles = [];

    if (currentSite.liveUrl) {
      btnPreviewSite.href = currentSite.liveUrl;
      btnPreviewSite.hidden = false;
    } else {
      btnPreviewSite.hidden = true;
    }

    // Pull + load tree
    try {
      await API.post(`/api/sites/${id}/pull`);
    } catch (err) {
      toast('git pull failed: ' + err.message, 'error');
    }

    try {
      const files = await API.get(`/api/sites/${id}/files`);
      allFiles = files;
      fileBrowser.render(files);
      sidebarSearch.disabled = false;
    } catch (err) {
      toast('Could not list files: ' + err.message, 'error');
    }

    refreshStatus();
  });

  // ── Open file ─────────────────────────────────────────────────────────────
  async function openFile(path) {
    if (!currentSite) return;
    try {
      const data = await API.get(`/api/sites/${currentSite.id}/files/${path}`);
      // Merge frontmatter defaults for any fields not already in the file
      const defs = currentSite.frontmatterDefaults || {};
      const folder = path.includes('/') ? path.split('/')[0] : '';
      const merged = { ...(defs[''] || {}), ...(defs[folder] || {}) };
      for (const [key, val] of Object.entries(merged)) {
        if (!(key in data.frontmatter)) data.frontmatter[key] = val;
      }
      currentFile = { path, data };
      editor.load(data, path);
    } catch (err) {
      toast('Could not open file: ' + err.message, 'error');
    }
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  btnSave.addEventListener('click', saveFile);

  async function saveFile() {
    if (!currentSite || !currentFile) return;
    btnSave.disabled = true;
    btnSave.textContent = 'Saving…';
    try {
      await API.put(`/api/sites/${currentSite.id}/files/${currentFile.path}`, {
        frontmatter: editor.collectFrontmatter(),
        body: editor.getBody()
      });
      editor.markClean();
      toast('Saved', 'ok');
      refreshStatus();
    } catch (err) {
      toast('Save failed: ' + err.message, 'error');
    } finally {
      btnSave.disabled = false;
      btnSave.textContent = 'Save Draft';
    }
  }

  // Warn before closing with unsaved changes
  window.addEventListener('beforeunload', (e) => {
    if (editor.isDirty) { e.preventDefault(); e.returnValue = ''; }
  });

  // ── Delete file ────────────────────────────────────────────────────────────
  btnDeleteFile.addEventListener('click', async () => {
    if (!currentSite || !currentFile) return;
    if (!confirm(`Delete "${currentFile.path}"? This cannot be undone.`)) return;
    try {
      await API.del(`/api/sites/${currentSite.id}/files/${currentFile.path}`);
      editor.unload();
      currentFile = null;
      // Refresh file tree
      const files = await API.get(`/api/sites/${currentSite.id}/files`);
      fileBrowser.render(files);
      toast('File deleted', 'ok');
      refreshStatus();
    } catch (err) {
      toast('Delete failed: ' + err.message, 'error');
    }
  });

  // ── Publish ────────────────────────────────────────────────────────────────
  btnPublish.addEventListener('click', async () => {
    if (!currentSite) return;
    if (editor.isDirty && !confirm('You have unsaved changes. Publish anyway?')) return;
    btnPublish.disabled = true;
    btnPublish.textContent = 'Publishing…';
    try {
      await API.post(`/api/sites/${currentSite.id}/publish`);
      toast('Published! GitHub Actions will build shortly.', 'ok');
      statusBadge.hidden = true;
    } catch (err) {
      toast('Publish failed: ' + err.message, 'error');
      btnPublish.disabled = false;
    }
    btnPublish.textContent = 'Publish';
  });

  // ── Cmd+S / Ctrl+S ────────────────────────────────────────────────────────
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      if (currentFile) saveFile();
    }
  });

  // ── Sidebar search ─────────────────────────────────────────────────────────
  sidebarSearch.addEventListener('input', () => {
    const q = sidebarSearch.value.trim().toLowerCase();
    fileBrowser.render(q ? allFiles.filter(p => p.toLowerCase().includes(q)) : allFiles);
  });

  // ── Logout ─────────────────────────────────────────────────────────────────
  btnLogout.addEventListener('click', async () => {
    await API.post('/api/auth/logout');
    window.location.href = '/login';
  });

  // ── New file modal ──────────────────────────────────────────────────────────
  btnNewFile.addEventListener('click', () => {
    newFilePath.value = '';
    newFileError.textContent = '';
    modalNewFile.hidden = false;
    setTimeout(() => newFilePath.focus(), 50);
  });

  function closeNewFileModal() { modalNewFile.hidden = true; }
  btnCloseNew.addEventListener('click', closeNewFileModal);
  newFileBackdrop.addEventListener('click', closeNewFileModal);

  newFilePath.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') btnCreateFile.click();
    if (e.key === 'Escape') closeNewFileModal();
  });

  btnCreateFile.addEventListener('click', async () => {
    const p = newFilePath.value.trim();
    if (!p) { newFileError.textContent = 'Enter a file path'; return; }
    if (!currentSite) return;

    // Default frontmatter for new md files, merged with site defaults
    const isMd = p.endsWith('.md');
    const title = p.split('/').pop().replace(/\.\w+$/, '').replace(/[-_]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
    const defs = currentSite.frontmatterDefaults || {};
    const folder = p.includes('/') ? p.split('/')[0] : '';
    const siteDefs = { ...(defs[''] || {}), ...(defs[folder] || {}) };
    const frontmatter = isMd
      ? { layout: 'base.njk', ...siteDefs, title: siteDefs.title !== undefined ? siteDefs.title : title }
      : { ...siteDefs };

    newFileError.textContent = '';
    try {
      await API.post(`/api/sites/${currentSite.id}/files`, {
        path: p,
        frontmatter,
        body: ''
      });
      closeNewFileModal();
      const files = await API.get(`/api/sites/${currentSite.id}/files`);
      fileBrowser.render(files);
      fileBrowser.setActive(p);
      openFile(p);
    } catch (err) {
      newFileError.textContent = err.message;
    }
  });

  // ── Media modal ─────────────────────────────────────────────────────────────
  document.addEventListener('editor:pick-image', (e) => {
    imagePickerCallback = e.detail; // function(url, alt)
    openMediaModal();
  });

  async function openMediaModal() {
    if (!currentSite) return;
    mediaGrid.innerHTML = '';
    uploadStatus.textContent = '';
    modalMedia.hidden = false;
    await loadMediaGrid();
  }

  function closeMediaModal() {
    modalMedia.hidden = true;
    imagePickerCallback = null;
  }

  btnCloseMedia.addEventListener('click', closeMediaModal);
  mediaBackdrop.addEventListener('click', closeMediaModal);

  async function loadMediaGrid() {
    try {
      const files = await API.get(`/api/sites/${currentSite.id}/media`);
      mediaGrid.innerHTML = '';
      if (files.length === 0) {
        mediaGrid.innerHTML = '<div class="media-empty">No images yet. Upload one above.</div>';
        return;
      }
      for (const filename of files) {
        const thumb = document.createElement('div');
        thumb.className = 'media-thumb';
        const img = document.createElement('img');
        img.src = `/api/sites/${currentSite.id}/media/${encodeURIComponent(filename)}`;
        img.alt = filename;
        img.loading = 'lazy';
        const name = document.createElement('div');
        name.className = 'media-thumb-name';
        name.textContent = filename;
        thumb.appendChild(img);
        thumb.appendChild(name);
        thumb.addEventListener('click', () => {
          if (imagePickerCallback) {
            // Insert 11ty-relative path so the built site links correctly
            const dir = (currentSite.mediaDir || 'src/images').replace(/^src\//, '');
            imagePickerCallback(`/${dir}/${filename}`, filename.replace(/\.\w+$/, ''));
          }
          closeMediaModal();
        });
        mediaGrid.appendChild(thumb);
      }
    } catch (err) {
      mediaGrid.innerHTML = `<div class="media-empty">Error: ${err.message}</div>`;
    }
  }

  // Upload button
  btnUploadMedia.addEventListener('click', () => mediaFileInput.click());
  mediaFileInput.addEventListener('change', async () => {
    const file = mediaFileInput.files[0];
    if (!file || !currentSite) return;
    uploadStatus.textContent = 'Uploading…';
    try {
      await API.upload(`/api/sites/${currentSite.id}/media`, file);
      uploadStatus.textContent = '';
      mediaFileInput.value = '';
      await loadMediaGrid();
    } catch (err) {
      uploadStatus.textContent = 'Error: ' + err.message;
    }
  });

  // ── editor:dirty (no-op — status managed by refreshStatus) ───────────────
  document.addEventListener('editor:dirty', () => {});

  // ── Rename file modal ──────────────────────────────────────────────────────
  const modalRename      = document.getElementById('modal-rename');
  const renameFilePath   = document.getElementById('rename-file-path');
  const renameError      = document.getElementById('rename-error');
  const btnConfirmRename = document.getElementById('btn-confirm-rename');

  document.getElementById('btn-close-rename').addEventListener('click', () => { modalRename.hidden = true; });
  document.getElementById('rename-backdrop').addEventListener('click', () => { modalRename.hidden = true; });

  btnRenameFile.addEventListener('click', () => {
    if (!currentFile) return;
    renameFilePath.value = currentFile.path;
    renameError.textContent = '';
    modalRename.hidden = false;
    setTimeout(() => { renameFilePath.focus(); renameFilePath.select(); }, 50);
  });

  renameFilePath.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') btnConfirmRename.click();
    if (e.key === 'Escape') { modalRename.hidden = true; }
  });

  btnConfirmRename.addEventListener('click', async () => {
    const newPath = renameFilePath.value.trim();
    if (!newPath || !currentFile || !currentSite) return;
    if (newPath === currentFile.path) { modalRename.hidden = true; return; }
    renameError.textContent = '';
    btnConfirmRename.disabled = true;
    try {
      await API.post(`/api/sites/${currentSite.id}/files-rename`, {
        from: currentFile.path,
        to:   newPath
      });
      modalRename.hidden = true;
      const oldPath = currentFile.path;
      currentFile.path = newPath;
      document.getElementById('current-file-name').textContent = newPath;
      // Update sidebar
      allFiles = allFiles.map(p => p === oldPath ? newPath : p);
      fileBrowser.render(allFiles);
      fileBrowser.setActive(newPath);
      toast('Renamed', 'ok');
      refreshStatus();
    } catch (err) {
      renameError.textContent = err.message;
    }
    btnConfirmRename.disabled = false;
  });

  // ── File history modal ─────────────────────────────────────────────────────
  const modalHistory  = document.getElementById('modal-history');
  const historyList   = document.getElementById('history-list');
  const historyFileName = document.getElementById('history-file-name');

  document.getElementById('btn-close-history').addEventListener('click', () => { modalHistory.hidden = true; });
  document.getElementById('history-backdrop').addEventListener('click', () => { modalHistory.hidden = true; });

  btnHistoryFile.addEventListener('click', async () => {
    if (!currentFile || !currentSite) return;
    historyFileName.textContent = currentFile.path;
    historyList.innerHTML = '<p class="history-empty">Loading…</p>';
    modalHistory.hidden = false;
    try {
      const commits = await API.get(`/api/sites/${currentSite.id}/git-log/${currentFile.path}`);
      if (!commits.length) {
        historyList.innerHTML = '<p class="history-empty">No commits yet for this file.</p>';
        return;
      }
      historyList.innerHTML = '';
      for (const c of commits) {
        const div = document.createElement('div');
        div.className = 'history-commit';
        div.innerHTML = `
          <div class="history-commit-msg">${c.message}</div>
          <div class="history-commit-meta">${c.hash} · ${new Date(c.date).toLocaleString()} · ${c.author}</div>
        `;
        historyList.appendChild(div);
      }
    } catch (err) {
      historyList.innerHTML = `<p class="history-empty" style="color:var(--danger)">Error: ${err.message}</p>`;
    }
  });

  // ── Manage Sites modal ─────────────────────────────────────────────────────
  const modalSites     = document.getElementById('modal-sites');
  const btnCloseSites  = document.getElementById('btn-close-sites');
  const sitesBackdrop  = document.getElementById('sites-backdrop');
  const sitesList      = document.getElementById('sites-list');
  const nsName         = document.getElementById('ns-name');
  const nsRepo         = document.getElementById('ns-repo');
  const nsContentDir   = document.getElementById('ns-contentdir');
  const nsMediaDir     = document.getElementById('ns-mediadir');
  const nsBranch       = document.getElementById('ns-branch');
  const nsLiveUrl      = document.getElementById('ns-liveurl');
  const btnAddSite     = document.getElementById('btn-add-site');
  const addSiteStatus  = document.getElementById('add-site-status');

  btnManageSites.addEventListener('click', openSitesModal);
  btnCloseSites.addEventListener('click', closeSitesModal);
  sitesBackdrop.addEventListener('click', closeSitesModal);

  async function openSitesModal() {
    addSiteStatus.textContent = '';
    addSiteStatus.className = 'add-site-status';
    modalSites.hidden = false;
    await renderSitesList();
  }

  function closeSitesModal() { modalSites.hidden = true; }

  async function renderSitesList() {
    sitesList.innerHTML = '';
    let allSites;
    try { allSites = await API.get('/api/sites'); } catch { return; }

    if (allSites.length === 0) {
      sitesList.innerHTML = '<p class="sites-empty">No sites registered yet.</p>';
      return;
    }

    for (const s of allSites) {
      const item = document.createElement('div');
      item.className = 'site-item';
      item.innerHTML = `
        <div class="site-item-info">
          <div class="site-item-name">${s.name}</div>
          <div class="site-item-repo">${s.repo}</div>
        </div>
        <span class="site-item-badge ${s.cloned ? 'cloned' : 'uncloned'}">
          ${s.cloned ? '✓ cloned' : 'not cloned'}
        </span>
        <div class="site-item-actions">
          ${!s.cloned ? `<button class="btn btn-sm btn-ghost" data-action="init" data-id="${s.id}">Clone</button>` : ''}
          <button class="btn btn-sm btn-ghost" data-action="defaults" data-id="${s.id}">Defaults</button>
          <button class="btn btn-sm btn-ghost" style="color:var(--danger)" data-action="remove" data-id="${s.id}">Remove</button>
        </div>
      `;
      sitesList.appendChild(item);
    }

    // Wire action buttons
    sitesList.querySelectorAll('[data-action="remove"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const site = allSites.find(s => s.id === id);
        if (!confirm(`Remove "${site?.name}" from the CMS?\n\nThis only removes the config entry — the local clone and GitHub repo are untouched.`)) return;
        try {
          await API.del(`/api/sites/${id}`);
          // Remove from header dropdown if present
          const opt = siteSelect.querySelector(`option[value="${id}"]`);
          if (opt) opt.remove();
          sites = sites.filter(s => s.id !== id);
          if (currentSite?.id === id) {
            currentSite = null;
            fileBrowser.clear();
            editor.unload();
            btnNewFile.disabled = true;
            btnPublish.disabled = true;
            statusBadge.hidden = true;
          }
          await renderSitesList();
          toast('Site removed', 'ok');
        } catch (err) {
          toast('Remove failed: ' + err.message, 'error');
        }
      });
    });

    sitesList.querySelectorAll('[data-action="init"]').forEach(btn => {
      btn.addEventListener('click', () => initSite(btn.dataset.id, btn));
    });

    sitesList.querySelectorAll('[data-action="defaults"]').forEach(btn => {
      btn.addEventListener('click', () => openDefaultsModal(btn.dataset.id));
    });
  }

  async function initSite(id, btn) {
    if (btn) { btn.disabled = true; btn.textContent = 'Cloning…'; }
    try {
      const result = await API.post(`/api/sites/${id}/init`);
      const wfMsg = result.workflowStatus === 'added'
        ? ' GitHub Actions workflow written.'
        : result.workflowStatus === 'existed'
        ? ' Workflow already present.'
        : '';
      toast(`Cloned.${wfMsg}`, 'ok');
      await renderSitesList();
    } catch (err) {
      toast('Init failed: ' + err.message, 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'Clone'; }
    }
  }

  // Add site form
  btnAddSite.addEventListener('click', async () => {
    const name       = nsName.value.trim();
    const repo       = nsRepo.value.trim();
    const contentDir = nsContentDir.value.trim() || 'src';
    const mediaDir   = nsMediaDir.value.trim()   || 'src/images';
    const branch     = nsBranch.value.trim()      || 'main';
    const liveUrl    = nsLiveUrl.value.trim();

    if (!name) { nsName.focus(); return; }
    if (!repo)  { nsRepo.focus(); return; }

    btnAddSite.disabled = true;
    setAddStatus('Adding…', '');

    let newSite;
    try {
      newSite = await API.post('/api/sites', { name, repo, contentDir, mediaDir, branch, liveUrl });
    } catch (err) {
      setAddStatus(err.message, 'error');
      btnAddSite.disabled = false;
      return;
    }

    // Add to in-memory list + header dropdown
    sites.push(newSite);
    const opt = document.createElement('option');
    opt.value = newSite.id;
    opt.textContent = newSite.name;
    siteSelect.appendChild(opt);

    setAddStatus('Added. Cloning repo…', '');

    try {
      const result = await API.post(`/api/sites/${newSite.id}/init`);
      const wfLine = result.workflowStatus === 'added'
        ? '\nGitHub Actions workflow written — commit it with your next Publish.'
        : result.workflowStatus === 'existed'
        ? '\nWorkflow already present in repo.'
        : '';
      setAddStatus(`✓ Cloned.${wfLine}`, 'ok');
    } catch (err) {
      setAddStatus(`Cloned failed: ${err.message}`, 'error');
    }

    // Reset form
    nsName.value = '';
    nsRepo.value = '';
    nsContentDir.value = 'src';
    nsMediaDir.value   = 'src/images';
    nsBranch.value     = 'main';
    nsLiveUrl.value    = '';
    btnAddSite.disabled = false;

    await renderSitesList();
  });

  function setAddStatus(msg, type) {
    addSiteStatus.textContent = msg;
    addSiteStatus.className = 'add-site-status' + (type ? ` ${type}` : '');
  }

  // ── Frontmatter Defaults modal ─────────────────────────────────────────────
  const modalDefaults    = document.getElementById('modal-defaults');
  const btnCloseDefaults = document.getElementById('btn-close-defaults');
  const defaultsBackdrop = document.getElementById('defaults-backdrop');
  const defaultsSiteName = document.getElementById('defaults-site-name');
  const defaultsTemplates= document.getElementById('defaults-templates');
  const btnAddTemplate   = document.getElementById('btn-add-template');
  const btnSaveDefaults  = document.getElementById('btn-save-defaults');
  const defaultsStatus   = document.getElementById('defaults-status');
  let defaultsSiteId = null;

  btnCloseDefaults.addEventListener('click', () => { modalDefaults.hidden = true; });
  defaultsBackdrop.addEventListener('click', () => { modalDefaults.hidden = true; });

  async function openDefaultsModal(siteId) {
    defaultsSiteId = siteId;
    const siteObj = sites.find(s => s.id === siteId);
    defaultsSiteName.textContent = siteObj?.name || siteId;
    defaultsStatus.textContent = '';
    defaultsTemplates.innerHTML = '<p style="color:var(--text-muted);font-size:12px">Loading…</p>';
    modalDefaults.hidden = false;
    let defs = {};
    try { defs = await API.get(`/api/sites/${siteId}/defaults`); } catch {}
    renderDefaultsTemplates(defs);
  }

  function renderDefaultsTemplates(defs) {
    defaultsTemplates.innerHTML = '';
    for (const [folder, fields] of Object.entries(defs)) {
      defaultsTemplates.appendChild(buildTemplateSection(folder, fields));
    }
  }

  function buildTemplateSection(folder, fields) {
    const section = document.createElement('div');
    section.className = 'defaults-template';

    const header = document.createElement('div');
    header.className = 'defaults-template-header';

    const labelWrap = document.createElement('div');
    labelWrap.className = 'defaults-folder-label';

    if (folder === '') {
      labelWrap.innerHTML = `<strong>Site-wide</strong>&nbsp;<span style="color:var(--text-muted);font-size:11px">(all files)</span>`;
      const hidden = document.createElement('input');
      hidden.type = 'hidden';
      hidden.className = 'defaults-folder-input';
      hidden.value = '';
      section.appendChild(hidden);
    } else {
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.className = 'defaults-folder-input';
      inp.value = folder;
      inp.placeholder = 'folder name';
      const slash = document.createElement('span');
      slash.textContent = '/';
      slash.style.color = 'var(--text-muted)';
      labelWrap.appendChild(inp);
      labelWrap.appendChild(slash);
    }

    const rmTmpl = document.createElement('button');
    rmTmpl.className = 'btn btn-ghost btn-sm';
    rmTmpl.style.color = 'var(--danger)';
    rmTmpl.textContent = 'Remove';
    rmTmpl.addEventListener('click', () => section.remove());

    header.appendChild(labelWrap);
    header.appendChild(rmTmpl);
    section.appendChild(header);

    const fieldsDiv = document.createElement('div');
    fieldsDiv.className = 'defaults-fields';

    for (const [key, val] of Object.entries(fields)) {
      fieldsDiv.appendChild(buildFieldRow(key, val));
    }

    const addFieldBtn = document.createElement('button');
    addFieldBtn.className = 'btn btn-ghost btn-sm';
    addFieldBtn.textContent = '+ Add field';
    addFieldBtn.addEventListener('click', () => {
      fieldsDiv.insertBefore(buildFieldRow('', ''), addFieldBtn);
    });
    fieldsDiv.appendChild(addFieldBtn);
    section.appendChild(fieldsDiv);

    return section;
  }

  function buildFieldRow(key, val) {
    const row = document.createElement('div');
    row.className = 'defaults-field-row';

    const keyInp = document.createElement('input');
    keyInp.type = 'text';
    keyInp.className = 'df-key';
    keyInp.value = key;
    keyInp.placeholder = 'field name';

    const valStr = typeof val === 'object' ? JSON.stringify(val) : String(val);
    const valInp = document.createElement('input');
    valInp.type = 'text';
    valInp.className = 'df-val';
    valInp.value = valStr;
    valInp.placeholder = 'default value';

    const rm = document.createElement('button');
    rm.className = 'btn btn-ghost btn-sm';
    rm.style.color = 'var(--danger)';
    rm.textContent = '×';
    rm.addEventListener('click', () => row.remove());

    row.appendChild(keyInp);
    row.appendChild(valInp);
    row.appendChild(rm);
    return row;
  }

  function collectDefaults() {
    const result = {};
    defaultsTemplates.querySelectorAll('.defaults-template').forEach(tmpl => {
      const folderInp = tmpl.querySelector('.defaults-folder-input');
      const folder = folderInp ? folderInp.value.trim().replace(/\/$/, '') : '';
      const fields = {};
      tmpl.querySelectorAll('.defaults-field-row').forEach(row => {
        const k = row.querySelector('.df-key').value.trim();
        const v = row.querySelector('.df-val').value.trim();
        if (!k) return;
        try {
          if (v.startsWith('[') || v.startsWith('{') || v === 'true' || v === 'false') {
            fields[k] = JSON.parse(v);
          } else if (v !== '' && !isNaN(Number(v)) && v !== '') {
            fields[k] = Number(v);
          } else {
            fields[k] = v;
          }
        } catch { fields[k] = v; }
      });
      result[folder] = fields;
    });
    return result;
  }

  btnAddTemplate.addEventListener('click', () => {
    defaultsTemplates.appendChild(buildTemplateSection('new-folder', {}));
    const newSection = defaultsTemplates.lastElementChild;
    const inp = newSection.querySelector('.defaults-folder-input[type="text"]');
    if (inp) { inp.focus(); inp.select(); }
  });

  btnSaveDefaults.addEventListener('click', async () => {
    const defs = collectDefaults();
    btnSaveDefaults.disabled = true;
    defaultsStatus.textContent = 'Saving…';
    try {
      await API.put(`/api/sites/${defaultsSiteId}/defaults`, defs);
      // Update in-memory site objects so openFile picks up new defaults immediately
      const idx = sites.findIndex(s => s.id === defaultsSiteId);
      if (idx !== -1) sites[idx].frontmatterDefaults = defs;
      if (currentSite?.id === defaultsSiteId) currentSite.frontmatterDefaults = defs;
      defaultsStatus.textContent = '✓ Saved';
      setTimeout(() => { defaultsStatus.textContent = ''; }, 2000);
    } catch (err) {
      defaultsStatus.textContent = 'Error: ' + err.message;
    }
    btnSaveDefaults.disabled = false;
  });

})();
