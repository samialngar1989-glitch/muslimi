// ═══════════════════════════════════════════════════════════
// 🧭 القبلة - اتجاه الكعبة المشرفة
// ═══════════════════════════════════════════════════════════

// إحداثيات الكعبة المشرفة
const KAABA_LAT = 21.4224779;
const KAABA_LNG = 39.8251832;

// حالة البوصلة
let qiblaState = {
  active: false,
  deviceHeading: 0,      // اتجاه الهاتف (0 = شمال)
  qiblaBearing: 0,       // اتجاه القبلة من موقعك
  isSupported: false,
  hasPermission: false,
  lastUpdate: 0
};

// ═══════════════════════════════════════════════════════════
// 🧮 حساب اتجاه القبلة (Bearing)
// ═══════════════════════════════════════════════════════════
function calculateQiblaBearing(lat, lng) {
  const φ1 = toRadians(lat);
  const φ2 = toRadians(KAABA_LAT);
  const Δλ = toRadians(KAABA_LNG - lng);
  
  const x = Math.sin(Δλ) * Math.cos(φ2);
  const y = Math.cos(φ1) * Math.sin(φ2) - 
            Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  
  let bearing = Math.atan2(x, y);
  bearing = toDegrees(bearing);
  bearing = (bearing + 360) % 360;
  
  return bearing;
}

function toRadians(degrees) {
  return degrees * Math.PI / 180;
}

function toDegrees(radians) {
  return radians * 180 / Math.PI;
}

// ═══════════════════════════════════════════════════════════
// 🧭 بدء البوصلة
// ═══════════════════════════════════════════════════════════
async function startQibla() {
  // تحقق من الموقع
  if (!userLocation.lat || !userLocation.lng) {
    const saved = localStorage.getItem('userLocation');
    if (saved) {
      userLocation = JSON.parse(saved);
    } else {
      await detectLocation();
    }
  }
  
  if (!userLocation.lat || !userLocation.lng) {
    showQiblaError('لم نتمكن من تحديد موقعك', 'يرجى السماح بالوصول إلى الموقع الجغرافي من إعدادات المتصفح.');
    return;
  }
  
  // احسب اتجاه القبلة
  qiblaState.qiblaBearing = calculateQiblaBearing(
    userLocation.lat, 
    userLocation.lng
  );
  
  // اعرض الموقع
  const locEl = document.getElementById('qiblaLocation');
  if (locEl) {
    locEl.textContent = userLocation.city || 'موقعك';
  }
  
  // اعرض زاوية القبلة
  const angleEl = document.getElementById('qiblaAngleValue');
  if (angleEl) {
    angleEl.textContent = Math.round(qiblaState.qiblaBearing) + '°';
  }
  
  // ابدأ تشغيل البوصلة
  await initCompass();
}

// ═══════════════════════════════════════════════════════════
// 📱 تشغيل حساس البوصلة
// ═══════════════════════════════════════════════════════════
async function initCompass() {
  // تحقق من دعم الجهاز
  if (!window.DeviceOrientationEvent && !window.DeviceOrientationAbsoluteEvent) {
    showQiblaError(
      'جهازك لا يدعم البوصلة',
      'يمكنك رؤية زاوية القبلة فقط: ' + Math.round(qiblaState.qiblaBearing) + '° من الشمال.'
    );
    return;
  }
  
  // iOS يحتاج طلب إذن
  if (typeof DeviceOrientationEvent.requestPermission === 'function') {
    try {
      const permission = await DeviceOrientationEvent.requestPermission();
      if (permission !== 'granted') {
        showQiblaError(
          'لم يتم السماح بالوصول للبوصلة',
          'افتح الإعدادات → Safari → الحركة والاتجاه → اسمح للتطبيق.'
        );
        return;
      }
      qiblaState.hasPermission = true;
    } catch (e) {
      console.error(e);
      showQiblaError('فشل طلب إذن البوصلة', e.message);
      return;
    }
  }
  
  // استمع لأحداث الاتجاه
  window.addEventListener('deviceorientationabsolute', handleOrientation, true);
  window.addEventListener('deviceorientation', handleOrientation, true);
  
  qiblaState.isSupported = true;
  qiblaState.active = true;
  
  updateQiblaStatus('جاري معايرة البوصلة...', 'compass');
}

// ═══════════════════════════════════════════════════════════
// 📐 معالجة اتجاه الجهاز
// ═══════════════════════════════════════════════════════════
function handleOrientation(event) {
  // زاوية البوصلة (0 = شمال، 90 = شرق...)
  let heading = null;
  
  // جرب webkitCompassHeading أولاً (iOS)
  if (event.webkitCompassHeading !== undefined && event.webkitCompassHeading !== null) {
    heading = event.webkitCompassHeading;
  }
  // ثم alpha (Android)
  else if (event.alpha !== null && event.alpha !== undefined) {
    // alpha يكون 0-360 لكن عكس اتجاه الساعة
    heading = 360 - event.alpha;
  }
  
  if (heading === null) return;
  
  // تنعيم القيمة (منع الاهتزاز)
  const now = Date.now();
  if (now - qiblaState.lastUpdate < 50) return; // 20 إطار/ثانية
  qiblaState.lastUpdate = now;
  
  // المتوسط المرجح
  const oldHeading = qiblaState.deviceHeading;
  let diff = heading - oldHeading;
  
  // معالجة الانتقال من 360 إلى 0
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  
  qiblaState.deviceHeading = (oldHeading + diff * 0.3 + 360) % 360;
  
  // حدّث البوصلة
  updateCompassDisplay();
}

