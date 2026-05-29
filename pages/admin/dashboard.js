import { useState, useEffect } from 'react'
import { supabaseAdmin } from '../../lib/supabase'
import styles from '../../styles/Dashboard.module.css'

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [leads, setLeads] = useState([])
  const [conversions, setConversions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      // Stats générales
      const [
        { count: totalLeads },
        { count: todayLeads },
        { data: supplierStats },
        { data: recentLeads },
        { data: recentConversions }
      ] = await Promise.all([
        supabaseAdmin.from('leads').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('leads').select('*', { count: 'exact', head: true })
          .gte('created_at', new Date(new Date().setHours(0,0,0,0)).toISOString()),
        supabaseAdmin.from('leads').select(`
          supplier_id,
          suppliers(name, slug, commission)
        `).limit(100),
        supabaseAdmin.from('leads').select(`
          *,
          suppliers(name, slug)
        `).order('created_at', { ascending: false }).limit(20),
        supabaseAdmin.from('conversions').select('*')
          .order('tracked_at', { ascending: false }).limit(10)
      ])

      // Calcul des stats par fournisseur
      const supplierLeadCount = {}
      const supplierCommissions = {}
      
      supplierStats?.forEach(lead => {
        const supplier = lead.suppliers
        if (supplier) {
          supplierLeadCount[supplier.name] = (supplierLeadCount[supplier.name] || 0) + 1
          supplierCommissions[supplier.name] = supplier.commission
        }
      })

      // Calcul revenus potentiels (estimation 15% de conversion)
      const potentialRevenue = Object.entries(supplierLeadCount)
        .reduce((total, [supplier, count]) => {
          return total + (count * (supplierCommissions[supplier] || 0) * 0.15)
        }, 0)

      setStats({
        totalLeads,
        todayLeads,
        supplierLeadCount,
        potentialRevenue: Math.round(potentialRevenue)
      })
      
      setLeads(recentLeads || [])
      setConversions(recentConversions || [])
      
    } catch (error) {
      console.error('Erreur chargement dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className={styles.loading}>Chargement du dashboard...</div>
  }

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <h1>📊 Dashboard Comparateur Énergies</h1>
        <div className={styles.date}>
          {new Date().toLocaleDateString('fr-FR', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </div>
      </header>

      {/* Stats principales */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statNumber}>{stats.totalLeads}</div>
          <div className={styles.statLabel}>Leads Total</div>
        </div>
        
        <div className={styles.statCard}>
          <div className={styles.statNumber}>{stats.todayLeads}</div>
          <div className={styles.statLabel}>Leads Aujourd'hui</div>
        </div>
        
        <div className={styles.statCard}>
          <div className={styles.statNumber}>{stats.potentialRevenue}€</div>
          <div className={styles.statLabel}>Revenus Potentiels</div>
        </div>
        
        <div className={styles.statCard}>
          <div className={styles.statNumber}>
            {Object.keys(stats.supplierLeadCount).length}
          </div>
          <div className={styles.statLabel}>Fournisseurs Actifs</div>
        </div>
      </div>

      {/* Répartition par fournisseur */}
      <div className={styles.section}>
        <h2>📈 Leads par Fournisseur</h2>
        <div className={styles.supplierStats}>
          {Object.entries(stats.supplierLeadCount)
            .sort(([,a], [,b]) => b - a)
            .map(([supplier, count]) => (
              <div key={supplier} className={styles.supplierRow}>
                <span className={styles.supplierName}>{supplier}</span>
                <span className={styles.supplierCount}>{count} leads</span>
                <span className={styles.supplierRevenue}>
                  ~{Math.round(count * (supplierCommissions[supplier] || 0) * 0.15)}€
                </span>
              </div>
            ))
          }
        </div>
      </div>

      {/* Leads récents */}
      <div className={styles.section}>
        <h2>🎯 Leads Récents</h2>
        <div className={styles.table}>
          <div className={styles.tableHeader}>
            <div>Email</div>
            <div>Fournisseur</div>
            <div>Code Postal</div>
            <div>Consommation</div>
            <div>Date</div>
            <div>Statut</div>
          </div>
          {leads.map(lead => (
            <div key={lead.id} className={styles.tableRow}>
              <div>{lead.email}</div>
              <div>{lead.suppliers?.name}</div>
              <div>{lead.postal_code}</div>
              <div>{lead.consumption} kWh</div>
              <div>
                {new Date(lead.created_at).toLocaleDateString('fr-FR')}
              </div>
              <div>
                <span className={`${styles.status} ${styles[lead.status]}`}>
                  {lead.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Conversions récentes */}
      <div className={styles.section}>
        <h2>💰 Conversions</h2>
        <div className={styles.conversions}>
          {conversions.map(conversion => (
            <div key={conversion.id} className={styles.conversionCard}>
              <div className={styles.conversionHeader}>
                <span className={styles.trackingId}>{conversion.tracking_id}</span>
                <span className={styles.conversionStatus}>
                  {conversion.status === 'confirmed' ? '✅' : '⏳'}
                </span>
              </div>
              <div className={styles.conversionDetails}>
                <div>Fournisseur: {conversion.supplier_slug}</div>
                <div>Commission: {conversion.commission_amount}€</div>
                <div>
                  Date: {new Date(conversion.tracked_at).toLocaleDateString('fr-FR')}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Protection de la page admin
export async function getServerSideProps({ req, query }) {
  // Vérification mot de passe simple
  const { password } = query
  
  if (password !== process.env.ADMIN_PASSWORD) {
    return {
      props: {
        error: 'Accès refusé'
      }
    }
  }

  return {
    props: {}
  }
}
