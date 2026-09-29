// ═══════════════════════════════════════════════════════════
// 🕌 مواقيت الصلاة - باستخدام Aladhan API
// ═══════════════════════════════════════════════════════════

const PRAYER_NAMES = {
  Fajr: 'الفجر',
  Sunrise: 'الشروق',
  Dhuhr: 'الظهر',
  Asr: 'العصر',
  Maghrib: 'المغرب',
  Isha: 'العشاء'
};

const PRAYER_ICONS = {
  Fajr: 'fa-cloud-moon',
  Sunrise: 'fa-sun',
  Dhuhr: 'fa-sun',
  Asr: 'fa-cloud-sun',
  Maghrib: 'fa-sun',
  Isha: 'fa-moon'
};

// ═══════════════════════════════════════════════════════════
// 🌍 تحديد الموقع
// ═══════════════════════════════════════════════════════════
async function detectLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      showToast('المتصفح لا يدعم تحديد الموقع', 'warning');
      resolve(null);
      return;
    }
    
    // ═══ محاولة سريعة أولاً (بدون GPS) ═══
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        userLocation.lat = position.coords.latitude;
        userLocation.lng = position.coords.longitude;
        
        try {
          const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${userLocation.lat}&lon=${userLocation.lng}&accept-language=ar`
          );
          const geoData = await geoRes.json();
          
          if (geoData.address) {
            userLocation.city = geoData.address.city || 
                               geoData.address.town || 
                               geoData.address.village || 
                               geoData.address.state || 
                               'موقعك';
            userLocation.country = geoData.address.country || '';
          }
        } catch (e) {
          userLocation.city = 'موقعك';
        }
        
        localStorage.setItem('userLocation', JSON.stringify(userLocation));
        resolve(userLocation);
      },
      (error) => {
        console.warn('فشل تحديد الموقع:', error);
        // ═══ الحل: استخدم مكة افتراضيًا ═══
        userLocation.lat = 21.4225;
        userLocation.lng = 39.8262;
        userLocation.city = 'مكة المكرمة';
        localStorage.setItem('userLocation', JSON.stringify(userLocation));
        resolve(userLocation);
      },
      {
        enableHighAccuracy: false,  // ⚡ لا نستخدم GPS الدقيق
        timeout: 5000,               // ⚡ 5 ثوانٍ فقط
        maximumAge: 3600000          // ⚡ استخدم cache لمدة ساعة
      }
    );
  });
}
// ═══════════════════════════════════════════════════════════
// 🕌 جلب مواقيت الصلاة
// ═══════════════════════════════════════════════════════════
async function fetchPrayerTimes() {
async function fetchPrayerTimes() {
  try {
    // ═══ 1. جرّب الموقع المحفوظ أولاً ═══
    const saved = localStorage.getItem('userLocation');
    if (saved) {
      try {
        userLocation = JSON.parse(saved);
      } catch (e) {}
    }
    
    // ═══ 2. إذا لم يوجد موقع، استخدم مكة ═══
    if (!userLocation.lat) {
      userLocation.lat = 21.4225;
      userLocation.lng = 39.8262;
      userLocation.city = 'مكة المكرمة';
    }
    
    // ═══ 3. اعرض الموقع فورًا ═══
    updateLocationDisplay();
    
    // ═══ 4. جرّب المواقيت المحفوظة لليوم ═══
    const today = new Date();
    const dateStr = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;
    
    const cached = localStorage.getItem('prayerTimes');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.date === dateStr) {
          prayerTimes = parsed.times;
          renderPrayerTimes(parsed.times);
          updateCountdown();
          console.log('✅ المواقيت من الذاكرة المحلية');
          // نكمل لتحديث المواقيت من API في الخلفية
        }
      } catch (e) {}
    }
    
    // ═══ 5. اجلب من API ═══
    const url = `${CONFIG.PRAYER_API}/timings/${dateStr}?latitude=${userLocation.lat}&longitude=${userLocation.lng}&method=${CONFIG.DEFAULT_METHOD}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 ثوانٍ كحد أقصى
    
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    const data = await res.json();
    
    if (!data.data || !data.data.timings) {
      throw new Error('فشل جلب المواقيت');
    }
    
    // تنظيف المواقيت
    const timings = data.data.timings;
    const cleanTimes = {};
    Object.keys(timings).forEach(key => {
      cleanTimes[key] = timings[key].split(' ')[0];
    });
    
    prayerTimes = cleanTimes;
    
    // حفظ
    localStorage.setItem('prayerTimes', JSON.stringify({
      date: dateStr,
      times: cleanTimes
    }));
    
    // تحديث الواجهة
    renderPrayerTimes(cleanTimes);
    updateHijriDate(data.data.date.hijri);
    updateCountdown();
    
    console.log('✅ المواقيت محدّثة من API');
    
    return cleanTimes;
    
  } catch (error) {
    console.error('خطأ في جلب المواقيت:', error);
    
    // ═══ 6. جرّب من التخزين عند الفشل ═══
    const cached = localStorage.getItem('prayerTimes');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        prayerTimes = parsed.times;
        renderPrayerTimes(parsed.times);
        updateCountdown();
        showToast('عرض آخر مواقيت محفوظة', 'warning');
      } catch (e) {
        showToast('فشل تحميل المواقيت', 'error');
      }
    } else {
      showToast('فشل جلب المواقيت — تحقق من الإنترنت', 'error');
    }
  }
}

