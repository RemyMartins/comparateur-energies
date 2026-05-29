import { supabaseAdmin } from '../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' })
  }

  try {
    const { 
      email, 
      phone, 
      postalCode, 
      consumption, 
      preferGreen, 
      supplierId,
      supplierName,
      utm_source,
      utm_medium,
      utm_campaign 
    } = req.body

    // Validation
    if (!email || !postalCode || !consumption || !supplierId) {
      return res.status(400).json({ error: 'Données obligatoires manquantes' })
    }

    // Validation email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Email invalide' })
    }

    // Récupération de l'IP et User Agent
    const forwarded = req.headers['x-forwarded-for']
    const ip = forwarded ? forwarded.split(',')[0] : req.connection.remoteAddress
    const userAgent = req.headers['user-agent']

    // Sauvegarde du lead
    const { data: lead, error } = await supabaseAdmin
      .from('leads')
      .insert([{
        email,
        phone: phone || null,
        postal_code: postalCode,
        consumption: parseInt(consumption),
        prefer_green: preferGreen || false,
        supplier_id: parseInt(supplierId),
        utm_source: utm_source || 'direct',
        utm_medium: utm_medium || 'organic',
        utm_campaign: utm_campaign || null,
        ip_address: ip,
        user_agent: userAgent
      }])
      .select()
      .single()

    if (error) {
      console.error('Erreur sauvegarde lead:', error)
      throw error
    }

    console.log('Lead créé:', lead.id, 'pour', supplierName)

    // Simulation envoi email de confirmation (à implémenter plus tard)
    // await sendConfirmationEmail(email, supplierName)

    res.status(200).json({
      success: true,
      leadId: lead.id,
      message: 'Demande enregistrée avec succès'
    })

  } catch (error) {
    console.error('Erreur API lead:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
}
