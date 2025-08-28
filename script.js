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

// ===== 향상된 궁합 분석 데이터 =====
const COMPATIBILITY_ANALYSIS = {
    elements: {
        '木': { name: '목', trait: '성장지향', compatible: ['火', '水'], conflicted: ['金'] },
        '火': { name: '화', trait: '열정적', compatible: ['木', '土'], conflicted: ['水'] },
        '土': { name: '토', trait: '안정적', compatible: ['火', '金'], conflicted: ['木'] },
        '金': { name: '금', trait: '원칙적', compatible: ['土', '水'], conflicted: ['火'] },
        '水': { name: '수', trait: '유연한', compatible: ['金', '木'], conflicted: ['土'] }
    },
    zodiacMatch: {
        // 띠별 궁합 점수 (12지지 기준)
        '子': { best: ['申', '辰'], good: ['丑', '亥'], bad: ['午'], worst: ['午'] }, // 쥐
        '丑': { best: ['巳', '酉'], good: ['子', '卯'], bad: ['未'], worst: ['羊'] }, // 소
        '寅': { best: ['午', '戌'], good: ['亥', '卯'], bad: ['申'], worst: ['申'] }, // 호랑이
        '卯': { best: ['未', '亥'], good: ['寅', '戌'], bad: ['酉'], worst: ['酉'] }, // 토끼
        '辰': { best: ['申', '子'], good: ['酉', '丑'], bad: ['戌'], worst: ['戌'] }, // 용
        '巳': { best: ['酉', '丑'], good: ['申', '辰'], bad: ['亥'], worst: ['亥'] }, // 뱀
        '午': { best: ['戌', '寅'], good: ['未', '卯'], bad: ['子'], worst: ['子'] }, // 말
        '未': { best: ['亥', '卯'], good: ['午', '寅'], bad: ['丑'], worst: ['丑'] }, // 양
        '申': { best: ['子', '辰'], good: ['巳', '酉'], bad: ['寅'], worst: ['寅'] }, // 원숭이
        '酉': { best: ['丑', '巳'], good: ['辰', '申'], bad: ['卯'], worst: ['卯'] }, // 닭
        '戌': { best: ['寅', '午'], good: ['卯', '未'], bad: ['辰'], worst: ['辰'] }, // 개
        '亥': { best: ['卯', '未'], good: ['寅', '戌'], bad: ['巳'], worst: ['巳'] }  // 돼지
    }
};

// ===== 향상된 궁합 계산 함수 =====
function calcEnhancedMatch(birthA, birthB, nameA = '첫 번째 분', nameB = '두 번째 분') {
    if (!birthA || !birthB) {
        return { score: null, text: '두 생년월일을 모두 입력하세요.' };
    }
    
    try {
        // 기본 사주 정보 계산
        const baziA = computeBaZi(birthA, '', 'solar', false);
        const baziB = computeBaZi(birthB, '', 'solar', false);
        
        // 일간 오행 추출
        const dayGanA = (baziA.pillars.day || '')[0] || '';
        const dayGanB = (baziB.pillars.day || '')[0] || '';
        const elementA = GAN_WUXING[dayGanA] || '';
        const elementB = GAN_WUXING[dayGanB] || '';
        
        // 연지 띠 추출 (띠 궁합용)
        const yearZhiA = (baziA.pillars.year || '')[1] || '';
        const yearZhiB = (baziB.pillars.year || '')[1] || '';
        
        // 오행 궁합 점수 계산
        let elementScore = 50; // 기본 점수
        const elemA = COMPATIBILITY_ANALYSIS.elements[elementA];
        const elemB = COMPATIBILITY_ANALYSIS.elements[elementB];
        
        if (elemA && elemB) {
            if (elemA.compatible.includes(elementB)) {
                elementScore += 25;
            } else if (elemA.conflicted.includes(elementB)) {
                elementScore -= 20;
            } else if (elementA === elementB) {
                elementScore += 10; // 같은 오행은 보통
            }
        }
        
        // 띠 궁합 점수 계산
        let zodiacScore = 50;
        const zodiacA = COMPATIBILITY_ANALYSIS.zodiacMatch[yearZhiA];
        if (zodiacA) {
            if (zodiacA.best.includes(yearZhiB)) {
                zodiacScore += 30;
            } else if (zodiacA.good.includes(yearZhiB)) {
                zodiacScore += 15;
            } else if (zodiacA.bad.includes(yearZhiB)) {
                zodiacScore -= 15;
            } else if (zodiacA.worst.includes(yearZhiB)) {
                zodiacScore -= 25;
            }
        }
        
        // 오행 균형도 계산
        const countKeysA = Object.keys(baziA.countsAll).map(k => baziA.countsAll[k] || 0);
        const countKeysB = Object.keys(baziB.countsAll).map(k => baziB.countsAll[k] || 0);
        const balanceA = Math.max(...countKeysA) - Math.min(...countKeysA);
        const balanceB = Math.max(...countKeysB) - Math.min(...countKeysB);
        const balanceScore = 70 - Math.abs(balanceA - balanceB) * 5;
        
        // 최종 점수 (가중평균)
        const finalScore = Math.round(
            (elementScore * 0.4 + zodiacScore * 0.35 + balanceScore * 0.25)
        );
        const clampedScore = Math.max(10, Math.min(95, finalScore));
        
        // 상세 분석 텍스트 생성
        let analysis = generateCompatibilityAnalysis(clampedScore, elemA, elemB, nameA, nameB);
        
        return {
            score: clampedScore,
            text: analysis,
            details: {
                elementA: elemA?.name || '?',
                elementB: elemB?.name || '?',
                elementScore,
                zodiacScore,
                balanceScore
            }
        };
        
    } catch (error) {
        console.error('궁합 계산 오류:', error);
        // 오류 시 기존 간단한 계산으로 폴백
        return calcMatch(birthA, birthB);
    }
}

