// ═══════════════════════════════════════════════════════════
// 🚀 التهيئة الرئيسية
// ═══════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', async () => {
  
  // ═══════════════════════════════════════
  // 🎨 الثيم (الوضع الليلي)
  // ═══════════════════════════════════════
  const savedTheme = localStorage.getItem('muslimi_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  const themeIcon = document.querySelector('#themeBtn i');
  if (themeIcon) themeIcon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';

  // ═══════════════════════════════════════
  // 🎨 زر الثيم
  // ═══════════════════════════════════════
  document.getElementById('themeBtn').addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const newTheme = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('muslimi_theme', newTheme);
    if (themeIcon) themeIcon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
  });

  // ═══════════════════════════════════════
  // 📍 زر الموقع
  // ═══════════════════════════════════════
  document.getElementById('locationBtn').addEventListener('click', changeLocation);

  // ═══════════════════════════════════════
  // 🚪 إغلاق النوافذ المنبثقة
  // ═══════════════════════════════════════
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', e => {
      if (e.target === modal) modal.classList.remove('active');
    });
  });

  // ═══════════════════════════════════════
  // 📅 تحديث التواريخ
  // ═══════════════════════════════════════
  updateGregorianDate();

  // ═══════════════════════════════════════
  // 🕌 جلب المواقيت (لا ننتظر — يبدأ فورًا)
  // ═══════════════════════════════════════
  fetchPrayerTimes();
  startNextPrayerCountdown();

  // ═══════════════════════════════════════
  // 📖 تهيئة القرآن
  // ═══════════════════════════════════════
  await initQuran();

  // ═══════════════════════════════════════
  // 🔔 تهيئة الإشعارات
  // ═══════════════════════════════════════
  await initNotifications();

  // ═══════════════════════════════════════
  // 📍 التحقق من الموقع المحفوظ
  // ═══════════════════════════════════════
  const savedLoc = localStorage.getItem('userLocation');
  if (savedLoc) {
    try {
      userLocation = JSON.parse(savedLoc);
      updateLocationDisplay();
    } catch (e) {}
  }

  console.log('🌙 مُسلِمي v' + CONFIG.VERSION + ' — جاهز');
});

// ═══════════════════════════════════════════════════════════
// 🔧 Service Worker + PWA
// ═══════════════════════════════════════════════════════════

// تسجيل Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(() => console.log('✅ Service Worker مسجّل'))
      .catch(err => console.warn('⚠️ فشل تسجيل SW:', err));
  });
}

// PWA Install Prompt
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const btn = document.getElementById('installPwaBtn');
  if (btn) btn.style.display = 'flex';
});

// زر التثبيت
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('installPwaBtn');
  if (btn) {
    btn.addEventListener('click', async () => {
      if (!deferredPrompt) {
        if (window.matchMedia('(display-mode: standalone)').matches) {
          showToast('✅ التطبيق مثبّت بالفعل', 'success');
          return;
        }
        showToast('افتح قائمة المتصفح → "إضافة إلى الشاشة الرئيسية"', 'info');
        return;
      }
      
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        showToast('🎉 تم تثبيت التطبيق!', 'success');
      }
      
      deferredPrompt = null;
      btn.style.display = 'none';
    });
  }
  
  // إخفاء الزر إذا كان التطبيق مثبتًا
  if (window.matchMedia('(display-mode: standalone)').matches) {
    if (btn) btn.style.display = 'none';
  }
});
