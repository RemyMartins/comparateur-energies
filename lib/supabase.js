import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

// Vérification que les variables sont définies
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Variables Supabase manquantes')
}

// Client public (frontend)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Client admin (backend/API routes)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

// Fonctions utilitaires
export async function getActiveSuppliers(preferGreen = false) {
  try {
    let query = supabaseAdmin
      .from('suppliers')
      .select('*')
      .eq('is_active', true)

    if (preferGreen) {
      query = query.eq('green_percent', 100)
    }

    const { data, error } = await query.order('commission', { ascending: false })
    
    if (error) {
      console.error('Erreur getActiveSuppliers:', error)
      throw error
    }
    
    return data || []
  } catch (error) {
    console.error('Erreur dans getActiveSuppliers:', error)
    throw error
  }
}

export async function createLead(leadData) {
  try {
    const { data, error } = await supabaseAdmin
      .from('leads')
      .insert([leadData])
      .select()
      .single()
    
    if (error) {
      console.error('Erreur createLead:', error)
      throw error
    }
    
    return data
  } catch (error) {
    console.error('Erreur dans createLead:', error)
    throw error
  }
}

export async function getLeadsCount() {
  try {
    const { count, error } = await supabaseAdmin
      .from('leads')
      .select('*', { count: 'exact', head: true })
    
    if (error) {
      console.error('Erreur getLeadsCount:', error)
      throw error
    }
    
    return count || 0
  } catch (error) {
    console.error('Erreur dans getLeadsCount:', error)
    return 0
  }
}
