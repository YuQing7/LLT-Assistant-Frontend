# 维护功能 Git 仓库要求

## 📋 前提条件

维护功能需要满足以下条件：

1. **必须是 Git 仓库**
   - 当前打开的文件夹必须是一个 Git 仓库
   - 如果不是，需要先初始化 Git 仓库

2. **至少需要 2 个提交**
   - 维护分析需要对比两次提交之间的差异
   - 如果只有 1 个提交，无法进行对比

---

## 🔧 如何准备 Git 仓库

### 情况1：当前文件夹不是 Git 仓库

#### 方法1：使用扩展的自动初始化（推荐）

当执行 `LLT: Analyze Maintenance` 时：
1. 如果检测到不是 Git 仓库
2. 会弹出提示："This workspace is not a Git repository..."
3. 点击 **"Initialize Git"** 按钮
4. 扩展会自动执行：
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

#### 方法2：手动初始化

在终端中执行：

```bash
# 1. 初始化 Git 仓库
git init

# 2. 添加所有文件
git add .

# 3. 创建第一个提交
git commit -m "Initial commit"

# 4. 修改一些文件后，创建第二个提交
# ... 修改文件 ...
git add .
git commit -m "Second commit"
```

### 情况2：只有 1 个提交

如果仓库只有 1 个提交：
1. 修改一些文件
2. 创建第二个提交：
   ```bash
   git add .
   git commit -m "Second commit"
   ```
3. 然后就可以使用维护功能了

---

## ✅ 验证 Git 仓库状态

### 检查是否是 Git 仓库

在终端中执行：
```bash
git status
```

- 如果显示 "fatal: not a git repository"，说明不是 Git 仓库
- 如果显示文件状态，说明是 Git 仓库

### 检查提交数量

在终端中执行：
```bash
git log --oneline
```

- 需要至少看到 2 行（2 个提交）
- 如果只有 1 行，需要创建第二个提交

---

## 🎯 使用维护功能的完整流程

### 步骤1：准备 Git 仓库

1. 打开一个包含 Python 代码的文件夹
2. 确保是 Git 仓库（如果不是，初始化）
3. 确保有至少 2 个提交

### 步骤2：执行维护分析

1. 点击左侧 "LLT Maintenance" 图标
2. 点击 "Analyze Maintenance" 按钮
3. 或使用命令：`LLT: Analyze Maintenance`

### 步骤3：查看结果

- 如果健康检查失败，点击 "Continue" 继续
- 如果 Git 仓库不符合要求，按照提示操作
- 分析完成后，会显示受影响的测试用例

---

## 💡 常见问题

### Q: 为什么需要 2 个提交？

A: 维护功能通过对比两次提交之间的差异来识别受影响的测试。如果没有之前的提交，无法进行对比。

### Q: 我可以使用工作区的未提交更改吗？

A: 当前版本只支持对比已提交的更改。如果需要分析未提交的更改，可以先提交，然后再分析。

### Q: 如何快速创建测试提交？

A: 可以创建一个空的提交用于测试：
```bash
git commit --allow-empty -m "Test commit"
```

---

## 📝 示例工作流

```bash
# 1. 初始化仓库（如果还没有）
git init

# 2. 添加并提交初始代码
git add .
git commit -m "Initial commit"

# 3. 修改代码（例如修改一个函数）
# ... 编辑文件 ...

# 4. 提交更改
git add .
git commit -m "Update function implementation"

# 5. 现在可以使用维护功能了！
# 在 VSCode 中执行: LLT: Analyze Maintenance
```

---

## ⚠️ 注意事项

1. **维护功能只分析已提交的更改**
   - 未提交的更改不会被分析
   - 建议先提交更改，再执行分析

2. **需要 Python 源代码文件**
   - 维护功能主要针对 Python 代码
   - 其他类型的文件可能不会被分析

3. **需要测试文件**
   - 功能会尝试识别受影响的测试用例
   - 如果没有测试文件，可能不会显示结果

---

按照这些步骤准备 Git 仓库后，就可以正常使用维护功能了！

