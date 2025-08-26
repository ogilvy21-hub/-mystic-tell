// 전역 에러 핸들러 (AdSense 심사 대비)
window.addEventListener('error', (e) => {
    // 개발 환경에서만 에러 표시
    if (location.hostname.includes('localhost') || location.hostname.includes('127.0.0.1')) {
        console.error('개발 에러:', e);
    }
    // 프로덕션에서는 에러 무시하고 계속 진행
    e.preventDefault();
    return true;
});
// DOM 헬퍼 + 로컬스토리지 키 (맨 위에 추가)
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel) || []);  // 안전한 버전
const LS_KEY = 'mystictell_recent_results';

// DOM 헬퍼 + 로컬스토리지 키 (맨 위에 추가)
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel) || []);
const LS_KEY = 'mystictell_recent_results';

// DOM 캐시 시스템 추가
const DOM = {
    // 캐시된 요소들
    cache: new Map(),
    
    // 안전한 쿼리 함수
    get(selector) {
        if (!this.cache.has(selector)) {
            this.cache.set(selector, document.querySelector(selector));
        }
        return this.cache.get(selector);
    },
    
    // 캐시 초기화
    init() {
        const selectors = [
            '#splashScreen', '#mainContent', '#bottomNav',
            '#fortuneTitle', '#sheetBackdrop', '#sheetTitle', '#sheetContent',
            '#mainCrystal'
        ];
        
        selectors.forEach(sel => this.get(sel));
    },
    
    // 안전한 조작 함수들
    safeText(selector, text) {
        const el = this.get(selector);
        if (el) el.textContent = text;
    },
    
    safeClass(selector, action, className) {
        const el = this.get(selector);
        if (el) el.classList[action](className);
    }
};

// 이벤트 관리 시스템
class EventManager {
    constructor() {
        this.boundElements = new WeakSet();
        this.listeners = new Map();
    }
    
    bindOnce(element, event, handler, options = {}) {
        if (!element) return false;
        
        const key = `${element.tagName}-${event}`;
        if (this.boundElements.has(element)) {
            return false;
        }
        
        element.addEventListener(event, handler, options);
        this.boundElements.add(element);
        return true;
    }
    
    bindAll(selector, event, handler, options = {}) {
        const elements = document.querySelectorAll(selector);
        let count = 0;
        elements.forEach(el => {
            if (this.bindOnce(el, event, handler, options)) {
                count++;
            }
        });
        return count;
    }
}

const eventManager = new EventManager();

// 안전 실행 래퍼
function safeExecute(fn, context = 'Unknown', defaultReturn = null) {
    try {
        return fn();
    } catch (error) {
        console.error(`Error in ${context}:`, error);
        return defaultReturn;
    }
}

// 안전한 DOM 조작 함수들
function safeQuerySelector(selector) {
    return safeExecute(() => document.querySelector(selector), `Query: ${selector}`);
}

function safeAddEventListener(element, event, handler, options = {}) {
    return safeExecute(() => {
        if (element) {
            element.addEventListener(event, handler, options);
            return true;
        }
        return false;
    }, `Event binding: ${event}`);
}

// 타로 카드 하루 2회 제한 클래스 ← 여기에 추가!
class TarotDailyLimit {
    constructor() {
        this.maxDaily = 2;
        this.storageKey = 'tarot_daily_usage';
    }

    getTodayString() {
        return new Date().toISOString().split('T')[0];
    }

    getTodayUsage() {
        try {
            const data = localStorage.getItem(this.storageKey);
            if (!data) return { date: this.getTodayString(), count: 0 };
            
            const parsed = JSON.parse(data);
            const today = this.getTodayString();
            
            if (parsed.date !== today) {
                return { date: today, count: 0 };
            }
            return parsed;
        } catch (e) {
            return { date: this.getTodayString(), count: 0 };
        }
    }

    saveTodayUsage(count) {
        try {
            const data = { date: this.getTodayString(), count: count };
            localStorage.setItem(this.storageKey, JSON.stringify(data));
        } catch (e) {
            console.error('타로 사용 기록 저장 실패:', e);
        }
    }

    canUseTarot() {
        const usage = this.getTodayUsage();
        return usage.count < this.maxDaily;
    }

    getRemainingCount() {
        const usage = this.getTodayUsage();
        return Math.max(0, this.maxDaily - usage.count);
    }

    useTarot() {
        const usage = this.getTodayUsage();
        if (usage.count >= this.maxDaily) return false;
        
        this.saveTodayUsage(usage.count + 1);
        return true;
    }

