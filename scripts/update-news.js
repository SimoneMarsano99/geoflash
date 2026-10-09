const Parser = require('rss-parser');
const { createClient } = require('@supabase/supabase-js');

const parser = new Parser();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function aggiornaNotizie() {
  try {
    console.log("Download feed ANSA...");
    const feed = await parser.parseURL('https://www.ansa.it/sito/ansait_rss.xml');
    
    // Pulisce i titoli da eventuali spazi superflui
    const topNews = feed.items
      .slice(0, 3)
      .map(item => item.title.trim());

    // Calcola l'ora italiana corrente
    const oraUTC = new Date().getUTCHours();
    const oraItaliana = (oraUTC + 2) % 24; // stima fuso orario

    let slot = 'sera';
    if (oraItaliana >= 6 && oraItaliana < 12) {
      slot = 'mattina';
    } else if (oraItaliana >= 12 && oraItaliana < 18) {
      slot = 'pomeriggio';
    }

    console.log(`Aggiornamento slot [${slot}] con 3 notizie:`, topNews);

    const { error } = await supabase
      .from('daily_news')
      .upsert({
        slot: slot,
        items: topNews,
        updated_at: new Date().toISOString()
      }, { onConflict: 'slot' });

    if (error) {
      console.error("Errore nel salvataggio su Supabase:", error);
      process.exit(1);
    } else {
      console.log(`Slot ${slot} aggiornato con successo!`);
    }
  } catch (err) {
    console.error("Errore durante l'esecuzione:", err);
    process.exit(1);
  }
}

aggiornaNotizie();
