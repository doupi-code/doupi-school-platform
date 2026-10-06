---
name: lime-dayuts 日期库
description: 轻量的处理时间和日期的 UTS 库，几乎和 dayjs 保持一样的 API，支持日期解析、格式化、比较、操作和查询等。
tags:
  - dayuts
  - 日期
  - 时间
  - dayjs
plugin: lime-dayuts
category: API 插件
dependencies: []
---

# lime-dayuts 日期库

一个轻量的处理时间和日期的 UTS 库，几乎和 dayjs 保持一样的 API。lime-dayuts 提供了丰富的日期操作功能，包括日期解析、格式化、比较、操作和查询等，可用于各种需要处理日期和时间的应用场景。

## 安装方法

1. 在 uni-app 插件市场中搜索并导入 `lime-dayuts`
2. 导入后可能需要重新编译项目
3. 在页面或组件中按需引入使用

::: tip 注意🔔
lime-dayuts 是 UTS 版本的 dayjs，支持 uni-app x（App 原生、Web、小程序）以及 uni-app（Vue2/Vue3）。在 uni-app x 中编译为 Kotlin/Swift/ArkTS，在 uni-app 中编译为 JavaScript。
:::

## 代码演示

### 基础使用

最简单的日期库用法，直接导入并使用。

```ts
import { dayuts } from '@/uni_modules/lime-dayuts'

// 当前时间
dayuts().format() // 2024-03-25T02:10:16+08:00

// 自定义格式
dayuts().format('YYYY-MM-DD HH:mm:ss') // 2024-03-25 02:10:16
```

### 解析日期

dayuts 接受多种类型的输入，包括字符串、数字、Date 对象、数组等。

```ts
// 当前时间
dayuts()

// 字符串
dayuts('2024-03-04T16:00:00.000Z')
dayuts('2024-03-13 19:18:17.040+02:00')
dayuts('2024-03-13 19:18')
dayuts('1748750498228')

// 字符串 + 格式
dayuts('1970-00-00', 'YYYY-MM-DD')

// Unix 时间戳（毫秒）
dayuts(1318781876406)

// Date 对象
dayuts(new Date(2018, 8, 18))

// 数组 [年, 月, 日, 时, 分, 秒, 毫秒]
dayuts([2010, 1, 14, 15, 25, 50, 125])
```

### 取值与赋值

getter 和 setter 使用了相同的 API，不传参数为 getter，传参数为 setter。

```ts
// 获取毫秒
dayuts().millisecond() // 0-999

// 设置毫秒（返回新的 dayuts 对象）
dayuts().millisecond(1)

// 获取秒
dayuts().second() // 0-59
dayuts().second(1)

// 获取分钟
dayuts().minute() // 0-59
dayuts().minute(1)

// 获取小时
dayuts().hour() // 0-23
dayuts().hour(12)

// 获取日期
dayuts().date() // 1-31
dayuts().date(12)

// 获取月份（0-11）
dayuts().month() // 0-11
dayuts().month(0)

// 获取年份
dayuts().year()
dayuts().year(2000)

// 获取星期几（0-6，0 表示周日）
dayuts().day()

// 通用 get/set
dayuts().get('year')
dayuts().set('month', 5)
```

### 日期操作

```ts
// 增加时间
dayuts().add(7, 'day')
dayuts().add(1, 'month')
dayuts().add(2, 'year')

// 减去时间
dayuts().subtract(7, 'year')
dayuts().subtract(1, 'day')

// 设置到时间开始
dayuts().startOf('year')
dayuts().startOf('month')
dayuts().startOf('day')

// 设置到时间末尾
dayuts().endOf('year')
dayuts().endOf('month')
dayuts().endOf('day')
```

### 日期格式化

