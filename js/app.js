/**
 * TextQuest AI - Global State Controller & SPA Router
 * Coordinates Teacher, Student, Analytics, and AI modules.
 */

// Global State Object
window.TextQuest = {
    // Current Mode: 'teacher', 'student', 'analytics'
    currentMode: 'teacher',
    
    // Language: 'zh' (Traditional Chinese) or 'en' (English)
    lang: 'zh',
    
    // Configuration Settings
    settings: {
        geminiKey: localStorage.getItem('tq_gemini_key') || '',
        openaiKey: localStorage.getItem('tq_openai_key') || '',
        activeModel: localStorage.getItem('tq_active_model') || 'gemini-1.5-flash'
    },
    
    // Core Activity Model (The editable courseware)
    activity: {
        template: 'mystery', // 'mystery', 'perspective', 'concept'
        title: '消失的綠溪河水 (The Lost Riverwater)',
        target: '國中八年級 (Grade 8)',
        time: 30,
        goals: '學生應能分析水資源短缺的多重原因，並提出基於文本證據的解釋。',
        sourceText: '', // raw text
        sentences: [],  // split sentences for evidence linking [{id, text}]
        product: '請寫一封基於證據的調查報告給村民，解釋綠溪河乾涸的背後主因與解決建議。',
        locations: [],  // array of location objects
        npcs: {},       // map of npc_id -> NPC object
        clues: {}       // map of clue_id -> Clue object
    },
    
    // Student Gameplay State (Reset when student starts)
    student: {
        timer: 1800, // 30 minutes in seconds
        timerInterval: null,
        currentLocationId: null,
        currentNpcId: null,
        collectedClueIds: [], // array of clueIds
        evidenceLinks: [],    // [{ id, clueId, sentenceId, quote, reasoning }]
        chatHistory: {},      // map of npcId -> array of messages [{ sender: 'npc'|'student', text: string }]
        synthesisTitle: '',
        synthesisBody: '',
        isSubmitted: false
    },
    
    // Analytics Mock Data & playtest logs
    analytics: {
        students: [], // mock students
        visitsCount: {}, // npcId -> count
        clueCollects: {}, // clueId -> count
        evidenceLinksCount: {}, // clueId -> count
        aiTeachingNote: ''
    }
};

// Default Source Text (Environmental Inquiry)
const DEFAULT_SOURCE_TEXT = 
`1. 綠溪村曾經是一個水源充沛、生態豐富的美麗村落，村民世代依賴清澈的綠溪河進行農作灌溉與日常生活。
2. 然而，自從三年前上游開辦了一家大型「綠溪精細化工廠」後，村民逐漸發現河流生態發生了詭異的改變。
3. 根據氣象局官方觀測，近年來由於全球暖化，本地區的梅雨季降雨量確實比三十年平均值略微減少了約15%。
4. 工廠大門的告示牌宣稱，化工廠引進了最先進的環保廢水零排放循環系統，所有工業用水皆在內部回收，絕不對外排汙。
5. 地方環保志工在工廠排污口下游五百公尺處進行水質檢測，發現導電度在工廠運轉日會暴增三倍，且河床有大量不明的藻類優養化沉澱物。
6. 阿土伯翻開他的農作日記，記錄著以往溪水及腰，甚至能摸到溪底的石蠅幼蟲，但最近一年溪水常乾涸見底，石蠅早已死光。
7. 青年記者阿哲在調查報導中指出，雖然降雨量僅微幅下降，但綠溪河的總流量在過去三年卻急劇萎縮了高達70%，斷流現象極不尋常。
8. 有傳言懷疑，工廠為了降低運作成本，可能在夜間利用地下暗管超量抽取河川地下水源，或非法排放未經處理的強酸廢水。`;

