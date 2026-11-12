import { useId, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

interface Option<T> {
  value: T;
  label: string;
}

export function DuoSelect<T extends string>({ label, value, options, onChange }: {
  label: string;
  value: T | '';
  options: readonly Option<T>[];
  onChange(value: T): void;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const selected = options.findIndex(option => option.value === value);
  const show = () => { setActive(Math.max(selected, 0)); setOpen(true); };
  function choose(index: number) {
    const option = options[index];
    if (option) onChange(option.value);
    setOpen(false);
  }

  return <div className="duo-select" onBlur={() => setOpen(false)}>
    <span id={id + '-label'}>{label}</span>
    <button type="button" role="combobox" aria-labelledby={id + '-label'} aria-describedby={id + '-value'}
      aria-expanded={open} aria-controls={id + '-options'}
      aria-activedescendant={open && options[active] ? id + '-' + active : undefined}
      onClick={() => open ? setOpen(false) : show()}
      onKeyDown={event => {
        if (event.key === 'Escape' && open) {
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
        } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          if (!open) show();
          else setActive(index => (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length);
        } else if (open && (event.key === 'Home' || event.key === 'End')) {
          event.preventDefault();
          setActive(event.key === 'Home' ? 0 : options.length - 1);
        } else if (open && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          choose(active);
        }
      }}>
      <span id={id + '-value'}>{options[selected]?.label ?? 'Choose an option'}</span><ChevronDown size={16} aria-hidden="true"/>
    </button>
    <ul role="listbox" id={id + '-options'} aria-labelledby={id + '-label'} hidden={!open}>
      {options.map((option, index) => <li key={option.value} id={id + '-' + index} role="option"
        aria-selected={option.value === value} data-active={index === active}
        onPointerMove={() => setActive(index)} onMouseDown={event => event.preventDefault()} onClick={() => choose(index)}>
        <span>{option.label}</span>{option.value === value && <Check size={16} aria-hidden="true"/>}
      </li>)}
    </ul>
  </div>;
}
