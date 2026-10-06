import { Image } from 'antd';
import SectionTitle from '@/components/SectionTitle';

const images = [
  { src: 'https://via.placeholder.com/400x300?text=Campus+1', alt: '教学楼' },
  { src: 'https://via.placeholder.com/400x300?text=Campus+2', alt: '图书馆' },
  { src: 'https://via.placeholder.com/400x300?text=Campus+3', alt: '体育馆' },
  { src: 'https://via.placeholder.com/400x300?text=Campus+4', alt: '实验室' },
  { src: 'https://via.placeholder.com/400x300?text=Campus+5', alt: '食堂' },
  { src: 'https://via.placeholder.com/400x300?text=Campus+6', alt: '宿舍' },
];

export default function Gallery() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <SectionTitle title="校园风貌" subtitle="美丽的校园环境，优越的学习氛围" />
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        <Image.PreviewGroup>
          {images.map((img, index) => (
            <div key={index} className="overflow-hidden rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <Image 
                src={img.src} 
                alt={img.alt}
                className="w-full h-64 object-cover hover:scale-105 transition-transform duration-300"
              />
              <div className="p-3 bg-white text-center text-gray-600 font-medium">
                {img.alt}
              </div>
            </div>
          ))}
        </Image.PreviewGroup>
      </div>
    </div>
  );
}