// Preset Locations and NPCs (River Inquiry Setup)
const DEFAULT_LOCATIONS = [
    {
        id: 'loc_square',
        icon: '🏡',
        name_zh: '村莊廣場',
        name_en: 'Village Square',
        desc_zh: '村民聚集聊天的中心點，也是八卦與傳言流傳最廣的地方。',
        desc_en: 'The community hub where villagers gather and rumors spread.',
        npcs: ['npc_farmer'],
        clues: []
    },
    {
        id: 'loc_factory',
        icon: '🏭',
        name_zh: '化工廠大門口',
        name_en: 'Factory Gate',
        desc_zh: '高大冰冷的鐵門緊閉，煙囪冒著微煙，有保全在門口巡邏。',
        desc_en: 'Cold iron gates, smoking chimneys, and strict security guards.',
        npcs: ['npc_manager'],
        clues: []
    },
    {
        id: 'loc_riverbank',
        icon: '🌊',
        name_zh: '綠溪河畔上游',
        name_en: 'Riverbank Upstream',
        desc_zh: '排污口下方的河床裸露，散發微弱異味，岩石上黏附著綠色藻類。',
        desc_en: 'Exposed riverbed downstream of output pipes, green algae on rocks.',
        npcs: ['npc_volunteer'],
        clues: []
    },
    {
        id: 'loc_office',
        icon: '📰',
        name_zh: '獨立報導辦公室',
        name_en: 'Reporter Office',
        desc_zh: '堆滿剪報與調查筆記的雜亂工作室，記者阿哲正埋頭撰稿。',
        desc_en: 'Cluttered desk with news clippings where reporter A-Che works.',
        npcs: ['npc_reporter'],
        clues: []
    }
];

