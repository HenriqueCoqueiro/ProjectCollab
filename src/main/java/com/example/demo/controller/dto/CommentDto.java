package com.example.demo.controller.dto;

import java.time.Instant;
import java.util.UUID;

public record CommentDto(UUID commentId, String content, String username, Instant creationTimestamp) {}
