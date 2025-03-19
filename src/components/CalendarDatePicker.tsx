
import React from 'react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Calendar } from './ui/calendar';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarDatePickerProps {
  selected: Date | undefined;
  onSelect: (date: Date | undefined) => void;
  onMonthChange?: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
  showNavigation?: boolean;
}

const CalendarDatePicker: React.FC<CalendarDatePickerProps> = ({
  selected,
  onSelect,
  onMonthChange,
  minDate,
  maxDate,
  className,
  showNavigation = true
}) => {
  const goToPreviousMonth = () => {
    if (selected) {
      const previousMonth = new Date(selected);
      previousMonth.setMonth(previousMonth.getMonth() - 1);
      onSelect(previousMonth);
      onMonthChange?.(previousMonth);
    }
  };

  const goToNextMonth = () => {
    if (selected) {
      const nextMonth = new Date(selected);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      onSelect(nextMonth);
      onMonthChange?.(nextMonth);
    }
  };

  const goToToday = () => {
    const today = new Date();
    onSelect(today);
    onMonthChange?.(today);
  };

  return (
    <Card className={`card-gradient p-6 ${className}`}>
      {showNavigation && (
        <div className="flex justify-between items-center mb-4">
          <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Anterior
          </Button>
          
          <Button variant="outline" size="sm" onClick={goToToday}>
            Hoje
          </Button>
          
          <Button variant="outline" size="sm" onClick={goToNextMonth}>
            Próximo
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
      
      <Calendar
        mode="single"
        selected={selected}
        onSelect={onSelect}
        locale={pt}
        className="text-gold-500 bg-darkblue-800/50 p-4 rounded-lg"
        modifiersClassNames={{
          selected: 'bg-gold-500 text-black rounded-lg',
          today: 'text-white font-bold',
        }}
        fromMonth={minDate}
        toMonth={maxDate}
      />
    </Card>
  );
};

export default CalendarDatePicker;
