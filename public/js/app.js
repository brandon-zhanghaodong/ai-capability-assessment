// Firebase Configuration
// Replace with your Firebase config
const firebaseConfig = {
    apiKey: "YOUR_FIREBASE_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const auth = firebase.auth();

// State
let currentUser = null;
let currentAnswers = {};
let currentQNum = 1;
let assessmentId = null;
const TOTAL_QUESTIONS = 29;

// Dimensions
const DIMENSIONS = {
    'STR': { name: '战略与价值流重构', weight: 0.20, color: '#4472C4' },
    'ORG': { name: '组织架构与人才', weight: 0.25, color: '#70AD47' },
    'DAT': { name: '数据底座与治理', weight: 0.20, color: '#FFC000' },
    'TEC': { name: '技术基础设施', weight: 0.15, color: '#ED7D31' },
    'CUL': { name: '文化与变革管理', weight: 0.20, color: '#9E480E' },
};

const DIM_COLORS = {
    'STR': 'bg-blue-100 text-blue-700',
    'ORG': 'bg-green-100 text-green-700',
    'DAT': 'bg-yellow-100 text-yellow-700',
    'TEC': 'bg-orange-100 text-orange-700',
    'CUL': 'bg-red-100 text-red-700',
};

const QUESTIONS = [
    {id:1,code:'STR-01',dimension:'STR',question:'我能够制定所在部门的AI应用短期和长期规划'},
    {id:2,code:'STR-02',dimension:'STR',question:'我能识别出哪些业务场景最适合引入AI技术'},
    {id:3,code:'STR-03',dimension:'STR',question:'我能够测算AI项目的投入产出比和投资回报周期'},
    {id:4,code:'STR-04',dimension:'STR',question:'我能将AI目标与组织战略OKR有效结合'},
    {id:5,code:'STR-05',dimension:'STR',question:'我在推动AI应用时常遇到组织变革阻力'},
    {id:6,code:'ORG-01',dimension:'ORG',question:'我能够设计人机协作的工作流程和岗位职责'},
    {id:7,code:'ORG-02',dimension:'ORG',question:'我能够识别和评估AI关键岗位人才'},
    {id:8,code:'ORG-03',dimension:'ORG',question:'我了解AI卓越中心(COE)的定位和运作模式'},
    {id:9,code:'ORG-04',dimension:'ORG',question:'我能有效管理包含AI角色的跨职能项目团队'},
    {id:10,code:'ORG-05',dimension:'ORG',question:'我能制定岗位转型计划帮助员工适应AI时代'},
    {id:11,code:'ORG-06',dimension:'ORG',question:'我能够编写高质量的Prompt来获取理想AI输出'},
    {id:12,code:'ORG-07',dimension:'ORG',question:'我每周使用AI工具提升工作效率的时间超过5小时'},
    {id:13,code:'DAT-01',dimension:'DAT',question:'我清楚了解企业有哪些可用的数据资产'},
    {id:14,code:'DAT-02',dimension:'DAT',question:'我能够识别和解决数据质量问题'},
    {id:15,code:'DAT-03',dimension:'DAT',question:'我了解RAG/知识库的技术原理和应用价值'},
    {id:16,code:'DAT-04',dimension:'DAT',question:'我在工作中严格遵守数据安全和合规要求'},
    {id:17,code:'DAT-05',dimension:'DAT',question:'我能够使用数据分析工具发现业务洞察'},
    {id:18,code:'DAT-06',dimension:'DAT',question:'我能处理文档、图片、音视频等非结构化数据'},
    {id:19,code:'TEC-01',dimension:'TEC',question:'我了解企业级AI技术平台的核心组成'},
    {id:20,code:'TEC-02',dimension:'TEC',question:'我能够根据业务场景选择合适的AI模型'},
    {id:21,code:'TEC-03',dimension:'TEC',question:'我了解模型部署、监控和持续迭代的流程'},
    {id:22,code:'TEC-04',dimension:'TEC',question:'我能够将AI能力集成到现有业务系统中'},
    {id:23,code:'TEC-05',dimension:'TEC',question:'我能够使用低代码平台搭建简单AI应用'},
    {id:24,code:'CUL-01',dimension:'CUL',question:'我能够向非技术背景的人解释AI的价值和应用'},
    {id:25,code:'CUL-02',dimension:'CUL',question:'我能够识别员工对AI的焦虑并给予正向引导'},
    {id:26,code:'CUL-03',dimension:'CUL',question:'我设计过将AI成果纳入绩效考核的激励机制'},
    {id:27,code:'CUL-04',dimension:'CUL',question:'我能够设计和交付AI工具使用的培训课程'},
    {id:28,code:'CUL-05',dimension:'CUL',question:'我了解AI伦理、版权、隐私保护的红线和边界'},
    {id:29,code:'CUL-06',dimension:'CUL',question:'我建立了个人/团队的持续学习和知识分享机制'},
];

const SUGGESTIONS = {
    'STR': '建议参加AI战略规划工作坊，学习行业最佳实践，尝试主导一个小场景的AI落地项目',
    'ORG': '建议深入学习人机协作设计方法，参与跨部门AI项目，推动建立内部AI卓越中心',
    'DAT': '建议系统学习数据治理知识，参与企业数据资产盘点，搭建部门级知识库',
    'TEC': '建议了解主流AI模型特点，学习LLMOps基础，参与AI平台规划讨论',
    'CUL': '建议学习变革管理方法，设计团队AI激励机制，成为组织内的AI布道师',
};

// Auth State
auth.onAuthStateChanged(user => {
    currentUser = user;
    document.getElementById('loading').classList.add('hidden');
    if (user) {
        showHome();
        loadHistory();
    } else {
        showAuth();
    }
});

// Show Views
function showAuth() {
    hideAll();
    document.getElementById('authView').classList.remove('hidden');
}

function showHome() {
    hideAll();
    document.getElementById('homeView').classList.remove('hidden');
    document.getElementById('userInfo').textContent = currentUser.email;
}

function showDashboard() {
    hideAll();
    document.getElementById('dashboardView').classList.remove('hidden');
    document.getElementById('dashUser').textContent = currentUser.email;
}

function showAssessment() {
    hideAll();
    document.getElementById('assessmentView').classList.remove('hidden');
    currentAnswers = {};
    currentQNum = 1;
    renderQuestion();
}

function showSaveInfo() {
    hideAll();
    document.getElementById('saveInfoView').classList.remove('hidden');
}

function showResult(results, overall) {
    hideAll();
    document.getElementById('resultView').classList.remove('hidden');
    renderResult(results, overall);
}

function hideAll() {
    ['authView','homeView','assessmentView','saveInfoView','resultView','dashboardView'].forEach(id => {
        document.getElementById(id).classList.add('hidden');
    });
}

// Auth
let isLogin = true;
document.getElementById('authSwitchBtn').addEventListener('click', e => {
    e.preventDefault();
    isLogin = !isLogin;
    document.getElementById('authTitle').textContent = isLogin ? '用户登录' : '创建账号';
    document.getElementById('authSwitchBtn').textContent = isLogin ? '立即注册' : '立即登录';
    document.getElementById('authSwitchText').textContent = isLogin ? '还没有账号？' : '已有账号？';
    document.getElementById('authCompanyGroup').classList.toggle('hidden', isLogin);
});

document.getElementById('authForm').addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    const company = document.getElementById('authCompany').value;
    const errorEl = document.getElementById('authError');
    
    try {
        if (isLogin) {
            await auth.signInWithEmailAndPassword(email, password);
        } else {
            const cred = await auth.createUserWithEmailAndPassword(email, password);
            if (company) {
                await db.collection('users').doc(cred.user.uid).set({ company, email, createdAt: new Date() });
            }
        }
        showHome();
    } catch (err) {
        errorEl.textContent = err.message;
        errorEl.classList.remove('hidden');
    }
});