    showLimitAlert() {
        const resetTime = new Date();
        resetTime.setDate(resetTime.getDate() + 1);
        resetTime.setHours(0, 0, 0, 0);
        
        const resetString = resetTime.toLocaleDateString('ko-KR', {
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        alert(`🔮 오늘의 타로 카드 사용 횟수를 모두 사용하셨습니다.\n\n하루 최대 ${this.maxDaily}번까지 이용 가능합니다.\n✨ 다음 이용: ${resetString}\n\n더 깊이 있는 통찰을 원하신다면 내일 다시 찾아주세요! 💫`);
    }
}

// 전역 인스턴스 생성
const tarotLimit = new TarotDailyLimit();
// forEach를 지원하는 안전한 선택자
const $all = (sel) => {
    const elements = document.querySelectorAll(sel);
    return elements ? Array.from(elements) : [];
};

// lunar-javascript 글로벌 보정 (보강)
(function fixLunarGlobals(){
    try {
        if (typeof window.Lunar !== "undefined") {
            if (typeof window.Solar === "undefined") window.Solar = window.Lunar.Solar;
            if (typeof window.LunarYear === "undefined") window.LunarYear = window.Lunar.LunarYear;
            if (typeof window.LunarMonth === "undefined") window.LunarMonth = window.Lunar.LunarMonth;
        }
    } catch(e) {
        console.warn("lunar globals patch skipped:", e);
    }
})();

// 메뉴 썸네일/아이콘 숨기기 + 레이아웃 보정
(function injectPalmStyles(){
    if (document.getElementById('palm-style-tweak')) return;
    const css = `
        /* 결과 이미지 레이아웃 */
        .palm-photo-wrap{position:relative;width:100%;max-width:560px;margin:8px auto 18px;}
        .palm-photo{display:block;width:100%;height:auto;border-radius:16px;background:#fff;}
        .palm-overlay{position:absolute;inset:0;}
        
        /* 손금 메뉴 카드에서 이미지/임의 SVG/배경 썸네일 제거 */
        .palm-type-card img, .palm-type-card svg, .palm-type-card .thumb, .palm-type-card .icon{
            display:none !important;
        }
        
        /* 텍스트+이모지 레이아웃 보정 */
        .palm-type-card .title, .palm-type-card .card-title{
            margin-top:4px;
        }
        .palm-type-card .emoji{
            font-size:22px;
            margin-left:6px;
        }
        
        /* 손금 서브타입 선택 이모지 스타일 */
        .palm-subtype-emoji {
            font-size: 48px;
            margin-bottom: 15px;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 80px;
        }
        
        /* ✅ 손금 결과 텍스트 컬러 수정 */
        .card-description, .result-content {
            color: #333 !important;
            line-height: 1.7;
            font-size: 15px;
        }
        
        /* ✅ "의미:" 라벨 강조 색상 */
        .card-description strong, .result-content strong, #sheetContent strong {
            color: #667eea !important;
            font-weight: 700;
        }
        
        /* ✅ 손금 해석 카드 전체 스타일 개선 */
        .result-card {
            background: white !important;
            color: #333 !important;
        }
        .result-card .card-description {
            color: #444 !important;
        }
        
        /* ✅ 시트 내용 전체 텍스트 색상 */
        #sheetContent {
            color: #333 !important;
        }
        #sheetContent .card-description, #sheetContent .result-content {
            color: #444 !important;
        }
        
        /* ✅ 정보 박스 텍스트 */
        .info-content {
            color: #555 !important;
        }
        .info-content strong {
            color: #667eea !important;
        }
    `;
    const s = document.createElement('style');
    s.id = 'palm-style-tweak';
    s.textContent = css;
    document.head.appendChild(s);
})();

// ----- 입력 정규화 -----
function normalizeDateInput(s=''){
    return s.trim().replace(/[.\s]+/g, '-').replace(/-+/g,'-').replace(/-$/,'');
}

function normalizeTimeInput(s=''){
    s = s.trim();
    const am = /오전/.test(s);
    const pm = /오후/.test(s);
    s = s.replace(/[^\d:]/g,'');
    if(!s) return '';
    let [hh, mm='0'] = s.split(':');
    let h = parseInt(hh||'0',10);
    if (pm && h < 12) h += 12;
    if (am && h === 12) h = 0;
    return `${String(h).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
}

// 천간 → 오행
const GAN_WUXING = {
    '甲':'木','乙':'木','丙':'火','丁':'火','戊':'土','己':'土',
    '庚':'金','辛':'金','壬':'水','癸':'水'
};

// 지지 → 장간(藏干) 가중치
const ZHI_HIDDENS = {
    '子': { '癸':100 },
    '丑': { '己':70, '癸':10, '辛':20 },
    '寅': { '甲':60, '丙':20, '戊':20 },
    '卯': { '乙':100 },
    '辰': { '戊':70, '乙':10, '癸':20 },
    '巳': { '丙':60, '庚':20, '戊':20 },
    '午': { '丁':90, '己':10 },
    '未': { '己':70, '丁':10, '乙':20 },
    '申': { '庚':70, '戊':20, '壬':10 },
    '酉': { '辛':100 },
    '戌': { '戊':70, '辛':20, '丁':10 },
    '亥': { '壬':90, '甲':10 }
};

// 오행 정보
const WUXING_INFO = {
    '木': { ko:'목', trait:'성장·기획·창의', boost:'푸른색, 숲길 걷기, 신선 채소, 새 프로젝트 시작', color:'#4caf50' },
    '火': { ko:'화', trait:'열정·표현·리더십', boost:'햇빛, 가벼운 유산소, 발표/공개 활동, 따뜻한 색', color:'#f44336' },
    '土': { ko:'토', trait:'안정·신뢰·실행', boost:'정리/정돈, 루틴 만들기, 노란/갈색, 땅 밟기', color:'#ff9800' },
    '金': { ko:'금', trait:'규칙·분석·재정', boost:'화이트/메탈, 구조화, 재무정리, 가벼운 근력운동', color:'#9e9e9e' },
    '水': { ko:'수', trait:'유연·학습·소통', boost:'블루/블랙, 독서/연구, 호흡/수분, 산책', color:'#2196f3' }
};

// 십신 설명
const SHISHEN_DESC = {
    '정관':'규범·책임·관리/행정. 공공·운영·관리 직무에 적합.',
    '편관':'도전·위기대응·현장 리더십. 경쟁/보안/체력 분야.',
    '정재':'현실 수익·자원관리. 영업/재무/운영에 강점.',
    '편재':'확장·네트워킹·사업감. 유통/마케팅/창업 적성.',
    '식신':'생산·건강·콘텐츠 제작. 루틴·지속 창출 강점.',
    '상관':'표현·기획·개발/혁신. 크리에이티브·R&D.',
    '정인':'학습·연구·자격. 교육/분석/전문지식 강화.',
    '편인':'전략·컨설팅·새 판짜기. 기획/미디어/브랜딩.',
    '비견':'자기주도·동료 협업. 창업/개발/개인브랜딩.',
    '겁재':'팀워크·세일즈·공동 프로젝트 추진력.'
};

const SHISHEN_KR = {
    '正官':'정관','七殺':'편관','偏官':'편관','比肩':'비견','劫財':'겁재',
    '食神':'식신','傷官':'상관','偏財':'편재','正財':'정재','偏印':'편인','正印':'정인'
};

function krShiShen(s=''){
    return Object.entries(SHISHEN_KR).reduce((t,[c,k])=>t.replaceAll(c,k), s||'');
}

function getCalMode(prefix){
    return document.getElementById(`${prefix}-cal-lunar`)?.checked ? 'lunar' : 'solar';
}

function getLeap(prefix){
    return !!document.getElementById(`${prefix}-leap`)?.checked;
}

function bindCalToggle(prefix){
    const solar = document.getElementById(`${prefix}-cal-solar`);
    const lunar = document.getElementById(`${prefix}-cal-lunar`);
    const leap = document.getElementById(`${prefix}-leap`);
    if(!leap) return;
    
    const sync = ()=>{
        leap.disabled = !lunar.checked;
        leap.parentElement.style.opacity = leap.disabled?0.5:1;
    };
    
    solar?.addEventListener('change', sync);
    lunar?.addEventListener('change', sync);
    sync();
}

function fmtSolar(solar){
    const y = solar.getYear(), m=String(solar.getMonth()).padStart(2,'0'), d=String(solar.getDay()).padStart(2,'0');
    return `${y}-${m}-${d}`;
}

function toSolarFromInput(dateStrRaw, timeStrRaw, mode='solar', isLeap=false){
    const dateStr = normalizeDateInput(dateStrRaw||'');
    const timeStr = normalizeTimeInput(timeStrRaw||'');
    if(!dateStr) throw new Error('생년월일을 입력하세요');
    
    const [y,m0,d] = dateStr.split('-').map(Number);
    let h=0, min=0, s=0;
    if (timeStr) {
        [h,min] = timeStr.split(':').map(Number);
    }
    
    if (mode === 'lunar'){
        const m = isLeap ? -Math.abs(m0) : Math.abs(m0);
        try{
            const ly = LunarYear.fromYear(y);
            const leapMonth = ly.getLeapMonth();
            if (isLeap && leapMonth !== Math.abs(m0)) {
                alert(`${y}년에는 윤${String(m0).padStart(2,'0')}월이 없습니다.`);
            }
        }catch(_){}
        const lunar = Lunar.fromYmdHms(y, m, d, h||0, min||0, s);
        return lunar.getSolar();
    }
    return Solar.fromYmdHms(y, m0, d, h||0, min||0, s);
}

function add(counts, el, w=1){
    if(!el) return;
    counts[el]=(counts[el]||0)+w;
}

function getGan(gz){
    return gz ? gz[0] : '';
}

function getZhi(gz){
    return gz ? gz[gz.length-1] : '';
}

function computeBaZi(dateStrRaw, timeStrRaw, calMode='solar', isLeap=false) {
    const solar = toSolarFromInput(dateStrRaw, timeStrRaw, calMode, isLeap);
    const lunar = solar.getLunar();
    const ec = lunar.getEightChar();
    
    const pillars = {
        year: ec.getYear(),
        month: ec.getMonth(),
        day: ec.getDay(),
        time: ec.getTime()
    };
    
    const countsGan = { '木':0,'火':0,'土':0,'金':0,'水':0 };
    const countsZhi = { '木':0,'火':0,'土':0,'金':0,'水':0 };
    const countsAll = { '木':0,'火':0,'土':0,'金':0,'水':0 };
    
    [pillars.year, pillars.month, pillars.day, pillars.time].forEach(gz=>{
        if(!gz) return;
        const elG = GAN_WUXING[getGan(gz)];
        add(countsGan, elG, 1);
        add(countsAll, elG, 1);
        
        const hiddens = ZHI_HIDDENS[getZhi(gz)] || {};
        Object.entries(hiddens).forEach(([hiddenGan, pct])=>{
            const elZ = GAN_WUXING[hiddenGan];
            const w = pct/100;
            add(countsZhi, elZ, w);
            add(countsAll, elZ, w);
        });
    });
    
    const tenGods = {
        y: (ec.getYearShiShenGan && ec.getYearShiShenGan()) || '',
        m: (ec.getMonthShiShenGan && ec.getMonthShiShenGan()) || '',
        d: '일간',
        t: (ec.getTimeShiShenGan && ec.getTimeShiShenGan()) || ''
    };
    
    return { pillars, countsGan, countsZhi, countsAll, lunar, solar, tenGods, calMode, isLeap };
}

// ===== 스플래시 화면 (통합된 버전) ===== 
// 기존 hideSplash() 함수 위에 추가
class SplashManager {
    constructor() {
        this.isHidden = false;
        this.hideTimer = null;
    }
    
    hide() {
        if (this.isHidden) return;
        this.isHidden = true;
        
        if (this.hideTimer) {
            clearTimeout(this.hideTimer);
            this.hideTimer = null;
        }
        
        const splash = $('#splashScreen');
        const main = $('#mainContent');
        const nav = $('#bottomNav');
        
        console.log('🚀 스플래시 숨김 시작...');
        
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
        
        if (!location.hash) location.hash = '#/home';
    }
    
    autoHide(delay = 3000) {
        if (this.isHidden) return;
        this.hideTimer = setTimeout(() => this.hide(), delay);
    }
}

const splashManager = new SplashManager();

function hideSplash() {
    splashManager.hide();
}

function startApp() {
    splashManager.hide();
}
// ===== 스플래시 화면 (통합된 버전) =====
function hideSplash(){
    const splash = $('#splashScreen');
    const main = $('#mainContent');
    const nav = $('#bottomNav');
    
    console.log('🚀 스플래시 숨김 시작...');
    
    if (splash) {
        splash.style.display = 'none';
        splash.classList.add('hidden');
        console.log('✅ 스플래시 스크린 숨김 완료');
    }
    
    if (main) {
        main.style.display = 'block';
        main.classList.add('show');
        console.log('✅ 메인 콘텐츠 표시 완료');
    }
    
    if (nav) {
        nav.style.display = 'flex';
        nav.classList.add('show');
        console.log('✅ 네비게이션 표시 완료');
    }
    
    if (!location.hash) location.hash = '#/home';
}

function startApp(){
    hideSplash();
}

// ===== 손금 이모지 매핑 =====
const PALM_TYPE_EMOJIS = {
    life: '🌱',
    head: '🧠',
    heart: '💖',
    fate: '✨',
    sun: '☀️',
    marriage: '💕',
    health: '⚕️',
    intuition: '🔮',
    venus: '💫'
};

// ===== 손금 데이터 =====
const PALM_READINGS = {
    life: {
        name: "생명선 (生命線)",
        description: "건강과 생명력, 체력을 나타내는 선입니다.",
        types: [
            {
                type: "긴 생명선",
                meaning: "건강하고 장수할 가능성이 높습니다. 체력이 좋고 활력이 넘치며, 병에 대한 저항력이 강합니다. 적극적이고 에너지가 풍부한 성격으로 어려움을 잘 극복합니다.",
                advice: "규칙적인 운동과 건강한 식습관을 유지하면 타고난 건강을 더욱 오래 유지할 수 있습니다."
            },
            {
                type: "짧은 생명선",
                meaning: "섬세하고 예민한 성격입니다. 건강 관리에 더욱 신경써야 하며, 스트레스에 민감할 수 있습니다. 하지만 집중력이 뛰어나고 효율적으로 일을 처리합니다.",
                advice: "충분한 휴식과 스트레스 관리, 정기적인 건강검진이 중요합니다."
            },
            {
                type: "깊고 뚜렷한 생명선",
                meaning: "강인한 체력과 의지력을 가지고 있습니다. 도전 정신이 강하고 목표 달성 능력이 뛰어납니다. 리더십이 있고 추진력이 강합니다.",
                advice: "타고난 리더십을 활용해 큰 목표에 도전해보세요. 다만 과로에 주의하세요."
            }
        ]
    },
    head: {
        name: "지혜선 (知慧線)",
        description: "지능과 사고력, 학습능력을 보여주는 선입니다.",
        types: [
            {
                type: "긴 지혜선",
                meaning: "뛰어난 분석력과 사고력을 가지고 있습니다. 학습능력이 우수하고 복잡한 문제를 해결하는 능력이 뛰어납니다. 연구, 기획, 분석 분야에 적합합니다.",
                advice: "지속적인 학습과 연구를 통해 전문성을 기르면 큰 성취를 이룰 수 있습니다."
            },
            {
                type: "짧은 지혜선",
                meaning: "직관적이고 실용적인 사고를 합니다. 복잡한 것보다는 단순하고 명확한 것을 선호하며, 실행력이 뛰어납니다. 현실적인 판단력이 좋습니다.",
                advice: "직관력을 믿고 빠른 실행력을 활용하면 좋은 결과를 얻을 수 있습니다."
            },
            {
                type: "곡선형 지혜선",
                meaning: "창의적이고 예술적인 감성을 가지고 있습니다. 상상력이 풍부하고 독창적인 아이디어를 잘 냅니다. 예술, 디자인, 창작 분야에 재능이 있습니다.",
                advice: "창의적인 활동과 예술 분야에 도전해보세요. 상상력을 현실로 만드는 노력이 필요합니다."
            }
        ]
    },
    heart: {
        name: "감정선 (感情線)",
        description: "사랑과 감정, 인간관계를 나타내는 선입니다.",
        types: [
            {
                type: "긴 감정선",
                meaning: "따뜻하고 애정이 많은 성격입니다. 감정 표현이 풍부하고 타인을 배려하는 마음이 깊습니다. 사랑에 적극적이고 헌신적입니다.",
                advice: "따뜻한 마음을 가진 장점을 살려 인간관계에서 중심 역할을 해보세요."
            },
            {
                type: "짧은 감정선",
                meaning: "현실적이고 이성적인 사랑을 추구합니다. 감정보다는 논리적 판단을 중시하며, 안정적인 관계를 선호합니다. 독립적인 성향이 강합니다.",
                advice: "이성적인 판단력을 바탕으로 한 안정적인 관계를 구축하는 것이 좋습니다."
            },
            {
                type: "곡선형 감정선",
                meaning: "로맨틱하고 감성적인 성격입니다. 사랑에 대한 이상이 높고 드라마틱한 연애를 좋아합니다. 예술적 감성이 풍부합니다.",
                advice: "로맨틱한 감성을 예술이나 창작 활동으로 표현해보세요."
            }
        ]
    },
    fate: {
        name: "운명선 (運命線)",
        description: "직업운과 사회적 성취를 보여주는 선입니다.",
        types: [
            {
                type: "뚜렷한 운명선",
                meaning: "강한 목적 의식과 야망을 가지고 있습니다. 사회적 성공을 이룰 가능성이 높고, 리더십이 뛰어납니다. 자수성가형 인물입니다.",
                advice: "명확한 목표를 세우고 꾸준히 노력하면 큰 성취를 이룰 수 있습니다."
            },
            {
                type: "흐린 운명선",
                meaning: "자유로운 영혼으로 고정된 틀을 싫어합니다. 다양한 경험을 추구하며, 변화를 두려워하지 않습니다. 창의적인 분야에 적합합니다.",
                advice: "다양한 경험을 통해 자신만의 길을 찾아가는 것이 좋습니다."
            },
            {
                type: "이중 운명선",
                meaning: "다재다능하고 여러 분야에서 성공할 수 있습니다. 부업이나 투잡에 성공할 가능성이 높고, 다양한 수입원을 가질 수 있습니다.",
                advice: "여러 분야에 관심을 가지고 다양한 기회를 모색해보세요."
            }
        ]
    },
    sun: {
        name: "태양선 (太陽線)",
        description: "명예와 인기, 예술적 재능을 나타내는 선입니다.",
        types: [
            {
                type: "뚜렷한 태양선",
                meaning: "천부적인 매력과 재능을 가지고 있습니다. 사람들에게 인기가 많고 예술적 감각이 뛰어납니다. 명예와 성공을 얻을 가능성이 높습니다.",
                advice: "타고난 매력과 재능을 활용해 사람들 앞에 서는 일을 해보세요."
            },
            {
                type: "흐린 태양선",
                meaning: "겸손하고 현실적인 성격입니다. 화려함보다는 실속을 추구하며, 꾸준한 노력으로 성과를 이룹니다. 안정적인 성공을 추구합니다.",
                advice: "꾸준한 노력과 실력 쌓기에 집중하면 좋은 결과를 얻을 수 있습니다."
            },
            {
                type: "여러 갈래 태양선",
                meaning: "다양한 분야에서 재능을 발휘할 수 있습니다. 멀티플레이어 타입으로 여러 가지 일을 동시에 잘 처리합니다. 인맥이 넓습니다.",
                advice: "다양한 분야에 도전하고 폭넓은 인맥을 활용해보세요."
            }
        ]
    },
    marriage: {
        name: "결혼선 (結婚線)",
        description: "결혼과 연애, 배우자운을 보여주는 선입니다.",
        types: [
            {
                type: "한 개의 뚜렷한 결혼선",
                meaning: "한 사람과 깊고 진실한 사랑을 나눌 가능성이 높습니다. 결혼에 대한 진지한 태도를 가지고 있으며, 배우자와 평생을 함께할 수 있습니다.",
                advice: "진실한 사랑을 만나면 신중하게 결정하고 소중히 여기세요."
            },
            {
                type: "여러 개의 결혼선",
                meaning: "인기가 많고 연애 기회가 많습니다. 다양한 사람들과의 만남을 통해 경험을 쌓습니다. 선택의 폭이 넓어 신중한 결정이 필요합니다.",
                advice: "다양한 만남 중에서 진정한 인연을 신중하게 선택하세요."
            },
            {
                type: "위로 향하는 결혼선",
                meaning: "행복한 결혼생활을 할 가능성이 높습니다. 배우자로부터 많은 도움을 받을 수 있으며, 결혼 후 운이 상승합니다. 금슬이 좋은 부부가 됩니다.",
                advice: "결혼을 통해 더욱 발전할 수 있으니 좋은 인연을 만나면 적극적으로 다가가세요."
            }
        ]
    },
    health: {
        name: "건강선 (健康線)",
        description: "건강상태와 질병 예방을 나타내는 선입니다.",
        types: [
            {
                type: "없는 건강선",
                meaning: "건강선이 없는 것이 가장 좋습니다. 타고난 건강체질로 큰 병치레 없이 건강하게 살 수 있습니다. 체력이 좋고 면역력이 강합니다.",
                advice: "현재의 건강을 유지하기 위해 규칙적인 생활과 적당한 운동을 하세요."
            },
            {
                type: "뚜렷한 건강선",
                meaning: "건강에 더욱 신경써야 할 필요가 있습니다. 스트레스나 과로에 주의하고, 정기적인 건강검진이 중요합니다. 조기 발견과 예방이 핵심입니다.",
                advice: "건강관리에 적극적으로 투자하고, 스트레스 관리와 충분한 휴식을 취하세요."
            },
            {
                type: "끊어진 건강선",
                meaning: "특정 시기에 건강상 주의가 필요할 수 있습니다. 하지만 적절한 관리와 치료로 충분히 극복 가능합니다. 예방이 최우선입니다.",
                advice: "정기검진을 빠뜨리지 말고, 몸의 신호에 민감하게 반응하여 조기 대처하세요."
            }
        ]
    },
    intuition: {
        name: "직감선 (直感線)",
        description: "직감력과 영감, 초능력을 보여주는 선입니다.",
        types: [
            {
                type: "뚜렷한 직감선",
                meaning: "뛰어난 직감력과 영감을 가지고 있습니다. 예술, 상담, 치료 분야에서 특별한 재능을 발휘할 수 있습니다. 사람의 마음을 잘 읽고 공감 능력이 뛰어납니다.",
                advice: "직감을 믿고 활용하되, 논리적 사고와 균형을 맞추세요. 영적 능력을 발전시키는 것도 좋습니다."
            },
            {
                type: "흐린 직감선",
                meaning: "잠재된 직감력을 가지고 있지만 아직 충분히 발현되지 않았습니다. 명상이나 요가 등을 통해 내면의 소리에 귀 기울이면 능력이 개발될 수 있습니다.",
                advice: "명상과 자기성찰을 통해 내면의 목소리에 집중하고, 직감력을 기르는 연습을 하세요."
            },
            {
                type: "이중 직감선",
                meaning: "매우 예민하고 섬세한 감수성을 가지고 있습니다. 타인의 감정에 쉽게 동조하며, 치유나 상담 분야에서 탁월한 능력을 발휘할 수 있습니다.",
                advice: "민감함을 장점으로 활용하되, 타인의 부정적 에너지에 너무 영향받지 않도록 주의하세요."
            }
        ]
    },
    venus: {
        name: "금성대 (金星帶)",
        description: "예술성과 감수성, 창조력을 나타내는 선입니다.",
        types: [
            {
                type: "완전한 금성대",
                meaning: "뛰어난 예술적 감각과 창조력을 가지고 있습니다. 미적 감각이 뛰어나며, 예술 분야에서 성공할 가능성이 높습니다. 감성이 풍부하고 로맨틱한 성격입니다.",
                advice: "예술적 재능을 적극 개발하고, 창작 활동에 도전해보세요. 아름다움을 추구하는 일에 적합합니다."
            },
            {
                type: "끊어진 금성대",
                meaning: "감수성이 예민하여 스트레스를 많이 받을 수 있습니다. 완벽주의 성향이 강하고, 아름다운 것에 대한 욕구가 강합니다. 때로는 현실과 이상 사이에서 갈등합니다.",
                advice: "스트레스 관리가 중요하며, 완벽함보다는 과정을 즐기는 마음가짐을 가지세요."
            },
            {
                type: "여러 갈래 금성대",
                meaning: "다양한 분야의 예술에 관심이 많고 재능이 있습니다. 감정의 기복이 클 수 있지만, 그만큼 풍부한 감성을 가지고 있습니다. 멀티 아티스트 타입입니다.",
                advice: "다양한 예술 분야를 경험해보고, 감정의 기복을 창작의 원동력으로 활용하세요."
            }
        ]
    }
};

// ===== 타로 데이터 =====
const TAROT_DETAILS = [
    {name:"THE FOOL (바보)",meaning:"새로운 시작과 순수함을 나타내는 카드입니다.",upright:"새로운 시작, 순진함, 자발성",reversed:"무모함, 경솔함, 위험한 행동"},
    {name:"THE MAGICIAN (마법사)",meaning:"의지력과 창조력을 나타내는 카드입니다.",upright:"의지력, 창조력, 집중",reversed:"기만, 조작, 능력 부족"},
    {name:"THE HIGH PRIESTESS (여교황)",meaning:"직감과 내면의 지혜를 나타내는 카드입니다.",upright:"직감, 무의식, 신비",reversed:"비밀, 숨겨진 동기, 직감 무시"},
    {name:"THE EMPRESS (여황제)",meaning:"풍요와 모성을 나타내는 카드입니다.",upright:"풍요, 모성, 창조성",reversed:"불임, 창조성 부족, 과보호"},
    {name:"THE EMPEROR (황제)",meaning:"권위와 안정을 나타내는 카드입니다.",upright:"권위, 구조, 질서",reversed:"독재, 권위주의, 경직성"},
    {name:"THE HIEROPHANT (교황)",meaning:"전통과 교육을 나타내는 카드입니다.",upright:"전통, 교육, 종교",reversed:"반항, 비정통성, 새로운 접근법"},
    {name:"THE LOVERS (연인)",meaning:"사랑과 선택을 나타내는 카드입니다.",upright:"사랑, 관계, 선택",reversed:"불균형, 갈등, 잘못된 선택"},
    {name:"THE CHARIOT (전차)",meaning:"승리와 의지를 나타내는 카드입니다.",upright:"승리, 의지력, 자제력",reversed:"통제력 상실, 방향성 부족"},
    {name:"STRENGTH (힘)",meaning:"내적 힘과 용기를 나타내는 카드입니다.",upright:"내적 힘, 용기, 인내",reversed:"약함, 자기 의심, 에너지 부족"},
    {name:"THE HERMIT (은둔자)",meaning:"내적 탐구와 지혜를 나타내는 카드입니다.",upright:"내적 탐구, 지혜, 성찰",reversed:"고립, 외로움, 잘못된 조언"},
    {name:"WHEEL OF FORTUNE (운명의 바퀴)",meaning:"변화와 운명을 나타내는 카드입니다.",upright:"변화, 운명, 기회",reversed:"불운, 통제력 상실, 외부 영향"},
    {name:"JUSTICE (정의)",meaning:"공정과 균형을 나타내는 카드입니다.",upright:"정의, 공정성, 진실",reversed:"불공정, 편견, 책임 회피"},
    {name:"THE HANGED MAN (매달린 남자)",meaning:"희생과 관점의 전환을 나타내는 카드입니다.",upright:"희생, 관점 전환, 기다림",reversed:"불필요한 희생, 지연, 저항"},
    {name:"DEATH (죽음)",meaning:"변화와 재생을 나타내는 카드입니다.",upright:"변화, 끝과 시작, 재생",reversed:"변화에 대한 저항, 정체"},
    {name:"TEMPERANCE (절제)",meaning:"균형과 조화를 나타내는 카드입니다.",upright:"균형, 절제, 조화",reversed:"불균형, 과도함, 조급함"},
    {name:"THE DEVIL (악마)",meaning:"유혹과 속박을 나타내는 카드입니다.",upright:"유혹, 속박, 중독",reversed:"해방, 자유, 속박에서 벗어남"},
    {name:"THE TOWER (탑)",meaning:"파괴와 급변을 나타내는 카드입니다.",upright:"파괴, 급변, 계시",reversed:"내적 변화, 개인적 변화"},
    {name:"THE STAR (별)",meaning:"희망과 영감을 나타내는 카드입니다.",upright:"희망, 영감, 치유",reversed:"절망, 희망 상실, 방향성 부족"},
    {name:"THE MOON (달)",meaning:"환상과 불안을 나타내는 카드입니다.",upright:"환상, 불안, 혼란",reversed:"진실 드러남, 명확성"},
    {name:"THE SUN (태양)",meaning:"기쁨과 성공을 나타내는 카드입니다.",upright:"기쁨, 성공, 활력",reversed:"일시적 기쁨, 에너지 부족"},
    {name:"JUDGEMENT (심판)",meaning:"부활과 각성을 나타내는 카드입니다.",upright:"부활, 각성, 새로운 시작",reversed:"자기 의심, 과거에 얽매임"},
    {name:"THE WORLD (세계)",meaning:"완성과 성취를 나타내는 카드입니다.",upright:"완성, 성취, 통합",reversed:"미완성, 목표 부족, 지연"}
];

const CARD_ICONS = ["🃏","🎩","🌙","👑","🏰","⛪","💕","🏎️","🦁","🕯️","🎡","⚖️","🙃","💀","👼","😈","🗼","⭐","🌙","☀️","📯","🌍"];

function closeAllOverlays(){
    try { closeTarotModal(); } catch(e){}
    try { closeSheet(); } catch(e){}
}

// ===== 네비게이션 =====
const pages = {
    get home() { return document.getElementById('page-home'); },
    get fortune() { return document.getElementById('page-fortune'); },
    get chat() { return document.getElementById('page-chat'); },
    get me() { return document.getElementById('page-me'); }
};

function setActiveTab(tab){
    // 메인 컨테이너 보이게 만들기
    const mainContent = document.getElementById('mainContent');
    if (mainContent) mainContent.style.display = 'block';
    
    $$('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.tab===tab));
    Object.entries(pages).forEach(([k,el])=>el?.classList.toggle('show',k===tab));
    closeAllOverlays();
}

// ===== 크리스탈 =====
const mainCrystal=$('#mainCrystal');
function reactCrystal(text){
    if(!mainCrystal) return;
    mainCrystal.style.background='radial-gradient(circle at 30% 30%, rgba(255,215,0,.9), rgba(255,20,147,.7), rgba(138,43,226,.5))';
    mainCrystal.innerHTML='🔮<br>분석중...';
    setTimeout(()=> mainCrystal.innerHTML=text||'✨ 준비중입니다...',800);
    setTimeout(()=>{
        mainCrystal.style.background='radial-gradient(circle at 30% 30%, rgba(255,255,255,.8), rgba(255,255,255,.3), transparent)';
        mainCrystal.innerHTML='구슬 속 미래를<br>확인해보세요';
    },2800);
}

mainCrystal?.addEventListener('click',()=>reactCrystal('🔮 신비로운 힘을 느껴보세요'));

// ===== 운세 뷰 =====
const fortuneTitle = $('#fortuneTitle');
const views = {
    'fortune-today': $('#view-today'),
    'fortune-saju' : $('#view-saju'),
    'fortune-tarot': $('#view-tarot'),
    'fortune-palm' : $('#view-palm'),
    'fortune-match': $('#view-match'),
    'fortune-year' : $('#view-year'),
    'fortune-lotto': $('#view-lotto')
};

function showFortuneView(route){
    safeExecute(() => {
        closeAllOverlays();
        
        // 안전하게 모든 뷰 숨기기
        Object.values(views).forEach(v => {
            if (v) v.style.display = 'none';
        });
        
        const fortuneTitle = DOM.get('#fortuneTitle');
        
        switch (route) {
            case 'fortune-today':
                DOM.safeText('#fortuneTitle', '오늘의 운세');
                if (views['fortune-today']) views['fortune-today'].style.display = 'block';
                safeExecute(() => bindCalToggle('today'), 'Today calendar toggle');
                break;
            case 'fortune-saju':
                DOM.safeText('#fortuneTitle', '정통 사주');
                if (views['fortune-saju']) views['fortune-saju'].style.display = 'block';
                safeExecute(() => bindCalToggle('saju'), 'Saju calendar toggle');
                break;
            case 'fortune-tarot':
                DOM.safeText('#fortuneTitle', '타로 점');
                if (views['fortune-tarot']) views['fortune-tarot'].style.display = 'block';
                safeExecute(() => initializeTarot(), 'Tarot initialization');
                break;
            case 'fortune-palm':
                DOM.safeText('#fortuneTitle', '손금 보기');
                if (views['fortune-palm']) views['fortune-palm'].style.display = 'block';
                safeExecute(() => {
                    setTimeout(() => initializePalmReading(), 50);
                }, 'Palm reading initialization');
                break;
            case 'fortune-match':
                DOM.safeText('#fortuneTitle', '궁합 보기');
                if (views['fortune-match']) views['fortune-match'].style.display = 'block';
                break;
            case 'fortune-year':
                DOM.safeText('#fortuneTitle', '신년 운세 (2025)');
                if (views['fortune-year']) views['fortune-year'].style.display = 'block';
                break;
            case 'fortune-lotto':
                DOM.safeText('#fortuneTitle', '행운번호');
                if (views['fortune-lotto']) views['fortune-lotto'].style.display = 'block';
                break;
            default:
                DOM.safeText('#fortuneTitle', '준비중');
                safeExecute(() => reactCrystal('✨ 준비중입니다...'), 'Crystal reaction');
                break;
        }
        
        // 안전하게 크리스탈 반응 실행
        const titleText = fortuneTitle ? fortuneTitle.textContent : route;
        safeExecute(() => reactCrystal(`${titleText}을(를) 준비합니다…`), 'Crystal reaction');
        
    }, 'showFortuneView');
}

// ===== 최근 결과 저장 =====
function pushRecent(item){
    const arr=JSON.parse(localStorage.getItem(LS_KEY)||"[]");
    arr.unshift({...item,ts:Date.now()});
    localStorage.setItem(LS_KEY,JSON.stringify(arr.slice(0,20)));
}

// 운세 카테고리별 메시지 데이터
const FORTUNE_CATEGORIES = {
    total: {
        name: '총운',
        icon: '🌟',
        messages: {
            90: ['오늘은 모든 일이 술술 풀리는 최고의 날입니다!', '행운의 여신이 함께하는 특별한 하루가 될 것입니다!', '꿈꾸던 일들이 현실이 되는 마법같은 날입니다!'],
            80: ['긍정적인 에너지가 넘치는 좋은 날입니다!', '작은 기적들이 일어날 수 있는 날입니다!', '준비했던 일들이 좋은 결과로 이어질 것입니다!'],
            70: ['안정적이고 평화로운 하루가 될 것입니다!', '차근차근 진행하면 좋은 성과를 얻을 수 있습니다!', '주변 사람들과의 관계가 더욱 돈독해질 것입니다!'],
            60: ['조금만 더 노력하면 원하는 결과를 얻을 수 있습니다!', '인내심을 갖고 꾸준히 나아가세요!', '작은 변화가 큰 발전으로 이어질 것입니다!'],
            50: ['현상 유지하며 안전하게 지내는 것이 좋겠습니다!', '급하게 서두르지 말고 신중하게 판단하세요!', '휴식을 취하며 재정비하는 시간으로 활용하세요!'],
            40: ['조심스럽게 행동하고 신중한 결정을 내리세요!', '작은 일부터 차근차근 해결해나가세요!', '주변의 조언을 귀담아들으면 도움이 될 것입니다!'],
            30: ['오늘은 무리하지 말고 여유롭게 지내세요!', '스트레스를 줄이고 마음의 평화를 찾으세요!', '내일을 위한 에너지를 충전하는 시간으로 보내세요!']
        }
    },
    love: {
        name: '연애운',
        icon: '💕',
        messages: {
            90: ['운명적인 만남이 기다리고 있을지도 몰라요!', '사랑하는 사람과의 관계가 한층 더 깊어질 것입니다!', '로맨틱한 고백이나 프로포즈를 받을 수 있는 날입니다!'],
            80: ['달콤한 사랑의 기운이 가득한 하루입니다!', '좋아하는 사람과의 거리가 가까워질 것입니다!', '새로운 인연을 만날 기회가 생길 수 있습니다!'],
            70: ['따뜻한 마음을 나누는 평온한 연애운입니다!', '서로를 이해하고 배려하는 시간을 가져보세요!', '소소한 데이트나 대화가 관계를 돈독하게 할 것입니다!'],
            60: ['조금 더 적극적으로 마음을 표현해보세요!', '상대방의 입장에서 생각해보는 것이 중요합니다!', '솔직한 대화로 오해를 풀 수 있을 것입니다!'],
            50: ['섣부른 고백보다는 천천히 관계를 발전시키세요!', '감정적인 판단보다는 이성적인 접근이 필요합니다!', '자신을 더 사랑하는 시간을 가져보세요!'],
            40: ['연애보다는 자기계발에 집중하는 것이 좋겠습니다!', '갈등이 생길 수 있으니 말조심하세요!', '혼자만의 시간을 즐기며 마음을 정리해보세요!'],
            30: ['오늘은 연애 문제로 스트레스받지 마세요!', '친구들과의 시간을 더 소중히 여기세요!', '자신의 매력을 기르는 데 집중해보세요!']
        }
    },
    money: {
        name: '재물운',
        icon: '💰',
        messages: {
            90: ['예상치 못한 수입이나 보너스가 있을 수 있습니다!', '투자나 사업에서 큰 성과를 거둘 것입니다!', '금전적인 기회를 놓치지 마세요!'],
            80: ['돈 관리를 잘하면 목돈을 만들 수 있을 것입니다!', '부업이나 사이드 프로젝트에서 수익이 생길 수 있습니다!', '절약하는 습관이 큰 도움이 될 것입니다!'],
            70: ['안정적인 수입과 지출 관리가 이루어질 것입니다!', '계획적인 저축으로 미래를 준비하세요!', '작은 투자부터 시작해보는 것도 좋겠습니다!'],
            60: ['가계부를 작성하며 돈의 흐름을 파악해보세요!', '불필요한 지출을 줄이는 것이 중요합니다!', '재정 계획을 다시 한번 점검해보세요!'],
            50: ['큰 지출은 피하고 현상 유지에 집중하세요!', '충동구매를 자제하고 신중하게 소비하세요!', '비상금을 마련해두는 것이 좋겠습니다!'],
            40: ['돈 문제로 스트레스받지 않도록 주의하세요!', '대출이나 투자는 신중하게 결정하세요!', '전문가의 조언을 구하는 것도 방법입니다!'],
            30: ['오늘은 지갑을 단단히 닫아두세요!', '금전 거래는 최대한 피하는 것이 좋겠습니다!', '돈보다는 건강과 관계에 신경쓰세요!']
        }
    },
    health: {
        name: '건강운',
        icon: '💪',
        messages: {
            90: ['몸과 마음이 최상의 컨디션을 유지할 것입니다!', '새로운 운동이나 건강관리 방법을 시작하기 좋은 날입니다!', '활력이 넘치는 하루를 보낼 수 있을 것입니다!'],
            80: ['규칙적인 생활로 건강이 더욱 좋아질 것입니다!', '가벼운 운동이나 산책이 큰 도움이 될 것입니다!', '균형잡힌 식단으로 몸의 밸런스를 맞춰보세요!'],
            70: ['전반적으로 안정된 건강 상태를 유지할 것입니다!', '충분한 수면과 휴식을 취하세요!', '스트레칭이나 요가로 몸의 긴장을 풀어보세요!'],
            60: ['컨디션 관리에 더욱 신경써야 할 때입니다!', '무리한 운동보다는 가벼운 활동이 좋겠습니다!', '건강검진을 받아보는 것도 좋겠습니다!'],
            50: ['과로하지 말고 적당한 휴식을 취하세요!', '균형잡힌 식사와 충분한 수분 섭취가 중요합니다!', '스트레스 관리에 특별히 신경쓰세요!'],
            40: ['몸의 신호를 잘 들어보고 무리하지 마세요!', '술, 담배, 카페인 섭취를 줄이는 것이 좋겠습니다!', '전문의와 상담해보는 것을 권합니다!'],
            30: ['오늘은 몸조리에 집중하는 것이 최우선입니다!', '무리한 활동은 피하고 푹 쉬세요!', '몸에 좋은 음식을 챙겨드시기 바랍니다!']
        }
    },
    work: {
        name: '직장운',
        icon: '💼',
        messages: {
            90: ['승진이나 좋은 소식이 있을 수 있는 날입니다!', '새로운 프로젝트에서 큰 성과를 거둘 것입니다!', '동료들과의 협업이 완벽하게 이루어질 것입니다!'],
            80: ['업무 능력이 인정받아 칭찬을 들을 수 있습니다!', '새로운 기회나 제안이 들어올 수 있습니다!', '창의적인 아이디어로 문제를 해결할 수 있을 것입니다!'],
            70: ['안정적이고 효율적으로 업무를 처리할 수 있습니다!', '팀워크가 좋아져 프로젝트가 순조롭게 진행될 것입니다!', '꾸준한 노력이 좋은 결과로 이어질 것입니다!'],
            60: ['조금 더 집중하면 원하는 성과를 얻을 수 있습니다!', '상사나 동료와의 소통을 늘려보세요!', '새로운 스킬을 배우기 좋은 시기입니다!'],
            50: ['현재 맡은 일에 충실하며 실수하지 않도록 주의하세요!', '급한 결정보다는 신중한 판단이 필요합니다!', '워라밸을 유지하며 번아웃을 예방하세요!'],
            40: ['업무상 갈등이나 오해가 생길 수 있으니 조심하세요!', '중요한 미팅이나 발표는 피하는 것이 좋겠습니다!', '실수를 줄이기 위해 더욱 꼼꼼히 체크하세요!'],
            30: ['오늘은 새로운 일을 시작하지 말고 현상 유지하세요!', '스트레스를 받는 업무는 내일로 미루는 것이 좋겠습니다!', '동료들과의 관계에서 조심스럽게 행동하세요!']
        }
    },
    study: {
        name: '학업운',
        icon: '📚',
        messages: {
            90: ['집중력이 최고조에 달해 어려운 공부도 술술 풀릴 것입니다!', '시험이나 발표에서 뛰어난 성과를 거둘 것입니다!', '새로운 지식을 빠르게 흡수할 수 있는 날입니다!'],
            80: ['학습 효율이 높아져 많은 것을 배울 수 있을 것입니다!', '궁금했던 문제들이 명쾌하게 해결될 것입니다!', '그룹 스터디나 토론이 큰 도움이 될 것입니다!'],
            70: ['꾸준한 학습으로 실력이 향상될 것입니다!', '복습을 통해 기초를 더욱 탄탄히 다질 수 있습니다!', '새로운 학습 방법을 시도해보는 것도 좋겠습니다!'],
            60: ['조금 더 집중하면 원하는 성과를 얻을 수 있습니다!', '어려운 부분은 선생님이나 친구에게 도움을 요청하세요!', '계획적인 학습 스케줄을 세워보세요!'],
            50: ['무리하지 말고 자신의 페이스에 맞춰 공부하세요!', '암기보다는 이해 위주의 학습이 효과적일 것입니다!', '충분한 휴식으로 뇌를 재충전하세요!'],
            40: ['집중력이 떨어질 수 있으니 짧은 시간씩 공부하세요!', '중요한 시험이나 과제는 다시 한번 점검해보세요!', '스트레스를 줄이고 마음을 편안하게 가지세요!'],
            30: ['오늘은 공부보다는 휴식을 취하는 것이 좋겠습니다!', '무리한 학습은 피하고 가벼운 독서 정도만 하세요!', '컨디션 회복에 집중하는 시간으로 보내세요!']
        }
    }
};

// 럭키 아이템과 색상 데이터
const LUCKY_ITEMS = {
    items: ['반지', '목걸이', '시계', '향수', '립밤', '차키', '지갑', '스마트폰 케이스', '노트', '펜', '머그컵', '이어폰', '선글라스', '모자', '가방', '양말', '향초', '식물', '책갈피', '스티커'],
    colors: ['빨강', '파랑', '노랑', '초록', '보라', '분홍', '하늘색', '주황', '흰색', '검정', '금색', '은색', '민트', '라벤더', '코랄', '터콰이즈'],
    numbers: ['3', '7', '9', '12', '21', '27', '33', '42', '51', '63'],
    directions: ['동쪽', '서쪽', '남쪽', '북쪽', '동남쪽', '동북쪽', '서남쪽', '서북쪽']
};

// 개선된 오늘의 운세 계산 함수
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
    
    const luckyHash = birthdate.replaceAll('-', '') + dateStr + 'lucky';
    let lHash = 0;
    for (let i = 0; i < luckyHash.length; i++) {
        lHash = (lHash * 41 + luckyHash.charCodeAt(i)) % 100000;
    }
    
    const luckyItem = LUCKY_ITEMS.items[Math.abs(lHash) % LUCKY_ITEMS.items.length];
    const luckyColor = LUCKY_ITEMS.colors[Math.abs(lHash + 1) % LUCKY_ITEMS.colors.length];
    const luckyNumber = LUCKY_ITEMS.numbers[Math.abs(lHash + 2) % LUCKY_ITEMS.numbers.length];
    const luckyDirection = LUCKY_ITEMS.directions[Math.abs(lHash + 3) % LUCKY_ITEMS.directions.length];
    
    return {
        categories: results,
        lucky: {
            item: luckyItem,
            color: luckyColor,
            number: luckyNumber,
            direction: luckyDirection
        },
        date: dateStr
    };
}

// 운세 결과를 HTML로 렌더링하는 함수 (수정된 버전)
function renderEnhancedDailyFortune(fortuneData, name = '') {
    const nameTitle = name ? `<b>${name}</b>님의 ` : '';
    let html = `<div class="result-section">
        <div class="section-title-result">🌟 ${nameTitle}오늘의 운세</div>
        <div class="fortune-date">📅 ${fortuneData.date}</div>
    </div>`;
    
    // 각 카테고리별 운세 카드 (기존 createResultCard 함수 사용)
    html += '<div class="result-section">';
    Object.values(fortuneData.categories).forEach((category, index) => {
        const isMainCard = index === 0; // 첫 번째 카드(총운)를 메인으로
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
    html += `<div class="result-section">
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
    </div>`;
    
    // 안내 정보
    html += `<div class="info-box">
        <div class="info-title">📋 오늘의 운세 안내</div>
        <div class="info-content">
            <strong>✨ 매일 새로운 운세:</strong> 시간대별로 다른 결과가 나타납니다.<br/>
            <strong>🎯 6가지 영역:</strong> 총운, 연애운, 재물운, 건강운, 직장운, 학업운을 종합 분석<br/>
            <strong>🍀 럭키 아이템:</strong> 오늘 지니고 다니면 좋은 아이템들을 추천합니다.<br/>
            ※ 운세는 재미와 참고용이며, 긍정적인 마음가짐이 가장 중요합니다.
        </div>
    </div>`;
    
    return html;
}

function calcMatch(a,b){
    if(!a||!b) return {score:null,text:'두 생년월일을 모두 입력하세요.'};
    const seed=(a+b).replaceAll('-','');
    let h=0;
    for(let i=0;i<seed.length;i++) h=(h*33+seed.charCodeAt(i))%100000;
    const s=h%101;
    const text=s>=80?'운명선 강하게 연결! 서로의 성장을 밀어줍니다.'
        :s>=60?'잘 맞는 편. 대화의 리듬이 좋습니다.'
        :s>=40?'노력형 궁합. 규칙적인 소통이 해법.'
        :s>=20?'차이 큼. 공동의 목표를 작게 쪼개보세요.'
        :'생활 리듬·가치관 점검 필요. 천천히 관계 설계하기.';
    return {score:s,text};
}

function calcYear(b){
    if(!b) return {idx:null,text:'생년월일을 입력하세요.'};
    const [y,m,d]=b.split('-').map(Number);
    const k=(y+m+d+2025)%6;
    const t=['도약의 해: 새로운 직무나 프로젝트로의 이동이 유리.',
        '성장의 해: 배움에 투자할수록 보상이 큼.',
        '관계의 해: 협업/파트너십에서 기회.',
        '안정의 해: 재무·건강 관리가 성과로.',
        '전환의 해: 낡은 것을 비우고 새로 설계.',
        '휴식의 해: 과부하를 줄이고 페이스 조절.'][k];
    return {idx:k,text:t};
}

// ===== 결과 시트 =====
const sheet=$('#sheetBackdrop'),sheetTitle=$('#sheetTitle'),sheetContent=$('#sheetContent');
let lastResult=null;

function openSheet(title,content,savePayload){
    if(!sheet) return;
    sheetTitle.textContent=title;
    if (typeof content === 'string' && content.includes('<')) {
        sheetContent.innerHTML = content;
    } else {
        sheetContent.textContent = content?.toString?.() || '';
    }
    sheet.classList.add('show');
    lastResult=savePayload||null;
    
    setTimeout(() => {
        $$('.element-fill').forEach(fill => {
            const width = fill.style.width;
            fill.style.width = '0%';
            setTimeout(() => fill.style.width = width, 100);
        });
    }, 300);
}

function closeSheet(){
    if(!sheet) return;
    sheet.classList.remove('show');
}

// ===== 사주 운세풀이 함수들 =====
function createPillarsGrid(pillars) {
    return `<div class="pillars-grid">
        <div class="pillar-card">
            <div class="pillar-label">연주</div>
            <div class="pillar-value">${pillars.year || '-'}</div>
        </div>
        <div class="pillar-card">
            <div class="pillar-label">월주</div>
            <div class="pillar-value">${pillars.month || '-'}</div>
        </div>
        <div class="pillar-card">
            <div class="pillar-label">일주</div>
            <div class="pillar-value">${pillars.day || '-'}</div>
        </div>
        <div class="pillar-card">
            <div class="pillar-label">시주</div>
            <div class="pillar-value">${pillars.time || '-'}</div>
        </div>
    </div>`;
}

function createElementChart(countsAll) {
    const KEYS = ['木','火','土','金','水'];
    const total = KEYS.reduce((a,k)=>a+(countsAll[k]||0),0);
    let html = '<div class="element-distribution">';
    KEYS.forEach(key => {
        const info = WUXING_INFO[key];
        const value = countsAll[key] || 0;
        const percentage = total ? Math.round((value/total)*100) : 0;
        html += `<div class="element-item">
            <div class="element-name">${info.ko}</div>
            <div class="element-bar">
                <div class="element-fill" style="width: ${percentage}%; background: ${info.color}"></div>
            </div>
            <div class="element-percentage">${percentage}%</div>
        </div>`;
    });
    html += '</div>';
    return html;
}

function createResultCard(icon, title, value, description, isMain = false, cardType = '') {
    let cardClass = 'result-card';
    if (isMain) {
        cardClass += ' main-result';
    }
    if (cardType) {
        cardClass += ' ' + cardType;
    }
    
    const iconClass = cardType.includes('lifetime') ? 'card-icon lifetime' :
        cardType.includes('daeun') ? 'card-icon daeun' :
        cardType.includes('timing') ? 'card-icon timing' :
        cardType.includes('caution') ? 'card-icon caution' :
        cardType.includes('advice') ? 'card-icon advice' : 'card-icon';
    
    return `<div class="${cardClass}">
        <div class="card-header">
            <div class="${iconClass}">${icon}</div>
            <div class="card-title">${title}</div>
        </div>
        <div class="card-value">${value}</div>
        <div class="card-description">${description}</div>
    </div>`;
}

// ===== 손금 핵심 수정 부분 =====
// 실제 손 이미지 경로 (제공받은 이미지 사용)
const PALM_BASE_IMG = 'https://i.imgur.com/c3jAyyh.png';

// 손금 변환 설정 (필요시 미세조정용)
const PALM_TRANSFORMS = {
    base: { tx: 0, ty: 0, sx: 1, sy: 1, rot: 0 }
};

// 실제 손 이미지에 맞는 정확한 손금 좌표 (viewBox: 800x1200)
const PALM_PATHS = {
    life: {
        // 📏 짧은 생명선 - 손바닥 중간까지만 (이미지 왼쪽)
        '짧은 생명선': 'M580 380 Q 540 430 510 480 Q 485 520 470 560 Q 465 580 475 570',
        // 📏 긴 생명선 - 손목 근처까지 길게 (이미지 오른쪽)
        '긴 생명선': 'M580 380 Q 520 450 480 520 Q 440 600 420 680 Q 400 760 390 840 Q 385 920 395 1000 Q 410 1060 430 1100',
        // 📏 깊고 뚜렷한 생명선 - 가장 길고 뚜렷하게
        '깊고 뚜렷한 생명선': 'M585 375 Q 515 440 475 510 Q 435 590 415 670 Q 395 750 385 830 Q 380 910 390 990 Q 405 1050 425 1110'
    },
    head: {
        // 이미지 기준으로 정확한 지혜선 좌표 조정
        '긴 지혜선': 'M200 450 L 650 420', // 손바닥을 거의 가로질러 긴 직선
        '짧은 지혜선': 'M200 450 L 450 435', // 손바닥 중간까지만
        '곡선형 지혜선': 'M200 450 Q 350 460 450 520 Q 500 560 520 600' // 아래로 휘어지는 곡선
    },
    heart: {
        '긴 감정선': 'M120 320 Q 200 315 280 312 Q 360 309 440 308 Q 520 307 580 310',
        '짧은 감정선': 'M140 325 Q 200 320 260 318 Q 320 316 380 316 Q 440 316 480 318',
        '곡선형 감정선': 'M130 330 Q 210 310 290 300 Q 370 290 450 295 Q 530 300 590 315'
    },
    fate: {
        '뚜렷한 운명선': 'M400 1100 Q 405 900 410 700 Q 415 500 420 300 Q 425 200 430 120',
        '흐린 운명선': 'M400 1100 Q 402 980 404 860 M406 820 Q 408 700 410 580 M412 540 Q 414 420 416 300 M418 260 Q 420 180 422 140',
        '이중 운명선': 'M390 1080 Q 393 880 396 680 Q 399 480 402 280 M410 1060 Q 413 860 416 660 Q 419 460 422 260 Q 425 160 428 100'
    },
    sun: {
        '뚜렷한 태양선': 'M520 1000 Q 525 850 530 700 Q 535 550 540 400 Q 545 300 550 220',
        '흐린 태양선': 'M520 1000 Q 522 900 524 800 M526 760 Q 528 660 530 560 M532 520 Q 534 420 536 320 M538 280 Q 540 220 542 180',
        '여러 갈래 태양선': 'M510 980 Q 513 830 516 680 Q 519 530 522 380 M520 1000 Q 525 850 530 700 Q 535 550 540 400 M530 960 Q 533 810 536 660 Q 539 510 542 360'
    },
    marriage: {
        '한 개의 뚜렷한 결혼선': 'M100 300 L 140 295',
        '여러 개의 결혼선': 'M100 290 L 135 285 M102 305 L 137 300 M104 320 L 139 315',
        '위로 향하는 결혼선': 'M100 310 Q 120 300 140 290'
    },
    health: {
        '없는 건강선': '',
        '뚜렷한 건강선': 'M460 1080 Q 380 960 300 840 Q 220 720 160 600 Q 120 520 100 440',
        '끊어진 건강선': 'M460 1080 Q 430 1020 400 960 M380 920 Q 340 860 300 800 M280 760 Q 240 700 200 640 M180 600 Q 150 560 120 520'
    },
    intuition: {
        '뚜렷한 직감선': 'M680 1060 Q 620 980 560 900 Q 500 820 440 740 Q 380 660 320 580',
        '흐린 직감선': 'M680 1060 Q 650 1020 620 980 M600 940 Q 570 900 540 860 M520 820 Q 490 780 460 740 M440 700 Q 410 660 380 620',
        '이중 직감선': 'M690 1070 Q 630 990 570 910 Q 510 830 450 750 M670 1040 Q 610 960 550 880 Q 490 800 430 720 Q 370 640 310 560'
    },
    venus: {
        '완전한 금성대': 'M580 280 Q 540 270 500 275 Q 460 280 420 290 Q 380 300 350 320',
        '끊어진 금성대': 'M580 280 Q 560 275 540 273 M520 272 Q 490 275 460 280 M440 285 Q 410 292 380 302 M360 308 Q 350 315 345 322',
        '여러 갈래 금성대': 'M585 285 Q 545 275 505 280 Q 465 285 425 295 M580 275 Q 540 265 500 270 Q 460 275 420 285 M575 295 Q 535 285 495 290 Q 455 295 415 305'
    }
};

// 선 스타일 설정 (굵기 증가)
const PALM_STYLES = {
    life: {
        '긴 생명선': { width: 12, color: '#E91E63', opacity: 1 },
        '짧은 생명선': { width: 10, color: '#EC407A', opacity: 0.9 },
        '깊고 뚜렷한 생명선': { width: 14, color: '#C2185B', opacity: 1 }
    },
    head: {
        // 이미지에 맞게 지혜선 스타일 조정
        '긴 지혜선': { width: 6, color: '#1565C0', opacity: 1 }, // 파란색, 적당한 굵기
        '짧은 지혜선': { width: 6, color: '#1976D2', opacity: 1 }, // 파란색, 적당한 굵기
        '곡선형 지혜선': { width: 6, color: '#0D47A1', opacity: 1 } // 진한 파란색, 적당한 굵기
    },
    heart: {
        '긴 감정선': { width: 11, color: '#FF4081', opacity: 1 },
        '짧은 감정선': { width: 9, color: '#FF6EC7', opacity: 0.85 },
        '곡선형 감정선': { width: 10, color: '#F06292', opacity: 0.9 }
    },
    fate: {
        '뚜렷한 운명선': { width: 11, color: '#FF9800', opacity: 1 },
        '흐린 운명선': { width: 7, color: '#FFB74D', opacity: 0.5 },
        '이중 운명선': { width: 9, color: '#F57C00', opacity: 0.9 }
    },
    sun: {
        '뚜렷한 태양선': { width: 10, color: '#FFC107', opacity: 1 },
        '흐린 태양선': { width: 7, color: '#FFCA28', opacity: 0.4 },
        '여러 갈래 태양선': { width: 8, color: '#FFB300', opacity: 0.75 }
    },
    marriage: {
        '한 개의 뚜렷한 결혼선': { width: 9, color: '#9C27B0', opacity: 1 },
        '여러 개의 결혼선': { width: 7, color: '#BA68C8', opacity: 0.8 },
        '위로 향하는 결혼선': { width: 9, color: '#7B1FA2', opacity: 1 }
    },
    health: {
        '없는 건강선': { width: 0, color: 'transparent', opacity: 0 },
        '뚜렷한 건강선': { width: 9, color: '#00BCD4', opacity: 1 },
        '끊어진 건강선': { width: 7, color: '#4DD0E1', opacity: 0.6 }
    },
    intuition: {
        '뚜렷한 직감선': { width: 9, color: '#673AB7', opacity: 1 },
        '흐린 직감선': { width: 6, color: '#9575CD', opacity: 0.5 },
        '이중 직감선': { width: 8, color: '#512DA8', opacity: 0.85 }
    },
    venus: {
        '완전한 금성대': { width: 8, color: '#795548', opacity: 1 },
        '끊어진 금성대': { width: 7, color: '#A1887F', opacity: 0.6 },
        '여러 갈래 금성대': { width: 7, color: '#6D4C41', opacity: 0.75 }
    }
};

// 스타일 추가 함수
function ensurePalmLayoutStyles(){
    if (document.getElementById('palm-layout-fix')) return;
    const css = `
        :root {
            --sheetW: 640px;
        }
        
        #sheetContent .result-section,
        #sheetContent .palm-result-image,
        #sheetContent .result-card,
        #sheetContent .info-box {
            max-width: var(--sheetW);
            margin: 0 auto;
        }
        
        .palm-photo-wrap{
            position:relative;
            background:#fff;
            border-radius:16px;
            overflow:hidden;
            max-width: 400px;
            margin: 0 auto;
        }
        
        .palm-photo-wrap img{
            display:block;
            width:100%;
            height:auto;
        }
        
        .palm-photo-wrap .palm-overlay{
            position:absolute;
            inset:0;
            width:100%;
            height:100%;
            pointer-events:none;
        }
        
        #view-palm .palm-type-card img,
        #view-palm .palm-type-card svg {
            display:none !important;
        }
        