```ts
// 默认格式（ISO8601）
dayuts().format() // 2024-03-28T01:33:29+08:00

// 自定义格式
dayuts('2019-01-25').format('DD/MM/YYYY') // 25/01/2019
dayuts('2019-01-25').format('YYYY-MM-DD HH:mm:ss') // 2019-01-25 00:00:00

// 转义字符（用方括号包裹）
dayuts('2019-01-25').format('[YYYYescape] YYYY-MM-DD') // YYYYescape 2019-01-25
```

### 日期比较

```ts
// 是否在前
dayuts().isBefore(dayuts('2011-01-01')) // false
dayuts().isBefore('2011-01-01', 'month')

// 是否在后
dayuts().isAfter(dayuts('2011-01-01')) // true
dayuts().isAfter('2011-01-01', 'year')

// 是否相同
dayuts().isSame('2011-01-01', 'year') // false
dayuts().isSame(dayuts(), 'day') // true

// 是否相同或在前
dayuts().isSameOrBefore('2011-01-01', 'month')

// 是否相同或在后
dayuts().isSameOrAfter('2011-01-01', 'month')

// 是否在区间内
dayuts('2010-10-20').isBetween('2010-10-19', dayuts('2010-10-25')) // true
dayuts('2010-10-20').isBetween('2010-10-19', '2010-10-25', 'day', '()') // true
dayuts('2010-10-20').isBetween('2010-10-19', '2010-10-25', 'day', '[)') // true（包含开始）
```

### 相对时间

```ts
// 相对当前时间（前）
dayuts('1999-01-01').fromNow() // 26 年前
dayuts('1999-01-01').fromNow(true) // 26 年（不带后缀）

// 相对指定时间（前）
dayuts('1999-01-01').from(dayuts())

// 相对当前时间（后）
dayuts('1999-01-01').toNow()
dayuts('1999-01-01').to(dayuts())

// 计算时间差
dayuts('2019-01-25').diff(dayuts('2018-06-05')) // 毫秒差
dayuts('2019-01-25').diff(dayuts('2018-06-05'), 'month') // 月份差（整数）
dayuts('2019-01-25').diff(dayuts('2018-06-05'), 'month', true) // 月份差（浮点数）
```

### 国际化

```ts
import { dayuts, dayutsIntl } from '@/uni_modules/lime-dayuts'

// 全局设置语言
dayutsIntl.locale = 'zh-cn'

// 实例级设置语言
dayuts().locale('zh-cn').format('dddd') // 星期一

// 注册自定义语言
dayutsIntl.use({
  name: 'ja',
  weekdays: ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'],
  months: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
  ordinal: (n: number, _: string): string => `${n}日`,
  // ... 其他配置
})
dayutsIntl.locale = 'ja'
```

### 其他常用方法

```ts
// 是否为闰年
dayuts().isLeapYear()

// 是否为今天
dayuts('2024-03-25').isToday()

// 获取时间戳（毫秒）
dayuts().valueOf()

// 获取 Unix 时间戳（秒）
dayuts().unix()

// 获取月份天数
dayuts('2024-02-01').daysInMonth() // 29（闰年）

// 获取一年中的第几天
dayuts('2024-03-01').dayOfYear() // 61

// 转换方法
dayuts().toDate()    // Date 对象
dayuts().toArray()   // [年, 月, 日, 时, 分, 秒, 毫秒]
dayuts().toJSON()    // ISO 8601 字符串
dayuts().toObject()  // { years, months, date, hours, minutes, seconds, milliseconds }
dayuts().toString()  // 字符串表示

// 克隆
const d = dayuts('2024-03-25')
const d2 = d.clone()

// 是否有效
dayuts('invalid').isValid() // false

// UTC 偏移量（分钟）
dayuts().utcOffset()
```

## API 文档

### 解析方法

