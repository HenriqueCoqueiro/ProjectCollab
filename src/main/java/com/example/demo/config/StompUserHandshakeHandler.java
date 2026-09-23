package com.example.demo.config;

import org.springframework.http.server.ServerHttpRequest;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.support.DefaultHandshakeHandler;

import java.security.Principal;
import java.util.Map;
import java.util.UUID;

/**
 * Usa o userId extraido do JWT (por JwtHandshakeInterceptor) como Principal
 * da sessao WebSocket, para que os interceptors/handlers STOMP identifiquem
 * o usuario autenticado - equivalente ao JwtAuthenticationToken.getName()
 * usado nos controllers REST (token.getName() == userId em formato UUID).
 */
public class StompUserHandshakeHandler extends DefaultHandshakeHandler {

    @Override
    protected Principal determineUser(ServerHttpRequest request, WebSocketHandler wsHandler,
                                       Map<String, Object> attributes) {
        Object userId = attributes.get(JwtHandshakeInterceptor.USER_ID_ATTRIBUTE);
        String id = userId != null ? userId.toString() : UUID.randomUUID().toString();
        return new StompPrincipal(id);
    }

    private record StompPrincipal(String name) implements Principal {
        @Override
        public String getName() {
            return name;
        }
    }
}