function logout() {
    auth.signOut();
}

// Assessment
function startAssessment() {
    if (!currentUser) {
        showAuth();
        return;
    }
    assessmentId = 'asm_' + Date.now();
    currentAnswers = {};
    currentQNum = 1;
    showAssessment();
}

function renderQuestion() {
    const q = QUESTIONS[currentQNum - 1];
    document.getElementById('qNum').textContent = currentQNum;
    document.getElementById('progressPct').textContent = Math.round((currentQNum / TOTAL_QUESTIONS) * 100) + '%';
    document.getElementById('progressBar').style.width = (currentQNum / TOTAL_QUESTIONS * 100) + '%';
    document.getElementById('qCode').textContent = q.code;
    document.getElementById('qDim').textContent = q.dimension + ' ' + DIMENSIONS[q.dimension].name;
    document.getElementById('qText').textContent = q.question;
    
    document.getElementById('prevBtn').classList.toggle('hidden', currentQNum <= 1);
    document.getElementById('nextBtn').textContent = currentQNum < TOTAL_QUESTIONS ? '下一题 →' : '查看结果 →';
    
    // Render options
    const container = document.getElementById('scoreOptions');
    container.innerHTML = '';
    const labels = ['完全不符','不太符合','一般','比较符合','完全符合'];
    for (let i = 1; i <= 5; i++) {
        const selected = currentAnswers[q.id] === i;
        const div = document.createElement('div');
        div.className = `score-option flex flex-col items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${selected ? 'selected border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-400'}`;
        div.innerHTML = `
            <input type="radio" name="score" value="${i}" class="sr-only" ${selected ? 'checked' : ''}>
            <span class="text-2xl font-bold text-gray-700 mb-1">${i}</span>
            <span class="text-xs text-gray-500">${labels[i-1]}</span>
        `;
        div.addEventListener('click', () => selectScore(i));
        container.appendChild(div);
    }
}

