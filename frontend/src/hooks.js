import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api.js';

export function useAsync(fn, deps = []) {
  const [s, set] = useState({ status: 'loading' });
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const reload = useCallback(async () => {
    set((p) => (p.data ? { ...p, status: 'refreshing' } : { status: 'loading' }));
    try {
      const data = await fnRef.current();
      set({ status: 'ok', data });
    } catch (e) {
      set({ status: 'error', error: e.message });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { reload(); }, [reload]);
  return { ...s, reload };
}

export function usePoll(fn, seconds, deps = []) {
  const r = useAsync(fn, deps);
  useEffect(() => {
    const id = setInterval(() => { if (!document.hidden) r.reload(); }, seconds * 1000);
    return () => clearInterval(id);
  }, [r.reload, seconds]);
  return r;
}

let airportsPromise;
export function useAirports() {
  const [list, setList] = useState([]);
  useEffect(() => {
    airportsPromise ||= api('/airports').then((d) => d.airports).catch((e) => { airportsPromise = null; throw e; });
    airportsPromise.then(setList).catch(() => {});
  }, []);
  return list;
}

export function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id); }, []);
  return now;
}

export function useDocTitle(title) {
  useEffect(() => {
    const prev = document.title;
    document.title = title ? `${title} — AeroNex` : prev;
    return () => { document.title = prev; };
  }, [title]);
}