| 方法 | 说明 | 参数 | 返回值 |
| --- | --- | --- | --- |
| `dayuts()` | 创建当前时间的 Dayuts 对象 | - | Dayuts 对象 |
| `dayuts(string)` | 从字符串创建 Dayuts 对象 | 日期字符串 | Dayuts 对象 |
| `dayuts(string, format)` | 从指定格式的字符串创建 Dayuts 对象 | 日期字符串, 格式字符串 | Dayuts 对象 |
| `dayuts(number)` | 从时间戳创建 Dayuts 对象 | 时间戳（毫秒） | Dayuts 对象 |
| `dayuts(Date)` | 从 Date 对象创建 Dayuts 对象 | Date 对象 | Dayuts 对象 |
| `dayuts(array)` | 从数组创建 Dayuts 对象 | `[年, 月, 日, 时, 分, 秒, 毫秒]` | Dayuts 对象 |
| `dayuts(Dayuts)` | 克隆 Dayuts 对象 | Dayuts 对象 | Dayuts 对象 |
| `isDayuts(date)` | 判断是否为 Dayuts 实例 | 任意值 | 布尔值 |

### 取值/赋值方法

| 方法 | 说明 | 参数 | 返回值 |
| --- | --- | --- | --- |
| `millisecond()` | 获取毫秒 | - | 0-999 |
| `millisecond(value)` | 设置毫秒 | 0-999 | Dayuts 对象 |
| `second()` | 获取秒 | - | 0-59 |
| `second(value)` | 设置秒 | 0-59 | Dayuts 对象 |
| `minute()` | 获取分钟 | - | 0-59 |
| `minute(value)` | 设置分钟 | 0-59 | Dayuts 对象 |
| `hour()` | 获取小时 | - | 0-23 |
| `hour(value)` | 设置小时 | 0-23 | Dayuts 对象 |
| `date()` | 获取日期 | - | 1-31 |
| `date(value)` | 设置日期 | 1-31 | Dayuts 对象 |
| `day()` | 获取星期（0=周日） | - | 0-6 |
| `day(value)` | 设置星期 | 0-6 | Dayuts 对象 |
| `month()` | 获取月份（0=一月） | - | 0-11 |
| `month(value)` | 设置月份 | 0-11 | Dayuts 对象 |
| `year()` | 获取年份 | - | 年份数字 |
| `year(value)` | 设置年份 | 年份数字 | Dayuts 对象 |
| `get(unit)` | 获取指定单位的值 | 时间单位 | 数值 |
| `set(unit, value)` | 设置指定单位的值 | 时间单位, 值 | Dayuts 对象 |

### 操作方法

| 方法 | 说明 | 参数 | 返回值 |
| --- | --- | --- | --- |
| `add(value, unit)` | 增加时间 | 数值, 单位 | Dayuts 对象 |
| `subtract(value, unit)` | 减少时间 | 数值, 单位 | Dayuts 对象 |
| `startOf(unit)` | 设置为时间单位的开始 | 单位 | Dayuts 对象 |
| `endOf(unit)` | 设置为时间单位的结束 | 单位 | Dayuts 对象 |
| `dayOfYear()` | 获取一年中的第几天 | - | 数值 |
| `dayOfYear(value)` | 设置为一年中的第几天 | 数值 | Dayuts 对象 |
| `clone()` | 克隆当前对象 | - | Dayuts 对象 |
| `locale(name)` | 设置实例语言 | 语言名称 | Dayuts 对象 |

### 显示方法

