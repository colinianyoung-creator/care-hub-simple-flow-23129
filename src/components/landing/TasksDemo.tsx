import React, { useState, useEffect } from 'react';
import { CheckSquare, Square, RotateCcw, AlertCircle } from 'lucide-react';

const tasks = [
  { title: 'Morning medication check', priority: 'high', recurring: true },
  { title: 'Prepare lunch', priority: 'medium', recurring: false },
  { title: 'Afternoon walk', priority: 'low', recurring: true },
  { title: 'Evening care notes', priority: 'medium', recurring: false },
];

const TasksDemo = () => {
  const [completedTasks, setCompletedTasks] = useState<number[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCompletedTasks(prev => {
        if (prev.length >= tasks.length) {
          return [];
        }
        return [...prev, prev.length];
      });
    }, 1200);

    return () => clearInterval(timer);
  }, []);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-green-500';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="space-y-2">
      {tasks.map((task, index) => {
        const isCompleted = completedTasks.includes(index);
        return (
          <div
            key={index}
            className={`flex items-center gap-2 p-2.5 rounded-lg bg-background border transition-all duration-300 ${
              isCompleted ? 'opacity-60' : ''
            }`}
          >
            <div className={`transition-all duration-300 ${isCompleted ? 'text-green-500' : 'text-muted-foreground'}`}>
              {isCompleted ? (
                <CheckSquare className="h-4 w-4 animate-scale-in" />
              ) : (
                <Square className="h-4 w-4" />
              )}
            </div>
            <span className={`text-sm flex-1 transition-all duration-300 ${
              isCompleted ? 'line-through text-muted-foreground' : ''
            }`}>
              {task.title}
            </span>
            <div className="flex items-center gap-1">
              {task.recurring && (
                <RotateCcw className="h-3 w-3 text-primary" />
              )}
              <AlertCircle className={`h-3 w-3 ${getPriorityColor(task.priority)}`} />
            </div>
          </div>
        );
      })}
      
      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs pt-1">
        <div className="flex items-center gap-1">
          <RotateCcw className="h-3 w-3 text-primary" />
          <span className="text-muted-foreground">Recurring</span>
        </div>
        <div className="flex items-center gap-1">
          <AlertCircle className="h-3 w-3 text-red-500" />
          <span className="text-muted-foreground">Priority</span>
        </div>
      </div>
    </div>
  );
};

export default TasksDemo;
