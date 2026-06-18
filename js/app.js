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
        mapImage: 'assets/green_creek_map.png',
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
        mapImage: 'assets/soil_pollution_map.png',
        title: '綠溪庄土壤污染謎團 (The Lost Soil Quality)',
        target: '國中八年級 (Grade 8)',
        time: 30,
        goals: '學生應能探究農地枯萎的化學原因，評估工廠聲明與老張日記的矛盾，並對齊土壤報告數據。',
        product: '請撰寫一份基於 C-E-R（主張-證據-推理）的土壤污染調查結論，向村委會報告鎘污染的來源。',
        sourceText: `1. 綠溪村南側的一大片農田近年來出現了詭異的災情，部分作物的葉片大面積出現枯黃萎縮與生長畸形，導致秋季收成量急劇下滑，引起當地農民強烈的恐慌與擔憂。\n2. 這些受災農地的西側，緊鄰著一家成立約五年的「鑫源電鍍廠」，該廠在日常生產中主要進行各種金屬表面處理、酸洗以及高難度的電鍍加工程序。\n3. 面對村民的質疑，鑫源電鍍廠對外發表了嚴正的公開聲明，堅稱廠內所有的重金屬電鍍液與強酸廢水，皆經過了嚴格的高溫中和及化學沉澱處理，絕無任何外洩情事。\n4. 然而，農業改良場的土壤與作物專家在枯黃作物的根系泥土中，採集了數個深層土壤樣本，實驗室化驗結果卻顯示土壤中的重金屬鎘（Cd）含量已超標高達安全值五倍。\n5. 隨後，一名在鑫源電鍍廠工作的內部員工悄悄透露，工廠內部深處其實挖掘了一口未向政府登記的非法深井，且廠內的露天廢水池在暴雨季節經常出現溢流現象。\n6. 受災最嚴重的農民老張表示，自從該電鍍廠開始運作以來，他用來灌溉作物的地下水井水質便開始微微變色，有時甚至能聞到一股刺鼻的化學氣味。\n7. 調查記者阿哲的深入報告中指出，一旦鎘等重金屬進入土壤，就無法輕易被雨水沖刷或稀釋，它們會長期殘留於泥土深處，並通過作物的根部被植株吸收，進而危害人體。`,
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
                description_zh: '在電鍍廠隔壁種田的農民，發現近年來土壤質地與水質有巨大變化。',
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
        mapImage: 'assets/fake_news_map.png',
        title: '社群媒體假新聞判讀 (AI Fake News Literacy)',
        target: '國中九年級 (Grade 9)',
        time: 30,
        goals: '學生應能區分事實與流言，交叉對照疾管署數據與查核中心影像反搜報告，找出機器人帳號轉發意圖。',
        product: '請完成一份事實查核判定書，駁斥有關綠溪村鎘蔬菜致急性腎衰竭的流言，並分析造謠方的動機與網絡手段。',
        sourceText: `1. 社群媒體平台上近日瘋傳著一則聳動的警示訊息，聲稱「綠溪村生產的蔬菜含有劇毒重金屬鎘，民眾食用後會導致急性腎衰竭」，這段文字隨即引發了大眾的集體恐慌並導致綠溪村蔬菜嚴重滯銷。\n2. 經過追溯，這則恐慌消息最早發布於一個名為「綠溪健康小幫手」的匿名社群帳號，並且在貼文中附帶了一張病患躺在病床上進行緊急搶救的聳動照片以增加可信度。\n3. 針對此謠言，衛生福利部疾病管制署隨即發表澄清聲明，表示近期全國醫療院所並未接獲任何因食用綠溪村蔬菜而導致急性腎衰竭或重金屬中毒的通報集體病例。\n4. 獨立事實查核機構對該貼文進行了調查，發現貼文中所使用的搶救照片，實際上是五年前國外一宗與綠溪村完全無關的過期食物中毒事件舊新聞照片，涉嫌移花接木。\n5. 查核人員進一步追查發現，該匿名社群帳號註冊時所使用的 IP 網段，被追蹤到來自於一家名為「快遞行銷公司」的公關與輿論操作行銷機構。\n6. 當地菜農自救會代表李大姐無奈地指出，這則毒蔬菜謠言大肆散布的時機，非常精準地落在了當地菜農競爭對手「洋洋生鮮電商」舉辦大促銷的前夕。\n7. 資訊工程專家在分析社群網路傳播軌跡後指出，該謠言貼文在短短數小時內便獲得了上萬次分享轉發，呈現出非常典型的社群機器人帳號集體協同操作傳播特徵。`,
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
    },
    {
        id: 'activity_bullying',
        mapImage: 'assets/bullying_map.png',
        title: '校園霸凌與旁觀者效應 (Campus Bullying & Bystander Effect)',
        target: '國中八年級 (Grade 8)',
        time: 30,
        goals: '學生應能分析關係霸凌的多重結構（霸凌者、被霸凌者、旁觀者），並提出基於輔導紀錄與角色訪談的改善建議。',
        product: '請撰寫一份校園關係霸凌事件的個案輔導報告，剖析旁觀者冷漠的關鍵心理原因與具體輔導介入對策。',
        sourceText: `1. 八年三班近日發生了一起令人深感遺憾的校園網路關係霸凌事件，受害學生小芸因為遭受匿名貼文的惡意攻擊，身心受創並開始拒絕到校上學。\n2. 這起事件最初起源於校內的匿名告白臉書粉專，有黑粉發文惡意影射小芸偷竊了班上同學辛辛苦苦收齊的班費，隨後該謠言在班級 LINE 群組內被迅速發酵討論。\n3. 班級導師在得知此事的第一時間立即召開了澄清座談會，公開證實班費實際上是被遺忘在保管箱內，小芸完全是清白的，但謠言的傷害卻已經造成。\n4. 輔導室最新出具的學生諮商紀錄中指出，小芸在此次事件後出現了嚴重的社交焦慮與自我懷疑，並在筆記中流露出感到被全班孤立與集體背叛的絕望情緒。\n5. 班長阿翔在私下訪談中悄悄透露，其實班上有很多同學早就在私底下知道小芸是冤枉的，但因為害怕自己也受到群體排擠，所以最終大家都選擇保持沉默。\n6. 鄰座的小玲也表示，霸凌貼文發布後，班上有幾位核心學生帶頭開始對小芸進行言語冷嘲熱諷，並積極拉攏其他同學加入集體排擠與忽視她的行列。\n7. 社會心理學專家對此現象分析指出，在群體霸凌事件中，多數旁觀者的冷漠通常源於「責任分散效應」，大家都抱持著會有其他人站出來的預期心理，導致集體不作為。`,
        locations: [
            {
                id: 'loc_classroom',
                icon: '🏫',
                name_zh: '八年三班教室',
                name_en: 'Classroom',
                desc_zh: '下課時鬧哄哄的教室，班長阿翔正看著空著的小芸座位嘆氣。',
                desc_en: 'Noisy classroom during break, where leader Hsiang looks at Yun\'s empty desk.',
                npcs: ['npc_hsiang'],
                clues: []
            },
            {
                id: 'loc_counseling',
                icon: '👩‍🏫',
                name_zh: '學校輔導室',
                name_en: 'Counseling Room',
                desc_zh: '環境溫馨安靜，放著輕柔音樂，陳老師正整理小芸的諮商紀錄。',
                desc_en: 'Cozy and quiet space where Counselor Chen files student reports.',
                npcs: ['npc_counselor'],
                clues: []
            },
            {
                id: 'loc_seat',
                icon: '👧',
                name_zh: '教室鄰近座位',
                name_en: 'Neighbor Seat',
                desc_zh: '靠近走廊的窗邊座位，小玲正低著頭整理書包，看起來心事重重。',
                desc_en: 'Desks by the window, where classmate Ling looks tense and worried.',
                npcs: ['npc_ling'],
                clues: []
            }
        ],
        npcs: {
            'npc_hsiang': {
                id: 'npc_hsiang',
                locationId: 'loc_classroom',
                name: '班長 阿翔 (Leader A-Hsiang)',
                avatar: '👦',
                roleBadge_zh: '班級幹部/班長',
                roleBadge_en: 'Class Leader',
                description_zh: '班上的班長，為人正直但有些懦弱，在事件中選擇了保持沉默。',
                description_en: 'The class leader, honest but somewhat timid. Chose to remain silent during the incident.',
                voice_zh: '說話聲音低沉，語氣無奈，帶有深深的自責與不安。',
                voice_en: 'Low voice, apologetic tone, showing self-blame and worry.',
                boundary_zh: '只知道班上同學私底下的議論，以及大家因為害怕被核心團體排擠而選擇沉默的氛圍。完全不清楚輔導室對小芸的諮商結果或專家的心理學分析。',
                boundary_en: 'Only knows classmate discussions and the peer pressure forcing silence. Knows nothing about counseling logs or academic psychology concepts.',
                clueName_zh: '班長阿翔的私下告白',
                clueName_en: 'Class Leader\'s Private Confession',
                clueText_zh: '阿翔透露：其實大家私下都知道班費是搞錯了，但沒有人敢公開幫小芸說話，因為誰出頭就會成為下一個被匿名粉專攻擊和排擠的對象。',
                clueText_en: 'Hsiang reveals: Most classmates knew the accusations were false, but no one dared to speak up publicly out of peer pressure and cyber-ostracism fears.',
                rule_zh: '提問內容必須提到「班費」、「沉默」、「害怕」或「粉專」。',
                rule_en: 'Must mention "class fee", "silent", "afraid", or "page".',
                evidences: ['3', '5']
            },
            'npc_counselor': {
                id: 'npc_counselor',
                locationId: 'loc_counseling',
                name: '輔導老師 陳老師 (Counselor Chen)',
                avatar: '👩‍🏫',
                roleBadge_zh: '專業輔導教師',
                roleBadge_en: 'School Counselor',
                description_zh: '溫柔耐心的輔導老師，對小芸進行心理諮商，掌握其受創的心理狀態。',
                description_en: 'Gentle counselor documenting the victim\'s psychological distress.',
                voice_zh: '說話溫和、平靜，帶有同理心，語速適中，常使用諮商專業術語。',
                voice_en: 'Gentle, empathetic, and uses professional counseling terms.',
                boundary_zh: '只知道小芸的心理受創諮商紀錄，以及從小芸處得知被排擠的細節。不知道匿名貼文的註冊源頭或班上學生的心理實驗背景。',
                boundary_en: 'Only knows counseling files and psychological symptoms of the victim. Has no access to server IP logs or scientific bystander studies.',
                clueName_zh: '小芸的心理諮商個案紀錄',
                clueName_en: 'Victim Psychological Consult Log',
                clueText_zh: '個案紀錄：小芸在事件後極度焦慮，出現失眠與拒學傾向，她感到被全班孤立，特別是看到昔日好友也跟著冷眼旁觀時，自尊心受到巨大打擊。',
                clueText_en: 'Consult record: Patient exhibits severe anxiety, insomnia, and school avoidance. The absolute isolation and silence of her close friends crushed her self-esteem.',
                rule_zh: '提問中必須包含「小芸」、「諮商」、「心理」或「紀錄」。',
                rule_en: 'Must mention "Yun", "consult", "psychological", or "record".',
                evidences: ['1', '4']
            },
            'npc_ling': {
                id: 'npc_ling',
                locationId: 'loc_seat',
                name: '鄰座同學 小玲 (Neighbor Ling)',
                avatar: '👧',
                roleBadge_zh: '鄰座旁觀同學',
                roleBadge_en: 'Neighboring Classmate',
                description_zh: '坐在小芸旁邊的同學，目睹了小芸被冷嘲熱諷與排擠的過程，內心很糾結。',
                description_en: 'Classmate sitting next to the victim, witnessed the verbal abuse and isolation.',
                voice_zh: '語氣有些緊張、吞吞吐吐，說話時常往四周張望，害怕被別人聽見。',
                voice_en: 'Nervous, hesitant speaker, constantly looking around to avoid being overheard.',
                boundary_zh: '只知道小芸在教室被核心學生冷嘲熱諷的細節，以及自己內心的糾結。不知道阿翔的告白或輔導紀錄。',
                boundary_en: 'Only knows direct classroom verbal attacks and her own inner guilt. Has no access to school administration files.',
                clueName_zh: '教室冷言排擠觀察日記',
                clueName_en: 'Classroom Bullying Logbook',
                clueText_zh: '小玲日記：班上幾個帶頭的學生在座位旁故意放大音量嘲笑小芸是「班費小偷」，甚至在分組時故意漏掉她，拉攏全班一起孤立她。',
                clueText_en: 'Ling\'s log: Lead bullies loudly labeled Yun as the "class-fee thief" near her seat and intentionally excluded her during team assignments to isolate her.',
                rule_zh: '提問中必須包含「冷嘲熱諷」、「排擠」、「帶頭」或「核心」。',
                rule_en: 'Must mention "insult", "exclude", "lead", or "bully".',
                evidences: ['2', '6']
            }
        }
    },
    {
        id: 'activity_energy',
        mapImage: 'assets/wetland_solar_map.png',
        title: '再生能源與生態衝突 (Wetland Energy vs Conservation)',
        target: '國中八年級 (Grade 8)',
        time: 30,
        goals: '學生應能評估再生能源開發（太陽能發電）與自然生態保護之間的衝突，並基於生態評估提出妥協方案。',
        product: '請撰寫一份關於綠溪濕地太陽能開發計畫的評估報告，分析光電板對濕地生態的具體衝擊，並提出生態共生折衷方案。',
        sourceText: `1. 綠溪村北側的天然濕地是瀕危水鳥「黑面琵鷺」的重要越冬棲地，也是當地發展生態觀光的核心資源。\n2. 政府與能源業者近日推動「綠溪光電計畫」，擬在該濕地架設大面積的地面型太陽能光電板，以提升綠能比例。\n3. 能源開發商保證，光電板採用最先進的無毒防眩光設計，且架高設計絕不影響濕地底棲生物的生存空間。\n4. 生態調查小組的報告指出，光電板反射的微弱偏振光會干擾水鳥掠食的視覺判斷，且大面積遮光會使底棲植物枯死。\n5. 當地漁民老洪抱怨，光電發電板的清洗與保養可能造成化學藥劑外洩，進而污染灌溉魚塭的水質。\n6. 光電計畫顧問強調，該計畫預計能為綠溪村每年帶來五百萬元的租金回饋，並提供十個在地就業機會。\n7. 資源保護專家建議，應將光電架設區域後撤至濕地核心區外兩公里處，並改用非反射性塗層，以達成生態與綠能雙贏。`,
        locations: [
            {
                id: 'loc_wetland',
                icon: '👩‍🌾',
                name_zh: '綠溪生態濕地',
                name_en: 'Eco Wetland',
                desc_zh: '野草齊肩的沿海濕地，成群的水鳥低空掠過，許小姐正用望遠鏡觀察鷺鷥。',
                desc_en: 'Windy coastal marshland where ecologist Hsu counts waterbirds using binoculars.',
                npcs: ['npc_hsu'],
                clues: []
            },
            {
                id: 'loc_power_office',
                icon: '💼',
                name_zh: '光電計畫辦公室',
                name_en: 'Energy Office',
                desc_zh: '堆滿工程藍圖的簡報室，張經理正對著簡報投影片介紹回饋金規畫。',
                desc_en: 'Presentation room filled with solar blueprints and financial projection slides.',
                npcs: ['npc_manager_chang'],
                clues: []
            },
            {
                id: 'loc_fishpond',
                icon: '🐟',
                name_zh: '本地灌溉魚塭',
                name_en: 'Local Fishpond',
                desc_zh: '水面波光粼粼的傳統養殖魚塭，老漁民洪叔正在巡視他的水質打氣泵。',
                desc_en: 'Traditional aquaculture pond where fisherman Hung checks aerators and water tests.',
                npcs: ['npc_hung'],
                clues: []
            }
        ],
        npcs: {
            'npc_hsu': {
                id: 'npc_hsu',
                locationId: 'loc_wetland',
                name: '生態調查員 許小姐 (Ecologist Hsu)',
                avatar: '👩‍🌾',
                roleBadge_zh: '生態調查員',
                roleBadge_en: 'Field Ecologist',
                description_zh: '野外生態調查員，熱愛自然，掌握黑面琵鷺與底棲生態的長期數據。',
                description_en: 'Ecologist tracking endangered waterbird patterns and wetland biology.',
                voice_zh: '專業、嚴謹，對大自然的破壞感到憂心忡忡，語氣堅定並講求數據。',
                voice_en: 'Professional, highly protective of wildlife, quoting ecological metrics.',
                boundary_zh: '只知道水鳥的行為習性與遮光後底棲生物的死傷數據，完全不知道光電廠的財務回饋細節或漁民的魚塭化學成分。',
                boundary_en: 'Only knows avian behaviors and benthic mortality rates under shade. Has no knowledge of factory balance sheets or aquaculture test results.',
                clueName_zh: '黑面琵鷺與底棲生態評估報告',
                clueName_en: 'Ecological Impact Assessment',
                clueText_zh: '生態報告：大面積遮光使濕地底棲植物枯死，且光電板表面的偏振光反射會嚴重誤導水鳥，使其將光電板誤認為水面而俯衝撞擊。',
                clueText_en: 'Eco report: Shading kills benthic flora. Furthermore, polarized light reflection from solar panels misleads waterbirds, causing them to dive and crash.',
                rule_zh: '提問內容必須提到「水鳥」、「琵鷺」、「底棲」或「偏振光」。',
                rule_en: 'Must mention "waterbird", "spoonbill", "benthic", or "polarized".',
                evidences: ['1', '4']
            },
            'npc_manager_chang': {
                id: 'npc_manager_chang',
                locationId: 'loc_power_office',
                name: '專案經理 張經理 (Project Manager Chang)',
                avatar: '👨‍💼',
                roleBadge_zh: '光電專案經理',
                roleBadge_en: 'Solar Project Manager',
                description_zh: '綠能公司的專案經理，口才流利，強調能源轉型與地方回饋的雙重價值。',
                description_en: 'Spokesperson for the energy firm pushing renewable transitions and local rentals.',
                voice_zh: '熱情、自信，極具說服力，常用「綠能減碳」、「地方繁榮」等政策性辭彙。',
                voice_en: 'Enthusiastic, quoting decarbonization metrics and financial compensation.',
                boundary_zh: '強調光電板無毒架高與每年五百萬回饋金的經濟效益，規避有關水鳥撞擊或魚塭化學藥劑污染的質疑。',
                boundary_en: 'Presents rental yields and jobs. Sidesteps questions regarding avian optical interference or chemical cleaning runoffs.',
                clueName_zh: '光電開發地方回饋說明書',
                clueName_en: 'Solar Project Compensation Leaflet',
                clueText_zh: '說明書宣稱：光電板架高設計不影響土地使用，且每年能為社區帶來五百萬回饋金與在地就業，強調光電板防眩光，安全無毒。',
                clueText_en: 'Leaflet: Height-elevated panels preserve soil use. Promises $5M annual community fund, localized jobs, and non-toxic anti-glare specs.',
                rule_zh: '提問中必須包含「回饋金」、「無毒」、「租金」或「就業」。',
                rule_en: 'Must mention "fund", "non-toxic", "rental", or "jobs".',
                evidences: ['3', '6']
            },
            'npc_hung': {
                id: 'npc_hung',
                locationId: 'loc_fishpond',
                name: '當地漁民 洪叔 (Fisherman Hung)',
                avatar: '👨‍🌾',
                roleBadge_zh: '在地養殖漁民',
                roleBadge_en: 'Local Aquaculturist',
                description_zh: '在濕地旁經營魚塭的資深漁民，擔心水源污染會毀掉他的魚蝦收成。',
                description_en: 'Veteran fish farmer worried about chemical runoffs into his ponds.',
                voice_zh: '說話觀點直白，語氣充滿對財團的不信任，時常流露對生計的焦慮。',
                voice_en: 'Rough and direct tone, highly suspicious of energy corporates.',
                boundary_zh: '只知道魚塭的水質要求與以往因化學清洗劑造成的毒魚事件，不知道琵鷺的光學偏振原理或回饋金分配。',
                boundary_en: 'Only knows aquaculture water safety and past corporate chemical accidents. Knows nothing about optical physics.',
                clueName_zh: '鄰近魚塭水質污染隱憂筆記',
                clueName_en: 'Aquaculture Water Quality Notes',
                clueText_zh: '洪叔記錄：光電板在長期運作後需要定期噴灑化學洗劑進行清洗與除污，一旦暴雨沖刷，殘留洗劑流入魚塭會導致魚蝦大量暴斃。',
                clueText_en: 'Hung\'s notes: Solar panels require chemical cleaning agents periodically. Rainwash carrying agent runoffs into adjacent ponds causes mass fish mortality.',
                rule_zh: '提問中必須包含「魚塭」、「洗劑」、「藥劑」或「污染」。',
                rule_en: 'Must mention "pond", "agent", "cleaning", or "pollution".',
                evidences: ['5']
            }
        }
    },
    {
        id: 'activity_ethics',
        mapImage: 'assets/academic_ethics_map.png',
        title: 'AI 工具學術誠信挑戰 (AI Writing Tools & Academic Ethics)',
        target: '國中九年級 (Grade 9)',
        time: 30,
        goals: '學生應能探究生成式 AI 工具對學術誠信的衝擊，權衡學習效率與學術倫理，並基於校規提出規範。',
        product: '請撰寫一份關於中學學術寫作中生成式 AI（如 ChatGPT）使用指南的建議書，分析其對思維訓練的利弊，並制定倫理規範。',
        sourceText: `1. 綠溪中學近日在一場極具指標性的語文寫作比賽中，驚訝地發現有多篇獲得高分的作文具有高度雷同的 AI 語言生成特徵，瞬間引發誠信爭議。\n2. 學校教務處隨後發布了緊急官方聲明，重申學術倫理與誠信原則，嚴格禁止學生在各類學術考試、段考與正式對外比賽中直接複製 AI 生成的內容。\n3. 然而，學校科技教育推廣小組的研討報告指出，合理地引導學生使用 AI 進行前期大綱的生成與寫作引導，能有效降低寫作焦慮並顯著提升自主學習效率。\n4. 語文科召集人林老師則憂心地指出，直接複製 AI 生成文章會徹底剝奪學生的思維鍛鍊過程，使學生逐步失去組織邏輯文字與進行深度獨立寫作的核心能力。\n5. 獲得寫作特優的學生小華悄悄透露，他其實只是利用 AI 進行了部分語氣段落的潤飾與修辭美化，並非全篇搬運，認為這與查閱線上英漢字典無異。\n6. 家長會代表李女士在座談會中表示，許多家長擔心學校如果一味地嚴格禁用 AI，會讓孩子在未來的科技時代中失去科技競爭力，建議改用「有限度開放」原則。\n7. 倫理委員會專家最終建議，學校應儘速建立規範的「AI 協作聲明書」，要求學生在參賽作品中明確標註 AI 的具體協作範圍與所使用提示詞（Prompt）來源。`,
        locations: [
            {
                id: 'loc_academic_office',
                icon: '👨‍💼',
                name_zh: '學校教務處',
                name_en: 'Academic Office',
                desc_zh: '嚴肅整潔的辦公室，教務主任鍾主任正審閱語文比賽的誠信調查報告。',
                desc_en: 'Formal administrative office where Director Chung reviews competition integrity audits.',
                npcs: ['npc_chung'],
                clues: []
            },
            {
                id: 'loc_classroom_ethics',
                icon: '👩‍🏫',
                name_zh: '語文研究室',
                name_en: 'Language Dept',
                desc_zh: '擺滿書籍的科辦公室，學科召集人林老師正憂心地整理學生的手寫筆記。',
                desc_en: 'Language department staffroom where Teacher Lin analyzes student writing habits.',
                npcs: ['npc_teacher_lin'],
                clues: []
            },
            {
                id: 'loc_library',
                icon: '📖',
                name_zh: '學校圖書館',
                name_en: 'Library',
                desc_zh: '安靜溫和的閱覽區，獲獎學生小華正皺著眉頭整理他的寫作草稿與筆記。',
                desc_en: 'Quiet reading area where award-winning student Xiao-Hua organizes his draft logs.',
                npcs: ['npc_xiaohua'],
                clues: []
            }
        ],
        npcs: {
            'npc_chung': {
                id: 'npc_chung',
                locationId: 'loc_academic_office',
                name: '教務主任 鍾主任 (Director Chung)',
                avatar: '👨‍💼',
                roleBadge_zh: '教務主任',
                roleBadge_en: 'Academic Director',
                description_zh: '嚴肅認真的教務主任，極力維護學校的公正與誠信名譽。',
                description_en: 'Serious academic director defending school integrity and test fairness.',
                voice_zh: '說話嚴謹、官腔，強調規章、誠信與處分原則，態度防衛。',
                voice_en: 'Formal and strict tone, repeatedly quoting school regulations.',
                boundary_zh: '強調禁止直接複製的規定與誠信爭議，不知道寫作召集人林老師對學生寫作思維能力的具體教學分析或小華的協作細節。',
                boundary_en: 'Only details school copy-paste bans and warnings. Has no understanding of cognitive writing steps or Xiao-Hua\'s prompts.',
                clueName_zh: '學校學術誠信與禁用聲明書',
                clueName_en: 'School Academic Integrity Policy',
                clueText_zh: '聲明書指出：學校嚴格禁止在比賽與正式評量中直接複製並提交 AI 生成的文章，一經查獲將取消資格，以維護評量的公平性。',
                clueText_en: 'Policy: The school strictly bans direct copy-pasting of AI content in competitive or summative assignments. Violations result in disqualification.',
                rule_zh: '提問中必須包含「誠信」、「禁用」、「規定」或「公平性」。',
                rule_en: 'Must mention "integrity", "ban", "policy", or "fairness".',
                evidences: ['1', '2']
            },
            'npc_teacher_lin': {
                id: 'npc_teacher_lin',
                locationId: 'loc_classroom_ethics',
                name: '語文老師 林老師 (Teacher Lin)',
                avatar: '👩‍🏫',
                roleBadge_zh: '語文科召集人',
                roleBadge_en: 'Language Department Chair',
                description_zh: '資深的語文科老師，擔心過度依賴 AI 會影響學生的語言邏輯與原創思維。',
                description_en: 'Veteran language teacher concerned about student cognitive erosion under AI automation.',
                voice_zh: '溫柔、憂心，強調學生的核心學習歷程與思考的重要性。',
                voice_en: 'Gentle, concerned tone, prioritizing student logic and deep thinking.',
                boundary_zh: '只知道學生直接抄襲 AI 後在文字表達上失去原創性與寫作能力的評估。不了解教務處的行政處置細節或家長會的科技競爭力說法。',
                boundary_en: 'Only knows cognitive writing indicators and linguistic erosion symptoms. Has no admin authority or knowledge of PTA marketing stances.',
                clueName_zh: '學生寫作原創思維評估報告',
                clueName_en: 'Linguistic Cognitive Assessment',
                clueText_zh: '評估報告：直接複製 AI 文章會跳過構思與邏輯組織等大腦鍛鍊歷程，長期下來會使學生的原創寫作能力與文字表達水平顯著萎縮。',
                clueText_en: 'Assessment: Direct replication bypasses brain-based structuring and outline formulation, leading to long-term decline in original self-expression.',
                rule_zh: '提問中必須包含「原創」、「思維」、「鍛鍊」或「抄襲」。',
                rule_en: 'Must mention "original", "thinking", "train", or "plagiarize".',
                evidences: ['4']
            },
            'npc_xiaohua': {
                id: 'npc_xiaohua',
                locationId: 'loc_library',
                name: '獲獎學生 小華 (Student Xiao-Hua)',
                avatar: '👦',
                roleBadge_zh: '參賽獲獎學生',
                roleBadge_en: 'Award-winning Student',
                description_zh: '作文比賽得獎學生，在寫作中使用了 AI 工具，感到自己被冤枉，極力澄清自己不是抄襲。',
                description_en: 'Student who won the writing contest, used AI for polishing and feels misunderstood.',
                voice_zh: '委屈、焦急，試圖用查閱字典的類比來合理化自己的行為。',
                voice_en: 'Defensive, frustrated, comparing AI prompts to checking a thesaurus.',
                boundary_zh: '只知道自己如何向 AI 下提示詞進行語句修飾與修辭，不知道林老師的認知評估或家長會的規範聲明。',
                boundary_en: 'Only knows his own polishing workflow. Knows nothing about department chair reports or PTA directives.',
                clueName_zh: '作文協作提示詞記錄與說明',
                clueName_en: 'AI Writing Prompt Logbook',
                clueText_zh: '小華記錄：他寫作時是自己先寫出大綱與初稿，隨後輸入 AI 要求「優化修辭、增加成語與美化段落」，他認為這只是修辭工具而非作弊。',
                clueText_en: 'Xiao-Hua\'s log: Wrote outline and draft independently, then prompted AI to "beautify rhetoric and add idioms." Views this as editing rather than cheating.',
                rule_zh: '提問中必須包含「提示詞」、「字典」、「修辭」或「美化」。',
                rule_en: 'Must mention "prompt", "dictionary", "rhetoric", or "polish".',
                evidences: ['5']
            }
        }
    },
    {
        id: 'activity_taoyuan_ponds',
        mapImage: 'assets/taoyuan_ponds_map.png',
        title: '桃園埤塘生態與光電開發 (Taoyuan Ponds: Eco-Conservation vs. Solar Power)',
        target: '國小六年級 (Grade 6)',
        time: 30,
        goals: '學生應能分析埤塘的生態與滯洪功能，評估太陽能光電板對特有種與冬候鳥的影響，並提出雙贏的保育建議。',
        product: '請撰寫一份基於證據的建議書，向市政府說明如何在推動埤塘太陽能光電的同時，保護埤塘的特有種（台灣萍蓬草）與冬候鳥棲地。',
        sourceText: `1. 桃園台地在過去擁有「千塘之鄉」的國際美名，這些星羅棋布的埤塘不僅具有蓄水灌溉、防汛滯洪與防災功能，更是調節當地微氣候的重要自然生態屏障。\n2. 近年來政府為了推動再生能源政策，在部分埤塘大面積鋪設了水面型太陽光電板，開發商宣稱此舉能大幅增加綠能發電並有效減少埤塘水份的蒸發流失。\n3. 然而，當地生態志工在長期觀測後指出，光電板大面積覆蓋水面阻擋了陽光照入水中，使得台灣特有種瀕危保育植物「台灣萍蓬草」因缺乏光合作用而逐漸枯萎。\n4. 野鳥學會的最新季度調查報告進一步指出，水面上密密麻麻的太陽能板嚴重阻礙了冬候鳥降落與覓食的視線，導致該區域過冬的珍貴冬候鳥數量減少了將近五成。\n5. 面對質疑，光電開發商代表強調，水面發電設施實際上僅佔用了整個埤塘三分之一的水域面積，且所有浮力模組均採用無毒環保材料，符合國家最高綠能規範。\n6. 當地的農田灌溉小組長則表示，光電板底下的水域因為缺乏日光直射與水流停滯，導致有害藻類與青苔快速孳生，恐怕會直接影響到下游廣大農田的灌溉水質。\n7. 對此，永續生態專家強烈建議，開發規劃應徹底避開冬候鳥的關鍵棲地，建立生態敏感區地圖，並使用新型高透光性且高架化的光電浮力模組。`,
        locations: [
            {
                id: 'loc_pond_site',
                icon: '🦆',
                name_zh: '八德埤塘保育區',
                name_en: 'Bade Pond Reserve',
                desc_zh: '水面漂浮著台灣萍蓬草，遠處可見大片鋪設在水面上的黑色太陽能光電板。',
                desc_en: 'Water lilies floating on the pond, with black floating solar panels in the distance.',
                npcs: ['npc_volunteer_hsu'],
                clues: []
            },
            {
                id: 'loc_solar_hq',
                icon: '🏢',
                name_zh: '綠能開發公司',
                name_en: 'Solar Power Co.',
                desc_zh: '辦公室牆上貼滿了埤塘光電板的發電成效與各項合格認證。',
                desc_en: 'Office decorated with solar efficiency charts and official green energy credentials.',
                npcs: ['npc_company_chang'],
                clues: []
            },
            {
                id: 'loc_water_irr',
                icon: '💧',
                name_zh: '灌溉水利辦公室',
                name_en: 'Canal Irrigation Office',
                desc_zh: '大圳地圖前，堆滿了附近埤塘的水質酸鹼度與溶氧量檢測單。',
                desc_en: 'Office showcasing canal maps, water acidity reports, and oxygen level datasets.',
                npcs: ['npc_chief_chen'],
                clues: []
            }
        ],
        npcs: {
            'npc_volunteer_hsu': {
                id: 'npc_volunteer_hsu',
                locationId: 'loc_pond_site',
                name: '生態志工 許姐姐 (Volunteer Hsu)',
                avatar: '👩',
                roleBadge_zh: '環境守護者',
                roleBadge_en: 'Ecology Volunteer',
                description_zh: '長期觀察桃園埤塘生態的志工，非常關心萍蓬草與冬候鳥的生存狀況。',
                description_en: 'Environmental volunteer monitoring wild birds and local aquatic vegetation.',
                voice_zh: '說話輕柔但堅定，常指著水面流露擔憂的表情。',
                voice_en: 'Soft-spoken but resolute, showing deep concern for the wetland.',
                boundary_zh: '只了解萍蓬草枯萎狀況及候鳥數量銳減的觀測結果，不知道光電板的發電瓦數或水利灌溉系統調度。',
                boundary_en: 'Only knows about water lily decay and bird migration stats. Knows nothing about solar grid power output or canal management.',
                clueName_zh: '萍蓬草光照與候鳥觀測筆記',
                clueName_en: 'Flora & Bird Observation Log',
                clueText_zh: '觀測筆記：浮力光電板下方的陽光穿透率降低了80%，導致稀有的台灣萍蓬草大量枯死；冬候鳥降落面積縮小，水鳥數減少了50%。',
                clueText_en: 'Log notes: Sunlight penetration under floating solar modules dropped by 80%, killing rare lilies. Avian foraging grounds shrank by half.',
                rule_zh: '提問中必須包含「萍蓬草」、「水鳥」、「生態」或「植物」。',
                rule_en: 'Must mention "lily", "birds", "ecology", or "plants".',
                evidences: ['3', '4']
            },
            'npc_company_chang': {
                id: 'npc_company_chang',
                locationId: 'loc_solar_hq',
                name: '張經理 (Manager Chang)',
                avatar: '👨‍💼',
                roleBadge_zh: '光電專案經理',
                roleBadge_en: 'Solar Project Manager',
                description_zh: '光電開發公司的經理，強調綠能對減少碳排放的貢獻與施工材料的安全性。',
                description_en: 'Solar project manager advocating carbon reduction and design safety.',
                voice_zh: '口條清晰、積極推銷綠能，時常強調「合法合規」。',
                voice_en: 'Articulate and enthusiastic about green energy, repeatedly emphasizing official guidelines.',
                boundary_zh: '強調光電板僅佔水域三分之一且材料無毒，迴避關於水質青苔或生態棲地受損的具體觀測。',
                boundary_en: 'Asserts panels cover only one-third of the pond and use non-toxic materials. Evades questions on algae blooms or bird count drops.',
                clueName_zh: '埤塘光電綠色合規說明書',
                clueName_en: 'Pond Solar Compliance Handbook',
                clueText_zh: '說明手冊：水面型光電場只覆蓋埤塘面積的三分之一，保留了生態通道，且所用材料為無毒浮力體，符合國家安全檢測。',
                clueText_en: 'Handbook: The floating solar installation covers only 33% of the water surface, keeping ecological paths open with non-toxic modules.',
                rule_zh: '提問中必須包含「發電」、「無毒」、「合規」或「綠能」。',
                rule_en: 'Must mention "power", "non-toxic", "compliance", or "green energy".',
                evidences: ['2', '5']
            },
            'npc_chief_chen': {
                id: 'npc_chief_chen',
                locationId: 'loc_water_irr',
                name: '陳伯伯 (Chief Chen)',
                avatar: '👴',
                roleBadge_zh: '水利小組長',
                roleBadge_en: 'Canal Section Chief',
                description_zh: '負責大圳分支渠道灌溉調度的小組長，非常關心灌溉水的水質。',
                description_en: 'Irrigation manager checking water supply networks for downstream crop fields.',
                voice_zh: '操著在地台語腔，說話爽朗，但提到水質時會皺起眉頭。',
                voice_en: 'Speaks in a local friendly accent, showing frustration when discussing water purity.',
                boundary_zh: '只關心埤塘水質變化對灌溉稻田的影響，不知道生態敏感地圖的局分或光電板的內部電路設計。',
                boundary_en: 'Only knows how pond water flow changes affect farm crops. Has no knowledge of bird habitats or electrical engineering.',
                clueName_zh: '埤塘水質與溶氧量監測單',
                clueName_en: 'Water Quality & Dissolved Oxygen Sheet',
                clueText_zh: '監測紀錄：光電板下方的水流停滯，導致夏季水溫偏高，光電板底下青苔與藻類大量生，水中溶氧量偏低，恐影響灌溉。',
                clueText_en: 'Test sheet: Water flow is obstructed under panels, raising temperatures and causing heavy algae growth with low dissolved oxygen levels.',
                rule_zh: '提問中必須包含「水質」、「青苔」、「灌溉」或「溶氧」。',
                rule_en: 'Must mention "quality", "algae", "irrigation", or "oxygen".',
                evidences: ['6']
            }
        }
    },
    {
        id: 'activity_taoyuan_pollution',
        mapImage: 'assets/taoyuan_pollution_map.png',
        title: '桃園大圳水質守護戰 (Taoyuan Canal: Water Quality and Industrial Runoff)',
        target: '國小六年級 (Grade 6)',
        time: 30,
        goals: '學生應能分析工業廢水對灌溉水質的污染影響，判讀水質檢測數據（如 pH 值與重金屬離子），並提出防治對策。',
        product: '請撰寫一份「大圳水質檢舉與改善報告」，向環保局說明工廠偷排酸性廢水的證據，並提出防堵偷排的建議。',
        sourceText: `1. 桃園大圳是整個北台灣地區最為關鍵的農田水利灌溉系統，網絡支流交錯，然而近年來大圳沿線相繼設立了許多中小型金屬表面處理與化工廠。\n2. 位於大圳下游灌溉區的菜農們無奈地發現，大圳渠道內的水流有時會呈現混濁的紅褐色，且用來澆灌後的蔬菜葉片會出現不明的焦枯斑點及枯萎死亡。\n3. 面對指控，鄰近的化工廠發表了公開聲明，堅信廠內所有的生產廢水皆通過了專用廢水設備處理，宣稱其對外排放的「雨水溝」完全符合環保安全標準。\n4. 然而，環保局稽查大隊佈設的自動水質監測器顯示，該分流支流的重金屬銅離子（Cu）濃度與電導度，在半夜常有短暫且異常飆高的污染數值出現。\n5. 環境守護志工在工廠後門的雨水排放管處採集到了關鍵樣本，使用檢測包化驗出水質呈現強酸性（pH值低於4.5），懷疑工廠將廢水偷偷排入雨水溝。\n6. 一名化工廠的離職員工私下透露，工廠內部為了省下投藥處理化學廢水的昂貴藥劑費用，主管經常指示員工趁著豪大雨天或深夜人靜時，將未處理的廢水直接抽排至雨水溝。\n7. 農業改良場專家警告，灌溉水中的重金屬會被蔬菜吸收累積，一旦進入營養午餐食材，將嚴重危害學童與市民健康。`,
        locations: [
            {
                id: 'loc_canal_branch',
                icon: '🌊',
                name_zh: '大圳分水分流渠',
                name_en: 'Canal Branch Gate',
                desc_zh: '農田旁的灌溉分水渠道，水流邊緣的石頭上有些微鐵鏽紅的沉澱物。',
                desc_en: 'Water dividing gate near farms, where small reddish iron stains are visible.',
                npcs: ['npc_farmer_wang'],
                clues: []
            },
            {
                id: 'loc_factory_gate',
                icon: '🏭',
                name_zh: '化工廠後門排水溝',
                name_en: 'Chemical Factory Storm Drain',
                desc_zh: '化工廠後牆外隱密的雨水溝，散發出淡淡的酸味，排水管口有白色晶體析出。',
                desc_en: 'Quiet storm drain behind the chemical plant with faint chemical smells and white residues.',
                npcs: ['npc_worker_lee'],
                clues: []
            },
            {
                id: 'loc_epb_office',
                icon: '🚐',
                name_zh: '環保局行動監測車',
                name_en: 'Environmental Mobile Unit',
                desc_zh: '停在大路旁的稽查車，車內擺放著水質快速篩檢試劑與多功能水質分析儀。',
                desc_en: 'Inspection vehicle carrying water sample collection flasks and chemical testing kits.',
                npcs: ['npc_inspector_lin'],
                clues: []
            }
        ],
        npcs: {
            'npc_farmer_wang': {
                id: 'npc_farmer_wang',
                locationId: 'loc_canal_branch',
                name: '王阿姨 (Mrs. Wang)',
                avatar: '👩',
                roleBadge_zh: '大圳旁菜農',
                roleBadge_en: 'Vegetable Farmer',
                description_zh: '在大圳旁種植綠色蔬菜的農民，深受水質不穩定之苦，蔬菜收成常有黑斑。',
                description_en: 'Farmer growing organic greens whose crops suffer from seasonal chemical burns.',
                voice_zh: '說話帶著哭腔，語氣既生氣又無奈，拼命搖頭。',
                voice_en: 'Speaks with distress, feeling angry yet helpless about the water quality.',
                boundary_zh: '只了解自家蔬菜變色、枯黃及大圳水偶爾帶有異味與紅褐色，不知道工廠內部管線配置或環保局的具體儀器讀數。',
                boundary_en: 'Only knows about crop leaf spots and reddish water discoloration. Knows nothing about factory layout or official test parameters.',
                clueName_zh: '菜園葉片焦枯與水質觀測日記',
                clueName_en: 'Crop Spotting & Water Diary',
                clueText_zh: '農作日記：上週三半夜大圳水發出酸臭味，隔天早上引入圳水灌溉的菜地，有大片波菜葉子出現紅褐色燒焦斑點並迅速枯萎。',
                clueText_en: 'Diary: Last Wednesday midnight, the water smelled highly sour. Next morning, spinach watered by the canal had brown spots and died.',
                rule_zh: '提問中必須包含「蔬菜」、「變色」、「氣味」或「斑點」。',
                rule_en: 'Must mention "vegetable", "color", "smell", or "spots".',
                evidences: ['2']
            },
            'npc_worker_lee': {
                id: 'npc_worker_lee',
                locationId: 'loc_factory_gate',
                name: '李叔叔 (Mr. Lee)',
                avatar: '👨',
                roleBadge_zh: '化工廠清潔工',
                roleBadge_en: 'Factory Worker',
                description_zh: '化工廠的清潔工，在工廠工作多年，熟悉後門排水溝在深夜的「不尋常變化」。',
                description_en: 'Cleaner who maintains the outer factory grounds and knows the night routines.',
                voice_zh: '說話聲音壓得很低，四處張望，語氣神祕緊張。',
                voice_en: 'Speaks in a very low whisper, looking around nervously to avoid security.',
                boundary_zh: '只知道深夜十一點後有不明溫熱廢水排出，以及工廠為省錢簡化廢水處理的傳聞，不知道環保法規具體標準或菜農受損面積。',
                boundary_en: 'Only knows of midnight foaming discharges and corporate chemical cost-cutting. Knows nothing of official standard codes or crop losses.',
                clueName_zh: '雨水溝夜間異常排水紀錄',
                clueName_en: 'Nighttime Storm Drain Discharges',
                clueText_zh: '李叔叔筆記：化工廠後方的雨水溝原本只該排雨水，但在深夜十一點後，偶爾會排出溫熱、帶有濃密白色泡沫的淡紅色廢水。',
                clueText_en: 'Lee\'s logs: The storm drain, meant only for rainwater, discharges hot foamy reddish fluids occasionally after 11 PM.',
                rule_zh: '提問中必須包含「雨水溝」、「半夜」、「偷排」或「泡沫」。',
                rule_en: 'Must mention "drain", "midnight", "dumping", or "foam".',
                evidences: ['3', '6']
            },
            'npc_inspector_lin': {
                id: 'npc_inspector_lin',
                locationId: 'loc_epb_office',
                name: '林哥哥 (Inspector Lin)',
                avatar: '👨‍✈️',
                roleBadge_zh: '環保局稽查員',
                roleBadge_en: 'Environmental Inspector',
                description_zh: '環保局青年稽查隊員，工作嚴謹，對查緝工廠偷排污染很有決心。',
                description_en: 'Committed environmental inspector specialized in chemical tracing.',
                voice_zh: '說話專業、條理清晰，隨時記錄筆記，透露出科學求證的精神。',
                voice_en: 'Professional and analytical, quoting technical test figures and sampling logs.',
                boundary_zh: '只掌握水質儀器採樣的酸鹼值、電導度與重金屬離子（銅）超標數據，不了解工廠內部財務或農民農耕的個別損失細節。',
                boundary_en: 'Only knows scientific test parameters like pH, conductivity, and Copper (Cu) counts. Has no agricultural background.',
                clueName_zh: '雨水排水口水質化驗數據表',
                clueName_en: 'Storm Drain Chemical Test Sheet',
                clueText_zh: '檢測報告：化工廠後門雨水管排出的水呈強酸性（pH值多次低於4.5），且重金屬銅離子（Cu）超標達三倍，屬未經處理的酸性電鍍廢水。',
                clueText_en: 'Test report: Runoff from the storm pipe is highly acidic (pH below 4.5) with Copper (Cu) levels exceeding safety thresholds by 3x.',
                rule_zh: '提問中必須包含「檢測」、「酸鹼度」、「銅離子」或「重金屬」。',
                rule_en: 'Must mention "test", "pH", "copper", or "heavy metals".',
                evidences: ['4', '5']
            }
        }
    },
    {
        id: 'activity_taoyuan_drought',
        mapImage: 'assets/taoyuan_drought_map.png',
        title: '石門水庫與大圳的抗旱考驗 (Shimen Reservoir & The Canal: Extreme Weather and Water Allocation)',
        target: '國小六年級 (Grade 6)',
        time: 30,
        goals: '學生應能探究極端氣候對水庫蓄水與大圳供水的衝擊，分析農業停灌休耕與高科技用水的分配衝突，並思考永續水資源調配方案。',
        product: '請撰寫一份「水資源抗旱分配與圳路永續政策建議書」，向水利署提出如何降低大圳漏水率與優化工業水回收的建議。',
        sourceText: `1. 石門水庫主要供應桃園大圳農業灌溉系統，同時也是整個桃園及新北部分地區數百萬居民日常生活、民生與核心工業用水的生命線。\n2. 近年受到全球氣候變遷與極端氣候事件的嚴重影響，梅雨與颱風降雨量嚴重不足，導致石門水庫的蓄水率大跌破兩成，正面臨歷史性的嚴重缺水危機。\n3. 為了優先保障大眾民生用水與龍潭、竹科等科學園區半導體晶圓廠的正常運作，政府不得不宣布大圳灌溉區全面停灌休耕，並給予受災農民休耕補償金。\n4. 桃園大溪的專業稻農對此休耕政策表示強烈抗議，強調農田長期乾涸停灌會導致土壤嚴重鹽鹼化，且辛苦培育的冠軍米水稻品種將面臨絕種失傳危機。\n5. 高科技半導體廠代表則無奈地說明，先進晶圓製造製程一天的耗水量極其龐大，一旦遭遇限水停工，將造成數十億元的國際供應鏈違約與經濟重創。\n6. 水資源局最新發表的調配報告指出，桃園大圳大部分的主支圳路為傳統泥土渠道，在輸送過程中因為地表滲漏與泥沙淤積，平均漏水率竟高達25%。\n7. 永續水利專家建議，政府除了發放一次性休耕補償，應投入資金加速渠道防漏水泥化，並強制高科技廠將製程水回收再利用率大幅提升至90%以上。`,
        locations: [
            {
                id: 'loc_shimen_dam',
                icon: '⛰️',
                name_zh: '石門水庫大壩平台',
                name_en: 'Shimen Dam Deck',
                desc_zh: '水位線退到極低，庫底的黃泥乾涸龜裂，露出一大片黃沙。',
                desc_en: 'Reservoir water levels at an all-time low, exposing dry cracked silt layers.',
                npcs: ['npc_officer_wu'],
                clues: []
            },
            {
                id: 'loc_dry_farm',
                icon: '🌾',
                name_zh: '大溪乾涸農地',
                name_en: 'Daxi Fallow Fields',
                desc_zh: '龜裂的稻田中央，灌溉水渠已經乾枯，只有一部停用生鏽的抽水機。',
                desc_en: 'Cracked paddy soil and dry irrigation channels, with silent pumping units.',
                npcs: ['npc_farmer_huang'],
                clues: []
            },
            {
                id: 'loc_tech_park',
                icon: '🏭',
                name_zh: '龍潭半導體園區',
                name_en: 'Longtan Semiconductor Park',
                desc_zh: '晶圓廠外，數輛巨大的水車正排隊卸水，行政大樓內顯示著水資源回收率。',
                desc_en: 'Semiconductor fab with water transport trucks queued outside and recycling meters online.',
                npcs: ['npc_manager_tsai'],
                clues: []
            }
        ],
        npcs: {
            'npc_officer_wu': {
                id: 'npc_officer_wu',
                locationId: 'loc_shimen_dam',
                name: '吳科長 (Chief Wu)',
                avatar: '👨‍💼',
                roleBadge_zh: '水資源調配官',
                roleBadge_en: 'Water Allocation Chief',
                description_zh: '水資源局調配科科長，負責石門水庫與大圳灌溉系統的配水調度工作。',
                description_en: 'Water bureau official managing reservoir outflows and agricultural canal controls.',
                voice_zh: '語氣焦慮沉重，看著水位報表時連連搖頭，講話富有數據。',
                voice_en: 'Sounds anxious and pressured, presenting raw figures from dam capacity charts.',
                boundary_zh: '只掌握水庫蓄水量下降、氣候變遷降雨減少以及大圳管道25%高漏水率的數據，不了解半導體廠的訂單價值或農地局種流失。',
                boundary_en: 'Only knows storage stats, rainfall models, and the 25% canal leakage rate. Knows nothing of chip price indices or crop breeding.',
                clueName_zh: '大圳輸水漏水率與水庫調度簡報',
                clueName_en: 'Canal Seepage & Reservoir Capacity Slides',
                clueText_zh: '調度簡報：石門水庫目前蓄水量跌破18%；另外，桃園大圳因為老舊渠道多為黃土，輸水途中的蒸發與滲漏損失高達25%。',
                clueText_en: 'Briefing slides: Shimen Dam capacity has dropped below 18%; the unlined mud canals of Taoyuan Canal waste 25% due to seepage.',
                rule_zh: '提問中必須包含「蓄水量」、「漏水」、「滲漏」或「水位」。',
                rule_en: 'Must mention "capacity", "leak", "seepage", or "level".',
                evidences: ['2', '6']
            },
            'npc_farmer_huang': {
                id: 'npc_farmer_huang',
                locationId: 'loc_dry_farm',
                name: '黃伯伯 (Uncle Huang)',
                avatar: '👴',
                roleBadge_zh: '在地老稻農',
                roleBadge_en: 'Local Rice Farmer',
                description_zh: '在大溪種植冠軍越光米多年的老稻農，因為停灌被迫看著稻田乾枯。',
                description_en: 'Award-winning rice farmer forced to watch his fields dry out under fallow orders.',
                voice_zh: '說話聲音沙啞、顫抖，表情悲傷又充滿對農地土地的感情。',
                voice_en: 'Speaks with a shaky, emotional voice, deeply attached to his farming tradition.',
                boundary_zh: '只知道政府停灌補償方案不足以覆蓋農地長久鹽化與冠軍稻米菌種消失的損失，不知道高科技晶片的製造技術與水資源漏水工程。',
                boundary_en: 'Only knows that cash compensation fails to cover soil salinization or seed strain extinction. Knows nothing of wafer manufacturing.',
                clueName_zh: '農田停灌損失與補償爭議紀錄',
                clueName_en: 'Fallow Damage & Compensation Records',
                clueText_zh: '稻農心聲：政府補償每公頃八萬雖然能維持生活，但農地一旦乾涸龜裂太久會加速鹽化，且好不容易培育出的在地優良稻種會消失。',
                clueText_en: 'Farmer\'s log: The 80k NTD per hectare keeps us afloat, but dry cracked soil speeds up salinization and extinguishes local heirloom seeds.',
                rule_zh: '提問中必須包含「休耕」、「補償」、「乾涸」或「土地」。',
                rule_en: 'Must mention "fallow", "compensation", "dry", or "land".',
                evidences: ['3', '4']
            },
            'npc_manager_tsai': {
                id: 'npc_manager_tsai',
                locationId: 'loc_tech_park',
                name: '蔡廠長 (Director Tsai)',
                avatar: '👨‍💼',
                roleBadge_zh: '晶圓廠負責人',
                roleBadge_en: 'Wafer Fab Director',
                description_zh: '半導體晶圓廠的負責人，強調高科技製造對國家經濟的重要性與水回收的努力。',
                description_en: 'Semiconductor plant director emphasizing export output and high recycling rates.',
                voice_zh: '語氣理直氣壯、講求效率，時常引用國際訂單數據與高額投資額。',
                voice_en: 'Direct, efficient, and quoting massive international supply contract values.',
                boundary_zh: '強調每日耗水兩萬噸但水回收率已達85%的科技成果，迴避關於水庫水源過度向工業傾斜導致農業被犧牲的社會爭議。',
                boundary_en: 'Emphasizes that they recycle 85% of their massive 20k tons daily consumption. Evades debates on water allocation bias.',
                clueName_zh: '晶圓廠製程用水回收率手冊',
                clueName_en: 'Wafer Fab Water Recycling Manual',
                clueText_zh: '回收手冊：半導體晶圓廠每日製程耗水兩萬噸，但透過精密過濾與再生，目前製程廢水回收率已達到85%，符合高科技環保標準。',
                clueText_en: 'Recycling manual: The wafer fab consumes 20,000 tons daily, but state-of-the-art membrane filtration recycles 85% of industrial runoff.',
                rule_zh: '提問中必須包含「晶片」、「訂單」、「回收」或「耗水」。',
                rule_en: 'Must mention "chip", "orders", "recycle", or "consumption".',
                evidences: ['5']
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
