'use client';

export default function Topbar() {
  const period = 'Marzo 2026';

  return (
    <div className="h-[52px] min-h-[52px] bg-white border-b border-gray-200 flex items-center px-4 gap-[10px] z-50">
      {/* Period */}
      <div className="flex items-center gap-[6px] px-3 py-[5px] border border-gray-200 rounded-[20px] text-[13px] font-medium text-gray-700 cursor-pointer hover:bg-gray-50 whitespace-nowrap">
        📅 {period}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 h-[34px] flex-1 max-w-[380px]">
        <span className="text-gray-400 text-sm">🔍</span>
        <input
          placeholder="Buscar (Ctrl + B)"
          className="border-none bg-transparent outline-none font-inherit text-[13px] text-gray-700 w-full placeholder:text-gray-400"
        />
      </div>

      <div className="flex-1" />

      {/* User chip */}
      <div className="flex items-center gap-2 px-[10px] py-1 rounded-[20px] cursor-pointer border border-gray-200 hover:bg-gray-50">
        <div className="w-[30px] h-[30px] rounded-full bg-gradient-to-br from-[#1B1564] to-[#3730A3] flex items-center justify-center text-[11px] font-bold text-white shrink-0">
          RA
        </div>
        <span className="text-xs font-medium text-gray-700">Rene A.</span>
      </div>
    </div>
  );
}
