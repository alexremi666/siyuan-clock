"use strict";

/*
 * 时钟（SiYuan Clock Plugin）
 * 以自定义标签页展示：大号当前时间 / 日期 + 星期 / 农历，全端适配，配色跟随思源主题。
 * 纯原生 CommonJS 编写，无需构建步骤。
 */

let siyuanApi = {};
try {
    siyuanApi = require("siyuan");
} catch (e) {
    // 非思源环境（例如 Node 本地算法测试），降级为空对象
    siyuanApi = {};
}
const Plugin = siyuanApi.Plugin || class {};
const openTab = siyuanApi.openTab || function () {};

/* ============================== 农历换算（1900-2100） ============================== */

// 每年一条：bit16-4 为 12 个普通月大小（1=30 天，0=29 天），bit3-0 为闰月月份，bit16 为闰月大小
const LUNAR_INFO = [
    0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2, // 1900-1909
    0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977, // 1910-1919
    0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970, // 1920-1929
    0x06566, 0x0d4a0, 0x0ea50, 0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950, // 1930-1939
    0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557, // 1940-1949
    0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5b0, 0x14573, 0x052b0, 0x0a9a8, 0x0e950, 0x06aa0, // 1950-1959
    0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0, // 1960-1969
    0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b6a0, 0x195a6, // 1970-1979
    0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570, // 1980-1989
    0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x055c0, 0x0ab60, 0x096d5, 0x092e0, // 1990-1999
    0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5, // 2000-2009
    0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930, // 2010-2019
    0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530, // 2020-2029
    0x05aa0, 0x076a3, 0x096d0, 0x04afb, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45, // 2030-2039
    0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0, // 2040-2049
    0x14b63, 0x09370, 0x049f8, 0x04970, 0x064b0, 0x168a6, 0x0ea50, 0x06b20, 0x1a6c4, 0x0aae0, // 2050-2059
    0x0a2e0, 0x0d2e3, 0x0c960, 0x0d557, 0x0d4a0, 0x0da50, 0x0d655, 0x056a0, 0x096d0, 0x04af5, // 2060-2069
    0x04ad0, 0x0a4d0, 0x204a9, 0x0d250, 0x0f593, 0x0b540, 0x0b6a0, 0x195a6, 0x095b0, 0x049b0, // 2070-2079
    0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570, 0x04af5, 0x04970, // 2080-2089
    0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x055c0, 0x0ab60, 0x096d5, 0x092e0, 0x0c960, 0x0d954, // 2090-2099
    0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5, 0x0a950, 0x0b4a0,  // 2100
];

const HEAVENLY_STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const EARTHLY_BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
const ZODIAC_ANIMALS = ["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"];
const LUNAR_MONTH_NAMES = ["正", "二", "三", "四", "五", "六", "七", "八", "九", "十", "冬", "腊"];
const LUNAR_DAY_PREFIX = ["初", "十", "廿", "三"];
const LUNAR_DAY_NUMBER = ["日", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
const WEEK_NAMES = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];

// 闰月月份，0 表示无闰月
function lunarLeapMonth(year) {
    return LUNAR_INFO[year - 1900] & 0xf;
}

// 闰月天数
function lunarLeapDays(year) {
    if (lunarLeapMonth(year)) {
        return (LUNAR_INFO[year - 1900] & 0x10000) ? 30 : 29;
    }
    return 0;
}

// 普通月天数
function lunarMonthDays(year, month) {
    return (LUNAR_INFO[year - 1900] & (0x10000 >> month)) ? 30 : 29;
}

// 农历年总天数
function lunarYearDays(year) {
    let sum = 348;
    for (let mask = 0x8000; mask > 0x8; mask >>= 1) {
        sum += (LUNAR_INFO[year - 1900] & mask) ? 1 : 0;
    }
    return sum + lunarLeapDays(year);
}

/**
 * 公历转农历
 * @param {number} year 公历年
 * @param {number} month 公历月（1-12）
 * @param {number} day 公历日
 * @returns {{year:number, month:number, day:number, isLeap:boolean}}
 */
