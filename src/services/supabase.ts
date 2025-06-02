import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

// Función para obtener el cliente de Supabase
const getSupabaseClient = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Faltan las variables de entorno de Supabase');
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey);
};

// Exportar el cliente de Supabase
export const supabase = getSupabaseClient();

// Función para verificar la conexión
export const checkSupabaseConnection = async () => {
  try {
    // Primero verificamos que tengamos las credenciales
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      throw new Error('Credenciales de Supabase no encontradas en las variables de entorno');
    }

    // Intentamos una operación simple para verificar la conexión
    const { data, error } = await supabase
      .from('products')
      .select('count')
      .limit(1)
      .maybeSingle();

    if (error) {
      // Si es un error de autenticación
      if (error.code === 'auth/invalid-credential') {
        throw new Error('Credenciales de Supabase inválidas');
      }
      // Si es un error de conexión
      if (error.code === 'connection_error') {
        throw new Error('No se pudo conectar a Supabase. Verifica tu conexión a internet');
      }
      throw error;
    }

    console.log('Conexión a Supabase establecida correctamente');
    return true;
  } catch (error) {
    console.error('Error al verificar la conexión con Supabase:', error);
    // Re-lanzamos el error para que pueda ser manejado por el código que llama a esta función
    throw error;
  }
};

// Función para insertar datos de productos
export async function insertProductData(productData: any) {
  try {
    // Primero insertar o actualizar el producto base
    const { data: product, error: productError } = await supabase
      .from('products')
      .upsert({
        item_id: productData.id,
        title: productData.title,
        seller_id: productData.seller.id.toString(),
        category_id: productData.category_id,
        official_store_id: productData.official_store_id,
        catalog_product_id: productData.catalog_product_id,
        date_created: productData.date_created,
        last_updated: productData.last_updated
      }, {
        onConflict: 'item_id'
      })
      .select()
      .single();

    if (productError) throw productError;

    // Insertar datos diarios
    const { error: dailyError } = await supabase
      .from('daily_product_data')
      .insert({
        product_id: product.id,
        date: new Date().toISOString().split('T')[0],
        price: productData.price,
        sold_quantity: productData.sold_quantity,
        available_quantity: productData.available_quantity,
        shipping_free: productData.shipping?.free_shipping || false,
        listing_type: productData.listing_type_id,
        status: productData.status
      });

    if (dailyError) throw dailyError;

    // Insertar datos del vendedor
    const { error: sellerError } = await supabase
      .from('sellers')
      .upsert({
        seller_id: productData.seller.id.toString(),
        nickname: productData.seller.nickname,
        official_store_id: productData.official_store_id,
        metrics: productData.seller.seller_reputation || {}
      }, {
        onConflict: 'seller_id'
      });

    if (sellerError) throw sellerError;

    return { success: true, productId: product.id };
  } catch (error) {
    console.error('Error al insertar datos:', error);
    return { success: false, error };
  }
}

// Función para obtener el UUID de un producto por su item_id
async function getProductUUID(itemId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('id')
      .eq('item_id', itemId)
      .single();

    if (error) throw error;
    return data?.id || null;
  } catch (error) {
    console.error('Error al obtener UUID del producto:', error);
    return null;
  }
}

// Función para insertar datos de competencia
export async function insertCompetitorData(itemId: string, competitorData: any) {
  try {
    // Primero obtener el UUID del producto
    const productUUID = await getProductUUID(itemId);
    if (!productUUID) {
      throw new Error(`No se encontró el producto con item_id: ${itemId}`);
    }

    const { error } = await supabase
      .from('competitor_data')
      .insert({
        product_id: productUUID,
        competitor_seller_id: competitorData.seller.id.toString(),
        date: new Date().toISOString().split('T')[0],
        price: competitorData.price,
        sold_quantity: competitorData.sold_quantity,
        available_quantity: competitorData.available_quantity,
        shipping_free: competitorData.shipping?.free_shipping || false,
        listing_type: competitorData.listing_type_id
      });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error al insertar datos de competencia:', error);
    return { success: false, error };
  }
}

// Función para insertar datos de visitas
export async function insertVisitsData(itemId: string, visitsData: any) {
  try {
    // Primero obtener el UUID del producto
    const productUUID = await getProductUUID(itemId);
    if (!productUUID) {
      throw new Error(`No se encontró el producto con item_id: ${itemId}`);
    }

    const { error } = await supabase
      .from('visits_data')
      .insert({
        product_id: productUUID,
        date: new Date().toISOString().split('T')[0],
        visits_today: visitsData.total || 0,
        visits_last_7_days: visitsData.last_7_days || 0,
        visits_last_30_days: visitsData.last_30_days || 0
      });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error al insertar datos de visitas:', error);
    return { success: false, error };
  }
}

// Función para insertar tendencias
export async function insertTrendsData(trendsData: any[]) {
  try {
    const trends = trendsData.map(trend => ({
      keyword: trend.keyword,
      search_volume: trend.search_volume || 0,
      category_id: trend.category_id,
      date: new Date().toISOString().split('T')[0]
    }));

    const { error } = await supabase
      .from('trends_data')
      .insert(trends);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error al insertar tendencias:', error);
    return { success: false, error };
  }
}