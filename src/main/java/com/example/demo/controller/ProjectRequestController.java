package com.example.demo.controller;

import com.example.demo.controller.dto.ProjectRequestResponseDto;
import com.example.demo.model.*;
import com.example.demo.repository.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
public class ProjectRequestController {

    private final ProjectRequestRepository requestRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final ProjectMemberRepository memberRepository;

    public ProjectRequestController(
            ProjectRequestRepository requestRepository,
            ProjectRepository projectRepository,
            UserRepository userRepository,
            ProjectMemberRepository memberRepository
    ) {
        this.requestRepository = requestRepository;
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
        this.memberRepository = memberRepository;
    }

    @PostMapping("/projects/{projectId}/join")
    public ResponseEntity<?> requestToJoin(
            @PathVariable UUID projectId,
            Authentication auth
    ) {
        UUID userId = UUID.fromString(auth.getName());

        boolean alreadyMember = memberRepository.existsByProject_ProjectIdAndUser_UserId(projectId, userId);
        if (alreadyMember) {
            return ResponseEntity.badRequest().body("Usuário já é membro do projeto");
        }

        var actor = userRepository.findById(userId).orElseThrow();
        var project = projectRepository.findById(projectId).orElseThrow();

        project.sendJoinRequest(actor);
        projectRepository.save(project);

        return ResponseEntity.ok("Solicitação enviada");
    }

    @GetMapping("/requests/my")
    public ResponseEntity<List<ProjectRequestResponseDto>> myRequests(Authentication auth) {
        UUID userId = UUID.fromString(auth.getName());

        var response = requestRepository.findByUser_UserId(userId).stream()
                .map(req -> new ProjectRequestResponseDto(
                        req.getRequestId(),
                        req.getUser().getUserId(),
                        req.getUser().getUsername(),
                        req.getProject().getProjectId(),
                        req.getProject().getNome(),
                        req.getStatus(),
                        req.getType()
                ))
                .toList();

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/requests/{requestId}")
    public ResponseEntity<?> cancelRequest(
            @PathVariable UUID requestId,
            Authentication auth
    ) {
        UUID userId = UUID.fromString(auth.getName());

        var request = requestRepository.findById(requestId).orElseThrow();

        if (!request.getUser().getUserId().equals(userId)) {
            return ResponseEntity.status(403).body("Você não pode cancelar esta solicitação");
        }

        requestRepository.delete(request);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/invites/{requestId}/accept")
    public ResponseEntity<?> acceptInvite(
            @PathVariable UUID requestId,
            Authentication auth
    ) {
        UUID userId = UUID.fromString(auth.getName());

        var request = requestRepository.findById(requestId).orElseThrow();

        if (!request.getUser().getUserId().equals(userId)) {
            return ResponseEntity.status(403).body("Este convite não é seu");
        }

        if (request.getType() != ProjectRequestType.INVITE) {
            return ResponseEntity.status(403)
                    .body("Isto é uma solicitação de entrada enviada por você, não um convite. Aguarde a aprovação de um gerente do projeto.");
        }

        var member = new ProjectMember();
        member.setProject(request.getProject());
        member.setUser(request.getUser());
        member.setRole(request.getInvitedRole() != null ? request.getInvitedRole() : ProjectRole.MEMBER);

        memberRepository.save(member);
        requestRepository.delete(request);

        return ResponseEntity.ok("Convite aceito");
    }

    @PostMapping("/invites/{requestId}/reject")
    public ResponseEntity<?> rejectInvite(
            @PathVariable UUID requestId,
            Authentication auth
    ) {
        UUID userId = UUID.fromString(auth.getName());

        var request = requestRepository.findById(requestId).orElseThrow();

        if (!request.getUser().getUserId().equals(userId)) {
            return ResponseEntity.status(403).body("Este convite não é seu");
        }

        if (request.getType() != ProjectRequestType.INVITE) {
            return ResponseEntity.status(403)
                    .body("Isto é uma solicitação de entrada enviada por você, não um convite. Use cancelar em vez de recusar.");
        }

        requestRepository.delete(request);
        return ResponseEntity.ok("Convite recusado");
    }
}
