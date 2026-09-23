package com.example.demo.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * Habilita mensagens em tempo real via STOMP sobre WebSocket.
 *
 * Endpoint de conexao: /ws?token={jwt}
 * Canal de chat (grupo) de um projeto: /topic/projects/{projectId}/chat
 * Fila privada de chat direto (1-para-1): /user/queue/dm
 *
 * O ChatController/DirectMessageController continuam sendo a unica porta de
 * escrita (POST/PUT/DELETE em /projects/{id}/chat e /projects/{id}/dm, com
 * as mesmas regras de autorizacao de sempre); apos persistir a mensagem,
 * eles publicam um evento no topico ou na fila acima, que e entao entregue
 * em tempo real para os clientes inscritos. A fila "/queue" usa o recurso
 * nativo do Spring de destinos por usuario (SimpMessagingTemplate.
 * convertAndSendToUser): o Principal da sessao (StompUserHandshakeHandler)
 * garante que cada usuario so recebe o que foi endereçado a ele mesmo.
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtHandshakeInterceptor jwtHandshakeInterceptor;
    private final ChatSubscriptionInterceptor chatSubscriptionInterceptor;

    public WebSocketConfig(JwtHandshakeInterceptor jwtHandshakeInterceptor,
                            ChatSubscriptionInterceptor chatSubscriptionInterceptor) {
        this.jwtHandshakeInterceptor = jwtHandshakeInterceptor;
        this.chatSubscriptionInterceptor = chatSubscriptionInterceptor;
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // "/topic" continua para o chat em grupo do projeto; "/queue" e o
        // prefixo usado pelas filas privadas de chat direto por usuario
        // (o Spring traduz "/user/queue/dm" para a fila da sessao correta).
        registry.enableSimpleBroker("/topic", "/queue");
        registry.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setHandshakeHandler(new StompUserHandshakeHandler())
                .addInterceptors(jwtHandshakeInterceptor)
                .setAllowedOriginPatterns("*");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(chatSubscriptionInterceptor);
    }
}
