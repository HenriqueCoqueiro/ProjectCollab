package com.example.demo.controller.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record FeedItemDto(Long postId, String content, String username, UUID projectId, String projectNome, Instant creationTimestamp, List<CommentDto> comments) {}