function generateCompatibilityAnalysis(score, elemA, elemB, nameA, nameB) {
    let analysis = '';
    
    if (score >= 85) {
        analysis = `${nameA}님과 ${nameB}님은 천생연분의 궁합입니다! 서로의 장점을 극대화하고 단점을 보완하는 완벽한 조화를 이룹니다. `;
    } else if (score >= 70) {
        analysis = `${nameA}님과 ${nameB}님은 매우 좋은 궁합입니다. 서로를 이해하고 성장시키는 관계로 발전할 수 있습니다. `;
    } else if (score >= 55) {
        analysis = `${nameA}님과 ${nameB}님은 무난한 궁합입니다. 노력과 이해를 통해 좋은 관계를 만들어갈 수 있습니다. `;
    } else if (score >= 40) {
        analysis = `${nameA}님과 ${nameB}님은 차이점이 많은 편입니다. 서로의 다름을 인정하고 소통을 늘리면 관계가 개선됩니다. `;
    } else {
        analysis = `${nameA}님과 ${nameB}님은 성향이 많이 다릅니다. 공통 관심사를 찾고 천천히 관계를 발전시켜 나가세요. `;
    }
    
    if (elemA && elemB) {
        analysis += `${elemA.name}(${elemA.trait})과 ${elemB.name}(${elemB.trait}) 기질의 조합으로, `;
        if (elemA.compatible.includes(elemB.name)) {
            analysis += '서로 시너지를 내는 관계입니다.';
        } else if (elemA.conflicted.includes(elemB.name)) {
            analysis += '긴장감이 있지만 서로 자극하며 성장할 수 있습니다.';
        } else {
            analysis += '각자의 개성을 살리면서 조화를 이룰 수 있습니다.';
        }
    }
    
    return analysis;
}

