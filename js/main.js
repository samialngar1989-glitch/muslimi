// ═══════════════════════════════════════════════════════════
// 🚀 التهيئة الرئيسية
// ═══════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
  
  // ═══ الثيم ═══
  const savedTheme = localStorage.getItem('muslimi_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  const themeIcon = document.querySelector('#themeBtn i');
  if (themeIcon) themeIcon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';

  // ═══ زر الثيم ═══
  document.getElementById('themeBtn').addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const newTheme = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('muslimi_theme', newTheme);
    themeIcon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
  });

  // ═══ زر الموقع ═══
  document.getElementById('locationBtn').addEventListener('click', changeLocation);

  // ═══ إغلاق النوافذ المنبثقة ═══
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', e => {
      if (e.target === modal) modal.classList.remove('active');
    });
  });

  // ═══ تحديث التواريخ ═══
  updateGregorianDate();

  // ═══ جلب المواقيت ═══
  await fetchPrayerTimes();
  startNextPrayerCountdown();

  // ═══ التحقق من الموقع المحفوظ ═══
  const savedLoc = localStorage.getItem('userLocation');
  if (savedLoc) {
    userLocation = JSON.parse(savedLoc);
    updateLocationDisplay();
  }

  console.log('🌙 مُسلِمي v' + CONFIG.VERSION + ' — جاهز');
});
