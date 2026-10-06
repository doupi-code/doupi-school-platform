import { create } from 'zustand';
import { get } from '../api/request';

export interface DictItem {
  dictLabel: string;
  dictValue: string;
  listClass?: string;
}

interface DictState {
  dictMap: Record<string, DictItem[]>;
  getDict: (dictType: string) => Promise<DictItem[]>;
}

export const useDictStore = create<DictState>((set, getStore) => ({
  dictMap: {},
  getDict: async (dictType: string) => {
    const { dictMap } = getStore();
    if (dictMap[dictType]) {
      return dictMap[dictType];
    }
    const res = await get(`/system/dict/data/type/${dictType}`);
    const dictData = res.data || [];
    set((state) => ({
      dictMap: {
        ...state.dictMap,
        [dictType]: dictData
      }
    }));
    return dictData;
  }
}));
