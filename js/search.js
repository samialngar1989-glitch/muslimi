// ═══════════════════════════════════════════════════════════
// 🔍 البحث في القرآن الكريم
// ═══════════════════════════════════════════════════════════

const SEARCH_CONFIG = {
  STORAGE_KEY: 'quran_search_index',
  CACHE_KEY: 'quran_search_cache',
  MAX_RESULTS: 100
};

let searchIndex = null;

// ═══════════════════════════════════════════════════════════
// 🎨 تبديل وضع البحث/السور
// ═══════════════════════════════════════════════════════════
function switchQuranMode(mode) {
  document.querySelectorAll('.quran-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.mode === mode);
  });
  
  document.getElementById('quranModeSurahs').style.display = mode === 'surahs' ? 'block' : 'none';
  document.getElementById('quranModeSearch').style.display = mode === 'search' ? 'block' : 'none';
  
  // مسح النتائج عند العودة
  if (mode === 'surahs') {
    document.getElementById('searchResults').innerHTML = '';
  }
}

// ═══════════════════════════════════════════════════════════
// 🔍 البحث في القرآن
// ═══════════════════════════════════════════════════════════
async function searchInQuran() {
  const query = document.getElementById('ayahSearch').value.trim();
  const resultsEl = document.getElementById('searchResults');
  
  if (!query || query.length < 2) {
    showToast('⚠️ اكتب كلمة على الأقل (حرفين)', 'warning');
    return;
  }
  
  // إظهار حالة التحميل
  resultsEl.innerHTML = `
    <div class="search-loading">
      <i class="fas fa-spinner fa-spin"></i>
      <p>جاري البحث في القرآن كله...</p>
    </div>
  `;
  
  try {
    // ═══ 1. جرّب من الـ Cache ═══
    const cacheKey = `${SEARCH_CONFIG.CACHE_KEY}_${query}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (cached) {
      const data = JSON.parse(cached);
      displaySearchResults(data, query);
      return;
    }
    
    // ═══ 2. ابحث من API ═══
    const res = await fetch(
      `https://api.alquran.cloud/v1/search/${encodeURIComponent(query)}/all/quran-uthmani`
    );
    const data = await res.json();
    
    if (data.code !== 200 || !data.data) {
      throw new Error('فشل البحث');
    }
    
    const results = data.data.matches || [];
    
    // احفظ النتائج في Cache (لمدة 24 ساعة)
    if (results.length > 0 && results.length < SEARCH_CONFIG.MAX_RESULTS) {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(results));
      } catch (e) {}
    }
    
    displaySearchResults(results, query);
    
  } catch (error) {
    console.error(error);
    resultsEl.innerHTML = `
      <div class="search-empty">
        <i class="fas fa-exclamation-triangle"></i>
        <h3>فشل البحث</h3>
        <p>تحقق من الإنترنت وحاول مرة أخرى</p>
        <button class="btn-sm" onclick="searchInQuran()" style="margin-top:15px;">
          <i class="fas fa-redo"></i> إعادة المحاولة
        </button>
      </div>
    `;
  }
}

// ═══════════════════════════════════════════════════════════
// 📋 عرض النتائج
// ═══════════════════════════════════════════════════════════
function displaySearchResults(results, query) {
  const resultsEl = document.getElementById('searchResults');
  
  if (!results || results.length === 0) {
    resultsEl.innerHTML = `
      <div class="search-empty">
        <i class="fas fa-search"></i>
        <h3>لا توجد نتائج</h3>
        <p>لم يتم العثور على "${escapeHtml(query)}"</p>
      </div>
    `;
    return;
  }
  
  // ═══ إحصائيات ═══
  let html = `
    <div class="search-stats">
      <i class="fas fa-check-circle" style="color:var(--success);"></i>
      تم إيجاد ${results.length} نتيجة لكلمة "${escapeHtml(query)}"
    </div>
  `;
  
  // ═══ النتائج ═══
  const maxResults = Math.min(results.length, SEARCH_CONFIG.MAX_RESULTS);
  
  for (let i = 0; i < maxResults; i++) {
    const match = results[i];
    const surahName = match.surah?.name || '—';
    const surahNumber = match.surah?.number || 0;
    const ayahNumber = match.numberInSurah || 0;
    const text = match.text || '';
    
    // تظليل الكلمة المبحوث عنها
    const highlightedText = highlightWord(text, query);
    
    html += `
      <div class="search-result" onclick="openAyahFromSearch(${surahNumber}, ${ayahNumber})">
        <div class="search-result-header">
          <div class="search-surah-name">
            <i class="fas fa-book" style="color:var(--accent);"></i>
            سورة ${escapeHtml(surahName)}
          </div>
          <div class="search-ayah-num">الآية ${ayahNumber}</div>
        </div>
        <div class="search-result-text">${highlightedText}</div>
      </div>
    `;
  }
  
  // إذا كانت النتائج كثيرة
  if (results.length > SEARCH_CONFIG.MAX_RESULTS) {
    html += `
      <div class="search-stats" style="margin-top:15px;">
        عرض ${SEARCH_CONFIG.MAX_RESULTS} من ${results.length} نتيجة
        — <strong>خفّف البحث</strong>
      </div>
    `;
  }
  
  resultsEl.innerHTML = html;
}

// تظليل الكلمة في النص
function highlightWord(text, query) {
  if (!text || !query) return escapeHtml(text);
  
  // ابحث عن الكلمة (مع تجاهل الحركات)
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  
  // استخدم نص آمن
  const safeText = escapeHtml(text);
  const safeQuery = escapeHtml(query);
  
  const safeRegex = new RegExp(`(${safeQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  
  return safeText.replace(safeRegex, '<mark>$1</mark>');
}

// ═══════════════════════════════════════════════════════════
// 🎯 فتح الآية من البحث
// ═══════════════════════════════════════════════════════════
async function openAyahFromSearch(surahNumber, ayahNumber) {
  // انتقل لصفحة القارئ
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-surah-reader').classList.add('active');
  
  // افتح السورة
  await openSurah(surahNumber);
  
  // انتقل للآية بعد التحميل
  setTimeout(() => {
    scrollToAyah(ayahNumber, true);
  }, 800);
}

// ═══════════════════════════════════════════════════════════
// 🧹 مسح نتائج البحث
// ═══════════════════════════════════════════════════════════
function clearSearch() {
  document.getElementById('ayahSearch').value = '';
  document.getElementById('searchResults').innerHTML = '';
  
  // امسح Cache البحث القديم
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith(SEARCH_CONFIG.CACHE_KEY)) {
      localStorage.removeItem(key);
    }
  });
}

console.log('🔍 search.js تم التحميل');
