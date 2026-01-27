interface ToggleProps {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, disabled }: ToggleProps) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className={`relative h-6 w-12 rounded-full transition-colors ${
        checked ? 'bg-accent-500' : 'bg-dark-600'
      } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
    >
      <div
        className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform duration-200 ${
          checked ? 'translate-x-6' : 'translate-x-0'
        }`}
      />
    </button>
  );
}
