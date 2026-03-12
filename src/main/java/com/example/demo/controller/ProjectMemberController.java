package com.example.demo.controller;

import com.example.demo.config.ProjectAuthorization;
import com.example.demo.controller.dto.ProjectInviteDto;
import com.example.demo.controller.dto.ProjectMemberResponseDto;
import com.example.demo.controller.dto.UpdateMemberRoleDto;
import com.example.demo.model.ProjectMember;
import com.example.demo.model.ProjectRequest;
import com.example.demo.model.ProjectRole;
import com.example.demo.repository.ProjectMemberRepository;
import com.example.demo.repository.ProjectRepository;
import com.example.demo.repository.ProjectRequestRepository;
import com.example.demo.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

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

    public ProjectMemberController(
            ProjectMemberRepository projectMemberRepository,
            ProjectRequestRepository requestRepository,
            ProjectRepository projectRepository,
            UserRepository userRepository,
            ProjectAuthorization authorization
    ) {
        this.projectMemberRepository = projectMemberRepository;
        this.requestRepository = requestRepository;
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
        this.authorization = authorization;
    }

    @PostMapping("/invite")
    public ResponseEntity<?> inviteMember(
            @PathVariable UUID projectId,
            @RequestBody ProjectInviteDto dto,
            Authentication auth
    ) {

        UUID actorId = UUID.fromString(auth.getName());

        authorization.requireAtLeast(projectId, actorId, ProjectRole.MANAGER);

        boolean alreadyMember =
                projectMemberRepository.existsByProject_ProjectIdAndUser_UserId(
                        projectId,
                        dto.userId()
                );

        if (alreadyMember) {
            return ResponseEntity
                    .badRequest()
                    .body("Usuário já é membro deste projeto");
        }

        if (dto.role() == ProjectRole.OWNER) {

            boolean ownerExists =
                    projectMemberRepository.existsByProject_ProjectIdAndRole(
                            projectId,
                            ProjectRole.OWNER
                    );

            if (ownerExists) {
                return ResponseEntity
                        .badRequest()
                        .body("Projeto já possui um OWNER");
            }
        }

        var user = userRepository.findById(dto.userId()).orElseThrow();
        var project = projectRepository.findById(projectId).orElseThrow();

        ProjectRequest request = new ProjectRequest(user, project);

        requestRepository.save(request);

        return ResponseEntity.ok("Convite enviado");
    }

    @PatchMapping("/{memberId}/role")
    public ResponseEntity<?> updateRole(
            @PathVariable UUID projectId,
            @PathVariable UUID memberId,
            @RequestBody UpdateMemberRoleDto dto,
            Authentication auth
    ) {

        UUID userId = UUID.fromString(auth.getName());

        authorization.requireRole(projectId, userId, ProjectRole.OWNER);

        ProjectMember member = projectMemberRepository
                .findById(memberId)
                .orElseThrow();

        if (dto.role() == ProjectRole.OWNER) {

            boolean ownerExists =
                    projectMemberRepository.existsByProject_ProjectIdAndRole(
                            projectId,
                            ProjectRole.OWNER
                    );

            if (ownerExists && member.getRole() != ProjectRole.OWNER) {
                return ResponseEntity
                        .badRequest()
                        .body("Projeto já possui um OWNER");
            }
        }

        member.setRole(dto.role());

        projectMemberRepository.save(member);

        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{memberId}")
    public ResponseEntity<Void> removeMember(
            @PathVariable UUID projectId,
            @PathVariable UUID memberId,
            Authentication auth
    ) {

        UUID userId = UUID.fromString(auth.getName());

        authorization.requireAtLeast(projectId, userId, ProjectRole.MANAGER);

        projectMemberRepository.deleteById(memberId);

        return ResponseEntity.noContent().build();
    }

    @GetMapping
    public ResponseEntity<List<ProjectMemberResponseDto>> listProjectMembers(
            @PathVariable UUID projectId,
            Authentication auth
    ) {

        UUID userId = UUID.fromString(auth.getName());

        authorization.requireAtLeast(projectId, userId, ProjectRole.MANAGER);

        var members = projectMemberRepository
                .findAllByProject_ProjectId(projectId);

        var response = members.stream()
                .map(member -> new ProjectMemberResponseDto(
                        member.getId(),
                        member.getUser().getUserId(),
                        member.getRole()
                ))
                .toList();

        return ResponseEntity.ok(response);
    }
}