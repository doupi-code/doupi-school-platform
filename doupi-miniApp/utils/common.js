/**
 * @fileoverview 通用工具函数
 * - 日期时间格式化
 * - 手机号/身份证号验证
 * - 数据格式转换
 * - 状态码映射、文件处理、通用数据操作
 */

/**
 * 格式化日期时间为易读字符串
 * @param {Date|string|number} date 日期对象/时间戳/日期字符串
 * @param {string} [fmt] 格式模板，默认 'YYYY-MM-DD HH:mm:ss'
 * @returns {string}
 */
function formatDateTime(date, fmt) {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    const map = {
        "YYYY": d.getFullYear(),
        "MM": String(d.getMonth() + 1).padStart(2, "0"),
        "DD": String(d.getDate()).padStart(2, "0"),
        "HH": String(d.getHours()).padStart(2, "0"),
        "mm": String(d.getMinutes()).padStart(2, "0"),
        "ss": String(d.getSeconds()).padStart(2, "0"),
    };
    let result = fmt || "YYYY-MM-DD HH:mm:ss";
    for (const [key, val] of Object.entries(map)) {
        result = result.replace(key, String(val));
    }
    return result;
}

/**
 * 格式化为短日期 YYYY-MM-DD
 * @param {Date|string|number} date
 * @returns {string}
 */
function formatDate(date) {
    return formatDateTime(date, "YYYY-MM-DD");
}

/**
 * 格式化为短时间 HH:mm
 * @param {Date|string|number} date
 * @returns {string}
 */
function formatTime(date) {
    return formatDateTime(date, "HH:mm");
}

/**
 * 相对时间描述（刚刚、X分钟前、昨天、MM-DD等）
 * @param {Date|string|number} date
 * @returns {string}
 */
