package com.example.demo.controller.dto;

import com.example.demo.model.ProjectRole;
import java.util.UUID;

public record ProjectMemberResponseDto(
        UUID memberId,
        UUID userId,
        ProjectRole role
) {}