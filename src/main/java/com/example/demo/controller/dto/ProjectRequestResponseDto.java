package com.example.demo.controller.dto;
import com.example.demo.model.ProjectRequestStatus;
import com.example.demo.model.ProjectRequestType;
import java.util.UUID;

public record ProjectRequestResponseDto(
        UUID requestId,
        UUID userId,
        String username,
        UUID projectId,
        String projectNome,
        ProjectRequestStatus status,
        ProjectRequestType type) {
}
