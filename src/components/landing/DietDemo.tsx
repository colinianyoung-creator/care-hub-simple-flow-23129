import React, { useState, useEffect } from 'react';
import { Coffee, UtensilsCrossed, Cookie, Droplets } from 'lucide-react';

const meals = [
  { type: 'breakfast', icon: Coffee, label: 'Breakfast', items: 'Porridge, Toast, Tea', time: '8:00 AM' },
  { type: 'lunch', icon: UtensilsCrossed, label: 'Lunch', items: 'Soup, Sandwich', time: '12:30 PM' },
  { type: 'snack', icon: Cookie, label: 'Snack', items: 'Biscuits, Fruit', time: '3:00 PM' },
];

const DietDemo = () => {
  const [visibleMeals, setVisibleMeals] = useState<number[]>([]);
  const [hydration, setHydration] = useState(0);

  useEffect(() => {
    const mealTimer = setInterval(() => {
      setVisibleMeals(prev => {
        if (prev.length >= meals.length) {
          return [];
        }
        return [...prev, prev.length];
      });
    }, 1000);

    const hydrationTimer = setInterval(() => {
      setHydration(prev => (prev >= 100 ? 0 : prev + 25));
    }, 800);

    return () => {
      clearInterval(mealTimer);
      clearInterval(hydrationTimer);
    };
  }, []);

  return (
    <div className="space-y-3">
      {/* Meal Cards */}
      <div className="space-y-2">
        {meals.map((meal, index) => {
          const Icon = meal.icon;
          const isVisible = visibleMeals.includes(index);
          return (
            <div
              key={index}
              className={`flex items-center gap-3 p-2.5 rounded-lg bg-background border transition-all duration-500 ${
                isVisible ? 'opacity-100 translate-x-0' : 'opacity-40 -translate-x-2'
              }`}
            >
              <div className={`p-1.5 rounded-md transition-colors duration-300 ${
                isVisible ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
              }`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{meal.label}</span>
                  <span className="text-xs text-muted-foreground">{meal.time}</span>
                </div>
                {isVisible && (
                  <p className="text-xs text-muted-foreground truncate animate-fade-in">
                    {meal.items}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Hydration Bar */}
      <div className="p-2.5 rounded-lg bg-background border">
        <div className="flex items-center gap-2 mb-1.5">
          <Droplets className="h-4 w-4 text-blue-500" />
          <span className="text-xs font-medium">Hydration</span>
          <span className="text-xs text-muted-foreground ml-auto">{hydration}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-500 rounded-full transition-all duration-500"
            style={{ width: `${hydration}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default DietDemo;
