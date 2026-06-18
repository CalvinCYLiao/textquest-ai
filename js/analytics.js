/**
 * TextQuest AI - Learning Analytics Dashboard Module
 * Manages classroom dashboard metrics, SVG charts, student log inspectors, and AI teaching reflections.
 */

window.AnalyticsModule = {
    init() {
        this.bindEvents();
        this.renderDashboard();
    },

    bindEvents() {
        // Tab buttons inside dialogue log inspector
        const tabBtns = document.querySelectorAll('.dialogue-inspector-tabs .inspector-tab-btn');
        tabBtns.forEach(btn => {
            btn.onclick = () => {
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const tab = btn.getAttribute('data-tab');
                document.querySelectorAll('.analytics-sidebar-panel .inspector-tab-content').forEach(tc => tc.classList.remove('active'));
                document.getElementById(`inspector-tab-content-${tab}`).classList.add('active');
            };
        });

        // Dropdown selection for reviewing specific students
        const selectStudent = document.getElementById('select-analytics-student');
        if (selectStudent) {
            selectStudent.onchange = () => {
                this.renderSelectedStudent(selectStudent.value);
            };
        }

        // Regenerate Reflection Button
        const btnRegen = document.getElementById('btn-regenerate-note');
        if (btnRegen) {
            btnRegen.onclick = () => {
                this.regenerateReflectionNote();
            };
        }

        // Copy Reflection Button
        const btnCopy = document.getElementById('btn-copy-note');
        if (btnCopy) {
            btnCopy.onclick = () => {
                this.copyReflectionNote();
            };
        }
    },

    // 1. Core Mock Data Initialization
    initializeMockData() {
        const isZh = TextQuest.lang === 'zh';

        // 4 robust, theoretically grounded mock students mapping directly to the ICCE 2026 paper's goals
        TextQuest.analytics.students = [
            {
                id: 'stu_01',
                name_zh: '陳小明 (Xiao-Ming Chen)',
                name_en: 'Xiao-Ming Chen',
                time: '18m',
                score: 95,
                title_zh: '消失的綠溪河水調查：人為抽水與降雨落差的真相',
                title_en: 'The Lost Riverwater: The Stark Gap Between Drought and Pumping',
                body_zh: `我是獨立調查員。經過實地走訪村莊、排污口下游以及調閱資料，我發現綠溪河乾涸的主因並非天災。工廠的高經理聲稱乾涸是氣候暖化降雨減少15%所致，但記者阿哲的對照表揭露，近年降雨雖少15%，河川總流量卻萎縮了70%之多！這55%的巨大落差絕非自然因素能解釋。

此外，阿土伯的日記記載自工廠成立後溪水即乾枯，且指標生物石蠅幼蟲死光。環保志工雨婷在下游監測到工廠運轉日導電度暴增三倍且藻類優養化嚴重，這直接戳破了工廠零排放的宣傳。種種證據表明，工廠極可能在夜間暗中超抽地下水或偷排廢水。我建議村民組成監督委員會，並要求政府對工廠的取水管線與排水進行公開徹查。`,
                body_en: `I am an independent investigator. Based on fieldwork downstream and matching records, the dry river is caused by industrial abuse, not drought. Manager Kao blamed global warming and a 15% rainfall reduction. However, reporter A-Che's spreadsheet reveals that while rainfall dropped 15%, the river flow collapsed by 70%. This massive 55% gap cannot be natural!

Uncle Tu's diary confirms the water vanished right when the factory opened, killing all stonefly larvae. Downstream, volunteer Yu-Ting recorded conductivity values spiking 3x on factory operational days along with severe eutrophication. This refutes the "zero discharge" claim. The factory is highly likely extracting deep groundwater illegally at night. I recommend creating a joint community board to inspect the piping systems.`,
                collectedClueIds: ['clue_farmer', 'clue_volunteer', 'clue_reporter'],
                evidenceLinks: [
                    {
                        clueId: 'clue_farmer',
                        quote_zh: '阿土伯翻開他的農作日記，記錄著以往溪水及腰，甚至能摸到溪底的石蠅幼蟲，但最近一年溪水常乾涸見底，石蠅早已死光。',
                        quote_en: 'Uncle Tu recorded in his diary... water was waist-deep... stoneflies are dead now.',
                        reasoning_zh: '阿土伯的農作日記是村民直接受害的第一手資料，石蠅作為水質環境指標生物死光，證實河流生態因工廠成立而急遽崩潰。',
                        reasoning_en: 'Tu\'s diary provides primary field evidence. The extinction of stonefly larvae highlights immediate ecosystem collapse following the factory build.'
                    },
                    {
                        clueId: 'clue_volunteer',
                        quote_zh: '地方環保志工在工廠排污口下游五百公尺處進行水質檢測，發現導電度在工廠運轉日會暴增三倍，且河床有大量不明的藻類優養化沉澱物。',
                        quote_en: 'Downstream tests showed conductivity spiked 3x on active factory days, with artificial algae sediments.',
                        reasoning_zh: '環保志工水質檢測結果（導電度暴增）直接與工廠「零排放」宣傳相矛盾，提供了強力的定量科學證據。',
                        reasoning_en: 'Direct empirical conflict with the factory brochure claims. Provides quantitative proof of chemical leakage.'
                    },
                    {
                        clueId: 'clue_reporter',
                        quote_zh: '青年記者阿哲在調查報導中指出，雖然降雨量僅微幅下降，但綠溪河的總流量在過去三年卻急劇萎縮了高達70%，斷流現象極不尋常。',
                        quote_en: 'Reporter A-Che noted that while rainfall decreased slightly, river runoff collapsed by 70% in 3 years.',
                        reasoning_zh: '阿哲提供的對照數據展示了15%降雨降幅與70%流量跌幅的劇烈落差，是反駁「完全天災論」的關鍵邏輯支點。',
                        reasoning_en: 'Highlights the scientific gap (15% vs 70%) demonstrating human water theft instead of a purely natural drought.'
                    }
                ],
                chatHistory: {
                    'npc_farmer': [
                        { sender: 'student', text_zh: '阿土伯，以前這裡的水量環境是怎樣的？', text_en: 'Uncle Tu, what was the water like in the past?' },
                        { sender: 'npc', text_zh: '唉，以前的綠溪河水清澈得很，水稻田都是靠河水灌溉的。可是自從三年前工廠來了之後，溪水乾涸得厲害，現在連抽水灌溉都成問題。以前在溪底翻翻石頭都能看見石蠅幼蟲，現在連一隻都找不到了...', text_en: 'Ah, the river used to be crystal clear. Ever since that factory came 3 years ago, it dried up. We can\'t even pump water for crops. Used to find clean indicator insects like stoneflies under rocks; now they are all gone.' },
                        { sender: 'student', text_zh: '您有記錄這些改變嗎？', text_en: 'Did you record these changes?' },
                        { sender: 'npc', text_zh: '有啊！我都記在我的農作日記裡。這可是鐵證！你可以拿去看看，這證明了這三年來溪水是怎麼乾掉的！', text_en: 'Yes! It\'s all in my farming diary. That\'s my lifetime record. Take a look, it proves how the water disappeared.' }
                    ],
                    'npc_volunteer': [
                        { sender: 'student', text_zh: '雨婷，你在這裡測量水質有什麼發現嗎？', text_en: 'Yu-Ting, what did you find in your water tests?' },
                        { sender: 'npc', text_zh: '我的水質檢測單顯示了很可怕的事實。在化工廠運作日，下游的導電度直接翻了三倍！而且累積了大量的優養化綠藻沉澱。這絕對不可能是自然枯竭！', text_en: 'My test sheet shows terrible values. Downstream conductivity spikes 3x on factory days! Eutrophication is rampant. This is definitely chemical discharge, not nature.' }
                    ],
                    'npc_reporter': [
                        { sender: 'student', text_zh: '阿哲，你對降雨量和河川水量有進行數據對比嗎？', text_en: 'A-Che, did you compare rainfall with flow rates?' },
                        { sender: 'npc', text_zh: '這正是最詭異的地方。氣象局的雨量紀錄顯示近幾年降雨量只比歷史平均少了15%。如果是天災，河水不可能少那麼多！但綠溪河水量卻急遽萎縮了70%！這絕對是有人在大規模超抽地下水或截流！', text_en: 'Exactly! Meteorological data shows rainfall only decreased by 15%. If it were natural, runoff shouldn\'t drop much. Yet the flow shrunk by 70%. Someone is illegally pumping groundwater!' }
                    ]
                }
            },
            {
                id: 'stu_02',
                name_zh: '林志強 (Zhi-Qiang Lin)',
                name_en: 'Zhi-Qiang Lin',
                time: '24m',
                score: 80,
                title_zh: '綠溪河畔化工廠運轉與環境變化的關聯調查',
                title_en: 'An Investigation of Factory Operations and Downstream Ecological Stress',
                body_zh: `在本次綠溪河的調查中，我發現了工廠說法與志工實測數據之間的嚴重衝突。化工廠的高經理給出了一份綠色環保說明書，表示他們採用了零排放水循環系統，還為村子創造了10個工作機會。他堅持水資源減少是因為梅雨季降雨減少15%所引發的天災。

但是，我在綠溪河畔訪談了大學志工雨婷，她拿出的監測數據卻直接打臉了工廠。數據單指出，下游500公尺處的導電度在工廠運作日會增加三倍，並且長滿了優養化綠色藻類。這表明工廠內部可能在秘密排放高濃度廢水，或是大量抽水導致稀釋能力下降。

因此，我認為化工廠不能推卸責任。虽然降雨有微幅減少，但工廠造成的化學污染和潛在的水源耗損是綠溪河死寂的罪魁禍首。`,
                body_en: `During my investigation of Green Creek, I uncovered a major clash between corporate statements and volunteer data. Factory Manager Kao presented a Green Brochure claiming a zero-discharge recycling system and 10 local jobs. He insisted the dry river is due to a 15% rainfall reduction.

However, I interviewed university volunteer Yu-Ting on the riverbank. Her monitoring report completely contradicts the factory brochure. The report indicates that conductivity spikes 3x on active factory days, with massive green algae. This suggests the factory is secretly discharging pollutants or consuming excessive water.

In conclusion, the factory cannot escape responsibility. While rainfall dropped slightly, the factory's chemical pollution and secret water depletion is the primary cause of the river's ecological disaster.`,
                collectedClueIds: ['clue_manager', 'clue_volunteer'],
                evidenceLinks: [
                    {
                        clueId: 'clue_manager',
                        quote_zh: '工廠大門的告示牌宣稱，化工廠引進了最先進的環保廢水零排放循環系統，所有工業用水皆在內部回收，絕不對外排汙。',
                        quote_en: 'The factory billboard claims zero discharge and full internal recycling.',
                        reasoning_zh: '這是工廠的官方說詞，用以粉飾太平，與志工在下游五百公尺測得的導電度暴增三倍形成尖銳對比。',
                        reasoning_en: 'Represents the corporate claim of zero pollution, which conflicts directly with empirical volunteer findings.'
                    },
                    {
                        clueId: 'clue_volunteer',
                        quote_zh: '地方環保志工在工廠排污口下游五百公尺處進行水質檢測，發現導電度在工廠運轉日會暴增三倍，且河床有大量不明的藻類優養化沉澱物。',
                        quote_en: 'Volunteer tests downstream showed conductivity jumped 3x on active days with algae overgrowth.',
                        reasoning_zh: '志工的實地檢測單提供了否定工廠環保告示宣稱的關鍵物證。',
                        reasoning_en: 'Direct field evidence disproving the corporate zero-discharge narrative.'
                    }
                ],
                chatHistory: {
                    'npc_manager': [
                        { sender: 'student', text_zh: '高經理，村民懷疑你們超抽河水，是真的嗎？', text_en: 'Manager Kao, villagers suspect you are over-extracting water. Is that true?' },
                        { sender: 'npc', text_zh: '這完全是無稽之談！我們化工廠為地方帶來了十個就業機會，極大促進了經濟。而且我們引進了零排放水循環設備，所有工業廢水內部完全回收。溪水乾涸是因為近年降雨少15%的天災旱災，與我們無關。', text_en: 'Total nonsense! We provided 10 local jobs and stimulated the economy. We use zero-discharge recycling. The dry river is purely an act of god due to a 15% regional drought, nothing to do with us.' },
                        { sender: 'student', text_zh: '有什麼合規的說明手冊嗎？', text_en: 'Do you have compliance brochures?' },
                        { sender: 'npc', text_zh: '有的，這是我們工廠的綠色環保說明書，裡面白紙黑字寫得很清楚，你可以拿回去看，請不要聽信未經證實的流言。', text_en: 'Of course. Here is our factory compliance brochure. Everything is written down transparently. Do not believe unverified rumors.' }
                    ],
                    'npc_volunteer': [
                        { sender: 'student', text_zh: '雨婷，你在排污口測到了什麼？', text_en: 'Yu-Ting, what did you measure at the output pipe?' },
                        { sender: 'npc', text_zh: '工廠自稱零排放，但在運轉日下游導電度卻暴增三倍，長滿了厚厚綠藻沉澱。這絕對是有大量非法化學廢水排出！', text_en: 'The factory claims zero discharge, but conductivity jumps 3x on operational days with massive algae. High levels of illegal industrial discharge must be occurring!' }
                    ]
                }
            },
            {
                id: 'stu_03',
                name_zh: '張美玲 (Mei-Ling Zhang)',
                name_en: 'Mei-Ling Zhang',
                time: '15m',
                score: 65,
                title_zh: '綠溪村乾枯原因調查',
                title_en: 'Investigation of Why Green Creek Dried Up',
                body_zh: `我是調查員。這幾天我到綠溪村進行調查。老農夫阿土伯跟我說，三年前工廠蓋好後，溪水就開始乾枯了。他的日記裡寫到以前水很多，現在水稻田乾得沒法種田，而且水底的石蠅幼蟲全都死光了。

可是工廠的高經理卻說，這只是因為梅雨季不夠雨，降雨比過去少了15%的天災。他還給了我一份說明書說他們在工廠裡面都有做廢水零排放，非常環保，還幫村子創造了10個工作機會。

我覺得兩邊說的都有道理，阿土伯很可憐，工廠可能也要注意水份管理。降雨減少的確是有影響，但工廠的出現也剛好是三年前，這個巧合需要進一步釐清。`,
                body_en: `I am an investigator. I visited Green Creek recently. Elder farmer Uncle Tu told me the river dried up since the factory was built 3 years ago. His diary records that there was plenty of water in the past, but now crop fields are dried out and stoneflies are completely dead.

However, factory Manager Kao said this is just climate drought with a 15% rainfall drop. He gave me a brochure explaining they use zero-discharge recycling. He says the factory is green and created 10 jobs.

I think both sides have valid points. Uncle Tu is struggling, but the drought is also real. The timing matches the factory opening, so we need to inspect this further.`,
                collectedClueIds: ['clue_farmer', 'clue_manager'],
                evidenceLinks: [
                    {
                        clueId: 'clue_farmer',
                        quote_zh: '阿土伯翻開他的農作日記，記錄著以往溪水及腰，甚至能摸到溪底的石蠅幼蟲，但最近一年溪水常乾涸見底，石蠅早已死光。',
                        quote_en: 'Uncle Tu recorded in his diary... water was waist-deep... stoneflies are dead now.',
                        reasoning_zh: '阿土伯的日記提到了溪水乾枯與石蠅死亡的實情。',
                        reasoning_en: 'Tu\'s diary shows the physical signs of river dry-up.'
                    }
                ],
                chatHistory: {
                    'npc_farmer': [
                        { sender: 'student', text_zh: '阿土伯，以前的水很多嗎？', text_en: 'Uncle Tu, was there lots of water before?' },
                        { sender: 'npc', text_zh: '唉，以前溪水及腰呢！稻田隨便都有水。自從工廠開了溪水就沒了，石蠅幼蟲死光，我都寫在我的日記裡。', text_en: 'Oh, it was waist-deep! Plenty of water. Once the factory opened, the water died. Stoneflies are gone, it\'s all in my diary.' }
                    ],
                    'npc_manager': [
                        { sender: 'student', text_zh: '經理，工廠有沒有浪費水？', text_en: 'Manager, does the factory waste water?' },
                        { sender: 'npc', text_zh: '沒有的事！我們是綠色循環零排放，工廠還提供就業。乾旱完全是降雨少15%的氣候旱災所致。你可以看我們的環保說明書。', text_en: 'Absolutely not! We are zero-discharge, and we hire locally. The dry river is due to a 15% rainfall reduction. Check our compliance sheet.' }
                    ]
                }
            },
            {
                id: 'stu_04',
                name_zh: '王大同 (Da-Tong Wang)',
                name_en: 'Da-Tong Wang',
                time: '21m',
                score: 88,
                title_zh: '綠溪河水量急遽下降之人為因素探討',
                title_en: 'Human VS Climate Factors in the Sudden Disappearance of Green Creek',
                body_zh: `我是獨立調查員。這是一份關於綠溪村水源乾枯的深度報告。
調查顯示，綠溪精細化工廠的建立與河流的死亡在時間上高度重疊。老農阿土伯的農作日記記錄了三年前工廠運作後溪水就嚴重乾涸。這推翻了「只是氣候隨機波動」的論點。

最重要的是科學數據上的嚴重對立：化工廠對村民宣稱「零排放且環保」，並將溪水乾枯歸咎於全球暖化降雨減少15%。然而，調查記者阿哲提出的數據卻指明，雖然降雨量僅下降15%，但河川流量居然萎縮了驚人的70%！降雨落差和流量萎縮落差足足有55%之大。

這代表有極大的外在干預在非法截流或抽取水源。同時環保志工雨婷測出排污口下游導電度在工廠運轉日暴增三倍，並伴隨大量優養化沉澱物。這再次擊碎了工廠「完全回收且不排汙」的宣傳。因此我強烈懷疑工廠表面合規，私底下卻超抽河床地下水且偷排化工廢水。`,
                body_en: `I am an independent investigator. This report analyzes the rapid water collapse of Green Creek.
Fieldwork shows the factory opening aligns perfectly with the river's disappearance. Uncle Tu's diary records river drying starting 3 years ago. This rules out simple natural fluctuation.

Crucially, there is a massive numerical conflict. The factory claims to be "green" and blames a 15% rainfall decline. Yet journalist A-Che's table shows that while rainfall dropped 15%, the river flow collapsed by 70%. This leaves an unexplained 55% deficit!

This huge deficit indicates massive unauthorized water extraction. Furthermore, volunteer Yu-Ting recorded conductivity values downstream spiking 3x on factory active days with artificial algae. This disproves the "zero discharge" marketing. The factory is highly likely using compliance as a front while illegally extracting groundwater and dumping chemicals.`,
                collectedClueIds: ['clue_farmer', 'clue_volunteer', 'clue_reporter'],
                evidenceLinks: [
                    {
                        clueId: 'clue_farmer',
                        quote_zh: '阿土伯翻開他的農作日記，記錄著以往溪水及腰，甚至能摸到溪底的石蠅幼蟲，但最近一年溪水常乾涸見底，石蠅早已死光。',
                        quote_en: 'Uncle Tu recorded in his diary... water was waist-deep... stoneflies are dead now.',
                        reasoning_zh: '這本農作日記確立了生態改變的時間點，為調查提供了背景支持。',
                        reasoning_en: 'Confirms the chronological alignment between the factory opening and river dry-up.'
                    },
                    {
                        clueId: 'clue_volunteer',
                        quote_zh: '地方環保志工在工廠排污口下游五百公尺處進行水質檢測，發現導電度在工廠運轉日會暴增三倍，且河床有大量不明的藻類優養化沉澱物。',
                        quote_en: 'Volunteer tests downstream showed conductivity jumped 3x on active days with algae overgrowth.',
                        reasoning_zh: '導電度暴增三倍是工廠暗地裡排放廢水、未實行「零排放」的直接科學物證。',
                        reasoning_en: 'empirical proof refuting the zero discharge claim, showing chemical leakage on active days.'
                    },
                    {
                        clueId: 'clue_reporter',
                        quote_zh: '青年記者阿哲在調查報導中指出，雖然降雨量僅微幅下降，但綠溪河的總流量在過去三年卻急劇萎縮了高達70%，斷流現象極不尋常。',
                        quote_en: 'Reporter A-Che noted that while rainfall decreased slightly, river runoff collapsed by 70% in 3 years.',
                        reasoning_zh: '該對照數據精準點出了自然降水變化（-15%）與河流實際流失量（-70%）的強烈矛盾，揭示了人為超抽的客觀事實。',
                        reasoning_en: 'Exposes the massive numerical mismatch between meteorology (-15%) and real river runoff (-70%).'
                    }
                ],
                chatHistory: {
                    'npc_farmer': [
                        { sender: 'student', text_zh: '阿土伯您好，您的農作日記有提到水質問題嗎？', text_en: 'Uncle Tu, does your diary mention water quality?' },
                        { sender: 'npc', text_zh: '有啊，以前溪底都是代表水質乾淨的石蠅幼蟲，但自從三年前工廠開工，溪水慢慢枯竭，最近一年更是乾涸，那些石蠅幼蟲全部死光光，只剩下臭氣！', text_en: 'Yes. Used to be full of clean stonefly larvae. Since the factory opened 3 years ago, the water dried up and indicator larvae completely died out, leaving only a bad smell.' }
                    ],
                    'npc_volunteer': [
                        { sender: 'student', text_zh: '雨婷，工廠排污口的導電度真的會暴增嗎？', text_en: 'Yu-Ting, does the conductivity really spike downstream?' },
                        { sender: 'npc', text_zh: '是的！只要碰上工廠的運轉日，下游五百公尺的水質導電度就會突然衝高三倍！而且河床上全都是厚厚的藻類，這根本不是天災自然乾涸會有的現象。', text_en: 'Absolutely! On operational days, conductivity downstream spikes 3x. The riverbed is choked with algae sediments. This never happens in natural drought.' }
                    ],
                    'npc_reporter': [
                        { sender: 'student', text_zh: '阿哲，降雨量只減少了15%嗎？', text_en: 'A-Che, did rainfall really drop only by 15%?' },
                        { sender: 'npc', text_zh: '對！氣象局數據很明確，全球暖化使雨水少15%。但綠溪河的總流量卻比三年少70%！如此巨大的斷流，如果不是工廠在夜間暗地裡瘋狂抽取河底地下水，怎麼解釋？', text_en: 'Yes! Official records confirm only a 15% decline. Yet runoff shrunk by 70%. If the factory isn\'t secretly pumping riverbed aquifers, what else explains it?' }
                    ]
                }
            }
        ];

        // 2. Setup Initial Analytics Counts
        TextQuest.analytics.visitsCount = {
            'npc_farmer': 45,
            'npc_manager': 28,
            'npc_volunteer': 38,
            'npc_reporter': 32
        };

        TextQuest.analytics.clueCollects = {
            'clue_farmer': 24,
            'clue_manager': 18,
            'clue_volunteer': 21,
            'clue_reporter': 19
        };

        TextQuest.analytics.evidenceLinksCount = {
            'clue_farmer': 20,
            'clue_manager': 12,
            'clue_volunteer': 17,
            'clue_reporter': 15
        };

        this.generateDefaultTeachingNote();
    },

    // 2. Renders Dashboard Stats, Selects, and Charts
    renderDashboard() {
        const isZh = TextQuest.lang === 'zh';
        const students = TextQuest.analytics.students;
        
        // Compute Metrics Dynamically
        const totalSubs = students.length;
        let totalScore = 0;
        let totalCluesCollected = 0;
        let totalCluesPossible = totalSubs * Object.keys(TextQuest.activity.npcs).length;
        let totalLinkedEvidence = 0;
        let totalLinkedPossible = totalSubs * Object.keys(TextQuest.activity.npcs).length; // assuming ideal target is matching each NPC clue to a text sentence

        students.forEach(s => {
            totalScore += s.score;
            totalCluesCollected += s.collectedClueIds.length;
            totalLinkedEvidence += s.evidenceLinks.length;
        });

        const avgScore = totalSubs > 0 ? Math.round(totalScore / totalSubs) : 0;
        const avgTime = "19.5m"; // Representing typical class session

        const cluePct = totalCluesPossible > 0 ? Math.round((totalCluesCollected / totalCluesPossible) * 100) : 0;
        const evidencePct = totalCluesCollected > 0 ? Math.round((totalLinkedEvidence / totalCluesCollected) * 100) : 0;

        // Render Metric elements
        document.getElementById('metric-students').textContent = `${totalSubs} / ${totalSubs}`;
        document.getElementById('metric-avg-time').textContent = avgTime;
        document.getElementById('metric-clues-pct').textContent = `${cluePct}%`;
        document.getElementById('metric-evidence-pct').textContent = `${evidencePct}%`;

        // Render Dynamic Charts
        this.drawNpcVisitsChart();
        this.drawClueLinksChart();

        // Populate student selector options
        const selectStudent = document.getElementById('select-analytics-student');
        if (selectStudent) {
            const currentSelected = selectStudent.value;
            selectStudent.innerHTML = '';

            students.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s.id;
                
                const name = isZh ? s.name_zh : s.name_en;
                const submittedText = isZh ? `提交時間: ${s.time}` : `Time: ${s.time}`;
                opt.textContent = `${name} - ${submittedText} (Score: ${s.score})`;
                selectStudent.appendChild(opt);
            });

            // Reselect if it exists, otherwise default to first
            if (currentSelected && students.some(s => s.id === currentSelected)) {
                selectStudent.value = currentSelected;
            } else if (students.length > 0) {
                selectStudent.value = students[0].id;
            }

            this.renderSelectedStudent(selectStudent.value);
        }

        // Renders Teaching Note
        this.renderTeachingNote();
    },

    // Dynamic Chart 1: Draw Vertical HTML-based Bar Chart for NPC Visits
    drawNpcVisitsChart() {
        const container = document.getElementById('chart-npc-visits');
        if (!container) return;
        container.innerHTML = '';

        const isZh = TextQuest.lang === 'zh';
        const chartWrapper = document.createElement('div');
        chartWrapper.className = 'bar-chart-container';

        // Retrieve current counts including active plays
        const visits = TextQuest.analytics.visitsCount;
        const npcs = TextQuest.activity.npcs;

        // Find max visit count to scale height
        const maxVal = Math.max(...Object.values(visits), 10);

        Object.keys(npcs).forEach(npcId => {
            const npc = npcs[npcId];
            if (!npc) return;

            const val = visits[npcId] || 0;
            const pct = Math.max(10, Math.round((val / maxVal) * 100)); // Minimum 10% for layout visibility

            const col = document.createElement('div');
            col.className = 'bar-column';
            
            // Shorten name for labels
            const shortName = npc.name.split(' ')[0];

            col.innerHTML = `
                <div class="bar-fill" style="height: ${pct}%;" data-val="${val}" title="${npc.name}: ${val} ${isZh?'次訪談':'visits'}"></div>
                <div class="bar-lbl" title="${npc.name}">${escapeHtml(shortName)}</div>
            `;
            chartWrapper.appendChild(col);
        });

        container.appendChild(chartWrapper);
    },

    // Dynamic Chart 2: Draw Gorgeous SVG horizontal comparative bar chart for clues
    drawClueLinksChart() {
        const container = document.getElementById('chart-clue-links');
        if (!container) return;
        container.innerHTML = '';

        const isZh = TextQuest.lang === 'zh';
        const studentsCount = TextQuest.analytics.students.length;
        const clues = TextQuest.activity.clues;

        const containerWidth = container.clientWidth || 360;
        const containerHeight = 180;

        // Start drawing SVG
        let svg = `<svg width="100%" height="100%" viewBox="0 0 ${containerWidth} ${containerHeight}" xmlns="http://www.w3.org/2000/svg" style="background:transparent; font-family:'Outfit','Noto Sans TC',sans-serif;">`;
        
        // Define filters and gradients for modern visual glows
        svg += `
            <defs>
                <linearGradient id="grad-collect" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stop-color="var(--accent-primary-glow)" stop-opacity="0.6"/>
                    <stop offset="100%" stop-color="var(--accent-primary)"/>
                </linearGradient>
                <linearGradient id="grad-link" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stop-color="rgba(139, 92, 246, 0.2)" stop-opacity="0.6"/>
                    <stop offset="100%" stop-color="var(--accent-ai)"/>
                </linearGradient>
            </defs>
        `;

        const leftMargin = isZh ? 70 : 80;
        const rightMargin = 40;
        const barAreaWidth = containerWidth - leftMargin - rightMargin;
        
        const clueKeys = Object.keys(clues);
        const rowHeight = (containerHeight - 20) / Math.max(1, clueKeys.length);

        clueKeys.forEach((cid, index) => {
            const clue = clues[cid];
            if (!clue) return;

            const collectCount = TextQuest.analytics.clueCollects[cid] || 0;
            const linkCount = TextQuest.analytics.evidenceLinksCount[cid] || 0;

            // Percentages relative to total classroom size
            const collectPct = studentsCount > 0 ? (collectCount / studentsCount) : 0;
            const linkPct = studentsCount > 0 ? (linkCount / studentsCount) : 0;

            const yPos = 15 + index * rowHeight;
            const barHeight = 8;
            const gap = 3;

            // Width of bars in pixels
            const wCollect = Math.max(4, collectPct * barAreaWidth);
            const wLink = Math.max(4, linkPct * barAreaWidth);

            const name = isZh ? clue.name_zh : clue.name_en;
            const shortName = name.length > 8 ? name.substring(0, 7) + '...' : name;

            // Clue label on the left
            svg += `<text x="${leftMargin - 10}" y="${yPos + barHeight + gap}" fill="var(--text-main)" font-size="10" text-anchor="end" font-weight="600">${escapeHtml(shortName)}</text>`;

            // Comparative dual horizontal bars
            // Bar 1: Collection Pct (Emerald)
            svg += `<rect x="${leftMargin}" y="${yPos}" width="${wCollect}" height="${barHeight}" rx="2" fill="url(#grad-collect)"/>`;
            // Bar 2: Link Pct (Mystic Purple)
            svg += `<rect x="${leftMargin}" y="${yPos + barHeight + gap}" width="${wLink}" height="${barHeight}" rx="2" fill="url(#grad-link)"/>`;

            // Percentage data label on the right
            const showPct = Math.round(collectPct * 100);
            const showLinkPct = Math.round(linkPct * 100);
            svg += `<text x="${leftMargin + Math.max(wCollect, wLink) + 5}" y="${yPos + barHeight + gap}" fill="var(--text-muted)" font-size="9" text-anchor="start">${showPct}% | ${showLinkPct}%</text>`;
        });

        // Add bottom legends
        const legendY = containerHeight - 5;
        svg += `
            <rect x="${leftMargin}" y="${legendY - 8}" width="8" height="8" rx="2" fill="var(--accent-primary)"/>
            <text x="${leftMargin + 12}" y="${legendY}" fill="var(--text-muted)" font-size="9">${isZh?'收集率':'Collected'}</text>

            <rect x="${leftMargin + 70}" y="${legendY - 8}" width="8" height="8" rx="2" fill="var(--accent-ai)"/>
            <text x="${leftMargin + 82}" y="${legendY}" fill="var(--text-muted)" font-size="9">${isZh?'對齊率':'Grounded'}</text>
        `;

        svg += `</svg>`;
        container.innerHTML = svg;
    },

    // 3. Dialogue & Report Inspector details loader
    renderSelectedStudent(studentId) {
        const isZh = TextQuest.lang === 'zh';
        const student = TextQuest.analytics.students.find(s => s.id === studentId);
        if (!student) return;

        // Render Chat Tab Content
        const chatDisplay = document.getElementById('analytics-chat-log-display');
        chatDisplay.innerHTML = '';

        const npcs = TextQuest.activity.npcs;
        let dialogueTurns = 0;

        // Render dynamic dialogue bubbles
        Object.keys(student.chatHistory).forEach(npcId => {
            const npc = npcs[npcId];
            if (!npc) return;

            const npcName = npc.name;
            const history = student.chatHistory[npcId];

            // Divider of NPC start
            const div = document.createElement('div');
            div.className = 'inspector-chat-bubble system';
            div.textContent = isZh ? `─── 訪談角色：${npcName} ───` : `─── Interviewing ${npcName} ───`;
            chatDisplay.appendChild(div);

            history.forEach(h => {
                dialogueTurns++;
                const bub = document.createElement('div');
                bub.className = `inspector-chat-bubble ${h.sender}`;
                
                // Show localized text
                let bubbleText = h.sender === 'student' ? 
                    (isZh ? (h.text_zh || h.text) : (h.text_en || h.text)) : 
                    (isZh ? (h.text_zh || h.text) : (h.text_en || h.text));
                
                bub.innerHTML = `<strong>${h.sender === 'student' ? (isZh?'學':'Stu') : npc.avatar} : </strong> ${escapeHtml(bubbleText)}`;
                chatDisplay.appendChild(bub);
            });
        });

        if (dialogueTurns === 0) {
            chatDisplay.innerHTML = `<div style="font-size:0.75rem; color:var(--text-muted); font-style:italic; padding:10px;">${isZh?'該學生未與任何 NPC 進行對話':'No dialogue history recorded for this student.'}</div>`;
        }

        // Render Report Tab Content
        const reportTitle = isZh ? student.title_zh : student.title_en;
        const reportBody = isZh ? student.body_zh : student.body_en;

        document.getElementById('inspector-report-title').textContent = reportTitle;
        document.getElementById('inspector-report-meta').textContent = isZh ? 
            `引用線索數: ${student.collectedClueIds.length} | 課文證據連結: ${student.evidenceLinks.length}` : 
            `Cited Clues: ${student.collectedClueIds.length} | Grounding Bonds: ${student.evidenceLinks.length}`;

        document.getElementById('inspector-report-body').textContent = reportBody;

        // Render report cited evidence list in inspector
        const evidenceList = document.getElementById('inspector-report-evidence-list');
        evidenceList.innerHTML = '';

        if (student.evidenceLinks.length === 0) {
            evidenceList.innerHTML = `<div style="font-size:0.7rem; color:var(--text-muted); font-style:italic;">${isZh?'此報告尚未關聯任何課文證據連結。':'No source text linkages are associated.'}</div>`;
        } else {
            student.evidenceLinks.forEach(link => {
                const clue = TextQuest.activity.clues[link.clueId];
                if (!clue) return;

                const card = document.createElement('div');
                card.className = 'cite-evidence-card';

                const clueName = isZh ? clue.name_zh : clue.name_en;
                const quoteText = isZh ? (link.quote_zh || link.quote) : (link.quote_en || link.quote);
                const reasonText = isZh ? (link.reasoning_zh || link.reasoning) : (link.reasoning_en || link.reasoning);

                card.innerHTML = `
                    <div class="cite-evidence-name">【${escapeHtml(clueName)}】</div>
                    <div class="cite-evidence-quote">「${escapeHtml(quoteText)}」</div>
                    <div class="cite-evidence-reason">
                        <strong>${isZh?'💡 論證推理:':'💡 Reasoning:'}</strong> ${escapeHtml(reasonText)}
                    </div>
                `;
                evidenceList.appendChild(card);
            });
        }
    },

    // 4. Live updates from student workspace upon playtest submissions!
    pushStudentPlaytestLog(title, body, score) {
        const isZh = TextQuest.lang === 'zh';
        
        // Deep copy collected clues and links to prevent references from resetting
        const colClues = [...TextQuest.student.collectedClueIds];
        
        // Normalize evidence links with bilingual tags for the inspector
        const normalizedLinks = TextQuest.student.evidenceLinks.map(link => {
            return {
                clueId: link.clueId,
                quote_zh: link.quote,
                quote_en: link.quote,
                reasoning_zh: link.reasoning,
                reasoning_en: link.reasoning
            };
        });

        // Setup student log object
        const playtestStudent = {
            id: 'stu_playtest',
            name_zh: '本機遊玩體驗 (Live Playtest)',
            name_en: 'Live Playtest',
            time: Math.round((TextQuest.activity.time * 60 - TextQuest.student.timer) / 60) + 'm',
            score: score,
            title_zh: title,
            title_en: title,
            body_zh: body,
            body_en: body,
            collectedClueIds: colClues,
            evidenceLinks: normalizedLinks,
            chatHistory: JSON.parse(JSON.stringify(TextQuest.student.chatHistory))
        };

        // Check if there is an existing playtest log and overwrite or push
        const existingIdx = TextQuest.analytics.students.findIndex(s => s.id === 'stu_playtest');
        if (existingIdx !== -1) {
            TextQuest.analytics.students[existingIdx] = playtestStudent;
        } else {
            TextQuest.analytics.students.push(playtestStudent);
        }

        // Add dialogue turns & clues & links dynamically to the cumulative counts
        colClues.forEach(cid => {
            if (!TextQuest.analytics.clueCollects[cid]) TextQuest.analytics.clueCollects[cid] = 0;
            TextQuest.analytics.clueCollects[cid]++;
        });

        normalizedLinks.forEach(link => {
            if (!TextQuest.analytics.evidenceLinksCount[link.clueId]) TextQuest.analytics.evidenceLinksCount[link.clueId] = 0;
            TextQuest.analytics.evidenceLinksCount[link.clueId]++;
        });

        Object.keys(TextQuest.student.chatHistory).forEach(npcId => {
            const count = TextQuest.student.chatHistory[npcId].length;
            if (!TextQuest.analytics.visitsCount[npcId]) TextQuest.analytics.visitsCount[npcId] = 0;
            TextQuest.analytics.visitsCount[npcId] += Math.ceil(count / 2); // approximate visits by turns divided by student/npc split
        });

        // Regenerate dashboard
        this.renderDashboard();
        
        // Focus inspector on this live player submission!
        const selectStudent = document.getElementById('select-analytics-student');
        if (selectStudent) {
            selectStudent.value = 'stu_playtest';
            this.renderSelectedStudent('stu_playtest');
        }
    },

    // 5. Post-Activity AI Teaching reflection card note
    generateDefaultTeachingNote() {
        const isZh = TextQuest.lang === 'zh';
        
        if (isZh) {
            TextQuest.analytics.aiTeachingNote = `
<strong>🎯 班級學習表現亮點與鷹架分析：</strong>
<ul>
    <li><strong>探究核心矛盾建立率高</strong>：已有超過 76% 的學生在撰寫報告時，能主動比對「氣候梅雨少15%」與「流量巨幅萎縮70%」的矛盾，展現出高度的科學證據對齊能力。</li>
    <li><strong>對話追問難點</strong>：多數學生首次對話均未能觸發「高經理」的說明書透露條件。需要在課堂上提示學生聚焦在「廢水排汙」或「灌溉危機」等關鍵問題追問。</li>
    <li><strong>證據推理品質 (Evidence Reasoning)</strong>：林志強與張美玲等學生的證據鏈僅做到單向陳述，未做成多維對比。這是課後班級 debrief 的切入核心。</li>
</ul>
<strong>📊 課堂重難點引導引導建議 (Debriefing Strategies)：</strong>
<ol>
    <li><strong>引導認知衝突</strong>：在黑板上列出 15% 與 70% 兩個數據，邀請学生扮演「化工廠公關」與「獨立記者」，現場重現辯論，藉此拆解宣傳詞的邏輯漏洞。</li>
    <li><strong>回歸科學監測</strong>：聚焦志工雨婷檢測出的「導電度暴增三倍」。引導學生思考：如果真是零排放，為何導電度會有規律地在工廠運作日暴增？從而建立嚴密的實證因果論證。</li>
</ol>`;
        } else {
            TextQuest.analytics.aiTeachingNote = `
<strong>🎯 Classroom Inquiry Performance Highlights:</strong>
<ul>
    <li><strong>High Scientific Grounding Rate</strong>: 76% of students resolved the numerical discrepancy between the 15% rainfall decrease and the 70% flow collapse, showing superb evidence synthesis.</li>
    <li><strong>Dialogue Prompting Bottleneck</strong>: Most students struggled initially to trigger Manager Kao's brochure. They require prompting to ask about "wastewater" or "jobs" to pierce the corporate facade.</li>
    <li><strong>Reasoning Quality Gaps</strong>: Some students simply list clues without establishing multi-perspective comparative loops. This is the main teaching intervention area.</li>
</ul>
<strong>📊 Post-Activity Debriefing Strategies:</strong>
<ol>
    <li><strong>Expose Cognitive Mismatches</strong>: Write 15% vs 70% on the board. Pair up students to roleplay Manager Kao and Reporter A-Che to dissect the logical gaps in the drought excuse.</li>
    <li><strong>Re-examine Biological Indicators</strong>: Discuss the indicator larvae death (stoneflies) and Yu-Ting\'s 3x conductivity spikes. Probe how industrial schedules correlate with chemical measurements.</li>
</ol>`;
        }
    },

    renderTeachingNote() {
        const box = document.getElementById('analytics-ai-teaching-note');
        if (box) {
            box.innerHTML = TextQuest.analytics.aiTeachingNote;
        }
    },

    // Mock regeneration of reflections with active titles
    regenerateReflectionNote() {
        const isZh = TextQuest.lang === 'zh';
        const box = document.getElementById('analytics-ai-teaching-note');
        if (!box) return;

        // Show spinner loading simulation
        box.innerHTML = `
            <div style="display:flex; align-items:center; justify-content:center; height:100px; gap:10px; color:var(--accent-ai);">
                <span class="spinner" style="border-top-color:var(--accent-ai);"></span>
                <span>${isZh ? '正在根據本班最新答題表現即時生成教學引導筆記...' : 'Synthesizing classroom performance data and generating debrief pointers...'}</span>
            </div>
        `;

        setTimeout(() => {
            const title = TextQuest.activity.title;
            if (isZh) {
                TextQuest.analytics.aiTeachingNote = `
<strong>🎯 針對全新探究主題《${title}》的 AI 課後教學回饋：</strong>
<ul>
    <li><strong>核心概念理解度</strong>：本班目前已建立良好的證據引用習慣。然而，針對該主題的核心迷思概念，有約 30% 的學生仍容易被 NPC 的防衛性說詞（如降雨偏低）所誤導。</li>
    <li><strong>探究動線分析</strong>：大多數學生選擇優先訪談代表社會常識的角色（如阿土伯），而將專業性高、對抗性強的角色（如公關發言人或記者）排在後面。</li>
    <li><strong>論證理由完整性</strong>：雖然證據關聯率高達 ${Math.round(45 + Math.random() * 30)}%，但在「論證理由 (Reasoning)」的撰寫中，學生多半僅做字面重複，未能展現主動推理。</li>
</ul>
<strong>📊 推薦的協同教學引導步驟 (Teacher Scaffolding Guide)：</strong>
<ol>
    <li><strong>引導兩極視角對立</strong>：在大班討論中，將學生分成支持利益團體與生態維護團體兩組。要求他們各自引用課文證據支持其角色的宣稱。</li>
    <li><strong>探究證據的可信度檢驗</strong>：引導學生評估：阿土伯的感性日記、高經理的合規手冊、環保志工的儀器數據，哪一個證據在科學論證上具有最高的可信度？藉此培養高階批判性思維。</li>
</ol>`;
            } else {
                TextQuest.analytics.aiTeachingNote = `
<strong>🎯 AI Co-Designer Reflection Pointers for active topic "${title}":</strong>
<ul>
    <li><strong>Core Objective Analytics</strong>: The class shows highly solid citation habits. However, roughly 30% of students still get misdirected by defensive NPC arguments (such as meteorology factors).</li>
    <li><strong>Exploration Routing Pattern</strong>: Most students prioritized visiting common community characters (like Uncle Tu) first, leaving complex scientific or investigative figures for the end.</li>
    <li><strong>Evidence Explanation Depth</strong>: While grounding links reached ${Math.round(45 + Math.random() * 30)}%, reasoning notes showed simple literal repetition rather than critical analysis.</li>
</ul>
<strong>📊 Target Debriefing Actions:</strong>
<ol>
    <li><strong>Structure Structured Debates</strong>: Break the class into corporate defense vs. ecological protection. Prompt them to utilize conflicting source paragraphs to argue their cases.</li>
    <li><strong>Analyze Source Reliability</strong>: Ask students to weigh qualitative farmer diaries, corporate green compliance sheets, and volunteer empirical metrics, ranking their scientific value.</li>
</ol>`;
            }
            this.renderTeachingNote();
        }, 1200);
    },

    copyReflectionNote() {
        const isZh = TextQuest.lang === 'zh';
        const box = document.getElementById('analytics-ai-teaching-note');
        if (!box) return;

        // Strip HTML tags for clean copy
        const cleanText = box.innerText;
        navigator.clipboard.writeText(cleanText)
            .then(() => {
                alert(isZh ? '教學反思筆記已成功複製到剪貼簿！' : 'AI Teaching Note copied to clipboard!');
            })
            .catch(err => {
                console.error("Failed to copy note: ", err);
            });
    }
};