function solarToLunar(year, month, day) {
    let offset = Math.floor((Date.UTC(year, month - 1, day) - Date.UTC(1900, 0, 31)) / 86400000);

    let lunarYear = 1900;
    let daysOfYear = 0;
    for (let i = 1900; i < 2101 && offset > 0; i++) {
        daysOfYear = lunarYearDays(i);
        offset -= daysOfYear;
        lunarYear = i + 1;
    }
    if (offset < 0) {
        offset += daysOfYear;
        lunarYear--;
    }

    const leap = lunarLeapMonth(lunarYear);
    let isLeap = false;
    let lunarMonth = 1;
    let daysOfMonth = 0;
    for (let i = 1; i < 13 && offset > 0; i++) {
        if (leap > 0 && i === leap + 1 && !isLeap) {
            --i;
            isLeap = true;
            daysOfMonth = lunarLeapDays(lunarYear);
        } else {
            daysOfMonth = lunarMonthDays(lunarYear, i);
        }
        if (isLeap && i === leap + 1) {
            isLeap = false;
        }
        offset -= daysOfMonth;
        lunarMonth = i + 1;
    }

    if (offset === 0 && leap > 0 && lunarMonth === leap + 1) {
        if (isLeap) {
            isLeap = false;
        } else {
            isLeap = true;
            lunarMonth--;
        }
    }
    if (offset < 0) {
        offset += daysOfMonth;
        lunarMonth--;
    }

    return { year: lunarYear, month: lunarMonth, day: offset + 1, isLeap: isLeap };
}

function lunarDayName(day) {
    if (day === 10) return "初十";
    if (day === 20) return "二十";
    if (day === 30) return "三十";
    return LUNAR_DAY_PREFIX[Math.floor(day / 10)] + LUNAR_DAY_NUMBER[day % 10];
}

/**
 * 输出形如「丙午[马]年八月初一」的农历字符串
 * @param {Date} date
 * @returns {string}
 */
function formatLunar(date) {
    const lunar = solarToLunar(date.getFullYear(), date.getMonth() + 1, date.getDate());
    const idx = lunar.year - 4;
    const stem = HEAVENLY_STEMS[((idx % 10) + 10) % 10];
    const branch = EARTHLY_BRANCHES[((idx % 12) + 12) % 12];
    const animal = ZODIAC_ANIMALS[((idx % 12) + 12) % 12];
    const monthName = (lunar.isLeap ? "闰" : "") + LUNAR_MONTH_NAMES[lunar.month - 1] + "月";
    return `${stem}${branch}[${animal}]年${monthName}${lunarDayName(lunar.day)}`;
}

/* ============================== 插件主体 ============================== */

const getAllTabs = siyuanApi.getAllTabs || null;
const getFrontend = siyuanApi.getFrontend || null;
const Dialog = siyuanApi.Dialog || null;

// 关键：思源内核在 Plugin.addTab 内部注册的模型类型键为 this.name + type，
// openTab 的 custom.id 必须与该键完全一致，否则标签页只显示标题、内容区空白，
// 且内核自带的去重逻辑也会失效（每点一次顶栏按钮就新建一个空标签）。
// 与 Plugin.addTab 注册的模型类型键保持一致
const TAB_TYPE = "clock";

const I18N_FALLBACK = {
    "clock": "时钟",
    "openClock": "打开时钟",
};

class ClockPlugin extends Plugin {
    async onload() {
        // element -> { timeout, interval }
        this.tabTimers = new Map();

        const plugin = this;

        // 注册自定义标签页
        this.addTab({
            type: TAB_TYPE,
            init() {
                plugin.renderTab(this);
            },
            beforeDestroy() {
                plugin.stopTicker(this.element);
            },
        });

        // 判断运行端：移动端顶栏不渲染插件按钮，改用 Dock 面板作为入口
        const frontend = getFrontend ? getFrontend() : "desktop";
        this.isMobile = frontend === "mobile" || frontend === "browser-mobile";

        if (this.isMobile) {
            // 移动端：注册 Dock，在侧边坞栏显示时钟图标，点开即见时钟
            let dockEl = null;
            this.addDock({
                config: {
                    position: "RightBottom",
                    size: { width: 320, height: 0 },
                    icon: "iconClock",
                    title: this.t("openClock"),
                },
                type: TAB_TYPE,
                data: {},
                init: (dock) => {
                    dockEl = dock.element;
                    this.renderTab({ element: dockEl });
                },
                destroy: () => {
                    if (dockEl) this.stopTicker(dockEl);
                    dockEl = null;
                },
            });
        } else {
            // 桌面端：顶栏按钮入口
            this.addTopBar({
                icon: "iconClock",
                title: this.t("openClock"),
                position: "right",
                callback: () => this.openClockTab(),
            });
        }

        // 命令面板入口，可自行绑定快捷键
        this.addCommand({
            langKey: "openClock",
            hotkey: "",
            globalCallback: () => this.openClockTab(),
        });
    }

    async onunload() {
        if (this.clockDialog) {
            try { this.clockDialog.destroy(); } catch (e) { /* ignore */ }
            this.clockDialog = null;
        }
        for (const element of this.tabTimers.keys()) {
            this.stopTicker(element);
        }
    }

