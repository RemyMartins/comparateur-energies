import { supabaseAdmin } from '../../../lib/supabase'
import { sendWebhook, trackConversion } from '../../../lib/integrations'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' })
  }

  const { supplier } = req.query
  
  try {
    const { 
      email, 
      phone, 
      firstName,
      lastName,
      postalCode, 
      consumption, 
      currentSupplier,
      preferGreen,
      utmSource,
      utmMedium,
      utmCampaign 
    } = req.body

    // Validation
    if (!email || !postalCode || !consumption) {
      return res.status(400).json({ error: 'Données obligatoires manquantes' })
    }

    // Récupération du fournisseur
    const { data: supplierData, error: supplierError } = await supabaseAdmin
      .from('suppliers')
      .select('*')
      .eq('slug', supplier)
      .eq('is_active', true)
      .single()

    if (supplierError || !supplierData) {
      return res.status(404).json({ error: 'Fournisseur introuvable' })
    }

    // Récupération de l'IP et User Agent
    const forwarded = req.headers['x-forwarded-for']
    const ip = forwarded ? forwarded.split(',')[0] : req.connection.remoteAddress
    const userAgent = req.headers['user-agent']

    // Génération ID unique pour tracking
    const trackingId = `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Sauvegarde du lead avec tracking
    const { data: lead, error: leadError } = await supabaseAdmin
      .from('leads')
      .insert([{
        tracking_id: trackingId,
        email,
        phone: phone || null,
        first_name: firstName || null,
        last_name: lastName || null,
        postal_code: postalCode,
        consumption: parseInt(consumption),
        current_supplier: currentSupplier || null,
        prefer_green: preferGreen || false,
        supplier_id: supplierData.id,
        utm_source: utmSource || 'direct',
        utm_medium: utmMedium || 'organic',
        utm_campaign: utmCampaign || null,
        ip_address: ip,
        user_agent: userAgent,
        status: 'pending'
      }])
      .select()
      .single()

    if (leadError) {
      console.error('Erreur sauvegarde lead:', leadError)
      throw leadError
    }

    // Envoi webhook au fournisseur (si configuré)
    try {
      await sendWebhook(supplierData, lead)
    } catch (webhookError) {
      console.error('Erreur webhook:', webhookError)
      // On continue même si le webhook échoue
    }

    // Tracking analytics
    await trackConversion(supplierData.slug, lead.tracking_id, supplierData.commission)

    // Log de l'événement
    await supabaseAdmin
      .from('lead_events')
      .insert([{
        lead_id: lead.id,
        event_type: 'lead_created',
        event_data: {
          supplier: supplierData.name,
          source: utmSource || 'direct',
          commission: supplierData.commission
        }
      }])

    console.log(`✅ Lead créé: ${lead.tracking_id} pour ${supplierData.name}`)

    res.status(200).json({
      success: true,
      leadId: lead.id,
      trackingId: trackingId,
      supplier: supplierData.name,
      message: 'Lead enregistré avec succès'
    })

  } catch (error) {
    console.error('Erreur API lead:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
}
