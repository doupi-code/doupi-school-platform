import requests
import subprocess

# 1. 验证码与登录
cap_resp = requests.get('http://127.0.0.1:8088/captchaImage').json()
uuid = cap_resp['uuid']
raw_val = subprocess.check_output(f"redis-cli -p 9763 -a 'lt19960614.' get 'captcha_codes:{uuid}'", shell=True).decode().strip()
code = raw_val.split()[-1].strip('"')

login_resp = requests.post('http://127.0.0.1:8088/login', json={
    'username': 'zhuchengqiao',
    'password': 'admin123',
    'code': code,
    'uuid': uuid
}).json()

print(f"1. 登录结果: code={login_resp.get('code')}, token前缀={str(login_resp.get('token'))[:15]}...")
token = login_resp.get('token')
headers = {'Authorization': f'Bearer {token}'}

# 2. getInfo
info = requests.get('http://127.0.0.1:8088/getInfo', headers=headers).json()
print("\n2. 用户权限与角色:")
print(f"   用户名: {info['user']['userName']}, 昵称: {info['user']['nickName']}")
print(f"   已拥有角色: {info['roles']}")
print(f"   已拥有权限标识数量: {len(info['permissions'])}")
print(f"   是否包含通知查看权限: {'system:notice:list' in info['permissions']}")

# 3. getRouters
routers = requests.get('http://127.0.0.1:8088/getRouters', headers=headers).json()
print("\n3. 动态侧边栏菜单路由树:")
for m in routers.get('data', []):
    title = m.get('meta', {}).get('title')
    children = [c.get('meta', {}).get('title') for c in m.get('children', [])]
    print(f"   📂 【{title}】 -> {', '.join(children)}")

# 4. 验证 Dashboard 首页通知接口
notice = requests.get('http://127.0.0.1:8088/system/notice/list?pageNum=1&pageSize=6', headers=headers).json()
print(f"\n4. Dashboard 首页通知公告接口测试:")
print(f"   业务状态码: code={notice.get('code')} (200 表示完全成功，无 403 报警)")
print(f"   公告数据行数: {len(notice.get('rows', []))}")
