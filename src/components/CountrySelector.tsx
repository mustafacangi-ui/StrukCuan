import { Globe } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const COUNTRIES = [
  { code: "ID", label: "🇮🇩 Indonesia", name: "Indonesia" },
  { code: "DE", label: "🇩🇪 Deutschland", name: "Deutschland" },
  { code: "TR", label: "🇹🇷 Türkiye", name: "Türkiye" },
] as const;

interface CountrySelectorProps {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
  className?: string;
}

export function CountrySelector({
  value,
  onChange,
  disabled = false,
  className = "",
}: CountrySelectorProps) {
  const code = (value ?? "ID").toUpperCase().slice(0, 2);
  const selected = COUNTRIES.find((c) => c.code === code) ?? COUNTRIES[0];

  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-2">
        <Globe size={16} className="text-[#00FF88]" />
        <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">
          Test Region
        </span>
      </div>
      <Select
        value={code}
        onValueChange={onChange}
        disabled={disabled}
      >
        <SelectTrigger className="card-radar border-[#00FF88]/20 h-12 bg-white/5 text-white">
          <SelectValue>
            <span className="flex items-center gap-2">
              {selected.label}
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-[#0d1321] border-white/10">
          {COUNTRIES.map((c) => (
            <SelectItem
              key={c.code}
              value={c.code}
              className="text-white focus:bg-white/10 focus:text-white"
            >
              {c.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-[10px] text-white/50 mt-1.5">
        Ödüller ve içerik bu ülkeye göre filtrelenir
      </p>
    </div>
  );
}