| 方法 | 说明 | 参数 | 返回值 |
| --- | --- | --- | --- |
| `format(template)` | 格式化日期 | 格式模板 | 字符串 |
| `fromNow(withoutSuffix)` | 相对当前时间（前） | 是否不带后缀 | 字符串 |
| `from(compared, withoutSuffix)` | 相对指定时间（前） | 比较时间, 是否不带后缀 | 字符串 |
| `toNow(withoutSuffix)` | 相对当前时间（后） | 是否不带后缀 | 字符串 |
| `to(compared, withoutSuffix)` | 相对指定时间（后） | 比较时间, 是否不带后缀 | 字符串 |
| `diff(compared, unit, float)` | 计算时间差 | 比较时间, 单位, 是否返回浮点数 | 数值 |
| `valueOf()` | 获取时间戳（毫秒） | - | 数值 |
| `unix()` | 获取时间戳（秒） | - | 数值 |
| `daysInMonth()` | 获取月份的天数 | - | 数值 |
| `utcOffset()` | 获取 UTC 偏移量（分钟） | - | 数值 |
| `toDate()` | 转换为 Date 对象 | - | Date 对象 |
| `toArray()` | 转换为数组 | - | `number[]` |
| `toJSON()` | 转换为 JSON 字符串 | - | 字符串或 null |
| `toISOString()` | 转换为 ISO 8601 字符串 | - | 字符串 |
| `toObject()` | 转换为对象 | - | DayutsObject |
| `toString()` | 转换为字符串 | - | 字符串 |

### 查询方法

| 方法 | 说明 | 参数 | 返回值 |
| --- | --- | --- | --- |
| `isBefore(compared, unit)` | 是否在指定时间之前 | 比较时间, 单位 | 布尔值 |
| `isAfter(compared, unit)` | 是否在指定时间之后 | 比较时间, 单位 | 布尔值 |
| `isSame(compared, unit)` | 是否与指定时间相同 | 比较时间, 单位 | 布尔值 |
| `isSameOrBefore(compared, unit)` | 是否相同或之前 | 比较时间, 单位 | 布尔值 |
| `isSameOrAfter(compared, unit)` | 是否相同或之后 | 比较时间, 单位 | 布尔值 |
| `isBetween(from, to, unit, inclusivity)` | 是否在区间内 | 开始, 结束, 单位, 包含性 | 布尔值 |
| `isLeapYear()` | 是否为闰年 | - | 布尔值 |
| `isToday()` | 是否为今天 | - | 布尔值 |
| `isValid()` | 日期是否有效 | - | 布尔值 |

### 国际化 API

| 方法 | 说明 | 参数 | 返回值 |
| --- | --- | --- | --- |
| `dayutsIntl.locale = 'zh-cn'` | 全局设置语言 | 语言名称 | - |
| `dayutsIntl.locale` | 获取当前语言 | - | 语言名称 |
| `dayutsIntl.use(locale)` | 注册语言 | DayutsLocale 对象 | DayutsIntl |
| `dayutsIntl.set(name, locale)` | 设置语言配置 | 名称, DayutsLocale | - |
| `dayutsIntl.has(name)` | 是否已注册语言 | 名称 | 布尔值 |
| `instance.locale(name)` | 设置实例语言 | 语言名称 | Dayuts 对象 |

### 格式化占位符

| 占位符 | 输出 | 描述 |
| --- | --- | --- |
| `YY` | 01 | 两位数的年份 |
| `YYYY` | 2001 | 四位数的年份 |
| `M` | 1-12 | 月份，从 1 开始计数 |
| `MM` | 01-12 | 月份，两位数 |
| `MMM` | Jan-Dec | 缩写的月份名称 |
| `MMMM` | January-December | 完整的月份名称 |
| `D` | 1-31 | 一个月的某一天 |
| `DD` | 01-31 | 一个月的某一天，两位数 |
| `d` | 0-6 | 一周的某一天（0=周日） |
| `dd` | Su-Sa | 最小缩写的周名 |
| `ddd` | Sun-Sat | 缩写的周名 |
| `dddd` | Sunday-Saturday | 完整的周名 |
| `H` | 0-23 | 小时数（24 小时制） |
| `HH` | 00-23 | 小时数，两位数 |
| `h` | 1-12 | 小时数（12 小时制） |
| `hh` | 01-12 | 小时数，两位数 |
| `m` | 0-59 | 分钟数 |
| `mm` | 00-59 | 分钟数，两位数 |
| `s` | 0-59 | 秒数 |
| `ss` | 00-59 | 秒数，两位数 |
| `S` | 0-9 | 百毫秒数，一位数 |
| `SS` | 00-99 | 十毫秒数，两位数 |
| `SSS` | 000-999 | 毫秒数，三位数 |
| `Z` | -05:00 | 相对于 UTC 的偏移量 |
| `ZZ` | -0500 | 相对 UTC 的紧凑偏移量 |
| `A` | AM/PM | 上午或下午，大写 |
| `a` | am/pm | 上午或下午，小写 |
| `[...]` | 原样输出 | 转义字符，方括号内的内容原样输出 |

