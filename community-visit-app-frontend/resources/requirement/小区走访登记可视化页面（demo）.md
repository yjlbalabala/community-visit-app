小区走访登记可视化页面（demo）

需求：

1、可视化页面，中心区域：在小区内有多个单元，假设1单元，有101,102,103,104,201,202,203,204...501,502,503,504户人家。假设有3种颜色：红、黄、绿。红色代表情况复杂，我需要亲自走访，时间比较急促。黄色代表情况没有很复杂，可能不需要走访，只需要打一个电话来确定住户内的人员信息。绿色代表暂时不用走访（这户没有住人）。点击一个单元，假设101单元，右边拉出一个框，可以看见这户人家的信息：房东，电话，住户性质，住房类别等，以及上次的走访时间，还有情况说明。每户人家根据不同情况（颜色）按期提示我要走访。若某户人家的情况改变，对应该户的可视化颜色也要进行改变。

2、代办事项：比如我有一个要亲自走访的代办事项（可能不止一个），点开一个，有走访信息，以及上次走访的时间，还走走访人家的信息（参考第一条需求）。还有两个按钮：按钮1：变更信息；按钮2：确定。

按钮1：变更信息：点击这个按钮，弹出这户人家的信息，我可以进行修改，修改完成后，这户人家的信息也随之修改，在可视化页面中对应该户人家的信息也要进行修改。点击后返回，该条代办事项完成，并移除该代办事项。

按钮2：确定：点击确定后，即不变更住户信息，只是确认，并移除该代办事项。

3、代办事项操作记录：对于每一次的代办事项操作，都要有对应的操作记录。要有操作类别和操作时间。

4、我可以登记并修改每户人家的信息。对应的，在可视化页面上对应的一户人家的信息也要变更。

对于操作类别：

如果是变更信息操作，要有对应的改变信息。如果是确认操作就没有。



##注意：

1、这个小区走访登记可视化页面目前只有这样的需求，我需要做一个demo出来。你可以优化一下我的说法便于你理解，但不要减少或者额外添加其它需求。

2、这个项目最关键的是可视化，即小区各单元各户人家的展示（后续可能包括多个小区，目前只要一个小区，甚至一个单元的展示，看看效果），让人看着舒服明了。

##说明

1、目前该项目引入了一些库，详情请查看 package.json。在 src/pages/HouseGrid.vue 中，简单实现了一个小区单元中每户的可视化。

2、现在需要实现点击小区单元，弹出对应单元的住户信息，以及修改住户信息。你可以查看 src/pages/HouseGrid.vue 文件，便与你理解并实现需求。
我已经安装好了 element-ui 组件库，你必须使用 element-ui 的组件。官网地址：https://element-plus.org/zh-CN/component/overview.html

---

## 开发计划（2026-07-17）

### 项目现状分析

- **main.ts**: Pinia + Router 已注册，Element Plus 未注册
- **App.vue**: 只渲染 `<HouseGridPage />`，缺少整体布局
- **HouseGridPage.vue**: ECharts 网格能正常渲染 20 户（5层×4户），颜色为随机 mock 数据；点击格子仅 console.log，未弹出详情
- **ApartmentPage.vue**: 独立 bar chart demo，未接入主流程
- **Router**: 两个路由都指向 HouseGridPage（/about 是模板残留）
- **Store**: Pinia 已引入但无任何 store 文件
- **UI**: element-plus 已安装（v2.14.3），但 main.ts 未注册，项目中未使用任何 el- 组件

### 阶段 1：基础设施

1. **注册 Element Plus** — `main.ts` 补充 `import ElementPlus from 'element-plus'` 及 CSS，全局可用所有 el- 组件
2. **创建 Pinia Store**:
   - `stores/household.ts` — 管理 20 户固定初始数据（替代随机 mock），提供 CRUD 方法
   - `stores/todo.ts` — 代办事项列表，status==='red' 自动生成待办，完成后移除
   - `stores/operationLog.ts` — 操作记录（操作类别、时间、变更详情）
3. **清理 Router** — 移除 `/about` 和未使用的 `ApartmentPage`

### 阶段 2：页面布局重构

改造 `HouseGridPage.vue` 为三段式布局：

