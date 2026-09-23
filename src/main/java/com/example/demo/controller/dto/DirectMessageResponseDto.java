package com.example.demo.controller.dto;

import java.time.Instant;
import java.util.UUID;

public record DirectMessageResponseDto(
        UUID messageId,
        UUID projectId,
        UUID senderId,
        String senderName,
        UUID recipientId,
        String recipientName,
        String content,
        Instant creationTimestamp) {
}
