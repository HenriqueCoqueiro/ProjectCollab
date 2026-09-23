package com.example.demo.config;

import org.springframework.http.HttpStatus;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Map;

/**
 * O handshake do WebSocket (upgrade HTTP -> WS) nao passa pelo filtro padrao
 * do Spring Security que valida o header "Authorization: Bearer ...", pois o
 * WebSocket nativo do navegador nao permite enviar headers customizados na
 * conexao. Por isso o token JWT e enviado como query param (?token=...) na
 * URL de conexao e validado aqui manualmente, reaproveitando o mesmo
 * JwtDecoder configurado em SecurityConfig para o restante da aplicacao.
 */
@Component
public class JwtHandshakeInterceptor implements HandshakeInterceptor {

    public static final String USER_ID_ATTRIBUTE = "userId";

    private final JwtDecoder jwtDecoder;

    public JwtHandshakeInterceptor(JwtDecoder jwtDecoder) {
        this.jwtDecoder = jwtDecoder;
    }

    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                    WebSocketHandler wsHandler, Map<String, Object> attributes) {

        var query = UriComponentsBuilder.fromUri(request.getURI()).build().getQueryParams();
        var token = query.getFirst("token");

        if (token == null || token.isBlank()) {
            response.setStatusCode(HttpStatus.UNAUTHORIZED);
            return false;
        }

        try {
            var jwt = jwtDecoder.decode(token);
            attributes.put(USER_ID_ATTRIBUTE, jwt.getSubject());
            return true;
        } catch (Exception e) {
            response.setStatusCode(HttpStatus.UNAUTHORIZED);
            return false;
        }
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                WebSocketHandler wsHandler, Exception exception) {
        // nenhuma acao necessaria apos o handshake
    }
}
