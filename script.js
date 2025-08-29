// ===== DOM 헬퍼 + 로컬스토리지 키 =====
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel) || []);
const LS_KEY = 'mystictell_recent_results';
// ===== lunar-javascript 글로벌 보정 =====
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
// ===== 입력 정규화 =====
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
// ===== 사주 계산 관련 상수 =====
const GAN_WUXING = {
    '甲':'木','乙':'木','丙':'火','丁':'火','戊':'土','己':'土',
    '庚':'金','辛':'金','壬':'水','癸':'水'
};
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
const WUXING_INFO = {
    '木': { ko:'목', trait:'성장·기획·창의', boost:'푸른색, 숲길 걷기, 신선 채소, 새 프로젝트 시작', color:'#4caf50' },
    '火': { ko:'화', trait:'열정·표현·리더십', boost:'햇빛, 가벼운 유산소, 발표/공개 활동, 따뜻한 색', color:'#f44336' },
    '土': { ko:'토', trait:'안정·신뢰·실행', boost:'정리/정돈, 루틴 만들기, 노란/갈색, 땅 밟기', color:'#ff9800' },
    '金': { ko:'금', trait:'규칙·분석·재정', boost:'화이트/메탈, 구조화, 재무정리, 가벼운 근력운동', color:'#9e9e9e' },
    '水': { ko:'수', trait:'유연·학습·소통', boost:'블루/블랙, 독서/연구, 호흡/수분, 산책', color:'#2196f3' }
};
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
// ===== 운세 카테고리 데이터 =====
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
        icon: '💪',
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
const LUCKY_ITEMS = {
    items: ['반지', '목걸이', '시계', '향수', '립밤', '차키', '지갑', '스마트폰 케이스', '노트', '펜'],
    colors: ['빨강', '파랑', '노랑', '초록', '보라', '분홍', '하늘색', '주황', '흰색', '검정'],
    numbers: ['3', '7', '9', '12', '21', '27', '33', '42', '51', '63'],
    directions: ['동쪽', '서쪽', '남쪽', '북쪽', '동남쪽', '동북쪽', '서남쪽', '서북쪽']
};

// ===== 타로 데이터 =====
const TAROT_DETAILS = [
    {
        name: "THE FOOL (바보)",
        meaning: "새로운 시작과 순수함을 나타내는 카드입니다. 미지의 세계로 뛰어드는 용기와 순진무구한 마음을 상징합니다.",
        upright: {
            general: "새로운 시작, 순진함, 자발성 - 지금이 새로운 도전을 시작할 최적의 시기입니다.",
            love: "새로운 만남이나 관계의 시작. 순수한 마음으로 사랑에 임하세요.",
            career: "새로운 직장이나 프로젝트 시작. 도전을 두려워하지 마세요.",
            advice: "과거에 얽매이지 말고 자유로운 마음으로 앞으로 나아가세요. 예상치 못한 기회가 찾아올 수 있습니다."
        },
        reversed: {
            general: "무모함, 경솔함, 위험한 행동 - 너무 성급하게 결정하지 마세요.",
            love: "관계에서의 성급함이나 경솔한 행동을 조심하세요.",
            career: "준비 없는 이직이나 창업은 위험합니다.",
            advice: "충분한 준비 없이 뛰어들면 실패할 가능성이 높습니다. 현실을 직시하고 신중하게 행동하세요."
        },
        keywords: "시작, 모험, 자유, 순수"
    },
    {
        name: "THE MAGICIAN (마법사)",
        meaning: "의지력과 창조력을 나타내는 카드입니다. 하늘과 땅을 연결하는 존재로, 모든 가능성을 현실로 만드는 힘을 상징합니다.",
        upright: {
            general: "의지력, 창조력, 집중 - 당신에게는 목표를 달성할 모든 능력이 있습니다.",
            love: "적극적인 어프로치로 원하는 관계를 만들어갈 수 있습니다.",
            career: "리더십을 발휘하여 프로젝트를 성공으로 이끌 수 있습니다.",
            advice: "집중력을 발휘하면 원하는 것을 이룰 수 있습니다. 자신감을 가지세요."
        },
        reversed: {
            general: "기만, 조작, 능력 부족 - 자신의 능력을 과신하거나 남용하지 마세요.",
            love: "상대방을 조종하려 들거나 거짓으로 관계를 유지하려 하지 마세요.",
            career: "동료들을 속이거나 실력 이상의 일을 맡지 마세요.",
            advice: "거짓과 속임수는 결국 드러납니다. 진실된 노력이 필요한 때입니다."
        },
        keywords: "능력, 집중, 자원, 행동"
    },
    {
        name: "THE HIGH PRIESTESS (여교황)",
        meaning: "직감과 내면의 지혜를 나타내는 카드입니다. 보이지 않는 진실과 숨겨진 지식, 무의식의 세계를 상징합니다.",
        upright: {
            general: "직감, 무의식, 신비 - 내면의 목소리에 귀를 기울이세요.",
            love: "직감을 믿고 상대방의 진심을 파악하세요. 숨겨진 감정이 드러날 수 있습니다.",
            career: "논리적 분석보다 직관적 판단이 더 정확할 수 있습니다.",
            advice: "논리보다 직감이 더 정확할 수 있습니다. 명상과 성찰이 도움이 됩니다."
        },
        reversed: {
            general: "비밀, 숨겨진 동기, 직감 무시 - 중요한 정보가 숨겨져 있을 수 있습니다.",
            love: "상대방이 진실을 숨기고 있거나 당신이 직감을 무시하고 있습니다.",
            career: "중요한 정보를 놓치고 있거나 잘못된 판단을 할 수 있습니다.",
            advice: "직감을 무시하면 후회할 수 있습니다. 진실을 파악하려 노력하세요."
        },
        keywords: "직관, 지혜, 비밀, 여성성"
    },
    {
        name: "THE EMPRESS (여황제)",
        meaning: "풍요와 모성을 나타내는 카드입니다. 창조적 에너지와 자연의 풍요로움, 양육과 돌봄을 상징합니다.",
        upright: {
            general: "풍요, 모성, 창조성 - 창조적 프로젝트나 새로운 시작에 좋은 시기입니다.",
            love: "임신이나 결혼, 가족의 확장이 있을 수 있습니다. 따뜻한 사랑이 넘치는 시기입니다.",
            career: "창의적인 아이디어로 성과를 거둘 수 있습니다. 협력과 배려가 중요합니다.",
            advice: "풍요와 성장이 기대됩니다. 사랑과 보살핌이 넘치는 때입니다."
        },
        reversed: {
            general: "불임, 창조성 부족, 과보호 - 창의력이 막혀있거나 성장이 정체된 상태입니다.",
            love: "과보호나 의존적인 관계가 문제가 될 수 있습니다.",
            career: "창의적 아이디어가 떠오르지 않거나 팀워크에 문제가 있을 수 있습니다.",
            advice: "지나친 집착이나 의존은 해롭습니다. 균형을 찾으세요."
        },
        keywords: "풍요, 창조, 보살핌, 성장"
    },
    {
        name: "THE EMPEROR (황제)",
        meaning: "권위와 안정을 나타내는 카드입니다. 확고한 기반과 구조, 리더십과 책임감을 상징합니다.",
        upright: {
            general: "권위, 구조, 질서 - 강력한 리더십을 발휘할 때입니다.",
            love: "관계에서 주도권을 잡고 안정적인 기반을 만들어가세요.",
            career: "관리직이나 리더 역할을 맡게 될 가능성이 높습니다.",
            advice: "체계적인 계획과 실행이 성공을 가져옵니다. 책임감 있게 행동하세요."
        },
        reversed: {
            general: "독재, 권위주의, 경직성 - 지나친 통제욕은 관계를 해칩니다.",
            love: "상대방을 너무 통제하려 하거나 고집이 센 모습을 보이지 마세요.",
            career: "독단적인 결정이나 융통성 없는 태도가 문제가 될 수 있습니다.",
            advice: "융통성 없는 태도를 버리세요. 권위를 남용하지 마세요."
        },
        keywords: "권위, 안정, 구조, 아버지"
    },
    {
        name: "THE HIEROPHANT (교황)",
        meaning: "전통과 교육을 나타내는 카드입니다. 영적 가르침과 관습, 체계적인 지식 전달을 상징합니다.",
        upright: {
            general: "전통, 교육, 종교 - 전통적 가치와 지혜에서 배울 점이 많습니다.",
            love: "전통적인 방식의 결혼이나 가족의 승인을 받는 관계가 유리합니다.",
            career: "멘토를 찾거나 체계적인 교육이 도움이 됩니다.",
            advice: "스승을 찾거나 체계적인 학습이 도움이 됩니다."
        },
        reversed: {
            general: "반항, 비정통성, 새로운 접근법 - 기존의 틀을 깨고 새로운 방법을 시도해보세요.",
            love: "비전통적인 관계나 주변의 반대에도 불구하고 사랑을 관철하려 합니다.",
            career: "기존 방식에 얽매이지 말고 혁신적인 접근을 시도해보세요.",
            advice: "맹목적인 추종보다 자신만의 길을 찾으세요."
        },
        keywords: "전통, 가르침, 신념, 체계"
    },
    {
        name: "THE LOVERS (연인)",
        meaning: "사랑과 선택을 나타내는 카드입니다. 조화로운 관계와 중요한 결정, 가치관의 일치를 상징합니다.",
        upright: {
            general: "사랑, 관계, 선택 - 진정한 사랑이나 중요한 파트너십이 형성됩니다.",
            love: "운명적인 만남이나 관계의 발전이 있을 수 있습니다. 결혼을 고려할 시기입니다.",
            career: "비즈니스 파트너나 협력자와의 관계가 중요합니다.",
            advice: "가치관이 맞는 사람을 만날 수 있습니다. 중요한 선택을 현명하게 하세요."
        },
        reversed: {
            general: "불균형, 갈등, 잘못된 선택 - 관계의 불균형이나 가치관 충돌이 있습니다.",
            love: "관계에 균열이 생기거나 이별할 수 있습니다.",
            career: "파트너나 동료와의 갈등이 일어날 수 있습니다.",
            advice: "선택을 미루거나 잘못된 결정을 할 수 있습니다."
        },
        keywords: "사랑, 결합, 선택, 조화"
    },
    {
        name: "THE CHARIOT (전차)",
        meaning: "승리와 의지를 나타내는 카드입니다. 상반된 힘을 통제하여 목표를 향해 전진하는 모습을 상징합니다.",
        upright: {
            general: "승리, 의지력, 자제력 - 강한 의지로 장애물을 극복할 수 있습니다.",
            love: "적극적으로 관계를 이끌어가면 원하는 결과를 얻을 수 있습니다.",
            career: "목표 달성을 위한 강한 추진력이 성공을 가져올 것입니다.",
            advice: "목표를 향해 돌진하세요. 승리가 눈앞에 있습니다."
        },
        reversed: {
            general: "통제력 상실, 방향성 부족 - 감정이나 상황을 통제하지 못하고 있습니다.",
            love: "관계에서 주도권을 잃거나 갈등이 심해질 수 있습니다.",
            career: "목표를 잃고 헤매거나 계획이 틀어질 수 있습니다.",
            advice: "방향을 잃고 헤매고 있을 수 있습니다."
        },
        keywords: "승리, 전진, 의지, 통제"
    }
];

const CARD_ICONS = ["🃏","🎩","🌙","👑","🏰","⛪","💕","🏎️","🦁","🕯️","🎡","⚖️","🙃","💀","👼","😈","🗼","⭐","🌙","☀️","📯","🌍"];

