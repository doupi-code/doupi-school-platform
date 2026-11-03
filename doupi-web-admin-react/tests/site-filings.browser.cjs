// 两个本地 Vite 服务，所有接口均拦截，不读写真实业务数据。
// CLIENT_TEST_URL、ADMIN_TEST_URL 指定服务；PLAYWRIGHT_MODULE 指定可选的 Playwright package.json。
const { createRequire } = require('node:module');
const assert = require('node:assert/strict');
const browserRequire = process.env.PLAYWRIGHT_MODULE ? createRequire(process.env.PLAYWRIGHT_MODULE) : require;
const { chromium, expect } = browserRequire('playwright/test');

(async () => {
  const clientUrl = process.env.CLIENT_TEST_URL;
  const adminUrl = process.env.ADMIN_TEST_URL;
  assert.ok(clientUrl && adminUrl, '请指定 CLIENT_TEST_URL 和 ADMIN_TEST_URL');
  const browser = await chromium.launch({ headless: true, ...(process.env.TEST_BROWSER ? { executablePath: process.env.TEST_BROWSER } : {}) });
  try {
    const context = await browser.newContext({ viewport: { width: 1500, height: 1100 } });
    await context.addCookies([{ name: 'Admin-Token', value: 'test-only', url: adminUrl }]);
    let footer = { icp: '鄂ICP备2026055716号-1', copyright: '测试版权保留', brand: { address: '测试地址保留' } };
    let saves = 0;
    const errors = [];
    context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
    await context.route(url => url.pathname.startsWith('/api/'), async route => {
      const path = new URL(route.request().url()).pathname;
      let body = { code: 200, data: null, rows: [] };
      if (path === '/api/getInfo') body = { code: 200, user: { userName: 'test' }, roles: ['admin'], permissions: ['*:*:*'] };
      else if (path === '/api/getRouters') body = { code: 200, data: [] };
      else if (path === '/api/cms/builder/global/footer') body.data = { configContent: JSON.stringify(footer) };
      else if (path === '/api/public/v1/cms/global/footer') body.data = JSON.stringify(footer);
      else if (path === '/api/cms/builder/global' && route.request().method() === 'PUT') {
        const request = route.request().postDataJSON();
        assert.equal(request.category, 'footer');
        footer = JSON.parse(request.configContent);
        saves++;
      }
      await route.fulfill({ json: body });
    });

    const admin = await context.newPage();
    await admin.goto(`${adminUrl}/admin/cms/global`);
    try {
      await admin.getByRole('tab', { name: '底部 Footer 页脚' }).click();
    } catch (error) {
      console.error({ url: admin.url(), body: await admin.locator('body').innerText(), errors });
      throw error;
    }
    const number = admin.getByRole('textbox', { name: /公安联网备案号$/ });
    const link = admin.getByRole('textbox', { name: /公安联网备案查询链接$/ });
    const save = admin.getByRole('button', { name: '保存底部 Footer 配置' });
    await expect(number).toHaveValue('鄂公网安备42011102006651号');
    await expect(link).toHaveValue('https://beian.mps.gov.cn/#/query/webSearch?code=42011102006651');
    const preview = admin.frameLocator('iframe');
    await expect(preview.locator('.hx-foot-filings')).toContainText('鄂公网安备42011102006651号');

    await link.fill('javascript:alert(1)');
    await save.click();
    await expect(admin.getByText('链接须以 http:// 或 https:// 开头', { exact: true })).toBeVisible();
    assert.equal(saves, 0, '无效查询地址不得保存');
    await expect(preview.locator('.hx-foot-filings a').last()).not.toHaveAttribute('href');

    const customNumber = '鄂公网安备42011102006652号';
    const customUrl = 'https://beian.mps.gov.cn/#/query/webSearch?code=42011102006652';
    await number.fill(customNumber);
    await link.fill(customUrl);
    await admin.getByRole('textbox', { name: /工信部 ICP 备案查询链接$/ }).fill('https://beian.miit.gov.cn/#/test');
    await expect(preview.locator('.hx-foot-filings a').last()).toHaveAttribute('href', customUrl);
    await expect(preview.locator('.hx-foot-filings a').last()).toContainText(customNumber);
    await save.click();
    await expect(admin.getByText('全站底部页脚配置已成功保存并同步！', { exact: true })).toBeVisible();
    assert.equal(saves, 1);
    assert.equal(footer.copyright, '测试版权保留');
    assert.equal(footer.brand.address, '测试地址保留');
    await expect(admin.locator('a', { hasText: customNumber })).toHaveAttribute('href', customUrl);
    await admin.reload();
    await admin.getByRole('tab', { name: '底部 Footer 页脚' }).click();
    await expect(number).toHaveValue(customNumber);
    await expect(link).toHaveValue(customUrl);

    const client = await context.newPage();
    await client.goto(`${clientUrl}/index`);
    const filings = client.locator('.hx-foot-filings');
    await expect(filings.locator('a').last()).toHaveAttribute('href', customUrl);
    await expect(filings.locator('a').first()).toHaveAttribute('href', 'https://beian.miit.gov.cn/#/test');
    await expect(filings).not.toContainText('审核中');
    await expect(filings.locator('a').last()).toHaveAttribute('target', '_blank');
    await expect.poll(() => filings.locator('img').evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
    await client.setViewportSize({ width: 375, height: 812 });
    await filings.scrollIntoViewIfNeeded();
    const bounds = await filings.boundingBox();
    assert.ok(bounds && bounds.x >= 0 && bounds.x + bounds.width <= 376, '手机备案行须在视口内');
    assert.deepEqual(errors, []);
    console.log('PASS: 旧配置兼容、非法链接拦截、官网实时预览、保存/重载、两端同源配置、图标及移动端显示');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
