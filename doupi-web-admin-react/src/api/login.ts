import { get, post } from './request';

export const login = (username?: string, password?: string, code?: string, uuid?: string) => {
  return post('/login', { username, password, code, uuid });
};

export const getInfo = () => {
  return get('/getInfo');
};

export const getRouters = () => {
  return get('/getRouters');
};

export const logout = () => {
  return post('/logout');
};

export const getCaptchaImage = () => {
  return get('/captchaImage');
};
