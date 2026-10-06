import p1 from "@/imports/1_P_1.JPG";
import p2 from "@/imports/1_P_2.jpg";
import p3 from "@/imports/1_P_3.JPG";
import p4 from "@/imports/1_P_4.JPG";
import p5 from "@/imports/1_P_5.JPG";
import p6 from "@/imports/1_P_6.JPG";
import p7 from "@/imports/1_P_7.JPG";
import p8 from "@/imports/1_P_8.JPG";
import campusEnv from "@/assets/campus-environment.jpg";

export const IMG = {
  brick: campusEnv,
  brick2: p2,
  tower: p1,
  lawn: p7,
  class1: p3,
  class2: p4,
  class3: p5,
  track: p6,
};

export const pool = [campusEnv, p1, p2, p3, p4, p5, p6, p7, p8];

export const heroImg: Record<string, string> = {
  about: campusEnv,
  "senior-year": p5,
  faculty: p3,
  "campus-life": p6,
  admissions: p1,
  news: p4,
};

const hashStr = (x: string) =>
  [...x].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

interface PhProps {
  label?: string;
  tone?: number;
  className?: string;
  src?: string;
}

export function Ph({ label, tone = 1, className = "", src }: PhProps) {
  const img = src || pool[(hashStr(label ?? "") + tone * 5) % pool.length];
  return (
    <div className={`ph t${(tone % 3) + 1} ${className}`}>
      <img
        src={img}
        alt={label ?? "校园实景"}
        loading="lazy"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
        }}
      />
      {label && <span>{label}</span>}
    </div>
  );
}
