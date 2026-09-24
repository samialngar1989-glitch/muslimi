// ═══════════════════════════════════════════════════════════
// 📖 القرآن الكريم - نص فقط مع تخزين IndexedDB
// ═══════════════════════════════════════════════════════════

const QURAN_CONFIG = {
  DB_NAME: 'muslimi_quran_db',
  DB_VERSION: 1,
  STORE_SURAHS: 'surahs',
  STORE_META: 'meta',
  API_BASE: 'https://api.alquran.cloud/v1'
};

let quranDB = null;
let surahsList = [];
let currentSurahNumber = null;
let currentFontSize = 24;
let currentReaderTheme = 'light';

// ═══════════════════════════════════════════════════════════
// 🗄️ تهيئة IndexedDB
// ═══════════════════════════════════════════════════════════
async function initQuranDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(QURAN_CONFIG.DB_NAME, QURAN_CONFIG.DB_VERSION);
    
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(QURAN_CONFIG.STORE_SURAHS)) {
        db.createObjectStore(QURAN_CONFIG.STORE_SURAHS, { keyPath: 'number' });
      }
      if (!db.objectStoreNames.contains(QURAN_CONFIG.STORE_META)) {
        db.createObjectStore(QURAN_CONFIG.STORE_META, { keyPath: 'key' });
      }
    };
    
    request.onsuccess = (e) => {
      quranDB = e.target.result;
      console.log('✅ قاعدة بيانات القرآن جاهزة');
      resolve(quranDB);
    };
    
    request.onerror = (e) => {
      console.error('❌ خطأ في قاعدة البيانات:', e);
      reject(e);
    };
  });
}

// ═══════════════════════════════════════════════════════════
// 💾 دوال التخزين
// ═══════════════════════════════════════════════════════════
async function saveSurahToDB(surahData) {
  return new Promise((resolve, reject) => {
    const tx = quranDB.transaction(QURAN_CONFIG.STORE_SURAHS, 'readwrite');
    const store = tx.objectStore(QURAN_CONFIG.STORE_SURAHS);
    store.put(surahData);
    tx.oncomplete = () => resolve(true);
    tx.onerror = (e) => reject(e);
  });
}

async function getSurahFromDB(number) {
  return new Promise((resolve, reject) => {
    const tx = quranDB.transaction(QURAN_CONFIG.STORE_SURAHS, 'readonly');
    const store = tx.objectStore(QURAN_CONFIG.STORE_SURAHS);
    const request = store.get(number);
    request.onsuccess = () => resolve(request.result);
    request.onerror = (e) => reject(e);
  });
}

async function getAllCachedSurahs() {
  return new Promise((resolve, reject) => {
    const tx = quranDB.transaction(QURAN_CONFIG.STORE_SURAHS, 'readonly');
    const store = tx.objectStore(QURAN_CONFIG.STORE_SURAHS);
    const request = store.getAllKeys();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = (e) => reject(e);
  });
}

async function saveMeta(key, value) {
  return new Promise((resolve, reject) => {
    const tx = quranDB.transaction(QURAN_CONFIG.STORE_META, 'readwrite');
    const store = tx.objectStore(QURAN_CONFIG.STORE_META);
    store.put({ key, value, updatedAt: Date.now() });
    tx.oncomplete = () => resolve(true);
    tx.onerror = (e) => reject(e);
  });
}

async function getMeta(key) {
  return new Promise((resolve, reject) => {
    const tx = quranDB.transaction(QURAN_CONFIG.STORE_META, 'readonly');
    const store = tx.objectStore(QURAN_CONFIG.STORE_META);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result?.value);
    request.onerror = (e) => reject(e);
  });
}

// ═══════════════════════════════════════════════════════════
// 🌐 جلب قائمة السور
// ═══════════════════════════════════════════════════════════
async function loadSurahsList() {
  const container = document.getElementById('surahsList');
  if (!container) return;
  
  try {
    // جرّب من الذاكرة أولاً
    let list = await getMeta('surahsList');
    
    if (!list) {
      // من API
      container.innerHTML = `
        <div class="loading-state">
          <i class="fas fa-spinner fa-spin"></i>
          <p>جاري تحميل قائمة السور...</p>
        </div>
      `;
      
      const res = await fetch(`${QURAN_CONFIG.API_BASE}/surah`);
      const data = await res.json();
      
      if (data.code !== 200) throw new Error('فشل جلب السور');
      
      list = data.data;
      await saveMeta('surahsList', list);
    }
    
    surahsList = list;
    renderSurahsList();
    updateCacheInfo();
    
  } catch (error) {
    console.error(error);
    container.innerHTML = `
      <div class="loading-state">
        <i class="fas fa-exclamation-triangle" style="color:var(--warning)"></i>
        <p>تعذّر تحميل السور — تحقق من الإنترنت</p>
        <button class="btn-sm" onclick="loadSurahsList()" style="margin-top:15px;">
          <i class="fas fa-redo"></i> إعادة المحاولة
        </button>
      </div>
    `;
  }
}

