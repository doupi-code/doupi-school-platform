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

// 拼音映射表
const pinyinMap = {
  '周珲': 'zhouhui',
  '王贤武': 'wangxianwu',
  '涂瑞志': 'turuizhi',
  '吴显品': 'wuxianpin',
  '金传汉': 'jinchuanhan',
  '许雪玲': 'xuxueling',
  '石松': 'shisong',
  '邢鹏飞': 'xingpengfei',
  '王嘉兴': 'wangjiaxing',
  '李寄宁': 'lijining',
  '赵前利': 'zhaoqianli',
  '陈新佳': 'chenxinjia',
  '孙仁杰': 'sunrenjie',
  '雷小平': 'leixiaoping',
  '杨俊堂': 'yangjuntang',
  '郭强': 'guoqiang',
  '祝呈巧': 'zhuchengqiao',
  '徐冰芳': 'xubingfang',
  '高振元': 'gaozhenyuan',
  '马承宪': 'machengxian',
  '李炜': 'liwei',
  '李心雨': 'lixinyu',
  '刘珉': 'liumin',
  '吴新民': 'wuxinmin',
  '李锋': 'lifeng',
  '赵爱景': 'zhaoaijing',
  '付令军': 'fulingjun',
  '周继兴': 'zhoujixing',
  '苑运霞': 'yuanyunxia',
  '田飞': 'tianfei',
  '黄紫琦': 'huangziqi',
  '谭伟生': 'tanweisheng'
};

const classList = [];
const teacherMap = {};

raw.trim().split('\n').forEach((line, idx) => {
  const parts = line.split('\t').map(s => s.trim().replace(/\s+/g, ''));
  while (parts.length < cols.length) parts.push('');
  const classType = parts[0];
  const classNo = parts[1];
  const headTeacher = parts[2];
  const classId = 101 + idx;
  const className = `${classNo}·${classType}`;
  classList.push({
    classId,
    grade: '复读部',
    className,
    classType,
    classNo,
    headTeacher
  });

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
      classId,
      classNo,
      className,
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
    teacherMap[headTeacher].headOfClasses.push(className);
  }
});

// 构建结构化教师数据
const teacherList = Object.keys(teacherMap).map((name, index) => {
  const t = teacherMap[name];
  const teacherId = 101 + index;
  const userId = 101 + index;
  const userName = pinyinMap[name] || `teacher_${teacherId}`;
  const subjects = Array.from(t.subjects).join('、');
  const classIds = t.teachingClasses.map(c => c.classId).filter((v, i, a) => a.indexOf(v) === i).join(',');
  const classNames = t.teachingClasses.map(c => c.className).filter((v, i, a) => a.indexOf(v) === i).join('；');
  const headRemark = t.headOfClasses.length > 0 ? `高复部班主任（${t.headOfClasses.join('、')}）` : '';
  const teachRemark = `任教班级：${classNames}`;
  const remark = headRemark ? `${headRemark}，${teachRemark}` : teachRemark;
  const phone = `138000100${String(index + 1).padStart(2, '0')}`;
  const email = `${userName}@doupi.edu`;

  return {
    teacherId,
    userId,
    userName,
    name,
    subjects,
    classIds,
    classNames,
    isHead: t.headOfClasses.length > 0,
    headClasses: t.headOfClasses.join('、'),
    phone,
    email,
    remark
  };
});

console.log(`已提取班级数: ${classList.length}, 教师数: ${teacherList.length}`);

// 导出为 JSON 供检查和生成 SQL
fs.writeFileSync('scripts/parsed_schedule_data.json', JSON.stringify({ classList, teacherList }, null, 2), 'utf8');
console.log('数据已保存到 scripts/parsed_schedule_data.json');
