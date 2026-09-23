package com.example.demo.config;

import com.example.demo.model.ProjectMember;
import com.example.demo.model.ProjectRole;
import com.example.demo.repository.ProjectMemberRepository;
import com.example.demo.repository.UserRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.InsufficientAuthenticationException;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class ProjectAuthorization {

    private final ProjectMemberRepository projectMemberRepository;
    private final UserRepository userRepository;

    public ProjectAuthorization(ProjectMemberRepository projectMemberRepository,
                                 UserRepository userRepository) {
        this.projectMemberRepository = projectMemberRepository;
        this.userRepository = userRepository;
    }

    public ProjectMember getMembership(UUID projectId, UUID userId) {
        return projectMemberRepository
                .findByProject_ProjectIdAndUser_UserId(projectId, userId)
                .orElseThrow(() -> {
                    if (!userRepository.existsById(userId)) {
                        // O JWT tem assinatura e validade ok, mas o usuário que ele
                        // referencia não existe mais nesta base — típico depois de
                        // reiniciar o backend com ddl-auto=create (o banco é recriado
                        // do zero a cada start, com IDs novos, mas um token antigo
                        // ainda "parece" válido pro backend novo). 401 força o
                        // front (client.js) a deslogar e mandar pra tela de login,
                        // em vez de mostrar um erro de permissão confuso.
                        return new InsufficientAuthenticationException(
                                "Sessão inválida, faça login novamente");
                    }
                    return new AccessDeniedException("Usuário não pertence ao projeto");
                });
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