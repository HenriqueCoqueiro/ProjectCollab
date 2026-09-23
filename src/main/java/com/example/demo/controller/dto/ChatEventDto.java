package com.example.demo.controller.dto;

import java.util.UUID;

/**
 * Evento publicado em /topic/projects/{projectId}/chat sempre que uma
 * mensagem e criada, editada ou removida. type e um destes valores:
 * "CREATED", "UPDATED", "DELETED".
 */
public record ChatEventDto(String type, ChatMessageResponseDto message, UUID messageId) {

    public static ChatEventDto created(ChatMessageResponseDto message) {
        return new ChatEventDto("CREATED", message, message.messageId());
    }

    public static ChatEventDto updated(ChatMessageResponseDto message) {
        return new ChatEventDto("UPDATED", message, message.messageId());
    }

    public static ChatEventDto deleted(UUID messageId) {
        return new ChatEventDto("DELETED", null, messageId);
    }
}
