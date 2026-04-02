# AI组织转型人才能力测评系统 - 部署指南

## 架构说明

本系统使用 **Firebase + Netlify** 部署：
- **Firebase**: 负责用户认证 + 数据库（免费额度充足）
- **Netlify**: 负责静态网站托管（免费）

## 部署步骤

### 第一步：创建 Firebase 项目

1. 访问 https://console.firebase.google.com/
2. 点击"添加项目" → 输入项目名称 → 创建
3. 进入项目后，点击左侧 **Authentication** → 开始使用 → 启用"电子邮件/密码"
4. 点击左侧 **Firestore Database** → 创建数据库 → 测试模式
5. 点击左侧 **项目设置** → 找到"您的应用"部分 → 点击 web 图标 (</>) → 注册应用
6. 复制 Firebase 配置信息

### 第二步：更新代码配置

打开 `public/js/app.js`，替换开头的 Firebase 配置：

```javascript
const firebaseConfig = {
    apiKey: "你的API_KEY",
    authDomain: "你的项目.firebaseapp.com",
    projectId: "你的项目ID",
    storageBucket: "你的项目.appspot.com",
    messagingSenderId: "你的发送者ID",
    appId: "你的应用ID"
};
```

### 第三步：上传到 GitHub

1. 访问 https://github.com/new 创建新仓库，名称如 `ai-capability-assessment`
2. 在本地执行：

```bash
cd ~/.openclaw/workspace/ai-capability-assessment
git init
git add public/
git commit -m "AI能力测评系统"
git branch -M main
git remote add origin https://github.com/你的用户名/ai-capability-assessment.git
git push -u origin main
```

### 第四步：部署到 Netlify

1. 访问 https://app.netlify.com 并登录（可用 GitHub 账号）
2. 点击 **Add new site** → **Import an existing project**
3. 选择 GitHub → 授权 Netlify 访问你的 GitHub
4. 选择刚创建的仓库
5. Netlify 会自动检测到 `netlify.toml`，直接部署
6. 部署完成后，你会获得一个 URL，如：`https://xxx.netlify.app`

### 第五步：绑定自定义域名（可选）

1. 在 Netlify 的 Site settings → Domain management 中添加域名
2. 按提示配置 DNS 记录

---

## Firebase 免费额度

| 功能 | 免费额度 |
|------|---------|
| Authentication | 每月 10,000 次 |
| Firestore | 50,000 次读取 / 20,000 次写入 / 20,000 次删除 |
| Storage | 5GB 存储 / 1GB/天 下载 |

**对于中小企业内部使用，完全免费！**

---

## 功能说明

- ✅ 用户注册/登录（Firebase Auth）
- ✅ 29道测评问卷
- ✅ 能力雷达图可视化
- ✅ 测评结果永久保存（Firebase Firestore）
- ✅ 历史记录查看
- ✅ PDF打印（浏览器打印功能）
- ✅ 响应式设计，支持手机/电脑

---

## 下一步开发建议

1. **添加团队管理** - 在 Firestore 添加 `company` 字段，管理员可查看全公司报告
2. **添加团队汇总分析** - 聚合公司内所有员工数据
3. **添加飞书/企微登录** - Firebase 支持 SAML/OIDC 企业登录
4. **添加邮件通知** - Cloud Functions 发送报告邮件

---

*小龙虾公司出品 | 2026*