const DEFAULT_NPCS = {
    'npc_farmer': {
        id: 'npc_farmer',
        locationId: 'loc_square',
        name: '老農夫 阿土伯 (Uncle Tu)',
        avatar: '👴',
        roleBadge_zh: '在地老農夫',
        roleBadge_en: 'Elderly Farmer',
        description_zh: '在綠溪村生活了七十年的老農，對河流過去的清澈與豐沛瞭如指掌。',
        description_en: 'Lived in the village for 70 years. Knows the river\'s history perfectly.',
        voice_zh: '說話帶著濃濃的鄉音，語氣感傷無奈，時常嘆氣。',
        voice_en: 'Nostalgic and emotional, speaking with local colloquialisms.',
        boundary_zh: '只知道河流過去的水質水量，以及近年農田嚴重乾涸、無法灌溉的慘狀。完全不知道工廠的工程細節或降雨統計。',
        boundary_en: 'Only knows farming diaries, past crop yields, and current irrigation struggles. Knows nothing about engineering formulas or weather models.',
        clueName_zh: '阿土伯的農作日記',
        clueName_en: 'Uncle Tu\'s Farming Diary',
        clueText_zh: '日記記載：三年前工廠蓋好後，溪水開始常年枯竭，灌溉溝渠經常抽不到水；而且以前水底有很多代表水質乾淨的石蠅幼蟲，現在都死光了。',
        clueText_en: 'Diary entry: River began drying up 3 years ago right when the factory opened. The sensitive stonefly larvae (indicator of clean water) have completely vanished.',
        rule_zh: '提問內容必須包含「以前」、「以前水量」、「農作物」或「水質」。',
        rule_en: 'Must mention "past", "history", "water quality", or "crops".',
        evidences: ['1', '6'] // sentence IDs
    },
    'npc_manager': {
        id: 'npc_manager',
        locationId: 'loc_factory',
        name: '高經理 (Manager Kao)',
        avatar: '💼',
        roleBadge_zh: '工廠公關發言人',
        roleBadge_en: 'Factory Spokesperson',
        description_zh: '化工廠公關經理，西裝筆挺，說話有禮卻極其防衛，強調經濟貢獻。',
        description_en: 'Polite but highly defensive spokesperson defending the factory\'s economic value.',
        voice_zh: '官腔、禮貌、條理清晰，常用「根據法規」、「科學數據證明」等措辭。',
        voice_en: 'Professional, corporate tone, constantly quoting compliance guidelines.',
        boundary_zh: '極力辯稱工廠完全符合環保標準，將乾涸歸咎於天災乾旱。迴避有關地下暗管或夜間異常抽水的提問。',
        boundary_en: 'Only states that factory treatment is 100% compliant and blames the regional drought. Sidesteps questions about hidden pipes or night-time water usage.',
        clueName_zh: '工廠綠色環保說明書',
        clueName_en: 'Factory Green Compliance Brochure',
        clueText_zh: '說明書聲稱：工廠引進最先進零排放循環水系統，每月為村子創造十個就業機會，乾涸纯屬梅雨季降雨減少15%的天災。',
        clueText_en: 'Compliance sheet: Factory uses 100% recycling system. Generates 10 local jobs. The dry river is purely an act of god due to a 15% rainfall reduction.',
        rule_zh: '提問內容必須包含「排汙」、「廢水」、「沒水的原因」或「就業」。',
        rule_en: 'Must mention "pollution", "waste water", "dry river", or "jobs".',
        evidences: ['3', '4']
    },
    'npc_volunteer': {
        id: 'npc_volunteer',
        locationId: 'loc_riverbank',
        name: '環保志工 雨婷 (Yu-Ting)',
        avatar: '👩',
        roleBadge_zh: '大學環境系志工',
        roleBadge_en: 'Environmental Volunteer',
        description_zh: '熱血的大學環境科學系學生，長期利用週末監測綠溪生態。',
        description_en: 'Passionate college biology student monitoring the river\'s health.',
        voice_zh: '說話急促、滿腔熱忱，喜歡用科學檢測數值，對河川命運感到焦慮。',
        voice_en: 'Energetic, urgent, quotes scientific metrics and water values.',
        boundary_zh: '非常清楚排污口下方的生態惡化數據，如導電度超標、優養化沉澱物。懷疑工廠夜間偷排或偷抽水，但苦無實證。',
        boundary_en: 'Only knows biological samples (conductive metrics, algae overgrowth). Suspects illegal extraction or nighttime discharge but lacks physical proof.',
        clueName_zh: '水質監測科學數據單',
        clueName_en: 'Water Monitoring Report',
        clueText_zh: '數據單顯示：排污口下方導電度在工廠運轉日會暴增三倍，並累積大量綠色優養化藻類，這與工廠宣稱的「零排放」嚴重不符！',
        clueText_en: 'Monitoring log: Conductivity jumps 3x on active factory days, with massive artificial eutrophication. Blatantly refutes the "zero discharge" claim.',
        rule_zh: '提問內容必須包含「水質」、「檢測」、「數據」或「藻類」。',
        rule_en: 'Must mention "water quality", "test", "data", or "algae".',
        evidences: ['5', '8']
    },
    'npc_reporter': {
        id: 'npc_reporter',
        locationId: 'loc_office',
        name: '青年記者 阿哲 (A-Che)',
        avatar: '🎤',
        roleBadge_zh: '獨立調查記者',
        roleBadge_en: 'Investigative Journalist',
        description_zh: '追求真相的獨立媒體記者，善於對比各方說法矛盾。',
        description_en: 'Objective independent reporter looking for systemic inconsistencies.',
        voice_zh: '理智、客觀、帶有探究質疑的口氣，引導學生思考兩極化說法的盲點。',
        voice_en: 'Analytical, sharp, prompts student to compare conflicting statements.',
        boundary_zh: '掌握了氣象局真實雨量與河川流量的落差。需要學生提供其他角色的證詞（如阿土伯或工廠說明），才會吐露關鍵對比數據。',
        boundary_en: 'Knows the meteorological gap between rainfall drop and river runoff. Requires player to bring up Uncle Tu\'s or Manager Kao\'s claims before opening up.',
        clueName_zh: '氣象局與河川流量對照表',
        clueName_en: 'Rainfall vs River Flow Spreadsheet',
        clueText_zh: '對照表揭露：近三年降雨僅比歷史少15%，但河川總流量卻劇烈萎縮了70%！這證明「氣候旱災」只是幌子，背後有巨大的人為超抽或暗管偷水。',
        clueText_en: 'Spreadsheet comparison: Local rainfall only dropped 15%, but river runoff collapsed by 70%. Climate change is a cover-up; massive artificial extraction is happening.',
        rule_zh: '提問中必須提到「阿土伯」、「日記」、「工廠說明」或「降雨量」。',
        rule_en: 'Must mention "Uncle Tu", "diary", "brochure", or "rainfall".',
        evidences: ['3', '7']
    }
};

