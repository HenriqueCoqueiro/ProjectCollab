package com.example.demo.repository;

import com.example.demo.model.DirectMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface DirectMessageRepository extends JpaRepository<DirectMessage, UUID> {

    // Historico completo da conversa entre dois usuarios especificos,
    // restrito a um projeto (a mensagem pode ter sido enviada por qualquer
    // um dos dois lados, por isso o "OR" com os papeis invertidos).
    @Query("""
            select m from DirectMessage m
            where m.project.projectId = :projectId
              and ((m.sender.userId = :userA and m.recipient.userId = :userB)
                or (m.sender.userId = :userB and m.recipient.userId = :userA))
            order by m.creationTimestamp asc
            """)
    List<DirectMessage> findConversation(@Param("projectId") UUID projectId,
                                          @Param("userA") UUID userA,
                                          @Param("userB") UUID userB);

    // Todas as mensagens diretas (enviadas ou recebidas) do usuario dentro de
    // um projeto, da mais recente para a mais antiga - usada para montar a
    // lista de conversas (uma entrada por "outro usuario", com a ultima
    // mensagem trocada).
    @Query("""
            select m from DirectMessage m
            where m.project.projectId = :projectId
              and (m.sender.userId = :userId or m.recipient.userId = :userId)
            order by m.creationTimestamp desc
            """)
    List<DirectMessage> findAllForUserInProject(@Param("projectId") UUID projectId,
                                                 @Param("userId") UUID userId);
}
