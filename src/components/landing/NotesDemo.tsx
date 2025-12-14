import React, { useState, useEffect } from 'react';
import { CheckSquare, Square, FileText } from 'lucide-react';

const notes = [
  { type: 'note', title: 'Morning routine', preview: 'Had breakfast, took medications...' },
  { type: 'task', title: 'Book GP appointment', completed: false },
  { type: 'task', title: 'Order prescriptions', completed: true },
];

const NotesDemo = () => {
  const [taskStates, setTaskStates] = useState([false, true]);
  const [activeNote, setActiveNote] = useState<number | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveNote(prev => (prev === null ? 0 : null));
      setTaskStates(prev => [!prev[0], prev[1]]);
    }, 2000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-2">
      {/* Note Card */}
      <div
        className={`p-3 rounded-lg bg-background border transition-all duration-300 cursor-pointer ${
          activeNote === 0 ? 'shadow-md scale-[1.02]' : ''
        }`}
      >
        <div className="flex items-start gap-2">
          <FileText className="h-4 w-4 text-primary mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm">Morning routine</div>
            <div className={`text-xs text-muted-foreground transition-all duration-300 ${
              activeNote === 0 ? 'line-clamp-none' : 'line-clamp-1'
            }`}>
              {activeNote === 0 
                ? 'Had breakfast at 8am, took morning medications. Mood was good. Went for a short walk in the garden.'
                : 'Had breakfast, took medications...'}
            </div>
          </div>
        </div>
      </div>

      {/* Task Cards */}
      {[
        { title: 'Book GP appointment', index: 0 },
        { title: 'Order prescriptions', index: 1 },
      ].map((task, i) => (
        <div
          key={i}
          className="flex items-center gap-2 p-3 rounded-lg bg-background border transition-all duration-300"
        >
          <div className={`transition-all duration-300 ${taskStates[task.index] ? 'text-green-500' : 'text-muted-foreground'}`}>
            {taskStates[task.index] ? (
              <CheckSquare className="h-4 w-4 animate-scale-in" />
            ) : (
              <Square className="h-4 w-4" />
            )}
          </div>
          <span className={`text-sm transition-all duration-300 ${
            taskStates[task.index] ? 'line-through text-muted-foreground' : ''
          }`}>
            {task.title}
          </span>
        </div>
      ))}
    </div>
  );
};

export default NotesDemo;
