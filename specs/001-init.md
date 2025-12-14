我的目标是写一个基于 GitHub Discussion 的 Headless 评论框

支持 discussion reaction、基础的评论与回复、评论 reactions，总体功能对齐 GitHub Discussion

关键特征：Monorepo，Node 24 via FNM，Corepack，PNPM Workspace，TypeScript，Serverless

创建项目时倾向使用框架提供的脚手架，然后再进行适配

Monorepo package name：giscore-monorepo，private

整体参考 giscus 的方式，可以使用 deepwiki mcp 查询 GitHub giscus/giscus

# apps/server

@giscore/server

基于 Hono Client（https://hono.dev/docs/guides/rpc）构建的 Serverless 服务端，包含 oauth、discussion 端点，用于

- OAuth 认证
- App Installation Secret 缓存（unstorage，支持可替换 driver，本地调试使用 memory）
- 未登录情况下获取讨论串
- 登录情况下，初始化新的 discussion
- 其他必要情况调用 GitHub API

App 相关配置文件放在环境变量中，使用 dotenv 方便本地 dev 运行

# apps/example

Private

使用 Vite + React 创建的 example，可以在这里预览和调试评论区效果

从 @giscore/react 导入基础评论框组件，使用 Tailwind 4 进行最简单的样式

# packages/services

@giscore/services

对于常用逻辑的封装，比如 server 中获取 GitHub 一些数据，或者在 client 中直接请求 GitHub

不依赖特定运行环境，使用标准 API，合理解耦

# packages/core

@giscore/core

纯 TypeScript Libray，导出基础的 GiscoreClient class

支持方法调用 CRUD 评论相关数据，作为其他客户端包的基础

# packages/react

@giscore/react

从 @giscore/core 导入核心方法，构建 headless 评论框组件，以类似于 Radix / Headless UI 的形式提供

react 里面不涉及数据面，数据通过外部传入或者外部控制渲染

react/tanstack-query 提供封装好的 tanstack-query hooks，example 使用 react headless 组件和 react/tanstack-query 来组装评论框，tanstack-query 作为可选依赖