// 2025년 신년운세 데이터
const YEAR_2025_DATA = {
    yearInfo: {
        element: '乙巳', // 을사년 (목뱀)
        animal: '뱀',
        description: '2025년은 을사년(乙巳年)으로 "푸른 뱀의 해"입니다. 지혜롭고 신중한 변화, 내면의 성찰과 전환의 시기입니다.',
        keywords: ['지혜', '변화', '직감', '성찰', '전환', '성장'],
        theme: '내적 성장과 지혜로운 변화의 해'
    },
    
    // 개인별 운세 유형 (생년월일 기반 12가지)
    personalTypes: [
        {
            name: '큰 도약의 해',
            icon: '🚀',
            summary: '오랫동안 준비해온 일들이 결실을 맺는 해입니다.',
            description: '2025년은 그동안 꾸준히 준비하고 노력해온 것들이 드디어 빛을 발하는 한 해가 될 것입니다. 새로운 직책으로의 승진, 사업의 성공, 또는 인생의 중요한 전환점을 맞이할 가능성이 높습니다. 을사년의 뱀 기운이 당신의 잠재력을 깨우고, 기회의 문을 활짝 열어줄 것입니다.',
            sectors: {
                career: '승진이나 이직의 기회가 많습니다. 새로운 프로젝트를 맡게 되거나 리더십을 발휘할 기회가 생깁니다. 전문성을 인정받아 더 큰 무대로 나아갈 수 있습니다.',
                love: '새로운 만남이나 기존 관계의 발전이 기대됩니다. 결혼을 앞둔 커플은 좋은 소식이 있을 수 있으며, 싱글인 경우 운명적인 만남이 기다리고 있습니다.',
                health: '전반적으로 활력이 넘치는 한 해입니다. 새로운 운동이나 건강관리법을 시작하기 좋은 시기입니다. 다만 과로는 금물입니다.',
                money: '투자나 부동산에서 좋은 결과를 얻을 수 있습니다. 부업이나 새로운 수익원을 개발할 기회도 있습니다. 재정 상황이 크게 개선될 것입니다.'
            },
            luckyPeriods: '3월, 7월, 11월',
            cautions: '성급한 결정보다는 신중한 계획을 세우세요. 기회가 와도 충분히 검토한 후 행동하세요.',
            advice: '기회가 왔을 때 주저하지 말고 도전하세요. 하지만 최소한의 준비는 반드시 필요합니다. 당신의 능력을 믿고 자신감을 가지세요.',
            keywords: ['성취', '도약', '성공', '리더십']
        },
        {
            name: '성장과 학습의 해',
            icon: '📚',
            summary: '새로운 지식과 기술을 습득하며 자신을 발전시키는 해입니다.',
            description: '2025년은 배움과 성장에 집중해야 할 한 해입니다. 을사년의 뱀은 지혜의 상징으로, 당신에게 새로운 지식과 기술을 습득할 기회를 가져다 줄 것입니다. 교육 투자나 자기계발이 미래에 큰 자산이 될 것입니다.',
            sectors: {
                career: '전문성 향상을 위한 교육이나 자격증 취득이 도움됩니다. 새로운 기술을 배우거나 해외 연수 기회가 생길 수 있습니다.',
                love: '지적인 대화를 나눌 수 있는 상대방과 좋은 인연이 됩니다. 함께 배우고 성장할 수 있는 관계가 발전할 것입니다.',
                health: '정신적 스트레스 관리가 중요합니다. 명상이나 요가 등 마음의 평정을 찾는 활동이 도움이 됩니다.',
                money: '교육비나 자기계발 투자를 아끼지 마세요. 당장은 지출이지만 장기적으로 큰 수익으로 돌아올 것입니다.'
            },
            luckyPeriods: '2월, 6월, 9월',
            cautions: '너무 많은 것을 한꺼번에 배우려 하지 마세요. 우선순위를 정하고 단계적으로 접근하세요.',
            advice: '배움에 인색하지 마세요. 지금 투자한 시간과 노력이 미래의 가장 큰 자산이 됩니다. 호기심을 잃지 말고 계속 도전하세요.',
            keywords: ['학습', '성장', '지식', '발전']
        },
        {
            name: '인간관계 확장의 해',
            icon: '🤝',
            summary: '새로운 사람들과의 만남이 많아지고 기존 관계가 더욱 돈독해지는 해입니다.',
            description: '2025년은 인간관계의 폭이 크게 넓어지는 한 해가 될 것입니다. 뱀의 사교적 면모가 당신의 매력을 돋보이게 하고, 다양한 분야의 사람들과 의미 있는 관계를 맺을 수 있습니다. 네트워킹이 새로운 기회로 이어질 것입니다.',
            sectors: {
                career: '팀워크와 협업에서 큰 성과를 얻을 수 있습니다. 동료들과의 관계가 업무 성공의 열쇠가 됩니다.',
                love: '친구의 소개로 좋은 인연을 만날 가능성이 높습니다. 사교 모임에서 특별한 만남이 있을 수 있습니다.',
                health: '사교 활동이 많아져 피로가 누적될 수 있습니다. 적절한 휴식과 건강관리가 필요합니다.',
                money: '공동 투자나 파트너십에서 수익이 기대됩니다. 신뢰할 수 있는 파트너와의 협력이 성공을 가져올 것입니다.'
            },
            luckyPeriods: '1월, 5월, 10월',
            cautions: '모든 사람을 다 만족시키려 하지 마세요. 진정성 있는 관계에 집중하세요.',
            advice: '사람을 소중히 여기고 진정성 있게 대하세요. 당신이 먼저 도움을 베풀면 더 큰 도움이 돌아올 것입니다.',
            keywords: ['인맥', '소통', '협력', '신뢰']
        },
        {
            name: '안정과 정착의 해',
            icon: '🏠',
            summary: '그동안의 노력이 안정적인 기반으로 자리잡는 해입니다.',
            description: '2025년은 안정과 정착에 집중해야 할 한 해입니다. 을사년의 토 기운이 당신에게 견고한 기반을 마련해주고, 재정과 건강 모든 면에서 안정감을 가져다 줄 것입니다. 급한 변화보다는 현재를 더욱 견고히 하는 시기입니다.',
            sectors: {
                career: '현재 맡은 일에 충실하며 전문성을 깊게 파는 것이 유리합니다. 안정적인 성과로 신뢰를 쌓아가세요.',
                love: '진지한 관계로 발전하거나 결혼을 생각해볼 좋은 시기입니다. 안정적이고 성숙한 사랑이 기다리고 있습니다.',
                health: '규칙적인 생활 패턴을 유지하면 건강이 크게 좋아집니다. 꾸준한 운동과 균형잡힌 식단이 중요합니다.',
                money: '저축과 안정적인 투자로 자산을 꾸준히 늘려가세요. 부동산 투자를 고려해볼 만한 시기입니다.'
            },
            luckyPeriods: '4월, 8월, 12월',
            cautions: '안주하지 말고 꾸준한 발전을 추구하세요. 현상유지만으로는 뒤처질 수 있습니다.',
            advice: '급하게 변화를 추구하기보다는 현재를 견고히 하는데 집중하세요. 기초가 탄탄해야 더 높이 올라갈 수 있습니다.',
            keywords: ['안정', '기반', '정착', '성숙']
        },
        {
            name: '전환과 변화의 해',
            icon: '🔄',
            summary: '인생의 중요한 전환점이 되는 해입니다.',
            description: '2025년은 당신 인생의 중요한 전환점이 되는 한 해입니다. 뱀이 허물을 벗듯이, 당신도 과거의 낡은 모습을 벗고 새로운 모습으로 거듭날 것입니다. 변화를 두려워하지 말고 적극적으로 받아들이세요.',
            sectors: {
                career: '업종 변경이나 새로운 분야 진출을 고려해볼 시기입니다. 과감한 도전이 성공으로 이어질 것입니다.',
                love: '기존 관계의 변화나 새로운 시작이 예상됩니다. 운명적인 만남이나 중요한 결정의 시기가 될 것입니다.',
                health: '생활 패턴의 변화가 필요할 수 있습니다. 스트레스 관리와 충분한 휴식으로 변화에 적응하세요.',
                money: '투자 포트폴리오를 재검토하고 새로운 투자처를 모색해보세요. 변화하는 시장에 발맞춰 나가야 합니다.'
            },
            luckyPeriods: '3월, 7월, 10월',
            cautions: '급격한 변화보다는 단계적인 전환을 추구하세요. 충분한 준비와 계획이 필요합니다.',
            advice: '변화를 받아들이고 적응하는 유연성이 필요합니다. 끝은 새로운 시작임을 잊지 마세요.',
            keywords: ['전환', '변화', '새출발', '혁신']
        },
        {
            name: '휴식과 충전의 해',
            icon: '🧘',
            summary: '그동안 쌓인 피로를 풀고 에너지를 충전하는 해입니다.',
            description: '2025년은 몸과 마음의 건강을 최우선으로 해야 할 한 해입니다. 을사년의 차분한 에너지가 당신에게 휴식과 회복의 시간을 선사할 것입니다. 무리하지 말고 자신을 돌보는 시간을 가지세요.',
            sectors: {
                career: '현상 유지하며 체력과 에너지를 비축하는 시기입니다. 큰 도전보다는 안정적인 성과에 집중하세요.',
                love: '여유로운 마음으로 상대방을 배려하며 관계를 유지하세요. 함께 휴식을 취할 수 있는 시간을 늘리세요.',
                health: '정기 건강검진과 생활 습관 개선에 신경쓰세요. 몸의 신호를 잘 들어보고 무리하지 마세요.',
                money: '큰 지출은 피하고 안정적인 관리에 집중하세요. 건강 관련 투자는 아끼지 마세요.'
            },
            luckyPeriods: '2월, 6월, 11월',
            cautions: '너무 게으르지 말고 적당한 활동량을 유지하세요. 완전한 정체는 오히려 독이 됩니다.',
            advice: '몸과 마음의 건강을 최우선으로 하세요. 휴식도 생산적인 활동입니다. 에너지를 충전해야 더 멀리 갈 수 있습니다.',
            keywords: ['휴식', '건강', '회복', '재충전']
        },
        {
            name: '창조와 혁신의 해',
            icon: '💡',
            summary: '창의적 아이디어가 샘솟고 혁신적인 시도에서 성공하는 해입니다.',
            description: '2025년은 창의력이 폭발하는 한 해가 될 것입니다. 뱀의 지혜로운 직감이 당신에게 혁신적인 아이디어를 선사하고, 남들이 생각하지 못한 새로운 방법으로 성공을 거둘 수 있습니다.',
            sectors: {
                career: 'R&D, 기획, 창작 분야에서 두각을 나타낼 수 있습니다. 혁신적인 아이디어로 인정받을 것입니다.',
                love: '독특하고 매력적인 상대방과의 인연이 기대됩니다. 창의적인 데이트나 특별한 이벤트로 관계가 발전할 것입니다.',
                health: '창조적 활동을 통해 스트레스를 해소하세요. 예술이나 취미 활동이 정신 건강에 도움이 됩니다.',
                money: '새로운 수익원 개발이나 창업을 고려해볼 시기입니다. 독창적인 아이디어가 돈이 될 수 있습니다.'
            },
            luckyPeriods: '1월, 5월, 9월',
            cautions: '너무 급진적이지 말고 점진적인 혁신을 추구하세요. 시장의 반응을 살펴가며 진행하세요.',
            advice: '새로운 시각으로 문제를 바라보고 창의적 해결방안을 모색하세요. 남들과 다른 길이 성공의 지름길입니다.',
            keywords: ['창의', '혁신', '아이디어', '독창성']
        },
        {
            name: '리더십 발휘의 해',
            icon: '👑',
            summary: '타고난 리더십을 발휘하여 주변을 이끌어가는 해입니다.',
            description: '2025년은 당신의 리더십이 빛을 발하는 한 해가 될 것입니다. 을사년 뱀의 카리스마가 당신의 지도력을 한층 강화시키고, 많은 사람들이 당신을 따르게 될 것입니다.',
            sectors: {
                career: '관리직으로의 승진이나 프로젝트 리더 역할이 기대됩니다. 팀을 이끄는 능력이 인정받을 것입니다.',
                love: '관계에서 주도권을 갖되 상대방을 배려하는 마음을 잊지 마세요. 성숙한 리더십으로 관계를 이끌어가세요.',
                health: '책임감이 많아져 스트레스가 증가할 수 있습니다. 적절한 운동으로 스트레스를 해소하세요.',
                money: '투자 결정에서 신중함과 과감함의 균형이 필요합니다. 리더십을 발휘해 좋은 투자처를 찾아보세요.'
            },
            luckyPeriods: '3월, 8월, 12월',
            cautions: '독단적이지 말고 팀원들의 의견도 경청하세요. 진정한 리더는 소통하는 리더입니다.',
            advice: '솔선수범하며 다른 사람들에게 모범이 되어주세요. 진정한 리더는 섬기는 자임을 잊지 마세요.',
            keywords: ['리더십', '책임감', '카리스마', '통솔력']
        },
        {
            name: '조화와 협력의 해',
            icon: '🤲',
            summary: '혼자보다는 함께할 때 더 큰 힘을 발휘하는 해입니다.',
            description: '2025년은 협력과 조화의 힘을 느끼는 한 해가 될 것입니다. 뱀의 유연함이 당신에게 다른 사람과 조화를 이루는 지혜를 가져다 주고, 팀워크를 통해 개인으로는 불가능한 성과를 거둘 수 있습니다.',
            sectors: {
                career: '팀 프로젝트나 파트너십에서 큰 성과를 얻을 수 있습니다. 협업 능력이 성공의 열쇠가 됩니다.',
                love: '상호 존중과 이해를 바탕으로 한 관계가 발전합니다. 함께 성장하는 파트너십이 형성될 것입니다.',
                health: '규칙적인 생활과 적당한 사회 활동이 도움됩니다. 혼자만의 시간과 사교 시간의 균형을 맞추세요.',
                money: '공동 투자나 협력 사업에서 수익 기회가 있습니다. 신뢰할 수 있는 파트너와 함께 하세요.'
            },
            luckyPeriods: '4월, 7월, 11월',
            cautions: '자신의 의견도 적절히 표현하며 균형을 유지하세요. 일방적인 양보만으로는 좋은 관계가 될 수 없습니다.',
            advice: '다른 사람과의 협력을 통해 시너지를 창출하세요. 겸손함이 성공의 열쇠입니다.',
            keywords: ['협력', '조화', '팀워크', '균형']
        },
        {
            name: '도전과 모험의 해',
            icon: '🎯',
            summary: '새로운 도전에 과감히 나서며 모험정신을 발휘하는 해입니다.',
            description: '2025년은 모험과 도전의 한 해가 될 것입니다. 을사년 뱀의 과감함이 당신에게 새로운 영역에 도전할 용기를 주고, 위험을 감수하더라도 더 큰 성취를 이룰 수 있게 해줄 것입니다.',
            sectors: {
                career: '새로운 프로젝트나 해외 진출의 기회가 있을 수 있습니다. 과감한 도전이 큰 성공으로 이어질 것입니다.',
                love: '새로운 환경에서 예상치 못한 만남이 있을 수 있습니다. 모험적인 데이트나 여행에서 사랑이 싹틀 것입니다.',
                health: '활동량이 많아지니 부상 방지에 주의하세요. 새로운 스포츠나 운동을 시작하기 좋은 시기입니다.',
                money: '고위험 고수익 투자에서 기회가 있지만 신중하게 접근하세요. 모험적 투자는 여유 자금으로만 하세요.'
            },
            luckyPeriods: '2월, 6월, 10월',
            cautions: '무모한 도전보다는 준비된 모험을 하세요. 위험 관리를 철저히 하고 도전하세요.',
            advice: '계산된 위험을 감수하며 새로운 영역에 도전해보세요. 시도하지 않으면 성공도 없습니다.',
            keywords: ['도전', '모험', '용기', '개척']
        },
        {
            name: '완성과 성취의 해',
            icon: '🏆',
            summary: '오랫동안 추진해온 일들이 마무리되며 성과를 거두는 해입니다.',
            description: '2025년은 그동안의 모든 노력이 결실을 맺는 한 해가 될 것입니다. 을사년의 완성 에너지가 당신의 프로젝트들을 성공적으로 마무리하게 하고, 목표했던 성과를 충분히 거둘 수 있게 해줄 것입니다.',
            sectors: {
                career: '프로젝트 완료나 목표 달성으로 크게 인정받을 것입니다. 승진이나 포상의 기회가 있을 수 있습니다.',
                love: '관계가 안정되고 더욱 깊어지는 시기입니다. 결혼이나 약혼 등 중요한 결정을 할 수 있습니다.',
                health: '그동안의 건강관리 노력이 결실을 맺습니다. 하지만 성취 후 긴장이 풀려 관리가 소홀해지지 않도록 주의하세요.',
                money: '투자 수익 실현이나 큰 거래 성사가 기대됩니다. 재정 목표 달성으로 경제적 안정을 확보할 수 있습니다.'
            },
            luckyPeriods: '1월, 8월, 12월',
            cautions: '성취에 만족하지 말고 다음 목표를 준비하세요. 완성은 끝이 아니라 새로운 시작입니다.',
            advice: '마지막까지 최선을 다하며 완벽한 마무리를 추구하세요. 끝이 좋아야 모든 것이 좋습니다.',
            keywords: ['완성', '성취', '결실', '목표달성']
        }
    ]
};

