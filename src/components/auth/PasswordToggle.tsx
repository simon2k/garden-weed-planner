import { Eye, EyeOff } from "lucide-react";

interface PasswordToggleProps {
  visible: boolean;
  onToggle: () => void;
}

export function PasswordToggle({ visible, onToggle }: PasswordToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="absolute top-1/2 right-3 -translate-y-1/2 text-emerald-700/55 transition-colors hover:text-emerald-900 focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:outline-none"
      aria-label={visible ? "Ukryj hasło" : "Pokaż hasło"}
    >
      {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
    </button>
  );
}
