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

// Preset activities definition
window.PRESET_ACTIVITIES = [
    {
        id: 'activity_riverbank',
        title: '消失的綠溪河水 (The Lost Riverwater)',
        target: '國中八年級 (Grade 8)',
        time: 30,
        goals: '學生應能分析水資源短缺的多重原因，並提出基於文本證據的解釋。',
        product: '請寫一封基於證據的調查報告給村民，解釋綠溪河乾涸的背後主因與解決建議。',
        sourceText: DEFAULT_SOURCE_TEXT,
        locations: DEFAULT_LOCATIONS,
        npcs: DEFAULT_NPCS
    },
    {
        id: 'activity_soil',
        title: '綠溪庄土壤污染謎團 (The Lost Soil Quality)',
        target: '國中八年級 (Grade 8)',
        time: 30,
        goals: '學生應能探究農地枯萎的化學原因，評估工廠聲明與老張日記的矛盾，並對齊土壤報告數據。',
        product: '請撰寫一份基於 C-E-R（主張-證據-推理）的土壤污染調查結論，向村委會報告鎘污染的來源。',
        sourceText: `1. 綠溪村的南側農田近年來部分作物的葉片出現枯黃與畸形，收成量急劇下滑，引起農民的恐慌。\n2. 農地西側鄰近一家成立五年的「鑫源電鍍廠」，該廠主要進行金屬表面處理與電鍍加工。\n3. 鑫源電鍍廠發表公開聲明，堅稱其所有的化學重金屬電鍍液皆經過高溫中和與沉澱處理，絕無重金屬外洩。\n4. 農業改良場的土壤專家在枯黃農作區採集了深層土壤樣本，化驗結果顯示土壤中的重金屬鎘（Cd）含量超標高達五倍。\n5. 鑫源電鍍廠的員工悄悄透露，工廠內部有一口未登記的深井，且廢水池在暴雨天常有溢流現象。\n6. 阿土伯的鄰居老張表示，自從電鍍廠運作後，灌溉用的地下水井水質開始變色，且有刺鼻氣味。\n7. 阿哲的深入調查指出，重金屬鎘無法被一般灌溉水稀釋，會長期殘留在泥土中並被作物的根部吸收。`,
        locations: [
            {
                id: 'loc_field',
                icon: '🌾',
                name_zh: '南側農作物區',
                name_en: 'Crop Field',
                desc_zh: '枯黃低垂的稻穗與變色泥土，老農夫老張正焦急地看著他的灌溉井。',
                desc_en: 'Withering crops and discolored soil, where farmer Chang monitors his well.',
                npcs: ['npc_chang'],
                clues: []
            },
            {
                id: 'loc_electroplate',
                icon: '🏭',
                name_zh: '鑫源電鍍廠',
                name_en: 'Electroplating Factory',
                desc_zh: '傳出機器低鳴聲的加工廠，高聳的酸液儲槽上貼有合格安全標章。',
                desc_en: 'Electroplating facility with hum of machinery and NaOH storage tanks.',
                npcs: ['npc_lee'],
                clues: []
            },
            {
                id: 'loc_lab',
                icon: '🔬',
                name_zh: '土壤化驗實驗室',
                name_en: 'Agricultural Lab',
                desc_zh: '農業改良場的研究室，桌上擺滿了土壤樣本試管與原子吸收光譜儀。',
                desc_en: 'Research lab equipped with soil sample tubes and spectrometers.',
                npcs: ['npc_chen'],
                clues: []
            }
        ],
        npcs: {
            'npc_chang': {
                id: 'npc_chang',
                locationId: 'loc_field',
                name: '老農夫 老張 (Farmer Chang)',
                avatar: '👴',
                roleBadge_zh: '鄰近農民',
                roleBadge_en: 'Neighboring Farmer',
                description_zh: '在電鍍廠隔壁種田 of農民，發現近年來土壤質地與水質有巨大變化。',
                description_en: 'Farmer cultivating crops adjacent to the electroplating factory.',
                voice_zh: '操著沙啞的嗓音，情緒十分焦急，時常抱怨收成慘淡。',
                voice_en: 'Speaks with a raspy voice, sounding anxious and complaining about poor harvest.',
                boundary_zh: '只知道自家的井水在下暴雨後會變色，有刺鼻的金屬味，作物收成慘澹，完全不知道檢測儀器運作方式或工廠財務。',
                boundary_en: 'Only knows that well water changes color after heavy rains and crops are dying. Knows nothing about factory finances or chemical formulas.',
                clueName_zh: '地下水井變色與異味紀錄',
                clueName_en: 'Well Water Discoloration Records',
                clueText_zh: '老張筆記：自從電鍍廠開始運作後，灌溉用的地下水井在雨天常會變成鐵鏽色，並散發刺鼻的酸味，澆灌後的作物葉片很快就焦枯。',
                clueText_en: 'Chang\'s records: Since the factory opened, well water turns rusty brown during rains with a pungent acidic smell, causing crops to wither rapidly.',
                rule_zh: '提問中必須提到「井水」、「變色」、「氣味」或「作物」。',
                rule_en: 'Must mention "well", "color", "smell", or "crops".',
                evidences: ['1', '6']
            },
            'npc_lee': {
                id: 'npc_lee',
                locationId: 'loc_electroplate',
                name: '李廠長 (Director Lee)',
                avatar: '👨‍💼',
                roleBadge_zh: '電鍍廠代表',
                roleBadge_en: 'Electroplating Factory Director',
                description_zh: '電鍍廠廠長，身穿工作服，極力維護工廠名譽，堅稱所有流程符合標準。',
                description_en: 'Factory director defending the operation\'s environmental standards.',
                voice_zh: '語氣堅定、自信，帶著一點防備，常用「符合國家標準」、「科學合格證書」等詞彙。',
                voice_en: 'Confident and defensive, repeatedly quoting compliance certifications.',
                boundary_zh: '堅稱所有的廢水都有合格處理與中和，絕無直接對外排放。規避有關內部未登記井或溢流的問題。',
                boundary_en: 'Insists waste chemicals are treated and neutralized before disposal. Evades questions about overflow incidents or unregistered dump wells.',
                clueName_zh: '工廠廢水化學中和合格證書',
                clueName_en: 'Wastewater Treatment Certificate',
                clueText_zh: '證書宣稱：工廠內所有金屬表面處理的酸液電鍍廢水，皆經過氫氧化鈉（NaOH）中和及重金屬沉澱，水質檢測完全合格。',
                clueText_en: 'Certificate details: All acidic plating waste undergoes neutralization with NaOH and heavy metal precipitation, meeting the required environmental test parameters.',
                rule_zh: '提問中必須包含「合格」、「廢水」、「處理」或「符合標準」。',
                rule_en: 'Must mention "certificate", "wastewater", "treatment", or "standards".',
                evidences: ['2', '3']
            },
            'npc_chen': {
                id: 'npc_chen',
                locationId: 'loc_lab',
                name: '土壤專家 陳博士 (Dr. Chen)',
                avatar: '👩‍🔬',
                roleBadge_zh: '土壤重金屬專家',
                roleBadge_en: 'Soil Heavy Metal Expert',
                description_zh: '農業改良場的重金屬研究專家，說話講求數據，客觀冷靜。',
                description_en: 'Agricultural scientist studying soil heavy metals, highly analytical.',
                voice_zh: '條理分明、語氣嚴謹，經常引用專業的化學分析數據與土壤深度指標。',
                voice_en: 'Logical, precise, and quotes chemical symbols and metric scales.',
                boundary_zh: '掌握了受污染區的土壤化驗數據，但需要學生提供有關電鍍廠原料或老張的井水變色說法，才願意分享化驗細節與鎘（Cd）對作物的吸收效應。',
                boundary_en: 'Has test data indicating Cadmium (Cd) contamination. Requires student to mention Lee\'s certificate or Chang\'s well water to share report details.',
                clueName_zh: '農地深層土壤化驗報告',
                clueName_en: 'Agricultural Soil Laboratory Report',
                clueText_zh: '報告揭露：受害農區深層土壤中的鎘（Cd）含量超標高達五倍，且發現這種重金屬極難自然稀釋，會長期殘留在泥土中，經根部吸收並累積於作物體內。',
                clueText_en: 'Lab report: Deep soil Cadmium (Cd) concentration exceeds safety limits by 5x. Cadmium does not dilute easily, remains in soil, and accumulates in crop tissues via root absorption.',
                rule_zh: '提問中必須提到「老張」、「合格證書」、「土壤」或「鎘」。',
                rule_en: 'Must mention "Chang", "certificate", "soil", or "cadmium".',
                evidences: ['4', '7']
            }
        }
    },
    {
        id: 'activity_fake_news',
        title: '社群媒體假新聞判讀 (AI Fake News Literacy)',
        target: '國中九年級 (Grade 9)',
        time: 30,
        goals: '學生應能區分事實與流言，交叉對照疾管署數據與查核中心影像反搜報告，找出機器人帳號轉發意圖。',
        product: '請完成一份事實查核判定書，駁斥有關綠溪村鎘蔬菜致急性腎衰竭的流言，並分析造謠方的動機與網絡手段。',
        sourceText: `1. 網路上近日瘋傳一則訊息，聲稱「綠溪村生產的蔬菜含有劇毒鎘，食用會導致急性腎衰竭」，引發大眾恐慌並導致蔬菜滯銷。\n2. 這則消息最早發布於一個名為「綠溪健康小幫手」的匿名社群帳號，並附帶一張病患在醫院搶救的聳動照片。\n3. 衛生福利部疾管署澄清，近期並未接獲任何因食用綠溪村蔬菜而導致急性腎衰竭或重金屬中毒的集體病例。\n4. 查核機構調查發現，該貼文所使用的病患照片，實際上是五年前國外一宗食物中毒事件的舊新聞照片。\n5. 該匿名帳號的註冊 IP 網段被追蹤到來自一家名為「快遞行銷公司」的公關行銷機構。\n6. 當地菜農自救會代表李大姐指出，這則謠言散布的時機，剛好是在競爭對手「洋洋生鮮電商」進行大促銷的前夕。\n7. 資訊工程專家指出，該謠言貼文在短短數小時內獲得了上萬次轉發，呈現典型的社群機器人帳號協同操作特徵。`,
        locations: [
            {
                id: 'loc_clinic',
                icon: '🏥',
                name_zh: '地方醫事機構',
                name_en: 'Local Clinic',
                desc_zh: '安靜忙碌的診所，林醫師正查看電腦裡的疾管署即時流病通報數據。',
                desc_en: 'Quiet community clinic where Dr. Lin monitors epidemiology databases.',
                npcs: ['npc_lin'],
                clues: []
            },
            {
                id: 'loc_factcheck',
                icon: '💻',
                name_zh: '事實查核中心',
                name_en: 'Fact Check Center',
                desc_zh: '擺滿螢幕的查核中心辦公室，查核員小敏正在進行反向圖片搜尋與帳號分析。',
                desc_en: 'Workspace filled with monitors where fact-checker Min traces digital footprints.',
                npcs: ['npc_min'],
                clues: []
            },
            {
                id: 'loc_market',
                icon: '🥬',
                name_zh: '菜農自救會',
                name_en: 'Farmer Association',
                desc_zh: '堆滿滯銷蔬菜的集貨場，自救會李大姐神色憤怒地打著電話抗議。',
                desc_en: 'Packing station piled with unsold crops, where Sister Lee leads union protests.',
                npcs: ['npc_sister_lee'],
                clues: []
            }
        ],
        npcs: {
            'npc_lin': {
                id: 'npc_lin',
                locationId: 'loc_clinic',
                name: '林醫師 (Dr. Lin)',
                avatar: '👨‍⚕️',
                roleBadge_zh: '診所主治醫生',
                roleBadge_en: 'Clinic Medical Doctor',
                description_zh: '當地的社區主治醫師，在綠溪村服務多年，掌握第一手的就醫紀錄。',
                description_en: 'Community general practitioner possessing first-hand medical registers.',
                voice_zh: '溫和、理性，說話帶有醫學專業的謹慎，以安撫與實證為主。',
                voice_en: 'Gentle, rational, and cautious with clinical metrics.',
                boundary_zh: '只知道近期是否有急性腎衰竭病例增加，不知道網路謠言是誰發布的。',
                boundary_en: 'Only knows hospital admissions and case statistics. Has no information on digital IP logs or source photos.',
                clueName_zh: '疾管署就醫監測數據庫',
                clueName_en: 'CDC Medical Admission Registry',
                clueText_zh: '數據庫揭露：過去三個月綠溪村居民因急性腎衰竭或中毒就醫的件數為零，與往年完全相同，證實網路上所謂的「大量急性腎衰竭病例」完全是虛構的。',
                clueText_en: 'Registry log: Number of acute kidney failure or poisoning cases in the village over the past 3 months is exactly zero, proving the online claim is fictitious.',
                rule_zh: '提問中必須提到「就醫」、「病例」、「病例數據」或「中毒」。',
                rule_en: 'Must mention "admission", "cases", "registry", or "kidney".',
                evidences: ['1', '3']
            },
            'npc_min': {
                id: 'npc_min',
                locationId: 'loc_factcheck',
                name: '事實查核員 小敏 (Fact Checker Min)',
                avatar: '👩‍💻',
                roleBadge_zh: '事實查核員',
                roleBadge_en: 'Fact Checker',
                description_zh: '專向影像溯源與網路消息查證的專業查核員。',
                description_en: 'Fact-checking investigator specialized in image reverse searches.',
                voice_zh: '中立、客觀，強調證據、搜尋紀錄與數位足跡。',
                voice_en: 'Objective, methodical, constantly citing metadata and search indices.',
                boundary_zh: '掌握了該謠言配圖的原圖來源，以及轉發貼文的協同帳號特徵。',
                boundary_en: 'Knows the origin of the photo and bot network analytics. Knows nothing about local market dynamics.',
                clueName_zh: '網路謠言配圖反向搜尋報告',
                clueName_en: 'Image Reverse Search Analysis',
                clueText_zh: '查核報告：該貼文中使用的病患搶救照片，實際上是五年前國外一宗食物中毒事件的舊新聞截圖；且該貼文在短短數小時內被上萬次大量協同機器人帳號轉發。',
                clueText_en: 'Reverse search details: The patient photo used was stolen from a 5-year-old foreign food poisoning report, and the post was spread via bot nets.',
                rule_zh: '提問中必須提到「照片」、「貼文」、「圖片」或「轉發」。',
                rule_en: 'Must mention "photo", "post", "image", or "bot".',
                evidences: ['2', '4', '7']
            },
            'npc_sister_lee': {
                id: 'npc_sister_lee',
                locationId: 'loc_market',
                name: '菜農代表 李大姐 (Sister Lee)',
                avatar: '👩',
                roleBadge_zh: '菜農自救會代表',
                roleBadge_en: 'Farmer Association Representative',
                description_zh: '菜農自溪班代表，因為蔬菜滯銷而心急如焚，試圖揭發對手的不正當競爭。',
                description_en: 'Farmer union leader dealing with vegetable sales collapse.',
                voice_zh: '熱心、激動，說話速度快，帶著濃厚的正義感與憤怒。',
                voice_en: 'Energetic, emotional, speaking quickly with retail marketing insight.',
                boundary_zh: '只知道蔬菜滯銷的經濟損失，以及競爭對手洋洋生鮮的促銷活動，不知道技術上的IP追蹤或疾管署就醫數據。',
                boundary_en: 'Only knows financial losses, crop prices, and rival marketing schedules. Knows nothing about IP address mapping.',
                clueName_zh: '洋洋電商促銷與行銷時程表',
                clueName_en: 'Rival E-Commerce Promotion Schedule',
                clueText_zh: '調查時程表：謠言大肆散播的時間，剛好是在競爭對手「洋洋生鮮電商」主打「無毒安全蔬菜大促銷」的前一天，且該貼文的發布IP網段指向了一家受雇的行銷公關公司。',
                clueText_en: 'Schedule correlation: The kidney poison rumor broke exactly 1 day before rival "Yang-Yang Fresh" launched their safety-brand promotion, traced to a marketing firm\'s IP.',
                rule_zh: '提問中必須提到「洋洋」、「促銷」、「對手」或「時間點」。',
                rule_en: 'Must mention "Yang-Yang", "promotion", "rival", or "timing".',
                evidences: ['5', '6']
            }
        }
    }
];

