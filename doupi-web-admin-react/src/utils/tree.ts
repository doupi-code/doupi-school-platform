import type { Key } from 'react';

/**
 * 构造树型结构数据
 * @param data 扁平列表数据
 * @param id 节点 ID 字段名，默认 'id'
 * @param parentId 父节点 ID 字段名，默认 'parentId'
 * @param children 子节点字段名，默认 'children'
 * @param rootId 根节点父 ID，默认不指定（自动将找不到父节点或 parentId 为 0 / '0' / null / undefined / '' 的节点作为根节点）
 */
export function handleTree<T = any>(
  data: T[],
  id: string = 'id',
  parentId: string = 'parentId',
  children: string = 'children',
  rootId?: any
): T[] {
  if (!Array.isArray(data) || data.length === 0) {
    return [];
  }

  // 浅拷贝对象，预先清理后端可能返回的空 children: []
  const cloneData: any[] = data.map((item) => {
    const copy = { ...item };
    delete copy[children];
    return copy;
  });

  const nodeMap = new Map<string, any>();
  for (const item of cloneData) {
    const key = item[id];
    if (key !== undefined && key !== null) {
      nodeMap.set(String(key), item);
    }
  }

  const result: any[] = [];

  for (const item of cloneData) {
    const pId = item[parentId];
    const pKey = pId !== undefined && pId !== null ? String(pId) : null;
    const parentNode = pKey !== null ? nodeMap.get(pKey) : undefined;

    const isRoot =
      rootId !== undefined
        ? pKey === String(rootId)
        : !parentNode || pId === 0 || pId === '0' || pId === null || pId === undefined || pId === '';

    if (isRoot) {
      result.push(item);
    } else if (parentNode) {
      if (!parentNode[children]) {
        parentNode[children] = [];
      }
      parentNode[children].push(item);
    } else {
      result.push(item);
    }
  }

  return result;
}

/**
 * 递归获取树中所有包含子节点的 key（用于展开全部/折叠全部）
 */
export function getExpandableKeys(
  treeData: any[],
  idKey: string = 'id',
  childrenKey: string = 'children'
): Key[] {
  const keys: Key[] = [];
  const traverse = (items: any[]) => {
    if (!Array.isArray(items)) return;
    for (const item of items) {
      if (Array.isArray(item[childrenKey]) && item[childrenKey].length > 0) {
        keys.push(item[idKey]);
        traverse(item[childrenKey]);
      }
    }
  };
  traverse(treeData);
  return keys;
}
