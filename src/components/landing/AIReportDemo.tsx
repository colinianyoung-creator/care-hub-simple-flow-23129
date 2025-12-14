import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';

const reportText = "Summary: The care recipient had a positive week overall. Medication adherence was 95% with one refused dose documented. Three minor incidents were recorded on the body map. Daily activities included walks, physiotherapy, and social visits. Mood has been consistently good.";

const AIReportDemo = () => {
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    let index = 0;
    let timeout: NodeJS.Timeout;
    
    const type = () => {
      if (index < reportText.length) {
        setDisplayText(reportText.slice(0, index + 1));
        index++;
        timeout = setTimeout(type, 30);
      } else {
        setIsTyping(false);
        setTimeout(() => {
          setDisplayText('');
          index = 0;
          setIsTyping(true);
          type();
        }, 3000);
      }
    };

    type();

    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className={`p-1.5 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 ${isTyping ? 'animate-pulse' : ''}`}>
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <span className="text-sm font-medium">AI Care Summary</span>
        {isTyping && (
          <div className="flex gap-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )}
      </div>
      
      {/* Report Content */}
      <div className="p-3 rounded-lg bg-background border min-h-[100px]">
        <p className="text-xs text-muted-foreground leading-relaxed">
          {displayText}
          {isTyping && <span className="inline-block w-0.5 h-3 bg-primary animate-pulse ml-0.5" />}
        </p>
      </div>
      
      {/* Features */}
      <div className="flex flex-wrap gap-2">
        {['Medication', 'Activities', 'Mood', 'Incidents'].map((tag, i) => (
          <span 
            key={tag}
            className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary animate-fade-in"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
};

export default AIReportDemo;
