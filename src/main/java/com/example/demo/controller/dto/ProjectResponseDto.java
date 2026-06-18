package com.example.demo.controller.dto;

import java.time.Instant;
import java.util.UUID;

public record ProjectResponseDto(
        UUID projectId,
        String nome,
        String descricao,
        UUID ownerId,
        Instant creationTimestamp) {}
