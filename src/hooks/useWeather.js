import { useQuery } from '@tanstack/react-query';
import { getCurrentWeather } from '../services/weather';

/** Current weather, cached for 30 minutes. data is null when unavailable. */
export function useWeather() {
  return useQuery({
    queryKey: ['weather'],
    queryFn: getCurrentWeather,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}
