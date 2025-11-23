# 测试项目使用指南

## 📁 测试项目位置

测试项目已创建在：
```
C:\Users\Lenovo\test-maintenance-project
```

**重要**：这个项目在**你的主项目外部**，完全独立，**不会影响组员的代码**！

---

## ✅ 项目结构

```
test-maintenance-project/
├── src/
│   └── calculator.py          # 计算器模块（已修改，用于测试）
├── tests/
│   └── test_calculator.py     # 测试文件
├── .gitignore
├── README.md
└── .git/                       # Git 仓库（已有2个提交）
```

---

## 📋 Git 提交历史

### 提交1：Initial commit
- 创建了基本的计算器模块和测试
- `add()` 函数：简单的加法

### 提交2：feat: Add validation
- 修改了 `add()` 函数
- 添加了验证：第一个参数必须非负
- **这个修改会导致测试失败**（用于测试维护功能）

---

## 🚀 如何使用测试项目

### 步骤1：在扩展开发主机中打开测试项目

1. **在扩展开发主机窗口中**（不是主窗口）：
   - 点击 `文件` → `打开文件夹...`
   - 或按 `Ctrl+K Ctrl+O`

2. **选择测试项目文件夹**：
   ```
   C:\Users\Lenovo\test-maintenance-project
   ```

3. **确认文件夹已打开**：
   - 左侧资源管理器应该显示项目文件
   - 应该能看到 `src/` 和 `tests/` 文件夹

### 步骤2：执行维护分析

1. **点击左侧 "LLT Maintenance" 图标**

2. **点击 "Analyze Maintenance" 按钮**
   - 或使用命令：`LLT: Analyze Maintenance`

3. **查看结果**：
   - 应该检测到 `src/calculator.py` 的变更
   - 应该识别出 `tests/test_calculator.py` 中的 `test_add` 受影响
   - 影响级别应该是 `high` 或 `critical`（因为添加了验证）

### 步骤3：测试批量修复

1. **在决策对话框中选择**：
   - "Yes, functionality changed"（因为添加了验证）
   - 输入描述："Added validation to require non-negative first parameter"

2. **选择要修复的测试**：
   - 选择 `test_add`

3. **执行批量修复**：
   - 点击 "Batch Fix Tests" 按钮
   - 应该会重新生成 `test_add` 测试

---

## 🎯 预期结果

### 分析结果应该显示：

1. **变更摘要**：
   - 1 个文件变更：`src/calculator.py`
   - 1 个函数变更：`add`
   - 新增行数：约 8 行
   - 变更类型：`feature_addition`

2. **受影响的测试**：
   - `tests/test_calculator.py` → `test_add`
   - 影响级别：`high` 或 `critical`
   - 原因：函数行为改变（添加了验证）

---

## ✅ 验证清单

- [x] 测试项目已创建在项目外部
- [x] 是独立的 Git 仓库
- [x] 有 2 个提交可以对比
- [x] 包含 Python 源代码和测试文件
- [x] 第二个提交修改了代码（添加验证）
- [x] 修改会导致测试失败

---

## 🔍 测试场景说明

### 场景：功能变更导致测试失效

**初始代码**（提交1）：
```python
def add(a, b):
    return a + b
```

**修改后**（提交2）：
```python
def add(a, b):
    if a < 0:
        raise ValueError("First number must be non-negative")
    return a + b
```

**测试代码**：
```python
def test_add():
    assert add(2, 3) == 5
    assert add(0, 0) == 0
    assert add(-1, 1) == 0  # 这个会失败！
```

**结果**：
- 维护功能应该识别出 `test_add` 受影响
- 因为 `add(-1, 1)` 现在会抛出异常
- 需要更新测试以处理新的验证逻辑

---

## 💡 提示

### 如果看不到分析结果

1. **检查后端连接**：
   - 如果健康检查失败，点击 "Continue" 继续
   - 实际 API 调用会验证后端是否可用

2. **检查 Git 仓库**：
   ```bash
   git log --oneline
   ```
   - 应该看到 2 个提交

3. **检查文件**：
   - 确保 `src/calculator.py` 和 `tests/test_calculator.py` 存在

### 如果想修改测试项目

测试项目完全独立，你可以：
- 修改代码
- 创建新提交
- 测试不同的场景
- **完全不会影响主项目**

---

## 🎉 现在可以测试了！

1. 在扩展开发主机中打开：`C:\Users\Lenovo\test-maintenance-project`
2. 执行 `LLT: Analyze Maintenance`
3. 查看完整的分析结果！

测试项目已准备就绪，可以开始测试维护功能了！

