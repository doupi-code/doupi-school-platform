import { useUserStore } from '../store/useUserStore';

export const usePermission = () => {
  const permissions = useUserStore((state) => state.permissions);
  const roles = useUserStore((state) => state.roles);

  const hasPermi = (permission?: string | string[]) => {
    if (!permission) return true;
    const all_permission = "*:*:*";
    if (permissions.includes(all_permission)) {
      return true;
    }
    const perms = Array.isArray(permission)
      ? permission
      : permission.split(',').map((p) => p.trim());
    return perms.some((p) => permissions.includes(p));
  };

  const hasRole = (role?: string | string[]) => {
    if (!role) return true;
    const super_admin = "admin";
    if (roles.includes(super_admin)) {
      return true;
    }
    const roleList = Array.isArray(role)
      ? role
      : role.split(',').map((r) => r.trim());
    return roleList.some((r) => roles.includes(r));
  };

  return { hasPermi, hasRole };
};
