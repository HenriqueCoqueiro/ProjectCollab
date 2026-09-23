package com.example.demo.controller.dto;

import java.time.Instant;
import java.util.UUID;

/**
 * Uma linha na lista de conversas diretas de um projeto: o "outro usuario"
 * e um resumo da ultima mensagem trocada com ele.
 */
public record ConversationSummaryDto(
        UUID otherUserId,
        String otherUsername,
        String lastMessage,
        Instant lastMessageAt,
        boolean lastMessageMine) {
}
