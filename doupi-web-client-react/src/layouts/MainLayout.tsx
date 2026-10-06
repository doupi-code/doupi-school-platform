import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { MenuOutlined, CloseOutlined } from '@ant-design/icons';
import { Drawer } from 'antd';

const navLinks = [
  { path: '/', label: '首页' },
  { path: '/about', label: '学校概况' },
  { path: '/teachers', label: '师资团队' },
  { path: '/gallery', label: '校园风貌' },
  { path: '/appointment', label: '在线预约' },
  { path: '/query', label: '预约查询' },
];

export default function MainLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const toggleMenu = () => setMenuOpen(!menuOpen);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">汉</div>
            <span className="text-xl font-bold text-gray-800">汉外华襄高级中学</span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`text-base font-medium transition-colors hover:text-blue-500 ${
                  location.pathname === link.path ? 'text-blue-500' : 'text-gray-600'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Mobile Hamburger */}
          <div className="md:hidden">
            <MenuOutlined className="text-2xl cursor-pointer" onClick={toggleMenu} />
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      <Drawer
        title="菜单"
        placement="right"
        onClose={toggleMenu}
        open={menuOpen}
        closeIcon={<CloseOutlined />}
      >
        <div className="flex flex-col gap-4">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={toggleMenu}
              className={`text-lg font-medium ${
                location.pathname === link.path ? 'text-blue-500' : 'text-gray-800'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </Drawer>

      {/* Main Content */}
      <main className="flex-1 bg-white">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-gray-300 py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center md:text-left flex flex-col md:flex-row justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-white mb-4">汉外华襄高级中学</h3>
            <p>地址：湖北省襄阳市高新区</p>
            <p>联系电话：0710-1234567</p>
          </div>
          <div className="flex items-center justify-center md:justify-end">
            <p>&copy; {new Date().getFullYear()} 汉外华襄高级中学 版权所有</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
