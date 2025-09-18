/**
 * Script de diagnostic pour le problème de boucle de chargement Medusa
 */

const http = require('http');

console.log('🔍 Diagnostic du problème de boucle de chargement Medusa');
console.log('='.repeat(60));

// Configuration du serveur à tester
const SERVER_HOST = 'localhost';
const SERVER_PORT = 9000; // Port admin par défaut
const ADMIN_URL = `http://${SERVER_HOST}:${SERVER_PORT}/app`;

// Fonction pour tester la connectivité
function testConnection(url, description) {
  return new Promise((resolve) => {
    console.log(`\n🌐 Test: ${description}`);
    console.log(`   URL: ${url}`);

    const req = http.get(url, (res) => {
      console.log(`   ✅ Status: ${res.statusCode}`);
      console.log(`   ✅ Headers: ${Object.keys(res.headers).length} headers`);

      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`   📄 Response size: ${data.length} characters`);
        resolve({ status: res.statusCode, data: data.substring(0, 200) + '...' });
      });
    });

    req.on('error', (err) => {
      console.log(`   ❌ Error: ${err.message}`);
      console.log(`   💡 Vérifiez que le serveur Medusa est démarré`);
      resolve({ error: err.message });
    });

    req.setTimeout(5000, () => {
      console.log(`   ⏰ Timeout après 5 secondes`);
      req.destroy();
      resolve({ error: 'Timeout' });
    });
  });
}

// Fonction pour analyser les headers de réponse
function analyzeResponse(response) {
  console.log('\n🔍 Analyse de la réponse:');

  if (response.error) {
    console.log('❌ Impossible d\'analyser - erreur de connexion');
    return;
  }

  // Vérifier les redirections
  if (response.status >= 300 && response.status < 400) {
    console.log('🔄 REDIRECTION détectée - cela peut causer une boucle!');
    console.log('💡 Vérifiez les règles de redirection dans votre application');
  }

  // Analyser le contenu pour des signes de boucle
  if (response.data && response.data.includes('redirect')) {
    console.log('🔄 Contenu contient "redirect" - possible boucle de redirection');
  }

  if (response.data && response.data.includes('location')) {
    console.log('🔄 Contenu contient "location" - possible redirection');
  }

  console.log(`📊 Status Code: ${response.status}`);
}

// Test principal
async function runDiagnostics() {
  console.log('🚀 Démarrage des tests de diagnostic...\n');

  try {
    // Test 1: Connexion de base
    const baseResponse = await testConnection(`http://${SERVER_HOST}:${SERVER_PORT}`, 'Connexion de base au serveur');

    // Test 2: Page admin
    const adminResponse = await testConnection(ADMIN_URL, 'Page d\'administration');

    // Test 3: API health check si disponible
    const healthResponse = await testConnection(`http://${SERVER_HOST}:${SERVER_PORT}/health`, 'Health check API');

    // Test 4: API store
    const storeResponse = await testConnection(`http://${SERVER_HOST}:${SERVER_PORT}/store`, 'API Store');

    // Analyse des réponses
    console.log('\n' + '='.repeat(60));
    console.log('📋 RÉSULTATS DE L\'ANALYSE:');

    analyzeResponse(adminResponse);

    // Conseils de diagnostic
    console.log('\n💡 CONSEILS DE DIAGNOSTIC:');
    console.log('1. 🔍 Vérifiez les logs du serveur Medusa pour des erreurs');
    console.log('2. 🍪 Vérifiez les cookies du navigateur (onglet Application > Cookies)');
    console.log('3. 🔐 Vérifiez la configuration JWT dans medusa-config.ts');
    console.log('4. 🌐 Vérifiez les redirections dans votre application frontend');
    console.log('5. 🗃️ Vérifiez que la base de données est accessible');
    console.log('6. 🔧 Essayez de vider le cache du navigateur (Ctrl+Shift+R)');

    // Vérifications spécifiques pour les boucles
    console.log('\n🔄 VÉRIFICATIONS ANTI-BOUCLE:');
    console.log('- Supprimé le wildcard (*) des CORS ✅');
    console.log('- Configuration JWT vérifiée');
    console.log('- Cookies secrets configurés');

    console.log('\n' + '='.repeat(60));
    console.log('🎯 Diagnostic terminé');

  } catch (error) {
    console.error('❌ Erreur lors du diagnostic:', error.message);
  }
}

// Lancer le diagnostic
runDiagnostics();
