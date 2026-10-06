import React, { useMemo } from 'react';
import { Tag } from 'antd';
import { DictItem } from '../store/useDictStore';

interface DictTagProps {
  options: DictItem[];
  value: string | number | string[];
}

export const DictTag: React.FC<DictTagProps> = ({ options, value }) => {
  const values = useMemo(() => {
    if (Array.isArray(value)) {
      return value.map(String);
    }
    return [String(value)];
  }, [value]);

  return (
    <>
      {values.map((val) => {
        const item = options.find((opt) => opt.dictValue === val);
        if (!item) return null;
        
        let color = 'default';
        if (item.listClass === 'primary') color = 'blue';
        else if (item.listClass === 'success') color = 'success';
        else if (item.listClass === 'info') color = 'cyan';
        else if (item.listClass === 'warning') color = 'warning';
        else if (item.listClass === 'danger') color = 'error';

        return (
          <Tag key={val} color={color}>
            {item.dictLabel}
          </Tag>
        );
      })}
    </>
  );
};

export default DictTag;
