/**
 * TextQuest AI - Student Playtest Workspace & Evidence Binder Module
 * Powers travel animations, bounded dialogues, evidence linking, and synthesis reports.
 */

window.StudentModule = {
    init() {
        this.bindEvents();
        this.renderActivitySelector();
        
        // Start by showing selector, hiding briefing & workspace
        document.getElementById('student-activity-selector').classList.remove('hidden');
        document.getElementById('student-briefing').classList.add('hidden');
        document.getElementById('student-workspace').classList.add('hidden');
        document.getElementById('student-success-sheet').classList.add('hidden');
    },

    renderActivitySelector() {
        const grid = document.getElementById('activity-selector-grid');
        if (!grid) return;
        grid.innerHTML = '';
        
        const isZh = TextQuest.lang === 'zh';
        
        // 1. Gather all activities: Presets + Custom
        const activities = [];
        
        // Preset activities
        window.PRESET_ACTIVITIES.forEach(act => {
            activities.push({
                ...act,
                type: 'preset'
            });
        });
        
        // Check for custom activity in localStorage
        const customRaw = localStorage.getItem('tq_custom_activity');
        if (customRaw) {
            try {
                const customAct = JSON.parse(customRaw);
                activities.push({
                    ...customAct,
                    id: 'activity_custom',
                    title: customAct.title || (isZh ? '教師自訂探究活動' : 'Custom Designed Activity'),
                    type: 'custom'
                });
            } catch (e) {
                console.error("Error parsing custom activity:", e);
            }
        }
        
        // 2. Render each activity card
        activities.forEach(act => {
            const card = document.createElement('div');
            card.className = `activity-item-card ${act.type === 'custom' ? 'custom-card' : ''}`;
            
            const badgeLabel = act.type === 'custom' 
                ? (isZh ? '🛠️ 教師自訂設計' : '🛠️ Custom Design') 
                : (isZh ? '⚙️ 系統預設' : '⚙️ Preset');
            
            card.innerHTML = `
                <div class="activity-badge ${act.type}">${badgeLabel}</div>
                <div class="title">${escapeHtml(act.title)}</div>
                <div class="goals-summary">
                    <strong>${isZh ? '🎯 目標' : '🎯 Goal'}:</strong> ${escapeHtml(act.goals)}
                </div>
                <div class="meta-info">
                    <span>👥 ${escapeHtml(act.target)}</span>
                    <span>⏱️ ${act.time} ${isZh ? '分鐘' : 'mins'}</span>
                </div>
            `;
            
            card.onclick = () => {
                this.selectActivity(act);
            };
            
            grid.appendChild(card);
        });
    },

    selectActivity(act) {
        // Load the chosen activity into the active session
        window.loadActivityIntoSession(act);
        
        // Reset student gameplay state for the new activity
        this.resetState();
        
        // Render briefing fields
        this.renderBriefing();
        
        // Transition to briefing screen
        document.getElementById('student-activity-selector').classList.add('hidden');
        document.getElementById('student-briefing').classList.remove('hidden');
    },

    resetState() {
        // Clear any running timers
        if (TextQuest.student.timerInterval) {
            clearInterval(TextQuest.student.timerInterval);
        }

        // Initialize Student state
        TextQuest.student = {
            timer: TextQuest.activity.time * 60,
            timerInterval: null,
            currentLocationId: null,
            currentNpcId: null,
            collectedClueIds: [],
            evidenceLinks: [],
            chatHistory: {},
            synthesisTitle: '',
            synthesisBody: '',
            isSubmitted: false
        };

        const countBadge = document.getElementById('binder-count-badge');
        if (countBadge) countBadge.textContent = '0';
        document.getElementById('student-timer').textContent = `${TextQuest.activity.time}:00`;
    },

    bindEvents() {
        // Start Mission Button
        document.getElementById('btn-start-mission').onclick = () => {
            console.log("Start mission button clicked");
            try {
                document.getElementById('student-briefing').classList.add('hidden');
                document.getElementById('student-workspace').classList.remove('hidden');
                this.startTimer();
                this.renderMap();
                this.renderSourceTextReader();
                this.renderBinder();
                this.updateProgressionFlow();
                console.log("Student playtest workspace initialized successfully");
            } catch (error) {
                console.error("Error in btn-start-mission onclick handler:", error);
                alert((TextQuest.lang === 'zh' ? '啟動探究任務失敗，錯誤資訊：' : 'Failed to start mission: ') + error.message);
            }
        };

        // Back to Selector Button
        const backToSelectorBtn = document.getElementById('btn-back-to-selector');
        if (backToSelectorBtn) {
            backToSelectorBtn.onclick = () => {
                document.getElementById('student-briefing').classList.add('hidden');
                document.getElementById('student-activity-selector').classList.remove('hidden');
                this.renderActivitySelector();
            };
        }

        // Leave Location Button
        document.getElementById('btn-leave-location').onclick = () => {
            TextQuest.student.currentLocationId = null;
            TextQuest.student.currentNpcId = null;
            document.getElementById('active-location-container').classList.add('hidden');
            document.getElementById('empty-interaction-state').classList.remove('hidden');
            this.renderMap();
        };

        // Tabs Header switcher
        const tabBtns = document.querySelectorAll('.student-binder-panel .tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const tab = btn.getAttribute('data-tab');
                document.querySelectorAll('.student-binder-panel .tab-content').forEach(tc => tc.classList.remove('active'));
                document.getElementById(`tab-content-${tab}`).classList.add('active');
            });
        });

        // Chat send trigger
        document.getElementById('btn-chat-send').onclick = () => {
            this.sendStudentMessage();
        };
        document.getElementById('chat-input-text').onkeydown = (e) => {
            if (e.key === 'Enter') this.sendStudentMessage();
        };

        // Modal Synthesis triggers
        document.getElementById('btn-toggle-synthesis').onclick = () => {
            this.openSynthesisPanel();
        };
        document.getElementById('btn-close-synthesis').onclick = () => {
            document.getElementById('synthesis-overlay').classList.add('hidden');
        };

        // Save Synthesis Draft
        document.getElementById('btn-save-draft').onclick = () => {
            TextQuest.student.synthesisTitle = document.getElementById('synth-input-title').value;
            TextQuest.student.synthesisBody = document.getElementById('synth-input-body').value;
            alert(TextQuest.lang === 'zh' ? '草稿儲存成功！' : 'Draft saved successfully!');
            document.getElementById('synthesis-overlay').classList.add('hidden');
        };

        // Submit Synthesis Report
        document.getElementById('btn-submit-report').onclick = () => {
            this.submitFinalReport();
        };

        // Floating Evidence Bind Dialog Close Trigger
        document.getElementById('btn-close-bind-modal').onclick = () => {
            document.getElementById('modal-bind-evidence').classList.add('hidden');
        };

        // Image Zoom Modal trigger
        const zoomImageBtn = document.getElementById('btn-zoom-image');
        if (zoomImageBtn) {
            zoomImageBtn.onclick = () => {
                document.getElementById('modal-image-zoom').classList.remove('hidden');
            };
        }
        const closeZoomBtn = document.getElementById('btn-close-zoom-modal');
        if (closeZoomBtn) {
            closeZoomBtn.onclick = () => {
                document.getElementById('modal-image-zoom').classList.add('hidden');
            };
        }

        // Grounding selection float button mark evidence trigger
        document.getElementById('btn-mark-evidence').onclick = (e) => {
            e.stopPropagation();
            this.openGroundingLinker();
        };

        // Dialog connection builder submit
        document.getElementById('btn-submit-binding').onclick = () => {
            this.saveEvidenceLinking();
        };

        // Back to teacher studio redirects (now Gateway / Selector)
        document.getElementById('btn-back-to-authoring').onclick = () => {
            window.switchMode('gateway');
        };
        document.getElementById('btn-view-analytics-redirect').onclick = () => {
            document.getElementById('student-success-sheet').classList.add('hidden');
            document.getElementById('student-activity-selector').classList.remove('hidden');
            this.renderActivitySelector();
        };
    },

    // 1. Mission Briefing Loading
    renderBriefing() {
        const isZh = TextQuest.lang === 'zh';
        document.getElementById('brief-title').textContent = TextQuest.activity.title;
        document.getElementById('brief-time').textContent = TextQuest.activity.time;
        document.getElementById('brief-target').textContent = TextQuest.activity.target;
        document.getElementById('brief-goals').textContent = TextQuest.activity.goals;
        document.getElementById('brief-product').textContent = TextQuest.activity.product;
    },

    // 2. Playtest Timer ticker
    startTimer() {
        TextQuest.student.timerInterval = setInterval(() => {
            TextQuest.student.timer--;
            
            const mins = Math.floor(TextQuest.student.timer / 60);
            const secs = TextQuest.student.timer % 60;
            const timerEl = document.getElementById('student-timer');
            
            timerEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            
            // Under 5 mins visual warning alert
            if (TextQuest.student.timer < 300) {
                timerEl.style.color = 'var(--accent-danger)';
                timerEl.style.borderColor = 'var(--accent-danger)';
            } else {
                timerEl.style.color = '';
                timerEl.style.borderColor = '';
            }

            if (TextQuest.student.timer <= 0) {
                clearInterval(TextQuest.student.timerInterval);
                alert(TextQuest.lang === 'zh' ? '時間已到！系統將自動為您提交目前的成果。' : 'Time limit reached! Submitting your current progress.');
                this.submitFinalReport();
            }
        }, 1000);
    },

    // 3. Render Exploration Map locations buttons
    renderMap() {
        const grid = document.getElementById('student-map-grid');
        grid.innerHTML = '';
        const isZh = TextQuest.lang === 'zh';

        TextQuest.activity.locations.forEach(loc => {
            const btn = document.createElement('button');
            btn.className = 'location-student-btn glass-card';
            if (TextQuest.student.currentLocationId === loc.id) btn.classList.add('active');

            // Clue counts for this location
            const totalClues = loc.npcs.length; // 1 clue per NPC
            let collectedClues = 0;
            loc.npcs.forEach(npcId => {
                const npc = TextQuest.activity.npcs[npcId];
                if (npc && TextQuest.student.collectedClueIds.includes(npc.clueId)) {
                    collectedClues++;
                }
            });

            btn.onclick = () => {
                if (TextQuest.student.currentLocationId !== loc.id) {
                    this.travelToLocation(loc.id);
                }
            };

            btn.innerHTML = `
                <div class="loc-btn-icon">${escapeHtml(loc.icon)}</div>
                <div class="loc-btn-info">
                    <h4>${escapeHtml(isZh ? loc.name_zh : loc.name_en)}</h4>
                    <p>${escapeHtml(isZh ? loc.desc_zh : loc.desc_en)}</p>
                </div>
                <div class="loc-btn-stat">
                    <span style="color: ${collectedClues === totalClues ? 'var(--accent-primary)' : 'var(--accent-warning)'}; font-weight:700;">
                        📦 ${collectedClues} / ${totalClues}
                    </span>
                    <span style="font-size:0.6rem; color:var(--text-muted);">${isZh?'線索收集':'Clues'}</span>
                </div>
            `;
            grid.appendChild(btn);
        });
    },

    // Compelling travel visual transition
    travelToLocation(locId) {
        const overlay = document.getElementById('travel-overlay');
        overlay.classList.remove('hidden');
        
        // Travel duration of 1.2 seconds for dramatic effect
        setTimeout(() => {
            overlay.classList.add('hidden');
            TextQuest.student.currentLocationId = locId;
            TextQuest.student.currentNpcId = null;
            
            // Show interaction box
            document.getElementById('empty-interaction-state').classList.add('hidden');
            document.getElementById('active-location-container').classList.remove('hidden');
            
            this.renderMap();
            this.renderLocationSplit();
            this.updateProgressionFlow();
        }, 1200);
    },

    // Renders characters & clues details in active location
    renderLocationSplit() {
        const isZh = TextQuest.lang === 'zh';
        const loc = TextQuest.activity.locations.find(x => x.id === TextQuest.student.currentLocationId);
        if (!loc) return;

        document.getElementById('active-loc-icon').textContent = loc.icon;
        document.getElementById('active-loc-name').textContent = isZh ? loc.name_zh : loc.name_en;
        document.getElementById('active-loc-desc').textContent = isZh ? loc.desc_zh : loc.desc_en;

        // Render NPCs
        const npcsList = document.getElementById('location-npcs-list');
        npcsList.innerHTML = '';
        
        loc.npcs.forEach(npcId => {
            const npc = TextQuest.activity.npcs[npcId];
            if (npc) {
                const card = document.createElement('div');
                card.className = `student-npc-card ${TextQuest.student.currentNpcId === npcId ? 'active' : ''}`;
                
                // Show if holding uncollected clue
                const isClueCollected = TextQuest.student.collectedClueIds.includes(npc.clueId);
                
                card.onclick = () => {
                    TextQuest.student.currentNpcId = npcId;
                    this.renderLocationSplit();
                    this.openNpcChat(npcId);
                };

                card.innerHTML = `
                    <div class="student-npc-avatar">${escapeHtml(npc.avatar)}</div>
                    <div class="student-npc-info">
                        <h5>${escapeHtml(npc.name)}</h5>
                        <p>${escapeHtml(isZh ? npc.roleBadge_zh : npc.roleBadge_en)}</p>
                    </div>
                    ${!isClueCollected ? '<span class="student-npc-indicator" title="持有未探索線索"></span>' : ''}
                `;
                npcsList.appendChild(card);
            }
        });

        // Render Clues items lying around in location
        const cluesList = document.getElementById('location-clues-list');
        cluesList.innerHTML = '';

        let cluesCount = 0;
        loc.npcs.forEach(npcId => {
            const npc = TextQuest.activity.npcs[npcId];
            if (npc && npc.clueId) {
                const isCollected = TextQuest.student.collectedClueIds.includes(npc.clueId);
                cluesCount++;
                
                const row = document.createElement('div');
                row.className = `student-clue-item-row ${isCollected ? 'collected' : ''}`;
                row.innerHTML = `
                    <span class="clue-item-icon">${isCollected ? '✅' : '📦'}</span>
                    <span class="clue-item-name">${escapeHtml(isZh ? npc.clueName_zh : npc.clueName_en)}</span>
                    <span style="font-size:0.65rem; font-weight:700; color:${isCollected?'var(--accent-primary)':'var(--accent-warning)'};">
                        ${isCollected ? (isZh?'已收集':'Collected') : (isZh?'待解鎖':'Locked')}
                    </span>
                `;
                
                if (!isCollected) {
                    row.onclick = () => {
                        TextQuest.student.currentNpcId = npcId;
                        this.renderLocationSplit();
                        this.openNpcChat(npcId);
                        // Send scaffolding message to lead student to prompt
                        const history = TextQuest.student.chatHistory[npcId] || [];
                        if (history.length === 0) {
                            this.appendNpcBubble(npc, isZh ? "你好，我是這個地區的當事人。如果你想從我這裡得到關鍵的調查文件或線索物，可以先在提問中問我關於我的經歷，或者滿足我心中的疑問..." : "Hello there. If you seek key documents from me, you must probe my experiences or hit the core of my inquiries...");
                        }
                    };
                }
                cluesList.appendChild(row);
            }
        });
        
        if (cluesCount === 0) {
            cluesList.innerHTML = `<div style="font-size:0.7rem; color:var(--text-muted); font-style:italic; padding:4px;">${isZh?'現場無特殊線索遺留':'No items lying around'}</div>`;
        }
    },

    // 4. Bounded Chat UI Handler
    openNpcChat(npcId) {
        const isZh = TextQuest.lang === 'zh';
        const npc = TextQuest.activity.npcs[npcId];
        if (!npc) return;

        document.getElementById('dialogue-empty-state').classList.add('hidden');
        document.getElementById('active-chat-container').classList.remove('hidden');

        document.getElementById('chat-npc-avatar').textContent = npc.avatar;
        document.getElementById('chat-npc-name').textContent = npc.name;
        document.getElementById('chat-npc-style').textContent = isZh ? npc.description_zh : npc.description_en;

        // Clear chat area & render history
        const chatBox = document.getElementById('chat-history');
        chatBox.innerHTML = '';

        // Add System Initial Bounded Scaffolding message
        this.appendSystemBubble(isZh ? 
            `已開始訪談 ${npc.name}。請嘗試向他提問相關線索。依照教學規範，角色絕不會主動吐露最終答案。` : 
            `Interviewing ${npc.name}. Bounded constraints active: NPCs will never give direct answers without scaffolding.`);

        const history = TextQuest.student.chatHistory[npcId] || [];
        history.forEach(msg => {
            if (msg.sender === 'student') {
                this.appendStudentBubble(msg.text);
            } else {
                this.appendNpcBubble(npc, msg.text, msg.ruleFulfill);
            }
        });

        // Initialize Scaffolding suggestion buttons
        this.renderChatScaffolding(npc);
        
        // Auto scroll to bottom
        chatBox.scrollTop = chatBox.scrollHeight;
    },

    renderChatScaffolding(npc) {
        const box = document.getElementById('chat-scaffold-list');
        box.innerHTML = '';
        const isZh = TextQuest.lang === 'zh';

        // Extract some terms from rules to create realistic scaffolding triggers
        const hasClue = TextQuest.student.collectedClueIds.includes(npc.clueId);
        
        let questions = [];
        
        if (npc.id.includes('farmer')) {
            questions = isZh ? 
                ["阿土伯，以前這裡的水量環境是怎樣的？", "近年農作物有受到缺水影響嗎？", "您農作日記裡寫到什麼？"] :
                ["Uncle Tu, what was the river water like in the past?", "Have crops been heavily affected recently?", "What is recorded in your diary?"];
        } else if (npc.id.includes('manager')) {
            questions = isZh ? 
                ["高經理，工廠如何處理工業廢水？", "溪水乾涸是否跟工廠排放超抽有關？", "可以看看工廠的綠色合規聲明嗎？"] :
                ["Manager Kao, how does the factory process wastewater?", "Is the dry river linked to factory extraction?", "Can I see your green compliance brochure?"];
        } else if (npc.id.includes('volunteer')) {
            questions = isZh ? 
                ["雨婷，你在這裡測量水質數據有什麼發現？", "這裡的藻類沉澱物和導電度怎麼樣？", "工廠零排放的說法有問題嗎？"] :
                ["Yu-Ting, what did your water quality test reveal?", "What about algae sediments and conductivity values?", "Is the factory's zero-discharge claim accurate?"];
        } else if (npc.id.includes('reporter')) {
            questions = isZh ? 
                ["阿哲，你的報導對比出什麼疑點？", "氣候旱災真的是溪水乾涸的唯一原因嗎？", "阿土伯的日記和降雨數據落差多大？"] :
                ["A-Che, what conflict did your investigation expose?", "Is climate drought the only cause for runoff drops?", "How does rainfall reduction compare with the river flow collapse?"];
        } else {
            // General
            const keyTerm = npc.rule ? npc.rule.split(/[、，or且]/)[0] : '情況';
            questions = isZh ? 
                [`請問關於「${keyTerm}」，您掌握了什麼事？`, "這與課文的內容有什麼關聯？"] :
                [`Tell me about "${keyTerm}" details?`, "How does it align with our objectives?"];
        }

        questions.forEach(q => {
            const btn = document.createElement('button');
            btn.className = 'scaffold-btn';
            btn.textContent = q;
            btn.onclick = () => {
                document.getElementById('chat-input-text').value = q;
                this.sendStudentMessage();
            };
            box.appendChild(btn);
        });
    },

    async sendStudentMessage() {
        const input = document.getElementById('chat-input-text');
        const question = input.value.trim();
        if (!question) return;

        const npcId = TextQuest.student.currentNpcId;
        const npc = TextQuest.activity.npcs[npcId];
        if (!npc) return;

        input.value = '';

        // 1. Add student message to UI and history
        this.appendStudentBubble(question);
        
        if (!TextQuest.student.chatHistory[npcId]) {
            TextQuest.student.chatHistory[npcId] = [];
        }
        TextQuest.student.chatHistory[npcId].push({ sender: 'student', text: question });

        // 2. Show Typewriter Shimmer loading state
        const chatBox = document.getElementById('chat-history');
        const loadingBubble = document.createElement('div');
        loadingBubble.className = 'chat-bubble npc';
        loadingBubble.innerHTML = `<span class="ai-status-indicator processing" style="border:none; background:transparent; padding:0;"><span class="spinner"></span></span>`;
        chatBox.appendChild(loadingBubble);
        chatBox.scrollTop = chatBox.scrollHeight;

        // 3. Call AI Module bounded engine
        try {
            const response = await window.AIModule.getBoundedChatReply(
                npc,
                question,
                TextQuest.student.chatHistory[npcId],
                TextQuest.activity.sourceText
            );
            
            // Remove spinner bubble
            loadingBubble.remove();

            // Append NPC reply
            this.appendNpcBubble(npc, response.text, response.ruleFulfill);
            
            // Add reply to history
            TextQuest.student.chatHistory[npcId].push({ 
                sender: 'npc', 
                text: response.text,
                ruleFulfill: response.ruleFulfill 
            });

            // Log visit frequency for analytics
            if (!TextQuest.analytics.visitsCount[npcId]) TextQuest.analytics.visitsCount[npcId] = 0;
            TextQuest.analytics.visitsCount[npcId]++;
            
            // Update Progression node
            this.updateProgressionFlow();
        } catch (e) {
            loadingBubble.remove();
            alert("AI Dialogue Error: " + e.message);
        }
    },

    appendStudentBubble(text) {
        const chatBox = document.getElementById('chat-history');
        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble student';
        bubble.textContent = text;
        chatBox.appendChild(bubble);
        chatBox.scrollTop = chatBox.scrollHeight;
    },

    appendNpcBubble(npc, text, ruleFulfill) {
        const isZh = TextQuest.lang === 'zh';
        const chatBox = document.getElementById('chat-history');
        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble npc';
        
        // Render raw newlines properly
        bubble.innerHTML = text.replace(/\n/g, '<br>');
        
        // If clue disclosed, append the inline Collect button!
        if (ruleFulfill) {
            const isCollected = TextQuest.student.collectedClueIds.includes(npc.clueId);
            
            const clueRow = document.createElement('div');
            clueRow.className = 'chat-bubble-clue-trigger';
            clueRow.innerHTML = `
                <span class="clue-trigger-text">🎁 ${isZh?'線索已披露！':'Clue Unlocked!'} 【${escapeHtml(isZh ? npc.clueName_zh : npc.clueName_en)}】</span>
                <button class="btn-collect-clue-inline ${isCollected ? 'collected' : ''}" 
                    onclick="window.StudentModule.collectClue('${npc.clueId}', this)" 
                    ${isCollected ? 'disabled' : ''}>
                    ${isCollected ? (isZh?'已存入證據':'Collected') : (isZh?'📥 點擊收集線索':'📥 Collect Clue')}
                </button>
            `;
            bubble.appendChild(clueRow);
        }
        
        chatBox.appendChild(bubble);
        chatBox.scrollTop = chatBox.scrollHeight;
    },

    appendSystemBubble(text) {
        const chatBox = document.getElementById('chat-history');
        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble system';
        bubble.textContent = text;
        chatBox.appendChild(bubble);
        chatBox.scrollTop = chatBox.scrollHeight;
    },

    // 5. Collect Clue Action
    collectClue(clueId, btnEl) {
        try {
            if (TextQuest.student.collectedClueIds.includes(clueId)) return;
            
            const isZh = TextQuest.lang === 'zh';
            TextQuest.student.collectedClueIds.push(clueId);
            
            // Update inline buttons state
            if (btnEl) {
                btnEl.classList.add('collected');
                btnEl.textContent = isZh ? '已存入證據' : 'Collected';
                btnEl.setAttribute('disabled', 'true');
            }

            // Update top status bar badge count
            const badgeCount = document.getElementById('binder-count-badge');
            if (badgeCount) {
                badgeCount.textContent = TextQuest.student.collectedClueIds.length;
                
                // Pulsate badge for micro-animation success
                badgeCount.style.animation = 'scalePulse 0.4s ease-out';
                setTimeout(() => badgeCount.style.animation = '', 400);
            }

            // Record for analytics
            if (!TextQuest.analytics.clueCollects[clueId]) TextQuest.analytics.clueCollects[clueId] = 0;
            TextQuest.analytics.clueCollects[clueId]++;

            // Re-render binder tab & local lists
            this.renderMap();
            if (TextQuest.student.currentLocationId) this.renderLocationSplit();
            this.renderBinder();
            this.updateProgressionFlow();
        } catch (error) {
            console.error("Error in collectClue:", error);
            alert((TextQuest.lang === 'zh' ? '收集線索失敗，錯誤資訊：' : 'Failed to collect clue: ') + error.message);
        }
    },

    // 6. Source Text Reader builder with selection triggers
    renderSourceTextReader() {
        const container = document.getElementById('source-text-reader-container');
        container.innerHTML = '';
        const isZh = TextQuest.lang === 'zh';

        if (TextQuest.activity.sentences.length === 0) {
            container.innerHTML = `<span style="font-size:0.75rem; color:var(--text-muted); font-style:italic;">${isZh?'設計師尚未匯入探究文本！':'No text has been imported.'}</span>`;
            return;
        }

        TextQuest.activity.sentences.forEach(s => {
            const span = document.createElement('span');
            span.className = 'source-text-sentence';
            span.setAttribute('data-id', s.id);
            span.textContent = `${s.id}. ${s.text} `;
            
            // Highlight if already linked to a clue (cast both to string for safe comparison)
            const isLinked = TextQuest.student.evidenceLinks.some(link => link.sentenceId && s.id && link.sentenceId.toString() === s.id.toString());
            if (isLinked) span.classList.add('linked');

            // Listen to sentence hover and click selection
            span.onclick = (e) => {
                e.stopPropagation();
                
                // Clear other selections
                container.querySelectorAll('.source-text-sentence').forEach(el => el.classList.remove('selected'));
                
                span.classList.add('selected');
                
                // Show floating Link button
                const markBtn = document.getElementById('btn-mark-evidence');
                markBtn.classList.remove('hidden');
                
                // Calculate position relative to container
                const rect = span.getBoundingClientRect();
                const containerRect = container.getBoundingClientRect();
                
                // Position button floating floatingly
                markBtn.style.top = `${rect.bottom - containerRect.top + container.scrollTop + 10}px`;
            };

            container.appendChild(span);
        });

        // Hide floating button when clicking container background
        container.onclick = () => {
            container.querySelectorAll('.source-text-sentence').forEach(el => el.classList.remove('selected'));
            document.getElementById('btn-mark-evidence').classList.add('hidden');
        };
    },

    // 7. Grounding linker Modal opening
    openGroundingLinker() {
        const isZh = TextQuest.lang === 'zh';
        
        // Find selected sentence
        const selectedSpan = document.querySelector('.source-text-sentence.selected');
        if (!selectedSpan) return;

        const sentenceId = selectedSpan.getAttribute('data-id');
        let sentence = TextQuest.activity.sentences.find(s => s.id && s.id.toString() === sentenceId.toString());
        
        // Safety Fallback: if sentence is not found in state, reconstruct it from DOM text content
        if (!sentence) {
            const cleanText = selectedSpan.textContent.replace(/^\d+[\.\s、]+/g, '').trim();
            sentence = { id: sentenceId, text: cleanText };
        }

        // Verify if students have collected at least 1 clue
        if (TextQuest.student.collectedClueIds.length === 0) {
            alert(isZh ? '您目前尚未收集到任何 NPC 角色線索！請先與角色對話提問以收集線索。' : 'You haven\'t collected any clues yet! Speak to NPCs first.');
            return;
        }

        document.getElementById('modal-bind-evidence').classList.remove('hidden');
        document.getElementById('bind-selected-text-preview').textContent = `「${sentence.id}. ${sentence.text}」`;

        // Populate dropdown with collected clues
        const selectClue = document.getElementById('select-bind-clue');
        selectClue.innerHTML = '';
        
        TextQuest.student.collectedClueIds.forEach(cid => {
            const clue = TextQuest.activity.clues[cid];
            if (clue) {
                const opt = document.createElement('option');
                opt.value = cid;
                opt.textContent = isZh ? clue.name_zh : clue.name_en;
                selectClue.appendChild(opt);
            }
        });

        document.getElementById('input-bind-reasoning').value = '';
    },

    // Save Evidence connection link
    saveEvidenceLinking() {
        const isZh = TextQuest.lang === 'zh';
        const selectedSpan = document.querySelector('.source-text-sentence.selected');
        if (!selectedSpan) return;

        const sentenceId = selectedSpan.getAttribute('data-id');
        let sentence = TextQuest.activity.sentences.find(s => s.id && s.id.toString() === sentenceId.toString());
        
        // Safety Fallback: if sentence is not found in state, reconstruct it from DOM text content
        if (!sentence) {
            const cleanText = selectedSpan.textContent.replace(/^\d+[\.\s、]+/g, '').trim();
            sentence = { id: sentenceId, text: cleanText };
        }

        const selectClueEl = document.getElementById('select-bind-clue');
        const clueId = selectClueEl ? selectClueEl.value : null;
        const reasoning = document.getElementById('input-bind-reasoning').value.trim();

        if (!clueId) {
            alert(isZh ? '請選擇要連結的已收集線索！' : 'Please select a collected clue to link!');
            return;
        }

        if (!reasoning) {
            alert(isZh ? '請輸入您的證據論證理由！' : 'Please input your evidence reasoning!');
            return;
        }

        // Store link
        const linkId = 'link_' + Date.now().toString().slice(-6);
        TextQuest.student.evidenceLinks.push({
            id: linkId,
            clueId: clueId,
            sentenceId: sentenceId,
            quote: sentence.text,
            reasoning: reasoning
        });

        // Record for analytics
        if (clueId) {
            if (!TextQuest.analytics.evidenceLinksCount[clueId]) TextQuest.analytics.evidenceLinksCount[clueId] = 0;
            TextQuest.analytics.evidenceLinksCount[clueId]++;
        }

        // Clean selector and UI
        document.getElementById('modal-bind-evidence').classList.add('hidden');
        selectedSpan.classList.remove('selected');
        selectedSpan.classList.add('linked');
        document.getElementById('btn-mark-evidence').classList.add('hidden');

        // Re-render
        this.renderSourceTextReader();
        this.renderBinder();
        this.updateProgressionFlow();
    },

    // Delete Evidence link
    deleteEvidenceLink(linkId) {
        TextQuest.student.evidenceLinks = TextQuest.student.evidenceLinks.filter(l => l.id !== linkId);
        
        // Re-render
        this.renderSourceTextReader();
        this.renderBinder();
        this.updateProgressionFlow();
    },

    // Render Binder Cards Tab
    renderBinder() {
        const container = document.getElementById('binder-clues-grid');
        container.innerHTML = '';
        const isZh = TextQuest.lang === 'zh';

        if (TextQuest.student.collectedClueIds.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">💼</div>
                    <h4 data-zh="證據箱空空如也" data-en="Binder is Empty">證據箱空空如也</h4>
                    <p data-zh="您尚未在與 NPC 的訪談對話中收集到任何關鍵線索。" data-en="No clues collected. Probe NPCs in dialogue to unlock clues.">您尚未在與 NPC 的訪談對話中收集到任何關鍵線索。</p>
                </div>
            `;
            return;
        }

        TextQuest.student.collectedClueIds.forEach(cid => {
            const clue = TextQuest.activity.clues[cid];
            if (!clue) return;

            const links = TextQuest.student.evidenceLinks.filter(l => l.clueId === cid);
            const isLinked = links.length > 0;

            const card = document.createElement('div');
            card.className = `clue-binder-card ${isLinked ? 'linked-evidence' : 'unlinked-evidence'}`;

            // Build linked sentences block HTML
            let linksHtml = '';
            links.forEach(link => {
                linksHtml += `
                    <div class="linked-evidence-block">
                        <span style="font-size:0.65rem; color:var(--accent-primary); font-weight:700;">🔗 已連結原始文本句:</span>
                        <blockquote class="linked-evidence-quote">「${escapeHtml(link.quote)}」</blockquote>
                        <div class="linked-evidence-reason">
                            <strong>${isZh?'💡 論證理由:':'💡 Reasoning:'}</strong> ${escapeHtml(link.reasoning)}
                        </div>
                        <button class="btn-delete-link" onclick="window.StudentModule.deleteEvidenceLink('${link.id}')">${isZh?'🗑️ 刪除連結':'🗑️ Remove Link'}</button>
                    </div>
                `;
            });

            card.innerHTML = `
                <div class="clue-binder-header">
                    <span class="clue-binder-title">【${escapeHtml(isZh ? clue.name_zh : clue.name_en)}】</span>
                    <span class="badge ${isLinked ? 'badge-active-mode' : 'badge-warning'}">
                        ${isLinked ? (isZh?'已對齊課文':'Grounded') : (isZh?'未連結課文':'Ungrounded')}
                    </span>
                </div>
                <div class="clue-binder-body">
                    ${escapeHtml(isZh ? clue.text_zh : clue.text_en)}
                </div>
                <div class="clue-binder-source-meta">
                    👤 ${isZh?'線索提供者':'Source'}: ${escapeHtml(TextQuest.activity.npcs[clue.npcId]?.name || '未知')}
                </div>
                ${linksHtml}
            `;
            container.appendChild(card);
        });
    },

    // 8. Synthesis submission sheet
    openSynthesisPanel() {
        const isZh = TextQuest.lang === 'zh';
        document.getElementById('synthesis-overlay').classList.remove('hidden');

        document.getElementById('synth-product-reminder').textContent = TextQuest.activity.product;
        document.getElementById('synth-input-title').value = TextQuest.student.synthesisTitle || `關於《${TextQuest.activity.title}》的調查報告`;
        document.getElementById('synth-input-body').value = TextQuest.student.synthesisBody || '';

        // Render Citations panel on the right sidebar
        const citationsList = document.getElementById('synthesis-citation-list');
        citationsList.innerHTML = '';

        TextQuest.student.collectedClueIds.forEach(cid => {
            const clue = TextQuest.activity.clues[cid];
            if (!clue) return;

            const links = TextQuest.student.evidenceLinks.filter(l => l.clueId === cid);
            const isLinked = links.length > 0;

            const card = document.createElement('div');
            card.className = `citation-select-card ${!isLinked ? 'unlinked' : ''}`;
            card.innerHTML = `
                <div class="cit-card-head">
                    <span>【${escapeHtml(isZh ? clue.name_zh : clue.name_en)}】</span>
                    <span>${isLinked ? '🔗 Cit' : '⚠️ Unlinked'}</span>
                </div>
                <div class="cit-card-body">
                    ${escapeHtml(isZh ? clue.text_zh : clue.text_en).substring(0, 45)}...
                </div>
            `;
            
            // Insert citation inline upon click
            card.onclick = () => {
                const editor = document.getElementById('synth-input-body');
                const citationText = isZh ? 
                    `\n引用證據【${clue.name_zh}】（證言內容："${clue.text_zh}"。對齊課文：「${links.map(l=>l.quote).join(' / ')}」- 論證說明：${links.map(l=>l.reasoning).join(' / ')}）\n` :
                    `\n[Cite Clue: ${clue.name_en}] (Statement: "${clue.text_en}". Text Grounding: "${links.map(l=>l.quote).join(' / ')}" - Reasoning: ${links.map(l=>l.reasoning).join(' / ')})\n`;
                
                // Simple insert at cursor position
                const startPos = editor.selectionStart;
                const endPos = editor.selectionEnd;
                editor.value = editor.value.substring(0, startPos) + citationText + editor.value.substring(endPos, editor.value.length);
                editor.focus();
            };

            citationsList.appendChild(card);
        });
    },

    submitFinalReport() {
        const isZh = TextQuest.lang === 'zh';
        const title = document.getElementById('synth-input-title').value.trim();
        const body = document.getElementById('synth-input-body').value.trim();

        if (!title || !body) {
            alert(isZh ? '報告標題與內文皆不能為空！' : 'Report fields cannot be empty!');
            return;
        }

        // Stops clock
        if (TextQuest.student.timerInterval) clearInterval(TextQuest.student.timerInterval);

        TextQuest.student.synthesisTitle = title;
        TextQuest.student.synthesisBody = body;
        TextQuest.student.isSubmitted = true;

        // Feed to success review window
        document.getElementById('synthesis-overlay').classList.add('hidden');
        document.getElementById('student-workspace').classList.add('hidden');
        
        const successSheet = document.getElementById('student-success-sheet');
        successSheet.classList.remove('hidden');

        document.getElementById('success-report-title').textContent = title;
        document.getElementById('success-report-body').textContent = body;

        // Render Citations under report
        const citReviewList = document.getElementById('success-report-citations');
        citReviewList.innerHTML = `<strong>${isZh?'📂 本次調查附帶證據鏈：':'📂 Supporting Evidence Chains:'}</strong>`;
        
        TextQuest.student.evidenceLinks.forEach(link => {
            const clue = TextQuest.activity.clues[link.clueId];
            const div = document.createElement('div');
            div.style.fontSize = '0.72rem';
            div.style.background = 'var(--bg-tertiary)';
            div.style.padding = '6px';
            div.style.borderRadius = '4px';
            div.style.marginTop = '4px';
            div.innerHTML = `⭐ <strong>${escapeHtml(isZh ? clue.name_zh : clue.name_en)}</strong> <span style="color:var(--text-muted);">${isZh?'對應課文段':'Grounded'}:</span> 「${escapeHtml(link.quote)}」 <br> 📝 <em>${isZh?'推論':'Reasoning'}: ${escapeHtml(link.reasoning)}</em>`;
            citReviewList.appendChild(div);
        });

        // 9. Auto generate AI Grading critique feedback!
        const score = Math.min(100, Math.round(50 + (TextQuest.student.collectedClueIds.length * 10) + (TextQuest.student.evidenceLinks.length * 10)));
        let aiCritique = "";
        
        if (isZh) {
            aiCritique = `【探究學習評鑑報告 - 分數: ${score}/100】\n恭喜！你順利完成了綠溪村水資源危機的調查！你成功與多位關鍵角色深入對話，收集了 ${TextQuest.student.collectedClueIds.length} 個關鍵線索，並建立了 ${TextQuest.student.evidenceLinks.length} 個與文本段落的證據連結。在你的報告中，你精準呈現了多視角的衝突，將「氣候變遷降雨減少」與「人為取水超抽」進行了數據上的對比，極富說服力！\n\n建議：未來在面對像工廠代表的說詞時，可以再進一步質疑其合規手冊的實質落實度，這能讓你的報告更具備批判性思考！`;
        } else {
            aiCritique = `【Inquiry Evaluation Report - Score: ${score}/100】\nBravo! You have compiled a solid investigation. By linking ${TextQuest.student.collectedClueIds.length} clues and establishing ${TextQuest.student.evidenceLinks.length} grounding bonds, your report provides a high-level contrast between corporate claims and community observations. Excellent data citation!\n\nCritique Suggestion: To improve critical thinking, challenge Manager Kao's compliance statements more directly by raising potential inspection gaps.`;
        }
        document.getElementById('success-ai-feedback').innerHTML = aiCritique.replace(/\n/g, '<br>');

        // Push live student playtest data into Analytics Dashboard dynamically!
        window.AnalyticsModule.pushStudentPlaytestLog(title, body, score);
        
        this.updateProgressionFlow();
    },

    // Visual sequence flow node updates
    updateProgressionFlow() {
        const isZh = TextQuest.lang === 'zh';
        const tracker = document.getElementById('student-sequence-flow');
        tracker.innerHTML = '';

        const totalNPCsCount = Object.keys(TextQuest.activity.npcs).length;
        const colCount = TextQuest.student.collectedClueIds.length;
        const linkCount = TextQuest.student.evidenceLinks.length;

        const nodes = [
            { id: 1, label_zh: '任務簡報', label_en: 'Briefing', state: 'completed' },
            { id: 2, label_zh: `角色訪談 (${colCount}/${totalNPCsCount})`, label_en: `Interviews (${colCount}/${totalNPCsCount})`, state: colCount > 0 ? (colCount === totalNPCsCount ? 'completed' : 'active') : 'idle' },
            { id: 3, label_zh: `證據綁定 (${linkCount})`, label_en: `Linking (${linkCount})`, state: linkCount > 0 ? 'completed' : (colCount > 0 ? 'active' : 'idle') },
            { id: 4, label_zh: '最終撰寫', label_en: 'Synthesis', state: TextQuest.student.isSubmitted ? 'completed' : (linkCount > 0 ? 'active' : 'idle') }
        ];

        nodes.forEach((n, idx) => {
            const node = document.createElement('div');
            node.className = `seq-node ${n.state}`;
            node.innerHTML = `
                <div class="seq-dot"></div>
                <span>${escapeHtml(isZh ? n.label_zh : n.label_en)}</span>
            `;
            tracker.appendChild(node);
            
            if (idx < nodes.length - 1) {
                const line = document.createElement('div');
                line.className = 'seq-line';
                tracker.appendChild(line);
            }
        });
    }
};
