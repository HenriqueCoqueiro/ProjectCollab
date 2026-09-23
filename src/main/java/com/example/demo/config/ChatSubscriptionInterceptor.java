package com.example.demo.config;

import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.stereotype.Component;

import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Garante que um usuario so consiga se inscrever:
 *  - no canal de chat em grupo de um projeto (/topic/projects/{id}/chat) se
 *    ele for realmente membro daquele projeto - mesma regra ja aplicada no
 *    ChatController REST via ProjectAuthorization.requireAtLeast(...,
 *    ProjectRole.MEMBER);
 *  - na propria fila privada de chat direto (/user/queue/dm) - aqui nao ha
 *    checagem extra de projeto/membro porque o destino ja e por natureza
 *    exclusivo do usuario autenticado: o Spring so entrega nessa fila
 *    (traduzida internamente para algo como /queue/dm-user<sessao>) as
 *    mensagens que o DirectMessageController endereçou explicitamente ao
 *    Principal desta sessao (StompUserHandshakeHandler), entao ninguem
 *    consegue "ouvir" a fila de outra pessoa so pelo nome do destino.
 */
@Component
public class ChatSubscriptionInterceptor implements ChannelInterceptor {

    private static final Pattern CHAT_TOPIC =
            Pattern.compile("^/topic/projects/([0-9a-fA-F-]{36})/chat$");

    private static final String DIRECT_MESSAGE_QUEUE = "/user/queue/dm";

    private final ProjectAuthorization authorization;

    public ChatSubscriptionInterceptor(ProjectAuthorization authorization) {
        this.authorization = authorization;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        var accessor = StompHeaderAccessor.wrap(message);

        if (accessor.getCommand() == StompCommand.SUBSCRIBE) {
            var destination = String.valueOf(accessor.getDestination());
            var principal = accessor.getUser();

            if (principal == null) {
                throw new MessagingException("Inscricao invalida");
            }

            if (DIRECT_MESSAGE_QUEUE.equals(destination)) {
                return message;
            }

            var matcher = CHAT_TOPIC.matcher(destination);
            if (!matcher.matches()) {
                throw new MessagingException("Inscricao invalida");
            }

            var projectId = UUID.fromString(matcher.group(1));
            var userId = UUID.fromString(principal.getName());

            try {
                authorization.getMembership(projectId, userId);
            } catch (Exception e) {
                throw new MessagingException("Usuario nao pertence a este projeto");
            }
        }

        return message;
    }
}
