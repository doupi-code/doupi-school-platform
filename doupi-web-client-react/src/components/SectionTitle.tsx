interface Props {
  title: string;
  subtitle?: string;
}

export default function SectionTitle({ title, subtitle }: Props) {
  return (
    <div className="text-center my-12">
      <h2 className="text-3xl font-bold text-gray-800 relative inline-block">
        {title}
        <div className="absolute left-1/2 -bottom-4 -translate-x-1/2 w-12 h-1 bg-blue-500 rounded"></div>
      </h2>
      {subtitle && <p className="mt-8 text-gray-500 text-lg">{subtitle}</p>}
    </div>
  );
}
