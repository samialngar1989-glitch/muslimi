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
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        userLocation.lat = position.coords.latitude;
        userLocation.lng = position.coords.longitude;
        
        // عكس الترميز للحصول على اسم المدينة
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
        
        // حفظ في التخزين المحلي
        localStorage.setItem('userLocation', JSON.stringify(userLocation));
        
        resolve(userLocation);
      },
      (error) => {
        console.warn('فشل تحديد الموقع:', error);
        showToast('يرجى السماح بالوصول للموقع', 'warning');
        resolve(null);
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 3600000 // ساعة واحدة
      }
    );
  });
}

// ═══════════════════════════════════════════════════════════
// 🕌 جلب مواقيت الصلاة
// ═══════════════════════════════════════════════════════════
async function fetchPrayerTimes() {
  try {
    // إذا لم يكن الموقع معروفًا
    if (!userLocation.lat) {
      // جرّب من التخزين
      const saved = localStorage.getItem('userLocation');
      if (saved) {
        userLocation = JSON.parse(saved);
      } else {
        // اطلب الموقع
        await detectLocation();
      }
    }
    
    // إذا فشل تحديد الموقع، استخدم مكة
    if (!userLocation.lat) {
      userLocation.lat = 21.4225;
      userLocation.lng = 39.8262;
      userLocation.city = 'مكة المكرمة';
    }
    
    const today = new Date();
    const dateStr = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;
    
    const url = `${CONFIG.PRAYER_API}/timings/${dateStr}?latitude=${userLocation.lat}&longitude=${userLocation.lng}&method=${CONFIG.DEFAULT_METHOD}`;
    
    const res = await fetch(url);
    const data = await res.json();
    
    if (!data.data || !data.data.timings) {
      throw new Error('فشل جلب المواقيت');
    }
    
    // تنظيف المواقيت (إزالة المنطقة الزمنية)
    const timings = data.data.timings;
    const cleanTimes = {};
    Object.keys(timings).forEach(key => {
      cleanTimes[key] = timings[key].split(' ')[0];
    });
    
    prayerTimes = cleanTimes;
    
    // حفظ في التخزين
    localStorage.setItem('prayerTimes', JSON.stringify({
      date: dateStr,
      times: cleanTimes
    }));
    
    // تحديث الواجهة
    renderPrayerTimes(cleanTimes);
    updateLocationDisplay();
    updateHijriDate(data.data.date.hijri);
    updateCountdown();
    
    return cleanTimes;
    
  } catch (error) {
    console.error('خطأ في جلب المواقيت:', error);
    
    // جرّب من التخزين
    const cached = localStorage.getItem('prayerTimes');
    if (cached) {
      const parsed = JSON.parse(cached);
      prayerTimes = parsed.times;
      renderPrayerTimes(parsed.times);
      updateCountdown();
      showToast('عرض آخر مواقيت محفوظة', 'warning');
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
