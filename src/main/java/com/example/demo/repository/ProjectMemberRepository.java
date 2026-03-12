package com.example.demo.repository;

import com.example.demo.model.ProjectMember;
import com.example.demo.model.ProjectRole;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProjectMemberRepository extends JpaRepository<ProjectMember, UUID> {

    Optional<ProjectMember> findByProject_ProjectIdAndUser_UserId(
            UUID projectId,
            UUID userId
    );

    List<ProjectMember> findAllByProject_ProjectId(UUID projectId);

    boolean existsByProject_ProjectIdAndUser_UserIdAndRole(
            UUID projectId,
            UUID userId,
            ProjectRole role
    );

    boolean existsByProject_ProjectIdAndUser_UserId(
            UUID projectId,
            UUID userId
    );

    boolean existsByProject_ProjectIdAndRole(
            UUID projectId,
            ProjectRole role
    );
}