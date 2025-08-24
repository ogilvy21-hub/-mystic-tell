// MysticTell - 정리된 JavaScript 코드
// 중복 제거 및 구조 개선

// ===========================================
// 1. 전역 변수 및 헬퍼 함수
// ===========================================

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const LS_KEY = 'mystictell_recent_results';

// ===========================================
// 2. 유틸리티 함수들
// ===========================================

// 입력 정규화
function normalizeDateInput(s = '') {
    return s.trim().replace(/[.\s]+/g, '-').replace(/-+/g, '-').replace(/-$/, '');
}

function normalizeTimeInput(s = '') {
    s = s.trim();
    const am = /오전/.test(s);
    const pm = /오후/.test(s);
    s = s.replace(/[^\d:]/g, '');
    if (!s) return '';
    let [hh, mm = '0'] = s.split(':');
    let h = parseInt(hh || '0', 10);
    if (pm && h < 12) h += 12;
    if (am && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

// 로컬스토리지 관리
function pushRecent(item) {
    try {
        const arr = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
        arr.unshift({ ...item, ts: Date.now() });
        localStorage.setItem(LS_KEY, JSON.stringify(arr.slice(0, 20)));
    } catch (e) {
        console.warn('LocalStorage error:', e);
    }
}

// ===========================================
// 3. 스플래시 화면 관리 (단순화)
// ===========================================

function hideSplash() {
    const splash = $('#splashScreen');
    const main = $('#mainContent');
    const nav = $('#bottomNav');

    if (splash) {
        splash.style.display = 'none';
        splash.classList.add('hidden');
    }
    if (main) {
        main.style.display = 'block';
        main.classList.add('show');
    }
    if (nav) {
        nav.style.display = 'flex';
        nav.classList.add('show');
    }
}

// ===========================================
// 4. 네비게이션 및 라우팅
// ===========================================

const pages = {
    home: () => $('#page-home'),
    fortune: () => $('#page-fortune'),
    chat: () => $('#page-chat'),
    me: () => $('#page-me')
};

const views = {
    'fortune-today': $('#view-today'),
    'fortune-saju': $('#view-saju'),
    'fortune-tarot': $('#view-tarot'),
    'fortune-palm': $('#view-palm'),
    'fortune-match': $('#view-match'),
    'fortune-year': $('#view-year'),
    'fortune-lotto': $('#view-lotto')
};

function setActiveTab(tab) {
    // 탭 활성화
    $$('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.tab === tab));
    
    // 페이지 표시
    Object.entries(pages).forEach(([k, pageGetter]) => {
        const page = pageGetter();
        if (page) {
            page.classList.toggle('show', k === tab);
            page.style.display = k === tab ? 'block' : 'none';
        }
    });
    
    closeAllOverlays();
}

function showFortuneView(route) {
    const fortuneTitle = $('#fortuneTitle');
    
    // 모든 뷰 숨기기
    Object.values(views).forEach(v => {
        if (v) v.style.display = 'none';
    });
    
    // 선택된 뷰 표시
    const viewElement = views[route];
    if (viewElement) {
        viewElement.style.display = 'block';
    }
    
    // 제목 설정
    const titles = {
        'fortune-today': '오늘의 운세',
        'fortune-saju': '정통 사주',
        'fortune-tarot': '타로 점',
        'fortune-palm': '손금 보기',
        'fortune-match': '궁합 보기',
        'fortune-year': '신년 운세 (2025)',
        'fortune-lotto': '행운번호'
    };
    
    if (fortuneTitle) {
        fortuneTitle.textContent = titles[route] || '준비중';
    }
    
    // 특별 초기화
    switch (route) {
        case 'fortune-today':
            bindCalToggle('today');
            break;
        case 'fortune-saju':
            bindCalToggle('saju');
            break;
        case 'fortune-tarot':
            initializeTarot();
            break;
        case 'fortune-palm':
            setTimeout(() => initializePalmReading(), 50);
            break;
    }
    
    reactCrystal(`${titles[route] || '서비스'}를 준비합니다...`);
}

// ===========================================
// 5. 라우팅 핸들러 (단일 버전)
// ===========================================

function routeFromHash() {
    const hash = location.hash || '#/home';
    const match = hash.match(/^#\/([^/]+)(?:\/([^/]+))?/);
    const tab = match?.[1] || 'home';
    const sub = match?.[2] || '';

    // 탭 설정
    if (['home', 'fortune', 'chat', 'me'].includes(tab)) {
        setActiveTab(tab);
    } else {
        setActiveTab('home');
    }

    // 운세 서브뷰 설정
    if (tab === 'fortune') {
        const viewMap = {
            'today': 'fortune-today',
            'saju': 'fortune-saju',
            'tarot': 'fortune-tarot',
            'palm': 'fortune-palm',
            'match': 'fortune-match',
            'year': 'fortune-year',
            'lotto': 'fortune-lotto'
        };
        showFortuneView(viewMap[sub] || 'fortune-today');
    }
}

// ===========================================
// 6. 시트 및 모달 관리 (단순화)
// ===========================================

const sheet = $('#sheetBackdrop');
const sheetTitle = $('#sheetTitle');
const sheetContent = $('#sheetContent');
let lastResult = null;

function openSheet(title, content, savePayload) {
    if (!sheet || !sheetTitle || !sheetContent) return;
    
    sheetTitle.textContent = title;
    
    if (typeof content === 'string' && content.includes('<')) {
        sheetContent.innerHTML = content;
    } else {
        sheetContent.textContent = content?.toString?.() || '';
    }
    
    sheet.classList.add('show');
    lastResult = savePayload || null;
    document.body.style.overflow = 'hidden';
}

function closeSheet() {
    if (!sheet) return;
    sheet.classList.remove('show');
    document.body.style.overflow = '';
}

function closeAllOverlays() {
    closeSheet();
    closeTarotModal();
}

// ===========================================
// 7. 크리스탈 반응 효과
// ===========================================

function reactCrystal(text) {
    const crystal = $('#mainCrystal');
    if (!crystal) return;
    
    crystal.style.background = 'radial-gradient(circle at 30% 30%, rgba(255,215,0,.9), rgba(255,20,147,.7), rgba(138,43,226,.5))';
    crystal.innerHTML = '🔮<br>분석중...';
    
    setTimeout(() => {
        crystal.innerHTML = text || '✨ 준비중입니다...';
    }, 800);
    
    setTimeout(() => {
        crystal.style.background = 'radial-gradient(circle at 30% 30%, rgba(255,255,255,.8), rgba(255,255,255,.3), transparent)';
        crystal.innerHTML = '구슬 속 미래를<br>확인해보세요';
    }, 2800);
}

// ===========================================
// 8. 캘린더 토글 기능
// ===========================================

function getCalMode(prefix) {
    return $(`#${prefix}-cal-lunar`)?.checked ? 'lunar' : 'solar';
}

function getLeap(prefix) {
    return !!$(`#${prefix}-leap`)?.checked;
}

function bindCalToggle(prefix) {
    const solar = $(`#${prefix}-cal-solar`);
    const lunar = $(`#${prefix}-cal-lunar`);
    const leap = $(`#${prefix}-leap`);
    
    if (!leap) return;
    
    const sync = () => {
        leap.disabled = !lunar?.checked;
        leap.parentElement.style.opacity = leap.disabled ? 0.5 : 1;
    };
    
    solar?.addEventListener('change', sync);
    lunar?.addEventListener('change', sync);
    sync();
}

// ===========================================
// 9. 사주 관련 데이터 및 함수들
// ===========================================

// 천간 → 오행
const GAN_WUXING = {
    '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土', '己': '土',
    '庚': '金', '辛': '金', '壬': '水', '癸': '水'
};

// 지지 → 장간 가중치
const ZHI_HIDDENS = {
    '子': { '癸': 100 }, '丑': { '己': 70, '癸': 10, '辛': 20 },
    '寅': { '甲': 60, '丙': 20, '戊': 20 }, '卯': { '乙': 100 },
    '辰': { '戊': 70, '乙': 10, '癸': 20 }, '巳': { '丙': 60, '庚': 20, '戊': 20 },
    '午': { '丁': 90, '己': 10 }, '未': { '己': 70, '丁': 10, '乙': 20 },
    '申': { '庚': 70, '戊': 20, '壬': 10 }, '酉': { '辛': 100 },
    '戌': { '戊': 70, '辛': 20, '丁': 10 }, '亥': { '壬': 90, '甲': 10 }
};

// 오행 정보
const WUXING_INFO = {
    '木': { ko: '목', trait: '성장·기획·창의', boost: '푸른색, 숲길 걷기, 신선 채소, 새 프로젝트 시작', color: '#4caf50' },
    '火': { ko: '화', trait: '열정·표현·리더십', boost: '햇빛, 가벼운 유산소, 발표/공개 활동, 따뜻한 색', color: '#f44336' },
    '土': { ko: '토', trait: '안정·신뢰·실행', boost: '정리/정돈, 루틴 만들기, 노란/갈색, 땅 밟기', color: '#ff9800' },
    '金': { ko: '금', trait: '규칙·분석·재정', boost: '화이트/메탈, 구조화, 재무정리, 가벼운 근력운동', color: '#9e9e9e' },
    '水': { ko: '수', trait: '유연·학습·소통', boost: '블루/블랙, 독서/연구, 호흡/수분, 산책', color: '#2196f3' }
};

// ===========================================
// 10. 운세 데이터 및 계산 함수들
// ===========================================

const FORTUNE_CATEGORIES = {
    total: {
        name: '총운',
        icon: '🌟',
        messages: {
            90: ['오늘은 모든 일이 술술 풀리는 최고의 날입니다!', '행운의 여신이 함께하는 특별한 하루가 될 것입니다!'],
            80: ['긍정적인 에너지가 넘치는 좋은 날입니다!', '작은 기적들이 일어날 수 있는 날입니다!'],
            70: ['안정적이고 평화로운 하루가 될 것입니다!', '차근차근 진행하면 좋은 성과를 얻을 수 있습니다!'],
            60: ['조금만 더 노력하면 원하는 결과를 얻을 수 있습니다!', '인내심을 갖고 꾸준히 나아가세요!'],
            50: ['현상 유지하며 안전하게 지내는 것이 좋겠습니다!', '급하게 서두르지 말고 신중하게 판단하세요!'],
            40: ['조심스럽게 행동하고 신중한 결정을 내리세요!', '작은 일부터 차근차근 해결해나가세요!'],
            30: ['오늘은 무리하지 말고 여유롭게 지내세요!', '스트레스를 줄이고 마음의 평화를 찾으세요!']
        }
    },
    love: {
        name: '연애운',
        icon: '💕',
        messages: {
            90: ['운명적인 만남이 기다리고 있을지도 몰라요!', '사랑하는 사람과의 관계가 한층 더 깊어질 것입니다!'],
            80: ['달콤한 사랑의 기운이 가득한 하루입니다!', '좋아하는 사람과의 거리가 가까워질 것입니다!'],
            70: ['따뜻한 마음을 나누는 평온한 연애운입니다!', '서로를 이해하고 배려하는 시간을 가져보세요!'],
            60: ['조금 더 적극적으로 마음을 표현해보세요!', '상대방의 입장에서 생각해보는 것이 중요합니다!'],
            50: ['섣부른 고백보다는 천천히 관계를 발전시키세요!', '감정적인 판단보다는 이성적인 접근이 필요합니다!'],
            40: ['연애보다는 자기계발에 집중하는 것이 좋겠습니다!', '갈등이 생길 수 있으니 말조심하세요!'],
            30: ['오늘은 연애 문제로 스트레스받지 마세요!', '친구들과의 시간을 더 소중히 여기세요!']
        }
    },
    money: {
        name: '재물운',
        icon: '💰',
        messages: {
            90: ['예상치 못한 수입이나 보너스가 있을 수 있습니다!', '투자나 사업에서 큰 성과를 거둘 것입니다!'],
            80: ['돈 관리를 잘하면 목돈을 만들 수 있을 것입니다!', '부업이나 사이드 프로젝트에서 수익이 생길 수 있습니다!'],
            70: ['안정적인 수입과 지출 관리가 이루어질 것입니다!', '계획적인 저축으로 미래를 준비하세요!'],
            60: ['가계부를 작성하며 돈의 흐름을 파악해보세요!', '불필요한 지출을 줄이는 것이 중요합니다!'],
            50: ['큰 지출은 피하고 현상 유지에 집중하세요!', '충동구매를 자제하고 신중하게 소비하세요!'],
            40: ['돈 문제로 스트레스받지 않도록 주의하세요!', '대출이나 투자는 신중하게 결정하세요!'],
            30: ['오늘은 지갑을 단단히 닫아두세요!', '금전 거래는 최대한 피하는 것이 좋겠습니다!']
        }
    },
    health: {
        name: '건강운',
        icon: '🏥',
        messages: {
            90: ['몸과 마음이 최상의 컨디션을 유지할 것입니다!', '새로운 운동이나 건강관리 방법을 시작하기 좋은 날입니다!'],
            80: ['규칙적인 생활로 건강이 더욱 좋아질 것입니다!', '가벼운 운동이나 산책이 큰 도움이 될 것입니다!'],
            70: ['전반적으로 안정된 건강 상태를 유지할 것입니다!', '충분한 수면과 휴식을 취하세요!'],
            60: ['컨디션 관리에 더욱 신경써야 할 때입니다!', '무리한 운동보다는 가벼운 활동이 좋겠습니다!'],
            50: ['과로하지 말고 적당한 휴식을 취하세요!', '균형잡힌 식사와 충분한 수분 섭취가 중요합니다!'],
            40: ['몸의 신호를 잘 들어보고 무리하지 마세요!', '술, 담배, 카페인 섭취를 줄이는 것이 좋겠습니다!'],
            30: ['오늘은 몸조리에 집중하는 것이 최우선입니다!', '무리한 활동은 피하고 푹 쉬세요!']
        }
    },
    work: {
        name: '직장운',
        icon: '💼',
        messages: {
            90: ['승진이나 좋은 소식이 있을 수 있는 날입니다!', '새로운 프로젝트에서 큰 성과를 거둘 것입니다!'],
            80: ['업무 능력이 인정받아 칭찬을 들을 수 있습니다!', '새로운 기회나 제안이 들어올 수 있습니다!'],
            70: ['안정적이고 효율적으로 업무를 처리할 수 있습니다!', '팀워크가 좋아져 프로젝트가 순조롭게 진행될 것입니다!'],
            60: ['조금 더 집중하면 원하는 성과를 얻을 수 있습니다!', '상사나 동료와의 소통을 늘려보세요!'],
            50: ['현재 맡은 일에 충실하며 실수하지 않도록 주의하세요!', '급한 결정보다는 신중한 판단이 필요합니다!'],
            40: ['업무상 갈등이나 오해가 생길 수 있으니 조심하세요!', '중요한 미팅이나 발표는 피하는 것이 좋겠습니다!'],
            30: ['오늘은 새로운 일을 시작하지 말고 현상 유지하세요!', '스트레스를 받는 업무는 내일로 미루는 것이 좋겠습니다!']
        }
    },
    study: {
        name: '학업운',
        icon: '📚',
        messages: {
            90: ['집중력이 최고조에 달해 어려운 공부도 술술 풀릴 것입니다!', '시험이나 발표에서 뛰어난 성과를 거둘 것입니다!'],
            80: ['학습 효율이 높아져 많은 것을 배울 수 있을 것입니다!', '궁금했던 문제들이 명쾌하게 해결될 것입니다!'],
            70: ['꾸준한 학습으로 실력이 향상될 것입니다!', '복습을 통해 기초를 더욱 탄탄히 다질 수 있습니다!'],
            60: ['조금 더 집중하면 원하는 성과를 얻을 수 있습니다!', '어려운 부분은 선생님이나 친구에게 도움을 요청하세요!'],
            50: ['무리하지 말고 자신의 페이스에 맞춰 공부하세요!', '암기보다는 이해 위주의 학습이 효과적일 것입니다!'],
            40: ['집중력이 떨어질 수 있으니 짧은 시간씩 공부하세요!', '중요한 시험이나 과제는 다시 한번 점검해보세요!'],
            30: ['오늘은 공부보다는 휴식을 취하는 것이 좋겠습니다!', '무리한 학습은 피하고 가벼운 독서 정도만 하세요!']
        }
    }
};

// 럭키 아이템 데이터
const LUCKY_ITEMS = {
    items: ['반지', '목걸이', '시계', '향수', '립밤', '차키', '지갑', '스마트폰 케이스'],
    colors: ['빨강', '파랑', '노랑', '초록', '보라', '분홍', '하늘색', '주황'],
    numbers: ['3', '7', '9', '12', '21', '27', '33', '42'],
    directions: ['동쪽', '서쪽', '남쪽', '북쪽', '동남쪽', '동북쪽', '서남쪽', '서북쪽']
};

// 오늘의 운세 계산
function calcEnhancedDailyFortune(birthdate) {
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
    const results = {};

    Object.keys(FORTUNE_CATEGORIES).forEach((category, index) => {
        const seed = (birthdate || '').replaceAll('-', '') + dateStr + category + index;
        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
            hash = (hash * 37 + seed.charCodeAt(i)) % 100000;
        }
        const score = Math.abs(hash) % 100;

        let messageKey = 30;
        if (score >= 85) messageKey = 90;
        else if (score >= 75) messageKey = 80;
        else if (score >= 65) messageKey = 70;
        else if (score >= 55) messageKey = 60;
        else if (score >= 45) messageKey = 50;
        else if (score >= 35) messageKey = 40;

        const messages = FORTUNE_CATEGORIES[category].messages[messageKey];
        const messageIndex = Math.abs(hash) % messages.length;

        results[category] = {
            name: FORTUNE_CATEGORIES[category].name,
            icon: FORTUNE_CATEGORIES[category].icon,
            score: score,
            message: messages[messageIndex]
        };
    });

    // 럭키 아이템 생성
    const luckyHash = birthdate.replaceAll('-', '') + dateStr + 'lucky';
    let lHash = 0;
    for (let i = 0; i < luckyHash.length; i++) {
        lHash = (lHash * 41 + luckyHash.charCodeAt(i)) % 100000;
    }

    return {
        categories: results,
        lucky: {
            item: LUCKY_ITEMS.items[Math.abs(lHash) % LUCKY_ITEMS.items.length],
            color: LUCKY_ITEMS.colors[Math.abs(lHash + 1) % LUCKY_ITEMS.colors.length],
            number: LUCKY_ITEMS.numbers[Math.abs(lHash + 2) % LUCKY_ITEMS.numbers.length],
            direction: LUCKY_ITEMS.directions[Math.abs(lHash + 3) % LUCKY_ITEMS.directions.length]
        },
        date: dateStr
    };
}

// ===========================================
// 11. 결과 렌더링 함수들
// ===========================================

function createResultCard(icon, title, value, description, isMain = false, cardType = '') {
    let cardClass = 'result-card';
    if (isMain) cardClass += ' main-result';
    if (cardType) cardClass += ' ' + cardType;

    return `
    <div class="${cardClass}">
        <div class="card-header">
            <div class="card-icon">${icon}</div>
            <div class="card-title">${title}</div>
        </div>
        <div class="card-value">${value}</div>
        <div class="card-description">${description}</div>
    </div>
    `;
}

function renderEnhancedDailyFortune(fortuneData, name = '') {
    const nameTitle = name ? `<b>${name}</b>님의 ` : '';

    let html = `
    <div class="result-section">
        <div class="section-title-result">🌟 ${nameTitle}오늘의 운세</div>
        <div class="fortune-date">📅 ${fortuneData.date}</div>
    </div>
    `;

    // 각 카테고리별 운세 카드
    html += '<div class="result-section">';
    Object.values(fortuneData.categories).forEach((category, index) => {
        const isMainCard = index === 0;
        html += createResultCard(
            category.icon,
            category.name,
            `${category.score}점`,
            category.message,
            isMainCard,
            'fortune-card'
        );
    });
    html += '</div>';

    // 럭키 정보 섹션
    html += `
    <div class="result-section">
        <div class="section-title-result">🍀 오늘의 럭키 아이템</div>
        <div class="lucky-items-grid">
            <div class="lucky-item-card">
                <div class="lucky-icon">🎁</div>
                <div class="lucky-label">럭키 아이템</div>
                <div class="lucky-value">${fortuneData.lucky.item}</div>
            </div>
            <div class="lucky-item-card">
                <div class="lucky-icon">🎨</div>
                <div class="lucky-label">럭키 컬러</div>
                <div class="lucky-value">${fortuneData.lucky.color}</div>
            </div>
            <div class="lucky-item-card">
                <div class="lucky-icon">🔢</div>
                <div class="lucky-label">럭키 넘버</div>
                <div class="lucky-value">${fortuneData.lucky.number}</div>
            </div>
            <div class="lucky-item-card">
                <div class="lucky-icon">🧭</div>
                <div class="lucky-label">럭키 방향</div>
                <div class="lucky-value">${fortuneData.lucky.direction}</div>
            </div>
        </div>
    </div>
    `;

    return html;
}

// ===========================================
// 12. 로또 번호 생성
// ===========================================

function generateLottoNumbers(birthStr = '') {
    const today = new Date();
    const weekKey = getISOWeek(today);
    const seed = weekKey + (birthStr || '');
    
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = (hash * 31 + seed.charCodeAt(i)) & 0x7fffffff;
    }
    
    const rng = seededRandom(hash);
    const numbers = [];
    
    while (numbers.length < 6) {
        const num = Math.floor(rng() * 45) + 1;
        if (!numbers.includes(num)) {
            numbers.push(num);
        }
    }
    
    const bonus = Math.floor(rng() * 45) + 1;
    
    return {
        main: numbers.sort((a, b) => a - b),
        bonus: bonus,
        seedInfo: `주 ${weekKey}${birthStr ? ` · ${birthStr}` : ''}`
    };
}

function seededRandom(seed) {
    let state = seed;
    return function() {
        state = (state * 1664525 + 1013904223) >>> 0;
        return state / 0xFFFFFFFF;
    };
}

function getISOWeek(date) {
    const target = new Date(date.valueOf());
    const dayNr = (date.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
        target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
    }
    return 1 + Math.ceil((firstThursday - target) / 604800000);
}

// ===========================================
// 13. 타로 관련 함수들
// ===========================================

const TAROT_DETAILS = [
    {name: "THE FOOL (바보)", meaning: "새로운 시작과 순수함을 나타내는 카드입니다.", upright: "새로운 시작, 순진함, 자발성", reversed: "무모함, 경솔함, 위험한 행동"},
    {name: "THE MAGICIAN (마법사)", meaning: "의지력과 창조력을 나타내는 카드입니다.", upright: "의지력, 창조력, 집중", reversed: "기만, 조작, 능력 부족"},
    // ... 필요한 만큼 추가
];

const CARD_ICONS = ["🃏", "🎩", "🔮", "👑", "⚡", "⛪", "💕", "🏆", "💪", "🕯️", "🎰", "⚖️", "🙃", "💀", "⚖️", "😈", "🗼", "⭐", "🌙", "☀️", "📯", "🌍"];

function initializeTarot() {
    const tarotCards = $$('.tarot-card-back');
    
    tarotCards.forEach(card => {
        if (card.__bound) return;
        card.addEventListener('click', () => selectTarotCard(card));
        card.__bound = true;
    });

    const randomBtn = $('#btnRandomTarot');
    if (randomBtn && !randomBtn.__bound) {
        randomBtn.addEventListener('click', drawRandomTarotCard);
        randomBtn.__bound = true;
    }

    const resetBtn = $('#btnResetTarot');
    if (resetBtn && !resetBtn.__bound) {
        resetBtn.addEventListener('click', resetTarotCards);
        resetBtn.__bound = true;
    }

    resetTarotCards();
}

function selectTarotCard(cardElement) {
    if (cardElement.classList.contains('revealed')) return;

    const randomTarotIndex = Math.floor(Math.random() * TAROT_DETAILS.length);
    const isUpright = Math.random() < 0.7;
    const selectedCard = TAROT_DETAILS[randomTarotIndex];

    if (!selectedCard) return;

    cardElement.classList.add('flipped');
    
    setTimeout(() => {
        const frontElement = document.createElement('div');
        frontElement.className = 'tarot-card-front';
        frontElement.innerHTML = `
        <div class="card-number">${randomTarotIndex}</div>
        <div class="card-icon">${CARD_ICONS[randomTarotIndex]}</div>
        <div class="card-name">${selectedCard.name.split('(')[0].trim()}</div>
        <div class="card-direction">${isUpright ? '정위' : '역위'}</div>
        `;
        cardElement.appendChild(frontElement);
        cardElement.classList.add('revealed');
        setTimeout(() => frontElement.style.opacity = '1', 100);
    }, 300);

    setTimeout(() => showTarotModal(randomTarotIndex, isUpright), 800);
    
    pushRecent({
        type: 'tarot',
        card: selectedCard.name,
        upright: isUpright,
        meaning: isUpright ? selectedCard.upright : selectedCard.reversed
    });
    
    reactCrystal(`${selectedCard.name.split('(')[0].trim()}을 뽑았습니다! ✨`);
}

function showTarotModal(cardIndex, isUpright) {
    const modal = $('#tarotModalOverlay');
    const content = $('#tarotModalContent');
    if (!modal || !content) return;

    const card = TAROT_DETAILS[cardIndex];
    if (!card) return;

    content.innerHTML = `
    <h2>${card.name}</h2>
    <p style="color:#6B7280; margin-bottom:20px; line-height:1.6; font-style:italic;">${card.meaning}</p>
    <div class="meaning-section upright"><h3>⬆️ 정방향 의미</h3><p>${card.upright}</p></div>
    <br>
    <div class="meaning-section reversed"><h3>⬇️ 역방향 의미</h3><p>${card.reversed}</p></div>
    <div style="margin-top:25px; padding:15px; background:rgba(255,215,0,0.1); border-radius:10px; border-left:4px solid #ffd700;">
        <h3 style="color:#ffd700; margin-bottom:10px;">${isUpright ? '⬆️ 현재 뽑힌 방향: 정방향' : '⬇️ 현재 뽑힌 방향: 역방향'}</h3>
        <p style="color:#333; line-height:1.5;">${isUpright ? card.upright : card.reversed}</p>
    </div>
    `;
    
    modal.style.display = 'flex';
    requestAnimationFrame(() => modal.classList.add('show'));
}

function closeTarotModal() {
    const modal = $('#tarotModalOverlay');
    if (!modal) return;
    modal.classList.remove('show');
    modal.style.display = 'none';
}

function resetTarotCards() {
    $$('.tarot-card-back').forEach(card => {
        card.classList.remove('flipped', 'revealed');
        card.style.transform = '';
        card.querySelector('.tarot-card-front')?.remove();
    });
    closeTarotModal();
    reactCrystal('새로운 카드들이 준비되었습니다 ✨');
}

function drawRandomTarotCard() {
    const available = $$('.tarot-card-back:not(.revealed)');
    if (!available.length) {
        reactCrystal('모든 카드를 이미 뽑았습니다! 🔄');
        return;
    }
    const el = available[Math.floor(Math.random() * available.length)];
    setTimeout(() => selectTarotCard(el), 300);
}

// ===========================================
// 14. 이벤트 리스너 바인딩 (단일 버전)
// ===========================================

function bindEventListeners() {
    // 오늘의 운세 버튼
    $('#btnToday')?.addEventListener('click', () => {
        const birthRaw = $('#today-birth')?.value || '';
        const name = $('#today-name')?.value?.trim() || '';
        const calMode = getCalMode('today');
        const isLeap = getLeap('today');

        try {
            if (!birthRaw.trim()) {
                alert('생년월일을 입력하세요.');
                return;
            }

            // 간단한 날짜 처리 (lunar-javascript 의존성 제거)
            const fortuneData = calcEnhancedDailyFortune(birthRaw);
            const htmlResult = renderEnhancedDailyFortune(fortuneData, name);

            openSheet('오늘의 운세', htmlResult, {
                type: 'enhanced-today',
                birth_input: birthRaw,
                name: name,
                data: fortuneData
            });

            reactCrystal('오늘의 상세 운세를 불러왔습니다! ✨');
        } catch (e) {
            console.error(e);
            alert(e.message || '입력 값을 확인해 주세요.');
        }
    });

    // 로또 번호 버튼
    $('#btnLotto')?.addEventListener('click', () => {
        const birth = $('#lotto-birth')?.value?.trim() || '';
        try {
            const result = generateLottoNumbers(birth);
            const html = renderLottoResult(result);
            
            openSheet('🎱 행운의 로또번호', html, {
                type: 'lotto',
                birth,
                result
            });
            
            reactCrystal('이번 주 행운번호를 뽑았어요! ✨');
        } catch (e) {
            console.error(e);
            alert('행운번호 생성 중 오류가 발생했습니다.');
        }
    });

    // 시트 닫기 버튼
    $('#btnClose')?.addEventListener('click', closeSheet);
    
    // 시트 배경 클릭시 닫기
    sheet?.addEventListener('click', e => {
        if (e.target === sheet) closeSheet();
    });

    // 결과 저장 버튼
    $('#btnSave')?.addEventListener('click', () => {
        if (!lastResult) {
            closeSheet();
            return;
        }
        pushRecent(lastResult);
        
        const notice = document.createElement('div');
        notice.textContent = '📁 최근 결과에 저장됐습니다.';
        notice.style.cssText = 'margin-top:16px;padding:12px;background:rgba(102,126,234,0.1);border-radius:8px;text-align:center;color:#667eea;font-weight:bold;';
        sheetContent?.appendChild(notice);
        setTimeout(() => notice.remove(), 3000);
    });

    // 네비게이션 클릭
    $$('.nav-item[data-tab]').forEach(item => {
        item.addEventListener('click', () => {
            const tab = item.dataset.tab || 'home';
            location.hash = '#/' + tab;
            reactCrystal(`${tab} 페이지로 이동합니다! ✨`);
        });
    });

    // 서비스 카드 클릭
    $$('.service-item, .special-item').forEach(card => {
        card.addEventListener('click', () => {
            const route = card.dataset.route || 'fortune-today';
            if (route.startsWith('fortune-')) {
                location.hash = '#/fortune/' + route.replace('fortune-', '');
            }
        });
    });

    // 크리스탈 클릭
    $('#mainCrystal')?.addEventListener('click', () => {
        reactCrystal('🔮 신비로운 힘을 느껴보세요');
    });
}

// ===========================================
// 15. 로또 결과 렌더링
// ===========================================

function renderLottoResult(result) {
    if (!result || !Array.isArray(result.main)) {
        return `
        <div class="info-box">
            <div class="info-title">ℹ️ 안내</div>
            <div class="info-content">번호 생성에 실패했어요. 다시 시도해 주세요.</div>
        </div>`;
    }

    const ballsHtml = result.main
        .map(n => `<div class="ball">${String(n).padStart(2, '0')}</div>`)
        .join('');

    const bonusHtml = result.bonus ? 
        `<div style="align-self:center;font-weight:800;margin:0 4px">+</div>
         <div class="ball bonus">${String(result.bonus).padStart(2, '0')}</div>` : '';

    return `
    <div class="result-section lotto-wrap">
        <div class="section-title-result">🎱 행운번호</div>
        <div class="lotto-balls">
            ${ballsHtml}
            ${bonusHtml}
        </div>
        <div class="lotto-meta">생성 기준: ${result.seedInfo || '랜덤'} · 참고용</div>
    </div>
    <div class="info-box">
        <div class="info-title">ℹ️ 안내</div>
        <div class="info-content">
            • 결과는 <strong>같은 주(ISO 주)</strong>에는 동일합니다.<br/>
            • 입력한 생년월일이 같으면 같은 주에는 같은 추천이 나옵니다.<br/>
            • 재미/참고용이며, 책임있는 구매를 권장해요. 🎯
        </div>
    </div>
    `;
}

// ===========================================
// 16. 스타일 추가
// ===========================================

function addRequiredStyles() {
    if (document.getElementById('mystictell-styles')) return;

    const css = `
    /* 로또 스타일 */
    .lotto-wrap { text-align: center; }
    .lotto-balls { 
        display: flex; 
        gap: 10px; 
        justify-content: center; 
        flex-wrap: wrap; 
        margin: 10px 0 6px; 
    }
    .ball {
        width: 44px; 
        height: 44px; 
        border-radius: 50%;
        display: flex; 
        align-items: center; 
        justify-content: center;
        font-weight: 800; 
        color: #fff;
        background: linear-gradient(135deg, #667eea, #764ba2);
        box-shadow: 0 6px 16px rgba(0,0,0,.18);
    }
    .ball.bonus { 
        background: linear-gradient(135deg, #ff9800, #ffc107); 
    }
    .lotto-meta { 
        color: #666; 
        font-size: 12px; 
        margin-top: 6px; 
    }

    /* 운세 카드 스타일 */
    .result-card {
        background: white;
        border-radius: 15px;
        padding: 25px;
        margin: 20px 0;
        box-shadow: 0 4px 15px rgba(0,0,0,0.08);
        border-left: 5px solid #667eea;
    }

    .card-header {
        display: flex;
        align-items: center;
        margin-bottom: 18px;
    }

    .card-icon {
        font-size: 28px;
        margin-right: 15px;
    }

    .card-title {
        font-size: 20px;
        font-weight: bold;
        color: #333;
    }

    .card-value {
        font-size: 18px;
        font-weight: bold;
        color: #667eea;
        margin-bottom: 12px;
    }

    .card-description {
        color: #333;
        line-height: 1.7;
        font-size: 15px;
    }

    .section-title-result {
        font-size: 26px;
        font-weight: bold;
        color: #333;
        text-align: center;
        margin-bottom: 25px;
        padding: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 15px;
    }

    .fortune-date {
        text-align: center;
        color: #667eea;
        font-weight: bold;
        margin-bottom: 20px;
        font-size: 16px;
    }

    .lucky-items-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 15px;
        margin: 20px 0;
    }

    .lucky-item-card {
        background: linear-gradient(135deg, #f8f9ff, #e8f4ff);
        border: 2px solid #e0e7ff;
        border-radius: 15px;
        padding: 20px;
        text-align: center;
        transition: transform 0.2s ease;
    }

    .lucky-item-card:hover {
        transform: translateY(-3px);
        box-shadow: 0 5px 15px rgba(102, 126, 234, 0.2);
    }

    .lucky-icon {
        font-size: 24px;
        margin-bottom: 8px;
    }

    .lucky-label {
        font-size: 12px;
        color: #666;
        margin-bottom: 5px;
    }

    .lucky-value {
        font-weight: bold;
        color: #333;
        font-size: 16px;
    }

    .info-box {
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        padding: 20px;
        border-radius: 15px;
        margin: 25px 15px;
        border-left: 5px solid #667eea;
    }

    .info-title {
        font-weight: bold;
        color: #333;
        margin-bottom: 12px;
        font-size: 16px;
    }

    .info-content {
        color: #666;
        line-height: 1.6;
    }

    /* 스플래시 화면 */
    #splashScreen.hidden {
        opacity: 0;
        transform: scale(0.95);
        pointer-events: none;
        visibility: hidden;
    }

    /* 메인 콘텐츠 */
    #mainContent.show, #bottomNav.show {
        opacity: 1;
    }

    /* 모든 버튼 활성화 */
    button, .btn, [onclick] {
        pointer-events: auto !important;
        position: relative !important;
        cursor: pointer !important;
        touch-action: manipulation !important;
    }

    /* 타로 모달 */
    #tarotModalOverlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        display: none;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    }

    #tarotModalOverlay.show {
        display: flex;
    }

    #tarotModalContent {
        background: white;
        padding: 30px;
        border-radius: 20px;
        max-width: 500px;
        max-height: 80vh;
        overflow-y: auto;
        margin: 20px;
    }
    `;

    const styleTag = document.createElement('style');
    styleTag.id = 'mystictell-styles';
    styleTag.textContent = css;
    document.head.appendChild(styleTag);
}

// ===========================================
// 17. 초기화 함수
// ===========================================

function initMysticTell() {
    console.log('🚀 MysticTell 초기화 시작...');

    // 스타일 추가
    addRequiredStyles();

    // 이벤트 리스너 바인딩
    bindEventListeners();

    // 스플래시 숨기기
    hideSplash();

    // 초기 라우팅
    if (!location.hash) {
        location.hash = '#/home';
    }
    routeFromHash();

    console.log('✅ MysticTell 초기화 완료');
}

// ===========================================
// 18. 전역 이벤트 리스너
// ===========================================

// 해시 변경 시 라우팅
window.addEventListener('hashchange', routeFromHash);

// 페이지 로드 완료 시 초기화
window.addEventListener('load', initMysticTell);

// DOM 준비 시 스플래시 처리
document.addEventListener('DOMContentLoaded', () => {
    const startBtn = $('#startBtn');
    startBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        hideSplash();
    });

    // 자동 스플래시 숨김 (3초 후)
    setTimeout(hideSplash, 3000);
});

// 에러 처리
window.addEventListener('error', (e) => {
    console.error('Global error:', e);
    closeSheet();
});

// ESC 키로 모달 닫기
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeAllOverlays();
    }
});

console.log('📱 MysticTell JavaScript 로드 완료');