        .palm-subtitle {
            text-align: center;
            margin-bottom: 25px;
            color: #666;
            font-size: 15px;
            padding: 15px;
            background: #f8f9ff;
            border-radius: 10px;
        }
        
        .palm-subtypes-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 20px;
        }
        
        .palm-subtype-card {
            border: 3px solid #e0e0e0;
            border-radius: 18px;
            padding: 20px;
            cursor: pointer;
            transition: all 0.3s ease;
            background: white;
            text-align: center;
        }
        
        .palm-subtype-card:hover {
            border-color: #667eea;
            transform: translateY(-5px);
            box-shadow: 0 10px 30px rgba(102, 126, 234, 0.2);
        }
        
        .palm-subtype-emoji {
            font-size: 48px;
            margin-bottom: 15px;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 80px;
        }
        
        .palm-subtype-image {
            margin-bottom: 15px;
        }
        
        .palm-subtype-image .palm-photo-wrap {
            max-height: 180px;
            overflow: hidden;
            margin: 0 auto;
        }
        
        .palm-subtype-title {
            font-weight: bold;
            color: #333;
            margin-bottom: 8px;
            text-align: center;
            font-size: 16px;
        }
        
        .palm-subtype-preview {
            font-size: 13px;
            color: #666;
            text-align: center;
            line-height: 1.4;
        }
        
        .result-card {
            background: white;
            border-radius: 15px;
            padding: 25px;
            margin: 20px 0;
            box-shadow: 0 4px 15px rgba(0,0,0,0.08);
            border-left: 5px solid #667eea;
        }
        
        .result-header {
            display: flex;
            align-items: center;
            margin-bottom: 18px;
        }
        
        .result-icon, .card-icon {
            font-size: 28px;
            margin-right: 15px;
        }
        
        .result-title, .card-title {
            font-size: 20px;
            font-weight: bold;
            color: #333;
        }
        
        .result-subtitle {
            font-size: 15px;
            color: #666;
            margin-top: 3px;
        }
        
        .result-content, .card-description {
            color: #333;
            line-height: 1.7;
            font-size: 15px;
        }
        
        .result-content strong, .card-description strong {
            color: #667eea;
            font-weight: 700;
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
        
        .palm-result-image {
            text-align: center;
            margin: 25px 0;
            padding: 20px;
            background: #f8f9ff;
            border-radius: 15px;
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
        
        /* 로또 스타일 */
        .lotto-wrap{
            text-align:center;
        }
        .lotto-balls{
            display:flex;
            gap:10px;
            justify-content:center;
            flex-wrap:wrap;
            margin:10px 0 6px;
        }
        .ball{
            width:44px;
            height:44px;
            border-radius:50%;
            display:flex;
            align-items:center;
            justify-content:center;
            font-weight:800;
            color:#fff;
            background:linear-gradient(135deg,#667eea,#764ba2);
            box-shadow:0 6px 16px rgba(0,0,0,.18);
        }
        .ball.bonus{
            background:linear-gradient(135deg,#ff9800,#ffc107);
        }
        .lotto-meta{
            color:#666;
            font-size:12px;
            margin-top:6px;
        }
        
        /* 운세 카드 스타일 */
        .fortune-date {
            text-align: center;
            color: #667eea;
            font-weight: bold;
            margin-bottom: 20px;
            font-size: 16px;
        }
        
        .fortune-card {
            margin: 15px 0;
            border-left: 5px solid;
        }
        
        .fortune-card:nth-child(1) { border-left-color: #ff6b35; }
        .fortune-card:nth-child(2) { border-left-color: #f7931e; }
        .fortune-card:nth-child(3) { border-left-color: #ffd700; }
        .fortune-card:nth-child(4) { border-left-color: #32cd32; }
        .fortune-card:nth-child(5) { border-left-color: #4169e1; }
        .fortune-card:nth-child(6) { border-left-color: #9370db; }
        
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
    `;
    const s = document.createElement('style');
    s.id = 'palm-layout-fix';
    s.textContent = css;
    document.head.appendChild(s);
}

function ensurePalmStyles(){
    ensurePalmLayoutStyles();
}

// 손금 메뉴 라벨을 한국어+이모지로 설정
function ensurePalmMenuLabels(){
    const labels = {
        life:{t:'생명선', e:'🌱'},
        head:{t:'지혜선', e:'🧠'},
        heart:{t:'감정선', e:'💖'},
        fate:{t:'운명선', e:'✨'},
        sun:{t:'태양선', e:'☀️'},
        marriage:{t:'결혼선', e:'💕'},
        health:{t:'건강선', e:'⚕️'},
        intuition:{t:'직감선', e:'🔮'},
        venus:{t:'금성대', e:'💫'}
    };
    
   $$('.palm-type-card').forEach(card=>{
        const type = card.dataset.palmType;
        const meta = labels[type];
        if (!meta) return;
        const titleEl = card.querySelector('.title, .card-title, .item-title, h3, h4') || card;
        titleEl.textContent = `${meta.t} ${meta.e}`;
    });
}

// 수정된 renderPalmPhoto 함수 - 각 서브타입에 맞는 정확한 손금선 렌더링
function renderPalmPhoto(palmType, selectedReadingType){
    const pathString = PALM_PATHS[palmType]?.[selectedReadingType];
    const style = PALM_STYLES[palmType]?.[selectedReadingType];
    
    if (!pathString) {
        console.warn(`No path found for ${palmType} - ${selectedReadingType}`);
        return `<div class="palm-photo-wrap"><img src="${PALM_BASE_IMG}" alt="hand"/></div>`;
    }
    
    if (!pathString.trim()) {
        return `<div class="palm-photo-wrap"><img src="${PALM_BASE_IMG}" alt="hand"/></div>`;
    }
    
    const paths = pathString.split(' M').filter(p => p.trim());
    if (paths.length > 1) {
        paths[0] = 'M' + paths[0];
        for (let i = 1; i < paths.length; i++) {
            paths[i] = 'M' + paths[i];
        }
    }
    
    const lineWidth = style?.width || 5;
    const color = style?.color || '#667eea';
    const opacity = style?.opacity || 1;
    
    return `<div class="palm-photo-wrap">
        <img src="${PALM_BASE_IMG}" alt="hand"/>
        <svg class="palm-overlay" viewBox="0 0 800 1200" preserveAspectRatio="xMidYMid meet">
            ${paths.map(d => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${lineWidth}" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}"/>`).join('')}
        </svg>
    </div>`;
}

// 손금 서브타입 선택 화면 (이모지만 표시)
function showPalmSubTypes(palmType) {
    ensurePalmStyles();
    const palmData = PALM_READINGS[palmType];
    if (!palmData) return;
    
    let html = '';
    html += '<div class="result-section">';
    html += `<div class="section-title-result">🖐️ ${palmData.name} - 타입 선택</div>`;
    html += '<div class="palm-subtitle">✨ 관심 있는 손금 유형을 선택하세요</div>';
    html += '<div class="palm-subtypes-grid">';
    
    palmData.types.forEach((typeData, index) => {
        const emoji = PALM_TYPE_EMOJIS[palmType] || '🖐️';
        html += `<div class="palm-subtype-card" data-palm-type="${palmType}" data-subtype="${typeData.type}" data-index="${index}">
            <div class="palm-subtype-emoji">${emoji}</div>
            <div class="palm-subtype-title">${typeData.type}</div>
            <div class="palm-subtype-preview">${typeData.meaning.substring(0, 60)}...</div>
        </div>`;
    });
    
    html += '</div>';
    html += '</div>';
    
    openSheet(palmData.name + ' 타입 선택', html, {
        type: 'palm-selection',
        palmType
    });
    
    setTimeout(() => {
        $$('.palm-subtype-card').forEach(card => {
            card.addEventListener('click', () => {
                const palmType = card.dataset.palmType;
                const subType = card.dataset.subtype;
                const index = parseInt(card.dataset.index);
                showDetailedPalmReading(palmType, subType, index);
            });
        });
    }, 100);
}

// 선택된 서브타입의 상세 결과 (색상 개선)
function showDetailedPalmReading(palmType, selectedType, typeIndex) {
    ensurePalmStyles();
    const palmData = PALM_READINGS[palmType];
    const selectedReading = palmData.types[typeIndex];
    if (!palmData || !selectedReading) return;
    
    const topImage = renderPalmPhoto(palmType, selectedType);
    
    let html = '';
    html += '<div class="result-section">';
    html += '<div class="section-title-result">🖐️ ' + palmData.name + ' 해석</div>';
    html += '<div class="palm-result-image">' + topImage + '</div>';
    
    html += createResultCard('🔍','손금 유형', selectedReading.type, 
        '<strong style="color: #667eea;">의미:</strong> ' + selectedReading.meaning, true,'fortune-detail-card palm');
    
    html += createResultCard('💡','조언','개인 맞춤 가이드', 
        '<strong style="color: #667eea;">권장사항:</strong> ' + selectedReading.advice,false,'fortune-detail-card advice');
    
    html += '</div>';
    
    html += '<div class="info-box">';
    html += '<div class="info-title">📋 손금 보기 안내</div>';
    html += '<div class="info-content">' +
        '<strong>손금이란:</strong> ' + palmData.description + '<br/>' +
        '※ 손금은 참고용이며, 개인의 노력과 선택이 운명을 만들어갑니다.<br/>' +
        '※ 양손을 모두 확인해보시고, 더 뚜렷한 쪽을 참고하세요.<br/>' +
        '※ 이 앱은 왼손 기준으로 제작되었습니다.' +
        '</div>';
    html += '</div>';
    
    openSheet(palmData.name + ' 해석', html, {
        type: 'palm',
        palmType,
        reading: selectedReading
    });
    
    showPalmInCrystal?.(palmData.name, selectedReading.type);
    reactCrystal?.(palmData.name + '을 확인했습니다! ✨');
    pushRecent?.({
        type:'palm',
        palmName:palmData.name,
        palmType:selectedReading.type,
        meaning:selectedReading.meaning
    });
}

function showPalmReading(palmType){
    showPalmSubTypes(palmType);
}

function initializePalmReading() {
    ensurePalmStyles();
    ensurePalmMenuLabels();
    
    setTimeout(() => {
        const palmCards = $('.palm-type-card');
        palmCards.forEach(card => {
            if (card.__palmBound) return;
            card.addEventListener('click', () => {
                const palmType = card.dataset.palmType;
                selectPalmType(card, palmType);
            });
            card.__palmBound = true;
        });
        
        const randomBtn = $('#btnRandomPalm');
        if (randomBtn && !randomBtn.__palmBound) {
            randomBtn.addEventListener('click', drawRandomPalm);
            randomBtn.__palmBound = true;
        }
    }, 100);
}

function selectPalmType(cardElement, palmType) {
   $$('.palm-type-card').forEach(card => card.classList.remove('selected'));
    cardElement.classList.add('selected');
    showPalmReading(palmType);
}

function drawRandomPalm() {
    const palmTypes = ['life', 'head', 'heart', 'fate', 'sun', 'marriage', 'health', 'intuition', 'venus'];
    const randomType = palmTypes[Math.floor(Math.random() * palmTypes.length)];
    const randomCard = $(`.palm-type-card[data-palm-type="${randomType}"]`);
    if (randomCard) {
        setTimeout(() => selectPalmType(randomCard, randomType), 300);
    }
}

function showPalmInCrystal(palmName, palmType) {
    const crystal = $('#mainCrystal');
    if (!crystal) return;
    
    crystal.classList.add('crystal-reveal');
    crystal.innerHTML = `<div class="crystal-card">
        <div class="title">${palmName}</div>
        <div class="dir">${palmType}</div>
    </div>`;
    
    setTimeout(() => {
        crystal.classList.remove('crystal-reveal');
        crystal.innerHTML = '구슬 속 미래를<br>확인해보세요';
    }, 3500);
}

// ===== 로또 (6/45) =====
// 간단한 시드 랜덤 (LCG)
function seededRandomFactory(seedStr='') {
    let h = 2166136261 >>> 0; // FNV-1a 기반 해시 시드
    for (let i = 0; i < seedStr.length; i++) {
        h ^= seedStr.charCodeAt(i);
        h = Math.imul(h, 16777619) >>> 0;
    }
    let state = h;
    return function rnd() {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return (state >>> 0) / 0xFFFFFFFF;
    };
}

// ISO 주차 키 (같은 주에는 같은 결과)
function isoWeekKey(date = new Date()) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

// 1세트(6개) 생성 – 안전 버전
function generateLottoSet(seedStr) {
    // 1) 문자열 씨드를 32비트 정수로 안전 변환
    const s = String(seedStr ?? '');
    const digits = s.replace(/\D/g, '');
    let seed = Number.isFinite(Date.parse(s)) ? Date.parse(s) : NaN;
    
    if (!Number.isFinite(seed) && digits.length === 8) {
        const norm = `${digits.slice(0,4)}-${digits.slice(4,6)}-${digits.slice(6,8)}`;
        seed = Date.parse(norm);
    }
    
    if (!Number.isFinite(seed)) {
        let h = 2166136261; // FNV-1a
        for (let i = 0; i < s.length; i++) h = (h ^ s.charCodeAt(i)) * 16777619 >>> 0;
        seed = (h || (Date.now() >>> 0));
    }
    
    // 2) LCG 기반 난수
    let state = seed >>> 0;
    function rnd() {
        state = (1664525 * state + 1013904223) >>> 0;
        return state / 2 ** 32; // 0~1
    }
    
    // 3) 번호 6개 뽑기 + 무한루프 가드
    const picked = new Set();
    let guard = 0;
    while (picked.size < 6 && guard++ < 4000) {
        const n = Math.floor(rnd() * 45) + 1; // 1~45
        if (n >= 1 && n <= 45) picked.add(n);
    }
    
    // 4) 혹시 모자라면 Math.random으로 채워서라도 종료
    while (picked.size < 6) {
        picked.add(Math.floor(Math.random() * 45) + 1);
    }
    
    return Array.from(picked).sort((a, b) => a - b);
}

function generateLottoNumbers(birth='') {
    const today = new Date();
    const utc = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    const day = utc.getUTCDay() || 7;
    utc.setUTCDate(utc.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
    const isoWeek = Math.ceil((((utc - yearStart) / 86400000) + 1) / 7);
    
    const seed = `${utc.getUTCFullYear()}-W${String(isoWeek).padStart(2,'0')}:${birth}`;
    const main = generateLottoSet(seed);
    
    // 보너스 번호 생성
    let bonus;
    const rnd = seededRandomFactory(seed + '#bonus');
    do {
        bonus = Math.floor(rnd() * 45) + 1;
    } while (main.includes(bonus));
    
    return {
        main,
        bonus,
        seedInfo: `주 ${isoWeek}${birth ? ` · ${birth}` : ''}`
    };
}

// 렌더링 (호환·방어 버전)
function renderLottoResult(payload, birthStr = '') {
    try {
        let sets = [];
        let seedInfo = '';
        
        if (Array.isArray(payload)) {
            sets = payload.filter(arr => Array.isArray(arr) && arr.length);
        } else if (payload && typeof payload === 'object') {
            if (Array.isArray(payload.main)) sets.push(payload.main);
            seedInfo = payload.seedInfo || '';
        }
        
        if (!sets.length && payload && payload.main) {
            sets = [payload.main];
        }
        
        if (!sets.length) {
            return `<div class="info-box">
                <div class="info-title">⚠️ 생성 실패</div>
                <div class="info-content">번호 생성에 실패했어요. 다시 시도해 주세요.</div>
            </div>`;
        }
        
        const nameTitle = '';
        let html = `<div class="result-section">
            <div class="section-title-result">🎲 ${nameTitle}이번 주 행운번호</div>`;
        
        const main = sets[0] || payload.main;
        const bonus = payload.bonus;
        
        const ballsHtml = main
            .map(n => `<div class="ball">${String(n).padStart(2,'0')}</div>`)
            .join('');
        
        const bonusHtml = bonus == null ? '' : 
            `<div style="align-self:center;font-weight:800;margin:0 2px">+</div>
             <div class="ball bonus">${String(bonus).padStart(2,'0')}</div>`;
        
        html += `<div class="lotto-wrap">
            <div class="lotto-balls">
                ${ballsHtml}
                ${bonusHtml}
            </div>
            <div class="lotto-meta">생성 기준: ${seedInfo} · 참고용</div>
        </div>`;
        
        html += `</div>
        <div class="info-box">
            <div class="info-title">📌 안내</div>
            <div class="info-content">
                • 결과는 <strong>같은 주(ISO 주)</strong>에는 동일합니다.<br/>
                • 입력한 생년월일이 같으면 같은 주에는 같은 추천이 나옵니다.<br/>
                • 재미/참고용이며, 책임있는 구매를 권장해요. 🍀
                ${seedInfo ? `<br/>• 생성 기준: ${seedInfo}` : ''}
            </div>
        </div>`;
        
        return html;
    } catch (e) {
        console.error('renderLottoResult error:', e);
        return `<div class="info-box">
            <div class="info-title">⚠️ 렌더 오류</div>
            <div class="info-content">화면 구성 중 문제가 발생했어요. 새로고침 후 다시 시도해 주세요.</div>
        </div>`;
    }
}

// ===== 타로 =====
function ensureTarotReady(){
    return Array.isArray(TAROT_DETAILS) && TAROT_DETAILS.length === 22;
}

if (!window.__tarotEscBound){
    document.addEventListener('keydown', (e)=>{
        if (e.key === 'Escape') closeTarotModal();
    });
    window.__tarotEscBound = true;
}

function initializeTarot() {
    if (!ensureTarotReady()) return;
    
    const tarotCards = document.querySelectorAll('.tarot-card-back');
    tarotCards.forEach(card => {
        if (card.__bound) return;
        card.addEventListener('click', () => {
            if (!tarotLimit.canUseTarot()) {
                tarotLimit.showLimitAlert();
                return;
            }
            if (!tarotLimit.useTarot()) {
                tarotLimit.showLimitAlert();
                return;
            }
            console.log(`💫 타로 카드 사용 (남은 횟수: ${tarotLimit.getRemainingCount()}번)`);
            selectTarotCard(card);
        });
        card.__bound = true; // ← 이 줄이 빠져있었음!
    });
    
    // 안정성 보강: DOM에 카드가 없으면 더 진행하지 않음
    if (!tarotCards || tarotCards.length === 0) return;
    
    const randomBtn = $('#btnRandomTarot');
    if (randomBtn && !randomBtn.__bound) {
        randomBtn.addEventListener('click', () => {
            if (!tarotLimit.canUseTarot()) {
                tarotLimit.showLimitAlert();
                return;
            }
            if (!tarotLimit.useTarot()) {
                tarotLimit.showLimitAlert();
                return;
            }
            console.log(`💫 랜덤 타로 사용 (남은 횟수: ${tarotLimit.getRemainingCount()}번)`);
            drawRandomTarotCard();
        }); // ← 이 닫는 괄호가 빠져있었음!
        randomBtn.__bound = true;
    }
    
    const resetBtn = $('#btnResetTarot');
    if (resetBtn && !resetBtn.__bound) {
        resetBtn.addEventListener('click', resetTarotCards);
        resetBtn.__bound = true;
    }
    
    const closeBtn = $('#tarotCloseBtn');
    if (closeBtn && !closeBtn.__bound) {
        closeBtn.addEventListener('click', closeTarotModal);
        closeBtn.__bound = true;
    }
    
    const overlay = $('#tarotModalOverlay');
    if (overlay && !overlay.__bound) {
        overlay.addEventListener('click', e => {
            if (e.target === overlay) closeTarotModal();
        });
        overlay.__bound = true;
    }
    
    resetTarotCards();
}

let selectedCards = new Set();

function selectTarotCard(cardElement) {
    if (!ensureTarotReady()) return;
    if (cardElement.classList.contains('revealed')) return;
    
    const randomTarotIndex = Math.floor(Math.random() * TAROT_DETAILS.length);
    const isUpright = Math.random() < 0.7;
    const selectedCard = TAROT_DETAILS[randomTarotIndex];
    if(!selectedCard) return;
    
    cardElement.classList.add('flipped');
    
    setTimeout(() => {
        const frontElement = document.createElement('div');
        frontElement.className = 'tarot-card-front';
        frontElement.innerHTML = `<div class="card-number">${randomTarotIndex}</div>
            <div class="card-icon">${CARD_ICONS[randomTarotIndex]}</div>
            <div class="card-name">${selectedCard.name.split('(')[0].trim()}</div>
            <div class="card-direction">${isUpright ? '정위' : '역위'}</div>`;
        cardElement.appendChild(frontElement);
        cardElement.classList.add('revealed');
        
        setTimeout(()=>{
            frontElement.style.opacity='1';
        },100);
    },300);
    
    setTimeout(()=> showTarotModal(randomTarotIndex, isUpright), 800);
    
    showCardInCrystal(selectedCard.name, isUpright);
    pushRecent({
        type:'tarot',
        card:selectedCard.name,
        upright:isUpright,
        meaning:isUpright?selectedCard.upright:selectedCard.reversed
    });
    
    reactCrystal(`${selectedCard.name.split('(')[0].trim()}을 뽑았습니다! ✨`);
}

function drawRandomTarotCard(){
    const available = $('.tarot-card-back:not(.revealed)');
    if(!available.length){
        reactCrystal('모든 카드를 이미 뽑았습니다! 🎯');
        return;
    }
    const el = available[Math.floor(Math.random()*available.length)];
    setTimeout(()=> selectTarotCard(el), 300);
}

function resetTarotCards(){
    $$('.tarot-card-back').forEach(card=>{
        card.classList.remove('flipped','revealed');
        card.style.transform='';
        card.querySelector('.tarot-card-front')?.remove();
    });
    selectedCards.clear();
    closeTarotModal();
    reactCrystal('새로운 카드들이 준비되었습니다 ✨');
}

function showTarotModal(cardIndex, isUpright){
    if (!ensureTarotReady()) return;
    const idx = Math.max(0, Math.min(TAROT_DETAILS.length-1, Number(cardIndex)||0));
    const card = TAROT_DETAILS[idx];
    if(!card) return;
    
    const modal = $('#tarotModalOverlay');
    const content = $('#tarotModalContent');
    if(!modal || !content) return;
    
    content.innerHTML = `<h2>${card.name}</h2>
        <p style="color:#6B7280; margin-bottom:20px; line-height:1.6; font-style:italic;">${card.meaning}</p>
        <div class="meaning-section upright"><h3>🔮 정방향 의미</h3><p>${card.upright}</p></div>
        <br>
        <div class="meaning-section reversed"><h3>🔄 역방향 의미</h3><p>${card.reversed}</p></div>
        <div style="margin-top:25px; padding:15px; background:rgba(255,215,0,0.1); border-radius:10px; border-left:4px solid #ffd700;">
            <h3 style="color:#ffd700; margin-bottom:10px;">${isUpright ? '🌟 현재 뽑힌 방향: 정방향' : '🌀 현재 뽑힌 방향: 역방향'}</h3>
            <p style="color:#ecf0f1; line-height:1.5;">${isUpright ? card.upright : card.reversed}</p>
        </div>`;
    
    modal.style.display='flex';
    requestAnimationFrame(()=> modal.classList.add('show'));
}

function closeTarotModal(){
    const modal = $('#tarotModalOverlay');
    if(!modal) return;
    modal.classList.remove('show');
    modal.style.display='none';
}

function showCardInCrystal(cardName, isUpright){
    const crystal = $('#mainCrystal');
    if(!crystal) return;
    
    crystal.classList.add('crystal-reveal');
    crystal.innerHTML = `<div class="crystal-card">
        <div class="title">${cardName.split('(')[0].trim()}</div>
        <div class="dir">${isUpright ? '정위' : '역위'}</div>
    </div>`;
    
    setTimeout(()=>{
        crystal.classList.remove('crystal-reveal');
        crystal.innerHTML='구슬 속 미래를<br>확인해보세요';
    },3500);
}

// ===== 운세풀이 생성 함수들 =====
function generateLifetimeFortune(r, name = '') {
    const dayGan = (r.pillars.day||'')[0] || '';
    const dayEl = GAN_WUXING[dayGan] || '';
    const KEYS = ['木','火','土','金','水'];
    const total = KEYS.reduce((a,k)=>a+(r.countsAll[k]||0),0);
    const list = KEYS.map(k=>({k, v: r.countsAll[k]||0, p: total ? Math.round((r.countsAll[k]/total)*100) : 0}))
        .sort((a,b)=>b.v-a.v);
    const strongest = list[0];
    const ssMonth = krShiShen(r.tenGods.m || '');
    
    const lifetimeTexts = {
        '木': `${name ? name+'님은' : '이 분은'} 성장과 발전을 추구하는 인생을 걷게 됩니다. 어려서부터 학습능력이 뛰어나며, 새로운 것을 배우고 흡수하는 속도가 빠릅니다. 인생 전반에 걸쳐 끊임없는 자기계발과 성장의 기회가 주어지며, 특히 교육, 기획, 창의적인 분야에서 두각을 나타낼 수 있습니다. 사람들과의 네트워킹을 통해 기회를 확장해나가는 성향이 강하며, 중년 이후에는 후배나 제자를 양성하는 역할을 맡게 될 가능성이 높습니다. 다만 너무 많은 일을 벌여놓아 마무리가 부족할 수 있으니, 우선순위를 정하고 집중하는 것이 중요합니다. 전체적으로 상승하는 인생 곡선을 그리며, 노후에도 활발한 활동을 이어갈 것입니다.`,
        
        '火': `${name ? name+'님의' : '이 분의'} 인생은 열정과 에너지로 가득한 역동적인 여정이 될 것입니다. 타고난 리더십과 표현력으로 많은 사람들에게 영향을 미치며, 특히 젊은 시절부터 주목받는 경우가 많습니다. 예술, 엔터테인먼트, 세일즈, 홍보 분야에서 특별한 재능을 발휘할 수 있으며, 사람들 앞에 서는 것을 두려워하지 않습니다. 중년기에는 자신만의 독특한 스타일로 성공을 거둘 가능성이 높습니다. 하지만 감정의 기복이 클 수 있고, 성급한 판단으로 인한 실수를 조심해야 합니다. 꾸준한 인내와 절제력을 기르면 더욱 안정된 성공을 이룰 수 있습니다. 인생 전반적으로 화려하고 역동적인 모습을 보일 것입니다.`,
        
        '土': `${name ? name+'님은' : '이 분은'} 안정과 신뢰를 바탕으로 한 견실한 인생을 살게 됩니다. 급하게 서두르기보다는 차근차근 기반을 다져나가는 성향으로, 시간이 갈수록 주변의 신뢰를 얻게 됩니다. 부동산, 금융, 운영관리, 서비스업 등에서 장기적인 성공을 거둘 수 있으며, 특히 40대 이후에는 안정된 기반 위에서 더큰 성과를 이룰 수 있습니다. 가족과 조직에서 중심적인 역할을 맡게 되며, 많은 사람들이 의지하는 존재가 됩니다. 다만 변화에 대한 적응이 다소 느릴 수 있으니, 때로는 과감한 도전도 필요합니다. 꾸준함과 성실함이 가장 큰 무기로, 말년에는 풍족하고 안정된 삶을 누릴 것입니다.`,
        
        '金': `${name ? name+'님의' : '이 분의'} 인생은 정확성과 원칙을 중시하는 체계적인 여정이 될 것입니다. 분석적 사고와 논리적 판단력이 뛰어나 전문직, 금융, 법무, 기술 분야에서 인정받을 가능성이 높습니다. 젊은 시절에는 다소 경직되어 보일 수 있지만, 경험이 쌓이면서 자신만의 확고한 전문성을 구축하게 됩니다. 재정관리 능력이 우수하여 중년 이후에는 경제적으로 안정된 생활을 할 수 있습니다. 완벽주의 성향이 강해 때로는 스트레스를 받을 수 있으니, 유연성과 포용력을 기르는 것이 중요합니다. 한번 맺은 인연은 오래가는 진정한 관계를 유지하며, 품격 있는 노후를 보낼 것입니다.`,
        
        '水': `${name ? name+'님은' : '이 분은'} 유연함과 적응력으로 다양한 경험을 하는 풍성한 인생을 살게 됩니다. 뛰어난 소통능력과 학습력으로 여러 분야를 넘나들며 활동할 수 있으며, 특히 교육, 연구, 미디어, 상담 분야에서 두각을 나타낼 수 있습니다. 직관력이 뛰어나 트렌드를 빠르게 파악하고, 변화하는 환경에 잘 적응합니다. 국제적인 활동이나 원거리 이주의 기회가 있을 수 있으며, 다양한 인맥을 통해 기회를 확장해나갑니다. 다만 한 곳에 오래 머무르지 못하는 성향이 있어, 중요한 결정에서는 신중함이 필요합니다. 깊이 있는 전문성을 기르면 더욱 큰 성취를 이룰 수 있으며, 지혜로운 만년을 보낼 것입니다.`
    };
    
    let result = lifetimeTexts[dayEl] || `${name ? name+'님의' : '이 분의'} 인생은 독특한 개성과 특별한 재능으로 특별한 여정을 걸어가게 될 것입니다.`;
    
    if (ssMonth.includes('정관') || ssMonth.includes('편관')) {
        result += ' 특히 리더십과 관리능력이 뛰어나 조직에서 중요한 역할을 맡게 될 것입니다.';
    } else if (ssMonth.includes('정재') || ssMonth.includes('편재')) {
        result += ' 재물운이 좋아 사업이나 투자에서 성과를 거둘 가능성이 높습니다.';
    } else if (ssMonth.includes('식신') || ssMonth.includes('상관')) {
        result += ' 창의적 재능과 표현력이 뛰어나 예술이나 콘텐츠 분야에서 성공할 수 있습니다.';
    }
    
    return result;
}

function generateDaeunAnalysis(r, name = '') {
    const dayGan = (r.pillars.day||'')[0] || '';
    const dayEl = GAN_WUXING[dayGan] || '';
    const birthYear = r.solar ? r.solar.getYear() : 2000;
    const currentYear = new Date().getFullYear();
    const age = currentYear - birthYear;
    
    const KEYS = ['木','火','土','金','水'];
    const total = KEYS.reduce((a,k)=>a+(r.countsAll[k]||0),0);
    const list = KEYS.map(k=>({k, v: r.countsAll[k]||0, p: total ? Math.round((r.countsAll[k]/total)*100) : 0}))
        .sort((a,b)=>b.v-a.v);
    
    let analysis = `${name ? name+'님의' : '이 분의'} 대운 흐름을 살펴보면, `;
    
    if (age < 10) {
        analysis += '현재 기초 형성기로 성격과 기본 성향이 자리잡는 중요한 시기입니다. ';
    } else if (age < 20) {
        analysis += '현재 성장기로 학습과 인격 형성의 결정적 시기에 있습니다. ';
    } else if (age < 30) {
        analysis += '현재 도약기로 사회 진출과 자아 실현이 시작되는 시기입니다. ';
    } else if (age < 40) {
        analysis += '현재 발전기로 경력 발전과 기반 구축의 핵심 시기입니다. ';
    } else if (age < 50) {
        analysis += '현재 성숙기로 안정과 성취를 이루는 절정의 시기입니다. ';
    } else if (age < 60) {
        analysis += '현재 완성기로 경험과 지혜가 절정에 달하는 시기입니다. ';
    } else {
        analysis += '현재 여유기로 후배 양성과 새로운 시작을 준비하는 시기입니다. ';
    }
    
    const strongest = list[0];
    const weakest = list[list.length-1];
    
    if (strongest.p - weakest.p > 30) {
        analysis += `타고난 ${WUXING_INFO[strongest.k].ko}의 기운이 강해 추진력이 뛰어나지만, ${WUXING_INFO[weakest.k].ko}를 보완하는 시기에는 신중함이 필요합니다. `;
    } else {
        analysis += `오행의 균형이 비교적 잘 맞아 전 생애에 걸쳐 안정된 운세를 보입니다. `;
    }
    
    if (dayEl === '木' || dayEl === '水') {
        analysis += '특히 40대 이후에 큰 성취를 이룰 가능성이 높으며, 인생 후반기로 갈수록 더욱 빛이 납니다. 지속적인 학습과 성장으로 만년에도 활발한 활동을 이어갈 것입니다.';
    } else if (dayEl === '火') {
        analysis += '젊은 시절의 활발한 에너지를 중년기에 안정적으로 활용하면 지속적인 성공이 가능합니다. 감정 조절을 통해 더욱 성숙한 리더십을 발휘할 수 있습니다.';
    } else if (dayEl === '土' || dayEl === '金') {
        analysis += '꾸준한 노력이 중년기 이후 큰 결실로 나타나며, 안정된 기반 위에서 노후에도 풍족한 생활을 유지할 수 있습니다.';
    }
    
    return analysis;
}

function generateDaeunTiming(r, name = '') {
    const birthYear = r.solar ? r.solar.getYear() : 2000;
    const currentYear = new Date().getFullYear();
    const age = currentYear - birthYear;
    
    let timing = '';
    
    if (age < 25) {
        timing = `현재는 기초를 다지는 중요한 시기입니다. 25-35세 사이에 큰 전환점이 올 것이며, 이때의 선택이 향후 10년을 좌우합니다.`;
    } else if (age < 35) {
        timing = `지금이 인생의 중요한 전환기입니다. 35-45세 사이에 최고의 성취기가 올 것이니 현재의 노력을 멈추지 마세요.`;
    } else if (age < 45) {
        timing = `현재 인생의 절정기에 있습니다. 45-55세 사이에는 안정과 성숙의 시기가 올 것이며, 후배 양성에도 힘써보세요.`;
    } else if (age < 55) {
        timing = `성숙한 지혜가 빛나는 시기입니다. 55-65세 사이에는 새로운 도전이나 제2의 인생을 설계할 좋은 시기입니다.`;
    } else {
        timing = `인생의 여유와 깊이를 만끽할 시기입니다. 경험과 지혜를 나누며 의미 있는 시간을 보내세요.`;
    }
    
    return timing;
}

function generateCautionPeriods(r, name = '') {
    const dayGan = (r.pillars.day||'')[0] || '';
    const dayEl = GAN_WUXING[dayGan] || '';
    
    let caution = '';
    const cautionByElement = {
        '木': '금(金)의 해(원숭이띠, 닭띠 해)에는 과도한 스트레스와 건강 문제를 주의하세요.',
        '火': '물(水)의 해(쥐띠, 돼지띠 해)에는 감정 기복과 대인관계 갈등을 조심하세요.',
        '土': '목(木)의 해(호랑이띠, 토끼띠 해)에는 우유부단한 결정과 재정 관리를 주의하세요.',
        '金': '화(火)의 해(말띠, 뱀띠 해)에는 성급한 판단과 투자 손실을 경계하세요.',
        '水': '토(土)의 해(용띠, 개띠, 양띠, 소띠 해)에는 답답함과 정체를 인내로 극복하세요.'
    };
    
    caution += cautionByElement[dayEl] || '변화의 해에는 신중한 판단이 필요합니다.';
    caution += ' 또한 본명년과 충(沖)이 되는 해에는 큰 변화나 이동이 있을 수 있으니 미리 준비하세요.';
    
    return caution;
}

function generateAdvice(r, name = '') {
    const dayGan = (r.pillars.day||'')[0] || '';
    const dayEl = GAN_WUXING[dayGan] || '';
    const KEYS = ['木','火','土','金','水'];
    const total = KEYS.reduce((a,k)=>a+(r.countsAll[k]||0),0);
    const list = KEYS.map(k=>({k, v: r.countsAll[k]||0, p: total ? Math.round((r.countsAll[k]/total)*100) : 0}))
        .sort((a,b)=>b.v-a.v);
    
    const weakest = list[list.length-1];
    const weakInfo = WUXING_INFO[weakest.k] || {};
    const ssMonth = krShiShen(r.tenGods.m || '');
    
    let advice = `${name ? name+'님께' : '이 분께'} 드리는 인생 조언입니다. `;
    
    const basicAdvice = {
        '木': '성장 지향적인 성격을 살려 지속적인 학습과 네트워킹에 투자하세요. 다만 너무 많은 일을 벌이지 말고 우선순위를 정해 차근차근 진행하는 것이 중요합니다.',
        '火': '뛰어난 표현력과 열정을 활용하되, 감정 조절과 인내심을 기르는 것이 필요합니다. 급한 성격을 다스리고 장기적인 관점에서 계획을 세우세요.',
        '土': '안정감과 신뢰성이 가장 큰 무기입니다. 꾸준함을 유지하되, 때로는 변화에 대한 유연성도 필요합니다. 새로운 시도를 두려워하지 마세요.',
        '金': '정확성과 원칙을 중시하는 성향을 살려 전문성을 기르세요. 완벽주의 성향이 강할 수 있으니 적당한 타협점을 찾는 지혜도 필요합니다.',
        '水': '뛰어난 적응력과 소통능력을 활용하되, 한 분야에서의 깊이도 추구하세요. 변화를 두려워하지 말고 새로운 기회에 열린 마음을 가지세요.'
    };
    
    advice += basicAdvice[dayEl] || '자신의 장점을 살리되 단점을 보완하는 노력이 필요합니다.';
    advice += ` 특히 ${weakInfo.ko} 기운을 ${weakInfo.boost.split(',')[0]}로 보완하면 더욱 균형잡힌 삶을 살 수 있습니다.`;
    
    return advice;
}

function buildEnhancedSajuResult(r, name = '') {
    const KEYS = ['木','火','土','金','水'];
    const total = KEYS.reduce((a,k)=>a+(r.countsAll[k]||0),0);
    const list = KEYS.map(k=>({
        k, v: r.countsAll[k]||0, p: total ? Math.round((r.countsAll[k]/total)*100) : 0
    })).sort((a,b)=>b.v-a.v);
    
    const strongest = list[0];
    const weakest = list[list.length-1];
    const strongInfo = WUXING_INFO[strongest.k];
    const weakInfo = WUXING_INFO[weakest.k];
    
    const dayGan = (r.pillars.day||'')[0] || '';
    const dayEl = GAN_WUXING[dayGan] || '';
    const dayInfo = WUXING_INFO[dayEl] || {};
    
    const ssMonthKR = krShiShen(r.tenGods.m || '');
    const ssKey = Object.keys(SHISHEN_DESC).find(k => ssMonthKR.includes(k));
    const ssDesc = ssKey ? SHISHEN_DESC[ssKey] : '월간은 사회적 역할·직업성의 뼈대를 보여줍니다.';
    
    const nameTitle = name ? `<b>${name}</b>님의 ` : '';
    
    const lifetimeFortune = generateLifetimeFortune(r, name);
    const daeunAnalysis = generateDaeunAnalysis(r, name);
    const daeunTiming = generateDaeunTiming(r, name);
    const cautionPeriods = generateCautionPeriods(r, name);
    const advice = generateAdvice(r, name);
    
    let html = `<div class="result-section">
        <div class="section-title-result">📊 ${nameTitle}사주 기본 구조</div>
        ${createPillarsGrid(r.pillars)}
    </div>
    
    <div class="result-section">
        <div class="section-title-result">🎯 ${nameTitle}핵심 해석</div>
        ${createResultCard('🌱', '보완할 오행', `${weakInfo.ko}(${weakest.k}) ${weakest.p}%`, 
            `<strong>설명:</strong> 오행의 균형에서 가장 낮은 축입니다. 이 요소를 보완하면 전반적인 흐름이 안정됩니다.<br/>
            <strong>부족 특성:</strong> ${weakInfo.trait}<br/>
            <strong>보완 팁:</strong> ${weakInfo.boost}`, true, 'fortune-detail-card palm')}
        
        ${createResultCard('🏷️', '월간 십신', ssMonthKR || '-', 
            `<strong>설명:</strong> 월간은 사회적 역할·직업성의 뼈대를 뜻합니다. 십신은 일간과의 관계로 재능/과제 유형을 보여줍니다.<br/>
            <strong>해석:</strong> ${ssDesc}`)}
        
        ${createResultCard('🔥', '강한 오행', `${strongInfo.ko}(${strongest.k}) ${strongest.p}%`, 
            `<strong>장점:</strong> ${strongInfo.trait}<br/>
            <strong>주의:</strong> 이 요소가 과할 때는 균형을 위해 다른 오행을 보완하세요.`)}
    </div>
    
    <div class="result-section">
        <div class="section-title-result">📈 ${nameTitle}오행 분포</div>
        ${createElementChart(r.countsAll)}
    </div>
    
    <div class="result-section">
        <div class="section-title-result">🌟 ${nameTitle}상세 운세풀이</div>
        ${createResultCard('📜', '평생운', '인생 전체 흐름', lifetimeFortune, false, 'fortune-detail-card lifetime')}
        ${createResultCard('📊', '대운분석', '10년 단위 흐름', daeunAnalysis, false, 'fortune-detail-card daeun')}
        ${createResultCard('⏰', '대운시기', '현재와 향후 시기', daeunTiming, false, 'fortune-detail-card timing')}
        ${createResultCard('⚠️', '조심할시기', '주의가 필요한 때', cautionPeriods, false, 'fortune-detail-card caution')}
        ${createResultCard('💡', '인생조언', '실용적 가이드', advice, false, 'fortune-detail-card advice')}
    </div>
    
    <div class="info-box">
        <div class="info-title">📋 상세 정보</div>
        <div class="info-content">
            <strong>달력:</strong> ${r.calMode==='lunar'?'음력':'양력'}${r.calMode==='lunar' ? ` / 윤달: ${r.isLeap?'예':'아니오'}`:''}<br/>
            <strong>십신:</strong> 년:${krShiShen(r.tenGods.y)||'-'} / 월:${krShiShen(r.tenGods.m)||'-'} / 시:${krShiShen(r.tenGods.t)||'-'}<br/>
            ※ 수치는 간(1) + 지지 장간(가중) 합산 비율입니다. 시간 미입력 시 시주는 제외됩니다.<br/>
            ※ 운세풀이는 사주 구조를 바탕으로 한 일반적인 해석이며, 개인의 노력과 선택이 더욱 중요합니다.
        </div>
    </div>`;
    
    return html;
}

// ===== 버튼 이벤트 리스너들 =====

// 네비게이션 클릭 이벤트
$$('.nav-item[data-tab]').forEach(item=>{
    item.addEventListener('click', ()=>{
        const tab = item.dataset.tab || 'home';
        location.hash = '#/' + tab;
        reactCrystal(`${tab} 페이지로 이동합니다! ✨`);
    });
});

$$().forEach((card) => {
    card.addEventListener('click', ()=>{
        const r = card.dataset.route || 'fortune-today';
        location.hash = '#/fortune/' + r.replace('fortune-','');
    });
});

// 오늘의 운세 버튼
$('#btnToday')?.addEventListener('click', ()=>{
    const birthRaw = $('#today-birth').value;
    const name = $('#today-name')?.value?.trim() || '';
    const calMode = getCalMode('today');
    const isLeap = getLeap('today');
    
    try {
        if (!birthRaw.trim()) {
            alert('생년월일을 입력하세요.');
            return;
        }
        
        const solar = toSolarFromInput(birthRaw, '', calMode, isLeap);
        const birthSolarStr = fmtSolar(solar);
        const fortuneData = calcEnhancedDailyFortune(birthSolarStr);
        const htmlResult = renderEnhancedDailyFortune(fortuneData, name);
        
        openSheet('오늘의 운세', htmlResult, {
            type: 'enhanced-today',
            birth_input: birthRaw,
            name: name,
            calMode: calMode,
            isLeap: isLeap,
            birth_solar: birthSolarStr,
            data: fortuneData
        });
        
        reactCrystal('오늘의 상세 운세를 불러왔습니다! ✨');
    } catch (e) {
        console.error(e);
        alert(e.message || '입력 값을 확인해 주세요.');
    }
});

// 사주 버튼
$('#btnSaju')?.addEventListener('click', () => {
    const rawDate = $('#saju-birth')?.value || '';
    const rawTime = $('#saju-time')?.value || '';
    const gender = $('#saju-gender')?.value || '';
    const name = $('#saju-name')?.value?.trim() || '';
    const calMode = getCalMode('saju');
    const isLeap = getLeap('saju');
    
    try {
        if (!rawDate.trim()) {
            alert('생년월일을 입력하세요.');
            return;
        }
        
        const r = computeBaZi(rawDate, rawTime, calMode, isLeap);
        const enhancedResult = buildEnhancedSajuResult(r, name);
        
        openSheet('정통 사주 해석', enhancedResult, {
            type:'saju',
            name, date: rawDate, time: rawTime, gender, calMode, isLeap,
            data: r
        });
        
        reactCrystal('사주 해석이 완료되었습니다 ✨');
    } catch (e) {
        console.error(e);
        alert(e.message || '사주 계산 중 오류');
    }
});

// 궁합 버튼
$('#btnMatch')?.addEventListener('click', ()=>{
    const a=$('#match-a').value,b=$('#match-b').value;
    const {score,text}=calcMatch(a,b);
    openSheet('궁합 결과',score==null?text:`궁합 지수: ${score}/100\n${text}`,{type:'match',a,b,score,text});
    reactCrystal('궁합을 계산했습니다 ✨');
});

// 신년운세 버튼
$('#btnYear')?.addEventListener('click', ()=>{
    const b=$('#year-birth').value;
    const {idx,text}=calcYear(b);
    openSheet('2025 신년 운세',text,{type:'year',birth:b,idx,text});
    reactCrystal('올해의 흐름을 확인했습니다 ✨');
});

// 로또 번호 버튼
$('#btnLotto')?.addEventListener('click', () => {
    const birth = $('#lotto-birth')?.value?.trim() || '';
    try {
        const result = generateLottoNumbers(birth);
        const html = renderLottoResult(result);
        
        openSheet('🍀 행운의 로또번호', html, {
            type: 'lotto',
            birth,
            data: result
        });
        
        reactCrystal('행운번호를 준비했어요! ✨');
    } catch (e) {
        console.error(e);
        alert('행운번호 생성 중 오류가 발생했습니다.');
    }
});

// 시트 관련 이벤트
$('#btnClose')?.addEventListener('click', closeSheet);

sheet?.addEventListener('click', e=>{
    if(e.target===sheet) closeSheet();
});

$('#btnSave')?.addEventListener('click', ()=>{
    if(!lastResult){
        closeSheet();
        return;
    }
    
    const arr=JSON.parse(localStorage.getItem(LS_KEY)||"[]");
    arr.unshift({...lastResult,ts:Date.now()});
    localStorage.setItem(LS_KEY,JSON.stringify(arr.slice(0,20)));
    
    const notice = document.createElement('div');
    notice.textContent = '💾 최근 결과에 저장됐습니다.';
    notice.style.cssText = 'margin-top:16px;padding:12px;background:rgba(102,126,234,0.1);border-radius:8px;text-align:center;color:#667eea;font-weight:bold;';
    sheetContent.appendChild(notice);
    setTimeout(() => notice.remove(), 3000);
});

// ===== 마이페이지 - 최근 결과 삭제 =====
$('#btnClear')?.addEventListener('click', ()=>{
    if(confirm('최근 결과를 모두 삭제하시겠습니까?')){
        localStorage.removeItem(LS_KEY);
        alert('최근 결과가 모두 삭제되었습니다.');
    }
});

// ===== 라우팅 시스템 (수정된 버전) =====

// 1) data-route 클릭을 SPA 라우팅으로 처리
document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-route]');
    if (!el) return;
    
    const route = el.dataset.route; // e.g. "fortune-today" | "home"
    e.preventDefault();
    
    if (route && route.startsWith('fortune-')) {
        const view = route.replace('fortune-', ''); // today | saju | tarot | ...
        location.hash = '#/fortune/' + view;
    } else if (route === 'home') {
        location.hash = '#/home';
    }
});

// 2) 해시를 읽어 탭/뷰 전환 (수정된 버전)
function routeFromHash() {
    if (location.hash === '#lotto') {
        setActiveTab('fortune');
        showFortuneView('fortune-lotto');
        return;
    }
    
    const m = location.hash.match(/^#\/([^/]+)(?:\/([^/]+))?/);
    const tab = m?.[1] || 'home';
    const sub = m?.[2] || '';
    
    // 탭 보여주기
    setActiveTab(['home','fortune','chat','me'].includes(tab) ? tab : 'home');
    
    // 서브뷰 선택
    if (tab === 'fortune') {
        const view = sub === 'saju' ? 'fortune-saju' :
            sub === 'tarot' ? 'fortune-tarot' :
            sub === 'palm' ? 'fortune-palm' :
            sub === 'match' ? 'fortune-match' :
            sub === 'year' ? 'fortune-year' :
            sub === 'lotto' ? 'fortune-lotto' :
            'fortune-today';
        showFortuneView(view);
    }
    
    closeAllOverlays();
}

// ===== 손금보기 메뉴 "준비중" 처리 =====
// 손금보기 메뉴를 "준비중"으로 표시하고 비활성화
function setPalmAsComingSoon() {
    const comingSoonStyle = document.createElement('style');
    comingSoonStyle.id = 'palm-coming-soon';
    comingSoonStyle.textContent = `
        /* 손금보기 메뉴 "준비중" 스타일 */
        .service-item[data-route="fortune-palm"],
        .special-item[data-route="fortune-palm"],
        [data-route="fortune-palm"] {
            opacity: 0.7;
            pointer-events: none;
            position: relative;
            filter: grayscale(30%);
            cursor: not-allowed;
        }
        
        /* "준비중" 배지 표시 */
        .service-item[data-route="fortune-palm"]::after,
        .special-item[data-route="fortune-palm"]::after {
            content: "🚧 준비중";
            position: absolute;
            top: 12px;
            right: 12px;
            background: linear-gradient(135deg, #ff9800, #f57c00);
            color: white;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            z-index: 10;
        }
        
        /* 호버 효과 비활성화 */
        .service-item[data-route="fortune-palm"]:hover,
        .special-item[data-route="fortune-palm"]:hover {
            transform: none !important;
            box-shadow: none !important;
        }
    `;
    
    if (!document.getElementById('palm-coming-soon')) {
        document.head.appendChild(comingSoonStyle);
    }
}

// 손금보기 클릭 시 준비중 알림 표시
function showPalmComingSoonAlert() {
    // 클릭 이벤트 차단 및 알림 표시
    document.addEventListener('click', function(e) {
        const palmElement = e.target.closest('[data-route="fortune-palm"]');
        if (palmElement) {
            e.preventDefault();
            e.stopPropagation();
            // 준비중 알림 표시
            showComingSoonNotification();
            return false;
        }
    }, true);
}

// 준비중 알림 메시지
function showComingSoonNotification() {
    // 기존 알림이 있으면 제거
    const existingNotif = document.querySelector('.coming-soon-notification');
    if (existingNotif) {
        existingNotif.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = 'coming-soon-notification';
    notification.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #667eea, #764ba2);
        color: white;
        padding: 20px 30px;
        border-radius: 15px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        z-index: 9999;
        text-align: center;
        font-size: 16px;
        font-weight: bold;
        backdrop-filter: blur(10px);
        animation: comingSoonPop 0.3s ease-out;
    `;
    
    notification.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 10px;">✋</div>
        <div style="margin-bottom: 8px;">손금보기 서비스</div>
        <div style="font-size: 14px; opacity: 0.9; font-weight: normal;">곧 만나보실 수 있습니다! 🔮</div>
    `;
    
    // 애니메이션 CSS 추가
    if (!document.getElementById('coming-soon-animation')) {
        const animationStyle = document.createElement('style');
        animationStyle.id = 'coming-soon-animation';
        animationStyle.textContent = `
            @keyframes comingSoonPop {
                0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
                100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            }
        `;
        document.head.appendChild(animationStyle);
    }
    
    document.body.appendChild(notification);
    
    // 2.5초 후 자동 제거
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translate(-50%, -50%) scale(0.9)';
        notification.style.transition = 'all 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 2500);
}

// ===== Policy modal controls (scoped) =====
(function(){
    const open = (which)=>{
        const el = $(`#${which}`);
        if(!el) return;
        el.classList.add('mt-show');
    };
    
    const closeAll = ()=>{
        $$$$$$('.mt-sheet-backdrop').forEach(el=>{
            el.classList.remove('mt-show');
        });
    };
    
    // open triggers
    $('#mt-link-privacy')?.addEventListener('click', (e)=>{
        e.preventDefault();
        open('mt-privacy');
    });
    
    $('#mt-link-terms')?.addEventListener('click', (e)=>{
        e.preventDefault();
        open('mt-terms');
    });
    
    // close triggers (X 버튼, 배경 클릭)
    $$('.mt-sheet-close').forEach(btn=>{
        btn.addEventListener('click', closeAll);
    });
    
    $$$$$$('.mt-sheet-backdrop').forEach(bg=>{
        bg.addEventListener('click', (e)=>{
            if(e.target === bg) closeAll();
        });
    });
    
    // Esc 닫기
    document.addEventListener('keydown', (e)=>{
        if(e.key === 'Escape') closeAll();
    });
})();

// ===== 스플래시 자동 닫기 =====
(function () {
    const splash = document.getElementById('splashScreen');
    if (!splash) return;
    
    const startBtn = document.getElementById('startBtn') || splash.querySelector('.start-image-btn');
    
    // ① 페이지 로드 후 자동 닫기
    window.addEventListener('load', () => {
     setTimeout(() => {
            console.log('🚀 자동 전환 시작');
            hideSplash();
        }, 4000);
    });
    // ===== 스플래시 자동 전환 백업 시스템 =====

// 백업 1: DOMContentLoaded (더 빠른 실행)
document.addEventListener('DOMContentLoaded', () => {
    console.log('📱 DOM 준비 완료, 백업 타이머 시작');
    setTimeout(() => {
        console.log('🚀 백업 자동 전환 시작');
        const splash = document.getElementById('splashScreen');
        const main = document.querySelector('.container');
        
        if (splash && splash.style.display !== 'none') {
            splash.style.display = 'none';
            if (main) main.style.display = 'block';
            console.log('✅ 백업 전환 완료');
        }
    }, 3000); // 3초 후
});

// 백업 2: 즉시 실행 안전망 (5초)
setTimeout(() => {
    console.log('🛡️ 안전망 전환 체크');
    const splash = document.getElementById('splashScreen');
    const main = document.querySelector('.container');
    
    if (splash && splash.style.display !== 'none') {
        splash.style.display = 'none';
        if (main) main.style.display = 'block';
        console.log('✅ 안전망 전환 완료');
    } else {
        console.log('ℹ️ 이미 전환됨 - 안전망 건너뜀');
    }
}, 5000); // 5초 후 (최종 안전망)

// 백업 3: 페이지 완전 로드 후에도 체크
window.addEventListener('load', () => {
    setTimeout(() => {
        console.log('🔄 페이지 로드 후 추가 체크');
        const splash = document.getElementById('splashScreen');
        const main = document.querySelector('.container');
        
        if (splash && splash.style.display !== 'none') {
            splash.style.display = 'none';
            if (main) main.style.display = 'block';
            console.log('✅ 로드 후 전환 완료');
        }
    }, 1000);
});

console.log('🔧 스플래시 백업 시스템 초기화 완료');
    // ② Start 버튼 클릭으로 닫기
    startBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        hideSplash();
    });
})();

// ===== 스무스 스크롤 =====
function smoothScrollTo(selector) {
    const element = document.querySelector(selector);
    if (element) {
        element.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
}

// ===== 카드 전환 함수 =====
function showCard(which) {
    const today = document.getElementById('view-today');
    const saju = document.getElementById('view-saju');
    if (!today || !saju) return;
    
    if (which === 'today') {
        today.style.display = 'block';
        saju.style.display = 'none';
    } else {
        saju.style.display = 'block';
        today.style.display = 'none';
    }
}

// 오늘의 운세로 이동하는 모든 트리거
[
    'a[href="#today"]', // 상단 네비
    '#ctaToday', // 히어로 왼쪽 버튼(있다면)
    '#ctaStart'  // 오른쪽 카드 "바로 시작"(있다면)
].forEach(sel => {
    document.querySelectorAll(sel).forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            showCard('today');
            smoothScrollTo('#today');
        });
    });
});

// 정통 사주로 이동하는 트리거
[
    'a[href="#saju"]', // 상단 네비
    '#ctaSaju' // 히어로 왼쪽 버튼(있다면)
].forEach(sel => {
    document.querySelectorAll(sel).forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            showCard('saju');
            smoothScrollTo('#saju');
        });
    });
});

// ===== 통합 라우팅 처리 (최종 정리된 버전) =====
function handleRoute() {
    const hash = location.hash || '#/home';
    const match = hash.match(/^#\/([^/]+)(?:\/([^/]+))?/);
    const tab = match?.[1] || 'home';
    const sub = match?.[2] || '';
    
    setActiveTab(tab);
    
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

// ===== 전역 클릭 위임 (수정된 버전) =====
document.addEventListener('click', (e) => {
    // data-route 또는 CTA/Start 버튼들을 한 번에 캐치
    const el = e.target.closest('[data-route], #ctaToday, #ctaSaju, #ctaStart, #ctaLotto, .start-btn');
    if (!el) return;
    
    e.preventDefault();
    
    try {
        hideSplash();
    } catch (_) {}
    
    // data-route가 있으면 그 값을 우선 사용
    const r = el.dataset?.route;
    if (r) {
        location.hash = r.startsWith('fortune-') ? '#/fortune/' + r.replace('fortune-', '') : '#/' + r;
        return;
    }
    
    // data-route 없는 CTA 대비 (구형 마크업 호환)
    if (el.id === 'ctaSaju') {
        location.hash = '#/fortune/saju';
    } else {
        // 기본은 오늘의 운세로
        location.hash = '#/fortune/today';
    }
});

// 라우터용 링크(#/...)는 절대 가로채지 않음
document.querySelectorAll('a[href^="#"]:not([href^="#/"])').forEach(a=>{
    a.addEventListener('click',(e)=>{
        const href = a.getAttribute('href') || '';
        if (href.startsWith('#/')) return; // 안전막(이중 보강)
        
        const id = href.slice(1);
        const t = document.getElementById(id);
        if (!t) return;
        
        // 순수 앵커만 스무스 스크롤
        e.preventDefault();
        smoothScrollTo('#'+id);
    });
});

// ===== 밑줄 완전 제거 =====
function removeAllUnderlines() {
    document.querySelectorAll('*').forEach(el => {
        el.style.setProperty('text-decoration', 'none', 'important');
        el.style.setProperty('text-decoration-line', 'none', 'important');
        el.style.setProperty('border-bottom', 'none', 'important');
    });
}

// DOM 로드 후 실행
document.addEventListener('DOMContentLoaded', removeAllUnderlines);
// 페이지 로드 완료 후에도 실행
window.addEventListener('load', removeAllUnderlines);
// 동적으로 추가되는 요소에도 적용
const observer = new MutationObserver(removeAllUnderlines);
observer.observe(document.body, { childList: true, subtree: true });

// ===== 최종 초기화 =====
// 해시 변경 시 라우팅
window.addEventListener('hashchange', handleRoute);

// 페이지 로드 시 초기화 (단일 통합 버전)
window.addEventListener('load', () => {
    safeExecute(() => {
        // 1. DOM 캐시 초기화
        DOM.init();
        
        // 2. 스플래시 자동 숨기기 (단일 타이머)
        splashManager.autoHide(3000);
        
        // 3. 네비게이션 초기화
        DOM.safeClass('#bottomNav', 'add', 'show');
        
        // 4. 캘린더 토글 초기화
        safeExecute(() => bindCalToggle('today'), 'Today calendar toggle');
        safeExecute(() => bindCalToggle('saju'), 'Saju calendar toggle');
        
        // 5. 손금 준비중 처리
        safeExecute(() => {
            setPalmAsComingSoon();
            showPalmComingSoonAlert();
        }, 'Palm coming soon setup');
        
        // 6. 손금 타이틀 (예정) 붙이기
        setTimeout(() => {
            safeExecute(() => {
                document
                    .querySelectorAll('[data-route="fortune-palm"] h3, [data-route="fortune-palm"] .title')
                    .forEach((title) => {
                        if (title && !title.textContent.includes('(예정)')) {
                            title.textContent = title.textContent.replace('손금 보기', '손금 보기 (예정)');
                        }
                    });
            }, 'Palm title update');
        }, 100);
        
        // 7. 초기 라우팅
        if (!location.hash) location.hash = '#/home';
        handleRoute();
        
    }, 'Initial load setup');
});

// ===== 뒤로가기/탭 전환 때 열려있던 오버레이 닫기 =====
document.addEventListener('visibilitychange', () => {
    if (document.hidden) closeAllOverlays();
});

// ===== CSS 개선 추가 =====
(function addFinalStyles(){
    if (document.getElementById('mystictell-final-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'mystictell-final-styles';
    style.textContent = `
        /* 스플래시 스크린 트랜지션 */
        #splashScreen {
            transition: opacity 0.8s ease-out, transform 0.8s ease-out !important;
        }
        #splashScreen.hidden {
            opacity: 0 !important;
            transform: scale(0.95) !important;
            pointer-events: none !important;
            visibility: hidden !important;
        }
        
        /* 메인 콘텐츠 트랜지션 */
        #mainContent, #bottomNav {
            transition: opacity 0.5s ease-in !important;
        }
        #mainContent.show, #bottomNav.show {
            opacity: 1 !important;
        }
        
        /* 모든 버튼 클릭 가능하게 */
        button, .btn, [onclick] {
            pointer-events: auto !important;
            position: relative !important;
            cursor: pointer !important;
            touch-action: manipulation !important;
        }
        
        /* 하단 네비게이션 z-index 수정 */
        .bottom-nav, #bottomNav, [class*="bottom"][class*="nav"] {
            z-index: 1000 !important;
        }
        
        /* 버튼 호버 효과 */
        button:hover, .btn:hover {
            opacity: 0.8;
            transform: translateY(-1px);
        }
        
        /* 터치 디바이스 대응 */
        @media (hover: none) {
            button:active, .btn:active {
                opacity: 0.6;
                transform: scale(0.98);
            }
        }
        
        /* Fortune 페이지 뷰 기본 스타일 */
        #page-fortune > div[id^="view-"] {
            display: none;
        }
        
        #page-fortune > div[id^="view-"].show {
            display: block;
        }
    `;
    
    document.head.appendChild(style);
})();

// ===== 에러 방지 래퍼 =====
window.addEventListener('error', (e) => {
    console.error('Global error:', e);
    try { closeSheet(); } catch(_) {}
    try { closeTarotModal(); } catch(_) {}
});
