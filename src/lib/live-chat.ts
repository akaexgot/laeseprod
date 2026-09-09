import type { SupabaseClient } from '@supabase/supabase-js';

type ChatSender = 'visitor' | 'admin' | 'system';

function missingRequiredColumn(error: any, column: string) {
    return error?.code === '23502' && String(error?.message || '').includes(`"${column}"`);
}

function isStatusConstraintError(error: any) {
    return error?.code === '23514'
        && String(error?.message || '').includes('chat_conversations_status_check');
}

export async function insertChatConversation(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
    legacy: { visitorId: string; visitorName: string },
) {
    const retryPayload = { ...payload };

    for (let attempt = 0; attempt < 4; attempt += 1) {
        const result = await supabase
            .from('chat_conversations')
            .insert(retryPayload)
            .select('id, client_token, name, email, phone, status, created_at')
            .single();

        if (!result.error) return result;

        let canRetry = false;

        if (missingRequiredColumn(result.error, 'visitor_id') && !retryPayload.visitor_id) {
            retryPayload.visitor_id = legacy.visitorId;
            canRetry = true;
        }

        if (missingRequiredColumn(result.error, 'visitor_name') && !retryPayload.visitor_name) {
            retryPayload.visitor_name = legacy.visitorName;
            canRetry = true;
        }

        if (isStatusConstraintError(result.error) && retryPayload.status !== 'open') {
            retryPayload.status = 'open';
            canRetry = true;
        }

        if (!canRetry) return result;
    }

    return supabase
        .from('chat_conversations')
        .insert(retryPayload)
        .select('id, client_token, name, email, phone, status, created_at')
        .single();
}

export async function insertChatMessage(
    supabase: SupabaseClient,
    payload: { conversation_id: string; sender: ChatSender; message: string },
    legacyId: string,
) {
    const retryPayload: Record<string, unknown> = { ...payload };

    for (let attempt = 0; attempt < 8; attempt += 1) {
        const result = await supabase
            .from('chat_messages')
            .insert(retryPayload)
            .select('id, conversation_id, sender, message, created_at')
            .single();

        if (!result.error) return result;

        let canRetry = false;

        if (missingRequiredColumn(result.error, 'content') && !retryPayload.content) {
            retryPayload.content = payload.message;
            canRetry = true;
        }

        if (missingRequiredColumn(result.error, 'body') && !retryPayload.body) {
            retryPayload.body = payload.message;
            canRetry = true;
        }

        if (missingRequiredColumn(result.error, 'sender_type') && !retryPayload.sender_type) {
            retryPayload.sender_type = payload.sender;
            canRetry = true;
        }

        if (missingRequiredColumn(result.error, 'sender_id') && !retryPayload.sender_id) {
            retryPayload.sender_id = legacyId;
            canRetry = true;
        }

        if (missingRequiredColumn(result.error, 'visitor_id') && !retryPayload.visitor_id) {
            retryPayload.visitor_id = legacyId;
            canRetry = true;
        }

        if (missingRequiredColumn(result.error, 'admin_id') && !retryPayload.admin_id) {
            retryPayload.admin_id = legacyId;
            canRetry = true;
        }

        if (!canRetry) return result;
    }

    return supabase
        .from('chat_messages')
        .insert(retryPayload)
        .select('id, conversation_id, sender, message, created_at')
        .single();
}
