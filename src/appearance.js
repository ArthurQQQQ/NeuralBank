// Apply the saved appearance before the stylesheet paints, without external fonts.
(() => {
  const key = 'neuralbank-appearance';
  const choices = new Set(['light', 'dark', 'system']);
  const system = matchMedia('(prefers-color-scheme: dark)');
  let appearance = 'system';
  try {
    const saved = localStorage.getItem(key);
    if (choices.has(saved)) appearance = saved;
  } catch {}

  const apply = () => {
    if (appearance === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = appearance;
    const dark = appearance === 'dark' || (appearance === 'system' && system.matches);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#101012' : '#ffffff');
  };

  apply();
  system.addEventListener('change', apply);
  document.addEventListener('DOMContentLoaded', () => {
    const select = document.getElementById('appearance');
    if (!select) return;
    select.value = appearance;
    select.addEventListener('change', () => {
      if (!choices.has(select.value)) return;
      appearance = select.value;
      try { localStorage.setItem(key, appearance); } catch {}
      apply();
    });
  });
})();
