import { supabaseAdmin } from './supabase'

// Configuration des webhooks par fournisseur
const WEBHOOK_CONFIG = {
  'enercoop': {
    url: process.env.ENERCOOP_WEBHOOK_URL,
    secret: process.env.ENERCOOP_WEBHOOK_SECRET,
    format: 'json'
  },
  'ilek': {
    url: process.env.ILEK_WEBHOOK_URL,
    secret: process.env.ILEK_WEBHOOK_SECRET,
    format: 'json'
  },
  'totalenergies-verte': {
    url: process.env.TOTALENERGIES_WEBHOOK_URL,
    secret: process.env.TOTALENERGIES_WEBHOOK_SECRET,
    format: 'xml'
  }
  // Ajouter d'autres fournisseurs...
}

// Envoi webhook vers fournisseur
export async function sendWebhook(supplier, lead) {
  const config = WEBHOOK_CONFIG[supplier.slug]
  
  if (!config || !config.url) {
    console.log(`Pas de webhook configuré pour ${supplier.slug}`)
    return
  }

  try {
    const payload = formatLeadForSupplier(supplier.slug, lead)
    
    const response = await fetch(config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': config.secret,
        'X-Source': 'comparateur-energies',
        'X-Lead-ID': lead.tracking_id
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status}`)
    }

    // Log succès webhook
    await supabaseAdmin
      .from('webhook_logs')
      .insert([{
        lead_id: lead.id,
        supplier_slug: supplier.slug,
        webhook_url: config.url,
        status: 'success',
        response_status: response.status,
        sent_at: new Date()
      }])

    console.log(`✅ Webhook envoyé à ${supplier.name}`)

  } catch (error) {
    // Log erreur webhook
    await supabaseAdmin
      .from('webhook_logs')
      .insert([{
        lead_id: lead.id,
        supplier_slug: supplier.slug,
        webhook_url: config.url,
        status: 'error',
        error_message: error.message,
        sent_at: new Date()
      }])

    console.error(`❌ Erreur webhook ${supplier.name}:`, error)
    throw error
  }
}

// Format des données selon le fournisseur
function formatLeadForSupplier(supplierSlug, lead) {
  const baseData = {
    lead_id: lead.tracking_id,
    email: lead.email,
    phone: lead.phone,
    postal_code: lead.postal_code,
    consumption: lead.consumption,
    created_at: lead.created_at,
    source: 'comparateur-energies'
  }

  switch (supplierSlug) {
    case 'enercoop':
      return {
        ...baseData,
        cooperative_member: false,
        energy_type: 'electricity',
        green_preference: lead.prefer_green
      }

    case 'ilek':
      return {
        ...baseData,
        customer_type: 'particulier',
        energy_source: 'renouvelable',
        annual_consumption: lead.consumption
      }

    case 'totalenergies-verte':
      return {
        prospect: {
          id: lead.tracking_id,
          contact: {
            email: lead.email,
            telephone: lead.phone
          },
          address: {
            postal_code: lead.postal_code
          },
          consumption: lead.consumption,
          offer_type: 'verte'
        }
      }

    default:
      return baseData
  }
}

// Tracking des conversions
export async function trackConversion(supplierSlug, trackingId, commission) {
  try {
    // Analytics internes
    await supabaseAdmin
      .from('conversions')
      .insert([{
        tracking_id: trackingId,
        supplier_slug: supplierSlug,
        commission_amount: commission,
        status: 'pending',
        tracked_at: new Date()
      }])

    // Google Analytics (si configuré)
    if (process.env.GA_MEASUREMENT_ID) {
      await fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${process.env.GA_MEASUREMENT_ID}&api_secret=${process.env.GA_API_SECRET}`, {
        method: 'POST',
        body: JSON.stringify({
          client_id: trackingId,
          events: [{
            name: 'lead_generated',
            parameters: {
              supplier: supplierSlug,
              value: commission,
              currency: 'EUR'
            }
          }]
        })
      })
    }

    console.log(`📊 Conversion trackée: ${trackingId}`)

  } catch (error) {
    console.error('Erreur tracking:', error)
  }
}

// Notification de conversion confirmée
export async function confirmConversion(trackingId, contractValue) {
  try {
    const { data: conversion } = await supabaseAdmin
      .from('conversions')
      .update({
        status: 'confirmed',
        contract_value: contractValue,
        confirmed_at: new Date()
      })
      .eq('tracking_id', trackingId)
      .select()
      .single()

    // Webhook de confirmation vers notre système comptable
    if (process.env.ACCOUNTING_WEBHOOK_URL) {
      await fetch(process.env.ACCOUNTING_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tracking_id: trackingId,
          commission: conversion.commission_amount,
          contract_value: contractValue,
          confirmed_at: conversion.confirmed_at
        })
      })
    }

    console.log(`💰 Conversion confirmée: ${trackingId} = ${conversion.commission_amount}€`)

  } catch (error) {
    console.error('Erreur confirmation conversion:', error)
  }
}
