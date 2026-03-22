import { getServiceSupabase } from './src/lib/supabase.ts';

async function setupStorage() {
    const supabase = getServiceSupabase();
    if (!supabase) {
        console.error('No Supabase client');
        return;
    }

    const { data, error } = await supabase.storage.createBucket('logos', {
        public: true,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'],
        fileSizeLimit: 2 * 1024 * 1024 // 2MB
    });

    if (error) {
        if (error.message.includes('already exists')) {
            console.log('Bucket "logos" already exists.');
        } else {
            console.error('Error creating bucket:', error);
        }
    } else {
        console.log('Bucket "logos" created successfully:', data);
    }
}

setupStorage();