### 时间单位

| 单位 | 缩写 | 描述 |
| --- | --- | --- |
| `day` | `d` | 日 |
| `week` | `w` | 周 |
| `month` | `M` | 月 |
| `year` | `y` | 年 |
| `hour` | `h` | 小时 |
| `minute` | `m` | 分钟 |
| `second` | `s` | 秒 |
| `millisecond` | `ms` | 毫秒 |
| `date` | `D` | 日期（与 day 不同，date 表示一个月的某一天） |
| `quarter` | `Q` | 季度（常量已定义，部分方法未完整实现） |

## Vue2 使用说明

lime-dayuts 在 Vue2 项目中使用了 `composition-api`（用于 locale 响应式状态），如需在 Vue2 项目中使用，请按照[官方教程](https://uniapp.dcloud.net.cn/tutorial/vue-composition-api.html)配置。

关键配置代码（在 main.js 中添加）：

```js
// vue2
import Vue from 'vue'
import VueCompositionAPI from '@vue/composition-api'
Vue.use(VueCompositionAPI)
```

::: tip 注意🔔
仅在 Vue2 项目中需要此配置，Vue3 和 uni-app x 项目无需配置。
:::

## 文档链接

📚 组件详细文档请访问以下站点：
- [日期库文档 - 站点1](https://limex.qcoon.cn/uts/dayuts.html)
- [日期库文档 - 站点2](https://limeui.netlify.app/uts/dayuts.html)
- [日期库文档 - 站点3](https://limeui.familyzone.top/uts/dayuts.html)

## 注意事项

### 与 dayjs 的差异

lime-dayuts 虽然尽量保持与 dayjs 一致的 API，但受 UTS 强类型语言限制，存在以下差异：

1. **不支持 `undefined`**：空值统一使用 `null`
2. **不支持 truthy/falsy 判断**：必须显式比较，如 `if (value != null)`
3. **插件机制**：lime-dayuts 暂未实现 `dayuts.extend(plugin)` 插件机制，所有功能内置
4. **UTC 模式**：暂未实现 `dayuts.utc()`，`utcOffset()` 在 App 端（Android/iOS）始终返回 0
5. **时区支持**：暂未实现 `dayuts.tz()` 时区转换
6. **Duration**：暂未实现 `dayuts.duration()` 时间段对象

### 平台差异

1. **`toISOString()`**：在 App 端（Android/iOS）由于平台限制，返回 `toString()` 的结果而非标准 ISO 8601 格式
2. **`utcOffset()`**：在 App 端（Android/iOS）始终返回 0，Web 端正常返回时区偏移
3. **格式化实现**：Android 端使用链式 `replace` 实现，其他平台使用正则匹配，两者行为一致
4. **纯数字字符串**：支持 `'1748750498228'` 形式的字符串时间戳解析

### 内置语言

lime-dayuts 内置以下语言：
- `en` — 英语
- `zh-cn` — 简体中文

可通过 `dayutsIntl.use()` 方法注册其他语言。

## 支持与赞赏

如果你觉得本插件解决了你的问题，可以考虑支持作者：

| 支付宝赞助 | 微信赞助 |
|------------|------------|
| ![](https://testingcf.jsdelivr.net/gh/liangei/image@1.9/alipay.png) | ![](https://testingcf.jsdelivr.net/gh/liangei/image@1.9/wpay.png) |
