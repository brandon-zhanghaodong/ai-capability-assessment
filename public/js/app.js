// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBQAYfQZCnRhQvYq76ul3ShWRSiQ1iOxIo",
    authDomain: "aihr-60e60.firebaseapp.com",
    projectId: "aihr-60e60",
    storageBucket: "aihr-60e60.firebasestorage.app",
    messagingSenderId: "735997478053",
    appId: "1:735997478053:web:7f7bde2d244d417fa8394c"
};

// Initialize Firebase
if (!firebase.apps.length) {
    try {
        firebase.initializeApp(firebaseConfig);
        console.log('Firebase initialized successfully');
    } catch (e) {
        console.error('Firebase init error:', e);
    }
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
    'STR': { name: '战略与价值流重构', weight: 0.20, color: '#4472C4', icon: '⚡' },
    'ORG': { name: '组织架构与人才', weight: 0.25, color: '#70AD47', icon: '👥' },
    'DAT': { name: '数据底座与治理', weight: 0.20, color: '#FFC000', icon: '📊' },
    'TEC': { name: '技术基础设施', weight: 0.15, color: '#ED7D31', icon: '🔧' },
    'CUL': { name: '文化与变革管理', weight: 0.20, color: '#9E480E', icon: '🎯' },
};

// Questions
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

