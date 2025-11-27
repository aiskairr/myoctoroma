import { LocaleToggle } from '@/components/ui/locale-toggle';
import { BranchSelectorMobile } from "./BranchSelectorMobile";
import LOGO from "./assets/PROM_logo_big_white.svg"

export function MobileHeader() {
  return (
    <div className="bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700/50 shadow-lg px-3 py-2 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-2">
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-1.5 rounded-md shadow-md">
          <img width={14} height={7} src={LOGO} alt="logo" />
        </div>
        <h1 className="font-bold text-base bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Octō CRM</h1>
      </div>

      <div className="flex items-center gap-2">
        <LocaleToggle />
        <BranchSelectorMobile />
      </div>
    </div>
  );
}
