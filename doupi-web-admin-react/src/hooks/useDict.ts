import { useState, useEffect } from 'react';
import { useDictStore, DictItem } from '../store/useDictStore';

export const useDict = (...args: string[]) => {
  const [res, setRes] = useState<Record<string, DictItem[]>>({});
  const getDict = useDictStore((state) => state.getDict);

  useEffect(() => {
    const fetchDicts = async () => {
      const result: Record<string, DictItem[]> = {};
      for (const dictType of args) {
        result[dictType] = await getDict(dictType);
      }
      setRes(result);
    };
    fetchDicts();
  }, [args, getDict]);

  return args.map((dict) => res[dict] || []);
};