    t(key) {
        return (this.i18n && this.i18n[key]) || I18N_FALLBACK[key] || key;
    }

    openClockTab() {
        // 移动端不适合开标签页，改为全屏弹窗
        const frontend = getFrontend ? getFrontend() : "desktop";
        const isMobile = frontend === "mobile" || frontend === "browser-mobile";
        if (isMobile && Dialog) {
            this.openClockDialog();
            return;
        }

        // 与 Plugin.addTab 注册的模型类型键保持一致
        const tabId = this.name + TAB_TYPE;

        // 防御性去重：遍历已有标签页，若时钟标签已打开则直接切换到它，不再新建
        if (getAllTabs) {
            try {
                const tabs = getAllTabs();
                for (const tab of tabs) {
                    const raw = tab.headElement && tab.headElement.getAttribute("data-initdata");
                    if (!raw) continue;
                    const init = JSON.parse(raw);
                    if (init.instance === "Custom" && init.customModelType === tabId) {
                        tab.parent.switchTab(tab.headElement);
                        return;
                    }
                }
            } catch (e) {
                console.warn("[siyuan-clock] dedup check failed:", e);
            }
        }

        openTab({
            app: this.app,
            custom: {
                icon: "iconClock",
                title: this.t("clock"),
                data: {},
                id: tabId,
            },
        });
    }

    // 移动端：全屏弹窗展示时钟
    openClockDialog() {
        // 已有弹窗则先关掉，避免叠加
        if (this.clockDialog) {
            try { this.clockDialog.destroy(); } catch (e) { /* ignore */ }
            this.clockDialog = null;
        }
        const dialog = new Dialog({
            title: this.t("clock"),
            content: '<div class="siyuan-clock siyuan-clock--dialog"></div>',
            width: "100vw",
            height: "100vh",
            destroyCallback: () => {
                this.stopTicker(this.clockElement);
                this.clockElement = null;
                this.clockDialog = null;
            },
        });
        const el = dialog.element.querySelector(".siyuan-clock");
        this.clockElement = el;
        this.clockDialog = dialog;
        this.renderTab({ element: el });
    }

    renderTab(model) {
        const element = model.element;
        element.classList.add("siyuan-clock");
        element.innerHTML = `
<div class="siyuan-clock__wrap" role="timer" aria-live="off">
    <div class="siyuan-clock__time">--:--:--</div>
    <div class="siyuan-clock__sub">
        <span class="siyuan-clock__date"></span>
        <span class="siyuan-clock__week"></span>
    </div>
    <div class="siyuan-clock__lunar"></div>
</div>`;

        const wrap = element.querySelector(".siyuan-clock__wrap");
        this.tick(wrap);
        this.startTicker(wrap);
    }

    startTicker(wrap) {
        const update = () => {
            if (wrap.isConnected) {
                this.tick(wrap);
            }
        };
        const handle = { timeout: null, interval: null };
        // 对齐到下一个整秒，避免跳秒
        handle.timeout = setTimeout(() => {
            update();
            handle.interval = setInterval(update, 1000);
        }, 1000 - (Date.now() % 1000) + 20);
        this.tabTimers.set(wrap.closest(".siyuan-clock"), handle);
    }

    stopTicker(element) {
        if (!element) return;
        const handle = this.tabTimers.get(element);
        if (handle) {
            clearTimeout(handle.timeout);
            clearInterval(handle.interval);
            this.tabTimers.delete(element);
        }
    }

    tick(wrap) {
        if (!wrap) return;
        const now = new Date();
        const pad = (n) => String(n).padStart(2, "0");
        const timeEl = wrap.querySelector(".siyuan-clock__time");
        const dateEl = wrap.querySelector(".siyuan-clock__date");
        const weekEl = wrap.querySelector(".siyuan-clock__week");
        const lunarEl = wrap.querySelector(".siyuan-clock__lunar");
        if (timeEl) {
            timeEl.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
        }
        if (dateEl) {
            dateEl.textContent = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
        }
        if (weekEl) {
            weekEl.textContent = WEEK_NAMES[now.getDay()];
        }
        if (lunarEl) {
            lunarEl.textContent = formatLunar(now);
        }
    }
}

// CommonJS 导出（思源插件加载器取 module.exports / exports.default 作为插件类）
module.exports = ClockPlugin;
module.exports.default = ClockPlugin;
// 暴露农历函数，便于本地算法校验
module.exports.formatLunar = formatLunar;
module.exports.solarToLunar = solarToLunar;
