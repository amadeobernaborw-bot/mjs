// Acceso a Supabase del inventario: modelos (catalog_models) y variantes (products).
// Todas las funciones tiran el error de Supabase; la pantalla decide cómo mostrarlo.
import { supabase, TABLES, BUCKETS, friendlyDbError } from '../supabase';
import { allRows } from '../pagination';
import { validateImageFile } from '../image';
import { buildVariantName } from './variants';

const must = ({ data, error }) => {
  if (error) throw error;
  return data;
};

export async function fetchInventory() {
  const [models, variants] = await Promise.all([
    allRows(() => supabase.from(TABLES.catalogModels).select('*').order('id')),
    allRows(() => supabase.from(TABLES.products).select('*').order('id')),
  ]);
  return { models, variants };
}

/** Campos de products que dependen del modelo (se repiten para filtrar y facturar). */
const modelFields = (model, variant) => ({
  model_id: model.id,
  model: model.name,
  category: model.type_name,
  name: buildVariantName(model.name, variant),
});

const toNumberOrNull = (v) => (v === '' || v == null ? null : Number(v));

/** Fila lista para guardar a partir del formulario de variante. */
export function variantPayload(model, form) {
  return {
    ...modelFields(model, form),
    capacity: form.capacity || null,
    color: form.color || null,
    condition: form.condition || null,
    battery_health: toNumberOrNull(form.battery_health),
    description: form.description?.trim() || null,
    price_ars: toNumberOrNull(form.price_ars),
    price_usd: toNumberOrNull(form.price_usd),
    stock: Number(form.stock) || 0,
    image_url: form.image_url || null,
    is_active: !!form.is_active,
  };
}

/**
 * Crea o actualiza un modelo. Si cambia el nombre o el tipo, rehace el nombre
 * y la categoría de sus variantes para que facturas y tienda sigan coincidiendo.
 * @returns {Promise<object>} el modelo guardado
 */
export async function saveModel(form, variantsOfModel = []) {
  const row = {
    type_name: form.type_name,
    name: form.name.trim(),
    line: form.line?.trim() || null,
    description: form.description?.trim() || null,
    image_url: form.image_url || null,
    is_active: !!form.is_active,
  };
  if (!row.name) throw new Error('El modelo necesita un nombre.');
  if (!form.id) {
    return must(await supabase.from(TABLES.catalogModels).insert(row).select().single());
  }
  const saved = must(await supabase.from(TABLES.catalogModels).update(row).eq('id', form.id).select().single());
  const stale = variantsOfModel.filter((v) => v.model !== saved.name || v.category !== saved.type_name
    || v.name !== buildVariantName(saved.name, v));
  await Promise.all(stale.map(async (v) => must(
    await supabase.from(TABLES.products).update(modelFields(saved, v)).eq('id', v.id)
  )));
  return saved;
}

export async function deleteModel(id) {
  must(await supabase.from(TABLES.catalogModels).delete().eq('id', id));
}

export async function setModelActive(id, isActive) {
  must(await supabase.from(TABLES.catalogModels).update({ is_active: isActive }).eq('id', id));
}

export async function saveVariant(id, payload) {
  if (id) must(await supabase.from(TABLES.products).update(payload).eq('id', id));
  else must(await supabase.from(TABLES.products).insert(payload));
}

export async function insertVariants(payloads) {
  if (payloads.length) must(await supabase.from(TABLES.products).insert(payloads));
}

export async function updateVariant(id, patch) {
  must(await supabase.from(TABLES.products).update(patch).eq('id', id));
}

export async function deleteVariant(id) {
  must(await supabase.from(TABLES.products).delete().eq('id', id));
}

/** Sube una foto de producto y devuelve su URL pública. */
export async function uploadProductImage(file) {
  const invalid = validateImageFile(file);
  if (invalid) throw new Error(invalid);
  const ext = file.name.split('.').pop();
  const path = `prod-${Date.now()}.${ext}`;
  must(await supabase.storage.from(BUCKETS.productImages).upload(path, file, { cacheControl: '3600', upsert: false }));
  return supabase.storage.from(BUCKETS.productImages).getPublicUrl(path).data.publicUrl;
}

/** Mensaje para mostrar en la pantalla de inventario. */
export function inventoryErrorMessage(error) {
  if (error?.code === '23505') return 'Ya existe un modelo con ese nombre en ese tipo.';
  if (error?.code === '23503') return 'El modelo todavía tiene variantes: borralas primero.';
  if (error?.code === '23514' && /category/i.test(error.message)) {
    return 'Ese tipo no está habilitado para productos (solo iPhone, Mac, iPad, Watch, AirPods y Accesorios).';
  }
  if (error?.code === '23514') return 'La batería tiene que estar entre 0 y 100 %.';
  return friendlyDbError(error);
}