// ===== 유틸리티 함수들 =====
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
// ===== 스플래시 화면 처리 (통합) =====
function hideSplash(){
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
    // 초기 라우팅
    if (!location.hash) location.hash = '#/home';
}
// ===== 네비게이션 시스템 =====
const pages = {
    get home() { return document.getElementById('page-home'); },
    get fortune() { return document.getElementById('page-fortune'); },
    get chat() { return document.getElementById('page-chat'); },
    get me() { return document.getElementById('page-me'); }
};
function setActiveTab(tab){
    const mainContent = document.getElementById('mainContent');
    if (mainContent) mainContent.style.display = 'block';
    $$('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.tab===tab));
    Object.entries(pages).forEach(([k,el])=>el?.classList.toggle('show',k===tab));
    closeAllOverlays();
}
// ===== 운세 뷰 시스템 =====
const fortuneTitle = $('#fortuneTitle');
const views = {
    'fortune-today': $('#view-today'),
    'fortune-saju' : $('#view-saju'),
    'fortune-tarot': $('#view-tarot'),
    'fortune-match': $('#view-match'),
    'fortune-year' : $('#view-year'),
    'fortune-lotto': $('#view-lotto')
};

function showFortuneView(route){
    closeAllOverlays();
    Object.values(views).forEach(v => v && (v.style.display = 'none'));
    switch (route) {
        case 'fortune-today':
            fortuneTitle.textContent = '오늘의 운세';
            views['fortune-today'].style.display = 'block';
            bindCalToggle('today');
            break;
        case 'fortune-saju':
            fortuneTitle.textContent = '정통 사주';
            views['fortune-saju'].style.display = 'block';
            bindCalToggle('saju');
            break;
        case 'fortune-tarot':
            fortuneTitle.textContent = '타로 점';
            views['fortune-tarot'].style.display = 'block';
            initializeTarot();
            break;
        case 'fortune-match':
            fortuneTitle.textContent = '궁합 보기';
            views['fortune-match'].style.display = 'block';
            break;
        case 'fortune-year':
            fortuneTitle.textContent = '신년 운세 (2025)';
            views['fortune-year'].style.display = 'block';
            break;
        case 'fortune-lotto':
            fortuneTitle.textContent = '행운번호';
            views['fortune-lotto'].style.display = 'block';
            break;
        default:
            fortuneTitle.textContent = '준비중';
            reactCrystal('✨ 준비중입니다...');
            break;
    }
    reactCrystal(`${fortuneTitle.textContent}을(를) 준비합니다…`);
}
// ===== 크리스탈 구슬 애니메이션 =====
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
// ===== 결과 시트 모달 =====
const sheet=$('#sheetBackdrop'), sheetTitle=$('#sheetTitle'), sheetContent=$('#sheetContent');
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
    // 차트 애니메이션 트리거
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
function closeAllOverlays(){
    try { closeSheet(); } catch(e){}
    try { closeTarotModal(); } catch(e){}
}
// ===== 최근 결과 저장 =====
function pushRecent(item){
    const arr=JSON.parse(localStorage.getItem(LS_KEY)||"[]");
    arr.unshift({...item,ts:Date.now()});
    localStorage.setItem(LS_KEY,JSON.stringify(arr.slice(0,20)));
}
// ===== 라우팅 시스템 =====
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
            'match': 'fortune-match',
            'year': 'fortune-year',
            'lotto': 'fortune-lotto'
        };
        showFortuneView(viewMap[sub] || 'fortune-today');
    }
}
// ===== 이벤트 리스너들 =====
// 1. 하단 네비게이션 바 클릭
$$('.nav-item[data-tab]').forEach(item => {
    item.addEventListener('click', () => {
        const tab = item.dataset.tab || 'home';
        location.hash = '#/' + tab;
        reactCrystal(`${tab} 페이지로 이동합니다! ✨`);
    });
});
// 2. 서비스 카드 클릭 (수정된 버전)
$$('.service-item[data-route], .special-item[data-route]').forEach(card => {
    card.addEventListener('click', () => {
        const route = card.dataset.route || 'fortune-today';
        const view = route.replace('fortune-', '');
        location.hash = '#/fortune/' + view;
    });
});

// 3. 글로벌 클릭 위임 (data-route 처리)
document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-route]');
    if (!el) return;
    e.preventDefault();
    hideSplash();
    const route = el.dataset.route;
    if (route && route.startsWith('fortune-')) {
        const view = route.replace('fortune-', '');
        location.hash = '#/fortune/' + view;
    } else if (route) {
        location.hash = '#/' + route;
    }
});

