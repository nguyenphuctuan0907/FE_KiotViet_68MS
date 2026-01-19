import React from 'react';

// Định nghĩa kiểu dữ liệu cho Price Rule
interface PriceRule {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  minPeople: number;
  maxPeople: number;
  pricePerHour: number;
  dayType: "NORMAL" | "WEEKEND"; // "NORMAL": Thứ 2 - Thứ 6, "WEEKEND": Thứ 7 - CN
}

interface PriceListProps {
  priceRules: PriceRule[];
  handleClickActiveRule: (rule: PriceRule) => void;
  existRoom: any
}

const PriceList: React.FC<PriceListProps> = ({ priceRules = [], handleClickActiveRule, existRoom }) => {
  // Cấu hình các cột Box
  const boxes = [
    { label: 'BOX', sub: '( 1 PEOPLE )', min: 1 },
    { label: 'BOX', sub: '( 2-3 PEOPLE )', min: 2 },
    { label: 'BOX', sub: '( 4-6 PEOPLE )', min: 4 },
    { label: 'BOX', sub: '( 7-10 PEOPLE )', min: 7 },
  ];

  // Cấu hình các hàng khung giờ
  const timeSlots = [
    { label: 'TRƯỚC 14H', start: '06:00' },
    { label: '14H - 18H', start: '14:00' },
    { label: '18H - LATE', start: '18:00' },
  ];

  // Hàm tìm giá chính xác từ data
  const getRule = (dayType: string, startTime: string, minPeople: number): PriceRule | undefined => {
    return (priceRules || []).find(
      (r) => r.dayType === dayType && r.startTime === startTime && r.minPeople === minPeople
    );
  };

  return (
    <div className="bg-[#121212] text-[#e5b567] p-6 rounded-sm shadow-2xl max-w-5xl mx-auto border-4 border-double border-[#e5b567]/20 font-mono">
      <h1 className="text-5xl font-black text-center mb-0 tracking-[0.2em] uppercase italic">Price List</h1>
      <div className="flex justify-center items-center space-x-4 mb-8">
        <div className="h-0.5 w-20 bg-[#e5b567]"></div>
        <div className="text-2xl">⚡</div>
        <div className="h-0.5 w-20 bg-[#e5b567]"></div>
      </div>

      <table className="w-full border-collapse">
        <thead>
          <tr className="text-[#e5b567] border-b-2 border-[#e5b567]">
            <th className="py-4 text-left text-xl italic pl-2">TIME</th>
            <th className="py-4 text-left text-xl italic pl-2"></th>
            {boxes.map((box, i) => (
              <th key={i} className="py-2 px-2 text-center">
                <div className="text-xl font-bold">{box.label}</div>
                <div className="text-[10px] text-gray-400 font-normal uppercase tracking-widest">{box.sub}</div>
              </th>
            ))}
          </tr>
        </thead>
        
        <tbody>
          {/* KHỐI THỨ 2 - THỨ 6 */}
          {renderSection("NORMAL", "TH 2 - TH 6", timeSlots, boxes, getRule, existRoom, handleClickActiveRule)}
          
          {/* KHOẢNG TRỐNG GIỮA BẢNG */}
          <tr className="h-10"></tr>
          
          {/* KHỐI THỨ 7 - CN */}
          {renderSection("WEEKEND", "TH 7 - CN", timeSlots, boxes, getRule, existRoom, handleClickActiveRule)}
        </tbody>
      </table>
    </div>
  );
};

// Hàm helper để render từng phần của bảng (Ngày thường / Cuối tuần)
const renderSection = (
  dayType: "NORMAL" | "WEEKEND",
  title: string,
  timeSlots: any[],
  boxes: any[],
  getRule: Function,
  existRoom: any,
  handleClickActiveRule: (rule: PriceRule) => void
) => (
  <>
    <tr className="border-b border-[#e5b567]/30">
      <td rowSpan={4} className="border-r-2 border-[#e5b567] p-2 bg-[#e5b567]/5">
        <div className="[writing-mode:vertical-lr] rotate-180 text-center font-black text-2xl tracking-tighter py-4">
          {title}
        </div>
      </td>
    </tr>
    {timeSlots.map((slot, i) => (
      <tr key={i} className="border-b border-[#e5b567]/10 hover:bg-white/5 transition-colors">
        <td className="py-6 px-4 text-sm font-bold text-white whitespace-nowrap">{slot.label}</td>
        {boxes.map((box, j) => {
          const rule = getRule(dayType, slot.start, box.min);
          const isSelected = existRoom?.priceRule?.id === rule?.id;
          return (
            <td 
              key={j}
              onClick={() => rule && handleClickActiveRule(rule)}
              className={`text-center py-4 px-2 cursor-pointer transition-all text-2xl font-bold
                ${isSelected ? 'bg-[#e5b567] text-black shadow-[0_0_15px_rgba(229,181,103,0.5)]' : 'text-[#e5b567]'}
                ${!rule ? 'opacity-20 cursor-not-allowed' : 'hover:scale-110'}
              `}
            >
              {rule ? rule.pricePerHour.toLocaleString() : '---'}
            </td>
          );
        })}
      </tr>
    ))}
  </>
);

export default PriceList;