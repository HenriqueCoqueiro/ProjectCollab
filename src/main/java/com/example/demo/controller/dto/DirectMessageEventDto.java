package com.example.demo.controller.dto;

import java.util.UUID;

/**
 * Evento entregue em tempo real em /user/queue/dm sempre que uma mensagem
 * direta e criada, editada ou removida. type e um destes valores:
 * "CREATED", "UPDATED", "DELETED".
 *
 * senderId/recipientId vao sempre preenchidos (mesmo no DELETED, onde
 * "message" e null) para o front conseguir identificar de qual conversa
 * (com qual "outro usuario") o evento faz parte.
 */
public record DirectMessageEventDto(
        String type,
        DirectMessageResponseDto message,
        UUID messageId,
        UUID projectId,
        UUID senderId,
        UUID recipientId) {

    public static DirectMessageEventDto created(DirectMessageResponseDto message) {
        return new DirectMessageEventDto("CREATED", message, message.messageId(),
                message.projectId(), message.senderId(), message.recipientId());
    }

    public static DirectMessageEventDto updated(DirectMessageResponseDto message) {
        return new DirectMessageEventDto("UPDATED", message, message.messageId(),
                message.projectId(), message.senderId(), message.recipientId());
    }

    public static DirectMessageEventDto deleted(UUID projectId, UUID messageId,
                                                 UUID senderId, UUID recipientId) {
        return new DirectMessageEventDto("DELETED", null, messageId, projectId, senderId, recipientId);
    }
}