// 详细的阶段性建议（基于AI组织转型实战框架）
const DETAILED_RECOMMENDATIONS = {
    'STR': {
        level1: {
            title: '从零起步：建立AI战略认知',
            phase1: [
                '参加AI战略规划入门培训，理解AI对行业的影响',
                '阅读《AI超级领导者》等基础读物，建立AI认知框架',
                '与行业内AI转型先行者交流，获取第一手经验',
                '识别本部门2-3个可快速验证的AI应用场景'
            ],
            phase2: [
                '主导一个小场景的AI试点项目，积累实战经验',
                '建立与AI供应商、咨询机构的资源链接',
                '学习ROI测算方法，为后续规模化准备依据'
            ]
        },
        level2: {
            title: '夯实基础：推动局部试点',
            phase1: [
                '系统性梳理本部门业务流程，识别“高重复、高规则、高数据量”环节',
                '选取1-2个痛点明确、见效快的场景作为破局点',
                '联合IT部门或外部供应商，快速验证AI可行性'
            ],
            phase2: [
                '制定本部门AI应用短期（3个月）和中期（6个月）规划',
                '建立AI项目的ROI评估框架，包括成本节省和效率提升指标',
                '培养1-2名“AI布道师”，在团队中传播AI能力'
            ]
        },
        level3: {
            title: '规模化推进：构建组织级AI能力',
            phase1: [
                '推动成立部门级AI工作组，形成跨职能协作机制',
                '制定AI与业务融合的OKR，嵌入现有绩效体系',
                '建立AI应用场景地图，优先推进高价值场景'
            ],
            phase2: [
                '主导3-5个核心业务流程的AI化改造',
                '设计“人机协作”新岗位，试点后再推广',
                '建立AI知识共享机制，定期复盘最佳实践'
            ]
        },
        level4: {
            title: '深度融合：成为AI转型领导者',
            phase1: [
                '制定企业级AI战略路线图，获得高管支持',
                '推动建立AI卓越中心（COE），打造组织AI核心能力',
                '设计AI与传统业务的融合路径，平衡短期与长期目标'
            ],
            phase2: [
                '重构核心业务流，实现“AI原生”运营模式',
                '建立AI创新激励机制，推动全员AI应用',
                '打造行业标杆案例，对外输出AI能力'
            ]
        },
        level5: {
            title: '引领变革：成为行业AI标杆',
            phase1: [
                '主导企业AI战略制定，影响高层决策',
                '构建企业级AI知识库和RAG系统',
                '设计AI伦理和合规框架，引领负责任的AI实践'
            ],
            phase2: [
                '推动商业模式重构，将AI能力转化为竞争优势',
                '赋能上下游生态，构建AI驱动的价值网络',
                '成为行业AI转型标杆，输出方法论和最佳实践'
            ]
        }
    },
    'ORG': {
        level1: {
            title: '从零起步：建立人机协作意识',
            phase1: [
                '学习AI工具基础操作，如ChatGPT、Midjourney等',
                '了解AI对岗位结构的影响，建立危机意识',
                '主动参与公司组织的AI培训项目'
            ],
            phase2: [
                '在日常工作中有意识地使用AI工具辅助',
                '观察和学习同事使用AI的最佳实践'
            ]
        },
        level2: {
            title: '夯实基础：掌握人机协作技能',
            phase1: [
                '系统学习Prompt工程，提升AI交互效率',
                '识别可能被AI替代的工作内容，提前规划转型',
                '参加人机协作相关培训，理解AI增强人的逻辑'
            ],
            phase2: [
                '在本岗位推动“人机协作”试点，验证效率提升',
                '帮助同事正确认识AI，解决AI焦虑',
                '建立个人AI工具箱，形成最佳实践'
            ]
        },
        level3: {
            title: '规模化推进：推动组织人才转型',
            phase1: [
                '主导岗位转型计划，帮助被影响员工重新定位',
                '建立AI人才识别和评估标准',
                '设计人机协作的岗位职责和考核机制'
            ],
            phase2: [
                '参与或推动AI卓越中心（COE）的建设',
                '制定融合型团队的管理制度',
                '主导2-3个跨部门AI项目的落地'
            ]
        },
        level4: {
            title: '深度融合：重塑组织人才体系',
            phase1: [
                '系统性盘点“被替代的岗位”与“新生的岗位”',
                '设计岗位转型路径和内部再分配机制',
                '建立AI人才池，构建持续供给能力'
            ],
            phase2: [
                '重塑组织架构，推动“小前台+大中台”模式',
                '建立AI能力认证体系，纳入人才发展通道',
                '设计AI驱动的灵活用工机制'
            ]
        },
        level5: {
            title: '引领变革：成为人才管理标杆',
            phase1: [
                '制定企业级AI人才战略',
                '主导组织架构扁平化改革',
                '设计AI时代的领导力模型'
            ],
            phase2: [
                '构建AI驱动的敏捷组织架构',
                '建立行业领先的AI人才培养体系',
                '打造“AI原生”企业文化和雇主品牌'
            ]
        }
    },
    'DAT': {
        level1: {
            title: '从零起步：建立数据意识',
            phase1: [
                '了解数据类型（结构化/非结构化）和来源',
                '学习基础数据分析工具，如Excel数据透视表',
                '识别本岗位涉及的核心数据资产'
            ],
            phase2: [
                '记录数据来源和处理流程，形成数据地图雏形'
            ]
        },
        level2: {
            title: '夯实基础：推动数据治理',
            phase1: [
                '识别数据质量问题（缺失、错误、重复）',
                '建立数据录入和更新的规范习惯',
                '了解数据合规基本要求（隐私保护等）'
            ],
            phase2: [
                '参与数据资产盘点，梳理数据流转路径',
                '推动建立数据标准（命名、格式、定义）'
            ]
        },
        level3: {
            title: '规模化推进：构建数据中台',
            phase1: [
                '主导数据责任人（Data Owner）制度落地',
                '推动非结构化数据（文档、邮件、聊天记录）的资产化',
                '参与或主导数据治理项目'
            ],
            phase2: [
                '构建部门级数据看板，实现数据驱动决策',
                '推动向量化知识库/RAG系统的建设',
                '建立数据质量监控和预警机制'
            ]
        },
        level4: {
            title: '深度融合：打造智能数据引擎',
            phase1: [
                '主导企业级数据中台/知识库建设',
                '推动AI模型训练数据的准备和治理',
                '建立数据资产货币化机制'
            ],
            phase2: [
                '实现核心业务数据的实时分析能力',
                '建立预测性分析能力，支持业务决策',
                '构建数据安全合规体系'
            ]
        },
        level5: {
            title: '引领变革：成为数据驱动标杆',
            phase1: [
                '制定企业数据战略，主导数据文化建设',
                '推动数据资产的市场化运营',
                '建立行业数据标准和规范'
            ],
            phase2: [
                '实现全面数据驱动决策',
                '构建数据智能平台，赋能全业务链',
                '打造数据驱动的商业模式创新'
            ]
        }
    },
    'TEC': {
        level1: {
            title: '从零起步：建立技术认知',
            phase1: [
                '了解主流AI模型（ChatGPT、Claude、文心等）特点和适用场景',
                '学习使用现成的AI工具和SaaS服务',
                '理解API调用和集成的基本概念'
            ],
            phase2: [
                '尝试使用低代码AI平台搭建简单应用'
            ]
        },
        level2: {
            title: '夯实基础：掌握集成能力',
            phase1: [
                '学习API调用，理解AI能力接入方式',
                '掌握AI工具与现有业务系统的集成方法',
                '了解模型选型的基本原则（大模型+小模型组合）'
            ],
            phase2: [
                '主导1-2个AI工具的部门级推广',
                '建立AI工具使用指南和最佳实践'
            ]
        },
        level3: {
            title: '规模化推进：构建AI平台',
            phase1: [
                '参与AI平台/MLOps基础设施建设',
                '推动AI能力的API化封装',
                '主导AI工具在核心业务系统的嵌入'
            ],
            phase2: [
                '建立模型效果评估和监控机制',
                '推动低代码AI平台在业务部门的普及',
                '设计AI平台的运维和迭代流程'
            ]
        },
        level4: {
            title: '深度融合：实现技术自主',
            phase1: [
                '主导AI平台的企业级建设',
                '推动模型选型标准化，避免厂商锁定',
                '建立AI技术人才培养体系'
            ],
            phase2: [
                '实现核心AI能力的自主可控',
                '推动AI与业务流程的深度集成',
                '建立AI技术标准和规范'
            ]
        },
        level5: {
            title: '引领变革：构建技术壁垒',
            phase1: [
                '制定企业AI技术战略路线图',
                '主导AI核心技术的自主研发或深度定制',
                '建立AI技术护城河'
            ],
            phase2: [
                '构建行业领先的AI技术平台',
                '实现AI能力的平台化输出',
                '推动AI技术生态的构建'
            ]
        }
    },
    'CUL': {
        level1: {
            title: '从零起步：克服AI焦虑',
            phase1: [
                '正视AI带来的变化，理解“AI是工具，不是威胁”',
                '参加AI通识培训，了解AI的能力边界',
                '与同事讨论AI的影响，消除恐惧心理'
            ],
            phase2: [
                '主动尝试使用AI工具，从实践中建立信心'
            ]
        },
        level2: {
            title: '夯实基础：成为早期采纳者',
            phase1: [
                '系统学习AI工具，成为团队的“AI专家”',
                '帮助同事解决使用AI过程中遇到的问题',
                '建立个人AI学习笔记和经验库'
            ],
            phase2: [
                '主导部门内AI培训和知识分享',
                '建立AI使用的互助社群'
            ]
        },
        level3: {
            title: '规模化推进：推动文化变革',
            phase1: [
                '主导AI变革沟通策略，消除组织阻力',
                '设计AI激励和考核机制',
                '推动“允许失败”的创新文化'
            ],
            phase2: [
                '建立AI创新案例库，表彰AI应用标杆',
                '推动AI素养纳入全员能力模型'
            ]
        },
        level4: {
            title: '深度融合：重塑组织文化',
            phase1: [
                '主导组织级AI文化塑造项目',
                '设计AI时代的领导力发展计划',
                '推动高管成为AI应用的示范者'
            ],
            phase2: [
                '建立“AI优先”的决策文化',
                '构建学习型组织机制',
                '推动AI文化的对外传播'
            ]
        },
        level5: {
            title: '引领变革：成为文化标杆',
            phase1: [
                '制定企业AI文化战略',
                '主导AI伦理和合规框架的建设',
                '打造“AI驱动”的雇主品牌'
            ],
            phase2: [
                '构建行业领先的AI文化',
                '推动AI文化的制度化',
                '成为行业AI文化标杆'
            ]
        }
    }
};

