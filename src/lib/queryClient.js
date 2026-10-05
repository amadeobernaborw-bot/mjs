import { QueryClient } from '@tanstack/react-query';

/**
 * Caché compartida de datos del admin. staleTime corto: al volver al Inicio
 * se muestra lo cacheado al instante y se refresca en segundo plano (otras
 * pantallas todavía escriben sin pasar por TanStack Query).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      retry: 1,
    },
  },
});
