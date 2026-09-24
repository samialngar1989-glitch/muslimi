// ═══════════════════════════════════════════════════════════
// 📿 الأذكار والأدعية
// ═══════════════════════════════════════════════════════════

const ADHKAR_DATA = {
  morning: {
    title: 'أذكار الصباح',
    items: [
      { text: 'أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ. اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ...', count: 1 },
      { text: 'قُلْ هُوَ اللَّهُ أَحَدٌ ۝ اللَّهُ الصَّمَدُ ۝ لَمْ يَلِدْ وَلَمْ يُولَدْ ۝ وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ', count: 3 },
      { text: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ', count: 1 },
      { text: 'اللَّهُمَّ بِكَ أَصْبَحْنَا، وَبِكَ أَمْسَيْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ النُّشُورُ', count: 1 },
      { text: 'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَٰهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ بِذَنْبِي فَاغْفِرْ لِي', count: 1 },
      { text: 'رَضِيتُ بِاللَّهِ رَبًّا، وَبِالْإِسْلَامِ دِينًا، وَبِمُحَمَّدٍ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ نَبِيًّا', count: 3 },
      { text: 'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ', count: 3 },
      { text: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ', count: 100 },
      { text: 'لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ', count: 10 },
      { text: 'أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ', count: 100 }
    ]
  },
  evening: {
    title: 'أذكار المساء',
    items: [
      { text: 'أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ. اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ...', count: 1 },
      { text: 'قُلْ هُوَ اللَّهُ أَحَدٌ ۝ اللَّهُ الصَّمَدُ ۝ لَمْ يَلِدْ وَلَمْ يُولَدْ ۝ وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ', count: 3 },
      { text: 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ', count: 1 },
      { text: 'اللَّهُمَّ بِكَ أَمْسَيْنَا، وَبِكَ أَصْبَحْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ الْمَصِيرُ', count: 1 },
      { text: 'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ', count: 3 },
      { text: 'اللَّهُمَّ عَافِنِي فِي بَدَنِي، اللَّهُمَّ عَافِنِي فِي سَمْعِي، اللَّهُمَّ عَافِنِي فِي بَصَرِي، لَا إِلَٰهَ إِلَّا أَنْتَ', count: 3 },
      { text: 'حَسْبِيَ اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ، عَلَيْهِ تَوَكَّلْتُ، وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ', count: 7 },
      { text: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ', count: 100 },
      { text: 'أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ', count: 100 }
    ]
  },
  sleep: {
    title: 'أذكار النوم',
    items: [
      { text: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا', count: 1 },
      { text: 'اللَّهُمَّ قِنِي عَذَابَكَ يَوْمَ تَبْعَثُ عِبَادَكَ', count: 3 },
      { text: 'سُبْحَانَ اللَّهِ', count: 33 },
      { text: 'الْحَمْدُ لِلَّهِ', count: 33 },
      { text: 'اللَّهُ أَكْبَرُ', count: 34 },
      { text: 'آيَةُ الْكُرْسِيِّ: اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ...', count: 1 },
      { text: 'اللَّهُمَّ أَسْلَمْتُ نَفْسِي إِلَيْكَ، وَوَجَّهْتُ وَجْهِي إِلَيْكَ، وَفَوَّضْتُ أَمْرِي إِلَيْكَ', count: 1 }
    ]
  },
  prayer: {
    title: 'أذكار بعد الصلاة',
    items: [
      { text: 'أَسْتَغْفِرُ اللَّهَ', count: 3 },
      { text: 'اللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ، تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ', count: 1 },
      { text: 'سُبْحَانَ اللَّهِ', count: 33 },
      { text: 'الْحَمْدُ لِلَّهِ', count: 33 },
      { text: 'اللَّهُ أَكْبَرُ', count: 33 },
      { text: 'لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ', count: 1 },
      { text: 'آيَةُ الْكُرْسِيِّ', count: 1 },
      { text: 'اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ', count: 1 }
    ]
  }
};

// ═══════════════════════════════════════════════════════════
// 📿 عرض الأذكار
// ═══════════════════════════════════════════════════════════
function openAdhkar(type) {
  const data = ADHKAR_DATA[type];
  if (!data) return;
  
  currentAdhkarList = data.items;
  setText('adhkarModalTitle', data.title);
  
  const body = document.getElementById('adhkarBody');
  body.innerHTML = `<div class="adhkar-list">
    ${data.items.map((item, i) => `
      <div class="adhkar-item" onclick="markAdhkarRead(${i})" id="adhkar-${i}">
        <div class="adhkar-text">${escapeHtml(item.text)}</div>
        <div class="adhkar-footer">
          <span>التكرار</span>
          <span class="adhkar-count">${item.count}×</span>
        </div>
      </div>
    `).join('')}
  </div>`;
  
  document.getElementById('adhkarModal').classList.add('active');
}

function closeAdhkarModal() {
  document.getElementById('adhkarModal').classList.remove('active');
}

function markAdhkarRead(index) {
  const el = document.getElementById(`adhkar-${index}`);
  if (el) {
    el.style.opacity = '0.5';
    el.style.background = 'rgba(34,197,94,.1)';
    el.style.borderColor = 'var(--success)';
  }
}

// ═══════════════════════════════════════════════════════════
// 🔢 التسبيح الإلكتروني
// ═══════════════════════════════════════════════════════════
const TASBIH_TEXTS = {
  subhan: 'سبحان الله',
  hamd: 'الحمد لله',
  akbar: 'الله أكبر',
  tahlil: 'لا إله إلا الله',
  hawla: 'لا حول ولا قوة إلا بالله',
  salah: 'اللهم صلِّ على محمد'
};

function openTasbih() {
  // استرجاع العدد المحفوظ
  const saved = localStorage.getItem('tasbihTotal') || '0';
  setText('savedTasbih', Number(saved).toLocaleString('ar-EG'));
  
  tasbihCount = 0;
  updateTasbihDisplay();
  
  document.getElementById('tasbihModal').classList.add('active');
}

function closeTasbihModal() {
  document.getElementById('tasbihModal').classList.remove('active');
}

function incrementTasbih() {
  tasbihCount++;
  updateTasbihDisplay();
  
  // اهتزاز خفيف (إذا مدعوم)
  if (navigator.vibrate) navigator.vibrate(20);
}

function resetTasbih() {
  tasbihCount = 0;
  updateTasbihDisplay();
}

function updateTasbihDisplay() {
  setText('tasbihCount', tasbihCount);
  const type = document.getElementById('tasbihType').value;
  setText('tasbihText', TASBIH_TEXTS[type] || 'سبحان الله');
}

function saveTasbih() {
  if (tasbihCount === 0) {
    showToast('لم تسبّح بعد', 'warning');
    return;
  }
  
  const saved = Number(localStorage.getItem('tasbihTotal') || '0');
  localStorage.setItem('tasbihTotal', saved + tasbihCount);
  
  const newTotal = saved + tasbihCount;
  setText('savedTasbih', newTotal.toLocaleString('ar-EG'));
  
  showToast(`✅ تم حفظ ${tasbihCount} تسبيحة`, 'success');
  tasbihCount = 0;
  updateTasbihDisplay();
}

console.log('📿 adhkar.js تم التحميل');
