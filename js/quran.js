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

console.log('📖 quran.js تم التحميل');