// ═══════════════════════════════════════════════════════════
// 🎨 عرض المواقيت
// ═══════════════════════════════════════════════════════════
function renderPrayerTimes(times) {
  const container = document.getElementById('prayerList');
  if (!container) return;
  
  const order = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
  
  container.innerHTML = order.map(key => {
    if (!times[key]) return '';
    
    return `
      <div class="prayer-item" data-prayer="${key}">
        <div class="prayer-icon">
          <i class="fas ${PRAYER_ICONS[key]}"></i>
        </div>
        <div class="prayer-name">${PRAYER_NAMES[key]}</div>
        <div class="prayer-time">${times[key]}</div>
      </div>
    `;
  }).join('');
  
  updateCountdown();
}

// ═══════════════════════════════════════════════════════════
// 📍 عرض اسم الموقع
// ═══════════════════════════════════════════════════════════
function updateLocationDisplay() {
  const el = document.getElementById('locationName');
  if (!el) return;
  
  const city = userLocation.city || 'موقعك';
  el.innerHTML = `<i class="fas fa-map-marker-alt"></i><span>${escapeHtml(city)}</span>`;
}

// ═══════════════════════════════════════════════════════════
// 📅 التاريخ الهجري والميلادي
// ═══════════════════════════════════════════════════════════
function updateHijriDate(hijriData) {
  if (!hijriData) return;
  
  const hijriStr = `${hijriData.day} ${hijriData.month.ar} ${hijriData.year} هـ`;
  setText('hijriDate', hijriStr);
  setText('hijriBigDate', hijriStr);
}

function updateGregorianDate() {
  const today = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const gregorianStr = today.toLocaleDateString('ar-YE', options);
  setText('gregorianDate', gregorianStr);
  setText('gregorianBigDate', gregorianStr);
}

// ═══════════════════════════════════════════════════════════
// 🔄 تحديث المواقيت
// ═══════════════════════════════════════════════════════════
function refreshPrayerTimes() {
  showToast('جاري التحديث...', 'info');
  fetchPrayerTimes();
}

async function changeLocation() {
  showToast('جاري تحديد موقعك...', 'info');
  const loc = await detectLocation();
  if (loc) {
    showToast('✅ تم تحديد الموقع: ' + (loc.city || ''), 'success');
    fetchPrayerTimes();
  }
}

// ═══════════════════════════════════════════════════════════
// ⏰ بدء العدّاد
// ═══════════════════════════════════════════════════════════
function startNextPrayerCountdown() {
  if (nextPrayerInterval) clearInterval(nextPrayerInterval);
  nextPrayerInterval = setInterval(updateCountdown, 30000); // كل 30 ثانية
}

console.log('🕌 prayer.js تم التحميل');