// Pitfall warnings per dimension
const PITFALL_WARNINGS = {
    'STR': '⚠️ 警惕：避免“技术自嗨”，99%的企业不需要自研基座模型，应专注于“垂直应用”和“高质量数据”建设',
    'ORG': '⚠️ 警惕：避免“组织排异”，不要忽视老员工焦虑，设立“人机协作”目标，让AI成为增强工具而非替代镰刀',
    'DAT': '⚠️ 警惕：避免“数据沼泽”，没有高质量、结构化、高权限的数据，AI就是空中楼阁',
    'TEC': '⚠️ 警惕：避免“厂商锁定”，建立模型网关，根据场景选择“大模型+小模型”组合',
    'CUL': '⚠️ 警惕：避免“合规红线”，严格实施数据脱敏与私有化部署策略'
};

// Executive summary template
function generateExecutiveSummary(dims, overall) {
    const sortedDims = [...dims].sort((a,b) => a.rate - b.rate);
    const weakest = sortedDims.slice(0, 2);
    const strongest = sortedDims.slice(-2).reverse();
    
    let phase = overall >= 4 ? '第三阶段：深度融合与生态化' : 
                overall >= 3 ? '第二阶段：能力建设与规模化' : 
                '第一阶段：试点与验证';
    
    let priority = overall >= 4 ? '全面推进AI深度融合，构建智能飞轮' :
                   overall >= 3 ? '规模化推广，构建基础设施' :
                   '选择破局点，启动试点验证';
    
    let urgency = overall >= 4 ? '立即启动第三阶段，推进生态化' :
                  overall >= 3 ? '6个月内完成基础设施建设' :
                  '3个月内跑通最小闭环';
    
    return `
        <div class="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100">
            <h3 class="text-lg font-bold text-blue-800 mb-4">📋 转型阶段定位</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="text-center p-4 bg-white rounded-xl shadow-sm">
                    <div class="text-3xl font-bold text-blue-600">${overall.toFixed(1)}</div>
                    <div class="text-sm text-gray-600">当前能力评分</div>
                </div>
                <div class="text-center p-4 bg-white rounded-xl shadow-sm">
                    <div class="text-lg font-bold text-orange-600">${phase}</div>
                    <div class="text-sm text-gray-600">建议推进阶段</div>
                </div>
                <div class="text-center p-4 bg-white rounded-xl shadow-sm">
                    <div class="text-lg font-bold text-green-600">${priority}</div>
                    <div class="text-sm text-gray-600">核心任务</div>
                </div>
            </div>
            <div class="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <span class="font-bold text-yellow-800">⏰ 紧迫行动：</span>
                <span class="text-yellow-700">${urgency}</span>
            </div>
        </div>
        
        <div class="mb-8 p-6 bg-white rounded-2xl border border-gray-200">
            <h3 class="text-lg font-bold text-gray-800 mb-4">🎯 转型路径建议</h3>
            <div class="space-y-3">
                <div class="flex items-start">
                    <span class="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold mr-3">1</span>
                    <div>
                        <div class="font-bold text-gray-800">3个月内：试点与验证</div>
                        <div class="text-sm text-gray-600">选型与建队，场景速赢，跑通最小闭环</div>
                    </div>
                </div>
                <div class="flex items-start">
                    <span class="flex-shrink-0 w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold mr-3">2</span>
                    <div>
                        <div class="font-bold text-gray-800">6个月内：能力建设与规模化</div>
                        <div class="text-sm text-gray-600">数据治理攻坚，平台化建设，组织调整</div>
                    </div>
                </div>
                <div class="flex items-start">
                    <span class="flex-shrink-0 w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold mr-3">3</span>
                    <div>
                        <div class="font-bold text-gray-800">12个月内：深度融合与生态化</div>
                        <div class="text-sm text-gray-600">决策智能化，对外赋能，组织进化</div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div class="p-6 bg-green-50 rounded-2xl border border-green-200">
                <h3 class="text-lg font-bold text-green-800 mb-3">✅ 优势领域</h3>
                <div class="space-y-2">
                    ${strongest.map(d => `<div class="flex justify-between items-center"><span>${d.name}</span><span class="font-bold text-green-600">${(d.rate*100).toFixed(0)}%</span></div>`).join('')}
                </div>
            </div>
            <div class="p-6 bg-orange-50 rounded-2xl border border-orange-200">
                <h3 class="text-lg font-bold text-orange-800 mb-3">🔴 优先提升</h3>
                <div class="space-y-2">
                    ${weakest.map(d => `<div class="flex justify-between items-center"><span>${d.name}</span><span class="font-bold text-orange-600">${(d.rate*100).toFixed(0)}%</span></div>`).join('')}
                </div>
            </div>
        </div>
    `;
}

