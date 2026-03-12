package com.example.demo.controller.dto;

import java.time.Instant;

public record ProjectResponseDto<UUID>(
        UUID projectId,
        String nome,
        String descricao,
        UUID ownerId,
        Instant creationTimeStamp) {

}
