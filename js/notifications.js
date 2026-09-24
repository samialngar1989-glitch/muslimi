// ═══════════════════════════════════════════════════════════
// 🔔 إشعارات الأذان
// ═══════════════════════════════════════════════════════════

const NOTIF_CONFIG = {
  STORAGE_KEY: 'muslimi_notif_settings',
  DEFAULT: {
    enabled: false,
    timing: 0,
    prayers: {
      Fajr: true,
      Dhuhr: true,
      Asr: true,
      Maghrib: true,
      Isha: true
    }
  }
};

let notifSettings = { ...NOTIF_CONFIG.DEFAULT };
let scheduledTimeouts = [];

// ═══════════════════════════════════════════════════════════
// 📦 تحميل/حفظ الإعدادات
// ═══════════════════════════════════════════════════════════
function loadNotifSettings() {
  try {
    const saved = localStorage.getItem(NOTIF_CONFIG.STORAGE_KEY);
    if (saved) {
      notifSettings = { ...NOTIF_CONFIG.DEFAULT, ...JSON.parse(saved) };
    }
  } catch (e) {
    notifSettings = { ...NOTIF_CONFIG.DEFAULT };
  }
}

function persistNotifSettings() {
  localStorage.setItem(NOTIF_CONFIG.STORAGE_KEY, JSON.stringify(notifSettings));
}

// ═══════════════════════════════════════════════════════════
// 🔔 طلب إذن الإشعارات
// ═══════════════════════════════════════════════════════════
async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    showToast('متصفحك لا يدعم الإشعارات', 'error');
    return false;
  }
  
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') {
    showToast('الإشعارات محظورة — افتح إعدادات المتصفح', 'warning');
    return false;
  }
  
  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (e) {
    console.error(e);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════
// 🔄 تفعيل/إيقاف الإشعارات
// ═══════════════════════════════════════════════════════════
async function toggleNotifications() {
  const toggle = document.getElementById('notifToggle');
  const isEnabled = toggle.checked;
  
  if (isEnabled) {
    // طلب الإذن
    const granted = await requestNotificationPermission();
    
    if (!granted) {
      toggle.checked = false;
      return;
    }
    
    notifSettings.enabled = true;
    persistNotifSettings();
    
    // إظهار الخيارات
    document.getElementById('notifOptions').style.display = 'block';
    document.getElementById('notifStatusText').textContent = 'مفعّلة ✅';
    
    // جدولة الإشعارات
    scheduleAllNotifications();
    
    showToast('✅ تم تفعيل إشعارات الأذان', 'success');
    
    // إرسال إشعار ترحيبي
    setTimeout(() => {
      sendLocalNotification('تم تفعيل الإشعارات', {
        body: 'ستصلك تنبيهات الأذان في أوقات الصلاة',
        icon: getNotifIcon(),
        tag: 'welcome'
      });
    }, 1500);
    
  } else {
    notifSettings.enabled = false;
    persistNotifSettings();
    
    document.getElementById('notifOptions').style.display = 'none';
    document.getElementById('notifStatusText').textContent = 'غير مفعّلة';
    
    // إلغاء الجدولة
    clearAllSchedules();
    
    showToast('تم إيقاف الإشعارات', 'info');
  }
}

// ═══════════════════════════════════════════════════════════
// 💾 حفظ الإعدادات
// ═══════════════════════════════════════════════════════════
function saveNotifSettings() {
  // وقت التنبيه
  const timingInput = document.querySelector('input[name="notifTiming"]:checked');
  if (timingInput) notifSettings.timing = parseInt(timingInput.value);
  
  // الصلوات
  notifSettings.prayers = {};
  document.querySelectorAll('.prayer-notif').forEach(cb => {
    notifSettings.prayers[cb.value] = cb.checked;
  });
  
  persistNotifSettings();
  
  // إعادة الجدولة
  if (notifSettings.enabled) {
    scheduleAllNotifications();
  }
  
  showToast('✅ تم حفظ الإعدادات', 'success');
}

// ═══════════════════════════════════════════════════════════
// 🧪 إرسال إشعار تجريبي
// ═══════════════════════════════════════════════════════════
async function testNotification() {
  const granted = await requestNotificationPermission();
  if (!granted) return;
  
  sendLocalNotification('🕌 إشعار تجريبي', {
    body: 'هكذا ستظهر إشعارات الأذان بإذن الله',
    icon: getNotifIcon(),
    tag: 'test',
    requireInteraction: false
  });
  
  showToast('📬 تم إرسال الإشعار التجريبي', 'info');
}

// ═══════════════════════════════════════════════════════════
// 📅 جدولة الإشعارات
// ═══════════════════════════════════════════════════════════
function clearAllSchedules() {
  scheduledTimeouts.forEach(t => clearTimeout(t));
  scheduledTimeouts = [];
}

async function scheduleAllNotifications() {
  clearAllSchedules();
  
  if (!notifSettings.enabled) return;
  if (!prayerTimes) {
    // إذا لم تُحضّر المواقيت، انتظر ثم أعد
    setTimeout(scheduleAllNotifications, 3000);
    return;
  }
  
  const now = new Date();
  const prayerNames = {
    Fajr: 'الفجر',
    Dhuhr: 'الظهر',
    Asr: 'العصر',
    Maghrib: 'المغرب',
    Isha: 'العشاء'
  };
  
  Object.keys(notifSettings.prayers).forEach(prayerKey => {
    if (!notifSettings.prayers[prayerKey]) return;
    if (!prayerTimes[prayerKey]) return;
    
    const timeStr = prayerTimes[prayerKey];
    const [hours, minutes] = timeStr.split(':').map(n => parseInt(n));
    
    // وقت الصلاة اليوم
    const prayerTime = new Date();
    prayerTime.setHours(hours, minutes, 0, 0);
    
    // طرح وقت التنبيه (قبل الصلاة بـ X دقائق)
    const notifTime = new Date(prayerTime.getTime() - notifSettings.timing * 60 * 1000);
    
    // الفرق بالمللي ثانية
    let delay = notifTime.getTime() - now.getTime();
    
    // إذا مر الوقت، جدوِل للغد
    if (delay < 0) {
      delay += 24 * 60 * 60 * 1000;
    }
    
    // الحد الأقصى للتأخير (24 ساعة)
    if (delay > 24 * 60 * 60 * 1000) {
      delay = 24 * 60 * 60 * 1000;
    }
    
    // إرسال إشعار فوري إن أردت اختبار (للتصحيح)
    console.log(`⏰ ${prayerNames[prayerKey]}: تنبيه بعد ${Math.round(delay/1000/60)} دقيقة`);
    
    const timeoutId = setTimeout(() => {
      sendPrayerNotification(prayerKey, prayerNames[prayerKey]);
      
      // جدوِل لليوم التالي
      setTimeout(() => {
        scheduleAllNotifications();
      }, 60000); // بعد دقيقة
    }, delay);
    
    scheduledTimeouts.push(timeoutId);
  });
}

// ═══════════════════════════════════════════════════════════
// 📤 إرسال الإشعار
// ═══════════════════════════════════════════════════════════
function sendPrayerNotification(prayerKey, prayerName) {
  const timingText = notifSettings.timing > 0 
    ? `بعد ${notifSettings.timing} دقيقة` 
    : 'الآن';
  
  sendLocalNotification(`🕌 حان وقت صلاة ${prayerName}`, {
    body: `حان وقت صلاة ${prayerName} — ${timingText}`,
    icon: getNotifIcon(),
    badge: getNotifIcon(),
    tag: 'prayer-' + prayerKey,
    requireInteraction: true,
    vibrate: [200, 100, 200],
    data: { prayer: prayerKey, type: 'prayer' }
  });
}

function sendLocalNotification(title, options = {}) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  
  const defaults = {
    icon: getNotifIcon(),
    badge: getNotifIcon(),
    dir: 'rtl',
    lang: 'ar',
    vibrate: [200, 100, 200],
    silent: false
  };
  
  const finalOptions = { ...defaults, ...options };
  
  try {
    // جرّب من Service Worker أولاً (يعمل حتى مع إغلاق التطبيق)
    if (navigator.serviceWorker && navigator.serviceWorker.ready) {
      navigator.serviceWorker.ready.then(registration => {
        registration.showNotification(title, finalOptions);
      });
    } else {
      // احتياطي: من النافذة مباشرة
      new Notification(title, finalOptions);
    }
  } catch (e) {
    console.error('فشل الإشعار:', e);
  }
}

