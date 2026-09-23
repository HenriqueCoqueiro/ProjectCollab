package com.example.demo.controller;

import com.example.demo.config.ProjectAuthorization;
import com.example.demo.controller.dto.*;
import com.example.demo.model.*;
import com.example.demo.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/projects/{projectId}/members")
public class ProjectMemberController {

    private final ProjectMemberRepository projectMemberRepository;
    private final ProjectRequestRepository requestRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final ProjectAuthorization authorization;

    public ProjectMemberController(ProjectMemberRepository projectMemberRepository,
                                   ProjectRequestRepository requestRepository,
                                   ProjectRepository projectRepository,
                                   UserRepository userRepository,
                                   ProjectAuthorization authorization) {
        this.projectMemberRepository = projectMemberRepository;
        this.requestRepository = requestRepository;
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
        this.authorization = authorization;
    }

    @GetMapping
    public ResponseEntity<List<ProjectMemberResponseDto>> listProjectMembers(
            @PathVariable UUID projectId,
            JwtAuthenticationToken token) {
        // Lista de membros é leitura pública para qualquer usuário autenticado
        // (não exige ser membro do projeto) — mesma exposição que já existe em
        // GET /projects e GET /projects/{id}, que mostram nome, descrição e
        // ownerId do projeto para qualquer um. Sem essa leitura, quem ainda
        // não é membro nem consegue ver quem é o dono antes de pedir entrada.
        // Ações de escrita (convidar, alterar cargo, remover) continuam
        // exigindo MANAGER/OWNER normalmente, como já era.
        var response = projectMemberRepository.findAllByProject_ProjectId(projectId).stream()
                .map(m -> new ProjectMemberResponseDto(
                        m.getId(), m.getUser().getUserId(), m.getUser().getUsername(), m.getRole()))
                .toList();
        return ResponseEntity.ok(response);
    }

    @PostMapping("/invite")
    public ResponseEntity<?> inviteMember(@PathVariable UUID projectId,
                                          @RequestBody ProjectInviteDto dto,
                                          JwtAuthenticationToken token) {
        UUID actorId = UUID.fromString(token.getName());
        authorization.requireAtLeast(projectId, actorId, ProjectRole.MANAGER);

        if (dto.role() == ProjectRole.OWNER) {
            return ResponseEntity.badRequest().body("Não é possível convidar alguém diretamente como owner");
        }

        if (projectMemberRepository.existsByProject_ProjectIdAndUser_UserId(projectId, dto.userId())) {
            return ResponseEntity.badRequest().body("Usuário já é membro deste projeto");
        }

        var user = userRepository.findById(dto.userId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        var project = projectRepository.findById(projectId).orElseThrow();

        requestRepository.save(new ProjectRequest(user, project, dto.role()));
        return ResponseEntity.ok("Convite enviado");
    }

    @PatchMapping("/{memberId}/role")
    public ResponseEntity<?> updateRole(@PathVariable UUID projectId,
                                        @PathVariable UUID memberId,
                                        @RequestBody UpdateMemberRoleDto dto,
                                        JwtAuthenticationToken token) {
        UUID userId = UUID.fromString(token.getName());
        authorization.requireRole(projectId, userId, ProjectRole.OWNER);

        var member = projectMemberRepository.findById(memberId).orElseThrow();

        if (dto.role() == ProjectRole.OWNER) {
            boolean ownerExists = projectMemberRepository.existsByProject_ProjectIdAndRole(projectId, ProjectRole.OWNER);
            if (ownerExists && member.getRole() != ProjectRole.OWNER) {
                return ResponseEntity.badRequest().body("Projeto já possui um owner");
            }
        }

        member.setRole(dto.role());
        projectMemberRepository.save(member);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/me")
    public ResponseEntity<Void> leaveProject(@PathVariable UUID projectId,
                                             JwtAuthenticationToken token) {
        UUID userId = UUID.fromString(token.getName());
        var membership = authorization.getMembership(projectId, userId);

        if (membership.getRole() == ProjectRole.OWNER) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        projectMemberRepository.deleteById(membership.getId());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{memberId}")
    public ResponseEntity<Void> removeMember(@PathVariable UUID projectId,
                                             @PathVariable UUID memberId,
                                             JwtAuthenticationToken token) {
        UUID userId = UUID.fromString(token.getName());
        var actor  = authorization.getMembership(projectId, userId);
        var target = projectMemberRepository.findById(memberId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        boolean actorOutranksTarget = actor.getRole().ordinal() < target.getRole().ordinal();
        if (!actorOutranksTarget) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        projectMemberRepository.deleteById(memberId);
        return ResponseEntity.noContent().build();
    }
}
