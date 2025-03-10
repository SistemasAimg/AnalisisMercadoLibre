import React from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { CalendarDays } from 'lucide-react';

interface DateRangePickerProps {
  startDate: Date;
  endDate: Date;
  onChange: (dates: [Date | null, Date | null]) => void;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onChange
}) => {
  return (
    <div className="relative">
      <div className="flex items-center space-x-2">
        <CalendarDays size={20} className="text-gray-500" />
        <DatePicker
          selectsRange={true}
          startDate={startDate}
          endDate={endDate}
          onChange={onChange}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          dateFormat="dd/MM/yyyy"
          placeholderText="Seleccionar rango de fechas"
        />
      </div>
    </div>
  );
};

export default DateRangePicker;