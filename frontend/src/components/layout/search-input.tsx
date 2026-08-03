import { Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { Input } from '../ui/input';

export function SearchInput() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [value, setValue] = useState(() => (location.pathname === '/employees' ? searchParams.get('q') ?? '' : ''));
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (location.pathname !== '/employees') {
      setValue('');
    }
  }, [location.pathname]);

  const handleChange = (next: string) => {
    setValue(next);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(next ? { q: next } : {});
      navigate({ pathname: '/employees', search: params.toString() });
    }, 300);
  };

  return (
    <div className="relative hidden w-64 md:block">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(event) => handleChange(event.target.value)}
        placeholder="Search employees..."
        className="pl-9"
        aria-label="Search employees"
      />
    </div>
  );
}