// ═══════════════════════════════════════════════════════════
// 🎨 أيقونة الإشعار
// ═══════════════════════════════════════════════════════════
function getNotifIcon() {
  return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxOTIgMTkyIj48cmVjdCB3aWR0aD0iMTkyIiBoZWlnaHQ9IjE5MiIgcng9IjM4IiBmaWxsPSIjMGQ1ZTRhIi8+PHRleHQgeD0iOTYiIHk9IjEyNSIgZm9udC1zaXplPSIxMTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiNkNGE3NDciPvCfjplIPC90ZXh0Pjwvc3ZnPg==';
}

// ═══════════════════════════════════════════════════════════
// 🎬 التهيئة
// ═══════════════════════════════════════════════════════════
async function initNotifications() {
  loadNotifSettings();
  
  const toggle = document.getElementById('notifToggle');
  if (!toggle) return;
  
  // تطبيق الإعدادات المحفوظة
  toggle.checked = notifSettings.enabled;
  
  if (notifSettings.enabled) {
    document.getElementById('notifOptions').style.display = 'block';
    document.getElementById('notifStatusText').textContent = 'مفعّلة ✅';
  }
  
  // تطبيق وقت التنبيه
  const timingInput = document.querySelector(`input[name="notifTiming"][value="${notifSettings.timing}"]`);
  if (timingInput) timingInput.checked = true;
  
  // تطبيق الصلوات
  document.querySelectorAll('.prayer-notif').forEach(cb => {
    cb.checked = !!notifSettings.prayers[cb.value];
  });
  
  // دعم النقر على الإشعار
  if (navigator.serviceWorker && navigator.serviceWorker.addEventListener) {
    navigator.serviceWorker.addEventListener('message', event => {
      if (event.data && event.data.type === 'NOTIFICATION_CLICK') {
        navigateTo('home');
      }
    });
  }
  
  // إعادة الجدولة عند تحميل المواقيت
  if (notifSettings.enabled) {
    setTimeout(scheduleAllNotifications, 5000);
  }
  
  console.log('🔔 notifications.js تم التحميل');
}

console.log('🔔 notifications.js جاهز');