// Detailed recommendation per dimension
function generateDimensionRecommendation(dim) {
    const level = dim.level;
    const recs = DETAILED_RECOMMENDATIONS[dim.code];
    const rec = recs[`level${level}`];
    const warning = PITFALL_WARNINGS[dim.code];
    
    return `
        <div class="mb-6 p-6 bg-white rounded-2xl border border-gray-200 shadow-sm">
            <div class="flex items-center mb-4">
                <div class="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mr-4" style="background: ${dim.color}20; color: ${dim.color}">
                    ${DIMENSIONS[dim.code].icon}
                </div>
                <div class="flex-1">
                    <h4 class="font-bold text-gray-800 text-lg">${dim.name}</h4>
                    <div class="flex items-center gap-2">
                        <span class="text-sm text-gray-500">等级 ${dim.level} ${dim.levelName}</span>
                        <span class="text-sm font-bold" style="color: ${dim.color}">${(dim.rate*100).toFixed(0)}%</span>
                    </div>
                </div>
            </div>
            
            <div class="mb-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                <div class="font-bold text-blue-800 mb-2">📌 当前阶段：${rec.title}</div>
                <div class="text-sm text-blue-700">${getLevelDescription(dim.code, level)}</div>
            </div>
            
            <div class="mb-4">
                <div class="font-bold text-gray-700 mb-2">🚀 第一阶段行动（1-3个月）</div>
                <ul class="space-y-2">
                    ${rec.phase1.map(item => `<li class="flex items-start"><span class="text-blue-500 mr-2">•</span><span class="text-sm text-gray-600">${item}</span></li>`).join('')}
                </ul>
            </div>
            
            <div class="mb-4">
                <div class="font-bold text-gray-700 mb-2">⚡ 第二阶段行动（4-9个月）</div>
                <ul class="space-y-2">
                    ${rec.phase2.map(item => `<li class="flex items-start"><span class="text-green-500 mr-2">•</span><span class="text-sm text-gray-600">${item}</span></li>`).join('')}
                </ul>
            </div>
            
            <div class="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div class="text-sm text-yellow-800">${warning}</div>
            </div>
        </div>
    `;
}

