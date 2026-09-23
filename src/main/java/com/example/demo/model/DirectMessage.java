package com.example.demo.model;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * Mensagem privada (1-para-1) trocada entre dois membros de um mesmo
 * projeto. Diferente de ChatMessage (chat em grupo do projeto, visivel a
 * todos os membros), aqui a conversa e restrita ao remetente e ao
 * destinatario - o projeto so serve para delimitar quem pode falar com
 * quem (ambos precisam ser membros do mesmo projeto).
 */
@Entity
@Table(name = "tb_direct_messages")
public class DirectMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID messageId;

    @ManyToOne
    @JoinColumn(name = "project_id")
    private Project project;

    @ManyToOne
    @JoinColumn(name = "sender_id")
    private User sender;

    @ManyToOne
    @JoinColumn(name = "recipient_id")
    private User recipient;

    @Column(nullable = false, length = 2000)
    private String content;

    @CreationTimestamp
    private Instant creationTimestamp;

    public UUID getMessageId() { return messageId; }
    public void setMessageId(UUID messageId) { this.messageId = messageId; }

    public Project getProject() { return project; }
    public void setProject(Project project) { this.project = project; }

    public User getSender() { return sender; }
    public void setSender(User sender) { this.sender = sender; }

    public User getRecipient() { return recipient; }
    public void setRecipient(User recipient) { this.recipient = recipient; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public Instant getCreationTimestamp() { return creationTimestamp; }
    public void setCreationTimestamp(Instant creationTimestamp) { this.creationTimestamp = creationTimestamp; }
}
