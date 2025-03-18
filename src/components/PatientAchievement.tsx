
import React from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface PatientAchievementProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  progress: number;
  completed: boolean;
}

export const PatientAchievement: React.FC<PatientAchievementProps> = ({
  title,
  description,
  icon,
  progress,
  completed
}) => {
  return (
    <Card className={cn(
      "overflow-hidden relative hover:scale-105 transition-transform duration-300", 
      completed ? "card-gradient border-gold-400/50" : "bg-darkblue-700/60 border-darkblue-600/50"
    )}>
      <div className="p-4">
        <div className="flex items-center gap-3 mb-2">
          <div className={cn(
            "p-2 rounded-full",
            completed ? "bg-darkblue-600/70" : "bg-darkblue-700/70"
          )}>
            {icon}
          </div>
          <h3 className="font-semibold text-white">
            {title}
          </h3>
        </div>
        
        <p className="text-xs text-gray-300 mb-3">
          {description}
        </p>
        
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs">
            <span className="text-gray-200">{completed ? "Completo" : `${progress}%`}</span>
            {completed && <span className="text-gold-400 font-medium">+50 pontos</span>}
          </div>
          
          <Progress 
            value={progress} 
            className={cn(
              "h-2 bg-darkblue-700/70",
              completed ? "bg-gold-500" : "bg-blue-500"
            )}
          />
        </div>
      </div>
    </Card>
  );
};
