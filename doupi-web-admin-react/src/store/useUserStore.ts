import { create } from 'zustand';
import { login, getInfo, logout } from '../api/login';
import { setToken, removeToken, getToken } from '../utils/auth';

interface UserState {
  token: string | undefined;
  name: string;
  nickName: string;
  avatar: string;
  roles: string[];
  permissions: string[];
  setName: (name: string) => void;
  setNickName: (nickName: string) => void;
  setAvatar: (avatar: string) => void;
  login: (userInfo: any) => Promise<any>;
  getInfo: () => Promise<any>;
  logout: () => Promise<any>;
}

export const useUserStore = create<UserState>((set) => ({
  token: getToken(),
  name: '',
  nickName: '',
  avatar: '',
  roles: [],
  permissions: [],

  setName: (name: string) => set({ name }),
  setNickName: (nickName: string) => set({ nickName }),
  setAvatar: (avatar: string) => set({ avatar }),

  login: async (userInfo) => {
    const res: any = await login(userInfo.username, userInfo.password, userInfo.code, userInfo.uuid);
    setToken(res.token);
    set({ token: res.token });
    return res;
  },

  getInfo: async () => {
    const res: any = await getInfo();
    const user = res.user;
    let avatarUrl = '';
    if (user.avatar && typeof user.avatar === 'string' && user.avatar.trim() !== '' && user.avatar !== '/avatar.png') {
      if (user.avatar.startsWith('http://') || user.avatar.startsWith('https://') || user.avatar.startsWith('data:')) {
        avatarUrl = user.avatar;
      } else {
        const base = import.meta.env.VITE_APP_BASE_API || '';
        avatarUrl = `${base}${user.avatar}`;
      }
    }
    const roles = res.roles && res.roles.length > 0 ? res.roles : ['ROLE_DEFAULT'];
    set({
      roles,
      permissions: res.permissions || [],
      name: user.userName || '',
      nickName: user.nickName || '',
      avatar: avatarUrl,
    });
    return res;
  },

  logout: async () => {
    await logout();
    removeToken();
    set({ token: undefined, roles: [], permissions: [], name: '', nickName: '', avatar: '' });
  }
}));

export default useUserStore;
