// DateRangePicker.tsx – Permite seleccionar un rango de fechas (granularidad diaria) para la consulta.
import React, { useState } from 'react';

interface DateRange {
  start: string;
  end: string;
}

interface DateRangePickerProps {
  onChange: (range: DateRange) => void;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({ onChange }) => {
  const [start, setStart] = useState<string>('');
  const [end, setEnd] = useState<string>('');

  const applyRange = () => {
    if (start && end) {
      onChange({ start, end });
    }
  };

  return (
    <div>
      <h2>Rango de Fechas:</h2>
      <label>
        Desde: <input type="date" value={start} onChange={e => setStart(e.target.value)} />
      </label>
      <label style={{ marginLeft: '1em' }}>
        Hasta: <input type="date" value={end} onChange={e => setEnd(e.target.value)} />
      </label>
      <button onClick={applyRange} style={{ marginLeft: '1em' }}>
        Aplicar
      </button>
    </div>
  );
};

export default DateRangePicker;
