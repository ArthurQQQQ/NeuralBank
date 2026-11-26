const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[character]));

export function createAccountLogin({ root, auth, config, onRender, onSessionChange }) {
  const state = { email: '', code: '', sent: false, pending: false, error: '', message: '' };
  const available = provider => auth.configured && config[`${provider}Enabled`];

  async function perform(action, after) {
    if (state.pending) return;
    state.pending = true; state.error = ''; state.message = ''; onRender();
    try { await action(); if (after) await after(); }
    catch (error) { state.error = error.message || '暂时无法完成登录，请重试。'; }
    finally { state.pending = false; onRender(); }
  }

  root.addEventListener('input', event => {
    if (event.target.id === 'cloud-email') state.email = event.target.value;
    if (event.target.id === 'cloud-code') state.code = event.target.value;
  });
  root.addEventListener('click', event => {
    if (event.target.closest('#github-login') && available('github')) void perform(() => auth.signInWithGitHub());
    if (event.target.closest('#cloud-signout')) void perform(() => auth.signOut(), async () => { state.sent = false; state.code = ''; await onSessionChange(); });
  });
  root.addEventListener('submit', event => {
    if (!['cloud-email-form', 'cloud-code-form'].includes(event.target.id)) return;
    event.preventDefault();
    if (!available('email')) return;
    if (event.target.id === 'cloud-email-form') {
      void perform(() => auth.sendEmailCode(state.email.trim()), () => {
        state.sent = true; state.message = '验证码已发送。请查看学校邮箱，并在这里输入邮件中的验证码。';
      }).then(() => { if (state.sent) root.querySelector('#cloud-code')?.focus(); });
    } else {
      void perform(() => auth.verifyEmailCode(state.email.trim(), state.code.trim()), async () => {
        state.sent = false; state.code = ''; await onSessionChange();
      });
    }
  });

  return {
    markup({ mastered, total }) {
      const github = available('github'), email = available('email');
      const error = state.error || (auth.error && (auth.error.message || String(auth.error))) || '';
      const unavailable = !github && !email;
      return `<div class="account-intro"><h3>登录你的学习库</h3><p>${unavailable ? '账户登录正在接入。你可以继续学习，当前标注保存在此浏览器。' : '用 GitHub 或学校邮箱登录，在不同设备继续自己的学习进度。'}</p></div><div class="cloud-login"><button class="button primary github-login" type="button" id="github-login" ${!github || state.pending ? 'disabled' : ''}>使用 GitHub 登录</button><div class="login-divider"><span>或使用学校邮箱</span></div><form id="cloud-email-form"><label for="cloud-email">学校邮箱</label><input id="cloud-email" type="email" autocomplete="email" placeholder="you@university.edu" value="${escape(state.email)}" required ${!email || state.pending ? 'disabled' : ''}><button class="button secondary" type="submit" ${!email || state.pending ? 'disabled' : ''}>${state.pending ? '正在处理…' : state.sent ? '重新发送验证码' : '发送登录验证码'}</button></form>${state.sent ? `<form id="cloud-code-form"><label for="cloud-code">邮件验证码</label><input id="cloud-code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="10" value="${escape(state.code)}" required ${state.pending ? 'disabled' : ''}><button class="button primary" type="submit" ${state.pending ? 'disabled' : ''}>验证并登录</button></form>` : ''}${state.message ? `<p class="login-message" role="status">${escape(state.message)}</p>` : ''}${error ? `<p class="account-error" role="alert">${escape(error)}</p>` : ''}${unavailable ? '<p class="login-availability">GitHub 与邮箱登录将在身份服务配置完成后开放。</p>' : '<p class="login-availability">高校邮箱以域名目录识别，并通过邮件验证。未收录的学校也可先使用 GitHub。</p>'}</div><span class="account-local-count">此浏览器已掌握 ${mastered} / ${total} 个模型</span>`;
    },
  };
}
