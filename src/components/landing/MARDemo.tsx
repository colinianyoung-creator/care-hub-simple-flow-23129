import React, { useState, useEffect } from 'react';
import { Check, Clock, X } from 'lucide-react';

const medications = [
  { name: 'Paracetamol', dose: '500mg', time: '09:00' },
  { name: 'Ibuprofen', dose: '200mg', time: '13:00' },
  { name: 'Vitamin D', dose: '1000IU', time: '09:00' },
];

type Status = 'pending' | 'given' | 'refused';

const MARDemo = () => {
  const [statuses, setStatuses] = useState<Status[]>(['pending', 'pending', 'pending']);
  const [animatingIndex, setAnimatingIndex] = useState<number | null>(null);

  useEffect(() => {
    const sequence: Status[][] = [
      ['pending', 'pending', 'pending'],
      ['given', 'pending', 'pending'],
      ['given', 'given', 'pending'],
      ['given', 'given', 'refused'],
    ];
    
    let step = 0;
    const timer = setInterval(() => {
      step = (step + 1) % sequence.length;
      const changedIndex = sequence[step].findIndex((s, i) => s !== statuses[i]);
      setAnimatingIndex(changedIndex >= 0 ? changedIndex : null);
      setStatuses(sequence[step]);
    }, 1500);

    return () => clearInterval(timer);
  }, []);

  const getStatusIcon = (status: Status) => {
    switch (status) {
      case 'given':
        return <Check className="h-4 w-4 text-white" />;
      case 'refused':
        return <X className="h-4 w-4 text-white" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBg = (status: Status) => {
    switch (status) {
      case 'given':
        return 'bg-green-500';
      case 'refused':
        return 'bg-red-500';
      default:
        return 'bg-muted';
    }
  };

  return (
    <div className="space-y-2">
      {medications.map((med, index) => (
        <div
          key={index}
          className={`flex items-center justify-between p-2 rounded-lg bg-background border transition-all duration-300 ${
            animatingIndex === index ? 'scale-[1.02] shadow-md' : ''
          }`}
        >
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">{med.name}</div>
            <div className="text-xs text-muted-foreground">
              {med.dose} • {med.time}
            </div>
          </div>
          <div
            className={`p-1.5 rounded-full transition-all duration-300 ${getStatusBg(statuses[index])} ${
              animatingIndex === index ? 'animate-scale-in' : ''
            }`}
          >
            {getStatusIcon(statuses[index])}
          </div>
        </div>
      ))}
      
      <div className="flex gap-3 text-xs pt-2">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
            <Check className="h-2.5 w-2.5 text-white" />
          </div>
          <span className="text-muted-foreground">Given</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
            <X className="h-2.5 w-2.5 text-white" />
          </div>
          <span className="text-muted-foreground">Refused</span>
        </div>
      </div>
    </div>
  );
};

export default MARDemo;
