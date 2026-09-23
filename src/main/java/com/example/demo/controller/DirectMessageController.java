package com.example.demo.controller;

import com.example.demo.config.ProjectAuthorization;
import com.example.demo.controller.dto.ConversationSummaryDto;
import com.example.demo.controller.dto.CreateChatMessageDto;
import com.example.demo.controller.dto.DirectMessageEventDto;
import com.example.demo.controller.dto.DirectMessageResponseDto;
import com.example.demo.model.DirectMessage;
import com.example.demo.model.ProjectRole;
import com.example.demo.repository.DirectMessageRepository;
import com.example.demo.repository.ProjectRepository;
import com.example.demo.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.UUID;

/**
 * Chat direto (1-para-1) entre dois membros de um mesmo projeto.
 *
 * Reaproveita toda a infraestrutura de WebSocket ja existente para o chat
 * em grupo (mesma conexao /ws, mesmo JWT, mesmo SimpMessagingTemplate):
 * a escrita continua sendo feita via REST aqui, e apos persistir a
 * mensagem publicamos um evento na fila privada do usuario
 * (/user/{userId}/queue/dm), entregue em tempo real para remetente e
 * destinatario - ver WebSocketConfig e ChatSubscriptionInterceptor.
 */
@RestController
@RequestMapping("/projects/{projectId}/dm")
public class DirectMessageController {

    private final DirectMessageRepository dmRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final ProjectAuthorization authorization;
    private final SimpMessagingTemplate messagingTemplate;

    public DirectMessageController(DirectMessageRepository dmRepository,
                                    ProjectRepository projectRepository,
                                    UserRepository userRepository,
                                    ProjectAuthorization authorization,
                                    SimpMessagingTemplate messagingTemplate) {
        this.dmRepository = dmRepository;
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
        this.authorization = authorization;
        this.messagingTemplate = messagingTemplate;
    }

    private DirectMessageResponseDto toDto(DirectMessage m) {
        return new DirectMessageResponseDto(
                m.getMessageId(),
                m.getProject().getProjectId(),
                m.getSender().getUserId(),
                m.getSender().getUsername(),
                m.getRecipient().getUserId(),
                m.getRecipient().getUsername(),
                m.getContent(),
                m.getCreationTimestamp());
    }

    // Envia o evento para as duas filas privadas envolvidas na conversa,
    // para que remetente (outras abas/dispositivos) e destinatario
    // recebam a atualizacao em tempo real.
    private void notifyParticipants(DirectMessageEventDto event, UUID senderId, UUID recipientId) {
        messagingTemplate.convertAndSendToUser(senderId.toString(), "/queue/dm", event);
        if (!recipientId.equals(senderId)) {
            messagingTemplate.convertAndSendToUser(recipientId.toString(), "/queue/dm", event);
        }
    }

    private void requireDistinctProjectMembers(UUID projectId, UUID userId, UUID otherUserId) {
        authorization.requireAtLeast(projectId, userId, ProjectRole.MEMBER);
        // o destinatario tambem precisa pertencer ao projeto - o chat direto
        // e um recurso "do projeto", entre colegas de equipe, nao uma DM
        // global entre quaisquer dois usuarios do sistema
        authorization.getMembership(projectId, otherUserId);

        if (otherUserId.equals(userId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Não é possível conversar consigo mesmo");
        }
    }

    @GetMapping
    public ResponseEntity<List<ConversationSummaryDto>> listConversations(
            @PathVariable UUID projectId,
            JwtAuthenticationToken token) {

        UUID userId = UUID.fromString(token.getName());
        authorization.requireAtLeast(projectId, userId, ProjectRole.MEMBER);

        var all = dmRepository.findAllForUserInProject(projectId, userId);

        var seenUsers = new LinkedHashSet<UUID>();
        var summaries = new ArrayList<ConversationSummaryDto>();
        for (var m : all) {
            boolean sentByMe = m.getSender().getUserId().equals(userId);
            var other = sentByMe ? m.getRecipient() : m.getSender();
            if (!seenUsers.add(other.getUserId())) continue; // ja pegamos a mensagem mais recente com essa pessoa

            summaries.add(new ConversationSummaryDto(
                    other.getUserId(),
                    other.getUsername(),
                    m.getContent(),
                    m.getCreationTimestamp(),
                    sentByMe));
        }

        return ResponseEntity.ok(summaries);
    }

    @GetMapping("/{otherUserId}")
    public ResponseEntity<List<DirectMessageResponseDto>> getConversation(
            @PathVariable UUID projectId,
            @PathVariable UUID otherUserId,
            JwtAuthenticationToken token) {

        UUID userId = UUID.fromString(token.getName());
        requireDistinctProjectMembers(projectId, userId, otherUserId);

        var messages = dmRepository.findConversation(projectId, userId, otherUserId)
                .stream()
                .map(this::toDto)
                .toList();

        return ResponseEntity.ok(messages);
    }

    @PostMapping("/{otherUserId}")
    public ResponseEntity<DirectMessageResponseDto> sendMessage(
            @PathVariable UUID projectId,
            @PathVariable UUID otherUserId,
            @RequestBody CreateChatMessageDto dto,
            JwtAuthenticationToken token) {

        UUID userId = UUID.fromString(token.getName());
        requireDistinctProjectMembers(projectId, userId, otherUserId);

        if (dto.content() == null || dto.content().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mensagem vazia");
        }

        var project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        var sender = userRepository.findById(userId).orElseThrow();
        var recipient = userRepository.findById(otherUserId).orElseThrow();

        var message = new DirectMessage();
        message.setProject(project);
        message.setSender(sender);
        message.setRecipient(recipient);
        message.setContent(dto.content());

        var saved = dmRepository.save(message);
        var responseDto = toDto(saved);

        notifyParticipants(DirectMessageEventDto.created(responseDto), userId, otherUserId);

        return ResponseEntity.status(HttpStatus.CREATED).body(responseDto);
    }

    @PutMapping("/{otherUserId}/{messageId}")
    public ResponseEntity<Void> editMessage(
            @PathVariable UUID projectId,
            @PathVariable UUID otherUserId,
            @PathVariable UUID messageId,
            @RequestBody CreateChatMessageDto dto,
            JwtAuthenticationToken token) {

        UUID userId = UUID.fromString(token.getName());
        requireDistinctProjectMembers(projectId, userId, otherUserId);

        var message = dmRepository.findById(messageId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        if (!message.getProject().getProjectId().equals(projectId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
        if (!message.getSender().getUserId().equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        message.setContent(dto.content());
        var saved = dmRepository.save(message);
        var responseDto = toDto(saved);

        notifyParticipants(DirectMessageEventDto.updated(responseDto), userId, otherUserId);

        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{otherUserId}/{messageId}")
    public ResponseEntity<Void> deleteMessage(
            @PathVariable UUID projectId,
            @PathVariable UUID otherUserId,
            @PathVariable UUID messageId,
            JwtAuthenticationToken token) {

        UUID userId = UUID.fromString(token.getName());
        requireDistinctProjectMembers(projectId, userId, otherUserId);

        var message = dmRepository.findById(messageId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        if (!message.getProject().getProjectId().equals(projectId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
        // conversa privada: so o autor pode apagar a propria mensagem (sem
        // "poder de manager" como no chat em grupo - aqui nao ha grupo)
        if (!message.getSender().getUserId().equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        dmRepository.deleteById(messageId);

        notifyParticipants(DirectMessageEventDto.deleted(projectId, messageId, userId, otherUserId), userId, otherUserId);

        return ResponseEntity.noContent().build();
    }
}
