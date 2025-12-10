export type Rule = {
  id: string;
  name: string;
  startTime: string; // "17:00"
  endTime: string; // "20:00"
  pricePerHour: number;
  dayOfWeek: number; // 0 = ngày thường (T2-T6), 1 = cuối tuần (T7-CN)
  total?: number;
};

function getDayType(): 0 | 1 {
  const d = new Date().getDay(); // 0=CN, 1=T2,... 6=T7

  // 0 = CN, 6 = T7 → cuối tuần
  if (d === 0 || d === 6) return 1;

  // 1-5 → T2 đến T6 → ngày thường
  return 0;
}

export function getActiveAndNextRules(rules: Rule[]): {
  active: Rule[];
  next: Rule[];
} {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const dayType = getDayType();
  const active =
    rules.filter((r) => {
      const s = toMinutes(r.startTime);
      const e = toMinutes(r.endTime);
      return nowMin >= s && nowMin < e && r.dayOfWeek === dayType;
    }) || null;

  const next = rules
    .filter((r) => {
      const s = toMinutes(r.startTime);
      return s > nowMin && r.dayOfWeek === dayType; // khung giờ sau
    })
    .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));

  return { active, next };
}

function toMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export const priceRules = [
  // Box 1 người
  {
    id: "priceRules-1",
    name: "Box 1 người",
    startTime: "06:00",
    endTime: "13:59",
    minPeople: 1,
    maxPeople: 1,
    pricePerHour: 15000,
    dayOfWeek: 0,
  },
  {
    id: "priceRules-2",
    name: "Box 1 người",
    startTime: "14:00",
    endTime: "17:59",
    minPeople: 1,
    maxPeople: 1,
    pricePerHour: 30000,
    dayOfWeek: 0,
  },
  {
    id: "priceRules-3",
    name: "Box 1 người",
    startTime: "18:00",
    endTime: "05:59",
    minPeople: 1,
    maxPeople: 1,
    pricePerHour: 60000,
    dayOfWeek: 0,
  },
  // Box 2-3 người
  {
    id: "priceRules-4",
    name: "Box 2-3 người",
    startTime: "06:00",
    endTime: "13:59",
    minPeople: 2,
    maxPeople: 3,
    pricePerHour: 25000,
    dayOfWeek: 0,
  },
  {
    id: "priceRules-5",
    name: "Box 2-3 người",
    startTime: "14:00",
    endTime: "17:59",
    minPeople: 2,
    maxPeople: 3,
    pricePerHour: 45000,
    dayOfWeek: 0,
  },
  {
    id: "priceRules-6",
    name: "Box 2-3 người",
    startTime: "18:00",
    endTime: "05:59",
    minPeople: 2,
    maxPeople: 3,
    pricePerHour: 85000,
    dayOfWeek: 0,
  },
  // Box 4-6 người
  {
    id: "priceRules-7",
    name: "Box 4-6 người",
    startTime: "06:00",
    endTime: "13:59",
    minPeople: 4,
    maxPeople: 6,
    pricePerHour: 30000,
    dayOfWeek: 0,
  },
  {
    id: "priceRules-8",
    name: "Box 4-6 người",
    startTime: "14:00",
    endTime: "17:59",
    minPeople: 4,
    maxPeople: 6,
    pricePerHour: 55000,
    dayOfWeek: 0,
  },
  {
    id: "priceRules-9",
    name: "Box 4-6 người",
    startTime: "18:00",
    endTime: "05:59",
    minPeople: 4,
    maxPeople: 6,
    pricePerHour: 115000,
    dayOfWeek: 0,
  },
  // Box 7-10 người
  {
    id: "priceRules-10",
    name: "Box 7-10 người",
    startTime: "06:00",
    endTime: "13:59",
    minPeople: 7,
    maxPeople: 10,
    pricePerHour: 45000,
    dayOfWeek: 0,
  },
  {
    id: "priceRules-11",
    name: "Box 7-10 người",
    startTime: "14:00",
    endTime: "17:59",
    minPeople: 7,
    maxPeople: 10,
    pricePerHour: 65000,
    dayOfWeek: 0,
  },
  {
    id: "priceRules-12",
    name: "Box 7-10 người",
    startTime: "18:00",
    endTime: "05:59",
    minPeople: 7,
    maxPeople: 10,
    pricePerHour: 135000,
    dayOfWeek: 0,
  },
  // cuối tuần
  {
    id: "priceRules-13",
    name: "Box 2-3 người",
    startTime: "06:00",
    endTime: "13:59",
    minPeople: 2,
    maxPeople: 3,
    pricePerHour: 45000,
    dayOfWeek: 1,
  },
  {
    id: "priceRules-14",
    name: "Box 2-3 người",
    startTime: "14:00",
    endTime: "17:59",
    minPeople: 2,
    maxPeople: 3,
    pricePerHour: 65000,
    dayOfWeek: 1,
  },
  {
    id: "priceRules-15",
    name: "Box 2-3 người",
    startTime: "18:00",
    endTime: "05:59",
    minPeople: 2,
    maxPeople: 3,
    pricePerHour: 90000,
    dayOfWeek: 1,
  },
];

export function calculateMinutesRounded(startTime: number, endTime: number): number {
  console.log({ startTime, endTime });
  if (!startTime || !endTime) return 0.001;
  if (endTime <= startTime) {
    return 0.001;
  }
  const diffInMs = endTime - startTime;
  const minutes = diffInMs / (1000 * 60);
  return Math.ceil(minutes);
}

export function calculateHoursRounded(minutes: number): number {
  if (!minutes) return 0.001;
  const hours = minutes / 60;

  return Math.ceil(hours * 1000) / 1000; // làm tròn lên 3 chữ số thập phân
}

export function calculatePrice(minutes: number, pricePerHour: number): number {
  if (!minutes || !pricePerHour) return 0;
  const hours = minutes / 60;
  return Math.ceil(hours * pricePerHour);
}