// Global Translation Strings
const TRANSLATIONS = {
    zh: {
        title: '消失的綠溪河水 (The Lost Riverwater)',
        nav_teacher: '🛠️ 教師設計工作室',
        nav_student: '🧭 學生探索空間',
        nav_analytics: '📊 學習分析儀表板',
        goals_lbl: '核心學習目標',
        product_lbl: '最終學習產出任務',
        source_text_lbl: '匯入探究文本',
        btn_add_location: '➕ 新增地點',
        btn_ai_analyze: '🧠 分析探究文本',
        btn_ai_generate_npcs: '👥 生成故事世界',
        btn_ai_design_tasks: '⏱️ 規劃學習任務',
        btn_ai_check_quality: '🔍 進行品質健檢',
        // And more will be translated dynamically in app.js
    },
    en: {
        title: 'The Lost Riverwater',
        nav_teacher: '🛠️ Teacher Studio',
        nav_student: '🧭 Student Workspace',
        nav_analytics: '📊 Analytics Dashboard',
        goals_lbl: 'Learning Objectives',
        product_lbl: 'Final Synthesis Product',
        source_text_lbl: 'Source Exploration Text',
        btn_add_location: '➕ Add Location',
        btn_ai_analyze: '🧠 Analyze Text',
        btn_ai_generate_npcs: '👥 Generate Storyworld',
        btn_ai_design_tasks: '⏱️ Design Task Flow',
        btn_ai_check_quality: '🔍 Run Quality Check',
    }
};

// Helper: Split source text into numbered lines
function parseSourceTextToSentences(text) {
    if (!text.trim()) return [];
    
    // Split by newlines or sentence punctuation
    const rawLines = text.split('\n');
    const sentences = [];
    let count = 1;
    
    rawLines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;
        
        // Remove leading numbers if present (e.g. "1. " or "1 ")
        const cleanLine = trimmed.replace(/^\d+[\.\s、]+/g, '');
        if (cleanLine) {
            sentences.push({
                id: count.toString(),
                text: cleanLine
            });
            count++;
        }
    });
    
    return sentences;
}

// Global UI Language Switcher
function toggleLanguage() {
    TextQuest.lang = TextQuest.lang === 'zh' ? 'en' : 'zh';
    document.getElementById('lang-label').textContent = TextQuest.lang === 'zh' ? 'EN' : '繁';
    
    // Set HTML lang attribute
    document.documentElement.lang = TextQuest.lang === 'zh' ? 'zh-Hant' : 'en';
    
    // Update all elements with data-zh / data-en attributes
    const elements = document.querySelectorAll('[data-zh]');
    elements.forEach(el => {
        const zh = el.getAttribute('data-zh');
        const en = el.getAttribute('data-en');
        const val = TextQuest.lang === 'zh' ? zh : en;
        
        // Check if placeholder or input
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            if (el.hasAttribute('placeholder')) {
                el.setAttribute('placeholder', val);
            }
        } else {
            el.textContent = val;
        }
    });

    // Update dynamic headings in playtest if running
    if (TextQuest.student.currentLocationId) {
        window.StudentModule.renderLocationSplit();
    }
    
    // Re-render UI components to respect language
    window.TeacherModule.renderLocations();
    if (window.StudentModule) {
        window.StudentModule.renderMap();
        window.StudentModule.renderBinder();
    }
    if (window.AnalyticsModule) {
        window.AnalyticsModule.renderDashboard();
    }
}

// Mode Selector (SPA Router)
function switchMode(mode) {
    TextQuest.currentMode = mode;
    
    // Update nav button active states
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    
    // Hide all view panels and remove active class
    document.querySelectorAll('.view-panel').forEach(panel => {
        panel.classList.add('hidden');
        panel.classList.remove('active');
    });
    
    if (mode === 'teacher') {
        document.getElementById('btn-mode-teacher').classList.add('active');
        const view = document.getElementById('view-teacher');
        view.classList.remove('hidden');
        view.classList.add('active');
        window.TeacherModule.init();
    } else if (mode === 'student') {
        document.getElementById('btn-mode-student').classList.add('active');
        const view = document.getElementById('view-student');
        view.classList.remove('hidden');
        view.classList.add('active');
        window.StudentModule.init();
    } else if (mode === 'analytics') {
        document.getElementById('btn-mode-analytics').classList.add('active');
        const view = document.getElementById('view-analytics');
        view.classList.remove('hidden');
        view.classList.add('active');
        window.AnalyticsModule.init();
    }
}