// ===== 향상된 2025년 신년운세 데이터 =====
const YEAR_2025_FORTUNE = {
    // 뱀띠해 기본 특성
    yearCharacter: {
        element: '乙巳', // 을사년 (목뱀)
        description: '2025년은 을사년(乙巳年)으로 "푸른 뱀의 해"입니다. 지혜롭고 신중한 변화, 내면의 성찰과 전환의 시기입니다.',
        keywords: ['지혜', '변화', '직감', '성찰', '전환', '성장']
    },
    
    // 개인별 운세 유형 (생년월일 기반 12가지)
    personalTypes: [
        {
            name: '큰 도약의 해',
            description: '오랫동안 준비해온 일들이 결실을 맺는 해입니다. 새로운 직책이나 환경으로의 도약이 기대됩니다.',
            advice: '기회가 왔을 때 주저하지 말고 도전하세요. 준비된 자에게 행운이 따릅니다.',
            lucky: '3월, 7월, 11월',
            caution: '성급한 결정보다는 신중한 계획을 세우세요.',
            career: '승진, 이직, 창업의 기회가 많습니다.',
            love: '새로운 만남이나 관계 발전의 가능성이 높습니다.',
            health: '활력이 넘치는 한 해이지만 과로는 금물입니다.',
            money: '투자나 부동산에서 좋은 결과를 얻을 수 있습니다.'
        },
        {
            name: '성장과 학습의 해',
            description: '새로운 지식과 기술을 습득하며 자신을 발전시키는 해입니다. 교육과 자기계발에 투자할 때입니다.',
            advice: '배움에 인색하지 마세요. 지금 배운 것이 미래의 자산이 됩니다.',
            lucky: '2월, 6월, 9월',
            caution: '너무 많은 것을 한꺼번에 배우려 하지 마세요.',
            career: '전문성 향상과 자격증 취득이 도움됩니다.',
            love: '지적인 대화를 나눌 수 있는 상대와 좋은 인연이 됩니다.',
            health: '정신적 스트레스 관리가 중요합니다.',
            money: '교육비 투자는 아끼지 마세요. 장기적 수익으로 돌아올 것입니다.'
        },
        {
            name: '인간관계 확장의 해',
            description: '새로운 사람들과의 만남이 많아지고, 기존 관계가 더욱 돈독해지는 해입니다.',
            advice: '사람을 소중히 여기고 진정성 있게 대하세요. 인맥이 큰 자산이 됩니다.',
            lucky: '1월, 5월, 10월',
            caution: '모든 사람을 다 만족시키려 하지 마세요.',
            career: '팀워크와 협업에서 큰 성과를 얻을 수 있습니다.',
            love: '친구의 소개로 좋은 인연을 만날 가능성이 높습니다.',
            health: '사교 활동이 많아 피로 누적을 주의하세요.',
            money: '공동 투자나 파트너십에서 수익이 기대됩니다.'
        },
        {
            name: '안정과 정착의 해',
            description: '그동안의 노력이 안정적인 기반으로 자리잡는 해입니다. 재정과 건강 관리에 집중하세요.',
            advice: '급하게 변화를 추구하기보다는 현재를 견고히 하는데 집중하세요.',
            lucky: '4월, 8월, 12월',
            caution: '안주하지 말고 꾸준한 발전을 추구하세요.',
            career: '현재 일에 충실하며 전문성을 깊게 파는 것이 유리합니다.',
            love: '진지한 관계로 발전하거나 결혼을 생각해볼 시기입니다.',
            health: '규칙적인 생활 패턴을 유지하면 건강이 좋아집니다.',
            money: '저축과 안정적인 투자로 자산을 늘려가세요.'
        },
        {
            name: '전환과 변화의 해',
            description: '인생의 중요한 전환점이 되는 해입니다. 새로운 방향으로의 변화를 두려워하지 마세요.',
            advice: '변화를 받아들이고 적응하는 유연성이 필요합니다. 끝은 새로운 시작입니다.',
            lucky: '3월, 7월, 10월',
            caution: '급격한 변화보다는 단계적인 전환을 추구하세요.',
            career: '업종 변경이나 새로운 분야 진출을 고려해볼 시기입니다.',
            love: '기존 관계의 변화나 새로운 시작이 예상됩니다.',
            health: '스트레스 관리와 충분한 휴식이 필요합니다.',
            money: '투자 포트폴리오를 재검토하고 분산투자하세요.'
        },
        {
            name: '휴식과 충전의 해',
            description: '그동안 쌓인 피로를 풀고 에너지를 충전하는 해입니다. 무리하지 말고 여유를 가지세요.',
            advice: '몸과 마음의 건강을 최우선으로 하세요. 휴식도 생산적인 활동입니다.',
            lucky: '2월, 6월, 11월',
            caution: '너무 게으르지 말고 적당한 활동량을 유지하세요.',
            career: '현상 유지하며 체력과 에너지를 비축하는 시기입니다.',
            love: '여유로운 마음으로 상대방을 배려하며 관계를 유지하세요.',
            health: '정기 건강검진과 생활 습관 개선에 신경쓰세요.',
            money: '큰 지출은 피하고 안정적인 관리에 집중하세요.'
        },
        {
            name: '창조와 혁신의 해',
            description: '창의적 아이디어가 샘솟고 혁신적인 시도에서 성공하는 해입니다.',
            advice: '새로운 시각으로 문제를 바라보고 창의적 해결방안을 모색하세요.',
            lucky: '1월, 5월, 9월',
            caution: '너무 급진적이지 말고 점진적인 혁신을 추구하세요.',
            career: 'R&D, 기획, 창작 분야에서 두각을 나타낼 수 있습니다.',
            love: '독특하고 매력적인 상대방과의 인연이 기대됩니다.',
            health: '창조적 활동을 통해 스트레스를 해소하세요.',
            money: '새로운 수익원 개발이나 창업을 고려해볼 시기입니다.'
        },
        {
            name: '리더십 발휘의 해',
            description: '타고난 리더십을 발휘하여 주변을 이끌어가는 해입니다. 책임감 있게 행동하세요.',
            advice: '솔선수범하며 다른 사람들에게 모범이 되어주세요. 진정한 리더는 섬기는 자입니다.',
            lucky: '3월, 8월, 12월',
            caution: '독단적이지 말고 팀원들의 의견도 경청하세요.',
            career: '관리직으로의 승진이나 프로젝트 리더 역할이 기대됩니다.',
            love: '상대방을 리드하되 배려하는 마음을 잊지 마세요.',
            health: '스트레스가 많을 수 있으니 적절한 운동으로 해소하세요.',
            money: '투자 결정에서 신중함과 과감함의 균형이 필요합니다.'
        },
        {
            name: '조화와 협력의 해',
            description: '혼자보다는 함께할 때 더 큰 힘을 발휘하는 해입니다. 협력과 조화를 추구하세요.',
            advice: '다른 사람과의 협력을 통해 시너지를 창출하세요. 겸손함이 성공의 열쇠입니다.',
            lucky: '4월, 7월, 11월',
            caution: '자신의 의견도 적절히 표현하며 균형을 유지하세요.',
            career: '팀 프로젝트나 파트너십에서 큰 성과를 얻을 수 있습니다.',
            love: '상호 존중과 이해를 바탕으로 한 관계가 발전합니다.',
            health: '규칙적인 생활과 적당한 사회 활동이 도움됩니다.',
            money: '공동 투자나 협력 사업에서 수익 기회가 있습니다.'
        },
        {
            name: '도전과 모험의 해',
            description: '새로운 도전에 과감히 나서며 모험정신을 발휘하는 해입니다. 용기가 행운을 부릅니다.',
            advice: '계산된 위험을 감수하며 새로운 영역에 도전해보세요. 시도하지 않으면 성공도 없습니다.',
            lucky: '2월, 6월, 10월',
            caution: '무모한 도전보다는 준비된 모험을 하세요.',
            career: '새로운 프로젝트나 해외 진출의 기회가 있을 수 있습니다.',
            love: '새로운 환경에서 예상치 못한 만남이 있을 수 있습니다.',
            health: '활동량이 많아지니 부상 방지에 주의하세요.',
            money: '하이리스크 하이리턴 투자에서 기회가 있지만 신중하게 접근하세요.'
        },
        {
            name: '완성과 성취의 해',
            description: '오랫동안 추진해온 일들이 마무리되며 성과를 거두는 해입니다.',
            advice: '마지막까지 최선을 다하며 완벽한 마무리를 추구하세요. 끝이 좋아야 모든 것이 좋습니다.',
            lucky: '1월, 8월, 12월',
            caution: '성취에 만족하지 말고 다음 목표를 준비하세요.',
            career: '프로젝트 완료나 목표 달성으로 인정받을 것입니다.',
            love: '관계가 안정되고 깊어지는 시기입니다.',
            health: '성과를 위한 노력 후 충분한 휴식이 필요합니다.',
            money: '투자 수익 실현이나 큰 거래 성사가 기대됩니다.'
        },
        {
            name: '성찰과 준비의 해',
            description: '지난 시간을 돌아보며 미래를 준비하는 성찰의 해입니다. 내면의 성장에 집중하세요.',
            advice: '과거의 경험에서 교훈을 얻고 미래의 비전을 설계하세요. 준비하는 자에게 기회가 옵니다.',
            lucky: '3월, 9월, 11월',
            caution: '지나친 내성에 빠지지 말고 적당한 외부 활동도 유지하세요.',
            career: '장기 계획 수립과 역량 개발에 집중하는 시기입니다.',
            love: '진정한 자아를 아는 것이 좋은 관계의 출발점입니다.',
            health: '정신 건강과 스트레스 관리에 특별히 신경쓰세요.',
            money: '재무 계획을 재검토하고 장기 투자 전략을 세우세요.'
        }
    ]
};

