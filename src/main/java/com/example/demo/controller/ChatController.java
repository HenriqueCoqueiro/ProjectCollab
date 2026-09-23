package com.example.demo.controller;

import com.example.demo.config.ProjectAuthorization;
import com.example.demo.controller.dto.ChatEventDto;
import com.example.demo.controller.dto.ChatMessageResponseDto;
import com.example.demo.controller.dto.CreateChatMessageDto;
import com.example.demo.model.ChatMessage;
import com.example.demo.model.ProjectRole;
import com.example.demo.repository.ChatMessageRepository;
import com.example.demo.repository.ProjectRepository;
import com.example.demo.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/projects/{projectId}/chat")
public class ChatController {

    private final ChatMessageRepository chatRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final ProjectAuthorization authorization;
    private final SimpMessagingTemplate messagingTemplate;

    public ChatController(ChatMessageRepository chatRepository,
                          ProjectRepository projectRepository,
                          UserRepository userRepository,
                          ProjectAuthorization authorization,
                          SimpMessagingTemplate messagingTemplate) {
        this.chatRepository = chatRepository;
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
        this.authorization = authorization;
        this.messagingTemplate = messagingTemplate;
    }

    private void broadcast(UUID projectId, ChatEventDto event) {
        messagingTemplate.convertAndSend("/topic/projects/" + projectId + "/chat", event);
    }

    @GetMapping
    public ResponseEntity<List<ChatMessageResponseDto>> getMessages(
            @PathVariable UUID projectId,
            JwtAuthenticationToken token) {

        UUID userId = UUID.fromString(token.getName());
        authorization.requireAtLeast(projectId, userId, ProjectRole.MEMBER);

        var messages = chatRepository
                .findByProjectProjectIdOrderByCreationTimestampAsc(projectId)
                .stream()
                .map(msg -> new ChatMessageResponseDto(
                        msg.getMessageId(),
                        msg.getSender().getUsername(),
                        msg.getContent(),
                        msg.getCreationTimestamp()))
                .toList();

        return ResponseEntity.ok(messages);
    }

    @PostMapping
    public ResponseEntity<ChatMessageResponseDto> sendMessage(
            @PathVariable UUID projectId,
            @RequestBody CreateChatMessageDto dto,
            JwtAuthenticationToken token) {

        UUID userId = UUID.fromString(token.getName());
        authorization.requireAtLeast(projectId, userId, ProjectRole.MEMBER);

        var project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        var user = userRepository.findById(userId).orElseThrow();

        var message = new ChatMessage();
        message.setProject(project);
        message.setSender(user);
        message.setContent(dto.content());

        var saved = chatRepository.save(message);

        var responseDto = new ChatMessageResponseDto(
                saved.getMessageId(),
                saved.getSender().getUsername(),
                saved.getContent(),
                saved.getCreationTimestamp());

        broadcast(projectId, ChatEventDto.created(responseDto));

        return ResponseEntity.status(HttpStatus.CREATED).body(responseDto);
    }

    @PutMapping("/{messageId}")
    public ResponseEntity<Void> editMessage(
            @PathVariable UUID projectId,
            @PathVariable UUID messageId,
            @RequestBody CreateChatMessageDto dto,
            JwtAuthenticationToken token) {

        UUID userId = UUID.fromString(token.getName());
        authorization.requireAtLeast(projectId, userId, ProjectRole.MEMBER);

        var message = chatRepository.findById(messageId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        if (!message.getSender().getUserId().equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        message.setContent(dto.content());
        var saved = chatRepository.save(message);

        var responseDto = new ChatMessageResponseDto(
                saved.getMessageId(),
                saved.getSender().getUsername(),
                saved.getContent(),
                saved.getCreationTimestamp());

        broadcast(projectId, ChatEventDto.updated(responseDto));

        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{messageId}")
    public ResponseEntity<Void> deleteMessage(
            @PathVariable UUID projectId,
            @PathVariable UUID messageId,
            JwtAuthenticationToken token) {

        UUID userId = UUID.fromString(token.getName());
        authorization.requireAtLeast(projectId, userId, ProjectRole.MEMBER);

        var message = chatRepository.findById(messageId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        boolean isAuthor  = message.getSender().getUserId().equals(userId);
        boolean isManager = authorization.getMembership(projectId, userId)
                .getRole().ordinal() <= ProjectRole.MANAGER.ordinal();

        if (!isAuthor && !isManager) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        chatRepository.deleteById(messageId);

        broadcast(projectId, ChatEventDto.deleted(messageId));

        return ResponseEntity.noContent().build();
    }
}