```
┌─────────────────────────────────────────────────────┐
│  📋 代办事项 (el-card)          │  🏠 房屋详情       │
│  待办1: 101 需走访 [变更][确定]  │  (el-drawer)      │
│  待办2: 302 需走访 [变更][确定]  │  点击格子后弹出    │
├─────────────────────────────────┤                    │
│  🏘️ 小区单元可视化 (ECharts)    │                    │
│  ┌──────┬──────┬──────┬──────┐  │                    │
│  │ 101  │ 102  │ 103  │ 104  │  │                    │
│  │ 201  │ 202  │ 203  │ 204  │  │                    │
│  │ 301  │ 302  │ 303  │ 304  │  │                    │
│  │ 401  │ 402  │ 403  │ 404  │  │                    │
│  │ 501  │ 502  │ 503  │ 504  │  │                    │
│  └──────┴──────┴──────┴──────┘  │                    │
├─────────────────────────────────┤                    │
│  📝 操作记录 (el-table)          │                    │
│  时间 | 操作类别 | 房号 | 详情   │                    │
└─────────────────────────────────────────────────────┘
```

- 点击格子 → 右侧弹出 `el-drawer`，展示该户全部信息
- Drawer 底部提供编辑按钮
- 左侧/底部展示待办事项和操作记录

### 阶段 3：交互闭环

1. **点击格子** → `el-drawer` 展示：房东、电话、住户性质、住房类别、上次走访时间、情况说明
2. **编辑按钮** → `el-dialog` 表单（element-plus 表单组件）：修改信息 → store 更新 → ECharts 自动重绘（颜色联动）
3. **代办事项**:
   - "变更信息" 按钮 → 打开该户编辑 dialog → 保存 → 移除待办 + 记录日志
   - "确定" 按钮 → 直接确认 → 移除待办 + 记录日志（操作类别="确认"）
4. **状态颜色联动**: status 变为 red → 自动加入待办列表；变为 yellow/green → 对应待办移除

### 阶段 4：操作记录

- `el-table` 展示所有历史操作
- 列：操作类别（变更信息/确认走访）、操作时间、房号、变更详情（如"状态: 红→黄；电话: 138xxx→139xxx"）

### 设计决策

1. **数据驱动渲染** — 所有状态由 Pinia store 管理，ECharts 通过 `watch(houseList, ...)` 联动重绘
2. **代办自动管理** — status==='red' 自动进入 todo，无需手动添加
3. **组件拆分** — 新建 `HouseDetailDrawer.vue`、`TodoPanel.vue`、`OperationLog.vue`、`HouseEditDialog.vue`，保持 `HouseGridPage.vue` 清晰
4. **固定初始数据** — 用真实 mock 数据替代随机生成，保证 demo 每次打开一致
5. **必须使用 element-plus 组件** — el-drawer、el-dialog、el-form、el-table、el-card、el-button、el-tag 等

---

## 后端兼容性扩展分析（2026-07-17）

> 目标后端栈：SpringBoot 3 + MyBatis-Plus + MySQL + Redis

### 原有计划的问题

当前开发计划是**纯前端、纯内存**的：Pinia store 直接操作本地数组，没有 API 层。后期接入后端时所有 store action 都要重写，改动面大。因此需要在架构上提前做一层**数据访问隔离**。

### 架构调整对比

| 维度 | 调整前 | 调整后 |
|------|--------|--------|
| 数据层 | Store 直接操作内存数组 | Store → API 函数 → [Mock 模式 \| HTTP 模式] |
| 接口定义 | `HouseItem` 散落在组件中 | 抽取到 `types/index.ts`，与后端 DTO 对齐 |
| HTTP 客户端 | 无 | `api/client.ts` 封装 axios（已安装），含 baseURL、超时、拦截器 |
| Mock 策略 | 无 | API 函数内判断 `VITE_USE_MOCK`，mock 时用内存数据，真实时发 HTTP |
| 环境配置 | 无 | `.env` / `.env.production` 定义 API 地址和 mock 开关 |
| 数据库设计 | 无 | 提前定义表结构，确保前后端接口对齐 |

### 数据库设计（MySQL）