// ===== 향상된 신년운세 계산 함수 =====
function calcEnhanced2025Fortune(birthDate, name = '') {
    if (!birthDate) {
        return { idx: null, text: '생년월일을 입력하세요.' };
    }
    
    try {
        // 사주 기본 정보 계산
        const bazi = computeBaZi(birthDate, '', 'solar', false);
        const birthYear = bazi.solar ? bazi.solar.getYear() : 2000;
        
        // 생년월일 숫자 합계로 기본 인덱스 계산
        const [y, m, d] = birthDate.split('-').map(Number);
        const baseIndex = (y + m + d + 2025) % YEAR_2025_FORTUNE.personalTypes.length;
        
        // 일간 오행으로 보정
        const dayGan = (bazi.pillars.day || '')[0] || '';
        const dayElement = GAN_WUXING[dayGan] || '';
        const elementModifier = {
            '木': 0, '火': 1, '土': 2, '金': 3, '水': 4
        };
        const finalIndex = (baseIndex + (elementModifier[dayElement] || 0)) % YEAR_2025_FORTUNE.personalTypes.length;
        
        const personalFortune = YEAR_2025_FORTUNE.personalTypes[finalIndex];
        const currentAge = 2025 - birthYear;
        
        // 나이대별 특별 조언 추가
        let ageAdvice = '';
        if (currentAge < 30) {
            ageAdvice = '젊은 에너지를 활용하여 다양한 경험을 쌓으세요. 실패를 두려워하지 말고 도전하세요.';
        } else if (currentAge < 50) {
            ageAdvice = '경험과 체력이 조화를 이루는 시기입니다. 장기적 계획을 세우고 실행하세요.';
        } else {
            ageAdvice = '풍부한 경험을 바탕으로 지혜로운 판단을 하세요. 후배들에게 멘토가 되어주세요.';
        }
        
        return {
            idx: finalIndex,
            yearInfo: YEAR_2025_FORTUNE.yearCharacter,
            personalFortune: personalFortune,
            ageAdvice: ageAdvice,
            birthYear: birthYear,
            currentAge: currentAge,
            name: name
        };
        
    } catch (error) {
        console.error('신년운세 계산 오류:', error);
        return calcYear(birthDate); // 오류 시 기존 함수로 폴백
    }
}

