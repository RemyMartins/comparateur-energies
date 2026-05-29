import { useState } from 'react'
import Head from 'next/head'
import styles from '../styles/Home.module.css'

export default function Home() {
  const [formData, setFormData] = useState({
    postalCode: '',
    consumption: 5000,
    preferGreen: false
  })
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    // Simulation réaliste avec calculs vrais
    setTimeout(() => {
      const basePrice = 0.1740 // Prix base kWh en €
      const greenSupplement = 0.02 // Supplément vert
      
      const suppliers = [
        {
          name: 'Enercoop',
          baseRate: basePrice + 0.03,
          fixedCost: 16.37,
          greenPercent: 100,
          commission: 80
        },
        {
          name: 'ilek',
          baseRate: basePrice + 0.025,
          fixedCost: 12.44,
          greenPercent: 100,
          commission: 75
        },
        {
          name: 'TotalEnergies Verte',
          baseRate: basePrice + 0.015,
          fixedCost: 11.34,
          greenPercent: 100,
          commission: 70
        },
        {
          name: 'Vattenfall',
          baseRate: basePrice + 0.01,
          fixedCost: 9.54,
          greenPercent: 80,
          commission: 65
        },
        {
          name: 'Planète OUI',
          baseRate: basePrice + 0.02,
          fixedCost: 8.84,
          greenPercent: 100,
          commission: 60
        }
      ]
      
      // Calculs réels
      const mockResults = suppliers.map(supplier => {
        const monthlyVariable = (formData.consumption / 12) * supplier.baseRate
        const monthlyFixed = supplier.fixedCost
        const monthlyTotal = monthlyVariable + monthlyFixed
        const yearlyTotal = monthlyTotal * 12
        
        // Calcul économies vs EDF
        const edfYearly = (formData.consumption * 0.2062) + (12 * 12.44)
        const savings = Math.round(edfYearly - yearlyTotal)
        
        return {
          name: supplier.name,
          monthlyPrice: Math.round(monthlyTotal * 100) / 100,
          yearlyPrice: Math.round(yearlyTotal),
          greenPercent: supplier.greenPercent,
          savings: savings > 0 ? savings : 0,
          commission: supplier.commission
        }
      })
      
      // Filtrage et tri
      let filteredResults = formData.preferGreen 
        ? mockResults.filter(r => r.greenPercent === 100)
        : mockResults
        
      // Tri par économies décroissantes
      filteredResults = filteredResults
        .sort((a, b) => b.savings - a.savings)
        .slice(0, 5)
        
      setResults(filteredResults)
      setLoading(false)
    }, 2000)
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Comparateur Énergies Vertes | Économisez jusqu'à 300€ par an</title>
        <meta name="description" content="Comparez gratuitement les fournisseurs d'énergie verte. Changement gratuit et sans coupure. Jusqu'à 300€ d'économie par an." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🌱</text></svg>" />
      </Head>

      <main className={styles.main}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>
            Comparateur Énergies Vertes 🌱
          </h1>
          <p className={styles.subtitle}>
            Comparez gratuitement et économisez jusqu'à <strong>300€ par an</strong>
          </p>
          <div className={styles.badges}>
            <span className={styles.badge}>🆓 100% Gratuit</span>
            <span className={styles.badge}>🌱 Écologique</span>
            <span className={styles.badge}>⚡ Sans coupure</span>
          </div>
        </div>

        {/* Formulaire */}
        <div className={styles.formSection}>
          <div className={styles.formContainer}>
            <h2>Comparez les offres en 30 secondes</h2>
            
            <form onSubmit={handleSubmit} className={styles.form}>
              
              <div className={styles.field}>
                <label>📍 Votre code postal</label>
                <input
                  type="text"
                  maxLength="5"
                  pattern="[0-9]{5}"
                  value={formData.postalCode}
                  onChange={(e) => setFormData({
                    ...formData, 
                    postalCode: e.target.value.replace(/\D/g, '')
                  })}
                  placeholder="Ex: 75001"
                  required
                  className={styles.input}
                />
              </div>

              <div className={styles.field}>
                <label>⚡ Votre consommation annuelle</label>
                <input
                  type="range"
                  min="2000"
                  max="15000"
                  step="500"
                  value={formData.consumption}
                  onChange={(e) => setFormData({...formData, consumption: parseInt(e.target.value)})}
                  className={styles.range}
                />
                <div className={styles.rangeDisplay}>
                  <span className={styles.rangeValue}>{formData.consumption.toLocaleString()} kWh/an</span>
                  <span className={styles.rangeHint}>
                    {formData.consumption < 3000 ? '🏠 Studio/T1' :
                     formData.consumption < 6000 ? '🏠 Appartement' :
                     formData.consumption < 10000 ? '🏠 Maison' : '🏠 Grande maison'}
                  </span>
                </div>
                <div className={styles.hint}>
                  💡 Trouvez votre consommation sur votre facture EDF
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={formData.preferGreen}
                    onChange={(e) => setFormData({...formData, preferGreen: e.target.checked})}
                  />
                  <span className={styles.checkmark}></span>
                  🌿 Uniquement énergie 100% verte et française
                </label>
              </div>

              <button type="submit" disabled={loading || !formData.postalCode} className={styles.submitButton}>
                {loading ? (
                  <>
                    <span className={styles.spinner}></span>
                    Recherche en cours...
                  </>
                ) : (
                  '🚀 Comparer gratuitement'
                )}
              </button>
              
              <div className={styles.security}>
                🔒 Vos données sont sécurisées et ne seront jamais revendues
              </div>
            </form>
          </div>
        </div>

        {/* Résultats */}
        {results.length > 0 && (
          <div className={styles.resultsSection}>
            <div className={styles.resultsHeader}>
              <h2>🎯 {results.length} offres trouvées pour vous</h2>
              <p>Code postal: <strong>{formData.postalCode}</strong> • Consommation: <strong>{formData.consumption.toLocaleString()} kWh/an</strong></p>
            </div>
            
            <div className={styles.resultsGrid}>
              {results.map((supplier, index) => (
                <div key={index} className={`${styles.resultCard} ${index === 0 ? styles.bestOffer : ''}`}>
                  {index === 0 && (
                    <div className={styles.bestBadge}>
                      🏆 Meilleure offre
                    </div>
                  )}
                  
                  <div className={styles.supplierHeader}>
                    <h3>{supplier.name}</h3>
                    <div className={styles.greenBadge}>
                      🌱 {supplier.greenPercent}% vert
                    </div>
                  </div>
                  
                  <div className={styles.pricing}>
                    <div className={styles.mainPrice}>
                      <span className={styles.price}>{supplier.monthlyPrice}€</span>
                      <span className={styles.period}>/mois</span>
                    </div>
                    <div className={styles.yearlyPrice}>
                      Soit {supplier.yearlyPrice}€/an
                    </div>
                  </div>
                  
                  {supplier.savings > 0 && (
                    <div className={styles.savings}>
                      💰 Économie: <strong>{supplier.savings}€/an</strong> vs EDF
                    </div>
                  )}
                  
                  <div className={styles.features}>
                    <div className={styles.feature}>✅ Changement gratuit</div>
                    <div className={styles.feature}>✅ Sans coupure</div>
                    <div className={styles.feature}>✅ Sans engagement</div>
                  </div>
                  
                  <button className={styles.ctaButton} onClick={() => {
                    // Simulation tracking conversion
                    console.log(`Lead généré pour ${supplier.name} - Commission: ${supplier.commission}€`)
                  }}>
                    📞 Être rappelé gratuitement
                  </button>
                </div>
              ))}
            </div>
            
            <div className={styles.disclaimer}>
              <p>ℹ️ <strong>Service 100% gratuit</strong> - Nous recevons une commission des fournisseurs, sans surcoût pour vous</p>
              <p>🔄 Vous pouvez changer de fournisseur à tout moment, gratuitement et sans coupure</p>
            </div>
          </div>
        )}
        
        {/* Section avantages */}
        <div className={styles.advantagesSection}>
          <h2>Pourquoi comparer avec nous ?</h2>
          <div className={styles.advantagesGrid}>
            <div className={styles.advantage}>
              <div className={styles.advantageIcon}>🆓</div>
              <h3>100% Gratuit</h3>
              <p>Comparaison gratuite, changement gratuit, aucun frais caché</p>
            </div>
            <div className={styles.advantage}>
              <div className={styles.advantageIcon}>🌱</div>
              <h3>Spécialiste Énergie Verte</h3>
              <p>Focus sur les fournisseurs d'énergies renouvelables et locales</p>
            </div>
            <div className={styles.advantage}>
              <div className={styles.advantageIcon}>💰</div>
              <h3>Économies Garanties</h3>
              <p>Jusqu'à 300€ d'économie par an sur votre facture d'énergie</p>
            </div>
            <div className={styles.advantage}>
              <div className={styles.advantageIcon}>⚡</div>
              <h3>Changement Sans Souci</h3>
              <p>On s'occupe de tout: résiliation, souscription, sans coupure</p>
            </div>
          </div>
        </div>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <p>© 2024 Comparateur Énergies Vertes - Service gratuit et indépendant</p>
          <p>🌍 Pour une énergie plus verte et moins chère</p>
        </div>
      </footer>
    </div>
  )
}
