---
name: youngro-provider-integration
description: Integrate new chat, TTS, or STT providers, complete pending implementations, and enhance existing ones with model/voice fetching and validation.
---

# Skill: Youngro Provider Integration

## 目的

在 Youngro monorepo 中，为新的 `chat` / `speech` / `transcription` Provider 提供一套一致、可复用、尽量不漏项的接入流程。

本 skill 的目标不是只“把代码写出来”，而是确保 Provider 在以下层面都完成闭环：

- Provider 元数据已声明
- 配置字段和校验规则已补齐
- Adapter / API 路由已接通
- 设置页能够展示并完成配置
- 必要时支持模型、音色、验证接口
- 相关文档和检查命令已同步

## 适用场景

当用户提出以下需求时使用本 skill：

- 接入一个新的聊天模型 Provider
- 接入一个新的语音合成 Provider
- 接入一个新的语音转写 Provider
- 补全一个已声明但尚未真正接通的 Provider
- 为现有 Provider 增加模型拉取、音色拉取、远程校验等能力

## 不适用场景

以下情况不要直接套用本 skill，或只复用其中的一部分：

- 只是修改某个 Provider 的文案、图标、排序
- 只是修一个已有 Provider 的小 bug
- 只是调整 UI 样式，不涉及配置、校验、调用链
- 只是补 README，不改实现
- 只是新增一个通用 OpenAI-compatible 适配层，但不落某个具体 Provider

## 仓库上下文

默认认为当前仓库结构如下：

- `apps/web/src/data/settings/providers.ts`：Provider 元数据、分类、能力声明
- `apps/web/src/store/providersStore.ts`：配置存储、持久化、校验、模型拉取
- `apps/web/src/lib/providers/adapter.ts`：聊天 Provider 适配器类型定义
- `apps/web/src/lib/providers/registry.ts`：聊天 Provider 注册表
- `apps/web/src/lib/providers/adapters/*`：聊天 Provider 适配器实现
- `apps/web/app/api/speech/providers/[providerId]/*`：语音 Provider 的 validate/models/voices/synthesize API
- `apps/web/app/settings/providers/**`：Provider 设置相关页面
- `apps/web/app/settings/modules/speech/**`：语音模块配置页
- `README.md`、`README.zh-CN.md`：仓库级能力说明

架构上遵守仓库既有约束：

- 保持 `lib → store → feature → ui → app` 的依赖方向
- 不要让 app 层承担可复用 Provider 逻辑
- 优先复用已有能力，而不是为单个 Provider 引入新的一套模式

## 输入信息

开始实施前，先从用户请求或仓库上下文中确认这些信息：

- Provider 名称
- Provider 类别：`chat` / `speech` / `transcription`
- 是否是全新 Provider，还是补全已有 Provider
- 认证方式：`apiKey`、`baseUrl`、`secretId/secretKey` 或其他
- 是否支持远程校验
- 是否支持模型列表拉取
- 是否支持音色列表拉取
- 是否支持 SSML
- 是否需要预览音频
- 是否已有后端接口规范
- 是否需要更新中英文 README

若未明确给出能力信息时, 需在回复中明确强调, 并执行默认策略, 默认策略定为：

- `chat`：默认支持验证，默认不主动抓模型列表，除非 Provider 官方明确支持
- `speech`：默认要求验证接口；模型/音色列表按能力决定
- `transcription`：默认只完成配置和最小可用调用

## 工作流程

### 1. 判断接入类型

先识别当前任务属于哪一类：

- `chat` Provider
- `speech` Provider
- `transcription` Provider
- 已声明 Provider 的补全任务

如果仓库中已经存在同名声明，优先做“补全”和“对齐”，不要重复造一份新的元数据。

### 2. 检查现有实现缺口

至少检查以下内容：

- `apps/web/src/data/settings/providers.ts` 中是否已有该 Provider 元数据
- `apps/web/src/store/providersStore.ts` 中是否已有对应配置字段与校验逻辑
- `apps/web/src/lib/providers/registry.ts` 中是否已注册适配器
- 若为 `speech`，检查 `apps/web/app/api/speech/providers/[providerId]/*` 是否存在对应路由逻辑
- 设置页是否已经能展示该 Provider
- README 是否声称已支持该 Provider，但实现未闭环

对于“已声明未接通”的情况，优先补全缺失链路，而不是重命名或重构。

### 3. 补齐 Provider 元数据

在 `apps/web/src/data/settings/providers.ts` 中完成：

- 正确的 `id`
- 正确的 `category`
- 本地化名称和描述
- 合适的图标与颜色
- 能力声明 `capabilities`
- 是否支持 SSML、模型元数据、音色元数据、预览等能力

如果是 `speech` Provider，能力声明必须尽量准确，因为设置页行为会依赖这些字段。

图标策略为：

- 优先使用 `@youngro/icons`
- 没有品牌图标时退回 `lucide-react`, 并在回复中明确强调
- 颜色仅作为辅助，不为单个 Provider 新增复杂视觉规则

