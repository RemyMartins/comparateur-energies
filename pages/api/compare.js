import { supabaseAdmin } from '../../lib/supabase'

export default async function handler(req, res) {
  // CORS et méthodes autorisées
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' })
  }

  try {
    const { postalCode, consumption, preferGreen } = req.body

    // Validation basique
    if (!postalCode || !consumption) {
      return res.status(400).json({ error: 'Données manquantes' })
    }

    if (postalCode.length !== 5 || !/^\d{5}$/.test(postalCode)) {
      return res.status(400).json({ error: 'Code postal invalide' })
    }

    if (consumption < 1000 || consumption > 50000) {
      return res.status(400).json({ error: 'Consommation invalide' })
    }

    console.log('Récupération des fournisseurs...', { preferGreen })

    // Récupération des fournisseurs depuis la base
    let query = supabaseAdmin
      .from('suppliers')
      .select('*')
      .eq('is_active', true)

    if (preferGreen) {
      query = query.eq('green_percent', 100)
    }

    const { data: suppliers, error } = await query.order('commission', { ascending: false })

    if (error) {
      console.error('Erreur Supabase:', error)
      throw error
    }

    console.log(`${suppliers?.length || 0} fournisseurs trouvés`)

    if (!suppliers || suppliers.length === 0) {
      return res.status(404).json({ error: 'Aucun fournisseur trouvé' })
    }

    // Calculs des tarifs réels
    const results = suppliers.map(supplier => {
      // Calcul mensuel
      const monthlyVariable = (consumption / 12) * supplier.price_kwh
      const monthlyFixed = supplier.fixed_cost
      const monthlyTotal = monthlyVariable + monthlyFixed

      // Calcul annuel
      const yearlyTotal = monthlyTotal * 12

      // Calcul économies vs tarif EDF réglementé
      const edfMonthlyVariable = (consumption / 12) * 0.2062 // Tarif bleu EDF 2024
      const edfMonthlyFixed = 12.44 // Abonnement EDF base
      const edfYearlyTotal = (edfMonthlyVariable + edfMonthlyFixed) * 12
      
      const savings = Math.round(edfYearlyTotal - yearlyTotal)

      return {
        id: supplier.id,
        name: supplier.name,
        slug: supplier.slug,
        monthlyPrice: Math.round(monthlyTotal * 100) / 100,
        yearlyPrice: Math.round(yearlyTotal),
        greenPercent: supplier.green_percent,
        savings: savings > 0 ? savings : 0,
        phone: supplier.phone,
        website: supplier.website,
        description: supplier.description,
        commission: supplier.commission
      }
    })

    // Tri par économies décroissantes
    const sortedResults = results
      .sort((a, b) => b.savings - a.savings)
      .slice(0, 6) // Maximum 6 résultats

    console.log(`${sortedResults.length} résultats retournés`)

    res.status(200).json({
      success: true,
      results: sortedResults,
      count: sortedResults.length,
      filters: {
        postalCode,
        consumption,
        preferGreen
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Erreur API compare:', error)
    res.status(500).json({ 
      error: 'Erreur serveur', 
      details: process.env.NODE_ENV === 'development' ? error.message : undefined 
    })
  }
}