async function renderSurahsList() {
  const container = document.getElementById('surahsList');
  if (!container || !surahsList.length) return;
  
  const cachedNumbers = await getAllCachedSurahs();
  const cachedSet = new Set(cachedNumbers);
  
  container.innerHTML = surahsList.map(surah => {
    const typeClass = surah.revelationType === 'Meccan' ? 'surah-type-makkah' : 'surah-type-madinah';
    const typeText = surah.revelationType === 'Meccan' ? 'مكية' : 'مدنية';
    const isCached = cachedSet.has(surah.number);
    
    return `
      <div class="surah-item" onclick="openSurah(${surah.number})" data-surah-name="${escapeHtml(surah.name)}">
        <div class="surah-number">${surah.number}</div>
        <div class="surah-info">
          <div class="surah-name">${escapeHtml(surah.name)}</div>
          <div class="surah-meta">
            <span class="surah-type ${typeClass}">${typeText}</span>
            <span>${surah.numberOfAyahs} آية</span>
            ${isCached ? '<span class="surah-cached"><i class="fas fa-check-circle"></i> محفوظة</span>' : ''}
          </div>
        </div>
        <div class="surah-open-icon">
          <i class="fas fa-chevron-left"></i>
        </div>
      </div>
    `;
  }).join('');
}

function filterSurahs() {
  const query = document.getElementById('surahSearch').value.trim().toLowerCase();
  const items = document.querySelectorAll('.surah-item');
  
  items.forEach(item => {
    const name = item.dataset.surahName.toLowerCase();
    if (!query || name.includes(query)) {
      item.style.display = 'flex';
    } else {
      item.style.display = 'none';
    }
  });
}

async function updateCacheInfo() {
  const el = document.getElementById('quranCacheInfo');
  if (!el) return;
  
  try {
    const cached = await getAllCachedSurahs();
    const total = 114;
    const percent = Math.round((cached.length / total) * 100);
    
    el.textContent = `المحفوظ: ${cached.length} / ${total} سورة (${percent}%)`;
  } catch (e) {
    el.textContent = 'غير متاح';
  }
}

// ═══════════════════════════════════════════════════════════
// 📖 فتح سورة
// ═══════════════════════════════════════════════════════════
async function openSurah(surahNumber) {
  currentSurahNumber = surahNumber;
  
  // الانتقال لصفحة القارئ
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-surah-reader').classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  
  const surahMeta = surahsList.find(s => s.number === surahNumber);
  if (surahMeta) {
    document.getElementById('readerSurahName').textContent = surahMeta.name;
    const typeText = surahMeta.revelationType === 'Meccan' ? 'مكية' : 'مدنية';
    document.getElementById('readerSurahSubtitle').textContent = 
      `${typeText} • ${surahMeta.numberOfAyahs} آية • السورة ${surahNumber}`;
  }
  
  // تحميل المحتوى
  const loading = document.getElementById('readerLoading');
  const content = document.getElementById('surahContent');
  
  loading.style.display = 'block';
  content.style.display = 'none';
  document.getElementById('readerProgress').style.width = '0%';
  
  try {
    // 1. جرّب من DB
    let surahData = await getSurahFromDB(surahNumber);
    
    if (!surahData) {
      // 2. من API
      document.getElementById('readerProgress').style.width = '30%';
      
      const res = await fetch(
        `${QURAN_CONFIG.API_BASE}/surah/${surahNumber}/quran-uthmani`
      );
      
      document.getElementById('readerProgress').style.width = '70%';
      
      const data = await res.json();
      if (data.code !== 200) throw new Error('فشل جلب السورة');
      
      surahData = {
        number: data.data.number,
        name: data.data.name,
        englishName: data.data.englishName,
        revelationType: data.data.revelationType,
        numberOfAyahs: data.data.numberOfAyahs,
        ayahs: data.data.ayahs.map(a => ({
          numberInSurah: a.numberInSurah,
          text: a.text
        })),
        cachedAt: Date.now()
      };
      
      document.getElementById('readerProgress').style.width = '90%';
      
      // 3. حفظ في DB
      await saveSurahToDB(surahData);
      
      document.getElementById('readerProgress').style.width = '100%';
      
      // تحديث معلومات المخزون
      updateCacheInfo();
    }
    
    // 4. عرض السورة
renderSurah(surahData);

loading.style.display = 'none';
content.style.display = 'block';

// إظهار زر الحفظ
const saveBtn = document.getElementById('saveMarkerBtn');
if (saveBtn) saveBtn.style.display = 'flex';

// عرض شريط الاستئناف
await renderResumeBar(surahNumber);

// بدء الحفظ التلقائي
startAutoSave();

// تحديث حالة أزرار التنقل
updateNavigationButtons();
    
  } catch (error) {
    console.error(error);
    loading.innerHTML = `
      <i class="fas fa-exclamation-triangle" style="color:var(--warning)"></i>
      <p>تعذّر تحميل السورة — تحقق من الإنترنت</p>
      <button class="btn-sm" onclick="openSurah(${surahNumber})" style="margin-top:15px;">
        <i class="fas fa-redo"></i> إعادة المحاولة
      </button>
    `;
  }
}

