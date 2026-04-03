// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBQAYfQZCnRhQvYq76ul3ShWRSiQ1iOxIo",
    authDomain: "aihr-60e60.firebaseapp.com",
    projectId: "aihr-60e60",
    storageBucket: "aihr-60e60.firebasestorage.app",
    messagingSenderId: "735997478053",
    appId: "1:735997478053:web:7f7bde2d244d417fa8394c"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// State
let currentUser = null;
let currentUserData = null;
let currentAnswers = {};
let currentQNum = 1;
let assessmentId = null;
const TOTAL_QUESTIONS = 29;

// User roles
const ROLES = { PLATFORM_ADMIN: 'platform_admin', TENANT_ADMIN: 'tenant_admin', USER: 'user' };

// Dimensions & Questions (same as before)
const DIMENSIONS = {
    'STR': { name: '战略与价值流重构', weight: 0.20, color: '#4472C4', icon: '⚡' },
    'ORG': { name: '组织架构与人才', weight: 0.25, color: '#70AD47', icon: '👥' },
    'DAT': { name: '数据底座与治理', weight: 0.20, color: '#FFC000', icon: '📊' },
    'TEC': { name: '技术基础设施', weight: 0.15, color: '#ED7D31', icon: '🔧' },
    'CUL': { name: '文化与变革管理', weight: 0.20, color: '#9E480E', icon: '🎯' },
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

// Recommendations (same as before - abbreviated for space)
const DETAILED_RECOMMENDATIONS = {
    'STR': {
        level1: { title: '从零起步：建立AI战略认知', phase1: ['参加AI战略规划入门培训','识别本部门2-3个可快速验证的AI应用场景'], phase2: ['主导一个小场景的AI试点项目','学习ROI测算方法'] },
        level2: { title: '夯实基础：推动局部试点', phase1: ['系统性梳理本部门业务流程','选取1-2个痛点明确的场景作为破局点'], phase2: ['制定本部门AI应用中短期规划','培养1-2名AI布道师'] },
        level3: { title: '规模化推进：构建组织级AI能力', phase1: ['推动成立部门级AI工作组','制定AI与业务融合的OKR'], phase2: ['主导3-5个核心业务流程的AI化改造','建立AI知识共享机制'] },
        level4: { title: '深度融合：成为AI转型领导者', phase1: ['制定企业级AI战略路线图','推动建立AI卓越中心(COE)'], phase2: ['重构核心业务流','建立AI创新激励机制'] },
        level5: { title: '引领变革：成为行业AI标杆', phase1: ['主导企业AI战略制定','构建企业级AI知识库'], phase2: ['推动商业模式重构','赋能上下游生态'] }
    },
    'ORG': {
        level1: { title: '从零起步：建立人机协作意识', phase1: ['学习AI工具基础操作','主动参与公司AI培训'], phase2: ['在日常工作中有意识使用AI工具辅助'] },
        level2: { title: '夯实基础：掌握人机协作技能', phase1: ['系统学习Prompt工程','识别可能被AI替代的工作内容'], phase2: ['在本岗位推动人机协作试点','建立个人AI工具箱'] },
        level3: { title: '规模化推进：推动组织人才转型', phase1: ['主导岗位转型计划','建立AI人才识别和评估标准'], phase2: ['参与或推动AI卓越中心建设','主导2-3个跨部门AI项目'] },
        level4: { title: '深度融合：重塑组织人才体系', phase1: ['系统性盘点被替代与新生的岗位','设计岗位转型路径'], phase2: ['重塑组织架构','建立AI能力认证体系'] },
        level5: { title: '引领变革：成为人才管理标杆', phase1: ['制定企业级AI人才战略','主导组织架构扁平化改革'], phase2: ['构建AI驱动的新型组织架构','打造AI原生企业文化'] }
    },
    'DAT': {
        level1: { title: '从零起步：建立数据意识', phase1: ['了解数据类型和来源','识别本岗位涉及的核心数据资产'], phase2: ['记录数据来源和处理流程'] },
        level2: { title: '夯实基础：推动数据治理', phase1: ['识别数据质量问题','了解数据合规基本要求'], phase2: ['参与数据资产盘点','推动建立数据标准'] },
        level3: { title: '规模化推进：构建数据中台', phase1: ['主导数据责任人制度','推动非结构化数据资产化'], phase2: ['构建部门级数据看板','推动RAG系统建设'] },
        level4: { title: '深度融合：打造智能数据引擎', phase1: ['主导企业级数据中台建设','推动AI模型训练数据的准备'], phase2: ['实现核心业务数据实时分析','建立预测性分析能力'] },
        level5: { title: '引领变革：成为数据驱动标杆', phase1: ['制定企业数据战略','推动数据资产市场化运营'], phase2: ['实现全面数据驱动决策','构建数据智能平台'] }
    },
    'TEC': {
        level1: { title: '从零起步：建立技术认知', phase1: ['了解主流AI模型特点和适用场景','学习使用现成的AI工具'], phase2: ['尝试使用低代码AI平台'] },
        level2: { title: '夯实基础：掌握集成能力', phase1: ['学习API调用','掌握AI工具与业务系统的集成'], phase2: ['主导1-2个AI工具的部门级推广'] },
        level3: { title: '规模化推进：构建AI平台', phase1: ['参与AI平台基础设施建设','推动AI能力的API化封装'], phase2: ['建立模型效果评估机制','推动低代码AI平台普及'] },
        level4: { title: '深度融合：实现技术自主', phase1: ['主导AI平台企业级建设','推动模型选型标准化'], phase2: ['实现核心AI能力自主可控','建立AI技术标准'] },
        level5: { title: '引领变革：构建技术壁垒', phase1: ['制定企业AI技术战略','主导AI核心技术研发'], phase2: ['构建行业领先的AI技术平台','推动AI技术生态构建'] }
    },
    'CUL': {
        level1: { title: '从零起步：克服AI焦虑', phase1: ['正视AI带来的变化','参加AI通识培训'], phase2: ['主动尝试使用AI工具'] },
        level2: { title: '夯实基础：成为早期采纳者', phase1: ['系统学习AI工具','帮助同事解决问题'], phase2: ['主导部门内AI培训和知识分享'] },
        level3: { title: '规模化推进：推动文化变革', phase1: ['主导AI变革沟通策略','设计AI激励考核机制'], phase2: ['建立AI创新案例库','推动AI素养纳入全员能力模型'] },
        level4: { title: '深度融合：重塑组织文化', phase1: ['主导组织级AI文化塑造','设计AI时代领导力发展计划'], phase2: ['建立AI优先的决策文化','构建学习型组织机制'] },
        level5: { title: '引领变革：成为文化标杆', phase1: ['制定企业AI文化战略','主导AI伦理合规框架'], phase2: ['构建行业领先的AI文化','成为行业AI文化标杆'] }
    }
};

const PITFALL_WARNINGS = {
    'STR': '⚠️ 警惕：避免技术自嗨，99%企业不需要自研基座模型',
    'ORG': '⚠️ 警惕：避免组织排异，让AI成为增强工具而非替代镰刀',
    'DAT': '⚠️ 警惕：避免数据沼泽，没有高质量数据AI就是空中楼阁',
    'TEC': '⚠️ 警惕：避免厂商锁定，建立模型网关',
    'CUL': '⚠️ 警惕：避免合规红线，严格数据脱敏与私有化部署'
};

// ============ Auth & User Management ============

auth.onAuthStateChanged(async user => {
    currentUser = user;
    document.getElementById('loading').classList.add('hidden');
    
    if (user) {
        // Fetch user data
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
            currentUserData = userDoc.data();
        } else {
            // New user - create user doc with default role
            currentUserData = {
                email: user.email,
                role: 'user',
                tenantId: null,
                department: '',
                position: '',
                createdAt: new Date(),
                isActive: true
            };
            await db.collection('users').doc(user.uid).set(currentUserData);
        }
        showApp();
    } else {
        showAuth();
    }
});