// ===== 사주/운세 계산 함수들 =====
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
    [pillars.year, pillars.month, pillars.day, pillars.time].forEach(gz => {
        if(!gz) return;
        const gan = gz[0];
        const zhi = gz[gz.length-1];
        const elG = GAN_WUXING[gan];
        if(elG) {
            countsGan[elG] = (countsGan[elG] || 0) + 1;
            countsAll[elG] = (countsAll[elG] || 0) + 1;
        }
        const hiddens = ZHI_HIDDENS[zhi] || {};
        Object.entries(hiddens).forEach(([hiddenGan, pct]) => {
            const elZ = GAN_WUXING[hiddenGan];
            if(elZ) {
                const w = pct/100;
                countsZhi[elZ] = (countsZhi[elZ] || 0) + w;
                countsAll[elZ] = (countsAll[elZ] || 0) + w;
            }
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
    
    // 럭키 아이템 계산
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

// ===== 사주 운세풀이 생성 함수들 =====
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
        '木': `${name ? name+'님은' : '이 분은'} 성장과 발전을 추구하는 인생을 걷게 됩니다. 어려서부터 학습능력이 뛰어나며, 새로운 것을 배우고 흡수하는 속도가 빠릅니다. 인생 전반에 걸쳐 끊임없는 자기계발과 성장의 기회가 주어지며, 특히 교육, 기획, 창의적인 분야에서 두각을 나타낼 수 있습니다. 사람들과의 네트워킹을 통해 기회를 확장해나가는 성향이 강하며, 중년 이후에는 후배나 제자를 양성하는 역할을 맡게 될 가능성이 높습니다.`,
        '火': `${name ? name+'님의' : '이 분의'} 인생은 열정과 에너지로 가득한 역동적인 여정이 될 것입니다. 타고난 리더십과 표현력으로 많은 사람들에게 영향을 미치며, 특히 젊은 시절부터 주목받는 경우가 많습니다. 예술, 엔터테인먼트, 세일즈, 홍보 분야에서 특별한 재능을 발휘할 수 있으며, 사람들 앞에 서는 것을 두려워하지 않습니다.`,
        '土': `${name ? name+'님은' : '이 분은'} 안정과 신뢰를 바탕으로 한 견실한 인생을 살게 됩니다. 급하게 서두르기보다는 차근차근 기반을 다져나가는 성향으로, 시간이 갈수록 주변의 신뢰를 얻게 됩니다. 부동산, 금융, 운영관리, 서비스업 등에서 장기적인 성공을 거둘 수 있으며, 특히 40대 이후에는 안정된 기반 위에서 더큰 성과를 이룰 수 있습니다.`,
        '金': `${name ? name+'님의' : '이 분의'} 인생은 정확성과 원칙을 중시하는 체계적인 여정이 될 것입니다. 분석적 사고와 논리적 판단력이 뛰어나 전문직, 금융, 법무, 기술 분야에서 인정받을 가능성이 높습니다. 젊은 시절에는 다소 경직되어 보일 수 있지만, 경험이 쌓이면서 자신만의 확고한 전문성을 구축하게 됩니다.`,
        '水': `${name ? name+'님은' : '이 분은'} 유연함과 적응력으로 다양한 경험을 하는 풍성한 인생을 살게 됩니다. 뛰어난 소통능력과 학습력으로 여러 분야를 넘나들며 활동할 수 있으며, 특히 교육, 연구, 미디어, 상담 분야에서 두각을 나타낼 수 있습니다. 직관력이 뛰어나 트렌드를 빠르게 파악하고, 변화하는 환경에 잘 적응합니다.`
    };
    return lifetimeTexts[dayEl] || `${name ? name+'님의' : '이 분의'} 인생은 독특한 개성과 특별한 재능으로 특별한 여정을 걸어가게 될 것입니다.`;
}

function generateDaeunAnalysis(r, name = '') {
    const birthYear = r.solar ? r.solar.getYear() : 2000;
    const currentYear = new Date().getFullYear();
    const age = currentYear - birthYear;
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
    analysis += '앞으로의 10년 단위 대운은 점차 안정되면서도 새로운 기회가 찾아올 것으로 보입니다.';
    return analysis;
}

function generateDaeunTiming(r, name = '') {
    const birthYear = r.solar ? r.solar.getYear() : 2000;
    const currentYear = new Date().getFullYear();
    const age = currentYear - birthYear;
    if (age < 25) {
        return `현재는 기초를 다지는 중요한 시기입니다. 25-35세 사이에 큰 전환점이 올 것이며, 이때의 선택이 향후 10년을 좌우합니다.`;
    } else if (age < 35) {
        return `지금이 인생의 중요한 전환기입니다. 35-45세 사이에 최고의 성취기가 올 것이니 현재의 노력을 멈추지 마세요.`;
    } else if (age < 45) {
        return `현재 인생의 절정기에 있습니다. 45-55세 사이에는 안정과 성숙의 시기가 올 것이며, 후배 양성에도 힘써보세요.`;
    } else if (age < 55) {
        return `성숙한 지혜가 빛나는 시기입니다. 55-65세 사이에는 새로운 도전이나 제2의 인생을 설계할 좋은 시기입니다.`;
    } else {
        return `인생의 여유와 깊이를 만끽할 시기입니다. 경험과 지혜를 나누며 의미 있는 시간을 보내세요.`;
    }
}

function generateCautionPeriods(r, name = '') {
    const dayGan = (r.pillars.day||'')[0] || '';
    const dayEl = GAN_WUXING[dayGan] || '';
    const cautionByElement = {
        '木': '금(金)의 해(원숭이띠, 닭띠 해)에는 과도한 스트레스와 건강 문제를 주의하세요.',
        '火': '물(水)의 해(쥐띠, 돼지띠 해)에는 감정 기복과 대인관계 갈등을 조심하세요.',
        '土': '목(木)의 해(호랑이띠, 토끼띠 해)에는 우유부단한 결정과 재정 관리를 주의하세요.',
        '金': '화(火)의 해(말띠, 뱀띠 해)에는 성급한 판단과 투자 손실을 경계하세요.',
        '水': '토(土)의 해(용띠, 개띠, 양띠, 소띠 해)에는 답답함과 정체를 인내로 극복하세요.'
    };
    return cautionByElement[dayEl] || '변화의 해에는 신중한 판단이 필요합니다. 또한 본명년과 충(沖)이 되는 해에는 큰 변화나 이동이 있을 수 있으니 미리 준비하세요.';
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
    const basicAdvice = {
        '木': '성장 지향적인 성격을 살려 지속적인 학습과 네트워킹에 투자하세요. 다만 너무 많은 일을 벌이지 말고 우선순위를 정해 차근차근 진행하는 것이 중요합니다.',
        '火': '뛰어난 표현력과 열정을 활용하되, 감정 조절과 인내심을 기르는 것이 필요합니다. 급한 성격을 다스리고 장기적인 관점에서 계획을 세우세요.',
        '土': '안정감과 신뢰성이 가장 큰 무기입니다. 꾸준함을 유지하되, 때로는 변화에 대한 유연성도 필요합니다. 새로운 시도를 두려워하지 마세요.',
        '金': '정확성과 원칙을 중시하는 성향을 살려 전문성을 기르세요. 완벽주의 성향이 강할 수 있으니 적당한 타협점을 찾는 지혜도 필요합니다.',
        '水': '뛰어난 적응력과 소통능력을 활용하되, 한 분야에서의 깊이도 추구하세요. 변화를 두려워하지 말고 새로운 기회에 열린 마음을 가지세요.'
    };
    let advice = `${name ? name+'님께' : '이 분께'} 드리는 인생 조언입니다. `;
    advice += basicAdvice[dayEl] || '자신의 장점을 살리되 단점을 보완하는 노력이 필요합니다.';
    advice += ` 특히 ${weakInfo.ko} 기운이 부족하니 ${weakInfo.boost}로 보완하면 더욱 균형잡힌 삶을 살 수 있습니다.`;
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
            `<strong>설명:</strong> 오행의 균형에서 가장 낮은 축입니다.<br/>
            <strong>보완 팁:</strong> ${weakInfo.boost}`, true)}
        ${createResultCard('🏷️', '월간 십신', ssMonthKR || '-', 
            `<strong>설명:</strong> ${ssDesc}`)}
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
        ${createResultCard('📜', '평생운', '인생 전체 흐름', lifetimeFortune, false)}
        ${createResultCard('📊', '대운분석', '10년 단위 흐름', daeunAnalysis, false)}
        ${createResultCard('⏰', '대운시기', '현재와 향후 시기', daeunTiming, false)}
        ${createResultCard('⚠️', '조심할시기', '주의가 필요한 때', cautionPeriods, false)}
        ${createResultCard('💡', '인생조언', '실용적 가이드', advice, false)}
    </div>
    <div class="info-box">
        <div class="info-title">📋 상세 정보</div>
        <div class="info-content">
            <strong>달력:</strong> ${r.calMode==='lunar'?'음력':'양력'}${r.calMode==='lunar' ? ` / 윤달: ${r.isLeap?'예':'아니오'}`:''}<br/>
            <strong>십신:</strong> 년:${krShiShen(r.tenGods.y)||'-'} / 월:${krShiShen(r.tenGods.m)||'-'} / 시:${krShiShen(r.tenGods.t)||'-'}<br/>
            ※ 운세풀이는 사주 구조를 바탕으로 한 일반적인 해석이며, 개인의 노력과 선택이 더욱 중요합니다.
        </div>
    </div>`;
    return html;
}

// ===== HTML 생성 함수들 =====
function createResultCard(icon, title, value, description, isMain = false, cardType = '') {
    let cardClass = 'result-card';
    if (isMain) cardClass += ' main-result';
    if (cardType) cardClass += ' ' + cardType;
    return `<div class="${cardClass}">
        <div class="card-header">
            <div class="card-icon">${icon}</div>
            <div class="card-title">${title}</div>
        </div>
        <div class="card-value">${value}</div>
        <div class="card-description">${description}</div>
    </div>`;
}

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

// ===== 타로 기능 =====
let selectedCards = new Set();
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
        setTimeout(()=>{ frontElement.style.opacity='1'; },100);
    },300);
    setTimeout(()=> showTarotModal(randomTarotIndex, isUpright), 800);
    pushRecent({
        type:'tarot',
        card:selectedCard.name,
        upright:isUpright,
        meaning:isUpright?selectedCard.upright:selectedCard.reversed
    });
    reactCrystal(`${selectedCard.name.split('(')[0].trim()}을 뽑았습니다! ✨`);
}

function drawRandomTarotCard(){
    const available = $$('.tarot-card-back:not(.revealed)');
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

function showTarotModal(cardIndex, isUpright) {
    const idx = Math.max(0, Math.min(TAROT_DETAILS.length-1, Number(cardIndex)||0));
    const card = TAROT_DETAILS[idx];
    if(!card) return;
    
    const modal = $('#tarotModalOverlay');
    const content = $('#tarotModalContent');
    if(!modal || !content) return;
    
    const currentMeaning = isUpright ? card.upright : card.reversed;
    
    let meaningText = '';
    if (typeof currentMeaning === 'object') {
        meaningText = `
            <div style="margin-bottom:12px; padding:8px; background:rgba(255,255,255,0.05); border-radius:6px;">
                <strong style="color:#4ade80;">🔮 일반해석:</strong><br/>
                <span style="margin-left:20px;">${currentMeaning.general || ''}</span>
            </div>
            <div style="margin-bottom:12px; padding:8px; background:rgba(255,255,255,0.05); border-radius:6px;">
                <strong style="color:#f87171;">💕 연애운:</strong><br/>
                <span style="margin-left:20px;">${currentMeaning.love || ''}</span>
            </div>
            <div style="margin-bottom:12px; padding:8px; background:rgba(255,255,255,0.05); border-radius:6px;">
                <strong style="color:#60a5fa;">💼 직업운:</strong><br/>
                <span style="margin-left:20px;">${currentMeaning.career || ''}</span>
            </div>
            <div style="margin-bottom:12px; padding:8px; background:rgba(255,255,255,0.05); border-radius:6px;">
                <strong style="color:#fbbf24;">💡 조언:</strong><br/>
                <span style="margin-left:20px;">${currentMeaning.advice || ''}</span>
            </div>
        `;
    } else {
        meaningText = currentMeaning || '';
    }
    
    content.innerHTML = `
        <h2 style="text-align:center; margin-bottom:15px;">${card.name}</h2>
        <p style="color:#9ca3af; margin-bottom:20px; line-height:1.6; text-align:center; font-style:italic;">
            ${card.meaning}
        </p>
        
        <div style="margin-top:20px; padding:15px; background:rgba(255,215,0,0.1); border-radius:10px; border-left:4px solid #ffd700;">
            <h3 style="color:#ffd700; margin-bottom:15px; text-align:center;">
                ${isUpright ? '🌟 정방향 해석' : '🌀 역방향 해석'}
            </h3>
            <div style="color:#e5e7eb; line-height:1.6;">
                ${meaningText}
            </div>
        </div>
        
        ${card.keywords ? `<div style="margin-top:15px; padding:12px; background:rgba(255,255,255,0.05); border-radius:8px; text-align:center;">
            <strong style="color:#ffd700;">🏷️ 핵심 키워드:</strong> ${card.keywords}
        </div>` : ''}
    `;
    
    modal.style.display='flex';
    requestAnimationFrame(()=> modal.classList.add('show'));
}

function closeTarotModal(){
    const modal = document.getElementById('tarotModalOverlay');
    if(!modal) return;
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}
// 타로 모달 닫기 이벤트들 (기존 코드 끝부분에 추가)
document.addEventListener('DOMContentLoaded', () => {
    const closeBtn = document.getElementById('tarotCloseBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeTarotModal);
    }
    
    const overlay = document.getElementById('tarotModalOverlay');
    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeTarotModal();
            }
        });
    }
});

// ESC 키로도 닫기
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeTarotModal();
    }
});

// ===== 로또 번호 생성 =====
function seededRandomFactory(seedStr='') {
    let h = 2166136261 >>> 0;
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

function generateLottoSet(seedStr) {
    const s = String(seedStr ?? '');
    const digits = s.replace(/\D/g, '');
    let seed = Number.isFinite(Date.parse(s)) ? Date.parse(s) : NaN;
    if (!Number.isFinite(seed) && digits.length === 8) {
        const norm = `${digits.slice(0,4)}-${digits.slice(4,6)}-${digits.slice(6,8)}`;
        seed = Date.parse(norm);
    }
    if (!Number.isFinite(seed)) {
        let h = 2166136261;
        for (let i = 0; i < s.length; i++) h = (h ^ s.charCodeAt(i)) * 16777619 >>> 0;
        seed = (h || (Date.now() >>> 0));
    }
    let state = seed >>> 0;
    function rnd() {
        state = (1664525 * state + 1013904223) >>> 0;
        return state / 2 ** 32;
    }
    const picked = new Set();
    let guard = 0;
    while (picked.size < 6 && guard++ < 4000) {
        const n = Math.floor(rnd() * 45) + 1;
        if (n >= 1 && n <= 45) picked.add(n);
    }
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
// ===== 버튼 이벤트 리스너들 =====
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
        let html = `<div class="result-section">
            <div class="section-title-result">🌟 ${name ? name+'님의 ' : ''}오늘의 운세</div>
            <div class="fortune-date">📅 ${fortuneData.date}</div>
        </div>`;
        html += '<div class="result-section">';
        Object.values(fortuneData.categories).forEach((category, index) => {
            html += createResultCard(
                category.icon,
                category.name,
                `${category.score}점`,
                category.message,
                index === 0
            );
        });
        html += '</div>';
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
        openSheet('오늘의 운세', html, {
            type: 'enhanced-today',
            birth_input: birthRaw,
            name: name,
            calMode: calMode,
            isLeap: isLeap,
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
            name, date: rawDate, time: rawTime, calMode, isLeap,
            data: r
        });
        reactCrystal('사주 해석이 완료되었습니다 ✨');
    } catch (e) {
        console.error(e);
        alert(e.message || '사주 계산 중 오류');
    }
});
// 로또 버튼
$('#btnLotto')?.addEventListener('click', () => {
    const birth = $('#lotto-birth')?.value?.trim() || '';
    try {
        const result = generateLottoNumbers(birth);
        let html = `<div class="result-section">
            <div class="section-title-result">🎲 이번 주 행운번호</div>
            <div class="lotto-wrap">
                <div class="lotto-balls">`;
        result.main.forEach(n => {
            html += `<div class="ball">${String(n).padStart(2,'0')}</div>`;
        });
        html += `<div style="align-self:center;font-weight:800;margin:0 2px">+</div>
                <div class="ball bonus">${String(result.bonus).padStart(2,'0')}</div>
            </div>
            <div class="lotto-meta">생성 기준: ${result.seedInfo} · 참고용</div>
        </div></div>`;
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
// 시트 닫기
$('#btnClose')?.addEventListener('click', closeSheet);
sheet?.addEventListener('click', e=>{
    if(e.target===sheet) closeSheet();
});
// 최근 결과 저장
$('#btnSave')?.addEventListener('click', ()=>{
    if(!lastResult){
        closeSheet();
        return;
    }
    pushRecent(lastResult);
    const notice = document.createElement('div');
    notice.textContent = '💾 최근 결과에 저장됐습니다.';
    notice.style.cssText = 'margin-top:16px;padding:12px;background:rgba(102,126,234,0.1);border-radius:8px;text-align:center;color:#667eea;font-weight:bold;';
    sheetContent.appendChild(notice);
    setTimeout(() => notice.remove(), 3000);
});
// 최근 결과 삭제
$('#btnClear')?.addEventListener('click', ()=>{
    if(confirm('최근 결과를 모두 삭제하시겠습니까?')){
        localStorage.removeItem(LS_KEY);
        alert('최근 결과가 모두 삭제되었습니다.');
    }
});
// ===== 초기화 =====
window.addEventListener('hashchange', handleRoute);
window.addEventListener('load', () => {
    setTimeout(hideSplash, 500);
    bindCalToggle('today');
    bindCalToggle('saju');
    if (!location.hash) location.hash = '#/home';
    handleRoute();
});
// ESC 키로 모달 닫기
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeAllOverlays();
    }
});
console.log('✅ MysticTell 초기화 완료');

// 기존 calcMatch 함수를 이 코드로 교체
function calcMatch(a, b) {
    if(!a || !b) return {score:null, text:'두 생년월일을 모두 입력하세요.'};
    
    try {
        // 사주 기본 정보 계산
        const baziA = computeBaZi(a, '', 'solar', false);
        const baziB = computeBaZi(b, '', 'solar', false);
        
        // 일간, 연지 추출
        const dayGanA = (baziA.pillars.day || '')[0] || '';
        const dayGanB = (baziB.pillars.day || '')[0] || '';
        const yearZhiA = (baziA.pillars.year || '')[1] || '';
        const yearZhiB = (baziB.pillars.year || '')[1] || '';
        
        // 오행 추출
        const elementA = GAN_WUXING[dayGanA] || '';
        const elementB = GAN_WUXING[dayGanB] || '';
        
        // 1. 오행 궁합 계산
        let elementScore = 50;
        const compatible = {
            '木': ['火', '水'], '火': ['木', '土'], '土': ['火', '金'], 
            '金': ['土', '水'], '水': ['金', '木']
        };
        const conflicted = {
            '木': ['金'], '火': ['水'], '土': ['木'], '金': ['火'], '水': ['土']
        };
        
        if (compatible[elementA] && compatible[elementA].includes(elementB)) {
            elementScore += 25; // 상생 관계
        } else if (conflicted[elementA] && conflicted[elementA].includes(elementB)) {
            elementScore -= 20; // 상극 관계
        } else if (elementA === elementB) {
            elementScore += 15; // 같은 오행
        }
        
        // 2. 띠 궁합 계산 (12지지 기반)
        let zodiacScore = 50;
        const zodiacCompatibility = {
            '子': { best: ['申', '辰'], good: ['丑', '亥'], bad: ['午'] }, // 쥐
            '丑': { best: ['巳', '酉'], good: ['子', '卯'], bad: ['未'] }, // 소
            '寅': { best: ['午', '戌'], good: ['亥', '卯'], bad: ['申'] }, // 호랑이
            '卯': { best: ['未', '亥'], good: ['寅', '戌'], bad: ['酉'] }, // 토끼
            '辰': { best: ['申', '子'], good: ['酉', '丑'], bad: ['戌'] }, // 용
            '巳': { best: ['酉', '丑'], good: ['申', '辰'], bad: ['亥'] }, // 뱀
            '午': { best: ['戌', '寅'], good: ['未', '卯'], bad: ['子'] }, // 말
            '未': { best: ['亥', '卯'], good: ['午', '寅'], bad: ['丑'] }, // 양
            '申': { best: ['子', '辰'], good: ['巳', '酉'], bad: ['寅'] }, // 원숭이
            '酉': { best: ['丑', '巳'], good: ['辰', '申'], bad: ['卯'] }, // 닭
            '戌': { best: ['寅', '午'], good: ['卯', '未'], bad: ['辰'] }, // 개
            '亥': { best: ['卯', '未'], good: ['寅', '戌'], bad: ['巳'] }  // 돼지
        };
        
        const zodiacA = zodiacCompatibility[yearZhiA];
        if (zodiacA) {
            if (zodiacA.best && zodiacA.best.includes(yearZhiB)) {
                zodiacScore += 30;
            } else if (zodiacA.good && zodiacA.good.includes(yearZhiB)) {
                zodiacScore += 15;
            } else if (zodiacA.bad && zodiacA.bad.includes(yearZhiB)) {
                zodiacScore -= 20;
            }
        }
        
        // 3. 나이차 고려
        let ageScore = 50;
        const yearA = baziA.solar ? baziA.solar.getYear() : 2000;
        const yearB = baziB.solar ? baziB.solar.getYear() : 2000;
        const ageDiff = Math.abs(yearA - yearB);
        if (ageDiff <= 2) ageScore += 20;
        else if (ageDiff <= 5) ageScore += 15;
        else if (ageDiff <= 8) ageScore += 5;
        else if (ageDiff > 15) ageScore -= 15;
        
        // 4. 오행 균형도 고려
        let balanceScore = 50;
        const KEYS = ['木','火','土','金','水'];
        const totalA = KEYS.reduce((a,k)=>a+(baziA.countsAll[k]||0),0);
        const totalB = KEYS.reduce((a,k)=>a+(baziB.countsAll[k]||0),0);
        
        if (totalA > 0 && totalB > 0) {
            const balanceA = Math.max(...KEYS.map(k => baziA.countsAll[k]||0)) - Math.min(...KEYS.map(k => baziA.countsAll[k]||0));
            const balanceB = Math.max(...KEYS.map(k => baziB.countsAll[k]||0)) - Math.min(...KEYS.map(k => baziB.countsAll[k]||0));
            const balanceDiff = Math.abs(balanceA - balanceB);
            balanceScore = Math.max(20, 70 - balanceDiff * 8);
        }
        
        // 최종 점수 (가중평균)
        const finalScore = Math.round(
            elementScore * 0.35 + 
            zodiacScore * 0.25 + 
            ageScore * 0.25 + 
            balanceScore * 0.15
        );
        const clampedScore = Math.max(15, Math.min(95, finalScore));
        
        // 오행별 성격 특성 및 조언 데이터
        const elementCharacteristics = {
            '木': {
                traits: '성장지향적, 계획적, 이상주의적, 감정적',
                communication: '논리적 설명보다 비전과 가능성 중심으로 대화',
                conflicts: '급한 성격을 이해하고 기다려주기, 변화 요구시 단계적 접근',
                dateStyle: '자연스러운 야외 활동, 새로운 경험, 미래 계획 세우기'
            },
            '火': {
                traits: '열정적, 표현력 풍부, 사교적, 즉흥적',
                communication: '감정을 충분히 표현할 수 있는 분위기 조성',
                conflicts: '감정이 격해질 때 잠시 시간을 두고 대화, 인정받고 싶어하는 욕구 이해',
                dateStyle: '활기찬 장소, 파티나 이벤트, 창의적 활동'
            },
            '土': {
                traits: '안정적, 신뢰할 수 있는, 현실적, 보수적',
                communication: '구체적이고 실질적인 내용 중심으로 대화',
                conflicts: '변화를 천천히 받아들이므로 인내심 필요, 안정감 제공',
                dateStyle: '편안한 집에서의 시간, 전통적인 데이트, 맛집 탐방'
            },
            '金': {
                traits: '원칙적, 분석적, 완벽주의, 독립적',
                communication: '논리적이고 체계적인 설명, 개인 시간 존중',
                conflicts: '비판보다 건설적 제안으로 접근, 완벽함에 대한 압박 줄이기',
                dateStyle: '문화적 활동, 박물관이나 전시회, 고급스러운 장소'
            },
            '水': {
                traits: '유연한, 적응력 좋은, 직감적, 학습지향적',
                communication: '다양한 주제로 깊이 있는 대화, 호기심 충족',
                conflicts: '우유부단할 때 선택 도움, 변화무쌍함을 이해하고 수용',
                dateStyle: '지적 호기심 자극하는 활동, 책방이나 강의, 여행'
            }
        };
        
        // 관계 발전 단계별 조언 생성
        function generateStageAdvice(elemA, elemB, score) {
            const charA = elementCharacteristics[elementA];
            const charB = elementCharacteristics[elementB];
            
            let advice = {
                initial: '', // 연애 초기
                development: '', // 관계 발전기
                commitment: '' // 결혼/동거 준비
            };
            
            if (score >= 70) {
                advice.initial = `연애 초기에는 ${charA?.dateStyle || '취향에 맞는 활동'}과 ${charB?.dateStyle || '상대방이 좋아하는 활동'}을 번갈아가며 즐겨보세요. 서로의 다른 매력을 발견할 수 있습니다.`;
                advice.development = `관계가 깊어지면서 ${charA?.communication || '솔직한 소통'}과 ${charB?.communication || '진심 어린 대화'}를 통해 더욱 끈끈한 유대감을 형성할 수 있습니다.`;
                advice.commitment = `결혼이나 동거를 고려할 때는 두 분의 생활 패턴과 가치관이 잘 맞으므로 자연스럽게 진행될 것입니다. 구체적인 미래 계획을 함께 세워보세요.`;
            } else if (score >= 50) {
                advice.initial = `처음에는 서로의 차이점이 새롭게 느껴질 수 있습니다. ${charA?.dateStyle || '편안한 활동'}부터 시작해서 점차 취향의 폭을 넓혀가세요.`;
                advice.development = `관계 발전 과정에서 ${charA?.conflicts || '서로를 이해하려는 노력'}이 중요합니다. 갈등이 생기면 ${charB?.communication || '열린 마음으로 대화'}하세요.`;
                advice.commitment = `진지한 관계로 발전하려면 생활 방식과 가치관의 차이를 충분히 논의하고 타협점을 찾는 시간이 필요합니다.`;
            } else {
                advice.initial = `초기에는 서로의 다름을 받아들이는 연습이 필요합니다. 무리하지 말고 천천히 서로를 알아가세요.`;
                advice.development = `관계 발전에는 더 많은 인내와 노력이 필요합니다. ${charA?.conflicts || '상대방의 관점을 이해하려 노력'}하고 ${charB?.conflicts || '배려하는 마음'}을 가져주세요.`;
                advice.commitment = `장기적인 관계를 위해서는 전문적인 상담이나 관계 개선 프로그램을 함께 참여하는 것도 도움이 될 수 있습니다.`;
            }
            
            return advice;
        }
        
        // 2025년 신년운세 계산 함수
function calc2025Fortune(birthDate, name = '') {
    if (!birthDate) {
        return { idx: null, text: '생년월일을 입력하세요.' };
    }
    
    try {
        // 사주 기본 정보 계산
        const bazi = computeBaZi(birthDate, '', 'solar', false);
        const birthYear = bazi.solar ? bazi.solar.getYear() : 2000;
        const currentAge = 2025 - birthYear;
        
        // 생년월일 숫자 합계로 기본 인덱스 계산
        const [y, m, d] = birthDate.split('-').map(Number);
        let baseIndex = (y + m + d + 2025) % YEAR_2025_DATA.personalTypes.length;
        
        // 일간 오행으로 보정
        const dayGan = (bazi.pillars.day || '')[0] || '';
        const dayElement = GAN_WUXING[dayGan] || '';
        const elementModifier = {
            '木': 0, '火': 1, '土': 2, '金': 3, '水': 4
        };
        const finalIndex = (baseIndex + (elementModifier[dayElement] || 0)) % YEAR_2025_DATA.personalTypes.length;
        
        const personalFortune = YEAR_2025_DATA.personalTypes[finalIndex];
        
        // 나이대별 특별 조언 생성
        function getAgeSpecificAdvice(age) {
            if (age < 25) {
                return '젊은 에너지를 활용하여 다양한 경험을 쌓으세요. 실패를 두려워하지 말고 적극적으로 도전하는 것이 중요합니다. 2025년은 인생의 기반을 다지는 소중한 시기입니다.';
            } else if (age < 35) {
                return '경력 발전과 인생 설계가 중요한 시기입니다. 을사년의 지혜로운 에너지를 활용해 장기적인 계획을 세우고 실행해보세요. 이 시기의 선택이 향후 10년을 좌우합니다.';
            } else if (age < 50) {
                return '경험과 체력이 조화를 이루는 황금기입니다. 리더십을 발휘하고 후배들을 이끌어가며 자신만의 전문 영역을 구축하세요. 안정과 도전의 균형이 중요합니다.';
            } else if (age < 65) {
                return '풍부한 경험을 바탕으로 지혜로운 판단을 하는 시기입니다. 축적된 지식과 인맥을 활용해 새로운 가치를 창출하고, 사회에 기여할 수 있는 방법을 찾아보세요.';
            } else {
                return '인생의 여유와 깊이를 만끽할 시기입니다. 그동안의 경험을 후세에 전하고, 진정한 행복과 만족을 추구하는데 집중하세요. 건강관리가 가장 중요합니다.';
            }
        }
        
        // 월별 운세 포인트 생성 (간단히)
        function getMonthlyHighlights() {
            const luckyMonths = personalFortune.luckyPeriods.split(', ');
            return {
                best: luckyMonths[0] || '상반기',
                good: luckyMonths[1] || '중반기',
                careful: personalFortune.cautions.includes('3월') ? '3월' : '하반기'
            };
        }
        
        return {
            idx: finalIndex,
            yearInfo: YEAR_2025_DATA.yearInfo,
            personalFortune: personalFortune,
            ageAdvice: getAgeSpecificAdvice(currentAge),
            monthlyHighlights: getMonthlyHighlights(),
            birthYear: birthYear,
            currentAge: currentAge,
            name: name,
            element: dayElement
        };
        
    } catch (error) {
        console.error('신년운세 계산 오류:', error);
        // 오류 시 기존 방식으로 폴백
        const [y, m, d] = birthDate.split('-').map(Number);
        const k = (y + m + d + 2025) % 6;
        const basicTypes = [
            '도약의 해: 새로운 기회와 성장이 기다립니다.',
            '성장의 해: 배움에 투자할수록 큰 보상이 따릅니다.',
            '관계의 해: 인간관계에서 새로운 기회를 발견하세요.',
            '안정의 해: 기반을 다지고 재정관리에 집중하세요.',
            '전환의 해: 변화를 받아들이고 새로운 시작을 준비하세요.',
            '휴식의 해: 건강관리와 에너지 충전에 집중하세요.'
        ];
        return {
            idx: k,
            text: basicTypes[k]
        };
    }
}
        // 신년운세 HTML 생성 함수
function create2025FortuneHTML(result, name) {
    const nameTitle = name ? `${name}님의 ` : '';
    
    if (!result.personalFortune) {
        // 폴백 모드
        return `<div class="result-section">
            <div class="section-title-result">🐍 ${nameTitle}2025년 을사년 운세</div>
            <div class="result-card main-result">
                <div class="card-value">${result.text}</div>
            </div>
        </div>`;
    }
    
    const { yearInfo, personalFortune, ageAdvice, monthlyHighlights } = result;
    
    return `
        <div class="result-section">
            <div class="section-title-result">🐍 ${nameTitle}2025년 을사년 운세</div>
            
            <div class="year-overview-card">
                <div class="year-character">
                    <div class="year-element">${yearInfo.element}</div>
                    <div class="year-desc">${yearInfo.description}</div>
                    <div class="year-keywords">
                        ${yearInfo.keywords.map(keyword => `<span class="keyword-tag">${keyword}</span>`).join('')}
                    </div>
                </div>
            </div>
        </div>
        
        <div class="result-section">
            <div class="section-title-result">${personalFortune.icon} ${nameTitle}개인 운세</div>
            
            <div class="result-card main-result">
                <div class="card-header">
                    <div class="card-icon">${personalFortune.icon}</div>
                    <div class="card-title">${personalFortune.name}</div>
                </div>
                <div class="card-description">${personalFortune.description}</div>
            </div>
        </div>
        
        <div class="result-section">
            <div class="section-title-result">📊 분야별 2025년 운세</div>
            
            <div class="result-card">
                <div class="card-header">
                    <div class="card-icon">💼</div>
                    <div class="card-title">직장운</div>
                </div>
                <div class="card-description">${personalFortune.sectors.career}</div>
            </div>
            
            <div class="result-card">
                <div class="card-header">
                    <div class="card-icon">💕</div>
                    <div class="card-title">연애운</div>
                </div>
                <div class="card-description">${personalFortune.sectors.love}</div>
            </div>
            
            <div class="result-card">
                <div class="card-header">
                    <div class="card-icon">💪</div>
                    <div class="card-title">건강운</div>
                </div>
                <div class="card-description">${personalFortune.sectors.health}</div>
            </div>
            
            <div class="result-card">
                <div class="card-header">
                    <div class="card-icon">💰</div>
                    <div class="card-title">재물운</div>
                </div>
                <div class="card-description">${personalFortune.sectors.money}</div>
            </div>
        </div>
        
        <div class="result-section">
            <div class="section-title-result">📅 2025년 주요 시기</div>
            
            <div class="timeline-card">
                <div class="timeline-item">
                    <div class="timeline-icon">🍀</div>
                    <div class="timeline-content">
                        <div class="timeline-title">특히 좋은 달</div>
                        <div class="timeline-desc">${personalFortune.luckyPeriods}</div>
                    </div>
                </div>
                <div class="timeline-item caution">
                    <div class="timeline-icon">⚠️</div>
                    <div class="timeline-content">
                        <div class="timeline-title">주의할 점</div>
                        <div class="timeline-desc">${personalFortune.cautions}</div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="result-section">
            <div class="section-title-result">🎯 ${result.currentAge}세 맞춤 조언</div>
            <div class="result-card">
                <div class="card-header">
                    <div class="card-icon">🧭</div>
                    <div class="card-title">인생 단계별 가이드</div>
                </div>
                <div class="card-description">${ageAdvice}</div>
            </div>
        </div>
        
        <div class="result-section">
            <div class="section-title-result">💡 2025년 핵심 실천 조언</div>
            <div class="result-card">
                <div class="card-header">
                    <div class="card-icon">⭐</div>
                    <div class="card-title">성공의 열쇠</div>
                </div>
                <div class="card-description">${personalFortune.advice}</div>
            </div>
        </div>
        
        <div class="info-box">
            <div class="info-title">📝 2025년 실천 체크리스트</div>
            <div class="info-content">
                <strong>핵심 테마:</strong> ${personalFortune.name}<br/>
                <strong>주요 키워드:</strong> ${personalFortune.keywords.join(', ')}<br/>
                <strong>실천 포인트:</strong> ${personalFortune.advice}
            </div>
        </div>
    `;
}
        
        // 갈등 해결 방안 생성
        function generateConflictSolutions(elemA, elemB) {
            const charA = elementCharacteristics[elementA];
            const charB = elementCharacteristics[elementB];
            
            let solutions = [];
            
            // 오행 상극 관계별 특화된 조언
            if (conflicted[elementA] && conflicted[elementA].includes(elementB)) {
                if (elementA === '木' && elementB === '金') {
                    solutions.push('목(성장지향)과 금(원칙중심)의 갈등: 계획 세울 때는 목의 비전을 존중하되, 실행할 때는 금의 체계성을 활용하세요.');
                } else if (elementA === '火' && elementB === '水') {
                    solutions.push('화(열정)와 수(신중함)의 갈등: 중요한 결정은 화의 직감과 수의 분석을 모두 거쳐서 내리세요.');
                } else if (elementA === '土' && elementB === '木') {
                    solutions.push('토(안정)와 목(변화)의 갈등: 변화가 필요할 때는 작은 단계부터 시작해서 점진적으로 진행하세요.');
                }
            }
            
            // 공통 갈등 해결 방안
            solutions.push(`의사소통: ${charA?.communication || '서로의 소통 방식을 이해'}하고 ${charB?.communication || '상대방에게 맞는 방식으로 대화'}하세요.`);
            solutions.push(`갈등 예방: ${charA?.conflicts || '상대방의 성향을 미리 파악'}하고 ${charB?.conflicts || '배려하는 마음'}을 가져주세요.`);
            solutions.push('타이밍: 민감한 대화는 두 분 모두 컨디션이 좋고 시간 여유가 있을 때 하세요.');
            solutions.push('공통 관심사: 서로 다른 취향 사이에서 공통분모를 찾아 함께 즐길 수 있는 활동을 개발하세요.');
            
            return solutions;
        }
        
        // 상세 분석 텍스트 생성
        const elementNames = {'木':'목','火':'화','土':'토','金':'금','水':'수'};
        const elemA = elementNames[elementA] || '?';
        const elemB = elementNames[elementB] || '?';
        
        const zodiacNames = {
            '子':'쥐','丑':'소','寅':'호랑이','卯':'토끼','辰':'용','巳':'뱀',
            '午':'말','未':'양','申':'원숭이','酉':'닭','戌':'개','亥':'돼지'
        };
        const zodiacA_name = zodiacNames[yearZhiA] || '?';
        const zodiacB_name = zodiacNames[yearZhiB] || '?';
        
        // 기존 text 생성 부분을 이렇게 교체
let text = '';
if (clampedScore >= 85) {
    text = `천생연분의 궁합입니다! ${elemA}(${elementA})과 ${elemB}(${elementB}) 기질이 완벽하게 조화를 이루어 서로의 장점을 극대화시키고 단점을 자연스럽게 보완합니다. ${zodiacA_name}띠의 ${getZodiacTraits(yearZhiA)}과 ${zodiacB_name}띠의 ${getZodiacTraits(yearZhiB)}이 매우 잘 어울리며, ${ageDiff}세의 나이차는 서로에게 신선함과 안정감을 동시에 제공합니다. 이 관계에서는 깊은 정신적 교감이 가능하고, 서로를 성장시키는 동반자 관계로 발전할 가능성이 매우 높습니다. 연애부터 결혼까지 자연스럽게 흘러갈 것이며, 주변에서도 부러워하는 이상적인 커플이 될 것입니다.`;
} else if (clampedScore >= 70) {
    text = `매우 좋은 궁합입니다. ${elemA} 성향의 ${getElementPersonality(elementA)}과 ${elemB} 성향의 ${getElementPersonality(elementB)}이 서로 도움을 주는 관계입니다. ${zodiacA_name}띠와 ${zodiacB_name}띠의 조합은 전통적으로 좋은 궁합으로 여겨지며, 실제로도 많은 부분에서 잘 맞을 것입니다. 가끔 의견 차이가 있을 수 있지만, 이는 관계를 더욱 풍요롭게 만드는 요소가 됩니다. ${ageDiff}세의 나이차는 서로 다른 관점을 제공하여 시야를 넓혀주는 역할을 합니다. 소통과 배려를 바탕으로 서로의 차이를 존중한다면 매우 행복하고 안정적인 관계를 만들어갈 수 있습니다.`;
} else if (clampedScore >= 55) {
    text = `무난한 궁합으로 노력에 따라 좋은 관계로 발전할 수 있습니다. ${elemA} 기질과 ${elemB} 기질은 상반된 면이 있지만, 이는 서로에게 부족한 부분을 채워줄 수 있는 기회이기도 합니다. ${zodiacA_name}띠의 특성과 ${zodiacB_name}띠의 성향이 다소 다르지만, 이해하려는 노력을 통해 극복 가능합니다. ${ageDiff}세의 나이 차이로 인해 생활 패턴이나 가치관에서 차이가 날 수 있으나, 이는 서로를 배우고 성숙해지는 계기가 될 것입니다. 초기에는 서로를 이해하는 시간이 필요하지만, 인내심을 갖고 꾸준히 소통한다면 안정적이고 균형잡힌 관계를 구축할 수 있습니다.`;
} else if (clampedScore >= 40) {
    text = `조금 어려운 궁합이지만 극복 불가능하지는 않습니다. ${elemA}과 ${elemB} 오행 관계에서 상극 요소가 있어 기본적인 성향과 접근 방식이 많이 다를 수 있습니다. ${zodiacA_name}띠와 ${zodiacB_name}띠는 서로 다른 가치관과 생활 방식을 선호하는 경향이 있어 초기 적응에 시간이 걸릴 것입니다. ${ageDiff}세의 나이차로 인한 세대 차이나 경험의 차이도 갈등 요소가 될 수 있습니다. 하지만 서로의 다름을 인정하고 존중하며, 꾸준한 대화와 양보를 통해 관계를 개선해나간다면 오히려 더 깊고 성숙한 사랑을 만들어갈 수 있습니다. 급하게 서두르지 말고 충분한 시간을 갖고 서로를 이해해나가는 것이 중요합니다.`;
} else {
    text = `힘든 궁합이지만 진정한 사랑으로 극복할 수 있습니다. ${elemA} 기질과 ${elemB} 기질의 차이가 커서 기본적인 사고방식과 행동 패턴이 많이 다를 것입니다. ${zodiacA_name}띠와 ${zodiacB_name}띠는 전통적으로 갈등이 있을 수 있는 조합이며, 일상생활에서도 마찰이 생길 가능성이 높습니다. ${ageDiff}세의 나이차는 소통에 어려움을 줄 수 있고, 서로의 관심사나 생활 리듬이 맞지 않을 수 있습니다. 이런 어려움에도 불구하고 서로에 대한 깊은 사랑과 이해가 있다면, 차이점들을 보완하고 새로운 조화를 만들어낼 수 있습니다. 전문적인 관계 상담을 받는 것도 도움이 될 것이며, 무엇보다 서로에 대한 인내심과 포용력이 관계 성공의 열쇠가 됩니다.`;
}

// 띠별 특성을 반환하는 함수 추가
function getZodiacTraits(zhi) {
    const traits = {
        '子': '기민함과 적응력',
        '丑': '성실함과 끈기',
        '寅': '용기와 리더십',
        '卯': '온화함과 세심함',
        '辰': '포용력과 카리스마',
        '巳': '지혜와 직감',
        '午': '열정과 활력',
        '未': '배려심과 협조성',
        '申': '재치와 창의성',
        '酉': '완벽주의와 책임감',
        '戌': '충실함과 정직함',
        '亥': '순수함과 관대함'
    };
    return traits[zhi] || '독특한 개성';
}

// 오행별 성격을 반환하는 함수 추가
function getElementPersonality(element) {
    const personalities = {
        '木': '성장과 발전을 추구하는 진취적 성격',
        '火': '열정과 표현력이 뛰어난 외향적 성격',
        '土': '안정과 신뢰를 중시하는 든든한 성격',
        '金': '원칙과 완벽을 추구하는 체계적 성격',
        '水': '유연함과 적응력을 가진 지적인 성격'
    };
    return personalities[element] || '독특한 개성';
}
        
        // 단계별 조언 및 갈등 해결 방안 생성
        const stageAdvice = generateStageAdvice(elementA, elementB, clampedScore);
        const conflictSolutions = generateConflictSolutions(elementA, elementB);
        
        return {
            score: clampedScore, 
            text: text,
            details: {
                elementA: elemA, elementB: elemB,
                zodiacA: zodiacA_name, zodiacB: zodiacB_name,
                elementScore: elementScore,
                zodiacScore: zodiacScore,
                ageScore: ageScore,
                balanceScore: balanceScore,
                ageDiff: ageDiff
            },
            advice: {
                stages: stageAdvice,
                conflicts: conflictSolutions,
                characteristics: {
                    A: elementCharacteristics[elementA],
                    B: elementCharacteristics[elementB]
                }
            }
        };
        
    } catch (error) {
        console.error('궁합 계산 오류:', error);
        // 오류 시 기존 방식으로 폴백
        const seed = (a + b).replaceAll('-','');
        let h = 0;
        for(let i = 0; i < seed.length; i++) {
            h = (h * 33 + seed.charCodeAt(i)) % 100000;
        }
        const s = h % 101;
        const text = '기본 궁합 분석입니다. 서로 이해하려 노력하면 좋은 관계를 만들 수 있습니다.';
        return {score: s, text: text};
    }
}

// 궁합 버튼 이벤트 (하나로 통합)
setTimeout(() => {
    const btn = document.getElementById('btnMatch');
    if (btn) {
        btn.addEventListener('click', () => {
            const a = document.getElementById('match-a').value;
            const b = document.getElementById('match-b').value;
            const nameA = document.getElementById('match-name-a')?.value || '첫 번째 분';
            const nameB = document.getElementById('match-name-b')?.value || '두 번째 분';
            
            const result = calcMatch(a, b);
            
            if(result.score === null) {
                alert(result.text);
                return;
            }
            
            // 기존 setTimeout 내부의 HTML 생성 부분을 이렇게 교체
const html = `
    <div class="result-section">
        <div class="section-title-result">💕 ${nameA} & ${nameB} 상세 궁합 분석</div>
        <div class="result-card main-result">
            <div class="card-header">
                <div class="card-icon">💘</div>
                <div class="card-title">종합 궁합 점수</div>
            </div>
            <div class="card-value">${result.score}점</div>
            <div class="card-description">${result.text}</div>
        </div>
    </div>
    
    ${result.details ? `
    <div class="result-section">
        <div class="section-title-result">🔍 분야별 상세 분석</div>
        <div class="result-card">
            <div class="card-header">
                <div class="card-icon">🌿</div>
                <div class="card-title">오행 궁합</div>
            </div>
            <div class="card-value">${result.details.elementScore}점</div>
            <div class="card-description">${result.details.elementA} × ${result.details.elementB} 조합</div>
        </div>
        <div class="result-card">
            <div class="card-header">
                <div class="card-icon">🐉</div>
                <div class="card-title">띠 궁합</div>
            </div>
            <div class="card-value">${result.details.zodiacScore}점</div>
            <div class="card-description">${result.details.zodiacA} × ${result.details.zodiacB} 조합</div>
        </div>
        <div class="result-card">
            <div class="card-header">
                <div class="card-icon">👫</div>
                <div class="card-title">나이차 조화</div>
            </div>
            <div class="card-value">${result.details.ageScore}점</div>
            <div class="card-description">${result.details.ageDiff}세 차이</div>
        </div>
        <div class="result-card">
            <div class="card-header">
                <div class="card-icon">⚖️</div>
                <div class="card-title">오행 균형</div>
            </div>
            <div class="card-value">${result.details.balanceScore}점</div>
            <div class="card-description">성향 균형도</div>
        </div>
    </div>
    ` : ''}
    
    ${result.advice ? `
    <div class="result-section">
        <div class="section-title-result">💡 관계 발전 단계별 조언</div>
        <div class="result-card">
            <div class="card-header">
                <div class="card-icon">🌱</div>
                <div class="card-title">연애 초기</div>
            </div>
            <div class="card-description">${result.advice.stages.initial}</div>
        </div>
        <div class="result-card">
            <div class="card-header">
                <div class="card-icon">💞</div>
                <div class="card-title">관계 발전기</div>
            </div>
            <div class="card-description">${result.advice.stages.development}</div>
        </div>
        <div class="result-card">
            <div class="card-header">
                <div class="card-icon">💒</div>
                <div class="card-title">결혼/동거 준비</div>
            </div>
            <div class="card-description">${result.advice.stages.commitment}</div>
        </div>
    </div>
    
    <div class="result-section">
        <div class="section-title-result">🤝 갈등 해결 가이드</div>
        ${result.advice.conflicts.map((solution, index) => `
            <div class="result-card">
                <div class="card-header">
                    <div class="card-icon">${index === 0 ? '🎯' : index === 1 ? '💬' : index === 2 ? '⏰' : '🎪'}</div>
                    <div class="card-title">해결 방안 ${index + 1}</div>
                </div>
                <div class="card-description">${solution}</div>
            </div>
        `).join('')}
    </div>
    ` : ''}
`;
 openSheet('궁합 결과', html);
        });
    }
}, 3000);

// 신년운세 버튼 이벤트
setTimeout(() => {
    const btn = document.getElementById('btnYear');
    if (btn) {
        btn.addEventListener('click', () => {
            const birthDate = document.getElementById('year-birth').value;
            const name = document.getElementById('year-name')?.value?.trim() || '';
            
            if (!birthDate) {
                alert('생년월일을 입력하세요.');
                return;
            }
            
            const result = calc2025Fortune(birthDate, name);
            const html = create2025FortuneHTML(result, name);
            
            openSheet('2025년 상세 신년운세', html, {
                type: 'enhanced-year',
                birthDate, name, result
            });
        });
    }
}, 3000);

// 2025년 을사년 데이터 정의
const YEAR_2025_DATA = {
    yearInfo: {
        element: "을사(乙巳)",
        description: "지혜와 변화의 해",
        keywords: ["지혜", "변화", "성장", "통찰", "재생"]
    },
    personalTypes: [
        {
            name: "도약의 해",
            icon: "🚀",
            description: "새로운 기회와 성장이 기다리는 한 해입니다. 적극적인 도전 정신으로 목표를 향해 나아가세요.",
            keywords: ["도전", "성장", "기회"],
            sectors: {
                career: "새로운 프로젝트나 직책에 도전할 기회가 찾아옵니다. 적극적인 자세로 임하면 큰 성과를 거둘 수 있습니다.",
                love: "새로운 만남이나 관계 발전의 기회가 많습니다. 진심을 다해 소통하면 좋은 결과가 있을 것입니다.",
                health: "활동적인 생활과 규칙적인 운동이 건강운을 높여줍니다. 스트레스 관리에 신경 쓰세요.",
                money: "투자나 사업에서 좋은 기회가 보입니다. 신중한 판단과 철저한 준비가 필요합니다."
            },
            luckyPeriods: "3월, 6월, 9월",
            cautions: "성급한 결정은 금물. 충분한 검토 후 행동하세요.",
            advice: "변화를 두려워하지 말고 새로운 도전에 적극적으로 나서세요. 꾸준한 노력이 큰 결실을 맺을 것입니다."
        },
        {
            name: "성장의 해",
            icon: "🌱",
            description: "배움과 발전에 집중하는 한 해입니다. 자기계발에 투자하면 큰 보상을 받게 됩니다.",
            keywords: ["학습", "발전", "자기계발"],
            sectors: {
                career: "기술 향상과 전문성 개발에 집중하면 좋은 평가를 받을 것입니다. 교육이나 연수 기회를 놓치지 마세요.",
                love: "서로를 이해하고 성장시키는 관계가 중요합니다. 깊이 있는 대화를 통해 관계가 발전할 것입니다.",
                health: "몸과 마음의 균형을 맞추는 것이 중요합니다. 명상이나 요가 같은 활동이 도움됩니다.",
                money: "단기 이익보다 장기적 관점의 투자가 좋습니다. 교육비 지출은 미래의 자산이 될 것입니다."
            },
            luckyPeriods: "4월, 7월, 10월",
            cautions: "조급함보다는 꾸준함이 중요합니다.",
            advice: "지식과 기술 습득에 적극 투자하세요. 지금의 노력이 미래의 큰 자산이 될 것입니다."
        },
        {
            name: "관계의 해",
            icon: "🤝",
            description: "인간관계에서 새로운 기회를 발견하는 한 해입니다. 네트워킹과 소통이 중요합니다.",
            keywords: ["인맥", "협력", "소통"],
            sectors: {
                career: "동료들과의 협력이 성공의 열쇠입니다. 팀워크를 중시하고 리더십을 발휘하세요.",
                love: "진솔한 마음으로 다가가면 좋은 인연을 만날 수 있습니다. 기존 관계도 더욱 깊어질 것입니다.",
                health: "스트레스 해소를 위해 가족이나 친구들과 시간을 보내세요. 사회적 활동이 건강에 도움됩니다.",
                money: "인맥을 통한 새로운 수익 기회가 생깁니다. 신뢰할 수 있는 파트너와 함께하세요."
            },
            luckyPeriods: "2월, 5월, 8월",
            cautions: "너무 많은 사람을 신뢰하지 마세요. 진짜 친구를 구별하는 것이 중요합니다.",
            advice: "진심어린 관심과 배려로 인간관계를 넓혀가세요. 좋은 인연이 인생을 바꿀 수 있습니다."
        },
        {
            name: "안정의 해",
            icon: "🏠",
            description: "기반을 다지고 안정을 추구하는 한 해입니다. 차근차근 계획을 실행해나가세요.",
            keywords: ["안정", "기반", "계획"],
            sectors: {
                career: "기존 업무에 충실하며 실력을 쌓는 것이 중요합니다. 성실함이 인정받을 때입니다.",
                love: "안정적인 관계 발전에 집중하세요. 결혼이나 동거 등 구체적인 미래 계획을 세워보세요.",
                health: "규칙적인 생활습관과 꾸준한 건강관리가 필요합니다. 정기검진도 잊지 마세요.",
                money: "저축과 안전한 투자에 집중하세요. 무리한 투자보다는 안정성을 중시하는 것이 좋습니다."
            },
            luckyPeriods: "1월, 6월, 11월",
            cautions: "변화에 대한 두려움이 기회를 놓치게 할 수 있습니다.",
            advice: "안정을 추구하되 성장을 포기하지 마세요. 단계적으로 목표를 달성해나가는 것이 중요합니다."
        },
        {
            name: "전환의 해",
            icon: "🔄",
            description: "변화를 받아들이고 새로운 시작을 준비하는 한 해입니다. 유연성이 핵심입니다.",
            keywords: ["변화", "전환", "새출발"],
            sectors: {
                career: "직장 이직이나 업무 변화가 있을 수 있습니다. 열린 마음으로 새로운 환경에 적응하세요.",
                love: "관계의 변화나 새로운 만남이 예상됩니다. 과거에 얽매이지 말고 앞을 보세요.",
                health: "생활패턴의 변화가 건강에 영향을 줄 수 있습니다. 적응 기간 동안 더욱 세심한 관리가 필요합니다.",
                money: "수입원의 변화나 새로운 투자 기회가 생깁니다. 리스크 관리에 신경 쓰세요."
            },
            luckyPeriods: "3월, 7월, 12월",
            cautions: "너무 많은 변화를 한번에 시도하지 마세요.",
            advice: "변화는 기회입니다. 두려움보다는 설렘으로 새로운 시작을 맞이하세요."
        },
        {
            name: "휴식의 해",
            icon: "🧘",
            description: "충전과 회복에 집중하는 한 해입니다. 내면을 돌아보고 에너지를 축적하세요.",
            keywords: ["휴식", "충전", "회복"],
            sectors: {
                career: "무리하지 말고 현재 상황을 유지하며 실력을 기르는 시기입니다. 번아웃 주의하세요.",
                love: "서두르지 말고 자연스러운 흐름을 기다리세요. 혼자만의 시간도 소중히 여기세요.",
                health: "충분한 휴식과 수면이 가장 중요합니다. 스트레스 해소와 힐링에 집중하세요.",
                money: "지출을 줄이고 저축에 집중하는 것이 좋습니다. 큰 투자는 피하고 안정성을 우선하세요."
            },
            luckyPeriods: "4월, 8월, 10월",
            cautions: "너무 소극적이 되지 않도록 주의하세요.",
            advice: "지금은 충전의 시기입니다. 몸과 마음을 돌보며 다음 도약을 준비하세요."
        }
    ]
};

// 간단한 오행 매핑
const GAN_WUXING = {
    '甲': '木', '乙': '木',
    '丙': '火', '丁': '火', 
    '戊': '土', '己': '土',
    '庚': '金', '辛': '金',
    '壬': '水', '癸': '水'
};

// 2025년 신년운세 계산 함수 (수정된 버전)
function calc2025Fortune(birthDate, name = '') {
    if (!birthDate) {
        return { idx: null, text: '생년월일을 입력하세요.' };
    }
    
    try {
        // 생년월일 파싱
        const [year, month, day] = birthDate.split('-').map(Number);
        if (!year || !month || !day) {
            throw new Error('잘못된 날짜 형식입니다.');
        }
        
        const currentAge = 2025 - year;
        
        // 생년월일 숫자 합계로 기본 인덱스 계산
        let baseIndex = (year + month + day + 2025) % YEAR_2025_DATA.personalTypes.length;
        
        // 출생년도 끝자리로 추가 보정
        const yearLastDigit = year % 10;
        const finalIndex = (baseIndex + yearLastDigit) % YEAR_2025_DATA.personalTypes.length;
        
        const personalFortune = YEAR_2025_DATA.personalTypes[finalIndex];
        
        // 나이대별 특별 조언 생성
        function getAgeSpecificAdvice(age) {
            if (age < 25) {
                return '젊은 에너지를 활용하여 다양한 경험을 쌓으세요. 실패를 두려워하지 말고 적극적으로 도전하는 것이 중요합니다. 2025년은 인생의 기반을 다지는 소중한 시기입니다.';
            } else if (age < 35) {
                return '경력 발전과 인생 설계가 중요한 시기입니다. 을사년의 지혜로운 에너지를 활용해 장기적인 계획을 세우고 실행해보세요. 이 시기의 선택이 향후 10년을 좌우합니다.';
            } else if (age < 50) {
                return '경험과 체력이 조화를 이루는 황금기입니다. 리더십을 발휘하고 후배들을 이끌어가며 자신만의 전문 영역을 구축하세요. 안정과 도전의 균형이 중요합니다.';
            } else if (age < 65) {
                return '풍부한 경험을 바탕으로 지혜로운 판단을 하는 시기입니다. 축적된 지식과 인맥을 활용해 새로운 가치를 창출하고, 사회에 기여할 수 있는 방법을 찾아보세요.';
            } else {
                return '인생의 여유와 깊이를 만끽할 시기입니다. 그동안의 경험을 후세에 전하고, 진정한 행복과 만족을 추구하는데 집중하세요. 건강관리가 가장 중요합니다.';
            }
        }
        
        return {
            idx: finalIndex,
            yearInfo: YEAR_2025_DATA.yearInfo,
            personalFortune: personalFortune,
            ageAdvice: getAgeSpecificAdvice(currentAge),
            birthYear: year,
            currentAge: currentAge,
            name: name
        };
        
    } catch (error) {
        console.error('신년운세 계산 오류:', error);
        // 오류 시 기본 결과 반환
        const [y, m, d] = birthDate.split('-').map(Number);
        const k = (y + m + d + 2025) % 6;
        const basicTypes = [
            '도약의 해: 새로운 기회와 성장이 기다립니다.',
            '성장의 해: 배움에 투자할수록 큰 보상이 따릅니다.',
            '관계의 해: 인간관계에서 새로운 기회를 발견하세요.',
            '안정의 해: 기반을 다지고 재정관리에 집중하세요.',
            '전환의 해: 변화를 받아들이고 새로운 시작을 준비하세요.',
            '휴식의 해: 건강관리와 에너지 충전에 집중하세요.'
        ];
        return {
            idx: k,
            text: basicTypes[k]
        };
    }
}

// 신년운세 HTML 생성 함수
function create2025FortuneHTML(result, name) {
    const nameTitle = name ? `${name}님의 ` : '';
    
    if (!result.personalFortune) {
        // 폴백 모드
        return `<div class="result-section">
            <div class="section-title-result">🐍 ${nameTitle}2025년 을사년 운세</div>
            <div class="result-card main-result">
                <div class="card-value">${result.text}</div>
            </div>
        </div>`;
    }
    
    const { yearInfo, personalFortune, ageAdvice } = result;
    
    return `
        <div class="result-section">
            <div class="section-title-result">🐍 ${nameTitle}2025년 을사년 운세</div>
            
            <div class="year-overview-card">
                <div class="year-character">
                    <div class="year-element">${yearInfo.element}</div>
                    <div class="year-desc">${yearInfo.description}</div>
                    <div class="year-keywords">
                        ${yearInfo.keywords.map(keyword => `<span class="keyword-tag">${keyword}</span>`).join('')}
                    </div>
                </div>
            </div>
        </div>
        
        <div class="result-section">
            <div class="section-title-result">${personalFortune.icon} ${nameTitle}개인 운세</div>
            
            <div class="result-card main-result">
                <div class="card-header">
                    <div class="card-icon">${personalFortune.icon}</div>
                    <div class="card-title">${personalFortune.name}</div>
                </div>
                <div class="card-description">${personalFortune.description}</div>
            </div>
        </div>
        
        <div class="result-section">
            <div class="section-title-result">📊 분야별 2025년 운세</div>
            
            <div class="result-card">
                <div class="card-header">
                    <div class="card-icon">💼</div>
                    <div class="card-title">직장운</div>
                </div>
                <div class="card-description">${personalFortune.sectors.career}</div>
            </div>
            
            <div class="result-card">
                <div class="card-header">
                    <div class="card-icon">💕</div>
                    <div class="card-title">연애운</div>
                </div>
                <div class="card-description">${personalFortune.sectors.love}</div>
            </div>
            
            <div class="result-card">
                <div class="card-header">
                    <div class="card-icon">💪</div>
                    <div class="card-title">건강운</div>
                </div>
                <div class="card-description">${personalFortune.sectors.health}</div>
            </div>
            
            <div class="result-card">
                <div class="card-header">
                    <div class="card-icon">💰</div>
                    <div class="card-title">재물운</div>
                </div>
                <div class="card-description">${personalFortune.sectors.money}</div>
            </div>
        </div>
        
        <div class="result-section">
            <div class="section-title-result">📅 2025년 주요 시기</div>
            
            <div class="timeline-card">
                <div class="timeline-item">
                    <div class="timeline-icon">🍀</div>
                    <div class="timeline-content">
                        <div class="timeline-title">특히 좋은 달</div>
                        <div class="timeline-desc">${personalFortune.luckyPeriods}</div>
                    </div>
                </div>
                <div class="timeline-item caution">
                    <div class="timeline-icon">⚠️</div>
                    <div class="timeline-content">
                        <div class="timeline-title">주의할 점</div>
                        <div class="timeline-desc">${personalFortune.cautions}</div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="result-section">
            <div class="section-title-result">🎯 ${result.currentAge}세 맞춤 조언</div>
            <div class="result-card">
                <div class="card-header">
                    <div class="card-icon">🧭</div>
                    <div class="card-title">인생 단계별 가이드</div>
                </div>
                <div class="card-description">${ageAdvice}</div>
            </div>
        </div>
        
        <div class="result-section">
            <div class="section-title-result">💡 2025년 핵심 실천 조언</div>
            <div class="result-card">
                <div class="card-header">
                    <div class="card-icon">⭐</div>
                    <div class="card-title">성공의 열쇠</div>
                </div>
                <div class="card-description">${personalFortune.advice}</div>
            </div>
        </div>
        
        <div class="info-box">
            <div class="info-title">📝 2025년 실천 체크리스트</div>
            <div class="info-content">
                <strong>핵심 테마:</strong> ${personalFortune.name}<br/>
                <strong>주요 키워드:</strong> ${personalFortune.keywords.join(', ')}<br/>
                <strong>실천 포인트:</strong> ${personalFortune.advice}
            </div>
        </div>
    `;
}

// 신년운세 버튼 이벤트
setTimeout(() => {
    const btn = document.getElementById('btnYear');
    if (btn) {
        btn.addEventListener('click', () => {
            const birthDate = document.getElementById('year-birth').value;
            const name = document.getElementById('year-name')?.value?.trim() || '';
            
            if (!birthDate) {
                alert('생년월일을 입력하세요.');
                return;
            }
            
            const result = calc2025Fortune(birthDate, name);
            const html = create2025FortuneHTML(result, name);
            
            // openSheet 함수가 있다고 가정
            if (typeof openSheet === 'function') {
                openSheet('2025년 상세 신년운세', html, {
                    type: 'enhanced-year',
                    birthDate, name, result
                });
            } else {
                console.log('결과 HTML:', html);
                // 결과를 표시할 다른 방법이 필요함
            }
        });
    } else {
        console.error('btnYear 버튼을 찾을 수 없습니다.');
    }
}, 1000); // 3초에서 1초로 줄임
