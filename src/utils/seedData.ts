import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const seedDatabase = async () => {
    try {
        toast.info('Starting database seed...', { description: 'This may take a few seconds.' });

        // 1. Leads
        const leads = [
            { name: 'Budi Santoso', phone: '6281234567890', type: 'b2c', status: 'new', source: 'whatsapp', company: 'Personal', address: 'Jl. Sudirman No. 10', area: 'Jakarta Selatan', potential_value: 500000, estimated_kg: 10 },
            { name: 'PT Maju Jaya', phone: '6281122334455', type: 'b2b', status: 'in_progress', source: 'web', company: 'PT Maju Jaya', address: 'Kawasan Industri Pulogadung', area: 'Jakarta Timur', potential_value: 15000000, deal_value: 12000000, estimated_kg: 500, pickup_date: '2024-03-15', pickup_status: 'Scheduled' },
            { name: 'Siti Aminah', phone: '6281345678901', type: 'b2c', status: 'followed_up', source: 'instagram', company: 'Toko Kue Siti', address: 'Jl. Melawai Raya', area: 'Jakarta Selatan', potential_value: 750000, estimated_kg: 15 },
            { name: 'CV Berkah Abadi', phone: '6281987654321', type: 'b2b', status: 'completed', source: 'referral', company: 'CV Berkah Abadi', address: 'Jl. Gatot Subroto', area: 'Jakarta Pusat', potential_value: 25000000, final_value: 25000000, estimated_kg: 1000, pickup_date: '2024-02-28', pickup_status: 'Completed' },
            { name: 'Andi Wijaya', phone: '6281512345678', type: 'b2c', status: 'lost', source: 'facebook', company: 'Kedai Kopi Andi', address: 'Jl. Kemang Raya', area: 'Jakarta Selatan', potential_value: 300000, estimated_kg: 5 }
        ] as any;

        const { data: createdLeads, error: leadError } = await supabase.from('leads').insert(leads).select();
        if (leadError) throw new Error(`Leads Error: ${leadError.message}`);

        // 2. Chats & Messages (Linked to first lead)
        if (createdLeads && createdLeads.length > 0) {
            const lead = createdLeads[0];
            const { data: chat, error: chatError } = await supabase.from('chats').insert({
                contact_phone: lead.phone,
                contact_name: lead.name,
                unread: 2,
                status: 'new',
                is_answered: false,
                last_message: 'Halo, apakah layanan ini tersedia?',
                last_timestamp: new Date().toISOString(),
                lead_id: lead.id,
                channel: 'whatsapp'
            }).select().single();

            if (chatError) throw new Error(`Chat Error: ${chatError.message}`);

            if (chat) {
                const messages = [
                    { chat_id: chat.id, sender: 'customer', text: 'Halo, apakah layanan ini tersedia?', created_at: new Date(Date.now() - 3600000).toISOString() },
                    { chat_id: chat.id, sender: 'agent', text: 'Halo kak, tersedia. Ada yang bisa dibantu?', created_at: new Date(Date.now() - 3000000).toISOString() }
                ];
                const { error: msgError } = await supabase.from('messages').insert(messages);
                if (msgError) throw new Error(`Messages Error: ${msgError.message}`);
            }
        }

        // 3. Contacts
        const contacts = [
            { name: 'Supplier Plastik', phone: '62811111111', company: 'CV Plastik Jaya', type: 'vendor', status: 'active', source: 'manual' },
            { name: 'Mitra Logistik', phone: '62822222222', company: 'PT Logistik Cepat', type: 'partner', status: 'active', source: 'manual' }
        ] as any;
        const { error: contactError } = await supabase.from('contacts').insert(contacts);
        if (contactError) throw new Error(`Contacts Error: ${contactError.message}`);

        // 4. Broadcast Logs
        const logs = [
            { sent_by: 'admin@remindhub.com', message_template: 'Promo Spesial Ramadhan! Diskon 20% untuk penjemputan minggu ini.', sent_at: new Date(Date.now() - 172800000).toISOString(), total_recipients: 150, delivery_status: 'sent', mode: 'live', filters: { status: 'all', area: 'Jakarta' } },
            { sent_by: 'admin@remindhub.com', message_template: 'Update Layanan: Kami sekarang buka hari Minggu.', sent_at: new Date(Date.now() - 604800000).toISOString(), total_recipients: 500, delivery_status: 'sent', mode: 'dummy', filters: { status: 'customer' } }
        ] as any;
        const { error: logError } = await supabase.from('broadcast_logs').insert(logs);
        if (logError) throw new Error(`Broadcast Logs Error: ${logError.message}`);

        // 5. Forms
        const { data: form, error: formError } = await supabase.from('forms').insert({
            name: 'Registrasi Penjemputan',
            slug: 'pickup-reg',
            platform: 'web',
            is_active: true
        }).select().single();

        if (formError) throw new Error(`Forms Error: ${formError.message}`);

        if (form) {
            const { error: subError } = await supabase.from('form_submissions').insert({
                form_id: form.id,
                form_name: form.name,
                data: { name: 'Budi', address: 'Jl. Baru', kg: '20' },
                source_platform: 'web'
            } as any);
            if (subError) throw new Error(`Form Submissions Error: ${subError.message}`);
        }

        toast.success('Database seeded successfully!', { description: 'Please refresh the page to see the data.' });
        return true;
    } catch (error: any) {
        console.error('Seeding failed:', error);
        toast.error('Seeding failed', { description: error.message || 'Check console for details. Ensure RLS policies are fixed.' });
        return false;
    }
};