// ═══════════════════════════════════════════════════════════
// 🎨 تحديث عرض البوصلة
// ═══════════════════════════════════════════════════════════
function updateCompassDisplay() {
  const compassRing = document.querySelector('.compass-ring');
  const qiblaArrow = document.getElementById('qiblaArrow');
  const statusEl = document.getElementById('qiblaStatus');
  const successEl = document.getElementById('qiblaSuccess');
  
  if (!compassRing || !qiblaArrow) return;
  
  const deviceHeading = qiblaState.deviceHeading;
  const qiblaBearing = qiblaState.qiblaBearing;
  
  // الحلقة: تدور عكس اتجاه الجهاز
  compassRing.style.transform = `rotate(${-deviceHeading}deg)`;
  
  // السهم: يشير للقبلة
  // الاتجاه النسبي للقبلة من أعلى الشاشة
  const relativeQibla = (qiblaBearing - deviceHeading + 360) % 360;
  qiblaArrow.style.transform = `rotate(${relativeQibla}deg)`;
  
  // احسب الفرق للاتجاه الحالي
  let diff = Math.abs(qiblaBearing - deviceHeading);
  if (diff > 180) diff = 360 - diff;
  
  // إذا كان الفرق أقل من 15 درجة → متجه للقبلة
  const isAligned = diff < 15;
  
  if (isAligned) {
    // متجه للقبلة
    if (statusEl) {
      statusEl.classList.add('aligned');
      statusEl.innerHTML = '<i class="fas fa-check-circle"></i><span>أنت متجه نحو القبلة</span>';
    }
    if (successEl) successEl.style.display = 'flex';
    
    // اهتزاز خفيف عند الاتجاه (مرة واحدة كل ثانيتين)
    if (navigator.vibrate && !window._lastVibrate) {
      window._lastVibrate = Date.now();
      navigator.vibrate(50);
    }
  } else {
    // غير متجه
    if (statusEl) {
      statusEl.classList.remove('aligned');
      const direction = relativeQibla < 180 ? 'يسار' : 'يمين';
      const amount = Math.round(relativeQibla < 180 ? relativeQibla : 360 - relativeQibla);
      statusEl.innerHTML = `<i class="fas fa-compass"></i><span>اتجه ${amount}° نحو ال${direction}</span>`;
    }
    if (successEl) successEl.style.display = 'none';
  }
}

// ═══════════════════════════════════════════════════════════
// 🔄 إعادة معايرة
// ═══════════════════════════════════════════════════════════
function recalibrateQibla() {
  if (!qiblaState.isSupported) {
    // أعد التهيئة
    initCompass();
    return;
  }
  
  showToast('🔄 حرّك هاتفك على شكل ∞ للمعايرة', 'info');
  
  // إعادة تهيئة المتغيرات
  qiblaState.deviceHeading = 0;
  qiblaState.lastUpdate = 0;
  
  // للـ iOS: أعد طلب الإذن
  if (typeof DeviceOrientationEvent.requestPermission === 'function') {
    DeviceOrientationEvent.requestPermission().then(() => {});
  }
}

// ═══════════════════════════════════════════════════════════
// 📍 تحديث موقع القبلة
// ═══════════════════════════════════════════════════════════
async function reloadQiblaLocation() {
  showToast('جاري تحديد موقعك...', 'info');
  await detectLocation();
  startQibla();
}

// ═══════════════════════════════════════════════════════════
// ⚠️ عرض خطأ
// ═══════════════════════════════════════════════════════════
function showQiblaError(title, message) {
  const container = document.querySelector('.compass-container');
  if (!container) return;
  
  container.innerHTML = `
    <div class="qibla-error">
      <i class="fas fa-exclamation-triangle"></i>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(message)}</p>
      <button class="btn-sm" onclick="startQibla()" style="margin-top:10px;">
        <i class="fas fa-redo"></i> إعادة المحاولة
      </button>
      ${qiblaState.qiblaBearing ? `
        <div style="margin-top:20px;padding:15px;background:var(--bg-hover);border-radius:12px;">
          <div style="font-size:32px;font-weight:800;color:var(--primary);direction:ltr;">
            ${Math.round(qiblaState.qiblaBearing)}°
          </div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:5px;">
            اتجاه القبلة من الشمال
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

function updateQiblaStatus(text, icon) {
  const el = document.getElementById('qiblaStatus');
  if (el) {
    el.innerHTML = `<i class="fas fa-${icon}"></i><span>${escapeHtml(text)}</span>`;
  }
}

// ═══════════════════════════════════════════════════════════
// 🎬 التهيئة عند فتح الصفحة
// ═══════════════════════════════════════════════════════════
async function initQiblaPage() {
  await startQibla();
}

console.log('🧭 tools.js (القبلة) تم التحميل');
