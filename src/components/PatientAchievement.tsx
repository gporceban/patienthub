
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
      completed ? "card-gradient border-gold-500/30" : "bg-darkblue-800/50 border-darkblue-700"
    )}>
      <div className="p-4">
        <div className="flex items-center gap-3 mb-2">
          <div className={cn(
            "p-2 rounded-full",
            completed ? "bg-darkblue-700" : "bg-darkblue-800"
          )}>
            {icon}
          </div>
          <h3 className="font-semibold">
            {title}
          </h3>
        </div>
        
        <p className="text-xs text-gray-400 mb-3">
          {description}
        </p>
        
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs">
            <span>{completed ? "Completo" : `${progress}%`}</span>
            {completed && <span className="text-gold-400">+50 pontos</span>}
          </div>
          
          <Progress 
            value={progress} 
            className={cn(
              "h-1.5 bg-darkblue-700",
              completed ? "bg-gold-500" : "bg-blue-500"
            )}
          />
        </div>
      </div>
    </Card>
  );
};
