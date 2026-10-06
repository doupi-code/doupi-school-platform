import type { Teacher } from "@/cms/types";

export function Portrait({ teacher }: { teacher: Teacher }) {
  if (teacher.avatarUrl) {
    return (
      <div className="teacher-portrait has-img">
        <img src={teacher.avatarUrl} alt={teacher.name} />
        <i>{teacher.subject}</i>
      </div>
    );
  }

  return (
    <div className="teacher-portrait">
      <span>{teacher.name.slice(0, 1)}</span>
      <i>{teacher.subject}</i>
    </div>
  );
}

export const groupOf = (t: Teacher): "principal" | "senior" | "backbone" | "excellent" => {
  if (!t) return "excellent";
  if (t.role && /校长|主任/.test(t.role)) return "principal";
  const tags = Array.isArray(t.tags)
    ? t.tags
    : typeof t.tags === "string"
    ? String(t.tags).split(/[,，、|\s]+/).filter(Boolean)
    : [];
  if (tags.some((tag) => tag.includes("特级"))) return "senior";
  if (tags.some((tag) => tag.includes("骨干"))) return "backbone";
  return "excellent";
};

export const facultyTabs: { id: "principal" | "senior" | "backbone" | "excellent"; label: string }[] = [
  { id: "principal", label: "校长" },
  { id: "senior", label: "特级教师" },
  { id: "backbone", label: "骨干教师" },
  { id: "excellent", label: "优秀教师" },
];
