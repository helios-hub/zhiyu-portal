(function () {
  const KEY_POSTS = 'portal.posts';
  const KEY_USERS = 'portal.users';
  const KEY_SESSION = 'portal.session';
  const SITE = '智遇灵搭（重庆）科技有限公司';
  const DEMO = { name: 'demo', pw: 'demo12345' };
  const DEMO_POSTS = [
    { cat: 'web', title: '【示例】企业官网建设,含小程序联动', content: '这是演示账号预置的示例信息,你可以在会员中心编辑或删除它。' },
    { cat: 'ad', title: '【示例】社区广告位招商', content: '这是演示账号预置的示例信息,你可以在会员中心编辑或删除它。' },
    { cat: 'it', title: '【示例】中小企业IT运维外包', content: '这是演示账号预置的示例信息,你可以在会员中心编辑或删除它。' }
  ];

  const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
  const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const cats = () => window.SEED.categories;
  const catOf = (id) => cats().find((c) => c.id === id);
  const posts = () => {
    let p = load(KEY_POSTS, null);
    if (!p) { p = window.SEED.posts; save(KEY_POSTS, p); }
    return p.slice().sort((a, b) => b.id - a.id);
  };
  const addPost = (post) => {
    const all = posts();
    const id = all.reduce((m, p) => Math.max(m, p.id), 0) + 1;
    all.push({ ...post, id, views: 0, date: new Date().toISOString().slice(0, 10) });
    save(KEY_POSTS, all);
    return id;
  };
  const removePost = (id) => save(KEY_POSTS, posts().filter((p) => p.id !== id));
  const bumpViews = (id) => save(KEY_POSTS, posts().map((p) => (p.id === id ? { ...p, views: p.views + 1 } : p)));
  const postsBy = (author) => posts().filter((p) => p.author === author);
  const updatePost = (id, fields) => {
    const u = me();
    const all = posts();
    const target = all.find((p) => p.id === id);
    if (!u || !target || target.author !== u.name) throw new Error('无权编辑这条信息');
    save(KEY_POSTS, all.map((p) => (p.id === id ? { ...p, ...fields } : p)));
  };

  const hex = (buf) => Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  const hash = async (pw, salt) => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + pw)));
  const me = () => load(KEY_SESSION, null);

  async function register(name, pw) {
    if (!/^[A-Za-z0-9_一-龥]{3,20}$/.test(name)) throw new Error('用户名需为3-20位字母、数字、下划线或汉字');
    if (pw.length < 8) throw new Error('密码至少8位');
    if (name === DEMO.name) throw new Error('该用户名为演示账号保留');
    const users = load(KEY_USERS, []);
    if (users.some((u) => u.name === name)) throw new Error('用户名已被占用');
    const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
    users.push({ name, salt, hash: await hash(pw, salt) });
    save(KEY_USERS, users);
    save(KEY_SESSION, { name });
  }
  async function login(name, pw) {
    const u = load(KEY_USERS, []).find((x) => x.name === name);
    if (!u || u.hash !== (await hash(pw, u.salt))) throw new Error('用户名或密码错误');
    save(KEY_SESSION, { name });
  }
  const logout = () => localStorage.removeItem(KEY_SESSION);

  async function demoLogin() {
    const users = load(KEY_USERS, []);
    if (!users.some((u) => u.name === DEMO.name)) {
      const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
      users.push({ name: DEMO.name, salt, hash: await hash(DEMO.pw, salt) });
      save(KEY_USERS, users);
      DEMO_POSTS.forEach((p) => addPost({ ...p, author: DEMO.name, contact: 'demo@example.com' }));
    }
    save(KEY_SESSION, { name: DEMO.name });
  }

  async function changePassword(oldPw, newPw) {
    const u = me();
    if (!u) throw new Error('请先登录');
    if (u.name === DEMO.name) throw new Error('演示账号不能修改密码');
    if (newPw.length < 8) throw new Error('新密码至少8位');
    const users = load(KEY_USERS, []);
    const rec = users.find((x) => x.name === u.name);
    if (!rec || rec.hash !== (await hash(oldPw, rec.salt))) throw new Error('当前密码不正确');
    rec.salt = hex(crypto.getRandomValues(new Uint8Array(16)));
    rec.hash = await hash(newPw, rec.salt);
    save(KEY_USERS, users);
  }

  const safeNext = (n) => (/^[a-z]+\.html(\?[\w=&%.-]*)?$/i.test(n || '') ? n : 'member.html');

  function card(p) {
    const c = catOf(p.cat);
    return `<a class="card" href="detail.html?id=${p.id}">
      <div class="thumb" style="background:${c.color}" aria-hidden="true">${esc(c.icon)}</div>
      <div class="body"><div class="title">${esc(p.title)}</div>
      <div class="meta"><span class="tag">${esc(c.name)}</span><span>${esc(p.date.slice(5))}</span></div></div></a>`;
  }

  function layout(active) {
    const u = me();
    const nav = [['index.html', '网站首页', 'home']]
      .concat(cats().map((c) => [`list.html?cat=${c.id}`, c.name, c.id]))
      .concat([['charge.html', '收费说明', 'charge']])
      .map(([href, label, key]) => `<li><a href="${href}" class="${key === active ? 'active' : ''}">${esc(label)}</a></li>`).join('');
    document.getElementById('site-header').innerHTML = `
      <div class="topbar"><div class="wrap"><span>欢迎来到${SITE}(演示站点,数据仅保存在本机浏览器)</span>
        <span>${u ? `你好,${esc(u.name)}<a href="#" id="logout">退出</a>` : '<a href="login.html">登录</a><a href="register.html">注册</a>'}</span></div></div>
      <div class="header"><div class="wrap">
        <a class="logo" href="index.html">${SITE}<small>本地生活信息发布</small></a>
        <div class="header-actions"><a class="btn" href="${u ? 'member.html' : 'login.html?next=member.html'}">会员中心</a><a class="btn btn-primary" href="post.html">发布信息</a></div>
      </div></div>
      <nav class="nav" aria-label="主导航"><div class="wrap"><ul>${nav}</ul></div></nav>`;
    document.getElementById('site-footer').innerHTML = `
      <div class="footer"><div class="wrap">
        <div>${cats().map((c) => `<a href="list.html?cat=${c.id}">${esc(c.name)}</a>`).join('')}<a href="charge.html">收费说明</a></div>
        <p>© ${new Date().getFullYear()} ${SITE} 演示项目。本站为学习用途的前端原型,所有商家与信息均为虚构,不提供真实交易。</p>
      </div></div>`;
    const out = document.getElementById('logout');
    if (out) out.addEventListener('click', (e) => { e.preventDefault(); logout(); location.reload(); });
  }

  window.App = { esc, cats, catOf, posts, postsBy, addPost, updatePost, removePost, bumpViews, register, login, demoLogin, changePassword, me, safeNext, card, layout, SITE, DEMO };
})();
