import { createClient } from '@supabase/supabase-js';
import { automationService } from './automationService';
import { getEnv } from '../utils/env';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseKey = getEnv('VITE_SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseKey) {
  console.error('Erro: VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórios.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🚀 ALS Automation Bot iniciado...');
console.log('Monitorando mudanças de status na tabela "trips"...');

// Inscrição em tempo real para mudanças na tabela de viagens
supabase
  .channel('trips-status-changes')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'trips'
    },
    async (payload) => {
      const oldTrip = payload.old;
      const newTrip = payload.new;

      // Verifica se o status mudou
      if (oldTrip.status !== newTrip.status) {
        console.log(`[Bot] Status alterado: ${oldTrip.status} -> ${newTrip.status} (OS: ${newTrip.os})`);
        
        // Dispara a automação
        // Nota: O automationService precisará ser capaz de rodar aqui.
        // Como ele usa o 'db' do storage.ts, precisamos garantir que o storage.ts funcione no Node.
        await automationService.triggerAutomation(newTrip as any, newTrip.status);
      }
    }
  )
  .subscribe();

// Mantém o processo vivo
process.on('SIGINT', () => {
  console.log('Encerrando bot...');
  process.exit(0);
});