window.loadActivityIntoSession = function(activityData) {
    // Deep copy the activityData
    TextQuest.activity = JSON.parse(JSON.stringify(activityData));
    TextQuest.activity.sentences = parseSourceTextToSentences(TextQuest.activity.sourceText);
    
    // Clear and build clues dynamically
    TextQuest.activity.clues = {};
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
    
    // Update fields if elements exist
    const sourceTextEl = document.getElementById('input-source-text');
    if (sourceTextEl) {
        sourceTextEl.value = TextQuest.activity.sourceText;
    }
};

window.saveCustomActivityToStorage = function() {
    localStorage.setItem('tq_custom_activity', JSON.stringify(TextQuest.activity));
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
    
    const modeNav = document.getElementById('global-mode-nav');
    const btnExitRole = document.getElementById('btn-exit-role');
    
    if (mode === 'gateway') {
        if (modeNav) modeNav.classList.add('hidden');
        if (btnExitRole) btnExitRole.classList.add('hidden');
        const view = document.getElementById('view-gateway');
        if (view) {
            view.classList.remove('hidden');
            view.classList.add('active');
        }
    } else if (mode === 'teacher') {
        if (modeNav) {
            modeNav.classList.remove('hidden');
            // Hide student tab in teacher mode
            document.getElementById('btn-mode-student').classList.add('hidden');
            document.getElementById('btn-mode-teacher').classList.remove('hidden');
            document.getElementById('btn-mode-analytics').classList.remove('hidden');
        }
        if (btnExitRole) btnExitRole.classList.remove('hidden');
        document.getElementById('btn-mode-teacher').classList.add('active');
        const view = document.getElementById('view-teacher');
        view.classList.remove('hidden');
        view.classList.add('active');
        window.TeacherModule.init();
    } else if (mode === 'student') {
        // Completely hide nav switcher for students
        if (modeNav) modeNav.classList.add('hidden');
        if (btnExitRole) btnExitRole.classList.remove('hidden');
        const view = document.getElementById('view-student');
        view.classList.remove('hidden');
        view.classList.add('active');
        window.StudentModule.init();
    } else if (mode === 'analytics') {
        if (modeNav) {
            modeNav.classList.remove('hidden');
            document.getElementById('btn-mode-student').classList.add('hidden');
            document.getElementById('btn-mode-teacher').classList.remove('hidden');
            document.getElementById('btn-mode-analytics').classList.remove('hidden');
        }
        if (btnExitRole) btnExitRole.classList.remove('hidden');
        document.getElementById('btn-mode-analytics').classList.add('active');
        const view = document.getElementById('view-analytics');
        view.classList.remove('hidden');
        view.classList.add('active');
        window.AnalyticsModule.init();
    }
}
window.switchMode = switchMode;

