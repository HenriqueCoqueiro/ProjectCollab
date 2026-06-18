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
@RequestMapping("/projects")
public class ProjectController {

    private final ProjectRepository projectRepository;
    private final ProjectRequestRepository requestRepository;
    private final UserRepository userRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final ProjectAuthorization authorization;

    public ProjectController(ProjectRepository projectRepository,
                             ProjectRequestRepository requestRepository,
                             UserRepository userRepository,
                             ProjectMemberRepository projectMemberRepository,
                             ProjectAuthorization authorization) {
        this.projectRepository = projectRepository;
        this.requestRepository = requestRepository;
        this.userRepository = userRepository;
        this.projectMemberRepository = projectMemberRepository;
        this.authorization = authorization;
    }

    @PostMapping
    public ResponseEntity<Void> createProject(@RequestBody CreateProjectDto dto,
                                              JwtAuthenticationToken token) {
        var user = userRepository.findById(UUID.fromString(token.getName())).orElseThrow();

        var project = new Project();
        project.setNome(dto.nome());
        project.setDescricao(dto.descricao());
        project.setOwner(user);
        projectRepository.save(project);

        var membership = new ProjectMember();
        membership.setProject(project);
        membership.setUser(user);
        membership.setRole(ProjectRole.OWNER);
        projectMemberRepository.save(membership);

        return ResponseEntity.ok().build();
    }

    @GetMapping
    public ResponseEntity<List<ProjectResponseDto>> listProjects() {
        var response = projectRepository.findAll().stream()
                .map(p -> new ProjectResponseDto(
                        p.getProjectId(), p.getNome(), p.getDescricao(),
                        p.getOwner().getUserId(), p.getCreationTimestamp()))
                .toList();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{projectId}")
    public ResponseEntity<ProjectResponseDto> getProject(@PathVariable UUID projectId) {
        var project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        return ResponseEntity.ok(new ProjectResponseDto(
                project.getProjectId(), project.getNome(), project.getDescricao(),
                project.getOwner().getUserId(), project.getCreationTimestamp()));
    }

    @PatchMapping("/{projectId}")
    public ResponseEntity<Void> updateProject(@PathVariable UUID projectId,
                                              @RequestBody UpdateProjectDto dto,
                                              JwtAuthenticationToken token) {
        var userId = UUID.fromString(token.getName());
        var project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        authorization.requireAtLeast(projectId, userId, ProjectRole.MANAGER);

        if (dto.nome() != null && !dto.nome().isBlank()) project.setNome(dto.nome());
        if (dto.descricao() != null) project.setDescricao(dto.descricao());
        projectRepository.save(project);

        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{projectId}")
    public ResponseEntity<Void> deleteProject(@PathVariable UUID projectId,
                                              JwtAuthenticationToken token) {
        var project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        authorization.requireRole(projectId, UUID.fromString(token.getName()), ProjectRole.OWNER);
        projectRepository.delete(project);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{projectId}/requests")
    public ResponseEntity<List<ProjectRequestResponseDto>> listProjectRequests(
            @PathVariable UUID projectId,
            JwtAuthenticationToken token) {
        var userId = UUID.fromString(token.getName());
        var project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        authorization.requireAtLeast(projectId, userId, ProjectRole.MANAGER);

        var response = project.getRequests().stream()
                .filter(r -> r.getStatus() == com.example.demo.model.ProjectRequestStatus.PENDING)
                .map(r -> new ProjectRequestResponseDto(
                        r.getRequestId(), r.getUser().getUserId(),
                        r.getUser().getUsername(),
                        r.getProject().getProjectId(), r.getProject().getNome(),
                        r.getStatus(), r.getType()))
                .toList();
        return ResponseEntity.ok(response);
    }

    private void updateRequestStatus(UUID requestId, UUID actorId, boolean accept) {
        var request = requestRepository.findById(requestId).orElseThrow();
        var project = request.getProject();
        authorization.requireAtLeast(project.getProjectId(), actorId, ProjectRole.MANAGER);

        if (request.getType() != ProjectRequestType.JOIN_REQUEST) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Isto é um convite enviado pelo projeto; apenas o usuário convidado pode aceitá-lo ou recusá-lo.");
        }

        if (accept) {
            project.acceptRequest(request);
            var member = new ProjectMember();
            member.setProject(project);
            member.setUser(request.getUser());
            member.setRole(ProjectRole.MEMBER);
            projectMemberRepository.save(member);
        } else {
            project.rejectRequest(request);
        }
        projectRepository.save(project);
    }

    @PatchMapping("/requests/{requestId}/accept")
    public ResponseEntity<Void> acceptRequest(@PathVariable UUID requestId,
                                              JwtAuthenticationToken token) {
        updateRequestStatus(requestId, UUID.fromString(token.getName()), true);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/requests/{requestId}/reject")
    public ResponseEntity<Void> rejectRequest(@PathVariable UUID requestId,
                                              JwtAuthenticationToken token) {
        updateRequestStatus(requestId, UUID.fromString(token.getName()), false);
        return ResponseEntity.ok().build();
    }
}
