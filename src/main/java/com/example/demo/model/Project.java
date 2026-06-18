package com.example.demo.model;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "tb_projects")
public class Project {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "project_id")
    private UUID projectId;

    private String nome;

    private String descricao;

    @ManyToOne
    @JoinColumn(name = "owner_id")
    private User owner;

    @CreationTimestamp
    private Instant creationTimestamp;

    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ProjectRequest> requests = new ArrayList<>();

    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL)
    private List<ProjectMember> members = new ArrayList<>();

    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Post> posts = new ArrayList<>();

    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ChatMessage> messages = new ArrayList<>();

    public UUID getProjectId() { return projectId; }

    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }

    public String getDescricao() { return descricao; }
    public void setDescricao(String descricao) { this.descricao = descricao; }

    public User getOwner() { return owner; }
    public void setOwner(User owner) { this.owner = owner; }

    public Instant getCreationTimestamp() { return creationTimestamp; }

    public List<ProjectRequest> getRequests() { return requests; }
    public List<ProjectMember> getMembers() { return members; }
    public List<Post> getPosts() { return posts; }
    public List<ChatMessage> getMessages() { return messages; }

    public void sendJoinRequest(User actor) {
        if (this.owner.equals(actor)) {
            throw new IllegalStateException("Owner cannot request own project");
        }

        boolean alreadyRequested = requests.stream()
                .anyMatch(r -> r.getUser().equals(actor) && r.getStatus() == ProjectRequestStatus.PENDING);

        if (alreadyRequested) {
            throw new IllegalStateException("User already has a pending request");
        }

        requests.add(new ProjectRequest(actor, this, ProjectRequestType.JOIN_REQUEST));
    }

    public void acceptRequest(ProjectRequest request) { request.accept(); }
    public void rejectRequest(ProjectRequest request) { request.reject(); }
}
