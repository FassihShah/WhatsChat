const cache = new Map<string, any>();
const loading = new Set<string>();
const errors = new Set<string>();

export const mediaCache = {
  get(id: string): any | null {
    return cache.get(id) || null;
  },
  set(id: string, data: any) {
    cache.set(id, data);
    loading.delete(id);
    errors.delete(id);
  },
  isLoading(id: string) {
    return loading.has(id);
  },
  setLoading(id: string) {
    loading.add(id);
  },
  setError(id: string) {
    errors.delete(id);
    loading.delete(id);
    errors.add(id);
  },
  hasError(id: string) {
    return errors.has(id);
  },
};
