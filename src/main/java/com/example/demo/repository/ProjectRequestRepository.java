package com.example.demo.repository;

import com.example.demo.model.ProjectRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ProjectRequestRepository extends JpaRepository<ProjectRequest, UUID> {
}