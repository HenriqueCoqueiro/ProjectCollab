package com.example.demo.config;

import com.example.demo.model.ProjectMember;
import com.example.demo.model.ProjectRole;
import com.example.demo.repository.ProjectMemberRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class ProjectAuthorization {

    private final ProjectMemberRepository projectMemberRepository;

    public ProjectAuthorization(ProjectMemberRepository projectMemberRepository) {
        this.projectMemberRepository = projectMemberRepository;
    }

    public ProjectMember getMembership(UUID projectId, UUID userId) {
        return projectMemberRepository
                .findByProject_ProjectIdAndUser_UserId(projectId, userId)
                .orElseThrow(() ->
                        new AccessDeniedException("Usuário não pertence ao projeto")
                );
    }

    public void requireRole(UUID projectId, UUID userId, ProjectRole requiredRole) {
        ProjectMember member = getMembership(projectId, userId);

        if (member.getRole() != requiredRole) {
            throw new AccessDeniedException(
                    "Permissão insuficiente para esta ação"
            );
        }
    }

    public void requireAtLeast(UUID projectId, UUID userId, ProjectRole minimumRole) {
        ProjectMember member = getMembership(projectId, userId);

        if (member.getRole().ordinal() > minimumRole.ordinal()) {
            throw new AccessDeniedException(
                    "Permissão insuficiente para esta ação"
            );
        }
    }
}