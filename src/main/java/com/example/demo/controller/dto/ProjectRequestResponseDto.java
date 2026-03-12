package com.example.demo.controller.dto;
import com.example.demo.model.ProjectRequestStatus;
import java.util.UUID;

public record ProjectRequestResponseDto(
        UUID requestId,
        UUID userId,
        UUID projectId,
        ProjectRequestStatus status) {
}