function selectScore(score) {
    const q = QUESTIONS[currentQNum - 1];
    currentAnswers[q.id] = score;
    renderQuestion();
}

function nextQuestion() {
    const q = QUESTIONS[currentQNum - 1];
    if (!currentAnswers[q.id]) {
        alert('请选择评分');
        return;
    }
    
    if (currentQNum < TOTAL_QUESTIONS) {
        currentQNum++;
        renderQuestion();
    } else {
        showSaveInfo();
    }
}

function prevQuestion() {
    if (currentQNum > 1) {
        currentQNum--;
        renderQuestion();
    }
}

function quitAssessment() {
    if (confirm('确定退出？当前进度将丢失。')) {
        showHome();
    }
}

function skipSave() {
    saveResult({ name: '', department: '', position: '' });
}

document.getElementById('saveInfoForm').addEventListener('submit', e => {
    e.preventDefault();
    saveResult({
        name: document.getElementById('infoName').value,
        department: document.getElementById('infoDept').value,
        position: document.getElementById('infoPosition').value
    });
});

async function saveResult(info) {
    const results = calculateResults();
    const overall = results.overall;
    
    await db.collection('assessments').doc(assessmentId).set({
        userId: currentUser.uid,
        userEmail: currentUser.email,
        ...info,
        answers: currentAnswers,
        results: results.dims,
        overallScore: overall,
        createdAt: new Date()
    });
    
    showResult(results.dims, overall);
}

function calculateResults() {
    const dimScores = {};
    const dimCounts = {};
    
    for (const q of QUESTIONS) {
        const dim = q.dimension;
        if (currentAnswers[q.id]) {
            dimScores[dim] = (dimScores[dim] || 0) + currentAnswers[q.id];
            dimCounts[dim] = (dimCounts[dim] || 0) + 1;
        }
    }
    
    const dims = [];
    let totalWeighted = 0;
    
    for (const code in DIMENSIONS) {
        const info = DIMENSIONS[code];
        const maxScore = dimCounts[code] * 5 || 1;
        const actualScore = dimScores[code] || 0;
        const rate = actualScore / maxScore;
        const avgScore = actualScore / dimCounts[code] || 0;
        
        let level;
        if (rate < 0.3) level = 1;
        else if (rate < 0.5) level = 2;
        else if (rate < 0.7) level = 3;
        else if (rate < 0.85) level = 4;
        else level = 5;
        
        dims.push({
            code, name: info.name, color: info.color,
            rate, avgScore, level,
            levelName: ['初步了解','基础应用','熟练应用','优化创新','专家引领'][level-1],
            suggestion: SUGGESTIONS[code]
        });
        
        totalWeighted += rate * info.weight;
    }
    
    return { dims, overall: totalWeighted * 5 };
}

