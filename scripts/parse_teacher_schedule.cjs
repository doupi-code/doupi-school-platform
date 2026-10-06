const fs = require('fs');

const raw = `
精英C班	高三（1）班	周珲	王贤武	周珲	涂瑞志	吴显品		金传汉	许雪玲	石  松	邢鹏飞	王嘉兴
提升班A	高三（2）班A班	李寄宁	赵前利	陈新佳	李寄宁	孙仁杰		雷小平	许雪玲			王嘉兴
提升班B	高三（2）班B班	赵前利	赵前利	周珲	李寄宁	孙仁杰		雷小平	杨俊堂			王嘉兴
精英A班	高三（3）班	郭强	祝呈巧	郭  强	徐冰芳	高振元		马承宪	李炜	石  松	邢鹏飞	王嘉兴
精英B班	高三（4）班	陈新佳	李心雨	陈新佳	刘珉	吴新民		李锋	赵爱景	石  松	邢鹏飞	王嘉兴
清北A班	高三（5）班	李炜	付令军	周继兴	徐冰芳	高振元		马承宪	李炜	石  松	邢鹏飞	王嘉兴
清北B班	高三（6）班	苑运霞	李心雨	苑运霞	刘珉	吴新民		李锋	赵爱景	石  松	邢鹏飞	王嘉兴
文科A班	高三（7）班	王贤武	王贤武	田飞	黄紫琦		谭伟生			石  松	邢鹏飞	王嘉兴
文科B班	高三（8）班	谭伟生	付令军	田飞	黄紫琦		谭伟生			石  松	邢鹏飞	王嘉兴
`;

const cols = ['班型', '班号', '班主任', '语文', '数学', '英语', '物理', '历史', '化学', '生物', '政治', '地理', '体育'];

const classList = [];
const teacherMap = {};

raw.trim().split('\n').forEach((line, idx) => {
  const parts = line.split('\t').map(s => s.trim().replace(/\s+/g, ''));
  while (parts.length < cols.length) parts.push('');
  const classType = parts[0];
  const classNo = parts[1];
  const headTeacher = parts[2];
  const classItem = {
    classId: idx + 101, // 预分配 classId
    grade: '复读部',
    fullGrade: '高三复读',
    classType,
    classNo,
    className: `${classNo}·${classType}`,
    headTeacher
  };
  classList.push(classItem);

  for (let i = 3; i < cols.length; i++) {
    const subj = cols[i];
    const teacherName = parts[i];
    if (!teacherName) continue;
    if (!teacherMap[teacherName]) {
      teacherMap[teacherName] = {
        name: teacherName,
        subjects: new Set(),
        teachingClasses: [],
        headOfClasses: []
      };
    }
    teacherMap[teacherName].subjects.add(subj);
    teacherMap[teacherName].teachingClasses.push({
      classNo,
      className: classItem.className,
      classId: classItem.classId,
      subject: subj
    });
  }

  if (headTeacher) {
    if (!teacherMap[headTeacher]) {
      teacherMap[headTeacher] = {
        name: headTeacher,
        subjects: new Set(),
        teachingClasses: [],
        headOfClasses: []
      };
    }
    teacherMap[headTeacher].headOfClasses.push(classItem.className);
  }
});

console.log('=== 班级列表 (' + classList.length + '个) ===');
classList.forEach(c => {
  console.log(`${c.classId}: ${c.className} | 班主任: ${c.headTeacher}`);
});

console.log('\n=== 教师列表 (' + Object.keys(teacherMap).length + '位) ===');
Object.values(teacherMap).forEach((t, i) => {
  const subjs = Array.from(t.subjects).join('、');
  const cls = t.teachingClasses.map(c => `${c.classNo}(${c.subject})`).join('，');
  const head = t.headOfClasses.length > 0 ? ` [班主任: ${t.headOfClasses.join('、')}]` : '';
  console.log(`${i + 1}. ${t.name}: 学科=[${subjs}] 班级=[${cls}]${head}`);
});
