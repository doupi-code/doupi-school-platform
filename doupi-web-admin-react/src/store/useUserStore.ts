import { create } from 'zustand';
import { login, getInfo, logout } from '../api/login';
import { setToken, removeToken, getToken } from '../utils/auth';

interface UserState {
  token: string | undefined;
  name: string;
  avatar: string;
  roles: string[];
  permissions: string[];
  setName: (name: string) => void;
  setAvatar: (avatar: string) => void;
  login: (userInfo: any) => Promise<any>;
  getInfo: () => Promise<any>;
  logout: () => Promise<any>;
}

export const useUserStore = create<UserState>((set) => ({
  token: getToken(),
  name: '',
  avatar: '',
  roles: [],
  permissions: [],

  setName: (name: string) => set({ name }),
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
    const avatar = (user.avatar == "" || user.avatar == null) ? "/avatar.png" : user.avatar;
    if (res.roles && res.roles.length > 0) {
      set({
        roles: res.roles,
        permissions: res.permissions,
        name: user.userName,
        avatar: avatar
      });
    } else {
      set({
        roles: ['ROLE_DEFAULT'],
        permissions: res.permissions,
        name: user.userName,
        avatar: avatar
      });
    }
    return res;
  },

  logout: async () => {
    await logout();
    removeToken();
    set({ token: undefined, roles: [], permissions: [], name: '', avatar: '' });
  }
}));

export default useUserStore;