```sql
-- 住户信息表
CREATE TABLE household (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    room_no         VARCHAR(10)  NOT NULL COMMENT '房号，如101',
    floor           INT          NOT NULL COMMENT '楼层',
    door            INT          NOT NULL COMMENT '门号',
    status          VARCHAR(10)  NOT NULL DEFAULT 'green' COMMENT 'red | yellow | green',
    landlord        VARCHAR(50)  COMMENT '房东姓名',
    phone           VARCHAR(20)  COMMENT '联系电话',
    user_type       VARCHAR(50)  COMMENT '住户性质（常住居民/租户/其他）',
    house_type      VARCHAR(50)  COMMENT '住房类别（商品房/公租房/其他）',
    last_visit_time DATETIME     COMMENT '上次走访时间',
    remark          TEXT         COMMENT '情况说明',
    created_at      DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_room_no (room_no)
);

-- 操作记录表
CREATE TABLE operation_log (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    room_no         VARCHAR(10)  NOT NULL COMMENT '房号',
    operation_type  VARCHAR(20)  NOT NULL COMMENT '变更信息 | 确认走访',
    changes_detail  TEXT         COMMENT '变更详情（JSON 格式，如 {"status":"red->yellow"}）',
    operated_at     DATETIME     DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_operated_at (operated_at)
);
```

> **代办事项不建表**：住户表中 `status='red'` 即待办。`operation_log` 记录所有已完成/变更的历史，天然可追溯。

### RESTful API 设计

| 方法 | 路径 | 请求体 | 说明 |
|------|------|--------|------|
| `GET` | `/api/households` | — | 获取全部住户列表 |
| `GET` | `/api/households/{roomNo}` | — | 获取单户详情 |
| `PUT` | `/api/households/{roomNo}` | JSON: 住户信息 | 修改住户信息 |
| `GET` | `/api/operation-logs` | `?page=1&size=20` | 分页获取操作记录 |
| `POST` | `/api/operation-logs` | JSON: 操作记录 | 新增操作记录 |

### 前端目录结构（调整后）

```
src/
  api/
    client.ts              ← axios 实例（baseURL、拦截器、超时）
    household.ts           ← 住户 CRUD，mock/real 双模式
    operationLog.ts        ← 操作日志 API
  types/
    index.ts               ← Household、OperationLog、ApiResponse 等接口
  stores/
    household.ts           ← 调用 api/household，管理 loading/error 状态
    operationLog.ts        ← 调用 api/operationLog
  components/
    HouseDetailDrawer.vue  ← el-drawer 房屋详情
    HouseEditDialog.vue    ← el-dialog 编辑表单
    TodoPanel.vue          ← 待办列表
    OperationLog.vue       ← 操作记录表格
  pages/
    HouseGridPage.vue      ← 主页面（含 ECharts 可视化）
```

### Mock / Real 双模式切换

```
                    ┌─ VITE_USE_MOCK=true ── 内存数据（纯前端开发，无后端）
                    │
Component → Store ──┤
                    │
                    └─ VITE_USE_MOCK=false ── axios ──▶ SpringBoot ──▶ MySQL
                                                                ──▶ Redis
```

- **开发阶段**：`.env` 中 `VITE_USE_MOCK=true`，API 函数返回本地数据
- **接入后端**：改为 `VITE_USE_MOCK=false`，`VITE_API_BASE_URL=http://localhost:8080/api`
- **关键**：切换时只需改 2 个环境变量，**Store 和组件代码零改动**

### Redis 缓存策略（后端）

| 场景 | 策略 |
|------|------|
| 住户列表 | `GET /api/households` 缓存 5 分钟，数据变更时主动失效 |
| 操作记录 | 最近 50 条热数据缓存，历史数据走 MySQL |
| 走访提醒 | 用 Redis 的 Sorted Set 按 `last_visit_time` 排序，定时任务扫描到期提醒 |
| 分布式锁 | 编辑住户信息时加锁（`SETNX`），防止并发修改冲突 |

### 渐进式开发路径

```
第 1 步（现在）  → 纯前端 demo，Mock 模式，完整交互
第 2 步（后期）  → 建 MySQL 表 + SpringBoot CRUD 接口
第 3 步（后期）  → 前端切到 VITE_USE_MOCK=false，联调
第 4 步（后期）  → 接入 Redis 缓存 + 走访提醒定时任务
```

每一步之间**前端业务代码不变**，只改环境变量和 API 实现。
