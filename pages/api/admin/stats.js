import { supabaseAdmin } from '../../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Méthode non autorisée' })
  }

  try {
    // Récupération des leads avec leurs fournisseurs
    const { data: leads, error } = await supabaseAdmin
      .from('leads')
      .select(`
        *,
        suppliers(name, slug, commission)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erreur récupération leads:', error)
      throw error
    }

    // Calcul des statistiques
    const totalLeads = leads?.length || 0
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayLeads = leads?.filter(lead => 
      new Date(lead.created_at) >= today
    ).length || 0

    // Stats par fournisseur
    const supplierStats = {}
    leads?.forEach(lead => {
      const supplier = lead.suppliers
      if (supplier) {
        if (!supplierStats[supplier.name]) {
          supplierStats[supplier.name] = {
            count: 0,
            commission: supplier.commission
          }
        }
        supplierStats[supplier.name].count++
      }
    })

    // Calcul revenus potentiels (15% de conversion estimé)
    const potentialRevenue = Object.values(supplierStats)
      .reduce((total, data) => {
        return total + (data.count * data.commission * 0.15)
      }, 0)

    // Préparation des leads pour affichage (20 plus récents)
    const recentLeads = leads?.slice(0, 20).map(lead => ({
      id: lead.id,
      email: lead.email,
      postal_code: lead.postal_code,
      consumption: lead.consumption,
      created_at: lead.created_at,
      status: lead.status || 'pending',
      supplier_name: lead.suppliers?.name
    })) || []

    res.status(200).json({
      success: true,
      stats: {
        totalLeads,
        todayLeads,
        potentialRevenue: Math.round(potentialRevenue),
        supplierStats
      },
      leads: recentLeads
    })

  } catch (error) {
    console.error('Erreur API stats:', error)
    res.status(500).json({ 
      error: 'Erreur serveur',
      stats: {
        totalLeads: 0,
        todayLeads: 0,
        potentialRevenue: 0,
        supplierStats: {}
      },
      leads: []
    })
  }
}
