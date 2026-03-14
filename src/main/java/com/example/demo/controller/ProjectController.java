package com.example.demo.controller;

import com.example.demo.config.ProjectAuthorization;
import com.example.demo.controller.dto.CreateProjectDto;
import com.example.demo.controller.dto.ProjectRequestResponseDto;
import com.example.demo.controller.dto.ProjectResponseDto;
import com.example.demo.model.*;
import com.example.demo.repository.ProjectMemberRepository;
import com.example.demo.repository.ProjectRepository;
import com.example.demo.repository.ProjectRequestRepository;
import com.example.demo.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

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
    public ResponseEntity<Void> createProject(
            @RequestBody CreateProjectDto dto,
            JwtAuthenticationToken token){

        var user = userRepository.findById(UUID.fromString(token.getName()))
                .orElseThrow();

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

        var projects = projectRepository.findAll();

        var response = projects.stream()
                .map(project -> new ProjectResponseDto(
                        project.getProjectId(),
                        project.getNome(),
                        project.getDescricao(),
                        project.getOwner().getUserId(),
                        project.getCreationTimeStamp()
                ))
                .toList();

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{projectId}")
    public ResponseEntity<Void> deleteProject(
            @PathVariable UUID projectId,
            JwtAuthenticationToken token){

        var project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        var userId = UUID.fromString(token.getName());

        authorization.requireRole(projectId, userId, ProjectRole.OWNER);

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
                .map(request -> new ProjectRequestResponseDto(
                        request.getRequestId(),
                        request.getUser().getUserId(),
                        request.getProject().getProjectId(),
                        request.getStatus()
                ))
                .toList();

        return ResponseEntity.ok(response);
    }

    private void updateRequestStatus(UUID requestId, UUID actorId, boolean accept) {

        var actor = userRepository.findById(actorId).orElseThrow();

        var request = requestRepository.findById(requestId).orElseThrow();

        var project = request.getProject();

        authorization.requireAtLeast(project.getProjectId(), actorId, ProjectRole.MANAGER);

        if (accept) {

            project.acceptRequest(request, actor);

            var member = new ProjectMember();
            member.setProject(project);
            member.setUser(request.getUser());
            member.setRole(ProjectRole.MEMBER);

            projectMemberRepository.save(member);

        } else {

            project.rejectRequest(request, actor);

        }

        projectRepository.save(project);
    }

    @PatchMapping("/requests/{requestId}/accept")
    public ResponseEntity<Void> acceptRequest(
            @PathVariable UUID requestId,
            JwtAuthenticationToken token) {

        var userId = UUID.fromString(token.getName());

        updateRequestStatus(requestId, userId, true);

        return ResponseEntity.ok().build();
    }

    @PatchMapping("/requests/{requestId}/reject")
    public ResponseEntity<Void> rejectRequest(
            @PathVariable UUID requestId,
            JwtAuthenticationToken token) {

        var userId = UUID.fromString(token.getName());

        updateRequestStatus(requestId, userId, false);

        return ResponseEntity.ok().build();
    }
}