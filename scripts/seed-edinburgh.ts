import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import plan from './edinburgh-plan.json';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function seed() {
  console.log('🚀 Starting seed...');

  // 1. WIPE FIRST: Remove existing block with this name
  const { data: existingBlock } = await supabase
    .from('blocks')
    .select('id')
    .eq('name', plan.block.name)
    .single();

  if (existingBlock) {
    console.log('🗑️ Cleaning up old Edinburgh data...');
    await supabase.from('blocks').delete().eq('id', existingBlock.id);
  }

  // 2. Insert Block
  const { data: block, error: blockError } = await supabase
    .from('blocks')
    .insert([plan.block])
    .select()
    .single();

  if (blockError) throw blockError;
  console.log('✅ Created Block:', block.name);

  // 3. Loop through weeks and workouts
  for (const week of plan.weeks) {
    const workoutsToInsert = week.workouts.map(w => ({
      ...w,
      block_id: block.id,
      phase: week.phase,
      week_number: week.week_number
    }));

    const { error: workoutError } = await supabase
      .from('workouts')
      .insert(workoutsToInsert);

    if (workoutError) {
      console.error(`❌ Error in week ${week.week_number}:`, workoutError);
    } else {
      console.log(`✅ Seeded Week ${week.week_number}`);
    }
  }

  console.log('🏁 Seed complete! Your database is ready.');
}

seed().catch(console.error);