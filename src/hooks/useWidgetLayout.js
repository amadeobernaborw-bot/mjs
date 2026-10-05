import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { friendlyDbError, supabase, TABLES } from '../lib/supabase';

const layoutKey = (screen) => ['widget-layout', screen];

/** Error de guardado con un mensaje listo para mostrar. */
export class LayoutSaveError extends Error {
  constructor(message, { isConflict = false, cause } = {}) {
    super(message);
    this.name = 'LayoutSaveError';
    this.isConflict = isConflict;
    this.cause = cause;
  }
}

function toSaveError(error) {
  const message = error?.message || '';
  if (/layout_conflict/.test(message)) {
    return new LayoutSaveError(
      'El diseño se guardó desde otra pestaña o dispositivo. Recargá la página para ver la última versión.',
      { isConflict: true, cause: error },
    );
  }
  if (/invalid_layout/.test(message)) {
    return new LayoutSaveError('El diseño tiene tarjetas superpuestas o fuera de la grilla. Revisalo y volvé a guardar.', { cause: error });
  }
  const friendly = friendlyDbError(error);
  // Solo se muestra el texto propio de la migración faltante; el resto queda en `cause`
  return new LayoutSaveError(
    /migración/.test(friendly) ? friendly : 'No se pudo guardar el diseño. Revisá tu conexión e intentá de nuevo.',
    { cause: error },
  );
}

/**
 * Adaptador de persistencia del layout de una pantalla para el usuario actual.
 * `data` es { items, updatedAt }: items es null si nunca se guardó (se usa el de
 * fábrica). updatedAt viaja como string para no perder los microsegundos que
 * usa la concurrencia optimista.
 */
export function useWidgetLayout(screen) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: layoutKey(screen),
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.dashboardLayouts)
        .select('items, updated_at')
        .eq('screen', screen)
        .maybeSingle();
      if (error) throw new LayoutSaveError(friendlyDbError(error), { cause: error });
      return { items: data?.items ?? null, updatedAt: data?.updated_at ?? null };
    },
    // Lo cambia solo el guardado (que actualiza la caché) u otra pestaña
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const mutation = useMutation({
    mutationFn: async ({ items, expectedUpdatedAt }) => {
      const { data, error } = await supabase.rpc('save_dashboard_layout', {
        p_screen: screen,
        p_items: items,
        p_expected_updated_at: expectedUpdatedAt,
      });
      if (error) throw toSaveError(error);
      return { items, updatedAt: data };
    },
    onSuccess: (saved) => {
      // Primero la caché con lo guardado, después el refetch: así las tarjetas no
      // saltan al layout viejo mientras vuelve la respuesta.
      queryClient.setQueryData(layoutKey(screen), saved);
      queryClient.invalidateQueries({ queryKey: layoutKey(screen) });
    },
  });

  return {
    data: query.data,
    isLoading: query.isPending,
    // Un refetch fallido con datos válidos en caché no es un error de carga
    loadError: query.isError && query.data === undefined ? query.error : null,
    /** Vuelve a leer el layout guardado y devuelve { items, updatedAt }. */
    reload: async () => (await query.refetch({ throwOnError: true })).data,
    save: mutation.mutateAsync,
    isSaving: mutation.isPending,
  };
}
