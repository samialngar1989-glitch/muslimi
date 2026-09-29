// ═══════════════════════════════════════════════════════════
// 💰 حاسبة الزكاة - أنواع متعددة
// ═══════════════════════════════════════════════════════════

// حالة الحاسبة
let zakatState = {
  currentType: 'money',
  prices: {
    gold: 35000,   // سعر جرام الذهب بالريال اليمني
    silver: 420    // سعر جرام الفضة بالريال اليمني
  }
};

// نصب الزكاة الثابتة
const NISAB = {
  goldGrams: 85,        // 20 مثقال × 4.25 جرام
  silverGrams: 595,     // 200 درهم × 2.975 جرام
  cropsKg: 653,         // 5 أوسق × 130.6 كجم
  rate: 0.025           // 2.5%
};

// ═══════════════════════════════════════════════════════════
// 🎨 تبديل بين أنواع الزكاة
// ═══════════════════════════════════════════════════════════
function switchZakat(type) {
  zakatState.currentType = type;
  
  // تحديث التبويبات
  document.querySelectorAll('.zakat-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.zakat === type);
  });
  
  // تحديث الألواح
  document.querySelectorAll('.zakat-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === 'zakat-' + type);
  });
  
  // تمرير للأعلى
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ═══════════════════════════════════════════════════════════
// 💰 1. زكاة المال
// ═══════════════════════════════════════════════════════════
function calcZakatMoney() {
  const amount = parseFloat(document.getElementById('moneyAmount').value) || 0;
  const goldPrice = parseFloat(document.getElementById('goldPrice').value) || 0;
  
  const nisabMoney = NISAB.goldGrams * goldPrice;
  
  // تحديث النصاب
  setText('nisabMoney', formatNum(nisabMoney) + ' ر.ي');
  
  // حالة المال
  const statusEl = document.getElementById('moneyStatus');
  if (amount <= 0) {
    statusEl.textContent = '—';
    statusEl.style.color = 'var(--text-muted)';
  } else if (amount < nisabMoney) {
    statusEl.textContent = 'أقل من النصاب ❌';
    statusEl.style.color = 'var(--warning)';
  } else {
    statusEl.textContent = 'بلغ النصاب ✅';
    statusEl.style.color = 'var(--success)';
  }
  
  // الزكاة
  const resultBox = document.getElementById('moneyResult');
  if (amount >= nisabMoney && amount > 0) {
    const zakat = amount * NISAB.rate;
    setText('moneyZakat', formatNum(Math.round(zakat)) + ' ر.ي');
    resultBox.style.display = 'block';
    resultBox.classList.remove('zakat-below-nisab');
  } else {
    resultBox.style.display = 'none';
  }
}

// ═══════════════════════════════════════════════════════════
// 💍 2. زكاة الذهب
// ═══════════════════════════════════════════════════════════
function calcZakatGold() {
  const weight = parseFloat(document.getElementById('goldWeight').value) || 0;
  const type = document.getElementById('goldType').value;
  
  const statusEl = document.getElementById('goldStatus');
  const resultBox = document.getElementById('goldResult');
  
  // حالة الوزن
  if (weight <= 0) {
    statusEl.textContent = '—';
    statusEl.style.color = 'var(--text-muted)';
  } else if (weight < NISAB.goldGrams) {
    statusEl.textContent = 'أقل من النصاب ❌';
    statusEl.style.color = 'var(--warning)';
  } else {
    statusEl.textContent = 'بلغ النصاب ✅';
    statusEl.style.color = 'var(--success)';
  }
  
  // الحساب
  if (weight >= NISAB.goldGrams && weight > 0) {
    const zakat = weight * NISAB.rate;
    setText('goldZakat', zakat.toFixed(2) + ' جرام');
    resultBox.style.display = 'block';
    resultBox.classList.remove('zakat-below-nisab');
    
    // إضافة تحذير إن كان حليًا للاستعمال
    if (type === 'jewelry') {
      showJewelryNote('goldResult');
    } else {
      removeJewelryNote('goldResult');
    }
  } else {
    resultBox.style.display = 'none';
  }
}

// ═══════════════════════════════════════════════════════════
// 🥈 3. زكاة الفضة
// ═══════════════════════════════════════════════════════════
function calcZakatSilver() {
  const weight = parseFloat(document.getElementById('silverWeight').value) || 0;
  
  const statusEl = document.getElementById('silverStatus');
  const resultBox = document.getElementById('silverResult');
  
  // حالة الوزن
  if (weight <= 0) {
    statusEl.textContent = '—';
    statusEl.style.color = 'var(--text-muted)';
  } else if (weight < NISAB.silverGrams) {
    statusEl.textContent = 'أقل من النصاب ❌';
    statusEl.style.color = 'var(--warning)';
  } else {
    statusEl.textContent = 'بلغ النصاب ✅';
    statusEl.style.color = 'var(--success)';
  }
  
  // الحساب
  if (weight >= NISAB.silverGrams && weight > 0) {
    const zakat = weight * NISAB.rate;
    setText('silverZakat', zakat.toFixed(2) + ' جرام');
    resultBox.style.display = 'block';
    resultBox.classList.remove('zakat-below-nisab');
  } else {
    resultBox.style.display = 'none';
  }
}

