// ═══════════════════════════════════════════════════════════
// 🌙 مُسلِمي - الأساسيات
// ═══════════════════════════════════════════════════════════

const CONFIG = {
  APP_NAME: 'مُسلِمي',
  VERSION: '1.0.0',
  PRAYER_API: 'https://api.aladhan.com/v1',
  DEFAULT_METHOD: 4, // Umm Al-Qura
  DEFAULT_CITY: 'مكة المكرمة'
};

// ═══════════════════════════════════════════════════════════
// 📊 المتغيرات العامة
// ═══════════════════════════════════════════════════════════
let userLocation = {
  lat: null,
  lng: null,
  city: null,
  country: null
};

let prayerTimes = null;
let nextPrayerInterval = null;
let currentAdhkarList = [];
let tasbihCount = 0;

// ═══════════════════════════════════════════════════════════
// 🛠️ دوال مساعدة
// ═══════════════════════════════════════════════════════════
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function getText(id) {
  const el = document.getElementById(id);
  return el ? el.textContent : '';
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showToast(message, type = 'info') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  
  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  const icons = {
    success: 'fa-check-circle',
    error: 'fa-times-circle',
    warning: 'fa-exclamation-triangle',
    info: 'fa-info-circle'
  };
  toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'toastIn 0.3s reverse';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ═══════════════════════════════════════════════════════════
// 🕌 حساب الوقت المتبقي للصلاة القادمة
// ═══════════════════════════════════════════════════════════
function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(n => parseInt(n));
  return h * 60 + m;
}

function getCurrentMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function getNextPrayer(prayers) {
  const currentMins = getCurrentMinutes();
  const order = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
  const names = { Fajr: 'الفجر', Dhuhr: 'الظهر', Asr: 'العصر', Maghrib: 'المغرب', Isha: 'العشاء' };
  
  for (const key of order) {
    if (prayers[key]) {
      const prayerMins = timeToMinutes(prayers[key]);
      if (prayerMins > currentMins) {
        return { key, name: names[key], time: prayers[key], mins: prayerMins };
      }
    }
  }
  
  // إذا انتهت كل صلوات اليوم، القادمة هي فجر الغد
  return { 
    key: 'Fajr', 
    name: 'الفجر', 
    time: prayers.Fajr, 
    mins: timeToMinutes(prayers.Fajr) + 24 * 60,
    tomorrow: true
  };
}

function updateCountdown() {
  if (!prayerTimes) return;
  
  const next = getNextPrayer(prayerTimes);
  const currentMins = getCurrentMinutes();
  let remainingMins = next.mins - currentMins;
  if (remainingMins < 0) remainingMins += 24 * 60;
  
  const hours = Math.floor(remainingMins / 60);
  const mins = remainingMins % 60;
  
  setText('nextPrayerName', next.name);
  setText('nextPrayerCountdown', 
    String(hours).padStart(2, '0') + ':' + 
    String(mins).padStart(2, '0') + ':00');
  setText('nextPrayerTime', next.time ? 'الساعة ' + next.time : '—');
  
  highlightCurrentPrayer(next.key);
}

function highlightCurrentPrayer(nextKey) {
  document.querySelectorAll('.prayer-item').forEach(el => el.classList.remove('current'));
  const nextEl = document.querySelector(`.prayer-item[data-prayer="${nextKey}"]`);
  if (nextEl) nextEl.classList.add('current');
}

// ═══════════════════════════════════════════════════════════
// 🎨 التنقل بين الصفحات
// ═══════════════════════════════════════════════════════════
function navigateTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(n => n.classList.remove('active'));
  
  const pageEl = document.getElementById('page-' + page);
  const navEl = document.querySelector(`.nav-btn[data-page="${page}"]`);
  
  if (pageEl) pageEl.classList.add('active');
  if (navEl) navEl.classList.add('active');
  
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

console.log('🌙 core.js - v' + CONFIG.VERSION);
