import React, { useEffect, useState, useMemo, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation, ScrollRestoration } from "react-router-dom";
import { ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import { Arrow, Search, SearchBar, MobileBar } from "@/components/common";
import { BookingModal, BookingQueryModal } from "@/components/booking";
import { useSiteConfig, useGlobalLayout } from "@/cms/hooks";
import { defaultNavigation } from "@/cms/fallback";

const read = (key: string, fallback: string) => {
  if (typeof window === "undefined") return fallback;
  return window.localStorage.getItem(key) ?? fallback;
};

const quickLinks: { title: string; href: string }[] = [
  { title: "预约游园", href: "/admissions/consultation" },
  { title: "预约咨询", href: "/admissions/consultation" },
  { title: "招生简章", href: "/admissions/guide" },
  { title: "常见问题", href: "/admissions/faq" },
  { title: "高考资讯", href: "/news/gaokao" },
];

const socials = [
  { id: "wechat", label: "微信" },
  { id: "weibo", label: "微博" },
  { id: "douyin", label: "抖音" },
  { id: "channels", label: "视频号" },
  { id: "xiaohongshu", label: "小红书" },
];

function QrPopover({
  label,
  trigger,
  mode = "click",
}: {
  label: string;
  trigger: ReactNode;
  mode?: "click" | "hover";
}) {
  const [open, setOpen] = useState(false);
  const hover = mode === "hover";
  return (
    <span
      className={hover ? "qr-wrap hover" : "qr-wrap"}
      onMouseEnter={hover ? () => setOpen(true) : undefined}
      onMouseLeave={hover ? () => setOpen(false) : undefined}
    >
      <button
        type="button"
        className="qr-trigger"
        onClick={hover ? undefined : () => setOpen((v) => !v)}
        aria-label={label}
      >
        {trigger}
      </button>
      {open && (
        <span className="qr-popover">
          <span className="qr-code" aria-hidden="true" />
          <small>{label}</small>
        </span>
      )}
    </span>
  );
}

export function SiteLayout() {
  const { config } = useSiteConfig();
  const { config: headerConfig } = useGlobalLayout("header");
  const { config: footerConfig } = useGlobalLayout("footer");

  const [menu, setMenu] = useState(false);
  const [menuClosing, setMenuClosing] = useState(false);
  const [search, setSearch] = useState(false);
  const [queryModal, setQueryModal] = useState(false);
  const [bookingModal, setBookingModal] = useState(false);
  const [theme, setTheme] = useState(() => read("hx-theme", "red"));
  const [dark, setDark] = useState(() => read("hx-dark", "false") === "true");
  const location = useLocation();

  const navList = useMemo(() => {
    if (headerConfig?.nav && Array.isArray(headerConfig.nav) && headerConfig.nav.length > 0) {
      return headerConfig.nav.filter((item: any) => item.slug || (item.path && item.path !== "/"));
    }
    return defaultNavigation;
  }, [headerConfig]);

  useEffect(() => {
    window.localStorage.setItem("hx-dark", String(dark));
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    window.localStorage.setItem("hx-theme", theme);
  }, [theme]);

  const closeMenu = () => {
    setMenuClosing(true);
    window.setTimeout(() => {
      setMenu(false);
      setMenuClosing(false);
    }, 360);
  };

  useEffect(() => {
    setMenu(false);
    setMenuClosing(false);
    setSearch(false);
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    document.documentElement.scrollTo({ top: 0, left: 0, behavior: "instant" });
    document.body.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [location.pathname, location.search]);

  const siteName = headerConfig?.brand?.name || config.siteName || "汉外华襄复读中心";
  const siteNameEn = headerConfig?.brand?.nameEn || config.siteNameEn || "HUAXIANG SENIOR YEAR CENTER";
  const brandMark = headerConfig?.brand?.mark || (siteName ? siteName.slice(0, 1) : "华");

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: "#8B1D2C",
          colorLink: "#8B1D2C",
          borderRadius: 6,
          fontFamily: "inherit",
        },
      }}
    >
      <ScrollRestoration />
      <div className={dark ? "site dark" : "site"} data-theme={theme}>
      {queryModal && <BookingQueryModal close={() => setQueryModal(false)} />}
      {bookingModal && (
        <BookingModal
          close={() => setBookingModal(false)}
          onSwitchToQuery={() => {
            setBookingModal(false);
            setQueryModal(true);
          }}
        />
      )}

      <header className="site-head">
        <Link className="brand" to="/">
          <span className="brand-mark">{brandMark}</span>
          <span>
            <b>{siteName}</b>
            <i>{siteNameEn}</i>
          </span>
        </Link>

        <nav className="main-nav">
          <NavLink end to="/">
            首页
          </NavLink>
          {navList.map((n: any) => (
            <div className="nav-group" key={n.slug || n.path}>
              <NavLink to={n.path || `/${n.slug}`}>{n.title}</NavLink>
              {n.children && n.children.length > 0 && (
                <div className="nav-dropdown">
                  {n.children.map((child: any) => (
                    <Link
                      to={child.path || `/${n.slug || ""}/${child.slug}`}
                      key={child.slug || child.path}
                    >
                      <span>{child.title}</span>
                      {child.desc && <small>{child.desc}</small>}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="hx-actions">
          <button
            className="hx-icon"
            onClick={() => setDark(!dark)}
            title="切换日夜模式"
            aria-label="切换日夜模式"
          >
            {dark ? (
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="4.5" />
                <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24">
                <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
              </svg>
            )}
          </button>
          <button
            className={search ? "hx-icon on" : "hx-icon"}
            onClick={() => setSearch((v) => !v)}
            aria-label="搜索"
          >
            <Search />
          </button>
          <button
            className={menu ? "hx-menu open" : "hx-menu"}
            onClick={() => {
              if (menu) {
                closeMenu();
              } else {
                setMenuClosing(false);
                setMenu(true);
              }
            }}
            aria-label={menu ? "关闭菜单" : "打开菜单"}
          >
            <span className="hx-menu-label">{menu ? "关闭" : "菜单"}</span>
            <span className="hx-burger">
              <i />
              <i />
            </span>
          </button>
        </div>
        {search && <SearchBar close={() => setSearch(false)} />}
      </header>

      <Outlet />

      <SiteFooter
        onOpenQuery={() => setQueryModal(true)}
        onOpenBooking={() => setBookingModal(true)}
        footerConfig={footerConfig}
        navList={navList}
      />
      <MobileBar onOpenQuery={() => setQueryModal(true)} />
      {menu && (
        <FullMenu
          close={closeMenu}
          closing={menuClosing}
          dark={dark}
          setDark={setDark}
          theme={theme}
          setTheme={setTheme}
          onOpenQuery={() => {
            closeMenu();
            setQueryModal(true);
          }}
          navList={navList}
        />
      )}
      </div>
    </ConfigProvider>
  );
}

function SiteFooter({
  onOpenQuery,
  onOpenBooking,
  footerConfig,
  navList = defaultNavigation,
}: {
  onOpenQuery: () => void;
  onOpenBooking: () => void;
  footerConfig?: any;
  navList?: any[];
}) {
  const { config } = useSiteConfig();
  const cta = footerConfig?.cta;
  const brand = footerConfig?.brand;
  const phone = brand?.hotlines?.[0] || config.hotlines?.[0] || "027-81777887";
  const hotlines = brand?.hotlines?.length ? brand.hotlines : (config.hotlines || ["81777887", "81777838"]);
  const siteName = brand?.name || config.siteName || "汉外华襄复读中心";
  const siteNameEn = brand?.nameEn || config.siteNameEn || "HUAXIANG SENIOR YEAR CENTER";
  const address = brand?.address || config.address || "武汉市江夏区武汉海淀外国语实验学校（北门）";
  const admissionsLine = brand?.admissionsLine || config.admissionsLine || "400-0000-000";
  const icp = footerConfig?.icp || config.icp || "鄂ICP备20260930号-1";
  const copyright = footerConfig?.copyright || `© 2026 ${siteName} · 版权所有`;

  return (
    <footer className="hx-foot">
      <div className="hx-foot-cta">
        <div>
          <p className="kicker">{cta?.kicker || "VISIT US / 来校园走一走"}</p>
          <h2>
            {(cta?.title || "重新出发，\n从一次到访开始。").split("\n").map((line: string, i: number) => (
              <React.Fragment key={i}>
                {line}
                {i === 0 && <br />}
              </React.Fragment>
            ))}
          </h2>
        </div>
        <div className="hx-foot-cta-side">
          <a className="hx-foot-tel" href={`tel:${phone}`}>
            <small>咨询热线</small>
            {phone}
          </a>
          <button type="button" className="hx-foot-btn" onClick={onOpenBooking}>
            {cta?.buttonText || "预约游园 / 诊断"} <Arrow />
          </button>
        </div>
      </div>
      <div className="hx-foot-main">
        <div className="hx-foot-brand">
          <div className="footer-brand">
            <span className="brand-mark">{brand?.mark || (siteName ? siteName.slice(0, 1) : "华")}</span>
            <span>
              <b>{siteName}</b>
              <i>{siteNameEn}</i>
            </span>
          </div>
          <p>
            {(brand?.slogan || "只为高三，再出发的这一年。\n全封闭管理 · 小班分层 · 名师执教").split("\n").map((line: string, i: number) => (
              <React.Fragment key={i}>
                {line}
                <br />
              </React.Fragment>
            ))}
          </p>
          <dl>
            <div>
              <dt>地址</dt>
              <dd>{address}</dd>
            </div>
            <div>
              <dt>电话</dt>
              <dd>{Array.isArray(hotlines) ? hotlines.join(" / ") : hotlines}</dd>
            </div>
            <div>
              <dt>招生专线</dt>
              <dd>{admissionsLine}</dd>
            </div>
          </dl>
        </div>
        <div className="hx-foot-nav">
          {navList.map((n: any) => (
            <div key={n.slug || n.path}>
              <Link className="hx-foot-title" to={n.path || `/${n.slug}`}>
                {n.title}
              </Link>
              {n.children?.map((c: any) => (
                <Link to={c.path || `/${n.slug || ""}/${c.slug}`} key={c.slug || c.path}>
                  {c.title}
                </Link>
              ))}
            </div>
          ))}
        </div>
        <div className="hx-foot-qr">
          <span>关注我们</span>
          <div>
            {socials.map((s) => (
              <QrPopover
                key={s.id}
                mode="hover"
                label={`${s.label}二维码`}
                trigger={<span className="hx-qr-chip">{s.label}</span>}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={onOpenQuery}
            className="hx-qr-chip solid"
            style={{ cursor: "pointer", border: "none", width: "100%", textAlign: "center" }}
          >
            🔍 查询预约进度与核销码
          </button>
          <QrPopover label="扫码咨询招生" trigger={<span className="hx-qr-chip solid">扫码咨询招生</span>} />
        </div>
      </div>
      <div className="hx-foot-bar">
        <small>{copyright}</small>
        <span className="hx-foot-word" aria-hidden="true">
          {(siteNameEn || "HUAXIANG").split(" ")[0]}
        </span>
        <small>{icp}</small>
      </div>
    </footer>
  );
}

function FullMenu({
  close,
  closing,
  dark,
  setDark,
  theme,
  setTheme,
  onOpenQuery,
  navList = defaultNavigation,
}: {
  close: () => void;
  closing: boolean;
  dark: boolean;
  setDark: (v: boolean) => void;
  theme: string;
  setTheme: (t: string) => void;
  onOpenQuery: () => void;
  navList?: any[];
}) {
  const [hover, setHover] = useState(0);
  const cur = navList[hover] || navList[0] || defaultNavigation[0];

  return (
    <div className={closing ? "hx-drawer is-closing" : "hx-drawer"} onClick={close}>
      <div className="hx-drawer-panel" onClick={(e) => e.stopPropagation()}>
        <div className="hx-drawer-nav">
          <p className="kicker">MENU / 全部导航</p>
          {navList.map((n: any, i: number) => (
            <Link
              key={n.slug || n.path || i}
              to={n.path || `/${n.slug}`}
              className={i === hover ? "on" : ""}
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
            >
              <em>{String(i + 1).padStart(2, "0")}</em>
              <span>{n.title}</span>
              <Arrow />
            </Link>
          ))}
        </div>
        <div className="hx-drawer-sub" key={cur.slug || cur.path}>
          {cur.en && <small>{cur.en}</small>}
          <h3>{cur.title}</h3>
          {cur.desc && <p>{cur.desc}</p>}
          <div>
            {cur.children?.map((c: any) => (
              <Link to={c.path || `/${cur.slug || ""}/${c.slug}`} key={c.slug || c.path}>
                <b>{c.title}</b>
                {c.desc && <span>{c.desc}</span>}
              </Link>
            ))}
          </div>
        </div>
        <aside className="hx-drawer-side">
          <div>
            <span className="hx-side-label">快速通道</span>
            <button
              type="button"
              onClick={onOpenQuery}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "transparent",
                border: "1px solid var(--accent)",
                color: "var(--accent)",
                padding: "8px 12px",
                width: "100%",
                marginBottom: 8,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              🔍 预约进度与核销码查询 <Arrow />
            </button>
            {quickLinks.map((q) => (
              <Link to={q.href} key={q.title}>
                {q.title}
                <Arrow />
              </Link>
            ))}
          </div>
          <div>
            <span className="hx-side-label">视觉换肤</span>
            <div className="hx-seg" style={{ marginBottom: 12 }}>
              <button className={theme === "red" ? "on" : ""} onClick={() => setTheme("red")}>
                华襄红
              </button>
              <button className={theme === "blue" ? "on" : ""} onClick={() => setTheme("blue")}>
                智慧蓝
              </button>
            </div>
            <span className="hx-side-label">日夜模式</span>
            <div className="hx-seg">
              <button className={!dark ? "on" : ""} onClick={() => setDark(false)}>
                白天
              </button>
              <button className={dark ? "on" : ""} onClick={() => setDark(true)}>
                黑夜
              </button>
            </div>
          </div>
          <a className="hx-side-tel" href="tel:81777887">
            <small>咨询热线</small>027-8177 7887
          </a>
        </aside>
      </div>
    </div>
  );
}