// ═══════════════════════════════════════════════════════════
// 🏪 4. زكاة التجارة
// ═══════════════════════════════════════════════════════════
function calcZakatTrade() {
  const goods = parseFloat(document.getElementById('tradeGoods').value) || 0;
  const cash = parseFloat(document.getElementById('tradeCash').value) || 0;
  const debts = parseFloat(document.getElementById('tradeDebts').value) || 0;
  const goldPrice = parseFloat(document.getElementById('tradeGoldPrice').value) || 0;
  
  // صافي المال الخاضع للزكاة
  const net = (goods + cash) - debts;
  const nisab = NISAB.goldGrams * goldPrice;
  
  setText('tradeNet', formatNum(Math.max(0, Math.round(net))) + ' ر.ي');
  setText('tradeNisab', formatNum(Math.round(nisab)) + ' ر.ي');
  
  // الزكاة
  const resultBox = document.getElementById('tradeResult');
  
  if (net >= nisab && net > 0) {
    const zakat = net * NISAB.rate;
    setText('tradeZakat', formatNum(Math.round(zakat)) + ' ر.ي');
    resultBox.style.display = 'block';
    resultBox.classList.remove('zakat-below-nisab');
  } else if (net > 0) {
    // أقل من النصاب
    setText('tradeZakat', 'لا تجب الزكاة — أقل من النصاب');
    resultBox.style.display = 'block';
    resultBox.classList.add('zakat-below-nisab');
  } else {
    resultBox.style.display = 'none';
  }
}

// ═══════════════════════════════════════════════════════════
// 🌾 5. زكاة الزروع
// ═══════════════════════════════════════════════════════════
function calcZakatCrops() {
  const weight = parseFloat(document.getElementById('cropWeight').value) || 0;
  const irrigation = document.getElementById('cropIrrigation').value;
  
  const statusEl = document.getElementById('cropsStatus');
  const resultBox = document.getElementById('cropsResult');
  
  // حالة الوزن
  if (weight <= 0) {
    statusEl.textContent = '—';
    statusEl.style.color = 'var(--text-muted)';
  } else if (weight < NISAB.cropsKg) {
    statusEl.textContent = 'أقل من النصاب ❌';
    statusEl.style.color = 'var(--warning)';
  } else {
    statusEl.textContent = 'بلغ النصاب ✅';
    statusEl.style.color = 'var(--success)';
  }
  
  // الحساب
  if (weight >= NISAB.cropsKg && weight > 0) {
    // 10% بماء المطر، 5% بالسقي
    const rate = irrigation === 'rain' ? 0.10 : 0.05;
    const zakat = weight * rate;
    setText('cropsZakat', zakat.toFixed(2) + ' كجم');
    resultBox.style.display = 'block';
    resultBox.classList.remove('zakat-below-nisab');
  } else {
    resultBox.style.display = 'none';
  }
}

// ═══════════════════════════════════════════════════════════
// 🛠️ دوال مساعدة
// ═══════════════════════════════════════════════════════════

// تنسيق الأرقام
function formatNum(num) {
  const n = Number(num) || 0;
  return n.toLocaleString('en-US');
}

// إظهار ملاحظة الحلي
function showJewelryNote(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  let note = container.querySelector('.jewelry-note');
  if (!note) {
    note = document.createElement('div');
    note.className = 'jewelry-note';
    note.style.cssText = `
      margin-top: 12px;
      padding: 10px;
      background: rgba(245,158,11,.1);
      border-right: 3px solid var(--warning);
      border-radius: 8px;
      font-size: 12px;
      color: var(--text-muted);
      line-height: 1.6;
      text-align: right;
    `;
    note.innerHTML = `
      <i class="fas fa-info-circle" style="color:var(--warning);"></i>
      <strong style="color:var(--warning);">ملاحظة:</strong> 
      الحلي المستعملة للزينة لا تجب فيها الزكاة عند جمهور الفقهاء، 
      إلا إذا بلغت نصابًا وكانت للادخار أو التجارة.
    `;
    container.appendChild(note);
  }
}

function removeJewelryNote(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const note = container.querySelector('.jewelry-note');
  if (note) note.remove();
}

// ═══════════════════════════════════════════════════════════
// 🎬 التهيئة
// ═══════════════════════════════════════════════════════════
function initZakat() {
  console.log('💰 تهيئة حاسبة الزكاة...');
  
  // قيم افتراضية
  const goldPriceInput = document.getElementById('goldPrice');
  const tradeGoldPriceInput = document.getElementById('tradeGoldPrice');
  
  // استرجاع سعر الذهب المحفوظ
  const savedGoldPrice = localStorage.getItem('zakat_gold_price');
  if (savedGoldPrice) {
    if (goldPriceInput) goldPriceInput.value = savedGoldPrice;
    if (tradeGoldPriceInput) tradeGoldPriceInput.value = savedGoldPrice;
    zakatState.prices.gold = parseFloat(savedGoldPrice);
  }
  
  // حفظ سعر الذهب عند التغيير
  if (goldPriceInput) {
    goldPriceInput.addEventListener('change', () => {
      const price = goldPriceInput.value;
      localStorage.setItem('zakat_gold_price', price);
      zakatState.prices.gold = parseFloat(price);
    });
  }
  
  // تهيئة الحاسبة الافتراضية (المال)
  calcZakatMoney();
  
  console.log('✅ حاسبة الزكاة جاهزة');
}

// ═══════════════════════════════════════════════════════════
// 🔄 إعادة التعيين (اختياري)
// ═══════════════════════════════════════════════════════════
function resetZakat() {
  document.querySelectorAll('.zakat-panel input').forEach(input => {
    if (input.type === 'number') input.value = '';
  });
  
  document.querySelectorAll('.zakat-result').forEach(box => {
    box.style.display = 'none';
  });
  
  ['nisabMoney', 'moneyStatus', 'goldStatus', 'silverStatus', 'tradeNet', 'tradeNisab', 'cropsStatus'].forEach(id => {
    setText(id, '—');
  });
  
  showToast('تم إعادة تعيين الحاسبة', 'info');
}

console.log('💰 zakat.js تم التحميل');
