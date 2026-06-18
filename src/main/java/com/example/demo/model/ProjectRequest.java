package com.example.demo.model;

import jakarta.persistence.*;

import java.util.UUID;

@Entity
@Table(name = "tb_project_requests")
public class ProjectRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID requestId;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne
    @JoinColumn(name = "project_id")
    private Project project;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ProjectRequestStatus status;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ProjectRequestType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = true)
    private ProjectRole invitedRole;

    protected ProjectRequest() {}

    public ProjectRequest(User user, Project project, ProjectRequestType type) {
        this.user = user;
        this.project = project;
        this.status = ProjectRequestStatus.PENDING;
        this.type = type;
        this.invitedRole = null;
    }

    public ProjectRequest(User user, Project project, ProjectRole invitedRole) {
        this.user = user;
        this.project = project;
        this.status = ProjectRequestStatus.PENDING;
        this.type = ProjectRequestType.INVITE;
        this.invitedRole = invitedRole;
    }

    public void accept() {
        if (this.status != ProjectRequestStatus.PENDING) {
            throw new IllegalStateException("Only PENDING requests can be accepted");
        }
        this.status = ProjectRequestStatus.ACCEPTED;
    }

    public void reject() {
        if (this.status != ProjectRequestStatus.PENDING) {
            throw new IllegalStateException("Only PENDING requests can be rejected");
        }
        this.status = ProjectRequestStatus.REJECTED;
    }

    public UUID getRequestId() { return requestId; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public Project getProject() { return project; }
    public void setProject(Project project) { this.project = project; }

    public ProjectRequestStatus getStatus() { return status; }

    public ProjectRequestType getType() { return type; }

    public ProjectRole getInvitedRole() { return invitedRole; }
}
