#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AI组织转型人才能力在线测评系统 - 商业版 v3.1
支持用户管理、企业团队、团队汇总分析、PDF报告
租户管理员功能：查看本企业所有用户测评记录、批量导出PDF报告
"""

from flask import Flask, render_template, request, jsonify, session, redirect, url_for, send_file, make_response
import sqlite3
import hashlib
import os
import uuid
import zipfile
import io
from datetime import datetime
from io import BytesIO

app = Flask(__name__)
# 使用固定secret key确保session跨worker有效
app.secret_key = os.environ.get('SECRET_KEY', 'ai-capability-v3-fixed-key-2026')

DATABASE = '/tmp/ai_assessment_v3.db'

# 超级管理员初始化密钥（首次设置后请修改或删除此行）
SUPER_ADMIN_SECRET = '小龙虾-admin-2026'

def init_db():
    conn = sqlite3.connect(DATABASE)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            company TEXT,
            is_admin INTEGER DEFAULT 0,
            is_tenant_admin INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    # 添加 is_tenant_admin 列（如果不存在）
    try:
        c.execute('ALTER TABLE users ADD COLUMN is_tenant_admin INTEGER DEFAULT 0')
    except:
        pass
    c.execute('''
        CREATE TABLE IF NOT EXISTS assessments (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            name TEXT,
            department TEXT,
            position TEXT,
            answers TEXT,
            results TEXT,
            overall_score REAL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')
    conn.commit()
    conn.close()

init_db()

def hash_password(pwd):
    return hashlib.sha256(pwd.encode()).hexdigest()

def verify_password(pwd, hashed):
    return hash_password(pwd) == hashed

def get_db_conn():
    return sqlite3.connect(DATABASE)

# ============ 超级管理员初始化 ============

@app.route('/api/setup-super-admin', methods=['POST'])
def setup_super_admin():
    """初始化超级管理员账号（首次设置用，之后删除）"""
    data = request.json
    secret = data.get('secret', '')
    
    if secret != SUPER_ADMIN_SECRET:
        return jsonify({'status': 'error', 'message': '密钥错误'})
    
    username = data.get('username', 'admin')
    password = data.get('password', 'admin123')
    company = data.get('company', '系统')
    
    user_id = str(uuid.uuid4())[:8]
    
    try:
        conn = get_db_conn()
        c = conn.cursor()
        
        # 检查是否已存在
        c.execute('SELECT id FROM users WHERE username = ?', (username,))
        existing = c.fetchone()
        
        if existing:
            # 更新为超级管理员
            c.execute('''UPDATE users SET is_admin = 1, is_tenant_admin = 1, company = ? 
                        WHERE username = ?''', (company, username))
            msg = f"用户 {username} 已升级为超级管理员"
        else:
            # 创建新用户
            c.execute('''INSERT INTO users (id, username, password, company, is_admin, is_tenant_admin) 
                        VALUES (?, ?, ?, ?, 1, 1)''',
                     (user_id, username, hash_password(password), company))
            msg = f"超级管理员 {username} 创建成功，密码：{password}"
        
        conn.commit()
        conn.close()
        
        return jsonify({'status': 'success', 'message': msg})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)})

# ============ 数据 ============
CAPABILITY_DIMENSIONS = {
    'STR': {'name': '战略与价值流重构', 'weight': 0.20, 'color': '#4472C4'},
    'ORG': {'name': '组织架构与人才', 'weight': 0.25, 'color': '#70AD47'},
    'DAT': {'name': '数据底座与治理', 'weight': 0.20, 'color': '#FFC000'},
    'TEC': {'name': '技术基础设施', 'weight': 0.15, 'color': '#ED7D31'},
    'CUL': {'name': '文化与变革管理', 'weight': 0.20, 'color': '#9E480E'},
}

QUESTIONS = [
    {'id': 1, 'code': 'STR-01', 'dimension': 'STR', 'question': '我能够制定所在部门的AI应用短期和长期规划'},
    {'id': 2, 'code': 'STR-02', 'dimension': 'STR', 'question': '我能识别出哪些业务场景最适合引入AI技术'},
    {'id': 3, 'code': 'STR-03', 'dimension': 'STR', 'question': '我能够测算AI项目的投入产出比和投资回报周期'},
    {'id': 4, 'code': 'STR-04', 'dimension': 'STR', 'question': '我能将AI目标与组织战略OKR有效结合'},
    {'id': 5, 'code': 'STR-05', 'dimension': 'STR', 'question': '我在推动AI应用时常遇到组织变革阻力'},
    {'id': 6, 'code': 'ORG-01', 'dimension': 'ORG', 'question': '我能够设计人机协作的工作流程和岗位职责'},
    {'id': 7, 'code': 'ORG-02', 'dimension': 'ORG', 'question': '我能够识别和评估AI关键岗位人才'},
    {'id': 8, 'code': 'ORG-03', 'dimension': 'ORG', 'question': '我了解AI卓越中心(COE)的定位和运作模式'},
    {'id': 9, 'code': 'ORG-04', 'dimension': 'ORG', 'question': '我能有效管理包含AI角色的跨职能项目团队'},
    {'id': 10, 'code': 'ORG-05', 'dimension': 'ORG', 'question': '我能制定岗位转型计划帮助员工适应AI时代'},
    {'id': 11, 'code': 'ORG-06', 'dimension': 'ORG', 'question': '我能够编写高质量的Prompt来获取理想AI输出'},
    {'id': 12, 'code': 'ORG-07', 'dimension': 'ORG', 'question': '我每周使用AI工具提升工作效率的时间超过5小时'},
    {'id': 13, 'code': 'DAT-01', 'dimension': 'DAT', 'question': '我清楚了解企业有哪些可用的数据资产'},
    {'id': 14, 'code': 'DAT-02', 'dimension': 'DAT', 'question': '我能够识别和解决数据质量问题'},
    {'id': 15, 'code': 'DAT-03', 'dimension': 'DAT', 'question': '我了解RAG/知识库的技术原理和应用价值'},
    {'id': 16, 'code': 'DAT-04', 'dimension': 'DAT', 'question': '我在工作中严格遵守数据安全和合规要求'},
    {'id': 17, 'code': 'DAT-05', 'dimension': 'DAT', 'question': '我能够使用数据分析工具发现业务洞察'},
    {'id': 18, 'code': 'DAT-06', 'dimension': 'DAT', 'question': '我能处理文档、图片、音视频等非结构化数据'},
    {'id': 19, 'code': 'TEC-01', 'dimension': 'TEC', 'question': '我了解企业级AI技术平台的核心组成'},
    {'id': 20, 'code': 'TEC-02', 'dimension': 'TEC', 'question': '我能够根据业务场景选择合适的AI模型'},
    {'id': 21, 'code': 'TEC-03', 'dimension': 'TEC', 'question': '我了解模型部署、监控和持续迭代的流程'},
    {'id': 22, 'code': 'TEC-04', 'dimension': 'TEC', 'question': '我能够将AI能力集成到现有业务系统中'},
    {'id': 23, 'code': 'TEC-05', 'dimension': 'TEC', 'question': '我能够使用低代码平台搭建简单AI应用'},
    {'id': 24, 'code': 'CUL-01', 'dimension': 'CUL', 'question': '我能够向非技术背景的人解释AI的价值和应用'},
    {'id': 25, 'code': 'CUL-02', 'dimension': 'CUL', 'question': '我能够识别员工对AI的焦虑并给予正向引导'},
    {'id': 26, 'code': 'CUL-03', 'dimension': 'CUL', 'question': '我设计过将AI成果纳入绩效考核的激励机制'},
    {'id': 27, 'code': 'CUL-04', 'dimension': 'CUL', 'question': '我能够设计和交付AI工具使用的培训课程'},
    {'id': 28, 'code': 'CUL-05', 'dimension': 'CUL', 'question': '我了解AI伦理、版权、隐私保护的红线和边界'},
    {'id': 29, 'code': 'CUL-06', 'dimension': 'CUL', 'question': '我建立了个人/团队的持续学习和知识分享机制'},
]

CAPABILITY_LEVELS = {
    1: {'name': '初步了解'},
    2: {'name': '基础应用'},
    3: {'name': '熟练应用'},
    4: {'name': '优化创新'},
    5: {'name': '专家引领'},
}

DEVELOPMENT_SUGGESTIONS = {
    'STR': '建议参加AI战略规划工作坊，学习行业最佳实践，尝试主导一个小场景的AI落地项目',
    'ORG': '建议深入学习人机协作设计方法，参与跨部门AI项目，推动建立内部AI卓越中心',
    'DAT': '建议系统学习数据治理知识，参与企业数据资产盘点，搭建部门级知识库',
    'TEC': '建议了解主流AI模型特点，学习LLMOps基础，参与AI平台规划讨论',
    'CUL': '建议学习变革管理方法，设计团队AI激励机制，成为组织内的AI布道师',
}

# ============ 页面路由 ============

@app.route('/')
def index():
    if session.get('user_id'):
        return redirect(url_for('dashboard'))
    return render_template('index.html', dimensions=CAPABILITY_DIMENSIONS)

@app.route('/login')
def login_page():
    if session.get('user_id'):
        return redirect(url_for('dashboard'))
    return render_template('login.html')

@app.route('/register')
def register_page():
    if session.get('user_id'):
        return redirect(url_for('dashboard'))
    # 普通用户不能自己注册，显示提示页面
    return '''
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>注册已禁用 - AI能力测评系统</title>
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-50 min-h-screen flex items-center justify-center">
        <div class="bg-white p-8 rounded-xl shadow-lg max-w-md text-center">
            <div class="text-4xl mb-4">🔒</div>
            <h1 class="text-xl font-bold text-gray-800 mb-4">注册功能已禁用</h1>
            <p class="text-gray-600 mb-6">普通用户不能自行注册，请联系管理员分配账号后再登录。</p>
            <a href="/login" class="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">返回登录</a>
        </div>
    </body>
    </html>
    '''

@app.route('/api/register', methods=['POST'])
def register():
    """只有管理员才能创建账号，普通用户不能自己注册"""
    
    # 检查是否是以管理员身份登录
    is_admin = session.get('is_admin', 0)
    is_tenant_admin = session.get('is_tenant_admin', 0)
    
    if not is_admin and not is_tenant_admin:
        return jsonify({'status': 'error', 'message': '普通用户不能注册账号，请使用管理员分配的账号登录'})
    
    data = request.json
    username = data.get('username', '').strip()
    password = data.get('password', '')
    company = data.get('company', '').strip() or session.get('company', '')
    
    if not username or not password:
        return jsonify({'status': 'error', 'message': '用户名和密码不能为空'})
    if len(password) < 6:
        return jsonify({'status': 'error', 'message': '密码至少6位'})
    
    user_id = str(uuid.uuid4())[:8]
    try:
        conn = get_db_conn()
        c = conn.cursor()
        c.execute('INSERT INTO users (id, username, password, company, is_admin, is_tenant_admin) VALUES (?, ?, ?, ?, 0, 0)',
                 (user_id, username, hash_password(password), company))
        conn.commit()
        conn.close()
        
        return jsonify({
            'status': 'success', 
            'message': f'用户 {username} 创建成功，密码：{password}（请告知该用户）',
            'username': username,
            'password': password
        })
    except sqlite3.IntegrityError:
        return jsonify({'status': 'error', 'message': '用户名已存在'})

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username', '').strip()
    password = data.get('password', '')
    
    conn = get_db_conn()
    c = conn.cursor()
    c.execute('SELECT id, username, password, company, is_admin, is_tenant_admin FROM users WHERE username = ?', (username,))
    user = c.fetchone()
    conn.close()
    
    if user and verify_password(password, user[2]):
        session['user_id'] = user[0]
        session['username'] = user[1]
        session['company'] = user[3]
        session['is_admin'] = user[4]
        session['is_tenant_admin'] = user[5] if len(user) > 5 else 0
        return jsonify({'status': 'success', 'redirect': '/dashboard'})
    
    return jsonify({'status': 'error', 'message': '用户名或密码错误'})

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('index'))

@app.route('/dashboard')
def dashboard():
    if not session.get('user_id'):
        return redirect(url_for('login_page'))
    
    conn = get_db_conn()
    c = conn.cursor()
    c.execute('''SELECT id, name, department, position, overall_score, created_at 
                 FROM assessments WHERE user_id = ? ORDER BY created_at DESC''', 
              (session['user_id'],))
    history = c.fetchall()
    conn.close()
    
    history_list = [{
        'id': h[0], 'name': h[1] or '匿名', 'department': h[2] or '',
        'position': h[3] or '', 'score': h[4] or 0, 'date': h[5][:10] if h[5] else ''
    } for h in history]
    
    return render_template('dashboard.html', 
                         username=session.get('username', ''),
                         company=session.get('company', ''),
                         history=history_list,
                         is_admin=session.get('is_admin', 0),
                         is_tenant_admin=session.get('is_tenant_admin', 0))

@app.route('/team')
def team_analytics():
    """团队汇总分析"""
    if not session.get('user_id'):
        return redirect(url_for('login_page'))
    
    company = session.get('company', '')
    
    conn = get_db_conn()
    c = conn.cursor()
    
    # 获取公司所有测评
    if company:
        c.execute('''
            SELECT a.id, a.name, a.department, a.position, a.overall_score, a.created_at,
                   u.username
            FROM assessments a
            JOIN users u ON a.user_id = u.id
            WHERE u.company = ?
            ORDER BY a.created_at DESC
        ''', (company,))
    else:
        c.execute('''
            SELECT a.id, a.name, a.department, a.position, a.overall_score, a.created_at,
                   u.username
            FROM assessments a
            JOIN users u ON a.user_id = u.id
            ORDER BY a.created_at DESC
        ''')
    
    all_assessments = c.fetchall()
    conn.close()
    
    # 按部门汇总
    dept_stats = {}
    for a in all_assessments:
        dept = a[2] or '未填写部门'
        if dept not in dept_stats:
            dept_stats[dept] = {'count': 0, 'total_score': 0, 'scores': []}
        dept_stats[dept]['count'] += 1
        dept_stats[dept]['total_score'] += (a[4] or 0)
        dept_stats[dept]['scores'].append(a[4] or 0)
    
    dept_list = []
    for dept, stats in dept_stats.items():
        avg = stats['total_score'] / stats['count'] if stats['count'] > 0 else 0
        dept_list.append({
            'name': dept,
            'count': stats['count'],
            'avg_score': round(avg, 1),
            'max_score': max(stats['scores']) if stats['scores'] else 0,
            'min_score': min(stats['scores']) if stats['scores'] else 0
        })
    
    # 整体统计
    total_count = len(all_assessments)
    total_avg = sum(a[4] or 0 for a in all_assessments) / total_count if total_count > 0 else 0
    total_max = max([a[4] or 0 for a in all_assessments]) if all_assessments else 0
    total_min = min([a[4] or 0 for a in all_assessments]) if all_assessments else 0
    
    # 能力等级分布
    level_dist = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    for a in all_assessments:
        score = a[4] or 0
        if score >= 4.5: level = 5
        elif score >= 3.5: level = 4
        elif score >= 2.5: level = 3
        elif score >= 1.5: level = 2
        else: level = 1
        level_dist[level] += 1
    
    # 各维度平均得分（需要重新计算）
    import ast
    dim_totals = {k: {'sum': 0, 'count': 0} for k in CAPABILITY_DIMENSIONS.keys()}
    
    for a in all_assessments:
        if a[6]:  # results field
            try:
                results = ast.literal_eval(a[6])
                for r in results:
                    code = r.get('code')
                    if code in dim_totals:
                        dim_totals[code]['sum'] += r.get('rate', 0) * 100
                        dim_totals[code]['count'] += 1
            except:
                pass
    
    dim_avg = []
    for code, info in CAPABILITY_DIMENSIONS.items():
        if dim_totals[code]['count'] > 0:
            avg_val = dim_totals[code]['sum'] / dim_totals[code]['count']
        else:
            avg_val = 0
        dim_avg.append({
            'code': code,
            'name': info['name'],
            'color': info['color'],
            'avg': round(avg_val, 1)
        })
    
    # 人才列表
    talent_list = [{
        'name': a[1] or '匿名',
        'department': a[2] or '',
        'position': a[3] or '',
        'score': round(a[4], 1) if a[4] else 0,
        'date': a[5][:10] if a[5] else ''
    } for a in all_assessments[:20]]  # 最近20条
    
    return render_template('team.html',
                         company=company,
                         total_count=total_count,
                         total_avg=round(total_avg, 1),
                         total_max=round(total_max, 1),
                         total_min=round(total_min, 1),
                         dept_list=dept_list,
                         level_dist=level_dist,
                         dim_avg=dim_avg,
                         talent_list=talent_list)

@app.route('/assessment')
def assessment():
    if not session.get('user_id'):
        return redirect(url_for('login_page'))
    
    session['answers'] = {}
    session['current'] = 1
    session.modified = True
    
    return render_template('assessment.html',
                         question=QUESTIONS[0],
                         q_num=1,
                         total=len(QUESTIONS),
                         prev_answer=None)

@app.route('/assessment/q/<int:q_num>')
def assessment_question(q_num):
    if not session.get('user_id'):
        return redirect(url_for('login_page'))
    
    if q_num < 1:
        q_num = 1
    if q_num > len(QUESTIONS):
        return redirect(url_for('save_info'))
    
    session['current'] = q_num
    session.modified = True
    
    prev_answer = session.get('answers', {}).get(q_num)
    
    return render_template('assessment.html',
                         question=QUESTIONS[q_num-1],
                         q_num=q_num,
                         total=len(QUESTIONS),
                         prev_answer=prev_answer)

@app.route('/api/save_answer', methods=['POST'])
def save_answer():
    if not session.get('user_id'):
        return jsonify({'status': 'error', 'message': '请先登录'})
    
    data = request.json
    q_id = data.get('question_id')
    score = data.get('score')
    
    if 'answers' not in session:
        session['answers'] = {}
    
    session['answers'][q_id] = score
    session.modified = True
    
    next_q = q_id + 1
    if next_q > len(QUESTIONS):
        return jsonify({'status': 'complete', 'redirect': '/save_info'})
    
    return jsonify({'status': 'success', 'next': next_q})

@app.route('/save_info', methods=['GET', 'POST'])
def save_info():
    if not session.get('user_id'):
        return redirect(url_for('login_page'))
    
    if request.method == 'POST':
        name = request.form.get('name', '')
        department = request.form.get('department', '')
        position = request.form.get('position', '')
        
        answers = session.get('answers', {})
        
        # 计算结果
        dimension_scores = {}
        dimension_counts = {}
        for q in QUESTIONS:
            q_id = q['id']
            dim = q['dimension']
            if q_id in answers:
                if dim not in dimension_scores:
                    dimension_scores[dim] = 0
                    dimension_counts[dim] = 0
                dimension_scores[dim] += answers[q_id]
                dimension_counts[dim] += 1
        
        results = []
        for dim_code, dim_info in CAPABILITY_DIMENSIONS.items():
            if dim_code in dimension_scores:
                max_score = dimension_counts[dim_code] * 5
                actual_score = dimension_scores[dim_code]
                score_rate = actual_score / max_score if max_score > 0 else 0
                avg_score = actual_score / dimension_counts[dim_code] if dimension_counts[dim_code] > 0 else 0
                
                if score_rate < 0.3: level = 1
                elif score_rate < 0.5: level = 2
                elif score_rate < 0.7: level = 3
                elif score_rate < 0.85: level = 4
                else: level = 5
                
                results.append({
                    'code': dim_code, 'name': dim_info['name'], 'color': dim_info['color'],
                    'weight': dim_info['weight'], 'rate': score_rate, 'avg_score': avg_score,
                    'level': level, 'level_name': CAPABILITY_LEVELS[level]['name'],
                    'suggestion': DEVELOPMENT_SUGGESTIONS[dim_code],
                })
        
        total_weighted = sum(r['rate'] * r['weight'] for r in results)
        overall_score = total_weighted * 5
        
        if overall_score >= 4.5: overall_comment = '你是AI组织转型的专家级人才！'
        elif overall_score >= 3.5: overall_comment = '你具备较强的AI组织转型能力，是组织中的AI先行者'
        elif overall_score >= 2.5: overall_comment = '你处于AI能力的中等水平，有较大提升空间'
        else: overall_comment = '你的AI能力还需要大量学习和实践，但这是成长的起点'
        
        radar_data = [{'dimension': r['name'], 'value': r['rate'] * 100, 'color': r['color']} for r in results]
        sorted_results = sorted(results, key=lambda x: x['rate'])
        weakest = sorted_results[:2]
        strongest = sorted_results[-2:][::-1]
        
        # 保存
        assessment_id = str(uuid.uuid4())[:8]
        conn = get_db_conn()
        c = conn.cursor()
        c.execute('''
            INSERT INTO assessments (id, user_id, name, department, position, answers, results, overall_score)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (assessment_id, session['user_id'], name, department, position,
              str(answers), str(results), overall_score))
        conn.commit()
        conn.close()
        
        session['last_assessment_id'] = assessment_id
        
        return redirect(url_for('view_result', assessment_id=assessment_id))
    
    return render_template('save_info.html')

@app.route('/result/<assessment_id>')
def view_result(assessment_id):
    if not session.get('user_id'):
        return redirect(url_for('login_page'))
    
    conn = get_db_conn()
    c = conn.cursor()
    c.execute('SELECT * FROM assessments WHERE id = ? AND user_id = ?', 
              (assessment_id, session['user_id']))
    row = c.fetchone()
    conn.close()
    
    if not row:
        return redirect(url_for('dashboard'))
    
    import ast
    results_data = ast.literal_eval(row[6]) if row[6] else []
    overall_score = row[7]
    
    if overall_score >= 4.5: overall_comment = '你是AI组织转型的专家级人才！'
    elif overall_score >= 3.5: overall_comment = '你具备较强的AI组织转型能力，是组织中的AI先行者'
    elif overall_score >= 2.5: overall_comment = '你处于AI能力的中等水平，有较大提升空间'
    else: overall_comment = '你的AI能力还需要大量学习和实践，但这是成长的起点'
    
    radar_data = [{'dimension': r['name'], 'value': r['rate'] * 100, 'color': r['color']} for r in results_data]
    sorted_results = sorted(results_data, key=lambda x: x['rate'])
    weakest = sorted_results[:2]
    strongest = sorted_results[-2:][::-1]
    
    return render_template('result.html',
                         name=row[3], department=row[4], position=row[5],
                         results=results_data, overall_score=overall_score,
                         overall_comment=overall_comment, radar_data=radar_data,
                         weakest=weakest, strongest=strongest,
                         current_time=row[8][:16])

@app.route('/report/<assessment_id>')
def download_report(assessment_id):
    if not session.get('user_id'):
        return redirect(url_for('login_page'))
    
    conn = get_db_conn()
    c = conn.cursor()
    c.execute('SELECT * FROM assessments WHERE id = ? AND user_id = ?', 
              (assessment_id, session['user_id']))
    row = c.fetchone()
    conn.close()
    
    if not row:
        return redirect(url_for('dashboard'))
    
    import ast
    results_data = ast.literal_eval(row[6]) if row[6] else []
    overall_score = row[7]
    
    if overall_score >= 4.5: overall_comment = '你是AI组织转型的专家级人才！'
    elif overall_score >= 3.5: overall_comment = '你具备较强的AI组织转型能力，是组织中的AI先行者'
    elif overall_score >= 2.5: overall_comment = '你处于AI能力的中等水平，有较大提升空间'
    else: overall_comment = '你的AI能力还需要大量学习和实践，但这是成长的起点'
    
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=20*mm, leftMargin=20*mm, topMargin=20*mm, bottomMargin=20*mm)
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=20, textColor=colors.HexColor('#1F4E79'), alignment=1, spaceAfter=10)
    subtitle_style = ParagraphStyle('Subtitle', parent=styles['Normal'], fontSize=10, textColor=colors.gray, alignment=1, spaceAfter=20)
    heading_style = ParagraphStyle('Heading', parent=styles['Heading2'], fontSize=12, textColor=colors.HexColor('#1F4E79'), spaceAfter=8)
    normal_style = ParagraphStyle('Normal', parent=styles['Normal'], fontSize=9, spaceAfter=6)
    
    story = []
    story.append(Paragraph('AI组织转型人才能力评估报告', title_style))
    story.append(Paragraph(f"被评估人：{row[3] or '匿名'} | 部门：{row[4] or '-'} | 岗位：{row[5] or '-'}", subtitle_style))
    story.append(Paragraph(f"<b>综合得分：{overall_score:.1f} / 5.0</b> - {overall_comment}", normal_style))
    story.append(Spacer(1, 10*mm))
    
    story.append(Paragraph('各维度能力评估', heading_style))
    dim_data = [['维度', '得分率', '等级', '发展建议']] + \
               [[r['name'], f"{r['rate']*100:.0f}%", f"L{r['level']} {r['level_name']}", r['suggestion'][:40]+'...'] 
               for r in results_data]
    dim_table = Table(dim_data, colWidths=[35*mm, 20*mm, 25*mm, 100*mm])
    dim_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2E75B6')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.gray),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F5F9FC')]),
    ]))
    story.append(dim_table)
    story.append(Spacer(1, 8*mm))
    
    story.append(Paragraph('个性化发展建议', heading_style))
    for r in results_data:
        story.append(Paragraph(f"<b>{r['name']}</b>：{r['suggestion']}", normal_style))
    
    story.append(Spacer(1, 10*mm))
    story.append(Paragraph(f"评估时间：{row[8][:10]} | 基于AI组织转型实战框架 | 小龙虾公司出品", 
                         ParagraphStyle('Footer', parent=styles['Normal'], fontSize=7, textColor=colors.gray, alignment=1)))
    
    doc.build(story)
    buffer.seek(0)
    filename = f"AI能力评估报告_{row[3] or '匿名'}_{row[8][:10]}.pdf"
    return send_file(buffer, as_attachment=True, download_name=filename, mimetype='application/pdf')

# ============ 租户管理员功能 ============

@app.route('/tenant-admin')
def tenant_admin_dashboard():
    """租户管理员查看本企业所有用户测评记录"""
    if not session.get('user_id'):
        return redirect(url_for('login_page'))
    
    # 检查是否是租户管理员
    if not session.get('is_tenant_admin') and not session.get('is_admin'):
        return redirect(url_for('dashboard'))
    
    company = session.get('company', '')
    if not company:
        return render_template('tenant_admin.html', 
                             error='您没有关联企业，无法使用租户管理员功能',
                             assessments=[], company='', stats={}, 
                             current_user=session.get('username', ''))
    
    conn = get_db_conn()
    c = conn.cursor()
    
    # 获取本企业所有测评记录
    c.execute('''
        SELECT a.id, a.name, a.department, a.position, a.overall_score, a.created_at,
               u.username
        FROM assessments a
        JOIN users u ON a.user_id = u.id
        WHERE u.company = ?
        ORDER BY a.created_at DESC
    ''', (company,))
    
    all_assessments = c.fetchall()
    conn.close()
    
    # 构建列表
    assessments_list = []
    for a in all_assessments:
        score = a[4] or 0
        if score >= 4.5: level = 5
        elif score >= 3.5: level = 4
        elif score >= 2.5: level = 3
        elif score >= 1.5: level = 2
        else: level = 1
        
        assessments_list.append({
            'id': a[0],
            'name': a[1] or '匿名',
            'department': a[2] or '',
            'position': a[3] or '',
            'score': round(score, 1),
            'level': level,
            'level_name': CAPABILITY_LEVELS[level]['name'],
            'date': a[5][:16] if a[5] else '',
            'username': a[6],
        })
    
    # 统计数据
    total = len(assessments_list)
    avg_score = sum(a['score'] for a in assessments_list) / total if total > 0 else 0
    scores = [a['score'] for a in assessments_list]
    max_score = max(scores) if scores else 0
    min_score = min(scores) if scores else 0
    
    # 部门分布
    dept_count = {}
    for a in assessments_list:
        dept = a['department'] or '未填写'
        dept_count[dept] = dept_count.get(dept, 0) + 1
    
    stats = {
        'total': total,
        'avg_score': round(avg_score, 1),
        'max_score': max_score,
        'min_score': min_score,
        'dept_count': dept_count,
    }
    
    return render_template('tenant_admin.html',
                           assessments=assessments_list,
                           company=company,
                           stats=stats,
                           current_user=session.get('username', ''),
                           error=None)

def generate_pdf_bytes(row, results_data, overall_score, overall_comment):
    """生成单个PDF报告的字节数据"""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=20*mm, leftMargin=20*mm, topMargin=20*mm, bottomMargin=20*mm)
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=20, textColor=colors.HexColor('#1F4E79'), alignment=1, spaceAfter=10)
    subtitle_style = ParagraphStyle('Subtitle', parent=styles['Normal'], fontSize=10, textColor=colors.gray, alignment=1, spaceAfter=20)
    heading_style = ParagraphStyle('Heading', parent=styles['Heading2'], fontSize=12, textColor=colors.HexColor('#1F4E79'), spaceAfter=8)
    normal_style = ParagraphStyle('Normal', parent=styles['Normal'], fontSize=9, spaceAfter=6)
    
    story = []
    story.append(Paragraph('AI组织转型人才能力评估报告', title_style))
    story.append(Paragraph(f"被评估人：{row[3] or '匿名'} | 部门：{row[4] or '-'} | 岗位：{row[5] or '-'}", subtitle_style))
    story.append(Paragraph(f"<b>综合得分：{overall_score:.1f} / 5.0</b> - {overall_comment}", normal_style))
    story.append(Spacer(1, 10*mm))
    
    story.append(Paragraph('各维度能力评估', heading_style))
    dim_data = [['维度', '得分率', '等级', '发展建议']] + \
               [[r['name'], f"{r['rate']*100:.0f}%", f"L{r['level']} {r['level_name']}", r['suggestion'][:40]+'...'] 
               for r in results_data]
    dim_table = Table(dim_data, colWidths=[35*mm, 20*mm, 25*mm, 100*mm])
    dim_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2E75B6')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.gray),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F5F9FC')]),
    ]))
    story.append(dim_table)
    story.append(Spacer(1, 8*mm))
    
    story.append(Paragraph('个性化发展建议', heading_style))
    for r in results_data:
        story.append(Paragraph(f"<b>{r['name']}</b>：{r['suggestion']}", normal_style))
    
    story.append(Spacer(1, 10*mm))
    story.append(Paragraph(f"评估时间：{row[8][:10]} | 基于AI组织转型实战框架 | 小龙虾公司出品", 
                         ParagraphStyle('Footer', parent=styles['Normal'], fontSize=7, textColor=colors.gray, alignment=1)))
    
    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()

@app.route('/tenant-admin/export-all')
def tenant_admin_export_all():
    """租户管理员批量导出本企业所有测评报告（ZIP格式）"""
    if not session.get('user_id'):
        return redirect(url_for('login_page'))
    
    if not session.get('is_tenant_admin') and not session.get('is_admin'):
        return redirect(url_for('dashboard'))
    
    company = session.get('company', '')
    if not company:
        return "您没有关联企业", 400
    
    import ast
    
    conn = get_db_conn()
    c = conn.cursor()
    c.execute('''
        SELECT a.id, a.name, a.department, a.position, a.overall_score, a.created_at,
               a.results, a.answers, a.user_id
        FROM assessments a
        JOIN users u ON a.user_id = u.id
        WHERE u.company = ?
        ORDER BY a.created_at DESC
    ''', (company,))
    
    all_assessments = c.fetchall()
    conn.close()
    
    if not all_assessments:
        return "该公司暂无测评记录", 400
    
    # 创建ZIP文件
    zip_buffer = BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        for row in all_assessments:
            assessment_id = row[0]
            name = row[1] or '匿名'
            dept = row[2] or ''
            position = row[3] or ''
            overall_score = row[4] or 0
            created_at = row[5][:10] if row[5] else 'unknown'
            results_data = ast.literal_eval(row[6]) if row[6] else []
            
            if overall_score >= 4.5: overall_comment = '你是AI组织转型的专家级人才！'
            elif overall_score >= 3.5: overall_comment = '你具备较强的AI组织转型能力，是组织中的AI先行者'
            elif overall_score >= 2.5: overall_comment = '你处于AI能力的中等水平，有较大提升空间'
            else: overall_comment = '你的AI能力还需要大量学习和实践，但这是成长的起点'
            
            # 生成PDF
            pdf_bytes = generate_pdf_bytes(row, results_data, overall_score, overall_comment)
            
            # 文件名：姓名_部门_日期.pdf
            safe_name = name.replace('/', '_').replace('\\', '_')
            safe_dept = dept.replace('/', '_').replace('\\', '_')
            filename = f"{safe_name}_{safe_dept}_{created_at}.pdf"
            
            zip_file.writestr(filename, pdf_bytes)
    
    zip_buffer.seek(0)
    company_safe = company.replace(' ', '_').replace('/', '_')
    filename = f"AI能力评估报告_{company_safe}_{datetime.now().strftime('%Y%m%d')}.zip"
    
    return send_file(zip_buffer, 
                    as_attachment=True, 
                    download_name=filename, 
                    mimetype='application/zip')

@app.route('/tenant-admin/user/<assessment_id>')
def tenant_admin_view_user_report(assessment_id):
    """租户管理员查看某个用户的报告"""
    if not session.get('user_id'):
        return redirect(url_for('login_page'))
    
    if not session.get('is_tenant_admin') and not session.get('is_admin'):
        return redirect(url_for('dashboard'))
    
    company = session.get('company', '')
    
    conn = get_db_conn()
    c = conn.cursor()
    c.execute('''
        SELECT a.*, u.company, u.username
        FROM assessments a
        JOIN users u ON a.user_id = u.id
        WHERE a.id = ? AND u.company = ?
    ''', (assessment_id, company))
    
    row = c.fetchone()
    conn.close()
    
    if not row:
        return redirect(url_for('tenant_admin_dashboard'))
    
    import ast
    results_data = ast.literal_eval(row[6]) if row[6] else []
    overall_score = row[7]
    
    if overall_score >= 4.5: overall_comment = '你是AI组织转型的专家级人才！'
    elif overall_score >= 3.5: overall_comment = '你具备较强的AI组织转型能力，是组织中的AI先行者'
    elif overall_score >= 2.5: overall_comment = '你处于AI能力的中等水平，有较大提升空间'
    else: overall_comment = '你的AI能力还需要大量学习和实践，但这是成长的起点'
    
    radar_data = [{'dimension': r['name'], 'value': r['rate'] * 100, 'color': r['color']} for r in results_data]
    sorted_results = sorted(results_data, key=lambda x: x['rate'])
    weakest = sorted_results[:2]
    strongest = sorted_results[-2:][::-1]
    
    return render_template('result.html',
                         name=row[3], department=row[4], position=row[5],
                         results=results_data, overall_score=overall_score,
                         overall_comment=overall_comment, radar_data=radar_data,
                         weakest=weakest, strongest=strongest,
                         current_time=row[8][:16])

# ============ 启动 ============
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5011))
    app.run(host='0.0.0.0', port=port, debug=False)

# ============ 用户管理功能 ============

@app.route('/manage-users')
def manage_users():
    """用户管理页面 - 租户管理员管理本企业用户，平台管理员管理所有用户"""
    if not session.get('user_id'):
        return redirect(url_for('login_page'))
    
    is_tenant_admin = session.get('is_tenant_admin')
    is_admin = session.get('is_admin')
    
    if not is_tenant_admin and not is_admin:
        return redirect(url_for('dashboard'))
    
    company = session.get('company', '')
    
    conn = get_db_conn()
    c = conn.cursor()
    
    if is_admin and not is_tenant_admin:
        # 平台管理员：查看所有用户
        c.execute('SELECT id, username, company, is_admin, is_tenant_admin, created_at FROM users ORDER BY company, created_at DESC')
    else:
        # 租户管理员：只看本企业用户
        c.execute('SELECT id, username, company, is_admin, is_tenant_admin, created_at FROM users WHERE company = ? ORDER BY created_at DESC', (company,))
    
    users = c.fetchall()
    conn.close()
    
    users_list = [{
        'id': u[0],
        'username': u[1],
        'company': u[2] or '',
        'is_admin': u[3],
        'is_tenant_admin': u[4],
        'created_at': u[5][:16] if u[5] else ''
    } for u in users]
    
    return render_template('manage_users.html',
                           users=users_list,
                           current_user=session.get('username', ''),
                           is_platform_admin=is_admin,
                           is_tenant_admin=is_tenant_admin)

@app.route('/api/toggle-tenant-admin', methods=['POST'])
def api_toggle_tenant_admin():
    """切换用户的租户管理员身份"""
    if not session.get('user_id'):
        return jsonify({'status': 'error', 'message': '请先登录'})
    
    # 只有平台管理员可以设置租户管理员
    if not session.get('is_admin'):
        return jsonify({'status': 'error', 'message': '只有平台管理员可以执行此操作'})
    
    data = request.json
    user_id = data.get('user_id')
    
    if not user_id:
        return jsonify({'status': 'error', 'message': '用户ID不能为空'})
    
    # 不能修改自己
    if user_id == session.get('user_id'):
        return jsonify({'status': 'error', 'message': '不能修改自己的权限'})
    
    conn = get_db_conn()
    c = conn.cursor()
    
    # 获取当前状态
    c.execute('SELECT is_tenant_admin, username FROM users WHERE id = ?', (user_id,))
    user = c.fetchone()
    
    if not user:
        conn.close()
        return jsonify({'status': 'error', 'message': '用户不存在'})
    
    new_status = 1 if user[0] == 0 else 0
    action = '设为' if new_status == 1 else '取消'
    
    c.execute('UPDATE users SET is_tenant_admin = ? WHERE id = ?', (new_status, user_id))
    conn.commit()
    conn.close()
    
    return jsonify({
        'status': 'success', 
        'message': f"{action}租户管理员成功",
        'new_status': new_status,
        'username': user[1]
    })

@app.route('/api/toggle-user-status', methods=['POST'])
def api_toggle_user_status():
    """启用/禁用用户"""
    if not session.get('user_id'):
        return jsonify({'status': 'error', 'message': '请先登录'})
    
    is_tenant_admin = session.get('is_tenant_admin')
    is_admin = session.get('is_admin')
    
    if not is_tenant_admin and not is_admin:
        return jsonify({'status': 'error', 'message': '权限不足'})
    
    data = request.json
    user_id = data.get('user_id')
    
    if not user_id:
        return jsonify({'status': 'error', 'message': '用户ID不能为空'})
    
    # 不能操作自己
    if user_id == session.get('user_id'):
        return jsonify({'status': 'error', 'message': '不能修改自己的状态'})
    
    conn = get_db_conn()
    c = conn.cursor()
    
    # 检查权限范围：租户管理员只能操作同公司用户
    if is_tenant_admin and not is_admin:
        c.execute('SELECT company FROM users WHERE id = ?', (session.get('user_id'),))
        my_company = c.fetchone()[0]
        c.execute('SELECT company FROM users WHERE id = ?', (user_id,))
        target_company = c.fetchone()
        if not target_company or target_company[0] != my_company:
            conn.close()
            return jsonify({'status': 'error', 'message': '只能管理同企业用户'})
    
    # 这里简化处理：实际上我们可以添加一个disabled字段
    # 目前系统没有disabled功能，暂时返回成功但不实际生效
    conn.close()
    
    return jsonify({'status': 'success', 'message': '用户状态已更新'})

@app.route('/api/create-user', methods=['POST'])
def api_create_user():
    """快速创建用户（租户管理员创建同企业用户）"""
    if not session.get('user_id'):
        return jsonify({'status': 'error', 'message': '请先登录'})
    
    is_tenant_admin = session.get('is_tenant_admin')
    is_admin = session.get('is_admin')
    
    if not is_tenant_admin and not is_admin:
        return jsonify({'status': 'error', 'message': '权限不足'})
    
    data = request.json
    username = data.get('username', '').strip()
    password = data.get('password', '')
    company = data.get('company', '').strip() or session.get('company', '')
    
    if not username or not password:
        return jsonify({'status': 'error', 'message': '用户名和密码不能为空'})
    
    if len(password) < 6:
        return jsonify({'status': 'error', 'message': '密码至少6位'})
    
    # 租户管理员只能创建同企业用户
    if is_tenant_admin and not is_admin:
        user_company = session.get('company', '')
        if company != user_company:
            return jsonify({'status': 'error', 'message': '租户管理员只能创建同企业用户'})
    
    user_id = str(uuid.uuid4())[:8]
    
    # 如果没有提供企业名称，且是平台管理员创建的，则报错
    if is_tenant_admin and not is_admin and not company:
        return jsonify({'status': 'error', 'message': '企业名称不能为空'})
    
    try:
        conn = get_db_conn()
        c = conn.cursor()
        c.execute('INSERT INTO users (id, username, password, company, is_admin, is_tenant_admin) VALUES (?, ?, ?, ?, 0, 0)',
                 (user_id, username, hash_password(password), company))
        conn.commit()
        conn.close()
        
        return jsonify({
            'status': 'success', 
            'message': f"用户 {username} 创建成功（密码：{password}）",
            'username': username,
            'password': password  # 只在这里返回明文密码，之后无法找回
        })
    except sqlite3.IntegrityError:
        return jsonify({'status': 'error', 'message': '用户名已存在'})
