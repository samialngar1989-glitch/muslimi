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
let currentReaderMode = 'mushaf';
let autoSaveTimer = null;

const MARKER_KEY = 'quran_last_reading';

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
    if (!quranDB) { resolve(null); return; }
    const tx = quranDB.transaction(QURAN_CONFIG.STORE_SURAHS, 'readonly');
    const store = tx.objectStore(QURAN_CONFIG.STORE_SURAHS);
    const request = store.get(number);
    request.onsuccess = () => resolve(request.result);
    request.onerror = (e) => reject(e);
  });
}

async function getAllCachedSurahs() {
  return new Promise((resolve, reject) => {
    if (!quranDB) { resolve([]); return; }
    const tx = quranDB.transaction(QURAN_CONFIG.STORE_SURAHS, 'readonly');
    const store = tx.objectStore(QURAN_CONFIG.STORE_SURAHS);
    const request = store.getAllKeys();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = (e) => reject(e);
  });
}

async function saveMeta(key, value) {
  return new Promise((resolve, reject) => {
    if (!quranDB) { resolve(false); return; }
    const tx = quranDB.transaction(QURAN_CONFIG.STORE_META, 'readwrite');
    const store = tx.objectStore(QURAN_CONFIG.STORE_META);
    store.put({ key, value, updatedAt: Date.now() });
    tx.oncomplete = () => resolve(true);
    tx.onerror = (e) => reject(e);
  });
}

async function getMeta(key) {
  return new Promise((resolve, reject) => {
    if (!quranDB) { resolve(null); return; }
    const tx = quranDB.transaction(QURAN_CONFIG.STORE_META, 'readonly');
    const store = tx.objectStore(QURAN_CONFIG.STORE_META);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result?.value);
    request.onerror = (e) => reject(e);
  });
}

// ═══════════════════════════════════════════════════════════
// 🧹 إزالة البسملة (الحل النهائي)
// ═══════════════════════════════════════════════════════════
function removeBismillah(text) {
  if (!text) return text;
  
  // ═══ الطريقة 1: Regex شامل يطابق كل صيغ البسملة ═══
  const bismillahRegex = /^[\s\u064B-\u065F\u0670]*بِ?سْ?مِ?\s+ٱ?ل?لَّ?هِ?\s+ٱ?ل?رَّ?حْ?مَ?ٰ?نِ?\s+ٱ?ل?رَّ?حِ?ي?مِ?[\s\u064B-\u065F\u0670]*/;
  
  if (bismillahRegex.test(text)) {
    const cleaned = text.replace(bismillahRegex, '').trim();
    if (cleaned.length > 0) return cleaned;
  }
  
  // ═══ الطريقة 2: البحث عن نهاية البسملة (أول 60 حرف) ═══
  const shortText = text.substring(0, 60);
  
  const endPatterns = [
    'الرَّحِيمِ',
    'الرَّحِيْمِ',
    'ٱلرَّحِيمِ',
    'ٱلرَّحِيْمِ',
    'الرحيم',
    'الرحِيْم',
    'ٱلرَّحِيم',
    'الرَّحِيم'
  ];
  
  for (const pattern of endPatterns) {
    const idx = shortText.indexOf(pattern);
    if (idx !== -1 && idx < 55) {
      const cleaned = text.substring(idx + pattern.length).trim();
      if (cleaned.length > 5) return cleaned;
    }
  }
  
  // ═══ الطريقة 3: البحث عن كلمة "بسم" + "الرحيم" ═══
  if (shortText.includes('بسم') || shortText.includes('بِسْمِ')) {
    const match = text.match(/(بِ?سْ?مِ?[\s\S]{5,60}?الرَّ?حِ?ي?مِ?)\s/);
    if (match && match[0].length < 80) {
      const cleaned = text.substring(match[0].length).trim();
      if (cleaned.length > 5) return cleaned;
    }
  }
  
  // ═══ الطريقة 4: احتياطية — البحث بدون حركات ═══
  const match2 = text.match(/^[\s\S]{0,40}?الرح\s*[يى]\s*م[\s\u064B-\u065F]*/);
  if (match2) {
    const cleaned = text.substring(match2[0].length).trim();
    if (cleaned.length > 5) return cleaned;
  }
  
  return text;
}

