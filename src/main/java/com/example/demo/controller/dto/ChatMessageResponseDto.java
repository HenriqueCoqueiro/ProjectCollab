package com.example.demo.controller.dto;

import java.time.Instant;
import java.util.UUID;

public record ChatMessageResponseDto(UUID messageId, String senderName, String content, Instant creationTimestamp) {
}
