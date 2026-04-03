# AI组织转型人才能力测评系统 - 多租户权限体系设计

## 一、角色体系

### 1.1 平台方（Platform Admin）
- 平台运营方角色
- 权限：管理所有租户、查看全局数据、账单管理、平台配置

### 1.2 租户管理员（Tenant Admin）
- 企业客户的管理员
- 权限：管理本企业用户、查看本企业所有报告、团队汇总分析、邀请/分配账号

### 1.3 普通用户（User）
- 企业内部员工
- 权限：仅查看和操作自己的测评记录

---

## 二、数据模型

### 2.1 Users Collection
```
users/
  {userId}/
    email: string
    role: "platform_admin" | "tenant_admin" | "user"
    tenantId: string | null  // 所属租户
    department: string
    position: string
    createdAt: timestamp
    lastLoginAt: timestamp
    isActive: boolean
```

### 2.2 Tenants Collection
```
tenants/
  {tenantId}/
    name: string  // 企业名称
    plan: "trial" | "basic" | "professional" | "enterprise"
    maxUsers: number  // 最大用户数
    admins: [userId, ...]  // 管理员列表
    createdAt: timestamp
    expireAt: timestamp  // 过期时间
    settings:
      logo: string
      primaryColor: string
      customDomain: string
```

### 2.3 Invitations Collection
```
invitations/
  {invitationId}/
    tenantId: string
    email: string
    role: "tenant_admin" | "user"
    invitedBy: userId
    status: "pending" | "accepted" | "expired"
    createdAt: timestamp
    expireAt: timestamp
```

### 2.4 Assessments Collection (扩展)
```
assessments/
  {assessmentId}/
    userId: string
    tenantId: string
    name: string
    department: string
    position: string
    answers: object
    results: array
    overallScore: number
    createdAt: timestamp
    sharedWith: [userId, ...]  // 分享给哪些用户
```

---

## 三、权限矩阵

| 功能 | Platform Admin | Tenant Admin | User |
|------|---------------|-------------|------|
| 管理所有租户 | ✅ | ❌ | ❌ |
| 创建租户 | ✅ | ❌ | ❌ |
| 管理本租户用户 | ✅ | ✅ | ❌ |
| 邀请用户 | ✅ | ✅ | ❌ |
| 查看所有测评报告 | ✅ | ✅ (本租户) | ❌ (仅自己) |
| 团队汇总分析 | ✅ | ✅ | ❌ |
| 团队对比分析 | ✅ | ✅ | ❌ |
| 发起测评 | ✅ | ✅ | ✅ |
| 查看自己报告 | ✅ | ✅ | ✅ |

---

## 四、页面结构

### 4.1 普通用户视图
```
- /login
- /assessment
- /result/:id
- /history
- /profile
```

### 4.2 租户管理员视图
```
- /admin/dashboard  (企业概览)
- /admin/users  (用户管理)
- /admin/invitations  (邀请管理)
- /admin/team-analytics  (团队分析)
- /admin/settings  (企业设置)
- + 普通用户所有页面
```

### 4.3 平台管理员视图
```
- /platform/dashboard  (全局概览)
- /platform/tenants  (租户管理)
- /platform/billing  (账单管理)
- /platform/settings  (平台设置)
```

---

## 五、团队分析功能

### 5.1 企业测评概览
- 测评总人数
- 平均得分分布
- 各部门参与率

### 5.2 能力热力图
- 各维度平均得分
- 与行业基准对比

### 5.3 人才分布
- 按能力等级分布（5级分类）
- 高潜力人才识别
- 需重点培养对象

### 5.4 部门对比
- 各部门平均得分雷达图
- 优势/劣势维度对比

---

## 六、付费套餐设计

### 6.1 套餐类型

| 套餐 | 价格 | 用户数 | 功能 |
|------|------|--------|------|
| 试用版 | 免费 | 5人 | 基础测评 |
| 专业版 | 299/月 | 20人 | 团队分析+报告导出 |
| 企业版 | 999/月 | 不限 | 私有部署+API+定制 |

### 6.2 权益说明
- 支持先试用再付费
- 到期前7天提醒
- 欠费30天自动暂停

---

## 七、实施建议

### Phase 1: 基础权限 (MVP)
1. 添加用户角色字段
2. 实现邀请/注册流程
3. 管理员可见团队数据

### Phase 2: 团队分析
1. 企业概览仪表板
2. 部门对比功能
3. 报告导出

### Phase 3: 付费体系
1. 套餐管理
2. 用量统计
3. 账单系统

---

## 八、技术实现

### 8.1 Firestore 安全规则
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 平台管理员
    match /platform/{document} {
      allow read, write: if isPlatformAdmin();
    }
    
    // 租户数据
    match /tenants/{tenantId} {
      allow read: if isPlatformAdmin() || isTenantMember(tenantId);
      allow write: if isPlatformAdmin() || isTenantAdmin(tenantId);
    }
    
    // 用户数据
    match /users/{userId} {
      allow read: if isPlatformAdmin() || isTenantMember(getUser(userId).tenantId);
      allow write: if isPlatformAdmin() || isTenantAdmin(getUser(userId).tenantId) || request.auth.uid == userId;
    }
    
    // 测评数据
    match /assessments/{assessmentId} {
      allow read: if isPlatformAdmin() || 
                   resource.data.userId == request.auth.uid ||
                   (isTenantAdmin(resource.data.tenantId) && resource.data.tenantId == getUser(request.auth.uid).tenantId);
      allow create: if request.auth != null;
      allow update, delete: if isPlatformAdmin() || resource.data.userId == request.auth.uid;
    }
  }
}
```

### 8.2 关键函数
```javascript
function isPlatformAdmin() {
  return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'platform_admin';
}

function isTenantAdmin(tenantId) {
  return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'tenant_admin' &&
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.tenantId == tenantId;
}

function isTenantMember(tenantId) {
  return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.tenantId == tenantId;
}
```
