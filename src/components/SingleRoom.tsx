import React from "react";

interface SingleRoomProps {
  room: any;
  selectedRoom: any;
  setSelectedRoom: (room: any) => void;
}

const SingleRoom: React.FC<SingleRoomProps> = ({room, selectedRoom, setSelectedRoom}) => {
  return (
    <div onClick={() => setSelectedRoom(room)} className={`w-37 h-40 rounded-xl p-4 flex flex-col items-center justify-between border border-transparent cursor-pointer transition-all
  ${selectedRoom?.id === room.id 
    ? "bg-[#005ac3]"
    : room.using 
      ? "bg-[#99CCFF] hover:bg-[#99CCFF]/50"
      : "hover:bg-gray-200/50"
  }`}>

    <div className={`relative mt-2 w-28 h-20 border-2 ${selectedRoom?.id === room.id ? "border-white" : room.using ? "border-[#0066CC]" : "border-[#94a3b8]"} rounded-[25px] flex items-center justify-between px-3`}>
        {room.using && (
            <div className="flex items-start justify-between w-full h-full mt-4">
                <div className="flex flex-col items-start justify-between">
                    <span className={`text-xs font-bold ${selectedRoom?.id === room.id ? "text-white" : "text-gray-700"}`}>{room.total?.toLocaleString()}</span>
                        {(room.orders?.length ?? 0) > 0 && (
                          <div className="flex gap-6">
                            <span className="text-xs">
                              🍽️ <span className={`${selectedRoom?.id === room.id ? "text-white" : "text-gray-700"}`}>{room.orders?.length}</span>
                            </span>
                          </div>
                        )}
                </div>
                <span className={`text-xs font-bold ${selectedRoom?.id === room.id ? "text-white" : "text-gray-700"}`}>{room.minutes}p</span>
            </div>
        )}

        <div className={`absolute -top-1 left-1/4 w-6 h-0.5 ${selectedRoom?.id === room.id ? "bg-white" : room.using ? "bg-[#0066CC]" : "bg-[#94a3b8]"} rounded-full -mt-0.5`}></div>
        <div className={`absolute -top-1 right-1/4 w-6 h-0.5 ${selectedRoom?.id === room.id ? "bg-white" : room.using ? "bg-[#0066CC]" : "bg-[#94a3b8]"} rounded-full -mt-0.5`}></div>
        <div className={`absolute -bottom-1 left-1/4 w-6 h-0.5 ${selectedRoom?.id === room.id ? "bg-white" : room.using ? "bg-[#0066CC]" : "bg-[#94a3b8]"} rounded-full -mb-0.5`}></div>
        <div className={`absolute -bottom-1 right-1/4 w-6 h-0.5 ${selectedRoom?.id === room.id ? "bg-white" : room.using ? "bg-[#0066CC]" : "bg-[#94a3b8]"} rounded-full -mb-0.5`}></div>
        <div className={`absolute -left-1 top-1/3 w-0.5 h-6 ${selectedRoom?.id === room.id ? "bg-white" : room.using ? "bg-[#0066CC]" : "bg-[#94a3b8]"} rounded-full -ml-0.5`}></div>
        <div className={`absolute -right-1 top-1/3 w-0.5 h-6 ${selectedRoom?.id === room.id ? "bg-white" : room.using ? "bg-[#0066CC]" : "bg-[#94a3b8]"} rounded-full -mr-0.5`}></div>
    </div>

    <div className="text-center">
        <div className={`flex items-center justify-center font-medium text-gray-950 text-md ${selectedRoom?.id === room.id ? "text-white" : ""}`}>
        <span className="text-blue-600 mr-1">{room.start ? '🕒' : ''}</span>
        {room.name.toLocaleUpperCase()}
        </div>
    </div>
</div>
  );
}

export default SingleRoom;