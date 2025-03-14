import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan las variables de entorno de Supabase');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

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

    return { success: true };
  } catch (error) {
    console.error('Error al insertar datos:', error);
    return { success: false, error };
  }
}

// Función para insertar datos de competencia
export async function insertCompetitorData(productId: string, competitorData: any) {
  try {
    const { error } = await supabase
      .from('competitor_data')
      .insert({
        product_id: productId,
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
export async function insertVisitsData(productId: string, visitsData: any) {
  try {
    const { error } = await supabase
      .from('visits_data')
      .insert({
        product_id: productId,
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