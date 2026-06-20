/* Thin fetch wrapper — redirects to /login on 401 */
const API = (() => {
  async function _req(method, url, body) {
    const isForm = body instanceof FormData;
    const opts = {
      method,
      headers: isForm ? {} : { 'Content-Type': 'application/json' },
      body: isForm ? body : (body !== undefined ? JSON.stringify(body) : undefined)
    };
    const r = await fetch(url, opts);
    if (r.status === 401) { window.location.href = '/login'; throw new Error('Session expired'); }
    let data;
    try { data = await r.json(); } catch { data = {}; }
    if (!r.ok) throw new Error(data.error || `${r.status} ${r.statusText}`);
    return data;
  }

  return {
    get:    (url)        => _req('GET', url),
    post:   (url, body)  => _req('POST', url, body),
    put:    (url, body)  => _req('PUT', url, body),
    del:    (url)        => _req('DELETE', url),
    upload: (url, file)  => {
      const fd = new FormData();
      fd.append('file', file);
      return _req('POST', url, fd);
    }
  };
})();
