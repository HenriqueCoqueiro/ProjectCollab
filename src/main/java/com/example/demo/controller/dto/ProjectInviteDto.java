package com.example.demo.controller.dto;

import com.example.demo.model.ProjectRole;

import java.util.UUID;

public record ProjectInviteDto(
        UUID userId,
        ProjectRole role
) {}
