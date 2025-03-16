
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
    darkblue: 'from-darkblue-700/20 to-darkblue-900/40 border-darkblue-600/30',
    gold: 'from-gold-700/20 to-gold-900/40 border-gold-600/30',
  };

  return (
    <Card className={`card-gradient relative overflow-hidden backdrop-blur-md bg-gradient-to-br ${colorVariants[color as keyof typeof colorVariants]}`}>
      <div className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm text-gray-400 mb-1">{title}</p>
            <h3 className="text-2xl font-bold gold-text">{value}</h3>
          </div>
          <div className="p-2 rounded-full bg-darkblue-800/50 border border-darkblue-700/50">
            <Icon size={20} className="text-gold-400" />
          </div>
        </div>
      </div>
    </Card>
  );
};

export default DashboardCard;