// ===== HTML 생성 함수들 =====
function createEnhancedMatchResult(result, nameA, nameB) {
    const { score, text, details } = result;
    
    let html = `<div class="result-section">
        <div class="section-title-result">💕 ${nameA} & ${nameB} 궁합 분석</div>
        
        <div class="result-card main-result">
            <div class="card-header">
                <div class="card-icon">💘</div>
                <div class="card-title">총 궁합 점수</div>
            </div>
            <div class="card-value">${score}점 / 100점</div>
            <div class="card-description">${text}</div>
        </div>
    </div>`;
    
    if (details) {
        html += `<div class="result-section">
        <div class="section-title-result">💡 관계 발전 조언</div>
        ${createResultCard('🤝', '조화의 비결', '실천 가이드', advice)}
    </div>`;
    
    return html;
}

function createEnhanced2025FortuneResult(result, name) {
    const { yearInfo, personalFortune, ageAdvice, currentAge } = result;
    const nameTitle = name ? `${name}님의 ` : '';
    
    let html = `<div class="result-section">
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
    </div>`;
    
    html += `<div class="result-section">
        <div class="section-title-result">⭐ ${nameTitle}개인 운세 유형</div>
        
        <div class="result-card main-result">
            <div class="card-header">
                <div class="card-icon">🌟</div>
                <div class="card-title">${personalFortune.name}</div>
            </div>
            <div class="card-description">${personalFortune.description}</div>
        </div>
    </div>`;
    
    html += `<div class="result-section">
        <div class="section-title-result">📊 분야별 상세 운세</div>
        
        ${createResultCard('💼', '직장운', personalFortune.career, personalFortune.advice)}
        ${createResultCard('💕', '연애운', personalFortune.love, '')}
        ${createResultCard('💪', '건강운', personalFortune.health, '')}
        ${createResultCard('💰', '재물운', personalFortune.money, '')}
    </div>`;
    
    html += `<div class="result-section">
        <div class="section-title-result">📅 2025년 타임라인</div>
        
        <div class="timeline-card">
            <div class="timeline-item">
                <div class="timeline-icon">🍀</div>
                <div class="timeline-content">
                    <div class="timeline-title">행운의 달</div>
                    <div class="timeline-desc">${personalFortune.lucky}</div>
                </div>
            </div>
            <div class="timeline-item caution">
                <div class="timeline-icon">⚠️</div>
                <div class="timeline-content">
                    <div class="timeline-title">주의사항</div>
                    <div class="timeline-desc">${personalFortune.caution}</div>
                </div>
            </div>
        </div>
    </div>`;
    
    html += `<div class="result-section">
        <div class="section-title-result">🎯 ${currentAge}세 맞춤 조언</div>
        ${createResultCard('🧭', '인생 가이드', '나이별 특화 조언', ageAdvice)}
    </div>`;
    
    html += `<div class="info-box">
        <div class="info-title">📝 2025년 실천 계획</div>
        <div class="info-content">
            <strong>핵심 키워드:</strong> ${yearInfo.keywords.join(', ')}<br/>
            <strong>개인 테마:</strong> ${personalFortune.name}<br/>
            <strong>실천 조언:</strong> ${personalFortune.advice}
        </div>
    </div>`;
    
    return html;
}

// ===== 기존 함수들을 새로운 함수로 교체하는 래퍼 함수들 =====

// 궁합 계산 함수를 향상된 버전으로 교체
function calcMatch(birthA, birthB, nameA = '첫 번째 분', nameB = '두 번째 분') {
    return calcEnhancedMatch(birthA, birthB, nameA, nameB);
}

// 신년운세 계산 함수를 향상된 버전으로 교체  
function calcYear(birthDate, name = '') {
    const result = calcEnhanced2025Fortune(birthDate, name);
    
    // 기존 인터페이스 호환성을 위한 텍스트 반환
    if (result.personalFortune) {
        return {
            idx: result.idx,
            text: `${result.personalFortune.name}: ${result.personalFortune.description}`,
            fullResult: result // 전체 결과도 포함
        };
    }
    
    return result;
}

// ===== 타로 데이터 (보강된 버전) =====
const TAROT_DETAILS = [
    {
        name: "THE FOOL (바보)",
        meaning: "새로운 시작과 순수함을 나타내는 카드입니다. 미지의 세계로 뛰어드는 용기와 순진무구한 마음을 상징합니다.",
        upright: "새로운 시작, 순진함, 자발성 - 지금이 새로운 도전을 시작할 최적의 시기입니다. 과거에 얽매이지 말고 자유로운 마음으로 앞으로 나아가세요. 예상치 못한 기회가 찾아올 수 있습니다.",
        reversed: "무모함, 경솔함, 위험한 행동 - 너무 성급하게 결정하지 마세요. 충분한 준비 없이 뛰어들면 실패할 가능성이 높습니다. 현실을 직시하고 신중하게 행동하세요.",
        advice: "💡 조언: 새로운 시작을 두려워하지 마세요. 하지만 최소한의 준비는 필요합니다.",
        keywords: "시작, 모험, 자유, 순수"
    },
    {
        name: "THE MAGICIAN (마법사)",
        meaning: "의지력과 창조력을 나타내는 카드입니다. 하늘과 땅을 연결하는 존재로, 모든 가능성을 현실로 만드는 힘을 상징합니다.",
        upright: "의지력, 창조력, 집중 - 당신에게는 목표를 달성할 모든 능력이 있습니다. 집중력을 발휘하면 원하는 것을 이룰 수 있습니다. 자신감을 가지세요.",
        reversed: "기만, 조작, 능력 부족 - 자신의 능력을 과신하거나 남용하지 마세요. 거짓과 속임수는 결국 드러납니다. 진실된 노력이 필요한 때입니다.",
        advice: "💡 조언: 당신의 재능과 자원을 현명하게 활용하세요. 집중이 성공의 열쇠입니다.",
        keywords: "능력, 집중, 자원, 행동"
    },
    {
        name: "THE HIGH PRIESTESS (여교황)",
        meaning: "직감과 내면의 지혜를 나타내는 카드입니다. 보이지 않는 진실과 숨겨진 지식, 무의식의 세계를 상징합니다.",
        upright: "직감, 무의식, 신비 - 내면의 목소리에 귀를 기울이세요. 논리보다 직감이 더 정확할 수 있습니다. 명상과 성찰이 도움이 됩니다.",
        reversed: "비밀, 숨겨진 동기, 직감 무시 - 중요한 정보가 숨겨져 있을 수 있습니다. 직감을 무시하면 후회할 수 있습니다. 진실을 파악하려 노력하세요.",
        advice: "💡 조언: 조용히 내면의 소리를 들어보세요. 답은 이미 당신 안에 있습니다.",
        keywords: "직관, 지혜, 비밀, 여성성"
    },
    {
        name: "THE EMPRESS (여황제)",
        meaning: "풍요와 모성을 나타내는 카드입니다. 창조적 에너지와 자연의 풍요로움, 양육과 돌봄을 상징합니다.",
        upright: "풍요, 모성, 창조성 - 창조적 프로젝트나 새로운 시작에 좋은 시기입니다. 풍요와 성장이 기대됩니다. 사랑과 보살핌이 넘치는 때입니다.",
        reversed: "불임, 창조성 부족, 과보호 - 창의력이 막혀있거나 성장이 정체된 상태입니다. 지나친 집착이나 의존은 해롭습니다. 균형을 찾으세요.",
        advice: "💡 조언: 창조적 에너지를 발산하세요. 자신과 타인을 사랑으로 돌보세요.",
        keywords: "풍요, 창조, 보살핌, 성장"
    },
    {
        name: "THE EMPEROR (황제)",
        meaning: "권위와 안정을 나타내는 카드입니다. 확고한 기반과 구조, 리더십과 책임감을 상징합니다.",
        upright: "권위, 구조, 질서 - 강력한 리더십을 발휘할 때입니다. 체계적인 계획과 실행이 성공을 가져옵니다. 책임감 있게 행동하세요.",
        reversed: "독재, 권위주의, 경직성 - 지나친 통제욕은 관계를 해칩니다. 융통성 없는 태도를 버리세요. 권위를 남용하지 마세요.",
        advice: "💡 조언: 확고한 기반을 세우되, 유연성을 잃지 마세요. 진정한 힘은 통제가 아닌 이해에서 나옵니다.",
        keywords: "권위, 안정, 구조, 아버지"
    },
    {
        name: "THE HIEROPHANT (교황)",
        meaning: "전통과 교육을 나타내는 카드입니다. 영적 가르침과 관습, 체계적인 지식 전달을 상징합니다.",
        upright: "전통, 교육, 종교 - 전통적 가치와 지혜에서 배울 점이 많습니다. 스승을 찾거나 체계적인 학습이 도움이 됩니다.",
        reversed: "반항, 비정통성, 새로운 접근법 - 기존의 틀을 깨고 새로운 방법을 시도해보세요. 맹목적인 추종보다 자신만의 길을 찾으세요.",
        advice: "💡 조언: 전통의 지혜를 존중하되, 자신만의 진실을 찾아가세요.",
        keywords: "전통, 가르침, 신념, 체계"
    },
    {
        name: "THE LOVERS (연인)",
        meaning: "사랑과 선택을 나타내는 카드입니다. 조화로운 관계와 중요한 결정, 가치관의 일치를 상징합니다.",
        upright: "사랑, 관계, 선택 - 진정한 사랑이나 중요한 파트너십이 형성됩니다. 가치관이 맞는 사람을 만날 수 있습니다. 중요한 선택을 현명하게 하세요.",
        reversed: "불균형, 갈등, 잘못된 선택 - 관계의 불균형이나 가치관 충돌이 있습니다. 선택을 미루거나 잘못된 결정을 할 수 있습니다.",
        advice: "💡 조언: 마음의 소리를 따르되, 현실적인 면도 고려하세요. 진정성 있는 관계를 추구하세요.",
        keywords: "사랑, 결합, 선택, 조화"
    },
    {
        name: "THE CHARIOT (전차)",
        meaning: "승리와 의지를 나타내는 카드입니다. 상반된 힘을 통제하여 목표를 향해 전진하는 모습을 상징합니다.",
        upright: "승리, 의지력, 자제력 - 강한 의지로 장애물을 극복할 수 있습니다. 목표를 향해 돌진하세요. 승리가 눈앞에 있습니다.",
        reversed: "통제력 상실, 방향성 부족 - 감정이나 상황을 통제하지 못하고 있습니다. 방향을 잃고 헤매고 있을 수 있습니다.",
        advice: "💡 조언: 내면의 갈등을 조화시키고, 명확한 방향을 설정하세요.",
        keywords: "승리, 전진, 의지, 통제"
    },
    {
        name: "STRENGTH (힘)",
        meaning: "내적 힘과 용기를 나타내는 카드입니다. 부드러운 힘으로 거친 본능을 다스리는 지혜를 상징합니다.",
        upright: "내적 힘, 용기, 인내 - 부드러운 힘이 진정한 힘입니다. 인내심을 가지고 꾸준히 나아가세요. 자신감이 성공을 가져옵니다.",
        reversed: "약함, 자기 의심, 에너지 부족 - 자신감을 잃고 있거나 내적 힘이 약해진 상태입니다. 휴식과 재충전이 필요합니다.",
        advice: "💡 조언: 진정한 힘은 억압이 아닌 이해와 포용에서 나옵니다.",
        keywords: "용기, 인내, 자신감, 내면"
    },
    {
        name: "THE HERMIT (은둔자)",
        meaning: "내적 탐구와 지혜를 나타내는 카드입니다. 고독 속에서 진리를 찾고 내면의 빛을 발견하는 과정을 상징합니다.",
        upright: "내적 탐구, 지혜, 성찰 - 혼자만의 시간이 필요합니다. 내면을 들여다보고 진정한 자아를 발견하세요. 지혜로운 조언자가 나타날 수 있습니다.",
        reversed: "고립, 외로움, 잘못된 조언 - 지나친 고립은 해롭습니다. 다른 사람과의 연결이 필요한 때입니다.",
        advice: "💡 조언: 때로는 혼자 있는 시간이 가장 큰 선물입니다. 내면의 지혜를 신뢰하세요.",
        keywords: "고독, 지혜, 탐구, 안내"
    },
    {
        name: "WHEEL OF FORTUNE (운명의 바퀴)",
        meaning: "변화와 운명을 나타내는 카드입니다. 인생의 순환과 예측할 수 없는 변화, 행운과 불운의 교차를 상징합니다.",
        upright: "변화, 운명, 기회 - 큰 변화와 전환점이 다가옵니다. 행운이 찾아올 수 있습니다. 흐름에 순응하며 기회를 잡으세요.",
        reversed: "불운, 통제력 상실, 외부 영향 - 일시적인 불운이나 setback이 있을 수 있습니다. 이 또한 지나갈 것입니다.",
        advice: "💡 조언: 변화는 불가피합니다. 유연하게 적응하며 새로운 기회를 찾으세요.",
        keywords: "운명, 순환, 변화, 행운"
    },
    {
        name: "JUSTICE (정의)",
        meaning: "공정과 균형을 나타내는 카드입니다. 진실과 정의, 인과응보와 객관적 판단을 상징합니다.",
        upright: "정의, 공정성, 진실 - 공정한 결과를 얻게 됩니다. 진실이 밝혀지고 정의가 실현됩니다. 중요한 결정을 객관적으로 내리세요.",
        reversed: "불공정, 편견, 책임 회피 - 불공정한 대우를 받거나 편견에 사로잡혀 있을 수 있습니다. 책임을 직시하세요.",
        advice: "💡 조언: 모든 면을 공정하게 평가하세요. 진실은 언제나 드러납니다.",
        keywords: "공정, 진실, 균형, 책임"
    },
    {
        name: "THE HANGED MAN (매달린 남자)",
        meaning: "희생과 관점의 전환을 나타내는 카드입니다. 자발적 희생과 새로운 시각, 인내의 시간을 상징합니다.",
        upright: "희생, 관점 전환, 기다림 - 다른 관점에서 상황을 보세요. 때로는 후퇴가 전진입니다. 인내심을 가지고 기다리세요.",
        reversed: "불필요한 희생, 지연, 저항 - 무의미한 희생을 하고 있거나 변화에 저항하고 있습니다. 고집을 버리세요.",
        advice: "💡 조언: 때로는 멈춤이 가장 빠른 길입니다. 새로운 관점을 받아들이세요.",
        keywords: "희생, 인내, 전환, 깨달음"
    },
    {
        name: "DEATH (죽음)",
        meaning: "변화와 재생을 나타내는 카드입니다. 끝과 새로운 시작, 변혁과 재탄생을 상징합니다.",
        upright: "변화, 끝과 시작, 재생 - 큰 변화가 일어납니다. 낡은 것을 버리고 새로운 것을 받아들이세요. 재탄생의 기회입니다.",
        reversed: "변화에 대한 저항, 정체 - 필요한 변화를 거부하고 있습니다. 과거에 집착하지 마세요.",
        advice: "💡 조언: 끝은 새로운 시작입니다. 변화를 두려워하지 말고 받아들이세요.",
        keywords: "변혁, 종료, 재생, 전환"
    },
    {
        name: "TEMPERANCE (절제)",
        meaning: "균형과 조화를 나타내는 카드입니다. 중용과 인내, 조화로운 통합을 상징합니다.",
        upright: "균형, 절제, 조화 - 균형잡힌 접근이 성공을 가져옵니다. 인내심을 가지고 점진적으로 나아가세요. 극단을 피하세요.",
        reversed: "불균형, 과도함, 조급함 - 균형을 잃고 있습니다. 너무 서두르거나 극단적인 행동을 하고 있을 수 있습니다.",
        advice: "💡 조언: 중도의 길을 찾으세요. 조화와 균형이 성공의 열쇠입니다.",
        keywords: "균형, 조화, 중용, 통합"
    },
    {
        name: "THE DEVIL (악마)",
        meaning: "유혹과 속박을 나타내는 카드입니다. 물질적 집착과 중독, 자기 제한적 믿음을 상징합니다.",
        upright: "유혹, 속박, 중독 - 무언가에 속박되어 있거나 유혹에 빠져 있습니다. 물질적 욕망이나 나쁜 습관에서 벗어나야 합니다.",
        reversed: "해방, 자유, 속박에서 벗어남 - 속박에서 벗어나고 있습니다. 중독이나 나쁜 습관을 극복할 수 있습니다.",
        advice: "💡 조언: 당신을 묶고 있는 사슬은 스스로 만든 것입니다. 언제든 벗어날 수 있습니다.",
        keywords: "속박, 유혹, 물질, 집착"
    },
    {
        name: "THE TOWER (탑)",
        meaning: "파괴와 급변을 나타내는 카드입니다. 갑작스러운 변화와 깨달음, 기존 체계의 붕괴를 상징합니다.",
        upright: "파괴, 급변, 계시 - 갑작스럽고 충격적인 변화가 일어납니다. 기존의 틀이 무너지지만 이는 필요한 과정입니다.",
        reversed: "내적 변화, 개인적 변화 - 내면의 변화가 일어나고 있습니다. 파괴적 변화를 피하거나 지연시킬 수 있습니다.",
        advice: "💡 조언: 무너짐은 때로 재건을 위한 첫걸음입니다. 변화를 받아들이세요.",
        keywords: "파괴, 혼돈, 깨달음, 해방"
    },
    {
        name: "THE STAR (별)",
        meaning: "희망과 영감을 나타내는 카드입니다. 치유와 갱신, 밝은 미래에 대한 믿음을 상징합니다.",
        upright: "희망, 영감, 치유 - 어둠 끝에 빛이 보입니다. 희망을 잃지 마세요. 치유와 회복의 시간입니다. 꿈이 실현될 수 있습니다.",
        reversed: "절망, 희망 상실, 방향성 부족 - 희망을 잃고 있거나 미래가 불투명합니다. 다시 믿음을 회복해야 합니다.",
        advice: "💡 조언: 가장 어두운 밤에도 별은 빛납니다. 희망을 잃지 마세요.",
        keywords: "희망, 영감, 치유, 갱신"
    },
    {
        name: "THE MOON (달)",
        meaning: "환상과 불안을 나타내는 카드입니다. 무의식과 환상, 숨겨진 두려움과 불확실성을 상징합니다.",
        upright: "환상, 불안, 혼란 - 상황이 명확하지 않습니다. 직감을 신뢰하되 환상에 속지 마세요. 숨겨진 진실이 있을 수 있습니다.",
        reversed: "진실 드러남, 명확성 - 혼란이 걷히고 진실이 드러납니다. 불안과 두려움을 극복할 수 있습니다.",
        advice: "💡 조언: 모든 것이 보이는 대로는 아닙니다. 직감을 신뢰하되 사실을 확인하세요.",
        keywords: "환상, 직감, 불안, 무의식"
    },
    {
        name: "THE SUN (태양)",
        meaning: "기쁨과 성공을 나타내는 카드입니다. 생명력과 활력, 성공과 행복을 상징합니다.",
        upright: "기쁨, 성공, 활력 - 큰 성공과 행복이 찾아옵니다. 모든 일이 잘 풀립니다. 긍정적 에너지가 넘칩니다. 자신감을 가지세요.",
        reversed: "일시적 기쁨, 에너지 부족 - 기쁨이 오래가지 않거나 활력이 부족합니다. 너무 낙관적인 것은 아닌지 점검하세요.",
        advice: "💡 조언: 태양처럼 밝게 빛나세요. 당신의 긍정 에너지가 주변을 밝힙니다.",
        keywords: "성공, 기쁨, 활력, 긍정"
    },
    {
        name: "JUDGEMENT (심판)",
        meaning: "부활과 각성을 나타내는 카드입니다. 과거의 청산과 새로운 시작, 높은 차원의 깨달음을 상징합니다.",
        upright: "부활, 각성, 새로운 시작 - 과거를 청산하고 새롭게 시작할 때입니다. 중요한 깨달음이나 결정의 시간입니다.",
        reversed: "자기 의심, 과거에 얽매임 - 과거에서 벗어나지 못하고 있습니다. 자신을 용서하고 앞으로 나아가세요.",
        advice: "💡 조언: 과거를 놓아주고 새로운 자신으로 다시 태어나세요.",
        keywords: "심판, 부활, 각성, 용서"
    },
    {
        name: "THE WORLD (세계)",
        meaning: "완성과 성취를 나타내는 카드입니다. 하나의 순환의 완성과 통합, 완전한 성취를 상징합니다.",
        upright: "완성, 성취, 통합 - 큰 목표를 달성하고 한 단계가 완성됩니다. 모든 것이 제자리를 찾습니다. 축하할 시간입니다.",
        reversed: "미완성, 목표 부족, 지연 - 아직 완성되지 않았거나 마지막 단계가 지연되고 있습니다. 조금만 더 노력하세요.",
        advice: "💡 조언: 당신은 이미 완전합니다. 성취를 축하하고 새로운 여정을 준비하세요.",
        keywords: "완성, 성취, 통합, 완전"
    }
];

const CARD_ICONS = ["🃏","🎩","🌙","👑","🏰","⛪","💕","🏎️","🦁","🕯️","🎡","⚖️","🙃","💀","👼","😈","🗼","⭐","🌙","☀️","📯","🌍"];

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

    // 궁합 계산 함수
function calcMatch(a, b) {
    if(!a || !b) return {score:null, text:'두 생년월일을 모두 입력하세요.'};
    const seed = (a + b).replaceAll('-','');
    let h = 0;
    for(let i = 0; i < seed.length; i++) {
        h = (h * 33 + seed.charCodeAt(i)) % 100000;
    }
    const s = h % 101;
    const text = s >= 80 ? '운명선 강하게 연결! 서로의 성장을 밀어줍니다.'
        : s >= 60 ? '잘 맞는 편. 대화의 리듬이 좋습니다.'
        : s >= 40 ? '노력형 궁합. 규칙적인 소통이 해법.'
        : s >= 20 ? '차이 큼. 공동의 목표를 작게 쪼개보세요.'
        : '생활 리듬·가치관 점검 필요. 천천히 관계 설계하기.';
    return {score:s, text};
}

// 신년 운세 계산 함수
function calcYear(b) {
    if(!b) return {idx:null, text:'생년월일을 입력하세요.'};
    const [y,m,d] = b.split('-').map(Number);
    const k = (y + m + d + 2025) % 6;
    const t = ['도약의 해: 새로운 직무나 프로젝트로의 이동이 유리.',
        '성장의 해: 배움에 투자할수록 보상이 큼.',
        '관계의 해: 협업/파트너십에서 기회.',
        '안정의 해: 재무·건강 관리가 성과로.',
        '전환의 해: 낡은 것을 비우고 새로 설계.',
        '휴식의 해: 과부하를 줄이고 페이스 조절.'][k];
    return {idx:k, text:t};
}
    
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

function showTarotModal(cardIndex, isUpright){
    const idx = Math.max(0, Math.min(TAROT_DETAILS.length-1, Number(cardIndex)||0));
    const card = TAROT_DETAILS[idx];
    if(!card) return;
    
    const modal = $('#tarotModalOverlay');
    const content = $('#tarotModalContent');
    if(!modal || !content) return;
    
    content.innerHTML = `
        <h2>${card.name}</h2>
        <p style="color:#6B7280; margin-bottom:20px; line-height:1.6; font-style:italic;">
            ${card.meaning}
        </p>
        
        ${card.keywords ? `<div style="margin-bottom:15px; padding:10px; background:rgba(255,255,255,0.05); border-radius:8px;">
            <strong style="color:#ffd700;">🏷️ 키워드:</strong> ${card.keywords}
        </div>` : ''}
        
        <div class="meaning-section upright">
            <h3>🔮 정방향 의미</h3>
            <p>${card.upright}</p>
        </div>
        
        <br>
        
        <div class="meaning-section reversed">
            <h3>🔄 역방향 의미</h3>
            <p>${card.reversed}</p>
        </div>
        
        ${card.advice ? `<div style="margin-top:20px; padding:15px; background:rgba(102,126,234,0.1); border-radius:10px;">
            ${card.advice}
        </div>` : ''}
        
        <div style="margin-top:25px; padding:15px; background:rgba(255,215,0,0.1); border-radius:10px; border-left:4px solid #ffd700;">
            <h3 style="color:#ffd700; margin-bottom:10px;">
                ${isUpright ? '🌟 현재: 정방향' : '🌀 현재: 역방향'}
            </h3>
            <p style="color:#ecf0f1; line-height:1.5;">
                ${isUpright ? card.upright : card.reversed}
            </p>
        </div>
    `;
    
    modal.style.display='flex';
    requestAnimationFrame(()=> modal.classList.add('show'));
}

function closeTarotModal(){
    const modal = $('#tarotModalOverlay');
    if(!modal) return;
    modal.classList.remove('show');
    modal.style.display='none';
}

// 타로 모달 닫기 버튼
document.addEventListener('DOMContentLoaded', () => {
    const closeBtn = $('#tarotCloseBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeTarotModal);
    }
    
    const overlay = $('#tarotModalOverlay');
    if (overlay) {
        overlay.addEventListener('click', e => {
            if (e.target === overlay) closeTarotModal();
        });
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

$('#btnMatch')?.addEventListener('click', () => {
    const a = $('#match-a').value;
    const b = $('#match-b').value;
    const nameA = $('#match-name-a')?.value?.trim() || '첫 번째 분';
    const nameB = $('#match-name-b')?.value?.trim() || '두 번째 분';
    
    if (!a || !b) {
        alert('두 사람의 생년월일을 모두 입력하세요.');
        return;
    }
    
    const result = calcEnhancedMatch(a, b, nameA, nameB);
    const html = createEnhancedMatchResult(result, nameA, nameB);
    
    openSheet('상세 궁합 분석', html, {
        type: 'enhanced-match', 
        birthA: a, birthB: b, 
        nameA, nameB, 
        result
    });
    
    reactCrystal('상세 궁합을 분석했습니다 ✨');
});

$('#btnYear')?.addEventListener('click', () => {
    const birth = $('#year-birth').value;
    const name = $('#year-name')?.value?.trim() || '';
    
    if (!birth) {
        alert('생년월일을 입력하세요.');
        return;
    }
    
    const result = calcEnhanced2025Fortune(birth, name);
    const html = createEnhanced2025FortuneResult(result, name);
    
    openSheet('2025년 상세 운세', html, {
        type: 'enhanced-year',
        birth, name, result
    });
    
    reactCrystal('2025년 상세 운세를 확인했습니다 ✨');
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
    setTimeout(hideSplash, 2000);
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