function getLevelDescription(code, level) {
    const descriptions = {
        'STR': {
            1: '您刚刚开始建立AI战略认知，需要从基础学习开始',
            2: '您已具备一定AI战略基础，可以推动局部试点',
            3: '您具备推动AI规模化的能力，可以承担更大责任',
            4: '您是AI转型的领导者，可以主导企业级变革',
            5: '您已是行业AI转型标杆，可以输出方法论'
        },
        'ORG': {
            1: '您刚开始了解人机协作，需要建立基础认知',
            2: '您掌握了基本人机协作技能，可以帮助他人',
            3: '您具备推动组织人才转型的能力',
            4: '您可以主导重塑组织人才体系',
            5: '您已是人才管理变革的引领者'
        },
        'DAT': {
            1: '您刚开始关注数据，需要建立数据意识',
            2: '您具备基础数据治理能力',
            3: '您可以推动构建数据中台',
            4: '您具备打造智能数据引擎的能力',
            5: '您已是数据驱动转型的标杆'
        },
        'TEC': {
            1: '您刚开始了解AI技术，需要建立技术认知',
            2: '您掌握了AI集成基本能力',
            3: '您可以推动AI平台建设',
            4: '您具备技术自主可控的能力',
            5: '您已是技术壁垒构建的引领者'
        },
        'CUL': {
            1: '您正在克服AI焦虑，需要建立信心',
            2: '您是早期采纳者，可以帮助带动他人',
            3: '您可以推动组织文化变革',
            4: '您可以主导重塑AI文化',
            5: '您已是文化变革的引领者'
        }
    };
    return descriptions[code][level];
}

// Auth State
auth.onAuthStateChanged(user => {
    console.log('Auth state changed:', user ? 'logged in' : 'logged out');
    currentUser = user;
    document.getElementById('loading').classList.add('hidden');
    if (user) {
        showHome();
        loadHistory();
    } else {
        showAuth();
    }
}, error => {
    console.error('Auth error:', error);
});

let isLogin = true;
document.getElementById('authSwitchBtn').addEventListener('click', e => {
    e.preventDefault();
    console.log('Switch clicked');
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
            if (company) {
                await db.collection('users').doc(cred.user.uid).set({ company, email, createdAt: new Date() });
            }
        }
        showHome();
    } catch (err) {
        console.error('Auth error:', err);
        document.getElementById('authError').textContent = err.message;
        document.getElementById('authError').classList.remove('hidden');
    }
});

function logout() { auth.signOut(); }

function showAuth() {
    hideAll();
    document.getElementById('authView').classList.remove('hidden');
}

function showHome() {
    hideAll();
    document.getElementById('homeView').classList.remove('hidden');
    document.getElementById('userInfo').textContent = currentUser.email;
}

function hideAll() {
    ['authView','homeView','assessmentView','saveInfoView','resultView','dashboardView'].forEach(id => {
        document.getElementById(id).classList.add('hidden');
    });
}

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