// Global Initialization
document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Activity Model with Default values
    TextQuest.activity.sourceText = DEFAULT_SOURCE_TEXT;
    TextQuest.activity.sentences = parseSourceTextToSentences(DEFAULT_SOURCE_TEXT);
    TextQuest.activity.locations = JSON.parse(JSON.stringify(DEFAULT_LOCATIONS));
    TextQuest.activity.npcs = JSON.parse(JSON.stringify(DEFAULT_NPCS));
    
    // Create clue map dynamically from NPC clues
    Object.values(TextQuest.activity.npcs).forEach(npc => {
        if (npc.clueName_zh) {
            const clueId = 'clue_' + npc.id.split('_')[1];
            TextQuest.activity.clues[clueId] = {
                id: clueId,
                npcId: npc.id,
                name_zh: npc.clueName_zh,
                name_en: npc.clueName_en,
                text_zh: npc.clueText_zh,
                text_en: npc.clueText_en,
                rule_zh: npc.rule_zh,
                rule_en: npc.rule_en,
                evidences: npc.evidences
            };
            npc.clueId = clueId;
        }
    });
    
    // Populate form fields
    document.getElementById('input-source-text').value = TextQuest.activity.sourceText;
    
    // Initialize Mock Analytics
    window.AnalyticsModule.initializeMockData();

    // 2. Setup Global Event Listeners
    document.getElementById('btn-lang').addEventListener('click', toggleLanguage);
    
    document.getElementById('btn-mode-teacher').addEventListener('click', () => switchMode('teacher'));
    document.getElementById('btn-mode-student').addEventListener('click', () => switchMode('student'));
    document.getElementById('btn-mode-analytics').addEventListener('click', () => switchMode('analytics'));
    
    // Settings modal triggers
    const settingsModal = document.getElementById('modal-settings');
    document.getElementById('btn-settings').addEventListener('click', () => {
        document.getElementById('input-gemini-key').value = TextQuest.settings.geminiKey;
        document.getElementById('input-openai-key').value = TextQuest.settings.openaiKey;
        document.getElementById('select-llm-model').value = TextQuest.settings.activeModel;
        settingsModal.classList.remove('hidden');
    });
    document.getElementById('btn-close-settings').addEventListener('click', () => {
        settingsModal.classList.add('hidden');
    });
    document.getElementById('btn-save-settings').addEventListener('click', () => {
        const gemini = document.getElementById('input-gemini-key').value.trim();
        const openai = document.getElementById('input-openai-key').value.trim();
        const model = document.getElementById('select-llm-model').value;
        
        TextQuest.settings.geminiKey = gemini;
        TextQuest.settings.openaiKey = openai;
        TextQuest.settings.activeModel = model;
        
        localStorage.setItem('tq_gemini_key', gemini);
        localStorage.setItem('tq_openai_key', openai);
        localStorage.setItem('tq_active_model', model);
        
        settingsModal.classList.add('hidden');
    });
    
    // API Tester
    document.getElementById('btn-test-api').addEventListener('click', () => {
        const testStatusEl = document.getElementById('api-test-status');
        testStatusEl.className = 'api-status-label neutral';
        testStatusEl.textContent = TextQuest.lang === 'zh' ? '正在測試...' : 'Testing...';
        
        const geminiKey = document.getElementById('input-gemini-key').value.trim();
        const openaiKey = document.getElementById('input-openai-key').value.trim();
        const selectedModel = document.getElementById('select-llm-model').value;
        
        window.AIModule.testConnection(geminiKey, openaiKey, selectedModel)
            .then(success => {
                if (success) {
                    testStatusEl.className = 'api-status-label success';
                    testStatusEl.textContent = TextQuest.lang === 'zh' ? '連線成功 ✅' : 'Connected ✅';
                } else {
                    testStatusEl.className = 'api-status-label error';
                    testStatusEl.textContent = TextQuest.lang === 'zh' ? '連線失敗 ❌' : 'Failed ❌';
                }
            });
    });

    // 3. Initialize Teacher Studio by default
    window.TeacherModule.init();
});

// Utility to escape HTML
window.escapeHtml = function(text) {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

// Sentence parser hook
window.parseSourceTextToSentences = parseSourceTextToSentences;
