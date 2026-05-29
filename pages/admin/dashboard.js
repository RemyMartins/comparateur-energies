import { useState, useEffect } from 'react'
import Head from 'next/head'
import styles from '../../styles/Dashboard.module.css'

export default function Dashboard({ error }) {
  const [stats, setStats] = useState(null)
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!error) {
      loadDashboardData()
    }
  }, [error])

  const loadDashboardData = async () => {
    try {
      // Appel à votre API pour récupérer les stats
      const response = await fetch('/api/admin/stats')
      const data = await response.json()
      
      setStats(data.stats)
      setLeads(data.leads)
      
    } catch (error) {
      console.error('Erreur chargement dashboard:', error)
      setStats({
        totalLeads: 0,
        todayLeads: 0,
        potentialRevenue: 0,
        supplierStats: {}
      })
      setLeads([])
    } finally {
      setLoading(false)
    }
  }

  if (error) {
    return (
      <div className={styles.errorPage}>
        <h1>🔒 Accès Refusé</h1>
        <p>Mot de passe incorrect</p>
        <p>URL correcte : <code>/admin/dashboard?password=votre-mot-de-passe</code></p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Chargement du dashboard...</p>
      </div>
    )
  }

  return (
    <div className={styles.dashboard}>
      <Head>
        <title>Dashboard Admin - Comparateur Énergies</title>
      </Head>

      <header className={styles.header}>
        <h1>📊 Dashboard Admin</h1>
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
          <div className={styles.statIcon}>👥</div>
          <div className={styles.statNumber}>{stats?.totalLeads || 0}</div>
          <div className={styles.statLabel}>Leads Total</div>
        </div>
        
        <div className={styles.statCard}>
          <div className={styles.statIcon}>🎯</div>
          <div className={styles.statNumber}>{stats?.todayLeads || 0}</div>
          <div className={styles.statLabel}>Leads Aujourd'hui</div>
        </div>
        
        <div className={styles.statCard}>
          <div className={styles.statIcon}>💰</div>
          <div className={styles.statNumber}>{stats?.potentialRevenue || 0}€</div>
          <div className={styles.statLabel}>Revenus Potentiels</div>
          <div className={styles.statHint}>Estimation 15% conversion</div>
        </div>
        
        <div className={styles.statCard}>
          <div className={styles.statIcon}>⚡</div>
          <div className={styles.statNumber}>
            {Object.keys(stats?.supplierStats || {}).length}
          </div>
          <div className={styles.statLabel}>Fournisseurs</div>
        </div>
      </div>

      {/* Répartition par fournisseur */}
      {stats?.supplierStats && Object.keys(stats.supplierStats).length > 0 && (
        <div className={styles.section}>
          <h2>📈 Répartition par Fournisseur</h2>
          <div className={styles.supplierGrid}>
            {Object.entries(stats.supplierStats)
              .sort(([,a], [,b]) => b.count - a.count)
              .map(([supplier, data]) => (
                <div key={supplier} className={styles.supplierCard}>
                  <h3>{supplier}</h3>
                  <div className={styles.supplierCount}>{data.count} leads</div>
                  <div className={styles.supplierRevenue}>
                    ~{Math.round(data.count * (data.commission || 70) * 0.15)}€ potentiel
                  </div>
                  <div className={styles.supplierCommission}>
                    Commission: {data.commission || 70}€
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      )}

      {/* Leads récents */}
      <div className={styles.section}>
        <h2>🎯 Leads Récents ({leads.length})</h2>
        
        {leads.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📭</div>
            <h3>Aucun lead pour l'instant</h3>
            <p>Partagez votre site pour commencer à générer des leads !</p>
            <div className={styles.siteUrl}>
              {typeof window !== 'undefined' && (
                <code>{window.location.origin}</code>
              )}
            </div>
          </div>
        ) : (
          <div className={styles.leadsTable}>
            <div className={styles.tableHeader}>
              <div>📧 Email</div>
              <div>🏢 Fournisseur</div>
              <div>📍 Code Postal</div>
              <div>⚡ Consommation</div>
              <div>📅 Date</div>
              <div>📊 Statut</div>
            </div>
            {leads.map(lead => (
              <div key={lead.id} className={styles.tableRow}>
                <div className={styles.email}>{lead.email}</div>
                <div>{lead.supplier_name || 'N/A'}</div>
                <div>{lead.postal_code}</div>
                <div>{lead.consumption?.toLocaleString()} kWh</div>
                <div className={styles.date}>
                  {new Date(lead.created_at).toLocaleDateString('fr-FR')}
                </div>
                <div>
                  <span className={`${styles.status} ${styles[lead.status] || styles.pending}`}>
                    {lead.status === 'pending' ? '⏳ En attente' :
                     lead.status === 'contacted' ? '📞 Contacté' :
                     lead.status === 'converted' ? '✅ Converti' : 
                     '❌ Rejeté'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className={styles.section}>
        <h2>🚀 Prochaines étapes</h2>
        <div className={styles.instructions}>
          <div className={styles.instruction}>
            <div className={styles.step}>1</div>
            <div>
              <h3>Générer du trafic</h3>
              <p>Partagez votre site sur les réseaux sociaux, avec vos contacts</p>
            </div>
          </div>
          <div className={styles.instruction}>
            <div className={styles.step}>2</div>
            <div>
              <h3>Contacter les fournisseurs</h3>
              <p>Dès que vous avez 10-20 leads, contactez Enercoop et ilek</p>
            </div>
          </div>
          <div className={styles.instruction}>
            <div className={styles.step}>3</div>
            <div>
              <h3>Optimiser les conversions</h3>
              <p>Testez différentes versions du formulaire</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Vérification du mot de passe côté serveur
export async function getServerSideProps({ query }) {
  const { password } = query
  
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return {
      props: {
        error: 'Accès refusé'
      }
    }
  }

  return {
    props: {
      error: null
    }
  }
}
