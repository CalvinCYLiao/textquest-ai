/**
 * TextQuest AI - AI Engine Module
 * Manages both real client-side API integration (Gemini/OpenAI) and highly-polished offline simulations.
 */

window.AIModule = {
    // 1. Connection Tester
    async testConnection(geminiKey, openaiKey, model) {
        if (!geminiKey && !openaiKey) return false;
        
        try {
            if (geminiKey && model.startsWith('gemini')) {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: "Hello, answer with 'OK'." }] }]
                    })
                });
                const data = await response.json();
                return response.ok && data.candidates && data.candidates[0];
            } else if (openaiKey && model.startsWith('gpt')) {
                const url = `https://api.openai.com/v1/chat/completions`;
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${openaiKey}`
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: [{ role: "user", content: "Hello, answer with 'OK'." }],
                        max_tokens: 5
                    })
                });
                return response.ok;
            }
        } catch (e) {
            console.error("API test failed:", e);
            return false;
        }
        return false;
    },

    // 2. Step 1: Analyze Text
    async analyzeSourceText(text) {
        const hasKey = TextQuest.settings.geminiKey || TextQuest.settings.openaiKey;
        
        // Simulation Delay for realistic AI feel
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check if using default scenario text to provide premium handcrafted values
        const isDefaultText = text.includes("綠溪") || text.length === 0 || text.includes("消失的綠溪河水");
        
        if (!hasKey) {
            // High-fidelity offline simulation
            if (isDefaultText) {
                return {
                    events: [
                        "三年前工廠開工：環境與水資源爭論起點。",
                        "水質檢測異常：排污口導電度暴增三倍與藻類優養化。",
                        "斷流流量暴跌：降雨僅少15%，但河川總流量萎縮70%。"
                    ],
                    concepts: ["環境生態學 (Ecology)", "水質指標 (Biological Indicators)", "氣候變遷 vs 人為超抽 (Causal Analysis)"],
                    misconceptions: [
                        "「河川沒水只是因為少下雨」：引導學生對比降雨少15%與流量暴跌70%的數據矛盾。",
                        "「工廠合法且零排放所以沒事」：引導學生質疑零排放說明書與排汙口檢測異常導電度三倍的對抗證據。"
                    ],
                    passages: [
                        { id: "5", text: "排污口下方導電度暴增三倍，有藻類優養化沉澱物。" },
                        { id: "7", text: "降雨降15%，但總流量暴跌70%。" }
                    ]
                };
            } else {
                // Heuristic parsing for any random text uploaded offline
                return this._runHeuristicAnalysis(text);
            }
        }
        
        // If API key is available, run live analysis!
        const prompt = `你是一個專業的語文與探究學習設計專家。請深度分析以下這段文本，並輸出 JSON 格式的分析結果。包含三個欄位：
1. "events" (數組): 文本中發生的關鍵衝突、事件或事實。
2. "concepts" (數組): 文本隱含的核心學科概念（如優養化、生態鏈）。
3. "misconceptions" (數組): 學生在閱讀這段文本時可能產生的盲點或錯誤直覺，以及教師應如何引導。
4. "passages" (對象數組，含 id 與 text): 適合用來做證據推導的關鍵句。

待分析文本：
${text}`;

        try {
            const rawJson = await this._callLLM(prompt);
            return JSON.parse(this._cleanJsonResponse(rawJson));
        } catch (e) {
            console.error("Live AI analysis failed, falling back to heuristics:", e);
            return this._runHeuristicAnalysis(text);
        }
    },

    // 3. Step 2: Generate Locations and NPCs
    async generateStoryworld(text, template) {
        const hasKey = TextQuest.settings.geminiKey || TextQuest.settings.openaiKey;
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const isDefaultText = text.includes("綠溪") || text.length === 0 || text.includes("消失的綠溪河水");
        
        if (!hasKey) {
            // If offline and it's the default scenario, return pre-configured dataset
            if (isDefaultText) {
                return {
                    locations: [
                        { id: "loc_square", name: "村莊廣場", icon: "🏡", desc: "村民聚集聊天的中心點，也是傳言流傳最廣的地方。" },
                        { id: "loc_factory", name: "化工廠大門口", icon: "🏭", desc: "高大冰冷的鐵門緊閉，煙囪冒著微煙，有保全巡邏。" },
                        { id: "loc_riverbank", name: "綠溪河畔上游", icon: "🌊", desc: "排污口下方的河床裸露，散發微弱異味，岩石黏附著藻類。" },
                        { id: "loc_office", name: "獨立報導辦公室", icon: "📰", desc: "堆滿剪報與調查筆記的雜亂工作室，記者阿哲正埋頭撰稿。" }
                    ],
                    npcs: [
                        {
                            id: "npc_farmer",
                            locationId: "loc_square",
                            name: "老農夫 阿土伯",
                            avatar: "👴",
                            roleBadge: "在地老農夫",
                            description: "在綠溪村生活了七十年的老農，對河流過去的清澈與豐沛瞭如指掌。",
                            voice: "說話帶著濃濃的鄉音，語氣感傷無奈，時常嘆氣。",
                            boundary: "只知道河流過去的水質水量，以及近年農田嚴重乾涸、無法灌溉的慘狀。完全不知道工廠的工程細節或降雨統計。",
                            clueName: "阿土伯的農作日記",
                            clueText: "日記記載：三年前工廠蓋好後，溪水開始常年枯竭，灌溉溝渠經常抽不到水；且以前水質清澈、生物極多，現在都枯死了。",
                            rule: "提問必須提及「以前」、「灌溉」、「農作物」或「水質」。",
                            evidences: ["1", "6"]
                        },
                        {
                            id: "npc_manager",
                            locationId: "loc_factory",
                            name: "高經理",
                            avatar: "💼",
                            roleBadge: "工廠公關發言人",
                            description: "化工廠公關經理，西裝筆挺，說話有禮卻極其防衛，強調經濟貢獻與合規性。",
                            voice: "官腔、禮貌、條理清晰，常用「根據法規」、「科學數據證明」等措辭。",
                            boundary: "極力辯稱工廠完全符合環保標準，將乾涸歸咎於天災乾旱。迴避有關地下暗管或夜間異常抽水的提問。",
                            clueName: "工廠綠色環保說明書",
                            clueText: "說明書聲稱：工廠引進最先進零排放循環水系統，每月為村子創造十個就業機會，乾涸純屬降雨減少15%的天災。",
                            rule: "提問必須提及「排汙」、「廢水」、「沒水」或「工作」。",
                            evidences: ["3", "4"]
                        },
                        {
                            id: "npc_volunteer",
                            locationId: "loc_riverbank",
                            name: "環保志工 雨婷",
                            avatar: "👩",
                            roleBadge: "大學環境系志工",
                            description: "熱血的大學環境科學系學生，長期利用週末監測綠溪生態與水質變化。",
                            voice: "說話急促、滿腔熱忱，喜歡用科學檢測數值，對河川命運感到焦慮。",
                            boundary: "非常清楚排污口下方的生態惡化數據，如導電度超標、優養化沉澱物。懷疑工廠夜間偷排或偷抽水，但苦無實證。",
                            clueName: "水質監測科學數據單",
                            clueText: "數據單顯示：排污口下方導電度在工廠運轉日會暴增三倍，並累積大量綠色優養化藻類，這與工廠宣稱的「零排放」嚴重不符！",
                            rule: "提問必須提及「水質」、「檢測」、「數據」或「藻類」。",
                            evidences: ["5", "8"]
                        },
                        {
                            id: "npc_reporter",
                            locationId: "loc_office",
                            name: "青年記者 阿哲",
                            avatar: "🎤",
                            roleBadge: "獨立調查記者",
                            description: "追求真相的獨立媒體記者，善於對比各方說法矛盾並戳破謊言。",
                            voice: "理智、客觀、帶有探究質疑的口氣，引導學生思考兩極化說法的盲點。",
                            boundary: "掌握了氣象局真實雨量與河川流量的落差。需要學生提供其他角色的證詞，才會吐露關鍵對比數據。",
                            clueName: "氣象局與河川流量對照表",
                            clueText: "對照表揭露：近三年降雨僅比歷史少15%，但河川總流量卻劇烈萎縮了70%！這證明「氣候旱災」只是幌子，背後有巨大的人為超抽或暗管偷水。",
                            rule: "提問必須提及「阿土伯」、「日記」、「工廠說明」或「降雨量」。",
                            evidences: ["3", "7"]
                        }
                    ]
                };
            } else {
                // Heuristics for custom texts offline
                return this._runHeuristicStoryworld(text, template);
            }
        }
        
        // If API key is available, run live generation!
        const prompt = `你是一個優秀的教學遊戲設計師。請依據以下探究文本與設計模板 "${template}"，生成一個包含地點與 NPC 故事世界的設定。
NPC 的對話必須是「限制性鷹架對話」：每個 NPC 都代表一組利益立場，不可直接講出答案，必须在其特定的「披露規則(rule)」被滿足時才給出「關鍵線索」。

輸出格式必須為 JSON，包含：
1. "locations" (數組): 3-4個地點，有 id (以 loc_ 開頭), name, icon (單個 Emoji), desc。
2. "npcs" (數組): 3-4個NPC，有 id (以 npc_ 開頭), locationId, name, avatar (單個 Emoji), roleBadge, description, voice, boundary (知識範圍邊界), clueName (線索物名稱), clueText (線索核心), rule (觸發披露的關鍵字/提問條件), evidences (對齊課文句子id的數組)。

待分析文本：
${text}`;

        try {
            const rawJson = await this._callLLM(prompt);
            return JSON.parse(this._cleanJsonResponse(rawJson));
        } catch (e) {
            console.error("Live AI storyworld generation failed, falling back to heuristics:", e);
            return this._runHeuristicStoryworld(text, template);
        }
    },

    // 4. Bounded Chat Reply (Dynamic Dialogue Engine)
    async getBoundedChatReply(npc, question, history, sourceText) {
        const hasKey = TextQuest.settings.geminiKey || TextQuest.settings.openaiKey;
        
        // Detect rule fulfillment (lowercase check for robustness)
        const ruleFulfill = this._checkRuleFulfillment(npc, question);
        
        if (!hasKey) {
            await new Promise(resolve => setTimeout(resolve, 800));
            return this._runOfflineBoundedChat(npc, question, ruleFulfill);
        }
        
        // Live API Bounded chat!
        const systemPrompt = `你扮演 TextQuest AI 探究故事世界中的一個 Bounded NPC 角色。你的屬性如下：
- 姓名：${npc.name}
- 身份頭像：${npc.avatar}
- 身分稱謂：${npc.roleBadge}
- 背景描述：${npc.description}
- 說話风格：${npc.voice}
- 知識範圍與邊界(嚴禁回答超出此範圍的事)：${npc.boundary}
- 你所持有的關鍵線索名稱：${npc.clueName}
- 關鍵線索具體內容：${npc.clueText}
- 披露條件規則：${npc.rule}

【重要 pedagogical 遊戲規則】：
1. 你是一個「限制性教學代理人」，不是一般的問答機器人！你【絕對不能】直接將關鍵線索或最終答案直接告訴學生。
2. 判斷學生提問是否滿足披露條件（提問是否觸及了關鍵主題/關鍵字）。
   - 【如果滿足】：${ruleFulfill ? "當前判定「已滿足」！" : "當前判定「未滿足」！"} 請引導性地、用你的角色口吻把關鍵線索 "${npc.clueName}: ${npc.clueText}" 透露出來，並提示學生「你可以將這條線索收集起來，與課文證據進行比對綁定」。
   - 【如果不滿足】：以你的說話風格，委婉地推說你不知道，或者反問學生、給予暗示，引導學生往你的披露關鍵字方向思考，例如：「你可以去問問老農夫，或者去工廠拿點環保說明書看看...」。
3. 嚴禁幻覺！你的所有發言必須嚴格基於課文提供的邊界。

探究文本背景：
${sourceText}`;

        const messages = [];
        // Format history
        history.forEach(h => {
            messages.push({
                role: h.sender === 'student' ? 'user' : 'assistant',
                content: h.text
            });
        });
        messages.push({ role: 'user', content: question });

        try {
            const reply = await this._callLLMChat(systemPrompt, messages);
            return {
                text: reply,
                ruleFulfill: ruleFulfill
            };
        } catch (e) {
            console.error("Live Chat API failed, using offline backup:", e);
            return this._runOfflineBoundedChat(npc, question, ruleFulfill);
        }
    },

    // 5. Offline Heuristic Analyzers (Smart Fallback)
    _runHeuristicAnalysis(text) {
        // Automatically extract some nouns from custom text
        const sentences = window.parseSourceTextToSentences(text);
        const excerpt1 = sentences[0] ? sentences[0].text : "核心起點";
        const excerpt2 = sentences[Math.floor(sentences.length/2)] ? sentences[Math.floor(sentences.length/2)].text : "關鍵轉折";
        const excerpt3 = sentences[sentences.length - 1] ? sentences[sentences.length - 1].text : "終極衝突";

        return {
            events: [
                `事件一：${excerpt1} (文本開端的核心背景)`,
                `事件二：${excerpt2} (文本中段的核心關鍵)`,
                `事件三：${excerpt3} (衝突的具體展現)`
            ],
            concepts: ["因果推理 (Causal Reasoning)", "主客觀證據比對 (Evidence Contrast)", "系統性思維 (System Thinking)"],
            misconceptions: [
                "「將單一證詞視為客觀事實」：學生容易輕信某個 NPC 的一面之詞，必須引導對比文本證據。",
                "「忽視文本中的具體數據」：只依據直覺做定性判斷，需引導他們利用證據綁定進行定量分析。"
            ],
            passages: sentences.slice(0, 3).map(s => ({ id: s.id, text: s.text }))
        };
    },

    _runHeuristicStoryworld(text, template) {
        const sentences = window.parseSourceTextToSentences(text);
        
        // Parse sentences to extract basic keyword labels
        const p1 = sentences[0] ? sentences[0].text.substring(0, 15) + "..." : "調查起點";
        const p2 = sentences[1] ? sentences[1].text.substring(0, 15) + "..." : "對立立場";
        const p3 = sentences[sentences.length - 1] ? sentences[sentences.length - 1].text.substring(0, 15) + "..." : "科學驗證";

        return {
            locations: [
                { id: "loc_1", name: "事件現場 (Main Site)", icon: "📍", desc: "衝突爆發的第一現場，遺留了諸多線索。" },
                { id: "loc_2", name: "關係人處所 (Stakeholder)", icon: "🏢", desc: "核心當事人所在的辦公室，氛圍有些嚴肅。" },
                { id: "loc_3", name: "研究調查室 (Inquiry Lab)", icon: "🔬", desc: "科學分析或資料比對的地方，能獲得客觀數據。" }
            ],
            npcs: [
                {
                    id: "npc_witness",
                    locationId: "loc_1",
                    name: "當事人 老張 (Witness)",
                    avatar: "👴",
                    roleBadge: "現場第一目擊者",
                    description: "親身經歷事件的老村民，對變遷深感痛心。",
                    voice: "語氣激動，常提到自己的親身體驗，帶有主觀色彩。",
                    boundary: `只了解第一手的生活變遷與直觀感受：${p1}。不知道背後的科學原理與管理決策。`,
                    clueName: "老張的生活觀察筆記",
                    clueText: `「我親眼看到近年情況變糟，特別是在特定時間段，周遭環境變化極大：${p1}」`,
                    rule: "提問必須提到「以前」、「環境」或「改變」。",
                    evidences: ["1"]
                },
                {
                    id: "npc_opponent",
                    locationId: "loc_2",
                    name: "負責人 趙經理 (Manager)",
                    avatar: "💼",
                    roleBadge: "利益關係代表人",
                    description: "極力撇清責任的主管，強調法規合規性與經濟貢獻。",
                    voice: "理智而防衛，說話像念公文，常拋出數據。",
                    boundary: `只強調法規合規與正面數據：${p2}。迴避具體責任或夜間細節。`,
                    clueName: "官方合規聲明手冊",
                    clueText: `「我們一切運作皆符合國家級法規安全標準：${p2}。乾涸純屬不可抗力的氣候因素。」`,
                    rule: "提問必須提到「責任」、「法規」或「問題」。",
                    evidences: ["2"]
                },
                {
                    id: "npc_expert",
                    locationId: "loc_3",
                    name: "林博士 (Dr. Lin)",
                    avatar: "👩",
                    roleBadge: "中立科學專家",
                    description: "手持客觀數據的專業學者，追求科學真理。",
                    voice: "理智、客觀，說話精確，喜歡提供定量對比。",
                    boundary: `只提供客觀監測數據與系統對照：${p3}。不作主觀的道德批判。`,
                    clueName: "中立科學監測數據",
                    clueText: `「根據系統定量監測，雖然環境背景值有變動，但近年流量萎縮與排汙指數之不尋常落差極大：${p3}」`,
                    rule: "提問必須提到「數據」、「證據」或「研究」。",
                    evidences: ["3"]
                }
            ]
        };
    },

    _checkRuleFulfillment(npc, question) {
        const q = question.toLowerCase();
        
        // Fallback checks for key strings in Chinese/English
        let keywords = [];
        
        if (npc.id.includes('farmer')) {
            keywords = ['以前', '以前水量', '灌溉', '農作物', '水質', '阿土伯', '農作', 'past', 'history', 'crops'];
        } else if (npc.id.includes('manager')) {
            keywords = ['排汙', '廢水', '沒水的原因', '沒水', '就業', '工作', '污染', 'pollution', 'waste', 'jobs'];
        } else if (npc.id.includes('volunteer')) {
            keywords = ['水質', '檢測', '數據', '藻類', '優養化', 'test', 'data', 'algae', 'science'];
        } else if (npc.id.includes('reporter')) {
            keywords = ['阿土伯', '日記', '工廠說明', '降雨', '流量', '對照', 'rain', 'flow', 'climate'];
        } else {
            // General rule splitting
            const ruleText = npc.rule ? npc.rule.replace(/[「」『』提問必須包含]/g, '') : '';
            keywords = ruleText.split(/[、，or且,]/).map(k => k.trim()).filter(k => k.length > 0);
        }

        return keywords.some(kw => q.includes(kw.toLowerCase()));
    },

    _runOfflineBoundedChat(npc, question, ruleFulfill) {
        const isZh = TextQuest.lang === 'zh';
        
        if (ruleFulfill) {
            // Reveal Clue!
            let text = "";
            if (isZh) {
                text = `【關鍵披露】啊！你提到了關鍵點。這正是我一直在注意的！\n\n我這有一份《${npc.clueName_zh || npc.clueName}》，內容寫到：${npc.clueText_zh || npc.clueText}\n\n這是一個極為重要的線索，你可以點擊對話泡泡下方的「收集線索」將它收入你的證據箱，並在右側「探究文本」中尋找能印證或支持它的句子進行「證據綁定」！`;
            } else {
                text = `【Clue Disclosed】Ah! You hit the nail on the head. That's exactly what I've been monitoring!\n\nI have this "${npc.clueName_en || npc.clueName}": ${npc.clueText_en || npc.clueText}\n\nThis is a vital piece of evidence. Click "Collect Clue" below to add it to your Binder, then go to the "Source Text" on the right to link it to the exact text support!`;
            }
            return { text, ruleFulfill: true };
        } else {
            // Generate in-character pedagogical scaffolding (withholding answers)
            let reply = "";
            
            if (npc.id.includes('farmer')) {
                reply = isZh ? 
                    "唉...溪水的事我真的不知道該怎麼說。以前可不是這樣的，那時候溪水好清亮啊...如果你對以前的溪水有興趣，可以多問問我以前的農作跟河水情況。但關於工廠的具體法規或排汙數據，我這個粗人真的不懂，你也許該去問問工廠的負責人，或者那些在河邊檢測的少年環保志工..." :
                    "Sigh... I don't know what to say about the dry river. It was never like this in the past. If you are curious about how the river was before, ask me about my old diaries or the water back then. But as for the factory's regulation codes or emission counts, I am just an old farmer. You might want to go speak to the manager at the factory gates, or that college volunteer who tests the water...";
            } else if (npc.id.includes('manager')) {
                reply = isZh ? 
                    "您好，關於我們公司的運作，我們都是百分之百依法合規的。地方的繁榮是大家共同的期望，我們每個月也都有提供村民就業機會。至於缺水問題，您應該多去參考官方氣象局近年發布的梅雨季節氣候變遷數據。如果您要問我們公司排放廢水的問題，我可以向您出示我們的官方綠色合規手冊證明..." :
                    "Hello. Regarding our operations, we are 100% compliant with local regulations. Local prosperity is our mutual goal, and we provide steady employment for villagers. As for water shortage, you should look at the climate agency's official meteorological data regarding recent severe droughts. If you want to ask about our environmental compliance, I can show you our official handbook...";
            } else if (npc.id.includes('volunteer')) {
                reply = isZh ? 
                    "嗨！我是環境志工雨婷。我正在採集河水標本。這條河這幾年的生態劣化速度超乎想像！但我講話是要憑證據的，我有一張水質檢測數據表，但你得問我一些關於水質檢測、藻類優養化或具體導電度數據的問題，我才能把這張科學數據表交給你！" :
                    "Hi there! I am Yu-Ting, the ecology volunteer. I am taking water samples. The ecological deterioration here over the past years is frightening! But I must base my statements on solid science. I have a water quality data report, but you need to ask me about chemical testing, algae, or conductive metrics before I can show it to you!";
            } else if (npc.id.includes('reporter')) {
                reply = isZh ? 
                    "你好，我是記者阿哲。我正在核實綠溪河流量急劇萎縮的專題報導。我的手頭有一份非常有說服力的氣象對比圖表，但基於新聞倫理，我必須先看到有價值的其他證據——例如，你有沒有拿到村民阿土伯的日記實證？或者工廠高經理發布的官方氣候旱災手冊？你要在提問中提到這些關鍵證詞，我才能把我這張氣象與流量流量對比表對照表秀給你。" :
                    "Hello, A-Che here, investigative journalist. I am fact-checking the bizarre runoff shrinkage of Green Creek. I have a highly compelling rainfall vs flow comparison chart. But for news integrity, I need to know if you've gathered other viewpoints—like Uncle Tu's agricultural diaries or Manager Kao's official climate explanation? Reference those in your prompt and I'll open my meteorological files.";
            } else {
                // Heuristic generic scaffolding response
                reply = isZh ?
                    `我是 ${npc.name}。關於這個案子，我了解有限。在我的知識邊界內，我主要關注特定的領域。你需要提問提及「${npc.rule ? npc.rule.substring(0, 10) : '關鍵字'}」我才能把關鍵線索跟你分享。建議你也去其他地點找找線索。` :
                    `I am ${npc.name}. My expertise is highly bounded. I can only share my specialized clue if you ask me about concepts related to "${npc.rule || 'its core criteria'}". Try traveling to other locations to build your base knowledge first!`;
            }
            return { text: reply, ruleFulfill: false };
        }
    },

    // 6. API Helpers for Live connection
    async _callLLM(prompt) {
        const key = TextQuest.settings.geminiKey || TextQuest.settings.openaiKey;
        const model = TextQuest.settings.activeModel;
        
        if (TextQuest.settings.geminiKey && model.startsWith('gemini')) {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        responseMimeType: "application/json"
                    }
                })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error?.message || "Gemini API Error");
            return data.candidates[0].content.parts[0].text;
        } else if (TextQuest.settings.openaiKey && model.startsWith('gpt')) {
            const url = `https://api.openai.com/v1/chat/completions`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${key}`
                },
                body: JSON.stringify({
                    model: model,
                    messages: [{ role: "user", content: prompt }],
                    response_format: { type: "json_object" }
                })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error?.message || "OpenAI API Error");
            return data.choices[0].message.content;
        }
        throw new Error("No active API configuration available.");
    },

    async _callLLMChat(systemPrompt, messages) {
        const key = TextQuest.settings.geminiKey || TextQuest.settings.openaiKey;
        const model = TextQuest.settings.activeModel;
        
        if (TextQuest.settings.geminiKey && model.startsWith('gemini')) {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
            
            // Format messages for Gemini API
            const contents = [];
            
            // Add system instruction inside systemInstruction parameter (Gemini 1.5 supported)
            const body = {
                systemInstruction: {
                    parts: [{ text: systemPrompt }]
                },
                contents: messages.map(m => ({
                    role: m.role === 'user' ? 'user' : 'model',
                    parts: [{ text: m.content }]
                }))
            };
            
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            
            const data = await response.json();
            if (!response.ok) throw new Error(data.error?.message || "Gemini API Error");
            return data.candidates[0].content.parts[0].text;
        } else if (TextQuest.settings.openaiKey && model.startsWith('gpt')) {
            const url = `https://api.openai.com/v1/chat/completions`;
            
            const body = {
                model: model,
                messages: [
                    { role: "system", content: systemPrompt },
                    ...messages
                ]
            };
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${key}`
                },
                body: JSON.stringify(body)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error?.message || "OpenAI API Error");
            return data.choices[0].message.content;
        }
        throw new Error("No API credentials.");
    },

    _cleanJsonResponse(rawText) {
        // Strip markdown code fences if outputted by LLM
        return rawText
            .replace(/^```json/i, '')
            .replace(/```$/i, '')
            .trim();
    }
};