function renderSurah(surahData) {
  const content = document.getElementById('surahContent');
  
  // تطبيق الثيم
  content.setAttribute('data-theme', currentReaderTheme);
  
  // البسملة (إلا في التوبة والفاتحة)
  let html = '';
  if (surahData.number !== 1 && surahData.number !== 9) {
    html += `<div class="bismillah">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>`;
  }
  
  // الآيات
  html += '<div class="ayah-container">';
  surahData.ayahs.forEach(ayah => {
    let text = ayah.text;
    
    // إزالة البسملة من أول آية في السور (إلا الفاتحة)
    if (surahData.number !== 1 && ayah.numberInSurah === 1) {
      const bismillah = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';
      if (text.startsWith(bismillah)) {
        text = text.substring(bismillah.length).trim();
      }
    }
    
    html += `
      <span class="ayah-text">${escapeHtml(text)}</span>
      <span class="ayah-number">${ayah.numberInSurah}</span>
    `;
  });
  html += '</div>';
  
  content.innerHTML = html;
  content.style.fontSize = currentFontSize + 'px';
  
  // تحديث حجم الآيات
  const ayahContainer = content.querySelector('.ayah-container');
  if (ayahContainer) {
    ayahContainer.style.fontSize = currentFontSize + 'px';
  }
}

