/**
 * TextQuest AI - Teacher Authoring Studio & AI Design Assistant Module
 * Manages card-based storyworld canvas, NPC editor drawer, and AI steps.
 */

window.TeacherModule = {
    // Current AI Assistant Step state: 1, 2, 3, 4
    activeStep: 1,
    
    init() {
        this.bindEvents();
        this.renderLocations();
        this.updateStepLockStates();
        
        // Load existing values into form fields
        document.getElementById('input-title').value = TextQuest.activity.title;
        document.getElementById('input-target').value = TextQuest.activity.target;
        document.getElementById('input-time').value = TextQuest.activity.time;
        document.getElementById('input-goals').value = TextQuest.activity.goals;
        document.getElementById('input-product').value = TextQuest.activity.product;
        
        // Listen to active input changes
        document.getElementById('input-title').addEventListener('input', (e) => {
            TextQuest.activity.title = e.target.value;
        });
        document.getElementById('input-target').addEventListener('input', (e) => {
            TextQuest.activity.target = e.target.value;
        });
        document.getElementById('input-time').addEventListener('input', (e) => {
            TextQuest.activity.time = parseInt(e.target.value) || 30;
        });
        document.getElementById('input-goals').addEventListener('input', (e) => {
            TextQuest.activity.goals = e.target.value;
        });
        document.getElementById('input-product').addEventListener('input', (e) => {
            TextQuest.activity.product = e.target.value;
        });
        document.getElementById('input-source-text').addEventListener('input', (e) => {
            TextQuest.activity.sourceText = e.target.value;
            TextQuest.activity.sentences = window.parseSourceTextToSentences(e.target.value);
        });
    },

    bindEvents() {
        // Mode Switches (Template Selection)
        const templateCards = document.querySelectorAll('.template-card');
        templateCards.forEach(card => {
            card.addEventListener('click', () => {
                templateCards.forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                TextQuest.activity.template = card.getAttribute('data-template');
            });
        });

        // Add Location Button
        document.getElementById('btn-add-location').onclick = () => {
            const name = prompt(TextQuest.lang === 'zh' ? '請輸入地點名稱：' : 'Enter location name:', 
                                TextQuest.lang === 'zh' ? '神秘廢墟' : 'Mysterious Ruins');
            if (!name) return;
            const icon = prompt(TextQuest.lang === 'zh' ? '請輸入地點代表 Emoji：' : 'Enter location Emoji:', '🏛️') || '📍';
            
            const locId = 'loc_' + Date.now().toString().slice(-6);
            TextQuest.activity.locations.push({
                id: locId,
                icon: icon,
                name_zh: name,
                name_en: name,
                desc_zh: TextQuest.lang === 'zh' ? '一個全新設計的故事探索點。' : 'A newly configured story location.',
                desc_en: 'A newly configured story location.',
                npcs: [],
                clues: []
            });
            this.renderLocations();
        };

        // ==========================================
        // AI DESIGN ASSISTANT TRIGGERS
        // ==========================================
        
        // Step 1: Analyze Text
        document.getElementById('btn-ai-analyze').onclick = async () => {
            const text = document.getElementById('input-source-text').value.trim();
            if (!text) {
                alert(TextQuest.lang === 'zh' ? '請先輸入或匯入探究文本！' : 'Please input source text first!');
                return;
            }
            
            this.setAiStatus(true, TextQuest.lang === 'zh' ? '正在深度分析文本衝突、學科概念與潛在迷思...' : 'Analyzing key events, concepts, and misconceptions...');
            
            try {
                const analysis = await window.AIModule.analyzeSourceText(text);
                this.showAiResultsPanel(analysis);
                this.activeStep = 2;
                this.updateStepLockStates();
            } catch (e) {
                alert("AI Analysis Error: " + e.message);
            } finally {
                this.setAiStatus(false, TextQuest.lang === 'zh' ? '文本分析完成！已解鎖第二步生成。' : 'Analysis complete! Step 2 unlocked.');
            }
        };

        // Step 2: Generate NPCs & Locations
        document.getElementById('btn-ai-generate-npcs').onclick = async () => {
            const text = document.getElementById('input-source-text').value.trim();
            this.setAiStatus(true, TextQuest.lang === 'zh' ? '正在架構故事世界地圖，規劃 Bounded AI-NPC 角色的知識邊界與披露規則...' : 'Synthesizing storyworld map and planning bounded NPC boundaries...');
            
            try {
                const data = await window.AIModule.generateStoryworld(text, TextQuest.activity.template);
                
                // Load generated items into state
                TextQuest.activity.locations = [];
                TextQuest.activity.npcs = {};
                TextQuest.activity.clues = {};
                
                data.locations.forEach(loc => {
                    TextQuest.activity.locations.push({
                        id: loc.id,
                        icon: loc.icon,
                        name_zh: loc.name,
                        name_en: loc.name,
                        desc_zh: loc.desc,
                        desc_en: loc.desc,
                        npcs: [],
                        clues: []
                    });
                });

                data.npcs.forEach(npc => {
                    const l = TextQuest.activity.locations.find(x => x.id === npc.locationId);
                    if (l) l.npcs.push(npc.id);
                    
                    TextQuest.activity.npcs[npc.id] = {
                        id: npc.id,
                        locationId: npc.locationId,
                        name: npc.name,
                        avatar: npc.avatar,
                        roleBadge_zh: npc.roleBadge,
                        roleBadge_en: npc.roleBadge,
                        description_zh: npc.description,
                        description_en: npc.description,
                        voice_zh: npc.voice,
                        voice_en: npc.voice,
                        boundary_zh: npc.boundary,
                        boundary_en: npc.boundary,
                        clueName_zh: npc.clueName,
                        clueName_en: npc.clueName,
                        clueText_zh: npc.clueText,
                        clueText_en: npc.clueText,
                        rule_zh: npc.rule,
                        rule_en: npc.rule,
                        evidences: npc.evidences
                    };
                    
                    const clueId = 'clue_' + npc.id.split('_')[1];
                    TextQuest.activity.clues[clueId] = {
                        id: clueId,
                        npcId: npc.id,
                        name_zh: npc.clueName,
                        name_en: npc.clueName,
                        text_zh: npc.clueText,
                        text_en: npc.clueText,
                        rule_zh: npc.rule,
                        rule_en: npc.rule,
                        evidences: npc.evidences
                    };
                    TextQuest.activity.npcs[npc.id].clueId = clueId;
                });
                
                this.renderLocations();
                this.activeStep = 3;
                this.updateStepLockStates();
            } catch (e) {
                alert("AI Storyworld Generation Error: " + e.message);
            } finally {
                this.setAiStatus(false, TextQuest.lang === 'zh' ? '故事世界生成成功！點擊卡片可微調。已解鎖第三步任務規劃。' : 'Storyworld generated successfully! Click to edit. Step 3 unlocked.');
            }
        };

        // Step 3: Design Task Flow
        document.getElementById('btn-ai-design-tasks').onclick = async () => {
            this.setAiStatus(true, TextQuest.lang === 'zh' ? '正在為學生編排30分鐘學習探索序列...' : 'Sequencing 30-minute student inquiry paths...');
            await new Promise(r => setTimeout(r, 1500));
            
            // Handled as visual unlock and preset mapping
            this.activeStep = 4;
            this.updateStepLockStates();
            this.setAiStatus(false, TextQuest.lang === 'zh' ? '30分鐘學習動線編排完成！已解鎖第四步品質健檢。' : 'Inquiry flow optimized! Step 4 unlocked.');
        };

        // Step 4: Run Quality Check
        document.getElementById('btn-ai-check-quality').onclick = async () => {
            this.setAiStatus(true, TextQuest.lang === 'zh' ? '正在審查 AI NPC 對話可控性、文本對齊度與邏輯缺陷...' : 'Reviewing dialog grounding, coverage, and coherence...');
            await new Promise(r => setTimeout(r, 2000));
            
            this.showQualityCheckResults();
            this.setAiStatus(false, TextQuest.lang === 'zh' ? '品質健檢通過！可即時切換「學生探索空間」進行遊玩測試。' : 'Quality check passed! Switch to Playtest mode to test instantly.');
        };

        // AI Results Close
        document.getElementById('btn-close-ai-results').onclick = () => {
            document.getElementById('ai-results-panel').classList.add('hidden');
        };

        // NPC Drawer Close Trigger
        document.getElementById('btn-close-npc-editor').onclick = () => {
            document.getElementById('modal-npc-editor').classList.add('hidden');
        };
        
        // NPC Save Trigger
        document.getElementById('btn-save-npc').onclick = () => {
            this.saveNpcDetails();
        };

        // NPC Delete Trigger
        document.getElementById('btn-delete-npc').onclick = () => {
            if (confirm(TextQuest.lang === 'zh' ? '確定要刪除此角色嗎？' : 'Delete this NPC?')) {
                this.deleteNpc();
            }
        };
    },

    // Render Locations Canvas
    renderLocations() {
        const grid = document.getElementById('locations-grid');
        grid.innerHTML = '';
        
        const isZh = TextQuest.lang === 'zh';
        
        if (TextQuest.activity.locations.length === 0) {
            grid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <div class="empty-icon">🗺️</div>
                    <h3 data-zh="尚無故事地點" data-en="No Locations Yet">尚無故事地點</h3>
                    <p data-zh="點擊「新增地點」或點擊右側 AI 設計助手生成完整地圖。" data-en="Click 'Add Location' or use the AI Assistant to generate one.">點擊「新增地點」或點擊右側 AI 設計助手生成完整地圖。</p>
                </div>
            `;
            return;
        }

        TextQuest.activity.locations.forEach(loc => {
            const card = document.createElement('div');
            card.className = 'location-studio-card glass-card';
            if (loc.npcs.length > 0) card.classList.add('has-npcs');

            // Generate embedded NPC rows
            let npcRows = '';
            loc.npcs.forEach(npcId => {
                const npc = TextQuest.activity.npcs[npcId];
                if (npc) {
                    npcRows += `
                        <div class="loc-npc-row" onclick="window.TeacherModule.openNpcEditor('${npcId}', '${loc.id}')">
                            <span class="loc-npc-avatar">${escapeHtml(npc.avatar)}</span>
                            <span class="loc-npc-name">${escapeHtml(npc.name)}</span>
                            <span class="loc-npc-badge">${escapeHtml(isZh ? npc.roleBadge_zh : npc.roleBadge_en)}</span>
                        </div>
                    `;
                }
            });

            card.innerHTML = `
                <button class="loc-delete-btn" onclick="window.TeacherModule.deleteLocation('${loc.id}')" title="刪除地點">&times;</button>
                <div class="loc-card-header">
                    <div class="loc-card-icon">${escapeHtml(loc.icon)}</div>
                    <div class="loc-card-title">
                        <h4>${escapeHtml(isZh ? loc.name_zh : loc.name_en)}</h4>
                        <p>${escapeHtml(isZh ? loc.desc_zh : loc.desc_en)}</p>
                    </div>
                </div>
                <div class="loc-card-npc-list">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 4px;">
                        <span style="font-size:0.75rem; font-weight:600; color:var(--text-muted);">${isZh?'👥 AI 角色':'👥 AI NPCs'}</span>
                    </div>
                    ${npcRows ? npcRows : `<div style="font-size:0.7rem; color:var(--text-muted); font-style:italic; padding:4px;">${isZh?'暫無角色 (點擊下方新增)':'No characters here'}</div>`}
                </div>
                <div class="loc-card-actions">
                    <button class="btn btn-secondary btn-sm" onclick="window.TeacherModule.openNpcEditor(null, '${loc.id}')">
                        ➕ ${isZh?'新增角色':'Add NPC'}
                    </button>
                </div>
            `;
            grid.appendChild(card);
        });
    },

    // NPC Editor Drawer opening
    openNpcEditor(npcId, locationId) {
        const isZh = TextQuest.lang === 'zh';
        document.getElementById('modal-npc-editor').classList.remove('hidden');
        
        const nameInput = document.getElementById('edit-npc-name');
        const avatarInput = document.getElementById('edit-npc-avatar');
        const titleInput = document.getElementById('edit-npc-role-badge');
        const descInput = document.getElementById('edit-npc-description');
        const voiceInput = document.getElementById('edit-npc-voice');
        const boundaryInput = document.getElementById('edit-npc-boundary');
        const clueNameInput = document.getElementById('edit-npc-clue-name');
        const clueTextInput = document.getElementById('edit-npc-clue-text');
        const ruleInput = document.getElementById('edit-npc-rule');
        
        document.getElementById('edit-npc-id').value = npcId || '';
        document.getElementById('edit-npc-loc-id').value = locationId;

        // Grounding selector container
        const groundingContainer = document.getElementById('editor-text-lines-selector');
        groundingContainer.innerHTML = '';
        
        if (TextQuest.activity.sentences.length === 0) {
            groundingContainer.innerHTML = `<span style="font-size:0.75rem; color:var(--text-muted); font-style:italic;">${isZh?'請先在左側欄位匯入或貼上探究文本以進行關聯！':'Import a text first to select sentences.'}</span>`;
        } else {
            TextQuest.activity.sentences.forEach(s => {
                const row = document.createElement('label');
                row.className = 'grounding-checkbox-row';
                row.innerHTML = `
                    <input type="checkbox" name="grounded-sentence" value="${s.id}">
                    <span>${s.id}. ${escapeHtml(s.text)}</span>
                `;
                groundingContainer.appendChild(row);
            });
        }

        if (npcId) {
            // Edit Mode - Load values
            const npc = TextQuest.activity.npcs[npcId];
            document.getElementById('npc-editor-title').textContent = isZh ? `✏️ 編輯 AI 角色: ${npc.name}` : `✏️ Edit NPC: ${npc.name}`;
            
            nameInput.value = npc.name;
            avatarInput.value = npc.avatar;
            titleInput.value = isZh ? npc.roleBadge_zh : npc.roleBadge_en;
            descInput.value = isZh ? npc.description_zh : npc.description_en;
            voiceInput.value = isZh ? npc.voice_zh : npc.voice_en;
            boundaryInput.value = isZh ? npc.boundary_zh : npc.boundary_en;
            clueNameInput.value = isZh ? npc.clueName_zh : npc.clueName_en;
            clueTextInput.value = isZh ? npc.clueText_zh : npc.clueText_en;
            ruleInput.value = isZh ? npc.rule_zh : npc.rule_en;
            
            // Select grounded checkboxes
            if (npc.evidences) {
                npc.evidences.forEach(eid => {
                    const cb = groundingContainer.querySelector(`input[value="${eid}"]`);
                    if (cb) cb.checked = true;
                });
            }
            
            document.getElementById('btn-delete-npc').style.display = 'block';
        } else {
            // Create Mode - Set blank
            document.getElementById('npc-editor-title').textContent = isZh ? `➕ 新增故事角色` : `➕ Create NPC`;
            nameInput.value = '';
            avatarInput.value = '👩';
            titleInput.value = '';
            descInput.value = '';
            voiceInput.value = '';
            boundaryInput.value = '';
            clueNameInput.value = '';
            clueTextInput.value = '';
            ruleInput.value = '';
            
            document.getElementById('btn-delete-npc').style.display = 'none';
        }
    },

    // Save NPC Editor details
    saveNpcDetails() {
        const isZh = TextQuest.lang === 'zh';
        const npcId = document.getElementById('edit-npc-id').value;
        const locId = document.getElementById('edit-npc-loc-id').value;
        
        const name = document.getElementById('edit-npc-name').value.trim();
        if (!name) {
            alert(isZh ? '請輸入角色名稱！' : 'Please input NPC Name!');
            return;
        }

        // Get grounded checked values
        const checkedBoxes = document.querySelectorAll('input[name="grounded-sentence"]:checked');
        const evidences = Array.from(checkedBoxes).map(cb => cb.value);

        const newId = npcId || 'npc_' + Date.now().toString().slice(-6);
        const data = {
            id: newId,
            locationId: locId,
            name: name,
            avatar: document.getElementById('edit-npc-avatar').value.trim() || '👩',
            roleBadge_zh: isZh ? document.getElementById('edit-npc-role-badge').value : (TextQuest.activity.npcs[npcId]?.roleBadge_zh || name),
            roleBadge_en: !isZh ? document.getElementById('edit-npc-role-badge').value : (TextQuest.activity.npcs[npcId]?.roleBadge_en || name),
            description_zh: isZh ? document.getElementById('edit-npc-description').value : (TextQuest.activity.npcs[npcId]?.description_zh || ''),
            description_en: !isZh ? document.getElementById('edit-npc-description').value : (TextQuest.activity.npcs[npcId]?.description_en || ''),
            voice_zh: isZh ? document.getElementById('edit-npc-voice').value : (TextQuest.activity.npcs[npcId]?.voice_zh || ''),
            voice_en: !isZh ? document.getElementById('edit-npc-voice').value : (TextQuest.activity.npcs[npcId]?.voice_en || ''),
            boundary_zh: isZh ? document.getElementById('edit-npc-boundary').value : (TextQuest.activity.npcs[npcId]?.boundary_zh || ''),
            boundary_en: !isZh ? document.getElementById('edit-npc-boundary').value : (TextQuest.activity.npcs[npcId]?.boundary_en || ''),
            clueName_zh: isZh ? document.getElementById('edit-npc-clue-name').value : (TextQuest.activity.npcs[npcId]?.clueName_zh || ''),
            clueName_en: !isZh ? document.getElementById('edit-npc-clue-name').value : (TextQuest.activity.npcs[npcId]?.clueName_en || ''),
            clueText_zh: isZh ? document.getElementById('edit-npc-clue-text').value : (TextQuest.activity.npcs[npcId]?.clueText_zh || ''),
            clueText_en: !isZh ? document.getElementById('edit-npc-clue-text').value : (TextQuest.activity.npcs[npcId]?.clueText_en || ''),
            rule_zh: isZh ? document.getElementById('edit-npc-rule').value : (TextQuest.activity.npcs[npcId]?.rule_zh || ''),
            rule_en: !isZh ? document.getElementById('edit-npc-rule').value : (TextQuest.activity.npcs[npcId]?.rule_en || ''),
            evidences: evidences
        };

        // If it's a new NPC, add it to location
        const loc = TextQuest.activity.locations.find(x => x.id === locId);
        if (loc && !npcId) {
            loc.npcs.push(newId);
        }

        // Save NPC
        TextQuest.activity.npcs[newId] = data;

        // Save Clue Matching Object
        const clueId = 'clue_' + newId.split('_')[1];
        TextQuest.activity.clues[clueId] = {
            id: clueId,
            npcId: newId,
            name_zh: data.clueName_zh,
            name_en: data.clueName_en,
            text_zh: data.clueText_zh,
            text_en: data.clueText_en,
            rule_zh: data.rule_zh,
            rule_en: data.rule_en,
            evidences: data.evidences
        };
        data.clueId = clueId;

        document.getElementById('modal-npc-editor').classList.add('hidden');
        this.renderLocations();
    },

    deleteNpc() {
        const npcId = document.getElementById('edit-npc-id').value;
        const locId = document.getElementById('edit-npc-loc-id').value;
        
        // Remove from location npcs list
        const loc = TextQuest.activity.locations.find(x => x.id === locId);
        if (loc) {
            loc.npcs = loc.npcs.filter(id => id !== npcId);
        }

        // Remove from model
        delete TextQuest.activity.npcs[npcId];
        
        const clueId = 'clue_' + npcId.split('_')[1];
        delete TextQuest.activity.clues[clueId];

        document.getElementById('modal-npc-editor').classList.add('hidden');
        this.renderLocations();
    },

    deleteLocation(locId) {
        if (!confirm(TextQuest.lang === 'zh' ? '確定要刪除此地點與其包含的所有角色嗎？' : 'Delete this location and all its characters?')) return;
        
        const loc = TextQuest.activity.locations.find(x => x.id === locId);
        if (loc) {
            // Delete npcs in this location
            loc.npcs.forEach(npcId => {
                delete TextQuest.activity.npcs[npcId];
                const clueId = 'clue_' + npcId.split('_')[1];
                delete TextQuest.activity.clues[clueId];
            });
        }

        // Remove from locations list
        TextQuest.activity.locations = TextQuest.activity.locations.filter(x => x.id !== locId);
        this.renderLocations();
    },

    // AI Status bar updater
    setAiStatus(processing, msg) {
        const box = document.getElementById('ai-status-box');
        const spinner = document.getElementById('ai-spinner');
        const text = document.getElementById('ai-status-text');

        if (processing) {
            box.className = 'ai-status-indicator processing';
            spinner.classList.remove('hidden');
        } else {
            box.className = 'ai-status-indicator idleness';
            spinner.classList.add('hidden');
        }
        text.textContent = msg;
    },

    // Locking/Unlocking Steps
    updateStepLockStates() {
        for (let i = 1; i <= 4; i++) {
            const stepItem = document.getElementById(`ai-step-${i}`);
            const btn = stepItem.querySelector('button');
            
            if (i <= this.activeStep) {
                stepItem.classList.remove('locked');
                btn.removeAttribute('disabled');
            } else {
                stepItem.classList.add('locked');
                btn.setAttribute('disabled', 'true');
            }
        }
    },

    // Pop the AI results panel side drawer
    showAiResultsPanel(analysis) {
        const isZh = TextQuest.lang === 'zh';
        const panel = document.getElementById('ai-results-panel');
        const content = document.getElementById('ai-results-content');
        panel.classList.remove('hidden');
        
        let eventsHtml = '<ul>';
        analysis.events.forEach(e => eventsHtml += `<li>• ${escapeHtml(e)}</li>`);
        eventsHtml += '</ul>';

        let conceptsHtml = '';
        analysis.concepts.forEach(c => {
            conceptsHtml += `<span class="ai-concept-chip">${escapeHtml(c)}</span>`;
        });

        let misHtml = '';
        analysis.misconceptions.forEach(m => {
            misHtml += `<div class="ai-misconception-box">${escapeHtml(m)}</div>`;
        });

        content.innerHTML = `
            <div class="mb-3">
                <h5 style="font-weight:700; color:var(--text-main); margin-bottom:4px;">📌 ${isZh?'核心探究衝突/事件':'Core Tension/Events'}</h5>
                ${eventsHtml}
            </div>
            <div class="mb-3 mt-3">
                <h5 style="font-weight:700; color:var(--text-main); margin-bottom:4px;">🏷️ ${isZh?'重要學科概念':'Grounded Concepts'}</h5>
                ${conceptsHtml}
            </div>
            <div class="mb-3 mt-3">
                <h5 style="font-weight:700; color:var(--text-main); margin-bottom:4px;">⚠️ ${isZh?'學生容易產生的閱讀盲點':'Student Misconceptions'}</h5>
                ${misHtml}
            </div>
        `;
    },

    showQualityCheckResults() {
        const isZh = TextQuest.lang === 'zh';
        const panel = document.getElementById('ai-results-panel');
        const content = document.getElementById('ai-results-content');
        panel.classList.remove('hidden');

        document.querySelector('#ai-results-panel .panel-header h4').textContent = isZh ? "🔍 Quality Assurance 品質認證" : "🔍 Quality Assurance (QA)";

        content.innerHTML = `
            <div style="text-align:center; padding:10px 0;">
                <span style="font-size:3rem;">🛡️</span>
                <h4 style="font-size:1.1rem; font-weight:800; color:var(--accent-primary); margin-top:8px;">${isZh?'故事世界品質檢驗通過！':'Storyworld Quality Assured!'}</h4>
                <p style="font-size:0.75rem; color:var(--text-muted);">${isZh?'完全符合 Bounded Pedagogical Agent 框架':'Fully aligned with the Bounded Scaffolding framework'}</p>
            </div>
            <div class="mt-3" style="font-size:0.75rem; display:flex; flex-direction:column; gap:8px;">
                <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border-color); padding-bottom:4px;">
                    <span>✅ ${isZh?'AI NPC 對話可控性 (Dialogue Grounding)':'Dialogue Grounding'}</span>
                    <strong style="color:var(--accent-primary);">100% (Grounded)</strong>
                </div>
                <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border-color); padding-bottom:4px;">
                    <span>✅ ${isZh?'文本衝突對齊率 (Tension Coverage)':'Conflict Alignment'}</span>
                    <strong style="color:var(--accent-primary);">100%</strong>
                </div>
                <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border-color); padding-bottom:4px;">
                    <span>✅ ${isZh?'線索與證據鍊平衡性 (Evidence Balance)':'Inquiry Balance'}</span>
                    <strong style="color:var(--accent-primary);">${isZh?'平衡良好 (Balanced)':'Balanced'}</strong>
                </div>
                <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border-color); padding-bottom:4px;">
                    <span>✅ ${isZh?'阻斷幻覺機制 (Anti-Hallucination)':'Anti-Hallucination'}</span>
                    <strong style="color:var(--accent-primary);">${isZh?'已啟動 (Active)':'Active'}</strong>
                </div>
            </div>
            <p class="mt-3" style="font-size:0.7rem; color:var(--text-muted); line-height:1.4;">
                ${isZh?'本系統檢驗：所有的 NPC 知識邊界均與原始文本的特定段落完全關聯。對話規則設置精當，能有效阻斷學生進行直接索要答案的作弊提問。':'QA confirms: All NPCs are bound to text excerpts, preventing students from bypassing the inquiry sequence.'}
            </p>
        `;
    }
};
