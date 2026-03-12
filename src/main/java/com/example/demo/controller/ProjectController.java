package com.example.demo.controller;

import com.example.demo.controller.dto.CreateProjectDto;
import com.example.demo.controller.dto.ProjectRequestResponseDto;
import com.example.demo.controller.dto.ProjectResponseDto;
import com.example.demo.model.Project;
import com.example.demo.model.ProjectRequest;
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
public class ProjectController {

    private final ProjectRepository projectRepository;
    private final ProjectRequestRepository requestRepository;
    private final UserRepository userRepository;

    public ProjectController(ProjectRepository projectRepository,
                             ProjectRequestRepository requestRepository,
                             UserRepository userRepository) {

        this.projectRepository = projectRepository;
        this.requestRepository = requestRepository;
        this.userRepository = userRepository;
    }

    @PostMapping("/project")
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

        return ResponseEntity.ok().build();
    }

    @GetMapping("/project")
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

    @GetMapping("/project/{projectId}/requests")
    public ResponseEntity<List<ProjectRequestResponseDto>> listProjectRequests(
            @PathVariable UUID projectId,
            JwtAuthenticationToken token) {

        var user = userRepository.findById(UUID.fromString(token.getName()))
                .orElseThrow();

        var project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        if (!project.getOwner().equals(user)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }

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


    @DeleteMapping("/project/{id}")
    public ResponseEntity<Void> deleteProject(
            @PathVariable UUID id,
            JwtAuthenticationToken token){

        var project = projectRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        var userId = UUID.fromString(token.getName());

        if (!project.getOwner().getUserId().equals(userId)){
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        projectRepository.delete(project);

        return ResponseEntity.ok().build();
    }

    @PostMapping("/project/{id}/request")
    public ResponseEntity<Void> sendJoinRequest(
            @PathVariable UUID id,
            JwtAuthenticationToken token) {

        var actor = userRepository.findById(UUID.fromString(token.getName()))
                .orElseThrow();

        var project = projectRepository.findById(id)
                .orElseThrow();

        project.sendJoinRequest(actor);

        projectRepository.save(project);

        return ResponseEntity.ok().build();
    }


    @PutMapping("/project/request/{requestId}/accept")
    public ResponseEntity<Void> acceptRequest(
            @PathVariable UUID requestId,
            JwtAuthenticationToken token) {

        var user = userRepository.findById(UUID.fromString(token.getName()))
                .orElseThrow();

        var request = requestRepository.findById(requestId)
                .orElseThrow();

        var project = request.getProject();

        project.acceptRequest(request, user);

        projectRepository.save(project);

        return ResponseEntity.ok().build();
    }


    @PutMapping("/project/request/{requestId}/reject")
    public ResponseEntity<Void> rejectRequest(
            @PathVariable UUID requestId,
            JwtAuthenticationToken token) {

        var user = userRepository.findById(UUID.fromString(token.getName()))
                .orElseThrow();

        var request = requestRepository.findById(requestId)
                .orElseThrow();

        var project = request.getProject();

        project.rejectRequest(request, user);

        projectRepository.save(project);

        return ResponseEntity.ok().build();
    }


}