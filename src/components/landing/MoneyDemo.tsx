import { Wallet, Receipt, TrendingUp, TrendingDown } from 'lucide-react';

const MoneyDemo = () => {
  return (
    <div className="w-full space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Wallet className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium">Money Tracking</span>
        </div>
        <span className="text-[10px] text-muted-foreground">Jan 2026</span>
      </div>
      
      {/* Balance summary */}
      <div className="flex gap-2">
        <div className="flex-1 bg-green-500/10 rounded-md p-2 border border-green-500/20">
          <div className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-green-600" />
            <span className="text-[10px] text-green-600">Income</span>
          </div>
          <p className="text-sm font-semibold text-green-600">£120.00</p>
        </div>
        <div className="flex-1 bg-red-500/10 rounded-md p-2 border border-red-500/20">
          <div className="flex items-center gap-1">
            <TrendingDown className="h-3 w-3 text-red-600" />
            <span className="text-[10px] text-red-600">Expenses</span>
          </div>
          <p className="text-sm font-semibold text-red-600">£45.50</p>
        </div>
      </div>
      
      {/* Recent entries */}
      <div className="space-y-1">
        <div className="flex items-center justify-between bg-background/60 rounded px-2 py-1 text-xs">
          <div className="flex items-center gap-1.5">
            <Receipt className="h-3 w-3 text-muted-foreground" />
            <span>Groceries</span>
          </div>
          <span className="text-red-600">-£32.50</span>
        </div>
        <div className="flex items-center justify-between bg-background/60 rounded px-2 py-1 text-xs">
          <div className="flex items-center gap-1.5">
            <Receipt className="h-3 w-3 text-muted-foreground" />
            <span>Transport</span>
          </div>
          <span className="text-red-600">-£13.00</span>
        </div>
      </div>
    </div>
  );
};

export default MoneyDemo;