function closeSurahReader() {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-quran').classList.add('active');
  document.querySelector('.nav-btn[data-page="quran"]')?.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ═══════════════════════════════════════════════════════════
// 🎨 إعدادات القارئ
// ═══════════════════════════════════════════════════════════
function toggleReaderSettings() {
  const settings = document.getElementById('readerSettings');
  settings.style.display = settings.style.display === 'none' ? 'block' : 'none';
}

function changeFontSize(delta) {
  currentFontSize = Math.max(18, Math.min(48, currentFontSize + delta));
  document.getElementById('fontSizeDisplay').textContent = currentFontSize;
  
  const content = document.getElementById('surahContent');
  content.style.fontSize = currentFontSize + 'px';
  
  const ayahContainer = content.querySelector('.ayah-container');
  if (ayahContainer) {
    ayahContainer.style.fontSize = currentFontSize + 'px';
  }
  
  localStorage.setItem('quran_font_size', currentFontSize);
}

function setReaderTheme(theme) {
  currentReaderTheme = theme;
  const content = document.getElementById('surahContent');
  content.setAttribute('data-theme', theme);
  
  // تحديث الأزرار النشطة
  ['themeLight', 'themeSepia', 'themeDark'].forEach(id => {
    document.getElementById(id).classList.remove('active');
  });
  
  const activeBtn = { light: 'themeLight', sepia: 'themeSepia', dark: 'themeDark' }[theme];
  if (activeBtn) document.getElementById(activeBtn).classList.add('active');
  
  localStorage.setItem('quran_reader_theme', theme);
}

// ═══════════════════════════════════════════════════════════
// ⬅️➡️ التنقل بين السور
// ═══════════════════════════════════════════════════════════
function goToPrevSurah() {
  if (currentSurahNumber && currentSurahNumber > 1) {
    openSurah(currentSurahNumber - 1);
  }
}

function goToNextSurah() {
  if (currentSurahNumber && currentSurahNumber < 114) {
    openSurah(currentSurahNumber + 1);
  }
}

function updateNavigationButtons() {
  // لا نحتاج تعطيل الأزرار — سيتعامل معها الكود
}

// ═══════════════════════════════════════════════════════════
// 🎬 التهيئة
// ═══════════════════════════════════════════════════════════
async function initQuran() {
  try {
    await initQuranDB();
    
    // استرجاع الإعدادات المحفوظة
    const savedSize = localStorage.getItem('quran_font_size');
    if (savedSize) {
      currentFontSize = parseInt(savedSize);
      const sizeEl = document.getElementById('fontSizeDisplay');
      if (sizeEl) sizeEl.textContent = currentFontSize;
    }
    
    const savedTheme = localStorage.getItem('quran_reader_theme') || 'light';
    currentReaderTheme = savedTheme;
    
    // تحميل قائمة السور
    await loadSurahsList();
    
  } catch (error) {
    console.error('فشل تهيئة القرآن:', error);
  }
}
// ═══════════════════════════════════════════════════════════
// 🔖 نظام حفظ موضع القراءة (Bookmark)
// ═══════════════════════════════════════════════════════════

const MARKER_KEY = 'quran_last_reading';

// حفظ الموضع الحالي
async function saveMarker(surahNumber, ayahNumber, surahName) {
  const marker = {
    surahNumber,
    surahName,
    ayahNumber,
    timestamp: Date.now(),
    dateStr: new Date().toLocaleString('ar-YE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  };
  
  localStorage.setItem(MARKER_KEY, JSON.stringify(marker));
  await saveMeta('lastReading', marker);
  
  return marker;
}

// جلب الموضع المحفوظ
async function getMarker() {
  try {
    const local = localStorage.getItem(MARKER_KEY);
    if (local) return JSON.parse(local);
    
    const meta = await getMeta('lastReading');
    return meta || null;
  } catch (e) {
    return null;
  }
}

// عرض بطاقة المتابعة في صفحة القرآن
async function renderResumeCard() {
  const container = document.getElementById('resumeCardContainer');
  if (!container) return;
  
  const marker = await getMarker();
  
  if (!marker) {
    container.innerHTML = '';
    return;
  }
  
  container.innerHTML = `
    <div class="resume-card" onclick="resumeReading()">
      <div class="resume-icon">
        <i class="fas fa-bookmark"></i>
      </div>
      <div class="resume-info">
        <div class="resume-label">متابعة القراءة</div>
        <div class="resume-surah">${escapeHtml(marker.surahName)}</div>
        <div class="resume-ayah">الآية ${marker.ayahNumber}</div>
        <div class="resume-time">${escapeHtml(marker.dateStr)}</div>
      </div>
      <div class="resume-arrow">
        <i class="fas fa-chevron-left"></i>
      </div>
    </div>
  `;
}

// استئناف القراءة من الموضع المحفوظ
async function resumeReading() {
  const marker = await getMarker();
  if (!marker) return;
  
  currentSurahNumber = marker.surahNumber;
  await openSurah(marker.surahNumber);
  
  // بعد فتح السورة، انتقل للآية
  setTimeout(() => {
    scrollToAyah(marker.ayahNumber, true);
  }, 600);
}

// الانتقال لآية معينة
function scrollToAyah(ayahNumber, highlight = true) {
  const ayahNumbers = document.querySelectorAll('.ayah-number');
  const target = Array.from(ayahNumbers).find(el => 
    parseInt(el.textContent) === parseInt(ayahNumber)
  );
  
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    if (highlight) {
      const ayahContainer = target.closest('.ayah-container');
      const textEl = target.previousElementSibling;
      
      if (textEl) {
        textEl.classList.add('ayah-highlight');
        setTimeout(() => textEl.classList.remove('ayah-highlight'), 5000);
      }
    }
  }
}

// حفظ الموضع الحالي (يدوي أو تلقائي)
async function saveCurrentMarker() {
  if (!currentSurahNumber) return;
  
  const surahMeta = surahsList.find(s => s.number === currentSurahNumber);
  if (!surahMeta) return;
  
  // ابحث عن الآية الأقرب لمنتصف الشاشة
  const ayahNumbers = document.querySelectorAll('.ayah-number');
  if (!ayahNumbers.length) {
    // احفظ السورة كاملة من أول آية
    await saveMarker(currentSurahNumber, 1, surahMeta.name);
    showSaveToast('تم حفظ البداية');
    return;
  }
  
  const viewportMiddle = window.innerHeight / 2;
  let closestAyah = null;
  let minDistance = Infinity;
  
  ayahNumbers.forEach(el => {
    const rect = el.getBoundingClientRect();
    const distance = Math.abs(rect.top - viewportMiddle);
    if (distance < minDistance) {
      minDistance = distance;
      closestAyah = parseInt(el.textContent);
    }
  });
  
  if (closestAyah) {
    await saveMarker(currentSurahNumber, closestAyah, surahMeta.name);
    showSaveToast('تم حفظ الموضع');
    
    // تأثير على الزر
    const btn = document.getElementById('saveMarkerBtn');
    if (btn) {
      btn.classList.add('saved');
      btn.innerHTML = '<i class="fas fa-check"></i>';
      setTimeout(() => {
        btn.classList.remove('saved');
        btn.innerHTML = '<i class="fas fa-bookmark"></i>';
      }, 2000);
    }
  }
}

// إظهار إشعار الحفظ
function showSaveToast(message) {
  const toast = document.createElement('div');
  toast.className = 'save-toast';
  toast.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'toastDown 0.3s reverse';
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

// عرض شريط الاستئناف داخل القارئ
async function renderResumeBar(surahNumber) {
  const container = document.getElementById('resumeBarContainer');
  if (!container) return;
  
  const marker = await getMarker();
  
  if (!marker || marker.surahNumber !== surahNumber) {
    container.innerHTML = '';
    return;
  }
  
  // عرض شريط فقط إذا كانت الآية > 1
  if (marker.ayahNumber <= 1) {
    container.innerHTML = '';
    return;
  }
  
  // عرض لثوانٍ ثم يختفي تلقائيًا
  container.innerHTML = `
    <div class="resume-bar">
      <div class="resume-bar-info">
        <i class="fas fa-bookmark"></i>
        <span>آخر قراءة: الآية ${marker.ayahNumber}</span>
      </div>
      <div class="resume-bar-actions">
        <button class="resume-bar-btn" onclick="resumeToAyah(${marker.ayahNumber})">
          <i class="fas fa-arrow-left"></i> متابعة
        </button>
        <button class="resume-bar-btn" onclick="dismissResumeBar()">
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>
  `;
  
  // اختفاء تلقائي بعد 8 ثوانٍ
  setTimeout(() => {
    dismissResumeBar();
  }, 8000);
}

function resumeToAyah(ayahNumber) {
  scrollToAyah(ayahNumber, true);
  dismissResumeBar();
}

function dismissResumeBar() {
  const container = document.getElementById('resumeBarContainer');
  if (container) container.innerHTML = '';
}

// حفظ تلقائي عند مغادرة الصفحة
window.addEventListener('beforeunload', () => {
  if (currentSurahNumber && document.getElementById('page-surah-reader').classList.contains('active')) {
    // حفظ سريع بدون انتظار
    const surahMeta = surahsList.find(s => s.number === currentSurahNumber);
    if (surahMeta) {
      const ayahNumbers = document.querySelectorAll('.ayah-number');
      if (ayahNumbers.length) {
        const viewportMiddle = window.innerHeight / 2;
        let closestAyah = 1;
        let minDistance = Infinity;
        
        ayahNumbers.forEach(el => {
          const rect = el.getBoundingClientRect();
          const distance = Math.abs(rect.top - viewportMiddle);
          if (distance < minDistance) {
            minDistance = distance;
            closestAyah = parseInt(el.textContent);
          }
        });
        
        const marker = {
          surahNumber: currentSurahNumber,
          surahName: surahMeta.name,
          ayahNumber: closestAyah,
          timestamp: Date.now(),
          dateStr: new Date().toLocaleString('ar-YE', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        };
        localStorage.setItem(MARKER_KEY, JSON.stringify(marker));
      }
    }
  }
});

// حفظ تلقائي كل 10 ثوانٍ أثناء القراءة
let autoSaveTimer = null;

function startAutoSave() {
  if (autoSaveTimer) clearInterval(autoSaveTimer);
  autoSaveTimer = setInterval(() => {
    if (currentSurahNumber && document.getElementById('page-surah-reader').classList.contains('active')) {
      saveCurrentMarkerQuietly();
    }
  }, 10000);
}

async function saveCurrentMarkerQuietly() {
  if (!currentSurahNumber) return;
  const surahMeta = surahsList.find(s => s.number === currentSurahNumber);
  if (!surahMeta) return;
  
  const ayahNumbers = document.querySelectorAll('.ayah-number');
  if (!ayahNumbers.length) return;
  
  const viewportMiddle = window.innerHeight / 2;
  let closestAyah = 1;
  let minDistance = Infinity;
  
  ayahNumbers.forEach(el => {
    const rect = el.getBoundingClientRect();
    const distance = Math.abs(rect.top - viewportMiddle);
    if (distance < minDistance) {
      minDistance = distance;
      closestAyah = parseInt(el.textContent);
    }
  });
  
  await saveMarker(currentSurahNumber, closestAyah, surahMeta.name);
}
console.log('📖 quran.js تم التحميل');