function renderResult(dims, overall) {
    const dimNames = {name: '', department: '', position: ''};
    document.getElementById('resultUser').textContent = '评估完成';
    document.getElementById('overallScore').textContent = overall.toFixed(1);
    
    let comment;
    if (overall >= 4.5) comment = '你是AI组织转型的专家级人才！';
    else if (overall >= 3.5) comment = '你具备较强的AI组织转型能力';
    else if (overall >= 2.5) comment = '你处于AI能力的中等水平，有较大提升空间';
    else comment = '你的AI能力还需要大量学习和实践';
    document.getElementById('overallComment').textContent = comment;
    
    // Radar
    const ctx = document.getElementById('radarChart').getContext('2d');
    if (window.radarChart) window.radarChart.destroy();
    window.radarChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: dims.map(d => d.name),
            datasets: [{
                label: '能力得分',
                data: dims.map(d => d.rate * 100),
                backgroundColor: 'rgba(30,114,213,0.2)',
                borderColor: '#1E72D5',
                borderWidth: 2,
                pointBackgroundColor: dims.map(d => d.color),
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: { r: { beginAtZero: true, max: 100, ticks: { stepSize: 20 } } },
            plugins: { legend: { display: false } }
        }
    });
    
    // Dims
    const dimResults = document.getElementById('dimResults');
    dimResults.innerHTML = dims.map(d => `
        <div class="border border-gray-100 rounded-lg p-4">
            <div class="flex justify-between items-center mb-2">
                <span class="font-medium text-gray-800">${d.name}</span>
                <span class="font-bold text-gray-800">${d.avgScore.toFixed(1)}/5</span>
            </div>
            <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div class="h-full rounded-full" style="width:${d.rate*100}%;background:${d.color}"></div>
            </div>
        </div>
    `).join('');
    
    // Strengths & Weaknesses
    const sorted = [...dims].sort((a,b) => a.rate - b.rate);
    document.getElementById('strengths').innerHTML = sorted.slice(-2).reverse().map(d => `
        <div class="bg-white rounded-lg p-3">
            <div class="flex justify-between items-center">
                <span class="font-medium text-gray-800">${d.name}</span>
                <span class="font-bold text-green-600">${(d.rate*100).toFixed(0)}%</span>
            </div>
        </div>
    `).join('');
    
    document.getElementById('weaknesses').innerHTML = sorted.slice(0,2).map(d => `
        <div class="bg-white rounded-lg p-3">
            <div class="flex justify-between items-center">
                <span class="font-medium text-gray-800">${d.name}</span>
                <span class="font-bold text-orange-600">${(d.rate*100).toFixed(0)}%</span>
            </div>
        </div>
    `).join('');
    
    // Suggestions
    document.getElementById('suggestions').innerHTML = dims.map(d => `
        <div class="border-l-4 rounded-r-lg p-4" style="border-color:${d.color};background:${d.color}10">
            <div class="font-medium text-gray-800 mb-1">${d.name}</div>
            <p class="text-sm text-gray-600">${d.suggestion}</p>
        </div>
    `).join('');
}

function backHome() {
    showHome();
    loadHistory();
}

function downloadPDF() {
    // Simple alert - actual PDF generation would need server-side or jsPDF
    alert('PDF功能即将上线，请查看屏幕截图保存报告');
    window.print();
}

// History
async function loadHistory() {
    if (!currentUser) return;
    
    const snap = await db.collection('assessments')
        .where('userId', '==', currentUser.uid)
        .orderBy('createdAt', 'desc')
        .limit(20)
        .get();
    
    const history = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    // Stats
    document.getElementById('statCount').textContent = history.length;
    if (history.length > 0) {
        const avg = history.reduce((s, h) => s + h.overallScore, 0) / history.length;
        const max = Math.max(...history.map(h => h.overallScore));
        document.getElementById('statAvg').textContent = avg.toFixed(1);
        document.getElementById('statMax').textContent = max.toFixed(1);
    }
    
    // List
    document.getElementById('historyList').innerHTML = history.length === 0 
        ? '<p class="text-gray-500 text-center py-8">暂无历史记录</p>'
        : history.map(h => `
            <div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div class="flex-1">
                    <div class="font-medium text-gray-800">${h.name || '匿名'}${h.department ? ' · ' + h.department : ''}</div>
                    <div class="text-sm text-gray-500">${h.createdAt?.toDate().toLocaleDateString() || ''}</div>
                </div>
                <div class="flex items-center space-x-3">
                    <div class="text-right">
                        <div class="text-2xl font-bold ${h.overallScore >= 4 ? 'text-green-600' : h.overallScore >= 3 ? 'text-blue-600' : 'text-orange-600'}">${h.overallScore?.toFixed(1) || '-'}</div>
                    </div>
                    <button onclick="viewHistory('${h.id}')" class="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200">查看</button>
                </div>
            </div>
        `).join('');
}

async function viewHistory(id) {
    const doc = await db.collection('assessments').doc(id).get();
    if (doc.exists) {
        const data = doc.data();
        showResult(data.results, data.overallScore);
    }
}

// Keyboard
document.addEventListener('keydown', e => {
    if (document.getElementById('assessmentView').classList.contains('hidden')) return;
    if (e.key >= '1' && e.key <= '5') {
        selectScore(parseInt(e.key));
    } else if (e.key === 'Enter') {
        nextQuestion();
    }
});