// ============ Navigation ============

function showApp() {
    hideAllViews();
    
    // Show home/dashboard based on role
    if (currentUserData.role === 'platform_admin') {
        showPlatformDashboard();
    } else if (currentUserData.role === 'tenant_admin') {
        showTenantDashboard();
    } else {
        showUserHome();
    }
}

function showAuth() {
    hideAllViews();
    document.getElementById('authView').classList.remove('hidden');
}

function showUserHome() {
    hideAllViews();
    document.getElementById('homeView').classList.remove('hidden');
    document.getElementById('userInfo').textContent = currentUser.email;
}

function hideAllViews() {
    ['authView','homeView','assessmentView','saveInfoView','resultView','adminView','teamView'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
}

// ============ Admin: Tenant Dashboard ============

async function showTenantDashboard() {
    hideAllViews();
    document.getElementById('adminView').classList.remove('hidden');
    document.getElementById('userInfo2').textContent = currentUser.email;
    
    // Load tenant info
    if (currentUserData.tenantId) {
        const tenantDoc = await db.collection('tenants').doc(currentUserData.tenantId).get();
        if (tenantDoc.exists) {
            const tenant = tenantDoc.data();
            document.getElementById('tenantName').textContent = tenant.name;
            document.getElementById('tenantPlan').textContent = tenant.plan || '试用版';
        }
    }
    
    // Load team stats
    await loadTeamStats();
    
    // Load users list
    await loadTenantUsers();
}

async function loadTeamStats() {
    if (!currentUserData.tenantId) return;
    
    const snap = await db.collection('assessments')
        .where('tenantId', '==', currentUserData.tenantId)
        .get();
    
    const assessments = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    document.getElementById('statTotalUsers').textContent = assessments.length;
    
    if (assessments.length > 0) {
        const avg = assessments.reduce((s, a) => s + (a.overallScore || 0), 0) / assessments.length;
        const max = Math.max(...assessments.map(a => a.overallScore || 0));
        const min = Math.min(...assessments.map(a => a.overallScore || 0));
        
        document.getElementById('statAvgScore').textContent = avg.toFixed(1);
        document.getElementById('statMaxScore').textContent = max.toFixed(1);
        document.getElementById('statMinScore').textContent = min.toFixed(1);
        
        // Level distribution
        const levelDist = {1:0,2:0,3:0,4:0,5:0};
        assessments.forEach(a => {
            const score = a.overallScore || 0;
            if (score >= 4.5) levelDist[5]++;
            else if (score >= 3.5) levelDist[4]++;
            else if (score >= 2.5) levelDist[3]++;
            else if (score >= 1.5) levelDist[2]++;
            else levelDist[1]++;
        });
        
        document.getElementById('levelDist').innerHTML = Object.entries(levelDist).map(([level, count]) => 
            `<div class="flex items-center"><span class="w-20">Level ${level}:</span><div class="flex-1 h-4 bg-gray-200 rounded"><div class="h-full bg-blue-500 rounded" style="width:${(count/assessments.length*100)}%"></div></div><span class="ml-2">${count}人</span></div>`
        ).join('');
        
        // Department distribution
        const deptScores = {};
        assessments.forEach(a => {
            const dept = a.department || '未填写';
            if (!deptScores[dept]) deptScores[dept] = {count:0, total:0};
            deptScores[dept].count++;
            deptScores[dept].total += a.overallScore || 0;
        });
        
        document.getElementById('deptDist').innerHTML = Object.entries(deptScores).map(([dept, data]) => 
            `<div class="flex items-center justify-between p-2 bg-gray-50 rounded"><span>${dept}</span><span><b>${(data.total/data.count).toFixed(1)}</b>分 (${data.count}人)</span></div>`
        ).join('');
    }
}

async function loadTenantUsers() {
    if (!currentUserData.tenantId) return;
    
    const snap = await db.collection('users')
        .where('tenantId', '==', currentUserData.tenantId)
        .get();
    
    const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    document.getElementById('usersList').innerHTML = users.map(u => `
        <div class="flex items-center justify-between p-3 border-b">
            <div><div class="font-medium">${u.email}</div><div class="text-sm text-gray-500">${u.department || ''} ${u.position || ''}</div></div>
            <div class="flex items-center gap-2">
                <span class="px-2 py-1 text-xs rounded ${u.role === 'tenant_admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}">${u.role === 'tenant_admin' ? '管理员' : '用户'}</span>
                <span class="px-2 py-1 text-xs rounded ${u.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">${u.isActive !== false ? '正常' : '停用'}</span>
            </div>
        </div>
    `).join('');
}

// ============ Reports Management ============

async function showReports() {
    hideAllViews();
    document.getElementById('reportsView').classList.remove('hidden');
    
    await loadReports();
}

async function loadReports() {
    if (!currentUserData.tenantId) return;
    
    const snap = await db.collection('assessments')
        .where('tenantId', '==', currentUserData.tenantId)
        .orderBy('createdAt', 'desc')
        .get();
    
    const reports = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    const container = document.getElementById('reportsList');
    if (reports.length === 0) {
        container.innerHTML = '<div class="text-center py-12 text-gray-500">暂无测评记录</div>';
        return;
    }
    
    container.innerHTML = `
        <table class="w-full">
            <thead class="bg-gray-50">
                <tr>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">姓名</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">部门/岗位</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">得分</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">日期</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
                ${reports.map(r => `
                    <tr>
                        <td class="px-4 py-3 font-medium">${r.name || '未填写'}</td>
                        <td class="px-4 py-3 text-sm text-gray-600">${r.department || '-'}${r.position ? ' / ' + r.position : ''}</td>
                        <td class="px-4 py-3"><span class="px-2 py-1 rounded text-sm font-bold ${r.overallScore >= 4 ? 'bg-green-100 text-green-800' : r.overallScore >= 3 ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}">${r.overallScore?.toFixed(1) || '-'}</span></td>
                        <td class="px-4 py-3 text-sm text-gray-600">${r.createdAt?.toDate().toLocaleDateString() || '-'}</td>
                        <td class="px-4 py-3">
                            <button onclick="viewReport('${r.id}')" class="text-blue-600 hover:underline mr-3">查看</button>
                            <button onclick="exportReport('${r.id}')" class="text-green-600 hover:underline">导出</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

async function viewReport(id) {
    const doc = await db.collection('assessments').doc(id).get();
    if (doc.exists) {
        const data = doc.data();
        showResult(data.results, data.overallScore);
    }
}

function exportReport(id) {
    window.open(`/report.html?id=${id}`, '_blank');
}

// Export all reports as CSV
async function exportAllReports() {
    if (!currentUserData.tenantId) return;
    
    const snap = await db.collection('assessments')
        .where('tenantId', '==', currentUserData.tenantId)
        .orderBy('createdAt', 'desc')
        .get();
    
    const reports = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    if (reports.length === 0) {
        alert('暂无数据可导出');
        return;
    }
    
    // CSV header
    let csv = '\uFEFF'; // BOM for UTF-8
    csv += '姓名,部门,岗位,综合得分,战略与价值流,组织与人才,数据底座与治理,技术基础设施,文化与变革,日期\n';
    
    reports.forEach(r => {
        const dims = r.results || [];
        csv += [
            r.name || '',
            r.department || '',
            r.position || '',
            r.overallScore?.toFixed(1) || '',
            dims.find(d => d.code === 'STR')?.rate ? (dims.find(d => d.code === 'STR').rate * 100).toFixed(0) + '%' : '',
            dims.find(d => d.code === 'ORG')?.rate ? (dims.find(d => d.code === 'ORG').rate * 100).toFixed(0) + '%' : '',
            dims.find(d => d.code === 'DAT')?.rate ? (dims.find(d => d.code === 'DAT').rate * 100).toFixed(0) + '%' : '',
            dims.find(d => d.code === 'TEC')?.rate ? (dims.find(d => d.code === 'TEC').rate * 100).toFixed(0) + '%' : '',
            dims.find(d => d.code === 'CUL')?.rate ? (dims.find(d => d.code === 'CUL').rate * 100).toFixed(0) + '%' : '',
            r.createdAt?.toDate().toLocaleDateString() || ''
        ].join(',') + '\n';
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `测评报告_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// ============ Invite User ============

async function showInviteModal() {
    const email = prompt('输入要邀请的用户邮箱：');
    if (!email) return;
    
    const role = confirm('设置为管理员? (确定=是管理员, 取消=普通用户)') ? 'tenant_admin' : 'user';
    
    const invRef = db.collection('invitations').doc();
    await invRef.set({
        tenantId: currentUserData.tenantId,
        email: email,
        role: role,
        invitedBy: currentUser.uid,
        status: 'pending',
        createdAt: new Date(),
        expireAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });
    
    alert('邀请已发送！用户注册后会收到邀请链接。');
}

// ============ Assessment Flow (same as before) ============

function startAssessment() {
    if (!currentUser) { showAuth(); return; }
    assessmentId = 'asm_' + Date.now();
    currentAnswers = {};
    currentQNum = 1;
    hideAllViews();
    document.getElementById('assessmentView').classList.remove('hidden');
    renderQuestion();
}

function renderQuestion() {
    const q = QUESTIONS[currentQNum - 1];
    document.getElementById('qNum').textContent = currentQNum;
    document.getElementById('progressPct').textContent = Math.round((currentQNum / TOTAL_QUESTIONS) * 100) + '%';
    document.getElementById('progressBar').style.width = (currentQNum / TOTAL_QUESTIONS * 100) + '%';
    document.getElementById('qCode').textContent = q.code;
    document.getElementById('qText').textContent = q.question;
    document.getElementById('prevBtn').classList.toggle('hidden', currentQNum <= 1);
    document.getElementById('nextBtn').textContent = currentQNum < TOTAL_QUESTIONS ? '下一题 →' : '查看结果 →';
    
    const container = document.getElementById('scoreOptions');
    container.innerHTML = '';
    const labels = ['完全不符','不太符合','一般','比较符合','完全符合'];
    for (let i = 1; i <= 5; i++) {
        const selected = currentAnswers[q.id] === i;
        const div = document.createElement('div');
        div.className = `score-option flex flex-col items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${selected ? 'selected border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-400'}`;
        div.innerHTML = `<input type="radio" name="score" value="${i}" class="sr-only" ${selected ? 'checked' : ''}><span class="text-2xl font-bold text-gray-700 mb-1">${i}</span><span class="text-xs text-gray-500">${labels[i-1]}</span>`;
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
    if (!currentAnswers[q.id]) { alert('请选择评分'); return; }
    if (currentQNum < TOTAL_QUESTIONS) { currentQNum++; renderQuestion(); }
    else { showSaveInfo(); }
}

function prevQuestion() {
    if (currentQNum > 1) { currentQNum--; renderQuestion(); }
}

function showSaveInfo() {
    hideAllViews();
    document.getElementById('saveInfoView').classList.remove('hidden');
}

async function saveResult(info) {
    if (!currentUser) { showAuth(); return; }
    
    const results = calculateResults();
    const overall = results.overall;
    
    await db.collection('assessments').doc(assessmentId).set({
        userId: currentUser.uid,
        userEmail: currentUser.email,
        tenantId: currentUserData.tenantId,
        ...info,
        answers: currentAnswers,
        results: results.dims,
        overallScore: overall,
        createdAt: new Date()
    });
    
    showResult(results.dims, overall);
}

function calculateResults() {
    const dimScores = {}, dimCounts = {};
    for (const q of QUESTIONS) {
        if (currentAnswers[q.id]) {
            dimScores[q.dimension] = (dimScores[q.dimension] || 0) + currentAnswers[q.id];
            dimCounts[q.dimension] = (dimCounts[q.dimension] || 0) + 1;
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
        let level = rate < 0.3 ? 1 : rate < 0.5 ? 2 : rate < 0.7 ? 3 : rate < 0.85 ? 4 : 5;
        
        dims.push({ code, name: info.name, color: info.color, icon: info.icon, rate, avgScore, level,
            levelName: ['初步了解','基础应用','熟练应用','优化创新','专家引领'][level-1] });
        totalWeighted += rate * info.weight;
    }
    return { dims, overall: totalWeighted * 5 };
}

function showResult(dims, overall) {
    hideAllViews();
    document.getElementById('resultView').classList.remove('hidden');
    
    document.getElementById('overallScore').textContent = overall.toFixed(1);
    document.getElementById('overallComment').textContent = 
        overall >= 4.5 ? '你是AI组织转型的专家级人才！' :
        overall >= 3.5 ? '你具备较强的AI组织转型能力' :
        overall >= 2.5 ? '你处于AI能力的中等水平，有较大提升空间' :
        '你的AI能力还需要大量学习和实践';
    
    // Dimension bars
    document.getElementById('dimResults').innerHTML = dims.map(d => `
        <div class="border border-gray-100 rounded-lg p-4">
            <div class="flex justify-between items-center mb-2">
                <span class="font-medium text-gray-800 text-sm">${d.name}</span>
                <span class="font-bold text-gray-800">${d.avgScore.toFixed(1)}/5</span>
            </div>
            <div class="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div class="h-full rounded-full" style="width:${d.rate*100}%; background: ${d.color}"></div>
            </div>
            <div class="flex justify-between items-center mt-1">
                <span class="text-xs text-gray-500">等级${d.level} ${d.levelName}</span>
                <span class="text-xs font-bold" style="color: ${d.color}">${(d.rate*100).toFixed(0)}%</span>
            </div>
        </div>
    `).join('');
    
    // Recommendations
    document.getElementById('dimensionRecs').innerHTML = dims.map(d => {
        const rec = DETAILED_RECOMMENDATIONS[d.code][`level${d.level}`];
        return `
        <div class="mb-6 p-6 bg-white rounded-2xl border border-gray-200 shadow-sm">
            <div class="flex items-center mb-4">
                <div class="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mr-4" style="background: ${d.color}20; color: ${d.color}">${d.icon}</div>
                <div><h4 class="font-bold text-gray-800">${d.name}</h4><span class="text-sm text-gray-500">等级${d.level} ${d.levelName}</span></div>
            </div>
            <div class="mb-4 p-4 bg-blue-50 rounded-xl"><b>📌 ${rec.title}</b></div>
            <div class="mb-3"><b>🚀 第一阶段（1-3个月）</b><ul class="mt-2 space-y-1">${rec.phase1.map(i => `<li class="text-sm text-gray-600">• ${i}</li>`).join('')}</ul></div>
            <div class="mb-3"><b>⚡ 第二阶段（4-9个月）</b><ul class="mt-2 space-y-1">${rec.phase2.map(i => `<li class="text-sm text-gray-600">• ${i}</li>`).join('')}</ul></div>
            <div class="p-3 bg-yellow-50 rounded-lg border border-yellow-200"><span class="text-sm text-yellow-800">${PITFALL_WARNINGS[d.code]}</span></div>
        </div>`;
    }).join('');
    
    // Radar chart
    const ctx = document.getElementById('radarChart').getContext('2d');
    if (window.radarChart) window.radarChart.destroy();
    window.radarChart = new Chart(ctx, {
        type: 'radar',
        data: { labels: dims.map(d => d.name), datasets: [{ label: '能力得分', data: dims.map(d => d.rate * 100), backgroundColor: 'rgba(30,114,213,0.2)', borderColor: '#1E72D5', borderWidth: 2, pointBackgroundColor: dims.map(d => d.color) }] },
        options: { responsive: true, maintainAspectRatio: false, scales: { r: { beginAtZero: true, max: 100, ticks: { stepSize: 20 } } }, plugins: { legend: { display: false } } }
    });
}

// ============ Auth Form ============

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
    
    try {
        if (isLogin) {
            await auth.signInWithEmailAndPassword(email, password);
        } else {
            const cred = await auth.createUserWithEmailAndPassword(email, password);
            // Create tenant for new user
            const tenantRef = db.collection('tenants').doc();
            await tenantRef.set({
                name: company || email.split('@')[0],
                plan: 'trial',
                admins: [cred.user.uid],
                createdAt: new Date()
            });
            // Update user with tenant and admin role
            await db.collection('users').doc(cred.user.uid).set({
                email: email,
                role: 'tenant_admin', // First user becomes admin
                tenantId: tenantRef.id,
                department: '',
                position: '',
                createdAt: new Date(),
                isActive: true
            });
        }
    } catch (err) {
        document.getElementById('authError').textContent = err.message;
        document.getElementById('authError').classList.remove('hidden');
    }
});

function logout() { auth.signOut(); }

// ============ Init ============

document.addEventListener('keydown', e => {
    if (document.getElementById('assessmentView').classList.contains('hidden')) return;
    if (e.key >= '1' && e.key <= '5') selectScore(parseInt(e.key));
    else if (e.key === 'Enter') nextQuestion();
});
