import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ArrowLeft, Clock, Sparkles } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export const Invoice: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4 animate-fadeIn">
      <Card className="max-w-md w-full p-8 text-center rounded-[24px] shadow-apple-lg border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-gray-900">
        <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-[#0071E3]/10 dark:bg-[#0071E3]/20 text-apple-accent flex items-center justify-center shadow-apple-sm relative">
          <FileText className="w-8 h-8" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500" />
          </span>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 mb-3">
          <Clock className="w-3.5 h-3.5" />
          <span>Available Soon</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight mb-2">
          Invoice & Billing
        </h1>

        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-6 max-w-sm mx-auto">
          We are building an automated lease invoicing, GST tax billing, and tenant receipt tracking portal. This section is currently under development and will be available soon for everyone.
        </p>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 mb-6 text-left space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <Sparkles className="w-4 h-4 text-apple-accent" />
            <span>Upcoming Capabilities:</span>
          </div>
          <ul className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1 list-disc list-inside">
            <li>Automated monthly lease invoices & tax calculation</li>
            <li>Instant PDF invoice generation & client dispatch</li>
            <li>Direct payment reconciliation with hub accounts</li>
          </ul>
        </div>

        <Button
          variant="outline"
          onClick={() => navigate('/')}
          className="w-full rounded-xl"
          icon={<ArrowLeft className="w-4 h-4" />}
        >
          Return to Dashboard
        </Button>
      </Card>
    </div>
  );
};

export default Invoice;