### 4. 补齐配置结构与校验

在 `apps/web/src/store/providersStore.ts` 中完成：

- 必要配置字段类型
- `requiredFieldsFor(...)` 中的必填项
- `getField(...)` 中的字段读取逻辑
- `validateConfig(...)` 中的本地校验规则
- 持久化与 hydrate 后的恢复逻辑兼容性

原则：

- 先做“本地必填校验”

- 再做“远程校验”或“适配器自校验”

- 不要把所有错误都交给接口返回，能在本地提前发现的先提前发现

### 5. 接入运行时实现

#### 若为 `chat`

需要检查并补齐：

- `apps/web/src/lib/providers/adapter.ts`
- `apps/web/src/lib/providers/adapters/*`
- `apps/web/src/lib/providers/registry.ts`

优先复用已有的 OpenAI-compatible 抽象；只有在协议明显不同、流式格式不同、鉴权方式特殊时，才新增专用 adapter。

实现完成后，至少确保：

- 能从配置中读取认证信息
- 能发起聊天请求
- 能处理当前仓库使用的响应结构
- 失败时能给出可读错误

#### 若为 `speech`

需要检查并补齐：

- `apps/web/app/api/speech/providers/[providerId]/validate/route.ts`
- `apps/web/app/api/speech/providers/[providerId]/models/route.ts`
- `apps/web/app/api/speech/providers/[providerId]/voices/route.ts`
- `apps/web/app/api/speech/providers/[providerId]/synthesize/route.ts`

并确认前端这几条链路能正常工作：

- 设置页触发 validate
- 模型列表可按需拉取
- 音色列表可按需拉取
- 预览/合成请求可返回可用结果
- `useStreamingSpeechPlayback` 使用该 Provider 时不破坏现有播放流程

对 `speech` Provider，优先保证“可配置 + 可验证 + 可合成”，再考虑高级能力如预览、标签、语种过滤。

#### 若为 `transcription`

优先检查：

- 是否已经有统一注册点
- 是否已有设置入口与调用入口
- 是否需要和 `providersStore.ts` 的 `transcription` 分类联动

若仓库中转写链路尚未完整落地，则本 skill 的最低目标是：

- 元数据正确
- 配置结构正确
- 校验规则正确
- 后续调用接口的接入点已经明确
- README 不夸大“已完全可用”

`transcription` Provider 目标为 “先完成配置闭环，不强求完整运行时”

### 6. 对齐 UI 和交互

接入完成后，确认以下页面不会出现断链或空状态异常：

- `apps/web/app/settings/providers/**`
- `apps/web/app/settings/modules/speech/**`
- 任何直接依赖 Provider 元数据的配置页

至少保证：

- Provider 可见
- 表单字段与真实配置结构一致
- 校验失败时能展示明确错误
- 未支持的能力不会被错误暴露为可用按钮

### 7. 更新文档

如本次变更会影响用户认知或仓库对外说明，则更新：

- `README.md`
- `README.zh-CN.md`
- 必要时对应 package 的 README

文档原则：

- 只写已真正接通的能力
- 不把“声明了 Provider”写成“完整支持”
- 若是 WIP，应明确标注

### 8. 验证与收尾

默认执行这些检查：

- `pnpm --filter web lint`
- `pnpm --filter web check-types`

如果涉及更大范围改动，可补充：

- `pnpm lint`
- `pnpm check-types`
- `pnpm test`

输出结果时应明确：

- 改了哪些文件
- Provider 现在支持到什么程度
- 哪些能力已完成
- 哪些能力仍是 WIP
- 是否更新了文档
- 是否已完成 lint / typecheck

## 决策规则

在实现过程中遵守以下优先级：

1. 先补齐已有模式，再引入新模式
2. 先保证最小可用，再扩展高级能力
3. 先保证类型和配置正确，再接 UI 花活
4. 先修闭环，再补文档措辞
5. 避免为了单个 Provider 打破仓库现有分层

## 完成定义

只有当以下条件满足时，才能认为接入基本完成：

- Provider 元数据已声明
- 配置字段与校验规则已就位
- 对应运行时链路已接通，或已明确标记为 WIP
- UI 不会暴露虚假可用能力
- 至少完成约定的 lint / typecheck
- 文档与真实能力一致

## 输出格式

执行本 skill 后，结果应按以下结构汇报：

- 本次接入的 Provider 和类别
- 变更文件列表
- 已完成能力
- 尚未完成 / 刻意留空的能力
- 验证结果
- 后续建议

## 特别提醒

- 不要因为 `providers.ts` 中已经有条目，就假设该 Provider 已完整可用
- 不要把 README 中的“支持”直接等同于运行时已闭环
- 如果某个 Provider 只是“元数据已声明，但 registry / route 未接通”，应明确标记为“部分接入”
- 如果发现仓库文档与实现不一致，优先在结果中指出，不要默默延续错误表述
