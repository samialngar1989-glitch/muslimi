// ═══════════════════════════════════════════════════════════
// 🎨 الثيمات المتعددة
// ═══════════════════════════════════════════════════════════

const THEMES = ['green', 'blue', 'purple', 'gold', 'pink', 'dark'];
const THEME_STORAGE_KEY = 'muslimi_app_theme';

function changeAppTheme(themeName) {
  if (!THEMES.includes(themeName)) return;
  
  // تطبيق الثيم
  document.documentElement.setAttribute('data-app-theme', themeName);
  
  // حفظ
  localStorage.setItem(THEME_STORAGE_KEY, themeName);
  
  // تحديث الأزرار
  document.querySelectorAll('.theme-item').forEach(item => {
    item.classList.toggle('active', item.dataset.themeName === themeName);
  });
  
  // تحديث لون الـ theme-color
  const colors = {
    green: '#0d5e4a',
    blue: '#2563eb',
    purple: '#7c3aed',
    gold: '#b8862e',
    pink: '#ec4899',
    dark: '#10b981'
  };
  
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) metaTheme.setAttribute('content', colors[themeName] || '#0d5e4a');
  
  showToast('🎨 تم تغيير الثيم', 'success');
}

function loadAppTheme() {
  const saved = localStorage.getItem(THEME_STORAGE_KEY) || 'green';
  document.documentElement.setAttribute('data-app-theme', saved);
  
  // تحديث الأزرار بعد تحميل DOM
  setTimeout(() => {
    document.querySelectorAll('.theme-item').forEach(item => {
      item.classList.toggle('active', item.dataset.themeName === saved);
    });
  }, 100);
}

// تحميل الثيم فورًا
loadAppTheme();

console.log('🎨 themes.js تم التحميل');