// Global Initialization
document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Activity Model with Default values (use the first preset as default)
    loadActivityIntoSession(PRESET_ACTIVITIES[0]);
    
    // Populate form fields
    document.getElementById('input-source-text').value = TextQuest.activity.sourceText;
    
    // Initialize Mock Analytics
    window.AnalyticsModule.initializeMockData();

    // 2. Setup Global Event Listeners
    document.getElementById('btn-lang').addEventListener('click', toggleLanguage);
    
    document.getElementById('btn-mode-teacher').addEventListener('click', () => switchMode('teacher'));
    document.getElementById('btn-mode-student').addEventListener('click', () => switchMode('student'));
    document.getElementById('btn-mode-analytics').addEventListener('click', () => switchMode('analytics'));
    
    // Exit role gateway button
    const btnExit = document.getElementById('btn-exit-role');
    if (btnExit) {
        btnExit.addEventListener('click', () => switchMode('gateway'));
    }
    
    // Gateway Selector triggers
    const selectTeacherGateway = document.getElementById('btn-gateway-teacher');
    if (selectTeacherGateway) {
        selectTeacherGateway.addEventListener('click', () => switchMode('teacher'));
    }
    const selectStudentGateway = document.getElementById('btn-gateway-student');
    if (selectStudentGateway) {
        selectStudentGateway.addEventListener('click', () => {
            // Save teacher's current session state to local storage before student starts
            saveCustomActivityToStorage();
            switchMode('student');
        });
    }

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

    // 3. Initialize with Gateway Mode on startup
    switchMode('gateway');
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
