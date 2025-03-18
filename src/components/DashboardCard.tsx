
import React from 'react';
import { Card } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface DashboardCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color?: string;
}

const DashboardCard: React.FC<DashboardCardProps> = ({ 
  title, 
  value, 
  icon: Icon,
  color = 'darkblue' 
}) => {
  const colorVariants = {
    darkblue: 'from-darkblue-600/30 to-darkblue-800/50 border-darkblue-600/40',
    gold: 'from-gold-500/30 to-gold-700/50 border-gold-500/40',
  };

  return (
    <Card className={`card-gradient relative overflow-hidden backdrop-blur-md bg-gradient-to-br ${colorVariants[color as keyof typeof colorVariants]}`}>
      <div className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm text-gray-300 mb-1 font-medium">{title}</p>
            <h3 className="text-2xl font-bold gold-text">{value}</h3>
          </div>
          <div className="p-2 rounded-full bg-darkblue-700/60 border border-darkblue-600/50">
            <Icon size={20} className="text-gold-400" />
          </div>
        </div>
      </div>
    </Card>
  );
};

export default DashboardCard;