function showAssessment() {
    hideAll();
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

function showSaveInfo() {
    hideAll();
    document.getElementById('saveInfoView').classList.remove('hidden');
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
    if (!currentUser) {
        alert('请先登录');
        showAuth();
        return;
    }
    
    const results = calculateResults();
    const overall = results.overall;
    
    try {
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
    } catch (error) {
        console.error('Save error:', error);
        alert('保存失败: ' + error.message);
    }
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
            code, name: info.name, color: info.color, icon: info.icon,
            rate, avgScore, level,
            levelName: ['初步了解','基础应用','熟练应用','优化创新','专家引领'][level-1]
        });
        
        totalWeighted += rate * info.weight;
    }
    
    return { dims, overall: totalWeighted * 5 };
}

function showResult(dims, overall) {
    hideAll();
    document.getElementById('resultView').classList.remove('hidden');
    renderResult(dims, overall);
}

function renderResult(dims, overall) {
    document.getElementById('overallScore').textContent = overall.toFixed(1);
    
    let comment = overall >= 4.5 ? '你是AI组织转型的专家级人才！' :
                 overall >= 3.5 ? '你具备较强的AI组织转型能力' :
                 overall >= 2.5 ? '你处于AI能力的中等水平，有较大提升空间' :
                 '你的AI能力还需要大量学习和实践';
    document.getElementById('overallComment').textContent = comment;
    
    // Executive Summary
    document.getElementById('executiveSummary').innerHTML = generateExecutiveSummary(dims, overall);
    
    // Detailed Recommendations  
    document.getElementById('dimensionRecs').innerHTML = dims.map(d => generateDimensionRecommendation(d)).join('');
    
    // 各维度得分图表 - 用柱状图显示
    const dimResultsEl = document.getElementById('dimResults');
    dimResultsEl.innerHTML = dims.map(d => `
        <div class="border border-gray-100 rounded-lg p-4">
            <div class="flex justify-between items-center mb-2">
                <span class="font-medium text-gray-800 text-sm">${d.name}</span>
                <span class="font-bold text-gray-800">${d.avgScore.toFixed(1)}/5</span>
            </div>
            <div class="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div class="h-full rounded-full transition-all" style="width:${d.rate*100}%; background: ${d.color}"></div>
            </div>
            <div class="flex justify-between items-center mt-1">
                <span class="text-xs text-gray-500">等级${d.level} ${d.levelName}</span>
                <span class="text-xs font-bold" style="color: ${d.color}">${(d.rate*100).toFixed(0)}%</span>
            </div>
        </div>
    `).join('');
    
    // Radar Chart
    const ctx = document.getElementById('radarChart').getContext('2d');
    if (window.radarChart && typeof window.radarChart.destroy === 'function') {
        window.radarChart.destroy();
    }
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
}

function backHome() {
    showHome();
    loadHistory();
}

async function loadHistory() {
    if (!currentUser) return;
    
    const snap = await db.collection('assessments')
        .where('userId', '==', currentUser.uid)
        .orderBy('createdAt', 'desc')
        .limit(20)
        .get();
    
    const history = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    document.getElementById('statCount').textContent = history.length;
    if (history.length > 0) {
        const avg = history.reduce((s, h) => s + h.overallScore, 0) / history.length;
        const max = Math.max(...history.map(h => h.overallScore));
        document.getElementById('statAvg').textContent = avg.toFixed(1);
        document.getElementById('statMax').textContent = max.toFixed(1);
    }
    
    document.getElementById('historyList').innerHTML = history.length === 0 
        ? '<p class="text-gray-500 text-center py-8">暂无历史记录</p>'
        : history.map(h => `
            <div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                    <div class="font-medium text-gray-800">${h.name || '匿名'}${h.department ? ' · ' + h.department : ''}</div>
                    <div class="text-sm text-gray-500">${h.createdAt?.toDate().toLocaleDateString() || ''}</div>
                </div>
                <div class="flex items-center space-x-3">
                    <div class="text-2xl font-bold ${h.overallScore >= 4 ? 'text-green-600' : h.overallScore >= 3 ? 'text-blue-600' : 'text-orange-600'}">${h.overallScore?.toFixed(1) || '-'}</div>
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

document.addEventListener('keydown', e => {
    if (document.getElementById('assessmentView').classList.contains('hidden')) return;
    if (e.key >= '1' && e.key <= '5') {
        selectScore(parseInt(e.key));
    } else if (e.key === 'Enter') {
        nextQuestion();
    }
});
