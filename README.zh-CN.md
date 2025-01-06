# @rxliuli/vista

[![npm version](https://badge.fury.io/js/@rxliuli%2Fvista.svg)](https://www.npmjs.com/package/@rxliuli/vista)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

一个强大的同构请求拦截库，支持统一拦截 Fetch/XHR 请求。让你能够在请求的不同生命周期进行干预，实现请求监控、修改、mock 等多种功能。

## 特性

- 🚀 同时支持 Fetch 和 XHR 请求拦截
- 🎯 使用中间件模式，灵活且易于扩展
- 💫 支持请求前、请求后的干预
- 🔄 可修改请求和响应数据
- 📦 零依赖，体积小巧
- 🌐 仅支持浏览器环境

## 安装

```bash
npm install @rxliuli/vista
# 或
yarn add @rxliuli/vista
# 或
pnpm add @rxliuli/vista
```

## 基础使用

```ts
import { Vista } from '@rxliuli/vista'

new Vista()
  .use(async (c, next) => {
    console.log('请求开始:', c.req.url)
    await next()
  })
  .use(async (c, next) => {
    await next()
    console.log('响应数据:', await c.res.clone().text())
  })
  .intercept()
```

## 高级用例

### 添加全局请求头

```ts
new Vista()
  .use(async (c, next) => {
    c.req.headers.set('Authorization', 'Bearer token')
    await next()
  })
  .intercept()
```

### 请求结果缓存

```ts
const cache = new Map()

new Vista()
  .use(async (c, next) => {
    const key = c.req.url
    if (cache.has(key)) {
      return cache.get(key).clone()
    }
    await next()
    cache.set(key, c.res.clone())
  })
  .intercept()
```

### 请求失败重试

```ts
new Vista()
  .use(async (c, next) => {
    const maxRetries = 3
    let retries = 0

    while (retries < maxRetries) {
      try {
        await next()
        break
      } catch (err) {
        retries++
        if (retries === maxRetries) throw err
      }
    }
  })
  .intercept()
```

### 动态修改响应

```ts
new Vista()
  .use(async (c, next) => {
    await next()
    if (c.req.url === 'https://example.com/example') {
      const json = await c.res.json()
      json.id = 2
      c.res = new Response(JSON.stringify(json), c.res)
    }
  })
  .intercept()
```

## API 参考

### Vista 类

主要的拦截器类，提供以下方法：

- `use(middleware)`: 添加中间件
- `intercept()`: 开始拦截请求
- `destroy()`: 停止拦截请求

### 中间件上下文

中间件函数接收两个参数：

- `context`: 包含请求和响应信息
  - `req`: 请求对象
  - `res`: 响应对象
  - `type`: 请求类型，`fetch` 或 `xhr`
- `next`: 调用下一个中间件的函数

## 常见问题

1. **如何停止拦截？**

   ```ts
   const vista = new Vista()
   vista.intercept()
   // 当不需要时
   vista.destroy()
   ```

2. **是否支持异步操作？**
   是的，中间件支持 async/await 语法。

3. **是否支持 Node.js？**
   不支持，目前只支持浏览器环境。

## 感谢

- [xhook](https://github.com/jpillora/xhook): 实现了 xhr 拦截的库，对一些功能的实现有帮助
- [hono](https://github.com/honojs/hono): 非常优秀的 Web 服务端框架，API 上给了很多灵感

## 贡献指南

欢迎提交 Issue 和 Pull Request！

## 许可证

[MIT License](./LICENSE)