// ═══════════════════════════════════════════════════════════
// 🌐 جلب قائمة السور
// ═══════════════════════════════════════════════════════════
async function loadSurahsList() {
  const container = document.getElementById('surahsList');
  if (!container) return;
  
  try {
    let list = await getMeta('surahsList');
    
    if (!list) {
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
// 📖 فتح سورة (مع إصلاح شامل)
// ═══════════════════════════════════════════════════════════
async function openSurah(surahNumber) {
  currentSurahNumber = surahNumber;
  
  // ═══ إخفاء أي عناصر من صفحات أخرى ═══
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(n => n.classList.remove('active'));
  
  // ═══ إظهار صفحة القارئ ═══
  document.getElementById('page-surah-reader').classList.add('active');
  
  // ═══ تفعيل زر القرآن في الشريط السفلي ═══
  const quranNav = document.querySelector('.nav-btn[data-page="quran"]');
  if (quranNav) quranNav.classList.add('active');
  
  window.scrollTo({ top: 0, behavior: 'smooth' });
  
  // ... باقي الدالة كما هو
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
  
  const loading = document.getElementById('readerLoading');
  const content = document.getElementById('surahContent');
  const mushafContainer = document.getElementById('mushafContainer');
  
  // إظهار حالة التحميل
  loading.style.display = 'block';
  loading.innerHTML = `
    <i class="fas fa-spinner fa-spin"></i>
    <p>جاري تحميل السورة...</p>
    <div class="progress-bar-container">
      <div class="progress-bar-fill" id="readerProgress"></div>
    </div>
  `;
  content.style.display = 'none';
  if (mushafContainer) mushafContainer.style.display = 'none';
  
  const progress = document.getElementById('readerProgress');
  if (progress) progress.style.width = '0%';
  
  // ═══ 1. جرّب من IndexedDB أولاً ═══
  let surahData = null;
  try {
    surahData = await getSurahFromDB(surahNumber);
  } catch (e) {
    console.warn('فشل القراءة من DB:', e);
  }
  
  // ═══ إذا وُجدت السورة → اعرضها فورًا ═══
  if (surahData) {
    try {
      renderSurah(surahData);
      
      loading.style.display = 'none';
      content.style.display = currentReaderMode === 'list' ? 'block' : 'none';
      if (mushafContainer) {
        mushafContainer.style.display = currentReaderMode === 'mushaf' ? 'flex' : 'none';
      }
      
      const saveBtn = document.getElementById('saveMarkerBtn');
      if (saveBtn) saveBtn.style.display = 'flex';
      
      await renderResumeBar(surahNumber);
      startAutoSave();
      updateNavigationButtons();
      
      console.log('✅ السورة من IndexedDB');
      return;
    } catch (e) {
      console.error('فشل عرض السورة من Cache:', e);
    }
  }
  
  // ═══ 2. جلب من API ═══
  try {
    if (progress) progress.style.width = '30%';
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    const res = await fetch(
      `${QURAN_CONFIG.API_BASE}/surah/${surahNumber}/quran-uthmani`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);
    
    if (progress) progress.style.width = '70%';
    
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
    
    if (progress) progress.style.width = '90%';
    
    // حفظ في DB
    try {
      await saveSurahToDB(surahData);
    } catch (e) {
      console.warn('فشل الحفظ في DB:', e);
    }
    
    if (progress) progress.style.width = '100%';
    
    updateCacheInfo();
    
    // عرض
    renderSurah(surahData);
    
    loading.style.display = 'none';
    content.style.display = currentReaderMode === 'list' ? 'block' : 'none';
    if (mushafContainer) {
      mushafContainer.style.display = currentReaderMode === 'mushaf' ? 'flex' : 'none';
    }
    
    const saveBtn = document.getElementById('saveMarkerBtn');
    if (saveBtn) saveBtn.style.display = 'flex';
    
    await renderResumeBar(surahNumber);
    startAutoSave();
    updateNavigationButtons();
    
  } catch (error) {
    console.error('فشل تحميل السورة:', error);
    
    // ═══ 3. محاولة أخيرة من Cache ═══
    if (!surahData) {
      try {
        surahData = await getSurahFromDB(surahNumber);
      } catch (e) {}
    }
    
    if (surahData) {
      // يوجد cache — اعرضه مع تحذير
      renderSurah(surahData);
      loading.style.display = 'none';
      content.style.display = currentReaderMode === 'list' ? 'block' : 'none';
      if (mushafContainer) {
        mushafContainer.style.display = currentReaderMode === 'mushaf' ? 'flex' : 'none';
      }
      const saveBtn = document.getElementById('saveMarkerBtn');
      if (saveBtn) saveBtn.style.display = 'flex';
      showToast('عرض نسخة محفوظة', 'info');
    } else {
      // لا يوجد cache → اعرض الخطأ
      loading.innerHTML = `
        <i class="fas fa-exclamation-triangle" style="color:var(--warning);font-size:50px;"></i>
        <h3 style="color:var(--text);margin:15px 0 10px;">تعذّر تحميل السورة</h3>
        <p style="color:var(--text-muted);">تحقق من الإنترنت وحاول مرة أخرى</p>
        <button class="btn-sm" onclick="openSurah(${surahNumber})" style="margin-top:15px;">
          <i class="fas fa-redo"></i> إعادة المحاولة
        </button>
      `;
    }
  }
}

// ═══════════════════════════════════════════════════════════
// 🎨 عرض السورة (مصحف / قائمة)
// ═══════════════════════════════════════════════════════════
function renderSurah(surahData) {
  const surahMeta = surahsList.find(s => s.number === surahData.number);
  const surahName = surahData.name || (surahMeta ? surahMeta.name : '');
  const juzNumber = getJuzFromSurah(surahData.number);
  
  if (currentReaderMode === 'mushaf') {
    renderMushafMode(surahData, surahName, juzNumber);
  } else {
    renderListMode(surahData);
  }
}

function renderMushafMode(surahData, surahName, juzNumber) {
  const mushafContainer = document.getElementById('mushafContainer');
  const mushafContent = document.getElementById('mushafContent');
  const surahHeader = document.getElementById('mushafSurahHeader');
  const pageNumber = document.getElementById('mushafPageNumber');
  const frame = document.querySelector('.mushaf-frame');
  
  if (frame) frame.setAttribute('data-theme', currentReaderTheme);
  
  if (surahHeader) {
    const typeText = surahData.revelationType === 'Meccan' ? 'مكية' : 'مدنية';
    surahHeader.textContent = `سورة ${surahName} • ${typeText} • ${surahData.numberOfAyahs} آية`;
  }
  
  if (pageNumber) {
    pageNumber.textContent = `﴿ ${surahData.number} ﴾`;
  }
  
  let html = '';
  
  // البسملة (إلا في التوبة والفاتحة)
  if (surahData.number !== 1 && surahData.number !== 9) {
    html += `<div class="bismillah">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>`;
  }
  
  html += '<div class="ayah-container">';
  surahData.ayahs.forEach(ayah => {
    let text = ayah.text;
    
    // إزالة البسملة من أول آية
    if (surahData.number !== 1 && ayah.numberInSurah === 1) {
      text = removeBismillah(text);
    }
    
    html += `
      <span class="ayah-text">${escapeHtml(text)}</span>
      <span class="ayah-number">${toArabicNumber(ayah.numberInSurah)}</span>
    `;
  });
  html += '</div>';
  
  mushafContent.innerHTML = html;
  mushafContent.style.fontSize = currentFontSize + 'px';
  
  mushafContainer.style.display = 'flex';
  document.getElementById('surahContent').style.display = 'none';
  
  const ayahContainer = mushafContent.querySelector('.ayah-container');
  if (ayahContainer) {
    ayahContainer.style.fontSize = currentFontSize + 'px';
  }
}

function renderListMode(surahData) {
  const content = document.getElementById('surahContent');
  
  document.getElementById('mushafContainer').style.display = 'none';
  content.style.display = 'block';
  
  content.setAttribute('data-theme', currentReaderTheme);
  
  let html = '';
  
  // البسملة (إلا في التوبة والفاتحة)
  if (surahData.number !== 1 && surahData.number !== 9) {
    html += `<div class="bismillah">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>`;
  }
  
  html += '<div class="ayah-container">';
  surahData.ayahs.forEach(ayah => {
    let text = ayah.text;
    
    if (surahData.number !== 1 && ayah.numberInSurah === 1) {
      text = removeBismillah(text);
    }
    
    html += `
      <span class="ayah-text">${escapeHtml(text)}</span>
      <span class="ayah-number">${ayah.numberInSurah}</span>
    `;
  });
  html += '</div>';
  
  content.innerHTML = html;
  content.style.fontSize = currentFontSize + 'px';
  
  const ayahContainer = content.querySelector('.ayah-container');
  if (ayahContainer) {
    ayahContainer.style.fontSize = currentFontSize + 'px';
  }
}

// تحويل رقم إلى رقم عربي
function toArabicNumber(num) {
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(num).split('').map(d => arabicDigits[parseInt(d)] || d).join('');
}

// تحديد الجزء (تقريبي)
function getJuzFromSurah(surahNumber) {
  const juzMap = [1, 1, 3, 5, 6, 7, 8, 9, 10, 11, 11, 12, 13, 13, 14, 14, 15, 15, 16, 16, 17, 17, 18, 18, 18, 19, 19, 20, 20, 21, 21, 21, 21, 22, 22, 22, 23, 23, 23, 24, 24, 25, 25, 25, 25, 26, 26, 26, 26, 26, 26, 27, 27, 27, 27, 27, 27, 28, 28, 28, 28, 28, 28, 28, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30];
  return juzMap[surahNumber - 1] || 1;
}

// وضع القارئ
function setReaderMode(mode) {
  currentReaderMode = mode;
  
  const btnMushaf = document.getElementById('modeMushaf');
  const btnList = document.getElementById('modeList');
  if (btnMushaf) btnMushaf.classList.toggle('active', mode === 'mushaf');
  if (btnList) btnList.classList.toggle('active', mode === 'list');
  
  localStorage.setItem('quran_reader_mode', mode);
  
  if (currentSurahNumber) {
    getSurahFromDB(currentSurahNumber).then(data => {
      if (data) renderSurah(data);
    });
  }
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function closeSurahReader() {
  await saveCurrentMarkerQuietly();
  
  if (autoSaveTimer) {
    clearInterval(autoSaveTimer);
    autoSaveTimer = null;
  }
  
  const saveBtn = document.getElementById('saveMarkerBtn');
  if (saveBtn) saveBtn.style.display = 'none';
  
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-quran').classList.add('active');
  document.querySelector('.nav-btn[data-page="quran"]')?.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  
  await renderResumeCard();
}

// ═══════════════════════════════════════════════════════════
// 🎨 إعدادات القارئ
// ═══════════════════════════════════════════════════════════
function toggleReaderSettings() {
  const settings = document.getElementById('readerSettings');
  const btn = document.querySelector('.reader-settings-btn');
  if (!settings) return;
  
  if (settings.classList.contains('hidden')) {
    settings.classList.remove('hidden');
    settings.classList.add('show');
    if (btn) btn.classList.add('active');
  } else {
    settings.classList.add('hidden');
    settings.classList.remove('show');
    if (btn) btn.classList.remove('active');
  }
}

// إغلاق الإعدادات عند الضغط خارجها
document.addEventListener('click', function(e) {
  const settings = document.getElementById('readerSettings');
  const settingsBtn = document.querySelector('.reader-settings-btn');
  
  if (!settings || !settingsBtn) return;
  if (settings.classList.contains('hidden')) return;
  
  if (!settings.contains(e.target) && !settingsBtn.contains(e.target)) {
    settings.classList.add('hidden');
    settings.classList.remove('show');
    settingsBtn.classList.remove('active');
  }
});

function changeFontSize(delta) {
  currentFontSize = Math.max(18, Math.min(48, currentFontSize + delta));
  const displayEl = document.getElementById('fontSizeDisplay');
  if (displayEl) displayEl.textContent = currentFontSize;
  
  const content = document.getElementById('surahContent');
  if (content) {
    content.style.fontSize = currentFontSize + 'px';
    const ayahContainer = content.querySelector('.ayah-container');
    if (ayahContainer) ayahContainer.style.fontSize = currentFontSize + 'px';
  }
  
  const mushafContent = document.getElementById('mushafContent');
  if (mushafContent) {
    mushafContent.style.fontSize = currentFontSize + 'px';
    const ayahContainer = mushafContent.querySelector('.ayah-container');
    if (ayahContainer) ayahContainer.style.fontSize = currentFontSize + 'px';
  }
  
  localStorage.setItem('quran_font_size', currentFontSize);
}

function setReaderTheme(theme) {
  currentReaderTheme = theme;
  
  const content = document.getElementById('surahContent');
  if (content) content.setAttribute('data-theme', theme);
  
  const frame = document.querySelector('.mushaf-frame');
  if (frame) frame.setAttribute('data-theme', theme);
  
  ['themeLight', 'themeSepia', 'themeDark'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.classList.remove('active');
  });
  
  const activeBtn = { light: 'themeLight', sepia: 'themeSepia', dark: 'themeDark' }[theme];
  if (activeBtn) {
    const btn = document.getElementById(activeBtn);
    if (btn) btn.classList.add('active');
  }
  
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
  // يمكن تطويرها لاحقًا
}

// ═══════════════════════════════════════════════════════════
// 🎬 التهيئة
// ═══════════════════════════════════════════════════════════
async function initQuran() {
  try {
    await initQuranDB();
    
    const savedSize = localStorage.getItem('quran_font_size');
    if (savedSize) {
      currentFontSize = parseInt(savedSize);
      const sizeEl = document.getElementById('fontSizeDisplay');
      if (sizeEl) sizeEl.textContent = currentFontSize;
    }
    
    const savedTheme = localStorage.getItem('quran_reader_theme') || 'light';
    currentReaderTheme = savedTheme;
    
    const savedMode = localStorage.getItem('quran_reader_mode') || 'mushaf';
    currentReaderMode = savedMode;
    
    setTimeout(() => {
      const modeMushaf = document.getElementById('modeMushaf');
      const modeList = document.getElementById('modeList');
      if (modeMushaf) modeMushaf.classList.toggle('active', savedMode === 'mushaf');
      if (modeList) modeList.classList.toggle('active', savedMode === 'list');
    }, 500);
    
    await loadSurahsList();
    await renderResumeCard();
    
  } catch (error) {
    console.error('فشل تهيئة القرآن:', error);
  }
}

// ═══════════════════════════════════════════════════════════
// 🔖 نظام حفظ موضع القراءة
// ═══════════════════════════════════════════════════════════
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

async function resumeReading() {
  const marker = await getMarker();
  if (!marker) return;
  
  currentSurahNumber = marker.surahNumber;
  await openSurah(marker.surahNumber);
  
  setTimeout(() => {
    scrollToAyah(marker.ayahNumber, true);
  }, 800);
}

function scrollToAyah(ayahNumber, highlight = true) {
  const ayahNumbers = document.querySelectorAll('.ayah-number');
  const target = Array.from(ayahNumbers).find(el => 
    parseInt(el.textContent) === parseInt(ayahNumber)
  );
  
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    if (highlight) {
      const textEl = target.previousElementSibling;
      if (textEl) {
        textEl.classList.add('ayah-highlight');
        setTimeout(() => textEl.classList.remove('ayah-highlight'), 5000);
      }
    }
  }
}

async function saveCurrentMarker() {
  if (!currentSurahNumber) return;
  
  const surahMeta = surahsList.find(s => s.number === currentSurahNumber);
  if (!surahMeta) return;
  
  const ayahNumbers = document.querySelectorAll('.ayah-number');
  if (!ayahNumbers.length) {
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

async function renderResumeBar(surahNumber) {
  const container = document.getElementById('resumeBarContainer');
  if (!container) return;
  
  const marker = await getMarker();
  
  if (!marker || marker.surahNumber !== surahNumber) {
    container.innerHTML = '';
    return;
  }
  
  if (marker.ayahNumber <= 1) {
    container.innerHTML = '';
    return;
  }
  
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
  if (currentSurahNumber && document.getElementById('page-surah-reader')?.classList.contains('active')) {
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

// حفظ تلقائي كل 10 ثوانٍ
function startAutoSave() {
  if (autoSaveTimer) clearInterval(autoSaveTimer);
  autoSaveTimer = setInterval(() => {
    const readerPage = document.getElementById('page-surah-reader');
    if (currentSurahNumber && readerPage?.classList.contains('active')) {
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

// ═══════════════════════════════════════════════════════════
// 🧹 مسح كل السور المحفوظة
// ═══════════════════════════════════════════════════════════
async function clearQuranCache() {
  if (!confirm('سيتم حذف كل السور المحفوظة. هل أنت متأكد؟')) return;
  
  try {
    const tx = quranDB.transaction(QURAN_CONFIG.STORE_SURAHS, 'readwrite');
    const store = tx.objectStore(QURAN_CONFIG.STORE_SURAHS);
    store.clear();
    
    tx.oncomplete = () => {
      showToast('✅ تم مسح السور المحفوظة', 'success');
      updateCacheInfo();
    };
  } catch (e) {
    showToast('فشل المسح', 'error');
  }
}

console.log('📖 quran.js تم التحميل');