function timeAgo(date) {
    if (!date) return "";
    const now = Date.now();
    const target = new Date(date).getTime();
    if (isNaN(target)) return "";
    const diff = now - target;
    if (diff < 0) return "刚刚";
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return "刚刚";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}小时前`;
    const days = Math.floor(hours / 24);
    if (days < 2) return "昨天";
    if (days < 30) return `${days}天前`;
    return formatDate(date);
}

/**
 * 验证手机号格式（中国大陆11位手机号）
 * @param {string} phone
 * @returns {boolean}
 */
function validatePhone(phone) {
    if (!phone) return false;
    return /^1[3-9]\d{9}$/.test(String(phone).trim());
}

/**
 * 验证身份证号格式（18位，支持末位X）
 * @param {string} idCard
 * @returns {boolean}
 */
function validateIdCard(idCard) {
    if (!idCard) return false;
    const str = String(idCard).trim();
    if (!/^\d{17}[\dXx]$/.test(str)) return false;
    const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
    const codes = ["1", "0", "X", "9", "8", "7", "6", "5", "4", "3", "2"];
    let sum = 0;
    for (let i = 0; i < 17; i++) {
        sum += parseInt(str[i], 10) * weights[i];
    }
    return codes[sum % 11] === str[17].toUpperCase();
}

/**
 * 手机号脱敏显示：138****1234
 * @param {string} phone
 * @returns {string}
 */
function maskPhone(phone) {
    if (!phone) return "";
    const str = String(phone).trim();
    if (str.length >= 7) {
        return str.slice(0, 3) + "****" + str.slice(-4);
    }
    return str;
}

/**
 * 身份证号脱敏显示：**************1234
 * @param {string} idCard
 * @returns {string}
 */
function maskIdCard(idCard) {
    if (!idCard) return "";
    const str = String(idCard).trim();
    if (str.length > 6) {
        return "*".repeat(str.length - 4) + str.slice(-4);
    }
    return str;
}

/**
 * 防抖函数
 * @param {Function} fn 原函数
 * @param {number} delay 延迟毫秒数
 * @returns {Function}
 */
function debounce(fn, delay) {
    let timer = null;
    return function (...args) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
            fn.apply(this, args);
            timer = null;
        }, delay);
    };
}

/**
 * 节流函数
 * @param {Function} fn 原函数
 * @param {number} interval 间隔毫秒数
 * @returns {Function}
 */
function throttle(fn, interval) {
    let lastTime = 0;
    return function (...args) {
        const now = Date.now();
        if (now - lastTime >= interval) {
            fn.apply(this, args);
            lastTime = now;
        }
    };
}

/**
 * 状态码转中文显示文本
 *
 * 支持多种业务类型的状态映射：
 * - appointment: 预约状态
 * - binding: 绑定状态
 * - message: 消息阅读状态
 * - user: 用户账号状态
 *
 * @param {number} status 状态码
 * @param {string} [type='appointment'] 业务类型
 * @returns {string} 中文状态文本
 */
function getStatusText(status, type) {
    var statusMaps = {
        // 预约状态：0-待核销 1-已核销 2-已取消 3-已完成
        "appointment": {
            0: "待核销",
            1: "已核销",
            2: "已取消",
            3: "已完成",
        },
        // 绑定状态：0-已解绑 1-有效
        "binding": {
            0: "已解绑",
            1: "有效",
        },
        // 消息状态：0-未读 1-已读
        "message": {
            0: "未读",
            1: "已读",
        },
        // 用户状态：0-禁用 1-正常
        "user": {
            0: "禁用",
            1: "正常",
        },
    };

    var map = statusMaps[type] || statusMaps["appointment"];
    return map[status] || "未知";
}

/**
 * 文件大小格式化
 *
 * 将字节数转换为易读的字符串格式（B/KB/MB/GB）
 *
 * @param {number} bytes 字节数
 * @param {number} [decimals=2] 小数位数
 * @returns {string} 格式化后的文件大小，如 "1.5MB"
 */
function formatFileSize(bytes, decimals) {
    if (!bytes || bytes === 0) return "0 B";

    var dec = (decimals !== undefined) ? decimals : 2;
    var k = 1024; // 或 1000（取决于使用场景）
    var sizes = ["B", "KB", "MB", "GB", "TB"];
    var i = Math.floor(Math.log(bytes) / Math.log(k));

    // 防止超出数组范围
    if (i >= sizes.length) i = sizes.length - 1;

    var size = parseFloat((bytes / Math.pow(k, i)).toFixed(dec));
    return size + " " + sizes[i];
}

/**
 * 深拷贝对象或数组
 *
 * 使用 JSON 序列化/反序列化实现深拷贝，
 * 注意：无法处理 Function、Date、RegExp、undefined 等特殊类型。
 *
 * @param {any} obj 需要拷贝的对象
 * @returns {any} 深拷贝后的新对象
 */
function deepClone(obj) {
    if (obj === null || typeof obj !== "object") {
        return obj;
    }

    try {
        return JSON.parse(JSON.stringify(obj));
    } catch (e) {
        console.error("[COMMON] deepClone failed:", e);
        // 如果序列化失败，返回浅拷贝
        if (Array.isArray(obj)) {
            return obj.slice();
        }
        return Object.assign({}, obj);
    }
}

/**
 * 解析URL查询参数
 *
 * 从URL字符串中提取所有查询参数并返回键值对对象。
 *
 * @param {string} url 完整URL或查询字符串（可包含?前缀）
 * @returns {object} 参数键值对对象
 */
function parseUrlParams(url) {
    if (!url || typeof url !== "string") return {};

    var params = {};
    var queryString;

    // 提取查询字符串部分
    var questionIndex = url.indexOf("?");
    if (questionIndex !== -1) {
        queryString = url.substring(questionIndex + 1);
    } else {
        queryString = url;
    }

    // 去除hash部分
    var hashIndex = queryString.indexOf("#");
    if (hashIndex !== -1) {
        queryString = queryString.substring(0, hashIndex);
    }

    if (!queryString) return {};

    // 分割参数
    var pairs = queryString.split("&");
    for (var i = 0; i < pairs.length; i++) {
        var pair = pairs[i];
        if (!pair) continue;

        var eqIndex = pair.indexOf("=");
        var key, value;

        if (eqIndex === -1) {
            key = decodeURIComponent(pair.replace(/\+/g, " "));
            value = "";
        } else {
            key = decodeURIComponent(pair.substring(0, eqIndex).replace(/\+/g, " "));
            value = decodeURIComponent(pair.substring(eqIndex + 1).replace(/\+/g, " "));
        }

        // 同名参数转为数组
        if (params[key] !== undefined) {
            if (Array.isArray(params[key])) {
                params[key].push(value);
            } else {
                params[key] = [params[key], value];
            }
        } else {
            params[key] = value;
        }
    }

    return params;
}

/**
 * 生成简易唯一ID
 *
 * 基于时间戳+随机数生成，适用于非严格唯一性要求的场景。
 *
 * @param {string} [prefix=''] ID前缀
 * @returns {string} 唯一ID字符串
 */
function generateId(prefix) {
    var timestamp = Date.now().toString(36); // 36进制时间戳
    var random = Math.random().toString(36).slice(2, 10); // 8位随机字符

    return (prefix || "") + timestamp + "_" + random;
}

/**
 * 空值判断
 *
 * 判断值是否为空：
 * - null / undefined
 * - 空字符串（仅含空格也算空）
 * - 空数组
 * - 空对象（无属性的对象）
 *
 * @param {any} value 待检测的值
 * @returns {boolean} 是否为空
 */
function isEmpty(value) {
    // null 或 undefined
    if (value === null || value === undefined) return true;

    // 空字符串（包括纯空白字符）
    if (typeof value === "string" && value.trim() === "") return true;

    // 空数组
    if (Array.isArray(value) && value.length === 0) return true;

    // 空对象
    if (typeof value === "object" && Object.keys(value).length === 0) return true;

    return false;
}

/**
 * 字符串截断
 *
 * 当字符串超过指定长度时，截断并用省略号替代。
 *
 * @param {string} str 原始字符串
 * @param {number} len 最大长度（中文字符按2个长度计算）
 * @param {string} [suffix='...'] 截断后缀
 * @returns {string} 截断后的字符串
 */
function truncate(str, len, suffix) {
    if (!str) return "";

    var s = String(str);
    var maxLen = len || 20;
    var endStr = suffix || "...";

    // 计算实际字符长度（中文算2个）
    var realLength = 0;
    var charLengths = [];

    for (var i = 0; i < s.length; i++) {
        var charCode = s.charCodeAt(i);
        // 中文字符范围（基本汉字、扩展A/B区等）
        var isChinese = (charCode > 0x4E00 && charCode <= 0x9FFF) ||
                        (charCode > 0x3400 && charCode <= 0x4DBF) ||
                        (charCode > 0x20000 && charCode <= 0x2A6DF);

        charLengths.push(isChinese ? 2 : 1);
        realLength += isChinese ? 2 : 1;

        if (realLength > maxLen) {
            return s.substring(0, i) + endStr;
        }
    }

    return s;
}

/**
 * 反转义 HTML 实体字符
 *
 * 将 &lt;, &gt;, &amp;, &quot;, &#39;, &nbsp; 等实体转换为原始字符。
 * 用于处理后端返回的已转义数据。
 *
 * @param {string} str 包含 HTML 实体的字符串
 * @returns {string} 反转义后的字符串
 *
 * @example
 * unescapeHtml('&lt;p&gt;Hello&lt;/p&gt;') => '<p>Hello</p>'
 * unescapeHtml('&amp;&nbsp;') => '& '
 */
function unescapeHtml(str) {
    if (!str) return "";

    return String(str)
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#x27;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/&ensp;/g, ' ')
        .replace(/&emsp;/g, ' ');
}

/**
 * 转义 HTML 特殊字符
 *
 * 将 <, >, &, ", ' 等字符转换为 HTML 实体，防止 XSS 攻击和 HTML 标签泄露。
 * 用于处理用户输入的内容，确保安全显示。
 *
 * @param {string} str 需要转义的字符串
 * @returns {string} 转义后的安全字符串
 *
 * @example
 * escapeHtml('<script>alert("xss")</script>') => '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;'
 */
function escapeHtml(str) {
    if (!str) return "";

    // 对于小程序环境，使用手动替换
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * 格式化换行符用于 rich-text 组件
 *
 * 将 \n 或 \r\n 转换为 <br/> 标签，使 rich-text 能正确渲染换行。
 * 同时会先进行反转义操作，处理可能存在的 HTML 实体。
 *
 * @param {string} str 包含换行符的文本
 * @param {boolean} [unescape=true] 是否先执行反转义
 * @returns {string} 可用于 rich-text nodes 属性的 HTML 字符串
 *
 * @example
 * formatNewlinesForRichText('第一行\n第二行') => '第一行<br/>第二行'
 * formatNewlinesForRichText('&lt;p&gt;测试&lt;/p&gt;\n新段落') => '<p>测试</p><br/>新段落'
 */
function formatNewlinesForRichText(str, unescape) {
    if (!str) return "";

    var result = String(str);

    // 默认先反转义
    if (unescape !== false) {
        result = unescapeHtml(result);
    }

    // 将换行符转换为 <br/>
    return result
        .replace(/\r\n/g, '\n')  // 先统一换行符
        .replace(/\n/g, '<br/>');
}

/**
 * 格式化换行符用于纯文本显示
 *
 * 处理文本中的换行符，使其在普通 text 组件中能较好地显示。
 * 注意：text 组件本身不支持 \n 渲染为换行，
 * 此函数主要用于预处理数据或配合 CSS white-space: pre-line 使用。
 *
 * @param {string} str 包含换行符的文本
 * @param {boolean} [unescape=true] 是否先执行反转义
 * @returns {string} 处理后的文本
 */
function formatNewlinesForText(str, unescape) {
    if (!str) return "";

    var result = String(str);

    // 默认先反转义
    if (unescape !== false) {
        result = unescapeHtml(result);
    }

    return result;
}

/**
 * 移除所有 HTML 标签
 *
 * 从字符串中剥离所有 HTML/XML 标签，只保留纯文本内容。
 * 用于需要显示纯文本但来源可能是富文本的场景。
 *
 * @param {string} str 可能包含 HTML 标签的字符串
 * @returns {string} 纯文本字符串
 *
 * @example
 * stripHtmlTags('<p>Hello <b>World</b></p>') => 'Hello World'
 * stripHtmlTags('<br/>Line1<br/>Line2') => 'Line1Line2'
 */
function stripHtmlTags(str) {
    if (!str) return "";

    return String(str)
        .replace(/<br\s*\/?>/gi, '\n')  // 将 <br> 转换为换行符
        .replace(/<[^>]+>/g, '')       // 移除其他所有标签
        .trim();
}

/**
 * 清理用户输入
 *
 * 对用户输入的内容进行综合清理：
 * 1. 前后去除空白
 * 2. 移除危险 HTML 标签（script, iframe, object 等）
 * 3. 限制特殊字符
 *
 * 注意：此函数不会完全阻止 XSS，仅作为基本防护。
 * 敏感场景应在后端进行严格的输入验证和过滤。
 *
 * @param {string} str 用户输入的字符串
 * @param {number} [maxLength=1000] 最大允许长度
 * @returns {string} 清理后的安全字符串
 */
function sanitizeInput(str, maxLength) {
    if (!str) return "";

    var result = String(str).trim();

    // 限制长度
    var maxLen = maxLength || 1000;
    if (result.length > maxLen) {
        result = result.substring(0, maxLen);
    }

    // 移除潜在危险的 HTML 标签（不完全过滤，仅针对明显危险标签）
    result = result
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
        .replace(/<embed\b[^>]*>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');

    return result;
}

/**
 * 综合格式化富文本内容
 *
 * 用于准备将要在 rich-text 组件中显示的内容。
 * 执行以下操作：
 * 1. 反转义 HTML 实体
 * 2. 转换换行符为 <br/>
 * 3. 确保内容安全
 *
 * @param {string} str 原始富文本内容
 * @param {Object} [options] 配置选项
 * @param {boolean} [options.unescape=true] 是否反转义
 * @param {boolean} [options.sanitize=false] 是否清理危险内容
 * @param {number} [options.maxLength=0] 最大长度限制（0表示不限制）
 * @returns {string} 格式化后的富文本内容
 *
 * @example
 * formatRichText('第一段\n第二段&lt;b&gt;加粗&lt;/b&gt;')
 * => '第一段<br/>第二段<b>加粗</b>'
 */
function formatRichText(str, options) {
    if (!str) return "";

    var opts = options || {};
    var result = String(str);

    // 步骤1: 反转义 HTML 实体
    if (opts.unescape !== false) {
        result = unescapeHtml(result);
    }

    // 步骤2: 清理危险内容（可选）
    if (opts.sanitize) {
        result = sanitizeInput(result, opts.maxLength || 0);
    } else if (opts.maxLength && opts.maxLength > 0) {
        // 仅限制长度
        if (result.length > opts.maxLength) {
            result = result.substring(0, opts.maxLength);
        }
    }

    // 步骤3: 转换换行符
    result = result
        .replace(/\r\n/g, '\n')
        .replace(/\n/g, '<br/>');

    return result;
}

/**
 * 格式化为多行文本数组
 *
 * 将包含换行符的文本分割为数组，方便在 WXML 中用 wx:for 渲染每一行。
 * 适用于需要在 text 组件中正确显示多行内容的场景。
 *
 * @param {string} str 包含换行符的文本
 * @param {boolean} [unescape=true] 是否先执行反转义
 * @returns {Array<string>} 文本行数组
 *
 * @example
 * formatToLines('第一行\n第二行\n第三行')
 * => ['第一行', '第二行', '第三行']
 */
function formatToLines(str, unescape) {
    if (!str) return [];

    var result = String(str);

    if (unescape !== false) {
        result = unescapeHtml(result);
    }

    return result.split('\n').filter(function(line) {
        return line.trim() !== '';
    });
}

module.exports = {
    formatDateTime,
    formatDate,
    formatTime,
    timeAgo,
    validatePhone,
    validateIdCard,
    maskPhone,
    maskIdCard,
    debounce,
    throttle,
    getStatusText,
    formatFileSize,
    deepClone,
    parseUrlParams,
    generateId,
    isEmpty,
    truncate,
    // 新增的文本处理工具函数
    unescapeHtml,
    escapeHtml,
    formatNewlinesForRichText,
    formatNewlinesForText,
    stripHtmlTags,
    sanitizeInput,
    formatRichText,
    formatToLines,
};
